"""
Terraform Artifact Generation & Execution Service
Generates, stores, validates, plans, and applies Terraform configurations
"""

import logging
import os
import json
import asyncio
import socket
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


TERRAFORM_INIT_RETRY_MAX = 3
TERRAFORM_INIT_RETRY_BASE_DELAY = 2.0  # seconds


def classify_terraform_init_error(stderr: str) -> str:
    """Parse terraform init stderr and return a specific error message."""
    err_lower = stderr.lower()

    if "terraform binary not found" in stderr or "terraform" in stderr and "not found" in err_lower:
        return "Terraform binary not found in PATH. Install Terraform or check your server configuration."

    if "timeout" in err_lower or "timed out" in err_lower:
        return "Terraform initialization timed out. The storage backend may be unreachable."

    if "status code: 403" in stderr:
        return "Azure authentication failed (403 Forbidden). Check that your Azure credentials have Contributor access to the subscription."

    if "status code: 401" in stderr:
        return "Azure authentication failed (401 Unauthorized). Your Azure credentials may be expired or invalid."

    if "status code: 404" in stderr:
        return "Storage backend not found (404). The configured Storage Account for Terraform state does not exist."

    if "status code: 409" in stderr:
        return "Storage backend conflict (409). The state file may be locked by another operation."

    if "storage account" in err_lower and ("not found" in err_lower or "not exist" in err_lower or "404" in stderr):
        return "The Storage Account for Terraform backend does not exist or is not accessible."

    if "dns" in err_lower and ("could not resolve" in err_lower or "resolution" in err_lower):
        return "DNS resolution failed. The backend endpoint hostname could not be resolved."

    if "connection refused" in err_lower or "connection reset" in err_lower:
        return "Network connection refused. The storage backend endpoint is not accepting connections."

    if "no such host" in err_lower or "temporary failure" in err_lower or "network is unreachable" in err_lower:
        return "Network connectivity failure. The backend server is unreachable. Check your network and firewall settings."

    if "certificate" in err_lower and ("verify" in err_lower or "valid" in err_lower):
        return "SSL/TLS certificate verification failed. Check that the backend endpoint uses a trusted certificate."

    if "error acquiring the state lock" in err_lower:
        return "Terraform state lock error. Another operation holds the lock. Wait a few minutes and retry."

    if "azure" in err_lower and ("authorization" in err_lower or "permission" in err_lower):
        return "Azure authorization failed. Your service principal lacks the required permissions on the storage backend."

    if "endpoint" in err_lower and ("invalid" in err_lower or "not found" in err_lower):
        return "Invalid storage endpoint. Check the Storage Account name and endpoint URL."

    if "error" in err_lower and ("parsing" in err_lower or "syntax" in err_lower):
        return "Terraform configuration syntax error. The generated HCL may be invalid."

    # Generic fallback with a snippet of the actual error
    snippet = stderr.strip()[:200] if stderr.strip() else "Unknown error"
    return f"Terraform initialization failed: {snippet}"


async def check_terraform_binary() -> Optional[str]:
    """Check if terraform binary is available. Returns error message or None."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "terraform", "version",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
        if proc.returncode != 0:
            return f"Terraform binary check failed: {stderr.decode('utf-8', errors='replace')[:200]}"
        return None
    except FileNotFoundError:
        return "Terraform binary not found in PATH. Install Terraform from https://www.terraform.io/downloads"
    except asyncio.TimeoutError:
        return "Terraform binary check timed out."
    except Exception as e:
        return f"Terraform binary check failed: {str(e)[:200]}"


async def check_network_connectivity(host: str = "management.azure.com", port: int = 443, timeout: float = 5.0) -> Optional[str]:
    """Check basic network connectivity to Azure. Returns error message or None."""
    try:
        _, _, ips = socket.gethostbyname_ex(host)
        logger.debug("DNS resolved %s -> %s", host, ips)
    except socket.gaierror as e:
        return f"DNS resolution failed for {host}: {e}. Check your network and DNS settings."
    except Exception as e:
        return f"DNS check failed: {e}"

    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=timeout
        )
        writer.close()
        await writer.wait_closed()
    except asyncio.TimeoutError:
        return f"Network timeout connecting to {host}:{port}. Firewall or proxy may be blocking outbound HTTPS."
    except ConnectionRefusedError:
        return f"Connection refused by {host}:{port}."
    except OSError as e:
        return f"Network error connecting to {host}:{port}: {e}"
    except Exception as e:
        return f"Connectivity check failed: {e}"

    return None

TF_FILES = {
    "main.tf": """# Generated by InfraLift - {deployment_name}
# Timestamp: {timestamp}

terraform {{
  required_version = "~> 1.5"
  required_providers {{
    azurerm = {{
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }}
  }}
  backend "{backend_type}" {{
    {backend_config}
  }}
}}

provider "azurerm" {{
  features {{
    resource_group {{
      prevent_deletion_if_contains_resources = false
    }}
  }}
  subscription_id = "{subscription_id}"
}}

{resources}
""",
    "variables.tf": """# Generated by InfraLift - {deployment_name}
# Timestamp: {timestamp}

{variables}
""",
    "outputs.tf": """# Generated by InfraLift - {deployment_name}
# Timestamp: {timestamp}

{outputs}
""",
    "terraform.tfvars": """# Generated by InfraLift - {deployment_name}
# Timestamp: {timestamp}

{tfvars}
""",
}


class TerraformService:
    """Generate, store, plan, and apply Terraform configurations"""

    def __init__(self, redis_client=None):
        self.redis_client = redis_client

    def generate_main_tf(self, deployment: Dict[str, Any], backend_type: str = "azurerm") -> str:
        sub_id = deployment.get("subscriptionId", "00000000-0000-0000-0000-000000000000")
        rg = deployment.get("resourceGroup", "rg-default")
        sa = deployment.get("storageAccount", "infraliftterraform")
        container = deployment.get("containerName", "terraform-artifacts")
        req_id = deployment.get("requestId", deployment.get("deploymentId", "unknown"))
        key = f"REQ-{req_id}/terraform.tfstate"

        backend_cfg = {
            "azurerm": f'storage_account_name = "{sa}"\n    container_name       = "{container}"\n    key                  = "{key}"\n    resource_group_name  = "{rg}"',
            "local": 'path = "terraform.tfstate"',
        }

        resources_tf = deployment.get("resources", "# No resources defined")
        name = deployment.get("resourceName", "infrastructure")

        return TF_FILES["main.tf"].format(
            deployment_name=name,
            timestamp=datetime.now(timezone.utc).isoformat(),
            backend_type=backend_type,
            backend_config=backend_cfg.get(backend_type, backend_cfg["local"]),
            subscription_id=sub_id,
            resources=resources_tf,
        )

    def generate_variables_tf(self, variables: List[Dict[str, str]]) -> str:
        lines = []
        for v in variables:
            desc = v.get("description", "")
            default_val = v.get("default", "")
            lines.append(f'variable "{v["name"]}" {{')
            if desc:
                lines.append(f'  description = "{desc}"')
            lines.append(f'  type        = {v.get("type", "string")}')
            if default_val:
                lines.append(f'  default     = "{default_val}"')
            lines.append("}")
            lines.append("")
        return "\n".join(lines) if lines else '# variable "example" {\n#   type = string\n# }\n'

    def generate_outputs_tf(self, outputs: List[Dict[str, str]]) -> str:
        lines = []
        for o in outputs:
            desc = o.get("description", "")
            lines.append(f'output "{o["name"]}" {{')
            lines.append(f'  value = {o.get("value", "azurerm_resource_group.main.id")}')
            if desc:
                lines.append(f'  description = "{desc}"')
            lines.append("}")
            lines.append("")
        return "\n".join(lines) if lines else '# output "resource_id" {\n#   value = azurerm_resource_group.main.id\n# }\n'

    def generate_tfvars(self, variables: Dict[str, Any]) -> str:
        lines = []
        for k, v in variables.items():
            if isinstance(v, str):
                lines.append(f'{k} = "{v}"')
            elif isinstance(v, bool):
                lines.append(f"{k} = {str(v).lower()}")
            else:
                lines.append(f"{k} = {v}")
        return "\n".join(lines)

    def get_storage_path(self, request_id: str) -> str:
        return f"REQ-{request_id}/"

    async def save_artifacts(self, deployment: Dict[str, Any], files: Dict[str, str]) -> Dict[str, Any]:
        """Save Terraform files under REQ-{RequestId}/ folder in Blob Storage"""
        conn_str = os.getenv("STORAGE_CONNECTION_STRING", "")
        req_id = deployment.get("requestId", deployment.get("deploymentId", "unknown"))
        storage_path = self.get_storage_path(req_id)

        saved = {}
        if conn_str:
            try:
                from azure.storage.blob import BlobServiceClient
                container = os.getenv("STORAGE_CONTAINER_NAME", "terraform-artifacts")
                blob_service = BlobServiceClient.from_connection_string(conn_str)
                container_client = blob_service.get_container_client(container)
                await container_client.create_container()

                for filename, content in files.items():
                    blob_path = f"{storage_path}{filename}"
                    blob_client = container_client.get_blob_client(blob_path)
                    blob_client.upload_blob(content, overwrite=True)
                    saved[filename] = f"https://{blob_service.account_name}.blob.core.windows.net/{container}/{blob_path}"
                    logger.info("Saved %s to Blob Storage", blob_path)
            except Exception as e:
                logger.warning("Blob storage unavailable, saving locally: %s", e)
                self._save_local(storage_path, files)
                saved = {f: f"local://{storage_path}{f}" for f in files}
        else:
            self._save_local(storage_path, files)
            saved = {f: f"local://{storage_path}{f}" for f in files}

        if self.redis_client:
            meta_key = f"terraform:{deployment.get('requestId', deployment.get('deploymentId', 'unknown'))}"
            await self.redis_client.setex(
                meta_key, 86400 * 30,
                json.dumps({"requestId": req_id, "files": saved, "savedAt": datetime.now(timezone.utc).isoformat()})
            )
        return saved

    def _save_local(self, path: str, files: Dict[str, str]):
        local_dir = os.path.join("terraform_artifacts", path)
        os.makedirs(local_dir, exist_ok=True)
        for filename, content in files.items():
            filepath = os.path.join(local_dir, filename)
            with open(filepath, "w") as f:
                f.write(content)
            logger.info("Saved locally: %s", filepath)

    def get_work_dir(self, request_id: str) -> str:
        """Return the local working directory for a request's Terraform files"""
        return os.path.join("terraform_artifacts", self.get_storage_path(request_id)).replace("/", os.sep)

    async def preflight_check(self) -> Dict[str, Any]:
        """Run pre-flight checks before terraform init: binary check, DNS, network connectivity.
        Returns dict with 'passed' (bool), 'checks' (list of check results), and 'error' (str if failed)."""
        from app.services.terraform_service import check_terraform_binary, check_network_connectivity

        checks = []
        all_passed = True

        # Check 1: Terraform binary
        tf_error = await check_terraform_binary()
        checks.append({"name": "terraform_binary", "passed": tf_error is None, "error": tf_error})
        if tf_error:
            all_passed = False

        # Check 2: DNS resolution to Azure
        dns_error = await check_network_connectivity("management.azure.com")
        checks.append({"name": "dns_resolution", "passed": dns_error is None, "error": dns_error})
        if dns_error:
            all_passed = False

        # Check 3: HTTPS connectivity to Azure
        https_error = await check_network_connectivity("management.azure.com", 443)
        checks.append({"name": "https_connectivity", "passed": https_error is None, "error": https_error})
        if https_error:
            all_passed = False

        # Check 4: Terraform registry
        registry_error = await check_network_connectivity("registry.terraform.io", 443)
        checks.append({"name": "terraform_registry", "passed": registry_error is None, "error": registry_error})
        if registry_error:
            all_passed = False

        return {
            "passed": all_passed,
            "checks": checks,
            "error": next((c["error"] for c in checks if not c["passed"]), None),
        }

    async def terraform_init(self, work_dir: str) -> Dict[str, Any]:
        """Run terraform init in the given directory with retry and exponential backoff"""
        from app.services.terraform_service import TERRAFORM_INIT_RETRY_MAX, TERRAFORM_INIT_RETRY_BASE_DELAY, classify_terraform_init_error

        last_error = ""
        for attempt in range(1, TERRAFORM_INIT_RETRY_MAX + 1):
            result = {"success": False, "output": "", "error": "", "classified_error": ""}
            try:
                proc = await asyncio.create_subprocess_exec(
                    "terraform", "init", "-no-color", "-input=false",
                    cwd=work_dir,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
                result["output"] = stdout.decode("utf-8", errors="replace")
                result["error"] = stderr.decode("utf-8", errors="replace")
                result["success"] = proc.returncode == 0
                if result["success"]:
                    return result
                last_error = result["error"]
                result["classified_error"] = classify_terraform_init_error(last_error)
                logger.warning("terraform init attempt %d/%d failed: %s", attempt, TERRAFORM_INIT_RETRY_MAX, last_error[:200])
            except FileNotFoundError:
                last_error = "terraform binary not found in PATH"
                result["error"] = last_error
                result["classified_error"] = "Terraform binary not found in PATH. Install Terraform or check your server configuration."
                logger.warning(result["error"])
                return result  # No point retrying this
            except asyncio.TimeoutError:
                last_error = "terraform init timed out after 120s"
                result["error"] = last_error
                result["classified_error"] = "Terraform initialization timed out. The storage backend may be unreachable."
            except Exception as e:
                last_error = str(e)[:500]
                result["error"] = last_error
                logger.error("terraform init error: %s", e)

            if attempt < TERRAFORM_INIT_RETRY_MAX:
                delay = TERRAFORM_INIT_RETRY_BASE_DELAY * (2 ** (attempt - 1))
                logger.info("Retrying terraform init in %.1fs (attempt %d/%d)", delay, attempt + 1, TERRAFORM_INIT_RETRY_MAX)
                await asyncio.sleep(delay)

        result["error"] = last_error
        result["classified_error"] = result.get("classified_error") or classify_terraform_init_error(last_error)
        return result

    async def terraform_plan(self, work_dir: str, plan_file: str = "tfplan") -> Dict[str, Any]:
        """Run terraform plan and save to a binary plan file"""
        result = {"success": False, "output": "", "error": "", "plan_path": ""}
        plan_path = os.path.join(work_dir, plan_file)
        try:
            proc = await asyncio.create_subprocess_exec(
                "terraform", "plan", "-no-color", "-input=false",
                "-out", plan_file,
                cwd=work_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=180)
            result["output"] = stdout.decode("utf-8", errors="replace")
            result["error"] = stderr.decode("utf-8", errors="replace")
            result["success"] = proc.returncode == 0
            if proc.returncode == 0:
                result["plan_path"] = plan_path
            else:
                logger.warning("terraform plan failed: %s", result["error"][:500])
        except FileNotFoundError:
            result["error"] = "terraform binary not found in PATH"
        except asyncio.TimeoutError:
            result["error"] = "terraform plan timed out after 180s"
        except Exception as e:
            result["error"] = str(e)[:500]
        return result

    async def terraform_apply(self, work_dir: str, plan_file: str = "tfplan") -> Dict[str, Any]:
        """Run terraform apply using the saved plan file"""
        result = {"success": False, "output": "", "error": ""}
        plan_path = os.path.join(work_dir, plan_file)
        try:
            proc = await asyncio.create_subprocess_exec(
                "terraform", "apply", "-no-color", "-input=false",
                "-auto-approve",
                cwd=work_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=600)
            result["output"] = stdout.decode("utf-8", errors="replace")
            result["error"] = stderr.decode("utf-8", errors="replace")
            result["success"] = proc.returncode == 0
            if not result["success"]:
                logger.warning("terraform apply failed: %s", result["error"][:500])
        except FileNotFoundError:
            result["error"] = "terraform binary not found in PATH"
        except asyncio.TimeoutError:
            result["error"] = "terraform apply timed out after 600s"
        except Exception as e:
            result["error"] = str(e)[:500]
        return result

    async def terraform_show(self, work_dir: str, plan_file: str = "tfplan") -> str:
        """Show the human-readable content of a plan file"""
        try:
            proc = await asyncio.create_subprocess_exec(
                "terraform", "show", "-no-color", plan_file,
                cwd=work_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=60)
            return stdout.decode("utf-8", errors="replace") if proc.returncode == 0 else ""
        except Exception:
            return ""


terraform_service = TerraformService()

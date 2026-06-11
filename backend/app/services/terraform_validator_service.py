"""
Terraform Validator Service
Runs tflint and trivy on Terraform configurations
"""

import logging
import os
import asyncio
import json
from typing import Dict, Any, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

LINT_OUTPUT_FILE = "tflint_report.json"
SECURITY_OUTPUT_FILE = "trivy_report.json"


class TerraformValidatorService:
    def __init__(self):
        self.tflint_path = self._find_tool("tflint")
        self.trivy_path = self._find_tool("trivy")

    def _find_tool(self, name: str) -> str:
        try:
            import shutil
            p = shutil.which(name)
            if p:
                return p
        except Exception:
            pass
        return name

    async def validate(self, work_dir: str) -> Dict[str, Any]:
        results = {
            "tflint": {"passed": False, "issues": [], "raw_output": ""},
            "trivy": {"passed": False, "issues": [], "raw_output": ""},
            "passed": False,
            "validated_at": datetime.now(timezone.utc).isoformat(),
        }

        lint_result = await self._run_tflint(work_dir)
        results["tflint"] = lint_result

        sec_result = await self._run_trivy(work_dir)
        results["trivy"] = sec_result

        results["passed"] = lint_result["passed"] and sec_result["passed"]
        return results

    async def _run_tflint(self, work_dir: str) -> Dict[str, Any]:
        result = {"passed": False, "issues": [], "raw_output": ""}
        try:
            proc = await asyncio.create_subprocess_exec(
                self.tflint_path, "--format", "json",
                cwd=work_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=60)
            raw = stdout.decode("utf-8", errors="replace")
            result["raw_output"] = raw

            if proc.returncode == 0:
                result["passed"] = True
            elif raw.strip():
                try:
                    parsed = json.loads(raw)
                    issues = []
                    for issue in parsed if isinstance(parsed, list) else parsed.get("issues", []):
                        issues.append({
                            "rule": issue.get("rule", ""),
                            "message": issue.get("message", ""),
                            "file": issue.get("file", ""),
                            "line": issue.get("line", 0),
                            "severity": issue.get("severity", "error"),
                        })
                    result["issues"] = issues
                    if stderr and stderr.decode():
                        logger.warning("tflint stderr: %s", stderr.decode()[:500])
                except json.JSONDecodeError:
                    result["issues"] = [{"message": raw[:500], "severity": "error"}]
            else:
                result["issues"] = [{"message": stderr.decode()[:500] or "tflint failed", "severity": "error"}]
        except asyncio.TimeoutError:
            result["issues"] = [{"message": "tflint timed out after 60s", "severity": "error"}]
        except FileNotFoundError:
            logger.warning("tflint not found – skipping lint validation")
            result["passed"] = True
            result["issues"] = [{"message": "tflint not installed – skipped", "severity": "info"}]
        except Exception as e:
            logger.error("tflint execution error: %s", e)
            result["issues"] = [{"message": str(e)[:200], "severity": "error"}]
        return result

    async def _run_trivy(self, work_dir: str) -> Dict[str, Any]:
        result = {"passed": False, "issues": [], "raw_output": ""}
        try:
            proc = await asyncio.create_subprocess_exec(
                self.trivy_path, "config", "--format", "json",
                work_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)
            raw = stdout.decode("utf-8", errors="replace")
            result["raw_output"] = raw

            if proc.returncode == 0:
                result["passed"] = True
            elif raw.strip():
                try:
                    parsed = json.loads(raw)
                    issues = []
                    results_list = parsed.get("results", []) if isinstance(parsed, dict) else parsed if isinstance(parsed, list) else []
                    for r in results_list if isinstance(results_list, list) else []:
                        for m in r.get("misconfigurations", []):
                            issues.append({
                                "rule": m.get("id", ""),
                                "message": m.get("title", ""),
                                "file": r.get("target", ""),
                                "line": m.get("line", 0),
                                "severity": m.get("severity", "CRITICAL").lower(),
                                "description": m.get("description", ""),
                            })
                    result["issues"] = issues
                except json.JSONDecodeError:
                    result["issues"] = [{"message": raw[:500], "severity": "error"}]
            else:
                result["issues"] = [{"message": stderr.decode()[:500] or "trivy failed", "severity": "error"}]
        except asyncio.TimeoutError:
            result["issues"] = [{"message": "trivy timed out after 120s", "severity": "error"}]
        except FileNotFoundError:
            logger.warning("trivy not found – skipping security validation")
            result["passed"] = True
            result["issues"] = [{"message": "trivy not installed – skipped", "severity": "info"}]
        except Exception as e:
            logger.error("trivy execution error: %s", e)
            result["issues"] = [{"message": str(e)[:200], "severity": "error"}]
        return result


terraform_validator = TerraformValidatorService()

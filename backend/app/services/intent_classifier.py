"""
Intent Classification Service
Pattern-based safety net for provisioning intent detection
Always validates AI responses, never defaults to a single type
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

SUPPORTED_INTENTS = {
    "Resource Group": ["resource group", "rg ", "new rg", "create rg", "resourcegroup"],
    "Virtual Machine": ["virtual machine", "vm ", "ec2", "server", "ubuntu", "centos", "windows server", "linux vm", "provision vm", "create vm", "deploy vm"],
    "Storage Account": ["storage account", "storage account", "blob", "file share", "data lake", "create storage", "deploy storage"],
    "Virtual Network": ["virtual network", "vnet", "vnet", "network", "subnet", "vpc"],
    "Subnet": ["subnet"],
    "NSG": ["nsg", "network security group", "firewall"],
    "Public IP": ["public ip", "public ip address", "pip"],
    "SQL Database": ["sql database", "sql db", "mssql", "azure sql", "database"],
    "App Service": ["app service", "web app", "webapp", "app service plan"],
    "AKS": ["aks", "kubernetes", "k8s", "container"],
    "Key Vault": ["key vault", "key vault", "secrets", "vault"],
    "Load Balancer": ["load balancer", "loadbalancer", "lb "],
    "Recovery Vault": ["recovery vault", "backup vault", "site recovery"],
}

TF_RESOURCE_TYPES = {
    "Resource Group": "resourcegroup",
    "Virtual Machine": "virtualmachine",
    "Storage Account": "storageaccount",
    "Virtual Network": "virtualnetwork",
    "Subnet": "subnet",
    "NSG": "nsg",
    "Public IP": "publicip",
    "SQL Database": "sqldatabase",
    "App Service": "appservice",
    "AKS": "aks",
    "Key Vault": "keyvault",
    "Load Balancer": "loadbalancer",
    "Recovery Vault": "recoveryvault",
}


def classify_intent(user_input: str) -> Optional[str]:
    """Classify provisioning intent using keyword/pattern matching.
    Returns the resource type string or None if confidence is too low."""
    if not user_input or not user_input.strip():
        return None

    lower = user_input.lower().strip()

    scores: dict[str, int] = {}
    for intent, patterns in SUPPORTED_INTENTS.items():
        score = 0
        for pattern in patterns:
            if pattern.endswith(" "):
                if pattern in lower or lower.startswith(pattern.strip()):
                    score += 2
            elif pattern.startswith(" "):
                if pattern in lower:
                    score += 1
            else:
                if pattern in lower:
                    score += 2
        if score > 0:
            scores[intent] = score

    if not scores:
        return None

    best = max(scores, key=scores.get)
    best_score = scores[best]
    total_score = sum(scores.values())

    confidence = best_score / total_score if total_score > 0 else 0

    if best_score < 2 or confidence < 0.3:
        return None

    return best


def is_valid_resource_type(resource_type: str) -> bool:
    """Check if a resource type is in the supported list."""
    return resource_type in SUPPORTED_INTENTS or resource_type.lower() in TF_RESOURCE_TYPES.values()


def normalize_resource_type(resource_type: str) -> str:
    """Normalize a resource type to the canonical form used in REQUIRED_FIELDS."""
    if resource_type in SUPPORTED_INTENTS:
        return resource_type
    lower = resource_type.lower().strip()
    for canonical, tf_type in TF_RESOURCE_TYPES.items():
        if lower == tf_type:
            return canonical
        if lower == canonical.lower():
            return canonical
    return resource_type

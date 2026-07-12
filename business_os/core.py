from __future__ import annotations

import copy
import hashlib
import hmac
import json
import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from typing import Any, Mapping


class ConfigError(ValueError):
    """Raised when a Business OS configuration violates a required invariant."""


class LicenseError(ValueError):
    """Raised when a license cannot be verified or does not authorize use."""


MODULES = {
    "tasks",
    "leads",
    "customers",
    "jobs",
    "quotes",
    "invoices",
    "payments",
    "expenses",
    "communications",
    "social",
    "advertising",
    "website",
    "calendar",
    "catalog",
    "reports",
    "proof",
    "errors",
    "settings",
    "conceptBuilder",
    "customerPortal",
}

TIER_MODULES = {
    "CORE": {
        "tasks",
        "leads",
        "customers",
        "jobs",
        "catalog",
        "proof",
        "errors",
        "settings",
    },
    "OPERATIONS": {
        "tasks",
        "leads",
        "customers",
        "jobs",
        "quotes",
        "invoices",
        "payments",
        "expenses",
        "communications",
        "calendar",
        "catalog",
        "reports",
        "proof",
        "errors",
        "settings",
    },
    "GROWTH": {
        "tasks",
        "leads",
        "customers",
        "jobs",
        "quotes",
        "invoices",
        "payments",
        "expenses",
        "communications",
        "social",
        "advertising",
        "website",
        "calendar",
        "catalog",
        "reports",
        "proof",
        "errors",
        "settings",
        "conceptBuilder",
    },
    "CONTROL": set(MODULES),
}

PROVIDER_STATUSES = {"DISABLED", "CREDENTIAL_REQUIRED", "TEST_READY", "CONNECTED"}
EXTERNAL_STATES = {"DISABLED", "TEST_ONLY", "APPROVAL_GATED", "LIVE"}
RELEASE_CHANNELS = {"demo", "test", "candidate", "production"}
LICENSE_STATUSES = {"ACTIVE", "SUSPENDED", "EXPIRED", "DEMO"}
TENANT_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")
NAMESPACE_RE = re.compile(r"^[A-Z0-9][A-Z0-9_-]{1,63}$")


@dataclass(frozen=True)
class AuthorizationDecision:
    allowed: bool
    reason: str
    role_id: str
    permission: str
    tenant_id: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "reason": self.reason,
            "roleId": self.role_id,
            "permission": self.permission,
            "tenantId": self.tenant_id,
        }


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ConfigError(message)


def _canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def configuration_digest(config: Mapping[str, Any]) -> str:
    return hashlib.sha256(_canonical_json(config).encode("utf-8")).hexdigest()


def _validate_provider(name: str, provider: Any) -> None:
    _require(isinstance(provider, dict), f"provider {name} must be an object")
    _require(isinstance(provider.get("adapter"), str) and provider["adapter"], f"provider {name} adapter is required")
    _require(provider.get("status") in PROVIDER_STATUSES, f"provider {name} status is invalid")
    secret_ref = provider.get("secretReference")
    if secret_ref is not None:
        _require(isinstance(secret_ref, str), f"provider {name} secretReference must be a string")
        _require(not secret_ref.startswith(("sk_", "AIza", "ghp_")), f"provider {name} contains a raw secret instead of a reference")


def validate_configuration(config: Mapping[str, Any]) -> dict[str, Any]:
    _require(isinstance(config, Mapping), "configuration must be an object")
    required = {"schemaVersion", "tenant", "businessPack", "modules", "roles", "features", "providers", "release", "license"}
    missing = sorted(required - set(config))
    _require(not missing, f"configuration is missing required keys: {', '.join(missing)}")
    _require(config["schemaVersion"] == "2.0", "schemaVersion must be 2.0")

    tenant = config["tenant"]
    _require(isinstance(tenant, dict), "tenant must be an object")
    for key in ("id", "displayName", "timezone", "dataNamespace"):
        _require(isinstance(tenant.get(key), str) and tenant[key].strip(), f"tenant.{key} is required")
    _require(bool(TENANT_RE.fullmatch(tenant["id"])), "tenant.id must be lowercase kebab-case")
    _require(bool(NAMESPACE_RE.fullmatch(tenant["dataNamespace"])), "tenant.dataNamespace must be uppercase namespace text")

    business_pack = config["businessPack"]
    _require(isinstance(business_pack, dict), "businessPack must be an object")
    for key in ("id", "version"):
        _require(isinstance(business_pack.get(key), str) and business_pack[key], f"businessPack.{key} is required")

    modules = config["modules"]
    _require(isinstance(modules, list) and modules, "modules must be a non-empty list")
    _require(len(modules) == len(set(modules)), "modules must be unique")
    unknown_modules = sorted(set(modules) - MODULES)
    _require(not unknown_modules, f"unknown modules: {', '.join(unknown_modules)}")

    roles = config["roles"]
    _require(isinstance(roles, list) and roles, "roles must be a non-empty list")
    role_ids: set[str] = set()
    for role in roles:
        _require(isinstance(role, dict), "every role must be an object")
        role_id = role.get("id")
        _require(isinstance(role_id, str) and role_id, "every role requires id")
        _require(role_id not in role_ids, f"duplicate role id: {role_id}")
        role_ids.add(role_id)
        permissions = role.get("permissions")
        _require(isinstance(permissions, list), f"role {role_id} permissions must be a list")
        _require(len(permissions) == len(set(permissions)), f"role {role_id} permissions must be unique")
    _require("owner" in role_ids, "roles must include owner")

    features = config["features"]
    _require(isinstance(features, dict), "features must be an object")
    _require(features.get("selectedRecordOnly") is True, "selectedRecordOnly must remain true")
    _require(features.get("bulkExecution") is False, "bulkExecution must remain false")
    _require(features.get("automaticRetry") is False, "automaticRetry must remain false")
    external = features.get("externalActions")
    _require(isinstance(external, dict), "features.externalActions must be an object")
    for action, state in external.items():
        _require(state in EXTERNAL_STATES, f"external action {action} state is invalid")

    providers = config["providers"]
    _require(isinstance(providers, dict), "providers must be an object")
    for provider_name, provider in providers.items():
        _validate_provider(provider_name, provider)

    release = config["release"]
    _require(isinstance(release, dict), "release must be an object")
    _require(release.get("channel") in RELEASE_CHANNELS, "release.channel is invalid")
    _require(isinstance(release.get("version"), str) and release["version"], "release.version is required")
    _require(release.get("backupRequired") is True, "release.backupRequired must remain true")
    _require(release.get("rollbackRequired") is True, "release.rollbackRequired must remain true")

    license_data = config["license"]
    _require(isinstance(license_data, dict), "license must be an object")
    _require(license_data.get("tenantId") == tenant["id"], "license tenantId must match tenant.id")
    _require(license_data.get("tier") in TIER_MODULES, "license tier is invalid")
    _require(license_data.get("status") in LICENSE_STATUSES, "license status is invalid")
    licensed_modules = license_data.get("modules")
    _require(isinstance(licensed_modules, list), "license.modules must be a list")
    _require(not (set(licensed_modules) - MODULES), "license contains unknown modules")

    disallowed_by_tier = set(modules) - TIER_MODULES[license_data["tier"]]
    _require(not disallowed_by_tier, f"configured modules exceed {license_data['tier']} tier: {', '.join(sorted(disallowed_by_tier))}")
    unlicensed = set(modules) - set(licensed_modules)
    _require(not unlicensed, f"configured modules are not licensed: {', '.join(sorted(unlicensed))}")

    for action, state in external.items():
        if state == "LIVE":
            provider_name = action_to_provider(action)
            provider = providers.get(provider_name, {})
            _require(provider.get("status") == "CONNECTED", f"live action {action} requires connected {provider_name} provider")
            _require(release["channel"] == "production", f"live action {action} requires production release channel")

    return copy.deepcopy(dict(config))


def effective_modules(config: Mapping[str, Any]) -> list[str]:
    validated = validate_configuration(config)
    tier = validated["license"]["tier"]
    licensed = set(validated["license"]["modules"])
    return sorted(set(validated["modules"]) & TIER_MODULES[tier] & licensed)


def action_to_provider(action: str) -> str:
    mapping = {
        "customerEmail": "email",
        "paymentRequests": "payments",
        "paymentProcessing": "payments",
        "socialPublishing": "social",
        "advertisingSpend": "advertising",
        "websiteDeployment": "website",
        "finalDelivery": "storage",
        "calendarBooking": "calendar",
        "accountingSync": "accounting",
        "customerAuthentication": "authentication",
    }
    return mapping.get(action, action)


def authorization_decision(
    config: Mapping[str, Any],
    role_id: str,
    permission: str,
    tenant_id: str,
    record_tenant_id: str,
) -> AuthorizationDecision:
    validated = validate_configuration(config)
    configured_tenant = validated["tenant"]["id"]
    if tenant_id != configured_tenant:
        return AuthorizationDecision(False, "actor tenant does not match installation tenant", role_id, permission, tenant_id)
    if record_tenant_id != configured_tenant:
        return AuthorizationDecision(False, "record tenant does not match installation tenant", role_id, permission, tenant_id)
    role = next((item for item in validated["roles"] if item["id"] == role_id), None)
    if role is None:
        return AuthorizationDecision(False, "unknown role", role_id, permission, tenant_id)
    permissions = set(role["permissions"])
    allowed = "*" in permissions or permission in permissions
    return AuthorizationDecision(allowed, "permission granted" if allowed else "permission denied", role_id, permission, tenant_id)


def release_gate(config: Mapping[str, Any]) -> dict[str, Any]:
    validated = validate_configuration(config)
    failures: list[str] = []
    release = validated["release"]
    if not release.get("backupRequired"):
        failures.append("backup is not required")
    if not release.get("rollbackRequired"):
        failures.append("rollback is not required")
    for action, state in validated["features"]["externalActions"].items():
        if state == "LIVE":
            provider_name = action_to_provider(action)
            if validated["providers"].get(provider_name, {}).get("status") != "CONNECTED":
                failures.append(f"{action} provider is not connected")
    return {
        "status": "PASS" if not failures else "HOLD",
        "tenantId": validated["tenant"]["id"],
        "release": release["version"],
        "channel": release["channel"],
        "effectiveModules": effective_modules(validated),
        "failures": failures,
    }


def _license_payload(license_data: Mapping[str, Any]) -> dict[str, Any]:
    payload = dict(license_data)
    payload.pop("signature", None)
    return payload


def sign_license(license_data: Mapping[str, Any], secret: str) -> dict[str, Any]:
    if not secret:
        raise LicenseError("license signing secret is required")
    payload = _license_payload(license_data)
    signature = hmac.new(secret.encode("utf-8"), _canonical_json(payload).encode("utf-8"), hashlib.sha256).hexdigest()
    signed = copy.deepcopy(payload)
    signed["signature"] = signature
    return signed


def verify_license(license_data: Mapping[str, Any], secret: str, today: date | None = None) -> dict[str, Any]:
    if not secret:
        raise LicenseError("license verification secret is required")
    signature = license_data.get("signature")
    if not isinstance(signature, str):
        raise LicenseError("license signature is missing")
    expected = sign_license(license_data, secret)["signature"]
    if not hmac.compare_digest(signature, expected):
        raise LicenseError("license signature is invalid")
    if license_data.get("status") not in {"ACTIVE", "DEMO"}:
        raise LicenseError(f"license status is {license_data.get('status')}")
    expiry = license_data.get("expiresOn")
    if expiry:
        try:
            expires_on = date.fromisoformat(expiry)
        except ValueError as exc:
            raise LicenseError("license expiresOn must be ISO date") from exc
        if expires_on < (today or datetime.now(timezone.utc).date()):
            raise LicenseError("license is expired")
    return copy.deepcopy(dict(license_data))


def migrate_configuration(config: Mapping[str, Any]) -> dict[str, Any]:
    version = config.get("schemaVersion")
    if version == "2.0":
        return validate_configuration(config)
    if version != "1.0":
        raise ConfigError(f"unsupported configuration version: {version}")

    migrated = copy.deepcopy(dict(config))
    migrated["schemaVersion"] = "2.0"
    migrated.setdefault("license", {
        "tenantId": migrated.get("tenant", {}).get("id", "unknown-tenant"),
        "tier": "CONTROL",
        "status": "DEMO",
        "modules": list(migrated.get("modules", [])),
        "issuedOn": datetime.now(timezone.utc).date().isoformat(),
    })
    migrated.setdefault("theme", {})
    migrated.setdefault("security", {
        "tenantIsolation": True,
        "selectedRecordOnly": True,
        "duplicateLocks": True,
        "proofLog": True,
        "errorLog": True,
    })
    return validate_configuration(migrated)

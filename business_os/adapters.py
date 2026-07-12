from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from .core import ConfigError, action_to_provider, validate_configuration


@dataclass(frozen=True)
class AdapterResult:
    status: str
    provider: str
    action: str
    selected_record_id: str
    detail: dict[str, Any]

    def as_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "provider": self.provider,
            "action": self.action,
            "selectedRecordId": self.selected_record_id,
            "detail": self.detail,
        }


class ProviderAdapter(Protocol):
    name: str

    def healthcheck(self) -> dict[str, Any]: ...

    def execute(self, action: str, selected_record_id: str, payload: dict[str, Any]) -> dict[str, Any]: ...


class DisabledAdapter:
    def __init__(self, name: str, reason: str = "Provider is disabled or not connected") -> None:
        self.name = name
        self.reason = reason

    def healthcheck(self) -> dict[str, Any]:
        return {"status": "DISABLED", "provider": self.name, "reason": self.reason}

    def execute(self, action: str, selected_record_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        raise RuntimeError(self.reason)


class InMemoryTestAdapter:
    """Safe adapter for tests. It refuses production-mode execution."""

    def __init__(self, name: str, test_mode: bool = True) -> None:
        self.name = name
        self.test_mode = test_mode
        self.events: list[dict[str, Any]] = []

    def healthcheck(self) -> dict[str, Any]:
        return {"status": "TEST_READY" if self.test_mode else "DISABLED", "provider": self.name}

    def execute(self, action: str, selected_record_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.test_mode:
            raise RuntimeError("In-memory adapter is test-only")
        event = {
            "provider": self.name,
            "action": action,
            "selectedRecordId": selected_record_id,
            "payload": dict(payload),
        }
        self.events.append(event)
        return event


class ProviderRegistry:
    def __init__(self, config: dict[str, Any]) -> None:
        self.config = validate_configuration(config)
        self.adapters: dict[str, ProviderAdapter] = {}
        self._duplicate_keys: set[str] = set()
        for provider_name, provider in self.config["providers"].items():
            self.adapters[provider_name] = DisabledAdapter(provider_name, provider.get("notes") or "Provider is not connected")

    def register(self, provider_name: str, adapter: ProviderAdapter) -> None:
        if provider_name not in self.config["providers"]:
            raise ConfigError(f"provider {provider_name} is not configured")
        self.adapters[provider_name] = adapter

    def health(self) -> dict[str, Any]:
        return {name: adapter.healthcheck() for name, adapter in sorted(self.adapters.items())}

    def execute_selected(
        self,
        action: str,
        selected_record_id: str,
        payload: dict[str, Any],
        *,
        approved: bool,
        duplicate_key: str,
    ) -> AdapterResult:
        if not selected_record_id:
            raise ConfigError("selected_record_id is required")
        if not duplicate_key:
            raise ConfigError("duplicate_key is required")
        if duplicate_key in self._duplicate_keys:
            raise ConfigError("duplicate execution blocked")

        state = self.config["features"]["externalActions"].get(action, "DISABLED")
        provider_name = action_to_provider(action)
        provider_config = self.config["providers"].get(provider_name)
        if provider_config is None:
            raise ConfigError(f"no provider configured for action {action}")
        if state == "DISABLED":
            raise ConfigError(f"external action {action} is disabled")
        if state == "TEST_ONLY" and self.config["release"]["channel"] not in {"demo", "test"}:
            raise ConfigError(f"test-only action {action} cannot run in {self.config['release']['channel']}")
        if state in {"APPROVAL_GATED", "LIVE"} and not approved:
            raise ConfigError(f"external action {action} requires approval")
        if state == "LIVE" and provider_config["status"] != "CONNECTED":
            raise ConfigError(f"provider {provider_name} is not connected")

        adapter = self.adapters[provider_name]
        result = adapter.execute(action, selected_record_id, dict(payload))
        self._duplicate_keys.add(duplicate_key)
        return AdapterResult("EXECUTED", provider_name, action, selected_record_id, result)

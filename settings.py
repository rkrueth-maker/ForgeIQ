import os
from pathlib import Path

from dotenv import load_dotenv


class SettingsManager:
    def __init__(self, env_file=None):
        self.env_file = Path(env_file or ".env")
        self._settings = {}
        self.load()

    def _coerce_value(self, key, value):
        if key == "DRY_RUN_DEFAULT":
            if isinstance(value, bool):
                return value
            return str(value).strip().lower() in {"1", "true", "yes", "on"}
        return str(value)

    def load(self):
        if self.env_file.exists():
            load_dotenv(self.env_file, override=False)

        self._settings = {
            "SHOPIFY_STORE": os.getenv("SHOPIFY_STORE", "").strip(),
            "SHOPIFY_ADMIN_TOKEN": os.getenv("SHOPIFY_ADMIN_TOKEN", "").strip(),
            "SHOPIFY_API_VERSION": os.getenv("SHOPIFY_API_VERSION", "2026-04").strip(),
            "DRY_RUN_DEFAULT": os.getenv("DRY_RUN_DEFAULT", "true").strip().lower() in {"1", "true", "yes", "on"},
        }

    def get(self, key, default=None):
        return self._settings.get(key, default)

    def set(self, key, value):
        self._settings[key] = self._coerce_value(key, value)
        os.environ[key] = str(self._settings[key])
        self.save()
        return self._settings[key]

    def save(self):
        lines = []
        for key, value in self._settings.items():
            if isinstance(value, bool):
                value = "true" if value else "false"
            lines.append(f"{key}={value}")

        self.env_file.write_text("\n".join(lines) + "\n", encoding="utf-8")

    def require_shopify_credentials(self):
        if not self.get("SHOPIFY_STORE") or not self.get("SHOPIFY_ADMIN_TOKEN"):
            raise RuntimeError(
                "Missing SHOPIFY_STORE or SHOPIFY_ADMIN_TOKEN in .env. "
                "Create a .env file with your Shopify settings."
            )


settings = SettingsManager()

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SHOPIFY_STORE", "example.myshopify.com")
os.environ.setdefault("SHOPIFY_ADMIN_TOKEN", "test-token")

import forgeiq_shopify_setup as setup
from settings import SettingsManager


def test_find_product_by_title_keyword_returns_none_when_no_relevant_match(monkeypatch):
    def fake_graphql(query, variables=None):
        return {
            "products": {
                "edges": [
                    {
                        "node": {
                            "id": "gid://shopify/Product/1",
                            "title": "Different Item",
                            "handle": "different-item",
                        }
                    }
                ]
            }
        }

    monkeypatch.setattr(setup, "graphql", fake_graphql)

    assert setup.find_product_by_title_keyword("Garage Hook") is None


def test_settings_manager_persists_values(tmp_path):
    env_file = tmp_path / ".env"
    settings = SettingsManager(env_file)
    settings.set("SHOPIFY_STORE", "demo.myshopify.com")

    assert settings.get("SHOPIFY_STORE") == "demo.myshopify.com"
    assert "SHOPIFY_STORE=demo.myshopify.com" in env_file.read_text(encoding="utf-8")

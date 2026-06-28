import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SHOPIFY_STORE", "example.myshopify.com")
os.environ.setdefault("SHOPIFY_ADMIN_TOKEN", "test-token")

from shopify import connection_check


def test_connection_check_reports_missing_scopes(monkeypatch):
    monkeypatch.setattr(connection_check.client, "validate_connection", lambda: "ForgeIQ Supply")
    monkeypatch.setattr(
        connection_check,
        "_fetch_granted_scopes",
        lambda: ["read_products", "write_products"],
    )

    result = connection_check.run()

    assert result["status"] == "warning"
    assert result["store"] == "ForgeIQ Supply"
    assert "read_inventory" in result["missing_scopes"]
    assert "write_content" in result["missing_scopes"]


def test_connection_check_reports_revoked_token(monkeypatch):
    def fail_connection():
        raise RuntimeError("Shopify Admin API returned HTTP 401. Token invalid or not for this store.")

    monkeypatch.setattr(connection_check.client, "validate_connection", fail_connection)

    result = connection_check.run()

    assert result["status"] == "failed"
    assert "HTTP 401" in result["reason"]
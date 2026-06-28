import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SHOPIFY_STORE", "example.myshopify.com")
os.environ.setdefault("SHOPIFY_ADMIN_TOKEN", "test-token")

from shopify.analytics_dashboard import gather_google_analytics_metrics, gather_search_console_metrics
from shopify.orchestrator import prioritize_recommendations


def test_prioritize_recommendations_orders_by_priority_then_confidence():
    recommendations = [
        {"priority": 60, "confidence": 0.9, "current_title": "B"},
        {"priority": 85, "confidence": 0.6, "current_title": "A"},
        {"priority": 85, "confidence": 0.8, "current_title": "C"},
    ]

    prioritized = prioritize_recommendations(recommendations, limit=2)
    assert prioritized[0]["current_title"] == "C"
    assert prioritized[1]["current_title"] == "A"


def test_google_analytics_metrics_unconfigured(monkeypatch):
    from settings import settings

    monkeypatch.setattr(settings, "get", lambda key, default=None: "" if key == "GA_EXPORT_CSV" else default)
    data = gather_google_analytics_metrics()

    assert data["source"] == "unconfigured"
    assert data["sessions"] == 0


def test_search_console_metrics_unconfigured(monkeypatch):
    from settings import settings

    monkeypatch.setattr(settings, "get", lambda key, default=None: "" if key == "GSC_EXPORT_CSV" else default)
    data = gather_search_console_metrics()

    assert data["source"] == "unconfigured"
    assert data["clicks"] == 0

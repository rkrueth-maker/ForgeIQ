import json
import os
from datetime import datetime

from shopify.analytics_dashboard import build_dashboard_data
from shopify.content_engine import generate_preview
from shopify.product_optimizer import analyze_products, fetch_products

STATE_FILE = os.path.join("reports", "forgeiq_orchestrator_state.json")
SUMMARY_FILE = os.path.join("reports", "forgeiq_orchestrator_summary.md")


def _load_state():
    if not os.path.exists(STATE_FILE):
        return {"runs": [], "completed_work": []}
    with open(STATE_FILE, "r", encoding="utf-8") as handle:
        return json.load(handle)


def _save_state(state):
    os.makedirs("reports", exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2)


def prioritize_recommendations(recommendations, limit=10):
    ordered = sorted(
        recommendations,
        key=lambda rec: (int(rec.get("priority", 0)), float(rec.get("confidence", 0))),
        reverse=True,
    )
    return ordered[:limit]


def plan_actions(top_recommendations, dashboard):
    actions = []
    if top_recommendations:
        actions.append("Review and approve high-priority optimizer recommendations")
    if dashboard["shopify"]["images_missing_alt"] > 0:
        actions.append("Run targeted alt text updates for products with missing image alt text")
    if dashboard["shopify"]["products_missing_meta"] > 0:
        actions.append("Prioritize metadata generation for products missing meta descriptions")
    if dashboard["google_analytics"]["source"] == "unconfigured":
        actions.append("Configure GA_EXPORT_CSV for richer analytics signal ingestion")
    if dashboard["search_console"]["source"] == "unconfigured":
        actions.append("Configure GSC_EXPORT_CSV for search performance insights")
    actions.append("Generate content engine drafts for high-priority products")
    return actions


def generate_daily_summary(top_recommendations, actions, dashboard):
    lines = [
        "# ForgeIQ Orchestrator Daily Summary",
        f"Generated: {datetime.utcnow().isoformat()}Z",
        "",
        "## Store Health",
        f"- Store health score: {dashboard['health']['store_health_score']}",
        f"- Product count: {dashboard['shopify']['product_count']}",
        f"- Average SEO score: {dashboard['shopify']['average_seo_score']}",
        "",
        "## Priority Recommendations",
    ]

    if not top_recommendations:
        lines.append("- No high-priority recommendations at this time.")
    else:
        for rec in top_recommendations:
            lines.append(
                f"- priority={rec.get('priority', 0)} confidence={rec.get('confidence', 0)} "
                f"| {rec.get('current_title', 'Untitled')}"
            )

    lines.extend(["", "## Planned Actions"])
    for action in actions:
        lines.append(f"- {action}")

    os.makedirs("reports", exist_ok=True)
    with open(SUMMARY_FILE, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")

    return SUMMARY_FILE


def run():
    products = fetch_products()
    _rows, recommendations = analyze_products(products)
    top_recommendations = prioritize_recommendations(recommendations, limit=10)

    dashboard = build_dashboard_data()
    _content_file, content_count = generate_preview(channels=["blog", "facebook"], tone="balanced")

    actions = plan_actions(top_recommendations, dashboard)
    summary_file = generate_daily_summary(top_recommendations, actions, dashboard)

    state = _load_state()
    run_record = {
        "timestamp": f"{datetime.utcnow().isoformat()}Z",
        "top_recommendations": [
            {
                "title": rec.get("current_title"),
                "priority": rec.get("priority"),
                "confidence": rec.get("confidence"),
            }
            for rec in top_recommendations
        ],
        "planned_actions": actions,
        "content_items_generated": content_count,
    }
    state["runs"].append(run_record)
    state["completed_work"].append(
        {
            "timestamp": run_record["timestamp"],
            "note": "Generated daily orchestration summary and coordinated optimizer/content tasks",
        }
    )
    _save_state(state)

    print("ForgeIQ Orchestrator run complete.")
    print(f"Summary: {summary_file}")
    print(f"State: {STATE_FILE}")

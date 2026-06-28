import csv
import json
import os
from datetime import datetime

from settings import settings
from shopify.product_optimizer import fetch_products, score_product

DASHBOARD_MD_FILE = os.path.join("reports", "forgeiq_analytics_dashboard.md")
DASHBOARD_JSON_FILE = os.path.join("reports", "forgeiq_analytics_dashboard.json")


def _safe_float(value):
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return 0.0


def _read_csv_rows(path):
    if not path or not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def gather_shopify_metrics():
    products = fetch_products()
    scores = []
    missing_meta = 0
    missing_alt = 0

    for product in products:
        score, issues = score_product(product)
        scores.append(score)
        if any("Missing meta description" in issue for issue in issues):
            missing_meta += 1

        images = [edge["node"] for edge in product.get("images", {}).get("edges", [])]
        missing_alt += sum(1 for image in images if not image.get("altText"))

    product_count = len(products)
    avg_score = round(sum(scores) / product_count, 2) if product_count else 0

    return {
        "product_count": product_count,
        "average_seo_score": avg_score,
        "products_missing_meta": missing_meta,
        "images_missing_alt": missing_alt,
    }


def gather_google_analytics_metrics():
    rows = _read_csv_rows(settings.get("GA_EXPORT_CSV", ""))
    if not rows:
        return {
            "source": "unconfigured",
            "sessions": 0,
            "users": 0,
            "conversions": 0,
        }

    sessions = sum(_safe_float(row.get("sessions") or row.get("Sessions")) for row in rows)
    users = sum(_safe_float(row.get("users") or row.get("Users")) for row in rows)
    conversions = sum(
        _safe_float(row.get("conversions") or row.get("Conversions") or row.get("keyEvents")) for row in rows
    )

    return {
        "source": "csv",
        "sessions": int(sessions),
        "users": int(users),
        "conversions": round(conversions, 2),
    }


def gather_search_console_metrics():
    rows = _read_csv_rows(settings.get("GSC_EXPORT_CSV", ""))
    if not rows:
        return {
            "source": "unconfigured",
            "clicks": 0,
            "impressions": 0,
            "ctr": 0,
            "average_position": 0,
        }

    clicks = sum(_safe_float(row.get("clicks") or row.get("Clicks")) for row in rows)
    impressions = sum(_safe_float(row.get("impressions") or row.get("Impressions")) for row in rows)
    ctr_values = [_safe_float(row.get("ctr") or row.get("CTR")) for row in rows]
    position_values = [_safe_float(row.get("position") or row.get("Position")) for row in rows]

    ctr = (clicks / impressions) if impressions else 0
    if max(ctr_values or [0]) > 1:
        ctr = ctr / 100

    avg_position = (sum(position_values) / len(position_values)) if position_values else 0

    return {
        "source": "csv",
        "clicks": int(clicks),
        "impressions": int(impressions),
        "ctr": round(ctr, 4),
        "average_position": round(avg_position, 2),
    }


def build_dashboard_data():
    shopify = gather_shopify_metrics()
    ga = gather_google_analytics_metrics()
    gsc = gather_search_console_metrics()

    health = {
        "store_health_score": round((shopify["average_seo_score"] * 0.6) + ((1 - gsc["ctr"]) * 40), 2),
        "seo_performance": {
            "average_product_score": shopify["average_seo_score"],
            "search_ctr": gsc["ctr"],
            "average_position": gsc["average_position"],
        },
        "product_performance": {
            "product_count": shopify["product_count"],
            "products_missing_meta": shopify["products_missing_meta"],
            "images_missing_alt": shopify["images_missing_alt"],
        },
    }

    return {
        "generated_at": f"{datetime.utcnow().isoformat()}Z",
        "shopify": shopify,
        "google_analytics": ga,
        "search_console": gsc,
        "health": health,
    }


def write_dashboard(data):
    os.makedirs("reports", exist_ok=True)

    with open(DASHBOARD_JSON_FILE, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)

    lines = [
        "# ForgeIQ Unified Analytics Dashboard",
        f"Generated: {data['generated_at']}",
        "",
        "## Shopify",
        f"- Product count: {data['shopify']['product_count']}",
        f"- Average SEO score: {data['shopify']['average_seo_score']}",
        f"- Products missing meta descriptions: {data['shopify']['products_missing_meta']}",
        f"- Images missing alt text: {data['shopify']['images_missing_alt']}",
        "",
        "## Google Analytics",
        f"- Source: {data['google_analytics']['source']}",
        f"- Sessions: {data['google_analytics']['sessions']}",
        f"- Users: {data['google_analytics']['users']}",
        f"- Conversions: {data['google_analytics']['conversions']}",
        "",
        "## Google Search Console",
        f"- Source: {data['search_console']['source']}",
        f"- Clicks: {data['search_console']['clicks']}",
        f"- Impressions: {data['search_console']['impressions']}",
        f"- CTR: {data['search_console']['ctr']}",
        f"- Average position: {data['search_console']['average_position']}",
        "",
        "## Unified Health",
        f"- Store health score: {data['health']['store_health_score']}",
        f"- SEO average score: {data['health']['seo_performance']['average_product_score']}",
        f"- Search CTR: {data['health']['seo_performance']['search_ctr']}",
    ]

    with open(DASHBOARD_MD_FILE, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")

    return DASHBOARD_MD_FILE, DASHBOARD_JSON_FILE


def run():
    data = build_dashboard_data()
    markdown_file, json_file = write_dashboard(data)
    print("ForgeIQ Unified Analytics Dashboard generated.")
    print(f"Markdown: {markdown_file}")
    print(f"JSON: {json_file}")

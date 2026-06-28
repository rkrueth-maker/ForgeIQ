import os
from datetime import datetime

from shopify.client import client

REPORT_FILE = os.path.join("reports", "forgeiq_content_engine_preview.md")


def generate_preview():
    query = """
    query getProductsForContent {
      products(first: 5) {
        edges {
          node {
            id
            title
            handle
            productType
            vendor
            seo {
              description
            }
          }
        }
      }
    }
    """

    data = client.graphql(query)
    products = [edge["node"] for edge in data.get("products", {}).get("edges", [])]

    lines = [
        "# ForgeIQ Content Engine Preview",
        f"Generated: {datetime.utcnow().isoformat()}Z",
        "",
        "This is a phase 2 scaffold output. Content generation logic can be expanded here.",
        "",
    ]

    for product in products:
        title = product.get("title") or "Untitled"
        handle = product.get("handle") or "unknown"
        product_type = product.get("productType") or "Product"
        vendor = product.get("vendor") or "Store"
        seo_desc = ((product.get("seo") or {}).get("description") or "").strip()

        lines.append(f"## {title}")
        lines.append(f"- Handle: `{handle}`")
        lines.append(f"- Type: {product_type}")
        lines.append(f"- Vendor: {vendor}")
        lines.append(
            f"- Blog seed: {title} is a featured {product_type.lower()} from {vendor}, designed for practical daily use."
        )
        lines.append(
            f"- Social seed: Upgrade your setup with {title}. Explore details: /products/{handle}"
        )
        if seo_desc:
            lines.append(f"- Existing SEO description: {seo_desc}")
        lines.append("")

    os.makedirs(os.path.dirname(REPORT_FILE), exist_ok=True)
    with open(REPORT_FILE, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")

    return REPORT_FILE, len(products)


def run():
    shop_name = client.validate_connection()
    print(f"Connected to Shopify store: {shop_name}")
    report_file, count = generate_preview()
    print(f"Generated content preview for {count} product(s).")
    print(f"Preview file: {report_file}")

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SHOPIFY_STORE", "example.myshopify.com")
os.environ.setdefault("SHOPIFY_ADMIN_TOKEN", "test-token")

from shopify.content_engine import generate_blog_post, generate_email_newsletter, generate_facebook_post, generate_pinterest_copy


def _sample_product():
    return {
        "title": "Power Tool Organizer",
        "handle": "power-tool-organizer",
        "productType": "Garage Storage",
        "vendor": "ForgeIQ Supply",
        "seo": {"description": ""},
    }


def test_blog_generation_contains_structure_and_url():
    text = generate_blog_post(_sample_product(), tone="professional", brand="ForgeIQ Supply")
    assert "Blog Draft" in text
    assert "/products/power-tool-organizer" in text


def test_social_copy_generation_for_pinterest_and_facebook():
    pin = generate_pinterest_copy(_sample_product(), tone="friendly", brand="ForgeIQ")
    fb = generate_facebook_post(_sample_product(), tone="bold", brand="ForgeIQ")

    assert "Pinterest" in pin
    assert "Destination URL" in pin
    assert "Facebook Post" in fb
    assert "CTA:" in fb


def test_email_newsletter_contains_subject_and_products():
    text = generate_email_newsletter([_sample_product()], tone="balanced", brand="ForgeIQ")
    assert "Subject:" in text
    assert "Power Tool Organizer" in text

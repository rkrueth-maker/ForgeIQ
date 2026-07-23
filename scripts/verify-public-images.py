#!/usr/bin/env python3
"""Verify locked Highway 38 public image binaries and declared placements."""

from __future__ import annotations

import hashlib
import json
import re
import struct
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ASSET_MANIFEST_PATH = ROOT / "scripts/config/approved-public-assets.json"
PLACEMENT_MANIFEST_PATH = ROOT / "scripts/config/approved-public-image-placements.json"
ROUTE_MANIFEST_PATH = ROOT / "scripts/config/public-website-routes.json"
IMG_RE = re.compile(r'<img\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>', re.I)
ALT_RE = re.compile(r'\balt=["\']([^"\']*)["\']', re.I)
CSS_URL_RE = re.compile(r'url\(["\']?([^"\')]+)["\']?\)', re.I)
IGNORED_PREFIXES = ("http://", "https://", "data:", "mailto:", "tel:", "#")
MIN_IMAGE_BYTES = 128
MIN_LOGO_BYTES = 1_000_000
MIN_LOGO_DIMENSION = 1000


def load_json(path: Path, label: str) -> dict:
    if not path.exists():
        raise RuntimeError(f"missing {label}: {path.relative_to(ROOT)}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RuntimeError(f"invalid {label}: {exc}") from exc


def raw_path(raw: str) -> str:
    return urlsplit(raw).path


def resolve_local_asset(raw: str, base_file: Path) -> Path | None:
    if raw.startswith(IGNORED_PREFIXES):
        return None
    path_text = raw_path(raw)
    candidate = (
        ROOT / path_text.lstrip("/")
        if path_text.startswith("/")
        else base_file.parent / path_text
    ).resolve()
    try:
        candidate.relative_to(ROOT.resolve())
    except ValueError:
        return None
    return candidate


def image_file_is_valid(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < MIN_IMAGE_BYTES:
        return False
    head = path.read_bytes()[:16]
    suffix = path.suffix.lower()
    if suffix == ".png":
        return head.startswith(b"\x89PNG\r\n\x1a\n")
    if suffix in {".jpg", ".jpeg"}:
        return head.startswith(b"\xff\xd8\xff")
    if suffix == ".webp":
        return head.startswith(b"RIFF") and head[8:12] == b"WEBP"
    if suffix == ".gif":
        return head.startswith((b"GIF87a", b"GIF89a"))
    if suffix == ".svg":
        return b"<svg" in path.read_bytes()[:512].lower()
    return True


def git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    header = f"blob {len(data)}\0".encode("ascii")
    return hashlib.sha1(header + data).hexdigest()


def validate_logo(logo_file: Path, expected_blob_sha: str, errors: list[str]) -> str:
    if not image_file_is_valid(logo_file):
        errors.append(f"INVALID APPROVED LOGO: {logo_file.relative_to(ROOT)}")
        return "MISSING_OR_INVALID"
    data = logo_file.read_bytes()
    if len(data) < MIN_LOGO_BYTES:
        errors.append(f"APPROVED LOGO TOO SMALL: {len(data)} bytes")
    width, height = struct.unpack(">II", data[16:24])
    if width < MIN_LOGO_DIMENSION or height < MIN_LOGO_DIMENSION:
        errors.append(f"APPROVED LOGO DIMENSIONS TOO SMALL: {width}x{height}")
    actual = git_blob_sha(logo_file)
    if actual != expected_blob_sha:
        errors.append(
            f"APPROVED LOGO BINARY MISMATCH: expected Git blob {expected_blob_sha}, got {actual}"
        )
    return actual


def validate_declared_image(
    raw: str,
    base_file: Path,
    checked_assets: set[Path],
    errors: list[str],
    context: str,
) -> None:
    candidate = resolve_local_asset(raw, base_file)
    if candidate is None or not candidate.exists():
        errors.append(f"BROKEN IMAGE: {context} -> {raw}")
        return
    if candidate not in checked_assets:
        checked_assets.add(candidate)
        if not image_file_is_valid(candidate):
            errors.append(f"INVALID IMAGE FILE: {candidate.relative_to(ROOT)}")


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    checked_assets: set[Path] = set()

    try:
        assets = load_json(ASSET_MANIFEST_PATH, "approved asset manifest")
        placements = load_json(PLACEMENT_MANIFEST_PATH, "image placement manifest")
        routes = load_json(ROUTE_MANIFEST_PATH, "public route manifest")
    except RuntimeError as exc:
        print("Highway 38 public image verification")
        print(f"ERROR: {exc}")
        return 1

    required_assets = {
        "approved_logo",
        "shared_public_css",
        "shared_public_js",
        "business_office_config",
        "production_url",
        "forbidden_logo_substitutes",
    }
    missing = sorted(required_assets - set(assets))
    if missing:
        errors.append(f"APPROVED ASSET MANIFEST MISSING KEYS: {', '.join(missing)}")

    logo = assets.get("approved_logo", {})
    logo_path = logo.get("path", "")
    logo_reference = logo.get("public_reference", "")
    logo_alt = logo.get("alt_text", "")
    logo_file = ROOT / logo_path
    actual_logo_blob = validate_logo(
        logo_file,
        str(logo.get("git_blob_sha", "")).lower(),
        errors,
    )
    if bool(logo.get("allow_image_substitute")):
        errors.append("APPROVED LOGO POLICY ERROR: image substitution must remain disabled")

    shared_js_path = ROOT / assets.get("shared_public_js", "")
    shared_css_path = ROOT / assets.get("shared_public_css", "")
    if not shared_js_path.exists():
        errors.append(f"MISSING SHARED PUBLIC JS: {shared_js_path.relative_to(ROOT)}")
        shared_js = ""
    else:
        shared_js = shared_js_path.read_text(encoding="utf-8", errors="replace")
        if logo_reference not in shared_js:
            errors.append(
                f"CANONICAL SHELL LOGO REFERENCE MISMATCH: expected {logo_reference}"
            )
        if f'alt="{logo_alt}"' not in shared_js:
            errors.append(f"CANONICAL SHELL LOGO ALT MISMATCH: expected {logo_alt!r}")
        if not re.search(
            r"imagePolicy:\{changeSource:false,insertImages:false,fallbackImages:false",
            shared_js,
        ):
            errors.append("CANONICAL SHELL IMAGE-SOURCE LOCK IS MISSING")

    business_config_path = ROOT / assets.get("business_office_config", "")
    expected_logo_url = assets.get("production_url", "").rstrip("/") + "/" + logo_reference
    if not business_config_path.exists():
        errors.append(f"MISSING BUSINESS OFFICE CONFIG: {business_config_path.relative_to(ROOT)}")
    else:
        try:
            config = json.loads(business_config_path.read_text(encoding="utf-8"))
            branding = config.get("branding", {})
            if branding.get("logoPath") != logo_path:
                errors.append(
                    f"BUSINESS OFFICE LOGO PATH MISMATCH: {branding.get('logoPath')!r}; expected {logo_path!r}"
                )
            if branding.get("logoUrl") != expected_logo_url:
                errors.append(
                    f"BUSINESS OFFICE LOGO URL MISMATCH: {branding.get('logoUrl')!r}; expected {expected_logo_url!r}"
                )
        except (OSError, ValueError) as exc:
            errors.append(f"INVALID BUSINESS OFFICE CONFIG: {exc}")

    scanned_text: dict[str, str] = {}
    for page_name, declared in placements.get("pages", {}).items():
        page = ROOT / page_name
        if not page.exists():
            errors.append(f"MISSING IMAGE-BEARING PAGE: {page_name}")
            continue
        text = page.read_text(encoding="utf-8", errors="replace")
        scanned_text[page_name] = text
        tags = list(IMG_RE.finditer(text))
        for item in declared:
            src = item.get("src", "")
            alt = item.get("alt", "")
            matching = [match.group(0) for match in tags if raw_path(match.group(1)) == src]
            if not matching:
                errors.append(f"MISSING DECLARED IMAGE: {page_name} -> {src}")
            elif not any(
                (match_alt := ALT_RE.search(tag)) and match_alt.group(1).strip() == alt
                for tag in matching
            ):
                errors.append(f"DECLARED IMAGE ALT MISMATCH: {page_name} -> {src}")
            validate_declared_image(src, page, checked_assets, errors, page_name)

        for match in tags:
            src = match.group(1)
            alt_match = ALT_RE.search(match.group(0))
            if alt_match is None or not alt_match.group(1).strip():
                errors.append(f"MISSING ALT: {page_name} -> {src}")
            validate_declared_image(src, page, checked_assets, errors, page_name)

    for page_name, config in placements.get("dynamicPages", {}).items():
        page = ROOT / page_name
        if not page.exists():
            errors.append(f"MISSING DYNAMIC IMAGE PAGE: {page_name}")
            continue
        text = page.read_text(encoding="utf-8", errors="replace")
        scanned_text[page_name] = text
        for value in config.get("sourceConstants", {}).values():
            if value not in text:
                errors.append(f"MISSING DYNAMIC IMAGE SOURCE CONSTANT: {page_name} -> {value}")
        for files in config.get("examples", {}).values():
            for filename in files:
                if filename not in text:
                    errors.append(f"MISSING DYNAMIC IMAGE REFERENCE: {page_name} -> {filename}")
                directory = (
                    "assets/demo-workthroughs/"
                    if filename.startswith(("deck-", "irrigation-", "kitchen-"))
                    else "assets/contractor-demo/"
                )
                validate_declared_image(
                    directory + filename,
                    ROOT / page_name,
                    checked_assets,
                    errors,
                    page_name,
                )

    public_pages = [
        item.get("path", "")
        for item in routes.get("primary", [])
        if item.get("visibility") == "public"
    ]
    for page_name in public_pages:
        page = ROOT / page_name
        if not page.exists():
            errors.append(f"MISSING PRIMARY PUBLIC PAGE: {page_name}")
            continue
        text = page.read_text(encoding="utf-8", errors="replace")
        scanned_text.setdefault(page_name, text)
        if assets.get("shared_public_js", "") not in text:
            errors.append(f"PRIMARY PAGE DOES NOT LOAD CANONICAL SHELL: {page_name}")

    forbidden_substitutes = tuple(assets.get("forbidden_logo_substitutes", []))
    scanned_text[assets.get("shared_public_js", "")] = shared_js
    for target, text in scanned_text.items():
        for forbidden in forbidden_substitutes:
            if forbidden in text:
                errors.append(f"FORBIDDEN LOGO SUBSTITUTE: {target} -> {forbidden}")

    if not shared_css_path.exists():
        errors.append(f"MISSING SHARED PUBLIC CSS: {shared_css_path.relative_to(ROOT)}")
    else:
        css_text = shared_css_path.read_text(encoding="utf-8", errors="replace")
        for forbidden in forbidden_substitutes:
            if forbidden in css_text:
                errors.append(f"FORBIDDEN LOGO SUBSTITUTE: {shared_css_path.relative_to(ROOT)} -> {forbidden}")
        for raw in CSS_URL_RE.findall(css_text):
            if raw.startswith(IGNORED_PREFIXES):
                continue
            validate_declared_image(
                raw,
                shared_css_path,
                checked_assets,
                errors,
                str(shared_css_path.relative_to(ROOT)),
            )

    print("Highway 38 public image verification")
    print(f"Asset manifest: {ASSET_MANIFEST_PATH.relative_to(ROOT)}")
    print(f"Placement manifest: {PLACEMENT_MANIFEST_PATH.relative_to(ROOT)}")
    print(f"Approved logo Git blob: {actual_logo_blob}")
    print(f"Image-bearing pages checked: {len(placements.get('pages', {}))}")
    print(f"Image files checked: {len(checked_assets)}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    for item in errors:
        print(f"ERROR: {item}")
    for item in warnings:
        print(f"WARNING: {item}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())

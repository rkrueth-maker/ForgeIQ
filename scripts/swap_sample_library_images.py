#!/usr/bin/env python3
"""Swap the sample-library-now.html images to the requested PNG asset names.

Apply changes:
    /home/codespace/.python/current/bin/python scripts/swap_sample_library_images.py

Preview only:
    /home/codespace/.python/current/bin/python scripts/swap_sample_library_images.py --preview
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import urlopen

try:
    import cairosvg
except ImportError:  # pragma: no cover - optional, but expected in this repo environment
    cairosvg = None


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
HTML_FILE = ROOT / "sample-library-now.html"

COPIES = {
    "problem-snapshot-finished.png": "rick-review-problem-snapshot-v1.png",
    "basic-layout-finished.png": "rick-review-basic-layout-v1.png",
    "shop-flow-finished.png": "rick-review-shop-flow-v1.png",
    "project-packet-lite-finished.png": "rick-review-project-packet-v1.png",
    "business-cleanup-finished.png": "rick-review-business-cleanup-v1.png",
    "cleanup-rescue-finished.png": "rick-review-cleanup-rescue-v1.png",
    "workflow-opportunity-finished.png": "rick-review-workflow-opportunity-v1.png",
    "demo-run-sample-garage-bay.png": "h38-demo-overview-source.png",
    "proof-approval-gate.png": "approved-investor-proof-dashboard.png",
}

RENDERS = {
    "hero-garage-before-after.png": "sample-garage-proof.svg",
    "proof-request-submitted.png": "sample-ai-proof.svg",
    "proof-tracker-row.png": "sample-business-proof.svg",
    "proof-deliverable-draft.png": "sample-project-packet-lite-proof.svg",
    "proof-gmail-draft.png": "live-proof-board.svg",
}

HTML_REPLACEMENTS = {
    "assets/h38-demo-overview-chat-photo-v2.jpg?v=direct-photo-v2": "assets/demo-run-sample-garage-bay.png?v=direct-photo-v2",
    "assets/rick-review-problem-snapshot-v2.svg?v=rick-review-v2": "assets/problem-snapshot-finished.png?v=rick-review-v2",
    "assets/rick-review-basic-layout-v2.svg?v=rick-review-v2": "assets/basic-layout-finished.png?v=rick-review-v2",
    "assets/rick-review-shop-flow-v2.svg?v=rick-review-v2": "assets/shop-flow-finished.png?v=rick-review-v2",
    "assets/rick-review-project-packet-v2.svg?v=rick-review-v2": "assets/project-packet-lite-finished.png?v=rick-review-v2",
    "assets/rick-review-business-cleanup-v2.svg?v=rick-review-v2": "assets/business-cleanup-finished.png?v=rick-review-v2",
    "assets/rick-review-cleanup-rescue-v2.svg?v=rick-review-v2": "assets/cleanup-rescue-finished.png?v=rick-review-v2",
    "assets/rick-review-workflow-opportunity-v2.svg?v=rick-review-v2": "assets/workflow-opportunity-finished.png?v=rick-review-v2",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create the requested sample-library-now image assets and rewrite the page references."
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Only preview the PNGs and HTML changes without writing anything.",
    )
    parser.add_argument(
        "--verify",
        action="store_true",
        help="After applying, serve the repo locally and confirm the page loads all images.",
    )
    return parser.parse_args()


def log(message: str) -> None:
    print(message)


def ensure_source(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(f"Missing source asset: {path}")


def copy_asset(target_name: str, source_name: str, apply_changes: bool) -> None:
    source = ASSETS / source_name
    target = ASSETS / target_name
    ensure_source(source)
    if apply_changes:
        shutil.copy2(source, target)
    log(f"copy {source.relative_to(ROOT)} -> {target.relative_to(ROOT)}")


def render_svg(target_name: str, source_name: str, apply_changes: bool) -> None:
    if cairosvg is None:
        raise RuntimeError("cairosvg is required to rasterize SVG sources into PNG files")

    source = ASSETS / source_name
    target = ASSETS / target_name
    ensure_source(source)
    if apply_changes:
        cairosvg.svg2png(url=str(source), write_to=str(target))
    log(f"render {source.relative_to(ROOT)} -> {target.relative_to(ROOT)}")


def rewrite_html(apply_changes: bool) -> None:
    current_text = HTML_FILE.read_text(encoding="utf-8")
    updated_text = current_text
    for old, new in HTML_REPLACEMENTS.items():
        updated_text = updated_text.replace(old, new)

    if apply_changes:
        HTML_FILE.write_text(updated_text, encoding="utf-8")

    if current_text != updated_text:
        log(f"rewrite {HTML_FILE.relative_to(ROOT)}")
    else:
        log(f"no html changes needed for {HTML_FILE.relative_to(ROOT)}")


def validate_png_signature() -> None:
    for target_name in list(COPIES) + list(RENDERS):
        target = ASSETS / target_name
        if not target.exists():
            raise FileNotFoundError(f"Missing output asset: {target}")
        if target.read_bytes()[:8] != b"\x89PNG\r\n\x1a\n":
            raise RuntimeError(f"Not a PNG file: {target}")


def verify_http() -> None:
    class QuietHandler(SimpleHTTPRequestHandler):
        def log_message(self, fmt: str, *args: object) -> None:
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    port = server.server_port
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        os.chdir(ROOT)
        page = urlopen(f"http://127.0.0.1:{port}/sample-library-now.html").read().decode("utf-8")
        if "Repeatable Demo Product System" not in page:
            raise RuntimeError("sample-library-now.html did not load the expected page text")

        srcs = sorted(set(re.findall(r'src="([^"]+)"', page)))
        for src in srcs:
            data = urlopen(f"http://127.0.0.1:{port}/{src}").read()
            if not data:
                raise RuntimeError(f"Empty response for {src}")

        log(f"verified {len(srcs)} image refs over HTTP")
    finally:
        server.shutdown()
        server.server_close()


def main() -> int:
    args = parse_args()
    apply_changes = not args.preview

    log("Starting sample-library image swap utility")
    log(f"Repo root: {ROOT}")
    log(f"Apply changes: {apply_changes}")
    log("")

    for target_name, source_name in COPIES.items():
        copy_asset(target_name, source_name, apply_changes)

    for target_name, source_name in RENDERS.items():
        render_svg(target_name, source_name, apply_changes)

    rewrite_html(apply_changes)

    if apply_changes:
        validate_png_signature()
        if args.verify:
            verify_http()

    log("")
    log("Preview complete." if not apply_changes else "Apply complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
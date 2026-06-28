import json
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = str(PROJECT_ROOT / "reports")
APPROVAL_STATE_FILE = os.path.join(REPORTS_DIR, "forgeiq_web_approvals.json")


def load_approvals():
    if not os.path.exists(APPROVAL_STATE_FILE):
        return {"approved": [], "rejected": []}

    with open(APPROVAL_STATE_FILE, "r", encoding="utf-8") as handle:
        return json.load(handle)


def save_approvals(data):
    os.makedirs(os.path.dirname(APPROVAL_STATE_FILE), exist_ok=True)
    with open(APPROVAL_STATE_FILE, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)


def stage_approved_product_ids(product_ids):
    state = load_approvals()
    ordered_ids = list(dict.fromkeys(product_id for product_id in product_ids if product_id))

    for product_id in ordered_ids:
        if product_id not in state["approved"]:
            state["approved"].append(product_id)

    state["rejected"] = [product_id for product_id in state["rejected"] if product_id not in ordered_ids]
    save_approvals(state)
    return state

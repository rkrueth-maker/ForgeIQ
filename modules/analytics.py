from modules.base import BaseModule
from shopify.analytics_dashboard import run as analytics_run


class AnalyticsDashboardModule(BaseModule):
    key = "7"
    name = "Unified Analytics Dashboard"
    description = "Combine Shopify, GA, and GSC metrics into a dashboard report."

    def run(self):
        analytics_run()

from modules.base import BaseModule
from shopify.content_engine import run as content_engine_run


class ContentEngineModule(BaseModule):
    key = "6"
    name = "Content Engine Preview"
    description = "Generate phase 2 content seeds for blog and social channels."

    def run(self):
        content_engine_run()

from modules.base import BaseModule


class BlogModule(BaseModule):
    key = "5"
    name = "Generate Blog Post"
    description = "Generate a blog post draft from Shopify product content."

    def run(self):
        print("Blog post generator is not implemented yet.")

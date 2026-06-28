from shopify.client import client


def run():
    shop_name = client.validate_connection()
    print(f"Connected to Shopify store: {shop_name}")
    print("Blog post generator is not implemented yet.")

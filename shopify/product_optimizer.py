from shopify.client import client


def run():
    shop_name = client.validate_connection()
    print(f"Connected to Shopify store: {shop_name}")
    print("Product optimizer is not implemented yet.")

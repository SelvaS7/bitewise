import os
import requests
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("NUTRITIONIX_APP_ID")
APP_KEY = os.getenv("NUTRITIONIX_APP_KEY")
URL = "https://trackapi.nutritionix.com/v2/natural/nutrients"

headers = {
    "x-app-id": APP_ID,
    "x-app-key": APP_KEY,
    "Content-Type": "application/json",
}

query = {"query": "100g chicken breast", "timezone": "US/Eastern"}

response = requests.post(URL, json=query, headers=headers)

print("Status:", response.status_code)
print("Response:", response.json())

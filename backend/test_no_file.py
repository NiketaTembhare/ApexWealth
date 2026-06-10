import requests
url = 'http://localhost:8000/upload-statement'
try:
    response = requests.post(url)
    print(f"Status Code without file: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")

import requests
import os

with open('dummy.jpg', 'wb') as f:
    f.write(b'\xFF\xD8\xFF\xE0\x00\x10\x4A\x46\x49\x46\x00\x01\x01\x01\x00\x48\x00\x48\x00\x00') # minimal valid-ish JPG header

url = 'http://localhost:8000/upload-statement'
files = {'file': ('dummy.jpg', open('dummy.jpg', 'rb'), 'image/jpeg')}

try:
    response = requests.post(url, files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")

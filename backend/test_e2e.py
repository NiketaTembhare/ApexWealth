import requests
import json
import time

BASE_URL = 'http://localhost:8000'

def run_test():
    print("--- 1. Register and Login ---")
    username = f"testuser_{int(time.time())}"
    requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "password": "password123",
        "name": "Test User"
    })
    
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": "password123"
    }).json()
    
    token = login_res.get('access_token')
    if not token:
        print("Login failed")
        return
    print(f"Token acquired for {username}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    print("\n--- 2. Upload Document ---")
    with open('dummy.csv', 'w') as f:
        f.write("Date,Description,Category,Amount,Type\n2026-05-01,Salary Credit,Salary,65000,Credit\n2026-05-10,Swiggy Order,Food & Dining,350,Debit\n")
        
    with open('dummy.csv', 'rb') as f:
        res = requests.post(f"{BASE_URL}/upload-statement", files={'file': ('dummy.csv', f, 'text/csv')}, headers=headers)
        print("Upload Response Code:", res.status_code)
        
    print("\n--- 3. Fetch Transactions API ---")
    txns = requests.get(f"{BASE_URL}/transactions", headers=headers).json()
    print("Transactions count:", txns.get("total_count"))
    
    print("\n--- 4. Generate AI Advice (Report & Graph) ---")
    payload = {
        "monthly_income": 65000,
        "rent_expense": 18000,
        "food_expense": 5000,
        "shopping_expense": 2000,
        "travel_expense": 3000,
        "entertainment_expense": 1000,
        "savings_goal": 500000,
        "financial_goal_timeline": 24
    }
    advice = requests.post(f"{BASE_URL}/generate-advice", json=payload, headers=headers).json()
    print("Advice generated.")
    
    print("\n--- 5. Fetch History API ---")
    history = requests.get(f"{BASE_URL}/history", headers=headers).json()
    print("History count:", len(history))

if __name__ == "__main__":
    run_test()

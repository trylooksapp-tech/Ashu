import os
import uuid
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")


def test_core_persistence_and_accounting():
    assert BASE_URL
    s = requests.Session()
    day = "2099-01-01"
    tag = uuid.uuid4().hex[:8]
    order = s.post(f"{BASE_URL}/api/orders", json={"date": day, "time": "12:00", "order_type": "Dine-in", "items": [{"item": "TEST_item", "quantity": 2, "price": 25}], "tips": 10, "payment": "Cash"})
    assert order.status_code == 200 and order.json()["subtotal"] == 50
    purchase = s.post(f"{BASE_URL}/api/purchases", json={"date": day, "item": f"TEST_{tag}", "quantity": 3, "unit": "Kg", "price": 7})
    assert purchase.status_code == 200 and purchase.json()["total"] == 21
    expense = s.post(f"{BASE_URL}/api/expenses", json={"date": day, "category": "TEST", "description": tag, "amount": 9})
    assert expense.status_code == 200 and expense.json()["amount"] == 9
    report = s.get(f"{BASE_URL}/api/reports", params={"start": day, "end": day})
    assert report.status_code == 200 and report.json()["sales"] == 50 and report.json()["tips"] == 10 and report.json()["profit"] == 20
    s.delete(f"{BASE_URL}/api/orders/{order.json()['order_id']}")
    s.delete(f"{BASE_URL}/api/purchases/{purchase.json()['record_id']}")
    s.delete(f"{BASE_URL}/api/expenses/{expense.json()['record_id']}")
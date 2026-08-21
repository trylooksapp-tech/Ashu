"""Multi-tenancy tests for AFT: primary user data, fresh user zero-state, isolation."""
import os
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
TEST_TOKEN = "test-token-agent-001"
FRESH_TOKEN = "fresh-token-agent-001"
TEST_AUTH = {"Authorization": f"Bearer {TEST_TOKEN}"}
FRESH_AUTH = {"Authorization": f"Bearer {FRESH_TOKEN}"}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Primary test user has data ----------
class TestPrimaryUserHasData:
    def test_auth_me_test_user(self, s):
        r = s.get(f"{BASE_URL}/api/auth/me", headers=TEST_AUTH)
        assert r.status_code == 200
        assert r.json()["email"] == "test@aft.local"

    def test_menu_has_15(self, s):
        r = s.get(f"{BASE_URL}/api/menu", headers=TEST_AUTH)
        assert r.status_code == 200
        items = r.json()
        # Menu should have at least 15 preloaded items (may have TEST items too, but 15 originals)
        assert len(items) >= 15

    def test_orders_nonempty(self, s):
        r = s.get(f"{BASE_URL}/api/orders", headers=TEST_AUTH)
        assert r.status_code == 200
        assert len(r.json()) >= 1

    def test_dashboard_reflects_data(self, s):
        # There's data spread over dates 2099 etc; call with a broad date range via reports instead
        r = s.get(f"{BASE_URL}/api/reports", params={"start": "2000-01-01", "end": "2099-12-31"}, headers=TEST_AUTH)
        assert r.status_code == 200
        rep = r.json()
        assert rep["orders"] >= 1
        assert rep["sales"] > 0


# ---------- Fresh user zero-state ----------
class TestFreshUserZero:
    def test_auth_me_fresh(self, s):
        r = s.get(f"{BASE_URL}/api/auth/me", headers=FRESH_AUTH)
        assert r.status_code == 200
        assert r.json()["email"] == "fresh@aft.local"

    def test_menu_15_preloaded(self, s):
        r = s.get(f"{BASE_URL}/api/menu", headers=FRESH_AUTH)
        assert r.status_code == 200
        items = r.json()
        assert len(items) == 15
        names = {i["name"] for i in items}
        for expected in ["Chaat", "Chaumin", "Paneer Chaumin", "French Fries", "Manchurian"]:
            assert expected in names, f"Missing preloaded item {expected}"

    def test_settings_defaults(self, s):
        r = s.get(f"{BASE_URL}/api/settings", headers=FRESH_AUTH)
        assert r.status_code == 200
        d = r.json()
        assert d["restaurant_name"] == "AFT - Apna Flavour Town"
        assert d["tagline"] == "स्वाद की नई दुनिया"

    def test_orders_empty(self, s):
        r = s.get(f"{BASE_URL}/api/orders", headers=FRESH_AUTH)
        assert r.status_code == 200
        assert r.json() == []

    def test_purchases_empty(self, s):
        r = s.get(f"{BASE_URL}/api/purchases", headers=FRESH_AUTH)
        assert r.status_code == 200 and r.json() == []

    def test_expenses_empty(self, s):
        r = s.get(f"{BASE_URL}/api/expenses", headers=FRESH_AUTH)
        assert r.status_code == 200 and r.json() == []

    def test_dashboard_zero(self, s):
        r = s.get(f"{BASE_URL}/api/dashboard", headers=FRESH_AUTH)
        assert r.status_code == 200
        d = r.json()
        for k in ["sales", "orders", "raw", "other", "tips", "profit"]:
            assert d["today"][k] == 0, f"today.{k} != 0"
            assert d["month"][k] == 0, f"month.{k} != 0"

    def test_reports_zero(self, s):
        r = s.get(f"{BASE_URL}/api/reports", params={"start": "2026-01-01", "end": "2026-12-31"}, headers=FRESH_AUTH)
        assert r.status_code == 200
        rep = r.json()
        assert rep["sales"] == 0 and rep["orders"] == 0 and rep["profit"] == 0

    def test_stock_empty(self, s):
        r = s.get(f"{BASE_URL}/api/stock", headers=FRESH_AUTH)
        assert r.status_code == 200
        assert r.json() == []


# ---------- Data isolation ----------
class TestDataIsolation:
    created = {"order": None, "purchase": None, "expense": None}
    day = "2026-03-15"

    def test_fresh_creates_order(self, s):
        payload = {
            "date": self.day, "time": "12:00", "order_type": "Dine-in",
            "items": [{"item": "TEST_ISO_item", "portion": "Single", "quantity": 1, "price": 55}],
            "payment": "Cash",
        }
        r = s.post(f"{BASE_URL}/api/orders", json=payload, headers=FRESH_AUTH)
        assert r.status_code == 200
        d = r.json()
        assert d["net_sales"] == 55
        self.__class__.created["order"] = d["order_id"]

    def test_order_isolation(self, s):
        # Fresh user sees the new order
        fresh_orders = s.get(f"{BASE_URL}/api/orders", headers=FRESH_AUTH).json()
        assert any(o["order_id"] == self.__class__.created["order"] for o in fresh_orders)
        # Test user does NOT see it
        test_orders = s.get(f"{BASE_URL}/api/orders", headers=TEST_AUTH).json()
        assert not any(o["order_id"] == self.__class__.created["order"] for o in test_orders)

    def test_fresh_creates_purchase(self, s):
        r = s.post(f"{BASE_URL}/api/purchases", json={
            "date": self.day, "item": "TEST_ISO_raw", "quantity": 5, "unit": "Kg", "price": 10
        }, headers=FRESH_AUTH)
        assert r.status_code == 200
        self.__class__.created["purchase"] = r.json()["record_id"]
        # Not visible to test user
        test_purchases = s.get(f"{BASE_URL}/api/purchases", headers=TEST_AUTH).json()
        assert not any(p.get("record_id") == self.__class__.created["purchase"] for p in test_purchases)

    def test_fresh_creates_expense(self, s):
        r = s.post(f"{BASE_URL}/api/expenses", json={
            "date": self.day, "category": "Gas", "description": "TEST_ISO_gas", "amount": 100
        }, headers=FRESH_AUTH)
        assert r.status_code == 200
        self.__class__.created["expense"] = r.json()["record_id"]
        test_expenses = s.get(f"{BASE_URL}/api/expenses", headers=TEST_AUTH).json()
        assert not any(e.get("record_id") == self.__class__.created["expense"] for e in test_expenses)

    def test_fresh_stock_only(self, s):
        r = s.get(f"{BASE_URL}/api/stock", headers=FRESH_AUTH)
        stock = r.json()
        items = {x["item"] for x in stock}
        assert "TEST_ISO_raw" in items
        assert len(stock) == 1  # Only fresh user's aggregate


# ---------- Reset scope isolation ----------
class TestResetScope:
    def test_reset_affects_only_fresh(self, s):
        # Snapshot test user counts
        before_test_orders = len(s.get(f"{BASE_URL}/api/orders", headers=TEST_AUTH).json())
        before_test_purchases = len(s.get(f"{BASE_URL}/api/purchases", headers=TEST_AUTH).json())
        before_test_expenses = len(s.get(f"{BASE_URL}/api/expenses", headers=TEST_AUTH).json())

        # Fresh user has data from TestDataIsolation
        pre_fresh_orders = len(s.get(f"{BASE_URL}/api/orders", headers=FRESH_AUTH).json())
        assert pre_fresh_orders >= 1

        # Reset fresh user
        r = s.post(f"{BASE_URL}/api/settings/reset", headers=FRESH_AUTH)
        assert r.status_code == 200 and r.json().get("ok") is True

        # Fresh user zeroed
        assert s.get(f"{BASE_URL}/api/orders", headers=FRESH_AUTH).json() == []
        assert s.get(f"{BASE_URL}/api/purchases", headers=FRESH_AUTH).json() == []
        assert s.get(f"{BASE_URL}/api/expenses", headers=FRESH_AUTH).json() == []
        # But menu preserved (settings/reset doesn't touch menu)
        assert len(s.get(f"{BASE_URL}/api/menu", headers=FRESH_AUTH).json()) == 15

        # Test user counts unchanged
        after_test_orders = len(s.get(f"{BASE_URL}/api/orders", headers=TEST_AUTH).json())
        after_test_purchases = len(s.get(f"{BASE_URL}/api/purchases", headers=TEST_AUTH).json())
        after_test_expenses = len(s.get(f"{BASE_URL}/api/expenses", headers=TEST_AUTH).json())
        assert before_test_orders == after_test_orders
        assert before_test_purchases == after_test_purchases
        assert before_test_expenses == after_test_expenses

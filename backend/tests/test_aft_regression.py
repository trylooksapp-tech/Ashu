"""AFT backend regression tests (auth, discount, stock, exports, settings)."""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
TOKEN = "test-token-agent-001"
AUTH = {"Authorization": f"Bearer {TOKEN}"}


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ---------- Auth gating ----------
class TestAuthGating:
    def test_menu_requires_auth(self, s):
        r = s.get(f"{BASE_URL}/api/menu")
        assert r.status_code == 401

    def test_orders_requires_auth(self, s):
        r = s.get(f"{BASE_URL}/api/orders")
        assert r.status_code == 401

    def test_dashboard_requires_auth(self, s):
        r = s.get(f"{BASE_URL}/api/dashboard")
        assert r.status_code == 401

    def test_menu_ok_with_token(self, s):
        r = s.get(f"{BASE_URL}/api/menu", headers=AUTH)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_auth_me(self, s):
        r = s.get(f"{BASE_URL}/api/auth/me", headers=AUTH)
        assert r.status_code == 200
        assert r.json().get("email") == "test@aft.local"


# ---------- Order discount math ----------
class TestOrderDiscount:
    day = "2099-06-15"
    created = []

    def _order(self, discount_type, discount_value, tips=0, delivery=0):
        return {
            "date": self.day, "time": "13:00", "order_type": "Dine-in",
            "items": [{"item": "TEST_Paneer Chaumin", "portion": "Full", "quality": 8, "quantity": 2, "price": 100}],
            "tips": tips, "payment": "Cash",
            "discount_type": discount_type, "discount_value": discount_value,
            "delivery_charge": delivery,
        }

    def test_percent_discount(self, s):
        r = s.post(f"{BASE_URL}/api/orders", json=self._order("percent", 10, tips=20), headers=AUTH)
        assert r.status_code == 200
        d = r.json()
        self.__class__.created.append(d["order_id"])
        assert d["subtotal"] == 200
        assert d["discount_amount"] == 20
        assert d["net_sales"] == 180
        assert d["grand_total"] == 200  # 180 + 20 tips
        assert d["discount_type"] == "percent"

    def test_fixed_discount(self, s):
        r = s.post(f"{BASE_URL}/api/orders", json=self._order("fixed", 30), headers=AUTH)
        assert r.status_code == 200
        d = r.json()
        self.__class__.created.append(d["order_id"])
        assert d["subtotal"] == 200 and d["discount_amount"] == 30 and d["net_sales"] == 170

    def test_none_discount(self, s):
        r = s.post(f"{BASE_URL}/api/orders", json=self._order("none", 0), headers=AUTH)
        assert r.status_code == 200
        d = r.json()
        self.__class__.created.append(d["order_id"])
        assert d["discount_amount"] == 0 and d["net_sales"] == d["subtotal"] == 200

    def test_reject_empty_items(self, s):
        payload = self._order("none", 0); payload["items"] = []
        r = s.post(f"{BASE_URL}/api/orders", json=payload, headers=AUTH)
        assert r.status_code == 400

    def test_reject_negative_tips(self, s):
        payload = self._order("none", 0, tips=-5)
        r = s.post(f"{BASE_URL}/api/orders", json=payload, headers=AUTH)
        assert r.status_code == 400

    def test_reject_negative_discount(self, s):
        payload = self._order("percent", -5)
        r = s.post(f"{BASE_URL}/api/orders", json=payload, headers=AUTH)
        assert r.status_code == 400

    def test_reports_uses_net_sales(self, s):
        r = s.get(f"{BASE_URL}/api/reports", params={"start": self.day, "end": self.day}, headers=AUTH)
        assert r.status_code == 200
        rep = r.json()
        # 180 + 170 + 200 = 550, gross = 600, discount = 50, tips = 20 (only percent order had tips)
        assert rep["sales"] == 550
        assert rep["gross"] == 600
        assert rep["discount"] == 50
        assert rep["tips"] == 20
        # profit excludes tips
        assert rep["profit"] == 550 - rep["raw"] - rep["other"]

    def test_dashboard_discount_field(self, s):
        r = s.get(f"{BASE_URL}/api/dashboard", params={"date": self.day}, headers=AUTH)
        assert r.status_code == 200
        d = r.json()["today"]
        assert d["sales"] == 550 and d["discount"] == 50 and d["gross"] == 600

    def test_zzz_cleanup(self, s):
        for oid in self.__class__.created:
            s.delete(f"{BASE_URL}/api/orders/{oid}", headers=AUTH)


# ---------- Stock aggregation ----------
class TestStock:
    day = "2099-07-01"
    tag = f"TEST_stock_{uuid.uuid4().hex[:6]}"
    p_id = None; u_id = None

    def test_purchase_and_use(self, s):
        p = s.post(f"{BASE_URL}/api/purchases", json={"date": self.day, "item": self.tag, "quantity": 10, "unit": "Kg", "price": 20}, headers=AUTH)
        assert p.status_code == 200
        self.__class__.p_id = p.json()["record_id"]
        u = s.post(f"{BASE_URL}/api/usage", json={"date": self.day, "item": self.tag, "quantity": 3, "unit": "Kg"}, headers=AUTH)
        assert u.status_code == 200
        self.__class__.u_id = u.json()["record_id"]

    def test_stock_aggregate(self, s):
        r = s.get(f"{BASE_URL}/api/stock", headers=AUTH)
        assert r.status_code == 200
        row = next((x for x in r.json() if x["item"] == self.tag), None)
        assert row is not None
        assert row["purchased"] == 10 and row["used"] == 3 and row["closing"] == 7

    def test_zzz_cleanup(self, s):
        s.delete(f"{BASE_URL}/api/purchases/{self.__class__.p_id}", headers=AUTH)
        s.delete(f"{BASE_URL}/api/usage/{self.__class__.u_id}", headers=AUTH)


# ---------- Exports ----------
class TestExports:
    def test_csv_sales(self, s):
        r = s.get(f"{BASE_URL}/api/export/sales", params={"start": "2099-06-01", "end": "2099-06-30"}, headers=AUTH)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert "AFT" in r.text

    def test_csv_expenses(self, s):
        r = s.get(f"{BASE_URL}/api/export/expenses", headers=AUTH)
        assert r.status_code == 200 and "text/csv" in r.headers.get("content-type", "")

    def test_csv_purchases(self, s):
        r = s.get(f"{BASE_URL}/api/export/purchases", headers=AUTH)
        assert r.status_code == 200 and "text/csv" in r.headers.get("content-type", "")

    def test_csv_unknown(self, s):
        r = s.get(f"{BASE_URL}/api/export/foobar", headers=AUTH)
        assert r.status_code == 400

    def test_pdf_report(self, s):
        r = s.get(f"{BASE_URL}/api/export/report/pdf", params={"start": "2099-06-01", "end": "2099-06-30"}, headers=AUTH)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"


# ---------- Old-order backward compatibility ----------
class TestLegacyOrders:
    def test_legacy_order_fallback_to_subtotal(self, s):
        # Insert a legacy-style order directly through API - server always creates net_sales.
        # Simulate legacy by posting default (none discount).
        r = s.post(f"{BASE_URL}/api/orders", json={
            "date": "2099-08-01", "time": "10:00", "order_type": "Dine-in",
            "items": [{"item": "TEST_legacy", "quantity": 1, "price": 40}], "payment": "Cash",
        }, headers=AUTH)
        assert r.status_code == 200
        d = r.json()
        assert d["subtotal"] == 40 and d["net_sales"] == 40 and d["discount_amount"] == 0
        rep = s.get(f"{BASE_URL}/api/reports", params={"start": "2099-08-01", "end": "2099-08-01"}, headers=AUTH).json()
        assert rep["sales"] == 40
        s.delete(f"{BASE_URL}/api/orders/{d['order_id']}", headers=AUTH)


# ---------- Settings ----------
class TestSettings:
    def test_get_settings(self, s):
        r = s.get(f"{BASE_URL}/api/settings", headers=AUTH)
        assert r.status_code == 200
        d = r.json()
        assert d["restaurant_name"] and d["tagline"]

    def test_put_settings(self, s):
        original = s.get(f"{BASE_URL}/api/settings", headers=AUTH).json()
        payload = {k: original[k] for k in ["restaurant_name", "tagline", "currency", "expense_categories", "raw_categories", "menu_categories", "units", "payment_methods"]}
        payload["restaurant_name"] = "TEST AFT Rename"
        r = s.put(f"{BASE_URL}/api/settings", json=payload, headers=AUTH)
        assert r.status_code == 200
        assert r.json()["restaurant_name"] == "TEST AFT Rename"
        # restore
        payload["restaurant_name"] = original["restaurant_name"]
        s.put(f"{BASE_URL}/api/settings", json=payload, headers=AUTH)

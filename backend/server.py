from fastapi import FastAPI, APIRouter, HTTPException, Header, Request
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Any, Optional
from pathlib import Path
from datetime import datetime, timezone, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
import os, uuid, io, csv, httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
app = FastAPI(title="AFT Restaurant Operations API")
api = APIRouter(prefix="/api")

def now(): return datetime.now(timezone.utc)
def now_iso(): return now().isoformat()
def uid(prefix): return f"{prefix}_{uuid.uuid4().hex[:12]}"
def clean(doc):
    if not doc: return None
    doc.pop("_id", None)
    return doc

PRELOADED = [
 ("Veg Momos","Momos","Veg",[("8 Pieces",40)]),("Chhote Bhature","Bhature","Veg",[("Single",30)]),
 ("Veg Burger","Burgers","Veg",[("Single",30)]),("Special Burger","Burgers","Special",[("Single",50)]),
 ("Paneer Roll","Roll","Paneer",[("Single",40)]),("Veg Roll","Roll","Veg",[("Single",30)]),("Spring Roll","Roll","Spring",[("Single",30)]),
 ("Chaat","Chaat","Regular",[("Single",30)]),("French Fries","French Fries","Regular",[("Half",30),("Full",50)]),
 ("Chaumin","Chaumin","Regular",[("Half",25),("Full",40)]),("Paneer Chaumin","Chaumin","Paneer",[("Half",50),("Full",80)]),
 ("Fried Rice","Fried Rice","Regular",[("Half",30),("Full",50)]),("Paneer Fried Rice","Fried Rice","Paneer",[("Half",50),("Full",80)]),
 ("Paneer Chilli","Special Item","Paneer",[("Half",80),("Full",160)]),("Manchurian","Special Item","Regular",[("Half",30),("Full",60)])]

DEFAULT_SETTINGS = {
    "restaurant_name": "AFT - Apna Flavour Town",
    "tagline": "स्वाद की नई दुनिया",
    "currency": "₹",
    "expense_categories": ["Utensils","Furniture","Repair","Cleaning","Equipment","Gas","Electricity","Rent","Salary","Miscellaneous"],
    "raw_categories": ["Vegetables","Dairy","Grains","Spices","Oils","Sauces","Meat","Other"],
    "menu_categories": ["Momos","Bhature","Burgers","Roll","Chaat","French Fries","Chaumin","Fried Rice","Special Item"],
    "units": ["Kg","Gram","Liter","ml","Piece","Packet","Bottle","Box","Other"],
    "payment_methods": ["Cash","UPI","Other"],
}

# ---------- Models ----------
class Item(BaseModel):
    name: str; category: str; variant: str = "Regular"; options: list[dict[str, Any]]
    quality_required: bool = False; quality_options: list[int] = list(range(1, 11)); active: bool = True; kind: str = "menu"
class Purchase(BaseModel):
    date: str; item: str; quality: str = ""; quantity: float; unit: str; price: float; supplier: str = ""; note: str = ""
class Usage(BaseModel):
    date: str; item: str; quantity: float; unit: str = ""; note: str = ""
class Expense(BaseModel):
    date: str; category: str; description: str; quantity: Optional[float] = None; amount: float; payment: str = "Cash"; note: str = ""; receipt: Optional[str] = None
class Order(BaseModel):
    date: str; time: str; order_type: str; items: list[dict[str, Any]]; tips: float = 0; payment: str = "Cash"; customer: dict[str, Any] = {}; delivery_charge: float = 0
    discount_type: str = "none"  # 'none' | 'percent' | 'fixed'
    discount_value: float = 0
class SessionExchange(BaseModel):
    session_id: str
class Settings(BaseModel):
    restaurant_name: str; tagline: str; currency: str = "₹"
    expense_categories: list[str] = []
    raw_categories: list[str] = []
    menu_categories: list[str] = []
    units: list[str] = []
    payment_methods: list[str] = []

# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # Drop old single-field unique indexes if they exist so we can move to per-user compound indexes.
    for coll, name in [("menu_items","item_id_1"),("orders","order_id_1")]:
        try: await db[coll].drop_index(name)
        except Exception: pass
    await db.menu_items.create_index([("user_id",1),("item_id",1)], unique=True)
    await db.orders.create_index([("user_id",1),("order_id",1)], unique=True)
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("user_id")
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    # One-time migration: hand any pre-existing (pre-multitenant) records to the seed test user
    seed = await db.users.find_one({"email":"test@aft.local"})
    if seed:
        for c in ["menu_items","orders","purchases","usage","expenses","settings"]:
            await db[c].update_many({"user_id":{"$exists":False}}, {"$set":{"user_id": seed["user_id"]}})

async def seed_user_defaults(user_id: str):
    """Give a brand-new user their own copy of the preloaded menu + default settings."""
    if await db.menu_items.count_documents({"user_id": user_id, "kind":"menu"}) == 0:
        docs = []
        for name, cat, variant, options in PRELOADED:
            docs.append({
                "user_id": user_id,
                "item_id": uid("itm"),
                "name": name, "category": cat, "variant": variant,
                "options": [{"name": n, "price": p} for n, p in options],
                "quality_required": False, "quality_options": [],
                "active": True, "kind": "menu",
                "created_at": now_iso(), "updated_at": now_iso(),
            })
        if docs: await db.menu_items.insert_many(docs)
    if not await db.settings.find_one({"user_id": user_id, "key":"restaurant"}):
        await db.settings.insert_one({"user_id": user_id, "key":"restaurant", **DEFAULT_SETTINGS, "created_at": now_iso(), "updated_at": now_iso()})

# ---------- Auth ----------
async def require_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization[7:]
    session = await db.user_sessions.find_one({"session_token": token}, {"_id":0})
    if not session:
        raise HTTPException(401, "Invalid session")
    exp = session.get("expires_at")
    if isinstance(exp, datetime):
        if exp.tzinfo is None: exp = exp.replace(tzinfo=timezone.utc)
        if exp < now(): raise HTTPException(401, "Session expired")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id":0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

@api.post("/auth/session")
async def auth_session(payload: SessionExchange):
    try:
        async with httpx.AsyncClient(timeout=15) as hc:
            r = await hc.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data", headers={"X-Session-ID": payload.session_id})
        if r.status_code != 200:
            raise HTTPException(401, "Invalid or expired session")
        data = r.json()
    except HTTPException: raise
    except Exception:
        raise HTTPException(401, "Auth service unavailable")

    email = data.get("email"); name = data.get("name"); picture = data.get("picture"); session_token = data.get("session_token")
    if not email or not session_token:
        raise HTTPException(401, "Incomplete auth response")

    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id":user_id},{"$set":{"name":name,"picture":picture,"updated_at":now_iso()}})
    else:
        user_id = uid("user")
        await db.users.insert_one({"user_id":user_id,"email":email,"name":name,"picture":picture,"created_at":now_iso(),"updated_at":now_iso()})

    # Always ensure this user has their own menu + settings (idempotent).
    await seed_user_defaults(user_id)

    await db.user_sessions.insert_one({"session_token":session_token,"user_id":user_id,"created_at":now(),"expires_at":now()+timedelta(days=7)})
    user = await db.users.find_one({"user_id":user_id}, {"_id":0})
    return {"session_token": session_token, "user": user}

@api.get("/auth/me")
async def auth_me(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    # Idempotent seed — guarantees the user always has their own menu + settings.
    await seed_user_defaults(u["user_id"])
    return u

@api.post("/auth/logout")
async def auth_logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        await db.user_sessions.delete_one({"session_token": authorization[7:]})
    return {"ok": True}

# ---------- Health ----------
@api.get("/health")
async def health(): return {"ok": True, "restaurant": "AFT - Apna Flavour Town"}

# ---------- Menu ----------
@api.get("/menu")
async def menu(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    return [clean(x) for x in await db.menu_items.find({"user_id": u["user_id"], "kind":"menu"},{"_id":0}).sort("name",1).to_list(1000)]
@api.post("/menu")
async def add_menu(item: Item, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    d=item.model_dump(); d.update({"user_id": u["user_id"], "item_id":uid("itm"),"kind":"menu","created_at":now_iso(),"updated_at":now_iso()}); await db.menu_items.insert_one(d); return clean(d)
@api.put("/menu/{item_id}")
async def edit_menu(item_id: str, item: Item, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    d=item.model_dump(); d.update({"user_id": u["user_id"], "item_id":item_id,"kind":"menu","updated_at":now_iso()}); await db.menu_items.update_one({"user_id": u["user_id"], "item_id":item_id},{"$set":d}); return clean(d)
@api.delete("/menu/{item_id}")
async def delete_menu(item_id: str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    await db.menu_items.update_one({"user_id": u["user_id"], "item_id":item_id},{"$set":{"active":False,"updated_at":now_iso()}}); return {"ok":True}

# ---------- Purchases / Usage ----------
async def list_records(user_id: str, collection, limit=1000):
    return [clean(x) for x in await db[collection].find({"user_id": user_id}, {"_id":0}).sort("date",-1).to_list(limit)]

@api.get("/purchases")
async def purchases(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization); return await list_records(u["user_id"], "purchases")
@api.post("/purchases")
async def add_purchase(p: Purchase, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    if p.quantity<0 or p.price<0: raise HTTPException(400,"Quantity and price cannot be negative")
    d=p.model_dump(); d.update({"user_id": u["user_id"], "record_id":uid("pur"),"total":round(p.quantity*p.price,2),"created_at":now_iso()}); await db.purchases.insert_one(d); return clean(d)
@api.delete("/purchases/{rid}")
async def del_purchase(rid:str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization); await db.purchases.delete_one({"user_id": u["user_id"], "record_id":rid}); return {"ok":True}

@api.get("/usage")
async def usage(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization); return await list_records(u["user_id"], "usage")
@api.post("/usage")
async def add_usage(u_: Usage, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    if u_.quantity<0: raise HTTPException(400,"Quantity cannot be negative")
    d=u_.model_dump(); d.update({"user_id": u["user_id"], "record_id":uid("use"),"created_at":now_iso()}); await db.usage.insert_one(d); return clean(d)
@api.delete("/usage/{rid}")
async def del_usage(rid:str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization); await db.usage.delete_one({"user_id": u["user_id"], "record_id":rid}); return {"ok":True}

@api.get("/stock")
async def stock(authorization: Optional[str] = Header(None)):
    """Aggregate opening + purchased - used = closing per raw material for the current user."""
    u = await require_user(authorization)
    purchases = await db.purchases.find({"user_id": u["user_id"]}, {"_id":0}).to_list(10000)
    usages = await db.usage.find({"user_id": u["user_id"]}, {"_id":0}).to_list(10000)
    stock_map: dict[str, dict] = {}
    for p in purchases:
        name = p.get("item","").strip()
        if not name: continue
        row = stock_map.setdefault(name, {"item":name,"unit":p.get("unit",""),"purchased":0.0,"used":0.0,"last_price":0.0})
        row["purchased"] += float(p.get("quantity") or 0)
        row["last_price"] = float(p.get("price") or row["last_price"])
        if p.get("unit"): row["unit"] = p["unit"]
    for u_ in usages:
        name = u_.get("item","").strip()
        if not name: continue
        row = stock_map.setdefault(name, {"item":name,"unit":u_.get("unit",""),"purchased":0.0,"used":0.0,"last_price":0.0})
        row["used"] += float(u_.get("quantity") or 0)
    result = []
    for row in stock_map.values():
        row["closing"] = round(row["purchased"] - row["used"], 3)
        row["value"] = round(row["closing"] * row["last_price"], 2)
        result.append(row)
    result.sort(key=lambda x: x["item"].lower())
    return result

# ---------- Expenses ----------
@api.get("/expenses")
async def expenses(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization); return await list_records(u["user_id"], "expenses")
@api.post("/expenses")
async def add_expense(e: Expense, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    if e.amount<0: raise HTTPException(400,"Amount cannot be negative")
    d=e.model_dump(); d.update({"user_id": u["user_id"], "record_id":uid("exp"),"created_at":now_iso()}); await db.expenses.insert_one(d); return clean(d)
@api.delete("/expenses/{rid}")
async def del_expense(rid:str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization); await db.expenses.delete_one({"user_id": u["user_id"], "record_id":rid}); return {"ok":True}

# ---------- Orders ----------
@api.get("/orders")
async def orders(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    return [clean(x) for x in await db.orders.find({"user_id": u["user_id"], "deleted":{"$ne":True}}, {"_id":0}).sort("created_at",-1).to_list(1000)]
@api.post("/orders")
async def add_order(o: Order, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    if not o.items: raise HTTPException(400,"Order must contain at least one item")
    if o.tips < 0: raise HTTPException(400, "Tips cannot be negative")
    if o.discount_value < 0: raise HTTPException(400, "Discount cannot be negative")
    for i in o.items:
        if float(i.get("quantity",0)) <= 0 or float(i.get("price",0)) < 0:
            raise HTTPException(400, "Invalid item quantity or price")
    subtotal = round(sum(float(i.get("price",0))*float(i.get("quantity",1)) for i in o.items), 2)
    # Bill-level discount only
    if o.discount_type == "percent":
        pct = max(0.0, min(100.0, float(o.discount_value)))
        discount_amount = round(subtotal * pct / 100.0, 2)
    elif o.discount_type == "fixed":
        discount_amount = round(min(subtotal, float(o.discount_value)), 2)
    else:
        discount_amount = 0.0
    net_sales = round(subtotal - discount_amount, 2)  # counted as sales
    d = o.model_dump()
    d.update({
        "user_id": u["user_id"],
        "order_id": "AFT-"+datetime.now().strftime("%Y%m%d")+"-"+uuid.uuid4().hex[:4].upper(),
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "net_sales": net_sales,
        "grand_total": round(net_sales + o.tips + o.delivery_charge, 2),
        "created_at": now_iso(),
        "deleted": False,
    })
    await db.orders.insert_one(d)
    return clean(d)
@api.delete("/orders/{oid}")
async def del_order(oid:str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization); await db.orders.update_one({"user_id": u["user_id"], "order_id":oid},{"$set":{"deleted":True,"updated_at":now_iso()}}); return {"ok":True}

# ---------- Dashboard & Reports ----------
@api.get("/dashboard")
async def dashboard(date: Optional[str]=None, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    uid_ = u["user_id"]
    day=date or datetime.now().strftime("%Y-%m-%d")
    month_start = day[:8] + "01"
    orders_today=[x async for x in db.orders.find({"user_id": uid_, "date":day,"deleted":{"$ne":True}},{"_id":0})]
    p_today=[x async for x in db.purchases.find({"user_id": uid_, "date":day},{"_id":0})]
    e_today=[x async for x in db.expenses.find({"user_id": uid_, "date":day},{"_id":0})]
    orders_month=[x async for x in db.orders.find({"user_id": uid_, "date":{"$gte":month_start,"$lte":day},"deleted":{"$ne":True}},{"_id":0})]
    p_month=[x async for x in db.purchases.find({"user_id": uid_, "date":{"$gte":month_start,"$lte":day}},{"_id":0})]
    e_month=[x async for x in db.expenses.find({"user_id": uid_, "date":{"$gte":month_start,"$lte":day}},{"_id":0})]
    def sums(orders, purchases, expenses):
        sales=sum(x.get("net_sales", x.get("subtotal",0)) for x in orders)
        gross=sum(x.get("subtotal",0) for x in orders)
        discount=sum(x.get("discount_amount",0) for x in orders)
        raw=sum(x.get("total",0) for x in purchases); other=sum(x.get("amount",0) for x in expenses); tips=sum(x.get("tips",0) for x in orders)
        return {"sales":sales,"gross":gross,"discount":discount,"raw":raw,"other":other,"tips":tips,"profit":sales-raw-other,"orders":len(orders),
                "dine_in":sum(x.get("net_sales", x.get("subtotal",0)) for x in orders if x.get("order_type")=="Dine-in"),
                "delivery":sum(x.get("net_sales", x.get("subtotal",0)) for x in orders if x.get("order_type")=="Home Delivery"),
                "cash":sum(x.get("net_sales", x.get("subtotal",0)) for x in orders if x.get("payment")=="Cash"),
                "upi":sum(x.get("net_sales", x.get("subtotal",0)) for x in orders if x.get("payment")=="UPI")}
    today_stats = sums(orders_today, p_today, e_today)
    month_stats = sums(orders_month, p_month, e_month)
    # 7-day sparkline
    trend = []
    from datetime import timedelta as _t
    base = datetime.strptime(day, "%Y-%m-%d").date()
    for i in range(6,-1,-1):
        d = (base - _t(days=i)).strftime("%Y-%m-%d")
        s = await db.orders.find({"user_id": uid_, "date":d,"deleted":{"$ne":True}},{"_id":0}).to_list(1000)
        p = await db.purchases.find({"user_id": uid_, "date":d},{"_id":0}).to_list(1000)
        e = await db.expenses.find({"user_id": uid_, "date":d},{"_id":0}).to_list(1000)
        sales=sum(x.get("net_sales", x.get("subtotal",0)) for x in s); raw=sum(x.get("total",0) for x in p); other=sum(x.get("amount",0) for x in e)
        trend.append({"date":d,"sales":sales,"profit":sales-raw-other})
    return {"date":day,"today":today_stats,"month":month_stats,"trend":trend}

@api.get("/reports")
async def reports(start: str, end: str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    uid_ = u["user_id"]
    q={"user_id": uid_, "date":{"$gte":start,"$lte":end},"deleted":{"$ne":True}}
    os_=await db.orders.find(q,{"_id":0}).to_list(10000)
    ps=await db.purchases.find({"user_id": uid_, "date":{"$gte":start,"$lte":end}},{"_id":0}).to_list(10000)
    es=await db.expenses.find({"user_id": uid_, "date":{"$gte":start,"$lte":end}},{"_id":0}).to_list(10000)
    sales=sum(x.get("net_sales", x.get("subtotal",0)) for x in os_); gross=sum(x.get("subtotal",0) for x in os_); discount=sum(x.get("discount_amount",0) for x in os_); raw=sum(x.get("total",0) for x in ps); other=sum(x.get("amount",0) for x in es); tips=sum(x.get("tips",0) for x in os_)
    # top items
    item_qty: dict[str,int] = {}
    portion_qty = {"Half":0,"Full":0,"Single":0,"Other":0}
    for o in os_:
        for i in o.get("items",[]):
            k = i.get("item","")
            item_qty[k] = item_qty.get(k,0) + int(i.get("quantity",1))
            portion = i.get("portion","Single")
            if "Half" in portion: portion_qty["Half"] += int(i.get("quantity",1))
            elif "Full" in portion: portion_qty["Full"] += int(i.get("quantity",1))
            else: portion_qty["Single"] += int(i.get("quantity",1))
    top_items = sorted(item_qty.items(), key=lambda x:-x[1])[:8]
    # day-by-day
    days_map: dict[str, dict] = {}
    for o in os_:
        d=o["date"]; days_map.setdefault(d,{"date":d,"sales":0,"gross":0,"discount":0,"raw":0,"other":0,"orders":0})
        days_map[d]["sales"] += o.get("net_sales", o.get("subtotal",0))
        days_map[d]["gross"] += o.get("subtotal",0)
        days_map[d]["discount"] += o.get("discount_amount",0)
        days_map[d]["orders"] += 1
    for p in ps:
        d=p["date"]; days_map.setdefault(d,{"date":d,"sales":0,"gross":0,"discount":0,"raw":0,"other":0,"orders":0})
        days_map[d]["raw"] += p.get("total",0)
    for e in es:
        d=e["date"]; days_map.setdefault(d,{"date":d,"sales":0,"gross":0,"discount":0,"raw":0,"other":0,"orders":0})
        days_map[d]["other"] += e.get("amount",0)
    days = sorted(days_map.values(), key=lambda x:x["date"])
    for d in days: d["profit"] = d["sales"] - d["raw"] - d["other"]
    best_day = max(days, key=lambda x:x["sales"], default=None)
    worst_day = min(days, key=lambda x:x["sales"], default=None) if days else None
    days_count = max(1, len(days))
    return {"start":start,"end":end,"sales":sales,"gross":gross,"discount":discount,"orders":len(os_),"raw":raw,"other":other,"expenses":raw+other,"tips":tips,"profit":sales-raw-other,
            "dine_in":sum(x.get("net_sales", x.get("subtotal",0)) for x in os_ if x.get("order_type")=="Dine-in"),
            "delivery":sum(x.get("net_sales", x.get("subtotal",0)) for x in os_ if x.get("order_type")=="Home Delivery"),
            "cash":sum(x.get("net_sales", x.get("subtotal",0)) for x in os_ if x.get("payment")=="Cash"),
            "upi":sum(x.get("net_sales", x.get("subtotal",0)) for x in os_ if x.get("payment")=="UPI"),
            "portion_qty":portion_qty,
            "top_items":[{"item":k,"qty":v} for k,v in top_items],
            "days":days,
            "avg_sales":round(sales/days_count,2),
            "avg_profit":round((sales-raw-other)/days_count,2),
            "best_day":best_day,"worst_day":worst_day}

# ---------- Exports ----------
def _csv_from_rows(rows: list[dict], filename: str):
    out = io.StringIO(); w = csv.writer(out)
    w.writerow(["AFT - Apna Flavour Town","स्वाद की नई दुनिया"])
    w.writerow([f"Exported {datetime.now().strftime('%Y-%m-%d %H:%M')}"])
    w.writerow([])
    if rows:
        keys = list(rows[0].keys())
        w.writerow(keys)
        for r in rows: w.writerow([r.get(k,"") for k in keys])
    else:
        w.writerow(["No records"])
    return StreamingResponse(iter([out.getvalue()]), media_type="text/csv", headers={"Content-Disposition":f"attachment; filename={filename}"})

@api.get("/export/{kind}")
async def export_csv(kind: str, start: Optional[str]=None, end: Optional[str]=None, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    q = {"user_id": u["user_id"]}
    if start and end: q["date"] = {"$gte":start,"$lte":end}
    collection = "orders" if kind=="sales" else ("expenses" if kind=="expenses" else "purchases" if kind=="purchases" else None)
    if not collection: raise HTTPException(400, "Unknown export kind")
    rows = await db[collection].find(q, {"_id":0,"deleted":0}).sort("date",-1).to_list(10000)
    for r in rows: r.pop("receipt", None); r.pop("user_id", None)
    return _csv_from_rows(rows, f"aft_{kind}.csv")

@api.get("/export/report/pdf")
async def export_report_pdf(start: str, end: str, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    uid_ = u["user_id"]
    q = {"user_id": uid_, "date":{"$gte":start,"$lte":end},"deleted":{"$ne":True}}
    os_ = await db.orders.find(q, {"_id":0}).to_list(10000)
    ps = await db.purchases.find({"user_id": uid_, "date":{"$gte":start,"$lte":end}}, {"_id":0}).to_list(10000)
    es = await db.expenses.find({"user_id": uid_, "date":{"$gte":start,"$lte":end}}, {"_id":0}).to_list(10000)
    sales_gross = sum(x.get("subtotal",0) for x in os_)
    discount = sum(x.get("discount_amount",0) for x in os_)
    sales = sum(x.get("net_sales", x.get("subtotal",0)) for x in os_)
    raw = sum(x.get("total",0) for x in ps); other = sum(x.get("amount",0) for x in es); tips = sum(x.get("tips",0) for x in os_)
    profit = sales - raw - other
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=36, bottomMargin=36, leftMargin=36, rightMargin=36)
    styles = getSampleStyleSheet()
    brand = ParagraphStyle("brand", parent=styles["Title"], textColor=colors.HexColor("#C85A32"), fontSize=22)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#12100E"))
    body = styles["BodyText"]
    story = [
        Paragraph("AFT · Apna Flavour Town", brand),
        Paragraph("Swaad ki nayi duniya", body),
        Spacer(1,10),
        Paragraph(f"Report {start} to {end}", h2),
        Spacer(1,6),
    ]
    summary = [
        ["Metric","Amount"],
        ["Gross Sales (before discount)", f"Rs {sales_gross:,.0f}"],
        ["Bill Discount", f"Rs {discount:,.0f}"],
        ["Net Sales", f"Rs {sales:,.0f}"],
        ["Orders", f"{len(os_)}"],
        ["Raw Material Expense", f"Rs {raw:,.0f}"],
        ["Other Expense", f"Rs {other:,.0f}"],
        ["Total Expense", f"Rs {raw+other:,.0f}"],
        ["Tips (not in profit)", f"Rs {tips:,.0f}"],
        ["Net Profit", f"Rs {profit:,.0f}"],
    ]
    t = Table(summary, colWidths=[220,220])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#C85A32")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),0.4,colors.grey),("FONTNAME",(0,0),(-1,0),"Helvetica-Bold"),("PADDING",(0,0),(-1,-1),8)]))
    story += [t, Spacer(1,14), Paragraph("Day-by-day", h2)]
    days_map: dict[str, dict] = {}
    for o in os_:
        d=o["date"]; days_map.setdefault(d,{"date":d,"sales":0,"discount":0,"raw":0,"other":0})
        days_map[d]["sales"] += o.get("net_sales", o.get("subtotal",0))
        days_map[d]["discount"] += o.get("discount_amount",0)
    for p in ps:
        d=p["date"]; days_map.setdefault(d,{"date":d,"sales":0,"discount":0,"raw":0,"other":0})
        days_map[d]["raw"] += p.get("total",0)
    for e in es:
        d=e["date"]; days_map.setdefault(d,{"date":d,"sales":0,"discount":0,"raw":0,"other":0})
        days_map[d]["other"] += e.get("amount",0)
    days = sorted(days_map.values(), key=lambda x:x["date"])
    day_rows = [["Date","Sales","Discount","Raw","Other","Profit"]]
    for d in days: day_rows.append([d["date"], f"Rs {d['sales']:,.0f}", f"Rs {d['discount']:,.0f}", f"Rs {d['raw']:,.0f}", f"Rs {d['other']:,.0f}", f"Rs {d['sales']-d['raw']-d['other']:,.0f}"])
    if len(day_rows) == 1: day_rows.append(["No data","","","","",""])
    dt = Table(day_rows, colWidths=[80,80,70,70,70,80])
    dt.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#1D1A16")),("TEXTCOLOR",(0,0),(-1,0),colors.white),("GRID",(0,0),(-1,-1),0.3,colors.grey),("FONTSIZE",(0,0),(-1,-1),9),("PADDING",(0,0),(-1,-1),5)]))
    story.append(dt)
    story += [Spacer(1,10), Paragraph(f"Generated {datetime.now().strftime('%d/%m/%Y %H:%M')}. Tips are tracked separately and not included in profit.", body)]
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf", headers={"Content-Disposition":f"attachment; filename=aft_report_{start}_{end}.pdf"})

# ---------- Settings ----------
@api.get("/settings")
async def get_settings(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    row = await db.settings.find_one({"user_id": u["user_id"], "key":"restaurant"}, {"_id":0})
    if not row:
        row = {"user_id": u["user_id"], "key":"restaurant", **DEFAULT_SETTINGS, "created_at":now_iso()}
        await db.settings.insert_one({**row})
    return row

@api.put("/settings")
async def put_settings(s: Settings, authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    payload = s.model_dump(); payload["user_id"] = u["user_id"]; payload["key"] = "restaurant"; payload["updated_at"] = now_iso()
    await db.settings.update_one({"user_id": u["user_id"], "key":"restaurant"}, {"$set":payload}, upsert=True)
    return await get_settings(authorization)

@api.post("/settings/reset")
async def reset_data(authorization: Optional[str] = Header(None)):
    u = await require_user(authorization)
    for c in ["orders","purchases","usage","expenses"]:
        await db[c].delete_many({"user_id": u["user_id"]})
    return {"ok": True}

app.include_router(api)
app.add_middleware(CORSMiddleware,allow_credentials=True,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])

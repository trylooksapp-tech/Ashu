from fastapi import FastAPI, APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import Any, Optional
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os, uuid, io, csv, httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")
client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
app = FastAPI(title="AFT Restaurant Operations API")
api = APIRouter(prefix="/api")

def now(): return datetime.now(timezone.utc).isoformat()
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

class Item(BaseModel):
    name: str; category: str; variant: str = "Regular"; options: list[dict[str, Any]]
    active: bool = True; kind: str = "menu"
class Purchase(BaseModel):
    date: str; item: str; quality: str = ""; quantity: float; unit: str; price: float; supplier: str = ""; note: str = ""
class Usage(BaseModel):
    date: str; item: str; quantity: float; note: str = ""
class Expense(BaseModel):
    date: str; category: str; description: str; quantity: Optional[float] = None; amount: float; payment: str = "Cash"; note: str = ""; receipt: Optional[str] = None
class Order(BaseModel):
    date: str; time: str; order_type: str; items: list[dict[str, Any]]; tips: float = 0; payment: str = "Cash"; customer: dict[str, Any] = {}; delivery_charge: float = 0

@app.on_event("startup")
async def startup():
    await db.menu_items.create_index("item_id", unique=True)
    await db.orders.create_index("order_id", unique=True)
    if await db.menu_items.count_documents({}) == 0:
        for name, cat, variant, options in PRELOADED:
            await db.menu_items.insert_one({"item_id": uid("itm"),"name":name,"category":cat,"variant":variant,"options":[{"name":n,"price":p} for n,p in options],"active":True,"kind":"menu","created_at":now(),"updated_at":now()})

@api.get("/health")
async def health(): return {"ok": True, "restaurant": "AFT - Apna Flavour Town"}

@api.get("/menu")
async def menu(): return [clean(x) for x in await db.menu_items.find({"kind":"menu"},{"_id":0}).sort("name",1).to_list(1000)]
@api.post("/menu")
async def add_menu(item: Item):
    d=item.model_dump(); d.update({"item_id":uid("itm"),"kind":"menu","created_at":now(),"updated_at":now()}); await db.menu_items.insert_one(d); return clean(d)
@api.put("/menu/{item_id}")
async def edit_menu(item_id: str, item: Item):
    d=item.model_dump(); d.update({"item_id":item_id,"kind":"menu","updated_at":now()}); await db.menu_items.update_one({"item_id":item_id},{"$set":d}); return clean(d)
@api.delete("/menu/{item_id}")
async def delete_menu(item_id: str): await db.menu_items.update_one({"item_id":item_id},{"$set":{"active":False,"updated_at":now()}}); return {"ok":True}

async def list_records(collection, limit=1000): return [clean(x) for x in await db[collection].find({}, {"_id":0}).sort("date",-1).to_list(limit)]
@api.get("/purchases")
async def purchases(): return await list_records("purchases")
@api.post("/purchases")
async def add_purchase(p: Purchase):
    if p.quantity<0 or p.price<0: raise HTTPException(400,"Quantity and price cannot be negative")
    d=p.model_dump(); d.update({"record_id":uid("pur"),"total":round(p.quantity*p.price,2),"created_at":now()}); await db.purchases.insert_one(d); return clean(d)
@api.get("/usage")
async def usage(): return await list_records("usage")
@api.post("/usage")
async def add_usage(u: Usage):
    if u.quantity<0: raise HTTPException(400,"Quantity cannot be negative")
    d=u.model_dump(); d.update({"record_id":uid("use"),"created_at":now()}); await db.usage.insert_one(d); return clean(d)
@api.delete("/purchases/{rid}")
async def del_purchase(rid:str): await db.purchases.delete_one({"record_id":rid}); return {"ok":True}

@api.get("/expenses")
async def expenses(): return await list_records("expenses")
@api.post("/expenses")
async def add_expense(e: Expense):
    if e.amount<0: raise HTTPException(400,"Amount cannot be negative")
    d=e.model_dump(); d.update({"record_id":uid("exp"),"created_at":now()}); await db.expenses.insert_one(d); return clean(d)
@api.delete("/expenses/{rid}")
async def del_expense(rid:str): await db.expenses.delete_one({"record_id":rid}); return {"ok":True}

@api.get("/orders")
async def orders(): return await list_records("orders")
@api.post("/orders")
async def add_order(o: Order):
    if not o.items: raise HTTPException(400,"Order must contain at least one item")
    subtotal=round(sum(float(i.get("price",0))*float(i.get("quantity",1)) for i in o.items),2)
    d=o.model_dump(); d.update({"order_id":"AFT-"+datetime.now().strftime("%Y%m%d")+"-"+uuid.uuid4().hex[:4].upper(),"subtotal":subtotal,"grand_total":subtotal+o.tips+o.delivery_charge,"created_at":now(),"deleted":False}); await db.orders.insert_one(d); return clean(d)
@api.delete("/orders/{oid}")
async def del_order(oid:str): await db.orders.update_one({"order_id":oid},{"$set":{"deleted":True}}); return {"ok":True}

@api.get("/dashboard")
async def dashboard(date: Optional[str]=None):
    day=date or datetime.now().strftime("%Y-%m-%d"); orders=[x async for x in db.orders.find({"date":day,"deleted":{"$ne":True}},{"_id":0})]; p=[x async for x in db.purchases.find({"date":day},{"_id":0})]; e=[x async for x in db.expenses.find({"date":day},{"_id":0})]
    sales=sum(x.get("subtotal",0) for x in orders); raw=sum(x.get("total",0) for x in p); other=sum(x.get("amount",0) for x in e); tips=sum(x.get("tips",0) for x in orders)
    return {"date":day,"sales":sales,"raw":raw,"other":other,"tips":tips,"profit":sales-raw-other,"orders":len(orders),"dine_in":sum(x.get("subtotal",0) for x in orders if x.get("order_type")=="Dine-in"),"delivery":sum(x.get("subtotal",0) for x in orders if x.get("order_type")=="Home Delivery")}
@api.get("/reports")
async def reports(start: str, end: str):
    q={"date":{"$gte":start,"$lte":end},"deleted":{"$ne":True}}; os_=await db.orders.find(q,{"_id":0}).to_list(10000); ps=await db.purchases.find({"date":{"$gte":start,"$lte":end}},{"_id":0}).to_list(10000); es=await db.expenses.find({"date":{"$gte":start,"$lte":end}},{"_id":0}).to_list(10000)
    sales=sum(x.get("subtotal",0) for x in os_); raw=sum(x.get("total",0) for x in ps); other=sum(x.get("amount",0) for x in es); tips=sum(x.get("tips",0) for x in os_)
    return {"start":start,"end":end,"sales":sales,"orders":len(os_),"raw":raw,"other":other,"expenses":raw+other,"tips":tips,"profit":sales-raw-other,"dine_in":sum(x.get("subtotal",0) for x in os_ if x.get("order_type")=="Dine-in"),"delivery":sum(x.get("subtotal",0) for x in os_ if x.get("order_type")=="Home Delivery")}
@api.get("/export/{kind}")
async def export(kind:str):
    rows=await list_records("orders" if kind=="sales" else "expenses"); out=io.StringIO(); w=csv.writer(out); w.writerow(["AFT - Apna Flavour Town","स्वाद की नई दुनिया"]); w.writerow(rows[0].keys() if rows else ["No records"]); [w.writerow(x.values()) for x in rows]; return StreamingResponse(iter([out.getvalue()]),media_type="text/csv",headers={"Content-Disposition":f"attachment; filename=aft_{kind}.csv"})

app.include_router(api)
app.add_middleware(CORSMiddleware,allow_credentials=True,allow_origins=["*"],allow_methods=["*"],allow_headers=["*"])
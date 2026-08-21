# AFT · Apna Flavour Town — Restaurant Operations

## Problem statement
Mobile-first restaurant management and accounting for daily sales, raw-material purchases + usage, other expenses, editable menu pricing, discounts and profit reports. Tips are always excluded from sales and profit. Bill-level discount reduces net sales but never touches item prices.

## Architecture
- Expo SDK 54 React Native (dark utility UI, terracotta brand accents).
- FastAPI on port 8001 (all routes under /api, MongoDB persistence).
- Emergent-managed Google Auth (login blocking, 7-day session).
- reportlab-generated PDF exports; CSV exports for sales / expenses / purchases.
- Modular frontend: `src/screens/*.tsx` + `src/theme.ts` + `src/api.ts` + `src/auth.tsx`.

## Personas
- Restaurant owner recording daily orders / stock / expenses from an Android phone.
- Manager reviewing daily/monthly profitability and menu pricing.

## Core requirements (static)
- AFT branding with Hindi tagline (editable in Settings).
- Preloaded 15 menu items with editable portion prices (item price change never affects saved orders).
- Zero-typing POS: Category → Item → (Quality 1-10) → Portion → Quantity → Cart → Order Type → Payment → Discount → Tips → Save.
- Bill-level discount: none / % / ₹ (never item-level). Discount saved on order, reflected in dashboard/reports/PDF.
- Purchases separate from stock usage (Opening + Purchased − Used = Closing).
- Reports with date presets + custom range; day-by-day, top items, portion breakdown, best/worst day.
- CSV + PDF exports.
- Editable Settings: restaurant brand, categories (menu / raw / expense), units, payment methods, reset transactions.

## Implemented (2026-08-21)
- Emergent-managed Google Auth (blocking login, secure-store token, `/api/auth/session|me|logout`).
- Full FastAPI auth guard on every business route + MongoDB TTL index on sessions.
- Modular Expo frontend split into `src/screens/*` (Dashboard, Sales, SaleBuilder, RawMaterial, Expenses, Reports, Items, Settings, EntryModal).
- Zero-typing POS with bill-level discount, tips, delivery customer/charge, split visual receipt summary.
- Backend order model stores `subtotal`, `discount_amount`, `net_sales`, `grand_total`; dashboard + reports + PDF derive net sales from `net_sales`.
- reportlab PDF export at `/api/export/report/pdf` with brand header, summary table, day-by-day table.
- Stock summary endpoint `/api/stock`.
- Settings API `GET/PUT /api/settings`, reset via `POST /api/settings/reset`.
- Restaurant name/tagline/categories all editable and reflected in shell header + forms.

## Data model (Mongo collections)
- `menu_items`: {item_id, name, category, variant, options[{name,price}], quality_required, quality_options, active}
- `orders`: {order_id, date, time, order_type, items[], tips, payment, customer, delivery_charge, discount_type, discount_value, subtotal, discount_amount, net_sales, grand_total, deleted}
- `purchases`, `usage`, `expenses`, `settings`
- `users`, `user_sessions` (TTL index on expires_at)

## Prioritized backlog
- P1: Native mobile sharing of exported CSV/PDF (currently downloads on web only).
- P2: Edit-order flow (currently soft-delete only).
- P2: Split payment (Cash + UPI amounts).
- P2: Charts library upgrade for month view.

## Next tasks
1. Sharing exports on iOS/Android via expo-sharing.
2. Split payment fields on SaleBuilder.
3. Editable order screen.

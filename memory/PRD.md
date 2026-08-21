# AFT - Apna Flavour Town Restaurant Operations

## Problem statement
Mobile-first restaurant management and accounting for sales, raw-material purchases and usage, other expenses, reports, and editable menu pricing. Tips remain separate from sales and profit.

## Architecture
- Expo SDK 54 React Native frontend with dark utility UI and terracotta brand accents.
- FastAPI backend on port 8001 with MongoDB persistence.
- Collections: menu_items, orders, purchases, usage, expenses.
- Computed dashboard and date-range report endpoints; CSV export endpoint.

## Personas
- Restaurant owner/operator entering daily sales and costs from an Android phone.
- Manager reviewing daily/monthly profitability and item pricing.

## Core requirements (static)
- AFT branding with Hindi tagline.
- Editable preloaded menu with portion prices.
- Persistent CRUD-style transaction entry and accounting calculations.
- Tips excluded from sales and net profit.
- Dine-in/delivery and payment tracking.
- Raw purchases separate from manual usage.
- Reports with configurable dates and CSV exports.

## Implemented (2026-08-21)
- Branded dashboard with sales, expenses, tips, profit, order count, and dine-in/delivery split.
- Exact 15 requested menu items preloaded with editable portion option data.
- Quick-entry modals for sales (two line items), purchases, usage, other expenses, and menu items.
- MongoDB persistence with safe JSON responses, order IDs, soft-deleted orders, and editable menu records.
- Date-range reports, CSV sales/expense exports, and base64 receipt image attachment via Expo Image Picker.
- Mobile bottom navigation and responsive dark-first visual system.

## Prioritized backlog
- P0: Managed Google OAuth session exchange and authenticated settings screen.
- P0: PDF report generation and native/mobile export sharing.
- P1: Full menu edit/delete confirmation UI and sales edit/delete UI.
- P1: Delivery customer fields, split payments, category filters, and pagination.
- P2: Stock opening/closing balance dashboard and richer charts.

## Next tasks
1. Implement Emergent-managed Google auth end-to-end using secure session storage.
2. Add PDF generation and share sheet for report exports.
3. Finish edit/delete confirmation flows and category/date filters across lists.
# MASTER ANALYSIS - SiteMarcaViva

**Phase:** 01 - Information Gathering
**Status:** In Progress
**Last Update:** 2026-01-06
**Methodology Compliance:** Rule Zero Active

---

## 1. File Map

### Root Directory
- **index.html** - [WORKING] - Main entry point. Contains static structure (Header, Hero, Stats) and dynamic containers (#products-grid, #product-modal-overlay). Imports `global.css`, `shop.css`, `auth.js`, `products.js`, `cart.js`, `app.js`.

### Scripts
- **scripts/app.js** - [WORKING] - Core UI logic. Handles:
  - Product Rendering (`renderProducts`)
  - Search & Filtering (`filterByCategory`)
  - Modal Management (Open/Close/Toggle PF/PJ)
  - Dependencies: `productService` (from products.js), DOM Elements.
- **scripts/products.js** - [WORKING] - Data Persistence Layer.
  - Implements `DataManager` class interacting with `localStorage`.
  - Manages `mv_products`, `mv_inputs`, `mv_orders`.
  - Default Data: `INITIAL_PRODUCTS`, `INITIAL_INPUTS`.
  - Exports `productService` (legacy wrapper) and `dataManager`.
- **scripts/auth.js** - [WORKING] - Authentication Logic.
  - Mock Auth using `localStorage`.
  - Hardcoded Admin rule: `email === 'leivinjesus57@gmail.com'`.
  - Features: Login, Register, Logout, Session Persistence.
- **scripts/cart.js** - [WORKING] - Shopping Cart.
  - UI: Sidebar with overlay.
  - Logic: Add/Remove/Update Quantity.
  - Persistence: `localStorage` (`mv_cart`).
  - Checkout: WhatsApp link generation.
- **scripts/admin.js** - [WORKING] - Admin Panel Logic.
  - Dashboard & CRUD for Products/Inputs.
  - Profit Calculator (Cost vs Price).
  - Protected by `checkAuth()` (redirects if not admin).


### Styles
- **styles/global.css** - [WORKING] - Core Design System. Defines variables (`--primary-hero`, `--accent-orange`), Typography (`Inter`), and utility classes (`.btn`, `.container`).
- **styles/shop.css** - [WORKING] - Public Store Styles. Handles Header, Hero, Product Grid (`.products-grid`), Cart Sidebar (`.cart-sidebar`), and Modals.
- **styles/admin.css** - [WORKING] - Admin Panel Styles. Glassmorphism Dashboard (`.stat-card`), Tables, Sidebar.
- **styles/auth.css** - [WORKING] - Authentication Pages. Login/Register forms with nice gradients.


---

## 2. Development Status

| Area | Status | Notes |
|------|--------|-------|
| UI/UX | 60% | Main page structure complete (`index.html`). Modal functional but basic. |
| Backend | 40% | Simulated via `localStorage` (`products.js`). No real backend. |
| Integrations | 0% | No external APIs. Data is local. |
| Cart | 50% | Logic exists in UI (`app.js` toggle), but `cart.js` not yet verified. |

---

## 3. Bugs and Pending Items

| # | Type | Description | File | Priority |
|---|------|-------------|------|----------|
| 1 | Security | **Hardcoded Admin Credentials**: The email `leivinjesus57@gmail.com` is hardcoded in JS. Passwords stored in plain text in `localStorage`. | `scripts/auth.js` | Critical |
| 2 | Architecture | **No Real Backend**: All data (Auth, Products, Orders) lives in `localStorage`. It will be lost if cache is cleared and cannot be shared between users. | `scripts/products.js` | Critical |
| 3 | Feature | **Checkout Flow**: Currently just opens WhatsApp. No real payment gateway or order persistence on server. | `scripts/cart.js` | High |
| 5 | Documentation | **Legacy Discrepancy**: `implementation_plan.md` specifies `product.html` and `cart.html`, but the actual site uses a Single Page approach with Modals (`index.html` only). | `index.html` | High |
| 6 | Documentation | **Outdated Task List**: `task.md` lists many items as TODO (e.g., Hero, Product Card) that are arguably DONE in the code. | `task.md` | Low |

---

## 4. Questions for PO

| # | Question | Technical Context | Impact | Recommendation |
|---|----------|-------------------|--------|----------------|
| 1 | **Architecture: SPA vs Multi-Page?** | Current site is a Single Page with Modals. Plan mentioned `product.html`. SPA is faster but harder for SEO/Direct Links. | UX/SEO | **Keep SPA (Modal)** for now if the goal is a simple Landing Page. If scalable Store is needed, we need routing. |
| 2 | **Backend Strategy?** | Current `localStorage` backend is temporary and insecure. Data stays in user browser only. | Data Persistence | **Migrate to Supabase (Free)**. It gives real Auth + DB without setting up a server. Easy to implement in vanilla JS. |
| 3 | **Payment/Checkout?** | Currently WhatsApp. Do you want to integrate a real gateway (Stripe/MercadoPago)? | Revenue | **Keep WhatsApp** for MVP (B2B usually involves negotiation). Switch to Gateway later if selling direct-to-consumer. |

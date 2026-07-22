# ERP Platform — KHQR · MariaDB · Redis · JWT

A full-stack ERP with a Cambodia **KHQR** (Bakong) payment flow, inventory,
invoicing, image uploads, JWT auth, light/dark themes, and a
trilingual UI (**English · 中文 · ខ្មែរ**).

Built with **Next.js 14 App Router** — deploy to Vercel in one click.

```text
erp-platform/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── (erp)/              # ERP dashboard (Admin/Manager/Staff)
│   ├── (shop)/             # Public storefront
│   ├── api/                # REST API routes
│   └── login/              # Staff login
├── components/             # shadcn/ui + shared components
├── lib/                    # Utilities (Prisma, JWT, KHQR, KV, auth)
├── locales/                # i18n (en / zh / km)
├── prisma/                 # Schema + seed
└── public/                 # Static assets
```

## Tech stack

| Layer       | Choices                                                                     |
|-------------|-----------------------------------------------------------------------------|
| Framework   | Next.js 14 (App Router), React 18, TypeScript                               |
| UI          | Tailwind CSS v3, shadcn/ui, Recharts                                        |
| Data        | TanStack Query, Axios (auto-refresh JWT)                                    |
| Database    | MariaDB / MySQL (via Prisma `mysql` provider)                               |
| Cache/auth  | Upstash Redis (Vercel KV) — dashboard cache + refresh token store           |
| File upload | Vercel Blob                                                                 |
| Auth        | JWT (access + rotating refresh), jose (Edge-compatible)                     |
| i18n        | i18next (English / 中文 / ខ្មែរ)                                          |
| Payments    | KHQR / Bakong — QR generated natively (EMVCo TLV + CRC-16)                  |

---

## Quick start (local)

**Prerequisites**: Node.js 18+, MariaDB/MySQL, Redis (or Upstash)

```bash
# 1. Clone & install
git clone <repo>
cd erp-platform
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, Redis credentials, and JWT secrets

# 3. Database
npm run prisma:migrate
npm run seed

# 4. Run
npm run dev
# App at http://localhost:3000
```

### Default credentials (after seeding)

| Role  | Email             | Password   |
|-------|-------------------|------------|
| Admin | `admin@erp.local` | admin1234  |
| Staff | `staff@erp.local` | admin1234  |

> The first registered account becomes `ADMIN`. After seeding, use the credentials above.

### Role-based routes

- **Staff**: POS (`/store`), invoices, customers, staff dashboard
- **Manager**: everything Staff + products, suppliers, stores, visits
- **Admin**: everything + settings, user management (`/users`)

---

## Deploy to Vercel

1. Push to GitHub
2. Import in Vercel (framework auto-detected as Next.js)
3. Add these environment variables:
   - `DATABASE_URL` — your MySQL/MariaDB connection string
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN` — from Upstash Redis (Vercel Integration)
   - `BLOB_READ_WRITE_TOKEN` — from Vercel Blob
   - `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET` — random strings
   - Optional: `KHQR_*` / `BAKONG_*` for Bakong payments
4. Run migrations against your remote DB, then `npm run seed`
5. Deploy

---

## API routes

```text
# Auth & users
POST   /api/auth/register      POST /api/auth/login        GET /api/auth/me
GET    /api/auth/users         POST /api/auth/users         (admin only)
POST   /api/auth/refresh       POST /api/auth/logout

# ERP
GET    /api/products           POST /api/products           (multipart: image)
POST   /api/products/:id/stock GET    /api/products/:id     PUT /api/products/:id
GET    /api/invoices           POST /api/invoices           PATCH /api/invoices/:id
POST   /api/payments/khqr      GET  /api/payments/status/:md5
POST   /api/payments/manual    GET  /api/dashboard          POST /api/upload
GET    /api/customers          POST /api/customers          PUT/DELETE /api/customers/:id
GET    /api/suppliers          POST /api/suppliers          PUT/DELETE /api/suppliers/:id
GET    /api/stores             POST /api/stores             PUT/DELETE /api/stores/:id
GET    /api/visits             POST /api/visits             PATCH /api/visits/:id/status

# Public shop
GET    /api/shop/products      GET /api/shop/categories
GET    /api/shop/products/:id  POST /api/shop/orders        GET /api/shop/orders
GET    /api/shop/orders/:id    POST /api/shop/orders/:id/pay/khqr
GET    /api/shop/orders/pay/status/:md5
POST   /api/shop/auth/register POST /api/shop/auth/login    GET /api/shop/auth/me
```

---

## KHQR / Bakong notes

- **Generating** the QR is fully local — set `KHQR_BAKONG_ID` to a real Bakong
  account (e.g. `your_name@aclb`) and the QR becomes payable in any Bakong app.
- **Verifying** payment uses the Bakong Open API. Register at
  <https://api-bakong.nbc.gov.kh> for a token and set `BAKONG_API_TOKEN`.
- Without a token, the QR still displays and you can settle invoices with
  **Cash / Card** buttons (manual payments).

## Implementation notes

- Money is stored as `DECIMAL(12,2)`. Prisma serializes decimals as **strings**
  in JSON — the frontend wraps them in `Number()` / `formatMoney()`.
- Dev server runs via `next dev` with Turbopack. Use `npm run build` for a
  type-checked production build.
- `prisma:migrate` requires the database to be reachable. Use `npm run prisma:push`
  to push schema without migration history.

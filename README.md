# ERP Platform — KHQR · MariaDB · Redis · JWT

A full-stack ERP with a Cambodia **KHQR** (Bakong) payment flow, inventory,
invoicing with printing, image uploads, JWT auth, light/dark themes, and a
trilingual UI (**English · 中文 · ខ្មែរ**).

```
erp-platform/
├── docker-compose.yml      # MariaDB + Redis (+ Adminer) for local dev
├── backend/                # Express + TypeScript + Prisma + Redis + JWT + KHQR
└── frontend/               # Vite + React + TypeScript + Tailwind + shadcn/ui
```

## Tech stack

| Layer      | Choices                                                                 |
|------------|-------------------------------------------------------------------------|
| Backend    | Node, Express, TypeScript, Prisma (MariaDB), ioredis, JWT, Multer, Zod  |
| Frontend   | Vite, React, TypeScript, Tailwind v3, shadcn/ui, TanStack Query, i18next |
| Database   | MariaDB 11 (via Prisma `mysql` provider)                                 |
| Cache/auth | Redis (dashboard cache + revocable refresh-token store)                  |
| Payments   | KHQR / Bakong — QR generated natively (EMVCo TLV + CRC-16)               |
| Charts     | Recharts · **QR** via `qrcode.react`                                     |

---

## Prerequisites

- **Node.js 18+** (20+ recommended) and npm
- **Docker** (easiest way to get MariaDB + Redis) — or your own local installs

## 1. Start MariaDB + Redis

From the project root:

```bash
docker compose up -d
```

This launches MariaDB on `localhost:3306` (db `erp`, user `erp`, password
`erp_password`), Redis on `localhost:6379`, and Adminer (a DB UI) on
`http://localhost:8080`. To use your own MariaDB/Redis instead, just point
`DATABASE_URL` / `REDIS_URL` in the backend `.env` at them.

## 2. Backend

```bash
cd backend
cp .env.example .env          # then edit secrets + KHQR settings (see below)
npm install

npm run prisma:generate       # generate the Prisma client
npm run prisma:migrate        # create the database tables
npm run seed                  # sample products, customers, suppliers + users

npm run dev                   # API at http://localhost:4000
```

Set at least these in `backend/.env`:

```ini
JWT_ACCESS_SECRET=<random string>
JWT_REFRESH_SECRET=<another random string>
# Your real Bakong account so the KHQR is payable:
KHQR_BAKONG_ID=your_name@aclb
KHQR_MERCHANT_NAME=Your Store
```

Generate a secret quickly:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 3. Frontend

```bash
cd frontend
cp .env.example .env          # VITE_API_URL defaults to http://localhost:4000/api
npm install
npm run dev                   # app at http://localhost:5173
```

Open **http://localhost:5173** and sign in:

| Role  | Email             | Password   |
|-------|-------------------|------------|
| Admin | admin@erp.local   | admin1234  |
| Staff | staff@erp.local   | admin1234  |

> The **first account** ever registered becomes `ADMIN`. After seeding, use the
> credentials above.

---

## Features mapped to your requirements

- **shadcn/ui** — components are hand-written under `frontend/src/components/ui`
  (the CLI needs network access; these are the same files it would generate).
- **Dark / light mode** — `theme-provider.tsx` + CSS variables in `index.css`;
  toggle in the top bar or Settings (light / dark / system).
- **Cambodia KHQR** — `backend/src/utils/khqr.ts` builds the EMVCo payload with
  a CRC-16 checksum; the frontend renders it (`khqr-dialog.tsx`) and polls for
  payment. See the KHQR note below.
- **MariaDB** — Prisma schema in `backend/prisma/schema.prisma`.
- **Redis** — caches the dashboard and stores refresh-token IDs so sessions are
  revocable (`backend/src/config/redis.ts`, `utils/jwt.ts`).
- **ERP** — products, inventory movements, customers, suppliers, invoices,
  payments, and a live dashboard.
- **Dynamic interaction** — TanStack Query with auto-refetching (the dashboard
  refreshes every 15s; KHQR status polls every 4s) and toasts.
- **Frontend + backend** — separate apps, talking over a REST API.
- **.env** — both apps ship `.env.example`; secrets/URLs are read from `.env`.
- **Print invoice** — `invoice-view.tsx` + print styles in `index.css`
  (`@media print`); click **Print**.
- **Upload picture** — product images via Multer (`POST /api/products` with a
  file field), served from `/uploads`.
- **JWT auth** — access + rotating refresh tokens; axios auto-refreshes on 401.
- **Fonts (EN / ZH / KM)** — Noto Sans, Noto Sans SC, and Noto Sans Khmer are
  loaded in `index.html` and set as the font stack in `tailwind.config.js`.

---

## KHQR / Bakong notes

- **Generating** the QR is fully local and needs no token — set `KHQR_BAKONG_ID`
  to a real Bakong account (e.g. `your_name@aclb`) and the QR becomes payable in
  any Bakong-enabled app.
- **Verifying** payment server-side uses the Bakong Open API
  (`POST /v1/check_transaction_by_md5`). Register at
  <https://api-bakong.nbc.gov.kh> for a token and set `BAKONG_API_TOKEN`.
  Without a token, the QR still displays and you can settle invoices with the
  **Cash / Card** buttons (recorded as manual payments).
- The TLV mechanics and CRC are standard EMVCo; if a real wallet rejects a scan,
  re-verify the merchant-account sub-tags against the latest NBC KHQR spec.

## A few implementation notes

- Money is stored as `DECIMAL(12,2)` in MariaDB. Prisma serialises decimals as
  **strings** in JSON, so the frontend wraps amounts in `Number()` /
  `formatMoney()` — keep that in mind when adding fields.
- Dev servers run via `tsx` (backend) and Vite/esbuild (frontend), which execute
  TypeScript without a blocking type-check, so `npm run dev` starts fast. Use
  `npm run build` for a type-checked production build.
- `prisma:migrate` requires the database to be reachable. If you only want to
  push the schema without migration history, use `npm run prisma:push`.

## Common API routes

```
POST   /api/auth/register            POST /api/auth/login   GET /api/auth/me
GET    /api/products                 POST /api/products      (multipart: image)
POST   /api/products/:id/stock       (inventory movement)
GET    /api/invoices                 POST /api/invoices      PATCH /api/invoices/:id/status
POST   /api/payments/khqr            GET  /api/payments/status/:md5
GET    /api/dashboard                POST /api/upload        (multipart: file)
```

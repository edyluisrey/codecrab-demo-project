# 🦀 codecrab-demo-project

A production-style, full-stack demo store used as the official sandbox for testing
**CodeCrab** (AI-assisted local code reviews). The codebase is intentionally shipped at
roughly **70% feature completion**: core flows work end to end, while advanced features
are left as roadmap items so they can be implemented in future PRs and reviewed by CodeCrab.

---

## Architecture

```
codecrab-demo-project/
├── backend/                 FastAPI + SQLAlchemy 2.0 + Pydantic v2
│   └── app/
│       ├── core/            config, security (bcrypt + JWT), database, exceptions, logging
│       ├── models/          SQLAlchemy ORM entities (User, Product, Order, OrderItem)
│       ├── schemas/         Pydantic request/response models
│       ├── services/        Business logic, decoupled from HTTP
│       ├── routers/         FastAPI routes (auth, products, orders, webhooks)
│       ├── deps.py          Dependency injection (get_db, get_current_user)
│       ├── main.py          App factory, CORS, exception handlers, /api/v1 mounting
│       └── seed.py          Database seeding script
└── frontend/                React 18 + TypeScript + Vite + Tailwind CSS
    └── src/
        ├── api/             Axios client with JWT + error interceptors, typed endpoints
        ├── components/      Navbar, Button, Card, Badge, Spinner, ProtectedRoute
        ├── context/         Auth, Cart and Toast providers
        ├── pages/           Catalog, ProductDetail, Cart, Orders, Login, Register
        └── types/           TypeScript interfaces mirroring backend schemas
```

**Request flow:** `Page → Context/API module → Axios client (Bearer JWT) → FastAPI router →
Service → SQLAlchemy model → SQLite`.

Routers stay thin: they parse parameters, resolve dependencies via `Depends()`, and delegate
to services. Services raise domain exceptions (`NotFoundError`, `ConflictError`, ...) which a
global exception handler converts to a consistent JSON shape: `{"detail": "...", "code": "..."}`.

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # then edit SECRET_KEY
python -m app.seed              # creates codecrab_demo.db with sample data
uvicorn app.main:app --reload   # http://localhost:8000  (docs at /docs)
```

Demo credentials created by the seed script:

| Email               | Password      |
| ------------------- | ------------- |
| `demo@codecrab.dev` | `codecrab123` |

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so no extra configuration
is required locally. Set `VITE_API_BASE_URL` to target a different backend.

---

## API Summary (`/api/v1`)

| Method | Path                    | Auth | Description                              |
| ------ | ----------------------- | ---- | ---------------------------------------- |
| POST   | `/auth/register`        | -    | Create an account                        |
| POST   | `/auth/login`           | -    | OAuth2 password form, returns JWT        |
| GET    | `/auth/me`              | JWT  | Current user profile                     |
| GET    | `/products`             | -    | List products (`?category=&search=`)     |
| GET    | `/products/categories`  | -    | Distinct product categories              |
| GET    | `/products/{id}`        | -    | Product detail                           |
| POST   | `/orders`               | JWT  | Create an order with line items          |
| GET    | `/orders`               | JWT  | Current user's order history             |
| GET    | `/orders/{id}`          | JWT  | Single order (owner only)                |
| POST   | `/webhooks/stripe`      | -    | Stripe event receiver (skeleton)         |

---

## Roadmap

### Completed
- [x] Configuration via `pydantic-settings` and `.env`
- [x] Registration, login (JWT bearer), `/auth/me`
- [x] Product catalog with category and search filtering, product detail
- [x] Seed script with realistic developer-tool products
- [x] Order creation with line items and server-side total calculation
- [x] Order history per user
- [x] Stripe webhook endpoint updating order status (skeleton)
- [x] React frontend: catalog, product detail, cart, checkout, order history, auth

### Planned
- [ ] Coupon code validation and discounts at checkout
- [ ] Stock deduction with concurrency-safe row locking
- [ ] Order cancellation and refunds
- [ ] Stripe webhook signature verification (`STRIPE_WEBHOOK_SECRET`)
- [ ] Webhook event idempotency (persist processed event IDs)
- [ ] Database migrations with Alembic
- [ ] Automated test suites (pytest, Vitest)
- [ ] Pagination for product listing and order history

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
pip install -r requirements-dev.txt   # or requirements.txt for runtime only
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

## Testing

| Layer | Tooling | Location | Command |
| ----- | ------- | -------- | ------- |
| Backend unit | pytest | `backend/tests/unit/` | `pytest -m unit` |
| Backend integration (HTTP) | pytest + `TestClient` | `backend/tests/integration/` | `pytest -m integration` |
| Backend functional (journeys) | pytest + `TestClient` | `backend/tests/functional/` | `pytest -m functional` |
| Frontend unit + integration | Vitest, Testing Library, MSW | `frontend/src/**/*.test.ts(x)` | `npm test` |
| End-to-end | Playwright (Chromium) | `frontend/e2e/` | `npm run test:e2e` |

```bash
# Backend (from backend/, venv active)
pip install -r requirements-dev.txt
pytest                          # all suites, in-memory SQLite
pytest --cov=app                # with coverage report

# Frontend (from frontend/)
npm test                        # unit + integration, network mocked with MSW
npm run test:coverage           # with coverage report
npx playwright install chromium # once
npm run test:e2e                # real API on :8001 (seeded e2e_test.db) + Vite on :5174
```

The E2E run starts and stops both servers itself, so the dev servers can stay running.
Roadmap behavior that is not implemented yet (stock deduction) is pinned by a strict
`xfail` test, which starts failing as soon as the feature lands so the marker gets removed.

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
- [x] Automated tests: pytest (unit, integration, functional), Vitest + MSW, Playwright E2E

### Planned
- [ ] Coupon code validation and discounts at checkout
- [ ] Stock deduction with concurrency-safe row locking
- [ ] Order cancellation and refunds
- [ ] Stripe webhook signature verification (`STRIPE_WEBHOOK_SECRET`)
- [ ] Webhook event idempotency (persist processed event IDs)
- [ ] Database migrations with Alembic
- [ ] CI pipeline running the test suites on every PR
- [ ] Pagination for product listing and order history

# codecrab-demo-project

Full-stack demo store used as a sandbox for CodeCrab AI code reviews.
Intentionally ~70% complete: features marked `TODO(roadmap)` are NOT bugs, they are
planned work for future PRs. See @README.md for overview and roadmap.

## Commands

Backend (run from `backend/`, venv at `backend/.venv`):
- Install: `python3 -m venv .venv && .venv/bin/pip install -r requirements-dev.txt && cp .env.example .env`
- Reset + seed DB (DESTROYS all data): `.venv/bin/python -m app.seed`
- Run API: `.venv/bin/uvicorn app.main:app --reload` (port 8000, docs at `/docs`)
- Tests: `.venv/bin/pytest` (add `--cov=app` for coverage, `-m unit|integration|functional` to filter)

Frontend (run from `frontend/`):
- Install: `npm install` (once for E2E: `npx playwright install chromium`)
- Dev: `npm run dev` (port 5173, proxies `/api` to `localhost:8000`)
- Typecheck + build: `npm run build` (MUST pass with zero errors; also type-checks tests)
- Unit/integration tests: `npm test` (`npm run test:coverage` for coverage)
- E2E: `npm run test:e2e` (boots its own seeded API on 8001 and Vite on 5174)

Demo login: `demo@codecrab.dev` / `codecrab123`

## Tests

- Backend `tests/`: `unit/` (services, security, schemas; call services directly),
  `integration/` (HTTP via `TestClient`), `functional/` (multi-step user journeys).
  Fixtures in `tests/conftest.py`: in-memory SQLite per test, `client`, `make_user`,
  `make_product`, `auth_headers`. Use them instead of hand-building rows or tokens.
- DeprecationWarnings raised from `app.*` fail the suite (see `pytest.ini`).
- Unimplemented roadmap behavior is pinned with `@pytest.mark.xfail(strict=True)`.
  A PR that implements it must remove the marker (strict xfail fails once it passes).
- Frontend: Vitest + Testing Library, colocated as `*.test.ts(x)`. Network is mocked
  with MSW (`src/test/handlers.ts`); unhandled requests fail the test. Render pages
  with `renderRoutes` from `src/test/render.tsx`; prefer role/label queries.
- E2E specs in `frontend/e2e/` run serially against a real seeded backend.

## Backend architecture rules

- Layers: `routers/` -> `services/` -> `models/`. Routers stay thin: parse input,
  resolve `Depends()`, call one service function, return.
- `services/` must NOT import FastAPI. They take a `Session` and raise subclasses of
  `AppException` (`app/core/exceptions.py`), never `HTTPException`.
- Use the `DbSession` and `CurrentUser` aliases from `app/deps.py` instead of re-declaring `Depends`.
- All error responses share one shape: `{"detail": ..., "code": "<snake_case>"}`.
  New errors pass a specific `code=`.
- SQLAlchemy 2.0 style only: `Mapped[]`, `mapped_column()`, `select()`; no legacy `query()`.
- Pydantic v2 only: `ConfigDict(from_attributes=True)`, `field_validator`.
- Config lives in `app/core/config.py` (`settings`). Never read `os.environ` directly.
  `CORS_ORIGINS` is a comma-separated string; use `settings.cors_origin_list`.

## Backend invariants (flag violations in review)

- Money is `Decimal` end to end (`Numeric` columns). Never use `float` arithmetic.
  Round with `quantize(Decimal("0.01"), ROUND_HALF_UP)`. API schemas use the `Money`
  type (`app/schemas/common.py`) so JSON carries numbers, not strings.
- Order totals are computed server-side from DB prices; never trust client prices.
  `OrderItem.unit_price` snapshots the product price at purchase time.
- Order reads are scoped to the owner. Another user's order returns 404, not 403,
  so we don't leak that it exists.
- Emails are normalized to lowercase before lookup or insert.
- Passwords: 8-72 chars (bcrypt limit). Hash with `app/core/security.py` only.
- `bcrypt==4.0.1` is pinned on purpose (newer versions break passlib). Do not bump it.

## Schema changes

No Alembic yet. Tables are created by `Base.metadata.create_all` at startup, which
does NOT alter existing tables. After changing a model, run `python -m app.seed`
(wipes the DB). New models must be imported in `app/models/__init__.py`.

## Frontend rules

- All HTTP goes through `src/api/client.ts` via the typed modules in `src/api/`.
  Never call `axios` or `fetch` directly from components.
- The client normalizes errors to `ApiError` and shows a global toast. Pages wrap
  calls in `try/catch` without re-toasting. Pass `{ silent: true }` to suppress the
  toast; cancelled requests are already silent.
- `src/types/index.ts` mirrors backend schemas exactly (snake_case fields). Update it
  in the same PR as any schema change.
- State: auth, cart and toasts live in `src/context/`; use the `useAuth`, `useCart`
  and `useToast` hooks. localStorage keys: `codecrab.token`, `codecrab.cart`.
- Strict TS with `noUncheckedIndexedAccess`; no `any`, no `@ts-ignore`.
- Styling: Tailwind v3 utilities only, brand palette `crab-*`, icons from `lucide-react`.
- Effects that fetch must cancel (AbortController or a `cancelled` flag); StrictMode
  runs them twice in dev.

## Known gaps (intentional, `TODO(roadmap)`)

- Coupon codes: accepted in `OrderCreate`, ignored.
- Stock: checked but never deducted; no row locking (overselling possible).
- No order cancellation or refunds.
- Stripe webhook (`routers/webhooks.py`): no signature verification, no idempotency,
  and the endpoint is unauthenticated.
- No pagination, migrations, or rate limiting.

When reviewing a PR that implements one of these, check it closes the gap correctly
(e.g. stock deduction must be atomic; the webhook must verify `Stripe-Signature` with
`settings.stripe_webhook_secret` and dedupe by event id).

## Code review guidelines

- Prioritize: security > correctness/data integrity > invariant violations above >
  missing verification > maintainability. Skip pure style nits.
- Report each finding as: `file:line`, severity (critical/high/medium/low), the
  problem, and a concrete fix.
- Flag: business logic in routers, FastAPI imports in services, raw `HTTPException`,
  `float` money math, unscoped queries on user data, secrets in code, frontend types
  drifting from backend schemas, direct axios usage in components, behavior changes
  without a matching test.
- Do NOT flag existing `TODO(roadmap)` items as bugs unless the PR touches them.

## Workflow

- Match surrounding code style; comments only for non-obvious constraints.
- Before finishing: `pytest` passes if backend changed; `npm test` and `npm run build`
  pass if frontend changed. Add or update tests alongside behavior changes.
- Never commit `.env`, `*.db`, `.venv/`, `node_modules/` or `dist/`.

---
name: custom-code-review
description: >-
  Read-only review of a teammate's GitHub pull request in edyluisrey/codecrab-demo-project
  (FastAPI + SQLAlchemy 2.0 backend, React + TypeScript + Vite frontend). Fetches PR metadata
  and diff with gh, optionally pulls Jira context with acli when the title, branch or body
  contains a ticket ID (generic KEY-123 pattern; project key not yet standardized), verifies
  every cited line at the PR head commit, and produces a five-axis findings report
  (Correctness, Readability, Architecture, Security, Performance) in CodeCrab's
  machine-readable format. Never comments on, approves, edits or merges the PR.
  Use when the developer says "review this PR", "review peer PR", or "/custom-code-review".
disable-model-invocation: true
---

# Custom code review: codecrab-demo-project

You are a senior full-stack engineer who lives in this codebase, reviewing a teammate's pull
request before they get feedback. You produce a findings report; you do not post anything,
approve anything, or decide the merge.

## Role and stack

codecrab-demo-project is a demo developer-tool store used as the sandbox for CodeCrab AI code
reviews. It is intentionally about 70% complete; unfinished features are marked `TODO(roadmap)`.

- **Backend** (`backend/`): Python 3.11+, FastAPI, SQLAlchemy 2.0 (`Mapped[]`, `mapped_column()`,
  `select()`), Pydantic v2 + pydantic-settings, SQLite, PyJWT (HS256), passlib with `bcrypt==4.0.1`.
  - `app/core/`: `config.py` (`Settings`, `settings`), `security.py` (hashing, JWT),
    `database.py` (`engine`, `SessionLocal`, `Base`, `get_db`), `exceptions.py`
    (`AppException` and subclasses, global handlers), `logging.py`.
  - `app/deps.py`: `oauth2_scheme`, `get_current_user`, `DbSession` and `CurrentUser` aliases.
  - `app/models/`: `User`, `Product`, `Order`, `OrderItem`, `OrderStatus` (all re-exported from
    `app/models/__init__.py`).
  - `app/schemas/`: Pydantic request/response models; `common.py` defines the `Money` type.
  - `app/services/`: `auth_service`, `product_service`, `order_service` (business logic).
  - `app/routers/`: `auth`, `products`, `orders`, `webhooks`, mounted under `/api/v1` by
    `app/routers/__init__.py` and `app/main.py`.
  - `app/seed.py`: drops and recreates all tables, seeds products and the demo user.
- **Frontend** (`frontend/`): React 18, TypeScript 5 (strict, `noUncheckedIndexedAccess`),
  Vite 5, Tailwind CSS v3 (brand palette `crab-*`), Axios, React Router v6, lucide-react.
  - `src/api/`: `client.ts` (Axios instance + interceptors), `auth.ts`, `products.ts`,
    `orders.ts`, `events.ts` (toast/logout events), `token.ts` (localStorage token).
  - `src/context/`: `AuthContext`, `CartContext`, `ToastContext` with `useAuth`, `useCart`, `useToast`.
  - `src/components/`, `src/pages/`, `src/hooks/`, `src/utils/`, `src/types/index.ts`.
- **Project rules**: `CLAUDE.md` at the repo root is the source of truth for invariants and
  known gaps. Read it before reviewing.

## Read-only rule

This skill is strictly read-only against GitHub, git and Jira. Never run:

- `gh pr comment`, `gh pr review`, `gh pr merge`, `gh pr edit`, `gh pr close`, `gh pr checkout`,
  or any other mutating `gh` command (including `gh api` with `-X POST|PATCH|PUT|DELETE`).
- `git checkout`, `git switch`, `git commit`, `git push`, `git reset`, `git stash`, or any git
  command that changes the working tree, index or remote for the PR.
- Any Jira write (`acli jira workitem edit|transition|comment ...`).

If you are about to run a mutating command, stop. Suggested PR comments in the report are text
for the developer to paste manually.

## Input

Accept either:

- A PR URL, e.g. `https://github.com/edyluisrey/codecrab-demo-project/pull/12`
- A PR number, e.g. `12`. Resolve owner/repo from `origin` and assume
  `edyluisrey/codecrab-demo-project`.

## Step 0: Preflight

```bash
gh auth status
```

If it fails or reports an invalid/expired token, stop and tell the developer:

> GitHub CLI is not authenticated. Run `gh auth refresh -h github.com` (or `gh auth login`), then retry.

Do not continue until this succeeds.

## Step 1: Resolve and validate the PR

1. Parse owner, repo and number from the URL (or take the number as given).
2. Check the checkout's remote:

   ```bash
   git remote get-url origin
   ```

   - If `origin` is missing, stop: "This checkout has no `origin` remote. Add it with
     `git remote add origin git@github.com:edyluisrey/codecrab-demo-project.git` and retry."
   - Normalize both SSH (`git@github.com:owner/repo.git`) and HTTPS forms to `owner/repo`.
3. If the PR's owner/repo is not `edyluisrey/codecrab-demo-project` or does not match `origin`, stop:

   > This PR belongs to OTHER_OWNER/OTHER_REPO, but this checkout's origin is
   > edyluisrey/codecrab-demo-project. This skill only reviews PRs for the repo it runs in.

   Do not fall back to a context-free review.

## Step 2: Fetch once

Fetch metadata and diff exactly once and reuse them for the whole review:

```bash
gh pr view NUMBER --repo edyluisrey/codecrab-demo-project \
  --json title,body,author,headRefName,baseRefName,headRefOid,state,isDraft,changedFiles,additions,deletions,files,url

gh pr diff NUMBER --repo edyluisrey/codecrab-demo-project
```

- Keep `headRefOid`; Step 4.5 depends on it.
- Merged or closed PRs are still reviewed; state it in the Overview.
- If either command fails (bad number, network, permissions), surface the raw `gh` error and stop.
- Optionally run `gh pr checks NUMBER --repo edyluisrey/codecrab-demo-project` (read-only).
  There is no CI workflow in this repo yet (no `.github/workflows/`), so "no checks" is expected.

## Step 3: Optional ticket context

No ticket key is standardized for this repo yet (confirm with the team). Detect a ticket ID with
the generic pattern `[A-Z][A-Z0-9]+-[0-9]+`, searching in order and stopping at the first match:

1. PR title
2. Head branch (`headRefName`)
3. PR body

If found and `acli` is available:

```bash
acli jira workitem view KEY-123 --fields summary,description,comment,status --json
```

Use summary, description, comments and status as the spec. If `acli` is missing,
unauthenticated, or the lookup fails, continue and record `Jira context: not fetched (REASON)`.
If no ID is present, record `Jira context: none in PR body`. Without Jira, the PR title and body
are the spec. Never block the review on ticket lookup.

## Step 4: Classify

Classify from the changed file paths:

| Area | Paths |
| --- | --- |
| Backend core / security | `backend/app/core/**`, `backend/app/deps.py`, `backend/app/main.py` |
| Data model | `backend/app/models/**` |
| API contract | `backend/app/schemas/**` |
| Business logic | `backend/app/services/**` |
| HTTP layer | `backend/app/routers/**` (webhooks: `routers/webhooks.py`) |
| Seed data | `backend/app/seed.py` |
| Frontend API layer | `frontend/src/api/**` |
| Frontend state | `frontend/src/context/**` |
| Frontend UI | `frontend/src/pages/**`, `frontend/src/components/**`, `frontend/src/hooks/**` |
| Frontend types | `frontend/src/types/index.ts` |
| Config / deps | `backend/requirements.txt`, `backend/.env.example`, `frontend/package.json`, `frontend/tsconfig*.json`, `frontend/vite.config.ts`, `frontend/tailwind.config.js` |
| Docs / agent files | `README.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**` |

**Scale**: Small = under 50 changed lines (additions + deletions); Standard = 50 or more.

**Cross-cutting** if any of these hold:

- Touches `backend/app/models/**`. There is no Alembic: `Base.metadata.create_all` does not alter
  existing tables, so the PR must say a reseed (`python -m app.seed`) is required, and new models
  must be imported in `app/models/__init__.py`.
- Touches `backend/app/schemas/**` without a matching change to `frontend/src/types/index.ts`
  (or vice versa).
- Touches `backend/app/core/security.py`, `backend/app/deps.py` or `backend/app/core/config.py`.
- Touches both `backend/` and `frontend/`.
- Changes `backend/requirements.txt` or `frontend/package.json`.

Small single-area changes need light verification; cross-cutting changes warrant reading the
surrounding files in the checkout (Read/Grep) before writing findings.

## Step 4.5: Pinpoint line numbers

Never infer line numbers from diff hunks. Verify every Critical, Required and Optional citation
against the file at `headRefOid`:

```bash
gh api "repos/edyluisrey/codecrab-demo-project/contents/PATH?ref=HEAD_SHA" \
  --jq .content | base64 -d | grep -n "ANCHOR TEXT"

gh api "repos/edyluisrey/codecrab-demo-project/contents/PATH?ref=HEAD_SHA" \
  --jq .content | base64 -d | sed -n '60,90p'
```

`Line` is a single new-file line number. If it cannot be verified (file deleted, binary, over the
1 MB content API limit, API error), omit the `Line` field and state the reason inside **Problem**
(e.g. "Line unverifiable: file deleted in this PR"), or drop the finding. Never invent a number.

## Step 5: Review across five axes

Only report specific, evidence-backed findings. Review tests (if any) before implementation.
Use local Read/Grep against the checkout to confirm config keys, referenced symbols and existing
patterns; remember the local checkout may not match `headRefOid`.

### Axis 1: Correctness

- Does the change do what the ticket or PR description claims?
- **Money**: values stay `Decimal` end to end (`Numeric(10, 2)` / `Numeric(12, 2)` columns). Totals
  are rounded with `quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)` (see `CENTS` in
  `order_service.py`). Any `float()` in money arithmetic on the backend is a finding. Response
  schemas expose money via the `Money` type from `app/schemas/common.py`.
- **Orders**: totals are computed server-side from DB prices; client-sent prices must never be
  trusted. `OrderItem.unit_price` snapshots `Product.price` at purchase time. `OrderCreate`
  enforces 1-50 items, quantity 1-100, and unique `product_id`s; changes must keep or justify that.
- **Order status**: `OrderStatus` values are `pending`, `paid`, `failed`, `cancelled`; the column is
  a non-native enum (`native_enum=False`). New states need both the enum and
  `frontend/src/types/index.ts` (`OrderStatus` union) plus `OrderStatusBadge` tones in `Badge.tsx`.
- **Auth**: emails are normalized with `_normalize_email` (strip + lower) before lookup and insert.
  Passwords are 8-72 chars (`UserCreate`), matching bcrypt's limit.
- **Sessions/commits**: services commit explicitly and `rollback()` on `IntegrityError` where a race
  is possible (see `register_user`). New write paths that can hit unique constraints should do the same.
- **Roadmap features** (`TODO(roadmap)`): if the PR implements one, verify it closes the gap:
  - Stock deduction must be atomic with order creation (same transaction; row lock or conditional
    `UPDATE ... WHERE stock >= :qty`). Note SQLite ignores `SELECT ... FOR UPDATE`.
  - Coupon validation must happen server-side and the discount must be reflected in
    `total_amount` with `Decimal` math.
  - Cancellation/refund must check ownership and allowed state transitions.
- **Frontend**: data-fetching effects must cancel (AbortController or a `cancelled` flag) because
  React StrictMode runs effects twice in dev; cart quantities stay clamped by `clampQuantity` in
  `CartContext.tsx`; `ProtectedRoute` waits for `isLoading` before redirecting.

### Axis 2: Readability and simplicity

- Follows existing idioms: `DbSession` / `CurrentUser` aliases in routers; `useAuth`, `useCart`,
  `useToast` hooks in components; typed API modules (`authApi`, `productsApi`, `ordersApi`).
- Names match existing vocabulary (`list_*`, `get_*_for_user`, `mark_order_status`).
- Pages wrap API calls in `try/catch` with an empty catch commented as relying on the global toast;
  new pages should not re-toast the same error.
- No dead code, commented-out blocks, unused imports or stale `TODO`s that are not `TODO(roadmap)`.
- Comments only for non-obvious constraints; flag comments that narrate the code.

### Axis 3: Architecture

- **Layering**: `routers/` -> `services/` -> `models/`. Routers parse input, resolve `Depends()`,
  call one service function and return. Business logic or `select()` queries inside a router are
  findings.
- **Services must not import FastAPI** (`fastapi`, `Request`, `HTTPException`). They take a
  `Session` and raise `AppException` subclasses from `app/core/exceptions.py`
  (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`)
  with a specific snake_case `code=`. Raw `HTTPException` in new code is a finding.
- **Error shape**: every error response is `{"detail": ..., "code": ...}`, produced by the handlers
  registered in `register_exception_handlers`. New handlers must keep that shape.
- **ORM**: SQLAlchemy 2.0 style only (`Mapped[]`, `mapped_column()`, `select()`, `db.scalars`,
  `db.get`). Legacy `db.query(...)` is a finding. New models must subclass `Base` from
  `app/core/database.py` and be imported in `app/models/__init__.py`.
- **Schemas**: Pydantic v2 only (`ConfigDict(from_attributes=True)`, `field_validator`,
  `model_validate`). v1 APIs (`orm_mode`, `@validator`, `.dict()`) are findings.
- **Config**: read via `settings` from `app/core/config.py`; direct `os.environ` / `os.getenv` is a
  finding. New settings need a matching entry in `backend/.env.example`. `CORS_ORIGINS` is a
  comma-separated string consumed through `settings.cors_origin_list`.
- **Frontend HTTP**: all requests go through `apiClient` in `src/api/client.ts` via the typed modules
  in `src/api/`. Direct `axios` or `fetch` calls from components, pages or contexts are findings.
- **Types**: `src/types/index.ts` mirrors backend schemas field-for-field in snake_case. A backend
  schema change without the matching type change (or vice versa) is Required.
- **Frontend state**: auth, cart and toasts live in `src/context/`. localStorage keys are
  `codecrab.token` (via `tokenStorage`) and `codecrab.cart`; new code must not read the token
  directly from localStorage.
- **Styling**: Tailwind utility classes and the `crab-*` palette; icons from `lucide-react`. New UI
  libraries need justification.
- **Dependencies**: `bcrypt==4.0.1` is pinned because newer bcrypt breaks passlib 1.7.4; bumping or
  unpinning it is Required unless passlib is replaced in the same PR.

### Axis 4: Security (high-confidence only)

Report only concrete exploit or exposure paths introduced or worsened by the diff.

- **Ownership scoping**: user data must be filtered by the authenticated user. Orders use
  `get_order_for_user`, which returns 404 (not 403) for other users' orders to avoid leaking
  existence. New endpoints that fetch by ID without an ownership check are Critical.
- **Authentication**: protected routes must depend on `CurrentUser` / `get_current_user`.
  `decode_access_token` requires `sub` and `exp` and checks `type == "access"`; weakening these
  checks, disabling expiry, or accepting other algorithms is Critical.
- **Secrets**: `SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` come from settings. Hardcoded secrets,
  secrets logged, or secrets returned in responses are Critical. The default
  `dev-insecure-secret-key-change-me` in `config.py` is a known dev default; flag only if the PR
  makes it reachable in `production`.
- **Password handling**: hashing only via `hash_password` / `verify_password` in
  `app/core/security.py`. `hashed_password` must never appear in a response schema (`UserRead`
  excludes it) or in logs.
- **SQL injection**: flag string-built SQL in `text(...)` or f-strings in queries. Do not flag
  `select()` with bound parameters or `.like(pattern)` with a bound value (as in `product_service`).
- **Webhook** (`routers/webhooks.py`): currently unauthenticated, with no `Stripe-Signature`
  verification and no idempotency (known gap). Flag a PR that adds new side effects to this
  endpoint (e.g. stock changes, refunds) without adding signature verification against
  `settings.stripe_webhook_secret` first. A PR that implements verification must use the raw body
  (`await request.body()`) and constant-time comparison (or the official Stripe SDK).
- **CORS**: `allow_credentials=True` with explicit origins. Changing origins to `["*"]` while
  keeping credentials is a finding.
- **Frontend**: no `dangerouslySetInnerHTML` with API data; tokens stay in `tokenStorage`.

### Axis 5: Performance

- **N+1**: `Order.items` uses `lazy="selectin"` and `OrderItem.product` uses `lazy="joined"`. New
  relationships accessed in loops or serialized in lists need an explicit loading strategy.
- **Unbounded work**: product listing and order history have no pagination (known gap). Flag only
  if the PR adds a new unbounded list or makes an existing one materially heavier.
- **Blocking the event loop**: the DB layer is synchronous. Sync DB work belongs in `def` handlers.
  A new `async def` route doing sync DB or other blocking I/O is a finding. The existing
  `stripe_webhook` is `async def` with a sync session; do not flag it unless the PR touches it.
- **Frontend**: avoid refetch loops (unstable effect dependencies), and keep search debounced via
  `useDebouncedValue`.

### Do not flag

- Existing `TODO(roadmap)` items (coupons, stock locking, cancellation/refunds, webhook signature
  and idempotency, pagination, Alembic) unless the PR touches them.
- Missing Alembic migrations by themselves; Alembic is not set up yet.
- Missing tests for pure refactors, docs, or styling-only changes. Do flag behavior changes
  (new endpoint, service rule, page flow) that ship without a matching test as Required.
- The strict `xfail` on `test_create_order_deducts_stock`; it documents the stock roadmap gap.
  Do flag a PR that implements stock deduction but leaves the marker in place, or a PR that
  deletes or weakens it without implementing the feature.
- Validation FastAPI/Pydantic already enforces (`Field(gt=0)`, `EmailStr`, `Path(gt=0)`,
  `Query(max_length=...)`).
- Parameterized `select()` queries; SQLAlchemy binds parameters.
- Tailwind class ordering or purely stylistic choices; no ESLint or Prettier is configured.
- `# type: ignore[arg-type]` on `add_exception_handler` calls in `core/exceptions.py` (Starlette typing).
- Generic hardening (rate limiting, CSP headers) with no concrete exploit in the diff.

## Change sizing (informational)

There is no CI gate in this repo yet, so nothing blocks mixing file types. Still call out:

- PRs of roughly 1000+ changed lines, or a refactor mixed with feature work.
- Natural split boundaries here:
  - Model/schema changes plus the matching `frontend/src/types/index.ts` update together, before
    UI work that consumes them.
  - Dependency bumps (`requirements.txt`, `package.json`) separate from features.
  - Backend-only and frontend-only slices when the feature allows it.
  - Docs/agent files (`CLAUDE.md`, `.claude/`, `.cursor/`) separate from code.

Size alone never forces REQUEST CHANGES.

## Step 6: Report only

Before answering, confirm you did not run `gh pr comment|review|merge|edit|close|checkout`, any
mutating `gh api` call, any git command that changed the checkout, or any Jira write.

## Output format (CodeCrab contract, mandatory)

The final answer MUST use exactly this markdown shape. Field labels stay in English even if prose
values are in another language. Do not invent other section names (no "Critical Issues" or
"Required Changes" headings); severity goes on each finding.

```markdown
## Review Summary
**Verdict:** APPROVE | REQUEST CHANGES
**Overview:** 1-2 sentences.
**Stack context:** languages/frameworks/conventions inferred.

### Findings

#### Finding 1 — Critical|Required|Optional|Nit
- **File:** `path/to/file.ext`
- **Line:** 42
- **Axis:** Correctness | Readability | Architecture | Security | Performance
- **Problem:** Precise issue.
- **Why it matters:** Concrete merge risk.
- **Suggested fix:** Concrete change.
- **Detail ref:** custom-code-review#1
- **Suggested PR comment:**
  ```
  <copy-paste review comment addressed to the author; not posted>
  ```

Order findings: Critical, Required, Optional, Nit. Renumber from 1.

### What's Done Well
- At least one specific, genuine observation.

### Dead code / leftovers
- List unused symbols/files, or "None found".

### Verification Story
- Tests reviewed: yes/no + observations
- Tests you would run: <command>
- Build verified: yes/no
- Security checked: yes/no + observations
- Jira context: fetched KEY-123 / not fetched / none in PR body
```

## Output rules

- Severity labels: **Critical** (blocks merge), **Required** (must address), **Optional**, **Nit**.
- Every Critical and Required finding needs File, Problem, Why it matters, Suggested fix and
  Suggested PR comment.
- **Detail ref**: `custom-code-review#N` matching the finding number for Critical/Required;
  `custom-code-review#none` for Optional and Nit.
- **Line** is a single verified new-file line number, never a range, never guessed from the diff.
- Never set Verdict to APPROVE if any Critical finding exists. Use REQUEST CHANGES when any
  Critical or Required finding exists.
- Always keep Review Summary, Findings (an empty section with no `####` entries if truly clean),
  What's Done Well and Verification Story. Omit other empty fluff.
- Uncertainty is labeled as uncertainty (in Overview or Verification Story), not as a finding.
- Suggested PR comments are short, second-person, self-contained, and sound like a teammate.
  For small mechanical fixes, a GitHub ```suggestion block is fine. Never post them with `gh`.
- **Stack context** should mention FastAPI/SQLAlchemy 2.0/Pydantic v2 and/or React/TypeScript/
  Vite/Tailwind as relevant to the files touched.
- **Verification Story** for this repo:
  - Tests reviewed: say whether the PR adds or updates tests in `backend/tests/{unit,integration,
    functional}/`, `frontend/src/**/*.test.ts(x)` or `frontend/e2e/`, and whether they assert the
    changed behavior (status codes, `{"detail","code"}` error shape, owner scoping, Decimal totals)
    rather than just executing it. Check new MSW handlers in `frontend/src/test/handlers.ts` match
    the real backend contract.
  - Tests you would run: `cd backend && .venv/bin/pytest` for backend changes;
    `cd frontend && npm test && npm run build` for frontend changes; `npm run test:e2e` when
    routing, auth, cart or checkout flows change.
  - Build verified: `no` unless `gh pr checks` shows a passing build, or the local checkout's
    `git rev-parse HEAD` equals `headRefOid` and you ran the commands above without modifying
    anything.
- The verdict is informational; the developer makes the actual review and merge decision.

# SolarAgent Pro

A Next.js application for renewable-energy equipment, customer system estimates, project orders, installation operations, and administration in Bangladesh. The UI uses a light blue and soft yellow theme.

The browser and API run together. There is no separate frontend server, backend server, or Vite dependency.

## Run locally

Use Node.js 22 or newer and npm 10 or newer.

```sh
npm ci
cp .env.example .env
```

If `.env` already exists, retain it. Configure `DATABASE_URL` and a random `JWT_SECRET` of at least 32 characters. Then run:

```sh
npm run db:setup
npm run db:check
npm run dev
```

Open http://localhost:3000. API requests use `/api/v1` on the same origin. Database connectivity is exposed at `/api/health` and `/health`.

`db:setup` applies schema changes without seeding demo accounts. The migration bootstraps the checked-in initial schema on an empty database and applies additive compatibility changes to existing installations. It uses a transaction and an advisory lock. Back up existing production databases before applying schema changes.

For optional development catalog/demo fixtures, run `npm run seed`. This includes documented demo credentials and is blocked when `NODE_ENV=production`; do not use demo accounts on a public installation. `npm run seed:marketplace` seeds equipment data separately.

## Configuration

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Hosted connections retain certificate/hostname verification. |
| `JWT_SECRET` | Private signing key, at least 32 random characters. Changing it invalidates sessions. |
| `APP_URL` | Application origin. Use `http://localhost:3000` locally and your public HTTPS origin when deployed. |
| `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD` | Payment provider credentials. |
| `SSLCOMMERZ_IS_SANDBOX` | Select provider sandbox or live service. |
| `PAYMENT_SIMULATOR_ENABLED` | Explicit opt-in to a local payment simulator; production rejects simulated validation. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Transactional email and password recovery delivery. Use a verified sender. |
| `PUBLIC_API_URL`, `FRONTEND_URL` | Optional callback origin overrides; normally `APP_URL` is sufficient. |

Keep `.env` private. Never put database credentials, signing keys, or payment credentials in a `NEXT_PUBLIC_` variable.

## Verification

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm audit
npm run db:check
```

Tests use Node's test runner through `tsx`; they do not need a live database. The access regression test discovers protected routes recursively and checks that unauthenticated requests are rejected.

An explicit integration check creates disposable customers and an order against the configured database, checks the customer workflows and password-reset/session behavior, then cleans up its records:

```sh
npx tsx scripts/check-flows.ts
```

Run that integration check against a development/staging database. It does not charge a payment card or send a recovery email when the email provider is absent.

For production:

```sh
npm ci
npm run build
npm start
```

Set environment variables on the deployment platform and apply migrations separately. Builds do not mutate the database. Existing sessions created before the credential-version security update must sign in again.

## Application structure

- `app/`: Next.js layout, page routing, and Route Handlers.
- `src/screens/`, `src/components/`, `src/styles.css`: application UI.
- `src/api.ts`, `src/routes/`: API composition and domain handlers.
- `src/lib/router.ts`: compatibility dispatcher hosted inside the Next.js API handler; it does not run a standalone server.
- `src/db/`: Drizzle schema, PostgreSQL pool, migrations, checks, and optional fixtures.
- `src/services/`: calculations, weather, payments, email, and support assistance.

Customer accounts, catalog, project requests, orders, inventory movements, assignments, payments, notifications, support submissions, and password-reset tokens use PostgreSQL. Some older operations/recommendation modules remain prototypes or use `src/store.ts`; they are restricted to administrators. Their persistence and provider integrations are not covered by the customer-flow verification. See [implementation status and review limits](docs/IMPLEMENTATION_STATUS.md).

The original product specification remains in the repository's DOCX document. Engineering estimates remain preliminary and require site verification.

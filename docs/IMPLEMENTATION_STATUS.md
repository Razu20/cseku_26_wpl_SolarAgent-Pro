# Reliability and security review

Updated 2026-10-15. This records verified changes and remaining limits; it is not a penetration-test certificate or a claim that every possible bug has been eliminated.

## Changes

| Area | Finding and change |
| --- | --- |
| Installation/framework | Clean lockfile installation verified. Next.js updated within its existing major release. Removed Vitest, its configuration, and its Vite dependency; tests now use Node. Patched vulnerable PostCSS, source-map-js and esbuild dependencies through explicit overrides. |
| Application origins | Removed obsolete split-server defaults. Development uses port 3000; API and UI share one origin. Payment callback configuration accepts `APP_URL`. |
| Database | Connected to the configured hosted database. Compared every declared table/column against the actual schema and found eight absent inventory columns. Applied additive migrations to repair them and add password reset storage. `db:check` reports no missing columns. |
| Pool/network | Reuses the pool during development reloads, handles idle-client failures, sets connection/query timeouts, and preserves certificate/hostname validation. No certificate verification bypass was introduced. |
| API adapter | Awaits middleware continuation even when old middleware does not return `next()`. Parses provider form callbacks, rejects malformed JSON, limits request body bytes, returns valid redirects, and sets no-store responses. |
| API access | Public catalog/estimate access is explicit. Other legacy operations default to administrator access; customer resources enforce ownership. The automated test discovers registered protected routes rather than checking only a few examples. |
| Signup/login | Normalizes email case, limits password length, validates token expiry/header/shape, compares signatures in constant time, fails closed without a signing secret, checks current account activity and role, and creates account/profile records in one transaction. Duplicate email errors inspect PostgreSQL's nested error code. |
| Recovery/session | Replaced public access-token disclosure with hashed, 30-minute, single-use reset tokens. Token delivery uses the optional email provider. Reset links use URL fragments and the UI clears the fragment. Changing a password invalidates existing sessions through a credential version. |
| Orders | Request, appliance selection, order creation and tracked inventory reservations use one transaction. User IDs come from authentication. Listing, details, tracking, cancellation and COD check ownership. Removed unrestricted order mass assignment. |
| Stock | Locks relevant order/inventory records; checks available tracked stock; supports warehouse splits; settles each reservation once; prevents repeated release/deduction; calculates availability after damaged/reserved stock. Products without warehouse records require manual procurement review. |
| Technician operations | Removed the fallback that could treat a job's assigned technician as the signed-in user. Completion is transactional and repeated completion cannot create another commission. Assignment locks relevant records and checks status/schedule. |
| Administration | Order update fields are validated, updates are transactional, terminal state changes settle stock, and repeated terminal updates do not repeat technician counters. Removed the default weak password when administrators create users. |
| Payments | Uses server-calculated order amounts, locks attempt creation to prevent concurrent pending charges, verifies provider transaction ID/currency/exact amount, adds provider request timeouts, rejects simulator validation in production, and updates payment/order state together. Browser fail/cancel redirects cannot change authoritative payment status. |
| Notifications | Authentication and audience restrictions apply to listing and mutations. Filters are applied before limiting results. Another customer's notification is not included simply because it shares a role. |
| Email/audit | Email HTML escapes customer text; absent email configuration no longer reports delivery success. Audit queries now read stored events rather than fabricated history; existing audit event producers persist records. |
| UI | Added consistent light blue/yellow surfaces, keyboard focus/reduced-motion rules, marketplace failure/retry feedback, recovery screens, technician navigation, real session checks, and genuine unknown-route handling. |

## Verification performed

- Clean `npm ci` with the committed lockfile.
- TypeScript checking, ESLint, Node test suite, and Next.js production build.
- Dependency audit: zero known vulnerabilities at verification time, including development dependencies.
- Schema comparison against the configured database.
- 31 disposable live API checks: signup, duplicate signup, normalized login, wrong password, profile, role restrictions, catalog, estimate, order creation, attempted user-ID spoofing, cross-customer access rejection, tracking, order filtering, COD, notifications, cancellation, password reset, reset-token reuse rejection, and old-session rejection.
- Production HTTP smoke checks covered eight page routes, security headers, database health, a populated product catalog, unauthorized order access, malformed JSON, and the disabled production payment simulator.
- No real online charge or external email delivery was performed.

## Remaining limits

- Browser interaction/screenshots were unavailable in this environment. Rendering and production HTTP responses can be smoke-checked; visual layout and mobile interaction still need browser QA.
- Live SSLCommerz charging and actual Resend delivery require valid provider credentials, callback reachability, and verified sender configuration. A pending provider payment must be reconciled with that provider before another charge is attempted; this prevents accidental double charging.
- Local rate limiting is per process. Multi-instance deployments need a shared limiter or trusted ingress limits. Application changes do not verify firewall rules, cloud IAM, DNS ownership, operating-system patching, provider configuration, or every network vulnerability.
- Tokens are still stored by the existing browser client in localStorage. A migration to secure HttpOnly cookie sessions would require an additional session/CSRF design; the current review does not claim protection against arbitrary same-origin script execution.
- Shared role/broadcast notifications retain their existing shared read-state model. Per-recipient read receipts are not implemented.
- Stock without an inventory/warehouse mapping is not automatically procured. Existing catalog and physical-stock data require operational reconciliation.
- The legacy recommendation, survey, project, quote, work-order, NEM and device flows include prototypes/in-memory behavior. They are administrator-restricted and are not represented as production-tested customer services. Fake historical audit entries were removed; this does not retroactively create audit events for older actions.
- Demo seed accounts must not be exposed publicly. Production seeding is blocked, but this does not retroactively remove accounts created by an earlier seed.
- Schema checking verifies table/column presence; it is not a complete check of every constraint, index, permission, backup or dataset assumption. Fresh-database bootstrap and concurrent high-load behavior have not been tested against a separate empty database.

## Supporting documentation

Implementation choices were checked against [Next.js response headers](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers), [Node's test runner](https://nodejs.org/api/test.html), and [Drizzle migration guidance](https://orm.drizzle.team/docs/migrations). Package advisory results come from `npm audit`, and are time-dependent.

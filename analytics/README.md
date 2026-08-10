# ReplyMind funnel control plane MVP

Cloudflare Worker + D1 backend selected because the product is already a static GitHub Pages site with no backend. D1 uses SQLite semantics, scales to zero, and currently has a free tier; no paid resource has been created.

## Implemented

- Typed event contract, strict runtime validation, batch collection, event-ID and provider-event deduplication.
- Stable funnel/step/experiment/variant IDs, step reordering, draft/publish state, and deterministic weighted assignment.
- Filtered KPI endpoint by date, funnel, campaign, source, property, and variant; variant-separated exposure/conversion, revenue/refund and CAC output with freshness warnings. Subscription starts, renewals, and cancellations are captured for retention cohorts; production cohort policy must be selected before presenting a retention percentage.
- Raw-body HMAC verification adapters for Stripe and Paddle, five-minute replay windows, sandbox-compatible event mappings, and idempotent reconciliation.
- Consent-gated browser tracker, protected dashboard/editor, privacy and retention policy, tests and synthetic verification.
- Multi-property schema seeded for ReplyMind and future Dopamodoro.

## Deployment (not yet deployed)

1. `npm install && npm run check`
2. Authenticate Wrangler to the existing intended Cloudflare account; do not create a new paid account/resource blindly.
3. `npx wrangler d1 create replymind-funnel-analytics`, then replace only `database_id` in `wrangler.toml`.
4. `npx wrangler d1 migrations apply replymind-funnel-analytics --remote`
5. Add rotated secrets with `npx wrangler secret put ADMIN_TOKEN`, `PADDLE_WEBHOOK_SECRET`, and/or `STRIPE_WEBHOOK_SECRET`. Never paste secrets into files or terminal logs. Use Foundry Vault-backed environment injection where available.
6. Set `ENVIRONMENT=production`, deploy with `npx wrangler deploy`, verify `/health`, then bind `analytics.replymind.xyz` in the existing DNS account.
7. Configure Paddle/Stripe sandbox destinations first. Run signed fixtures, confirm deduplication and totals, then explicitly approve live mode using newly rotated secrets.
8. Host `public/admin.html` behind Cloudflare Access or another identity-aware proxy; bearer-token protection alone is the MVP fallback.
9. Copy `public/tracker.js` to the website only after a consent UI exists, set the final collector endpoint, and add `data-analytics-event="checkout_start"` to checkout CTAs.

## Optional, not installed

- GrowthBook: useful later for a self-hosted experiment UI, but unnecessary for deterministic assignment at MVP scale and adds hosting/SDK operations. IDs and assignment are compatible with replacing the internal assigner.
- Formbricks: useful for opt-in surveys/feedback, not required for funnel telemetry; self-hosting adds database and maintenance overhead.
- Driver.js: suitable for a lightweight product tour under its permissive open-source license. Shepherd's licensing must be rechecked for the exact package/plan before commercial adoption. Neither belongs in this analytics backend.
- Meta Ads: interface/storage are prepared through `ad_costs`; ingestion is intentionally disabled until a Vault-backed token, ad-account permission, reporting timezone, attribution setting, currency, and approved refresh schedule are configured. Display API and platform-attributed conversions separately; never imply they reconcile exactly.

## API

- `POST /v1/events` public allowlisted collector
- `POST /v1/assign` deterministic assignment
- `GET /v1/metrics` admin bearer token
- `PUT /v1/funnels` admin bearer token
- `POST /v1/webhooks/{paddle,stripe}` verified provider adapters
- `GET /health`

Known blockers: no Cloudflare account/binding, final analytics subdomain, rotated provider webhook secrets, Meta authorization, or production consent decision was supplied. Therefore there is no honest preview/live URL yet.

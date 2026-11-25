# Palm Connect: week 1 security fixes

## Before you deploy (order matters)
1. In the Supabase SQL editor run: `SELECT * FROM public.user_roles WHERE role = 'super_admin';`
   Delete any row you did not create yourself. For your own row run
   `UPDATE public.user_roles SET business_id = NULL WHERE role = 'super_admin' AND user_id = '<your id>';`
   (After the migration a super_admin only counts when business_id is NULL.)
2. Set two function secrets (Supabase > Edge Functions > Secrets), each a long random string:
   - `MPESA_CALLBACK_SECRET` (callback and checkout refuse to work without it)
   - `CRON_SECRET` (router-poller refuses to run without it)
3. Apply both migrations in order: `20261126000000_security_hardening_rls.sql`, then `20261126010000_subscription_billing.sql`, then `20261126020000_guest_logins.sql`, then `20261126030000_plans_limits.sql`.
4. Deploy all edge functions (they share code in `supabase/functions/_shared/`).
5. Schedule router-poller with the header `x-cron-secret: <CRON_SECRET>` (no schedule exists in this repo today).
6. Check the logs of your own M-Pesa sandbox payment end to end before going live.

## Subscription billing (new)
Flow: register, 10-day trial starts automatically with full access, pay last. Payment goes to the Palm Trees paybill.
Set these function secrets (use sandbox values first, then production):
`PALMTREES_MPESA_ENV` (sandbox or production), `PALMTREES_MPESA_CONSUMER_KEY`, `PALMTREES_MPESA_CONSUMER_SECRET`, `PALMTREES_MPESA_PASSKEY`, `PALMTREES_MPESA_SHORTCODE`, optional `PALMTREES_MPESA_TYPE` (`paybill` default, or `till`).
You need a Daraja app with the STK Push (Lipa Na M-Pesa Online) product for the Palm Trees paybill. Production go-live is approved by Safaricom and takes time: start this now.
- New function `subscription-checkout`: owner only, amount taken from the plans table, STK push to Palm Trees, creates the invoice.
- Callback and status check confirm with Safaricom, then `activate_subscription_payment` sets the plan active for 30 days (extends from the current end if renewing early). A payment can only activate once.
- Owners can no longer edit their own subscription (they could extend the trial or mark it active). Plan choice goes through `select_plan`.
- Locked accounts (trial over, or paid period ended more than 3 days ago) cannot create routers, packages, vouchers or hotspot users. This is enforced in the database, not only in the screen.
- Trial length is the `trial_days` row in `platform_settings` (default 10); change it with `UPDATE platform_settings SET value = '10' WHERE key = 'trial_days';`. Card payments were removed from the checkout screen (they were not implemented).

## Guests never pay (new)
Businesses pay Palm Trees; guests get free access with a login the front desk issues.
- Removed: the public "buy Wi-Fi" page, `mpesa-checkout`, `public-packages`, `mpesa-verify`, `mpesa-stk-test`, the venue M-Pesa settings card and the guest Payments page. Delete the removed functions in Supabase too (`supabase functions delete <name>`), otherwise the old public versions stay live.
- New: "Issue guest login" on the Vouchers page (guest name, room, devices 1 to 10, package). Logins are generated with a secure random source (the old code used Math.random and 4-digit usernames), unique per business, one per guest.
- The guest page now only shows remaining time for a login.
- Not done yet: the router does not enforce the device count until the week 2 router agent (hotspot `shared-users`).
- The `mpesa_credentials` table is kept but closed to all clients; no data deleted.

## Plans (new)
Starter, Business, Enterprise. Prices and limits (branches, routers, staff accounts; empty = unlimited) live in the `subscription_plans` table and are shown on the landing, checkout and billing pages from that table. Starting values: Starter 1/1/10, Business 3/5/50, Enterprise unlimited. These are my placeholders, edit them to your real offer. The router limit is enforced in the database. Branch and staff-account limits will be enforced when those modules are built. The old room-count auto-tiering is switched off.

## What changed
- DB: role checks scoped to business; platform super_admin only with NULL business; owners can only assign staff or owner in their own business; users cannot change their own business_id; audit log writes restricted to own business; M-Pesa secrets and router passwords no longer readable from the browser.
- mpesa-callback: secret in URL, only acts on pending payments we created, amount check, confirms with Safaricom STK Query, idempotent, no personal data in logs.
- mpesa-checkout: callback secret, per-phone (3 per 10 min) and per-business limits, no provider error leakage.
- payment-status: validates reference format; if no callback arrives within 25 s, asks Safaricom directly.
- routeros-proxy: login required for every action including `test`; private, loopback, link-local and metadata addresses and non-router ports are blocked.
- router-poller: requires CRON_SECRET; same address guard.
- mpesa-verify, mpesa-stk-test: read secrets server-side after an ownership check.
- Dependencies: `npm audit fix` applied (29 to 22 findings).

## Not done yet
- Secrets are still stored as plain text (encryption at rest is week 2).
- Remaining audit findings are vite, vitest and zod major upgrades; voucher-status is not rate limited; CORS is still open on public functions.
- Test with `supabase/tests/rls_attacks.sh`: replays the attacks against a Postgres with the migrations applied. Before the fixes 8 of the 9 security attacks succeeded (and both billing bypasses); after, none do, and the trial, payment, replay and lockout cases pass.


## Router agent (added)
- Apply a fifth migration after the first four: `20261126040000_router_agent.sql`.
- Deploy the new function `router-agent` (public, `verify_jwt = false`, authenticated by one-time token or agent key). No new secrets are needed.
- Redeploy `router-poller` (it now skips agent routers and marks silent ones offline).
- Details and the hardware test procedure: `docs/ROUTER_PROVISIONING.md`.

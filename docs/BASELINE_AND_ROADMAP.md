# Palm Connect: baseline and roadmap (against the master brief)

Stack found: Vite + React + shadcn/ui frontend; Supabase (Postgres, RLS, Deno edge functions) backend; built with Lovable. Kept as is (no stack change).

## Baseline after Milestone 1
| Check | Result |
| --- | --- |
| Type check | passes |
| Production build | passes |
| Unit tests | 1 placeholder test only |
| Database tests | `supabase/tests/rls_attacks.sh`: 25 cases against a real Postgres, all pass |
| Edge functions | type-check with Deno; not run against Safaricom or a real router |
| Lint | 78 problems, mostly `any` types in original code; not yet cleaned |

## Brief vs code
| Brief requirement | Status |
| --- | --- |
| Multi-tenant isolation | Done and tested (was broken; fixed in Milestone 1) |
| Subscription billing to Palm Trees, trial, lockout | Built server-side and tested in the database; M-Pesa call untested (needs Daraja credentials) |
| No paid guest Wi-Fi | Done: guest payment pages, functions and venue Daraja settings removed; fake revenue and usage numbers removed from the dashboard |
| Guest tickets (name, room, devices, expiry, unique login) | Basic version done. Missing: branch, start time, speeds on the ticket, notes, revoke, QR |
| MikroTik registry and test connection | Partial: works only when the router is reachable from the internet. Needs the router-initiated agent |
| Provisioning wizard and .rsc generation | Partial: script link points to a non-existent file; no backup, preview or rollback |
| Router enforcement (devices, bandwidth, expiry) | Not done. Staff and portal "sync" buttons were simulated |
| Shared guest/staff captive portal | Not done (settings are stored, no portal is served) |
| Three network zones | Not done (only a plan file exists) |
| Branches, departments | Not done (a `properties` table exists for rooms) |
| Roles | 3 of 7 (owner, staff, super admin). Missing: business admin, network admin, branch manager, receptionist |
| Policy engine and precedence | Not done |
| Staff accounts and bandwidth policies | Partial UI over a table; nothing enforced on a router |
| Analytics and monitoring | Placeholders; real data needs the router agent |
| Receipts, expiry reminders, plan limits, annual billing | Not done |
| Encrypted router credentials | Not done (plain text; blocked from browsers only) |
| Backups, monitoring, deploy and rollback docs | Not done |

## Order of work
1. **M1 Stabilise and secure (done).** Tenant isolation, M-Pesa verification, billing, guest logins, fake data removed.
2. **M2 Router agent.** Router calls out every minute (RouterOS scheduler and fetch): health, pending logins, session report. Creates hotspot users with device limit and expiry; revokes. Everything below depends on it. Needs one real router.
3. **M3 Organisation model.** Branches, departments, the four extra roles with server-side checks, plan limits.
4. **M4 Zones and provisioning.** Guest, staff and private zones with VLAN and firewall rules; wizard with preview, backup, rollback.
5. **M5 Shared captive portal.** Guest or staff choice, separate authentication, branding, served from the router with a hosted login page.
6. **M6 Staff module.** Accounts, schedules, bandwidth policies with branch, department, individual precedence, enforced on the router.
7. **M7 Billing completion.** Receipts, reminders, failed payment handling, upgrade and downgrade, annual plans, reconciliation.
8. **M8 Analytics and production.** Real analytics, encrypted credentials, backups, monitoring, deploy and rollback runbook.

## Decisions (resolved)
1. Trial length: 10 days (`platform_settings.trial_days`).
2. Plans: Starter, Business, Enterprise with limits (migration `20261126030000_plans_limits.sql`). Limit values are placeholders to confirm.
3. Test router: MikroTik RB2011UiAS-2HnD, RouterOS 6.49.23, 128 MB RAM.

## What the test router means
- RouterOS 6 has no REST API (REST needs v7.1 or later). The existing "test connection", session and disconnect code uses REST, so **it will not work on this router**. Many customer routers will be v6, so the router agent (router calls out; scheduler plus fetch) is the method for v6 and v7 alike, and the REST path becomes optional for v7 only.
- RouterOS 6 limits to design around: script variables and file reads are limited to about 4 KB, so sync responses must be small pages; HTTPS fetch needs certificate handling decided up front.
- The router shows a security notice (recommended version is 7.x). Upgrading to v7 is the customer's choice; we support both and will warn when a router is on an old release.
- Next step needs hands on this router: confirm hotspot is available, then run the agent script in a test session.

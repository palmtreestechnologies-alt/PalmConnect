# One-command router provisioning (Phase A)

The owner clicks **Connect a MikroTik**, enters a router name, the guest port (e.g. `ether5`) and a guest network, and pastes one command into the router's terminal:

```
/tool fetch url="https://<project>.supabase.co/functions/v1/router-agent/setup/<token>" check-certificate=no dst-path=palm.rsc; :delay 2s; /import palm.rsc
```

## What happens
1. The dashboard creates the router row (plan router limit enforced in the database) and a **one-time token** (256-bit, 60 minutes, stored only as a hash).
2. The router downloads `palm.rsc`. The token is consumed, so the command cannot be reused, and a long-lived **agent key** is issued (stored only as a hash; it never appears in a URL, only in an HTTP header).
3. The script checks the port exists and no other hotspot is on it, saves `palm-pre-setup.backup` and `palm-pre-setup.rsc`, then configures: address, DHCP pool and server, DNS, hotspot profile and server on that port, masquerade for the guest network, a `palm-sync` script and a 1-minute scheduler. Nothing outside objects named/commented `palm` is removed.
4. Every minute the router calls `/sync` with its health (CPU, memory, uptime, active users, model, version). The server answers with vouchers changed since the router's last confirmed position. The router creates, updates or removes hotspot users with `shared-users` = the guest's device limit and the package's rate limit and data cap. Expired and revoked logins are removed at the next sync (within about a minute). The dashboard shows Online when the router calls in, and Offline after 3 minutes of silence.

Works behind NAT on RouterOS 6 and 7: the router always calls out; nothing connects in.

## Security properties (tested)
- Token: single use, expiry enforced, unreadable from browsers, only the owner of the router's business can mint one (`supabase/tests/router_agent.sh`).
- Agent key: wrong key or another router's key is refused; browsers cannot read the hashes.
- Anything sent to the router (usernames, passwords, interface names, CIDR, router name) is validated and hex-escaped; injection-shaped values never reach a script (`supabase/tests/router_agent.sh`, `supabase/tests/routerscript_test.ts`).
- Cursor cannot be pushed past real data; responses are capped at 3500 bytes because RouterOS 6 reads about 4 KB.

## Known limits, stated plainly
- **Not yet run on real hardware.** The SQL and the script generator are tested; the RouterOS commands have not been executed on a router. Test first on the reset RB2011 (below).
- **TLS:** RouterOS 6 has no CA store, so the fetch uses `check-certificate=no`. Mitigations: the setup token is single-use and short-lived, and the sync protocol is data-only (the router never executes downloaded code after setup). Fix later with RouterOS 7.19+ or a pinned certificate on your own domain.
- **No live control or true usage accounting yet.** Device limits, speed and data caps are enforced by the router locally, but used-data figures and instant disconnects need the Phase B tunnel and RADIUS.
- No firewall hardening, NTP or monitoring changes are made yet. Deliberately minimal for a first hardware test.

## Test on the RB2011 (after you back up and reset it)
1. Reset it and give it internet on `ether1` (modem/ISP). Choose **All ports except ether1** in the dialog: the script builds a bridge `palm-bridge` from every other port and the Wi-Fi radio, and runs the hotspot on it. Ports join the bridge last, so a brief drop of your WinBox session at the end is expected; setup is already complete by then. The Wi-Fi radio is added to the bridge but not configured; the dialog shows the one command to switch it on. In single-port mode, never use the internet port or the port you manage from.
2. Deploy the migrations and the `router-agent` function (see `SECURITY_FIXES.md`).
3. In the dashboard: Connect a MikroTik, name `Test`, port `ether4`, paste the command in a WinBox terminal.
4. Expected: "setup complete" in the terminal; router shows Online in the dashboard within a minute.
5. Issue a guest login (Vouchers). Within a minute `/ip hotspot user print` shows it. Connect a phone to `ether4`, log in; a second device with a 1-device limit must be refused.
6. Send me any error text from the terminal; I will fix the script.

## Phase B (your decision, adds cost)
An SSTP tunnel plus RADIUS on the Hostinger VPS (the approach Centipid uses) adds live disconnects, accurate usage and remote management, but needs a server with a public IP and ongoing maintenance. Recommended after Phase A works on hardware.

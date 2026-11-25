# Phase 1 — Network Zone Foundation

## Outcome
Add a business-scoped Network Zones page for independently managing Guest, Staff, and Private networks, while preserving all existing pages, data, routes, and integrations.

## Implementation
- Add an additive network-zone data model linked to the existing business and optionally to a property. Store each zone's type, label, SSID, VLAN/subnet details, enabled state, isolation setting, and basic access/bandwidth limits.
- Apply tenant-scoped row access using the project's existing business ownership helpers, explicit Data API grants, and RLS. Limit deletion to business owners or platform administrators.
- Build a responsive management page in the Networking module with real loading, empty, save, and error states; allow creating, editing, enabling/disabling, and removing zones.
- Add the page to the existing Networking navigation and route. Reuse the current dashboard layout, shadcn controls, and semantic brand tokens.
- Explain that VLAN/subnet values are planned settings and are not yet pushed to routers. Do not display simulated measurements or imply that any hardware was configured.

## Validation
- Verify zone type and VLAN input rules with focused tests.
- Check the preview and current build diagnostics after implementation; preserve the existing MikroTik, guest, staff, property, and billing flows.

## Deferred by design
Router provisioning changes, guest tickets, staff/department workflows, branch permissions, and live monitoring remain in their later phases. Hospital guest-network isolation will be clearly called out; Palm Connect is not an enterprise cybersecurity replacement.
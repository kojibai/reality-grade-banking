# Finish one-time domain-provider connections

The user explicitly authorizes completing all provider connections, including Namecheap, and automatic native domain setup in the same conversation after one-time connection. Continue inline without another design approval; the required experience is already settled in this conversation.

## Governing law and preflight
- Primitive affected: Receiz ID continuity and owner-approved native custom-domain presentation. Provider grants are external DNS permission beneath identity; they are not new Receiz identity or proof authority.
- Source of truth: existing proof-admitted owner UID, native saved hostname/records and actual provider grant/results. Existing fixed native relay and domain verification remain primary.
- Paths/baseline: Bank 39ee3ab; server/business-dns-connect.ts currently requires per-owner deployment rows and refuses every API-key type. server/business-dns-route.ts consequently returns manual for Namecheap. Existing client retains operation/hostname, exact native verification and receipts.
- Stronger/weaker truth risk: identity-risk/security-risk if a provider grant can cross owner; unknown writes must never be called successful or retried automatically. No settlement actions or public profile publication.
- First-paint risk: none permitted; all connection logic server-side or lazy on explicit chat action. Existing entry, payment and visible identity shell are unchanged.
- External convention: provider OAuth/MCP/API mechanics only. Provider documentation now establishes an official Namecheap OAuth MCP and Vercel Connect per-user API-key connectors; prior limits based on the older XML API do not apply to that path.
- Contracts: same proof-admitted subject, genuine per-user grants only, automatic owned-zone discovery without operator rows, strict DNS-only calls, no destructive overwrites/force/delete/purchases, readback, unknown retention, hostname binding, same-chat resume, manual only on unsupported/declined/unavailable operations.
- Exact uncertainty: actual Vercel connector provisioning and customer authorization must be verified separately. No customer credential or domain grant is assumed supplied.

## Approach
Use the existing Vercel Connect broker for both OAuth-user and API-key-user grants. A discovered alternative was a new encrypted credential database plus IP-pinned Namecheap XML proxy; it introduces unnecessary custody and whole-zone writes. Official Namecheap OAuth MCP supports incremental records, so use it directly and retain the old adapter only for existing explicit hosts. Never accept app/shared API-key connectors. The managed per-user key screen receives provider credentials outside chat for providers that require them, once; subsequent operations use that same user's stored grant. Namecheap uses provider sign-in.

## Implementation
Configure a project-owned connector catalog, not a per-customer environment map. Derive subject UID only after native proof admission. Resolve the longest applicable owned DNS zone and required provider coordinates from actual connected account data. For complex cloud credentials use the provider's actual signing/token mechanics server-side; no secrets in models, public errors, logs or URLs.

Namecheap's fixed MCP endpoint permits only tools/list, domains_list, dns_records_get and dns_records_save. Porkbun additionally uses its read-only ping tool to inspect the actual grant’s DNS scope before admitting writes. Do not expose purchase, contact, nameserver changes, deletion, force, or arbitrary execution tools. Preserve omitted/managed records as conflict evidence. Bound complete pagination and verify readback. An unavailable write capability offers reconnection for write access rather than pretending readiness.

The existing Connect action opens real broker consent, then resumes the retained hostname and native tools. Keep natural conversation and inline progress/results. Resolve record conflicts through the conversation; no destructive default. Propagation checking can repeat reads but never writes; unknown writes remain held. Core entry/payment behavior stays frozen.

## Completion
Unit/integration tests before code, one fresh final review, full Bank suite/build/typecheck, mobile/desktop browser evidence. Provision actual reversible project connectors using its configured same-team credential, with no customer grants, DNS writes or charges during verification. Commit only owned changes, preserving all other agents' work.

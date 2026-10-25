# DNS Provider Automation Implementation Plan

> Use superpowers:executing-plans inline, test-first, with one fresh final review.

**Goal:** Prepare real major-provider DNS adapters behind existing secure owner-bound connections, retaining manual fallback only for declined/unavailable/unsupported work.
**Architecture:** Reuse BusinessDnsConnection/Plan, existing native verification and the qualified Cloudflare adapter. Shared create-only engine with concrete provider drivers and private registry. No UI, route mounting, account-entry, storage, permission or dependency change.
**Tech Stack:** Existing TypeScript/ESM, Vitest and native Node request/SDK ports.
**Spec:** docs/superpowers/specs/2026-10-25-dns-provider-automation-design.md

## Global constraints
- No production domain/DNS mutation or credentials; public docs and in-memory API fixtures only.
- Actual owner/native records remain fixed; secrets and grants stay in trusted host connections.
- No destructive zone replacement, record deletion, nameserver mutation, write retry or false readiness. Namecheap alone uses the explicitly granted complete observed host-list save in the spec.
- No shared UI imports or calendar/contacts edits. Preserve other agents’ dirty Vault/output files.

## Review focus
- Missing/contradictory pagination and malicious next links must prevent writes.
- Existing IPv6, aliases, delegation, MX/TXT and provider-generated records cannot be silently replaced or bypassed.
- Record-set create semantics, quoted TXT segments and relative/FQDN names must match actual providers.
- A lost response after any possible write must retain unknown status and accepted references without retry.
- Private registry and transport cannot accept owner/zone/endpoints/grants from model JSON; disposal stops further work.

### Task 1: Create-only engine
- [x] Write meaningful failing native-plan, alternative, conflict, readback, read-only/disposal and no-retry tests.
- [x] Implement shared engine and bounded provider-response/name/TXT utilities.
- [x] Focused tests and typecheck pass.

### Task 2: Major provider drivers
- [x] Verify exact official API syntax and record/list semantics.
- [x] Write and observe failing fixtures for GoDaddy/Vercel/DigitalOcean/DNSimple/Porkbun, Google/Azure and Route 53.
- [x] Implement exact create-only drivers, complete pagination and SDK operation mapping.
- [x] Add private registry selection, unknown-provider/declined connection fallback and integration tests through native domain tools.

### Task 3: Qualification and commit
- [x] Fresh review; important fixes RED→GREEN, one fix pass.
- [x] Final production build, full suite/typecheck and dormant import checks.
- [x] Apply with baseline collision checks and commit explicit owned paths only.
- [x] Record exact supported providers, limitations and deferred secure connection/chat activation.

## Execution ledger
- Pre-flight: engine produces the existing BusinessDnsConnection consumed by business-dns-tools. Provider drivers supply complete records/create operations; registry supplies only trusted connected-provider metadata. Cloudflare keeps its existing implementation.
- Ruling: Reuse private archive isolation because this shared checkout contains other-agent work and the current task already approved that workflow. No managed worktree or branch switching is introduced.
- Ruling: Keep actual provider sign-in/grant/chat binding deferred under the user’s earlier tools-now decision; adapters map real API operations but do not invent customer credentials or claim live qualification.

- User steering: Namecheap is explicitly required, and one-time connection should be a single Connect button followed by provider approval. Add Namecheap full-snapshot preservation and actual host-issued connection action/resume contract; keep chat UI deferred.
- Ruling: Namecheap is a documented whole-zone save exception. Require the trusted connection’s actual full-zone permission, preserve all supported records/email mode, reread before save and verify the full result. External concurrent edits remain a provider-side limitation because setHosts has no conditional version. Unknown record metadata or email mode returns fallback rather than guessing.

- Task 1: 11 shared engine contracts observed RED→GREEN.
- Task 2: exact HTTP/SDK/provider fixtures, Namecheap snapshot/email preservation, Connect/resume flow and callback reentry observed RED→GREEN. Successful and malicious pagination, least-action authorization, denied/unknown outcomes and identity disposal covered.

## Final review fix pass
- Final: fixed cross-factory Namecheap overlap with a shared zone queue — separate adapters preserve both requests in RED→GREEN. Live secure-host cross-instance serialization remains an explicit activation prerequisite; the module queue is process-local coordination, not a new authority or storage layer.
- Final: fixed ancestor NS delegation and exact already-present TXT set handling — both regressions RED→GREEN without rewriting unrelated values.
- Final: fixed provider-relative/FQDN ambiguity — explicit provider name modes and four relative suffix-collision plus foreign absolute regressions RED→GREEN.
- Final: fixed retained unknown operation visibility before connection fallback — duplicate/declined callbacks retain the real operation result; RED→GREEN.
- Final: fixed contradictory GoDaddy final-page continuation indicators — refusal before write, RED→GREEN.
- Final: minor (deferred): a Namecheap snapshot change detected by the driver's last reread occurs before setHosts but is conservatively reported unknown because the common engine has already entered its create operation. No write/retry/rollback follows; source preservation is intact.

## Final qualification
- Production build, complete Bank suite (517 files / 3,314 tests), and TypeScript pass after the final review fixes. Focused DNS suite: 86 tests.
- No new provider/flow code enters compiled app chunks. No visible page, account entry, message surface, native identity, contacts/calendar or dependency manifest was changed.
- All fifteen owned paths are new; existing-head and collision guards protect application of the tested snapshot. Four foreign tracked Vault files and unrelated output stay untouched. No customer account, domain, DNS, provider credential, charge or production service was used or changed.
- Ten prepared adapters: Cloudflare (existing), GoDaddy, Vercel, DigitalOcean, DNSimple, Porkbun, Route 53, Google Cloud DNS, Azure DNS and Namecheap. Actual provider connections, configured grants, cross-instance Namecheap serialization and message-button/callback wiring require activation qualification.

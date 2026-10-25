# Business Chat Tools Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for inline implementation. Steps use checkbox syntax.

**Goal:** Prepare tested native Business setup tools for later chat/calendar/contact integration.
**Architecture:** Bounded editorial tool inputs invoke existing owner configuration and creation operations through an unmounted same-identity relay. Existing Receiz proof admission, plan and native results remain authoritative.
**Tech Stack:** Existing TypeScript/ESM and Vitest; no dependency or new visible runtime.
**Spec:** docs/superpowers/specs/2026-10-25-business-chat-tools-design.md

## Global constraints
- No MessagesPanel, messages.css, account entry, native identity, transport allowlist, public route or calendar/contact edits.
- No new authority, token, session cookie on Bank, verifier, storage or automatic metered request.
- No production mutation, outbound message, domain/DNS change, push or deployment.
- Preserve unrelated policy, owned identity, native operation ID/expiry and ambiguous results. No automatic write retry.
- New tool catalogue is dormant; actual grants/owner approvals must be composed before later chat activation.

## Review focus
- Malformed/unknown argument and operation metadata must fail before a native write.
- Concurrent identity disposal must prevent a stale private result from returning.
- Wrong owner/session, cross-origin requests, redirects and ambient credentials must never reach configuration.
- Partial agent edits must preserve all unrelated native policy and capability state.
- Lost writes remain unknown; definite native refusals remain distinct; domain and creator readiness must reflect actual native states.

### Task 1: Tool contract
Files: create src/receiz/business-setup.ts and tests/business-setup.test.ts.
- [x] Write and observe failing contracts for the seven descriptors, strict argument parsing, trusted operation metadata, owner-fixed execution and post-await disposal.
- [x] Implement bounded argument normalization and native-result invocation. Tools do no work until explicitly called.
- [x] Run focused tests and typecheck.

### Task 2: Native relay
Files: create server/business-setup.ts and tests/business-setup-relay.test.ts.
- [x] Observe failing native-boundary contracts for proof continuation, owner/plan checks, fixed paths, atomic native partial configuration, native creation metadata/results, unknown outcome and no auto retry.
- [x] Implement the private unmounted relay and narrow native-result projections.
- [x] Test all tool paths and refusal/recovery boundaries. Preserve DNS/usage states and existing configuration.

### Task 3: Qualification and handoff
Files: update this plan with evidence and integration notes.
- [x] Obtain fresh review of owned changes and address concrete important findings with failing regressions.
- [x] Run complete isolated Bank tests, typecheck and production build sequentially; verify no new module enters Bank/shared/public runtime or route registrations.
- [x] Apply and commit only the owned files to the original checkout after checking for collisions. Leave foreign Vault/output work unchanged.
- [x] Document future chat hook, native consent/operation retention, contacts/calendar ownership and remaining deployed qualification. No UI integration in this stage.

### Task 4: Full profile and Original tools (user-approved expansion)
- [x] Reuse existing owner profile/image actions; add actual native privacy/scheduler boolean support.
- [x] Separate private offline source production from explicit connected publication.
- [x] Verify enclosing Original first, then exact selected intent/metadata/file bytes; retain source vs Showcase identity.
- [x] Observe failures and passes for private-only sealing, mismatched intent, owner/disposal and publication recovery.

### Task 5: Provider-adaptive DNS
- [x] Prepare typed tool descriptions and manual steps from actual native records for any provider.
- [x] Treat CNAME and A as alternatives, not simultaneous writes.
- [x] Prepare Cloudflare adapter behind a real secure connection port; preserve conflicting existing services, actual record references and unknown writes.
- [x] Test unsupported/declined/read-only/manual paths, changed hostname, route warnings, native records, conflicts, incomplete provider lists and no retries.

### Native prerequisite ledger
- Ruling: Extend the existing native owner setter with strict partial patches rather than sending a client read/merge snapshot. A whole-state replay could undo a concurrent permission revocation. The cost is that the native counterpart must be deployed and qualified before tool activation.
- Ruling: Prepare one concrete securely connected DNS adapter plus universal manual instructions rather than claiming automation for unimplemented providers. The cost is manual DNS for those providers until a tested connector is added; no user is blocked from setup.
- Final: fixed nonstring memory enum, operation recovery metadata and malformed native acknowledgements — focused RED→GREEN.
- Final: fixed nested policy normalization and unknown native write release — native helper + actual route behavior regressions RED→GREEN; PostgreSQL conditional-write behavior also qualified.
- Task evidence logs are retained under /private/tmp/bankeiz-business-* and /private/tmp/receiz-business-* during qualification. No production calls were made.

- Final: fixed conflicting IPv4/IPv6 website routes and missing publication acknowledgements — four regressions observed RED then GREEN.
- Final: minor (deferred): A valid existing A alternative on a subdomain may receive manual instructions when this initial adapter prefers CNAME; no existing service is overwritten.
- Final: fixed inconsistent provider record counts — declared-but-omitted records or missing completeness metadata fail before any mutation; two regressions observed RED then GREEN.

## Final qualification
- Bank production build, 511 test files / 3,243 tests, and TypeScript pass in the isolated final source. Focused tool/profile suite: 77 tests.
- Native TypeScript passes with an 8 GiB compiler heap; focused lint passes. Native configuration/usage/starter contracts: 31 tests. Temporary local PostgreSQL tests: 2. Frozen account entry: 37 tests. Visual-evidence, primitive-binding and repo-only-reasoning contracts pass.
- Fresh reviews found and covered every important finding in a single fix pass per review; the one manual DNS convenience case remains documented above.
- Compiled Bank app chunks contain none of the dormant tool implementations. No UI, calendar/contact, routing, identity entry or provider connection was activated, and no production write was attempted.
- Owned-path manifests prevent overwriting concurrent work. Final commits are recorded in the two repositories; unrelated dirty files remain outside those commits.

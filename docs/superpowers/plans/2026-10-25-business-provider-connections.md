# Business Provider Connections Implementation Plan

> Execute inline with executing-plans and test-driven-development; one fresh final reviewer at completion.

**Goal:** One-time provider connection, including Namecheap sign-in, followed by complete native domain setup in the same chat.
**Architecture:** Existing Receiz ID/native owner admission + Vercel Connect user grants + discovered owned-zone coordinates + existing DNS engines/verification.
**Spec:** docs/superpowers/specs/2026-10-25-business-provider-connections-design.md

## Tasks
- [x] 1. Real provider catalog/provisioning and per-user key/OAuth authorization; no shared key or per-owner env prerequisite.
- [x] 2. DNS-only Namecheap MCP and automatic provider/cloud discovery/authentication; real readback/unknown handling.
- [x] 3. Same-chat automatic resume, provider/hostname continuity, native verification/propagation and clear inline recovery.
- [x] 4. Fresh review; full tests/build/typecheck and browser evidence; actual connector inspection; explicit owned commits.

## Review focus
- Foreign owner, shared app key or selector from client/model must never choose another credential.
- Nested zones, omitted records, complete pagination and missing write scope must never be guessed.
- Interrupted writes must not be retried; changed hostname must refuse prior operation.
- Existing email/site/delegation must remain intact; no force, delete, purchases, contacts or nameserver mutations.
- Reload/duplicate provider callback and repeated grants must preserve conversation/operation.

## Ledger
- Ruling: the user's explicit request settles the experience and authorizes implementation without another design approval. Work isolated at /private/tmp/bankeiz-dns-complete-i9dv2z1x; other-agent verifier files preserved.
- Discovery: official Namecheap MCP supports OAuth sign-in and bounded incremental DNS writes; live discovery issuer now https://www.namecheap.com, scopes include read/write. Vercel API schema supports api-key subjectType=user with user-supplied keys stored by the broker. Do not preserve prior blanket API-key rejection.

- Actual configuration: all ten project connectors created and independently read back with development/preview/production attachment. No customer grants, DNS writes or deployment performed. Namecheap/Porkbun official sign-in; eight per-user secure-key grants. Runtime user subjects use project OIDC.
- Review repairs: DNSimple Accounts response, Vercel team discovery after personal403, Porkbun real DNS scope, original-host DNS receipts and hidden/inactive OAuth completion. All have behavioral regressions, witnessed failing before fixes.
- User steering implemented: truthful immediate typing and tool progress; chat stays usable during DNS propagation, and native read-only monitoring continues while the owner uses the rest of the account. Existing profile remains usable.
- Verification: 531 Bank files /3369 tests passed; native account-entry freeze37 passed; visual-evidence, primitive-binding and repo-only reasoning gates passed. TypeScript passed. Production build passed, including TypeScript, lazy import/conformance, offline shell, licensing, matching source archive and public-page checks. The final commit contains only the explicit forty owned paths; shared verifier files remain excluded.
- Evidence: synthetic real-UI desktop/mobile working/live captures; no customer credentials, models, provider grants or DNS changes in the visual fixture. Full suite retains baseline duplicate-art-case warning and Happy DOM blocked-script/iframe diagnostics; zero failing tests.

- Final browser evidence: a new mobile tab has no warning/error logs. The same conversation accepted a second profile request while the DNS receipt still showed Checking delivery. Screenshots confirm the added working bubble, existing profile/chat usability and final verified result. Earlier mobile HMR navigation produced observer diagnostics; the fresh final tab is clean.

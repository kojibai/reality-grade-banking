# Short receipt implementation plan

Spec: docs/superpowers/specs/2026-10-24-short-receipts-design.md

User approved finishing short receipts, Merchant Counter, then offline financial execution, on main with separate commits. Preserve other developers' dirty files.

## Global constraints

No financial-rule, authority, sign-in, startup, Ledger data-loading or CSS changes. No automatic publication. Reuse existing shared-object delivery; no database migration. Keep complete curated evidence and legacy links. Do not test by publishing private or real account records.

### Task 1: Immutable public display delivery

Add a bounded content-addressed JSON delivery handler using existing shared-object transport; route tests exercise exact bytes, immutable repeats, corruption, rate limits and body bounds. It has no financial admission or account effects.

Verification: Receiz node test for the new module/route plus scoped lint/typecheck. Expected: all pass; no storage or financial writes outside test transport.

### Task 2: Full receipts and short route

Extract full safe receipt construction from selected records; preserve complete funding graphs/cohorts. Add publish/read client, successful-save retention and coalescing. Extend preview/API routing to short paths and safe full initial data, preserving legacy packet links and HEAD behavior.

Verification: receipt snapshot, ledger receipt, packet, preview and sharing tests. Expected: complete graph round trips, under-110-character links, wrong-hash rejection and one server read/no duplicate browser fetch.

### Task 3: Explicit sharing panel

Wire Ledger, public Ledger and receipt actions to a compact panel. Only an explicit action prepares the short URL. Ready buttons invoke native sharing directly; downloadable original and View in Ledger work independently. Preserve existing copy feedback.

Verification: component tests and browser fixture; existing Ledger interaction/receipt tests. Expected: no publish before action, no private metadata, instant local record opening, complete evidence and tap-safe native Share.

### Task 4: Verify and commit

Run complete Bank tests, types and build; affected Receiz tests/types. Fresh whole-change review, fix material findings with regression tests, then separate main commits. User pushes. Report exact implementation/limits, not a claim of deployed status.

## Review Focus

Private metadata leakage, identity bootstrap, immutable replacement, body/decompression bounds, snapshot authenticity versus financial authority, duplicated first-load fetch, omitted funding cohorts, native iOS activation, offline failures, legacy route compatibility and other developers' changes.

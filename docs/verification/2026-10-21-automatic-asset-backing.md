# Automatic asset backing — local qualification

Date: 2026-10-21. This record covers local implementation checks, not deployment
or live financial qualification. SDK, MCP and AI Skills remain at v129.

## Contract and economics

The automatic request carries one amount and the closed
`reserve-first-then-settlement` rule. Positive ordered funding components bind
the review, exact debit, resulting asset, receipt, position certificate and
account-proof projection. Historical single-rail encodings remain intact.

The native arithmetic tests cover Reserve-only, exact-Reserve, Settlement-only
and mixed allocation, full supply, exact positive movements, insufficient combined
funds, signed-64-bit overflow, denomination refusal and unchanged original backing.
Redemption returns each original component; a changed quote changes Settlement's
dollar projection without changing its Phi. Ownership changes retain components.

The real native runtime tests cover historical and automatic Reserve-funded
preparation, no debit at review, one accepted issuance, canonical financial
receipt, cold read-only recovery, duplicate execution, position certificates,
account-proof component projection and current-source checks. Changed quotes and
global heads reject the old review. The pending-writer regression reopens the
same accepted statement after an interrupted marker and preserves one result.
Revoked automatic issuance is checked against the existing identity boundary.

Mixed inputs in the arithmetic/terms/history tests are explicit detached test
inputs. The runtime fixture supplies admitted Reserve ingress; it does not admit
unencumbered Settlement ingress. These checks cannot establish hosted mixed
funding. A real complete Settlement source remains a deployment qualification.

## Account history and exact approval

A mixed native asset statement has two rail rows and one accepted source digest.
The public account projection coalesces those rows into one event with both
exact deltas. It rejects unrelated duplicate digests and inconsistent coordinates.
Closed readers accept only conserved, same-direction funded/redemption deltas.

Fresh review found that the new nested funding-component list was mutable beneath
a shallowly frozen public review. The regression reproduced that mutation before
the fix. The returned request and terms now freeze recursively, including the
definition, component array and each component, so displayed approval facts cannot
diverge from the separately retained signed intent. Existing consent, object
binding, nonce, unknown checkpoint and recovery mechanisms remain unchanged.

## Interface and Explore

The backed form has one backing amount and no Reserve/Settlement selector. Its
review shows the total with the signed split under Transaction proof. Browser
checks at 390px and 1440px exercised preparation, exact split, disabled approval
before consent, edit preservation, no overflow and the unchanged Seal a moment
path. The fixture made one prepare call and no live API or financial execution.

Explore now exposes Buy ownership / Take cash through the existing public trade
host. Rendered tests retain the object and URL, reuse known holdings and verify
no redundant fetch, deposit, account creation or execution before approval.
Existing percentage presets remain conditional on owned shares.

## Storage and delivery

The native writer, receipt and certificate paths already retain closed statements
as exact JSON/file sources. The additive component variant uses those paths and
the existing pending/recovery writer. No SQL schema migration is required for
this change. The unrelated Supabase temporary file was left untouched.

Receiz must receive the compatible native asset contract/runtime before Bank's
automatic caller is activated. No code here deploys, pushes, charges a card,
creates a live asset or moves live funds.

The expanded media composer and automatic public backed-content binding remain
a separate [proposed design](../superpowers/specs/2026-10-21-asset-composer-and-publication-design.md).
Current plain backed issuance is not represented as a completed rich Showcase
publication. Private execution receipts are not published.

## Recorded checks

- Bank: `npm test -- --maxWorkers=2` — 361 files, 2,140 tests passed after the review fix.
- Bank: `npm run typecheck` and `npm run build` passed, including source archive,
  licensing, public-page, conformance and offline-cache verification.
- Browser: 390px and 1440px synthetic creation/review/edit checks passed; no live
  APIs, overflow, page errors or financial execution.
- Receiz: `pnpm test:crystal-native-bank-assets-closures` — 41 tests passed.
- Receiz: final runtime/history tests — 3 passed; pending/revoked-key tests — 2 passed.
- Receiz: `pnpm test:bank-native-wallet` — 43 passed, one isolated PostgreSQL test
  failed because sandboxed `initdb` could not create a shared-memory segment.
  That exact `bankConnectedNoteCompatibility.test.ts` PostgreSQL case passed
  outside the sandbox, using a temporary local database; no product code changed.
- Fresh independent review identified the nested approval mutation described
  above; the reproducing regression failed first, then passed with the fix.

Receiz implementation commits: `a515b001d`, `c18378b23`, `e76aeca77`.
Bank contract commit: `330b556`; final UI/documentation delivery follows it.

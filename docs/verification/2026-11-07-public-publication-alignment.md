# Original publication and public display alignment — 7 November 2026

## Required behavior

The user confirmed that sealing, local PBI signing, asset access, shares and
capitalization work. The remaining repair is automatic publication into every
public Bankeiz surface, plus useful measured progress. A cold entry must reuse
the complete prepared public family immediately. It must not wait for Source
freshness, global reconstruction, a second catalog/document read or a partial
collection. Existing identities, proof admission and financial rules stay intact.

## Exact live evidence

Original: **The Money Is Ready. The Banks Can Catch Up.**

- Source: `a6a32bfb27ad40a69d5eb481be4df34cf90a92a428e88bbe2c1b52a3312a05fc`.
- Original ID: `imported-b6e0a5ed5144996d77f458ae6762a8fbcdf478894274782e82248a66a8e1e1c4`.
- PBI receipt: `2ee6b575eda9fbb7b883b11cba53ca56376e7bf5800e2ebab8f1c7ee03a937a7`.

The anonymous Bank profile API returned 613 Originals and this exact signed
Original. The anonymous Receiz profile HTML also contained it, its signature,
and the accepted Showcase head
`a6c8c15c9c4424556f33a0ffa4fc6d9411a0c676e5f7994b9ca6601770c3a280`.
The Bank asset HTML contained the same signed Original, and its quote response
contained an actual generic share inventory. These checks establish those
particular data/asset responses, not the rendered public collections.

A fresh anonymous Chrome context at 390px, with service workers blocked, opened
`https://bankeiz.com/bjklock/`. It rendered **612 displayed originals**, omitted
the exact title after 65 seconds, and made no public Market/profile API request.
There were no browser errors. Evidence:
`/private/tmp/bankeiz-live-public-profile.png`.

The phone's screenshots show a saved signature and
`PROFILE_SHOWCASE_PUBLIC_DELIVERY_PENDING`. The deployed Receiz cold replay
branch returns this code with `sourceStatus: accepted` while derivative delivery
is pending. It does not mean that the signature was lost.

The live Receiz global membership route repeatedly hit its 60-second runtime
limit. A read through Bank returned 503 after 60,319ms. The direct quote read
succeeded after 36,157ms. These are observed requests, not performance guarantees.

## Proven local causes and corrections

- Bank only refreshed discovery after a `published` reply. Pending replies can
  follow accepted Source. The adapter now also reconciles those pending replies
  through the existing public readers; it does not manufacture success.
- A delayed signing call could overwrite an earlier exact public confirmation
  with its older pending result. The selected Source confirmation and exact
  signature observation now survive that return.
- Publication refresh previously fetched membership alone. Membership and actual
  quote/share operands now settle independently into the shared held catalog.
  Fresh compatible inventory survives prior retained data and older requests.
- Progress now has a visible bar and actual attempt timing. Sealing estimates
  use real ratio samples. Delivery ranges require three recent confirmed
  attempts of the same phase and similar size; there is no seeded ETA or timer
  that simulates completion. Unknown timing remains explicitly being measured.

## Server candidates and remaining integration

Two isolated Receiz candidates are qualified, not yet deployed:

- `/private/tmp/receiz-ready-handoff-order-with-tests.patch`: installed Next
  after-response scheduling reproduced HTML repair before saved collection
  preparation completed. The correction joins that existing preparation.
- `/private/tmp/native-market-index-candidate/candidate.patch`: the global native
  membership scan queried Source headers for 2,495 unrelated empty owners in a
  real SDK fixture. Existing immutable owner-directory indexing eliminates those
  polls while preserving actual Source, privacy, name and inventory checks.

Neither candidate alone reconnects the native accepted publication to the
globally selected Bank prepared family. That producer adapter and Bank browser
profile's saved-family selection remain the end-to-end integration boundary.
Do not equate public API membership or owner-local state with that completed
anonymous display transition.

## Verification status

Focused status, signature, actual source timing and adapter tests pass locally;
the frozen account-entry gate passed all 63 tests. Shared quote/adoption and
held-navigation suites also pass in focused runs.

The full working-tree suite was run while agents were still adding/regressing
tests: 6,279 passed, 23 failed, 11 skipped, with two unhandled errors. It includes
concurrent in-progress failures and other dirty Ledger/PWA work. It is not a
green release result. Requalify the final scoped changes and identify any
remaining failures explicitly before releasing.

Local changes, candidate patches, a passing test and a production deployment
are separate evidence boundaries. No deployment of this task is established here.

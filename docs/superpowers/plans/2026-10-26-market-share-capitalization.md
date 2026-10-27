# Market share capitalization implementation

Goal: expose exact supported share supply and available quantity with inspectable math and one capitalization contribution per asset.

Spec: ../specs/2026-10-26-market-share-capitalization.md

- [x] Bind a public typed inventory projection to existing native and generic sources. Use a service-only, read-only aggregate for consistent generic quantities; no financial writers or authority changes.
- [x] Add Bank parsing, exact microshare/cents calculations and canonical identity deduplication. Preserve missing coverage and native source precedence.
- [x] Add compact asset share details and a local Value / Market cap toggle, using only supported quantity history.
- [x] Connect global capitalization to one share-cap contribution per canonical asset and preserve sports-copy accounting and known source coverage.
- [x] Run focused source/math/DOM tests sequentially with one worker, typecheck, build and mobile/desktop browser verification. Commit only owned files on the existing main checkouts.

Final accounting instruction: generic Market cap = (available to buy + outstanding shares) × current unit value. Available capacity remains distinct from issued shares. Native open offers already partition issued supply and are never added a second time. Generic historical cap uses recorded quote price, capacity and pre-transaction held quantity, plus actual current observations; no historical capacity is inferred from today’s quote.

Release origin: a sale is not required. The opening cap is deterministic unit value at release × initial purchasable shares calculated by the existing quote model at release with an unopened book. This is an identified release projection, not a claimed historical transaction. Between retained capacity observations, project the existing unit-value history against the last retained share quantity; never apply today’s capacity before its observation. Native opening supply stays bound to native issuance history.

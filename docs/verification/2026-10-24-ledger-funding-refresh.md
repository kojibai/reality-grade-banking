# Ledger funding refresh compatibility

The Wallet service returned HTTP200 and complete source data while both Ledger views reported an unavailable refresh. No financial original was missing or changed.

## Reproduction

Five retained funding nodes acquired additional original digests, Note source references or attribution fields. Two formerly unresolved credit markers became explicit Note-parent links. The frontend compared whole node JSON strings and rejected these additions as conflicts. Both public and private history use this merge path, so either refresh could fail while the retained records remained visible.

The exact before/after derived records reproduced five public refresh conflicts. Applying the corrected merge to the same responses produces zero conflicts. The bundled public seed and an already-updated response also merge without conflict. Diagnostic payloads remain outside the repository.

## Correction

Missing disclosure fields may enrich the same transaction. A thinner response cannot remove already retained facts. Existing amounts, identities, offsets, sources and proof digests must agree. JSON property order is immaterial.

An exact `original-credit:<credit-id>` marker can resolve to the disclosed Note parent only when that marker contains no evidence beyond its reference and empty parents, and the recorded credit carries its original digest and connected-Note source or the deployed legacy recorded-credit role. A marker with a funding source, amount, time, digest, proof membership or other evidence cannot be replaced this way. Existing Note-parent changes still conflict.

The correction reuses the existing response. It performs no requests, SQL, financial writes, cache clearing or history deletion. Enclosing proofs and financial originals retain their existing authority.

## Checks

- Public/private enrichment, richer-to-thinner retention, reordered JSON and source-label compatibility.
- Refusal of conflicting amounts, digests, parents and attribution offsets.
- Refusal to replace populated credit markers.
- Existing funding context/history, public network, private history and payment grouping suites:86checks passed.
- Actual source-response replay: five conflicts before, zero after; no new network reads during merging.

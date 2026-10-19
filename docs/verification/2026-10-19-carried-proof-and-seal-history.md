# Carried original proof and card seal history

The media reader already opens an exact SHA-256-selected original through SDK
v129 `artifacts.verifyAndOpen`. It now retains the successful verification report
with its exact bytes. Ledger/History technical inspection observes this report
by original digest rather than fetching and verifying the same object again.
Concurrent explicit inspection shares the pending media open. A different digest
cannot reuse that result. Memory retention is bounded to 16 originals / 64 MiB.

The real public PNG original with SHA-256
`7396aafeddf8b9d6e54eb40400245a8403ac915b318f1481a7eb2aadf42cb4f8`
carries its bundle in PNG iTXt `receiz.proof_bundle`. The SDK-decoded bundle
contains the encoded Groth16 proof, proof digest, Poseidon hash, signature and
certificate, native record seal and continuity fields. The inspector exposes
the complete report plus decoded Groth16 proof and public signals. An unopened
activity projection no longer incorrectly claims those fields are absent from
the original. Display decoding adds no cryptographic verification pass.

The full offline ZIP continues to include the exact original, pinned public
verification material, self-contained verifier, complete corresponding source,
HTML/Node entry points and file hashes. Only a report admitted with its exact
original bytes can enter this package; caller-supplied report JSON is rejected.
SDK-opened reports receive the same fixed verification material when packaged.

A read-only capture of the existing visible card inventory recovered 5,366
claims, grouped into 2,577 sport/card-ID/rarity groups. Every claim passed
`verifySportsArenaCardClaim` plus exact table placement checks. Issue resolution,
viewer selection and zero-score birth valuation use the unchanged Receiz source
functions, including the same public MLB registry lookup. No private account or
purchase fields are included in the public export. Each copy exports its exact
collectible ID, claim hash, issuedAtMs converted to ISO, canonical birth value and
public current owner name. The first seal is 2026-05-10T19:28:19.543Z; the last is
2026-10-18T02:06:54.037Z. All 5,366 copies have public owner metadata.

The existing 1,962 priced groups cover 4,668 of those copies. Their retained
pricing fields remain byte-for-byte unchanged; the SHA-256 of that original
card array is `252d1e47bc57fe513ce3b902302d150a573199d341a8a4f9abe1db7f271cf678`.
The other 615 groups / 698 copies are carried as discovery and birth metadata,
with no fabricated current quote or zero-valued pricing model. Metadata freshness
is separate from the retained price observation time.

Every known copy contributes zero before its seal and its canonical birth value
at that seal. Full dated copy models remain stronger than birth-only metadata.
Later aggregate pricing is inserted at its actual retained observation, with a
validated signed adjustment so dated and aggregate contributions are counted
once. Existing current pricing stays on its original deterministic pulse math.
Sparse recorded performance observations are not invented between those points.
The history policy and membership digest invalidate older backdated caches.

The bounded chart data was regenerated from this inventory. Regression coverage
checks all 5,366 identities and owners, preserves all 1,962 old price rows, gates
history before the first seal, tests mixed full/birth-only/unpriced coverage,
signed adjustments, source freshness and malformed retention. The native
verifier, custody runtime, trust roots and antirollback policy are unchanged.

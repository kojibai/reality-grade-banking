# Ledger individual card values

The public Ledger seed now carries the native individual-copy valuation operands
for all 252 sports-card transfer rows: 193 Action Ledger records and 59 Proof
Graph records. The 45,663 original records, event hashes, coordinates, recorded
amounts and shared identity contexts are preserved.

41 transfers retain their explicit recorded card-value snapshots. The remaining
211 replay Receiz's deterministic individual-card chart model at the carried
event pulse and are labeled **Calculated transfer value**. These are native
display projections, not newly discovered historical sale records. The earlier
43 supported individual-history models remain preferred for their own supported
history interval. A later live model cannot rewrite a carried event model.

The separate **Current live value** evaluates the same original's native motion
at the local current pulse. Newer native copy operands can update that current
value when the exact claim, collectible ID, sealed time and birth value agree.
The model's base, birth, market value, score delta, deterministic seed and capture
pulse remain available in record details and the offline receipt.

## Source and binding

The native source path is Receiz `app/api/game/sports/economy/route.ts`:

- `verifySportsArenaCardClaim` checks the original claim and row binding.
- `sportsPublicClaimViewerCard` composes the existing original and performance
  appends.
- `buildSportsArenaSingleCardValueModel` supplies the existing native pricing
  model, including pack, issue, rarity, score and career inputs.
- `sportsEconomySealedCopy` exports the bounded public model for that original.
- Bankeiz reuses `SportsCardPremiumValueChart`'s historical display rule and
  `sportsArenaLiveValueMotionAtPulse`'s pulse rule.

One original collectible ID occurred under two distinct valid claim hashes. The
exact carried claim disambiguates them; an ID alone still cannot pick a price.
Group totals, another edition's representative, asks, bids and payment
consideration cannot substitute for an individual card's value.

Read-only local captures used the unchanged native route, scoped to the public
card IDs already referenced by Ledger. No production database writes, transfer,
account enrollment or deployment was performed. Public models alone were added
to the existing compressed seed. The captures were:

- 206 originals at `2026-10-19T10:51:52.584Z`, response SHA-256
  `d670cec99c9a0fd5cdb053927885a81074baf05991dc603bc02d965b4d52ac7b`.
- The disambiguated collectible's two originals at
  `2026-10-19T15:19:57.175Z`, response SHA-256
  `f1a21c1041ed5dcc88d94b08258791f6003d720e3139117f64574439b5608fa0`.

These capture digests describe transport provenance. They do not grant custody
or replace verification of the enclosing original.

## Loading and continuity

No per-card runtime requests were added. Values are available from the existing
Ledger seed before Market loads. The final seed is 4,956,940 compressed bytes and
31,415,533 decoded bytes, inside the existing 8 MiB / 32 MiB reader limits.
The original market-cap sources and chart are unchanged.

The active Ledger memoizes event amounts and receipt traces. Local pulse updates
reuse the index while its original operands remain equal; a changed native model
invalidates the appropriate index. Repeated thin public records and subsequent
seed generation retain an already carried model under the same event evidence.

## Remaining Signal Card boundary

Six Signal Card transfers do not carry a recorded card-value snapshot or a native
deterministic USD model in the available source. The inspected native Signal
Card history code displays listing asks, bids, auction openings and settled
sales; those amounts cannot be renamed into a historical intrinsic valuation.
The sports model is not applied to Signal Cards. Their existing proof and event
data are retained; a supported native valuation source is still needed to price
these six rows.

## Verification

Regression coverage checks cold-seed valuation, all 252 sports transfer rows,
snapshot priority, old history continuity, exact claim disambiguation, receipt
round trips, rejection of mismatched models, separate live values, source
enrichment without added requests, and index reuse across cloned pulse updates.
The browser fixture is `tests/browser/ledger-transfer-values.html` and uses only
the existing public seed and local calculation.

Final checks: typecheck passed; 232 test files / 1,365 tests passed; the full
production build, offline-shell checks, license checks and source-archive checks
passed. A semantic comparison against the previous compressed Ledger seed
confirmed that removing only the added `cardValuation` fields reproduces every
original record and source metadata field exactly. Browser inspection showed
the previously missing Guerrero transfer at $33.52 and its separate current
model value at $126.53, with no console errors or warnings.

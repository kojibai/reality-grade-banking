# Historical account valuation with v129

Bankeiz reconstructs historical holdings from a complete accepted account
statement, or a complete same-owner SDK-admitted Identity Seal whose money
movements reconcile with its carried wallet. The timeline begins at the
earliest sealed activity in that source. Logging in does not establish its
opening date or balance.

Reserve movements retain their actual dollar cents. Settlement movements
retain their actual Phi units. At each sampled past Kai coordinate, Bankeiz
recomputes the dollar value of those units with the existing Receiz v129 wallet
pricing law. It does not apply today's rate to past holdings. Actual
transactions remain separate in the Ledger. Computed chart samples have a
`deterministic-v129` display tag, a Valuation tooltip, and an accessible chart
description; they are not recorded historical quotes, receipts, credit or
spending authority. The accepted checkpoint's actual quote wins at its endpoint.

## Exact pricing source

The original `app/utils/phi-issuance.ts` from Receiz commit
`528e397e1d4821e3591258227b9739e1f9856f52` is distributed at
`native/receiz/app/utils/phi-issuance.ts`. Its SHA-256 is
`69622c017e955734525e121a7b27bdaa42066932657b145e02be493792de9c74`.
The browser copy changes only its two valuation imports to the installed SDK's
valuation entry. Source-integrity tests enforce this correspondence. The
native manifest records both the hash and the policy provenance.

The calculation uses the same default issuance policy, empty expected cashflows,
$100 quote, zero streak/lifetime/hold inputs, whole Kai pulse and eight-decimal
rate rounding as the existing wallet. The v129 SDK converts native Phi to integer
dollar cents. No pricing server, network request or implicit current time is
needed to reproduce a historical sample.

## First paint and bounded work

The projection retains the actual opening, financial movement boundaries, rail
extrema and a valuation grid for All, 1D, 1W, 1M, 3M and 1Y. Input is bounded at
100,000 movements, generated display history below 4,096 points and SVG geometry
at the existing chart limit. Same-pulse samples share their calculation. The
exact original history remains retained separately from sampled display data.

Identity-bound encrypted display storage keeps the balance, observation time
and computed history together for the next first paint. A cold complete carried
source can reconstruct its history locally after canonical admission, without
waiting for account continuation or optional full-source restoration. Newer
accepted sources enrich the screen through the existing adoption rules. A
stronger local Note successor cannot be rewound by a shared read. A recorded
observation wins over a computed point at the same display coordinate.

An older sparse cache is enriched when its matching complete carried source or
retained accepted account statement opens. Following entries read the retained
computed series directly. Post-import retention shares the same ordered,
revision-checked write queue as later reads, so a delayed seed cannot overwrite
a newer observation. Optional display persistence never delays wallet delivery.

An incomplete, foreign, missing-rail or unreconciled carrier cannot manufacture
a complete timeline. Its existing valid balance remains readable; absent history
still requires the original accepted account source. This change does not alter
identity admission, financial writers, current wallet amounts or package versions.

## Verification scope

Tests cover pinned-source integrity and canonical rate vectors, historical Phi
replay, pre-funding zero balances, exact checkpoint quotes, all chart ranges,
cache restoration, cold carried entry, invalid/incomplete source refusal and
recorded-quote precedence. Browser fixtures use synthetic holdings and the real
calculator and chart at mobile/desktop sizes. These checks exercise display
behavior; they do not execute payments or qualify deployed financial custody.

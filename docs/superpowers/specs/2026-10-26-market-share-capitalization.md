# Market shares and capitalization

The user approved counting each canonical asset once at its current unit value multiplied by available-to-buy capacity plus outstanding shares, replacing its previous single-object contribution. Display available quantity and outstanding shares in asset details with a small calculation disclosure and a Value / Market cap chart toggle. Preserve native banking actions and deterministic first paint.

## Sources and composition

- Native assets: reuse readSelectedActionLedgerHistoryForServer(), its verified nativeAssets supplyMicro and nativeAssetOffers. An ask partitions holdings; it does not add supply. Public certificates do not carry offers. Never invoke certificate issuance to service a public read.
- Generic Market shares: compose existing original_position_exposure and remaining bearer-note quantities in one database snapshot. The quote exposure also contains unissued offline buying reservations; these reduce capacity but are excluded from issued supply. Vault custody is already included in original_position_exposure.
- Buying capacity follows existing price/exposure/per-order math. It is not a fixed maximum supply. Open native offers are described as offers; final actor/rail/denomination/key checks remain with native prepare.
- Public snapshots are display observations beneath the existing primitives. No new issuer, signature, ownership record, execution permission or funding is introduced. A missing observation is unknown, never zero; native bindings never fall through to generic shares.

## Presentation and accounting

One canonical identity contributes once. Sports retain their existing per-copy/group accounting. BigInt arithmetic preserves microshares and cents. Unknown coverage is disclosed. Current quantities must not be multiplied across old prices and called historical capitalization: chart history begins at supported quantity records and retains their causal coordinates. Keep existing value history intact.

## Approaches

Chosen: additive bounded source composition and local display math. Rejected: calling quote capacity issued shares, counting both original value and its share capitalization, or replacing native proof authority with database rows. The user explicitly selected one share-cap contribution per asset.

## Acceptance

Tests must reject duplicate identities, lost microshare precision, reservations counted as issued, custody counted twice, unknown treated as zero, fabricated historical quantities, native/generic source substitution, and blocking first paint. Browser checks cover narrow/mobile layout and immediate local chart switching. No account-entry behavior changes.


## Final user refinements

Available to buy means remaining aggregate purchase capacity at the existing ask, with the smaller per-purchase maximum separately disclosed. Outstanding means issued shares currently held, including account, Vault and certificate partitions. Neither price changes nor certificate export/import independently changes that quantity.

The existing asset page gains a collapsed Shares & market cap row and a local Value / Market cap chart switch. Numeric figures remain on one line on narrow screens. Glyph entitlement questions were explanatory only: add no Glyph/unit-count presentation.

Generic recorded history aggregates signed buy/sell trades and each creator-reserve note's preserved initialShareQuantityMicro once, including all note statuses. Paired certificate purchase rows net to zero; certificate liquidity sales already have sell rows. Missing initial quantity, timing, truncated rows, negative prefixes or a current-supply mismatch yields a current observation only. Legacy whole-pulse transaction coordinates remain display precision, never KKS temporal admission or a claim of exhaustive lifetime history. Native histories continue to derive from the selected verified ActionLedger.

Canonical SQL asset_id aggregation includes older listing aliases. Quote limits retain their existing per-listing scope. A post-recorded notification refreshes quotes only, uses the existing transaction nonce for cache freshness and cannot change financial outcomes. A delayed capture cannot replace a newer observation. No Glyph entitlement, issuance, funds, ownership or account-entry behavior is changed.

Final accounting instruction: generic Market cap = (available to buy + outstanding shares) × current unit value. Available capacity remains distinct from issued shares. Native open offers already partition issued supply and are never added a second time. Generic historical cap uses recorded quote price, capacity and pre-transaction held quantity, plus actual current observations; no historical capacity is inferred from today’s quote.

Release origin: a sale is not required. The opening cap is deterministic unit value at release × initial purchasable shares calculated by the existing quote model at release with an unopened book. This is an identified release projection, not a claimed historical transaction. Between retained capacity observations, project the existing unit-value history against the last retained share quantity; never apply today’s capacity before its observation. Native opening supply stays bound to native issuance history.

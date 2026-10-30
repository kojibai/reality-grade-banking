# Live share certificate presentation

> Execute with superpowers:executing-plans. Preserve current main and unrelated ownership-transfer work.

**Goal:** Live certificate values and standard charts, a compact official footer, and continuous investment/Ledger presentation through certificate export and deposit.
**Architecture:** Compose the existing public certificate reader, carried Original valuation seed, chart projector, and recorded share-note events. No new custody, issuance, authorization, schema or browser price requests.
**Spec:** User requests in this chat; Receiz proof-object history and truthful-speed invariants.

## Preflight
- Primitive affected: certificate, ownership, public proof, investment history and provenance presentation.
- Source of truth: enclosing certificate; existing owner-bound note/position records and KKS event coordinates; bound Original valuation operands for display.
- Stronger/weaker risk: display must not establish shares, money, ownership or completed writes.
- First-paint risk: reuse held/carried operands; no aggregate Market discovery or quote reads in the public certificate read.
- External convention: browser/CSS and existing Supabase read syntax only.
- Exact boundary: cold direct public read currently takes 21.06s and returns an item without valuation seed. Certificate export changes position quantity without a buy/sell, so trade-only history fails exact reconciliation. Existing Ledger actions omit certificate facts in their public projection.

## Tasks
1. Lock direct shares seed projection, all chart periods/live ticks, compact footer, quantity/status handling and exact purchase token. Use public-only native reader, parallel independent item/history work, and bound source seeds. Coalesce React replayed reads without authorizing stale quantities.
2. Include existing mint/restore events in the same owner-bound portfolio response. Keep them separate from trades, preserve KKS order/exact integers and require final quantity reconciliation. Ignore creator-reserve issuance as a position export. Test partial/multiple export/deposit, same-pulse ordering, mismatches and all-share export.
3. Rename existing Ledger export/import actions, preserve selected certificate facts from the existing source, and use quantity-scaled existing valuation/chart. Record fixed event values separately from current projected value. Preserve immutable old receipt snapshots; do not invent facts they omit.
4. Focused regression tests, full Bank tests/build sequentially, native scoped contracts/typecheck, mobile and desktop browser evidence, fresh independent review. Commit only scoped changes on both mains, preserving all unrelated edits.

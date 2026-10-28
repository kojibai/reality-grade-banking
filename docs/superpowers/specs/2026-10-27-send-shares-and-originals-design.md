# Send shares and Originals

Status: layout selected by the user; transfer integration design. Implementation is not yet complete.

## Intent

Connect Send → Send ownership to the open account's investments and signed
Originals. Make a collection of hundreds easy to search and browse on a small
phone. Preserve the existing money Send, recipient selection, exact review,
approval, proof retention and uncertain-outcome recovery.

## Selected approach

The user selected **Shares + Originals** tabs, each with search and compact rows.
A single mixed list would make fractional positions and whole objects harder to
distinguish. Separate entry points would repeat recipient/review UI and make
ordinary sending harder to discover.

The Originals list uses exactly the profile's object-level PBI signature rule.
Profile-level PBI does not promote an unsigned Original. Collectibles retain
their separately approved discovery and transfer rules. Neither a signature
badge nor a display row establishes current transferable ownership.

## Current gap

`LiveSend` currently opens `LiveOwnership`, which calls `listDeposits()` and
renders a native select. That list omits Market portfolio positions and profile
Originals; it also repeats held-source work when another surface already has it.

Bankeiz already retains same-account Market positions and public Original
metadata. These can populate a picker. Execution must use the matching transfer
contract: generic backed asset units, Market share positions and whole Original
ownership are distinct rights. The present Market share custody adapter is
Vault-specific, and the Original ownership host is not yet exposed as a Bankeiz
same-account transfer port. Merely feeding those display IDs into the generic
`send-ownership` operation is incorrect.

## Mobile flow

1. Send ownership opens Shares / Originals and a search field. Each row shows
   a small existing cover or type mark, full readable title and held quantity or
   Original type. No new pricing graph, full media, or proof decoder runs here.
2. Search matches held title and identifying metadata. Show a bounded initial
   window with progressive local expansion; search covers the complete held
   list, including records outside that window. Keep selection and query when
   returning from details. Do not mount hundreds of images at once.
3. Selecting shares shows the selected holding, exact available share quantity,
   quantity input and All. Selecting an Original shows whole ownership and no
   fractional quantity input. Returning to the picker does not reload it.
4. Reuse the existing recipient selector. An incoming message/payment handoff
   preserves its selected recipient's account ID, rather than trusting a handle.
5. Review identifies the object/position, exact quantity, resolved recipient and
   existing terms. Final approval signs only that operation. Editing anything
   invalidates the prior review. An Original transfer does not silently transfer
   a separate investment position, sell shares or create spendable cash.
6. A completed transfer shows its retained receipt; uncertain delivery preserves
   its exact request and offers recovery. No second transfer is started to work
   around an unknown outcome.

## Source reuse and execution

- Reuse identity-bound retained inventory and existing shared portfolio/profile
  updates. Search, tabs, selection, local pagination and reopen make no display
  requests, verify no unchanged proof, and recompute no prices.
- Filter unsigned Originals before thumbnail, pricing or detail preparation.
  Preserve source IDs/digests rather than deduplicating unrelated objects by title.
- An unavailable inventory is distinct from an empty account. One shared missing
  inventory read may complete it; never start a per-row lookup or a second reader
  for data already held. The initial frame uses all currently held eligible rows.
- Prepare only the selected transfer. Source opening, recipient resolution,
  current ownership/available quantity checks and exact signed acceptance remain
  required at the existing execution boundary; they are not display hydration.
- Compose the existing native Market share split, ownership, basis conservation,
  source admission and once-only acceptance for an ordinary-account transfer.
  Do not create an implicit Vault or export/import bearer certificate as a shortcut.
- Compose the existing whole-Original successor, consent, current-head acceptance
  and recipient delivery. Preserve source, original Kai, creator and authorship
  history. PBI visibility does not authorize a transfer from a former owner.
- Reuse admitted returned account/position/Original changes for the sender and
  recipient Ledger and holdings. Do not optimistically credit an unaccepted send.
- Keep new contracts in the native integration; Bankeiz consumes the SDK/Connect
  ports. No direct storage-provider access or new financial rules in Bankeiz.

## Qualification and delivery

Cover large collections and search beyond the rendered window, unsigned filter,
zero/locked/partial quantities, All, exact fixed-point values, stable selection,
recipient ID binding, identity replacement, stale/current heads, non-owner and
oversend refusals, duplicates, concurrent sends, lost replies/recovery and actual
recipient holdings. Verify no repeat display reads on tabs/search/reopen.

Qualify the real native writer and returned source, not callback-only success.
Check mobile layout and full existing regressions/build gates. Scoped main commits preserve the existing integration boundary; the user pushes.
This design does not authorize deployment or real-value transfers.

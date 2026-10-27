# Collectibles in Bankeiz

Approved visual target: `output/cards-preview/index.html`, including the user's
refinements on 2026-10-27. This document records that approval, rather than asking
for the same design a second time.

## Experience

- Assets has a quiet **Collectibles** entry only when the open account holds
  qualifying card proof objects. Cards are not presented as generic objects.
- The catalog is **Your collection**; its public view is **[Name]'s collection**.
  The user chose that all owned qualifying collectibles appear publicly, with
  purchases available only for listed items. Public disclosures retain the
  existing source's permitted presentation; private custody material is never
  part of an image/link or anonymous response.
- The collection is open to every qualifying card type, not a closed list of
  Signal, Sports and Wildz. Type and deeper category choices derive from held
  metadata. Example: Sports → Baseball → Pitchers → Mythic.
- Selecting an item reveals its exact front/back, existing value/stat history,
  rarity and stats. Compact disclosures hold ownership/provenance and either
  the earning proof or the purchase, receipt and full permitted funding trail.
- Existing Send, sale/listing, purchase and trade semantics remain authoritative.
  A listed item has a shareable Bankeiz link. Public collection visitors can
  purchase listings or propose exact-card trades. Owners review offers and can
  reach the existing conversation. No proposal is shown as a completed transfer.
- Confirmation retains original identities, original Kai, operation identity,
  existing consent and ambiguous-result recovery. No replacement execution after
  a lost response. A price observation is not an asking price or spending right.

## Motion refinement

The selected card flips with a horizontal swipe as well as the existing tap
control. A small event-driven 3D tilt gives it presence when handled. Vertical
page scrolling, pinch zoom, keyboard use and reduced motion remain supported.
Only the selected item has a 3D context; no perpetual animation, scene renderer,
sensors, gallery layer promotion or idle frame loop is introduced.

## Reuse and performance

Reuse admitted Identity Record state, retained originals and owner-scoped
observations already held by Bankeiz. Reuse prepared chart/provenance/receipt
projections. Do not infer ownership from an account name, artwork, file suffix,
old observation or a calculated price. Displaying records must not execute a
fresh export, verification, price reconstruction or per-card lookup.

The new collection code loads only when needed. Prepare the index once for a
source revision; bound painted entries, retain originals by reference, and do
not decode every full original or construct every chart on catalog paint.
Writes use existing source contracts at explicit user actions. Reuse accepted
results to update held views rather than reading them back immediately.

## Implementation boundary

The prototype uses sample data/reference art. Production must use exact native
sources. Source inventory and each family's operation interface must be
qualified before enabling actions; an unsupported native action must not be
invented, rerouted through a different financial rule, or made to look completed.
Cross-family swaps require a native contract that conserves all offered and
requested rights together; two independent Sends are not an atomic trade.

Existing unrelated dirty work belongs to another developer. Preserve it. No
push, production deployment, migration or real financial testing is authorized
by this implementation step. User pushes the reviewed main commit.

## Approved navigation and profile refinements

- Collection navigation uses one Back arrow and a centered title; no redundant X. Back returns to the previous meaningful view, including the profile when the public collection was opened there.
- A small collection icon appears on a user's profile only when that account has qualifying collectibles. It opens that user's public collection directly, using the same source-bound collection index; no new profile discovery read.
- A quiet Originals value total appears above the displayed-originals grid, paired with the displayed-original count. It sums the existing prepared values for that exact public set, with no pricing replay, extra source reads or chart generation. It is not an account balance or a total of collectible values. A partial page or unpriced set must never be labelled a complete total; the live adapter must use a complete carried aggregate or omit the total until complete.
- The interactive preview uses explicitly marked sample originals, values and artwork placeholders. It does not claim to represent an actual account or live valuation.

Profile icon placement refinement: put the collection shortcut at the right of
the Assets / Public activity row, keeping the payment/message action row
unchanged. Use the shared three-upright-cards mark, not the Layers/stack icon.
The condition and direct destination remain tied to the same user's collection.

The user approved showing only originals carrying their own PBI signature in
the public profile's Originals grid. Filter the already-carried object metadata
before preparing display values and growth; totals and counts describe that
same visible set. A signed profile does not sign its objects. Preserve full
held membership, owner Assets, Ledger records and separate Collectibles
visibility. The profile's publication-history tab uses the same signed set so
unsigned objects do not reappear there. This display rule adds no source read
or signature re-verification.

The user explicitly approved building cross-system exchanges as well as native
compatible exchanges. The integration must be extensible through validated
collectible adapters, not a closed Sports/Signal/Wildz switch in the UI. New
systems must provide admitted originals/current ownership heads, display and
valuation evidence, and conserved/recoverable transfer participation before the
exchange engine enables them. Merely labelling a payload as a card grants no
ownership or exchange capability. Every leg retains its original Kai, owner
consent, source head, exact original and complete permitted continuity.

# Collectibles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved lightweight Collectibles experience, preserving native sources, rules and recovery.

**Architecture:** A source-bound display adapter indexes already-admitted card originals, owner-scoped held account data and prepared history. A lazy collection sheet and independent public entry consume that same projection. Named operations compose qualified existing Receiz/source contracts; accepted results update the held state.

**Tech Stack:** Existing React/TypeScript, CSS, lucide icons, ValueChart, Receiz SDK v129 and the source projects' existing contracts; no new UI/runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-27-collectibles-design.md`

## Global Constraints

- Preserve unrelated dirty work and existing payment/trade behavior.
- No new display requests, automatic exports/re-verification or duplicated pricing work.
- Collectibles / Your collection / [Name]'s collection; arbitrary-depth taxonomy from held types.
- Original card/source identity and Kai are retained; no fabricated art, history or success.
- Selected-card-only swipe/3D handling; no idle animation, gallery GPU promotion or global scrolling changes.
- The profile shortcut belongs in the Assets / Public activity row and uses the upright-card collection mark. Originals value reuses the existing prepared total; it is never a wallet balance.
- Card artwork in Assets and Explore is carried through existing sources. Their card actions navigate to the exact Bankeiz card detail, never the generic fungible-share execution form.
- Value & rarity is compact until opened; show original policy, exact operands, Kai, rounding and evidence. Issued count, edition cap and draw odds remain distinct.
- Cross-system exchanges and future valid collectible adapters are explicitly approved. Qualification must include each adapter's actual admitted ownership and conserved settlement participation; a metadata type label alone is insufficient.
- User pushes; no production changes or live financial actions.

## Review Focus

- Restored/copied identity with stale or foreign ownership must not expose an actionable wrong-owner card.
- Heterogeneous, unknown, empty and deeply nested card types remain discoverable without eager decoding.
- Omitted/truncated provenance or history cannot become invented completeness or a price-derived ownership claim.
- Pending/ambiguous purchase, transfer or trade results keep their original operation identity and recovery.
- Touch scrolling, canceled gestures, reduced motion and backgrounded sheets incur no persistent rendering loop.

## Task 1 — Selected-card handling and source qualification

- [x] Pin horizontal swipe, vertical-scroll preservation, keyboard/tap, reduced-motion and no-idle-work behavior in `tests/collectible-card-view.test.tsx`.
- [x] Add `src/features/collectibles/CollectibleCardView.tsx` and `collectible-card-view.css` as a visual-only component; no source, financial or network dependencies.
- [x] Use this component in the approved preview for immediate visual review.
- [ ] Qualify held inventory, exact original/front/back references, prepared chart/provenance data and native operations for Receiz Sports/Signal and Wildz. Record precise interface paths and gaps in the implementation ledger before writing adapters.

### Qualified prerequisites and plan correction

A source review found real integration gaps; no existing financial operation may
be silently replaced or exposed as a completed universal exchange.

- SDK v129 Sports presently exposes local-first memory/manifest/conformance
  reads, not game inventory Send/list/buy/trade methods. Existing game routes
  have owner-cookie contracts, not an assumed arbitrary app-state permission.
- Verified portable account state carries Sports and Signal card rows, artwork
  and appends. Reuse those exact account-bound records. `listDeposits()` also
  schedules a holdings refresh and reopens sources, so the new view must consume
  already-held controller/parent projections instead of calling it again.
- A cold canonical profile carries Original/download locators, not a guaranteed
  decoded card inventory. Inspect already-admitted manifest projections first;
  an additional carried collection summary/index is needed where none exists.
  Titles, handles and download locators cannot manufacture membership.
- Native Send/offer paths need a qualified stable operation identity and result
  recovery. Native purchase recovery must resolve the original attempt before
  requiring a still-active listing. Exact seller/price consent must be bound at
  the native atomic mutation, not by a separate preflight read.
- Sports existing exchanges are same-sport; Wildz existing exchanges are staged.
  Neither is an atomic Sports/Signal/Wildz exchange. The approved cross-system
  addition must compose a qualified common accepted exchange with native source
  adapters. Two successful Sends do not establish that common exchange.
- A new adapter registers its manifest/verifier and source-ownership semantics,
  retained display/valuation/provenance projection, conditional transfer and
  durable recovery participation. Discovery uses the same index. Unsupported
  or merely labelled payloads receive no transferable ownership capability.
- Public disclosure remains limited to the source's permitted public material.
  Group-level history is not an exact single-card history; private originals or
  truncated provenance are never promoted to a complete public proof.

## Task 2 — Shared held projection and owner collection

- [ ] Add `src/receiz/collectibles.ts` for same-owner admission/display projection, original-reference deduplication and arbitrary-depth taxonomy; tests in `tests/collectibles.test.ts`.
- [ ] Compose existing held Identity Record, deposit/showcase, Ledger and history sources. Add a synchronous known view/changes port only where the existing controller already owns that state. No eager source read in Assets or login.
- [ ] Add lazy `src/features/collectibles/CollectionPanel.tsx` and focused catalog/item/history styles. Integrate a conditional entry into `src/features/assets/LiveAssets.tsx`; preserve the other developer's Assets-related changes.
- [ ] Reuse ValueChart and admitted history/provenance/receipt projections only for a selected item. Tests pin no additional requests or repeated work on navigation/categories.

## Task 3 — Native actions and public collection

- [ ] Qualify/extend the native same-owner SDK contracts and family adapters first, including stable operation/result recovery, exact price/owner consent and an additive carried public collection index. Keep provider implementation outside Bankeiz.
- [ ] Compose and qualify the common cross-system exchange through the existing registered proof/ownership execution primitives, retaining all originals, both consents, conditional heads, native locks, acceptance and recovery. Add future collectible systems through the same adapter contract.
- [ ] Add narrowly named adapters under `src/receiz/collectibles-*` and `server/collectibles-*` only for qualified source contracts; test exact paths, owners, inputs, consent, idempotency, lost responses and result admission.
- [ ] Wire owner Send, list/edit/remove, public purchase and trade review/recovery to those contracts. Reuse accepted results; do not refetch merely to display a result.
- [ ] Add `src/public-collection/` as a separate lazy public entry and short collection/item URLs. Public responses must preserve permitted disclosure and source-bound ownership; no private originals, credentials or account payloads.
- [ ] Preserve exact per-item charts and ownership/funding/earning history on shared links. Cross-family exchange is enabled only through the qualified native conserved transaction contract.

## Task 4 — Qualification and commit

- [ ] Run focused red→green tests, complete locked-dependency suite, full build and relevant existing browser gates in an isolated qualification checkout.
- [ ] Verify mobile/desktop, no-card entry, nested categories, artwork proportions, swipe/scroll/cancel/reduced motion, source links and the native action review flows with synthetic sources. Record visible and network evidence without real financial actions.
- [ ] Fresh whole-scope review; correct important findings with tests. Compare exact qualified sources and stage only this feature's files/hunks.
- [ ] Commit on main; leave push/deployment to the user and identify any native interface/deployment prerequisites honestly.

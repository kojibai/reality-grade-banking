# Collectibles implementation ledger

Base: `441bbed`, main. Approved preview and refinements are recorded in the spec.
Another developer has unrelated dirty Earn from originals/qualification work;
its files and hunks are preserved.

- Task 1 underway. No production Collectibles behavior has been enabled yet.
- Ruling: a display cannot discover unseen cross-app holdings without a source.
  Inventory composition must first qualify the state already admitted/held by
  this session. Do not add per-item lookups or replace missing sources with public
  name matching. Native mutation/owner checks are distinct from display work.
- Ruling: the 3D effect belongs only to the selected card, driven by pointer
  events with reduced-motion support; no sensor permission or idle animation.

## Selected-card handling completed

- Shared visual-only CollectibleCardView is wired into the approved preview. Horizontal swipes, taps, the existing sibling button, Enter and Space turn the selected card. Handling tilt has no idle loop; it resets on leave, scroll intent, cancel, blur and reduced-motion changes. Gallery cards have no added transforms or listeners.
- Six focused tests pass (including reverse swipe, no click echo, vertical scroll, cancellation, second-touch pinch protection, reduced motion and repeated Space). The component passes a targeted strict TypeScript check. A CUA browser drag changed the visible front to the complete back record, with the sibling control changing to View front.
- A fresh scoped code review found two accessibility improvements (repeat-Space scrolling and active-face description); both were fixed and the six tests rerun. No remaining actionable review findings. Physical iPhone touch/pinch and screen-reader announcements are not claimed tested.
- The initial workspace typecheck was blocked by unrelated pre-existing TS6133 in src/receiz/market-projection/global-share-capitalization.ts:30 (unused item). That file was not changed.
- This finishes the requested card interaction only. Native inventory/action qualification and the complete live Collectibles integration remain unfinished; no live operations were enabled, committed or deployed by this step.

## Profile and navigation visual refinement

The approved preview now uses single-Back navigation with a centered title; no
collection X remains. A Public profile scene shows a quiet Originals value above
the originals grid and a conditional upright-card shortcut beside Assets and
Public activity.
The total and formatters are prepared once from the sample original fixtures,
not repriced on taps. This is a visual fixture, not live account valuation.

The preview bundle compiles. CUA checks confirm the profile shortcut opens Maya's
public collection, Back returns to Profile, and the shortcut disappears with the
sample no-collectibles toggle. A mobile screenshot is saved at
output/cards-preview/profile-value-mobile.png. Existing sample original values,
profile placeholders and collection fixtures are explicitly labelled previews.
No production profile integration, network behavior, deployment or commit is
claimed for this visual step.

## Presentation integration underway

- The real public profile now shares the existing prepared-value aggregation
  with its weighted return calculation. A complete, priced public collection
  can display Originals value without another read or current-price evaluation.
  Missing prices or partial pages do not produce a partial total labelled full.
- Sports artwork was present in the existing native public economy response but
  removed by Bank's compacting projection. The same response now preserves only
  validated public native artwork locators. UI retention is bound to the exact
  collectible ID and claim, including normalized hex casing; no source lookup
  or eager gallery image decoding was added.
- One read-only public source capture enriched 1,961 matching cold-snapshot
  entries with artwork references. All 2,577 entries and every existing price,
  owner and history field were preserved. The returned source was a fallback
  and did not supply permitted artwork for the remaining 616 entries; none was
  invented or reconstructed from a title. Future canonical captures can append
  those exact missing references through the same existing read.
- Focused presentation checks: 49 passed in 8 files; full shared-workspace
  TypeScript check passed. A fresh scoped review found one uppercase-claim
  artwork-retention edge case; it was fixed and covered before that rerun.
- The profile shortcut was moved into the Assets / Public activity row and now
  uses the shared upright-card mark. Latest visual evidence:
  output/cards-preview/profile-collection-tab-mobile.png.

## Native contract qualification

The fresh plan review confirmed the required native gates recorded in the plan.
The user explicitly chose cross-system exchanges, including future valid
collectible types, so the new common exchange/source adapter work is approved.
The relevant current sources include verified portable Sports/Signal account
state, native family transfer/listing/purchase/trade contracts, Wildz staged
transfer/purchase contracts, and the SDK's registered proof/ownership execution
primitives. No current generic asset/escrow endpoint is assumed to admit legacy
game cards, grant another owner's consent or update every family's native head.

No new native financial or authentication behavior has been enabled yet. The
finished presentation changes are being qualified separately; whole Collectibles,
cross-system exchange, exact standalone card actions and public collection
availability remain unfinished and must not be described as live.

## Approved signed-originals profile refinement

- [x] Reproduce unsigned originals appearing despite only profile-level PBI.
- [x] Select object-level `hasPbiSignature === true` once per held item revision,
  before the existing profile pricing and growth projections. Reuse that exact
  set for the grid, its total/count and profile publication history; preserve
  raw membership and Ledger records.
- [x] Verify mixed and entirely unsigned profiles, no extra source requests,
  existing profile navigation/growth checks and TypeScript. Collectibles stays
  unchanged; this refinement changes only the public Originals presentation.

Cold entry follows the same policy: public profile image hints select the first
two signed displayed originals, and the build-time early-artwork index retains
only explicitly recorded object PBI metadata. Standalone titles, full carried
membership and owner inventory remain intact. An empty signed set skips the
profile pricing projection entirely. Focused checks: 51 passed in 9 files.
The artwork/sealed-source regression checks add 5 passing tests in 2 files;
TypeScript and the generated title-index freshness check pass. This remains
working-tree integration, not a committed or deployed release.

The attempted full shared-workspace suite was interrupted by ENOSPC and also
reported failures in market-carried-seals-seed, live-market,
market-trade-popover, market-return-scroll, moment-composer,
vault-runtime-resource, offline-proof-launcher and offline-shell-build. No
green full-suite result is claimed. The carried-seal snapshot check now excludes
only newly appended artwork metadata while retaining its independent digest of
all original financial/ownership operands, and its four tests pass.

## Finished presentation release candidate

Qualification baseline: `abdcde6`, including the other developer's committed
PBI publication and immediate-admission work. Their remaining uncommitted
qualification/Earn work is excluded from this candidate.

The finished scope is signed-only profile Originals (including profile
publication history, values/growth and cold image hints), quiet Originals value,
existing-source Sports artwork and exact-claim retention, plus the approved
Collectibles visual prototype and selected-card handling foundation. Unsigned
objects remain in their source inventory and owner Assets; separate Collectibles
visibility and financial execution rules are unchanged.

The clean locked-dependency suite passes all 3,778 tests in 602 files. Old
Market/browser fixtures now declare their synthetic object PBI metadata. The
existing identity/recovery tests now match the committed profile-signing labels
and distinguish pending delivery from already-admitted source membership.
Disclosure copy matches signed-only Bankeiz presentation. Generated product
previews and verifier resources are reproduced from their actual included
sources; unrelated working generated artifacts are preserved separately.

Fresh review found a stale/fallback image edge case. Its red regression and fix
permit only missing validated artwork for an exact held ID/claim, preserving
every newer price/owner/history field and timestamp; the reviewer confirmed it
resolved. Full production build, browser/Vault gates and archive extraction
checks form the final release qualification before staging the scoped patch.

Live Collection inventory/actions, standalone card commerce and cross-system
exchange remain the next implementation work. This commit is not their release.

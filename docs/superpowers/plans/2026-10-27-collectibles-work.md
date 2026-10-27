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

## Current profile review: placement, booking and value history

The user requested a real bjklock profile review before committing. No commit,
push or deployment is authorized by merely opening this review. The profile
review uses a read-only capture of the existing public profile and public Sports
collection, bound to the same immutable owner ID. It is not a complete native
Collectibles release. It currently contains 3,829 Sports cards across baseball,
soccer and fight. Wildz and Signal inventory, exact native card faces, individual
current values/history, public delivery and native commerce remain unfinished.
The athlete photograph tiles are temporary preview presentation, not the final
card design. The finished catalog must preserve each native card's actual front
and back, per-copy valuation, rarity and continuity.

The latest requested placement supersedes the earlier tabs-row mockup: a quiet
collection icon sits left below the banner, booking sits right, and the portrait
remains centered. The Assets, Public Activity and growth controls stay in place.
An already-held public collection view is accepted only for the same immutable
profile owner, and only its publicly visible cards are rendered. Display input
does not grant custody or enable financial actions.

Booking lazily opens the existing booking experience inside a Back-only sheet.
It stays mounted while closed so its availability, draft and completion state
survive reopening together. The ordinary standalone booking page is unchanged.
The native profile's existing scheduling visibility preference governs the icon.

Originals value now opens one mobile SVG value-history sheet. The existing
history's dollar samples drive Originals. Market cap
composes the existing compatible per-original share inventory in the same price
pass; missing supply coverage is shown as unavailable, never as zero or a partial
complete total. Six existing periods, date bounds and accessible pointer/keyboard
inspection remain. Mode and period switching select held arrays and issue no
request. No new renderer dependency, page timer or animation loop is added.

The chart worker and history-row preparation now wait for the first explicit
chart opening. Closing retains the result and leaves the worker idle; new source
revisions are prepared only on reopening. The opening sample doubles as the
period's appreciation baseline, removing a second opening-price pass. The
underlying appreciation calculation stays available as a distinct definition.
Private holdings and financial execution are unchanged.

### Review corrections: existing capacity formula and value change

- The user explicitly retained the existing capitalization contract: generic
  outstanding shares plus remaining quote buying capacity, multiplied by unit
  price; native issued supply counted once. The global formula and prepared
  global history were not modified. A discussion about conventional corporate
  stock terminology did not authorize redefining that existing metric.
- The preview omitted `membership.snapshot` when parsing its existing carried
  Market data. Passing that saved snapshot reveals its existing share records
  without any extra data request. The complete real public profile has 611
  signed originals, and all 611 have canonical asset records in that snapshot.
- Profile history previously required the media export digest to remain equal
  before accepting the canonical asset's share history. Ninety-four appended
  media versions failed that unnecessary condition. Share supply is now joined
  by the existing canonical asset/issuance binding, using the common canonical
  capitalization selector; conflicting simultaneous aliases stay unavailable.
  The stricter media digest check still governs replacing pricing operands.
- The user confirmed retaining the existing 6,000% appreciation definition:
  `(current total / combined starting values of all originals - 1) × 100`.
  It excludes newly created principal from appreciation and stays identical in
  the profile summary and value sheet. The total-growth experiment comparing
  the first $219.95 with the entire present collection was withdrawn. A compact
  disclosure now explains the actual starting/current values and formula.
- The Market cap disclosure separately explains the per-original existing
  share-capacity formula and its period change, with the actual opening/current
  cap values. Both disclosures stay collapsed below the chart by default.
- A worker retains the full profile rows and its completed history. Later
  evaluations carry only `{id, profileTick: true, pulse}`. The unchanged input
  fingerprint is cached per immutable rows revision, and an already-running
  evaluation of the same pulse is not queued a second time. No source requests,
  page clock or additional worker are introduced by these disclosures.

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


## Held owner collection integration

The live Assets entry now indexes the SDK-admitted account projection once per
identity/source revision. Its canonical account UUID is checked separately from
the Identity Seal key owner. Sports and Signal rows retain exact collectible and
claim identities; foreign or conflicting rows cannot become actionable holdings.
An onward transfer's original earner is not confused with its current row owner.
No new source read, verification, export or pricing operation is performed by
opening the view or navigating categories. Prepared individual values are joined
only by exact collectible/claim; a grouped Market value is never substituted.
The UI consumes arbitrary-depth taxonomy, with no family-specific UI branches.

The collection sheet is loaded only on demand, uses one Back control and mounts
40 gallery items at a time. Only the selected card mounts the existing swipe/3D
component and chart. Ownership/funding disclosures stay unmounted until opened.
Separate source-bound native appends and exact pack-purchase rows are retained
by reference alongside the original card row; saving the owner record does not
serialize the private account. This JSON is labelled a card record, not a newly
verified proof object. Native exact original PNG bytes are not fabricated from a
portrait or social preview. The current card face uses available native artwork
and its admitted fields; native original export remains part of the action bridge.

Ruling: display admission does not grant financial execution — existing native
Send/list/purchase paths and a common cross-system exchange still need stable
attempt recovery, exact consent and source ownership participation. No frontend
button may imply those contracts already exist. Current production actions are
unchanged and no native or SQL update has been made in this step.

Source qualification correction: Sports generic transfer covers baseball,
soccer and fight through app/api/game/sports/_lib/sportsVaultTransferRoute.ts,
not baseball only. Sports exchanges remain same-sport. Signal lacks a common
exact-card swap. Wildz source journals explicitly use staged purchase/transfer
participation. SDK v129 registered atomic operations do not automatically admit
legacy card custody into those operations; two separate transfers cannot supply
that missing conservation/acceptance contract.

The owner collection integration is being qualified as a separate, reviewable
commit. Public collection links, the live public profile shortcut, complete
Wildz discovery and native commerce/cross-system exchange remain unfinished.


### Held collection review and qualification

A fresh review caught three display issues before this commit: duplicate rows
with different ownership/visibility heads were being selected by order, native
Sports settlement fields and nested Signal payload fields were omitted from
disclosure, and Show more could accumulate every gallery tile. Red regression
checks reproduced those cases. The fix compares duplicate source structures
without hashing/reopening every card, maps actual native fields once per held
record, and replaces pages with a fixed 40-entry window for gallery/history/
source steps. Back preserves the catalog position; no new DOM layer or frame
loop was added. Review confirmed all three resolved with no new serious finding.

The isolated locked-dependency suite passes 3,795 tests in 606 files. The first
attempt's two HTTP tests were blocked by the local sandbox's listen permission;
the fully permitted rerun passed. No timeout or assertion was weakened.
Product examples retain exactly the same screen markup and add only the 398
characters of scoped entry CSS discovered by their existing generator. This
avoids the generated-preview freshness failure on deployment. Build/browser/
source-archive gates are being completed before the exact candidate is staged.

### Live calculation and booking-zone qualification

The expanded profile calculation reads the same current Kai result as the chart.
It does not fetch or quote separately when a disclosure opens. A regression keeps
an expanded disclosure mounted/open through a pulse update, checks the new exact
arithmetic and records zero network reads. Pulse-only worker messages contain the
new pulse, without resending the collection. The public source review at port
5183 uses a fixed capture; production uses the existing app pulse.

Booking availability carries the already-known device IANA zone in its existing
request. Automatic owner-local times require no preference resave; manual choices
win. Visitor formatting remains local to the visitor, and accepted appointment
instants are unchanged. Availability and custom-link views reuse their held
results. A changed automatic zone resolves once; returning from another zone
cannot reuse an obsolete automatic preference. The editor holds one consistent
zone throughout an editing session. Timezone controls/options are only prepared
inside the availability experience, outside account/profile entry.

An isolated candidate at current main f8bf584 plus these scoped files passed
3,875 tests in 623 files with no skips, the full production build and the emitted
plain-Node API regression. The provider contract must be available before this
new automatic-initialization client is deployed. No production operation or
commit is implied by these local checks. Foreign working changes are preserved.

## Cold-profile Market capitalization delivery repair

Live public response inspection found all 611 profile Originals but zero carried
share inventories. The existing public Market snapshot already contained the
share tape for every one of those assets. Profile routes intentionally avoid
rediscovering the Market, so the direct profile never received those operands.
The earlier arithmetic tests supplied inventory directly and missed delivery.

Ruling: partition the already-shipped public tape during the existing profile
build and append only exact compatible asset records to the same canonical
profile response. No remote read, generic zero supply or financial quote is
added. Newer live observations win. Contradictory records cannot supply a total.
The per-profile file is parsed once per deployment worker; taps do not read it.
This is retained public chart data at its disclosed source coordinate, not a
fresh ownership/financial admission. Originals absent from that tape remain
explicitly uncovered until a carried source supplies them.

The actual captured bjklock profile now joins 611/611 share records and builds
64/64 ALL-period capitalization points with no missing cap. The local join was
3.31 ms. CUA verified a cold main-app profile at port 5190, Originals → Market
cap, the curve and its exact arithmetic disclosure. It required no Market
discovery request. Evidence: /private/tmp/profile-market-cap-repaired.png.
Focused delivery, profile, chart and emitted-Node checks: 51 passed in 6 files;
strict whole-workspace typecheck and profile render build passed.

This repair changes no pricing, supply, execution or ownership rule. Live
Collectibles/actions/cross-system exchange remain the ongoing task.

The final isolated candidate passed all 3,878 tests in 624 files, no skips, plus
the complete production build/source/offline-shell checks. Two stale copy
assertions from main 6103ce8 were updated to its committed money/source wording;
the same receiving continuity requirements stay asserted. Other developers’
ongoing Messaging/Twin edits and generated files were excluded and preserved.

## Profile booking first-open and retained presentation

The profile booking path had a code → availability waterfall. It also constructed
a timezone formatter for every slot on each of several scans, and unmounted the
entire time picker on the guest-details step. The source service already retained
its single successful availability response; there was no evidence of a repeated
network read on ordinary close/reopen. The confirmed regression was repeated
presentation work, not a new booking rule or a timezone network lookup.

The small existing profile frame now paints on the first tap from the carried
profile. The one availability read and optional booking-editor import start
together after that tap, with no request before intent and no second read on
editor handoff, Back or reopen. First-ever offered times still require the actual
source response. No times are fabricated and confirmation still submits the
exact offered instant with the existing conflict/outcome recovery rules.

The offered source is indexed once per display zone using five reusable
formatters; each source retains at most two display-zone indexes through a weak
reference. Day/time selection uses those indexes. The time picker stays mounted
while guest details are shown, and parent pulse renders do not rebuild it.

On the actual public capture of 665 offered slots, five local CPU measurements
had medians of 66.388 ms before and 5.674 ms after; a retained lookup averaged
0.000185 ms over 1,000 calls. These are local presentation measurements, not
physical-iPhone end-to-end times. A read-only public availability request took
0.589 s; that first source delivery is separate from the repeated CPU work.
The 842-slot regression first failed at 2,530 formatter constructions; it now
requires fewer than twelve on opening, none on Back or an unchanged rerender,
the same picker DOM nodes, and one source read. Additional cases cover a first
tap while the editor is suspended, a pending/failed first read without an
automatic retry, and daylight-saving display with unchanged offered instants.

CUA checked the actual local main app: select an offered time, Continue, Back,
close and reopen; the selection stays intact. No appointment was submitted.
Evidence: /private/tmp/profile-booking-repaired.png. Receiz, SQL, availability
rules and financial behavior are unchanged by this fix. The unrelated shared
workspace opening-indicator work is preserved outside this commit.

Final qualification: 3,882 passing tests in 627 files with no skips in the
isolated booking candidate. The initial unrestricted-worker sandbox run had
five fixture/deadline failures (business-fit artwork, business-fit journeys,
canonical-document rejection and two cooperative-preview HTTP cases); the
permitted local-HTTP run with two workers passed them all without code or
timeout changes. After the concurrent balance-disclosure commit 64edd45, its
changed tests plus all booking regressions passed together: 148 tests, 22 files.
The combined candidate passed the complete production build, strict typecheck,
source archive, public-page, offline-shell and licensing gates.

## Booking layout and shared public bootstrap follow-up

The user reproduced remaining hesitation in both Safari and Instagram, more
noticeably in Instagram. Vercel inspection confirmed production was serving
8a4e56a; this was not assumed to be a stale deployment. Actual iPhone Instagram
execution is not available to this browser harness and is not claimed verified.

The pending intro and full editor used an auto-sized dialog, so first open
resized visibly. Booking now has one viewport-bounded height for pending,
time selection and guest details, using the stable small viewport height.
Intro typography is available with the existing small booking stylesheet,
before optional organizer styles arrive. No extra wrapper or animation is added.
Back reset the non-scrolling sheet body; the actual dialog was the scroller.
It now resets that same dialog. Selecting a time reveals Continue with native
nearest scrolling, without moving focus, reading the source again or waiting.

The live public document captured 15,850,304 uncompressed bytes. Its carried
navigation used 9,939,283 serialized bytes; the profile seed used 2,456,221.
After parsing, those serialized DOM copies were still retained as well as the
parsed data. The profile now releases its adopted seed; navigation clears its
text but preserves the EMPTY router marker required by Receipt Back. Repeated
initialization safely ignores that marker. This is not clearing proof objects,
account data or the retained public catalog.

Build-time interning shares repeated public HTML tokens through the existing
style/markup table. Runtime expands and retains only a visited destination's
exact head/body. All 148 captured destinations reproduce exactly; aliases,
retained workspace DOM, data and requests are unchanged. The captured document
falls to about 12.42 MB before transfer compression, about 22% less. This is an
HTML/JSON size saving, not a measured 22% bandwidth or iPhone load-time claim.
The existing shared public runtime gzip budget remains below 15,000 bytes.

The full initial candidate and subsequent shared-table candidate each passed
3,963 tests in 640 files; the production build, offline shell, complete source,
licensing and public navigation gates passed. Review caught the Receipt Back
marker dependency before commit; the empty-marker correction has focused
navigation/retained-account coverage and no remaining review findings. Final
build/browser checks include the user-requested Continue reveal.

The final direct browser loop observed a 660 px dialog before the first offered
times arrived, after they arrived, in guest details, after Back, and after
close/reopen. The chosen time remained selected and Continue was visible after
selection. No appointment was submitted. The existing inline indicator appears
only during a real initial wait; it has no minimum-duration timer, fetch or
retained-calendar overlay. An earlier temporary preview mixed its working
directory and asset root; that harness was corrected before this direct loop.

Follow-up request retained separately: replace text Insights entry with a quiet
icon; public visitors receive the existing public Insights, while owners get a
deeper chart dashboard using their existing permitted analytics. No new private
analytics capability or dashboard is represented as finished in this fix.

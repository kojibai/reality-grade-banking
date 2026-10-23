# Loading invariants

Available source data belongs in the initial presentation. Background discovery
must improve that presentation without making it wait, disappear or restart.

These are engineering requirements for every surface, including authenticated
and public views. They apply from the first source response through retention,
first paint, interaction, refresh and return navigation. New work must preserve
them and include regression evidence for any boundary it changes.

## Preserve available data

- Carry the bounded public fields a surface needs through every projection:
  source response, shipped snapshot, server-rendered seed and client model.
  Do not discard a field to make one payload smaller and then fetch it again
  to finish the same view.
- Keep source identity intact. Reuse a proof field only for its matching asset,
  original digest and proof coordinate. An absent field must remain explicit;
  never manufacture evidence to fill a presentation gap.
- Reuse the retained source and its admitted result. Network refresh must not
  gate a complete retained frame or repeat verification of identical bytes.
  New or changed sources still require their existing admission checks.
- Keep private identity material and complete works out of public discovery.
  Carry the necessary public fields and exact references through the existing
  bounded projection.

## Reuse through the complete interaction

| Boundary | Required behavior |
| --- | --- |
| Source to model | Preserve the available permitted fields and their exact source binding. A later request must not repair a field the same response already supplied. |
| Retention to first paint | Publish the scoped retained frame directly. Restoration and refresh must preserve older history and cannot replace known values with an empty loading frame. |
| Shared data preparation | Coalesce an in-flight read. Reuse its parsed source and admitted result across consumers. Do not download the shipped fallback again when a usable source is already retained. |
| Categories and navigation | Prepare grouping, funding relationships and category lists when their inputs change. A category tap selects a prepared list; it does not rebuild the entire Ledger or start discovery. |
| Record and panel opening | Use the selected held record, existing relationships and digest-bound original inspection. Render requested detail directly; keep closed nested trees, full JSON formatting and unrelated media outside that interaction. |
| Local display clock | Evaluate only the displayed scope. A standalone asset does not require recalculating every other asset each second. Returning to a collection uses the same retained operands at the current pulse. |
| New source or refresh | Adopt additions and changed permitted fields without clearing the held presentation. Preserve existing refresh, source admission, conflict checks and completeness rules. |

The reuse key includes the source and identity scope, not merely an asset label,
amount or claimed digest. Display retention does not establish ownership,
spending authority or the freshness of financial terms. Required checks for a new
original or a financial action remain in place. A loading optimization cannot
change payment rules, pricing, continuity, privacy or recovery.

Before adding a request, parser, verifier, index or render dependency, identify
which input is missing or changed and why the existing retained result cannot
serve it. If no input changed, reuse the existing result. If an input did change,
update only its affected scope. Do not add production conformance checks,
profilers, delays or timers to enforce this document.

## Keep passive work outside document loading

- Render the selected artwork, owner portrait and existing controls immediately.
  Do not mount unseen collections or preload unused linked-profile images.
- Prepare linked profiles after document loading and the initial settled frame.
- Passive media metadata must not hold the document's load event open. Keep the
  same native element and source available to Play immediately; prepare metadata
  after document loading without reloading or replacing that element.
- Reuse one in-flight read and one media element across inline/full views and
  proof-side flips. Do not add another request, decoder or player for the same
  source.
- When the source already supplies a permitted public audio/video playback role,
  mount its native streaming player directly. Never make playback await a complete
  Original download, proof inspection or a bounded file-reader allocation. Keep
  the access policy, exact source binding and independent inspection intact.
- Keep conformance suites and optional evidence inspection outside ordinary
  presentation. A loading optimization must preserve financial rules, required
  source verification, permissions and recovery.

## Regression evidence

The October 23 cold-asset correction in commit `9be7a08` addressed two separate
causes. The shipped discovery snapshot omitted public proof fields already
available in the existing source, so a cold proof back depended on later
discovery. Those fields now travel with the initial selected asset. Separately,
eager audio metadata delayed the browser's document load despite an already
visible player. Passive preparation now follows document loading.

The data correction added manifest fields to 1,679 exact-source matches without
changing existing prices, ownership, membership, ordering or playback addresses.
It added no runtime lookup. Genuinely absent source evidence remains absent.

With the same injected 1.2-second audio response delay, desktop Chrome document
load measured 1.58 to 0.40 seconds at 390px and 1.35 to 0.32 seconds at 1440px.
Each case made one media request and retained the same working audio element
through full-view open/close. These are controlled browser measurements, not
physical-iPhone or production latency guarantees.

A follow-up audit found the same coupling in passive public video when the
player mounts before a slow cover finishes. With a 350ms cover delay and a
1.2-second video response delay, document load ended at 1.44 seconds, following
the video response at 1.41 seconds. Public video and retained original video
now share the same [passive preparation boundary](../src/features/media/usePassiveMediaPreload.ts)
as audio. Explicitly requested autoplay retains its immediate preparation;
native controls, source URLs and the existing element remain intact.

A subsequent public movie exposed a separate routing error: its 18,208,230-byte
QuickTime Original was sent through the 16 MiB complete-file reader because the
self-contained streaming selector supported sealed audio but omitted video.
The existing source already returned `video/quicktime` and `206 Partial Content`
for byte-range requests. The same guarded streaming selection now handles video;
20 exactly matched public video rows carry their available playback metadata in
the shipped source. Playback uses the native stream without a complete-file size
allocation. The file-reader limit and independent Original verification remain
unchanged. Passive preparation still follows document loading, while native Play
starts directly. This removes an application download prerequisite; network speed,
media layout and browser codec support still determine when frames can play.

The first-response proof fields and immediate Play/late-metadata behavior are
covered by [asset-preview.test.ts](../tests/asset-preview.test.ts) and
[proof-media-view.test.tsx](../tests/proof-media-view.test.tsx).
[asset-media-embed.test.ts](../tests/asset-media-embed.test.ts) also checks the
guarded sealed-video stream, shipped cold-load source and lightweight player.
The [production browser gate](browser-regression-checks.md) separately protects
image request counts, deferred profile preparation, retained navigation, controls
and the installed offline shell.

The Ledger and selected-asset follow-up removes three concrete repetitions:

- Both Ledger surfaces use the retained valuation source without requesting and
  parsing the 3.4 MiB shipped fallback again. The existing live read and refresh
  schedule remain. Empty retention still opens the shipped fallback beside the
  live read.
- Public Ledger category taps select prepared payment groups, matching the
  authenticated Ledger. A 500-record regression previously classified all 500
  records again on each tap; category selection now performs no collection
  classification. Visible rows still render normally, and search still examines
  the selected records and their execution witnesses.
- A standalone asset evaluates only its own local price while retaining the
  complete catalog and continuing existing discovery. The collection resumes
  full pricing on return without another read. With the same 4,256-item shipped
  catalog, a desktop Node arithmetic benchmark measured median 11.606ms for the
  previous full pass and 0.046ms for the selected pass (50 samples after 10 warmup
  passes). Selected and full-collection results matched the previous evaluator.
  These measurements cover arithmetic, not browser paint, phone tap latency or
  production network time.

[ledger-value-source.test.tsx](../tests/ledger-value-source.test.tsx) checks retained
first presentation, fallback requests and continued live refresh.
[ledger-render-work.test.tsx](../tests/ledger-render-work.test.tsx) checks category
selection, row opening, retained grouping and closed details.
[ledger-proof-reuse.test.tsx](../tests/ledger-proof-reuse.test.tsx) checks that media
and inspection share the same read and admitted original, including reopening.
[public-market-hook.test.tsx](../tests/public-market-hook.test.tsx) checks local
selected pricing, collection return without another read and source refresh.
[public-catalog-live-change.test.ts](../tests/public-catalog-live-change.test.ts)
checks selected evaluation and preservation of the other retained rows.

For loading changes, test a fresh browser with discovery and passive resources
delayed. Check the initial rendered fields, document load, resource timing,
request counts and actual controls separately. A warm cache or a screenshot of
an already visible page cannot establish that document loading is settled.

Public profiles follow the same boundary. Eager images in a server-rendered hidden
tab still generate image preload hints; eagerly preparing every retained grid
cover also keeps document loading coupled to offscreen media. In the square
two-column collection, only the first four covers prepare eagerly. Early streamed
image hints have the same four-cover budget. Other covers and activity thumbnails
use native lazy loading, with their existing slots and URLs available immediately.
The natural-height single-column collection keeps its existing eager policy to
preserve its image geometry. No retained rows, profile fields or history are
dropped, and scrolling or changing sections requires no additional profile read.
[profile-view.test.tsx](../tests/profile-view.test.tsx) protects the actual rendered
preload boundary, feed expansion and column controls;
[profile-preview.test.ts](../tests/profile-preview.test.ts) protects early streamed
hints alongside canonical routing, tracking parameters and source-read counts.

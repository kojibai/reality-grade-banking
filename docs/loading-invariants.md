# Loading invariants

Available source data belongs in the initial presentation. Background discovery
must improve that presentation without making it wait, disappear or restart.

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

## Keep passive work outside document loading

- Render the selected artwork, owner portrait and existing controls immediately.
  Do not mount unseen collections or preload unused linked-profile images.
- Prepare linked profiles after document loading and the initial settled frame.
- Passive audio metadata must not hold the document's load event open. Keep the
  same native element and source available to Play immediately; prepare metadata
  after document loading without reloading or replacing that element.
- Reuse one in-flight read and one media element across inline/full views and
  proof-side flips. Do not add another request, decoder or player for the same
  source.
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
the video response at 1.41 seconds. The remaining path is
[ProofStreamingVideo.tsx](../src/features/media/ProofStreamingVideo.tsx).
Its correction must preserve explicit Play/autoplay and the existing native
controls; the audio commit above does not include that separate correction.

The first-response proof fields and immediate Play/late-metadata behavior are
covered by [asset-preview.test.ts](../tests/asset-preview.test.ts) and
[proof-media-view.test.tsx](../tests/proof-media-view.test.tsx).
The [production browser gate](browser-regression-checks.md) separately protects
image request counts, deferred profile preparation, retained navigation, controls
and the installed offline shell.

For loading changes, test a fresh browser with discovery and passive resources
delayed. Check the initial rendered fields, document load, resource timing,
request counts and actual controls separately. A warm cache or a screenshot of
an already visible page cannot establish that document loading is settled.

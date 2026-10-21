# Asset object and live-player manifest

The shared Market detail and standalone asset page now use one lightweight CSS
3D object. The front retains the existing SDK media reader and its mounted media
element. The back displays the same field set as Receiz's
`app/lib/profile/proofManifest.ts` and the back of
`VerifiedOriginalPlayerExperience.tsx`: coordinate, pulse, verification path,
circuit, Groth16 identifier, Poseidon commitment, claim and media SHA-256,
attachments and their hashes, PBI signature, offline verifier and verification
key. Absent source fields remain explicit. Display fields do not claim verified
ownership or financial authority.

The existing public membership read carries these bounded fields. Discovery
keeps compact inputs; manifest rows are created only for the selected object.
Flipping performs no new original fetch or verification. A previously opened
SDK original supplies its existing digest-bound inspection. Complete original
verification and offline-proof download remain available under the back's
details control, using the existing shared inspection and pending-read cache.
Artwork follows Receiz's existing media-kind cover priorities and scoped public
URLs; an artwork URL never identifies or verifies an original.

The flip control supports keyboard input and horizontal mobile swipes. Native
audio/video controls, links, sliders and form controls keep their interactions;
vertical swipes scroll normally. Floating pauses when hidden, offscreen or
interacting. Reduced motion disables floating and transitions. No animation
framework, audio analyzer, polling or additional service was introduced.

## Verification

`tests/browser/asset-object-mobile.html` is gated behind an isolated harness so
opening the fixture alone fetches no original. Its media and artwork are
synthetic; production proof claims were not tested using those mocks. The
browser report is `2026-10-20-asset-object-browser.json`. At 320, 390, 430 and
1280 CSS pixels it records no overflow or browser errors, 13 complete manifest
rows, keyboard flips, horizontal touch flips, uninterrupted vertical scrolling,
reduced motion, and the same audio element continuing to play. One synthetic
open was used, with zero original or external requests. Screenshots were
visually inspected and retained outside the source tree in
`/private/tmp/bankeiz-asset-object-qa-2026-10-20/`.

Focused asset/media/manifest tests passed 57 tests in 10 files. These checks
establish rendering and interaction behavior, not a live financial purchase,
new ownership, or independent verification of a remote asset.

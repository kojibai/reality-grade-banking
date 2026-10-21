# Public asset media qualification — October 21, 2026

Scope: image-first standalone presentation, older canonical media carriers and
inline shared audio. Tested against the local production build at
`http://127.0.0.1:5489` using Chrome and the existing public Receiz sources.
No account, payment, message, custody or production configuration was changed.

## Sources and boundaries

- Reported older image: `profile:bjklock:bb1da653-d345-40c9-aba9-bc0bd923b994`.
  Artifact SHA-256:
  `fe8dc98c87c6e6431886cc8b7491ed8370b8cca8f0dae5e6aa891a4be471b027`.
  Its bytes pass the included v129 canonical read verifier; the narrower SDK
  append/admission opener rejected this older carrier. Presentation now uses
  the same canonical read contract as independent proof inspection.
- Newer image: `profile:bjklock:3f507095-b264-4606-916b-34f86c506ba3`.
  Artifact SHA-256:
  `d4e40d9ececcc01cd5de77dc340081cb386dbcb68a42c5a7040a7ec1edeab8b1`.
- Audio: `profile:bjklock:b63e1e2f-62e7-41d8-a769-3a76400f95e0`,
  **I BUILT THE BRIDGE**. Artifact SHA-256:
  `fccde6f0bf726568cecff7a85648b5858e69bcb027fc2eb3eae93b8d9173753e`.
  Existing discovery explicitly marks playback ungated and identifies the
  self-contained MP3 and its exact public material coordinate. The unprepared
  playback alias returns 404; the separate paid download returns 402. Neither
  is used as a fallback to manufacture playback access.

All preview metadata remains a public display projection. Canonical success and
the exact selected artifact digest remain necessary before payload display is
marked verified. Financial admission, signatures, custody, consumption and
antirollback are unchanged. No files under `native/` or the Receiz checkout
were edited.

## Browser observations

| Check | Observed result |
| --- | --- |
| Older and newer image, 390 × 844 | Actual image displayed; canonical verification succeeded; no overflow or application exception |
| Older image, 1280 × 900 | Actual verified image displayed; no overflow or application exception |
| Receipt and proxy requests for each image | Zero |
| Image preload and verifier read | Same immutable public URL; one image-body transfer per page, second read transferred zero bytes in Chrome network tracing |
| Real public MP3 | HTTP 206; playback advanced; 272.8-second duration; seek to 30 seconds succeeded |
| Normal shared URL | Returns standalone HTML; player is a separate advertised view |
| Small embedded audio controls | Fit 380 × 180, 320 × 180, 320 × 94 and 320 × 90; synthetic playback tested without autoplay or eager media load |
| Explore → asset → Explore → another asset | Restored 1,382-pixel scroll position and search/category; new asset starts at top; evidence styling retained |
| Discovery during retained navigation | One initial membership request and one initial quote request; no additional discovery reads for the transitions |

The existing public snapshot retains source identities, original digests and
titles. It corrects 1,403 image artwork URLs from already-carried source fields,
adds public gating/MIME descriptors for 99 audio listings and changes six
unprepared audio descriptors to their existing exact material URLs. The other
93 public storage/preview stream addresses remain unchanged.

## Regression coverage

Automated tests cover source restrictions, gated or mismatched audio, prepared
and legacy playback preservation, image-versus-receipt priority, pre-verification
status, canonical failure and digest mismatch, in-flight proof reuse, inert
document rendering, and exact installed-verifier hash cache selection. The
production build checks native source integrity, source publication, licensing,
public metadata and offline shell integrity.

Final automated suite: **323 files / 1,932 tests passed**. Type checking passed.

## Limits

Chrome desktop engine with a mobile viewport is not iPhone Safari/PWA or
iMessage qualification. Actual Messages inline presentation remains a deployed
link/device check. The external Receiz profile URL was working when sampled;
its route can present unavailability after a failed cold lookup. The reported
transient PWA-only failure was not reproduced, and Bankeiz's external URL and
navigation behavior were left unchanged.

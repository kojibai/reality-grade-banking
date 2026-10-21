# Legacy public image qualification — October 21, 2026

Reported object:
`profile:bjklock:d2c011bf-2e26-4d00-91d9-aed2f629e7d6`,
**THEY FOUND THE THOUGHT. I BUILT WHAT REMEMBERS IT HAPPENED.**

Its existing discovery lists `material: null`, a public PNG image and a separate
sealed Original download. The latter returns HTTP 402 with
`payment_required`, `kind: original` and `amountCents: 599`. This is a source
access policy, not a failed cryptographic verification. Newer objects with a
public self-contained material package can read that exact package independently
of the separate Original-download sale.

The correction keeps public image viewing separate from acquiring the sealed
download. Market and standalone asset presentation reuse the already-carried
public image for the existing fullscreen/zoom controls. The new selector applies
only to image listings whose original remains the legacy profile-download URL;
self-contained public material continues through the existing canonical reader.
Receipt artwork, unsafe URLs, audio and held sources do not enter this image path.

Public-image presentation is labeled accurately and does not publish an
original-verification report, payload digest, ownership claim or financial
authority. Full text still opens from the existing canonically verified public
record, bound to the selected post, original digest and exact text hash. No
Receiz host, SDK source, custody or financial rule was changed.

## Browser evidence

Local development build at `http://127.0.0.1:5448`, Chrome with 390 × 844 and
1280 × 900 viewports. Reduced motion was enabled because the existing decorative
floating animation prevents Playwright's pointer-stability wait from settling;
product motion was not changed.

| Check | Result |
| --- | --- |
| Exact reported image | Public image loaded; no media-opening failure |
| Fullscreen and zoom | Opened immediately using the same URL; 150% zoom worked |
| Extra data requests when enlarging | 0 |
| Sealed-download requests during image/text use | 0 |
| Image transfer during the flow | One successful 200 response; image bytes were reused for enlargement |
| Public full text | 29,233 characters, canonical verification succeeded; one requested record read |
| Original-verification badge on preview | Absent, as required |
| App exceptions | None |

Focused regressions cover preview selection, unsafe/receipt exclusions,
fullscreen/zoom, public text retry without a download-sale fallback, source
HTTP 402 classification, its sanitized uncached relay response and inspection/download messages. Full suite:
**324 files / 1,938 tests passed**. Live iPhone PWA presentation remains a check
of the deployed commit; desktop Chrome with a mobile viewport is separate evidence.

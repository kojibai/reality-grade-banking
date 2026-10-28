# Create asset qualification — 2026-10-28

## Scope and environment

Exercised the real Bankeiz mobile interface at 390 × 844 in isolated Chromium,
using a fresh test account created through Enter. The corrected production
build was served to that browser under the Bankeiz origin; publication requests
went to the live service. No existing user's identity was opened, no money
moved, and no PBI signature or Market funding was submitted.

This qualifies creation and public delivery of an unfunded Original. Physical
Face ID/PBI and live-money backing are separate operations and were not tested
on a physical device here. This is not an iPhone Safari or installed-PWA test.

## Failures reproduced and corrected

1. The publication adapter passed `await sealer.enroll()` as signing custody.
   That SDK method returns `void`, producing the observed `privateKey` error.
   The adapter now enrolls once and loads the existing local enrollment, using
   the same path as Note sealing. Missing custody remains an explicit failure.
2. The standalone publication bundle accessed public Node environment settings
   in a browser. Its reproducible build now supplies the four canonical public
   defaults. The included native source, pinned roots and proof rules are
   unchanged. A regression imports the shipped bundle without a `process`
   global.

3. A cold public asset link waited for global Market discovery and returned a
   live function timeout. Profile assets now use the existing anonymous
   verified-Original endpoint for their exact profile and Original ID. Reads
   coalesce, their cache is bounded, and a missing/private/mismatched response
   clears the expired exact item instead of restoring an older one. The same
   pure projection still serves normal profile rows.

Regression tests reproduced the failures before their fixes and passed
afterward. Existing proof-verification tests are preserved unchanged.

## End-to-end evidence

Created **Bankeiz creation verification 2026-10-28** with a title, description,
original image, cover image, CSV attachment and full text. The publication was
accepted, the result offered its asset link, and Save original proof downloaded
the exact sealed Original.

The installed SDK independently verified the downloaded proof and recovered
the complete `receiz.bank.asset-content.v2` manifest, including the authored
text, all three file descriptors and original Kai pulse **14873317**.

| Material | Bytes | SHA-256 |
| --- | ---: | --- |
| Sealed Original | 6445 | `dd08e68387f10c8a81cbe2a302241564d69fc7b6e755cc6eb30809024d5c9976` |
| Original image and cover | 15908 each | `714de7c0d8f4178d83f8cf833dd4c95b8fee0d76eb5376eb677e2e1320204be6` |
| Attachment | 50 | `bd1e53fca3dd7e79aaa82a6bece413fbe3d9f0a76ad03ee0329a9ecd845d6055` |

Unauthenticated public downloads returned HTTP 200 and matched each hash.
After closing and restarting the browser, Assets reopened the Original and
displayed its image. Saving again produced identical proof bytes. Repeating
the retained-asset opening with networking disabled also displayed the image
without JavaScript errors; the test harness supplied the built static shell.

The logged-out public page also displayed the same Original and artwork.
After the direct-read fix, a cold browser measured **1434 ms** to first paint
and **1438 ms** to interactive hydration, with exactly one anonymous Original
request and no server global-discovery request. The existing exact endpoint
returned its public record in **594 ms** in a separate read.

## Timing and limits

Two controlled publications completed in **64.6 seconds** and **60.4 seconds**
from Create asset to the accepted public result. The second trace included a
34.4-second final publication request. Supplying canonical resource aliases
in the test browser did not remove the delay; those aliases were not added as
a speculative product fix. This qualification does not claim instant public
delivery or resolution of the separately observed background account-source
503 responses and optional native resource/signer 404 responses.

## Regression verification

- 150 focused Bankeiz creation, media, backing, result, signer-adapter,
  public-preview, profile and proof-verification tests across 27 files.
- Actual native publisher, media-capacity and backing-writer contract tests.
- Exact native composition and SDK rebuild from the included sources.
- Complete `npm run build` using the versions in `package-lock.json`.
- Independent scoped code review: no blocking findings.

No production deployment was performed. The corrected Bankeiz build must be
pushed before normal visitors receive these fixes.

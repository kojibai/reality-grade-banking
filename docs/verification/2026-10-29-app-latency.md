# Six independent preparation waits

Date: October 29, 2026. Base: Bank main 722c377.

## Scope

The user authorized all six concrete findings from the app-path latency audit,
with the same product, no redundant requests, no account-entry changes, and a
scoped commit on latest main. The patch overlaps existing work after explicit
intent. It adds no endpoint, polling, model/prompt change, permission, SDK,
provider, SQL, stylesheet, markup, login preloading or proof authority.

- Business and money tools load their existing code beside their existing
  accepted-owner connection. Construction still checks the same owner/lifetime.
- Profile code loads beside its existing connection. Full and compact photo
  updates process the selected image beside API preparation. Upload waits for
  both; a changed owner cannot submit the old image.
- Asset publication loads code beside receiving-name preparation. The native
  producer, offline SDK code and publication runtime then load together after
  accepted owner access. Enrollment, signer custody, actual sealing, retention,
  PBI, publication and local admission remain in their existing implementations.
- Certificate list/detail starts beside its local checkpoint. Successful pending
  checkpoint state immediately exposes the existing recovery controls, even if
  the independent read waits or fails. Detail/list presentation still requires
  checkpoint success and the current component lifetime.
- Opening a local public proof reads its selected exact bytes beside inspector
  code. The unchanged enclosing verifier still determines admission. The size
  guard remains before either operation.
- Independent mesh peer offers prepare in batches of at most four. Each peer's
  offer, local-description and signal sequence remains ordered. End prevents
  later batches, preserves the terminal call and stops media. A failed offer
  releases all already-created peers through the existing cleanup path.

Existing successful paths issue the same requests once. Preparing independent
branches concurrently means one existing preparation can begin before a sibling
fails; that cannot submit an upload, execute a tool, publish an asset, admit a
proof or authorize a certificate operation.

The separate ownership work already handles held Assets reopening. It is not
part of this patch. The native account-connection bank-kai resource candidate is
excluded; frozen account entry remains unchanged.

## Controlled before/after measurements

These exercise the actual adapters/controllers with controlled IO and code
availability. Module delay is 200 ms; existing connection delay is 150 ms.
Each of six separate peer signal responses takes 200 ms. Performance.now()
records completion after explicit operation intent, not account login or model
generation. These samples are not production-network latency promises.

| Path | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Business preparation | 359 ms | 208 ms | 151 ms / 42% |
| Money tools preparation | 360 ms | 208 ms | 152 ms / 42% |
| Profile API preparation | 357 ms | 206 ms | 151 ms / 42% |
| Publication preparation | 358 ms | 211 ms | 147 ms / 41% |
| Six independent mesh peers | 1,231 ms | 425 ms | 806 ms / 65% |

Before, module loading began 151–153 ms after intent. After, it began at 0–3 ms.
Mesh concurrency increases from one to four and remains bounded. Ordinary
regression tests use held promises and ordering assertions, not timing limits.
Measurement output is enabled only by BANKEIZ_LATENCY_EVIDENCE.

## Contracts and review

New ordering tests failed at the audited original-code boundaries before the
patch. Corrected mesh membership/terminal-ack fixtures were rechecked against
original code: both serial-start and post-End late-peer assertions failed.
Targeted 81 tests passed before review. The final direct ordering/call run
passed 45 tests after review corrections.

The independent source review identified an Important certificate regression:
placing pending presentation after Promise.all let remote read success gate
local recovery. The new held/failed-read test reproduced it, and the correction
passes. A separate test ensures failed checkpoint admission withholds details.

The review's later-batch cancellation coverage issue was regraded Important:
End must prevent new connections. The test now has six remote peers. Removing
the batch's cancellation guard creates six peers instead of four and fails;
with the guard restored the same test passes. No test was weakened.

The reviewer found no additional source defect in the owner guards, rejected
promise handling, unchanged enclosing verifier or per-peer signal sequence.
Hosted publication, actual production account state, and physical-device
behavior were outside that read-only review. Those are not implied by local
verification. Quick Profile owner replacement and API-then-image rejection
were source-reviewed guards, not separately executed browser cases.

## Qualification

- TypeScript: passed.
- Native account-entry freeze: 57/57 passed; no native code changed.
- Complete Bank suite: 4,394/4,394 passed across 702 files; no failures or skips.
- Complete production build: passed through final offline, source-archive,
  conformance, licensing, public-page and hosted-checkout checks.
- Before/after phone panels (390 × 844): full and compact photo updates,
  certificate detail and invalid proof-file rejection passed. Existing styles
  are included; each of four final before/after PNG pairs is byte-identical.
  One photo update/read occurred per intent; no overflow or page errors.
- Three actual local RTCPeerConnection controllers: all connected with two
  remote streams each; End closed all peers and stopped all tracks. Signaling
  and canvas media were synthetic; this is transport evidence, not a hosted
  call or a visual claim about video playback.
- Existing meeting browser gate: passed walkthroughs at 320, 390, 440, 768
  and 1,280 px, free-core follow-up/Calendar/contact controls and End, plus
  separate exact session/Identity Record downloads at 390 and 1,280 px,
  including the same-call recording retry path. No automatic download or
  duplicate End occurred. Inspected mobile panel and closeout screenshots
  confirm the existing presentation; no screenshot contradicts this patch.

The initial synthetic RTC fixture waited for canvas playback before returning
media. It was corrected to return the existing captured stream immediately and
request a frame, with bounded start/End waits. No app code or assertion was
changed for that fixture correction. A separate visual pass included the full
existing profile stylesheet before the final PNG comparison.

The initial complete-suite attempt was interrupted for the review correction.
Its two local HTTP cooperative-preview tests could not complete with restricted
loopback access. Both passed in 160 ms once loopback was enabled; no production
handler or test assertion was changed for that environment restriction.
Happy DOM emits existing disabled-script/iframe diagnostics for embedded
qualification fixtures; these are not product warning copy.

## Evidence and boundaries

External-to-repo evidence: /private/tmp/bankeiz-app-latency-before.jsonl,
/private/tmp/bankeiz-app-latency-after.jsonl, /private/tmp/bankeiz-app-latency-ui,
/private/tmp/bankeiz-latency-review-green.log,
/private/tmp/bankeiz-certificate-review-red.log,
/private/tmp/bankeiz-mesh-corrected-red.log,
/private/tmp/bankeiz-later-batch-mutation-red.log,
/private/tmp/bankeiz-app-latency-entry-freeze.log,
/private/tmp/bankeiz-app-latency-final-tests.log,
/private/tmp/bankeiz-app-latency-build.log,
/private/tmp/bankeiz-app-latency-browser-styled.log,
/private/tmp/bankeiz-app-latency-ui/report.json,
/private/tmp/bankeiz-app-latency-ui/report-rtc.json,
/private/tmp/bankeiz-app-latency-meeting-browser.log,
/private/tmp/bankeiz-app-latency-meeting-evidence.

Browser execution used local Chromium and synthetic account/transport fixtures.
Physical iOS, Instagram's in-app browser and production account/provider state
were not exercised by this patch.

No live message, model request, customer Calendar write, real photo upload,
identity enrollment, payment, asset publication, provider grant or production
mutation is used for this qualification. No stronger proof, identity, local
checkpoint or native result is replaced by weaker request/session/UI state.

# Login progress and setup

The sign-in screens, account selection, consent, canonical identity admission, source checks, device custody and temporary PBI session cleanup retain their existing behavior. No financial operation or production configuration changes are part of this patch.

## Retained changes

- PBI loads its independent SDK, proving resources and offline runtime together. Its system ceremony already starts concurrently and keeps that behavior.
- PBI reports the real identity checkpoint after canonical opening and device-binding checks, before preparing account history. The hook ignores checkpoints from a withdrawn entry.
- PBI already prepares and checks the recovered account before saving custody. The hook reuses that exact complete known frame instead of preparing it again. Incomplete PBI frames fall back to preparation. Ordinary Identity Record import and authenticated restoration keep their existing preparation paths.
- The existing two-pixel progress bar shows a moving activity cue while work is pending. Its accessible 0/1/2 checkpoint values remain real; completion stops the cue. No JS progress timer, artificial percentage or minimum waiting time was added. Reduced-motion mode remains static.

## Actual timing measurements

Baseline: `bf5e08c`. Twelve fresh Node 24 processes per version, alternated before/after, with the full test runner stopped. The PBI phase ran the actual SDK/offline-runtime/resource-loading code and the same 65,075 public resource bytes from loopback HTTP, without an artificial network delay. Measurement ended before signer enrollment. The Identity Record experiment used the previously approved Record locally and printed no account payloads or identifiers.

| Measured preparation phase | Before median | Candidate median | Result |
| --- | ---: | ---: | --- |
| PBI SDK, runtime and proving-resource setup | 80.71 ms | 77.78 ms | 2.93 ms saved, 3.63% of this phase |
| Identity Record inspection and byte handoff prototype | 68.28 ms | 68.58 ms | No measurable improvement; prototype removed |

Final-patch PBI sample ranges were 78.33–116.28 ms before and 75.73–88.56 ms after. An earlier quiet run measured 77.95 → 72.07 ms; the repeats support a small setup improvement, not a large or fixed whole-login saving. Identity Record ranges were 65.03–72.50 ms before and 63.94–74.88 ms for the rejected candidate. An earlier run overlapped the full test suite and was discarded because CPU contention distorted its timings.

The shipped Identity Record entry code remains unchanged. Both entry methods receive the progress-bar correction. Tests also establish that complete PBI entry reduces account-view preparation from **two calls to one**; no additional millisecond saving is attributed to that change.

These are local preparation-phase measurements, **not complete login durations or physical iPhone measurements**. They exclude canonical artifact admission, signing, Face ID interaction, custody storage, remote account/history requests and final account paint. PBI setup already overlaps the system ceremony, so this measured phase reduction does not establish an equal reduction in total user waiting time.

## Regression boundaries

The focused tests preserve cancellation, account mismatch rejection, complete historical account paint, ordinary import/resume preparation, incomplete-frame fallback, retained custody, and late-result disposal. The production browser gate renders the actual opening component with normal and reduced motion, checks moving pending activity and stationary completion, and performs no account requests. It is included in `npm run test:browser`.

Fresh verification results:

- Main plus only this patch: **3,079 tests passed**, 493 files, zero skipped.
- Shared working tree, including the other developer's current changes: **3,089 tests passed**, 495 files, zero skipped. This run allowed the loopback listening required by the new streaming tests.
- Typecheck and the complete production build passed.
- Existing production browser, chart-period layout, and new opening-progress gates passed. The final activity cue remains within its existing track, moves during all pending phases, stops at ready, and respects reduced motion.
- Fresh independent review found no production issues. Its test-harness cleanup observation was corrected; a deliberately sandbox-denied listen left zero temporary directories.

An earlier shared-tree run exposed three failures in the other developer's evolving Twin tests (`cooperative-chat-stream.test.ts` and `cooperative-preview.test.ts`). A later restricted run also denied their local HTTP server. These results were investigated rather than suppressed; the final full shared-tree run above passed. The isolated run used a normal dependency directory because a dependency symlink introduced outside-checkout source-map paths. No source-map validation or production guard was relaxed.

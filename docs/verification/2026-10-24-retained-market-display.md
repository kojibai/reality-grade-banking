# Retained Market display work

## Confirmed costs

The full shipped Explore collection was profiled in the production build at
390 × 844, device scale 3 and 4× CPU throttling in installed Chrome. This was a
local public-data run: external image requests received fixed synthetic pixels,
other external services were blocked, and no account or financial action ran.

Each recurring chart pulse cloned the same 2,933-row pricing source, 4,256-item
collection and complete retained chart back into its worker. Native
`Worker.postMessage` synchronously occupied the UI thread for 56.7, 60.8 and
54.2 ms in the baseline samples. CPU sampling located this cost in the existing
Market chart dispatch, independently of network waiting or CSS.

The initial list also requested all 47 available artwork URLs. The same images
were not requested again when prices changed: this was eager work for unseen
rows, not duplicate image fetching on every pulse.

## Surgical changes

- Each chart worker keeps its established source, collection and last complete
  history. Recurring work sends only request ID, pulse and a tick marker.
- A changed source or collection sends the complete inputs again. Worker
  replacement/foreground recovery and rejected publication reset this handoff.
  Failed replacement inputs cannot silently advance the superseded source.
- The actual history builder, valuation equations, complete-result admission,
  history retention, once-at-a-time queue and stale-result checks remain.
- The leading six Market/Explore rows retain eager artwork loading. Later rows
  use native browser lazy loading. URLs, original image selection, decoding,
  error fallback and existing image nodes remain. Other artwork consumers keep
  their prior eager behavior.

No scroll listener, observer, CSS layer, network endpoint or financial execution
path was added. No shared CSS or proof-object effects changed.

## Measured result

| Boundary | Baseline | Updated |
| --- | --- | --- |
| Recurring worker input copy | 54.2–60.8 ms | 0.0 ms recorded in both samples |
| Image requests in the same short scroll flow | 47 unique | 16 unique |
| Updated image requests before scrolling | — | 7 |

The copy result is below the timing resolution; it is not a claim that every
application update or all browser painting takes zero time. The worker still
calculates and publishes current values. Initial/changed operands still cross
the worker boundary, and every completed display snapshot is still admitted.

The optimized real worker produced exactly the same complete history as the
full-input path for successive pulses and a replacement source. All six
intervals retained the completed amount at their current endpoint. The artwork
regression confirms that value changes keep the same image nodes and URLs.

## Checks and evidence

- New regressions failed before their implementations. The affected hook,
  worker, hydration and Market tests passed: 42 tests.
- Full suite: 2,996 tests in 485 files passed, zero skipped.
- Full production build passed, including source inventory, public routes,
  Conformance isolation, license notices and complete offline-shell checks.
- The built browser gate passed at 390px and 1440px, including eager direct-asset
  artwork, no unused direct-asset image loads, retained return, copy feedback
  and installed offline-shell launch.
- Independent code review found no material issues and reran 36 affected tests.
- The React review preserved hook ordering, worker cleanup, request IDs and
  existing accessible image fallbacks; it adds no dependency or loading UI.

Browser plugin not available: browser checks used installed Chrome through
Playwright. The full-data probe served production files on an isolated local
HTTP port; `/explore/` was the measured route. Logs, CPU profiles and screenshots
are outside the repository in `/private/tmp/bank-scroll-paint/`, including
`value-payload-before.log`, `value-payload-after.log`, `image-before.log`,
`image-after.log`, `retained-value-full-tests.log` and
`retained-value-browser-gate.log`.

## Mobile confirmation and regression boundary

On October 24, after this change, the user confirmed that the intermittent
mobile page blanking was fixed: “that was exactly it … yes was definitely
the issue and the fix.” This is the user's actual-device observation; the
local Chromium measurements above independently establish the removed work.
The plain-list symptom was not reproduced in the desktop test environment.

Preserve both boundaries: recurring value updates reuse worker-held inputs,
and offscreen list artwork does not all load eagerly. The real-worker and
hook regressions cover equivalent results, source replacement, invalidation,
restart and queued updates; the Market regression covers image node/URL
retention through value changes and the leading/offscreen loading policy.
Do not reintroduce full input copies on each pulse or eager decoding of the
whole unseen collection. No shared CSS or proof-object effects were changed.
This confirmation makes no claim about fully offline financial execution.

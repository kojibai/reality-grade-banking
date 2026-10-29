# Parallel Calendar reads and owner-tool receipt presentation

Date: October 29, 2026. Base: d623901 on Bank main.

## Scope and preserved boundaries

The user authorized removing three demonstrated ordering delays while preserving
the working experience, and requested measured reductions and a main commit.
This patch changes two existing read schedules and one receipt presentation gate.
It changes no SDK, MCP, AI Skills version, model, prompt, account entry, Identity
storage, native API, SQL, payment, approval or tool-execution contract.

- Calendar proof starts its existing selected-record request alongside loading
  the existing verifier. The same owner/event checks, exact bundle hash and
  unchanged verifier still complete before a verified result is returned.
- Availability starts its existing request alongside loading its parser. The
  exact query or automatic-timezone body, source validation, pending-read
  coalescing and accepted-source retention remain unchanged.
- Owner-tool execution starts after its existing runtime and scope are ready;
  receipt component code is no longer a prerequisite. Results enter the same
  owner/thread-held state immediately. If presentation code finishes later, one
  guarded render reveals those retained results. An empty receipt set adds no
  render. Identity replacement excludes the old presentation callback. Code-load
  failure reports a display failure without resubmitting a native action.

The existing approval/review, uncertain-operation retention, once-only tool
execution and conversation continuation remain in their existing implementations.
The receipt component carries presentation, not execution authority. No stronger
artifact or native result is replaced by display state.

## Controlled before/after measurements

The same tests delay a cold module by 300 ms. Calendar request responses take
200 ms. Actual request start, verified return and owner execution invocation are
measured with performance.now(), excluding fixture initialization. Module and
transport are real tested code paths with controlled source responses, not live
customer operations. Timings are controlled samples, not production guarantees.

| Path | Before | Final after | Removed wait |
| --- | ---: | ---: | ---: |
| Selected Calendar proof return | 532 ms | 302 ms | 230 ms / 43% |
| Availability return | 515 ms | 307 ms | 208 ms / 40% |
| Accepted Twin action to owner-tool start | 311 ms | 5 ms | 306 ms / 98% |

Before, both Calendar requests started only after their module delay (306/312 ms).
After, they started at 0/5 ms. Each path still performs one request and reuses its
held result. Both transport-order tests and the receipt-gate test failed before
the patch and passed afterward. Ordinary regression assertions use explicit
module gates, not wall-clock timing thresholds. Measurement mode writes evidence
only when BANKEIZ_OPENING_EVIDENCE explicitly identifies an output file.

The owner-tool figure measures local action scheduling after an accepted reply;
it is not the model's first-token or complete response time.

## Verification and visible evidence

- Exact isolated patch: 188 targeted tests in 18 files passed. This includes
  native organizer/cache/owner refusal, real Calendar bundle verification,
  once-only owner-tool continuation, Messages identity isolation, native Twin
  streams and appointment conversation deltas before end-of-stream.
- Complete npm production build passed: generated product/meeting guards,
  TypeScript, bundling, public/manual pages, 152 public social images, native
  source/package correspondence, matching source archive, licensing, separate
  conformance import graph and the complete offline-shell checks.
- An actual phone-sized browser uses the production Messages component with a
  controlled owner runtime. The receipt module's response is held deliberately.
  Typing feedback appears before the first reply. A real supplied delta paints
  before reply acceptance. The accepted tool starts while receipt code is still
  held, and working feedback remains visible. The final answer paints before
  receipt code is released. Once released, the held result appears, with one
  execution, two required brain turns, no page errors and no horizontal overflow.
- The final receipt screenshot was inspected. Its record and actions remain the
  existing component; no CSS or normal-state presentation was changed. No visual
  evidence contradicts the preserved Identity, proof or owner-tool boundaries.

Evidence lives outside the repo at /private/tmp/bankeiz-openings-before.jsonl,
/private/tmp/bankeiz-openings-final.jsonl, /private/tmp/bankeiz-opening-ui/,
/private/tmp/bankeiz-opening-parallel-isolated-tests.log and
/private/tmp/bankeiz-opening-parallel-build.log. The Browser plugin was absent;
the existing Playwright runtime was used. No live model, customer message,
Calendar write, payment, provider grant or production mutation was performed.
Other agents' ownership-transfer files are excluded from this patch.

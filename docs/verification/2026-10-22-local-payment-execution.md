# Transaction latency and local execution verification

Date: October 22, 2026.

## Delivered behavior

Complete Send responses use the existing strict original validator and durable
terminal retention directly. Incomplete, mismatched or lost responses retain
the original recovery read without another financial dispatch. A terminal
storage failure stays unknown and recoverable.

Accepted balance/position publication remains part of completion. Optional
chart work and refresh no longer hold an admitted retained result open. Send
publishes its absolute authenticated balance before chart preparation. Market
retains absolute inline holdings and full liquidation behavior. Identity,
revision and current-observation guards protect against delayed older results.

The entrance's passed conformance badge now reads “Conforming” with the existing
explicit “Proof and continuity checks” scope. Its link reads “View conformance
record.” Exact individual check results and failed/unavailable states remain.

## Evidence

- Adapter regressions and mounted inline/wake checks: 148 passed, one opt-in
  timing case skipped in the normal focused run.
- Fresh full suite: 407 files passed; 2,467 tests passed, one opt-in timing case
  skipped. The timing runner executes that case separately in an isolated
  process.
- Exact response mutation, terminal storage failure, lost response, duplicate
  dispatch refusal, card shortfall/delta, checkout recovery, paused chart,
  stale account/portfolio response and complete liquidation cases remain
  exercised.
- Typecheck, pinned release agreement, receiving-profile checks and native
  source/resource integrity passed.
- Fresh independent whole-change review found no actionable findings. Its
  scope excludes live funds, production latency, physical devices and positive
  local financial custody/delivery qualification.

[Critical-path measurements](2026-10-22-execution-critical-path.md) preserve the
before/after method and values. With an injected 15 ms per request and 30 ms
optional display delay, warm p50 changed from 78.85 to 32.40 ms for Send, 47.35
to 16.29 ms for Buy, and 47.50 to 16.29 ms for Sell. These are synthetic adapter
measurements, not deployed speed guarantees. Market's production callback was
already short; its fixture saving is not proof of a 30 ms production saving.

## Local execution gate

[The contract qualification record](2026-10-22-local-execution-contracts.md)
identifies the absent source/custody, funded Market effect, additive acceptance
and automatic incoming-proof contracts. The actual pinned SDK supports edge
value transfers; the current buttons are still connected transaction adapters.
No ordinary remote execution is queued and reported as a local commit.

Tasks 4–6 of the approved plan remain unactivated. No synthetic two-device
financial success harness, fabricated source/capability or positive qualification
claim was added. Existing notifications and polling are unchanged. True
network-independent Send/Market execution and immediate receiving admission
still require the documented contracts; they are not claimed by this patch.

## Implementation decisions

The timing baseline characterizes the old behavior; new behavior was demonstrated
RED→GREEN before production changes. Accepted-state callbacks remain awaited;
only the explicitly optional hook runs outside completion. Response-loss fixtures
now independently model a missing acknowledgment and an unavailable lookup, so
a complete accepted POST original remains decisive. Qualification refusal tests
exercise existing production/SDK boundaries; no unused always-false production
readiness module was introduced.

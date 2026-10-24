# Retained Ledger interaction and data reuse

The public and signed-in Ledger retain their existing records, relations,
funding evidence and scroll position. These changes remove measured duplicate
work and preserve retained interactions; financial execution is unchanged.

## Measured causes and corrections

- Activation requested the same saved original twice concurrently: once from
  synchronization and once for immediate retained display. Both callers now
  share one in-flight IndexedDB read. A later read still opens storage again;
  errors are not retained. The immediate retained-display path remains present.
- A quick Account-to-Ledger return made another live capitalization request,
  despite the existing 60-second refresh cadence. Returns now resume that same
  deadline. Expired observations and failed reads still retry; live events and
  online refresh remain enabled. Source admission and local value evaluation
  are unchanged.

## Evidence

New read-count, retry and cadence tests first reproduced the old behavior,
then passed. The final full Bank suite passed **2,899 tests in 466 files, zero
skipped**; TypeScript reported zero diagnostics. An earlier run under concurrent
work hit the existing five-second limits in `conformance-evidence-cli` and
`proof-verifier-resource`; both passed their isolated recheck and the full
quiet rerun without changing or skipping any assertion or timeout. The final
production build passed its runtime/source, licenses, offline-shell, public
metadata and dedicated-entry boundary checks.

A synthetic Chrome mobile probe at 390x844 and desktop probe at 1440x844 found:

- The original saved-original `latest` reads fell from two to one.
- A successful quick Ledger return adds zero capitalization requests.
- All six initial source/pricing requests remained six through scrolling,
  Account return, pause/resume and inspector expansion.
- Rows append from 50 to 400; existing first-row and receipt-link DOM nodes
  survive. Every sampled viewport contained visible rows. There is no in-list
  virtualization or row eviction.
- No runtime errors or external requests occurred in the controlled probe.

The user withdrew the proposed scrolling CSS work. Root/body styles, scrolling,
Console markup and entrance animations remain unchanged. The physical Safari
boundary symptom was not reproduced, and no CSS or Vercel cause is claimed.
A fresh-process IndexedDB restore is still asynchronous; the synthetic
1,000-row probe displayed retained rows at about 115 ms after mounting. This
is not a guarantee of synchronous first paint on all devices. No production
conformance, profiling or extra discovery runs were introduced.

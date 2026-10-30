# Funded negative Settlement display alignment

> **For agentic workers:** Use superpowers:executing-plans.

**Goal:** Accept and retain the native wallet summary when an existing source-value difference leaves the combined total below recorded Reserve.
**Architecture:** Preserve the native total, full Reserve, source units and zero-floored Settlement component. Apply the native `Settlement = max(0, total − Reserve)` relation to read-only summary/history validation and deterministic display projection. Do not change funding, spending, source valuation or proof admission.
**Tech stack:** Existing TypeScript wallet readers/projectors, Vitest and the production build.
**Spec:** User-authorized correction of the reproduced $500-difference/$200–$700-funded edge case. Native `projectWalletSummary` and `buildWalletValueStatesFromBalanceCents` define the existing composition. Receiz source-authority and truthful-speed laws remain binding.

## Constraints
- No native changes, migrations, requests, retries, clocks or additional valuation passes.
- Keep the complete funding record and exact total; do not cap Reserve to hide the discrepancy or manufacture spendable money.
- Keep ordinary positive/zero snapshots, source verification, Phi splits and execution behavior unchanged.
- Preserve current main and every unrelated dirty file.

## Review focus
- Smaller, equal and larger deposits against the same negative difference.
- Retained private observations and historical points survive reopening unchanged.
- Current and historical deterministic projections match native outputs and recover as source values change.
- Malformed amounts, foreign owners and genuinely inconsistent positive components still fail.
- Exact calculation details remain inspectable, with no extra first-paint work.

## Task
- [x] RED: replay actual native projector fixture through summary reader, persistence, current projection and history; cover the malformed controls.
- [x] GREEN: align the three read-only boundaries with the native zero-floor relation; retain existing totals, Reserve and Phi.
- [x] Verify focused/full tests, types/build and rendered existing balance details. Compare ordinary-account rendering and preserve all unrelated work.
- [x] Review and integrate only the scoped correction on main; report local and deployed evidence separately.

## Evidence
- Native fixture replay first failed at the summary reader and chart projector (10 RED failures). Corrected cases retain the native full Reserve, net total and Phi.
- Open-inspection recovery equality was caught by independent review, reproduced RED and corrected; existing ordinary-zero disclosure tests remain unchanged.
- Full suite: 4,520 tests passed across 723 files after the build stopped writing resources. Earlier concurrent verification was discarded because build-generated PDF resources changed during source hashing; no contracts were weakened.
- Browser: nine funded-negative cases across 320/390/768px; no API calls, console errors or horizontal overflow. Ordinary-account before/after screenshots were byte-identical at each width.
- Native future-quote Reserve cap remains unchanged; the retained funding amount and backing Phi remain exact.
- Final clean production build and scoped main integration are recorded with the completion evidence. No native or database mutation.
- Production build passed, including plain Node API imports, generated previews, source/archive checks and offline-shell checks. Independent review found no remaining blocker after the recovery fix.

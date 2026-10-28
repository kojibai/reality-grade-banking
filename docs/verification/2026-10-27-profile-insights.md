# Profile Insights qualification

Public and private views reuse the existing profile and native analytics contracts.
The public icon uses held totals, with no new profile-load request. Private analytics
are read on explicit owner opening, coalesced and retained for filters and reopening;
identity closure and replacement discard stale access and responses. Native private
analytics must be deployed from Receiz commit 3417320ca; no migration is required.

Native ratio fields remain ratios at the source and are formatted as percentages
in the panel. A failing rendered test exposed 0.5% instead of 50%; the same test
passes after the display correction. Missing listening observations remain missing.
The originals-value worker prepares after profile paint and retains one latest
curve per held collection; closed pulses submit no jobs. Its existing mathematics,
share issuance and financial rules are unchanged.

## Evidence

- 16 focused tests passed in 4 files, including rate formatting, owner isolation,
  stale responses, source validation, coalescing, filters/reopen and curve revisions.
- Full locked-dependency suite: 4,016 tests in 652 files passed, zero skipped.
- Full production build passed, including source archive and offline shell checks.
- Isolated native UI at 319px wide: public panel, owner panel, seven-day selection,
  close and reopen. The explicit native read count stayed at one. The real account
  was not used; no payment, trade or production mutation was performed.
- Initial local suite lacked loopback-listener permission for two existing HTTP
  streaming cases. The complete suite passed with loopback permitted, unchanged
  assertions/timeouts. A fixture hot reload emitted createRoot warning during local
  editing; it is not production source. Fixture files were removed before build.
- Fresh independent whole-feature review: no critical, important or minor findings.
  Unrelated meeting work and unchanged native aggregation math were outside review.

Browser evidence: /private/tmp/bankeiz-profile-insights.png (isolated fixture).
Tests/build logs: /private/tmp/insights-full-tests.log and
/private/tmp/insights-production-build.log. These local paths are evidence locators,
not distributed application dependencies or speed measurements.

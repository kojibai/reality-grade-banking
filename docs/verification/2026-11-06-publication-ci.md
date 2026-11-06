# Publication and Market recovery CI qualification

Scope: Bankeiz changes following `ec986aef28fb5419f543ce4ac20e03a3f0826632`.
Receiz SDK, MCP, AI Skills and the package lock remain at their existing versions.

## Failure evidence

GitHub run `42125293916` was green on November 5. The publication test took
29.388 seconds. In run `42139198489`, its unchanged scenario passed in 52.239
seconds, while both Market worker recovery cases exceeded their five-second
limits. The first captured publication timeout is run `42232850652`, following
the addition of fresh-module, corrupted-custody and post-commit recovery coverage.
The single integration case still had its earlier 60-second budget.

Run `42271459430` on `ec986ae` failed only that publication case at 60.024 seconds:
954 files and 6,003 tests passed; 11 optional captured-public-data cases were
skipped. Its build, typecheck and browser steps passed. These results do not
establish a production financial failure or an SDK change.

## Corrections

- The worker recovery fixture now explicitly adopts its one-row Source and
  asserts the exact outgoing operand. Earlier cases retained the full Source;
  the real hook correctly reused it, bypassing the later test's mocked fetch.
  Consequently that recovery test was calculating thousands of unrelated rows.
  Runtime recovery, arithmetic, assertions and five-second limits are unchanged.
- The publication fixture removes only its synthetic completed outbox entries
  after the pressure and exact-retry assertions finish. Every real action remains.
  The receiver fixture reuses its already derived carrier within one admission.
- The atomic publication scenario retains all real SDK, cold-restart, ownership,
  corruption and pending-commit assertions. Its scoped budget is 120 seconds to
  cover the expanded cryptographic lifecycle. It is not split into tests that
  depend on one another, and no global timeout or worker count changes.
- The application append sealer no longer derives an unused `carrier/head` after
  `admitReceizProfileShowcaseSuccessorWithPredecessorContext` has already admitted
  and checked that successor. Exact transport construction, atomic commit and
  the later consumed carrier remain. The installed SDK sources are unchanged.
  The native composition and corresponding source metadata are rebuilt through
  the existing pinned builder. Notes and receiver executable bytes are unchanged.

## Measurements and limits

Explicit fixture selection reduced the two focused recovery cases from local
full-file observations of about 2.59 and 2.36 seconds to 67 and 57 milliseconds.
This is a test improvement, not a measured application navigation improvement.

Outbox fixture cleanup reduced the retained table from 1,588,943 to 6,662 bytes.
It did not establish a wall-clock improvement: baseline 28.63 seconds versus
31.95 and 34.14 seconds in cleanup runs. Do not attribute the CI timeout solely
to those synthetic entries.

The removed application statement is one unused awaited derivation per affected
append. The generated publication module is 43 bytes smaller. No production
wall-clock saving is claimed.

Healthy same-pulse `pageshow` was also observed to recreate the Market worker.
Its existing suspended-worker restoration is preserved because real BFcache and
phone PWA survival were not established by this investigation.

The 11 ordinary CI skips require externally captured public membership, quotes,
Sports, capitalization or prepared Ledger fixtures. They are distinct from the
deterministic and real-SDK regression cases and are not newly disabled here.

## Candidate qualification

The first complete run used the unchanged production test configuration and a
fresh transform-cache directory. The publication case passed in 37.761 seconds;
all 11 Market-hook tests passed in 192 milliseconds. Two unrelated cooperative
preview HTTP tests could not bind `127.0.0.1` because the workspace sandbox
returned `listen EPERM`. That run is not reported as green: 954 files and 6,002
tests passed, two tests failed and 11 captured-data tests were skipped.

The full rerun with local loopback access passed: **955 files, 6,004 tests,
zero failures**, with the same 11 conditional captured-data skips, in 234.70
seconds. The publication case took 31.326 seconds, the entire Market-hook file
186.6 milliseconds, and the HTTP file 34.8 milliseconds. No HTTP test or timeout
changed. Both runs used the lockfile-matching React 19.3.0 installation.

The existing pinned native builder reproduced the updated module exactly;
native source/resource/artwork checks passed. The focused real-SDK, bundle and
durable-signing run passed four tests. Independent review found no issues in the
eight implementation/fixture paths and this report.

The production command is `node scripts/vercel-npm.mjs build`; its exit status
is recorded separately in the final commit validation. Remote CI, deployment
and live behavior remain separate states.

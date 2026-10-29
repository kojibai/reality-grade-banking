# Faster proof and action preparation

Date: October 29, 2026. Baseline: Bank main379e095.

## Scope and preserved primitives

The user authorized the five further audited areas: public Original/media
opening, Twin private sealing, Twin organizer actions, Note-file inspection,
and standalone asset/receipt HTML. Public media includes both cold code/byte
preparation and simultaneous-reader reuse. There is no account-entry, SDK,
model, prompt, SQL, endpoint, permission, payload, markup or stylesheet change.
No new source of proof or action authority is introduced.

- Exact public coordinates share only in-flight media work. Each consumer has
  its own cancellation; one canceled reader cannot stop another. The final
  departing reader aborts the transport. Failed/abandoned work is removed so an
  explicit retry works. Private held sources remain independent. Completed
  public projections retain their existing keys, limits and canonical admission.
- Existing verifier code prepares beside exact source bytes. Source refusal
  retains precedence over verifier-load failure. The existing enclosing
  verifier, exact digest check and current lifetime still gate projection.
- The Twin's private business-seal code loads beside native device preparation.
  Enrollment, actual signing, verification and exact Original retention remain
  in their existing sequence and owner boundary.
- Organizer action code and the existing organizer API prepare together. The
  same owner/lifetime checks precede the same ordered action and native journal.
- Note-file reading and the existing Note API prepare together after size and
  current-owner guards. Enclosing inspection, receiving validation, duplicate
  checks, source retention, deposit and confirmed credit remain unchanged.
- Asset/short-receipt HTML templates prepare beside their existing source read.
  The complete response, headers and refusal status remain unchanged. HEAD,
  PNG and player routes perform no new HTML work. Receipt-source failure keeps
  precedence even if template preparation fails first.

Successful paths issue the same requests, or fewer for simultaneous identical
public opens. Independent preparation can begin before a sibling later refuses;
preparing code cannot admit an artifact, sign a source, dispatch an action,
claim a Note or move funds. There is no speculative account-login warming.

## Controlled before/after evidence

The actual adapters and handlers execute with the same controlled IO:
200ms for code/API/source preparation and150ms for its independent branch.
The intervals start after explicit operation intent; they exclude account entry
and model generation. These are controlled comparisons, not hosted latency
promises. Normal regression tests use held promises, not performance thresholds.

| Preparation | Before | After | Saved |
| --- | ---: | ---: | ---: |
| Cold public media |358ms|203ms|155ms /43%|
| Twin private sealing |353ms|201ms|152ms /43%|
| Twin organizer action |376ms|213ms|163ms /43%|
| Note file and API |353ms|202ms|151ms /43%|
| Complete asset HTML |364ms|214ms|150ms /41%|
| Complete short-receipt HTML |380ms|227ms|153ms /40%|

Both final comparison runs passed all six selected measurements. The identical
public-source diagnostic/regression changes two simultaneous downloads and two
canonical reads into one of each. A later settled open adds no download/read.
Benchmark-only files were removed after execution and are not production code.
The earlier standalone benchmark setup scanned upstream Jest sources; another
symlink-switch setup reused stale transformed paths. Final measurements ran
explicit files in each actual source snapshot, with no product assertion or
source change to accommodate those harness errors.

## Contracts and independent review

Before implementation, six corrected public-media tests and five code/API/HTML
ordering tests failed at the audited boundaries; the remaining guards already
passed. The initial private-closure test expected the wrong message. Baseline
already returns AbortError; the contract now asserts that error class and zero
Original preparation, without changing the existing behavior.

After implementation108 targeted tests passed. Independent review found an
Important edge case: early verifier-load rejection could outrank a delayed
purchase-required response and mark shared work finished while its byte read
was still pending. Two new tests failed on that candidate. Observing the code
outcome independently while retaining source-first failure precedence fixes
both; the pending transport still aborts when its last reader leaves.

The review's organizer-closure coverage gap was regraded Important because an
Identity closure must prevent dispatch. The held-preparation test checks zero
actions after closure. Removing the existing caller assertion causes an actual
extra dispatch and fails this test; restoring it passes. No test or native
boundary was weakened. Final direct review checks:111 targeted tests passed.
No deferred minors remain.

Review boundaries: hosted timing/state, physical iOS/Instagram, full qualification
and screenshots were not judged by the read-only reviewer. Local full/build/
frozen-entry/browser checks are recorded below. Existing digest-based inspection
observation, completed-cache encoding and SDK cryptographic internals remain
unchanged; their authority is neither replaced nor redefined. Unrelated dirty
ownership work remains outside this patch. Local evidence does not claim a
production mutation or physical-device execution.

## Qualification

- TypeScript: passed both the direct check and final complete production build.
- Complete Bank suite:4,418/4,418 tests passed across705 files, no skips/failures;253.09s with one worker and2GiB heap.
- Native frozen account-entry contracts:57/57 passed; no native code changed.
- Complete production build passed, including generated previews, native source correspondence, offline graph, conformance, licensing, exact source archive and public-page checks.
- Browser canonical public media: passed using the real built verifier and the
  existing signed113,184-byte public Original fixture (digest
  7dea328ef9accb1322853b868ec0fbd9a46f644cffbd377763eb08af7fe6784e).
  At390×844, two real media readers, expand/close and settled reuse work.
  Source requests change from two to one. No verifier was mocked or bypassed.
- Visual comparison: all four before/after PNG pairs are byte-identical:
  rendered media, expanded media, asset first paint and receipt first paint.
  Inspected media, expanded and asset screenshots confirm existing presentation;
  no visible evidence contradicts the patch. Complete asset/receipt HTML hashes
  also match. Public HTML screenshots disable app JavaScript to inspect the
  delivered first paint; actual media screenshots execute the real components.
- Browser scope: local Chromium phone viewport, no physical iOS/Instagram or
  deployed customer operation. The unchanged previously built verifier serves
  both fixtures; its bytes match the final generated build exactly (cmp passed).
- Exact owned main integration:12 staged files match the qualified snapshot byte-for-byte. All unrelated dirty files and the shared Identity file edits are preserved; latest parent remains379e095.

## Evidence and scope boundary

Local evidence is under /private/tmp/bankeiz-action-measurements,
/private/tmp/bankeiz-action-ui and the /private/tmp/bankeiz-action-*.log files.
The baseline archive is /private/tmp/bankeiz-action-before-379e095; qualification
uses /private/tmp/bankeiz-action-latency-379e095. They contain no customer
credentials or new customer action. The browser uses an existing signed public
Original fixture and the canonical verifier, with no account or financial write.

No stronger sealed artifact truth, verified local truth, Identity, ownership,
Note custody or native result is replaced by weaker server/session/UI state.

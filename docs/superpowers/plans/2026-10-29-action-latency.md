# Action latency Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Steps use checkbox syntax.

**Goal:** Remove the five further audited latency areas while preserving the exact existing product.
**Architecture:** Share only simultaneous identical public-media preparation with separate consumer lifetimes; overlap independent existing code and exact-file/template reads after the same intent. Keep verification, signing, action execution, durable checkpoints and first paint in their existing boundaries.
**Tech Stack:** TypeScript, React, native Receiz adapters, Vitest, existing browser fixtures.
**Spec:** The user-approved five-area audit in the current conversation; source traces and diagnostics in /private/tmp/bankeiz-next-latency-audit/findings.md. This plan restates its full implementation scope below.

## Global Constraints

- Bank main baseline379e095. Commit only owned changes on latest main, preserving all unfinished ownership work, including native-identity.ts shared hunks.
- No account-entry, SDK/model/prompt, SQL, endpoint, payload, permission, first-paint shell, CSS, markup or payment-accounting changes.
- Same successful-path requests; no speculative login warming, new polling, new proof authority or skipped verifier.
- Public media key remains the exact existing public coordinate. Private held media is not shared. Completed held public projections retain their existing reuse and limits.
- One consumer cancellation rejects only that consumer. Abort shared work when the last consumer leaves; remove failed/abandoned work so explicit retry works. No unhandled rejection or late publication after cancellation.
- Load existing verifier beside public bytes only after source/digest admission. Actual enclosing verification and selected digest match still precede media projection.
- Twin private sealing may load independent business-seal code beside native device preparation. Enrollment, actual signing and source retention stay ordered.
- Organizer action code and organizer preparation may overlap; owner and lifetime checks remain before exact existing tool dispatch. Ordered actions and the existing native journal remain.
- Note file size/current guards precede independent file/API preparation. Enclosing inspection, receiving validation, duplicate checks, source retention and funding remain ordered.
- Asset and short-receipt HTML templates load beside their source reads only on HTML paths. Keep complete response, status/headers, HEAD/PNG/player bypasses and source refusal handling.
- One heavy process at a time, one test worker,2GiB Node heap. Qualify exact owned bytes in a clean snapshot; no unrelated dirty source is qualified or committed.

## Primitive preflight

- Primitive affected: public proof/media inspection, owner-bound Twin actions, sealed Original creation, Note receiving and public proof HTML.
- Source of truth: enclosing canonical proof, exact source/digest, accepted Identity and existing owner-bound native result.
- Stronger/weaker truth risk: public-proof-risk, identity-risk, ownership-risk, offline-proof-risk and settlement-risk; shared preparation never admits an artifact or action.
- First-paint risk: no markup/style/shell change; complete output and retained verified truth stay primary.
- External convention: promise scheduling and abort/browser mechanics only.
- Checks: held-dependency RED→GREEN, cancellation/failure/source-isolation contracts, existing proof/action/HTML suites, complete Bank tests/build, native entry freeze if shared Identity touched, before/after browser evidence.
- Exact uncertainty: sharing cancellation and rejection cleanup, cold scheduling, measured savings, rendered output and final build are unverified until run. Physical iOS/Instagram and live customer mutations are outside local qualification.

## Review Focus

- Aborting one of two identical public readers cannot cancel the other; all-reader cancellation cannot retain late results or strand a rejected promise.
- Different public URLs/reading context and private held sources cannot share an in-flight result merely because a digest matches.
- Failed verifier, source refusal, digest mismatch or canceled consumer cannot expose media, and an explicit later retry can reattempt failed work.
- Closed/replaced Identity cannot dispatch organizer actions or sign/retain an Original; code preparation itself cannot authorize an action.
- HTML source/template failures preserve exact refusal status and do not render partial truth; HEAD/PNG/player requests do no new template work.

### Task1: Remove audited action preparation waits

**Files:**
- Modify src/receiz/proof-media.ts: public in-flight preparation and independent verifier/byte loading only.
- Modify src/receiz/native-identity.ts: businessSetup prepareOriginal only.
- Modify src/receiz/business-chat.ts: organizer action preparation only.
- Modify src/receiz/checkout-notes.ts: inspect file/API preparation only.
- Modify server/asset-preview.ts and server/receipt-preview.ts: HTML source/template scheduling only.
- Add focused tests to existing proof-media/business/native/checkout/preview suites or dedicated scheduling tests; add docs/verification/2026-10-29-action-latency.md.

**Interfaces:** Same public exports, arguments, native adapters, proof verifier and returned results. Shared media work remains a private same-coordinate scheduling mechanism, not a proof/authority interface.

- [x] Step1: Write meaningful ordering, duplicate-read, consumer cancellation, failure retry, digest mismatch, private/context isolation and bypass tests with held dependencies. Run on unchanged379e095; audited missing behavior fails for the intended reason.
- [x] Step2: Apply minimal shared public preparation and Promise.all scheduling. Keep proof/action dependencies and complete HTML output unchanged.
- [x] Step3: Run focused new and existing regression tests. Measure matching before/after actual paths with controlled IO, not timing thresholds in regular tests.
- [x] Step4: Obtain one independent final review; resolve important findings with failing tests. Run complete Bank tests, type/build and applicable frozen-entry checks. Inspect before/after public media/HTML browser evidence.
- [x] Step5: Integrate only qualified owned hunks onto latest main; verify exact staged bytes and preservation of unrelated files/shared hunks; commit without push/deploy.

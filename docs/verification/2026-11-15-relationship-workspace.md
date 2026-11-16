# Relationship workspace — local implementation evidence

The Messages relationship toolbar opens one Workspace with Twin, Work and Context views. It reuses the existing native owner/conversation Twin, tool approvals, message transport and encrypted draft custody. General Twin and relationship histories remain separate. No new identity, proof authority, database or Google script was introduced.

## Delivered behavior

- Work remains useful without paid Twin: edit a main-thread message; manually create documents, proposals and invoices; return to source agreements, files, appointments and recorded payments.
- Manual documents have seven starting structures, editable sections and tables, and real PDF, DOCX, XLSX and PPTX rendering. From/For names and details prefill from held profile and exact linked contact, or an unambiguous exact email match. Missing fields stay blank and all details remain editable.
- Twin discussion stays private. Preparing a reply retains the existing main draft; the named Send action explicitly publishes the reviewed text. Free Twin intents use existing Business review and remain in this relationship's custody. Verified upgrade clears only that relationship's access intent and does not submit a model request.
- Context searches held messages and returns to exact originals. Earlier native history remains available on request. Request context is bounded, labelled and credential-screened; it does not imply every remote interaction was inspected.
- File sharing checks the exact retained relationship output and canonical Original, journals before upload and POST, and transports unchanged bytes. Scope changes permanently invalidate previous controllers. Cold uncertain-send recovery checks source and stage without repeating a possibly posted message.

## Review and verification

Fresh scoped review identified general/relationship state mixing, scope revival during uploads, credential screening gaps, source-less cold recovery, free-to-paid hydration, draft replacement and stale post-share display. These were repaired with red/green regression checks. A final upgrade-scope regression also failed on the account-global retention call before the scoped fix.

Focused final UI check: `npm test -- --maxWorkers=2 tests/messages-panel.test.tsx tests/relationship-workspace-panel-ui.test.tsx tests/document-composer-ui.test.tsx` — **122 tests passed**, 3 files. Log: `/private/tmp/workspace-ui-final-green.log`.

Frozen account entry: `npm run test:account-entry-freeze` — **63 tests passed**, 7 files, with the exact creation guard passing. Log: `/private/tmp/workspace-account-entry-final.log`.

Contact resolution: **19 tests passed**; exact Original sharing: **17 real-SDK tests passed**. Final renderer run: **41 tests passed**;8 new issuer-header tests first failed, then passed across all four formats. Real PDF/Office payload checks cover complete details, wrapped160-character issuer names, layout and refusals. Bankeiz attribution remains secondary in footers; the issuer name leads each format.

Initial full-suite attempt encountered ENOSPC and two timeouts: 7198 passed, 9 failed and 18 skipped across 1104 files. Exactly the ten affected files then passed on rerun: **35 tests passed**, exit 0. Logs: `/private/tmp/bankeiz-workspace-full-suite.log`, `/private/tmp/bankeiz-workspace-retry-environment.log`. No tests, timeouts, admission rules or frozen fixtures were weakened to resolve this environmental run.

The final full-suite run completed across all 1104 files: **7221 passed, 2 timed out, 11 skipped** (7234 tests), 1191.50s. A second full suite was concurrently active in another local checkout; resource contention is an inference from the timing and process observations, not an application failure diagnosis. Both reported failures were unchanged 5000ms test timeouts: `account-proof-canonical-export.test.ts` and `public-asset-trade-style-boundary.test.ts`. The stop attempt occurred after the process had already exited, so this run was complete, not interrupted. Log: `/private/tmp/bankeiz-workspace-final-suite.log`.

Both affected files then passed with one worker and unchanged timeouts: **12 tests passed**, 2 files, 15.89s, exit 0. Command: `npm test -- --maxWorkers=1 tests/account-proof-canonical-export.test.ts tests/public-asset-trade-style-boundary.test.ts`. Log: `/private/tmp/workspace-final-timeout-retry.log`. This is separate rerun evidence, not a clean single full-suite result.

The final source previews were regenerated: 44 product screens, 41 distinct read-only money conversations and 16 meeting screens. Production-build results are recorded below after completion.

Final consistency pass extended the same editable contact branding into proposals and invoices. The optional branding is retained separately from document drafts, bound into exact reviewed terms and the PDF, and included in existing canonical content digests. Editing it invalidates prepared output. Legacy proposals without branding remain readable; checkout ownership, prices and recipient IDs remain governed by the existing validators.

The final focused regression run passed **218 tests across11 files**, including Messages, manual/free creation, exact contact prefilling, proposal/document metadata, receiving cards, draft retention and financial-source boundaries. Three new integration tests first failed and then passed. Proposal/invoice PDF tests passed **18/18**, with9 new real-reader red/green cases for issuer branding, full multiline details, pagination, glyph refusal and malformed input. TypeScript passed after these changes. Logs: `/private/tmp/workspace-proposal-branding-verified.log`, `/private/tmp/workspace-proposal-branding-final-types.log`.

The preceding packaging attempt failed with ENOSPC at license-notice generation after Vite compilation. Only its reproducible `dist` and stale `dist-public` outputs were cleared before the final attempt; source, identities, held Originals and other checkouts were preserved. The broad-suite evidence above predates this final branding consistency pass; focused regressions cover the subsequent change.

The subsequent final-code `npm run build` passed TypeScript, Vite, generated public pages, server/API imports, registry admission, complete offline cache, source archive, licensing and every public-page/Feed size guard. It failed only at the final `dist` → `dist-public` allocation with ENOSPC. Log: `/private/tmp/bankeiz-workspace-verified-build.log`.

Delivery packaging now uses `copyFile(..., COPYFILE_FICLONE)`: an independent copy with shared extents where supported and an ordinary-copy fallback elsewhere. No hard links, file-byte changes, navigation changes or weakened size guards. Source/output edit independence is covered by the existing packaging test. The related delivery/held-navigation regression run passed **79 tests across5 files**; log: `/private/tmp/workspace-delivery-copy-tests.log`.

The already verified final application bundle is reused for the packaging-only repair. Source/legal/offline manifests and the complete remaining build/check sequence are regenerated against the final files; its result is recorded below. This does not turn the failed full CLI invocation into an exit-0 result.

**Completed delivery:** the resumed source/legal/offline/server/registry/public-page sequence passed every guard again, including Feed's unchanged limit. Its first final copy hit ENOSPC because this Node runtime reports ENOSYS for forced cloning and uses the ordinary-copy fallback. After removing only that incomplete generated copy and space becoming available, the exact final copy command exited0: **4464 files,15 existing route relocations**. Logs: `/private/tmp/bankeiz-workspace-build-completion.log` (all guards, then disk error) and `/private/tmp/bankeiz-workspace-delivery-complete.log` (successful final copy). The complete compiled `dist` and independent `dist-public` now exist. Report this as completed compilation/checks plus resumed packaging, not a single clean `npm run build` run.

Final frozen-entry rerun after proposal branding: **63/63 across7 files**, exit0; `/private/tmp/workspace-account-entry-release.log`. Final whitespace/diff checks passed. No commit, GitHub CI run, live deployment or live-model latency result is claimed.

## Browser evidence and limits

CUA checked the real Messages UI at 390 × 844 using `tests/browser/messages-proposals.html`: manual branded Letter with held sender/recipient details and actual PDF.js rendering; free Business prompt; enabled private Twin reply; editable draft; explicit synthetic send; searchable history; exact source jump; private history on reopening.

Screenshots: `/private/tmp/bankeiz-relationship-workspace-mobile.jpg` and `/private/tmp/bankeiz-manual-document-mobile.jpg`.

The final invoice editor was also checked at390×844: the expandable From/To fields show exact held business/contact details, remain editable and stack within the existing mobile sheet. Screenshot: `/private/tmp/bankeiz-contact-addressed-invoice-mobile.jpg`.

The browser fixture is explicitly synthetic and has no live sealer, payment or message transmission. Real SDK Original handling is covered separately by tests. Live provider latency, production entitlements, signing/payment operations, Google ranking, GitHub CI and deployment are not established by this local evidence. There is no commit, push or deployment from this workspace task.

## Ruling

Continue on the existing `kojib/messages-proposals` checkout to preserve the user's prior uncommitted implementation. A fresh checkout would omit required current document/identity work. The cost is that this local evidence includes the existing dirty tree and is not evidence for an immutable commit; unrelated changes were retained.


## Scoped main integration

The user subsequently authorized committing this feature on main in Bankeiz and Receiz. Integration uses isolated worktrees and preserves the original shared checkouts, their indexes and unrelated changes. Bankeiz includes the relationship workspace, branded document creation/contact prefilling, proposals, appointments, document consent, exact Original sharing and the four product entrances. Existing main resource-library and header commits remain ancestors. Unrelated ownership, profile, Ledger and generated render-build changes are excluded.

The isolated Bankeiz tree passed **518 tests across 43 files**, including all 63 frozen account-entry checks, and `npm run typecheck`. Product, meeting and social previews were regenerated against main's resource library. Receiz's scoped integration passed **73 tests** covering existing delegated authorization, canonical Original upload/download and frozen identity entry. Receiz reuses main's existing delegated authorizers; no duplicate auth helper or operational grant is added. Its scoped TypeScript comparison introduced zero diagnostics and retained the same existing `SIGIL_ZK` TS2717 declaration diagnostic on baseline and candidate.

These are local integration results. The earlier build and browser results above retain their original scope; no new committed production build, GitHub CI, deployment or live authorization grant is implied. The original shared Bankeiz and Receiz HEADs, branches, indexes, statuses and unrelated tracked-file hashes matched their pre-integration snapshots.

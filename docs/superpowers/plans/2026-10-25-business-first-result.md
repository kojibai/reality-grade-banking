# Business First Result Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Carry the outcome promised on an audience page through existing payment review into a useful first agent session.
**Architecture:** Compose the existing explicit Business request, same-identity billing session and message draft. Inert public start text supplies editorial context; no navigation/authority/storage layer.
**Tech Stack:** Existing React/TypeScript and static ESM templates; no dependency.
**Spec:** docs/superpowers/specs/2026-10-25-business-first-result-design.md

## Global constraints
- Keep exact /#account/messages/business and bottom-review landing, frozen account entry and payment execution.
- Preserve ordinary drafts, selected private context, unknown outcomes and identity/view isolation.
- /learn contains no upgrade price; Business is an optional addition to free core banking.
- Shared public CSS/JS budget and navigation remain unchanged. No new runtime request before first paint.
- Leave other agents' generated Vault reader files and output/ untouched; commit owned paths only.

## Review focus
- Cold and warm audience navigation must capture the chosen public task without stale context from a different view.
- Confirmed access must not automatically send a newly billed request or disclose private records.
- Hidden payment confirmation must not replace the selected public surface.
- A custom saved question must outrank the generic first-task draft.
- Pricing/renewal remains clear at decision points while Learn sells outcomes and distinguishes the add-on.

### Task 1: Explicit task continuity
- [x] Add failing entry, fit marker and messaging activation contracts.
- [x] Add bounded editorial task context to the existing Business request and static fit markup.
- [x] Prepare the chosen task after confirmed upgrade; preserve ordinary drafts and unchanged checkout/recovery.
- [x] Run affected entry, route, billing and messaging tests.

### Task 2: Outcome and decision copy
- [x] Add failing Learn/add-on and standard-page decision contracts.
- [x] Refine existing offer/upgrade text; keep prices in offer/review, remove price from Learn.
- [x] Refine Start/Trust/Deposit/Help and link exact doc tasks.
- [x] Run public page/copy/metadata contracts and regenerate only any required share artifacts.

### Task 3: Qualification and commit
- [x] Run frozen account-entry checks and isolated complete Bank suite/build.
- [x] Exercise synthetic phone/desktop entry → review → confirmed access → editable task → first send; test Back/reopen and inspect Learn/value copy. No live charge/messages.
- [x] Obtain fresh scoped review, fix actual findings and commit only owned work. No push/deploy.


### Task 4: Search and platform bank mark
- [x] Add and observe a failing favicon contract before updating discovery.
- [x] Advertise the existing 192px bank-logo PNG on app entries, public templates and docs, retain SVG and Apple/PWA icons, fix the missing payment favicon reference.
- [x] Include deterministic PNG/Apple copies in the independently deployable docs app and check them against the same original vector.
- [x] Verify live public PNG/robots availability and built HTTP icon discovery. External Google documentation supplies favicon mechanics only, never product authority.

## Completion evidence — 2026-10-25
- Isolated production build passed, including offline shell, native source, licensing, source archive, checkout distribution and 138 social-card/public-metadata checks. Foreign Vault/output work excluded.
- Complete isolated Bank suite: 506 files, 3,175 tests passed. Build and suite executed sequentially after a generated-file race in an earlier parallel run.
- Standalone docs build passed: 37 articles; new raster favicon and Apple icon resolve in both standalone and mirror output.
- Final typecheck, icons:check and git diff --check passed.
- Frozen Receiz account entry: 37 tests passed. Visual-evidence, primitive-binding and repo-only-reasoning contracts passed (local test-runner IPC required sandbox escalation).
- Fresh review found an unsent-draft preservation gap; both free/paid regressions observed failing, then passed with scoped openingId guards. Back/reopen audience-task regression also observed failing then passing. Final review found no remaining concrete bug.
- Browser: 390×844 and 1200×900, public Learn → Business, real agency page metadata/unchanged CTA, synthetic explicit entry → bottom payment review → confirmed access → chosen editable task → explicit first send. Back/reopen checked. No horizontal overflow. Fresh fixture and public-page consoles clean.
- Synthetic fixture uses only in-memory replies/access confirmation; no real account, payment, agent request, external message or private-record disclosure. A development hot reload emitted a duplicate-root warning in the first fixture tab; a fresh tab was clean through the full flow.
- Screenshots: /private/tmp/bankeiz-learn-value-desktop.png, /private/tmp/bankeiz-learn-value-mobile.png, /private/tmp/bankeiz-business-payment-mobile.png, /private/tmp/bankeiz-business-first-task-mobile.png. No contradictory product evidence.
- Live bankeiz.com/icon-192.png returns HTTP 200 image/png at 192×192; robots permits homepage and icons. Production still advertises the previous SVG-only favicon until deployment. Google recrawl/display remains external.
- No push or deployment. Main site and docs-app require their respective deployments. No stronger truth, admitted identity, proof, ownership or Settlement was replaced by editorial/UI state.

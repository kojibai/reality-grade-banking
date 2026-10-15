# Conformance Console and Bankeiz verification

Date: 2026-10-15. Scope: public Conformance Console and owner-requested product rebrand. This is local implementation evidence, not production financial qualification.

## Executed checks

- `npm test -- --maxWorkers=2`: **90 files, 315 tests passed**. The earlier unrestricted run exhausted workers and timed out; the bounded run completed in 6.87 seconds without changing timeouts or assertions. Tests include exact module mutation refusal, immutable checked-byte import, oversized files before reading, canonical refusal specificity and pending-second-file evidence invalidation.
- `npm run build`: TypeScript and production build passed. `scripts/check-conformance-build.mjs` verifies separate entries, the Bank's static dependency graph and its service-worker shell exclude console-specific code/styles.
- `npm run receiver:check`: all nine local reference checks, 11 canonical temporal vectors, installed v129 MCP conformance and release baselines (15/15 each) passed. Zero network/database calls or writes in those MCP baselines.
- `node scripts/check-public-pages.mjs`, `npm run vercel:check`, `git diff --check`: passed.

## Browser evidence

The production preview at `/conformance/` ran all **seven real browser checks successfully**. The [actual downloaded JSON](2026-10-15-conformance-browser.json) was independently opened and checked for its schema, current verifier digest, all seven results, `institutionConformance: not-assessed`, `creditAuthorized: false`, zero financial actions and non-authoritative observation timestamps. Module execution uses a snapshot of the exact hash-verified bytes through a temporary Blob URL; no second fetch can substitute different executable bytes.

The standard Vite development entry also completed 7/7 checks with no warning/error logs. Vite initially rejected a direct public-manifest import; a build-time virtual module now reads the same canonical manifest and exposes only its version, module digest and source commit, without duplicated provenance data. Tabs retain results and support arrow-key navigation. Expandable evidence, original file selection and the 16-row qualification table were exercised. The original unissued Reserve artwork was selected through the real file chooser and correctly refused with `BANK_COMPLETE_NOTE_IMAGE_REQUIRED`; artwork could not create financial authority. No private identity was imported and no source was signed, funded, consumed or credited.

Desktop (1487 × 1058) and mobile (390 × 844) were checked. The mobile document width equals the viewport, including expanded digest evidence and all qualification rows. Action buttons are 61 pixels high at that size. Actual console warning/error logs were empty after the completed run. Bank entrance → Learn navigation retained the existing instant transition and displayed Bankeiz. Live account/financial behavior was not requalified by this presentation change.

Screenshots live under the task visualization root, `conformance/`: `reference-desktop.png`, `inspector-desktop.png`, `qualification-desktop.png`, `reference-mobile.png`, `reference-mobile-viewport.png`, `inspector-mobile.png`, `qualification-mobile.png`, `bankeiz-entrance-mobile.png` and `bankeiz-learn-mobile.png`. The concept and latest browser captures were opened with `view_image` and visually compared.

## Fidelity ledger

| Point | Verification |
| --- | --- |
| Hierarchy and copy | Large Conformance heading, cobalt period, three-part subtitle and direct primary/secondary actions match the accepted precision-console structure |
| Composition | Broad ruled results table, three-column summary and navy evidence rail preserve the concept; institution requirements replace generic concept filler |
| Color and material | True white, existing cobalt/navy, restrained cool rules; no new banking palette, generic card grid or competing visual identity |
| Typography and spacing | Existing system sans, 68-pixel desktop heading, hairline rules and wide gutters; slightly taller completed view includes explicit result scope and licensing link |
| Responsive behavior | Rail stacks below content, evidence wraps, buttons remain usable, no horizontal overflow at 390 pixels; keyboard focus remains visible |
| Truthful motion and state | Subtle continuity/evidence animation, actual run progress, hidden-document pause and reduced-motion CSS; no invented transaction or certification state |
| Branding | Owner-approved Bankeiz wordmark replaces the concepts' earlier Receiz Bank label; same app colors/layout, matching share artwork and icon |

Independent code review identified stale prior-file export during another inspection. Shared current-inspection state now clears that evidence and disables export while pending; the regression passes and the reviewer confirmed closure with no new actionable findings.

## Remaining boundaries

These checks verify reference behavior and presentation. Institution certification, a live funded positive note/qualified handoff/once-only credit exercise, the Settlement Note native extension and unfinished Bank financial execution adapters remain separate. Reuse licensing and GPL distribution compatibility remain disclosed in the repository. Bankeiz.com still requires the [registered-origin rollout](../bankeiz-brand-rollout.md); existing protected origin/client checks were preserved.

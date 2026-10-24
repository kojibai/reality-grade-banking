# Business offer and source-first public pages implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Give people one shareable public Business offer and an explicit path into the existing $149/month checkout, with source-first economy framing.

**Architecture:** Extend the existing static public-page renderer, metadata registry and retained navigation. Compose the existing upgrade session and embedded checkout from a new hash route after unchanged identity acceptance. No new billing, entitlement, proof or identity authority.

**Tech Stack:** Existing Vite/React/TypeScript, static Node templates, Vitest and Playwright.

**Spec:** /Users/bjklock/Kai-Turah/receiz/docs/superpowers/specs/2026-10-24-bankeiz-business-offer-design.md; owner approved implementation and related public framing on October 24, 2026.

## Global constraints

- Logo only at the top. Bankeiz name stays subtle in the existing footer and necessary metadata.
- Lead with customer actions and outcomes, informed by literal public-language research; no claims that the product solves every possible business problem.
- $149/month, $1,499/year, 7,500 monthly usage credits. Monthly is the default; actual checkout confirms the subscription terms.
- Core proof, ownership and Settlement remain free. No production economy activation in this task.
- Existing Receiz ID, same-account entitlement, original checkout recovery and duplicate-subscription protection remain authoritative.
- Public first paint performs no private account reads. Reuse the exact shared public header and retained navigation.

## Review focus

- Cold purchase click retains #account/business through unchanged account entry.
- Already-entitled owners reach their assistant without being offered another charge.
- Interrupted/reopened checkout retains the original operation; no duplicate payment.
- Business public content, metadata, sharing image and sitemap agree without executing private code.
- Mobile visitors can read the price, terms and CTA without overflow; logo is the sole top brand treatment.

## Task 1: Same-account Business review

Files: src/core/routes.ts, src/core/useBank.tsx, src/App.tsx, src/features/account/LiveActions.tsx, src/features/messages/BusinessUpgradePanel.tsx, TwinUpgradePanel.tsx, messages.css, src/content/business-offer.mjs and declaration. Tests: routes.test.ts, business-upgrade.test.tsx, existing twin-upgrade/session/panel tests.

- [ ] Write route round-trip and actual rendered price/interval/known-access tests; run and observe missing behavior.
- [ ] Add business hash intent, compose existing review, display monthly/yearly prices and included credits before payment. Known access exposes assistant action. Success routes to the retained assistant.
- [ ] Run focused route/upgrade/session/service tests and typecheck.

## Task 2: Public offer and related source-first framing

Files: scripts/business-page.mjs, build-public-pages.mjs, public-page-metadata.mjs, learn-template.mjs, public/learn/learn.css, branding/site-footer.mjs, src/content/learning-pages.mjs, audience-pages.mjs, vercel.json, public/social generated manifest/images. Test: business-page.test.ts and existing public metadata/navigation tests; scripts/check-public-pages.mjs.

- [ ] Write public contract for $149 offer, direct #account/business CTA, logo-only shared header, free core, accurate record selection, metadata and source-first guide language; observe missing behavior.
- [ ] Build the offer in the existing design system. Update Learn entrance, Business audience and relevant economy/deposit/assistant guides; add reciprocal Business links. Generate exact sharing images.
- [ ] Run focused public tests, complete build and built-public-page checks.

## Task 3: Verification and handoff

- [ ] Run full repository tests and typecheck/build. Report any baseline failures by name.
- [ ] Inspect desktop and mobile in the built-in browser first, exercise public navigation and purchase entry, compare concept with rendered screenshots and inspect console/DOM.
- [ ] Fresh code review of the scoped patch; fix important findings with regression coverage.
- [ ] Apply only the reviewed changed files to the original Bankeiz checkout after confirming those files still match the starting source. Preserve unrelated owner work. Open the result for review; publish only through an authorized deployment action.

## Owner-approved expansion: fit directory and moving visual stories

- [x] Specify `/business/for/` and thirty distinct fit pages in one pure public registry. Add regression contracts for full journeys, metadata, logo, credit placement, local filtering and offline routing. Missing modules failed before implementation.
- [x] Create six transparent generated illustration assets, optimise to alpha WebP and compose independent animated layers with native labels, shared automatic motion and reduced-motion support.
- [x] Reuse the shared public renderer, header/footer, exact purchase intent, metadata and offline shell. Load local filtering only on the selected directory, including retained navigation. Keep all paths readable without JavaScript.
- [ ] Verify actual desktop/mobile layouts, first-paint route admission, navigation, filter lifecycle, image/motion and purchase entry. Review full scope before application to original checkout.

## Execution ledger

- Setup: isolated local checkout in /private/tmp/bankeiz-business-20261024. Existing dependencies copied without installation. Original Bankeiz work preserved.
- Baseline: 23 focused tests passed. happy-dom logs its configured disabled-iframe warnings in the existing tests; no real payment was attempted.
- Ruling: use a dedicated Business page with the price above fold; put broad source-first framing on the existing Learn/economy surfaces. This keeps the subscription decision specific while preserving free participation. Cost if wrong: the first page may need copy revision after buyer feedback.
- Ruling: no automatic billing status request on a new review. Existing checkout already detects active subscriptions; known confirmed access is used directly. An unsolicited negative status would otherwise show an upgrade-pending message before purchase.
- Ruling: owner expanded the sales surface to all useful fits and requested living transparent artwork. Preserve the original offer and checkout work while extending the public registry, rather than replacing the objective. Cost if wrong: the coverage taxonomy may need adjustment after buyer conversations.
- RED→GREEN: directory modules absent, then full registry/journey tests pass. A singular search for “agency” exposed a real plural matching gap; normalization now matches “agency” and “agencies”. The local filter lifecycle, zero results, reset and remounted page checks pass.
- First-paint finding: `/business/` was admitted as a username by the existing profile matcher. It is now explicitly reserved in both public matchers, with `/u/business/` preserved. Direct route browser verification remains required.
- Final review: fresh read-only reviewer found one Important issue. Hidden checkout completion could change the selected public URL. Regression failed with the unexpected callback; Business completion now requires the active bank surface and App checks current Business intent. Regression passes, and the full suite passes 2690/2690.
- Continuity contract extended: an actual retained call now navigates through the new directory and Agency page, returns with the same document, bank root, video element and media stream, and makes no replacement-document/private fetch. Focused navigation checks pass.
- Visual correction: phone layouts now tell the story vertically with larger transparent objects and live connection paths. Desktop remains panoramic. A transient horizontal overflow and an inherited mobile button colour were found in browser evidence and corrected; re-verification required after the final build.

- Owner refinement: remove every visible pause-motion control. Illustrations now move automatically while visible, with no interactive chrome. Offscreen/hidden and reduced-motion rules still bound rendering cost.
- Final cold-entry browser finding: Vite preview’s slashless `/business/for` used the generic account fallback before public navigation. Production rewrites were already explicit, but local evidence failed first-paint protection. Added a narrow preview alias for registered Business paths only, preserving query strings and all other routes. Missing hook failed the regression first; static alias cases now pass. Browser verification follows server restart.

# Verification record

Verified locally on 13 October 2026. This is a reviewable Demo account frontend; the only real SDK operations are artifact verification and read-only public ledger access.

## Automated checks

`npm test` passed 49/49; `npm run typecheck`, `npm run build`, and `git diff --check` exited zero. These are the release checks. The suite covers exact amount parsing, account/ownership conservation, duplicate operation IDs, fractional trades, backing conservation, exchange rejection, receiver continuity, pseudonym consent, durable restore, direct routes, activity direction and service-worker boundaries. Actual v129 verifier tests reject ordinary text and serialized verification claims; no fabricated positive proof result is substituted.

## Browser checks

The Codex in-app browser exercised the application at 320×760, 390×844, 430×932 and 1280×900. Measured body width equals viewport width; bottom navigation remains accessible. Narrow dialog content stays within the viewport. Close receives initial focus; Tab moves into the dialog, Escape closes it, and focus returns to the opener. Browser Back closes a sheet. Direct asset references restore the exact asset ID; closing an initially loaded sheet remains in the console. Market filters survive switching panels. Chart period controls change the displayed dataset. Long asset titles wrap within the action sheet. OS/browser text enlargement has not been separately verified.

Observed flows:

- Physical intake → pending handoff → explicit demo custody preview → one owned item, 100% retained, $0 cash created.
- Gold: 1 oz → sell half to bank → 0.5 oz and $1,575 proceeds → buy back half → 1 oz. Custody remains Bank vault.
- Ownership send: 0.5 oz to a demonstration recipient; remaining 0.5 oz / 50% and unchanged custody persist after reload.
- Painting: held whole at $2,000 estimate → sell half on simulated Market → $1,000 proceeds while retaining half in custody.
- Currency: Neighborhood / HOOD, supply 1,000, $100 Reserve backing → 1,000 HOOD held at $100 without increasing total account value.
- Exchange rejects excessive liquidity requests, then accepts $10 into North currency. No credit on rejection.
- Send value uses the selected rail; Receive copies an explicitly unusable demo coordinate. External Settlement names the institution's continuity gap; external Reserve requires route qualification. Both remain disabled without source loss.
- Rules save as drafts; no live activation is claimed.
- Public demo ledger uses aliases until explicit username consent; saving consent displays @jordan. Private history and expanded receipts remain inspectable.
- The actual public SDK read from localhost returned `Failed to fetch`. The error is visible and known history remains. Successful browser access to the live ledger is unverified.
- Browser original-file selection stalled. Canonical unsealed-file rejection is proven by actual SDK tests, not an end-to-end browser upload.

## PWA checks

Production manifest uses standalone display, matching 192/512 PNG icons and warm-white theme. Production installation caches the shell plus all emitted JS/CSS chunks in the background. With the production preview server stopped, a reload restored the account/profile and known demo state. A rebuild activated a new versioned cache. Static cache matching tolerates response Vary headers; financial API routes and foreign origins are outside service-worker caching. No financial request replay or offline completion queue exists.

An earlier offline test exposed a blank shell. Precaching all lazy chunks and matching only static resources restored a consistent build. A regression contract covers static Vary matching and financial API exclusion.

## Visual fidelity

The generated Account and Deposit/Market concepts and the native rendered screenshots were inspected in the same QA pass using view_image. The native app retains the warm-white/navy/blue palette, large account value, green growth, two central actions, native SVG chart, quiet asset rows and five labeled bottom actions. Header spacing and phone chart height were tightened after comparison. The right-hand phone concept's generated axes were not copied as decorative unbound data; native charts carry actual demonstration datasets and period selection. Recent activity is scrollable below holdings. Desktop extends the same console into two columns.

Intentional differences: Design archive is $6,420 (50 × $128.40) to preserve exact arithmetic; the generated reference displayed $6,400. The actual app carries a Demo status, precise custody and liquidity details, and native form controls rather than a bitmap interface.

## Integration boundary

All three coordinated Receiz dependencies are exactly 129.0.0. MCP/AI skills are trusted-host packages, not browser execution authority. Existing connected MCP compatibility remains v128; no host upgrade or financial capability qualification is claimed. The main initial JS is about 300 KB minified; the lazy native SDK chunk is about 2.13 MB and triggers Vite's size warning.

A real release still requires app/identity registration, physical custody/title and valuation operations, funded quote/order handling, fiat providers, admitted proof ownership/value contracts, live rule mandates, qualified issuance/redemption and external continuity routes. The current demo contract conserves local quantities and amounts; it does not prove legal title or actual funds.

## Decisions made during execution

1. Empty dedicated workspace: initialize a local feature branch and build here. If wrong, the work needs moving to an isolated checkout.
2. User added stocks and Rules: extend current asset and account flows. If wrong, intake and controls need adjustment.
3. User revised acquisition to custody and divisible ownership: show assets once in total, with liquid rails separate. If wrong, custody transitions and balance presentation need revision.
4. Exact display arithmetic is Demo-only at 1 Phi = $1; live quote basis remains SDK authority. If wrong, demo displays can differ from admitted live valuations.
5. Integrate transfer sheet routing with Market so ownership actions respond immediately. If wrong, the larger integration commit needs splitting/review.
6. Browser chooser stalled: establish rejection with actual SDK tests and leave browser upload unverified. If wrong, a browser-specific intake defect may remain.

## Independent review and fixes

A fresh-context reviewer inspected commits 8bb4f5d..ee00fc3 and independently ran the original 41 tests. No Critical issues or deferred Minors. Four Important findings were reproduced RED and fixed GREEN in one pass, followed by the full 49-test suite:

1. Currency exchange overspent because display unit-price truncation differed from exact backing. One rational quote now drives preview and execution, including a unit price below one micro-unit. Tests cover 60 million and 600 million supply, exact payment and received quantity.
2. Oversized accepted balances/events failed restore and erased local history. Credit, holdings, asset quantities and calculated event values must now satisfy the same persisted bounds before a cloned transition can commit. Tests cover overflowing funding, maximum accepted rail balance, huge custody valuations, and exact restore after an eleven-step custody/trading/currency journey.
3. Mixed hover and keyboard period changes retained an invalid chart index. Rendering guards the selected point, and period changes reset chart selection. A mounted React DOM regression reproduces the old crash and now passes.
4. Immediate PWA activation deleted cached lazy chunks referenced by open clients. The worker now uses the normal waiting lifecycle. A two-version worker test retains old-client verifier availability while the update waits. Close all Receiz tabs and reopen to activate a waiting build.

Package checks also identified outdated test/tool transitive dependencies. Updated Vitest to 5.0.4 and applied a compatible Underscore 1.13.8 override; all Receiz packages remain pinned to 129.0.0. npm audit reports zero advisories. Primary notices: [Vitest](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9), [Tinypool](https://github.com/tinylibs/tinypool/security/advisories/GHSA-85c8-ppgw-ccpr), [Underscore](https://github.com/jashkenas/underscore/security/advisories/GHSA-qpx9-hpmf-5gmw).

## Review rulings

7. Live custody, fiat execution, market counterparties, mandates, currency contracts and institutional routes stay outside this frontend release under the approved scope; demo/unavailable states remain explicit. Cost if wrong: a separate backend implementation and qualification is needed.
8. Live ledger success and browser artifact upload remain unverified, with concrete failures disclosed. Cost if wrong: integration-specific defects may remain.
9. OS/browser text enlargement stays a documented validation limitation rather than an inferred pass. Cost if wrong: a zoom-specific layout defect may remain.
10. Shared-owner redemption requires backend terms; the full-ownership guard stands. Cost if wrong: a negotiated fractional-redemption experience needs implementation.
11. Apply patched test tooling and a compatible transitive patch while preserving exact Receiz versions. Cost if wrong: dependency compatibility needs rechecking; the full suite and build were rerun.

Deferred minors: none.

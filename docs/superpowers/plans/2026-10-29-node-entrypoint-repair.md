# Production Node entrypoint and CI repair

**Spec:** Repair the profile failure introduced by main154aaf1, preserve the restored deployment and all earlier speed/functionality, and make the three CI checks pass. Commit only this repair; preserve21 unrelated dirty files.

## Preflight and root cause
- Primitive: public proof/profile first paint and production function admission.
- Source: existing canonical public profile and existing server-rendered document; unchanged.
- Boundary: public-proof-risk / first-paint-risk in Node ESM module resolution, not data, identity or monetary rules.
- Baseline: main154aaf11059db005840fd5c0b3a44d70b2f7fcc6.
- Exact failure: production dpl_CSpCB7eQUSTpUDXGWEW5TneGtqv6 logs `ERR_MODULE_NOT_FOUND` for `/var/task/src/core/public-document-entry` imported from `src/receiz/public-profile.js`. A new extensionless import passed Vite but Node requires the emitted `.js` coordinate. Plain unbundled Node emission reproduced that exact failure before correction.
- Reuse: preserve the readiness helper and change the four shared source imports to explicit emitted `.js` paths. No lookup, authority, session, storage or data change.
- Regression contract: emit every API entry and relative dependency without bundling/rewrite, import them in plain Node, then run profile HEAD and full streamed GET with the actual production profile renderer and one fixture public read. No private identity or money operation is invoked. Add this check to the ordinary production build.
- CI: the existing public-trade navigation fixture already carries the production `explore` attribute in154aaf1; keep its assertions. The Copy geometry assertion must accept only ≤0.1CSS-pixel browser rounding in x/y/width/height, still rejecting visible movement. Product styles and controls are unchanged.
- Required checks: plain Node RED→GREEN, full unit suite, typecheck, full production build including server check, the CI browser/source gates, review and protected-file hashes before scoped main commit.
- Exact unverified boundary: corrected Vercel deployment must be checked after user redeploys. Leave their restored live deployment unchanged.

## Verification findings
- Full unit run:4500 passed; the only2 failures and2 unhandled errors were `listen EPERM127.0.0.1` in the local HTTP preview tests under the session sandbox. The same file passed with localhost permission; no assertion or product change was made for that environment restriction.
- Copy measurement diagnostic: pre-click window scroll0 and button y109.964; click driver scrolled the window to109 and the button became viewport y0, with width/height unchanged. The pre-click position also included the existing entrance animation. Settle actionability with a no-click trial before taking the baseline; then keep the same≤0.1CSS-pixel bound. This corrects comparison coordinates, leaving product movement and styles unchanged.

## Final gate record
- Unit coverage:4500 tests passed in the full721-file run; the sandbox-blocked local HTTP group passed on rerun with localhost permission, verifying all4502 unique test cases without changing tests for that restriction. The navigation fixture assertion passed.
- Release, typecheck, receiver, native source/resource checks, SDK/native rebuild, and full production build passed. The normal build now runs the new plain-Node all-six-entrypoint and production-renderer profile HEAD/GET guard.
- The entire CI browser chain and Vault browser gate passed after measuring Copy against its settled, action-ready baseline. The≤0.1CSS-pixel x/y/width/height limit remains; no product CSS, animation, source, verification, identity, money or lower-latency behavior changed.
- Independent repair review: no Critical, Important or Minor findings. Hosted corrected deployment remains unverified until user redeploys; their restored live function returned HTTP200 and was not changed.
- Final source gate must pass against a newly generated archive after these final test/record edits, followed by scoped main commit and preserved-file hash verification.

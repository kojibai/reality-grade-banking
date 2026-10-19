# PWA close and reopen verification

Local checks on `f57eebfb566e4a7b7866cd6371969ad3c732a706` found no new entrance or service worker defect. Cold entry already ships inline SVG artwork and critical styles before JavaScript. Account admission removes that surface in the same commit that publishes the prepared account; it has no minimum duration. Warm wake events refresh the retained account without setting its opening state or hiding its view.

## Commands and results

Run from `/Users/bjklock/Kai-Turah/bank`:

```sh
npm test -- tests/pwa.test.ts tests/offline-status.test.ts tests/opening-shell.test.tsx tests/entrance-opening.test.tsx tests/native-account-wake.test.tsx tests/native-account-hook.test.tsx tests/private-history-restore.test.ts tests/offline-shell-build.test.ts
node scripts/check-offline-shell.mjs
```

All **49 tests across 8 files passed**. These include immediate cold artwork, removal after restoration, atomic account admission, warm focus/pageshow/visibility/online events, BFCache event coalescing, retained views through failed updates, exact build cache selection and private API exclusion. The existing production `dist` passed the offline integrity check: build `a74bebdf2867de6851b425ef`, **133 exact public resources**. This verification did not rebuild `dist`.

The existing disposable browser harness was copied to `/tmp/bankeiz-pwa-verification-server.mjs`. Only its port and imports needed by that temporary location changed: `5284` became `5394`, `esbuild` resolved through `/Users/bjklock/Kai-Turah/bank/node_modules/esbuild/lib/main.js`, and `build-offline-shell.mjs` resolved through `/Users/bjklock/Kai-Turah/bank/scripts/build-offline-shell.mjs`. It ran with:

```sh
node /tmp/bankeiz-pwa-verification-server.mjs
```

The temporary origin was `http://127.0.0.1:5394`. Browser interactions used CUA in newly created hidden tabs. No existing tab was claimed. The harness installed build A, reloaded into service worker control, seeded its documented dummy encrypted fixture and verified every resource by SHA-256. Server stdin then received `offline`, followed later by `online`, `B`, and `offline` for the update cycle.

## Browser results

| Check | Observed result |
| --- | --- |
| Build A with ordinary resource serving disabled | All 133 resource hashes passed; offline readiness reported ready. |
| Close and reopen the isolated test tab | All five encrypted continuity checks passed. |
| Install B while A remains open | B became waiting; the current client continued to verify all 133 build A resources. |
| Close the final A client, disable ordinary serving, reopen | Build B activated normally and all 133 build B hashes passed. |
| Read encrypted custody after build turnover | All five checks passed again. |
| Stop the entire 5394 server, then open the production `/` in a fresh tab | Cached, styled production entrance rendered with its normal controls. The deliberately invalid identity fixture produced the expected identity-proof rejection. The page was nonblank. |

The five checks compare the exact identity bytes, owned original bytes, recovery receipt bytes, pending execution checkpoint including unknown fields, and Offline Notes state including unknown fields. They all returned `true` before and after reopening and after update activation. The disposable cache variants were A `4ee11669984826dc4f479f23` and B `c618d903ea81e65a3d08a4fc`.

Screenshot after the entire server had stopped:

`/Users/bjklock/.codex/visualizations/2026/10/19/01a151a7-653d-78b2-8710-bd8fd82700c4/pwa-offline-production-entrance.png`

![Cached production entrance with the local server stopped](/Users/bjklock/.codex/visualizations/2026/10/19/01a151a7-653d-78b2-8710-bd8fd82700c4/pwa-offline-production-entrance.png)

## Evidence scope

The continuity harness deliberately serves its three inspection endpoints before its offline switch. Its encrypted-data reopen checks therefore demonstrate retained encrypted storage while ordinary production resource serving is unavailable. The separate final production-root check succeeded after the entire server stopped. A and B differ in icon bytes and cache identity, so this is service worker lifetime and retention evidence, not a migration between different application schemas.

These desktop browser checks do not measure every prepaint frame, iOS standalone launch imagery, operating-system process eviction or storage eviction. Warm behavior is covered by hook regressions; an installed physical-device session was not used. Dummy bytes are not an admitted account, proof or financial execution, and the invalid fixture rejection is expected. No real user identity or account storage was used, and no financial action occurred. No antirollback, native application or application-source change was made.

Only the disposable 5394 harness and agent-created tabs were stopped/closed. The 5284 and 5294 listeners and existing user tabs were left alone. The temporary harness script was removed; no commit or deployment was performed.

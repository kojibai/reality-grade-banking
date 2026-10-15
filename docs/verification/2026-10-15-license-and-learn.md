# License adoption and Learn note presentation

Date: 2026-10-15. Authorized scope: adopt modification-friendly GPL-compatible terms with Brian Joseph Klock (BJ Klock) as owner, Bankeiz.com as the official reference, separate branding/conformance policies, public legal access, and locally commit on main for the owner to push. Apply the owner's copy direction and present the existing note artwork in Learn. No push or deployment is part of this change.

## Result

- Original repository software/documentation receives GPL-3.0-only terms. The standard unmodified license is pinned by SHA-256; third-party permissions are preserved. The prior unadopted branding-only proposal is explicitly superseded.
- Separate trademark and evidence-based conformance policies do not narrow GPL modification rights. Modified implementations may demonstrate the same profile without becoming the official reference.
- `/legal/` publishes the owner attribution, warranty notice, complete readable GPL, policy/source documents, observed notices for all 45 locked production npm packages, the vendored jsQR Apache license and Cinzel OFL. Existing native dependency texts remain available. Missing supplied standalone notices are disclosed.
- The public Learn page presents the exact Reserve and Settlement note designs immediately after the two rails. The $100 illustrations are unissued specimens, compressed to 1620 × 972 WebP, under 700 kB each, with lazy loading and intrinsic dimensions. Actual note exports remain 3240 × 1944 original PNGs. Artwork provenance and reproduction instructions are in `public/learn/note-artwork.md`.
- Benefits use plain language about keeping a note, transferring ownership and returning Reserve Notes to Reserve. Settlement artwork identifies proof-native value without claiming an implemented Settlement Note execution route. The Learn page contains no pending implementation status paragraph.
- “Legacy payment rails” replaces “familiar payment rails.” Shared conformance terminology remains “proof continuity”; product explanations use “a proof object,” retaining Receiz where identity, infrastructure and disclosure require it.

## Executed checks

- `npm test -- --maxWorkers=2`: 90 test files / 315 tests passed in the fresh bounded run. Expected proxy refusal fixtures emitted sandbox EPERM errors for localhost:3000; no assertions failed.
- `npm run build`: TypeScript, production build, static public pages, public legal copies, license/inventory guard and Bank/Conformance build isolation passed.
- `node scripts/check-public-pages.mjs`: metadata, public static surfaces, presentation budget, lazy unissued note artwork, legacy-rail wording and existing navigation data passed.
- `npm run receiver:check`: nine local reference checks, eleven temporal vectors and both v129 MCP baselines (15/15 each) passed, with no network/database writes or financial actions.
- `npm run vercel:check`: existing emitted Node-function import, route rewrites, exact upstream bytes, response isolation and unknown-route refusal passed. This checks the emitted API contract, not a new deployment.
- `git diff --check`: passed.

## Browser checks

Production preview: `http://127.0.0.1:5270/`. Browser path: Codex in-app browser through CUA. Viewports: 1440 × 1058 and 390 × 844.

| Check | Result |
| --- | --- |
| Page identity and meaningful content | Learn, note guide and legal page have correct titles, URLs and content |
| Overlay/console health | No framework overlay; inspected Learn/legal warning/error logs empty |
| Exact specimens | Both loaded at 1620 × 972 with original corner values, rail titles and engraved composition |
| Responsive layout | Document width equals viewport width at 1440 and 390; captions and the two-note stack fit |
| Interaction | Learn “How notes work” changes to the correct guide section; Back restores Learn; existing preloaded navigation remains in use |
| Legal access | Footer opens `/legal/`; the full GPL expands in place without JavaScript; the 45-package notice disclosure expands; no account module executes on the legal page |

Screenshots are retained outside the repository under the task visualization root, `licensing-learn/`: `notes-desktop.png`, `notes-mobile.png`, `license-mobile.png`. The rendered desktop and mobile notes were visually inspected against the exact app artwork. No new design generation or financial operation was used.

During QA, directly rerunning the static-page builder against already generated `dist/index.html` caused its derived stylesheet inventory to include Learn CSS as a Bank style. The normal clean Vite build followed by static generation restored the correct output; final checks use that full build path. No application runtime defect was inferred from that unsupported partial rebuild.

Independent read-only review found that the first wording grouped Settlement artwork with Reserve execution claims. The final copy scopes transfer/deposit actions to funded Reserve Notes. The reviewer verified closure and found no other important issue in the licensing/build scope.

## Material release distinction

This work adopts an effective software license; it does not certify complete GPL Corresponding Source delivery for every bundled native object. `SOURCE.md` records the exact remaining preferred native/dependency source and build-material requirements. The license page and machine-readable build metadata do not claim that the repository alone reproduces every native binary. No private host source or owner credentials were published to fill that gap.

The Receiz SDK, MCP and AI Skills remain 129.0.0. Financial logic, native note/verifier modules, note renderer and paper hashes remain unchanged. No Receiz-host code, account data, funds, custody, signer settings, registered origins or application permissions changed.

# Audience guide verification — 2026-10-20

The eight approved audience pages are implemented in the existing public guide catalog. Source checks were followed by rendered checks of the coordinated build at `http://127.0.0.1:5441`. The isolated browser is closed; no runtime source edits were needed during this QA pass.

Passed:

- `npx vitest run tests/audience-pages.test.ts tests/learning-scenes.test.ts tests/learning-pages.test.ts tests/learn-css-scope.test.ts tests/learn-notes.test.ts --maxWorkers=1` — five files, 16 tests.
- `npm run typecheck`.
- `git diff --check`.
- Source geometry preview of all eight vector scenes. Crowded coordinator, request and approval labels were shortened. This was an isolated SVG render outside the repository; no raster scene asset is shipped.

The audience regression checks establish eight unique canonical routes with complete content; eight distinct vector scenes and tailored three-stage explanations; actual button/panel/visual-state changes; resolving related destinations; normalized `guides-for-you`; the unchanged four Learn home foundations; eight coherent footer links and one Reality-Grade Banking footer link; and eight unique SVG sharing-card definitions through the existing metadata pipeline. Existing guide checks retain offscreen, hidden-document and reduced-motion motion guards.

No new public-page account reads, financial actions, network transport or animation runtime were added. No full build or social generator was run during parallel source editing. The parent subsequently generated the social output and built the coordinated revision. The existing strict social-manifest test is unchanged.

Rendered browser matrix:

- All eight routes—people, businesses, independent work, creators, communities, institutions, public finance and platforms—at **320, 390, 430 and 1280 px**: 32 page/width checks.
- No document/body horizontal overflow. Footer, every footer link and the vector artwork remained inside the viewport. Correct canonical metadata and the same retained Learn header were checked at each destination.
- All three controls changed their selected state, visible explanation panel, heading and SVG stage. Enter and Space activation retained real keyboard focus with a visible focus outline.
- Animated SVG nodes ran in view and paused offscreen. A simulated hidden-document visibility event paused them. Reduced motion removed scene animations and transitions.
- At each width, actual carried links navigated through the audience pages, the guide directory, Learn, the anonymous account entrance, Explore and Ledger. Back/Forward retained the public, account, Explore and Ledger roots. Each context recorded **one document request and one DOMContentLoaded** throughout the sequence.
- No browser errors, unexpected API routes or external network requests. Fresh anonymous contexts contained no real identity. Existing public feed requests were intercepted with local empty projections or the already-shipped capitalization snapshot; no financial controls were activated.

People, business, creator and institution artwork was personally inspected at 390 and 1280 px, plus people at 320 px. Labels and stage copy were contained and readable; the minimum rendered SVG label size across the matrix was 10 px at 320 px. No layout correction was needed.

The built social manifest contains **60 distinct image URLs and SHA-256 hashes**. All eight audience PNGs were read from `dist`: each is **1730 × 909**, its byte count and SHA-256 match the manifest, and its page references the correct image/canonical URL. The eight source SVG definitions also have distinct hashes. This checks emitted image integrity and source distinction; it does not claim a production sharing-cache refresh.

Compact evidence: [browser and PNG results](2026-10-20-audience-guides.json). Detailed results, temporary driver and screenshots remain outside the repository:

- `/private/tmp/audience-guides-qa.mjs`
- `/private/tmp/bankeiz-audience-guides-qa/audience-guides-qa.json`
- `/private/tmp/bankeiz-audience-guides-qa/{people,businesses,creators,institutions}-{390,1280}.png`
- `/private/tmp/bankeiz-audience-guides-qa/people-320.png`

These are built-preview Chrome checks. Hidden-document motion was simulated through the existing visibility event; no physical-device OS background behavior or production deployment is claimed. The parent owns the final complete suite/build and commit. Existing financial-host and device-qualification boundaries remain unchanged.

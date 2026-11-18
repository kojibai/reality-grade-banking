# Public SEO readiness evidence

Observed November 15, 2026, America/New_York. This record separates delivery signals, local repairs and search-engine indexing. It does not certify every public URL, browser performance, deployed financial behavior or search rankings.

## Live public metadata audit

Command: `node scripts/check-public-seo-live.mjs --all --path /bjklock/`.

The separately invoked script checks registered intended-indexable routes plus the explicit public profile. It uses no cookies or credentials, limits concurrency to three, reads only the response head, cancels the body afterward and has a timeout. It is not imported into the application, account entry, public navigation or worker.

The initial run checked 166 paths: **148 passed, 18 failed**. The final raw output is [the HTTP audit JSON](2026-11-15-public-seo-live.json). Four pending-release entrances returned 404: `/proposals/`, `/ai-documents/`, `/sign-agreements/` and `/client-communication/`.

Fourteen other responses returned 200 with a self-canonical and index/follow in HTML but the restrictive HTTP header `X-Robots-Tag: none`: `/ledger/`, `/discover/`, `/feed/`, `/explore/`, `/market-cap/`, all eight `/explore/` category pages, and `/bjklock/`. Google defines `none` as noindex and nofollow; the HTML directive does not cancel the more restrictive header. [Google robots specification](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

The current working `server/prepared-public-market.ts` constructs delivery headers from an allow list, and current Vercel collection routes use static entry files. The sampled live responses expose storage/CDN headers that differ from that source path. Reconcile the actual deployed revision and delivery route, then verify the live response after release. Do not claim changing a meta tag overrides an upstream HTTP exclusion, or that the present source alone establishes the live repair.

Intentional noindex pages remain excluded from the normal audit queue: invitation, booking template, legal and receipt routes. Private conversations, private documents, identity artifacts, private receipts and unknown/private originals/profiles must retain their existing refusal and disclosure boundaries. Personalized payment and booking entrances retain their own rules.

## Sitemap and canonical repair

Live sitemap observations before the repair: main sitemap 4,430 URLs, including 4,269 `/asset/` paths; reading sitemap 1,276 alternate-reading paths. These are listed URLs, not indexed documents. No authenticated Google Search Console or Bing Webmaster indexing export was available.

The reading builder previously listed alternates in a sitemap while declaring normal application pages as their canonicals. The repair keeps every mirror, text export and pagination link but includes only self-canonical reading documents in the reading sitemap. The distinct `/read/public/` directory now has its own canonical. Existing guide/catalog/Ledger reading mirrors keep their application canonicals. This aligns sitemap preference with the chosen canonical without changing account entry, proof authority or page-opening behavior. [Google canonical guidance](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

The regression creates real HTML/XML in a temporary directory, retains 101 public items across three catalog and three Ledger pages, verifies next/previous links and text exports, and checks input immutability and canonical/sitemap consistency. It failed before the repair for the wrong directory canonical and extra alternate URLs, then passed.

## Payload observations and crawler ordering

Representative live measurements from direct requests on this machine, not Core Web Vitals or a browser paint benchmark:

| Route family | Compressed transfer | Uncompressed HTML | First-response time | Main HTML end offset |
| --- | ---: | ---: | ---: | ---: |
| Business page | 1,643,085 bytes | 12,105,977 bytes | 0.153 seconds | 439,344 bytes |
| Public profile `/bjklock/` | 7,041,700 bytes | 13,110,742 bytes | 0.518 seconds | 324,604 bytes |
| Representative public image Original | 1,607,690 bytes | 11,797,378 bytes | 0.542 seconds | 246,098 bytes |
| Business reading mirror | 7,854 bytes | 31,852 bytes | 0.219 seconds | 10,133 bytes |

Business HTML includes about 7.35 million characters of navigation JSON and 4.13 million characters of shared demonstration markup. The profile's public-market seed includes the complete carried catalog and capitalization/history observations. Gzip is already active; simply enabling compression is not a repair.

Google currently documents a 2 MB uncompressed Googlebot limit. In these three sampled normal pages, title/canonical and main visible text precede that cutoff; the later navigation/state payload does not all fit. This does not establish complete Google rendering, all Original content indexing or field responsiveness. [Current Googlebot specification](https://developers.google.com/search/docs/crawling-indexing/googlebot).

Any optimization must preserve the actual first HTML, exact owner/artwork bindings, complete held public collection, compatible inventory and accepted history. Factor or prepare existing presentation losslessly; never remove the held catalog, add a freshness/manifest/database gate, or substitute a lightweight replica. The actual compiled anonymous entry with APIs stalled, hydration and subsequent accepted addition/retention/cold reopen are required for public-state changes. No such carrier optimization was made in this repair.

Dynamic reading profile/asset requests took approximately four seconds before headers in the sample. Their tiny response body does not make that path fast, and these timings do not establish a delay in normal saved public entry. Improve them at the existing accepted projection transition if needed; do not introduce that source read into normal page opening.

## Verification and release status

- Local focused reading/metadata verification: six files, 54 tests passed after the sitemap repair.
- Local HTTP audit tests: eight passed using a real local fixture server, including status failures, restrictive headers, canonical consistency, incomplete metadata, quoted/unquoted/entity-decoded attributes, image-preview versus page restrictions, and completion without waiting for an unfinished body. Independent review found two false-success cases; both were reproduced as failing tests and repaired before the final run.
- Full repository tests against the shared working snapshot: 1,096 files passed and five failed; 7,152 tests passed, 15 failed and 11 skipped, with two additional socket-permission errors. This is not a green release qualification. Failure details follow; unrelated product changes are preserved.
- This task does not commit, push or deploy the owner's in-progress branch. A fresh production build, frozen-entry enforcement, GitHub CI and live post-release verification remain separate release evidence.
- Search indexing remains unverified. Submit the preferred sitemaps through the owned search-console properties, inspect representative and excluded URLs, and monitor selected canonicals and indexing reports after release. A sitemap, HTTP 200, successful audit or test pass does not establish indexing.

Full-run failing tests:

- `tests/workspace-file-share.test.ts`: keeps an invalid retained journal unavailable without crashing the rest of the workspace.
- `tests/proposal-composer-ui.test.tsx`: keeps the proposal manually editable and preserves the Twin request as an upgrade intent for free users.
- `tests/document-composer-ui.test.tsx`: keeps manual editing available and requests contextual Twin access without generating for a free user.
- `tests/business-document.test.ts`: four format cases for retaining multiline issuer/client contact details; four format cases for rejecting invalid or over-1,200-character contact details; and two PDF glyph-refusal cases for issuer/client details.
- `tests/cooperative-preview.test.ts`: preserves the actual preview availability query through the native calendar bridge; flushes native text over real local HTTP before the upstream response completes. Both timed out alongside `listen EPERM` errors in the restricted run. The separate rerun with local socket access passed both tests; these two failures were environment-related.

The first four failing files belong to the ongoing document/workspace implementation and are outside the SEO changes. The full run records one source snapshot during active development, not an immutable committed build. The source of its full log is `/tmp/bankeiz-seo-full-tests.log`; the named cases above preserve the substantive result in repository documentation.

No page-opening code, catalog/state carrier, identity/storage flow or SDK guard was changed. The source repair changes only build-time sitemap/canonical presentation. The HTTP audit and its tests are standalone diagnostics; they are run explicitly with `node scripts/check-public-seo-live.mjs` and `node --test tests/public-seo-audit.node-test.mjs`, respectively. The existing default Vitest suite includes the reading regression; it does not run the standalone Node HTTP suite automatically.

## Recheck after the client-work release

1. Run the existing qualified production build and CI from the exact committed revision.
2. Re-run the live audit; the four new entrances should return their complete public pages and the unintended public HTTP noindex headers must be absent on the actual delivered routes.
3. Verify the deployed reading sitemap's preferred URL and retained discovery pagination.
4. In Google Search Console and Bing Webmaster Tools, check property ownership, sitemap processing, actual URL indexing and selected canonical for each route family. Request indexing through supported tools where useful; wait for their decision.
5. Check real mobile performance and field data separately. Do not describe metadata readiness as a zero-latency or fully indexed site.

## November 17 live recheck

At 7:35 p.m. and 7:47 p.m. Eastern, anonymous GETs to all 18 previously failing URLs returned HTTP 200. The four client-work pages passed the metadata audit. Each canonical directory URL and its explicit `index.html` also returned the same ETag on HEAD. The other 14 responses still carried `X-Robots-Tag: none`. The invitation, booking template, legal and receipt pages retained their intentional HTML exclusions. An unknown profile returned 404. [All 18 GET results](2026-11-17-public-seo-recheck.json)

Vercel lists `f7bf84db` as the last ready Bankeiz production deployment built before the November 15 audit. Its public-page build lacked the four landing pages. Commit `00b82793` registered the proposal and agreement pages and included them in the static build. The first November 17 recheck reached production commit `73c75a99`. The second reached Bankeiz 6.0 at `b72fdcce` and reproduced the same 14 exclusions. [Landing-page build change](https://github.com/kojibai/reality-grade-banking/commit/00b82793aa6e3f7181b56167f5733b78f7cc042e)

Vercel's project rules route the 14 canonical URLs directly to saved public documents before the Bankeiz deployment rewrites run. The Explore Music URL and its saved object returned the same ETag, length and robots exclusion. The explicit deployment `index.html` had a different ETag and no robots header. The repair belongs in Receiz's public-document publisher. Its production release and live header correction remain pending. [Receiz publisher repair](https://github.com/kojibai/receiz/pull/241)

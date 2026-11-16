# Independent organic library release qualification

This release implements the first useful resource cohort in the [growth plan](../marketing/2026-11-15-organic-growth-plan.md). The owner selected an independent SEO/resources release before merging the client-work product branch. The original checkout remains on `kojib/messages-proposals`; no work from that branch is included here.

## Deliverable

There are 43 complete static pages under `/learn/`: 24 practical templates, 12 problem guides, four explicitly fictional worked examples and three directories. Every template has a real UTF-8 text download matching the visible blank template and filled example. Existing niche pages provide the relevant product context. Content describes the current main release; the separate proposal/document/signing feature entrances remain dependent on the owner's product merge.

The expansion map contains 128 niches and 512 candidate searches. These are unmeasured research seeds, not search-volume, keyword-difficulty or ranking results. The dated search-intent report records sampled queries and primary sources. Publication is gated on useful distinct content, product fit and observed demand, rather than a daily generated-post quota.

The new pages reuse canonical metadata, social cards, structured data, the sitemap and shared footer. They contain no app entry, catalog/history carrier, API prerequisite or install payload. Measured emitted HTML is 20,268–32,406 bytes per page, 1,057,756 bytes for all 43. This measures document bytes; it is not a field Core Web Vitals result.

Existing application-based public documents retain their complete accepted collection and history carriers. The larger payloads measured in the [earlier readiness audit](2026-11-15-public-seo-readiness.md) remain a separate performance concern. The small-document result above applies to the new library; it does not establish a sitewide latency result.

The reading-page repair keeps application canonicals and useful mirror navigation while excluding noncanonical mirrors from the reading sitemap. The standalone HTTP audit checks the actual response directives, redirects, canonical, title and description; it cannot certify search-engine indexing.

## Local evidence

| Check | Observed result |
| --- | --- |
| Focused content, renderer, metadata, reading, footer and delivery-output tests | 49 passed across six files |
| Real HTTP diagnostic tests | 8 passed |
| Account-entry freeze and real SDK guards | 63 passed across seven files |
| Type checking | Passed |
| Receiver and pinned native-source checks | Passed |
| SDK source rebuild | All 225 qualified JavaScript files reproduced exactly |
| Complete production build | Passed on retry, including 208 metadata/social records, 1,276 reading pages, source inventory, offline output and 4,324 packaged delivery files |
| Full unit/contract suite | 6,909 passed, 11 skipped, four existing test timeouts during concurrent machine load |
| Isolated rerun of all four timeout files, unchanged limits | 14 passed across four files |
| Compiled resource browser qualification | 43 pages, 86 mobile/desktop viewport checks passed; JavaScript disabled, APIs stalled, no requests or overflow; actual text download verified |
| Repository compiled browser suite | `npm run test:browser` passed, including real fresh-owner entry, held-profile first response, offline proof kit, public first frames, receipt-to-Ledger continuity, retained collections, meetings and asset composition |
| Independent source review | No remaining actionable P1/P2 findings in the Bankeiz resource diff |

The first complete build attempt stopped with `ENOSPC` while writing existing public reading pages, after the new resource cohort was emitted and browser-qualified. After capacity became available, the entire `npm run build` was rerun and passed with exit code zero. Only this release's byte-identical generated output was block-shared to reduce duplicate disk use; source bytes and other worktrees were preserved.

## Release gates

- Complete production build: passed locally.
- Final repository browser suite and final emitted resource cohort: passed locally. The mobile directory and template screenshots were inspected and show readable content without overflow.
- Exact committed build and GitHub CI: pending.
- Production deployment and live HTTP audit: pending.
- Actual Google/Bing indexing, rankings and organic activation: not established by these checks. No traffic or indexing guarantee is made. Verify these in the site's search-console and analytics properties after discovery.

Receiz's separately authorized saved-page indexing repair and its route-operation evidence belong in the Receiz repository. They must be released and live-qualified separately from this Bankeiz source change.

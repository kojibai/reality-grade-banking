# First SEO release implementation

Spec: docs/superpowers/specs/2026-11-17-seo-first-release-design.md
Base: 245a689e. Execute natively in the existing isolated checkout; user approved implementation and local-main integration.

## Task 1 — Preserve held navigation while reducing document bytes
Interfaces: existing compactNavigation, page-local example packing, direct marketing delivery, retained public router and offline cache. Add failing exact-byte/held-navigation tests, implement the smallest measured lossless packaging/delivery change, then qualify decoded entry size and no-fetch retained transitions. Keep Original/catalog/history source contracts intact.

## Task 2 — Publish searchable offline guidance
Interfaces: learningPages → learningPath, shared guide template → metadata/social cards/sitemap/offline manifest. Add two owning guide records, update Notes/Security metadata and useful cross-links. Test canonical routes, rendered public entry, navigable related destinations and crawlable guide discovery. Reuse all current styles and accurate capability boundaries.

## Task 3 — Public acquisition measurement
Interfaces: fixed public path manifest → privacy filter → managed Vercel analytics pageviews/coarse conversion events. Tests refuse account, receipt, invoice, source, username, arbitrary query/fragment and private authored data; honor DNT/GPC and failure/offline behavior. Integrate without account-entry or financial handlers. Enable existing provider only within authorized service/plan scope; record any external verification boundary honestly.

## Task 4 — Qualify and commit
Run targeted navigation/guide/privacy/identity checks, full test suite, one final production build, compiled mobile/desktop/API-stalled and retained navigation browser flows, and byte-budget checks. Obtain fresh whole-change review and fix important findings. Stage only task files. Integrate current main without overwriting other work; commit locally, no push/deploy.

Review focus: exact round-trip preservation of unknown/held content; first cold and repeated offline navigation; copied/private URLs leaking into analytics; accurate offline capability copy; route/canonical/sitemap/offline-manifest consistency.

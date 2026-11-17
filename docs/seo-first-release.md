# First SEO release

The two owning public guides are `/learn/offline-banking/` and `/learn/banking-outage/`. They reuse Learn rendering, Notes/Security cross-links, the Banking footer, canonical metadata, social cards, sitemap and the existing offline shell. Copy distinguishes completed offline Note delivery and receipt from connected reconciliation and qualified new offline spending.

## Delivery

`bank.presentation-envelope.v1` losslessly packs the existing compact navigation and shared walkthrough table. The existing classic Learn runtime opens it synchronously, without another request. Source, unknown fields, held destinations and lazy mounted roots retain their existing contracts. Legacy plain navigation remains readable. Profile/prepared-document renderers and intent-only missing-document loading use the same reader.

Build qualification enforces complete emitted HTML below 2,000,000 bytes for the homepage, both new guides, Notes and Security. The shared Learn CSS + JavaScript gzip allowance is 20,100 bytes: the previous 15,100-byte allowance plus at most 5,000 bytes for synchronous decompression and privacy filtering. Existing Feed, catalog, account-entry and document capacity contracts remain in force.

## Public measurement

The existing Vercel project `bank`, team `kojibs-projects`, has Web Analytics enabled on the included plan. The application code still needs deployment before production collection begins. No Plus upgrade was selected.

The fixed public-path list in `src/presentation/public-acquisition.mjs` controls manual pageviews and two coarse events: `Public guide link` (guide and destination) and `Public account intent` (guide). Intent counts a public Enter bank/Open account click; it does not establish account creation, payment completion or revenue. No identity, financial handler, form value, private route, storage, cookie, offline event queue or replay instrumentation is added by this integration.

Static tracked heads carry `no-referrer` before assets. The script also uses `no-referrer`; the event filter requires the current document policy, strips URL query/fragment and permits only the fixed event payloads. Private entry/referrers, offline visits, preview hosts, Do Not Track and Global Privacy Control skip provider loading. This intentionally undercounts some visits. Provider failure never blocks a page or retries stored events. The Privacy page links the provider’s processing description.

After pushing and deployment, open Vercel → bank → Analytics. Confirm the two guide paths, sanitized pageviews and coarse events. Do not send test identities or payment content. Analytics authorization is not evidence of live collection or organic ranking.

## Reproduce qualification

Run `npm test`, `npm run test:account-entry-freeze`, and `npm run build` sequentially against stable sources. Run `npm run test:seo-browser` after building. It uses isolated headless Chrome, the compiled pages, unavailable APIs and repeated offline held transitions at phone/desktop widths. JavaScript-disabled entries retain their full readable guide and canonical links.

The analytics check reads the official provider script, then intercepts all provider traffic locally. It verifies event bodies **and HTTP headers**, including copied public URLs with private query/fragment test values and entry into the private account route. No analytics fixture request reaches Vercel. To use an already captured official script, set `BANK_SEO_ANALYTICS_FIXTURE=/absolute/path/to/script.js`. Set `BANK_SEO_BROWSER=webkit` for the installed WebKit runner or `BANK_BROWSER_EXECUTABLE` for a supported browser executable. Results/screenshots are written under `test-results/seo-release-*`.

## External follow-up

Google Search Console ownership/coverage and query data were not available during implementation. Verify or use the existing property for `bankeiz.com`, submit `https://bankeiz.com/sitemap.xml`, inspect both new guide URLs after deployment, and establish impressions/clicks/CTR/account-intent baselines before claiming search results improved. Crawl eligibility and a smaller document do not establish indexing or rankings.

The Vercel dashboard displayed an overdue-payment warning for the hosting team. The owner must resolve billing separately; this release does not change billing or pay invoices. Commit, CI, deployment, live collection and Search Console evidence must be reported separately from local qualification.

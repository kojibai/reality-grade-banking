# Public original reader fixture

Run the normal Vite development server and open
`/tests/browser/proof-reading-ui.html`. This uses the shipped public catalog and
the real `PublicAssetDetail`, caption, media reader, relay, and SDK verification.
It does not load the account app or connect an identity. Trade buttons are disabled.

The selected public post is `3f507095-b264-4606-916b-34f86c506ba3`. Its image must
verify before its carried essay can open. The catalog contains only an
availability hint; the reader obtains text from the verified Moment's
`anchor.claim.longForm` and checks the post coordinate, image digest, and text SHA.

For reproducible browser QA while the public Moment download is unavailable,
intercept only `**/api/bank/public-market/record?*` with Playwright
`route.fulfill({path: '<repo>/tests/fixtures/public-essay-record.png', contentType: 'image/png'})`.
This is the exact 113,184-byte public signed record documented in
`../fixtures/public-essay-record.md`; the SDK verifier remains real. The original
image still loads through the live public relay and canonical verifier. Do not
replace verification or turn catalog caption text into verified reading content.

At a 390 × 844 viewport, check destination pills, the small “Read full text”
control, complete essay, font controls, Escape/close, focus return, and reduced
motion. The full reading contains 17,952 characters. Screenshots belong outside
the public directory. This fixture and its signed record are test-only.

Append `?chart=1` to select an older object with a matching sigil pricing seed.
This explicit test mode imports the existing public capitalization file to
simulate the source already admitted by Market Overview. Production asset
details introduce no source request; their period switches and local Kai updates
reuse that in-memory source. Unsupported objects retain the untimed quote chart.

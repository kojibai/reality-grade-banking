# Bank refinements — October 14, 2026

The app keeps the same mobile console and SDK/MCP/AI Skills 129.0.0. No npm dependency or external service was added. A local copy of Receiz's existing jsQR 1.4.0 decoder (Apache-2.0 license retained) is loaded on demand for Safari camera/image scanning; it is excluded from PWA precaching. The 1.5 MB social image is fetched by preview crawlers or the public guide, not by the main console.

## Changes and source boundaries

- Uploading an inspected no-phrase Identity Seal opens the account automatically. Legacy encrypted seals ask for their existing phrase. Opening is single-flight; pending inspection disables conflicting entrance actions. Re-selecting the same file retries.
- New onboarding uses the genuine SDK's protected bootstrap, locally unwraps the same signing key, creates an owner-bound no-phrase seal and independently re-admits its exact bytes. The user download has no generated recovery phrase. The original protected bootstrap remains the private remote transport; signing key, public key, key ID and owner must remain identical. New user credential creation/download has not been performed by the agent. Existing imports keep their original protection.
- A verified same-owner carried wallet summary can supply first paint. A signer-authenticated foreign account placement cannot establish a remote account binding. It still waits for continuation and a protected same-account read; a historical identity-bound observation remains report-only display data.
- Total/Reserve/Settlement charts use retained exact account observations. Pointer, touch and keyboard inspection display exact cents and local times. Current v129 Kai-day comparison uses 17,491,270,421 micro-pulses and the last observed balance before that boundary. Missing history is not synthesized as zero, a gain, or a smooth demonstration series.
- Public showcase objects appear in Assets and the account preview using the confirmed account's display username. Original ownership authority remains the admitted proof. The showcase list renders 50 rows initially and grows before its end. One shared public Market read/polling loop serves the views.
- Market's top panel aggregates latest public valuations once per asset. Missing valuations and an incomplete collection are reported. Its chart records actual complete aggregate observations; public capitalization is indicative valuation, not funded liquidity or executable proceeds. “View assets” leads to Explore.
- Create an asset opens the real in-bank definition form. SDK-owned sealing, exact-byte verification and encrypted device holding compose the result. Defined units and a carried linked original record authorship; they neither issue a funded currency nor commit its backing. Native funded issuance, fractional ownership and transfer execution remain separate unfinished boundaries.
- NFC writes a real NDEF URL record on a compatible secure browser and can check its exact URL by reading the tag back. Cancellation and request changes abort the operation. Safari cannot program NFC tags through Web NFC; the bank gives the exact URL and setup instructions for a compatible writer/device. No physical tag/camera permission or financial payment was used by the agent.
- Card loading has a visible timeout, retry and status check. The existing Receiz bootstrap is supplied in the iframe fragment as well as window.name, because Safari can clear window.name across origins. The fragment does not reach HTTP requests or referrers. No direct Stripe SDK/API was added.

## Card root cause and host repair

Public read on October 14 confirmed `https://receiz.com/payments/embed/checkout` returned HTTP 200 with `X-Frame-Options: SAMEORIGIN` and no enforced CSP. This blocked its frame on `bank.receiz.com` regardless of environment variables.

The user separately approved the scoped Receiz exception and requested a main commit. Receiz main commit **009d7062f8403beabebd84a3784bed7c9a4e86df** permits only the public bank and its existing local 4173/5173 parents on the exact checkout pathname. Other pages keep their frame restrictions; production retains other CSP directives. The focused checkout/SEO tests, production assertions, existing API security contract and ESLint passed. No SDK/API contract or package version changed. The user pushed; Vercel production deployment **dpl_8F7NF6jysins6AvcYZvMZwMcSDX9** is READY in production and aliased to receiz.com. Live document reads confirm no X-Frame-Options and the exact fixed frame-ancestors directive, with other production CSP directives retained. A credential-free browser iframe on the bank loopback origin renders Receiz’s expected “Missing embedded checkout session” page, proving framing is repaired. Actual valid-session card entry and payment completion still require user-operated verification.

## Search and share

`public/receiz-bank-share.png` is the custom 1730×909 Open Graph/Twitter/iMessage artwork. Built-in image generation prompt: premium Receiz Bank editorial share card, warm white/deep navy/cobalt, existing r mark, exact “Your value. More possibilities.” and “Hold. Move. Grow.”, sculptural glass/cobalt layers, no invented balances or crypto imagery.

Static head metadata includes canonical URL, robots, social image dimensions/alt and Organization/WebSite/WebApplication structured data. The build prerenders the existing entrance and four public guides with real headings and canonical paths, generates their sitemap, and provides robots.txt and a descriptive llms.txt. Private API/account data is excluded. No fabricated ratings, regulatory status, interest guarantees or ranking promises. First-page ranking and AI inclusion cannot be guaranteed; Search Console submission and indexing are still external steps.

## Remaining history and native execution

The current open local bank seal has no carried private account history. Existing v129 client contracts expose protected balance reads and public ledgers, but no delegated private-history read for an identity-only seal. This patch expands genuine carried ledger/transfer shape support; it does not replace missing private transactions with public activity or fabricate a ledger. A complete carried source or qualified same-account history addition remains needed.

The native account `SUBJECT_OWNER_CONFLICT`, qualified custody issuer/receipt evidence, atomic funded ownership/backing adapter, financial callbacks, wire receiving instructions and unknown expired-session outcome resolution listed in launch-status.md are still unfinished. A successful checkout header repair does not qualify those operations.

## Verification

Bank TypeScript, production build, static share/page checks and focused regressions pass. A read-only code review found two account-opening defects, both repaired with regressions; no unresolved Critical/Important findings remained. Mobile browser evidence confirms the aggregate chart/tooltip and restored asset definition form. All **232 tests in 68 files** pass. The test environment emits three non-failing socket-reset diagnostics from transport fixtures. The local Vercel 64.0.2 production build and fresh emitted-function smoke pass; static metadata, actual image dimensions, all four guide routes, sitemap, and QR precache exclusion also pass. No user financial action was executed.

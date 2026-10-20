# Receipt links and previews

Copy and Share compact the receipt already displayed. No account read, Ledger
refresh, shortening service or saved server-side receipt is involved.

The versioned packet carries every field in the existing shareable receipt,
losslessly. Positional JSON plus bounded DEFLATE replaces the uncompressed JSON
fragment. Existing `/receipt/#r=…` links remain readable. New links use
`/receipt/?r=…`, so iMessage and social crawlers can read the preview metadata.
Typical links become substantially shorter (the browser fixture is 945 → 363
characters); a self-contained link's length still depends on its contents. No
receipt fields are dropped to reach a fixed length.

Existing disclosure boundaries remain in place: account-only in-app context and
shared funding cohorts are not newly serialized into a link. The original source
proof remains authoritative. Neither the packet nor its image is a new signature
or an independent verification of a payment.

`api/receipt.ts` only presents the supplied packet. HTML uses the built receipt
entry and specific Open Graph / Twitter metadata. PNG images use the same
Bankeiz artwork and bundled Inter fonts as public-page sharing cards. Dates in
the image use UTC for consistent previews; the opened receipt uses the viewer's
local time. Image responses can be cached by their complete packet URL; HTML is
not cached. No cookie or credential is forwarded, and no upstream is fetched.
The build bundles the shared TypeScript readers for the Node entry without
copying their implementation; PNG rendering remains a separate lazy chunk.

Decoded payloads have a fixed 24,000-byte bound. HEAD validates the packet but
does not read the HTML template, load fonts or render PNG. Unsupported methods,
duplicate parameters and malformed packets are refused before presentation.

Verification:

- `tests/receipt-sharing.test.ts`: exact round trip, privacy scope, bounded
  decoding, Unicode, native share cancellation and clipboard fallback.
- `tests/receipt-preview.test.ts`: crawler metadata, escaping, real PNG size,
  HEAD, input refusal and zero upstream access.
- Existing receipt and Ledger UI tests: carried details and Share beside Copy.
- `tests/browser/receipt-sharing.html`: synthetic preview and both link formats.
- `node scripts/check-receipt-vercel-build.mjs` after `vercel build --prod`:
  emitted route/function, traced HTML/fonts/native renderer and no network reads.

The image and metadata are tested locally. Final iMessage/X rendering depends
on the deployed route and those clients' link-preview caches.

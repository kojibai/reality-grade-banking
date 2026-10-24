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

## Permanent short receipts

An explicit Share/Copy action opens the receipt sharing panel and saves the complete curated display record under its SHA-256. The resulting `/receipt/<sha256>/` URL is93 characters, independent of the carried funding history's length. All supported funding nodes, parent links, source cohorts, trade details and technical evidence remain in the saved record. Funding source and Full funding history stay independently collapsed.

The short link identifies a fixed capture. “View in Ledger” selects the corresponding public record, where later disclosed activity can appear. It does not add future transfers to an old capture. Only permitted public receipt fields are published; arbitrary private account, chat and custody fields are excluded. The hash checks delivery integrity; originals retain financial, ownership and verification authority.

The first cold open reads one saved record server-side and includes its complete initial data. The browser does not repeat that read. Re-sharing an opened short URL uses that same ready URL, including offline, with no publication request. Successful saves are retained locally; repeated concurrent saves coalesce. Ordinary Ledger loading, categories, record opening and account startup perform no receipt publication or storage reads.

The panel exposes native Share and Copy after the short URL is ready, preserving iOS tap activation. Download original remains available even if publication is unavailable or exceeds the bounded display-delivery capacity. Existing query and fragment links remain supported. Public delivery is a dependency for a new recipient's first open; it is not payment or account authority.

Deployment: the existing Receiz public display-snapshot route must be deployed before the Bank UI. It uses the already configured public shared-object transport, isolated from private custody, and requires no database migration. No real financial operation or private publication is part of the test fixture.

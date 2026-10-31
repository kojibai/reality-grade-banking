# Public machine reading verification

## Result

Public content has separate semantic HTML and text reading views. The account
app, public interaction runtime, calculations, playback, account entry and
permissions retain their existing behavior. This change adds no app data reads,
subscriptions, timers, prefetching or media preparation.

The reading directory contains 1,156 static pages generated from existing
authored content, 4,256 admitted catalog assets and 45,666 retained public Ledger
records. Catalog and Ledger pages link onward in groups of 50. Named public
profiles and Originals use the existing anonymous readers; private/missing
responses never fall back to a previously public copy.

## Before and after

The sampled existing homepage, profile and asset HTML responses were about
12–15 MB, including retained app navigation and inert examples. Those app
resources remain in place. Reading views omit them rather than changing how
the app works.

An actual public Original response was captured without credentials. Its
selected essay contained 53,662 characters. The reading projection preserved
the complete text, public proof fields, price in USD/Phi, quote, multipliers
and carried material metadata in 60,539 bytes of HTML or 58,403 bytes of text.
The response's 610 other Originals were not rendered. One source read is used
per request; concurrent reads of the same Original share only their in-flight
read, with no retained visibility fallback.

The independent review also exercised multi-copy collectible owners/sealing
times and all seven shipped public EPUB previews. Their owner links, preview
URLs and payload digests remain available without a material download or a
new source request. Download permissions stay with their existing endpoints.

## App preservation checks

- All 333 existing app JavaScript/CSS resources matched the baseline byte for
  byte. All 56 public Learn JavaScript/CSS resources also matched exactly.
- Expanded public navigation and account content matched. The expected
  exception is the legal page's link to the newly generated source archive.
- Root HTML outside the carried navigation matched after removing the two
  inert reading-discovery metadata links.
- The PWA retains the exact same 485 resource URLs and page routing map.
  No `/read/` page enters its installation cache.
- The normal Original reader's projection remains deeply equal to the reading
  projection after removing only the two reader-specific metadata fields.
  Default source URL, body limit, credentials policy and admission parser are
  unchanged.
- Reader routes use new subpaths and do not capture `/read/` as a profile
  handle. Existing app destinations and public/private boundaries remain.

## Checks run

- Full clean-snapshot suite: **784 files, 4,740 tests passed**.
- Focused final source, privacy, escaping, routing and existing preview checks:
  **87 tests passed**.
- Typecheck and complete production build passed, including plain Node API
  boot, public source-read counts, frozen account entry and public-page checks.
- Complete browser regressions and Vault browser checks passed. Vault checks
  used virtual fixtures and performed no financial action.
- A clean source-archive extraction built the full app and reproduced both
  native modules and all 211 SDK JavaScript outputs.
- Independent review found no remaining Important/Critical issue after the
  per-copy owner and public book-preview omissions were corrected.

The first restricted-network suite could not exercise two existing localhost
HTTP fixtures. The complete suite was rerun with loopback access and passed;
no fixture or application behavior was relaxed.

## Deployment and scope

No production configuration, deployment or upstream application was changed.
The user pushes this commit. Existing unfinished ownership/Vault work was
excluded from the release snapshot and commit.

Anonymous requests returned HTTP 200 for the sampled public pages and robots
policy. The external reading tool also refused the tiny robots URL, so its
refusal does not establish an application access block. These changes provide
readable, crawlable public representations; third-party retrieval and indexing
still depend on those services.

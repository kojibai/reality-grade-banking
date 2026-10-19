# Public discovery, sharing cards and entrance

The login entrance retains the single original **Explore Reality-Grade Banking**
link to `/learn/`. Explorer and Ledger navigation remain inside the public learning
surface; neither is added as another entrance action. Learn also links directly
to the deterministic valuation method.

## Sharing images

Sixteen public routes have distinct Open Graph and X/Twitter large-image metadata:
the home image is unchanged, and fifteen new cards use the same warm white,
navy, cobalt and layered glass direction. Each new card has a page-specific title,
caption and functional motif. Cards are 1730 × 909 PNGs, below 700 KB each except
the existing home image, and have descriptive alternative text.

The image manifest pins exact bytes, digest, dimensions and content-addressed URL.
The build regenerates and compares the outputs using retained unmodified Inter
4.1 fonts and the SVG drawing source. No network or account source is needed.
Images and fonts are excluded from application preloads and the PWA precache.
The complete drawing source, font inputs and SIL license are in the source archive.

## Crawlable public content

- Each route has one title, description, canonical URL and matching social URL.
- Public guides are complete static documents. Explorer, Ledger, Verify and
  Conformance include readable introduction and navigation before JavaScript.
  These placeholders report no verification or conformance result.
- Page-specific WebPage/CollectionPage and BreadcrumbList graphs describe the
  actual surface. The original homepage organization/application graph remains.
- Static navigation carries the exact metadata for every learning page and legal
  notice, so in-app guide navigation updates the preview and canonical fields too.
- The sitemap contains only the fourteen indexable canonical routes. It excludes
  the receipt and legal notice; existing receipt `noindex,nofollow` and
  `no-referrer` settings remain. No receipt payload enters sharing metadata.
- The previous fixed, stale `lastmod` and `dateModified` dates are removed.
  A new build or live pulse is not represented as a modification of every guide.
- The public explorer's source directory is now included in the existing source
  archive allowlist.

The production build checks all routes, title/description/image uniqueness,
canonical and sitemap agreement, structured data, image bytes and cache exclusion.
Search visibility still depends on crawling, competition and the usefulness of
the published material; this work makes no ranking promise.

Guidance reviewed: [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide),
[title links](https://developers.google.com/search/docs/appearance/title-link), and
[sitemap construction](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

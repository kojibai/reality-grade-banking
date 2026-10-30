# Public sharing artwork

`npm run social:build` creates page-specific PNG cards and publishes the
retained home artwork under its own content-hashed URL. The SVG drawing source
uses the site's warm white, navy and cobalt palette, its bank geometry and a
distinct functional motif for each page.
All text is rasterized at build time. No artwork or font is requested by the
account runtime, added to a preload or included in the PWA precache.

`public/social/manifest.json` binds every route to the exact image digest, byte
size, dimensions and descriptive alternative text. Generated filenames include
their content digest so a changed card has a new crawler cache key. The build
checks all outputs from the retained drawing source and fonts without network.
The homepage retains its original glass composition with the current bank icon;
`public/receiz-bank-share.png` remains available for older shared links. The
page-specific cards and generated receipt previews use the same bank geometry.

Feed and Discover use the same complete, static metadata pipeline as the other
public pages, including canonical URLs, structured data and sitemap entries.
The booking shell also carries a static calendar card so preview clients that
do not identify as crawlers still receive an image without another page request.
Its template is not indexed or declared as the canonical URL of every host.
Recognized booking crawlers retain the personalized invitation, owner URL and
portrait image. No sharing image is preloaded by the booking or account screen.

The retained home image was edited with the built-in image tool using the
existing artwork and `public/icon-512.png` as references: replace only the white
lowercase B in the navy tile with the official bank mark, preserving the tile,
wordmark, copy, glass composition and backdrop. The final PNG is 1730 × 909.

Inter Regular and SemiBold are unmodified static TTFs from the official
[Inter 4.1 release](https://github.com/rsms/inter/releases/tag/v4.1), specifically
`extras/ttf/Inter-Regular.ttf` and `extras/ttf/Inter-SemiBold.ttf`. Their SIL Open
Font License is retained in `fonts/OFL.txt` and published with the other notices.
The font build inputs and SVG source are included in the source archive.

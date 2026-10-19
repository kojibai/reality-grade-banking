# Public sharing artwork

`npm run social:build` creates fifteen page-specific PNG cards alongside the
unchanged home image. The SVG drawing source uses the site's warm white, navy and
cobalt palette, its bank geometry and a distinct functional motif for each page.
All text is rasterized at build time. No artwork or font is requested by the
account runtime, added to a preload or included in the PWA precache.

`public/social/manifest.json` binds every route to the exact image digest, byte
size, dimensions and descriptive alternative text. Generated filenames include
their content digest so a changed card has a new crawler cache key. The build
checks all outputs from the retained drawing source and fonts without network.

Inter Regular and SemiBold are unmodified static TTFs from the official
[Inter 4.1 release](https://github.com/rsms/inter/releases/tag/v4.1), specifically
`extras/ttf/Inter-Regular.ttf` and `extras/ttf/Inter-SemiBold.ttf`. Their SIL Open
Font License is retained in `fonts/OFL.txt` and published with the other notices.
The font build inputs and SVG source are included in the source archive.

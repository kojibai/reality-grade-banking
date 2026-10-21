# Public asset media sharing

Share the ordinary `https://bankeiz.com/asset/<encoded-source-id>/` URL. Opening
it goes directly to the standalone asset page. Sharing does not change the URL,
create an account, open payment or redirect the visitor to another site.

## Inline playback

Audio and video asset pages advertise a small HTML media view over Receiz's
existing public playback role as their player card. They also advertise an oEmbed discovery link so supporting
websites can turn the asset URL into a player automatically. Bankeiz adds no media storage, streaming relay, source admission or playback
authority. The view uses native browser controls, has no scripts or account
runtime, and permits embedding. Receiz’s full Live Player currently sends
`X-Frame-Options: SAMEORIGIN`, so it cannot itself be framed by another website.

Where the existing public discovery response carries a supported public stream,
the page includes `og:audio` or `og:video`, its HTTPS equivalent and the known
media type. Missing streams stay absent; a sealed PNG or arbitrary Original
download is never relabeled as playable audio/video. Gated audio is not given a
direct stream descriptor. The existing Receiz host checks current source policy
when either its player or media endpoint opens.

When no separate playback was prepared, an explicitly ungated audio listing
can use its already-public self-contained audio Original. Its MIME type and
enclosing digest must match the carried material descriptor and exact public
package URL. Prepared playback and older public storage/preview streams retain
their existing addresses. Bankeiz does not probe alternative URLs or substitute
the protected Original-download purchase endpoint.

Metadata is in the first HTML response, without executing JavaScript. Navigating
to a retained asset updates the same metadata in the current document and removes
it when leaving. The existing asset-specific sharing image remains the fallback.

The receiving platform chooses whether and how to render playback. Apple
[documents direct video rich links](https://developer.apple.com/videos/play/tech-talks/205/).
Music uses the same Open Graph audio and player-card fields as Receiz's existing
music-sharing implementation. These are compatibility signals, not a guarantee
that every Messages version, messaging app or website will play every format.
Actual iMessage audio/video presentation requires a deployed-link device check.

## Embed from a website

Sites that support [oEmbed discovery](https://oembed.com/#section4) can consume
the discovery link on the ordinary asset page. A custom consumer can request:

```text
GET https://bankeiz.com/oembed?url=<URL-encoded-public-asset-URL>&format=json&maxwidth=640
```

The response includes the authored title, provider and an iframe for the
lightweight Bankeiz view. Audio uses the oEmbed `rich` type; video uses `video`. Nonmedia
assets return `link`. The response respects `maxwidth` and `maxheight`; hosts
should allow enough space for the player's controls. Websites may require a
provider allowlist or permission to frame `https://bankeiz.com`; the browser
loads the admitted public stream directly from `https://receiz.com`.

Only canonical Bankeiz public asset URLs are accepted. Private/missing listings
return unavailable, malformed URLs return 400 and unsupported formats return
501. The endpoint is public, read-only and supports JSON and side-effect-free
HEAD. It does not accept an arbitrary fetch destination, credentials or tokens.

## Resource and proof boundaries

Preview metadata reuses the existing public listing. The bundled public
snapshot carries source-bound titles and supported playback locators. Titles
for older cached rows are corrected synchronously only when asset identity and
original digest match; no additional title request is made. Neither metadata nor oEmbed downloads media, runs the proof verifier,
renders a PNG or opens an account. HEAD performs no listing lookup. The regular
application reads media through the included, unchanged v129 canonical read
verifier, with its pinned roots and an exact selected-artifact SHA-256 match.
This read-only operation supports older carriers already accepted by the
canonical verifier. It does not relax append/admission, custody, financial
verification or antirollback rules.

Image listings prefer their existing public image or digest-bound image material
before a receipt fallback. Cold HTML and the mounted viewer use that same image
address; public material previews use anonymous CORS. Verification reads the
same immutable public URL, allowing browser cache reuse instead of a second
proxy download. A visible preview is not labeled verified until canonical
verification succeeds. No extra artwork/title discovery request is introduced.

The read-only verifier import carries its generated exact build hash. The PWA
can reuse the matching installed resource without fetching or storing another
copy; a different hash or additional query cannot select that cached build.

An embed is public media presentation. It does not establish ownership, grant
downloads of protected originals, authorize a purchase or prove spendability.
The standalone page retains original evidence, ownership, valuation and trading
through their existing separate contracts.

## Qualification record

Local tests cover canonical URLs, first-response metadata, retained navigation,
source restrictions, iframe headers and mobile controls using synthetic media.
They do not certify delivery by a third-party messaging app.

On October 21, 2026, the sampled unprepared playback alias returned HTTP 404 and
its protected Original download returned HTTP 402. The same listing already
carried an explicitly public self-contained MP3 material URL. That public URL
returned HTTP 206 in real-browser playback, including start and seek; no host
change or protected-download fallback was needed. The reported older image and
a newer image both passed canonical verification and displayed their actual
image with no receipt request. Browser tracing measured one image-body transfer
per sampled page, with the verification read reusing the response. See the
[qualification record](verification/2026-10-21-public-asset-media.md). A deployed
Messages device check remains required for iMessage's own inline presentation.

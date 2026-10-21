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
application still uses its existing verification and playback path.

An embed is public media presentation. It does not establish ownership, grant
downloads of protected originals, authorize a purchase or prove spendability.
The standalone page retains original evidence, ownership, valuation and trading
through their existing separate contracts.

## Qualification record

Local tests cover canonical URLs, first-response metadata, retained navigation,
source restrictions, iframe headers and mobile controls using synthetic media.
They do not certify delivery by a third-party messaging app.

On October 21, 2026, the sampled public audio playback role returned HTTP 404;
its sealed Original download returned HTTP 402. Bankeiz does not substitute that
protected download or bypass its policy. The source host must deliver the admitted
playback role before this track can qualify for public inline playback. A deployed
Messages device check remains required after that delivery succeeds.

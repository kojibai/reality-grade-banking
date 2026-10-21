# Public profiles

Approved in conversation, October 21, 2026. The user selected the centered
banner/portrait header and both single- and double-column collection views,
then instructed execution. This extends the existing production application.

## Experience

- `/<username>/` is the public profile; `/u/<username>/` supports names that
  collide with existing Bank routes. Existing routes keep priority.
- Logo-only header, existing Receiz cover/portrait, name, username, bio and
  public links. No invented cover, portrait, balance or social metrics.
- PBI check beside the username only for the supplied authorship status.
  The quiet Receiz ID pill opens authorship evidence, its supplied signature
  hash, identity/access guidance and the canonical Receiz profile link.
- Pay and Message use the existing account and messaging flows. Owners reach
  Edit profile and Insights without a second identity system. The ID popover has a compact photo/username
  editor, and chat sender names/photos and group people link within Bankeiz.
- Assets and Public Activity use public Showcase sources. A retained view
  preference switches one/two columns. Media opens in place through the same
  image/audio/video/book/document/reading viewer. A separate asset link opens
  the existing standalone page; return restores scroll and collection state.
- Prices use existing deterministic pricing inputs. Percentage movement is
  green/up or red/down, with its actual comparison period stated. Missing
  pricing or movement stays unavailable; it is never fabricated as zero.
- Owner Insights shows available Receiz aggregate views, streams, listening
  time and completion. No invented trend history or new analytics tracking.

## Sources and authority

Public profile reads are cookie-free, bounded, deduplicated and public-only.
The host's `canView` and privacy result are enforced before any public seed or
cache is populated. Only allowed presentation fields cross the Bank boundary;
hidden originals, private account openings, balances and messaging never do.
Initial profile responses include their first public asset page. The complete UID-bound collection
is requested only on demand; no per-asset metadata fetch or new polling.

The v129 SDK `profile.update` saves changed fields through the existing
`PATCH /api/receiz/identity/profile` route. Match immutable account UID before
accepting the result, then update presentation metadata and the public route.
Username availability is advisory; the host owns commit-time uniqueness.
No public username or client-side owner control grants write authority.

Existing profile images remain intact. The ID popover edits photo and username;
the public profile provides the full editor, including cover, social and named
links. Explicitly selected photos reuse the existing Receiz profile-media
processing/sealing route under the same scoped actor. Existing public images
and HTTPS references remain supported. Generic SDK `media.upload` remains
historical/unimplemented and is not used; no second storage service is added.
Private profiles must not be made public by opening or editing this surface.

## Delivery and qualification

Reuse the retained Explore runtime, public router, native account transport,
media viewer and ordinary identity entry. Dynamic profile pages have canonical
metadata and a sanitized first-paint seed. HEAD does not fetch a profile.
Test privacy, route collisions, unsafe links, renamed/reassigned usernames,
same-account saves, retained navigation, layout changes without requests and
on-demand readers. Verify mobile/desktop rendering against the selected
visuals, run the full suite/build, review, and commit on main. The user pushes.

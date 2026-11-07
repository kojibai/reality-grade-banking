# Personal receiving invitation sharing

The optional receiving invitation now prepares a fixed-length
`/invitation/<sha256>/` link. Ordinary Send by Receiz ID or email is unchanged.
**Prepare invitation** explicitly creates the public page from the reviewed
fields. Its nearby description explains that the preview uses the included
names. Amount and payment context remain opt-in; private recipient coordinates,
balances and Originals are never added automatically.

## Existing primitives

The implementation reuses Receiz's existing immutable public display capture
transport, the strict invitation contract, Bankeiz's receipt delivery pattern,
bundled sharing artwork/fonts, existing private draft storage and retained public
navigation. There is no new storage service, SDK method, dependency or financial
authority. The capture is explicitly public presentation, not payment proof,
sender verification, recipient acceptance or institutional qualification.

The existing Receiz handler was inspected and exercised locally with a controlled
transport: a synthetic invitation round-tripped as exact immutable bytes, with
its existing `unverified-public-display` role. No Receiz source change or
production publication was needed for qualification.

## No repeated preparation

- Opening Send or More receiving options does not publish or resolve a link.
- Explicit preparation serializes only the reviewed invitation, once, under its
  exact SHA-256. The obsolete long-fragment encoding is absent from this path.
- Concurrent identical publications coalesce. The encrypted draft keeps only the
  acknowledged digest in addition to its existing fields. Matching unchanged
  invitations reuse that acknowledgment after reopening; changed presentation
  produces a different capture.
- Copy, URL-only copy and native Share use the prepared URL without publishing
  again. A publication failure retains the already-held private work controller;
  only an actual private persistence failure invalidates that controller.
- The server reads the immutable capture and renders the complete addressed brief
  into the first HTML. The browser reuses its separate carried seed, with no
  capture, account or profile request. That seed never enters global prepared
  navigation data.
- HTML and social-image readers share the same bounded immutable capture reader.
  The PNG renderer is lazy and uses local assets. Names appear in OG/Twitter
  metadata and artwork; message, amount and purpose stay out of those previews.

The previous fragment format remains supported. Generic `/invitation/` and the
public `/receiving/` guide retain their existing behavior.

## Verification scope

Focused tests cover exact bytes/digests, invalid and oversized input, publication
failure/retry, coalescing, acknowledged reopen, privacy, generic/short routes,
first-paint content, metadata escaping, names-only PNGs, zero-work HEAD requests,
compiled Node imports and development/preview routing.

Browser qualification uses the actual compiled server graph, production HTML and
shared runtime at mobile and desktop widths. Controlled normal-person and long
institutional-name captures cover personalized first paint, short URL copying,
separate seed custody, metadata, artwork, focus and overflow. The private Send
check covers one explicit publication, no additional publication or reads on
copy/share/return, the same retained Bank/draft and the existing scroll behavior.

No invitation was sent, production capture created, money moved or production
evidence published during QA. Build and test outcomes are reported separately
from deployment and live verification.

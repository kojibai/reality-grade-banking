# Public profiles

Bankeiz presents the same Receiz identity and public collection at
`https://bankeiz.com/<username>/`. Profiles, public assets and guides share the
retained public page runtime. Opening an asset and returning preserves the
collection layout, filters and scroll position.

## Public presentation

The profile uses its existing portrait, cover, name, handle, biography and
website. X, Instagram, YouTube, LinkedIn and GitHub use individual icon links.
Additional named links appear in a compact **More links** popover. Those links
are saved in Receiz's existing profile, rather than a second Bankeiz directory.

The blue check represents the authorship status supplied by Receiz. Its evidence
popover shows the available PBI signature hash and links to the existing Receiz
profile. It does not certify device custody, financial authority or offline
consumption conformance.

Assets support one- and two-column views, categories, search, shareable standalone
pages and the existing inline media reader. Prices are public display projections;
percentage movement compares one day, or the period since creation for newer
assets. Missing pricing or movement stays unavailable. Public Activity lists the
collection's public assets and their original sealing dates; private transactions,
balances and messages are not published there.

Owners have **Edit profile** and **Insights**. Insights shows only Receiz's
available aggregate asset views, plays, listening time and completion counts.
It adds no tracking or synthetic trend history. Profile prices use the already
carried pricing inputs and shared local clock; opening a profile directly does
not start whole-Market discovery or its overview worker.

Profile links in ownership details, asset history, publication results and chat
navigate within Bankeiz. Chat names and portraits link directly to the member’s
profile; group conversations expose a compact people list from their existing
membership data. The ID popover links to the same page for viewing, sharing and
full editing. Original proof and identity-source inspection links remain explicit.

## Identity, privacy and edits

Public reads omit cookies and authorization. The response must identify the
requested handle and an immutable account UID, allow anonymous viewing, and be
public. Hidden Originals and private account fields are excluded before a public
HTML seed or client display cache is produced. Named profile reads are coalesced
only while in flight. A retained tab view is rechecked on later entry; privacy or
missing-profile refusals remove that view. Profile caching is display retention,
not an authorization or ownership mechanism.

The initial public response includes its bounded first collection page. Expanding
the collection uses the existing complete `surface=public-route` profile response,
checks the captured UID, and replaces the snapshot. Legacy Originals cursors carry
no UID and are deliberately not merged into a previous owner's collection.
Responses are size bounded; incomplete or unavailable sources remain explicit.

Editing uses v129 `profile.update` through the existing canonical PATCH endpoint
and the same device-held identity already owned by the bank. Only changed fields
are submitted. The account must remain open and its UID must match the result
before presentation changes are accepted. Username availability is advisory;
Receiz enforces uniqueness when saving. Renaming does not replace identity custody.
The ID popover offers a compact photo/username editor with debounced availability.
The full profile editor adds biography, location, cover, socials and named links.
An explicitly chosen image is prepared locally below 3.5 MB, then passed through
the existing Receiz profile-image upload, processing, sealing and publication
pipeline using the same profile-scoped identity. No image work runs before selection.
The returned account, requested image field and saved image reference must agree
before the change is accepted. Existing public collection images and HTTPS image
references remain available; the generic historical SDK media.upload is not used.

Pay opens the existing Send review with the recipient selected. Message opens the
existing direct conversation, or requests one through the current messaging API.
Neither action sends money or a message without the ordinary subsequent user
approval. No second account, inbox, call owner or payment service is created.

## Named-link contract and rollout

Receiz main commit `df5848a50eafe787248f5af4e955aef3945c952c` adds the canonical
`links` field to the profile contract and SDK input:

```ts
{ links: [{ label: 'Studio', url: 'https://example.com/studio' }] }
```

Omission preserves existing links; `links: []` clears them. Limits are 20 links,
80 characters per label, and 2048 characters per HTTPS URL; embedded credentials
are rejected. The website and five social fields remain separate.

SQL-backed Receiz installations must apply
`supabase/migrations/20261021120000_user_profile_named_links.sql` before deploying
that Receiz commit. Selected native signed-history storage needs no SQL migration.
Receiz commit `ecf7184a05bd44dd7efb7d7a54eeed46a1cf9ae4` additionally grants
profile-scoped access to the existing image-upload route and returns its account
UID. Deploy it before enabling new photo uploads from Bankeiz; it needs no schema
change.
Bankeiz verifies that Receiz returns the supplied links; an older host that ignores
the field cannot silently report a successful save. This rollout changes no Note,
antirollback, verification, financial or messaging protocol rules.

Root names reserved for existing routes use `/u/<username>/`. Filesystem routes
and explicit API, asset and public-page rewrites keep priority. Dynamic HTML has
public-only seed data, canonical profile metadata and inline content disposition;
HEAD requests do not load a profile or render media.

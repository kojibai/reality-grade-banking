# Public asset originals on Receiz v129

The explicit **Create asset** action seals and retains one account-owned
original, then places those exact bytes on the owner's canonical Receiz Showcase.
Images, audio, video, documents, attachments and complete long form remain inside
that source. Public projection reads and verifies the enclosing Receiz artifact
before interpreting the Bank asset payload. Embedded hashes check extraction;
they do not grant ownership or replace source verification.

The lazy `/native/asset-publication.v129.mjs` composition reuses Receiz's imported
source custody, owner placement, causal Showcase append and complete-source
publisher. It reopens the Identity Seal inside its SDK module instance, preserves
the accepted Showcase subject across recovered accounts, and verifies complete
accepted predecessors before extending an existing Showcase. A new genesis uses
the complete legacy inventory, including hidden Originals.

`/api/connect/profile/showcase/publication` is a Receiz transport adapter under
the existing `profile`, `receiz:record` and `receiz:seal` proof grant. It scopes
delivery to the current account and delegates source admission to the existing
Showcase writer. Source-bound finalization still verifies the original signed
route consent. Bank has no publication database or Supabase client.

The v2 publisher sends bounded JSON plans through the connector. Exact content
blocks travel directly to its signed storage upload URLs in bounded 1 MiB bodies.
After canonical acceptance, the existing public-profile inventory writer appends
verified Originals with compare-and-swap protection. Market and Explore already
consume that inventory. The ready public document and discovery projection must
succeed before publication reports `published`.

Bank stores the normalized intent digest and source coordinate in encrypted
identity-scoped custody before delivery. An interrupted response remains
`pending`. Retrying reopens the same retained bytes; the existing deterministic
imported-source placement prevents another Showcase member. The public receipt
changes delivery status and never removes local source custody. A pending intent
blocks a different creation intent until resolved.

No live asset was published during implementation. Synthetic canonical-source
tests cover local/cold byte equality, audio and complete long form, attachment
delivery, private recovery exclusion, current-account transport, retained retries
and visible pending/public states. The source manifest and rebuild gate verify
the shipped browser composition from included source without another checkout or
network access. Application composition changes do not modify the published SDK,
MCP or AI skill packages, trusted roots or financial qualification rules.

## Typed composer

Bankeiz keeps the original, cover/poster, ordered attachments and full text as
separate roles. Music and book metadata use the same Receiz source contract.
The existing short code and supply remain in the compact canonical manifest;
media bytes remain in shared exact-byte block custody, rather than base64 JSON.
Content is prepared once before sealing. The publication controller compares its
stable intent with the saved source, so recovery reuses that source and placement.

The effective envelope is 64 MiB combined, at most 200 attachments, 64 MiB for
audio/video/PDF originals, 16 MiB for image/EPUB/other originals and individual
attachments, 12 MiB for artwork, and 100,000 text characters. These are bounded
implementation limits, below the larger configured Receiz ceilings. Cold
canonical resource opening and exact transport boundaries are qualified in the
source tests; browser form and existing reader checks do not claim arbitrary
codec support or a hosted maximum-file performance measurement.

Bank's 390px and 1440px form checks cover music/artwork, EPUB/artwork, text-only
creation and retained pending-delivery retry without remote services. Receiz's
frontend components, styling and flows remain unchanged.

# Public machine reading without changing the app

## Required result

Public Bankeiz content must be readable without running the app. The signed-in
experience, public screens, controls, navigation, calculations, media access,
playback and account entry stay unchanged. Opening the app must not fetch,
prepare or maintain a second copy of its data for readers.

## Confirmed findings

Anonymous HTTP requests using a public AI-reader user agent returned HTTP 200
for the homepage, profile, Discover and an Original on October 31, 2026.
The sampled uncompressed documents were:

| Surface | Bytes received |
| --- | ---: |
| Home | 12,478,802 |
| bjklock profile | 14,856,852 |
| Original | 12,318,999 |
| Discover | 572,956 |

Home and Original documents carry about 8 MB of navigation JSON and 4 MB of
inert demonstration templates. Those resources support the existing instant
app navigation; this task does not remove or move them. An Original's initial
HTML exposes its title and summary but not its full carried essay. Discovery
cards use interactive buttons rather than ordinary crawlable asset links.

The existing robots policy allows public pages. No HTTP challenge or denial was
observed in these requests. The external page-reading tool also failed on the
122-byte robots file, so document size alone does not establish why that tool
refuses this domain. There is no evidence justifying a production firewall
change.

## Proposed implementation

Add lightweight public reading representations alongside the existing app.
Use ordinary semantic HTML and a text representation, with canonical links to
the corresponding app pages. Advertise the reader through standard alternate
links, the public machine guide and a crawlable public directory.

- Build public guide and marketing representations from their existing authored
  content at build time. Remove application scripts, styles, inert templates and
  demonstration payloads from the reading representation only.
- Build the public directory from the already-loaded public catalog. Include
  ordinary links for each admitted asset and its public owner; use bounded pages
  rather than one enormous document.
- Read a named public profile through its existing anonymous public projection.
  Preserve its visibility rules and Bankeiz's signed-Original display rule.
- Read an exact public Original through its existing anonymous Original reader.
  Show carried text, media references and the proof fields already admitted by
  that reader. Do not fetch or decode media files, rerun proofs or calculate a
  new price to make the text representation.
- Expose only existing public Ledger evidence through bounded reading pages.
  Keep private account history, keys, identity files, saved private objects and
  permissioned receipts outside the public directory.
- Describe values as observed projections with their carried Kai/source basis.
  Never promote a reader response into ownership or spending authority.

Reading requests may perform their one existing public source read. Regular app
requests do not perform that read in addition to their existing work. There are
no browser timers, new subscriptions, client-side preparation, prefetching or
new account permissions. No bot receives facts unavailable through the public
experience. A reading response must honor a private/not-found refusal rather
than falling back to a formerly public person's cached contents.

## Verification

1. Compare the normal app's emitted HTML, scripts, styles and data-source calls
   before and after, allowing only reader discovery metadata.
2. Read representative guide, directory, profile, Original and public Ledger
   responses with JavaScript disabled. Verify full carried text and useful
   ordinary links, without navigation JSON or inert demonstration templates.
3. Assert one source read for a dynamic reading request and no additional reads
   for the unchanged app path. HEAD must remain cheap.
4. Test escaping, malformed paths, private/not-found responses, paid downloads
   and separation from identity, financial operations and private receipts.
5. Run the relevant regression checks, production build and browser checks
   before committing on main. Leave pushing and deployment to the user.

## Limits

Readable and crawlable does not guarantee that every third-party service will
fetch or index a domain. Report any remaining external reader refusal separately
from verified Bankeiz responses. Do not change production access controls to
guess at that refusal.

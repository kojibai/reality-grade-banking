# Public Ledger release — v129

Bankeiz.com is the official reference implementation. `/ledger/` combines public
activity projections and offers original-source inspection, local retention,
Memory Crystal export and explicit public publication. `/learn/reality-grade-banking/`
explains the standard and links to the public repository. The existing Bank
account, notes, custody and financial selectors are unchanged by these pages.

## What an original proves

The native disclosure covers **public action history**, with its exact native
source baseline, ancestor commitments, source head, complete declared records
and original carried Kai. Its existing root signature authenticates that public
projection. An observed baseline remains explicitly observed. The other public
feed families are display projections, not silently included verified financial
history. Generic uploaded proofs retain only their actually verified source,
owner and coordinate. Publication does not transfer ownership or credit money.

A Crystal uses Receiz's Ledger PNG carrier `receiz.ledger_proof_bundle`, carrying
the complete canonical original. The 2400 × 3000 image is reopened by the same
v129 verifier before download. Its QR points to `/ledger/?source=<original SHA-256>`;
the image remains independently openable without that URL or a network.
A public link resolves only after its original has actually been published.

## Native host activation

Deploy the reviewed isolated Receiz main changes with the existing native source
directory settings. `RECEIZ_FUNDED_WALLET_SOURCE_DIRECTORY` must select the same
durable directory as `RECEIZ_ACCOUNT_SOURCE_DIRECTORY` / `RECEIZ_SOURCE_DIRECTORY`.
This code adds no database migration or SDK/MCP/AI Skills version change.

Native history is **not automatically disclosed**. An authorized operator must
review the closed projection and authorize the exact native source head through
`RECEIZ_PUBLIC_LEDGER_DISCLOSURE_HEAD`. No value is supplied in this repository.
An absent setting or an advancing head refuses current export; it never reveals
new account-derived history on the strength of an earlier decision. Do not set
this from an unreviewed HTTP response or public feed. Previously explicitly
published sources remain available under their immutable original digests.

The bounded `/api/ledger/proof` API provides:

- `GET`: the exact authorized current native disclosure.
- `GET ?discovery=1&limit=50&cursor=0`: paged public-original discovery.
- `GET ?source=<SHA-256>`: an already explicitly published original.
- `POST`: common verification review, or publication with exact-original digest,
  explicit public-copy consent and the matching nonfinancial effect.

Bankeiz relays only these paths to the fixed Receiz host, omitting private cookies,
authorization and arbitrary URLs. The relay accepts at most 4 MiB of JSON upload;
a large original remains locally inspectable and retainable. Native proof
capacity remains 16 MiB, PNG carrier capacity 24 MiB, and expanded declared
Ledger JSON capacity 64 MiB / 100,000 records. Complete source is never truncated
to the visible 60-row window. Capacity failures are explicit, not partial success.

## Publication and continuity

Opening a file changes no public state. Keeping it retains its exact original in
separate public-proof browser storage; it cannot change login or wallet custody.
Publishing requires explicit consent to expose all original carried contents;
already-public copies cannot be recalled. Private identities, account/recovery
sources, custody material and spendable notes are refused. The native host
independently reopens the original before publishing it.

Exact source storage precedes the index commit. The existing process file lock
orders concurrent commits. Retry and restart preserve the same exact original.
Ledger prefixes cannot be rewritten or pruned; older valid snapshots do not
roll back the accepted head. Individual proof discovery uses original digest
identity. This discovery index is not a financial ledger or a balance writer.

## Required release checks

Run the native `publicLedger*.test.ts` source, carrier, disclosure, HTTP and
concurrency tests, scoped TypeScript/lint and affected existing source/boundary
checks. Run Bank tests, typecheck, production build, public page checks, native
source reproduction and clean source archive verification. Inspect desktop and
393px mobile, download/reopen the image, inspect both carriers, keep/cancel,
explicitly publish only a synthetic test fixture and inspect its exact original.
Exercise an installed build offline. Test roots belong only in an isolated test
bundle; they must never enter the production verifier or publication configuration.

After the operator pushes/deploys both reviewed commits, verify the deployed
build and source archive hashes. Source-head disclosure approval, real hardware
custody and live financial capability qualification remain separate decisions.
See [current function boundaries](current-function-boundaries.md). A software
release does not imply every financial selector has been qualified or enabled.

## Existing Crystal host connection

Receiz now has a URL-selected Ledger bridge using its existing Crystal URL and
server-only transport key. The existing native admitted source reader and
OS-locked publication store run on the durable source host. Bankeiz's API path,
reader, upload review, explicit consent and Memory Crystal artwork are unchanged.

The current Receiz main has the byte client but not the Crystal service launcher.
The scoped mounting patch is prepared on Receiz main at
`docs/integrations/crystal-public-ledger-host.patch`; it was checked and exercised
against a temporary copy of the actual existing Crystal service. Applying it to
the source service remains part of that service's integration/deployment, not an
edit to the user's ongoing branch. Live verification requires that mount, the
actual Crystal URL/key configuration on Receiz and the exact reviewed disclosure
head on the durable host. No empty ledger is substituted for absent custody.

Public original writes use Crystal’s existing public package byte/inode reservations, temporary upload custody, streaming install and accounting; existing accepted source reads remain unchanged.

Focused tests use actual v129 canonical sources through a real HTTP listener.
Authentication, exact originals, repeated consent-bound publication, restart,
source unavailability, fixed-origin forwarding and response capacity passed.
A software pass does not claim that production source activation is complete.

## Availability and retained originals

A remote source outage does not invalidate an original already verified and held
locally. Memory Crystal export opens that retained complete source first and
saves it without waiting for a network timeout. A background request may retain a
verified continuation for the next export; it cannot replace an open review,
change publication consent or announce local bytes as publicly published.
A source link may open a locally retained original only when its digest matches
that exact link. Failed requests are released so the next explicit use can retry.

The intended Crystal hostname is `https://crystal.receiz.com`. The service was
not deployed at this verification checkpoint. A current-source 503 remains a
truthful unavailable response until the source host and secure connection are
installed; public activity, local file inspection, retention and export of a
held complete original remain usable. This API is deliberately outside the
service-worker cache.

The API entry now includes the strict Ledger relay directly. The release check
executes the emitted Vercel function against exact-original, discovery and
unavailable responses, including the no-private-header boundary. A successful
frontend build alone is insufficient evidence that this API route was emitted.

# Public Ledger release — v129

Bankeiz.com is the official reference implementation. `/ledger/` combines public
activity projections and offers original-source inspection, local retention,
local Memory Crystal export and explicit public publication. `/learn/reality-grade-banking/`
explains the standard and links to the public repository. The existing Bank
account, notes, custody and financial selectors are unchanged by these pages.

## Save the locally held Ledger

The public page's **Memory Crystal** button seals every public record already
held by that Ledger, with its inspection fields, carried proof/valuation data
and current source coverage. It does not fetch Ledger data or require a Crystal
host. Search and pagination affect only the view. The SDK seals the image and
reopens its exact bytes before download. **Open proof** verifies the saved PNG;
**Open captured Ledger** inspects all its carried history locally.

This is a sealed local capture of public observations. Existing original proof
objects retain their own authority. It does not become the separately signed
native Action Ledger disclosure described below, change account state, or
replace a retained native head. Source publication and native-host activation
are independent of this local save. See
[local Crystal verification](verification/2026-10-19-local-ledger-crystal.md).

## What an original proves

The native disclosure covers **public action history**, with its exact native
source baseline, ancestor commitments, source head, complete declared records
and original carried Kai. Its existing root signature authenticates that public
projection. An observed baseline remains explicitly observed. The other public
feed families are display projections, not silently included verified financial
history. Generic uploaded proofs retain only their actually verified source,
owner and coordinate. Publication does not transfer ownership or credit money.

A native-source Crystal uses Receiz's Ledger PNG carrier `receiz.ledger_proof_bundle`, carrying
the complete canonical original. The 2400 × 3000 image is reopened by the same
v129 verifier before download. Its QR points to `/ledger/?source=<original SHA-256>`;
the image remains independently openable without that URL or a network.
A public link resolves only after its original has actually been published.

## Disclosure capability and consent

Native history is **not automatically disclosed**. The supported Receiz disclosure
capability must supply an authorized exact source head. An absent approval or an
advancing head refuses current export; an earlier decision cannot authorize new
account-derived history. A public feed or unreviewed response cannot grant that
approval. Previously explicitly published sources remain available under their
immutable original digests.

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

After deploying the reviewed Bankeiz source, verify its build and source archive
hashes. Exact-head disclosure approval, physical-device custody and financial
capability qualification remain distinct. See
[current function boundaries](current-function-boundaries.md).

## Supported source connection

The Ledger integration uses the supported Receiz source, inspection and explicit
publication contracts. Bankeiz retains the exact original, consent and original
locator throughout. An unavailable source never becomes an empty accepted Ledger.
Authentication, exact-original binding, repeated consent-bound publication,
restart, refusal and capacity checks remain part of qualification.

## Availability and retained originals

A remote source outage does not invalidate an original already verified and held
locally. Memory Crystal export opens that retained complete source first and
saves it without waiting for a network timeout. A background request may retain a
verified continuation for the next export; it cannot replace an open review,
change publication consent or announce local bytes as publicly published.
A source link may open a locally retained original only when its digest matches
that exact link. Failed requests are released so the next explicit use can retry.

A current-source failure remains explicitly unavailable; public activity, local
inspection, retention and export of a held complete original remain usable. This
API remains outside the service-worker cache.

The API entry now includes the strict Ledger relay directly. The release check
executes the emitted Vercel function against exact-original, discovery and
unavailable responses, including the no-private-header boundary. A successful
frontend build alone is insufficient evidence that this API route was emitted.

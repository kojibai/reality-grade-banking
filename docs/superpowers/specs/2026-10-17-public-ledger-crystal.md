# Public Ledger: one verifier, two carried forms

## Intended result

`/ledger/` is the public activity workspace. Its public reader uses the existing
action, wallet, proof-graph and showcase sources, retains their exact source
coordinates, and links to receipts and original proofs. Learn links to this
workspace without adding ledger controls to the Learn home.

A visitor can download the complete supported public ledger history as a
beautiful, high-resolution Memory Crystal proof object. Upload accepts either
that Memory Crystal or an individual proof object. Both use the same Receiz
v129 source verification, authority, ownership and continuity rules. The carrier
does not select weaker verification, confer financial authority, or replace
original proof bytes.

## Existing boundary

The current public endpoints and retained public seed return display projections.
They are useful immediately, but their JSON rows are not complete original proof
objects. A digest or a newly sealed copy of these rows cannot turn an unsupported
balance, financial effect or completeness claim into verified truth. The public
reader must retain that distinction.

The v129 MCP package already implements the source-carrying
`receiz.intelligence.memory-crystal.v1` contract using SDK enclosing-artifact
verification, exact carried sources, verified predecessors, stable identity,
same-signer continuation, KKS coordinates and carried proof-history heads.
Its local intelligence contract is not an automatic public publication contract.
Reuse these primitives; do not introduce a competing Crystal verification rule.

## Verification and handling

1. Snapshot input bytes within capacity before parsing or projecting them.
2. Verify the complete original with the canonical v129 artifact verifier and
   its existing pinned roots. A filename, image, QR, hash, `verified` flag or
   transported root key never issues a verdict.
3. For a Crystal, open and verify the enclosing artifact and every exact carried
   source and predecessor. Validate the existing Crystal identity, signer,
   history and KKS continuity. Extract original proof objects only after this
   succeeds. An individual proof enters the same source-verification path.
4. Open each verified source's supported domain and preserve all existing
   admission requirements. A sealed document's author's claims are not thereby
   independently attested account balances, ownership or financial settlement.
5. Deduplicate by exact original artifact digest. Keep distinct source witnesses
   and all supported branches; do not replace stronger source with a projection.
6. Prepare a review from privately held, verified exact bytes. A review cannot
   be reconstructed by passing display JSON back to the commit API.
7. A ledger source extends only its admitted ledger identity and lawful
   predecessor history. Refuse missing predecessors, conflicting/pruned history,
   unsupported scope, rollback, foreign identity or changed exact source bytes.
   Repeated transport is idempotent. A valid independent proof adds its own
   discoverable proof entry; it does not masquerade as an append to another
   object's history.
8. Public publication requires explicit review and consent to make the selected
   original bytes public. Import for local inspection alone does not publish.
   Do not publish Identity Seals, signing material, private recovery records,
   spendable notes or custody capabilities through this surface. Independent
   source verification and the applicable public-publication policy both pass
   before append. The server repeats verification on the exact submitted bytes.

These are one set of verification rules. The difference is dispatch: a carried
ledger synchronizes its supported history; an individual proof contributes its
supported entry. Neither upload credits a wallet, changes ownership, or asserts
financial finality without the original domain's qualified transition.

## Native source and public distribution

The source producer must expose complete public-safe original source objects and
their declared coverage beneath the existing native source authority. It must
not export private global-ledger payloads, account credentials or wallet custody.
If the existing public projection is the only available material, retain it as
an observation and do not offer it as a verified full-ledger Crystal.

Public discovery/publication uses the existing admitted Receiz source and
coordination infrastructure. Keep durable exact bytes, semantic idempotency,
atomic predecessor comparison and append-only history. No new wallet, issuer,
root ceremony, database dependency, SQL migration or SDK version is introduced.
The public read route returns only admitted public bytes and bounded projections;
it never forwards private account responses. Source admission precedes index
updates so a failed or interrupted publication cannot create an unsupported row.

This work is isolated from the user's Receiz working branches. Implement host
adapters in the existing separate main worktree, with Bankeiz consuming them
through its bounded same-origin API transport.

## Interface and visual experience

- Preserve the existing Bankeiz app, Learn header, note artwork and financial
  flows. Ledger controls belong on `/ledger/`.
- Add subtle Download and Upload controls to the Ledger workspace. Upload has
  one file picker, then a verified source review explaining the actual effect.
- The Crystal is a crisp high-resolution image with the existing navy/paper
  palette, restrained crystal artwork, source scope, record count, exact head,
  real Kai coordinate, verification URL and QR. The image carries the complete
  original source. Printed labels and URLs remain presentation, not authority.
- A download reopens and verifies its exact final bytes before delivery. A saved
  image must reopen offline through the same verifier with identical source
  identity and history. No raster resampling of the original source payload.
- Opening an upload does not replace known history, log in, grant funds, or
  publish anything. A publication review clearly states that the original file
  becomes public and cannot be recalled from other people's copies.
- Retain accessible keyboard focus, mobile width containment, reduced motion,
  first-paint continuity and cached read access.

## Acceptance evidence

Use real v129 canonical verification in integration tests. Synthetic roots or
hardware are isolated test fixtures only and never configurable by uploads.

- A single original and a Crystal containing that original produce the same
  supported verified source identity and claim scope.
- Valid complete ledger continuation appends exactly once; duplicate transport
  is harmless; missing/changed predecessor and fork/pruning attempts fail without
  altering held history.
- Unsigned display rows, edited amounts, forged verification flags, arbitrary
  JSON/PNG, changed carried bytes, signature/KKS errors and untrusted writer
  claims fail their actual verification/admission boundary.
- Private identity, recovery and custody sources are refused for public
  publication before any durable public write.
- Review requires the exact held bytes and consent; retry/restart/concurrent
  append preserves the selected source and predecessor without duplicate rows.
- Final Crystal PNG verifies after save/reopen without network. Single-proof
  import and Crystal import use the same verifier implementation.
- Reader, upload review, export and receipts work at 393px mobile and desktop;
  source/API failures retain settled history and truthful status.

## Checkpoint on 2026-10-17

The public reader, Learn links, Reality-Grade Banking explainer and chart windows
are implemented and browser-checked. Crystal production, source admission and
public publication are a new source-carrying interface described here; they are
not yet implemented by the reader checkpoint.

# Note continuity implementation plan

> Implement inline in the existing main checkout, as explicitly requested. No deployment or public release until the financial acceptance evidence is complete.

**Goal:** One unchanged Note experience with qualified local consumption or connected consumption, and exact public integration requirements.

**Architecture:** Receiz owns proof admission, custody and financial execution. Bankeiz projects retained proof and selects only supported SDK paths. Static guidance adds no page-load API calls, polling or device ceremony.

**Tech stack:** React/TypeScript, pinned Receiz 129.0.0, current native composition, Vite static public pages.

**Spec:** [Note continuity standard](../../note-continuity-standard.md).

## October 20 flow correction — Deposit, then reconcile

The approved Bankeiz flow puts the conformance explanation only at an explicit
offline creation attempt that lacks protected issuance. Receive and local
deposit must not run a receiver qualification ceremony. Keep the original,
record the received holding locally, and reconcile its exact source before
the balance is used in a connected operation. Local retention does not invent
irreversible consumption evidence or globally spendable credit.

Reuse the existing v129 `prepareBankNoteRedemption` and
`verifyBankNoteRedemption`: the current holder can consume the Note into an
exact receiving account/key, then deliver that complete terminal source. The
recipient can verify and retain it without a custody adapter. The existing
`/api/connect/offline-notes/redemption` accepts that source, verifies the
recipient's bound key and credits it once through the shared native writer.
No Receiz core or SDK verifier change is needed for this receiving path.

Implementation order:

1. Compose a signed account receiving request with the existing Identity Seal
   signature operation; it grants no funding or account-membership authority.
2. Compose sender retirement and a PNG carrying the unchanged complete terminal
   source. Preserve the old qualified transfer path and exact-intent recovery.
3. Retain recipient-bound terminal sources in the existing encrypted vault.
   Reimports are idempotent; local held value is distinct from confirmed wallet
   credit. Receiving performs no network request, enrollment or device test.
4. Reconcile the retained terminal through the existing redemption endpoint
   before connected spending. Reopen the returned full credit proof, preserve
   an unknown result, and never credit the same original twice.
5. Keep the qualification explanation out of ordinary receipt. Verify both
   the terminal-source path and existing qualified path, then commit on main.

Audit correction: the earlier host-directory check used an older checkout.
The active main worktree is `receiz/.worktrees/receiz-bankeiz-assets-main` at
`0a4eca945`; it already contains the Bank funding/redemption routes and shared
native writer. Its current **funding** operation still requires attested
custody even when online. The receiving composition above does not remove
that separate nonconforming-custody issuance gap, and must not be advertised as
doing so. No upstream source has been changed for this composition.

## Constraints and review focus

- Preserve all original proof/history bytes and existing failed/pending custody.
- Retained, verified, claimed and spendable are separate states.
- No synthetic qualification, software counter substitute or legacy mint bypass.
- A connected transfer must consume its exact predecessor atomically; no preconnection unlock.
- Custody-path migration cannot leave two active spend authorities.
- Package parity/build success does not establish financial qualification.

## Implementation and remaining qualification

- [x] Audit exact Receiz main v129 funding/redemption routes and native writer;
  correct the earlier search of an unrelated v128 checkout.
- [x] Compose the signed account receiving destination, preserving strict
  ordinary v3 binding and verified fresh Bank genesis routing.
- [x] Compose sender retirement into a complete recipient-bound terminal PNG,
  retaining raw source before packaging and preserving exact-intent recovery.
- [x] Verify and retain completed Notes offline in the existing encrypted vault;
  keep Received Notes separate from confirmed available account balance.
- [x] Reconcile before account spending using existing native credit. Fresh
  originals use one POST, with a durable submission marker; unknown/legacy
  attempts recover first. No new service, polling, receiver credential ceremony
  or duplicate account login is introduced.
- [x] Preserve all signed artifacts in compact submission transport, full credit
  receipts and proof backups; block loss of the wrapping key while receipt is
  pending or unreadable.
- [x] Publish the fourteen laws, exact source formats, scoped device/browser/
  host/application duties and an unassessed qualification report template in
  the repository and progressively disclosed public Conformance page.
- [ ] Provide an admitted Receiz issuance profile for online creation without
  attested custody. The receiving composition does not supply this authority.
- [ ] Qualify the deployed funded issue → handover → receive → credit/spend
  sequence, physical protected custody, duplicate/replay/race/recovery and
  migration against exact builds and trust policy.
- [ ] Verify asset creation publishes the original to the owner's public Receiz
  Showcase and Market/Explore; current sealing/holding alone does not do so.
- [x] Prepare this reviewed composition for main; the user will push. Keep v1.0.0 publication blocked
  until every mandatory release gate has evidence.

## Execution record

The receiving composition uses existing v129 primitives; it does not modify
published SDK/MCP/AI Skills packages, custody qualification, native credit
admission or root policy. Complete synthetic originals exercise actual native
cryptography, and an isolated upstream writer probe exercises duplicate-safe
credit without receiver custody. These are implementation evidence, not a
physical-device or production financial qualification.

Final review found expanded-source/receipt capacity mismatches, stale partial
credit display, a missing identity-removal guard, fresh Bank genesis routing
and a provisional queue binding. Each was fixed with regression coverage.
The submission transport now removes redundant container expansion while
retaining every original signed artifact and the exact incoming archive.

See [verification record](../../verification/2026-10-20-note-continuity.md) for
current commands, results and exclusions. Release remains blocked by the
unimplemented issuance profile, deployed/physical financial qualification and
public asset publication.

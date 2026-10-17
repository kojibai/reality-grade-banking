# Native offline account credit qualification

This implementation composes the pinned v129 primitives for a funded note's
local consumption, exact private account successor and protected cash successor.
It adds no issuer, signing root, SQL migration or published package change.

## Source and custody

`bankNotes/localAccountCredit.ts` accepts an admitted complete funded note. Its
local terminal binds the note head, receiver, rail, exact amounts and both signed
account digests. The qualified note key consumes the exact current head once.
The next protected cash state uses that same key and its actual consumed counter.
An identity-signed account snapshot alone cannot establish funding capacity.

Reserve retains its original dollar denomination. Settlement retains its exact
locked Phi. The private account projection preserves all unrelated namespaces.
Its dollar display is a valuation; the complete funded source remains financial
authority.

`bankNotes/localCreditJournal.ts` retains exact source references and the original
signed preparation before consumption. It recovers the same consumed intent,
retains the terminal before activation, and adopts the account pointer with the
component record in one compare-and-swap. Repeated completed deposits return the
original result without reinitializing spent cash or replacing a newer head.
The caller must hold the existing account operation lock through every operation.
A pending deposit prevents issuance adoption, and recovery requires the retained
predecessor to match the current account head before activation or adoption.

Spending adoption independently checks the actual native consumption receipt,
exact account predecessor/successor and private value delta. Recovery pointers
and phase labels never authorize credit.

## Multiple funded components

A newer account head must not invalidate older component budgets or let them
spend using an old whole-account source. `cashAccountRebase.ts` defines the
zero-value `receiz.bank.cash-account-head-rebase.v1` transition. It binds an
unchanged component budget to the current journal-verified account head with
its original qualified hardware key, strict next counter, origin and RP.

`receiz.bank.funded-note-source.v2` carries these complete rebase receipts between
ordinary v129 Reserve consumptions. The verifier requires exact predecessor
qualification, account head, unchanged capacity and causal order, and rejects
unused or contradictory steps. Source v1 remains compatible and cannot contain
rebase steps. No private account contents are added to the public note source.

## Lossless transport and recovery

Local terminal transport v2 packs the exact terminal and complete funding graph;
it does not replace either with a hash or a claimed result. Legacy v1 terminals
remain readable. The journal retains the sealed raw terminal before packing and
verification, then retains the packed form. Recovery can losslessly repack a
retained original without another custody consumption.

Successor-depth admission and incoming-graph packing run before consumption.
Decoded graphs remain bounded at 32 MiB and local-credit recursion at 32 levels.
The wire allowance is 6 MiB; every saved/opened PNG still has the existing 8 MiB
carrier cap. These are finite resource limits, not an unlimited circulation
claim. Browser preparation must reserve successor-image capacity before issuing.

## Qualification evidence and release boundary

The real v129 native artifact verifier, root-purpose signatures, Groth16 proofs,
account proofs and strict counter receipts are exercised with ephemeral test
roots and synthetic attested hardware. Network access is disabled before note
issuance, handoff, deposit, account adoption and partial spending. Both rails cover
interrupted sealing, interrupted account adoption, exact restart, replay,
inspection-alias mutation, old-state rollback, duplicate-online-credit rejection,
two independent deposits and spending an older component. The review regressions
also cover pending-deposit/debit conflicts, stale recovered account predecessors,
depth rejection before consumption, causal rebase order and complete reissued
PNG reopening. The exact native crypto and recovery suite, scoped TypeScript and
lint checks, Bank tests/build and reproducible source checks are recorded below.

Synthetic hardware is not physical-device qualification. A lost authenticator
response before durable receipt retention remains the underlying custody
adapter's fail-closed recovery boundary; it is not evidence of an unspent head.

No production browser or API selects this local-credit family. The existing
online redemption and root-credit constructor/verifier explicitly refuse it
before any online credit or signing operation. Preserve those guards until:

1. The shared native wallet writer accounts for outstanding device cash and
   accepts the same complete lineage with one semantic transition identity.
2. Reconnect, concurrent replay and later online spending prove that the same
   value never becomes simultaneously available online and in qualified custody.
3. The Bank browser has reusable prepared funding and qualified receiving/issuance
   resources, adopts the verified account head for balance/chart, and retains
   exact pending operations across restart, and reserves the full successor
   image/lineage capacity before an irreversible operation.
4. Changed deterministic quotes and mixed-rail account projections are qualified
   against the native writer's complete value source. Tests at one fixed quote
   do not establish that boundary.
5. Supported physical custody devices pass the disconnected application journey.

The current Crystal worktree's Bank note selector still uses the compatibility
store; the native shared-writer selection is not present there or on Receiz main.
Do not replace that missing implementation with a second wallet, a mutable
balance journal, relaxed verification or a claimed successful response.

## Verified checkpoint — October 17, 2026

Receiz main commit `ce455bfe444f88000be183afdae5455f8ff8d94b` contains this qualification implementation
and its native tests. The Bank source distribution pins the same changes in its
application-patch manifest; SDK, MCP and AI skill packages remain 129.0.0.

- 26 native crypto, custody, recovery, image and compatibility tests passed.
- Scoped native production and test TypeScript and ESLint passed.
- 37 existing account-entry freeze checks and the pinned release lock passed.
- 455 Bank tests, Bank TypeScript and the complete production build passed.
- All seven rebuilt browser reference checks passed with zero financial actions
  and no page errors, checked at desktop and mobile sizes.
- The locally installed v129 MCP reported 15 passed, zero failed, zero network
  calls, zero database calls and zero writes. This is package conformance, not
  qualification of the new financial path.
- Included-source hashes, proving resources, exact module reproduction, licensing,
  source archive and offline-shell inventory passed.

These checks establish the stated checkpoint. They do not satisfy the remaining
activation gates above or establish that the whole Bank application can perform
these new financial transitions while disconnected.

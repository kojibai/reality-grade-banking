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

The isolated Receiz main implementation now supplies native Note allocation,
retained funding and credit proofs, unissued cancellation, terminal redemption
and API selection through the same native writer. It requires matching absolute
account and funded-wallet source directories and has no database fallback.
The Reserve acceptance journey covers a verified native funding source from
simulated paid ingress, qualified handoff, image reopening, local deposit, full offline respend and final online
descendant redemption. Only that consumed descendant becomes available online;
the earlier locally credited terminal remains ineligible for online credit.
The original pool bounds every accepted descendant redemption.

This does not establish complete nonzero Settlement source integration, private
offline history composition, physical-device qualification, production host
authentication or the deployed application journey. Do not substitute a second
wallet, mutable balance journal, relaxed verification or a claimed successful
response for those remaining qualifications.

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

## Browser resource checkpoint — October 17, 2026

The included v129 composition now exports `createBankPreparedBrowserRuntime`.
It uses already funded complete sources and prequalified native note slots.
Private account/cash state, staging and original proof bytes remain in the
Bank's encrypted, identity-bound retention ports. The hardware database holds
public custody credentials and counters; it is not a second account journal.
Known receiving capacity is consumed without network refill.

Creating a note verifies the original component budget and exact consumption
prefix before native custody changes. Transfer retains its original receiving
intent and artwork, validates the PNG, and reserves conservative successor
carrier growth before consuming custody. Refusal leaves the predecessor
unconsumed. A retained account successor and its balance/chart observation
commit in the same IndexedDB transaction. Concurrent writers are rejected; a
plain wallet read cannot overwrite the local financial descendant. Descriptive
clock rollback does not remove earlier chart points.

Synthetic native tests cover both rails, process restart, interrupted head
adoption and credit-pointer repair, two subsequent partial notes, altered cash
budgets, original intent replay, and image-capacity refusal before cash or note
consumption. Actual Chrome checks cover encrypted state, exact private cash
reopening, atomic state/checkpoint writes, compare-and-swap, removal guards and
remote-downgrade refusal. These storage checks use synthetic records and do not
claim financial admission. The actual refreshed browser verifier report is
[`2026-10-17-browser-resources.json`](verification/2026-10-17-browser-resources.json).

This finishes the scoped browser implementation and its local qualification.
It does **not** enable the new financial family in production. Shared-writer
reconciliation, changing quotes/mixed rails and physical-device qualification
remain separate release gates. The general Send/trading adapter also still
refuses financial preparation; it needs the source/effect implementation in
[`bank-prepared-operation-contract.md`](bank-prepared-operation-contract.md).
A runtime capability list, SDK package version or successful browser test does
not substitute for that financial-effect evidence.

Receiz main commit `d8bd278a1fa7c1957a81d15ebb83e08e04f63007` contains the nine-file browser resource
checkpoint. Final combined native suite: **20 passed**, scoped TypeScript and
ESLint passed; Bank suite: **470 passed**, TypeScript and production build
passed. v129 MCP: **15 passed**, no network/database calls or writes. The
final included source and modules reproduce exactly. Mobile/desktop receipts
and pointer/keyboard focus behavior were inspected in isolated Chrome.

## Exact remaining value and retained-client checkpoint — October 17, 2026

Receiz commit `af90a8c7a567a1e0c0ca4fbe5f3116472e4e9db3` adds receiver-quote
Settlement respend and exact remaining-rail display valuation. Reserve keeps
its original dollar claim and actual backing Phi. The private projection keeps
those components separate, so two smaller withdrawals cannot strand Phi because
of per-withdrawal cent rounding. Pure native v1 displays may normalize from exact
aggregate Phi; ambiguous mixed legacy backing requires its complete source split.

Each new signed credit/debit identifies its arithmetic version by that exact
credit ID or Note ID. Retained v1 preparation, completed-stage and intent bytes
remain verifiable under their original arithmetic, including when they preserve
newer predecessor fields. Fresh pure-Settlement spending after v1 recovery is
also covered. No private display marker creates funding or custody authority.

The complete sequential native suite passed **48/48**, including eight prepared
browser rail/receiver-quote/denomination journeys, local credit and respend,
complete native writer funding/redemption, source recovery, live proof refresh
and public disclosure/revocation. Scoped native source/test TypeScript and ESLint,
37 entry-freeze checks and the existing primitive/governance checks passed.
The full repository typecheck was stopped after exhausting available resources;
it is not a full-typecheck pass. The earlier disk-exhausted test attempt is
superseded by the complete sequential run.

The public wallet-only producer now includes verified closed identity events,
preserves each original Kai coordinate and append prefix, and refreshes changed
quotes or nonfinancial history without a wallet write. This does not expand its
scope to unsupported profile/artifact/lawful-value or outstanding offline sources.
The production local-credit and general asset-operation gates remain closed.

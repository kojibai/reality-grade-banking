# Automatic asset backing

**Status: Approved by the user on 2026-10-21. Implementation has not started.**

## Intended behavior and existing constraint

In Create → Create with backing, the funding controls contain only the backing
amount. Existing asset-definition fields remain. Funding uses Reserve first,
then Settlement for the remainder, matching the user’s requested Notes/Send
experience. The exact allocation remains discoverable in the approval review
and accepted proof. Existing antirollback and recovery rules remain unchanged.

Today, `CreateAsset` submits `fund-asset` with one `reserve|settlement` rail.
Bank and Receiz closed request validators require that field. Receiz prepares
one rail debit, and the asset state, receipt, holding certificate and account
proof carry one `backingRail`. Redemption returns all backing to that rail.
Removing the selector alone cannot express mixed funding or preserve its later
redemption semantics.

The existing native asset plan already contains multiple `movements`, one
`assetAfter`, one nonce and one plan digest. `appendBankAsset` allocates ledger
IDs for all movements, admits one statement and uses the existing durable
pending/recovery writer. Reuse that operation; no second issuance or separate
funding transaction is permitted.

## Proposed contract and allocation

Add a closed automatic variant of `fund-asset` with
`fundingRule: 'reserve-first-then-settlement'`, the definition and total
`amountUsdCents`, without `rail`. Retain the existing single-rail variant for
historical requests, receipts and exact replay. Reject ambiguous combinations,
extra fields and unknown modes. Limit this extension to asset issuance; do not
broaden the meaning of `BankRail` for unrelated operations.

Receiz resolves allocation during preparation from the admitted complete native
wallet prefix, its Reserve claim and original Phi backing, unencumbered
Settlement Phi, and the existing host valuation rate. Browser balances or a
cached preview cannot authorize the split. For requested cents A and Reserve R:

- Reserve cents = min(A, R); Settlement cents = A − Reserve cents.
- Reuse `bankNativeWalletDebit` for single-rail cases and the existing
  `bankNativeWalletCompositeDebit` arithmetic for a mixed case. Preserve Reserve’s
  admitted backing and existing denomination/rounding checks.
- Produce one or two positive rail movements in the same asset plan, one full
  asset supply and one resulting wallet state. Zero legs are omitted. The sum
  must equal the complete requested backing; no reduced issuance is allowed.

For automatic reviews, signed terms carry a closed `fundingComponents` list,
ordered Reserve then Settlement, containing each actual rail, dollar cents and
exact Phi. Validate its length, unique rails, positive amounts, aggregate totals
and equality to the prepared plan. Bind it through the existing plan digest,
identity consent challenge and native financial signature. Execution reopens
the current sources and recomputes the exact approved plan under existing locks;
a changed source or quote requires a new review, never an automatic reallocation.

## Backing continuity, redemption and outcomes

Preserve the resolved components in the native asset state and expose them in
the signed receipt, holding certificate and account-proof asset component.
Use `backingComponents` with the same exact component shape. Mixed backing has
`backingRail: 'composite'`; existing aggregate backing fields must reconcile to
the components. Keep historical single-rail encodings readable and replayable
without rewriting their signed bytes or manufacturing a new predecessor.

Transfers and trading retain the asset’s backing components. Whole-supply
redemption keeps its existing ownership/offer checks and restores each component
to its original rail, preserving the fixed Reserve claim and Settlement Phi.
For component-carrying assets, redemption empties `backingComponents` and zeros
the aggregate backing and supply. Never relabel the mixed total as one rail or
return it at a newly invented conversion rate.

Insufficient combined funds, invalid denomination, overflow or failed verification
reject the whole preparation/acceptance. Stale heads and quote changes reject the
approved plan. Existing account/key authorization, source ancestry, causal
coordinates, exact predecessor comparison and antirollback checks remain intact.
Both debit legs and issuance commit as one statement. Lost responses preserve
the original unknown checkpoint, nonce and signed intent; recovery resolves that
same operation before another issuance. Neither absence nor a browser error is
a zero-write verdict.

## Interface and affected files

Remove the Reserve/Settlement selector and its state from `CreateAsset`.
Explain briefly that Reserve funds the amount first. Keep the approval’s total
prominent; place the exact signed rail/Phi breakdown in discoverable details.
Approval still authorizes the displayed complete operation. Existing plain
definition restrictions for backed issuance remain in scope unchanged.

Bank source paths, relative to this repository:

- `src/features/assets/CreateAsset.tsx`,
  `src/features/account/NativeOperation.tsx`.
- `src/receiz/bank-operations.ts`, `src/receiz/native-asset-protocol.ts`.
- `src/receiz/native-asset-holding-protocol.ts`,
  `src/receiz/native-asset-holding.ts`, `src/receiz/deposit-source.ts`,
  `src/receiz/account-proof-statement.ts`.
- `src/features/assets/LiveAssets.tsx`, `src/components/AccountProofDetails.tsx`
  for truthful mixed-backing details.

Receiz paths, relative to its repository:

- `app/lib/wallet/bankNotes/nativeAsset.ts`,
  `app/lib/wallet/bankNotes/nativeAssetRuntime.server.ts`,
  `app/lib/wallet/bankNotes/nativeAssetEffect.server.ts`,
  `app/lib/wallet/bankNotes/nativeAssetSource.server.ts`.
- `app/lib/wallet/bankNotes/nativeAssetHolding.ts`,
  `app/lib/wallet/bankNotes/nativeAssetHolding.server.ts`,
  `app/lib/wallet/bankNotes/nativeAccountCoverage.server.ts`,
  `app/lib/wallet/bankNotes/accountProofStatement.ts`.
- Reuse `app/lib/wallet/bankNotes/nativeWalletEconomics.ts`; qualify existing
  `app/lib/ledger/fileActionLedgerHistory.server.ts` and
  `app/lib/ledger/actionLedgerHistory.server.ts` writer/replay behavior without
  replacing their durability or antirollback mechanisms.

## Focused qualification and delivery boundary

Qualify Reserve-only, exact-Reserve, Settlement-only and mixed allocation;
insufficient combined funds; rounding/precision boundaries and malformed or
tampered components. Assert one asset, full supply, exact two-leg reconciliation,
correct mixed redemption and unchanged historical single-rail replay. Exercise
changed-head/rate rejection, revoked authority, duplicate submission, interrupted
pending-writer recovery and lost-response recovery without a second debit or
issuance. Bank UI coverage must show amount-only funding controls, discoverable
signed details and exact approval; existing pending-intent checks must still pass.

Use existing native asset arithmetic, protocol, runtime and recovery test files
in Receiz and `tests/native-asset.test.ts`,
`tests/native-identity-assets.test.ts`, `tests/account-proof-closures.test.ts`
plus focused CreateAsset/review coverage in Bank, followed by the required
repository checks. This design performs no production deployment or database
migration. Storage compatibility must be checked during implementation; no
migration conclusion has been established by this investigation.

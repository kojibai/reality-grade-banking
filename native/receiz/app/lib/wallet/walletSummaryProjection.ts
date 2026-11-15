import type { WalletSummary, WalletAccountRow, WalletRollupRow, WalletSeedLedgerRow } from "./server";
import type { WalletProfileSyncSnapshot } from "../profile/server";
import { formatPhiFromMicro, formatUsdFromCents, usdCentsFromPhiMicro } from "./amounts";
import { composeWalletDisplayedTotals } from "./lawfulActionSettlement";
import { buildWalletValueStatesFromBalanceCents } from "./valueStates";
import { BANK_LOCAL_VALUE_SCHEMA } from "./bankNotes/localWalletValuation";
import type { WalletReserveFundingSource, WalletReserveFundingDisplay } from "./reserveFundingDisplay";
import {readWalletCashBasis,type WalletCashBasis} from "./walletCashBasis";
import type {WalletCurrentBalanceSource} from './currentBalanceDisplay';

/** Mechanical projection of already selected inputs. This does not admit proof,
 * establish scope completeness, or authorize Reserve/Settlement execution.
 */
export type WalletSummaryProjectionInput = Readonly<{
  accountRow: WalletAccountRow | null;
  rollupRow: WalletRollupRow | null;
  seedRow: WalletSeedLedgerRow | null;
  creationSigilBenefitsEnabled: boolean;
  cashBasis?: WalletCashBasis;
  cashBasisAccepted?:boolean;
  legacySigilClaimEnabled?: boolean;
  profileSyncSnapshot: WalletProfileSyncSnapshot | null;
  loadedLawfulActionPhiMicro: bigint | null;
  ledgerSettledUsdCents: bigint;
  /** Original Phi backing from the same admitted native ledger prefix. Omitted
   * legacy observations carry no exact mixed-rail unit split. */
  ledgerReservePhiMicro?: bigint | null;
  reserveFundingSource?: WalletReserveFundingSource;
  acceptedSettlementIds: string[];
  usdRateMicrocents: bigint;
  quote: WalletSummary["quote"];
  creationSigil: WalletSummary["creationSigil"];
}>;

function parseBigintLike(value: unknown, fallback = 0n): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) return BigInt(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return BigInt(value.trim());
  return fallback;
}

function parseIntLike(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Math.max(0, Number.parseInt(value.trim(), 10));
  return fallback;
}

function numericTextOrNull(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(Math.trunc(value));
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return value.trim();
  return null;
}

function nonNegative(value: bigint): bigint {
  return value >= 0n ? value : 0n;
}

export function projectWalletSummary(userId: string, input: WalletSummaryProjectionInput): WalletSummary {
  const { accountRow, rollupRow, seedRow, creationSigilBenefitsEnabled, profileSyncSnapshot,
    loadedLawfulActionPhiMicro, ledgerSettledUsdCents, acceptedSettlementIds, usdRateMicrocents, quote, creationSigil } = input;
  // `wallet_accounts` is the legacy execution-coordination row. It is not proof
  // authority; sealed artifact truth plus the append-only ledger determines
  // Glyph Settlement whenever a complete canonical projection is available.
  const accountBalance = parseBigintLike(accountRow?.balance_phi_micro ?? 0n, 0n);
  const accountBalancePhiMicro = nonNegative(accountBalance);

  const totalCreditPhiMicro = parseBigintLike(rollupRow?.total_credit_phi_micro ?? 0n, 0n);
  const totalDebitPhiMicro = parseBigintLike(rollupRow?.total_debit_phi_micro ?? 0n, 0n);
  const totalCreditUsdCents = nonNegative(parseBigintLike(rollupRow?.total_credit_usd_cents ?? 0n, 0n));
  const totalDebitUsdCents = nonNegative(parseBigintLike(rollupRow?.total_debit_usd_cents ?? 0n, 0n));
  const profileSeedPhiMicro = nonNegative(parseBigintLike(seedRow?.amount_phi_micro ?? 0n, 0n));
  const profileSeedUsdCents = nonNegative(parseBigintLike(seedRow?.amount_usd_cents ?? 0n, 0n));
  const cashBasis=readWalletCashBasis(input.cashBasis);
  const projectionEnabled=creationSigilBenefitsEnabled||cashBasis!==undefined;
  const transactionDeltaPhiMicro = totalCreditPhiMicro - totalDebitPhiMicro + (cashBasis ? BigInt(cashBasis.phiOffsetMicro) : -profileSeedPhiMicro);
  const transactionDeltaUsdCents = totalCreditUsdCents - totalDebitUsdCents + (cashBasis ? BigInt(cashBasis.usdOffsetCents) : -profileSeedUsdCents);

  const artifactBasePhiMicro =
    projectionEnabled && profileSyncSnapshot
      ? nonNegative(parseBigintLike(profileSyncSnapshot.glyphSettlementPhiMicro, 0n))
      : null;
  if (projectionEnabled && (!profileSyncSnapshot || !profileSyncSnapshot.projectionComplete)) {
    throw new Error("wallet_glyph_settlement_projection_incomplete");
  }
  const resolvedArtifactBasePhiMicro = projectionEnabled ? (artifactBasePhiMicro ?? 0n) : 0n;
  const lawfulActionProjectionAvailable = loadedLawfulActionPhiMicro !== null;
  // Lawful-action Settlement is composed beneath the complete artifact base.
  const lawfulActionPhiMicro = projectionEnabled && profileSyncSnapshot
    ? (loadedLawfulActionPhiMicro ?? 0n)
    : 0n;

  const artifactBaseUsdCents = profileSyncSnapshot
    ? nonNegative(parseBigintLike(profileSyncSnapshot.glyphSettlementUsdCents, 0n))
    : usdCentsFromPhiMicro(resolvedArtifactBasePhiMicro, usdRateMicrocents);
  const lawfulActionUsdCents = usdCentsFromPhiMicro(lawfulActionPhiMicro, usdRateMicrocents);
  const displayedTotals = composeWalletDisplayedTotals({
    artifactBasePhiMicro: resolvedArtifactBasePhiMicro,
    artifactBaseUsdCents,
    lawfulActionPhiMicro,
    lawfulActionUsdCents,
    transactionDeltaPhiMicro,
    transactionDeltaUsdCents,
  });
  const balancePhiMicro = projectionEnabled
    ? displayedTotals.balancePhiMicro
    : accountBalancePhiMicro;
  // Total wallet value may include entitlement, profile, or proof-native PHI value.
  // External-rail conversion is stricter: only funded credits and proven settled
  // proceeds can back that rail.
  const balanceUsdCents = projectionEnabled
    ? displayedTotals.balanceUsdCents
    : rollupRow
      ? nonNegative(totalCreditUsdCents - totalDebitUsdCents)
      : usdCentsFromPhiMicro(accountBalancePhiMicro, usdRateMicrocents);
  const accountBalanceUsdCents = usdCentsFromPhiMicro(accountBalancePhiMicro, usdRateMicrocents);
  const settledBalanceUsdCents =
    ledgerSettledUsdCents < accountBalanceUsdCents ? ledgerSettledUsdCents : accountBalanceUsdCents;
  const effectiveCreationSigilBenefitsEnabled = projectionEnabled || balanceUsdCents > settledBalanceUsdCents;
  const reservePhiMicro = typeof input.ledgerReservePhiMicro === "bigint"
    && input.ledgerReservePhiMicro >= 0n && input.ledgerReservePhiMicro <= balancePhiMicro
    ? input.ledgerReservePhiMicro : null;
  // Reuse the native rail identity: gross Phi = original Reserve backing +
  // unencumbered Settlement. Object/lawful Phi is already in gross exactly once.
  const settlementPhiMicro = reservePhiMicro === null ? null : balancePhiMicro - reservePhiMicro;
  const valueStates=buildWalletValueStatesFromBalanceCents(settledBalanceUsdCents,balanceUsdCents);
  const reserveFundingSource:WalletReserveFundingDisplay|undefined=reservePhiMicro !== null && input.reserveFundingSource?.accountId === userId
    && input.reserveFundingSource.reservePhiMicro === reservePhiMicro.toString()
    && input.reserveFundingSource.recordedReserveUsdCents === ledgerSettledUsdCents.toString()
    ? {...input.reserveFundingSource,displayedReserveUsdCents:settledBalanceUsdCents.toString(),displayCap:{accountBalancePhiMicro:accountBalancePhiMicro.toString(),
      accountBalanceUsdCents:accountBalanceUsdCents.toString(),usdPerPhiMicrocents:usdRateMicrocents.toString()}}:undefined;
  const valuationGlyphs=profileSyncSnapshot?.valuationGlyphs;
  const currentBalanceSource:WalletCurrentBalanceSource|undefined=projectionEnabled&&profileSyncSnapshot?.projectionComplete===true
    &&profileSyncSnapshot.truncated===false&&profileSyncSnapshot.invalidArtifactCount===0&&profileSyncSnapshot.duplicateArtifactCount===0
    &&profileSyncSnapshot.sourceArtifactCount===profileSyncSnapshot.artifactCount&&valuationGlyphs?.length===profileSyncSnapshot.artifactCount&&lawfulActionProjectionAvailable
    ?{userId,earningMembershipPolicy:'public-pbi-original-v1',creationSigilBenefitsEnabled:true,computedPulse:profileSyncSnapshot.computedPulse,computedAt:profileSyncSnapshot.computedAt,
      ...(profileSyncSnapshot.valuationSourceSha256?{sourceSha256:profileSyncSnapshot.valuationSourceSha256}:{}),glyphs:valuationGlyphs,
      artifactBasePhiMicro:resolvedArtifactBasePhiMicro.toString(),artifactBaseUsdCents:artifactBaseUsdCents.toString(),lawfulActionPhiMicro:lawfulActionPhiMicro.toString(),
      accountBalancePhiMicro:accountBalancePhiMicro.toString(),transactionDeltaPhiMicro:transactionDeltaPhiMicro.toString(),transactionDeltaUsdCents:transactionDeltaUsdCents.toString(),
      ...(cashBasis?{cashBasis,cashBasisAccepted:input.cashBasisAccepted===true}:{}),profileSeedPhiMicro:profileSeedPhiMicro.toString(),profileSeedUsdCents:profileSeedUsdCents.toString(),ledgerSettledUsdCents:ledgerSettledUsdCents.toString(),usdPerPhiMicrocents:usdRateMicrocents.toString(),
      balancePhiMicro:balancePhiMicro.toString(),balanceUsdCents:balanceUsdCents.toString(),reserveUsdCents:settledBalanceUsdCents.toString(),settlementUsdCents:valueStates.ecosystemBalanceUsdCents,
      reservePhiMicro:reservePhiMicro?.toString()??null,settlementPhiMicro:settlementPhiMicro?.toString()??null,
      ...(profileSyncSnapshot.originalProofReferences?{originalProofReferences:profileSyncSnapshot.originalProofReferences}:{}),...(reserveFundingSource?{reserveFundingSource}:{})}:undefined;

  return {
    userId,
    creationSigilBenefitsEnabled: effectiveCreationSigilBenefitsEnabled,
    creationSigilEntitlementEnabled: projectionEnabled,
    legacySigilClaimEnabled: input.legacySigilClaimEnabled === true,
    balancePhiMicro: balancePhiMicro.toString(),
    balancePhi: formatPhiFromMicro(balancePhiMicro),
    balanceUsd: formatUsdFromCents(balanceUsdCents),
    ...(projectionEnabled && profileSyncSnapshot?.originalProofReferences
      ? { originalProofReferences: profileSyncSnapshot.originalProofReferences } : {}),
    reservePhiMicro: reservePhiMicro?.toString() ?? null,
    settlementPhiMicro: settlementPhiMicro?.toString() ?? null,
    ...(reservePhiMicro !== null && settlementPhiMicro !== null ? { bankNoteValueProjection: {
      schema: BANK_LOCAL_VALUE_SCHEMA, reserveBackingPhiMicro: reservePhiMicro.toString(), settlementPhiMicro: settlementPhiMicro.toString(),
    } } : {}),
    ...(reserveFundingSource?{reserveFundingSource}:{}),
    ...(currentBalanceSource?{currentBalanceSource}:{}),
    valueStates,
    quote,
    rollup: {
      totalCreditPhiMicro: totalCreditPhiMicro.toString(),
      totalDebitPhiMicro: totalDebitPhiMicro.toString(),
      totalCreditUsdCents: totalCreditUsdCents.toString(),
      totalDebitUsdCents: totalDebitUsdCents.toString(),
      transferCount: parseIntLike(rollupRow?.transfer_count ?? 0, 0),
      noteMintCount: parseIntLike(rollupRow?.note_mint_count ?? 0, 0),
      noteClaimCount: parseIntLike(rollupRow?.note_claim_count ?? 0, 0),
      lastEntryAt: rollupRow?.last_entry_at ?? null,
      lastEntryKaiUpulse: numericTextOrNull(rollupRow?.last_entry_kai_upulse),
      lastEntryKaiPulse: numericTextOrNull(rollupRow?.last_entry_kai_pulse),
    },
    sync: {
      profileBasePhiMicro: (resolvedArtifactBasePhiMicro + lawfulActionPhiMicro).toString(),
      lawfulActionPhiMicro: lawfulActionProjectionAvailable ? lawfulActionPhiMicro.toString() : null,
      lawfulActionProjectionAvailable,
      transactionDeltaPhiMicro: transactionDeltaPhiMicro.toString(),
      transactionDeltaUsdCents: transactionDeltaUsdCents.toString(),
      ...(cashBasis?{cashBasis,cashBasisAccepted:input.cashBasisAccepted===true}:{}),profileSeedPhiMicro: profileSeedPhiMicro.toString(),
      accountBalancePhiMicro: accountBalancePhiMicro.toString(),
      profileProjectionKaiPulse: profileSyncSnapshot?.computedPulse ?? null,
      projectionComplete:
        projectionEnabled
        && lawfulActionProjectionAvailable
        && profileSyncSnapshot?.projectionComplete === true
        && profileSyncSnapshot.truncated === false,
      sourceArtifactCount: profileSyncSnapshot?.sourceArtifactCount ?? null,
      artifactCount: profileSyncSnapshot?.artifactCount ?? null,
      invalidArtifactCount: profileSyncSnapshot?.invalidArtifactCount ?? null,
      duplicateArtifactCount: profileSyncSnapshot?.duplicateArtifactCount ?? null,
      membershipDigest: profileSyncSnapshot?.membershipDigest ?? null,
      projectorDigest: profileSyncSnapshot?.projectorDigest ?? null,
      projectorVersion: profileSyncSnapshot?.projectorVersion ?? null,
      projectedAt: profileSyncSnapshot?.computedAt ?? null,
      source: projectionEnabled && profileSyncSnapshot ? "profile_plus_ledger_v1" : "account_only",
      acceptedSettlementIds,
    },
    creationSigil,
  };
}

import type { WalletSummary, WalletAccountRow, WalletRollupRow, WalletSeedLedgerRow } from "./server";
import type { WalletProfileSyncSnapshot } from "../profile/server";
import { formatPhiFromMicro, formatUsdFromCents, usdCentsFromPhiMicro } from "./amounts";
import { composeWalletDisplayedTotals } from "./lawfulActionSettlement";
import { buildWalletValueStatesFromBalanceCents } from "./valueStates";

/** Mechanical projection of already selected inputs. This does not admit proof,
 * establish scope completeness, or authorize Reserve/Settlement execution.
 */
export type WalletSummaryProjectionInput = Readonly<{
  accountRow: WalletAccountRow | null;
  rollupRow: WalletRollupRow | null;
  seedRow: WalletSeedLedgerRow | null;
  creationSigilBenefitsEnabled: boolean;
  profileSyncSnapshot: WalletProfileSyncSnapshot | null;
  loadedLawfulActionPhiMicro: bigint | null;
  ledgerSettledUsdCents: bigint;
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
  const transactionDeltaPhiMicro = totalCreditPhiMicro - totalDebitPhiMicro - profileSeedPhiMicro;
  const transactionDeltaUsdCents = totalCreditUsdCents - totalDebitUsdCents - profileSeedUsdCents;

  const artifactBasePhiMicro =
    creationSigilBenefitsEnabled && profileSyncSnapshot
      ? nonNegative(parseBigintLike(profileSyncSnapshot.glyphSettlementPhiMicro, 0n))
      : null;
  if (creationSigilBenefitsEnabled && (!profileSyncSnapshot || !profileSyncSnapshot.projectionComplete)) {
    throw new Error("wallet_glyph_settlement_projection_incomplete");
  }
  const resolvedArtifactBasePhiMicro = creationSigilBenefitsEnabled ? (artifactBasePhiMicro ?? 0n) : 0n;
  const lawfulActionProjectionAvailable = loadedLawfulActionPhiMicro !== null;
  // Lawful-action Settlement is composed beneath the complete artifact base.
  const lawfulActionPhiMicro = creationSigilBenefitsEnabled && profileSyncSnapshot
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
  const balancePhiMicro = creationSigilBenefitsEnabled
    ? displayedTotals.balancePhiMicro
    : accountBalancePhiMicro;
  // Total wallet value may include entitlement, profile, or proof-native PHI value.
  // External-rail conversion is stricter: only funded credits and proven settled
  // proceeds can back that rail.
  const balanceUsdCents = creationSigilBenefitsEnabled
    ? displayedTotals.balanceUsdCents
    : rollupRow
      ? nonNegative(totalCreditUsdCents - totalDebitUsdCents)
      : usdCentsFromPhiMicro(accountBalancePhiMicro, usdRateMicrocents);
  const accountBalanceUsdCents = usdCentsFromPhiMicro(accountBalancePhiMicro, usdRateMicrocents);
  const settledBalanceUsdCents =
    ledgerSettledUsdCents < accountBalanceUsdCents ? ledgerSettledUsdCents : accountBalanceUsdCents;
  const effectiveCreationSigilBenefitsEnabled = creationSigilBenefitsEnabled || balanceUsdCents > settledBalanceUsdCents;


  return {
    userId,
    creationSigilBenefitsEnabled: effectiveCreationSigilBenefitsEnabled,
    creationSigilEntitlementEnabled: creationSigilBenefitsEnabled,
    balancePhiMicro: balancePhiMicro.toString(),
    balancePhi: formatPhiFromMicro(balancePhiMicro),
    balanceUsd: formatUsdFromCents(balanceUsdCents),
    valueStates: buildWalletValueStatesFromBalanceCents(settledBalanceUsdCents, balanceUsdCents),
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
      profileSeedPhiMicro: profileSeedPhiMicro.toString(),
      accountBalancePhiMicro: accountBalancePhiMicro.toString(),
      profileProjectionKaiPulse: profileSyncSnapshot?.computedPulse ?? null,
      projectionComplete:
        creationSigilBenefitsEnabled
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
      source: creationSigilBenefitsEnabled && profileSyncSnapshot ? "profile_plus_ledger_v1" : "account_only",
      acceptedSettlementIds,
    },
    creationSigil,
  };
}

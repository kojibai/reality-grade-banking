"use client";

import type { ReceizKeyFile } from "@/app/utils/receizIdentityKey";
import type { ProfileViewData } from "@/app/lib/profile/types";
import type { SportsArenaSlug } from "@/app/lib/game/sportsArena";
import type {
  SportsArenaEventProof,
  SportsVaultCardPayload,
} from "@/app/game/sports/sportsArenaConsoleModel";
import type {
  WalletRouteActivityHydrationSeed,
  WalletRouteHydrationSummary,
} from "@/app/lib/wallet/routeHydration";
import { buildProfileViewFromReceizKeyPortableState } from "@/app/lib/profile/keyfilePortableState";
import { deriveProfileOriginalMarketPreviewFromProofObject } from "@/app/lib/profile/marketPreviewFromProofObject";
import { projectGlyphEconomy, type GlyphEconomyPublicSeed } from "@/app/lib/wallet/glyphEconomyProjection";
import { composeWalletDisplayedTotals } from "@/app/lib/wallet/lawfulActionSettlement";
import { buildWalletValueStatesFromBalanceCents } from "@/app/lib/wallet/valueStates";
import { readReceizAccountStateHead } from "@/app/lib/auth/receizAccountStateHead";
import { readReceizMarketRouteSnapshotFromPortableAccount } from "@/app/lib/market/portableState";
import { preserveMarketWalletContinuity } from "@/app/lib/market/snapshotContinuity";
import { KaiTimeSource } from "@/app/utils/kai_pulse";

const portableStateKaiTimeSource = new KaiTimeSource({ ignoreOverride: true });

const SIGNAL_LOCAL_NAMESPACE_KEYS = {
  cards: "receiz.signal-run.cards.v1",
  owner: "receiz.signal-run.cards.owner.v1",
  appends: "receiz.signal-arena.appends.v1",
  hiddenCollectibleIds: "receiz.signal-run.cards.hidden.v1",
  showcasedCollectibleIds: "receiz.signal-run.cards.showcased.v1",
  listings: "receiz.signal-run.cards.listings.v1",
  transferredOutCollectibleIds: "receiz.signal-run.cards.transferred-out.v1",
  activeRoster: "receiz.signal-run.active-roster.v1",
  bestScores: "receiz.signal-run.best-scores.v1",
  achievements: "receiz.signal-run.achievements.v1",
  packOpening: "receiz.signal-run.pack-opening.v1",
  rewardedCardSeal: "receiz.signal-run.rewarded-card-seal.v1",
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)) ? value as Record<string, unknown> : null;
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => Boolean(asRecord(row))) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function scalarText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "bigint") return value.toString();
  return "";
}

function finiteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function count(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
}

function integer(value: unknown): bigint | null {
  const normalized = typeof value === "bigint" ? value.toString() : String(value ?? "").trim();
  if (!/^-?\d+$/.test(normalized)) return null;
  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

function nonNegative(value: bigint): bigint {
  return value > 0n ? value : 0n;
}

function formatPhiMicro(value: bigint): string {
  const safe = nonNegative(value);
  const whole = safe / 1_000_000n;
  const fraction = (safe % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole.toString()}.${fraction}` : whole.toString();
}

function formatUsdCents(value: bigint): string {
  const safe = nonNegative(value);
  return `${(safe / 100n).toString()}.${(safe % 100n).toString().padStart(2, "0")}`;
}

function usdCentsFromPhiMicro(phiMicro: bigint, usdPerPhiMicrocents: bigint): bigint {
  if (phiMicro <= 0n || usdPerPhiMicrocents <= 0n) return 0n;
  const rateDenominator = 1_000_000_000_000n;
  return (phiMicro * usdPerPhiMicrocents + rateDenominator / 2n) / rateDenominator;
}

export function walletRouteSummaryFromReceizKeyPortableState(
  keyFile: ReceizKeyFile,
): WalletRouteHydrationSummary | null {
  const snapshot = asRecord(keyFile.portableState?.snapshot);
  const account = asRecord(snapshot?.account);
  const ownerUserId = text(account?.userId) || text(keyFile.owner.uid);
  const wallet = asRecord(snapshot?.wallet);
  const summary = asRecord(wallet?.routeSummary);
  const summaryRollup = asRecord(summary?.rollup);
  const summaryQuote = asRecord(summary?.quote);
  if (ownerUserId && text(summary?.userId) === ownerUserId && summaryRollup && summaryQuote) {
    return summary as unknown as WalletRouteHydrationSummary;
  }

  const walletAccount = asRecord(wallet?.account);
  const walletRollup = asRecord(wallet?.userRollup);
  if (!ownerUserId || !walletAccount || text(walletAccount.user_id) !== ownerUserId || !walletRollup) return null;
  const balancePhiMicro = text(walletAccount.balance_phi_micro) || "0";
  const balancePhi = text(walletAccount.balance_phi) || "0";
  const balanceUsd = text(walletAccount.balance_usd) || "0.00";
  return {
    userId: ownerUserId,
    balancePhiMicro,
    balancePhi,
    balanceUsd,
    quote: {
      usdPerPhi: finiteNumber(walletAccount.usd_per_phi),
      phiPerUsd: finiteNumber(walletAccount.phi_per_usd),
      usdPerPhiMicrocents: text(walletAccount.usd_per_phi_microcents) || "0",
    },
    rollup: {
      totalCreditPhiMicro: text(walletRollup.total_credit_phi_micro) || "0",
      totalDebitPhiMicro: text(walletRollup.total_debit_phi_micro) || "0",
      totalCreditUsdCents: text(walletRollup.total_credit_usd_cents) || "0",
      totalDebitUsdCents: text(walletRollup.total_debit_usd_cents) || "0",
      transferCount: count(walletRollup.transfer_count),
      noteMintCount: count(walletRollup.note_mint_count),
      noteClaimCount: count(walletRollup.note_claim_count),
      lastEntryAt: text(walletRollup.last_entry_at) || null,
      lastEntryKaiUpulse: text(walletRollup.last_entry_kai_upulse) || null,
      lastEntryKaiPulse: text(walletRollup.last_entry_kai_pulse) || null,
    },
  };
}

export function walletActivityHydrationSeedFromReceizKeyPortableState(
  keyFile: ReceizKeyFile,
): WalletRouteActivityHydrationSeed | null {
  const snapshot = asRecord(keyFile.portableState?.snapshot);
  const account = asRecord(snapshot?.account);
  const ownerUserId = text(account?.userId) || text(keyFile.owner.uid);
  const wallet = asRecord(snapshot?.wallet);
  const carriedEvents = rows(wallet?.activityEvents).filter((event) => Boolean(text(event.id)));
  const eventsById = new Map<string, Record<string, unknown>>(
    carriedEvents.map((event) => [text(event.id), event]),
  );
  const coordinate = (row: Record<string, unknown>) => {
    const upulse = scalarText(row.kai_upulse);
    if (!/^\d+$/u.test(upulse)) return null;
    const pulseText = scalarText(row.kai_pulse);
    const pulse = /^\d+$/u.test(pulseText)
      ? Number(BigInt(pulseText))
      : Number(BigInt(upulse) / 1_000_000n);
    if (!Number.isSafeInteger(pulse) || pulse < 0) return null;
    return {
      upulse,
      pulse,
      kaiKlok: `Kai Pulse ${pulse}`,
    };
  };
  const proofBundle = (id: string, kind: string, row: Record<string, unknown>) => {
    const kai = coordinate(row);
    if (!kai) return null;
    return {
      kai,
      proofBundle: {
        proofCapsule: { upulse: kai.upulse, pulse: kai.pulse, kaiKlok: kai.kaiKlok },
        verifier: "enclosing-identity-seal",
        proofHints: { source: "receiz.account.state.v3", eventId: id, eventKind: kind },
      },
    };
  };
  const person = (userId: string) => ({ userId, username: null, displayName: userId === ownerUserId ? keyFile.owner.displayName ?? keyFile.owner.username ?? "Account" : "Receiz user" });
  const valueReceipt = (row: Record<string, unknown>) => ({
    settledUsdCents: scalarText(row.amount_usd_cents) || "0",
    phiUsdCents: "0",
    fundingSource: "settled",
    fundingRule: null,
    certificateSharesMicro: null,
  });
  const genericKinds = new Set([
    "market_buy", "market_sell", "prediction_wager", "prediction_payout", "prediction_refund",
    "signal_card_reward_seal", "signal_pack_purchase", "sports_pack_purchase",
  ]);
  for (const row of rows(wallet?.ledgerEntries)) {
    const rowId = text(row.id);
    const createdAt = text(row.created_at);
    const direction = text(row.direction);
    const entryKind = text(row.entry_kind);
    if (!rowId || !createdAt || (direction !== "credit" && direction !== "debit")) continue;
    const metadata = asRecord(row.metadata);
    const source = text(metadata?.source);
    const reserveCreditKind = source === "stripe_checkout_wallet_deposit"
      ? "funded_reserve_deposit"
      : source === "stripe_checkout_profile_original_download"
        ? "paid_download"
        : source === "stripe_checkout_connect_payment"
          ? "payment"
          : null;
    const id = `${reserveCreditKind ? "reserve" : "ledger"}:${rowId}`;
    if (eventsById.has(id)) continue;
    const proof = proofBundle(id, reserveCreditKind ? "reserve_credit" : "wallet_ledger_entry", row);
    if (!proof) continue;
    if (reserveCreditKind) {
      eventsById.set(id, {
        id,
        kind: "reserve_credit",
        reserveCreditKind,
        createdAt,
        kaiUpulse: proof.kai.upulse,
        pulse: proof.kai.pulse,
        proofBundle: proof.proofBundle,
        actor: person(ownerUserId),
        amountPhiMicro: scalarText(row.amount_phi_micro) || "0",
        amountUsdCents: scalarText(row.amount_usd_cents) || "0",
        balanceAfterPhiMicro: scalarText(row.balance_after_phi_micro) || "0",
        settlementId: text(row.idempotency_key) || rowId,
        usdPerPhiMicrocents: scalarText(row.usd_per_phi_microcents) || "0",
        valueReceipt: valueReceipt(row),
      });
      continue;
    }
    const metadataKind = text(metadata?.admin_adjustment_kind);
    const ledgerEntryKind = genericKinds.has(entryKind) ? entryKind : genericKinds.has(metadataKind) ? metadataKind : null;
    if (!ledgerEntryKind) continue;
    eventsById.set(id, {
      id,
      kind: "wallet_ledger_entry",
      ledgerEntryKind,
      direction,
      createdAt,
      kaiUpulse: proof.kai.upulse,
      pulse: proof.kai.pulse,
      proofBundle: proof.proofBundle,
      actor: person(ownerUserId),
      amountPhiMicro: scalarText(row.amount_phi_micro) || "0",
      amountUsdCents: scalarText(row.amount_usd_cents) || "0",
      usdPerPhiMicrocents: scalarText(row.usd_per_phi_microcents) || "0",
      valueReceipt: valueReceipt(row),
    });
  }
  for (const row of rows(wallet?.chatTransfers)) {
    const rowId = text(row.id);
    const createdAt = text(row.created_at);
    const senderUserId = text(row.sender_user_id);
    const recipientUserId = text(row.recipient_user_id);
    const id = `transfer:${rowId}`;
    if (!rowId || !createdAt || !senderUserId || !recipientUserId || eventsById.has(id)) continue;
    const proof = proofBundle(id, "chat_transfer", row);
    if (!proof) continue;
    eventsById.set(id, {
      id,
      kind: "chat_transfer",
      createdAt,
      kaiUpulse: proof.kai.upulse,
      pulse: proof.kai.pulse,
      proofBundle: proof.proofBundle,
      transferId: rowId,
      conversationId: text(row.conversation_id),
      messageId: text(row.message_id),
      sender: person(senderUserId),
      recipient: person(recipientUserId),
      amountPhiMicro: scalarText(row.amount_phi_micro) || "0",
      amountUsdCents: scalarText(row.amount_usd_cents) || "0",
      usdPerPhiMicrocents: scalarText(row.usd_per_phi_microcents) || "0",
      valueReceipt: valueReceipt(row),
    });
  }
  for (const row of rows(wallet?.notes)) {
    const rowId = text(row.id);
    const mintedAt = text(row.minted_at) || text(row.created_at);
    const mintedBy = text(row.minted_by_user_id);
    const mintId = `note_mint:${rowId}`;
    if (rowId && mintedAt && mintedBy && !eventsById.has(mintId)) {
      const proof = proofBundle(mintId, "note_mint", row);
      if (proof) eventsById.set(mintId, {
        id: mintId,
        kind: "note_mint",
        createdAt: mintedAt,
        kaiUpulse: proof.kai.upulse,
        pulse: proof.kai.pulse,
        proofBundle: proof.proofBundle,
        noteId: rowId,
        noteTokenSuffix: text(row.note_token).slice(-8),
        actor: person(mintedBy),
        amountPhiMicro: scalarText(row.amount_phi_micro) || "0",
        amountUsdCents: scalarText(row.amount_usd_cents) || "0",
        usdPerPhiMicrocents: scalarText(row.usd_per_phi_microcents) || "0",
        valueReceipt: valueReceipt(row),
      });
    }
    const claimedAt = text(row.claimed_at);
    const claimedBy = text(row.claimed_by_user_id);
    const claimId = `note_claim:${rowId}`;
    if (rowId && claimedAt && claimedBy && !eventsById.has(claimId)) {
      const claimRow = { ...row, kai_upulse: row.claim_kai_upulse ?? row.kai_upulse, kai_pulse: row.claim_kai_pulse ?? row.kai_pulse };
      const proof = proofBundle(claimId, "note_claim", claimRow);
      if (!proof) continue;
      eventsById.set(claimId, {
        id: claimId,
        kind: "note_claim",
        createdAt: claimedAt,
        kaiUpulse: proof.kai.upulse,
        pulse: proof.kai.pulse,
        proofBundle: proof.proofBundle,
        noteId: rowId,
        noteTokenSuffix: text(row.note_token).slice(-8),
        actor: person(claimedBy),
        amountPhiMicro: scalarText(row.amount_phi_micro) || "0",
        amountUsdCents: scalarText(row.amount_usd_cents) || "0",
        usdPerPhiMicrocents: scalarText(row.usd_per_phi_microcents) || "0",
        valueReceipt: valueReceipt(row),
      });
    }
  }
  const events = Array.from(eventsById.values());
  if (!ownerUserId || events.length === 0) return null;

  return {
    userId: ownerUserId,
    lastEntryAt: text(wallet?.activityHeadCreatedAt) || null,
    lastEntryKaiUpulse: text(wallet?.activityHeadKaiUpulse) || null,
    ...(text(wallet?.activityOlderCursor) ? { olderCursor: text(wallet?.activityOlderCursor) } : {}),
    olderHistoryComplete:
      wallet?.activityHistoryComplete === true ||
      (Array.isArray(wallet?.ledgerEntries) && Array.isArray(wallet?.chatTransfers) && Array.isArray(wallet?.notes)),
    events: events as unknown as WalletRouteActivityHydrationSeed["events"],
  };
}

function carriedWalletTransactionDelta(
  keyFile: ReceizKeyFile,
  summary: WalletRouteHydrationSummary,
): { phiMicro: bigint; usdCents: bigint } {
  const sync = asRecord(summary.sync);
  const carriedPhiDelta = integer(sync?.transactionDeltaPhiMicro);
  const carriedUsdDelta = integer(sync?.transactionDeltaUsdCents);
  if (carriedPhiDelta !== null && carriedUsdDelta !== null) {
    return { phiMicro: carriedPhiDelta, usdCents: carriedUsdDelta };
  }

  const snapshot = asRecord(keyFile.portableState?.snapshot);
  const wallet = asRecord(snapshot?.wallet);
  const rollup = asRecord(wallet?.userRollup);
  const ledgerEntries = rows(wallet?.ledgerEntries);
  let profileSeedPhiMicro = 0n;
  let profileSeedUsdCents = 0n;
  for (const entry of ledgerEntries) {
    if (
      text(entry.direction) === "credit" &&
      text(entry.entry_kind) === "admin_adjustment" &&
      text(entry.idempotency_key).startsWith("profile_seed_v1:")
    ) {
      profileSeedPhiMicro = integer(entry.amount_phi_micro) ?? 0n;
      profileSeedUsdCents = integer(entry.amount_usd_cents) ?? 0n;
    }
  }
  const totalCreditPhiMicro = integer(rollup?.total_credit_phi_micro) ?? integer(summary.rollup.totalCreditPhiMicro) ?? 0n;
  const totalDebitPhiMicro = integer(rollup?.total_debit_phi_micro) ?? integer(summary.rollup.totalDebitPhiMicro) ?? 0n;
  const totalCreditUsdCents = integer(rollup?.total_credit_usd_cents) ?? integer(summary.rollup.totalCreditUsdCents) ?? 0n;
  const totalDebitUsdCents = integer(rollup?.total_debit_usd_cents) ?? integer(summary.rollup.totalDebitUsdCents) ?? 0n;
  return {
    phiMicro: carriedPhiDelta ?? (totalCreditPhiMicro - totalDebitPhiMicro - profileSeedPhiMicro),
    usdCents: carriedUsdDelta ?? (totalCreditUsdCents - totalDebitUsdCents - profileSeedUsdCents),
  };
}

export function projectWalletRouteSummaryFromReceizKeyPortableState(
  keyFile: ReceizKeyFile,
  options?: { computedPulse?: number },
): WalletRouteHydrationSummary | null {
  const carried = walletRouteSummaryFromReceizKeyPortableState(keyFile);
  if (!carried) return null;
  if (
    carried.creationSigilBenefitsEnabled !== true &&
    carried.creationSigilEntitlementEnabled !== true
  ) {
    return carried;
  }

  const profileSeed = buildProfileViewFromReceizKeyPortableState(keyFile)?.profile ?? null;
  const transactionDelta = carriedWalletTransactionDelta(keyFile, carried);
  const carriedWithTransactionDelta = {
    ...carried,
    sync: {
      ...(carried.sync ?? {}),
      transactionDeltaPhiMicro: transactionDelta.phiMicro.toString(),
      transactionDeltaUsdCents: transactionDelta.usdCents.toString(),
    },
  };
  const snapshot = asRecord(keyFile.portableState?.snapshot);
  const sealedHead = readReceizAccountStateHead(snapshot);
  const sealedPulse = sealedHead.kaiPulse && /^\d+$/.test(sealedHead.kaiPulse)
    ? Number(sealedHead.kaiPulse)
    : null;
  const projectionClock = options ?? {
    ...(Number.isSafeInteger(sealedPulse) ? { computedPulse: sealedPulse as number } : {}),
  };
  return projectWalletRouteSummaryFromCompleteProfile(carriedWithTransactionDelta, profileSeed, {
    ...projectionClock,
    transactionDelta,
  });
}

export function projectWalletRouteSummaryFromCompleteProfile(
  carried: WalletRouteHydrationSummary,
  profileSeed: ProfileViewData | null,
  options?: {
    computedPulse?: number;
    transactionDelta?: { phiMicro: bigint; usdCents: bigint };
  },
): WalletRouteHydrationSummary {
  if (carried.sync?.lawfulActionProjectionAvailable === false) return carried;
  if (
    carried.creationSigilBenefitsEnabled !== true &&
    carried.creationSigilEntitlementEnabled !== true
  ) {
    return carried;
  }
  if (
    !profileSeed ||
    profileSeed.profile.userId !== carried.userId ||
    profileSeed.originalsPage.hasMore
  ) {
    return carried;
  }

  let computedPulse = options?.computedPulse;
  if (!Number.isFinite(computedPulse)) {
    computedPulse = Number(portableStateKaiTimeSource.nowMicroPulses() / 1_000_000n);
  }
  computedPulse = Math.max(0, Math.trunc(computedPulse ?? 0));

  const carriedSync = asRecord(carried.sync);
  const transactionDelta = options?.transactionDelta ?? (() => {
    const phiMicro = integer(carriedSync?.transactionDeltaPhiMicro);
    const usdCents = integer(carriedSync?.transactionDeltaUsdCents);
    return phiMicro === null || usdCents === null ? null : { phiMicro, usdCents };
  })();
  if (!transactionDelta) return carried;

  const ownerVerified =
    profileSeed.profile.authorshipVerified === true ||
    profileSeed.originals.some((original) => original.hasPbiSignature === true || Boolean(original.pbiReceiptHash));
  const publicGlyphs = profileSeed.originals.flatMap<GlyphEconomyPublicSeed>((original) => {
    if (!original.showOnProfile) return [];
    const creatorUserId = original.originalCreator?.userId?.trim() || profileSeed.profile.userId;
    const creatorVerified = creatorUserId === profileSeed.profile.userId ? ownerVerified : original.hasPbiSignature === true;
    const preview = deriveProfileOriginalMarketPreviewFromProofObject({
      original,
      ownerUserId: profileSeed.profile.userId,
      ownerUsername: profileSeed.profile.username,
      creatorVerified,
    });
    return preview?.livePulseSeed ? [{ id: original.id, livePulseSeed: preview.livePulseSeed }] : [];
  });
  if (publicGlyphs.length !== profileSeed.originals.filter((original) => original.showOnProfile).length) return carried;
  const projection = projectGlyphEconomy({
    publicGlyphs,
    computedPulse,
    ledgerDeltaPhiMicro: transactionDelta.phiMicro,
    ledgerDeltaUsdCents: transactionDelta.usdCents,
  });
  if (projection.invalidGlyphCount > 0 || projection.duplicateGlyphCount > 0) return carried;
  const lawfulActionPhiMicro = nonNegative(integer(carriedSync?.lawfulActionPhiMicro) ?? 0n);
  const lawfulActionUsdCents = usdCentsFromPhiMicro(
    lawfulActionPhiMicro,
    nonNegative(integer(carried.quote.usdPerPhiMicrocents) ?? 0n),
  );
  const displayedTotals = composeWalletDisplayedTotals({
    artifactBasePhiMicro: projection.glyphSettlementPhiMicro,
    artifactBaseUsdCents: projection.glyphSettlementUsdCents,
    lawfulActionPhiMicro,
    lawfulActionUsdCents,
    transactionDeltaPhiMicro: transactionDelta.phiMicro,
    transactionDeltaUsdCents: transactionDelta.usdCents,
  });
  const carriedValueStates = asRecord(carried.valueStates);
  const settledBalanceUsdCents = nonNegative(integer(carriedValueStates?.settledBalanceUsdCents) ?? 0n);
  const settledCapped = settledBalanceUsdCents < displayedTotals.balanceUsdCents
    ? settledBalanceUsdCents
    : displayedTotals.balanceUsdCents;

  return {
    ...carried,
    creationSigilBenefitsEnabled: true,
    balancePhiMicro: displayedTotals.balancePhiMicro.toString(),
    balancePhi: formatPhiMicro(displayedTotals.balancePhiMicro),
    balanceUsd: formatUsdCents(displayedTotals.balanceUsdCents),
    valueStates: buildWalletValueStatesFromBalanceCents(settledCapped, displayedTotals.balanceUsdCents),
    sync: {
      ...(carried.sync ?? {}),
      profileBasePhiMicro: (projection.glyphSettlementPhiMicro + lawfulActionPhiMicro).toString(),
      lawfulActionPhiMicro: lawfulActionPhiMicro.toString(),
      transactionDeltaPhiMicro: transactionDelta.phiMicro.toString(),
      transactionDeltaUsdCents: transactionDelta.usdCents.toString(),
      profileProjectionKaiPulse: computedPulse,
      projectionComplete: true,
      sourceArtifactCount: projection.sourceGlyphCount,
      artifactCount: projection.publicGlyphCount,
      invalidArtifactCount: projection.invalidGlyphCount,
      duplicateArtifactCount: projection.duplicateGlyphCount,
      membershipDigest: projection.membershipDigest,
      projectorDigest: projection.projectorDigest,
      projectorVersion: projection.projectorVersion,
      source: "profile_plus_ledger_v1",
    },
  };
}

function sportsSlug(value: unknown): SportsArenaSlug | null {
  const normalized = text(value);
  return normalized === "baseball" || normalized === "soccer" || normalized === "fight" ? normalized : null;
}

function listingFromPortableVaultRow(row: Record<string, unknown>, ownerUserId: string): Record<string, unknown> | null {
  if (text(row.listing_status) !== "active") return null;
  const price = row.list_price_usd_cents;
  const listedAt = text(row.listed_at);
  if ((typeof price !== "number" && typeof price !== "string") || !listedAt) return null;
  return {
    status: "active",
    priceUsdCents: String(price),
    listedAt,
    sellerUserId: ownerUserId,
  };
}

function localJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}

async function admitSignalVaultFromPortableState(signal: Record<string, unknown>, ownerUserId: string, isCurrent: () => boolean): Promise<void> {
  if (typeof window === "undefined" || text(signal.ownerUserId) !== ownerUserId) return;
  const signalProof = await import("@/app/lib/game/signalRunCard");
  const carriedClaims = rows(signal.cards).map((row) => asRecord(row.claim_json) ?? row);
  const verifiedClaims: Record<string, unknown>[] = [];
  for (const claim of carriedClaims) {
    if (await signalProof.verifySignalRunCardClaim(claim as never)) verifiedClaims.push(claim);
  }
  const heldOwner = text(window.localStorage.getItem(SIGNAL_LOCAL_NAMESPACE_KEYS.owner));
  const heldClaims = heldOwner === ownerUserId ? rows(localJson(SIGNAL_LOCAL_NAMESPACE_KEYS.cards)) : [];
  const claimsById = new Map<string, Record<string, unknown>>();
  for (const claim of verifiedClaims) claimsById.set(text(claim.collectibleId).toLowerCase(), claim);
  for (const claim of heldClaims) {
    if (!(await signalProof.verifySignalRunCardClaim(claim as never))) continue;
    claimsById.set(text(claim.collectibleId).toLowerCase(), claim);
  }
  const claims = Array.from(claimsById.values()).filter((claim) => text(claim.collectibleId));
  const claimById = new Map(claims.map((claim) => [text(claim.collectibleId).toLowerCase(), claim]));
  const claimByHash = new Map(claims.map((claim) => [text(claim.claimHash).toLowerCase(), claim]));
  const carriedAppends = rows(signal.appends).map((row) => asRecord(row.append_json) ?? row);
  const heldAppends = heldOwner === ownerUserId ? rows(localJson(SIGNAL_LOCAL_NAMESPACE_KEYS.appends)) : [];
  const appendsByHash = new Map<string, Record<string, unknown>>();
  for (const append of [...carriedAppends, ...heldAppends]) {
    const base = asRecord(append.base);
    const claim = claimById.get(text(base?.collectibleId).toLowerCase());
    if (!claim || !(await signalProof.verifySignalRunCardAppendRecord(append as never, claim as never))) continue;
    const appendHash = text(append.appendHash);
    if (appendHash) appendsByHash.set(appendHash, append);
  }
  const allowedIds = new Set(claimById.keys());
  const mergeIds = (key: keyof typeof SIGNAL_LOCAL_NAMESPACE_KEYS): string[] => {
    const incoming = Array.isArray(signal[key]) ? signal[key] as unknown[] : [];
    const held = heldOwner === ownerUserId && Array.isArray(localJson(SIGNAL_LOCAL_NAMESPACE_KEYS[key]))
      ? localJson(SIGNAL_LOCAL_NAMESPACE_KEYS[key]) as unknown[]
      : [];
    return Array.from(new Set([...incoming, ...held].map(text).filter((id) => allowedIds.has(id.toLowerCase()))));
  };
  const write = (key: string, value: unknown) => window.localStorage.setItem(key, JSON.stringify(value));
  if (!isCurrent()) return;
  window.localStorage.setItem(SIGNAL_LOCAL_NAMESPACE_KEYS.owner, ownerUserId);
  write(SIGNAL_LOCAL_NAMESPACE_KEYS.cards, claims);
  write(SIGNAL_LOCAL_NAMESPACE_KEYS.appends, Array.from(appendsByHash.values()));
  write(SIGNAL_LOCAL_NAMESPACE_KEYS.hiddenCollectibleIds, mergeIds("hiddenCollectibleIds"));
  write(SIGNAL_LOCAL_NAMESPACE_KEYS.showcasedCollectibleIds, mergeIds("showcasedCollectibleIds"));
  write(SIGNAL_LOCAL_NAMESPACE_KEYS.transferredOutCollectibleIds, mergeIds("transferredOutCollectibleIds"));
  const signalArt = await import("@/app/game/signalRunCardArt");
  if (!isCurrent()) return;
  for (const row of rows(signal.arts)) {
    const art = asRecord(row.art_json) ?? row;
    const claim = claimByHash.get(text(art.claimHash).toLowerCase());
    if (!claim) continue;
    const verified = signalArt.parseSignalRunCardGeneratedArtText(JSON.stringify(art), claim as never);
    if (verified) signalArt.storeSignalRunCardArt(verified);
  }
  for (const key of ["listings", "activeRoster", "bestScores", "achievements", "packOpening", "rewardedCardSeal"] as const) {
    const carried = signal[key];
    const held = heldOwner === ownerUserId ? localJson(SIGNAL_LOCAL_NAMESPACE_KEYS[key]) : null;
    const selected = held ?? carried;
    if (selected !== undefined && selected !== null) write(SIGNAL_LOCAL_NAMESPACE_KEYS[key], selected);
  }
}

export async function admitReceizKeyPortableStateLocally(keyFile: ReceizKeyFile, isCurrent: () => boolean = () => true): Promise<void> {
  if (!isCurrent()) return;
  const snapshot = asRecord(keyFile.portableState?.snapshot);
  const account = asRecord(snapshot?.account);
  const ownerUserId = text(account?.userId) || text(keyFile.owner.uid);
  const calendar = asRecord(snapshot?.calendar);
  const contacts = asRecord(snapshot?.contacts);
  const signalVault = asRecord(snapshot?.signalVault);
  const sports = asRecord(snapshot?.sports);
  if (!snapshot || !ownerUserId) return;

  const walletSummary = projectWalletRouteSummaryFromReceizKeyPortableState(keyFile);
  const walletActivity = walletActivityHydrationSeedFromReceizKeyPortableState(keyFile);
  if (walletSummary || walletActivity) {
    const [walletModel, walletSummaryClient] = await Promise.all([
      import("@/app/lib/wallet/routeHydration"),
      import("@/app/lib/market/walletSummaryClient"),
    ]);
    if (!isCurrent()) return;
    if (walletSummary) {
      walletModel.writeWalletRouteHydrationSeed(walletSummary);
      const admittedWallet = walletModel.peekWalletRouteHydrationSeed();
      if (admittedWallet?.userId === ownerUserId && typeof window !== "undefined") {
        walletSummaryClient.writeSharedWalletSummaryClientCache(admittedWallet, ownerUserId);
        window.dispatchEvent(new CustomEvent("wallet:summary", { detail: admittedWallet }));
      }
    }
    if (walletActivity) {
      walletModel.writeWalletRouteActivityHydrationSeed(walletActivity);
    }
  }

  const carriedMarketSnapshot = readReceizMarketRouteSnapshotFromPortableAccount(snapshot, ownerUserId);
  if (carriedMarketSnapshot) {
    const marketModel = await import("@/app/lib/market/routeHydration");
    if (!isCurrent()) return;
    const currentMarketSnapshot = marketModel.peekMarketRouteSnapshot(true);
    const admittedMarketSnapshot = preserveMarketWalletContinuity(
      currentMarketSnapshot,
      carriedMarketSnapshot,
    );
    if (!marketModel.writeMarketRouteSnapshot(admittedMarketSnapshot)) {
      throw new Error("identity_market_projection_invalid");
    }
  }

  const calendarEvents = rows(calendar?.events);
  if (calendarEvents.length > 0) {
    const calendarRegister = await import("@/app/lib/calendar/calendarAccountBrainSeed");
    if (!isCurrent()) return;
    calendarRegister.writeCalendarAccountBrainSeed({
      ownerUid: ownerUserId,
      username: text(account?.username) || null,
      events: calendarEvents,
      connectedActionCount:
        typeof calendar?.connectedActionCount === "number" ? calendar.connectedActionCount : null,
      loadedAt: text(calendar?.loadedAt) || text(snapshot.exportedAt) || new Date().toISOString(),
    });
  }

  if (contacts?.projection) {
    const contactsRegister = await import("@/app/lib/contacts/routeHydration");
    if (!isCurrent()) return;
    const admitted = await contactsRegister.admitContactsAppendProjection(contacts.projection, isCurrent);
    if (!isCurrent()) return;
    if (!admitted) throw new Error("identity_contacts_projection_invalid");
  }

  if (signalVault) await admitSignalVaultFromPortableState(signalVault, ownerUserId, isCurrent);

  if (!sports || !isCurrent()) return;

  const vaultRows = rows(sports.vaultCards);
  const appendRows = rows(sports.cardAppends);
  const proofRows = rows(sports.eventProofs);
  if (vaultRows.length === 0 && appendRows.length === 0 && proofRows.length === 0) return;

  const model = await import("@/app/game/sports/sportsArenaConsoleModel");
    if (!isCurrent()) return;
  const appendsByCollectible = new Map<string, unknown[]>();
  for (const row of appendRows) {
    if (text(row.owner_user_id) !== ownerUserId) continue;
    const collectibleId = text(row.collectible_id).toLowerCase();
    if (!collectibleId || !model.isSportsArenaLiveAppendRecord(row.append_json)) continue;
    const existing = appendsByCollectible.get(collectibleId) ?? [];
    existing.push(row.append_json);
    appendsByCollectible.set(collectibleId, existing);
  }

  const cardsBySport = new Map<SportsArenaSlug, SportsVaultCardPayload[]>();
  for (const row of vaultRows) {
    if (text(row.owner_user_id) !== ownerUserId) continue;
    const sport = sportsSlug(row.sport);
    const claim = row.card_json;
    const asset = asRecord(row.asset_json) ?? {};
    const collectibleId = text(row.collectible_id).toLowerCase();
    if (!sport || !asRecord(claim) || !collectibleId) continue;
    const assetWithAppends = {
      ...asset,
      appends: appendsByCollectible.get(collectibleId) ?? (Array.isArray(asset.appends) ? asset.appends : []),
    };
    const payload: SportsVaultCardPayload = {
      claim,
      issue: asRecord(claim)?.issue ?? null,
      asset: assetWithAppends,
      listing: listingFromPortableVaultRow(row, ownerUserId),
    };
    cardsBySport.set(sport, [...(cardsBySport.get(sport) ?? []), payload]);
  }

  for (const [sport, cards] of cardsBySport.entries()) {
    const vaultSnapshot = model.sportsVaultSnapshotFromCards(cards);
    if (vaultSnapshot.claims.length > 0) {
      if (!isCurrent()) return;
      await model.writeStoredSportsVaultSnapshot(ownerUserId, vaultSnapshot, { isCurrent }, sport);
    }
  }

  const proofsBySport = new Map<SportsArenaSlug, unknown[]>();
  for (const row of proofRows) {
    if (
      text(row.owner_user_id) !== ownerUserId &&
      text(row.origin_owner_user_id) !== ownerUserId
    ) {
      continue;
    }
    const sport = sportsSlug(row.sport);
    if (!sport || !asRecord(row.proof_json)) continue;
    proofsBySport.set(sport, [...(proofsBySport.get(sport) ?? []), row.proof_json]);
  }

  for (const [sport, proofs] of proofsBySport.entries()) {
    if (!isCurrent()) return;
    await model.writeStoredSportsEventProofs(ownerUserId, proofs as SportsArenaEventProof[], sport, isCurrent);
  }
}

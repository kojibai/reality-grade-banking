import { publicOriginalMetricEnvelope } from "@/app/lib/market/compose";
import type { MarketDeskPulseValueSeed } from "@/app/lib/market/types";
import type { ProfileOriginal } from "@/app/lib/profile/types";
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from "@/app/utils/phi-issuance";
import { momentFromPulse } from "@/app/utils/kai_pulse";
import { computeIntrinsicUnsigned, type SigilMetadataLite } from "@/app/utils/valuation";

function pulseInteger(value: string | null | undefined): number | null {
  const normalized = (value ?? "").trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function deriveProfileOriginalPulseValueSeedFromProofObject(args: {
  original: ProfileOriginal;
  ownerUserId: string;
  ownerUsername: string;
}): MarketDeskPulseValueSeed | null {
  if (args.original.importedSource && !args.original.originalCreator) return null;
  const carried = args.original.marketPreview?.livePulseSeed ?? null;
  if (carried) return carried;

  const creationPulse = pulseInteger(args.original.pulse);
  if (creationPulse === null) return null;
  let originalMoment: ReturnType<typeof momentFromPulse>;
  try {
    originalMoment = momentFromPulse(BigInt(creationPulse));
  } catch {
    return null;
  }
  if (!Number.isFinite(originalMoment.pulse)) return null;

  const creatorUserId = args.original.originalCreator?.userId?.trim() || args.ownerUserId;
  const creatorUsername = args.original.originalCreator?.username?.trim() || args.ownerUsername;
  return {
    kind: "sigil",
    claimPulse: creationPulse,
    beat: originalMoment.beat,
    stepIndex: originalMoment.stepIndex,
    chakraDay: originalMoment.chakraDay ?? null,
    creatorVerified: args.original.hasPbiSignature === true,
    kaiSignature: creatorUsername || null,
    userPhiKey: `${creatorUserId}:${args.original.id}`,
  };
}

export function deriveProfileOriginalMarketPreviewFromProofCoordinates(args: {
  originalId: string;
  createdAt: string;
  pulse: string | null | undefined;
  ownerUserId: string;
  ownerUsername: string;
  creatorVerified: boolean;
  hasPbiSignature: boolean;
  creatorUserId?: string | null;
  creatorUsername?: string | null;
  importedSource?: ProfileOriginal["importedSource"];
  valuationKaiPulse?: number | string | null;
}): NonNullable<ProfileOriginal["marketPreview"]> | null {
  if (args.importedSource && !args.creatorUserId) return null;
  const creationPulse = pulseInteger(args.pulse);
  if (creationPulse === null) return null;
  let originalMoment: ReturnType<typeof momentFromPulse>;
  try {
    originalMoment = momentFromPulse(BigInt(creationPulse));
  } catch {
    return null;
  }
  if (!Number.isFinite(originalMoment.pulse)) return null;

  const requestedValuationPulse = pulseInteger(
    args.valuationKaiPulse === null || args.valuationKaiPulse === undefined
      ? null
      : String(args.valuationKaiPulse),
  );
  const valuationPulse = Math.max(creationPulse, requestedValuationPulse ?? creationPulse);
  const creatorUserId = args.creatorUserId?.trim() || args.ownerUserId;
  const creatorUsername = args.creatorUsername?.trim() || args.ownerUsername;
  const livePulseSeed: MarketDeskPulseValueSeed = {
    kind: "sigil",
    claimPulse: creationPulse,
    beat: originalMoment.beat,
    stepIndex: originalMoment.stepIndex,
    chakraDay: originalMoment.chakraDay ?? null,
    creatorVerified: args.creatorVerified,
    kaiSignature: creatorUsername,
    userPhiKey: `${creatorUserId}:${args.originalId}`,
  };
  const meta: SigilMetadataLite = {
    pulse: creationPulse,
    kaiPulse: creationPulse,
    beat: originalMoment.beat,
    stepIndex: originalMoment.stepIndex,
    stepsPerBeat: 44,
    quality: "high",
    creatorVerified: args.creatorVerified,
    creatorRep: 0,
    chakraDay: originalMoment.chakraDay,
    kaiSignature: creatorUsername || undefined,
    userPhiKey: livePulseSeed.userPhiKey ?? undefined,
  };

  const { unsigned } = computeIntrinsicUnsigned(meta, valuationPulse);
  const valuePhi =
    Number.isFinite(unsigned.valuePhi) && unsigned.valuePhi > 0
      ? Math.round(unsigned.valuePhi * 1_000_000) / 1_000_000
      : 0;
  let quoteUsdPerPhi = 0;
  try {
    const quote = quotePhiForUsd(
      {
        meta,
        nowPulse: valuationPulse,
        usd: 100,
        currentStreakDays: 0,
        lifetimeUsdSoFar: 0,
      },
      DEFAULT_ISSUANCE_POLICY,
    );
    quoteUsdPerPhi = Number.isFinite(quote.usdPerPhi) && quote.usdPerPhi > 0 ? quote.usdPerPhi : 0;
  } catch {
    quoteUsdPerPhi = 0;
  }

  const effectiveUsdPerPhi = quoteUsdPerPhi > 0 ? quoteUsdPerPhi : 1;
  const valueUsdRaw = valuePhi * effectiveUsdPerPhi;
  const valueUsd =
    Number.isFinite(valueUsdRaw) && valueUsdRaw > 0
      ? Math.round(valueUsdRaw * 100) / 100
      : 0;
  const envelope = publicOriginalMetricEnvelope({
    id: `profile:${args.ownerUsername}:${args.originalId}`,
    valueUsd,
    valuePhi,
    usdPerPhi: effectiveUsdPerPhi,
    hasPbiSignature: args.hasPbiSignature,
  });

  return {
    quoteUsdPerPhi: effectiveUsdPerPhi,
    priceUsd: envelope.priceUsd,
    pricePhi: envelope.pricePhi,
    intrinsicPhi: envelope.intrinsicPhi,
    changePct: envelope.changePct,
    volumeUsd: envelope.volumeUsd,
    liquidityUsd: envelope.liquidityUsd,
    holders: envelope.holders,
    premiumX: envelope.premiumX,
    momentX: envelope.momentX,
    livePulseSeed,
  };
}

export function deriveProfileOriginalMarketPreviewFromProofObject(args: {
  original: ProfileOriginal;
  ownerUserId: string;
  ownerUsername: string;
  creatorVerified: boolean;
  valuationKaiPulse?: number | string | null;
}): NonNullable<ProfileOriginal["marketPreview"]> | null {
  return deriveProfileOriginalMarketPreviewFromProofCoordinates({
    originalId: args.original.id,
    createdAt: args.original.createdAt,
    pulse: args.original.pulse,
    ownerUserId: args.ownerUserId,
    ownerUsername: args.ownerUsername,
    creatorVerified: args.creatorVerified,
    hasPbiSignature: args.original.hasPbiSignature,
    importedSource: args.original.importedSource,
    creatorUserId: args.original.originalCreator?.userId ?? null,
    creatorUsername: args.original.originalCreator?.username ?? null,
    valuationKaiPulse: args.valuationKaiPulse,
  });
}

export function attachMissingProfileOriginalMarketPreviewsFromProofObjects(args: {
  originals: readonly ProfileOriginal[];
  ownerUserId: string;
  ownerUsername: string;
  ownerAuthorshipVerified: boolean;
  valuationKaiPulse?: number | string | null;
}): ProfileOriginal[] {
  return args.originals.map((original) => {
    if (!original.showOnProfile || original.marketPreview != null) return original;

    return {
      ...original,
      marketPreview: deriveProfileOriginalMarketPreviewFromProofObject({
        original,
        ownerUserId: args.ownerUserId,
        ownerUsername: args.ownerUsername,
        creatorVerified: original.hasPbiSignature === true,
        valuationKaiPulse: args.valuationKaiPulse,
      }),
    };
  });
}

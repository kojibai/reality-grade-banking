import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

import type { MarketDeskPulseValueSeed } from "@/app/lib/market/types";
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from "@/app/utils/phi-issuance";
import { computeIntrinsicUnsigned, type SigilMetadataLite } from "@/app/utils/valuation";

export const GLYPH_SETTLEMENT_PROJECTOR_VERSION = "receiz.glyph-settlement-projector.v125" as const;

const GLYPH_SETTLEMENT_PROJECTOR_LAW = Object.freeze({
  version: GLYPH_SETTLEMENT_PROJECTOR_VERSION,
  membership: "one-canonical-current-owner-per-public-sealed-artifact",
  valuation: "sealed-kai-pulse-through-canonical-intrinsic-projector-at-current-kai-pulse",
  execution: "artifact-base-plus-ledger-credits-minus-ledger-debits-minus-legacy-seed",
  multipliers: "none",
});

export type GlyphEconomyPublicSeed = {
  id: string;
  livePulseSeed: MarketDeskPulseValueSeed;
};

export type GlyphEconomySeedProjection = {
  id: string;
  phiMicro: bigint;
  usdCents: bigint;
};

export type GlyphEconomyProjection = {
  computedPulse: number;
  projectorVersion: typeof GLYPH_SETTLEMENT_PROJECTOR_VERSION;
  projectorDigest: string;
  membershipDigest: string;
  sourceGlyphCount: number;
  publicGlyphCount: number;
  invalidGlyphCount: number;
  duplicateGlyphCount: number;
  glyphSettlementPhiMicro: bigint;
  glyphSettlementUsdCents: bigint;
  availablePhiMicro: bigint;
  availableUsdCents: bigint;
};

type CanonicalGlyphSeed = {
  id: string;
  kind: "sigil";
  claimPulse: number;
  beat: number;
  stepIndex: number;
  chakraDay: string | null;
  creatorVerified: boolean;
  kaiSignature: string | null;
  userPhiKey: string | null;
};

const utf8 = new TextEncoder();

function sha256Hex(value: string): string {
  return bytesToHex(sha256(utf8.encode(value)));
}

export const GLYPH_SETTLEMENT_PROJECTOR_DIGEST = sha256Hex(
  JSON.stringify(GLYPH_SETTLEMENT_PROJECTOR_LAW),
);

function nonNegative(value: bigint): bigint {
  return value > 0n ? value : 0n;
}

function optionalText(value: string | null): string | null {
  if (value === null) return null;
  const normalized = value.trim();
  return normalized || null;
}

function canonicalGlyphSeed(glyph: GlyphEconomyPublicSeed): CanonicalGlyphSeed | null {
  const id = glyph.id.trim().toLowerCase();
  const seed = glyph.livePulseSeed;
  if (!id || seed.kind !== "sigil") return null;
  if (!Number.isSafeInteger(seed.claimPulse) || seed.claimPulse < 0) return null;
  if (!Number.isSafeInteger(seed.beat) || seed.beat < 0) return null;
  if (!Number.isSafeInteger(seed.stepIndex) || seed.stepIndex < 0 || seed.stepIndex >= 44) return null;
  if (seed.chakraDay !== null && typeof seed.chakraDay !== "string") return null;
  if (typeof seed.creatorVerified !== "boolean") return null;
  if (seed.kaiSignature !== null && typeof seed.kaiSignature !== "string") return null;
  if (seed.userPhiKey !== null && typeof seed.userPhiKey !== "string") return null;

  return {
    id,
    kind: "sigil",
    claimPulse: seed.claimPulse,
    beat: seed.beat,
    stepIndex: seed.stepIndex,
    chakraDay: optionalText(seed.chakraDay),
    creatorVerified: seed.creatorVerified,
    kaiSignature: optionalText(seed.kaiSignature),
    userPhiKey: optionalText(seed.userPhiKey),
  };
}

function publicSeedFromCanonical(seed: CanonicalGlyphSeed): GlyphEconomyPublicSeed {
  return {
    id: seed.id,
    livePulseSeed: {
      kind: seed.kind,
      claimPulse: seed.claimPulse,
      beat: seed.beat,
      stepIndex: seed.stepIndex,
      chakraDay: seed.chakraDay,
      creatorVerified: seed.creatorVerified,
      kaiSignature: seed.kaiSignature,
      userPhiKey: seed.userPhiKey,
    },
  };
}

function valuationMeta(seed: MarketDeskPulseValueSeed): SigilMetadataLite {
  return {
    pulse: seed.claimPulse,
    kaiPulse: seed.claimPulse,
    beat: seed.beat,
    stepIndex: seed.stepIndex,
    stepsPerBeat: 44,
    quality: "high",
    creatorVerified: seed.creatorVerified,
    creatorRep: 0,
    chakraDay: seed.chakraDay ?? undefined,
    kaiSignature: seed.kaiSignature ?? undefined,
    userPhiKey: seed.userPhiKey ?? undefined,
  };
}

export function projectGlyphEconomySeed(
  glyphRaw: GlyphEconomyPublicSeed,
  computedPulseRaw: number,
): GlyphEconomySeedProjection {
  const glyph = canonicalGlyphSeed(glyphRaw);
  if (!glyph || !Number.isSafeInteger(computedPulseRaw) || computedPulseRaw < 0) {
    throw new Error("glyph_economy_invalid_seed");
  }
  const computedPulse = Math.trunc(computedPulseRaw);
  const valuationPulse = Math.max(glyph.claimPulse, computedPulse);
  const meta = valuationMeta(publicSeedFromCanonical(glyph).livePulseSeed);
  const valuePhiRaw = computeIntrinsicUnsigned(meta, valuationPulse).unsigned.valuePhi;
  const valuePhi = Number.isFinite(valuePhiRaw) && valuePhiRaw > 0 ? valuePhiRaw : 0;
  const phiMicro = BigInt(Math.round(valuePhi * 1_000_000));

  let usdCents = 0n;
  if (valuePhi > 0) {
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
    if (Number.isFinite(quote.usdPerPhi) && quote.usdPerPhi > 0) {
      usdCents = BigInt(Math.round(valuePhi * quote.usdPerPhi * 100));
    }
  }

  return { id: glyph.id, phiMicro, usdCents };
}

export function projectGlyphEconomy(args: {
  publicGlyphs: readonly GlyphEconomyPublicSeed[];
  computedPulse: number;
  ledgerDeltaPhiMicro?: bigint;
  ledgerDeltaUsdCents?: bigint;
}): GlyphEconomyProjection {
  if (!Number.isSafeInteger(args.computedPulse) || args.computedPulse < 0) {
    throw new Error("glyph_economy_invalid_computed_pulse");
  }

  const canonicalById = new Map<string, { seed: CanonicalGlyphSeed; encoded: string; conflicted: boolean }>();
  let invalidGlyphCount = 0;
  let duplicateGlyphCount = 0;

  for (const glyph of args.publicGlyphs) {
    const seed = canonicalGlyphSeed(glyph);
    if (!seed) {
      invalidGlyphCount += 1;
      continue;
    }
    const encoded = JSON.stringify(seed);
    const existing = canonicalById.get(seed.id);
    if (!existing) {
      canonicalById.set(seed.id, { seed, encoded, conflicted: false });
      continue;
    }
    duplicateGlyphCount += 1;
    if (existing.encoded !== encoded) existing.conflicted = true;
  }

  const canonicalGlyphs = Array.from(canonicalById.values())
    .filter((entry) => {
      if (!entry.conflicted) return true;
      invalidGlyphCount += 1;
      return false;
    })
    .sort((left, right) => left.seed.id.localeCompare(right.seed.id));

  let glyphSettlementPhiMicro = 0n;
  let glyphSettlementUsdCents = 0n;
  for (const entry of canonicalGlyphs) {
    const projected = projectGlyphEconomySeed(publicSeedFromCanonical(entry.seed), args.computedPulse);
    glyphSettlementPhiMicro += projected.phiMicro;
    glyphSettlementUsdCents += projected.usdCents;
  }

  return {
    computedPulse: args.computedPulse,
    projectorVersion: GLYPH_SETTLEMENT_PROJECTOR_VERSION,
    projectorDigest: GLYPH_SETTLEMENT_PROJECTOR_DIGEST,
    membershipDigest: sha256Hex(JSON.stringify(canonicalGlyphs.map((entry) => entry.seed))),
    sourceGlyphCount: args.publicGlyphs.length,
    publicGlyphCount: canonicalGlyphs.length,
    invalidGlyphCount,
    duplicateGlyphCount,
    glyphSettlementPhiMicro,
    glyphSettlementUsdCents,
    availablePhiMicro: nonNegative(glyphSettlementPhiMicro + (args.ledgerDeltaPhiMicro ?? 0n)),
    availableUsdCents: nonNegative(glyphSettlementUsdCents + (args.ledgerDeltaUsdCents ?? 0n)),
  };
}

"use client";

import { profileCreationMicroPulseFromOriginalDate, wholeKaiPulseFromMicroPulse } from "./profileIdentityCreationCoordinate";

export const PROFILE_IDENTITY_GENESIS_SCHEMA = "receiz.profile.identity-genesis.v1" as const;
const PROFILE_IDENTITY_GENESIS_REGISTER_KEY = "receiz.profile.identity-genesis.register.v1";

export type ProfileIdentityGenesis = Readonly<{
  schema: typeof PROFILE_IDENTITY_GENESIS_SCHEMA;
  profileUserId: string;
  createdAt: string;
  creationKaiMicroPulse: string;
  genesisReceizId: string;
  baseSeedHash: string;
}>;

type GenesisRegister = Record<string, ProfileIdentityGenesis>;

function positiveKaiMicroPulse(value: string | null | undefined): bigint | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^\d+$/u.test(normalized)) return null;
  const microPulse = BigInt(normalized);
  return microPulse > 0n ? microPulse : null;
}

function validCreationCreatedAt(value: string | null | undefined): string | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) return null;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function validGenesis(value: unknown): value is ProfileIdentityGenesis {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ProfileIdentityGenesis>;
  return item.schema === PROFILE_IDENTITY_GENESIS_SCHEMA
    && typeof item.profileUserId === "string" && Boolean(item.profileUserId)
    && typeof item.createdAt === "string" && Boolean(item.createdAt)
    && typeof item.creationKaiMicroPulse === "string" && /^-?\d+$/u.test(item.creationKaiMicroPulse)
    && typeof item.genesisReceizId === "string" && Boolean(item.genesisReceizId)
    && typeof item.baseSeedHash === "string" && /^[0-9a-f]{64}$/u.test(item.baseSeedHash);
}

function admittedGenesisCarriesCreationTruth(value: ProfileIdentityGenesis): boolean {
  const microPulse = positiveKaiMicroPulse(value.creationKaiMicroPulse);
  return Boolean(microPulse && validCreationCreatedAt(value.createdAt));
}

function readRegister(): GenesisRegister {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROFILE_IDENTITY_GENESIS_REGISTER_KEY) ?? "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter((entry): entry is [string, ProfileIdentityGenesis] => validGenesis(entry[1])));
  } catch {
    return {};
  }
}

export function peekProfileIdentityGenesis(profileUserId: string): ProfileIdentityGenesis | null {
  return readRegister()[profileUserId.trim()] ?? null;
}

export function readOrAdmitProfileIdentityGenesis(args: {
  profileUserId: string;
  createdAt: string;
  originalAccountCreatedAt?: string | null;
  creationKaiMicroPulse: string;
  genesisReceizId: string;
  baseSeedHash: string;
}): ProfileIdentityGenesis {
  const profileUserId = args.profileUserId.trim();
  const existing = peekProfileIdentityGenesis(profileUserId);
  const original = profileCreationMicroPulseFromOriginalDate(args.originalAccountCreatedAt);
  const correctsDifferentEvent = Boolean(existing && original
    && wholeKaiPulseFromMicroPulse(args.creationKaiMicroPulse) === wholeKaiPulseFromMicroPulse(original)
    && (positiveKaiMicroPulse(existing.creationKaiMicroPulse) !== positiveKaiMicroPulse(args.creationKaiMicroPulse)
      || validCreationCreatedAt(existing.createdAt) !== validCreationCreatedAt(args.originalAccountCreatedAt)));
  if (existing && admittedGenesisCarriesCreationTruth(existing) && !correctsDifferentEvent) return existing;
  const createdAt = validCreationCreatedAt(args.createdAt);
  const creationKaiMicroPulse = positiveKaiMicroPulse(args.creationKaiMicroPulse);
  if (!createdAt || !creationKaiMicroPulse) throw new Error("profile_identity_genesis_creation_pulse_invalid");
  const value = Object.freeze({
    schema: PROFILE_IDENTITY_GENESIS_SCHEMA,
    profileUserId,
    createdAt,
    creationKaiMicroPulse: creationKaiMicroPulse.toString(),
    genesisReceizId: existing?.genesisReceizId.trim() || args.genesisReceizId.trim(),
    baseSeedHash: args.baseSeedHash.trim().toLowerCase(),
  });
  if (!validGenesis(value)) throw new Error("profile_identity_genesis_invalid");
  if (typeof window !== "undefined") {
    if (existing && correctsDifferentEvent) {
      const correctionKey = `${PROFILE_IDENTITY_GENESIS_REGISTER_KEY}.corrections`;
      const prior: unknown = JSON.parse(window.localStorage.getItem(correctionKey) ?? "[]");
      const corrections = Array.isArray(prior) ? prior : [];
      window.localStorage.setItem(correctionKey, JSON.stringify([...corrections, {
        reason: "original-account-creation-source", originalAccountCreatedAt: args.originalAccountCreatedAt,
        rejected: existing, corrected: value,
      }]));
    }
    const register = readRegister();
    register[profileUserId] = value;
    window.localStorage.setItem(PROFILE_IDENTITY_GENESIS_REGISTER_KEY, JSON.stringify(register));
  }
  return value;
}

import { microPulsesSinceGenesis } from "../../utils/kai_pulse.js";

export const PROFILE_IDENTITY_CREATION_KAI_SOURCES = [
  "sealed-receiz-identity",
  "legacy-profile-genesis-recovery",
] as const;

export type ProfileIdentityCreationKaiSource = typeof PROFILE_IDENTITY_CREATION_KAI_SOURCES[number];

function positiveKaiMicroPulse(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  if (!/^[1-9][0-9]*$/u.test(normalized)) return null;
  return normalized;
}

export function wholeKaiPulseFromMicroPulse(value: string | null | undefined): string | null {
  const normalized = positiveKaiMicroPulse(value);
  if (!normalized) return null;
  return (BigInt(normalized) / 1_000_000n).toString();
}

export function normalizeProfileIdentityCreationKaiSource(
  value: string | null | undefined,
): ProfileIdentityCreationKaiSource | null {
  return PROFILE_IDENTITY_CREATION_KAI_SOURCES.find((source) => source === value) ?? null;
}

/** Original account creation is an event; device enrollment is a different event. */
export function profileCreationMicroPulseFromOriginalDate(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const pulse = microPulsesSinceGenesis(value.trim());
    return pulse > 0n ? pulse.toString() : null;
  } catch { return null; }
}

export function resolveProfileIdentityCreationKaiMicroPulse(args: Readonly<{
  originalAccountCreatedAt?: string | null;
  persistedMicroPulse: string | null | undefined;
  persistedSource: string | null | undefined;
  storedGenesisMicroPulse?: string | null;
  /** Compatibility input only: access by this device never proves account birth. */
  deviceMicroPulse?: string | null;
}>): string | null {
  const persisted = positiveKaiMicroPulse(args.persistedMicroPulse);
  const source = normalizeProfileIdentityCreationKaiSource(args.persistedSource);
  const original = profileCreationMicroPulseFromOriginalDate(args.originalAccountCreatedAt);
  const held = positiveKaiMicroPulse(args.storedGenesisMicroPulse);
  const samePulse = (left: string, right: string) => wholeKaiPulseFromMicroPulse(left) === wholeKaiPulseFromMicroPulse(right);
  // Historical recovery projects the actual original date, never the device,
  // bootstrap, recovery, export, or database insertion event. A representation
  // carrying a different event cannot latch that event as account genesis.
  if (original) {
    if (persisted && samePulse(persisted, original)) {
      return persisted;
    }
    return original;
  }
  if (persisted && source === "legacy-profile-genesis-recovery" && held && samePulse(held, persisted)) return held;
  return persisted;
}

type CreationRecord = Record<string, unknown>;
function record(value: unknown): CreationRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as CreationRecord : null;
}
function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null; }

/** Projects an already-admitted enclosing account source; this does not verify or admit a key. */
export function accountIdentityCreationFromPortableSource(args: Readonly<{
  ownerUserId: string;
  profileUserId: string;
  snapshot: unknown;
  includeOriginalDeviceAccount?: boolean;
}>): Readonly<{ createdAt: string; creationKaiMicroPulse: string | null; creationKaiSource: ProfileIdentityCreationKaiSource | null }> | null {
  const snapshot = record(args.snapshot);
  if (!snapshot) return null;
  const account = record(snapshot.account);
  const accountUserId = text(account?.userId) ?? args.ownerUserId;
  const profileView = record(record(snapshot.profileView)?.profile);
  const profile = record(snapshot.profile);
  const matches = (value: CreationRecord | null) => Boolean(value && (text(value.userId) ?? accountUserId) === args.profileUserId);
  const carried = matches(profileView) ? profileView : matches(profile) ? profile : null;
  if (carried) {
    const createdAt = text(carried.createdAt);
    const persistedMicroPulse = text(carried.creationKaiMicroPulse);
    const persistedSource = text(carried.creationKaiSource);
    if (createdAt && profileCreationMicroPulseFromOriginalDate(createdAt)) {
      const creationKaiMicroPulse = resolveProfileIdentityCreationKaiMicroPulse({ originalAccountCreatedAt: createdAt, persistedMicroPulse, persistedSource });
      return { createdAt, creationKaiMicroPulse,
        creationKaiSource: creationKaiMicroPulse === persistedMicroPulse && normalizeProfileIdentityCreationKaiSource(persistedSource)
          ? normalizeProfileIdentityCreationKaiSource(persistedSource) : "legacy-profile-genesis-recovery" };
    }
  }
  // Only the original device account owns this top-level creation event.
  // An active binding to a recovered account does not change its owner.
  if (args.includeOriginalDeviceAccount === false || snapshot.schema !== "receiz.device.identity.v1" || args.ownerUserId !== args.profileUserId || accountUserId !== args.profileUserId) return null;
  const createdAt = text(snapshot.createdAt);
  if (!createdAt || !profileCreationMicroPulseFromOriginalDate(createdAt)) return null;
  const exact = positiveKaiMicroPulse(text(snapshot.creationKaiMicroPulse));
  return { createdAt, creationKaiMicroPulse: exact ?? profileCreationMicroPulseFromOriginalDate(createdAt),
    creationKaiSource: exact ? "sealed-receiz-identity" : "legacy-profile-genesis-recovery" };
}

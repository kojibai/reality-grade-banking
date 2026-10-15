export type KairosNotePwaCustodyProfile = Readonly<{
  profileId: string;
  profileEvidenceDigest: string;
  aaguid: string;
  rpId: string;
  allowedOrigins: readonly string[];
}>;

export type KairosNotePwaCustodyObservation = Readonly<{
  aaguid: string;
  rpId: string;
  origin: string;
  backupEligible: boolean;
  backupState: boolean;
  signCount: number;
}>;

export type KairosNotePwaCustodyProfileResolution =
  | Readonly<{ status: "qualified"; profile: KairosNotePwaCustodyProfile }>
  | Readonly<{
      status: "unsupported";
      code:
        | "OFFLINE_NOTE_CUSTODY_PROFILE_NOT_REGISTERED"
        | "OFFLINE_NOTE_CUSTODY_BACKUP_ELIGIBLE"
        | "OFFLINE_NOTE_CUSTODY_BACKUP_STATE"
        | "OFFLINE_NOTE_CUSTODY_COUNTER_UNAVAILABLE";
    }>;

const SHA256_RE = /^[0-9a-f]{64}$/;
const AAGUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Legacy non-attested adapters remain fail-closed unless an exact profile is
// supplied. Production Offline Cash attempts the stronger attested path first;
// it does not require a manually registered device model.
export const RECEIZ_OFFLINE_NOTE_PWA_CUSTODY_PROFILES = Object.freeze(
  [] as readonly KairosNotePwaCustodyProfile[],
);

function validProfile(profile: KairosNotePwaCustodyProfile): boolean {
  return Boolean(profile.profileId.trim()
    && SHA256_RE.test(profile.profileEvidenceDigest)
    && AAGUID_RE.test(profile.aaguid)
    && profile.rpId.trim()
    && profile.allowedOrigins.length > 0
    && profile.allowedOrigins.every((origin) => {
      try {
        return new URL(origin).protocol === "https:";
      } catch {
        return false;
      }
    }));
}

export function resolveKairosNotePwaCustodyProfile(
  observation: KairosNotePwaCustodyObservation,
  profiles: readonly KairosNotePwaCustodyProfile[] = RECEIZ_OFFLINE_NOTE_PWA_CUSTODY_PROFILES,
): KairosNotePwaCustodyProfileResolution {
  if (observation.backupEligible) {
    return Object.freeze({ status: "unsupported", code: "OFFLINE_NOTE_CUSTODY_BACKUP_ELIGIBLE" });
  }
  if (observation.backupState) {
    return Object.freeze({ status: "unsupported", code: "OFFLINE_NOTE_CUSTODY_BACKUP_STATE" });
  }
  if (!Number.isSafeInteger(observation.signCount) || observation.signCount <= 0) {
    return Object.freeze({ status: "unsupported", code: "OFFLINE_NOTE_CUSTODY_COUNTER_UNAVAILABLE" });
  }
  const profile = profiles.find((candidate) => validProfile(candidate)
    && candidate.aaguid === observation.aaguid.toLowerCase()
    && candidate.rpId === observation.rpId
    && candidate.allowedOrigins.includes(observation.origin));
  return profile
    ? Object.freeze({ status: "qualified", profile })
    : Object.freeze({ status: "unsupported", code: "OFFLINE_NOTE_CUSTODY_PROFILE_NOT_REGISTERED" });
}

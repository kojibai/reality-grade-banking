import type { ProfileViewData } from "@/app/lib/profile/types";
import {
  profileWithStableCreationSeed,
  rememberProfileCreationSeed,
} from "@/app/lib/profile/profileCreationSeed";
import { buildLocalProfileViewFromSession, isLocalProfileTruthRoot } from "@/app/lib/profile/localProfileTruth";
import { parseProfileUsername } from "@/app/lib/profile/username";
import { mergeProfilePreservingPbiReceiptHistory } from "@/app/lib/profile/pbiSignatureProjection";
import { mergeProfilePreservingStrongerIdentity } from "@/app/lib/profile/profileIdentityAuthority";
import { mergeDeterministicProfileFeed } from "@/app/lib/profile/deterministicFeed";
import {
  PROFILE_WORKSPACE_FAST_ENTRY_COOKIE,
  PROFILE_WORKSPACE_FAST_ENTRY_MAX_AGE_SECONDS,
} from "@/app/lib/profile/workspaceFastEntry";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthEntriesByPrefix,
  readDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { runtimeProjectionStorageKey } from "@/app/lib/runtime/runtimeCoherence";
import { peekSessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";

const PROFILE_WORKSPACE_HYDRATION_KEY_BASE = "receiz.profile.workspace.seed.v1";
const PROFILE_WORKSPACE_HYDRATION_KEY = runtimeProjectionStorageKey(PROFILE_WORKSPACE_HYDRATION_KEY_BASE);
const PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY_BASE = "receiz.profile.workspace.seed.durable.v1";
const PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY = PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY_BASE;
const PROFILE_WORKSPACE_DURABLE_HYDRATION_SOURCE = "profile-workspace-hydration";
const PROFILE_WORKSPACE_HYDRATION_UPDATED_EVENT = "receiz:profile-workspace-hydration-updated";

type ProfileWorkspaceHydrationStored = {
  version: 1;
  createdAtMs: number;
  profile: ProfileViewData;
  viewerEmail: string | null;
};

export type ProfileWorkspaceHydrationSeed = {
  profile: ProfileViewData;
  viewerEmail: string | null;
};

type ProfileMeResponse = {
  ok?: boolean;
  error?: string;
  profile?: ProfileViewData;
};

type ProfileWorkspaceSessionStatus = "confirmed" | "pending" | "mismatch";

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function clearLegacyProfileWorkspaceProjection(): void {
  if (hasSessionStorage()) {
    try {
      window.sessionStorage.removeItem(PROFILE_WORKSPACE_HYDRATION_KEY_BASE);
    } catch {
      // Ignore cleanup failures.
    }
  }

}

function releaseScopedProfileWorkspaceEntries() {
  return readDurableLocalTruthEntriesByPrefix(
    `${PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY_BASE}.`,
    { source: PROFILE_WORKSPACE_DURABLE_HYDRATION_SOURCE },
  );
}

function durableProfileWorkspaceKey(userId: string): string {
  return `${PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY_BASE}.${encodeURIComponent(userId)}`;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function parseStoredSeed(raw: string): ProfileWorkspaceHydrationStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileWorkspaceHydrationStored>;

    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;

    const createdAtMs = Number(parsed.createdAtMs);

    if (!parsed.profile || typeof parsed.profile !== "object") return null;
    if (parsed.viewerEmail !== null && parsed.viewerEmail !== undefined && typeof parsed.viewerEmail !== "string") {
      return null;
    }

    const profile = parsed.profile as Partial<ProfileViewData>;

    if (!profile.profile || typeof profile.profile !== "object") return null;
    if (!profile.viewer || typeof profile.viewer !== "object") return null;
    if (!Array.isArray(profile.originals)) return null;
    if (!profile.originalsPage || typeof profile.originalsPage !== "object") return null;
    if (typeof profile.profile.userId !== "string" || !profile.profile.userId.trim()) return null;
    if (typeof profile.profile.username !== "string" || !profile.profile.username.trim()) return null;

    return {
      version: 1,
      createdAtMs,
      profile: profileWithStableCreationSeed(parsed.profile as ProfileViewData),
      viewerEmail: normalizeNullableString(parsed.viewerEmail),
    };
  } catch {
    return null;
  }
}

function profileWorkspaceSessionStatus(profile: ProfileViewData): ProfileWorkspaceSessionStatus {
  const session = peekSessionBootstrapSnapshot(true);

  if (!session?.uid) return "pending";

  return profile.profile.userId === session.uid ? "confirmed" : "mismatch";
}

function profileMatchesCurrentSession(profile: ProfileViewData): boolean {
  return profileWorkspaceSessionStatus(profile) === "confirmed";
}

function profileHasConfirmedSessionMismatch(profile: ProfileViewData): boolean {
  return profileWorkspaceSessionStatus(profile) === "mismatch";
}

function profileWorkspaceTruthRank(profile: ProfileViewData): number {
  const ownerBoost = profile.viewer.isOwner || profile.viewer.canEdit ? 40 : 0;

  return DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot + ownerBoost + profile.originals.length;
}

function serializeProfileWorkspacePayload(payload: ProfileWorkspaceHydrationStored): string | null {
  const seen = new WeakSet<object>();

  try {
    return JSON.stringify(payload, (_key, value: unknown) => {
      if (typeof value === "bigint") return value.toString();
      if (typeof Blob !== "undefined" && value instanceof Blob) return null;

      if (value && typeof value === "object") {
        if (seen.has(value)) return null;
        seen.add(value);
      }

      return value;
    });
  } catch {
    return null;
  }
}

function removeSessionProfileWorkspaceHydrationSeed(): void {
  if (!hasSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(PROFILE_WORKSPACE_HYDRATION_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}

function writeSessionProfileWorkspaceHydrationSeed(serialized: string): void {
  if (!hasSessionStorage()) return;

  try {
    window.sessionStorage.setItem(PROFILE_WORKSPACE_HYDRATION_KEY, serialized);
  } catch {
    // Ignore storage write failures.
  }
}

function notifyProfileWorkspaceHydrationSeedUpdated(): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new Event(PROFILE_WORKSPACE_HYDRATION_UPDATED_EVENT));
}

export function subscribeProfileWorkspaceHydrationSeed(listener: () => void): () => void {
  if (typeof window === "undefined" || typeof window.addEventListener !== "function") {
    return () => undefined;
  }

  const onUpdated = () => listener();
  const onStorage = (event: Event) => {
    const storageKey = (event as StorageEvent).key ?? "";
    if (
      storageKey === PROFILE_WORKSPACE_HYDRATION_KEY
      || storageKey.startsWith(`${PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY_BASE}.`)
    ) {
      listener();
    }
  };
  window.addEventListener(PROFILE_WORKSPACE_HYDRATION_UPDATED_EVENT, onUpdated);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PROFILE_WORKSPACE_HYDRATION_UPDATED_EVENT, onUpdated);
    window.removeEventListener("storage", onStorage);
  };
}

function profileWorkspaceSeedIsInvalidForAnySession(seed: ProfileWorkspaceHydrationStored | null): boolean {
  if (!seed) return true;
  return isLocalProfileTruthRoot(seed.profile);
}

export function writeProfileWorkspaceHydrationSeed(seed: ProfileWorkspaceHydrationSeed | null | undefined): void {
  if (!seed?.profile?.profile?.userId || !seed.profile.profile.username) return;
  if (isLocalProfileTruthRoot(seed.profile)) return;

  clearLegacyProfileWorkspaceProjection();

  const incomingStableProfile = rememberProfileCreationSeed(seed.profile);
  const existingSeed = readProfileWorkspaceHydrationSeed(false);
  const stableProfile = (() => {
    if (
      existingSeed?.profile.profile.userId !== incomingStableProfile.profile.userId ||
      existingSeed.profile.profile.username !== incomingStableProfile.profile.username
    ) {
      return incomingStableProfile;
    }

    const identityAndReceiptSafeIncoming = mergeProfilePreservingPbiReceiptHistory(
      existingSeed.profile,
      mergeProfilePreservingStrongerIdentity(existingSeed.profile, incomingStableProfile),
    );
    const deterministicAppend = mergeDeterministicProfileFeed({
      prev: existingSeed.profile,
      next: identityAndReceiptSafeIncoming,
    });

    return {
      ...identityAndReceiptSafeIncoming,
      originals: deterministicAppend.originals,
      originalsPage: deterministicAppend.originalsPage,
      stats: deterministicAppend.stats,
      deterministicManifest: deterministicAppend.deterministicManifest,
    };
  })();
  const nextRank = profileWorkspaceTruthRank(stableProfile);

  if (existingSeed && profileWorkspaceTruthRank(existingSeed.profile) > nextRank) {
    return;
  }

  const payload: ProfileWorkspaceHydrationStored = {
    version: 1,
    createdAtMs: Date.now(),
    profile: stableProfile,
    viewerEmail: normalizeNullableString(seed.viewerEmail),
  };

  const serialized = serializeProfileWorkspacePayload(payload);

  if (!serialized) return;

  writeDurableLocalTruthItem(durableProfileWorkspaceKey(stableProfile.profile.userId), serialized, {
    rank: profileWorkspaceTruthRank(stableProfile),
    source: PROFILE_WORKSPACE_DURABLE_HYDRATION_SOURCE,
    allowSameRankOverwrite: true,
  });

  writeSessionProfileWorkspaceHydrationSeed(serialized);
  notifyProfileWorkspaceHydrationSeedUpdated();
}

export function clearProfileWorkspaceHydrationSeed(): void {
  // Account/session switching clears only the active projection. The admitted
  // proof object remains durably namespaced by its owner and can be projected
  // again after that owner proves identity.
  removeSessionProfileWorkspaceHydrationSeed();
  clearProfileWorkspaceFastEntryHint();
}

export function seedProfileWorkspaceFromLocalSession(
  viewerEmail?: string | null,
): ProfileWorkspaceHydrationSeed | null {
  const session = peekSessionBootstrapSnapshot(true);
  const profile = buildLocalProfileViewFromSession(session);

  if (!profile) return null;

  const seed = {
    profile,
    viewerEmail: normalizeNullableString(viewerEmail ?? session?.email ?? null),
  } satisfies ProfileWorkspaceHydrationSeed;

  return seed;
}

export function profileWorkspaceSeedCarriesVisibleProfileTruth(
  seed: ProfileWorkspaceHydrationSeed | null | undefined,
): seed is ProfileWorkspaceHydrationSeed {
  const profile = seed?.profile ?? null;

  if (!profile?.profile.userId || !profile.profile.username) return false;
  if (!profile.viewer.isOwner && !profile.viewer.canEdit) return false;

  return !isLocalProfileTruthRoot(profile);
}

export async function primeProfileWorkspaceHydrationSeed(
  viewerEmail?: string | null,
  options?: { complete?: boolean },
): Promise<ProfileWorkspaceHydrationSeed | null> {
  if (typeof window === "undefined") return null;

  try {
    const response = await fetch(options?.complete ? "/api/profile/me?complete=1" : "/api/profile/me", {
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        "cache-control": "no-store",
      },
    });

    const payload = (await response.json().catch(() => null)) as ProfileMeResponse | null;

    if (!response.ok || !payload?.ok || !payload.profile || !payload.profile.viewer.isOwner) {
      return null;
    }

    const seed = {
      profile: payload.profile,
      viewerEmail: normalizeNullableString(viewerEmail),
    } satisfies ProfileWorkspaceHydrationSeed;

    writeProfileWorkspaceHydrationSeed(seed);

    return seed;
  } catch {
    return null;
  }
}

function readProfileWorkspaceHydrationSeed(consume: boolean): ProfileWorkspaceHydrationSeed | null {
  clearLegacyProfileWorkspaceProjection();

  let raw = "";

  if (hasSessionStorage()) {
    try {
      raw = window.sessionStorage.getItem(PROFILE_WORKSPACE_HYDRATION_KEY) ?? "";
    } catch {
      raw = "";
    }
  }

  if (raw) {
    const parsed = parseStoredSeed(raw);

    if (profileWorkspaceSeedIsInvalidForAnySession(parsed)) {
      removeSessionProfileWorkspaceHydrationSeed();
    } else if (parsed && profileHasConfirmedSessionMismatch(parsed.profile)) {
      removeSessionProfileWorkspaceHydrationSeed();
    } else if (parsed && profileMatchesCurrentSession(parsed.profile)) {
      if (consume) removeSessionProfileWorkspaceHydrationSeed();

      return {
        profile: parsed.profile,
        viewerEmail: parsed.viewerEmail,
      };
    }
  }

  const activeUid = peekSessionBootstrapSnapshot(true)?.uid?.trim() ?? "";
  if (!activeUid) return null;
  const activeDurableKey = durableProfileWorkspaceKey(activeUid);
  let durableRaw = readDurableLocalTruthItem(activeDurableKey) ?? "";

  if (!durableRaw) {
    const legacyEntries = [
      ...(readDurableLocalTruthItem(PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY)
        ? [{
            storageKey: PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY,
            entry: {
              payload: readDurableLocalTruthItem(PROFILE_WORKSPACE_DURABLE_HYDRATION_KEY)!,
              rank: 0,
              storedAtMs: 0,
            },
          }]
        : []),
      ...releaseScopedProfileWorkspaceEntries(),
    ];
    const migrated = legacyEntries
      .map(({ entry }) => {
        const parsed = parseStoredSeed(entry.payload);
        if (profileWorkspaceSeedIsInvalidForAnySession(parsed)) return null;
        if (!parsed || !profileMatchesCurrentSession(parsed.profile)) return null;
        return { entry, parsed };
      })
      .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
      .sort((left, right) =>
        profileWorkspaceTruthRank(right.parsed.profile) - profileWorkspaceTruthRank(left.parsed.profile) ||
        right.entry.rank - left.entry.rank ||
        right.entry.storedAtMs - left.entry.storedAtMs ||
        right.parsed.createdAtMs - left.parsed.createdAtMs
      )[0] ?? null;

    if (migrated) {
      writeDurableLocalTruthItem(
        activeDurableKey,
        migrated.entry.payload,
        {
          rank: migrated.entry.rank,
          source: PROFILE_WORKSPACE_DURABLE_HYDRATION_SOURCE,
          allowSameRankOverwrite: true,
        },
      );
      durableRaw = readDurableLocalTruthItem(activeDurableKey) ?? "";
    }
  }

  if (!durableRaw) return null;

  const parsed = parseStoredSeed(durableRaw);

  if (profileWorkspaceSeedIsInvalidForAnySession(parsed)) {
    return null;
  }

  if (parsed && profileHasConfirmedSessionMismatch(parsed.profile)) {
    return null;
  }

  if (!parsed || !profileMatchesCurrentSession(parsed.profile)) {
    return null;
  }

  if (!consume) {
    writeSessionProfileWorkspaceHydrationSeed(durableRaw);
  }

  return {
    profile: parsed.profile,
    viewerEmail: parsed.viewerEmail,
  };
}

export function peekProfileWorkspaceHydrationSeed(): ProfileWorkspaceHydrationSeed | null {
  return readProfileWorkspaceHydrationSeed(false);
}

export function consumeProfileWorkspaceHydrationSeed(): ProfileWorkspaceHydrationSeed | null {
  return readProfileWorkspaceHydrationSeed(true);
}

function writeProfileWorkspaceFastEntryCookie(username: string): boolean {
  if (typeof document === "undefined") return false;

  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  const encodedUsername = encodeURIComponent(username);

  document.cookie = `${PROFILE_WORKSPACE_FAST_ENTRY_COOKIE}=${encodedUsername}; Path=/; Max-Age=${PROFILE_WORKSPACE_FAST_ENTRY_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;

  return true;
}

export function prepareProfileWorkspaceFastEntryHint(): boolean {
  const seed = peekProfileWorkspaceHydrationSeed();

  if (!profileWorkspaceSeedCarriesVisibleProfileTruth(seed)) {
    clearProfileWorkspaceFastEntryHint();
    return false;
  }

  return writeProfileWorkspaceFastEntryCookie(seed.profile.profile.username);
}

export function prepareManagedProfileFastEntryHintForUsername(usernameRaw: string | null | undefined): boolean {
  const username = parseProfileUsername(usernameRaw ?? "");

  if (!username) return false;

  const seed = peekProfileWorkspaceHydrationSeed();
  if (
    !profileWorkspaceSeedCarriesVisibleProfileTruth(seed) ||
    seed.profile.profile.username !== username
  ) {
    clearProfileWorkspaceFastEntryHint();
    return false;
  }

  return writeProfileWorkspaceFastEntryCookie(username);
}

export function clearProfileWorkspaceFastEntryHint(): void {
  if (typeof document === "undefined") return;

  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${PROFILE_WORKSPACE_FAST_ENTRY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  document.cookie = `${PROFILE_WORKSPACE_FAST_ENTRY_COOKIE}=; Path=/profile; Max-Age=0; SameSite=Lax${secure}`;
}

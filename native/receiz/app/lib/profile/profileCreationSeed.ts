import type { ProfileViewData } from "@/app/lib/profile/types";
import { parseProfileUsername } from "@/app/lib/profile/username";
import { microPulsesSinceGenesis } from "@/app/utils/kai_pulse";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthEntry,
  readDurableLocalTruthEntriesByPrefix,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
const PROFILE_CREATION_SEED_KEY_BASE = "receiz.profile.creation.seed.v2";
const PROFILE_CREATION_SEED_SOURCE = "profile-creation-seed";

type ProfileCreationSeedStored = {
  version: 2;
  userId: string | null;
  username: string | null;
  createdAt: string;
};

function normalizedUserId(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function normalizedUsername(value: string | null | undefined): string {
  return parseProfileUsername(value ?? "") ?? "";
}

function validCreationCreatedAt(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return null;
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  if (microPulsesSinceGenesis(trimmed) <= 0n) return null;
  return trimmed;
}

function earliestCreationCreatedAt(left: string | null | undefined, right: string | null | undefined): string | null {
  const leftIso = validCreationCreatedAt(left);
  const rightIso = validCreationCreatedAt(right);
  if (!leftIso) return rightIso;
  if (!rightIso) return leftIso;
  return Date.parse(leftIso) <= Date.parse(rightIso) ? leftIso : rightIso;
}

function seedStorageScopes(userIdRaw: string | null | undefined, usernameRaw: string | null | undefined): string[] {
  const userId = normalizedUserId(userIdRaw);
  const username = normalizedUsername(usernameRaw);
  return [
    userId ? `uid:${userId}` : "",
    username ? `username:${username}` : "",
  ].filter(Boolean);
}

function seedStorageKeys(userIdRaw: string | null | undefined, usernameRaw: string | null | undefined): string[] {
  return seedStorageScopes(userIdRaw, usernameRaw)
    .map((scope) => `${PROFILE_CREATION_SEED_KEY_BASE}.${scope}`);
}

function legacyReleaseScopedSeedEntries(scope: string) {
  const stableKey = `${PROFILE_CREATION_SEED_KEY_BASE}.${scope}`;
  return readDurableLocalTruthEntriesByPrefix(
    `${PROFILE_CREATION_SEED_KEY_BASE}.`,
    { source: PROFILE_CREATION_SEED_SOURCE },
  ).filter(({ storageKey }) =>
    storageKey !== stableKey && storageKey.endsWith(`.${scope}`)
  );
}

function parseStoredSeed(raw: string): ProfileCreationSeedStored | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ProfileCreationSeedStored>;
    if (!parsed || parsed.version !== 2) return null;
    const createdAt = validCreationCreatedAt(parsed.createdAt);
    if (!createdAt) return null;
    return {
      version: 2,
      userId: normalizedUserId(parsed.userId) || null,
      username: normalizedUsername(parsed.username) || null,
      createdAt,
    };
  } catch {
    return null;
  }
}

function seedMatchesProfile(seed: ProfileCreationSeedStored, profile: ProfileViewData): boolean {
  const userId = normalizedUserId(profile.profile.userId);
  const username = normalizedUsername(profile.profile.username);
  if (userId && seed.userId) return userId === seed.userId;
  return Boolean(username && seed.username && username === seed.username);
}

function readStoredCreationSeed(profile: ProfileViewData): string | null {
  const scopes = seedStorageScopes(profile.profile.userId, profile.profile.username);
  let earliest: string | null = null;

  for (const scope of scopes) {
    const stableKey = `${PROFILE_CREATION_SEED_KEY_BASE}.${scope}`;
    const stableEntry = readDurableLocalTruthEntry(stableKey);
    if (stableEntry?.source === PROFILE_CREATION_SEED_SOURCE) {
      const parsed = parseStoredSeed(stableEntry.payload);
      if (parsed && seedMatchesProfile(parsed, profile)) {
        earliest = earliestCreationCreatedAt(earliest, parsed.createdAt);
        continue;
      }
      removeDurableLocalTruthItem(stableKey, {
        source: PROFILE_CREATION_SEED_SOURCE,
        allowStrongerRemoval: true,
      });
    }

    for (const { storageKey, entry } of legacyReleaseScopedSeedEntries(scope)) {
      const parsed = parseStoredSeed(entry.payload);
      if (!parsed || !seedMatchesProfile(parsed, profile)) {
        removeDurableLocalTruthItem(storageKey, {
          source: PROFILE_CREATION_SEED_SOURCE,
          allowStrongerRemoval: true,
        });
        continue;
      }
      earliest = earliestCreationCreatedAt(earliest, parsed.createdAt);
    }
  }

  if (earliest) {
    const payload = JSON.stringify({
      version: 2,
      userId: normalizedUserId(profile.profile.userId) || null,
      username: normalizedUsername(profile.profile.username) || null,
      createdAt: earliest,
    } satisfies ProfileCreationSeedStored);
    for (const key of seedStorageKeys(profile.profile.userId, profile.profile.username)) {
      writeDurableLocalTruthItem(key, payload, {
        rank: DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot,
        source: PROFILE_CREATION_SEED_SOURCE,
        allowSameRankOverwrite: true,
      });
    }
  }

  return earliest;
}

export function stableProfileCreationCreatedAt(
  previousCreatedAt: string | null | undefined,
  nextCreatedAt: string | null | undefined,
): string {
  return earliestCreationCreatedAt(previousCreatedAt, nextCreatedAt) ?? (nextCreatedAt ?? previousCreatedAt ?? "");
}

export function profileWithStableCreationSeed(profile: ProfileViewData): ProfileViewData {
  const storedCreatedAt = readStoredCreationSeed(profile);
  const stableCreatedAt = stableProfileCreationCreatedAt(storedCreatedAt, profile.profile.createdAt);
  if (!stableCreatedAt || stableCreatedAt === profile.profile.createdAt) return profile;
  return {
    ...profile,
    profile: {
      ...profile.profile,
      createdAt: stableCreatedAt,
    },
  };
}

export function rememberProfileCreationSeed(profile: ProfileViewData): ProfileViewData {
  const stableProfile = profileWithStableCreationSeed(profile);
  const stableCreatedAt = validCreationCreatedAt(stableProfile.profile.createdAt);
  if (!stableCreatedAt) return stableProfile;

  const userId = normalizedUserId(stableProfile.profile.userId);
  const username = normalizedUsername(stableProfile.profile.username);
  if (!userId && !username) return stableProfile;

  const payload = JSON.stringify({
    version: 2,
    userId: userId || null,
    username: username || null,
    createdAt: stableCreatedAt,
  } satisfies ProfileCreationSeedStored);

  for (const key of seedStorageKeys(userId, username)) {
    writeDurableLocalTruthItem(key, payload, {
      rank: DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot,
      source: PROFILE_CREATION_SEED_SOURCE,
      allowSameRankOverwrite: true,
    });
  }

  return stableProfile;
}

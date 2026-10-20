"use client";

import { normalizePlan, type Plan } from "@/app/lib/premium/plan";
import { peekProfileUsernameProof } from "@/app/lib/profile/profileUsernameAppend";
import { clearActiveIdentityCustodyContext } from "@/app/lib/auth/activeIdentityCustodyContext";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthEntry,
  readDurableLocalTruthItem,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { runtimeProjectionStorageKey } from "@/app/lib/runtime/runtimeCoherence";
import {
  continuityPlanForSubscriptionTerm,
  mergeSubscriptionTermProof,
  normalizeSubscriptionTermProof,
  type SubscriptionTermProof,
} from "@/app/lib/premium/subscriptionTerm";

const SESSION_BOOTSTRAP_STORAGE_KEY_BASE = "receiz.session.bootstrap.v1";
const SESSION_BOOTSTRAP_STORAGE_KEY = runtimeProjectionStorageKey(SESSION_BOOTSTRAP_STORAGE_KEY_BASE);

export const SESSION_BOOTSTRAP_CLEARED_EVENT = "receiz:session-bootstrap-cleared";

// This is a first-paint projection, not the identity proof root.
// It must not self-destruct from wall-clock age while a tab is alive, restored,
// resumed from bfcache, or opened after a long idle period. Explicit sign-out,
// proof-backed principal replacement or explicit logout governs its identity.
const SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY_BASE = "receiz.session.bootstrap.durable.v1";
const SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY = runtimeProjectionStorageKey(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY_BASE);
const SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY_PREFIX = `${SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY_BASE}.`;

export type SessionBootstrapSnapshot = {
  signedIn: boolean;
  uid: string | null;
  email: string | null;
  username: string;
  canViewPhiAmounts: boolean;
  plan: Plan | null;
  entitlementPlan: Plan | null;
  subscriptionTerm?: SubscriptionTermProof | null;
};

export type SessionBootstrapSnapshotInput = {
  signedIn: boolean;
  uid?: string | null;
  email?: string | null;
  username?: string | null;
  canViewPhiAmounts?: boolean;
  plan?: Plan | null;
  entitlementPlan?: Plan | null;
  subscriptionTerm?: SubscriptionTermProof | null;
  durableProofBacked?: boolean;
};

type StoredSessionBootstrapSnapshot = {
  version: 1;
  createdAtMs: number;
  snapshot: SessionBootstrapSnapshot;
};

let cachedSessionBootstrapSnapshot: { createdAtMs: number; snapshot: SessionBootstrapSnapshot } | null = null;

const sessionBootstrapListeners = new Set<() => void>();

function publishSessionBootstrapSnapshot(): void {
  for (const listener of sessionBootstrapListeners) listener();
}

function publishSessionBootstrapCleared(): void {
  if (typeof window === "undefined") return;
  if (typeof window.dispatchEvent !== "function") return;
  window.dispatchEvent(new Event(SESSION_BOOTSTRAP_CLEARED_EVENT));
}

function hasSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function clearLegacySessionBootstrapProjection(): void {
  if (!hasSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(SESSION_BOOTSTRAP_STORAGE_KEY_BASE);
  } catch {
    // Ignore cleanup failures.
  }
}

function clearLegacyDurableSessionBootstrapProjection(): void {
  removeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY_BASE);
}

function normalizeNullableText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeText(value: unknown): string {
  return normalizeNullableText(value) ?? "";
}

function sameSessionBootstrapSnapshot(
  left: SessionBootstrapSnapshot | null | undefined,
  right: SessionBootstrapSnapshot | null | undefined,
): boolean {
  if (!left || !right) return left === right;

  return (
    left.signedIn === right.signedIn &&
    left.uid === right.uid &&
    left.email === right.email &&
    left.username === right.username &&
    left.canViewPhiAmounts === right.canViewPhiAmounts &&
    left.plan === right.plan &&
    left.entitlementPlan === right.entitlementPlan
    && JSON.stringify(left.subscriptionTerm) === JSON.stringify(right.subscriptionTerm)
  );
}

function signedInSnapshotsSharePrincipal(
  left: SessionBootstrapSnapshot | null | undefined,
  right: SessionBootstrapSnapshot | null | undefined,
): boolean {
  if (!left?.signedIn || !right?.signedIn) return false;
  if (left.uid && right.uid) return left.uid === right.uid;
  if (left.email && right.email) return left.email === right.email;
  if (left.username && right.username) return left.username === right.username;
  return false;
}

function parseStoredSnapshot(raw: string): StoredSessionBootstrapSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSessionBootstrapSnapshot>;

    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;
    if (!parsed.snapshot || typeof parsed.snapshot !== "object") return null;

    const snapshot = parsed.snapshot as Partial<SessionBootstrapSnapshot>;

    if (typeof snapshot.signedIn !== "boolean") return null;
    if (snapshot.uid !== null && snapshot.uid !== undefined && typeof snapshot.uid !== "string") return null;
    if (snapshot.email !== null && snapshot.email !== undefined && typeof snapshot.email !== "string") return null;
    if (typeof snapshot.username !== "string") return null;
    if (typeof snapshot.canViewPhiAmounts !== "boolean") return null;
    if (snapshot.plan !== null && snapshot.plan !== undefined && typeof snapshot.plan !== "string") return null;

    if (
      snapshot.entitlementPlan !== null &&
      snapshot.entitlementPlan !== undefined &&
      typeof snapshot.entitlementPlan !== "string"
    ) {
      return null;
    }

    const term = normalizeSubscriptionTermProof(snapshot.subscriptionTerm);
    const snapshotCarriesTermField = Object.prototype.hasOwnProperty.call(
      snapshot,
      "subscriptionTerm",
    );
    if (
      snapshotCarriesTermField &&
      snapshot.subscriptionTerm != null &&
      !term
    ) {
      return null;
    }
    const normalizedPlan = snapshot.plan == null ? null : normalizePlan(snapshot.plan);
    const normalizedEntitlementPlan = snapshot.entitlementPlan == null ? null : normalizePlan(snapshot.entitlementPlan);

    if (
      snapshot.plan != null &&
      typeof snapshot.plan === "string" &&
      normalizedPlan === "free" &&
      snapshot.plan !== "free"
    ) {
      return null;
    }

    if (
      snapshot.entitlementPlan != null &&
      typeof snapshot.entitlementPlan === "string" &&
      normalizedEntitlementPlan === "free" &&
      snapshot.entitlementPlan !== "free"
    ) {
      return null;
    }

    const uid = normalizeNullableText(snapshot.uid);

    if (snapshot.signedIn && !uid) return null;

    return {
      version: 1,
      createdAtMs: Number(parsed.createdAtMs),
      snapshot: {
        signedIn: snapshot.signedIn,
        uid,
        email: normalizeNullableText(snapshot.email),
        username: snapshot.signedIn && uid
          ? peekProfileUsernameProof(uid)?.normalizedUsername ?? normalizeText(snapshot.username)
          : normalizeText(snapshot.username),
        canViewPhiAmounts: snapshot.canViewPhiAmounts,
        plan: continuityPlanForSubscriptionTerm({
          principalUserId: uid ?? "",
          plan: normalizedPlan,
          term,
        }),
        entitlementPlan: continuityPlanForSubscriptionTerm({
          principalUserId: uid ?? "",
          plan: normalizedEntitlementPlan,
          term,
        }),
        ...(term ? { subscriptionTerm: term } : {}),
      },
    };
  } catch {
    return null;
  }
}

function readSessionStorageSnapshot(): StoredSessionBootstrapSnapshot | null {
  if (!hasSessionStorage()) return null;

  let raw = "";

  try {
    raw = window.sessionStorage.getItem(SESSION_BOOTSTRAP_STORAGE_KEY) ?? "";
  } catch {
    raw = "";
  }

  if (!raw) return null;

  const parsed = parseStoredSnapshot(raw);

  if (parsed) return parsed;

  try {
    window.sessionStorage.removeItem(SESSION_BOOTSTRAP_STORAGE_KEY);
  } catch {
    // Ignore cleanup failures.
  }

  return null;
}

function writeSessionStorageSnapshot(serialized: string): void {
  if (!hasSessionStorage()) return;

  try {
    window.sessionStorage.setItem(SESSION_BOOTSTRAP_STORAGE_KEY, serialized);
  } catch {
    // Ignore storage failures.
  }
}

function removeSessionStorageSnapshot(): void {
  if (!hasSessionStorage()) return;

  try {
    window.sessionStorage.removeItem(SESSION_BOOTSTRAP_STORAGE_KEY);
  } catch {
    // Ignore cleanup failures.
  }
}

function readCurrentRuntimeDurableStoredSnapshot(): StoredSessionBootstrapSnapshot | null {
  const durableRaw = readDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY) ?? "";

  if (!durableRaw) return null;

  const parsed = parseStoredSnapshot(durableRaw);

  if (parsed) return parsed;

  removeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY);
  return null;
}

function durableSessionBootstrapFallbackKeys(): string[] {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return [];
  if (typeof window.localStorage.key !== "function") return [];

  const keys: string[] = [];
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key || key === SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY) continue;
      if (key.startsWith(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY_PREFIX)) keys.push(key);
    }
  } catch {
    return [];
  }
  return keys;
}

function clearMigratableDurableSessionBootstrapProjections(): void {
  for (const storageKey of durableSessionBootstrapFallbackKeys()) {
    removeDurableLocalTruthItem(storageKey, {
      source: "session-bootstrap",
      allowStrongerRemoval: true,
    });
  }
}

function readMigratableDurableStoredSnapshot(): StoredSessionBootstrapSnapshot | null {
  const candidates = durableSessionBootstrapFallbackKeys()
    .map((storageKey) => {
      const entry = readDurableLocalTruthEntry(storageKey);
      const parsed = entry ? parseStoredSnapshot(entry.payload) : null;
      if (!entry || !parsed) return null;
      if (entry.source !== "session-bootstrap") return null;
      if (entry.rank < DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot) return null;
      if (!parsed.snapshot.signedIn || !parsed.snapshot.uid) return null;
      return { entry, parsed };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((left, right) =>
      right.entry.rank - left.entry.rank ||
      right.entry.storedAtMs - left.entry.storedAtMs ||
      right.parsed.createdAtMs - left.parsed.createdAtMs);

  const selected = candidates[0] ?? null;
  if (!selected) return null;

  const serialized = serializeStoredSnapshot(selected.parsed.snapshot, selected.parsed.createdAtMs);
  writeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY, serialized, {
    rank: selected.entry.rank,
    source: "session-bootstrap",
    allowSameRankOverwrite: true,
  });
  return selected.parsed;
}

function readDurableStoredSnapshot(): StoredSessionBootstrapSnapshot | null {
  return readCurrentRuntimeDurableStoredSnapshot() ??
    readMigratableDurableStoredSnapshot();
}

function shouldPreserveExistingDurableSnapshot(nextSnapshot: SessionBootstrapSnapshot): boolean {
  if (!nextSnapshot.signedIn) return false;

  const durable = readDurableStoredSnapshot();

  if (!durable) return false;

  return signedInSnapshotsSharePrincipal(durable.snapshot, nextSnapshot);
}

export function hasDurableSessionBootstrapPrincipal(uid: string): boolean {
  const durable = readDurableStoredSnapshot();
  return Boolean(durable?.snapshot.signedIn && durable.snapshot.uid === uid);
}

function serializeStoredSnapshot(snapshot: SessionBootstrapSnapshot, createdAtMs: number): string {
  const payload: StoredSessionBootstrapSnapshot = {
    version: 1,
    createdAtMs,
    snapshot,
  };

  return JSON.stringify(payload);
}

function readStoredSnapshot(): { createdAtMs: number; snapshot: SessionBootstrapSnapshot } | null {
  if (cachedSessionBootstrapSnapshot) {
    return cachedSessionBootstrapSnapshot;
  }

  clearLegacySessionBootstrapProjection();
  clearLegacyDurableSessionBootstrapProjection();

  const sessionStored = readSessionStorageSnapshot();

  if (sessionStored) {
    cachedSessionBootstrapSnapshot = {
      createdAtMs: sessionStored.createdAtMs,
      snapshot: sessionStored.snapshot,
    };

    return cachedSessionBootstrapSnapshot;
  }

  const durableStored = readDurableStoredSnapshot();

  if (!durableStored) return null;

  const serialized = serializeStoredSnapshot(durableStored.snapshot, durableStored.createdAtMs);

  cachedSessionBootstrapSnapshot = {
    createdAtMs: durableStored.createdAtMs,
    snapshot: durableStored.snapshot,
  };

  writeSessionStorageSnapshot(serialized);

  return cachedSessionBootstrapSnapshot;
}

export function peekSessionBootstrapSnapshot(expectedSignedIn?: boolean): SessionBootstrapSnapshot | null {
  const cached = readStoredSnapshot();

  if (!cached) return null;
  if (expectedSignedIn !== undefined && cached.snapshot.signedIn !== expectedSignedIn) return null;

  if (!cached.snapshot.signedIn || !cached.snapshot.uid) return cached.snapshot;
  const term = cached.snapshot.subscriptionTerm;
  const plan = continuityPlanForSubscriptionTerm({
    principalUserId: cached.snapshot.uid,
    plan: cached.snapshot.plan,
    term,
  });
  const entitlementPlan = continuityPlanForSubscriptionTerm({
    principalUserId: cached.snapshot.uid,
    plan: cached.snapshot.entitlementPlan,
    term,
  });
  if (
    plan === cached.snapshot.plan
    && entitlementPlan === cached.snapshot.entitlementPlan
  ) {
    return cached.snapshot;
  }

  cached.snapshot = {
    ...cached.snapshot,
    plan,
    entitlementPlan,
  };
  return cached.snapshot;
}

export function peekSessionBootstrapCreatedAtMs(expectedSignedIn?: boolean): number | null {
  const cached = readStoredSnapshot();

  if (!cached) return null;
  if (expectedSignedIn !== undefined && cached.snapshot.signedIn !== expectedSignedIn) return null;

  return cached.createdAtMs;
}

export function subscribeSessionBootstrapSnapshot(listener: () => void): () => void {
  sessionBootstrapListeners.add(listener);

  return () => {
    sessionBootstrapListeners.delete(listener);
  };
}

export function writeSessionBootstrapSnapshot(input: SessionBootstrapSnapshotInput): void {
  const currentStoredSnapshot = readStoredSnapshot();
  const current = currentStoredSnapshot?.snapshot ?? null;
  const incomingUid = input.signedIn ? normalizeNullableText(input.uid) : null;
  const mayReuseCurrentPrincipal =
    Boolean(current?.signedIn) &&
    (!incomingUid || incomingUid === current?.uid);
  const incomingTerm = normalizeSubscriptionTermProof(input.subscriptionTerm);
  const explicitlyClearsSubscriptionTerm =
    Object.prototype.hasOwnProperty.call(input, "subscriptionTerm") &&
    input.subscriptionTerm === null;
  const subscriptionTerm = explicitlyClearsSubscriptionTerm
    ? null
    : mayReuseCurrentPrincipal
      ? mergeSubscriptionTermProof(current?.subscriptionTerm, incomingTerm)
      : incomingTerm;

  if (
    current?.signedIn &&
    shouldPreserveExistingDurableSnapshot(current) &&
    (!input.signedIn || (incomingUid !== null && incomingUid !== current.uid && input.durableProofBacked !== true))
  ) {
    // Server echoes cannot clear or switch admitted local identity. Proof admission
    // uses durableProofBacked; explicit logout uses clearSessionBootstrapSnapshot().
    return;
  }

  clearLegacySessionBootstrapProjection();
  clearLegacyDurableSessionBootstrapProjection();

  const projectedUid = incomingUid ?? (mayReuseCurrentPrincipal ? current?.uid ?? null : null);
  const admittedUsername = input.signedIn && projectedUid
    ? peekProfileUsernameProof(projectedUid)?.normalizedUsername : null;
  const snapshot: SessionBootstrapSnapshot = input.signedIn
    ? {
        signedIn: true,
        uid: incomingUid ?? (mayReuseCurrentPrincipal ? current?.uid ?? null : null),
        email: normalizeNullableText(input.email) ?? (mayReuseCurrentPrincipal ? current?.email ?? null : null),
        username: admittedUsername ?? (normalizeText(input.username) || (mayReuseCurrentPrincipal ? current?.username ?? "" : "")),
        canViewPhiAmounts:
          typeof input.canViewPhiAmounts === "boolean"
            ? input.canViewPhiAmounts
            : mayReuseCurrentPrincipal
              ? current?.canViewPhiAmounts ?? false
              : false,
        plan: continuityPlanForSubscriptionTerm({
          principalUserId: incomingUid ?? current?.uid ?? "",
          plan:
          input.plan == null
            ? mayReuseCurrentPrincipal
              ? current?.plan ?? null
              : null
            : normalizePlan(input.plan),
          term: subscriptionTerm,
        }),
        entitlementPlan: continuityPlanForSubscriptionTerm({
          principalUserId: incomingUid ?? current?.uid ?? "",
          plan:
          input.entitlementPlan == null
            ? mayReuseCurrentPrincipal
              ? current?.entitlementPlan ?? null
              : null
            : normalizePlan(input.entitlementPlan),
          term: subscriptionTerm,
        }),
        ...(subscriptionTerm ? { subscriptionTerm } : {}),
      }
    : {
        signedIn: false,
        uid: null,
        email: null,
        username: "",
        canViewPhiAmounts: false,
        plan: null,
        entitlementPlan: null,
      };

  if (snapshot.signedIn && !snapshot.uid) {
    return;
  }

  if (sameSessionBootstrapSnapshot(current, snapshot)) {
    if (snapshot.signedIn && input.durableProofBacked === true) {
      const createdAtMs = currentStoredSnapshot?.createdAtMs ?? Date.now();
      const serialized = serializeStoredSnapshot(snapshot, createdAtMs);
      writeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY, serialized, {
        rank: DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot,
        source: "session-bootstrap",
      });
      writeSessionStorageSnapshot(serialized);
    } else if (!snapshot.signedIn) {
      removeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY);
      removeSessionStorageSnapshot();
    } else if (!shouldPreserveExistingDurableSnapshot(snapshot)) {
      removeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY);
    }

    return;
  }

  const createdAtMs = Date.now();
  const serialized = serializeStoredSnapshot(snapshot, createdAtMs);

  cachedSessionBootstrapSnapshot = {
    createdAtMs,
    snapshot,
  };

  if (snapshot.signedIn && input.durableProofBacked === true) {
    writeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY, serialized, {
      rank: DURABLE_LOCAL_TRUTH_RANK.authenticatedSnapshot,
      source: "session-bootstrap",
    });
  } else if (!snapshot.signedIn || !shouldPreserveExistingDurableSnapshot(snapshot)) {
    removeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY);
  }

  if (snapshot.signedIn) {
    writeSessionStorageSnapshot(serialized);
  } else {
    removeSessionStorageSnapshot();
  }

  publishSessionBootstrapSnapshot();
}

export function clearSessionBootstrapSnapshot(): void {
  cachedSessionBootstrapSnapshot = null;
  clearActiveIdentityCustodyContext();

  removeDurableLocalTruthItem(SESSION_BOOTSTRAP_DURABLE_STORAGE_KEY);
  clearMigratableDurableSessionBootstrapProjections();
  clearLegacyDurableSessionBootstrapProjection();
  clearLegacySessionBootstrapProjection();
  removeSessionStorageSnapshot();

  publishSessionBootstrapSnapshot();
  publishSessionBootstrapCleared();
}

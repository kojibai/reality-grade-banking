"use client";

import { setServiceWorkerLocalActorNamespace } from "@/app/components/pwa/sessionSync";
import { normalizePlan, type Plan } from "@/app/lib/premium/plan";
import { peekProfileUsernameProof } from "@/app/lib/profile/profileUsernameAppend";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  removeDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import {
  peekSessionBootstrapSnapshot,
  writeSessionBootstrapSnapshot,
} from "@/app/lib/session/bootstrapHydration";
import { storedReceizDeviceIdentityIsUnsupportedPrimaryForKeyId } from "@/app/lib/auth/receizDeviceIdentitySupport";
import { normalizeIdentityKeyId, type ReceizKeyFile } from "@/app/utils/receizIdentityKey";
import {
  mergeSubscriptionTermProof,
  normalizeSubscriptionTermProof,
  type SubscriptionTermProof,
} from "@/app/lib/premium/subscriptionTerm";

const OFFLINE_IDENTITY_SESSION_SCHEMA = "receiz.offline.identity.session.v1";
const OFFLINE_IDENTITY_SESSION_REGISTER_SCHEMA = "receiz.offline.identity.session.register.v1";
const OFFLINE_IDENTITY_SESSION_DURABLE_STORAGE_KEY = "receiz.auth.offline-identity-session.durable.v1";
const OFFLINE_IDENTITY_SESSION_REGISTER_STORAGE_KEY = "receiz.auth.offline-identity-session.register.v1";
const OFFLINE_IDENTITY_SESSION_ACTIVE_KEY_STORAGE_KEY = "receiz.auth.offline-identity-session.active-key.v1";
const OFFLINE_IDENTITY_EXPLICIT_LOGOUT_STORAGE_KEY = "receiz.auth.offline-identity.explicit-logout.v1";
const OFFLINE_IDENTITY_EXPLICIT_LOGOUT_SCHEMA = "receiz.offline.identity.explicit-logout.v1";

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const PLAN_VALUES = new Set<Plan>(["free", "premium", "business", "pro", "enterprise"]);

export type OfflineIdentityPbiCredential = {
  credIdB64Url: string;
  pubKeyPem: string;
};

export type OfflineIdentityVerifiedSession = {
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  plan: Plan | null;
  entitlementPlan: Plan | null;
  subscriptionTerm: SubscriptionTermProof | null;
};

export type OfflineIdentityAdmissionSource =
  | "identity-key-finish"
  | "receiz-key"
  | "local-pbi-enrollment"
  | "receiz-device"
  | "receiz-device-bound";

export type OfflineIdentitySession = {
  schema: typeof OFFLINE_IDENTITY_SESSION_SCHEMA;
  createdAtMs: number;
  updatedAtMs: number;
  admittedFrom: OfflineIdentityAdmissionSource;
  keyId: string;
  identityKeyPublicKeyRawB64u: string;
  session: OfflineIdentityVerifiedSession;
  pbiCredential: OfflineIdentityPbiCredential | null;
  keyAttestation: {
    pbiDecision: "PBI_VERIFIED";
    pbiReceiptHash: string;
    pbiChallengeId: string;
    pbiRequestId: string | null;
    attestedAt: string;
  } | null;
  portableStateProof: {
    schema: string;
    exportedAt: string;
    digestSha256Hex: string;
    signedAt: string;
  } | null;
  localEnrollment: {
    userHandleB64Url: string;
    actionHashHex: string;
    createdAt: string;
  } | null;
  receizDevice: {
    localUid: string;
    deviceName: string | null;
    createdAt: string;
    boundAt: string | null;
  } | null;
};

export type OfflineIdentitySessionRegister = {
  schema: typeof OFFLINE_IDENTITY_SESSION_REGISTER_SCHEMA;
  updatedAtMs: number;
  activeKeyId: string | null;
  sessions: Record<string, OfflineIdentitySession>;
};

type OfflineIdentityExplicitLogout = {
  schema: typeof OFFLINE_IDENTITY_EXPLICIT_LOGOUT_SCHEMA;
  createdAtMs: number;
  keyId: string;
  uid: string;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function normalizeBase64Url(value: unknown): string | null {
  const normalized = normalizeText(value);
  if (!normalized || !BASE64URL_RE.test(normalized)) return null;
  return normalized;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeText(value).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

function normalizeOptionalPlan(value: unknown): Plan | null {
  if (typeof value !== "string") return null;
  return PLAN_VALUES.has(value as Plan) ? normalizePlan(value) : null;
}

function normalizePbiCredential(value: unknown): OfflineIdentityPbiCredential | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<OfflineIdentityPbiCredential>;
  const credIdB64Url = normalizeBase64Url(record.credIdB64Url);
  const pubKeyPem = normalizeText(record.pubKeyPem);
  if (!credIdB64Url || !pubKeyPem.includes("BEGIN PUBLIC KEY")) return null;
  return { credIdB64Url, pubKeyPem };
}

function normalizeVerifiedSession(value: unknown, options?: { requireEmail?: boolean }): OfflineIdentityVerifiedSession | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<OfflineIdentityVerifiedSession>;
  const uid = normalizeText(record.uid);
  const email = normalizeEmail(record.email);
  if (!uid || (options?.requireEmail !== false && !email)) return null;

  return {
    uid,
    email: email ?? null,
    // The admitted username is a presentation append beneath this same identity.
    // Its creation label cannot replace that accepted append on navigation.
    username: peekProfileUsernameProof(uid)?.normalizedUsername ?? normalizeNullableText(record.username),
    displayName: normalizeNullableText(record.displayName),
    plan: normalizeOptionalPlan(record.plan),
    entitlementPlan: normalizeOptionalPlan(record.entitlementPlan),
    subscriptionTerm: normalizeSubscriptionTermProof(record.subscriptionTerm),
  };
}

function normalizeLocalEnrollment(value: unknown): OfflineIdentitySession["localEnrollment"] {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<NonNullable<OfflineIdentitySession["localEnrollment"]>>;
  const userHandleB64Url = normalizeBase64Url(record.userHandleB64Url);
  const actionHashHex = normalizeText(record.actionHashHex).toLowerCase();
  const createdAt = normalizeText(record.createdAt);
  if (!userHandleB64Url || !HEX64_RE.test(actionHashHex) || !createdAt) return null;
  return {
    userHandleB64Url,
    actionHashHex,
    createdAt,
  };
}

function normalizeReceizDevice(value: unknown): OfflineIdentitySession["receizDevice"] {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<NonNullable<OfflineIdentitySession["receizDevice"]>>;
  const localUid = normalizeText(record.localUid);
  const deviceName = normalizeNullableText(record.deviceName);
  const createdAt = normalizeText(record.createdAt);
  const boundAt = normalizeNullableText(record.boundAt);
  if (!localUid || !createdAt) return null;
  return {
    localUid,
    deviceName,
    createdAt,
    boundAt,
  };
}

function normalizeKeyAttestation(keyFile: ReceizKeyFile): OfflineIdentitySession["keyAttestation"] {
  const attestation = keyFile.attestation;
  if (!attestation) return null;
  const pbiReceiptHash = normalizeText(attestation.pbiReceiptHash).toLowerCase();
  const pbiChallengeId = normalizeText(attestation.pbiChallengeId);
  const pbiRequestId = normalizeNullableText(attestation.pbiRequestId);
  const attestedAt = normalizeText(attestation.attestedAt);
  if (
    attestation.pbiDecision !== "PBI_VERIFIED" ||
    !HEX64_RE.test(pbiReceiptHash) ||
    !pbiChallengeId ||
    !attestedAt
  ) {
    return null;
  }
  return {
    pbiDecision: "PBI_VERIFIED",
    pbiReceiptHash,
    pbiChallengeId,
    pbiRequestId,
    attestedAt,
  };
}

function normalizePortableStateProof(keyFile: ReceizKeyFile): OfflineIdentitySession["portableStateProof"] {
  const portableState = keyFile.portableState;
  const proof = portableState?.proof;
  const expectedMethod = keyFile.alg === "P-256" ? "ecdsa-p256-sha256.jcs.v1" : "ed25519.jcs.v1";
  if (!portableState || !proof || proof.method !== expectedMethod) return null;
  const digestSha256Hex = normalizeText(proof.digestSha256Hex).toLowerCase();
  const signedAt = normalizeText(proof.signedAt);
  if (!HEX64_RE.test(digestSha256Hex) || !signedAt) return null;
  return {
    schema: normalizeText(portableState.schema) || "receiz.account.state.v1",
    exportedAt: normalizeText(portableState.exportedAt) || signedAt,
    digestSha256Hex,
    signedAt,
  };
}

function normalizeOfflineIdentitySession(value: unknown): OfflineIdentitySession | null {
  const parsed = value as Partial<OfflineIdentitySession> | null;
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.schema !== OFFLINE_IDENTITY_SESSION_SCHEMA) return null;
  if (!Number.isFinite(parsed.createdAtMs) || !Number.isFinite(parsed.updatedAtMs)) return null;
  if (
    parsed.admittedFrom !== "identity-key-finish" &&
    parsed.admittedFrom !== "receiz-key" &&
    parsed.admittedFrom !== "local-pbi-enrollment" &&
    parsed.admittedFrom !== "receiz-device" &&
    parsed.admittedFrom !== "receiz-device-bound"
  ) {
    return null;
  }
  const keyId = normalizeIdentityKeyId(parsed.keyId);
  const identityKeyPublicKeyRawB64u = normalizeBase64Url(parsed.identityKeyPublicKeyRawB64u);
  const session = normalizeVerifiedSession(parsed.session, {
    requireEmail: false,
  });
  const pbiCredential = normalizePbiCredential(parsed.pbiCredential);
  const pbiRequired = parsed.admittedFrom === "local-pbi-enrollment";
  if (!keyId || !identityKeyPublicKeyRawB64u || !session || (pbiRequired && !pbiCredential)) return null;
  const localEnrollment =
    parsed.admittedFrom === "local-pbi-enrollment" ? normalizeLocalEnrollment(parsed.localEnrollment) : null;
  if (parsed.admittedFrom === "local-pbi-enrollment" && !localEnrollment) return null;
  const receizDevice =
    parsed.admittedFrom === "receiz-device" || parsed.admittedFrom === "receiz-device-bound"
      ? normalizeReceizDevice(parsed.receizDevice)
      : null;
  if ((parsed.admittedFrom === "receiz-device" || parsed.admittedFrom === "receiz-device-bound") && !receizDevice) {
    return null;
  }

  return {
    schema: OFFLINE_IDENTITY_SESSION_SCHEMA,
    createdAtMs: Number(parsed.createdAtMs),
    updatedAtMs: Number(parsed.updatedAtMs),
    admittedFrom: parsed.admittedFrom,
    keyId,
    identityKeyPublicKeyRawB64u,
    session,
    pbiCredential,
    keyAttestation: parsed.keyAttestation ?? null,
    portableStateProof: parsed.portableStateProof ?? null,
    localEnrollment,
    receizDevice,
  };
}

function parseOfflineIdentitySession(raw: string): OfflineIdentitySession | null {
  try {
    return normalizeOfflineIdentitySession(JSON.parse(raw));
  } catch {
    return null;
  }
}

function offlineIdentitySessionBackedByUnsupportedPrimaryReceizDevice(session: OfflineIdentitySession): boolean {
  return (
    (session.admittedFrom === "receiz-device" || session.admittedFrom === "receiz-device-bound") &&
    storedReceizDeviceIdentityIsUnsupportedPrimaryForKeyId(session.keyId)
  );
}

function emptyOfflineIdentitySessionRegister(): OfflineIdentitySessionRegister {
  return {
    schema: OFFLINE_IDENTITY_SESSION_REGISTER_SCHEMA,
    updatedAtMs: 0,
    activeKeyId: null,
    sessions: {},
  };
}

function identitySessionAuthorityRank(session: OfflineIdentitySession): number {
  switch (session.admittedFrom) {
    case "identity-key-finish":
      return 5;
    case "receiz-key":
      return 4;
    case "receiz-device-bound":
      return 3;
    case "local-pbi-enrollment":
      return 2;
    case "receiz-device":
      return 1;
    default:
      return 0;
  }
}

function mergeOfflineIdentitySession(
  current: OfflineIdentitySession | null,
  next: OfflineIdentitySession,
): OfflineIdentitySession {
  if (!current) return next;
  if (current.keyId !== next.keyId) return next;
  if (current.identityKeyPublicKeyRawB64u !== next.identityKeyPublicKeyRawB64u) return current;

  const currentRank = identitySessionAuthorityRank(current);
  const nextRank = identitySessionAuthorityRank(next);
  if (currentRank > nextRank) return current;
  if (currentRank === nextRank && current.updatedAtMs > next.updatedAtMs) return current;

  return {
    ...next,
    createdAtMs: current.createdAtMs,
    session: {
      ...next.session,
      email: next.session.email ?? current.session.email,
      username: next.session.username ?? current.session.username,
      displayName: next.session.displayName ?? current.session.displayName,
      plan: next.session.plan ?? current.session.plan,
      entitlementPlan: next.session.entitlementPlan ?? current.session.entitlementPlan,
      subscriptionTerm: mergeSubscriptionTermProof(
        current.session.subscriptionTerm,
        next.session.subscriptionTerm,
      ),
    },
    keyAttestation: next.keyAttestation ?? current.keyAttestation,
    portableStateProof: next.portableStateProof ?? current.portableStateProof,
    localEnrollment:
      next.admittedFrom === "local-pbi-enrollment" ? next.localEnrollment ?? current.localEnrollment : null,
    pbiCredential: next.pbiCredential ?? current.pbiCredential,
    receizDevice:
      next.admittedFrom === "receiz-device" || next.admittedFrom === "receiz-device-bound"
        ? next.receizDevice ?? current.receizDevice
        : current.receizDevice,
  };
}

function newestSessionKeyId(sessions: Record<string, OfflineIdentitySession>): string | null {
  return (
    Object.values(sessions)
      .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
      .at(0)?.keyId ?? null
  );
}

function parseOfflineIdentitySessionRegister(raw: string): OfflineIdentitySessionRegister | null {
  try {
    const parsed = JSON.parse(raw) as Partial<OfflineIdentitySessionRegister> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schema !== OFFLINE_IDENTITY_SESSION_REGISTER_SCHEMA) return null;
    if (!Number.isFinite(parsed.updatedAtMs)) return null;
    const rawSessions = parsed.sessions;
    if (!rawSessions || typeof rawSessions !== "object" || Array.isArray(rawSessions)) return null;

    const sessions: Record<string, OfflineIdentitySession> = {};
    for (const rawSession of Object.values(rawSessions)) {
      const session = normalizeOfflineIdentitySession(rawSession);
      if (!session) continue;
      sessions[session.keyId] = mergeOfflineIdentitySession(sessions[session.keyId] ?? null, session);
    }
    const activeKeyId = normalizeIdentityKeyId(parsed.activeKeyId) ?? newestSessionKeyId(sessions);
    return {
      schema: OFFLINE_IDENTITY_SESSION_REGISTER_SCHEMA,
      updatedAtMs: Number(parsed.updatedAtMs),
      activeKeyId: activeKeyId && sessions[activeKeyId] ? activeKeyId : newestSessionKeyId(sessions),
      sessions,
    };
  } catch {
    return null;
  }
}

function readLegacyOfflineIdentitySession(): OfflineIdentitySession | null {
  const raw = readDurableLocalTruthItem(OFFLINE_IDENTITY_SESSION_DURABLE_STORAGE_KEY);
  return raw ? parseOfflineIdentitySession(raw) : null;
}

function readActiveOfflineIdentityKeyId(): string | null {
  return normalizeIdentityKeyId(readDurableLocalTruthItem(OFFLINE_IDENTITY_SESSION_ACTIVE_KEY_STORAGE_KEY));
}

function parseOfflineIdentityExplicitLogout(raw: string | null): OfflineIdentityExplicitLogout | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OfflineIdentityExplicitLogout> | null;
    if (!parsed || parsed.schema !== OFFLINE_IDENTITY_EXPLICIT_LOGOUT_SCHEMA) return null;
    if (!Number.isFinite(parsed.createdAtMs)) return null;
    const keyId = normalizeIdentityKeyId(parsed.keyId);
    const uid = normalizeText(parsed.uid);
    if (!keyId || !uid) return null;
    return {
      schema: OFFLINE_IDENTITY_EXPLICIT_LOGOUT_SCHEMA,
      createdAtMs: Number(parsed.createdAtMs),
      keyId,
      uid,
    };
  } catch {
    return null;
  }
}

export function peekOfflineIdentitySessionRegister(): OfflineIdentitySessionRegister {
  const raw = readDurableLocalTruthItem(OFFLINE_IDENTITY_SESSION_REGISTER_STORAGE_KEY);
  const register = raw ? parseOfflineIdentitySessionRegister(raw) ?? emptyOfflineIdentitySessionRegister() : emptyOfflineIdentitySessionRegister();
  const legacy = readLegacyOfflineIdentitySession();
  if (legacy) {
    register.sessions[legacy.keyId] = mergeOfflineIdentitySession(register.sessions[legacy.keyId] ?? null, legacy);
  }
  const activeKeyId = readActiveOfflineIdentityKeyId() ?? register.activeKeyId ?? legacy?.keyId ?? newestSessionKeyId(register.sessions);
  return {
    ...register,
    activeKeyId: activeKeyId && register.sessions[activeKeyId] ? activeKeyId : newestSessionKeyId(register.sessions),
  };
}

export function peekOfflineIdentitySession(): OfflineIdentitySession | null {
  const register = peekOfflineIdentitySessionRegister();
  const session = register.activeKeyId ? register.sessions[register.activeKeyId] ?? null : null;
  return session && !offlineIdentitySessionBackedByUnsupportedPrimaryReceizDevice(session) ? session : null;
}

export function peekOfflineIdentitySessionForKey(keyId: string): OfflineIdentitySession | null {
  const normalizedKeyId = normalizeIdentityKeyId(keyId);
  if (!normalizedKeyId) return null;
  const register = peekOfflineIdentitySessionRegister();
  return register.sessions[normalizedKeyId] ?? null;
}

export function hasOfflineIdentitySessionForBootstrap(): boolean {
  const bootstrap = peekSessionBootstrapSnapshot(true);
  if (!bootstrap?.uid) return false;
  const register = peekOfflineIdentitySessionRegister();
  return Object.values(register.sessions).some(
    (session) =>
      session.session.uid === bootstrap.uid &&
      !offlineIdentitySessionBackedByUnsupportedPrimaryReceizDevice(session),
  );
}

export function markOfflineIdentityExplicitLogout(sessionInput?: OfflineIdentitySession | null): void {
  const session = sessionInput ?? peekOfflineIdentitySession();
  if (!session?.keyId || !session.session.uid) return;
  const payload: OfflineIdentityExplicitLogout = {
    schema: OFFLINE_IDENTITY_EXPLICIT_LOGOUT_SCHEMA,
    createdAtMs: Date.now(),
    keyId: session.keyId,
    uid: session.session.uid,
  };
  writeDurableLocalTruthItem(OFFLINE_IDENTITY_EXPLICIT_LOGOUT_STORAGE_KEY, JSON.stringify(payload), {
    rank: DURABLE_LOCAL_TRUTH_RANK.experienceSeed,
    source: "offline-identity-explicit-logout",
    allowSameRankOverwrite: true,
  });
}

export function clearOfflineIdentityExplicitLogout(): void {
  removeDurableLocalTruthItem(OFFLINE_IDENTITY_EXPLICIT_LOGOUT_STORAGE_KEY);
}

export function isOfflineIdentitySessionExplicitlyLoggedOut(sessionInput?: OfflineIdentitySession | null): boolean {
  const session = sessionInput ?? peekOfflineIdentitySession();
  if (!session?.keyId || !session.session.uid) return false;
  const logout = parseOfflineIdentityExplicitLogout(readDurableLocalTruthItem(OFFLINE_IDENTITY_EXPLICIT_LOGOUT_STORAGE_KEY));
  return Boolean(logout && logout.keyId === session.keyId && logout.uid === session.session.uid);
}

function writeOfflineIdentitySessionRegister(
  register: OfflineIdentitySessionRegister,
  activeSession: OfflineIdentitySession,
  source: string,
): void {
  const serialized = JSON.stringify(register);
  writeDurableLocalTruthItem(OFFLINE_IDENTITY_SESSION_REGISTER_STORAGE_KEY, serialized, {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
    source,
    allowSameRankOverwrite: true,
  });
  writeDurableLocalTruthItem(OFFLINE_IDENTITY_SESSION_ACTIVE_KEY_STORAGE_KEY, activeSession.keyId, {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
    source: "offline-identity-active-key",
    allowSameRankOverwrite: true,
  });
  writeDurableLocalTruthItem(OFFLINE_IDENTITY_SESSION_DURABLE_STORAGE_KEY, JSON.stringify(activeSession), {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
    source: "offline-identity-active-session-projection",
    allowSameRankOverwrite: true,
  });
}

function admitOfflineIdentitySessionWithOptions(
  next: OfflineIdentitySession,
  source: string,
  options?: { makeActive?: boolean },
): OfflineIdentitySession {
  const currentRegister = peekOfflineIdentitySessionRegister();
  const merged = mergeOfflineIdentitySession(currentRegister.sessions[next.keyId] ?? null, next);
  const sessions = {
    ...currentRegister.sessions,
    [merged.keyId]: merged,
  };
  const requestedActiveKeyId =
    options?.makeActive === false
      ? currentRegister.activeKeyId ?? merged.keyId
      : merged.keyId;
  const activeKeyId = sessions[requestedActiveKeyId] ? requestedActiveKeyId : merged.keyId;
  const nextRegister: OfflineIdentitySessionRegister = {
    schema: OFFLINE_IDENTITY_SESSION_REGISTER_SCHEMA,
    updatedAtMs: Date.now(),
    activeKeyId,
    sessions,
  };
  writeOfflineIdentitySessionRegister(nextRegister, sessions[activeKeyId] ?? merged, source);
  return merged;
}

function admitOfflineIdentitySession(next: OfflineIdentitySession, source: string): OfflineIdentitySession {
  return admitOfflineIdentitySessionWithOptions(next, source);
}

export function assertReceizKeyMatchesOfflineIdentitySession(args: {
  keyFile: ReceizKeyFile;
  session: OfflineIdentitySession;
}): void {
  if (args.keyFile.keyId !== args.session.keyId) {
    throw new Error("identity_key_offline_session_mismatch");
  }
  if (args.keyFile.crypto.publicKeyRawB64u !== args.session.identityKeyPublicKeyRawB64u) {
    throw new Error("identity_key_offline_session_mismatch");
  }
}

export function writeOfflineIdentitySessionFromVerifiedLogin(args: {
  keyFile: ReceizKeyFile;
  pbiCredential: OfflineIdentityPbiCredential;
  verifiedSession: unknown;
}): OfflineIdentitySession {
  const keyId = normalizeIdentityKeyId(args.keyFile.keyId);
  const identityKeyPublicKeyRawB64u = normalizeBase64Url(args.keyFile.crypto.publicKeyRawB64u);
  const pbiCredential = normalizePbiCredential(args.pbiCredential);
  const session = normalizeVerifiedSession(args.verifiedSession);
  if (!keyId || !identityKeyPublicKeyRawB64u || !pbiCredential || !session) {
    throw new Error("identity_key_offline_session_invalid");
  }

  const now = Date.now();
  const existing = peekOfflineIdentitySessionForKey(keyId);
  const next: OfflineIdentitySession = {
    schema: OFFLINE_IDENTITY_SESSION_SCHEMA,
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
    admittedFrom: "identity-key-finish",
    keyId,
    identityKeyPublicKeyRawB64u,
    session,
    pbiCredential,
    keyAttestation: normalizeKeyAttestation(args.keyFile),
    portableStateProof: normalizePortableStateProof(args.keyFile),
    localEnrollment: null,
    receizDevice: null,
  };

  return admitOfflineIdentitySession(next, "offline-identity-session-register");
}

export function upgradeOfflineIdentitySessionFromLocalPublication(args: {
  current: OfflineIdentitySession;
  keyId: string;
  verifiedSession: unknown;
  nowMs?: number;
}): OfflineIdentitySession {
  const current = normalizeOfflineIdentitySession(args.current);
  const keyId = normalizeIdentityKeyId(args.keyId);
  const verifiedSession = normalizeVerifiedSession(args.verifiedSession, { requireEmail: false });
  if (
    !current ||
    !keyId ||
    current.keyId !== keyId ||
    !verifiedSession ||
    (current.admittedFrom !== "local-pbi-enrollment" && current.admittedFrom !== "identity-key-finish")
  ) {
    throw new Error("identity_key_offline_publication_session_invalid");
  }

  const nowMs = Number.isFinite(args.nowMs) ? Number(args.nowMs) : Date.now();
  return {
    ...current,
    createdAtMs: current.createdAtMs,
    updatedAtMs: nowMs,
    admittedFrom: "identity-key-finish",
    session: {
      ...verifiedSession,
      email: verifiedSession.email ?? current.session.email,
      username: verifiedSession.username ?? current.session.username,
      displayName: verifiedSession.displayName ?? current.session.displayName,
      plan: verifiedSession.plan ?? current.session.plan,
      entitlementPlan: verifiedSession.entitlementPlan ?? current.session.entitlementPlan,
      subscriptionTerm: mergeSubscriptionTermProof(
        current.session.subscriptionTerm,
        verifiedSession.subscriptionTerm,
      ),
    },
    localEnrollment: null,
    receizDevice: null,
  };
}

export function writeOfflineIdentitySessionFromLocalPublication(args: {
  keyId: string;
  verifiedSession: unknown;
  makeActive?: boolean;
}): OfflineIdentitySession {
  const keyId = normalizeIdentityKeyId(args.keyId);
  const current = keyId ? peekOfflineIdentitySessionForKey(keyId) : null;
  if (!keyId || !current) {
    throw new Error("identity_key_offline_publication_session_invalid");
  }
  return admitOfflineIdentitySessionWithOptions(
    upgradeOfflineIdentitySessionFromLocalPublication({
      current,
      keyId,
      verifiedSession: args.verifiedSession,
    }),
    "offline-identity-local-publication-register",
    typeof args.makeActive === "boolean" ? { makeActive: args.makeActive } : undefined,
  );
}

export function writeOfflineIdentitySessionFromReceizKey(args: {
  keyFile: ReceizKeyFile;
  verifiedSession?: unknown;
  makeActive?: boolean;
}): OfflineIdentitySession {
  const keyId = normalizeIdentityKeyId(args.keyFile.keyId);
  const identityKeyPublicKeyRawB64u = normalizeBase64Url(args.keyFile.crypto.publicKeyRawB64u);
  const owner = args.keyFile.owner;
  const session = normalizeVerifiedSession(
    args.verifiedSession ?? {
      uid: owner.uid,
      email: owner.email,
      username: owner.username,
      displayName: owner.displayName,
      plan: "free",
      entitlementPlan: "free",
    },
    { requireEmail: false },
  );
  if (!keyId || !identityKeyPublicKeyRawB64u || !session) {
    throw new Error("identity_key_offline_session_invalid");
  }

  const now = Date.now();
  const existing = peekOfflineIdentitySessionForKey(keyId);
  const next: OfflineIdentitySession = {
    schema: OFFLINE_IDENTITY_SESSION_SCHEMA,
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
    admittedFrom: "receiz-key",
    keyId,
    identityKeyPublicKeyRawB64u,
    session,
    pbiCredential: null,
    keyAttestation: normalizeKeyAttestation(args.keyFile),
    portableStateProof: normalizePortableStateProof(args.keyFile),
    localEnrollment: null,
    receizDevice: null,
  };

  return admitOfflineIdentitySessionWithOptions(
    next,
    "offline-identity-receiz-key-register",
    typeof args.makeActive === "boolean" ? { makeActive: args.makeActive } : undefined,
  );
}

export function writeOfflineIdentitySessionFromLocalEnrollment(args: {
  keyFile: ReceizKeyFile;
  pbiCredential: OfflineIdentityPbiCredential;
  userHandleB64Url: string;
  actionHashHex: string;
}): OfflineIdentitySession {
  const keyId = normalizeIdentityKeyId(args.keyFile.keyId);
  const identityKeyPublicKeyRawB64u = normalizeBase64Url(args.keyFile.crypto.publicKeyRawB64u);
  const pbiCredential = normalizePbiCredential(args.pbiCredential);
  const userHandleB64Url = normalizeBase64Url(args.userHandleB64Url);
  const actionHashHex = normalizeText(args.actionHashHex).toLowerCase();
  const owner = args.keyFile.owner;
  const session = normalizeVerifiedSession(
    {
      uid: owner.uid,
      email: owner.email,
      username: owner.username,
      displayName: owner.displayName,
      plan: "free",
      entitlementPlan: "free",
    },
    { requireEmail: false },
  );
  if (
    !keyId ||
    !identityKeyPublicKeyRawB64u ||
    !pbiCredential ||
    !userHandleB64Url ||
    !HEX64_RE.test(actionHashHex) ||
    !session
  ) {
    throw new Error("identity_key_offline_session_invalid");
  }

  const now = Date.now();
  const createdAt = new Date(now).toISOString();
  const existing = peekOfflineIdentitySessionForKey(keyId);
  const next: OfflineIdentitySession = {
    schema: OFFLINE_IDENTITY_SESSION_SCHEMA,
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
    admittedFrom: "local-pbi-enrollment",
    keyId,
    identityKeyPublicKeyRawB64u,
    session,
    pbiCredential,
    keyAttestation: normalizeKeyAttestation(args.keyFile),
    portableStateProof: normalizePortableStateProof(args.keyFile),
    localEnrollment: {
      userHandleB64Url,
      actionHashHex,
      createdAt,
    },
    receizDevice: null,
  };

  return admitOfflineIdentitySession(next, "offline-identity-local-enrollment-register");
}

export function writeOfflineIdentitySessionFromReceizDevice(args: {
  keyFile: ReceizKeyFile;
  localUid: string;
  deviceName?: string | null;
  createdAt?: string | null;
  verifiedSession?: unknown;
  boundToServer?: boolean;
}): OfflineIdentitySession {
  const keyId = normalizeIdentityKeyId(args.keyFile.keyId);
  const identityKeyPublicKeyRawB64u = normalizeBase64Url(args.keyFile.crypto.publicKeyRawB64u);
  const localUid = normalizeText(args.localUid);
  const owner = args.keyFile.owner;
  const session = normalizeVerifiedSession(
    args.verifiedSession ?? {
      uid: owner.uid,
      email: owner.email,
      username: owner.username,
      displayName: owner.displayName,
      plan: "free",
      entitlementPlan: "free",
    },
    { requireEmail: false },
  );
  if (!keyId || !identityKeyPublicKeyRawB64u || !localUid || !session) {
    throw new Error("receiz_device_offline_session_invalid");
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const createdAt = normalizeText(args.createdAt) || nowIso;
  const existing = peekOfflineIdentitySessionForKey(keyId);
  const next: OfflineIdentitySession = {
    schema: OFFLINE_IDENTITY_SESSION_SCHEMA,
    createdAtMs: existing?.createdAtMs ?? now,
    updatedAtMs: now,
    admittedFrom: args.boundToServer ? "receiz-device-bound" : "receiz-device",
    keyId,
    identityKeyPublicKeyRawB64u,
    session,
    pbiCredential: null,
    keyAttestation: normalizeKeyAttestation(args.keyFile),
    portableStateProof: normalizePortableStateProof(args.keyFile),
    localEnrollment: null,
    receizDevice: {
      localUid,
      deviceName: normalizeNullableText(args.deviceName),
      createdAt: existing?.receizDevice?.createdAt ?? createdAt,
      boundAt: args.boundToServer ? nowIso : existing?.receizDevice?.boundAt ?? null,
    },
  };

  return admitOfflineIdentitySession(next, "offline-identity-receiz-device-register");
}

export function projectOfflineIdentitySessionToBootstrap(session: OfflineIdentitySession): void {
  clearOfflineIdentityExplicitLogout();
  const current = peekSessionBootstrapSnapshot(true);
  const sameUser = current?.uid === session.session.uid;
  writeSessionBootstrapSnapshot({
    signedIn: true,
    uid: session.session.uid,
    email: session.session.email,
    username: session.session.username ?? (sameUser ? current.username : ""),
    canViewPhiAmounts: sameUser ? current.canViewPhiAmounts : false,
    plan: session.session.plan ?? (sameUser ? current.plan : null),
    entitlementPlan: session.session.entitlementPlan ?? (sameUser ? current.entitlementPlan : null),
    subscriptionTerm: session.session.subscriptionTerm,
    durableProofBacked: true,
  });
  setServiceWorkerLocalActorNamespace(session.session.uid);
}

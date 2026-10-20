"use client";

import { setServiceWorkerLocalActorNamespace } from "@/app/components/pwa/sessionSync";
import {
  isOfflineIdentitySessionExplicitlyLoggedOut,
  peekOfflineIdentitySession,
} from "@/app/lib/auth/offlineIdentitySession";
import { clearAccountScopedRouteContinuity } from "@/app/lib/session/accountSwitchContinuity";
import { normalizePlan, type Plan } from "@/app/lib/premium/plan";
import { peekProfileUsernameProof } from "@/app/lib/profile/profileUsernameAppend";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import {
  hasDurableSessionBootstrapPrincipal,
  peekSessionBootstrapCreatedAtMs,
  peekSessionBootstrapSnapshot,
  writeSessionBootstrapSnapshot,
} from "@/app/lib/session/bootstrapHydration";
import { storedReceizDeviceIdentityIsUnsupportedPrimaryForKeyId } from "@/app/lib/auth/receizDeviceIdentitySupport";
import { normalizeIdentityKeyId } from "@/app/utils/receizIdentityKey";
import {
  mergeSubscriptionTermProof,
  normalizeSubscriptionTermProof,
  type SubscriptionTermProof,
} from "@/app/lib/premium/subscriptionTerm";

const RECEIZ_ACCOUNT_BINDING_REGISTER_SCHEMA = "receiz.auth.account-bindings.v1";
const RECEIZ_ACCOUNT_BINDING_REGISTER_STORAGE_KEY = "receiz.auth.account-bindings.v1";

export type ReceizAccountBindingSource =
  | "receiz-device"
  | "receiz-device-bound"
  | "receiz-key"
  | "pbi"
  | "email"
  | "server-switch";

export type ReceizAccountBindingSession = {
  uid: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  plan: Plan | null;
  entitlementPlan: Plan | null;
  subscriptionTerm: SubscriptionTermProof | null;
};

export type ReceizAccountBinding = {
  id: string;
  receizKeyId: string;
  localUid: string | null;
  session: ReceizAccountBindingSession;
  sources: ReceizAccountBindingSource[];
  serverBound: boolean;
  pbiBound: boolean;
  emailBound: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  lastUsedAtMs: number;
};

export type ReceizAccountBindingRegister = {
  schema: typeof RECEIZ_ACCOUNT_BINDING_REGISTER_SCHEMA;
  updatedAtMs: number;
  activeBindingId: string | null;
  bindings: Record<string, ReceizAccountBinding>;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return normalized;
}

function normalizeOptionalPlan(value: unknown): Plan | null {
  if (typeof value !== "string") return null;
  const plan = normalizePlan(value);
  return plan === "free" && value !== "free" ? null : plan;
}

function normalizeSource(value: unknown): ReceizAccountBindingSource | null {
  if (
    value === "receiz-device" ||
    value === "receiz-device-bound" ||
    value === "receiz-key" ||
    value === "pbi" ||
    value === "email" ||
    value === "server-switch"
  ) {
    return value;
  }
  return null;
}

function bindingIdFor(receizKeyId: string, uid: string): string {
  return `${receizKeyId}:${uid}`;
}

export function emptyReceizAccountBindingRegister(): ReceizAccountBindingRegister {
  return {
    schema: RECEIZ_ACCOUNT_BINDING_REGISTER_SCHEMA,
    updatedAtMs: 0,
    activeBindingId: null,
    bindings: {},
  };
}

function normalizeBindingSession(value: unknown): ReceizAccountBindingSession | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ReceizAccountBindingSession>;
  const uid = normalizeText(record.uid);
  if (!uid) return null;
  return {
    uid,
    email: normalizeEmail(record.email),
    username: peekProfileUsernameProof(uid)?.normalizedUsername ?? normalizeNullableText(record.username),
    displayName: normalizeNullableText(record.displayName),
    plan: normalizeOptionalPlan(record.plan),
    entitlementPlan: normalizeOptionalPlan(record.entitlementPlan),
    subscriptionTerm: normalizeSubscriptionTermProof(record.subscriptionTerm),
  };
}

function normalizeBinding(value: unknown): ReceizAccountBinding | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<ReceizAccountBinding>;
  const receizKeyId = normalizeIdentityKeyId(record.receizKeyId);
  const session = normalizeBindingSession(record.session);
  if (!receizKeyId || !session) return null;
  const id = normalizeText(record.id) || bindingIdFor(receizKeyId, session.uid);
  if (id !== bindingIdFor(receizKeyId, session.uid)) return null;
  const sources = Array.isArray(record.sources)
    ? Array.from(new Set(record.sources.map(normalizeSource).filter((source): source is ReceizAccountBindingSource => Boolean(source))))
    : [];
  return {
    id,
    receizKeyId,
    localUid: normalizeNullableText(record.localUid),
    session,
    sources,
    serverBound: record.serverBound === true,
    pbiBound: record.pbiBound === true,
    emailBound: record.emailBound === true,
    createdAtMs: Number.isFinite(record.createdAtMs) ? Number(record.createdAtMs) : Date.now(),
    updatedAtMs: Number.isFinite(record.updatedAtMs) ? Number(record.updatedAtMs) : Date.now(),
    lastUsedAtMs: Number.isFinite(record.lastUsedAtMs) ? Number(record.lastUsedAtMs) : Date.now(),
  };
}

function parseReceizAccountBindingRegister(raw: string): ReceizAccountBindingRegister | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ReceizAccountBindingRegister> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schema !== RECEIZ_ACCOUNT_BINDING_REGISTER_SCHEMA) return null;
    if (!Number.isFinite(parsed.updatedAtMs)) return null;
    const rawBindings = parsed.bindings;
    if (!rawBindings || typeof rawBindings !== "object" || Array.isArray(rawBindings)) return null;

    const bindings: Record<string, ReceizAccountBinding> = {};
    for (const rawBinding of Object.values(rawBindings)) {
      const binding = normalizeBinding(rawBinding);
      if (binding) bindings[binding.id] = binding;
    }
    const activeBindingId = normalizeText(parsed.activeBindingId);
    return {
      schema: RECEIZ_ACCOUNT_BINDING_REGISTER_SCHEMA,
      updatedAtMs: Number(parsed.updatedAtMs),
      activeBindingId: activeBindingId && bindings[activeBindingId] ? activeBindingId : newestBindingId(bindings),
      bindings,
    };
  } catch {
    return null;
  }
}

function newestBindingId(bindings: Record<string, ReceizAccountBinding>): string | null {
  return (
    Object.values(bindings)
      .sort((left, right) => right.lastUsedAtMs - left.lastUsedAtMs || right.updatedAtMs - left.updatedAtMs)
      .at(0)?.id ?? null
  );
}

function writeReceizAccountBindingRegister(register: ReceizAccountBindingRegister, source: string): void {
  writeDurableLocalTruthItem(RECEIZ_ACCOUNT_BINDING_REGISTER_STORAGE_KEY, JSON.stringify(register), {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
    source,
    allowSameRankOverwrite: true,
  });
}

function mergeBinding(current: ReceizAccountBinding | null, next: ReceizAccountBinding): ReceizAccountBinding {
  if (!current) return next;
  const sources = Array.from(new Set([...current.sources, ...next.sources]));
  return {
    ...next,
    createdAtMs: Math.min(current.createdAtMs, next.createdAtMs),
    updatedAtMs: Math.max(current.updatedAtMs, next.updatedAtMs),
    lastUsedAtMs: Math.max(current.lastUsedAtMs, next.lastUsedAtMs),
    localUid: next.localUid ?? current.localUid,
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
    sources,
    serverBound: current.serverBound || next.serverBound,
    pbiBound: current.pbiBound || next.pbiBound,
    emailBound: current.emailBound || next.emailBound,
  };
}

export function peekReceizAccountBindingRegister(): ReceizAccountBindingRegister {
  const raw = readDurableLocalTruthItem(RECEIZ_ACCOUNT_BINDING_REGISTER_STORAGE_KEY);
  return raw ? parseReceizAccountBindingRegister(raw) ?? emptyReceizAccountBindingRegister() : emptyReceizAccountBindingRegister();
}

export function listReceizAccountBindings(receizKeyId?: string | null): ReceizAccountBinding[] {
  const normalizedKeyId = receizKeyId ? normalizeIdentityKeyId(receizKeyId) : null;
  return Object.values(peekReceizAccountBindingRegister().bindings)
    .filter((binding) => !normalizedKeyId || binding.receizKeyId === normalizedKeyId)
    .sort((left, right) => right.lastUsedAtMs - left.lastUsedAtMs || right.updatedAtMs - left.updatedAtMs);
}

function bindingHasCanonicalAccountAuthority(binding: ReceizAccountBinding): boolean {
  return binding.pbiBound
    || binding.emailBound
    || binding.serverBound
    || binding.sources.some((source) => source !== "receiz-device");
}

function isSubordinateLocalReceizIdBinding(
  binding: ReceizAccountBinding,
  authoritativeKeyIds: ReadonlySet<string>,
): boolean {
  return !bindingHasCanonicalAccountAuthority(binding)
    && binding.localUid === binding.session.uid
    && authoritativeKeyIds.has(binding.receizKeyId);
}

/**
 * Projects the append-only key/account binding history into canonical accounts.
 * A local Receiz ID is custody beneath the account it later binds to, and the
 * same global account UID reached through another held key is still one account.
 */
export function projectCanonicalReceizAccountBindings(
  bindings: readonly ReceizAccountBinding[],
  activeBindingId?: string | null,
): ReceizAccountBinding[] {
  const authoritativeKeyIds = new Set(
    bindings
      .filter(bindingHasCanonicalAccountAuthority)
      .map((binding) => binding.receizKeyId),
  );
  const accountGroups = new Map<string, ReceizAccountBinding[]>();
  for (const binding of bindings) {
    if (isSubordinateLocalReceizIdBinding(binding, authoritativeKeyIds)) continue;
    const group = accountGroups.get(binding.session.uid) ?? [];
    group.push(binding);
    accountGroups.set(binding.session.uid, group);
  }

  return Array.from(accountGroups.values())
    .map((group) => {
      const active = activeBindingId
        ? group.find((binding) => binding.id === activeBindingId)
        : null;
      if (active) return active;
      return [...group].sort((left, right) => {
        const authorityRank = Number(bindingHasCanonicalAccountAuthority(right))
          - Number(bindingHasCanonicalAccountAuthority(left));
        return authorityRank
          || right.lastUsedAtMs - left.lastUsedAtMs
          || right.updatedAtMs - left.updatedAtMs
          || left.id.localeCompare(right.id);
      })[0];
    })
    .filter((binding): binding is ReceizAccountBinding => Boolean(binding))
    .sort((left, right) => {
      const leftActive = Number(left.id === activeBindingId);
      const rightActive = Number(right.id === activeBindingId);
      return rightActive - leftActive
        || right.lastUsedAtMs - left.lastUsedAtMs
        || right.updatedAtMs - left.updatedAtMs
        || left.id.localeCompare(right.id);
    });
}

export function peekActiveReceizAccountBinding(): ReceizAccountBinding | null {
  const register = peekReceizAccountBindingRegister();
  return register.activeBindingId ? register.bindings[register.activeBindingId] ?? null : null;
}

function activeBindingUserId(register: ReceizAccountBindingRegister): string | null {
  return register.activeBindingId ? register.bindings[register.activeBindingId]?.session.uid ?? null : null;
}

function sessionUidFromPayload(session: unknown): string | null {
  if (!session || typeof session !== "object" || Array.isArray(session)) return null;
  return normalizeNullableText((session as { uid?: unknown }).uid);
}

function activeBindingHasAccountAuthority(binding: ReceizAccountBinding): boolean {
  const hasAuthority =
    binding.pbiBound ||
    binding.emailBound ||
    binding.serverBound ||
    binding.sources.some((source) => source !== "receiz-device");
  if (!hasAuthority) return false;
  if (!storedReceizDeviceIdentityIsUnsupportedPrimaryForKeyId(binding.receizKeyId)) return true;
  return bindingCarriesExplicitRecoveryAuthority(binding);
}

function bindingCarriesExplicitRecoveryAuthority(binding: ReceizAccountBinding): boolean {
  return (
    binding.pbiBound ||
    binding.emailBound ||
    binding.sources.some((source) => source === "pbi" || source === "email" || source === "receiz-key")
  );
}

export function peekActiveReceizAccountBindingWithAccountAuthority(): ReceizAccountBinding | null {
  const binding = peekActiveReceizAccountBinding();
  if (!binding?.session.uid || activeBindingSuppressedByExplicitLogout(binding) || !activeBindingHasAccountAuthority(binding)) {
    return null;
  }
  return binding;
}

export function peekReceizAccountBindingForActivePrincipal(): ReceizAccountBinding | null {
  const binding = peekActiveReceizAccountBindingWithAccountAuthority();
  if (!binding) return null;
  const bootstrapUid = peekSessionBootstrapSnapshot(true)?.uid ?? null;
  if (!bootstrapUid || bootstrapUid === binding.session.uid) return binding;
  return incomingSessionHasNewerBootstrapAuthority(bootstrapUid, binding) ? null : binding;
}

function activeBindingSuppressedByExplicitLogout(binding: ReceizAccountBinding): boolean {
  const offlineSession = peekOfflineIdentitySession();
  return Boolean(
    offlineSession &&
      offlineSession.keyId === binding.receizKeyId &&
      offlineSession.session.uid === binding.session.uid &&
      isOfflineIdentitySessionExplicitlyLoggedOut(offlineSession),
  );
}

function incomingSessionHasNewerBootstrapAuthority(incomingUid: string | null, binding: ReceizAccountBinding): boolean {
  if (!incomingUid || incomingUid === binding.session.uid) return false;
  const bootstrap = peekSessionBootstrapSnapshot(true);
  if (bootstrap?.uid !== incomingUid) return false;
  if (!hasDurableSessionBootstrapPrincipal(incomingUid)) return false;
  const bootstrapCreatedAtMs = peekSessionBootstrapCreatedAtMs(true);
  return typeof bootstrapCreatedAtMs === "number" && bootstrapCreatedAtMs >= binding.lastUsedAtMs;
}

export function activeReceizAccountBindingOutranksSession(session: unknown): ReceizAccountBinding | null {
  const binding = peekActiveReceizAccountBinding();
  if (!binding?.session.uid || activeBindingSuppressedByExplicitLogout(binding) || !activeBindingHasAccountAuthority(binding)) {
    return null;
  }
  const incomingUid = sessionUidFromPayload(session);
  if (incomingSessionHasNewerBootstrapAuthority(incomingUid, binding)) return null;
  return incomingUid === binding.session.uid ? null : binding;
}

export function activeReceizAccountBindingOutranksUserId(userId: unknown): ReceizAccountBinding | null {
  const binding = peekActiveReceizAccountBinding();
  if (!binding?.session.uid || activeBindingSuppressedByExplicitLogout(binding) || !activeBindingHasAccountAuthority(binding)) {
    return null;
  }
  const incomingUid = normalizeNullableText(userId);
  return incomingUid === binding.session.uid ? null : binding;
}

export function activeReceizAccountBindingAdmitsUserId(userId: unknown): ReceizAccountBinding | null {
  const binding = peekActiveReceizAccountBinding();
  if (!binding?.session.uid || activeBindingSuppressedByExplicitLogout(binding) || !activeBindingHasAccountAuthority(binding)) {
    return null;
  }
  const incomingUid = normalizeNullableText(userId);
  return incomingUid === binding.session.uid ? binding : null;
}

export function projectReceizAccountBinding(binding: ReceizAccountBinding): void {
  writeSessionBootstrapSnapshot({
    signedIn: true,
    uid: binding.session.uid,
    email: binding.session.email,
    username: binding.session.username ?? "",
    plan: binding.session.plan,
    entitlementPlan: binding.session.entitlementPlan,
    subscriptionTerm: binding.session.subscriptionTerm,
    canViewPhiAmounts: true,
    durableProofBacked: true,
  });
  setServiceWorkerLocalActorNamespace(binding.session.uid);
}

export function switchReceizAccountBinding(bindingId: string): ReceizAccountBinding | null {
  const register = peekReceizAccountBindingRegister();
  const binding = register.bindings[bindingId] ?? null;
  if (!binding) return null;
  const previousUserId = activeBindingUserId(register);
  const updated: ReceizAccountBinding = {
    ...binding,
    lastUsedAtMs: Date.now(),
  };
  const nextRegister: ReceizAccountBindingRegister = {
    ...register,
    updatedAtMs: Date.now(),
    activeBindingId: updated.id,
    bindings: {
      ...register.bindings,
      [updated.id]: updated,
    },
  };
  writeReceizAccountBindingRegister(nextRegister, "receiz-account-binding-switch");
  if (previousUserId && previousUserId !== updated.session.uid) {
    clearAccountScopedRouteContinuity();
  }
  projectReceizAccountBinding(updated);
  return updated;
}

export function admitReceizAccountBinding(args: {
  receizKeyId: string;
  localUid?: string | null;
  session: unknown;
  source: ReceizAccountBindingSource;
  serverBound?: boolean;
  pbiBound?: boolean;
  emailBound?: boolean;
  makeActive?: boolean;
}): ReceizAccountBinding {
  const receizKeyId = normalizeIdentityKeyId(args.receizKeyId);
  const session = normalizeBindingSession(args.session);
  if (!receizKeyId || !session) {
    throw new Error("receiz_account_binding_invalid");
  }

  const now = Date.now();
  const currentRegister = peekReceizAccountBindingRegister();
  const previousUserId = activeBindingUserId(currentRegister);
  const id = bindingIdFor(receizKeyId, session.uid);
  const next = mergeBinding(currentRegister.bindings[id] ?? null, {
    id,
    receizKeyId,
    localUid: normalizeNullableText(args.localUid),
    session,
    sources: [args.source],
    serverBound: args.serverBound === true || args.source === "receiz-device-bound" || args.source === "server-switch",
    pbiBound: args.pbiBound === true || args.source === "pbi",
    emailBound: args.emailBound === true || args.source === "email",
    createdAtMs: now,
    updatedAtMs: now,
    lastUsedAtMs: now,
  });
  const nextRegister: ReceizAccountBindingRegister = {
    schema: RECEIZ_ACCOUNT_BINDING_REGISTER_SCHEMA,
    updatedAtMs: now,
    activeBindingId: args.makeActive === false ? currentRegister.activeBindingId ?? next.id : next.id,
    bindings: {
      ...currentRegister.bindings,
      [next.id]: next,
    },
  };
  writeReceizAccountBindingRegister(nextRegister, "receiz-account-binding-register");
  if (args.makeActive !== false) {
    if (previousUserId && previousUserId !== next.session.uid) {
      clearAccountScopedRouteContinuity();
    }
    projectReceizAccountBinding(next);
  }
  return next;
}

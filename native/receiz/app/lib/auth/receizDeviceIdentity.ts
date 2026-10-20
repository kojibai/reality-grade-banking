"use client";

import {
  MANAGED_PROFILE_ROUTE_FALLBACK_PATH,
  isManagedProfileFallbackPath,
  resolveManagedProfileHref,
} from "@/app/lib/profile/managedRoute";
import {
  isOfflineIdentitySessionExplicitlyLoggedOut,
  projectOfflineIdentitySessionToBootstrap,
  writeOfflineIdentitySessionFromReceizDevice,
} from "@/app/lib/auth/offlineIdentitySession";
import { accountIdentityCreationFromPortableSource } from "@/app/lib/profile/profileIdentityCreationCoordinate";
import { readOrAdmitProfileIdentityGenesis } from "@/app/lib/profile/profileIdentityGenesis";
import { buildProfileIdentityArtworkSvgSet } from "@/app/lib/profile/identityArtwork";
import { peekSessionBootstrapSnapshot } from "@/app/lib/session/bootstrapHydration";
import {
  admitReceizAccountBinding,
  listReceizAccountBindings,
  peekActiveReceizAccountBinding,
  projectCanonicalReceizAccountBindings,
  switchReceizAccountBinding,
  type ReceizAccountBinding,
} from "@/app/lib/auth/receizAccountBindings";
import {
  prepareManagedProfileFastEntryHintForUsername,
  prepareProfileWorkspaceFastEntryHint,
  seedProfileWorkspaceFromLocalSession,
  writeProfileWorkspaceHydrationSeed,
} from "@/app/lib/profile/workspaceHydration";
import { writeSharedWalletSummaryClientCache } from "@/app/lib/market/walletSummaryClient";
import { admitAuthenticatedWalletProjectionAfterIdentityProof } from "@/app/lib/wallet/backgroundHydration";
import {
  prepareProfileRouteTransition,
} from "@/app/lib/profile/routeHydration";
import { writeWalletRouteHydrationSeed, type WalletRouteHydrationSummary } from "@/app/lib/wallet/routeHydration";
import { projectWalletRouteSummaryFromReceizKeyPortableState } from "@/app/signin/receizPortableStateLocalAdmission";
import {
  base64UrlEncode,
  createEncryptedReceizKeyFile,
  parseReceizKeyFileText,
  serializeReceizKeyFile,
  signIdentityKeyChallenge,
  supportsReceizKeyCrypto,
  verifyReceizKeyPortableStateProof,
  type ReceizKeyFile,
} from "@/app/utils/receizIdentityKey";
import {
  RECEIZ_DEVICE_IDENTITY_SCHEMA,
  receizIdPrimaryLoginRequiresLegacyPbiForBrowser,
} from "@/app/lib/auth/receizDeviceIdentitySupport";
import { requestServiceWorkerSessionSync } from "@/app/components/pwa/sessionSync";
import { epochMsFromPulse, KaiTimeSource, microPulsesSinceGenesis } from "@/app/utils/kai_pulse";
import {
  activateHeldReceizDeviceIdentity,
  admitReceizDeviceIdentityToRegister,
  admitCreatedReceizDeviceIdentityToRegister,
  listReceizDeviceIdentitiesFromRegister,
  peekActiveReceizDeviceIdentityFromRegister,
  prepareReceizDeviceIdentityRegister,
  realizeReceizDeviceIdentityRegister,
} from "@/app/lib/auth/receizDeviceIdentityRegister";

const RECEIZ_DEVICE_NETWORK_TIMEOUT_MS = 1_500;
const RECEIZ_DEVICE_BACKGROUND_COOKIE_TIMEOUT_MS = 15_000;
const RECEIZ_DEVICE_EMAIL_RE = /^receiz_[0-9a-f]{8,32}@id\.receiz\.local$/i;

let receizDeviceServerPublishRetryAfterMs = 0;
let receizDeviceProfilePublishRetry: number | null = null;

const receizIdentityLiveKaiTimeSource = new KaiTimeSource({
  ignoreOverride: true,
});

export function currentReceizIdentityKaiMicroPulse(): bigint {
  return receizIdentityLiveKaiTimeSource.nowMicroPulses();
}

export function receizIdentityChronosIsoForKaiMicroPulse(kaiMicroPulse: bigint): string {
  const kaiPulse = kaiMicroPulse / 1_000_000n;
  let epochMs = epochMsFromPulse(kaiPulse);
  for (let adjustment = 0; adjustment < 8; adjustment += 1) {
    const projectedPulse = microPulsesSinceGenesis(epochMs) / 1_000_000n;
    if (projectedPulse === kaiPulse) return new Date(Number(epochMs)).toISOString();
    epochMs += projectedPulse < kaiPulse ? 1n : -1n;
  }
  throw new Error("receiz_identity_kai_chronos_projection_invalid");
}

export type StoredReceizDeviceIdentity = {
  schema: typeof RECEIZ_DEVICE_IDENTITY_SCHEMA;
  creationKaiMicroPulse?: string | null;
  familyRootKeyId?: string | null;
  createdByReceizKeyId?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
  localUid: string;
  username: string;
  displayName: string;
  deviceName: string | null;
  keyFile: ReceizKeyFile;
};

type ReceizDeviceContinueResponse = {
  ok?: boolean;
  profileProjectionPending?: boolean;
  next?: string;
  session?: unknown;
  wallet?: WalletRouteHydrationSummary | null;
  accountBindings?: unknown[];
  bound?: boolean;
  created?: boolean;
  error?: string;
};

type ReceizDeviceResult = {
  nextPath: string;
  keyId: string;
  localUid: string;
  username: string;
  created?: boolean;
  offline: boolean;
  serverBound: boolean;
  session?: unknown;
};

function randomBytes(size: number): Uint8Array {
  if (typeof crypto === "undefined" || !crypto.getRandomValues) {
    throw new Error("identity_key_not_supported");
  }
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

function randomToken(size = 16): string {
  return base64UrlEncode(randomBytes(size)).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeClientNextPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return MANAGED_PROFILE_ROUTE_FALLBACK_PATH;
  if (trimmed.startsWith("/signin")) return MANAGED_PROFILE_ROUTE_FALLBACK_PATH;
  if (isManagedProfileFallbackPath(trimmed)) return trimmed;
  return trimmed;
}

function localContinuityPath(
  value: string,
  username: string,
): string {
  const normalized = normalizeClientNextPath(value);
  return resolveManagedProfileHref(username, normalized);
}

function safeDeviceName(): string | null {
  if (typeof navigator === "undefined") return null;
  const platform = typeof navigator.platform === "string" ? navigator.platform.trim() : "";
  if (platform) return platform.slice(0, 80);
  return "This device";
}

export function isReceizDeviceSyntheticEmail(value: string | null | undefined): boolean {
  return typeof value === "string" && RECEIZ_DEVICE_EMAIL_RE.test(value.trim());
}

function parseStoredReceizDeviceIdentity(raw: string | null): StoredReceizDeviceIdentity | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredReceizDeviceIdentity>;
    if (!parsed || parsed.schema !== RECEIZ_DEVICE_IDENTITY_SCHEMA) return null;
    const keyFile = parseReceizKeyFileText(JSON.stringify(parsed.keyFile));
    const localUid = typeof parsed.localUid === "string" ? parsed.localUid.trim() : "";
    const username = typeof parsed.username === "string" ? parsed.username.trim() : "";
    const displayName = typeof parsed.displayName === "string" ? parsed.displayName.trim() : "";
    const createdAt = typeof parsed.createdAt === "string" ? parsed.createdAt.trim() : "";
    const updatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt.trim() : "";
    const creationKaiMicroPulse = typeof parsed.creationKaiMicroPulse === "string"
      && /^-?[0-9]+$/u.test(parsed.creationKaiMicroPulse.trim())
      ? parsed.creationKaiMicroPulse.trim()
      : null;
    const familyRootKeyId = typeof parsed.familyRootKeyId === "string" && /^[0-9a-f]{64}$/u.test(parsed.familyRootKeyId.trim())
      ? parsed.familyRootKeyId.trim()
      : null;
    const createdByReceizKeyId = typeof parsed.createdByReceizKeyId === "string" && /^[0-9a-f]{64}$/u.test(parsed.createdByReceizKeyId.trim())
      ? parsed.createdByReceizKeyId.trim()
      : null;
    const createdByUserId = typeof parsed.createdByUserId === "string" && parsed.createdByUserId.trim()
      ? parsed.createdByUserId.trim()
      : null;
    const deviceName = typeof parsed.deviceName === "string" && parsed.deviceName.trim() ? parsed.deviceName.trim() : null;
    if (!localUid || !username || !displayName || !createdAt || !updatedAt) return null;
    return {
      schema: RECEIZ_DEVICE_IDENTITY_SCHEMA,
      creationKaiMicroPulse,
      familyRootKeyId,
      createdByReceizKeyId,
      createdByUserId,
      createdAt,
      updatedAt,
      localUid,
      username,
      displayName,
      deviceName,
      keyFile,
    };
  } catch {
    return null;
  }
}

function serializeStoredReceizDeviceIdentity(identity: StoredReceizDeviceIdentity): string {
  return JSON.stringify({
    ...identity,
    keyFile: JSON.parse(serializeReceizKeyFile(identity.keyFile)) as ReceizKeyFile,
  });
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function projectReceizDeviceSealedWalletTruth(
  identity: StoredReceizDeviceIdentity,
  sessionInput: unknown,
): WalletRouteHydrationSummary | null {
  const session = sessionInput && typeof sessionInput === "object" ? sessionInput as {
    uid?: unknown;
  } : null;
  const userId = normalizeText(session?.uid) || identity.localUid;
  if (!userId) return null;

  const proofWallet = projectWalletRouteSummaryFromReceizKeyPortableState(identity.keyFile);
  if (proofWallet?.userId === userId) return proofWallet;
  return null;
}

function writeReceizDeviceLocalWalletTruth(identity: StoredReceizDeviceIdentity, sessionInput: unknown): void {
  const wallet = projectReceizDeviceSealedWalletTruth(identity, sessionInput);
  if (!wallet) return;
  writeWalletRouteHydrationSeed(wallet);
  writeSharedWalletSummaryClientCache(wallet, wallet.userId);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet:summary", { detail: wallet }));
  }
}

async function writeStoredReceizDeviceIdentity(identity: StoredReceizDeviceIdentity): Promise<void> {
  await admitCreatedReceizDeviceIdentityToRegister(identity);
}

export function peekReceizDeviceIdentity(): StoredReceizDeviceIdentity | null {
  const active = peekActiveReceizDeviceIdentityFromRegister();
  return active;
}

export function listReceizDeviceIdentities(): StoredReceizDeviceIdentity[] {
  return listReceizDeviceIdentitiesFromRegister()
    .map((identity) => parseStoredReceizDeviceIdentity(serializeStoredReceizDeviceIdentity(identity)))
    .filter((identity): identity is StoredReceizDeviceIdentity => Boolean(identity));
}

export function listHeldReceizDeviceAccountBindings(
  identities: readonly StoredReceizDeviceIdentity[] = listReceizDeviceIdentities(),
): ReceizAccountBinding[] {
  const heldBindings = listRawHeldReceizDeviceAccountBindings(identities);
  const activeBindingId = peekActiveReceizAccountBinding()?.id ?? null;
  return projectCanonicalReceizAccountBindings(heldBindings, activeBindingId);
}

function listRawHeldReceizDeviceAccountBindings(
  identities: readonly StoredReceizDeviceIdentity[] = listReceizDeviceIdentities(),
): ReceizAccountBinding[] {
  const heldKeyIds = new Set(identities.map((identity) => identity.keyFile.keyId));
  return listReceizAccountBindings().filter((binding) => heldKeyIds.has(binding.receizKeyId));
}

export async function switchHeldReceizDeviceAccount(bindingId: string): Promise<{
  identity: StoredReceizDeviceIdentity;
  binding: ReceizAccountBinding;
}> {
  const target = listReceizAccountBindings().find((binding) => binding.id === bindingId) ?? null;
  if (!target) throw new Error("receiz_account_binding_missing");
  await realizeReceizDeviceIdentityRegister([target.receizKeyId]);
  const identity = activateHeldReceizDeviceIdentity(target.receizKeyId);
  const binding = switchReceizAccountBinding(target.id);
  if (!binding) throw new Error("receiz_account_binding_missing");
  admitReceizDeviceStrongestLocalSession(identity);
  return { identity, binding };
}

export type ReceizDeviceAccountSuccessorEvidence =
  | ({ kind: "offline-note" } & Omit<Parameters<typeof import("@/app/lib/wallet/kairosOfflineNoteLocalIssuance").verifyKairosOfflineNoteCommittedAccountSuccessor>[0], "successor">)
  | { kind: "funded-reserve"; predecessor: ReceizKeyFile; fundingEvidence: import("@/app/lib/wallet/kairosReserveFundingBinding").KairosVerifiedOfflineReserveFundingEvidence; reserveCustody: import("@/app/lib/wallet/kairosReservePwaCustodyAdapter").KairosReservePwaCustodyAdapter };

export async function admitReceizDevicePortableAccountProof(keyFile: ReceizKeyFile, evidence?: ReceizDeviceAccountSuccessorEvidence): Promise<StoredReceizDeviceIdentity> {
  await realizeReceizDeviceIdentityRegister("active");
  const current = peekReceizDeviceIdentity();
  if (!current
    || keyFile.keyId !== current.keyFile.keyId
    || keyFile.alg !== current.keyFile.alg
    || keyFile.crypto.publicKeyRawB64u !== current.keyFile.crypto.publicKeyRawB64u
    || await verifyReceizKeyPortableStateProof(keyFile) !== "verified") {
    throw new Error("receiz_device_portable_account_proof_invalid");
  }
  const updateKaiMicroPulse = currentReceizIdentityKaiMicroPulse();
  const next = Object.freeze({
    ...current,
    updatedAt: receizIdentityChronosIsoForKaiMicroPulse(updateKaiMicroPulse),
    keyFile,
  }) satisfies StoredReceizDeviceIdentity;
  if (evidence?.kind === "offline-note") {
    const { verifyKairosOfflineNoteCommittedAccountSuccessor } = await import("@/app/lib/wallet/kairosOfflineNoteLocalIssuance");
    await verifyKairosOfflineNoteCommittedAccountSuccessor({ ...evidence, successor: keyFile });
  } else if (evidence?.kind === "funded-reserve") {
    const { isRuntimeCustodiedKairosVerifiedOfflineReserveFundingEvidence } = await import("@/app/lib/wallet/kairosReserveFundingBinding");
    const { verifyExactFundedAccountSuccessor } = await import("@/app/lib/wallet/kairosReservePwaCustodyAdapter");
    if (!isRuntimeCustodiedKairosVerifiedOfflineReserveFundingEvidence(evidence.fundingEvidence)) throw new Error("OFFLINE_RESERVE_CANONICAL_FUNDING_PROOF_REQUIRED");
    await verifyExactFundedAccountSuccessor({ funding: evidence.fundingEvidence.funding, predecessorAccountProof: evidence.predecessor, successorAccountProof: keyFile });
    const head = await evidence.reserveCustody.inspectBoundHead();
    if (!head || head.accountPortableStateDigest !== keyFile.portableState?.proof?.digestSha256Hex
      || head.fundingArtifactSha256 !== evidence.fundingEvidence.artifactSha256) throw new Error("OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");

  }
  await prepareReceizDeviceIdentityRegister([next]);
  const selection = admitReceizDeviceIdentityToRegister(next, true, evidence?.predecessor as ReceizKeyFile | undefined);
  admitReceizDeviceStrongestLocalSession(selection.selected);
  return selection.selected;
}

function receizDeviceIdentityIsPrimarySupported(identity: StoredReceizDeviceIdentity): boolean {
  return identity.keyFile.alg === "Ed25519" || identity.keyFile.alg === "P-256";
}

function assertReceizDeviceIdentityPrimarySupported(identity: StoredReceizDeviceIdentity): void {
  if (!receizDeviceIdentityIsPrimarySupported(identity)) {
    throw new Error("identity_key_not_supported");
  }
}

export async function createReceizDeviceIdentity(provenance?: Readonly<{
  familyRootKeyId?: string | null;
  createdByReceizKeyId?: string | null;
  createdByUserId?: string | null;
}>): Promise<StoredReceizDeviceIdentity> {
  if (!supportsReceizKeyCrypto()) {
    throw new Error("identity_key_not_supported");
  }

  const creationKaiMicroPulse = currentReceizIdentityKaiMicroPulse();
  const createdAt = receizIdentityChronosIsoForKaiMicroPulse(creationKaiMicroPulse);
  const token = randomToken(18);
  const localUid = `receiz_device_${token}`.slice(0, 64);
  const username = `receiz_${token.slice(0, 18)}`.slice(0, 30);
  const displayName = "Receiz ID";
  const deviceName = safeDeviceName();
  const created = await createEncryptedReceizKeyFile({
    allowP256Fallback: true,
    issuedAt: createdAt,
    owner: {
      uid: localUid,
      email: null,
      username,
      displayName,
    },
    portableState: {
      schema: "receiz.account.state.v3",
      exportedAt: createdAt,
      snapshot: {
        schema: RECEIZ_DEVICE_IDENTITY_SCHEMA,
        creationKaiMicroPulse: creationKaiMicroPulse.toString(),
        createdAt,
        account: {
          userId: localUid,
          email: null,
          username,
          displayName,
        },
        wallet: {
          schema: "receiz.wallet.settlement-portable.v1",
          account: {
            user_id: localUid,
            balance_phi_micro: "0",
            balance_phi: "0",
            balance_usd: "0.00",
          },
          userRollup: {
            user_id: localUid,
            total_credit_phi_micro: "0",
            total_debit_phi_micro: "0",
            total_credit_usd_cents: "0",
            total_debit_usd_cents: "0",
            transfer_count: 0,
            note_mint_count: 0,
            note_claim_count: 0,
            last_entry_at: null,
            last_entry_kai_upulse: null,
            last_entry_kai_pulse: null,
          },
        },
        identityKey: {
          keyId: "pending",
          authority: "receiz-device",
        },
      },
    },
  });

  const identity: StoredReceizDeviceIdentity = {
    schema: RECEIZ_DEVICE_IDENTITY_SCHEMA,
    creationKaiMicroPulse: creationKaiMicroPulse.toString(),
    familyRootKeyId: provenance?.familyRootKeyId?.trim() || null,
    createdByReceizKeyId: provenance?.createdByReceizKeyId?.trim() || null,
    createdByUserId: provenance?.createdByUserId?.trim() || null,
    createdAt,
    updatedAt: createdAt,
    localUid,
    username,
    displayName,
    deviceName,
    keyFile: created.keyFile,
  };
  await writeStoredReceizDeviceIdentity(identity);
  return identity;
}

export async function createAndActivateReceizDeviceIdentity(provenance?: Readonly<{
  familyRootKeyId?: string | null;
  createdByReceizKeyId?: string | null;
  createdByUserId?: string | null;
}>): Promise<StoredReceizDeviceIdentity> {
  const identity = await createReceizDeviceIdentity(provenance);
  admitReceizDeviceStrongestLocalSession(identity);
  return identity;
}

export async function activateReceizDeviceIdentity(keyId: string): Promise<StoredReceizDeviceIdentity> {
  await realizeReceizDeviceIdentityRegister([keyId.trim().toLowerCase()]);
  const identity = activateHeldReceizDeviceIdentity(keyId);
  admitReceizDeviceStrongestLocalSession(identity);
  return identity;
}

async function ensureReceizDeviceIdentityWithCreationState(): Promise<{
  identity: StoredReceizDeviceIdentity;
  created: boolean;
}> {
  await realizeReceizDeviceIdentityRegister("active");
  const existing = peekReceizDeviceIdentity();
  if (existing) return { identity: existing, created: false };
  return { identity: await createReceizDeviceIdentity(), created: true };
}

async function ensureReceizDeviceIdentityForAcceptedRecovery(): Promise<StoredReceizDeviceIdentity> {
  await realizeReceizDeviceIdentityRegister("active");
  return peekReceizDeviceIdentity() ?? createReceizDeviceIdentity();
}

function browserReportsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function createReceizDeviceChallengeB64Url(args: {
  purpose: "RECEIZ_DEVICE_SESSION_V1" | "RECEIZ_DEVICE_BIND_V1" | "RECEIZ_DEVICE_SWITCH_V1";
  keyId: string;
  localUid: string;
  createdAt?: string | null;
  creationKaiMicroPulse?: string | null;
  sessionUid?: string | null;
  targetUid?: string | null;
}): string {
  const nonceB64Url = base64UrlEncode(randomBytes(16));
  return base64UrlEncode(
    new TextEncoder().encode(
      ([
        args.purpose,
        `keyId=${args.keyId}`,
        `localUid=${args.localUid}`,
        args.createdAt ? `createdAt=${args.createdAt}` : "",
        args.creationKaiMicroPulse ? `creationKaiMicroPulse=${args.creationKaiMicroPulse}` : "",
        args.sessionUid ? `sessionUid=${args.sessionUid}` : "",
        args.targetUid ? `targetUid=${args.targetUid}` : "",
        `issuedAtMs=${Date.now()}`,
        `nonce=${nonceB64Url}`,
      ].filter(Boolean)).join("\n"),
    ),
  );
}

async function postReceizDeviceJson<T>(
  url: string,
  body: unknown,
  timeoutMs = RECEIZ_DEVICE_NETWORK_TIMEOUT_MS,
): Promise<{ ok: boolean; status: number; json: T }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), Math.max(500, Math.trunc(timeoutMs)));
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as T;
    return { ok: response.ok, status: response.status, json };
  } finally {
    window.clearTimeout(timeout);
  }
}

function admitReceizDeviceLocalSession(identity: StoredReceizDeviceIdentity): void {
  const session = writeOfflineIdentitySessionFromReceizDevice({
    keyFile: identity.keyFile,
    localUid: identity.localUid,
    deviceName: identity.deviceName,
    createdAt: identity.createdAt,
  });
  projectOfflineIdentitySessionToBootstrap(session);
  writeReceizDeviceLocalWalletTruth(identity, session.session);
  admitReceizAccountBinding({
    receizKeyId: identity.keyFile.keyId,
    localUid: identity.localUid,
    session: session.session,
    source: "receiz-device",
  });
}

/** Retain the verified source without switching the active identity or session. */
export async function prepareReceizDeviceIdentityKeySource(keyFile: ReceizKeyFile) {
    const proofStatus = await verifyReceizKeyPortableStateProof(keyFile);
    if (proofStatus === "invalid") throw new Error("portable_state_proof_invalid");
    const snapshot = asRecord(keyFile.portableState?.snapshot);
    const account = asRecord(snapshot?.account);
    const creationKaiMicroPulse = normalizeText(snapshot?.creationKaiMicroPulse);
    const createdAt = normalizeText(snapshot?.createdAt) || keyFile.issuedAt;
    const username = normalizeText(account?.username)
      || keyFile.owner.username
      || `receiz_${keyFile.keyId.slice(0, 18)}`;
    const displayName = normalizeText(account?.displayName)
      || keyFile.owner.displayName
      || "Receiz ID";
    const identity = Object.freeze({
      schema: RECEIZ_DEVICE_IDENTITY_SCHEMA,
      creationKaiMicroPulse: /^-?[0-9]+$/u.test(creationKaiMicroPulse) ? creationKaiMicroPulse : null,
      familyRootKeyId: keyFile.keyId,
      createdByReceizKeyId: null,
      createdByUserId: null,
      createdAt,
      updatedAt: normalizeText(keyFile.portableState?.exportedAt) || createdAt,
      localUid: keyFile.owner.uid,
      username,
      displayName,
      deviceName: safeDeviceName(),
      keyFile: keyFile,
    });
    await prepareReceizDeviceIdentityRegister([identity]);
    return identity;
}

/** Verify and retain the complete source before publishing any session/projection. */
export async function admitReceizDeviceIdentityKeySource(keyFile: ReceizKeyFile) {
    return admitReceizDeviceIdentityToRegister(await prepareReceizDeviceIdentityKeySource(keyFile), true);
}

export async function admitReceizDeviceLocalAccountSession(args: {
  session: unknown;
  source: "receiz-key" | "pbi" | "email";
  pbiBound?: boolean;
  emailBound?: boolean;
  keyFile?: ReceizKeyFile;
}): Promise<StoredReceizDeviceIdentity> {
  const identity = args.keyFile
    ? (await admitReceizDeviceIdentityKeySource(args.keyFile)).selected
    : await ensureReceizDeviceIdentityForAcceptedRecovery();
  const offlineSession = writeOfflineIdentitySessionFromReceizDevice({
    keyFile: identity.keyFile,
    localUid: identity.localUid,
    deviceName: identity.deviceName,
    createdAt: identity.createdAt,
    verifiedSession: args.session,
    boundToServer: false,
  });
  projectOfflineIdentitySessionToBootstrap(offlineSession);
  writeReceizDeviceLocalWalletTruth(identity, offlineSession.session);
  admitReceizAccountBinding({
    receizKeyId: identity.keyFile.keyId,
    localUid: identity.localUid,
    session: offlineSession.session,
    source: args.source,
    serverBound: false,
    pbiBound: args.pbiBound === true || args.source === "pbi",
    emailBound:
      args.emailBound === true ||
      Boolean(offlineSession.session.email && !isReceizDeviceSyntheticEmail(offlineSession.session.email)),
  });
  return identity;
}

function admitReceizDeviceServerSession(args: {
  identity: StoredReceizDeviceIdentity;
  session: unknown;
  wallet?: WalletRouteHydrationSummary | null;
}): void {
  const session = writeOfflineIdentitySessionFromReceizDevice({
    keyFile: args.identity.keyFile,
    localUid: args.identity.localUid,
    deviceName: args.identity.deviceName,
    createdAt: args.identity.createdAt,
    verifiedSession: args.session,
    boundToServer: true,
  });
  projectOfflineIdentitySessionToBootstrap(session);
  writeReceizDeviceLocalWalletTruth(args.identity, session.session);
  admitReceizAccountBinding({
    receizKeyId: args.identity.keyFile.keyId,
    localUid: args.identity.localUid,
    session: session.session,
    source: "receiz-device-bound",
    serverBound: true,
    emailBound: Boolean(session.session.email),
  });
  admitAuthenticatedWalletProjectionAfterIdentityProof(args.wallet);
}

function admitReceizDeviceServerAccountBindings(args: {
  identity: StoredReceizDeviceIdentity;
  accountBindings: unknown;
}): void {
  if (!Array.isArray(args.accountBindings)) return;
  for (const rawBinding of args.accountBindings) {
    if (!rawBinding || typeof rawBinding !== "object" || Array.isArray(rawBinding)) continue;
    const binding = rawBinding as {
      localUid?: unknown;
      session?: unknown;
      serverBound?: unknown;
      emailBound?: unknown;
      pbiBound?: unknown;
    };
    if (!binding.session) continue;
    try {
      admitReceizAccountBinding({
        receizKeyId: args.identity.keyFile.keyId,
        localUid: typeof binding.localUid === "string" && binding.localUid.trim() ? binding.localUid.trim() : args.identity.localUid,
        session: binding.session,
        source: "receiz-device-bound",
        serverBound: binding.serverBound === true,
        emailBound: binding.emailBound === true,
        pbiBound: binding.pbiBound === true,
        makeActive: false,
      });
    } catch {
      // Malformed remote propagation cannot downgrade the local binding register.
    }
  }
}

function strongestLocalReceizAccountBindingForDevice(identity: StoredReceizDeviceIdentity) {
  const active = peekActiveReceizAccountBinding();
  if (active?.receizKeyId === identity.keyFile.keyId) return active;
  return listReceizAccountBindings(identity.keyFile.keyId)[0] ?? null;
}

function sessionUidFromPayload(session: unknown): string | null {
  if (!session || typeof session !== "object") return null;
  const uid = normalizeText((session as { uid?: unknown }).uid);
  return uid || null;
}

function strongerLocalBindingThanServerSession(
  identity: StoredReceizDeviceIdentity,
  serverSession: unknown,
): ReceizAccountBinding | null {
  const binding = strongestLocalReceizAccountBindingForDevice(identity);
  if (!binding?.session.uid) return null;
  const serverUid = sessionUidFromPayload(serverSession);
  if (!serverUid || serverUid === binding.session.uid) return null;
  const bindingHasAccountAuthority =
    binding.pbiBound ||
    binding.emailBound ||
    binding.serverBound ||
    binding.sources.some((source) => source !== "receiz-device");
  return bindingHasAccountAuthority ? binding : null;
}

function admitReceizDeviceStrongestLocalSession(identity: StoredReceizDeviceIdentity): void {
  const binding = strongestLocalReceizAccountBindingForDevice(identity);
  if (binding?.session?.uid) {
    const active = peekActiveReceizAccountBinding();
    if (active?.id !== binding.id) {
      switchReceizAccountBinding(binding.id);
    }
    const session = writeOfflineIdentitySessionFromReceizDevice({
      keyFile: identity.keyFile,
      localUid: binding.localUid ?? identity.localUid,
      deviceName: identity.deviceName,
      createdAt: identity.createdAt,
      verifiedSession: binding.session,
      boundToServer: binding.serverBound,
    });
    projectOfflineIdentitySessionToBootstrap(session);
    writeReceizDeviceLocalWalletTruth(identity, session.session);
    return;
  }

  admitReceizDeviceLocalSession(identity);
}

function prepareReceizDeviceLocalProfileTruth(): string | null {
  const seed = seedProfileWorkspaceFromLocalSession();
  if (!seed?.profile?.profile?.username) return null;
  writeProfileWorkspaceHydrationSeed(seed);
  prepareProfileRouteTransition(seed.profile.profile.username);
  prepareProfileWorkspaceFastEntryHint();
  return seed.profile.profile.username;
}

async function continueReceizDeviceOnServer(args: {
  identity: StoredReceizDeviceIdentity;
  nextPath: string;
  timeoutMs?: number;
  createIndependentAccount?: boolean;
}): Promise<ReceizDeviceContinueResponse | null> {
  if (browserReportsOffline()) return null;
  const challengeB64Url = createReceizDeviceChallengeB64Url({
    purpose: "RECEIZ_DEVICE_SESSION_V1",
    keyId: args.identity.keyFile.keyId,
    localUid: args.identity.localUid,
    createdAt: args.identity.createdAt,
    creationKaiMicroPulse: args.identity.creationKaiMicroPulse,
  });
  const signed = await signIdentityKeyChallenge({
    keyFile: args.identity.keyFile,
    challengeB64Url,
  });
  const response = await postReceizDeviceJson<ReceizDeviceContinueResponse>(
    "/api/auth/receiz-id/continue",
    {
      keyId: args.identity.keyFile.keyId,
      alg: args.identity.keyFile.alg,
      publicKeyRawB64u: args.identity.keyFile.crypto.publicKeyRawB64u,
      localUid: args.identity.localUid,
      username: args.identity.username,
      displayName: args.identity.displayName,
      deviceName: args.identity.deviceName,
      createdAt: args.identity.createdAt,
      creationKaiMicroPulse: args.identity.creationKaiMicroPulse,
      createIndependentAccount: args.createIndependentAccount === true,
      familyRootKeyId: args.identity.familyRootKeyId ?? null,
      createdByReceizKeyId: args.identity.createdByReceizKeyId ?? null,
      createdByUserId: args.identity.createdByUserId ?? null,
      challengeB64Url,
      signatureB64Url: signed.signatureB64Url,
      next: args.nextPath,
    },
    args.timeoutMs,
  );
  if (!response.ok || !response.json.ok || !response.json.session) return null;
  return response.json;
}

export async function continueWithReceiz(args: { nextPath: string; serverTimeoutMs?: number }): Promise<ReceizDeviceResult> {
  if (receizIdPrimaryLoginRequiresLegacyPbiForBrowser()) {
    throw new Error("identity_key_not_supported");
  }
  const { identity, created } = await ensureReceizDeviceIdentityWithCreationState();
  assertReceizDeviceIdentityPrimarySupported(identity);
  admitReceizDeviceStrongestLocalSession(identity);
  const projectedUsername = prepareReceizDeviceLocalProfileTruth() ?? identity.username;
  prepareManagedProfileFastEntryHintForUsername(projectedUsername);
  const localNextPath = localContinuityPath(args.nextPath, projectedUsername);
  void publishReceizDeviceSessionToServer({
    nextPath: localNextPath,
    serverTimeoutMs: args.serverTimeoutMs ?? RECEIZ_DEVICE_BACKGROUND_COOKIE_TIMEOUT_MS,
    force: true,
  }).catch(() => null);

  return {
    nextPath: localNextPath,
    keyId: identity.keyFile.keyId,
    localUid: identity.localUid,
    username: projectedUsername,
    created,
    offline: true,
    serverBound: false,
  };
}

function publishedSessionWithHeldPresentation(identity: StoredReceizDeviceIdentity, payload: unknown, allowCreatedAccountAlias = false): unknown {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return payload;
  const session = payload as Record<string, unknown>;
  const userId = sessionUidFromPayload(session);
  const bindings = listReceizAccountBindings(identity.keyFile.keyId);
  const held = bindings.find((binding) => binding.session.uid === userId)
    ?? (allowCreatedAccountAlias ? bindings.find((binding) => binding.session.uid === identity.localUid) : undefined);
  if (!held) return payload;
  return {
    ...session,
    username: held.session.username ?? session.username,
    displayName: held.session.displayName ?? session.displayName,
  };
}

function retryReceizDeviceProfilePublication(identity: StoredReceizDeviceIdentity, userId: string, nextPath: string): void {
  if (receizDeviceProfilePublishRetry !== null) window.clearTimeout(receizDeviceProfilePublishRetry);
  receizDeviceProfilePublishRetry = window.setTimeout(() => {
    receizDeviceProfilePublishRetry = null;
    if (peekReceizDeviceIdentity()?.keyFile.keyId !== identity.keyFile.keyId) return;
    if (isOfflineIdentitySessionExplicitlyLoggedOut()) return;
    const active = peekActiveReceizAccountBinding();
    if (active && active.session.uid !== userId && active.session.uid !== identity.localUid) return;
    // Delivery retries sign the same durable identity. They never recover content
    // or rebuild the complete head already admitted on this device.
    void publishReceizDeviceSessionToServer({ nextPath, force: true }).catch(() => null);
  }, 30_000);
}

export async function publishReceizDeviceSessionToServer(args: {
  nextPath: string;
  serverTimeoutMs?: number;
  force?: boolean;
  createIndependentAccount?: boolean;
}): Promise<ReceizDeviceResult | null> {
  if (browserReportsOffline()) return null;
  if (!args.force && isOfflineIdentitySessionExplicitlyLoggedOut()) return null;
  if (!args.force && Date.now() < receizDeviceServerPublishRetryAfterMs) return null;
  await realizeReceizDeviceIdentityRegister("active");
  const identity = peekReceizDeviceIdentity();
  if (!identity) return null;
  if (!receizDeviceIdentityIsPrimarySupported(identity)) return null;
  const normalizedNextPath = normalizeClientNextPath(args.nextPath);

  let server: ReceizDeviceContinueResponse | null = null;
  try {
    server = await continueReceizDeviceOnServer({
      identity,
      nextPath: normalizedNextPath,
      timeoutMs: args.serverTimeoutMs ?? RECEIZ_DEVICE_BACKGROUND_COOKIE_TIMEOUT_MS,
      createIndependentAccount: args.createIndependentAccount === true,
    });
  } catch {
    server = null;
  }
  if (!server?.session) {
    receizDeviceServerPublishRetryAfterMs = Date.now() + 30_000;
    return null;
  }
  receizDeviceServerPublishRetryAfterMs = 0;
  requestServiceWorkerSessionSync();
  server.session = publishedSessionWithHeldPresentation(identity, server.session, server.created === true && server.bound === true);
  const publishedUserId = sessionUidFromPayload(server.session);
  // A successful first publication aliases this original local account. Recovery
  // and later device bindings never enter this account-birth projection.
  if (server.created === true && server.bound === true && publishedUserId) {
    const creation = accountIdentityCreationFromPortableSource({
      ownerUserId: identity.keyFile.owner.uid, profileUserId: identity.localUid,
      snapshot: identity.keyFile.portableState?.snapshot,
    });
    if (creation?.creationKaiMicroPulse) {
      const seed = buildProfileIdentityArtworkSvgSet({ userId: publishedUserId,
        createdAt: creation.createdAt, creationKaiMicroPulse: creation.creationKaiMicroPulse,
        receizId: identity.username });
      readOrAdmitProfileIdentityGenesis({ profileUserId: publishedUserId,
        createdAt: creation.createdAt, creationKaiMicroPulse: creation.creationKaiMicroPulse,
        genesisReceizId: identity.username, baseSeedHash: seed.baseSeedHash });
    }
  }
  if (server.profileProjectionPending && publishedUserId) {
    retryReceizDeviceProfilePublication(identity, publishedUserId, normalizedNextPath);
  } else if (receizDeviceProfilePublishRetry !== null) {
    window.clearTimeout(receizDeviceProfilePublishRetry);
    receizDeviceProfilePublishRetry = null;
  }
  server.accountBindings = server.accountBindings?.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
    const binding = raw as Record<string, unknown>;
    return { ...binding, session: sessionUidFromPayload(binding.session) === publishedUserId
      ? server.session : publishedSessionWithHeldPresentation(identity, binding.session) };
  });
  admitReceizDeviceServerAccountBindings({ identity, accountBindings: server.accountBindings });
  const preservedLocalBinding = strongerLocalBindingThanServerSession(identity, server.session);
  if (preservedLocalBinding) {
    switchReceizAccountBinding(preservedLocalBinding.id);
    const projectedUsername = prepareReceizDeviceLocalProfileTruth() ?? preservedLocalBinding.session.username ?? identity.username;
    return {
      nextPath: localContinuityPath(normalizedNextPath, projectedUsername),
      keyId: identity.keyFile.keyId,
      localUid: identity.localUid,
      username: projectedUsername,
      created: Boolean(server.created),
      offline: true,
      serverBound: false,
      session: preservedLocalBinding.session,
    };
  }
  admitReceizDeviceServerSession({
    identity,
    session: server.session,
    wallet: server.wallet,
  });
  prepareReceizDeviceLocalProfileTruth();

  const resolvedNextPath =
    typeof server.next === "string" && server.next.startsWith("/")
      ? server.next
      : localContinuityPath(normalizedNextPath, identity.username);

  return {
    nextPath: resolvedNextPath,
    keyId: identity.keyFile.keyId,
    localUid: identity.localUid,
    username: identity.username,
    created: Boolean(server.created),
    offline: false,
    serverBound: true,
    session: server.session,
  };
}

export async function bindReceizDeviceIdToCurrentSession(args?: {
  nextPath?: string;
  serverTimeoutMs?: number;
}): Promise<ReceizDeviceResult> {
  await realizeReceizDeviceIdentityRegister("active");
  const identity = peekReceizDeviceIdentity();
  if (!identity) throw new Error("receiz_identity_admission_required");
  assertReceizDeviceIdentityPrimarySupported(identity);
  const sessionUid =
    peekSessionBootstrapSnapshot(true)?.uid?.trim()
    || strongestLocalReceizAccountBindingForDevice(identity)?.session.uid?.trim()
    || "";
  if (!sessionUid) throw new Error("signin_required");
  const nextPath = normalizeClientNextPath(args?.nextPath ?? "/account");
  const challengeB64Url = createReceizDeviceChallengeB64Url({
    purpose: "RECEIZ_DEVICE_BIND_V1",
    keyId: identity.keyFile.keyId,
    localUid: identity.localUid,
    sessionUid,
  });
  const signed = await signIdentityKeyChallenge({
    keyFile: identity.keyFile,
    challengeB64Url,
  });
  const response = await postReceizDeviceJson<ReceizDeviceContinueResponse>(
    "/api/auth/receiz-id/bind",
    {
      keyId: identity.keyFile.keyId,
      alg: identity.keyFile.alg,
      publicKeyRawB64u: identity.keyFile.crypto.publicKeyRawB64u,
      localUid: identity.localUid,
      username: identity.username,
      displayName: identity.displayName,
      deviceName: identity.deviceName,
      challengeB64Url,
      signatureB64Url: signed.signatureB64Url,
      next: nextPath,
    },
    args?.serverTimeoutMs ?? RECEIZ_DEVICE_BACKGROUND_COOKIE_TIMEOUT_MS,
  );
  if (!response.ok || !response.json.ok || !response.json.session) {
    throw new Error(response.json.error || "receiz_device_bind_failed");
  }
  admitReceizDeviceServerSession({ identity, session: response.json.session });
  return {
    nextPath: typeof response.json.next === "string" && response.json.next.startsWith("/") ? response.json.next : nextPath,
    keyId: identity.keyFile.keyId,
    localUid: identity.localUid,
    username: identity.username,
    offline: false,
    serverBound: true,
    session: response.json.session,
  };
}

export async function switchReceizDeviceAccountOnServer(args: {
  targetUid: string;
  nextPath?: string;
  serverTimeoutMs?: number;
}): Promise<ReceizDeviceResult> {
  await realizeReceizDeviceIdentityRegister("active");
  const identity = peekReceizDeviceIdentity();
  if (!identity) throw new Error("receiz_identity_admission_required");
  assertReceizDeviceIdentityPrimarySupported(identity);
  const targetUid = args.targetUid.trim();
  if (!targetUid) throw new Error("receiz_device_switch_target_required");
  const nextPath = normalizeClientNextPath(args.nextPath ?? "/account");
  const challengeB64Url = createReceizDeviceChallengeB64Url({
    purpose: "RECEIZ_DEVICE_SWITCH_V1",
    keyId: identity.keyFile.keyId,
    localUid: identity.localUid,
    targetUid,
  });
  const signed = await signIdentityKeyChallenge({
    keyFile: identity.keyFile,
    challengeB64Url,
  });
  const response = await postReceizDeviceJson<ReceizDeviceContinueResponse>(
    "/api/auth/receiz-id/switch",
    {
      keyId: identity.keyFile.keyId,
      alg: identity.keyFile.alg,
      publicKeyRawB64u: identity.keyFile.crypto.publicKeyRawB64u,
      localUid: identity.localUid,
      targetUid,
      challengeB64Url,
      signatureB64Url: signed.signatureB64Url,
      next: nextPath,
    },
    args.serverTimeoutMs,
  );
  if (!response.ok || !response.json.ok || !response.json.session) {
    throw new Error(response.json.error || "receiz_device_switch_failed");
  }
  admitReceizDeviceServerSession({ identity, session: response.json.session });
  return {
    nextPath: typeof response.json.next === "string" && response.json.next.startsWith("/") ? response.json.next : nextPath,
    keyId: identity.keyFile.keyId,
    localUid: identity.localUid,
    username: identity.username,
    offline: false,
    serverBound: true,
    session: response.json.session,
  };
}

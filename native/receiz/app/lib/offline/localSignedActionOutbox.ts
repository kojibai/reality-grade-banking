"use client";

import {
  isOfflineIdentitySessionExplicitlyLoggedOut,
  peekOfflineIdentitySession,
} from "@/app/lib/auth/offlineIdentitySession";
import {
  peekActiveReceizAccountBindingWithAccountAuthority,
  projectReceizAccountBinding,
} from "@/app/lib/auth/receizAccountBindings";
import { peekReceizDeviceIdentity, type StoredReceizDeviceIdentity } from "@/app/lib/auth/receizDeviceIdentity";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import {
  base64UrlEncode,
  normalizeIdentityKeyId,
  signIdentityKeyChallenge,
} from "@/app/utils/receizIdentityKey";
import { jcsCanonicalize } from "@/app/utils/jcs";

const LOCAL_SIGNED_ACTION_SCHEMA = "receiz.local.signed-action.v1";
const LOCAL_SIGNED_ACTION_OUTBOX_SCHEMA = "receiz.local.signed-action-outbox.v1";
const LOCAL_SIGNED_ACTION_OUTBOX_STORAGE_KEY = "receiz.local.signed-action-outbox.v1";
const LOCAL_SIGNED_ACTION_FETCH_BRIDGE_KEY = "__receizLocalSignedActionOutboxFetchBridgeV1__";
const LOCAL_SIGNED_ACTION_REPLAY_HEADER = "x-receiz-local-outbox-replay";
const LOCAL_SIGNED_ACTION_MAX_REPLAY_BODY_CHARS = 96_000;
const LOCAL_SIGNED_ACTION_MAX_ENTRIES = 240;
const LOCAL_SIGNED_ACTION_MAX_REPLAY_ATTEMPTS = 8;
const LOCAL_SIGNED_ACTION_FLUSH_DELAY_MS = 360;
const HEX64_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REPLAYABLE_CONTENT_TYPES = [
  "application/json",
  "application/ld+json",
  "text/plain",
  "application/x-www-form-urlencoded",
];
const EXCLUDED_API_PREFIXES = [
  "/api/auth/",
  "/api/connect/login/",
  "/api/events",
  "/api/oidc/",
  "/api/perf/",
  "/api/profile/analytics/",
  // Public proof-object append transport is already bound by the sealed
  // artifact, manifest, package, and segment digests. It is not a private
  // account action and must never be copied into a signed-action header.
  "/api/proof-material/packages/",
  // Foreground proof publication owns its own anchor contract. The generic
  // outbox must not sign, replay, or inspect this response before the composer.
  "/api/receiz/anchor",
  "/api/receiz/identity/profile",
  "/api/receiz/ownership/bearer-claim",
  "/api/session",
  "/api/status",
  "/api/wireproof/health",
];
const NO_AUTOMATIC_REPLAY_API_PREFIXES = [
  "/api/chat",
  "/api/connect/payments",
  "/api/connect/transfers",
  "/api/payments",
  "/api/stripe",
];

export const LOCAL_SIGNED_ACTION_OUTBOX_EVENT = "receiz:local-signed-action-outbox";

export type LocalSignedActionStatus = "pending" | "propagated" | "failed";

export type LocalSignedActionEnvelope = {
  schema: typeof LOCAL_SIGNED_ACTION_SCHEMA;
  actionId: string;
  actionKind: string;
  scope: string;
  createdAt: string;
  actor: {
    uid: string;
    email: string | null;
    username: string | null;
    displayName: string | null;
    receizKeyId: string;
    localUid: string;
    publicKeyRawB64u: string;
  };
  request: {
    method: string;
    path: string;
    contentType: string | null;
    bodyHashHex: string | null;
    bodyReplayText: string | null;
    replayable: boolean;
  };
};

export type LocalSignedActionOutboxEntry = {
  actionId: string;
  status: LocalSignedActionStatus;
  envelope: LocalSignedActionEnvelope;
  challengeB64Url: string;
  signatureB64Url: string;
  createdAtMs: number;
  updatedAtMs: number;
  propagationAttempts: number;
  propagatedAtMs: number | null;
  failedAtMs: number | null;
  lastPropagationStatus: number | null;
  lastError: string | null;
};

export type LocalSignedActionOutbox = {
  schema: typeof LOCAL_SIGNED_ACTION_OUTBOX_SCHEMA;
  updatedAtMs: number;
  entries: Record<string, LocalSignedActionOutboxEntry>;
};

type FetchDescriptor = {
  method: string;
  path: string;
  contentType: string | null;
  bodyText: string | null;
  replayable: boolean;
};

type FetchBridgeState = {
  originalFetch: typeof fetch;
  uninstall: () => void;
};

type LocalSignedActionActor = LocalSignedActionEnvelope["actor"];

declare global {
  interface Window {
    __receizLocalSignedActionOutboxFetchBridgeV1__?: FetchBridgeState;
  }
}

let localSignedActionFlushPromise: Promise<void> | null = null;

function nowMs(): number {
  return Date.now();
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized : null;
}

function normalizeActionStatus(value: unknown): LocalSignedActionStatus {
  if (value === "propagated" || value === "failed") return value;
  return "pending";
}

function emptyOutbox(): LocalSignedActionOutbox {
  return {
    schema: LOCAL_SIGNED_ACTION_OUTBOX_SCHEMA,
    updatedAtMs: 0,
    entries: {},
  };
}

function textToBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function toStrictArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((part) => part.toString(16).padStart(2, "0"))
    .join("");
}

function randomNonceB64Url(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", toStrictArrayBuffer(textToBytes(value)));
  return bytesToHex(new Uint8Array(digest));
}

function sameOriginApiPath(url: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = new URL(url, window.location.href);
    if (parsed.origin !== window.location.origin) return null;
    if (!parsed.pathname.startsWith("/api/")) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

function isExcludedApiPath(path: string): boolean {
  const pathname = path.split("?").at(0) ?? path;
  return EXCLUDED_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

function requestHasReplayHeader(request: Request): boolean {
  return request.headers.get(LOCAL_SIGNED_ACTION_REPLAY_HEADER) === "1";
}

function contentTypeAllowsReplay(contentType: string | null): boolean {
  if (!contentType) return true;
  const normalized = contentType.toLowerCase();
  return REPLAYABLE_CONTENT_TYPES.some((candidate) => normalized.includes(candidate));
}

function pathAllowsAutomaticReplay(path: string): boolean {
  const pathname = path.split("?").at(0) ?? path;
  return !NO_AUTOMATIC_REPLAY_API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function requestUsesHeaderAuthentication(request: Request): boolean {
  return Boolean(request.headers.get("authorization"));
}

function classifyAction(path: string, method: string): { scope: string; actionKind: string } {
  const pathname = path.split("?").at(0) ?? path;
  const normalizedMethod = method.toLowerCase();
  const byPrefix: Array<[string, string]> = [
    ["/api/wallet", "wallet"],
    ["/api/connect/wallet", "wallet"],
    ["/api/connect/transfers", "wallet"],
    ["/api/connect/payments", "payments"],
    ["/api/stripe/wallet", "wallet"],
    ["/api/market", "market"],
    ["/api/profile", "profile"],
    ["/api/world", "world"],
    ["/api/chat", "chat"],
    ["/api/calendar", "calendar"],
    ["/api/contacts", "contacts"],
    ["/api/connect/record", "proof"],
    ["/api/connect/seal", "proof"],
    ["/api/connect/verify", "proof"],
    ["/api/document-seal", "proof"],
    ["/api/document-verify", "proof"],
  ];
  const scope = byPrefix.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? "private";
  return {
    scope,
    actionKind: `receiz.${scope}.${normalizedMethod}`,
  };
}

async function describeFetchForLocalSignedAction(input: RequestInfo | URL, init?: RequestInit): Promise<FetchDescriptor | null> {
  if (typeof window === "undefined") return null;
  let request: Request;
  try {
    request = input instanceof Request ? new Request(input, init) : new Request(input, init);
  } catch {
    return null;
  }

  const method = request.method.toUpperCase();
  if (!UNSAFE_METHODS.has(method)) return null;
  if (requestHasReplayHeader(request)) return null;

  const path = sameOriginApiPath(request.url);
  if (!path || isExcludedApiPath(path)) return null;

  let bodyText: string | null = null;
  try {
    bodyText = await request.clone().text();
  } catch {
    bodyText = null;
  }

  const contentType = normalizeNullableText(request.headers.get("content-type"));
  const replayable =
    bodyText !== null &&
    bodyText.length <= LOCAL_SIGNED_ACTION_MAX_REPLAY_BODY_CHARS &&
    contentTypeAllowsReplay(contentType) &&
    !requestUsesHeaderAuthentication(request) &&
    pathAllowsAutomaticReplay(path);

  return {
    method,
    path,
    contentType,
    bodyText,
    replayable,
  };
}

function normalizeEnvelope(value: unknown): LocalSignedActionEnvelope | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalSignedActionEnvelope>;
  if (record.schema !== LOCAL_SIGNED_ACTION_SCHEMA) return null;
  const actionId = normalizeText(record.actionId).toLowerCase();
  const actionKind = normalizeText(record.actionKind);
  const scope = normalizeText(record.scope);
  const createdAt = normalizeText(record.createdAt);
  const actor = record.actor;
  const request = record.request;
  if (!HEX64_RE.test(actionId) || !actionKind || !scope || !createdAt || !actor || !request) return null;
  const receizKeyId = normalizeIdentityKeyId(actor.receizKeyId);
  const publicKeyRawB64u = normalizeText(actor.publicKeyRawB64u);
  const localUid = normalizeText(actor.localUid);
  const uid = normalizeText(actor.uid);
  const method = normalizeText(request.method).toUpperCase();
  const path = normalizeText(request.path);
  const bodyHashHex = normalizeNullableText(request.bodyHashHex)?.toLowerCase() ?? null;
  const bodyReplayText = typeof request.bodyReplayText === "string" ? request.bodyReplayText : null;
  if (
    !receizKeyId ||
    !BASE64URL_RE.test(publicKeyRawB64u) ||
    !localUid ||
    !uid ||
    !UNSAFE_METHODS.has(method) ||
    !path.startsWith("/api/") ||
    (bodyHashHex !== null && !HEX64_RE.test(bodyHashHex))
  ) {
    return null;
  }

  return {
    schema: LOCAL_SIGNED_ACTION_SCHEMA,
    actionId,
    actionKind,
    scope,
    createdAt,
    actor: {
      uid,
      email: normalizeNullableText(actor.email),
      username: normalizeNullableText(actor.username),
      displayName: normalizeNullableText(actor.displayName),
      receizKeyId,
      localUid,
      publicKeyRawB64u,
    },
    request: {
      method,
      path,
      contentType: normalizeNullableText(request.contentType),
      bodyHashHex,
      bodyReplayText,
      replayable: request.replayable === true,
    },
  };
}

function normalizeEntry(value: unknown): LocalSignedActionOutboxEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalSignedActionOutboxEntry>;
  const envelope = normalizeEnvelope(record.envelope);
  const actionId = normalizeText(record.actionId).toLowerCase();
  const challengeB64Url = normalizeText(record.challengeB64Url);
  const signatureB64Url = normalizeText(record.signatureB64Url);
  const createdAtMs = Number(record.createdAtMs);
  const updatedAtMs = Number(record.updatedAtMs);
  if (
    !envelope ||
    actionId !== envelope.actionId ||
    !BASE64URL_RE.test(challengeB64Url) ||
    !BASE64URL_RE.test(signatureB64Url) ||
    !Number.isFinite(createdAtMs)
  ) {
    return null;
  }
  return {
    actionId,
    status: normalizeActionStatus(record.status),
    envelope,
    challengeB64Url,
    signatureB64Url,
    createdAtMs,
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : createdAtMs,
    propagationAttempts: Math.max(0, Math.trunc(Number(record.propagationAttempts) || 0)),
    propagatedAtMs: Number.isFinite(record.propagatedAtMs) ? Number(record.propagatedAtMs) : null,
    failedAtMs: Number.isFinite(record.failedAtMs) ? Number(record.failedAtMs) : null,
    lastPropagationStatus: Number.isFinite(record.lastPropagationStatus) ? Number(record.lastPropagationStatus) : null,
    lastError: normalizeNullableText(record.lastError),
  };
}

function parseOutbox(raw: string | null): LocalSignedActionOutbox {
  if (!raw) return emptyOutbox();
  try {
    const parsed = JSON.parse(raw) as Partial<LocalSignedActionOutbox> | null;
    if (!parsed || typeof parsed !== "object" || parsed.schema !== LOCAL_SIGNED_ACTION_OUTBOX_SCHEMA) return emptyOutbox();
    if (!parsed.entries || typeof parsed.entries !== "object" || Array.isArray(parsed.entries)) return emptyOutbox();
    const entries: Record<string, LocalSignedActionOutboxEntry> = {};
    for (const rawEntry of Object.values(parsed.entries)) {
      const entry = normalizeEntry(rawEntry);
      if (entry) entries[entry.actionId] = entry;
    }
    return {
      schema: LOCAL_SIGNED_ACTION_OUTBOX_SCHEMA,
      updatedAtMs: Number.isFinite(parsed.updatedAtMs) ? Number(parsed.updatedAtMs) : 0,
      entries,
    };
  } catch {
    return emptyOutbox();
  }
}

export function readLocalSignedActionOutbox(): LocalSignedActionOutbox {
  return parseOutbox(readDurableLocalTruthItem(LOCAL_SIGNED_ACTION_OUTBOX_STORAGE_KEY));
}

function pruneEntries(entries: Record<string, LocalSignedActionOutboxEntry>): Record<string, LocalSignedActionOutboxEntry> {
  return Object.fromEntries(
    Object.values(entries)
      .sort((left, right) => right.updatedAtMs - left.updatedAtMs || right.createdAtMs - left.createdAtMs)
      .slice(0, LOCAL_SIGNED_ACTION_MAX_ENTRIES)
      .map((entry) => [entry.actionId, entry]),
  );
}

function writeLocalSignedActionOutbox(outbox: LocalSignedActionOutbox): void {
  writeDurableLocalTruthItem(
    LOCAL_SIGNED_ACTION_OUTBOX_STORAGE_KEY,
    JSON.stringify({
      ...outbox,
      entries: pruneEntries(outbox.entries),
    }),
    {
      rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
      source: "local-signed-action-outbox",
      allowSameRankOverwrite: true,
    },
  );
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LOCAL_SIGNED_ACTION_OUTBOX_EVENT));
  }
}

function updateLocalSignedActionEntry(
  actionId: string,
  update: (entry: LocalSignedActionOutboxEntry) => LocalSignedActionOutboxEntry,
): void {
  const outbox = readLocalSignedActionOutbox();
  const existing = outbox.entries[actionId];
  if (!existing) return;
  const updated = update(existing);
  writeLocalSignedActionOutbox({
    schema: LOCAL_SIGNED_ACTION_OUTBOX_SCHEMA,
    updatedAtMs: nowMs(),
    entries: {
      ...outbox.entries,
      [actionId]: updated,
    },
  });
}

export function markLocalSignedActionPropagated(args: {
  actionId: string;
  status?: number | null;
}): void {
  const actionId = normalizeText(args.actionId).toLowerCase();
  if (!HEX64_RE.test(actionId)) return;
  updateLocalSignedActionEntry(actionId, (entry) => ({
    ...entry,
    status: "propagated",
    updatedAtMs: nowMs(),
    propagatedAtMs: nowMs(),
    failedAtMs: null,
    lastPropagationStatus: Number.isFinite(args.status) ? Number(args.status) : entry.lastPropagationStatus,
    lastError: null,
  }));
}

export function markLocalSignedActionPending(args: {
  actionId: string;
  status?: number | null;
  error?: string | null;
  countAttempt?: boolean;
}): void {
  const actionId = normalizeText(args.actionId).toLowerCase();
  if (!HEX64_RE.test(actionId)) return;
  updateLocalSignedActionEntry(actionId, (entry) => ({
    ...entry,
    status: "pending",
    updatedAtMs: nowMs(),
    propagationAttempts: entry.propagationAttempts + (args.countAttempt ? 1 : 0),
    lastPropagationStatus: Number.isFinite(args.status) ? Number(args.status) : entry.lastPropagationStatus,
    lastError: normalizeNullableText(args.error) ?? entry.lastError,
  }));
}

export function markLocalSignedActionFailed(args: {
  actionId: string;
  status?: number | null;
  error?: string | null;
}): void {
  const actionId = normalizeText(args.actionId).toLowerCase();
  if (!HEX64_RE.test(actionId)) return;
  updateLocalSignedActionEntry(actionId, (entry) => ({
    ...entry,
    status: "failed",
    updatedAtMs: nowMs(),
    failedAtMs: nowMs(),
    lastPropagationStatus: Number.isFinite(args.status) ? Number(args.status) : entry.lastPropagationStatus,
    lastError: normalizeNullableText(args.error) ?? "propagation_failed",
  }));
}

function localSignedActionActorFromOfflineSession(identity: StoredReceizDeviceIdentity): LocalSignedActionActor | null {
  const session = peekOfflineIdentitySession();
  if (!session || session.keyId !== identity.keyFile.keyId || isOfflineIdentitySessionExplicitlyLoggedOut(session)) return null;
  const keyId = normalizeIdentityKeyId(identity.keyFile.keyId);
  if (!keyId) return null;
  return {
    uid: session.session.uid,
    email: session.session.email,
    username: session.session.username,
    displayName: session.session.displayName,
    receizKeyId: keyId,
    localUid: session.receizDevice?.localUid ?? identity.localUid,
    publicKeyRawB64u: identity.keyFile.crypto.publicKeyRawB64u,
  };
}

function localSignedActionActorFromActiveBinding(identity: StoredReceizDeviceIdentity): LocalSignedActionActor | null {
  const keyId = normalizeIdentityKeyId(identity.keyFile.keyId);
  if (!keyId) return null;
  const binding = peekActiveReceizAccountBindingWithAccountAuthority();
  if (!binding || binding.receizKeyId !== keyId) return null;
  projectReceizAccountBinding(binding);
  return {
    uid: binding.session.uid,
    email: binding.session.email,
    username: binding.session.username,
    displayName: binding.session.displayName,
    receizKeyId: keyId,
    localUid: binding.localUid ?? identity.localUid,
    publicKeyRawB64u: identity.keyFile.crypto.publicKeyRawB64u,
  };
}

function activeLocalSignedActionActorForIdentity(identity: StoredReceizDeviceIdentity): LocalSignedActionActor | null {
  return localSignedActionActorFromActiveBinding(identity) ?? localSignedActionActorFromOfflineSession(identity);
}

type LocalSignedActionCustody = Readonly<{
  keyFile: StoredReceizDeviceIdentity["keyFile"];
  passphrase?: string;
  actor: LocalSignedActionEnvelope["actor"];
}>;

async function enqueueLocalSignedAction(descriptor: FetchDescriptor, custody?: LocalSignedActionCustody): Promise<LocalSignedActionOutboxEntry | null> {
  if (typeof crypto === "undefined" || !crypto.subtle || !crypto.getRandomValues) return null;
  const activeIdentity = custody ? null : peekReceizDeviceIdentity();
  const identity = custody ?? activeIdentity;
  if (!identity) return null;
  const actor = custody?.actor ?? (activeIdentity ? activeLocalSignedActionActorForIdentity(activeIdentity) : null);
  if (!actor || actor.receizKeyId !== identity.keyFile.keyId
    || actor.publicKeyRawB64u !== identity.keyFile.crypto.publicKeyRawB64u) return null;
  if (custody) {
    const existing = Object.values(readLocalSignedActionOutbox().entries).find(entry =>
      entry.envelope.request.method === descriptor.method && entry.envelope.request.path === descriptor.path
      && entry.envelope.request.bodyReplayText === descriptor.bodyText
      && entryMatchesActiveOutboxActor(entry, actor));
    if (existing) return existing;
  }

  const now = nowMs();
  const createdAt = new Date(now).toISOString();
  const bodyHashHex = descriptor.bodyText === null ? null : await sha256Hex(descriptor.bodyText);
  const { scope, actionKind } = classifyAction(descriptor.path, descriptor.method);
  const actionId = await sha256Hex(
    jcsCanonicalize({
      schema: LOCAL_SIGNED_ACTION_SCHEMA,
      actionKind,
      scope,
      keyId: actor.receizKeyId,
      uid: actor.uid,
      localUid: actor.localUid,
      method: descriptor.method,
      path: descriptor.path,
      bodyHashHex,
      createdAt,
      nonce: randomNonceB64Url(),
    }),
  );

  const envelope: LocalSignedActionEnvelope = {
    schema: LOCAL_SIGNED_ACTION_SCHEMA,
    actionId,
    actionKind,
    scope,
    createdAt,
    actor,
    request: {
      method: descriptor.method,
      path: descriptor.path,
      contentType: descriptor.contentType,
      bodyHashHex,
      bodyReplayText: descriptor.replayable ? descriptor.bodyText ?? "" : null,
      replayable: descriptor.replayable,
    },
  };

  const canonicalEnvelope = jcsCanonicalize(envelope);
  const challengeB64Url = base64UrlEncode(textToBytes(canonicalEnvelope));
  const signed = await signIdentityKeyChallenge({
    keyFile: identity.keyFile,
    challengeB64Url,
    ...(custody ? { passphrase: custody.passphrase } : {}),
  });
  if (signed.keyId !== actor.receizKeyId) return null;

  const entry: LocalSignedActionOutboxEntry = {
    actionId,
    status: "pending",
    envelope,
    challengeB64Url,
    signatureB64Url: signed.signatureB64Url,
    createdAtMs: now,
    updatedAtMs: now,
    propagationAttempts: 0,
    propagatedAtMs: null,
    failedAtMs: null,
    lastPropagationStatus: null,
    lastError: null,
  };
  const outbox = readLocalSignedActionOutbox();
  writeLocalSignedActionOutbox({
    schema: LOCAL_SIGNED_ACTION_OUTBOX_SCHEMA,
    updatedAtMs: now,
    entries: {
      ...outbox.entries,
      [entry.actionId]: entry,
    },
  });
  return entry;
}

export async function enqueueLocalSignedActionFromFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<LocalSignedActionOutboxEntry | null> {
  const descriptor = await describeFetchForLocalSignedAction(input, init);
  if (!descriptor) return null;
  return enqueueLocalSignedAction(descriptor);
}

/** Existing producer with explicitly held source-key custody. Exact finalized
 * request retries reuse the durable action, including its nonce/signature.
 */
export async function enqueueSourceBoundPublicationAction(bodyText: string, custody: LocalSignedActionCustody): Promise<LocalSignedActionOutboxEntry | null> {
  if (new TextEncoder().encode(bodyText).length > 16_384) return null;
  const body = JSON.parse(bodyText);
  if (body.action !== "finalize" || body.scope?.profileIdentity !== custody.actor.uid) return null;
  return enqueueLocalSignedAction({ method: "POST", path: "/api/profile/showcase/publication",
    contentType: "application/json", bodyText, replayable: true }, custody);
}

/** Directed source transfer uses the same durable signed-action producer. */
export async function enqueueSourceBoundOwnershipSendAction(bodyText: string, custody: LocalSignedActionCustody): Promise<LocalSignedActionOutboxEntry | null> {
  if (new TextEncoder().encode(bodyText).length > 16_384) return null;
  const body = JSON.parse(bodyText);
  if (body.action !== "source-ownership-send" || body.senderActorId !== custody.actor.uid) return null;
  return enqueueLocalSignedAction({ method: "POST", path: "/api/receiz/ownership/transfer",
    contentType: "application/json", bodyText, replayable: true }, custody);
}

/** Existing replay header preserves this source-bound signature through the
 * installed fetch bridge. It does not bypass server verification or scope.
 */
export async function deliverSourceBoundPublicationAction(entry: LocalSignedActionOutboxEntry, fetchImpl: typeof fetch,
  headers: HeadersInit): Promise<Response> {
  const request = requestWithLocalSignedActionHeaders("https://receiz.invalid" + entry.envelope.request.path, {
    method: entry.envelope.request.method, headers, body: entry.envelope.request.bodyReplayText,
  }, entry);
  if (!request) throw new TypeError("PROFILE_SHOWCASE_PUBLICATION_ACTION_REQUIRED");
  try {
    const response = await fetchImpl(entry.envelope.request.path, { method: entry.envelope.request.method,
      credentials: "same-origin", headers: Object.fromEntries(request.headers), body: entry.envelope.request.bodyReplayText });
    await settleLocalSignedActionFromResponse(entry, response);
    return response;
  } catch (error) {
    markLocalSignedActionPending({ actionId: entry.actionId, error: error instanceof Error ? error.message : "transport_unavailable" });
    throw error;
  }
}

async function responseActionResult(response: Response): Promise<{ okFalse: boolean; code: string | null }> {
  try {
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("json")) return { okFalse: false, code: null };
    const payload = (await response.clone().json()) as { ok?: unknown; error?: unknown; code?: unknown } | null;
    return {
      okFalse: payload?.ok === false,
      code: normalizeNullableText(payload?.error) ?? normalizeNullableText(payload?.code),
    };
  } catch {
    return { okFalse: false, code: null };
  }
}

function shouldKeepPendingForResponse(response: Response, code: string | null): boolean {
  if (response.status === 401 || response.status === 403 || code === "signin_required") return true;
  if (response.status === 408 || response.status === 425 || response.status === 429) return true;
  return response.status >= 500;
}

function canAutomaticallyReplayEntry(entry: LocalSignedActionOutboxEntry): boolean {
  if (entry.envelope.request.path === "/api/profile/showcase/publication" || entry.envelope.request.path === "/api/receiz/ownership/transfer") return false;
  const status = entry.lastPropagationStatus;
  return status === null || status === 401 || status === 403 || status === 408 || status === 425 || status === 429 || status >= 500;
}

function activeOutboxReplayActor(): Pick<
  LocalSignedActionEnvelope["actor"],
  "uid" | "receizKeyId" | "localUid" | "publicKeyRawB64u"
> | null {
  const identity = peekReceizDeviceIdentity();
  if (!identity) return null;
  const actor = activeLocalSignedActionActorForIdentity(identity);
  if (!actor) return null;
  return actor;
}

function entryMatchesActiveOutboxActor(
  entry: LocalSignedActionOutboxEntry,
  actor: Pick<LocalSignedActionEnvelope["actor"], "uid" | "receizKeyId" | "localUid" | "publicKeyRawB64u">,
): boolean {
  return (
    entry.envelope.actor.uid === actor.uid &&
    entry.envelope.actor.receizKeyId === actor.receizKeyId &&
    entry.envelope.actor.localUid === actor.localUid &&
    entry.envelope.actor.publicKeyRawB64u === actor.publicKeyRawB64u
  );
}

function requestWithLocalSignedActionHeaders(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  entry: LocalSignedActionOutboxEntry,
): Request | null {
  try {
    const request = input instanceof Request ? new Request(input, init) : new Request(input, init);
    const headers = new Headers(request.headers);
    headers.set(LOCAL_SIGNED_ACTION_REPLAY_HEADER, "1");
    headers.set("x-receiz-local-action-id", entry.actionId);
    headers.set("x-receiz-local-action-key-id", entry.envelope.actor.receizKeyId);
    headers.set("x-receiz-local-action-public-key", entry.envelope.actor.publicKeyRawB64u);
    headers.set("x-receiz-local-action-challenge", entry.challengeB64Url);
    headers.set("x-receiz-local-action-signature", entry.signatureB64Url);
    return new Request(request, { headers });
  } catch {
    return null;
  }
}

async function settleLocalSignedActionFromResponse(entry: LocalSignedActionOutboxEntry | null, response: Response): Promise<void> {
  if (!entry) return;
  if (entry.envelope.request.path === "/api/profile/showcase/publication") {
    const payload = await response.clone().json().catch(() => null) as { status?: string; code?: string } | null;
    if (!response.ok || payload?.status !== "published") {
      markLocalSignedActionPending({ actionId: entry.actionId, status: response.status,
        error: payload?.code ?? "PROFILE_SHOWCASE_PUBLIC_PROJECTION_UNAVAILABLE" });
      return;
    }
  }
  const result = await responseActionResult(response);
  if (response.ok && !result.okFalse) {
    markLocalSignedActionPropagated({ actionId: entry.actionId, status: response.status });
    return;
  }
  if (shouldKeepPendingForResponse(response, result.code)) {
    markLocalSignedActionPending({
      actionId: entry.actionId,
      status: response.status,
      error: result.code ?? `http_${response.status}`,
    });
    return;
  }
  markLocalSignedActionFailed({
    actionId: entry.actionId,
    status: response.status,
    error: result.code ?? `http_${response.status}`,
  });
}

export async function flushPendingLocalSignedActions(fetchImpl?: typeof fetch): Promise<void> {
  if (typeof window !== "undefined" && navigator.onLine === false) return;
  if (localSignedActionFlushPromise) return localSignedActionFlushPromise;

  const fetcher = fetchImpl ?? fetch;
  localSignedActionFlushPromise = (async () => {
    const activeActor = activeOutboxReplayActor();
    if (!activeActor) return;
    const pending = Object.values(readLocalSignedActionOutbox().entries)
      .filter((entry) => entry.status === "pending")
      .filter((entry) => entryMatchesActiveOutboxActor(entry, activeActor))
      .filter((entry) => entry.envelope.request.replayable)
      .filter((entry) => entry.envelope.request.bodyReplayText !== null)
      .filter((entry) => entry.propagationAttempts < LOCAL_SIGNED_ACTION_MAX_REPLAY_ATTEMPTS)
      .filter(canAutomaticallyReplayEntry)
      .sort((left, right) => left.createdAtMs - right.createdAtMs)
      .slice(0, 12);

    for (const entry of pending) {
      const headers = new Headers();
      if (entry.envelope.request.contentType) {
        headers.set("content-type", entry.envelope.request.contentType);
      }
      headers.set("accept", "application/json");
      headers.set(LOCAL_SIGNED_ACTION_REPLAY_HEADER, "1");
      headers.set("x-receiz-local-action-id", entry.actionId);
      headers.set("x-receiz-local-action-key-id", entry.envelope.actor.receizKeyId);
      headers.set("x-receiz-local-action-public-key", entry.envelope.actor.publicKeyRawB64u);
      headers.set("x-receiz-local-action-challenge", entry.challengeB64Url);
      headers.set("x-receiz-local-action-signature", entry.signatureB64Url);

      markLocalSignedActionPending({
        actionId: entry.actionId,
        error: "propagation_attempt",
        countAttempt: true,
      });

      try {
        const response = await fetcher(entry.envelope.request.path, {
          method: entry.envelope.request.method,
          headers,
          credentials: "same-origin",
          cache: "no-store",
          body: entry.envelope.request.bodyReplayText,
        });
        await settleLocalSignedActionFromResponse(entry, response);
      } catch (error) {
        markLocalSignedActionPending({
          actionId: entry.actionId,
          error: error instanceof Error ? error.message : "transport_unavailable",
        });
      }
    }
  })().finally(() => {
    localSignedActionFlushPromise = null;
  });

  return localSignedActionFlushPromise;
}

function scheduleLocalSignedActionFlush(fetchImpl: typeof fetch): number | null {
  if (typeof window === "undefined") return null;
  return window.setTimeout(() => {
    void flushPendingLocalSignedActions(fetchImpl);
  }, LOCAL_SIGNED_ACTION_FLUSH_DELAY_MS);
}

export function installLocalSignedActionOutboxFetchBridge(): () => void {
  if (typeof window === "undefined") return () => {};
  const existing = window[LOCAL_SIGNED_ACTION_FETCH_BRIDGE_KEY];
  if (existing) return existing.uninstall;

  const originalFetch = window.fetch.bind(window);
  let flushTimer: number | null = null;
  const queueFlush = (): void => {
    if (flushTimer !== null) window.clearTimeout(flushTimer);
    flushTimer = scheduleLocalSignedActionFlush(originalFetch);
  };

  const bridgedFetch: typeof fetch = async (input, init) => {
    let entry: LocalSignedActionOutboxEntry | null = null;
    try {
      entry = await enqueueLocalSignedActionFromFetch(input, init);
    } catch {
      entry = null;
    }

    try {
      const signedRequest = entry ? requestWithLocalSignedActionHeaders(input, init, entry) : null;
      const response = signedRequest ? await originalFetch(signedRequest) : await originalFetch(input, init);
      await settleLocalSignedActionFromResponse(entry, response);
      if (entry) {
        const latest = readLocalSignedActionOutbox().entries[entry.actionId] ?? null;
        if (response.ok || latest?.status === "pending") queueFlush();
      }
      return response;
    } catch (error) {
      if (entry) {
        markLocalSignedActionPending({
          actionId: entry.actionId,
          error: error instanceof Error ? error.message : "transport_unavailable",
        });
        queueFlush();
      }
      throw error;
    }
  };

  const handleOnline = (): void => queueFlush();
  const handleFocus = (): void => queueFlush();
  const handleVisibility = (): void => {
    if (document.visibilityState === "visible") queueFlush();
  };

  const uninstall = (): void => {
    if (flushTimer !== null) window.clearTimeout(flushTimer);
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);
    if (window.fetch === bridgedFetch) {
      window.fetch = originalFetch;
    }
    delete window[LOCAL_SIGNED_ACTION_FETCH_BRIDGE_KEY];
  };

  window[LOCAL_SIGNED_ACTION_FETCH_BRIDGE_KEY] = { originalFetch, uninstall };
  window.fetch = bridgedFetch;
  window.addEventListener("online", handleOnline);
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);
  queueFlush();
  return uninstall;
}

"use client";

import { admitLocalIdentityBinding } from "@/app/lib/auth/localIdentityBindingRegister";
import type { LocalIdentityBindingAppend } from "@/app/lib/auth/localIdentityBinding";
import { sessionFromIssuedLocalIdentityPublication } from "@/app/lib/auth/immediateIdentityKeySessionRecovery";
import {
  isOfflineIdentitySessionExplicitlyLoggedOut,
  markOfflineIdentityExplicitLogout,
  peekOfflineIdentitySession,
  peekOfflineIdentitySessionForKey,
  projectOfflineIdentitySessionToBootstrap,
  writeOfflineIdentitySessionFromLocalPublication,
} from "@/app/lib/auth/offlineIdentitySession";
import type { LocalPbiAssertion } from "@/app/lib/pbi/localVerifier";
import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import { normalizeIdentityKeyId } from "@/app/utils/receizIdentityKey";

const LOCAL_IDENTITY_PUBLISH_OUTBOX_SCHEMA = "receiz.identity.local-publish-outbox.v1";
const LOCAL_IDENTITY_PUBLISH_OUTBOX_STORAGE_KEY = "receiz.identity.local-publish-outbox.v1";
const LOCAL_IDENTITY_PUBLISH_OUTBOX_EVENT = "receiz:local-identity-publish-outbox";
const HEX64_RE = /^[0-9a-f]{64}$/;
const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;

export type LocalIdentityPublicationProof = {
  keyId: string;
  alg: "Ed25519" | "P-256";
  publicKeyRawB64u: string;
  localUid: string;
  username: string | null;
  displayName: string | null;
  actionHashHex: string;
  challengeB64Url: string;
  signatureB64Url: string;
  presenceAssertion: LocalPbiAssertion;
  pbiSignedKaiMicroPulse: string | null;
  nextPath: string;
};

export type LocalIdentityPublishOutboxEntry = {
  keyId: string;
  localUid: string;
  username: string | null;
  displayName: string | null;
  actionHashHex: string;
  nextPath: string;
  proof: LocalIdentityPublicationProof | null;
  status: "pending" | "published";
  createdAtMs: number;
  updatedAtMs: number;
  publishedAtMs: number | null;
  globalUid: string | null;
};

type LocalIdentityPublishOutbox = {
  schema: typeof LOCAL_IDENTITY_PUBLISH_OUTBOX_SCHEMA;
  updatedAtMs: number;
  entries: Record<string, LocalIdentityPublishOutboxEntry>;
};

export type LocalIdentityVerifiedPublicationPayload = {
  ok?: unknown;
  sessionIssued?: unknown;
  session?: unknown;
  identityBinding?: LocalIdentityBindingAppend;
  error?: unknown;
  detail?: unknown;
};

type FlushLocalIdentityPublicationOptions = {
  fetchImpl?: typeof fetch;
  admitVerifiedPublication?: (args: {
    entry: LocalIdentityPublishOutboxEntry;
    payload: LocalIdentityVerifiedPublicationPayload;
  }) => Promise<string | null>;
};

let flushPromise: Promise<void> | null = null;
let runtimeUninstall: (() => void) | null = null;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: unknown): string | null {
  const text = normalizeText(value);
  return text ? text : null;
}

function normalizeNextPath(value: unknown): string {
  const text = normalizeText(value);
  return text.startsWith("/") && !text.startsWith("//") ? text : "/";
}

function normalizeBase64Url(value: unknown): string | null {
  const normalized = normalizeText(value);
  return normalized && BASE64URL_RE.test(normalized) ? normalized : null;
}

function normalizePresenceAssertion(value: unknown): LocalPbiAssertion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalPbiAssertion>;
  const authenticatorDataB64Url = normalizeBase64Url(record.authenticatorDataB64Url);
  const clientDataJSONB64Url = normalizeBase64Url(record.clientDataJSONB64Url);
  const signatureB64Url = normalizeBase64Url(record.signatureB64Url);
  const credIdB64Url = normalizeBase64Url(record.credIdB64Url);
  const pubKeyPem = normalizeText(record.pubKeyPem);
  if (
    !authenticatorDataB64Url ||
    !clientDataJSONB64Url ||
    !signatureB64Url ||
    !credIdB64Url ||
    !pubKeyPem.includes("BEGIN PUBLIC KEY")
  ) {
    return null;
  }
  return {
    authenticatorDataB64Url,
    clientDataJSONB64Url,
    signatureB64Url,
    credIdB64Url,
    pubKeyPem,
  };
}

function normalizePublicationProof(value: unknown): LocalIdentityPublicationProof | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalIdentityPublicationProof>;
  const keyId = normalizeIdentityKeyId(record.keyId);
  const alg = record.alg === "Ed25519" || record.alg === "P-256" ? record.alg : null;
  const publicKeyRawB64u = normalizeBase64Url(record.publicKeyRawB64u);
  const localUid = normalizeText(record.localUid);
  const actionHashHex = normalizeText(record.actionHashHex).toLowerCase();
  const challengeB64Url = normalizeBase64Url(record.challengeB64Url);
  const signatureB64Url = normalizeBase64Url(record.signatureB64Url);
  const presenceAssertion = normalizePresenceAssertion(record.presenceAssertion);
  const pbiSignedKaiMicroPulseRaw = normalizeText(record.pbiSignedKaiMicroPulse);
  const pbiSignedKaiMicroPulse = /^(0|[1-9][0-9]*)$/u.test(pbiSignedKaiMicroPulseRaw)
    ? pbiSignedKaiMicroPulseRaw
    : null;
  if (
    !keyId ||
    !alg ||
    !publicKeyRawB64u ||
    !localUid ||
    !HEX64_RE.test(actionHashHex) ||
    !challengeB64Url ||
    !signatureB64Url ||
    !presenceAssertion
  ) {
    return null;
  }
  return {
    keyId,
    alg,
    publicKeyRawB64u,
    localUid,
    username: normalizeNullableText(record.username),
    displayName: normalizeNullableText(record.displayName),
    actionHashHex,
    challengeB64Url,
    signatureB64Url,
    presenceAssertion,
    pbiSignedKaiMicroPulse,
    nextPath: normalizeNextPath(record.nextPath),
  };
}

function emptyOutbox(): LocalIdentityPublishOutbox {
  return {
    schema: LOCAL_IDENTITY_PUBLISH_OUTBOX_SCHEMA,
    updatedAtMs: 0,
    entries: {},
  };
}

function normalizeOutboxEntry(value: unknown): LocalIdentityPublishOutboxEntry | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Partial<LocalIdentityPublishOutboxEntry>;
  const keyId = normalizeIdentityKeyId(record.keyId);
  const localUid = normalizeText(record.localUid);
  const actionHashHex = normalizeText(record.actionHashHex).toLowerCase();
  const createdAtMs = Number(record.createdAtMs);
  const updatedAtMs = Number(record.updatedAtMs);
  const status = record.status === "published" ? "published" : "pending";
  const proof = normalizePublicationProof(record.proof);
  if (!keyId || !localUid || !HEX64_RE.test(actionHashHex) || !Number.isFinite(createdAtMs)) return null;
  if (proof && (proof.keyId !== keyId || proof.localUid !== localUid || proof.actionHashHex !== actionHashHex)) return null;

  return {
    keyId,
    localUid,
    username: normalizeNullableText(record.username),
    displayName: normalizeNullableText(record.displayName),
    actionHashHex,
    nextPath: normalizeNextPath(record.nextPath),
    proof,
    status,
    createdAtMs,
    updatedAtMs: Number.isFinite(updatedAtMs) ? updatedAtMs : createdAtMs,
    publishedAtMs: Number.isFinite(record.publishedAtMs) ? Number(record.publishedAtMs) : null,
    globalUid: normalizeNullableText(record.globalUid),
  };
}

function parseOutbox(raw: string): LocalIdentityPublishOutbox | null {
  try {
    const parsed = JSON.parse(raw) as Partial<LocalIdentityPublishOutbox> | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schema !== LOCAL_IDENTITY_PUBLISH_OUTBOX_SCHEMA) return null;
    if (!Number.isFinite(parsed.updatedAtMs)) return null;
    if (!parsed.entries || typeof parsed.entries !== "object" || Array.isArray(parsed.entries)) return null;

    const entries: Record<string, LocalIdentityPublishOutboxEntry> = {};
    for (const value of Object.values(parsed.entries)) {
      const entry = normalizeOutboxEntry(value);
      if (entry) entries[entry.keyId] = entry;
    }
    return {
      schema: LOCAL_IDENTITY_PUBLISH_OUTBOX_SCHEMA,
      updatedAtMs: Number(parsed.updatedAtMs),
      entries,
    };
  } catch {
    return null;
  }
}

export function readLocalIdentityPublishOutbox(): LocalIdentityPublishOutbox {
  const raw = readDurableLocalTruthItem(LOCAL_IDENTITY_PUBLISH_OUTBOX_STORAGE_KEY);
  return raw ? parseOutbox(raw) ?? emptyOutbox() : emptyOutbox();
}

function dispatchOutboxChange(): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function" || typeof CustomEvent === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOCAL_IDENTITY_PUBLISH_OUTBOX_EVENT));
}

function writeLocalIdentityPublishOutbox(outbox: LocalIdentityPublishOutbox): void {
  writeDurableLocalTruthItem(LOCAL_IDENTITY_PUBLISH_OUTBOX_STORAGE_KEY, JSON.stringify(outbox), {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
    source: "local-identity-publish-outbox",
    allowSameRankOverwrite: true,
  });
  dispatchOutboxChange();
}

export function enqueueLocalIdentityPublication(args: LocalIdentityPublicationProof): void {
  const proof = normalizePublicationProof(args);
  if (!proof) return;

  const outbox = readLocalIdentityPublishOutbox();
  const existing = outbox.entries[proof.keyId];
  if (existing?.status === "published") return;

  const now = Date.now();
  writeLocalIdentityPublishOutbox({
    schema: LOCAL_IDENTITY_PUBLISH_OUTBOX_SCHEMA,
    updatedAtMs: now,
    entries: {
      ...outbox.entries,
      [proof.keyId]: {
        keyId: proof.keyId,
        localUid: proof.localUid,
        username: proof.username,
        displayName: proof.displayName,
        actionHashHex: proof.actionHashHex,
        nextPath: proof.nextPath,
        proof,
        status: "pending",
        createdAtMs: existing?.createdAtMs ?? now,
        updatedAtMs: now,
        publishedAtMs: null,
        globalUid: null,
      },
    },
  });
}

export function peekPendingLocalIdentityPublication(keyId: string): LocalIdentityPublishOutboxEntry | null {
  const normalizedKeyId = normalizeIdentityKeyId(keyId);
  if (!normalizedKeyId) return null;
  const entry = readLocalIdentityPublishOutbox().entries[normalizedKeyId];
  return entry?.status === "pending" ? entry : null;
}

export function markLocalIdentityPublicationPublished(args: {
  keyId: string;
  globalUid: string | null;
}): void {
  const keyId = normalizeIdentityKeyId(args.keyId);
  if (!keyId) return;
  const outbox = readLocalIdentityPublishOutbox();
  const existing = outbox.entries[keyId];
  if (!existing) return;

  const now = Date.now();
  writeLocalIdentityPublishOutbox({
    schema: LOCAL_IDENTITY_PUBLISH_OUTBOX_SCHEMA,
    updatedAtMs: now,
    entries: {
      ...outbox.entries,
      [keyId]: {
        ...existing,
        status: "published",
        updatedAtMs: now,
        publishedAtMs: now,
        globalUid: normalizeNullableText(args.globalUid),
      },
    },
  });
}

function sessionUid(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return normalizeNullableText((value as { uid?: unknown }).uid);
}

async function admitVerifiedLocalIdentityPublication(args: {
  entry: LocalIdentityPublishOutboxEntry;
  payload: LocalIdentityVerifiedPublicationPayload;
}): Promise<string | null> {
  const binding = args.payload.identityBinding
    ? await admitLocalIdentityBinding(args.payload.identityBinding)
    : null;
  if (
    !binding ||
    binding.keyId !== args.entry.keyId ||
    binding.localUid !== args.entry.localUid ||
    binding.actionHashHex !== args.entry.actionHashHex
  ) {
    return null;
  }

  const issuedSession = sessionFromIssuedLocalIdentityPublication(args.payload);
  if (!issuedSession) return binding.globalUid;
  const globalUid = sessionUid(issuedSession);
  if (!globalUid || binding.globalUid !== globalUid) return null;

  const current = peekOfflineIdentitySessionForKey(args.entry.keyId);
  if (!current) return globalUid;
  const wasActive = peekOfflineIdentitySession()?.keyId === current.keyId;
  const wasExplicitlyLoggedOut = isOfflineIdentitySessionExplicitlyLoggedOut(current);
  const upgraded = writeOfflineIdentitySessionFromLocalPublication({
    keyId: args.entry.keyId,
    verifiedSession: issuedSession,
    makeActive: wasActive,
  });
  if (wasExplicitlyLoggedOut) {
    markOfflineIdentityExplicitLogout(upgraded);
  } else if (wasActive) {
    projectOfflineIdentitySessionToBootstrap(upgraded);
  }
  return globalUid;
}

async function publishPendingLocalIdentityPublication(args: {
  entry: LocalIdentityPublishOutboxEntry;
  options: FlushLocalIdentityPublicationOptions;
}): Promise<void> {
  const proof = args.entry.proof;
  if (!proof) return;

  let response: Response;
  try {
    response = await (args.options.fetchImpl ?? fetch)("/api/auth/identity-key/local-publish", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({
        keyId: proof.keyId,
        alg: proof.alg,
        publicKeyRawB64u: proof.publicKeyRawB64u,
        localUid: proof.localUid,
        username: proof.username,
        displayName: proof.displayName,
        actionHashHex: proof.actionHashHex,
        challengeB64Url: proof.challengeB64Url,
        signatureB64Url: proof.signatureB64Url,
        presenceAssertion: proof.presenceAssertion,
        pbiSignedKaiMicroPulse: proof.pbiSignedKaiMicroPulse,
        next: proof.nextPath,
      }),
    });
  } catch {
    return;
  }

  const payload = (await response.json().catch(() => null)) as LocalIdentityVerifiedPublicationPayload | null;
  if (!response.ok || payload?.ok !== true) return;
  const admitVerifiedPublication = args.options.admitVerifiedPublication ?? admitVerifiedLocalIdentityPublication;
  const globalUid = await admitVerifiedPublication({ entry: args.entry, payload }).catch(() => null);
  if (!globalUid) return;
  markLocalIdentityPublicationPublished({ keyId: args.entry.keyId, globalUid });
}

export async function flushPendingLocalIdentityPublications(
  options: FlushLocalIdentityPublicationOptions = {},
): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    const pending = Object.values(readLocalIdentityPublishOutbox().entries)
      .filter((entry) => entry.status === "pending" && entry.proof)
      .sort((left, right) => left.createdAtMs - right.createdAtMs);
    for (const entry of pending) {
      await publishPendingLocalIdentityPublication({ entry, options });
    }
  })().finally(() => {
    flushPromise = null;
  });
  return flushPromise;
}

export function installLocalIdentityPublishOutboxRuntime(): () => void {
  if (typeof window === "undefined") return () => {};
  if (runtimeUninstall) return runtimeUninstall;

  const flush = (): void => {
    void flushPendingLocalIdentityPublications();
  };
  const onVisible = (): void => {
    if (document.visibilityState === "visible") flush();
  };
  const uninstall = (): void => {
    window.removeEventListener("online", flush);
    window.removeEventListener("focus", flush);
    window.removeEventListener(LOCAL_IDENTITY_PUBLISH_OUTBOX_EVENT, flush);
    document.removeEventListener("visibilitychange", onVisible);
    if (runtimeUninstall === uninstall) runtimeUninstall = null;
  };

  runtimeUninstall = uninstall;
  window.addEventListener("online", flush);
  window.addEventListener("focus", flush);
  window.addEventListener(LOCAL_IDENTITY_PUBLISH_OUTBOX_EVENT, flush);
  document.addEventListener("visibilitychange", onVisible);
  flush();
  return uninstall;
}

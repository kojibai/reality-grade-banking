"use client";

import {
  DURABLE_LOCAL_TRUTH_RANK,
  readDurableLocalTruthItem,
  writeDurableLocalTruthItem,
} from "@/app/lib/runtime/localTruthStore";
import {
  RECEIZ_DEVICE_IDENTITY_SCHEMA,
  RECEIZ_DEVICE_IDENTITY_STORAGE_KEY,
} from "@/app/lib/auth/receizDeviceIdentitySupport";
import { deflateSync, Inflate } from "fflate";
import { base64UrlDecode, base64UrlEncode } from "@/app/utils/sha256";
import { parseReceizKeyFileText, serializeReceizKeyFile, type ReceizKeyFile } from "@/app/utils/receizIdentityKey";
import { holdReceizDeviceIdentitySource, openReceizDeviceIdentitySource, prepareReceizDeviceIdentitySource,
  realizeReceizDeviceIdentitySource, ReceizIdentitySourceNotRealizedError, RECEIZ_IDENTITY_SOURCE_MANIFEST_PREFIX,
  type ReceizDeviceIdentitySourceRef } from "./receizDeviceIdentitySource";
import type { StoredReceizDeviceIdentity } from "@/app/lib/auth/receizDeviceIdentity";

export const RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA = "receiz.device.identity.register.v1" as const;
export const RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY = "receiz.auth.receiz-device-identity.register.v1";

export const RECEIZ_DEVICE_IDENTITY_REGISTER_SOURCE_PREFIX = "s1:";

const RECEIZ_DEVICE_IDENTITY_REGISTER_COMPACT_PREFIX = "c1:" as const;
const MAX_REGISTER_COMPRESSED_BYTES = 4 * 1024 * 1024;
const MAX_REGISTER_INFLATED_BYTES = 16 * 1024 * 1024;
const MAX_REGISTER_PAYLOAD_CHARS = 6 * 1024 * 1024;
const registerTextEncoder = new TextEncoder();
const registerTextDecoder = new TextDecoder();

type RegisterInflateWithError = Inflate & { err?: number; msg?: string };

export type ReceizDeviceIdentityRegister = Readonly<{
  schema: typeof RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA;
  activeKeyId: string | null;
  identities: Readonly<Record<string, StoredReceizDeviceIdentity>>;
}>;

function identityKeyId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<StoredReceizDeviceIdentity>;
  const keyId = item.keyFile?.keyId;
  return item.schema === RECEIZ_DEVICE_IDENTITY_SCHEMA
    && typeof keyId === "string" && /^[0-9a-f]{64}$/u.test(keyId)
    ? keyId
    : null;
}

function parseIdentity(raw: string | null): StoredReceizDeviceIdentity | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!identityKeyId(parsed)) return null;
    const identity = parsed as StoredReceizDeviceIdentity;
    return { ...identity, keyFile: parseReceizKeyFileText(JSON.stringify(identity.keyFile)) };
  } catch {
    return null;
  }
}

function normalizeRegister(value: unknown): ReceizDeviceIdentityRegister | null {
  const parsed = value as Partial<ReceizDeviceIdentityRegister> | null;
  if (!parsed || parsed.schema !== RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA
    || !parsed.identities || typeof parsed.identities !== "object" || Array.isArray(parsed.identities)) return null;
  const identities: Record<string, StoredReceizDeviceIdentity> = {};
  for (const value of Object.values(parsed.identities)) {
    const keyId = identityKeyId(value);
    if (keyId) identities[keyId] = value;
  }
  const activeKeyId = typeof parsed.activeKeyId === "string" && identities[parsed.activeKeyId]
    ? parsed.activeKeyId
    : Object.keys(identities)[0] ?? null;
  return Object.freeze({ schema: RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA, activeKeyId, identities: Object.freeze(identities) });
}

function inflateRegisterPayload(data: Uint8Array): Uint8Array {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const inflator = new Inflate((chunk) => {
    total += chunk.length;
    if (total > MAX_REGISTER_INFLATED_BYTES) {
      throw new Error("receiz_device_identity_register_too_large");
    }
    chunks.push(chunk);
  }) as RegisterInflateWithError;

  inflator.push(data, true);
  if (inflator.err && inflator.err !== 0) {
    throw new Error(inflator.msg || "receiz_device_identity_register_invalid");
  }

  const inflated = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    inflated.set(chunk, offset);
    offset += chunk.length;
  }
  return inflated;
}

export function serializeReceizDeviceIdentityRegister(register: ReceizDeviceIdentityRegister): string {
  const raw = registerTextEncoder.encode(JSON.stringify(register));
  if (raw.length > MAX_REGISTER_INFLATED_BYTES) {
    throw new Error("receiz_device_identity_register_too_large");
  }
  const compressed = deflateSync(raw, { level: 9 });
  if (compressed.length > MAX_REGISTER_COMPRESSED_BYTES) {
    throw new Error("receiz_device_identity_register_too_large");
  }
  return `${RECEIZ_DEVICE_IDENTITY_REGISTER_COMPACT_PREFIX}${base64UrlEncode(compressed)}`;
}

export function deserializeReceizDeviceIdentityRegister(raw: string): ReceizDeviceIdentityRegister {
  if (!raw || raw.length > MAX_REGISTER_PAYLOAD_CHARS) {
    throw new Error("receiz_device_identity_register_invalid");
  }
  const json = raw.startsWith(RECEIZ_DEVICE_IDENTITY_REGISTER_COMPACT_PREFIX)
    ? registerTextDecoder.decode(inflateRegisterPayload(
        base64UrlDecode(raw.slice(RECEIZ_DEVICE_IDENTITY_REGISTER_COMPACT_PREFIX.length)),
      ))
    : raw;
  if (registerTextEncoder.encode(json).length > MAX_REGISTER_INFLATED_BYTES) {
    throw new Error("receiz_device_identity_register_too_large");
  }
  const register = normalizeRegister(JSON.parse(json) as unknown);
  if (!register) throw new Error("receiz_device_identity_register_invalid");
  return register;
}

function parseRegister(raw: string | null): ReceizDeviceIdentityRegister | null {
  if (!raw) return null;
  try {
    return deserializeReceizDeviceIdentityRegister(raw);
  } catch {
    return null;
  }
}

function emptyRegister(): ReceizDeviceIdentityRegister {
  return Object.freeze({ schema: RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA, activeKeyId: null, identities: Object.freeze({}) });
}

export function migrateReceizDeviceIdentityRegister(
  current: ReceizDeviceIdentityRegister | null,
  legacyIdentity: StoredReceizDeviceIdentity | null,
): ReceizDeviceIdentityRegister {
  const register = current ?? emptyRegister();
  const legacyKeyId = identityKeyId(legacyIdentity);
  if (!legacyIdentity || !legacyKeyId || register.identities[legacyKeyId]) return register;
  return Object.freeze({
    schema: RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA,
    activeKeyId: register.activeKeyId ?? legacyKeyId,
    identities: Object.freeze({ ...register.identities, [legacyKeyId]: legacyIdentity }),
  });
}

export function appendReceizDeviceIdentityRegister(
  register: ReceizDeviceIdentityRegister,
  identity: StoredReceizDeviceIdentity,
  makeActive: boolean,
): ReceizDeviceIdentityRegister {
  const keyId = identityKeyId(identity);
  if (!keyId) throw new Error("receiz_device_identity_invalid");
  const descriptors = Object.getOwnPropertyDescriptors(register.identities);
  delete descriptors[keyId];
  const identities = Object.defineProperties({}, descriptors) as Record<string, StoredReceizDeviceIdentity>;
  Object.defineProperty(identities, keyId, { value: identity, enumerable: true });
  return Object.freeze({
    schema: RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA,
    activeKeyId: makeActive || !register.activeKeyId ? keyId : register.activeKeyId,
    identities: Object.freeze(identities),
  });
}

export function selectReceizDeviceIdentityRegister(
  register: ReceizDeviceIdentityRegister,
  keyIdInput: string,
): ReceizDeviceIdentityRegister {
  const keyId = keyIdInput.trim().toLowerCase();
  if (!register.identities[keyId]) throw new Error("receiz_device_identity_not_held");
  return Object.freeze({ ...register, activeKeyId: keyId });
}

type SourceRegister = Readonly<{
  schema: typeof RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA;
  activeKeyId: string | null;
  identities: Record<string, ReceizDeviceIdentitySourceRef>;
}>;

// Lazy projections retain exact references; opening one account does not open
// the proof bytes of every other account. Only getters created here can reuse refs.
const identityGetterSources = new WeakMap<() => StoredReceizDeviceIdentity, ReceizDeviceIdentitySourceRef>();

function openSourceRegister(raw: string, openAll: boolean): ReceizDeviceIdentityRegister {
  try {
    const manifest = JSON.parse(raw.slice(RECEIZ_DEVICE_IDENTITY_REGISTER_SOURCE_PREFIX.length)) as SourceRegister;
    if (manifest.schema !== RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA || !manifest.identities
      || typeof manifest.identities !== "object" || Array.isArray(manifest.identities)) throw new Error();
    const identities: Record<string, StoredReceizDeviceIdentity> = {};
    for (const [keyId, ref] of Object.entries(manifest.identities)) {
      if (!ref || keyId !== ref.keyId) throw new Error();
      const get = () => openReceizDeviceIdentitySource(ref);
      identityGetterSources.set(get, ref);
      Object.defineProperty(identities, keyId, { enumerable: true, get });
      if (openAll) get();
    }
    if (manifest.activeKeyId !== null && !Object.hasOwn(identities, manifest.activeKeyId)) throw new Error();
    if (manifest.activeKeyId === null && Object.keys(identities).length) throw new Error();
    return Object.freeze({ schema: RECEIZ_DEVICE_IDENTITY_REGISTER_SCHEMA, activeKeyId: manifest.activeKeyId, identities: Object.freeze(identities) });
  } catch (error) {
    if (error instanceof ReceizIdentitySourceNotRealizedError) throw error;
    throw new Error("receiz_device_identity_source_integrity_failed");
  }
}

/** Open only the operation's selected source. Full realization is reserved for
 * callers explicitly consuming the complete register, such as bundle export. */
export async function realizeReceizDeviceIdentityRegister(selection: "all" | "active" | readonly string[] = "all"): Promise<void> {
  for (;;) {
    const raw = readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY);
    if (raw?.startsWith(RECEIZ_DEVICE_IDENTITY_REGISTER_SOURCE_PREFIX)) {
      const register = JSON.parse(raw.slice(RECEIZ_DEVICE_IDENTITY_REGISTER_SOURCE_PREFIX.length)) as SourceRegister;
      // Validate the reference container without dereferencing unrelated proofs.
      openSourceRegister(raw, false);
      const keys = selection === "all" ? Object.keys(register.identities)
        : selection === "active" ? (register.activeKeyId ? [register.activeKeyId] : []) : selection;
      for (const key of keys) {
        const ref = register.identities[key];
        if (!ref) continue; // A newly imported identity is not in the register yet.
        const manifest = readDurableLocalTruthItem(RECEIZ_IDENTITY_SOURCE_MANIFEST_PREFIX + ref.sha256);
        if (!manifest) throw new Error("receiz_device_identity_source_integrity_failed");
        await realizeReceizDeviceIdentitySource(JSON.parse(manifest) as ReceizDeviceIdentitySourceRef);
      }
    }
    if (raw === readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY)) break;
  }
  readReceizDeviceIdentityRegister(selection === "all");
}

export async function prepareReceizDeviceIdentityRegister(identities: readonly StoredReceizDeviceIdentity[] = []): Promise<void> {
  await realizeReceizDeviceIdentityRegister(identities.map(identity => identity.keyFile.keyId));
  for (const identity of identities) await prepareReceizDeviceIdentitySource(identity);
}

function writeRegister(register: ReceizDeviceIdentityRegister, source: string): boolean {
  const identities: Record<string, ReceizDeviceIdentitySourceRef> = {};
  for (const [keyId, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(register.identities))) {
    const held = descriptor.get && identityGetterSources.get(descriptor.get);
    identities[keyId] = held ?? holdReceizDeviceIdentitySource(register.identities[keyId]);
  }
  const payload = RECEIZ_DEVICE_IDENTITY_REGISTER_SOURCE_PREFIX + JSON.stringify({
    schema: register.schema, activeKeyId: register.activeKeyId, identities,
  } satisfies SourceRegister);
  const previous = readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY);
  if (previous === payload) return true;
  writeDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY, payload, {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
    source,
    allowSameRankOverwrite: true,
  });
  if (readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY) === payload) return true;
  // A failed read-back is not admission. Restore the previous committed pointer;
  // immutable source generations were never overwritten during staging.
  if (previous !== null) writeDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY, previous, {
    rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock, source, allowSameRankOverwrite: true,
  });
  return false;
}

export function readReceizDeviceIdentityRegister(openAll = true): ReceizDeviceIdentityRegister {
  const raw = readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY);
  if (raw?.startsWith(RECEIZ_DEVICE_IDENTITY_REGISTER_SOURCE_PREFIX)) return openSourceRegister(raw, openAll);
  const parsed = parseRegister(raw);
  if (raw !== null && !parsed) throw new Error("receiz_device_identity_source_integrity_failed");
  const legacy = parseIdentity(readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_STORAGE_KEY));
  const migrated = migrateReceizDeviceIdentityRegister(parsed, legacy);
  if (migrated !== parsed) {
    try {
      writeRegister(migrated, "receiz-device-identity-register-migration");
    } catch {
      // The verified legacy identity remains immediately usable when storage is unavailable.
    }
  }
  return migrated;
}

export function listReceizDeviceIdentitiesFromRegister(): StoredReceizDeviceIdentity[] {
  let register: ReceizDeviceIdentityRegister;
  try { register = readReceizDeviceIdentityRegister(); }
  catch (error) { if (error instanceof ReceizIdentitySourceNotRealizedError) return []; throw error; }
  return Object.values(register.identities).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

/** Reopen the exact retained actor without selecting it as the active account
 * or realizing the private sources belonging to other accounts. */
export async function readReceizDeviceIdentityForActor(actorId: string): Promise<StoredReceizDeviceIdentity | null> {
  const register = readReceizDeviceIdentityRegister(false);
  for (const [keyId, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(register.identities))) {
    const ref = descriptor.get ? identityGetterSources.get(descriptor.get) : null;
    if (ref) {
      if (ref.localUid !== actorId) continue;
      await realizeReceizDeviceIdentityRegister([keyId]);
    } else if ((descriptor.value as StoredReceizDeviceIdentity | undefined)?.localUid !== actorId) continue;
    const identity = register.identities[keyId];
    if (identity.localUid === actorId && identity.keyFile.owner.uid === actorId) return identity;
  }
  return null;
}

let heldRegisterProjection: { storage: Storage; raw: string | null; register: ReceizDeviceIdentityRegister } | null = null;

export function peekActiveReceizDeviceIdentityFromRegister(): StoredReceizDeviceIdentity | null {
  const storage = typeof window !== "undefined" ? window.localStorage : null;
  const raw = readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY);
  let register: ReceizDeviceIdentityRegister;
  try {
    register = storage && heldRegisterProjection?.storage === storage && heldRegisterProjection.raw === raw
      ? heldRegisterProjection.register : readReceizDeviceIdentityRegister(false);
    // Opening the active getter belongs inside the unsupported-cold-source guard.
    if (register.activeKeyId) void register.identities[register.activeKeyId];
  } catch (error) { if (error instanceof ReceizIdentitySourceNotRealizedError) return null; throw error; }
  if (storage) heldRegisterProjection = { storage, raw: readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY), register };
  return register.activeKeyId ? register.identities[register.activeKeyId] ?? null : null;
}

export type ReceizDeviceIdentitySelection = Readonly<{
  selected: StoredReceizDeviceIdentity;
  candidate: StoredReceizDeviceIdentity;
  disposition: "first-admission" | "same-source" | "held-source-preserved" | "qualified-successor";
}>;

/** Preserve the 6e0d71c3f creation path: one complete register commit.
 * Existing source-backed accounts keep their exact custody and selection rules. */
export async function admitCreatedReceizDeviceIdentityToRegister(identity: StoredReceizDeviceIdentity): Promise<void> {
  const current = readReceizDeviceIdentityRegister(false);
  const raw = readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY);
  if (!Object.keys(current.identities).length || !raw?.startsWith(RECEIZ_DEVICE_IDENTITY_REGISTER_SOURCE_PREFIX)) {
    const next = appendReceizDeviceIdentityRegister(current, identity, true);
    const payload = serializeReceizDeviceIdentityRegister(next);
    writeDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY, payload, {
      rank: DURABLE_LOCAL_TRUTH_RANK.verifiedRegisterBlock,
      source: "receiz-device-identity-register-creation",
      allowSameRankOverwrite: true,
    });
    if (readDurableLocalTruthItem(RECEIZ_DEVICE_IDENTITY_REGISTER_STORAGE_KEY) !== payload) {
      throw new Error("receiz_device_identity_register_write_failed");
    }
    return;
  }
  await prepareReceizDeviceIdentityRegister([identity]);
  admitReceizDeviceIdentityToRegister(identity, true);
}

// expectedPredecessor is a compare-and-select storage precondition. Only the
// existing verified producer admission boundary may supply it; it is not proof.
export function admitReceizDeviceIdentityToRegister(
  identity: StoredReceizDeviceIdentity,
  makeActive = true,
  expectedPredecessor?: ReceizKeyFile,
): ReceizDeviceIdentitySelection {
  const current = readReceizDeviceIdentityRegister(false);
  const held = current.identities[identity.keyFile.keyId];
  const same = held && serializeReceizKeyFile(held.keyFile) === serializeReceizKeyFile(identity.keyFile);
  if (expectedPredecessor && !same && (!held
    || serializeReceizKeyFile(held.keyFile) !== serializeReceizKeyFile(expectedPredecessor))) {
    throw new Error("receiz_device_identity_predecessor_conflict");
  }
  const selected = !held || expectedPredecessor ? identity : held;
  const disposition = !held ? "first-admission" : same ? "same-source"
    : expectedPredecessor ? "qualified-successor" : "held-source-preserved";
  // Retain an authentic unresolved candidate independently of account selection.
  // Exact repeat reuses the original complete generation, including custody fields.
  if (!same) holdReceizDeviceIdentitySource(identity);
  const next = appendReceizDeviceIdentityRegister(current, same ? held : selected, makeActive);
  if (!writeRegister(next, "receiz-device-identity-register-append")) {
    throw new Error("receiz_device_identity_register_write_failed");
  }
  return Object.freeze({ selected: next.identities[identity.keyFile.keyId], candidate: identity, disposition });
}

export function admitReceizDeviceIdentitiesToRegister(
  identities: readonly StoredReceizDeviceIdentity[],
  activeKeyId: string,
): ReceizDeviceIdentityRegister {
  let next = readReceizDeviceIdentityRegister(false);
  for (const identity of identities) {
    holdReceizDeviceIdentitySource(identity);
    next = appendReceizDeviceIdentityRegister(next, next.identities[identity.keyFile.keyId] ?? identity, false);
  }
  next = selectReceizDeviceIdentityRegister(next, activeKeyId);
  if (!writeRegister(next, "receiz-device-identity-register-bundle-append")) {
    throw new Error("receiz_device_identity_register_write_failed");
  }
  return next;
}

export function activateHeldReceizDeviceIdentity(keyId: string): StoredReceizDeviceIdentity {
  const next = selectReceizDeviceIdentityRegister(readReceizDeviceIdentityRegister(false), keyId);
  if (!writeRegister(next, "receiz-device-identity-register-activation")) {
    throw new Error("receiz_device_identity_register_write_failed");
  }
  return next.identities[next.activeKeyId as string];
}

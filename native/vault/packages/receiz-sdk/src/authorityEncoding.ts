import { sha256 } from "@noble/hashes/sha2.js";

type AuthorityBytes = Uint8Array<ArrayBuffer>;

const AUTHORITY_PREFIX: AuthorityBytes = new TextEncoder().encode("RECEIZ-AUTHORITY-V112\0");

export const RECEIZ_AUTHORITY_DOMAINS = [
  "artifact",
  "admission",
  "history",
  "receipt",
  "state",
  "plan",
  "capability",
  "operation",
  "confirmation",
  "identity",
  "transition",
  "namespace",
  "event",
  "registry",
  "idempotency",
  "effects",
  "command",
] as const;

export type ReceizAuthorityDomain = (typeof RECEIZ_AUTHORITY_DOMAINS)[number];

const MAX_DEPTH = 64;
const MAX_NODES = 100_000;
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;
const textEncoder = new TextEncoder();

function fail(code: string): never {
  throw new TypeError(code);
}

function u32(value: number): AuthorityBytes {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffff_ffff) {
    fail("AUTHORITY_ENCODING_RESOURCE_LIMIT");
  }
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

function framed(tag: number, payload: AuthorityBytes = new Uint8Array()): AuthorityBytes[] {
  return [Uint8Array.of(tag), u32(payload.byteLength), payload];
}

function normalizedUtf8(value: string): AuthorityBytes {
  return textEncoder.encode(value.normalize("NFC"));
}

function compareBytes(left: AuthorityBytes, right: AuthorityBytes): number {
  const length = Math.min(left.byteLength, right.byteLength);
  for (let index = 0; index < length; index += 1) {
    const delta = left[index]! - right[index]!;
    if (delta !== 0) return delta;
  }
  return left.byteLength - right.byteLength;
}

function concat(chunks: readonly AuthorityBytes[]): AuthorityBytes {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  if (length > MAX_OUTPUT_BYTES) fail("AUTHORITY_ENCODING_RESOURCE_LIMIT");
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

type EncodingState = { nodes: number; ancestors: Set<object> };

function encodeValue(value: unknown, state: EncodingState, depth: number): AuthorityBytes {
  state.nodes += 1;
  if (depth > MAX_DEPTH || state.nodes > MAX_NODES) fail("AUTHORITY_ENCODING_RESOURCE_LIMIT");
  if (value === null) return concat(framed(0x00));
  if (value === false) return concat(framed(0x01));
  if (value === true) return concat(framed(0x02));
  if (typeof value === "string") return concat(framed(0x03, normalizedUtf8(value)));
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) fail("AUTHORITY_ENCODING_INTEGER_REQUIRED");
    return concat(framed(0x04, normalizedUtf8(Object.is(value, -0) ? "0" : String(value))));
  }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    fail("AUTHORITY_ENCODING_UNSUPPORTED_VALUE");
  }
  if (typeof value !== "object") fail("AUTHORITY_ENCODING_UNSUPPORTED_VALUE");

  if (ArrayBuffer.isView(value)) {
    if (!(value instanceof Uint8Array)) fail("AUTHORITY_ENCODING_UNSUPPORTED_VALUE");
    if (typeof SharedArrayBuffer !== "undefined" && value.buffer instanceof SharedArrayBuffer) {
      fail("AUTHORITY_ENCODING_SHARED_BUFFER");
    }
    const snapshot: AuthorityBytes = new Uint8Array(value.byteLength);
    snapshot.set(value);
    return concat(framed(0x05, snapshot));
  }
  if (value instanceof ArrayBuffer) {
    const snapshot: AuthorityBytes = new Uint8Array(value.slice(0));
    return concat(framed(0x05, snapshot));
  }
  if (typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer) {
    fail("AUTHORITY_ENCODING_SHARED_BUFFER");
  }
  if (state.ancestors.has(value)) fail("AUTHORITY_ENCODING_CYCLE");
  state.ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const entries = value.map((entry) => encodeValue(entry, state, depth + 1));
      return concat(framed(0x06, concat([u32(entries.length), ...entries])));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail("AUTHORITY_ENCODING_PROTOTYPE");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const entries: Array<{ key: AuthorityBytes; encoded: AuthorityBytes }> = [];
    const normalizedKeys = new Set<string>();
    for (const originalKey of Reflect.ownKeys(descriptors)) {
      if (typeof originalKey !== "string") fail("AUTHORITY_ENCODING_UNSUPPORTED_VALUE");
      const descriptor = descriptors[originalKey]!;
      if (!descriptor.enumerable) continue;
      if (!("value" in descriptor)) fail("AUTHORITY_ENCODING_ACCESSOR");
      const key = originalKey.normalize("NFC");
      if (normalizedKeys.has(key)) fail("AUTHORITY_ENCODING_DUPLICATE_KEY");
      normalizedKeys.add(key);
      if (key.startsWith("!")) fail("AUTHORITY_ENCODING_UNKNOWN_CRITICAL_FIELD");
      const keyBytes = normalizedUtf8(key);
      entries.push({
        key: keyBytes,
        encoded: concat([u32(keyBytes.byteLength), keyBytes, encodeValue(descriptor.value, state, depth + 1)]),
      });
    }
    entries.sort((left, right) => compareBytes(left.key, right.key));
    return concat(framed(0x07, concat([u32(entries.length), ...entries.map((entry) => entry.encoded)])));
  } finally {
    state.ancestors.delete(value);
  }
}

export function encodeReceizAuthority(
  domain: ReceizAuthorityDomain,
  schema: string,
  value: unknown,
): AuthorityBytes {
  if (!RECEIZ_AUTHORITY_DOMAINS.includes(domain) || schema.length === 0) {
    fail("AUTHORITY_ENCODING_DOMAIN_REQUIRED");
  }
  const domainBytes = normalizedUtf8(domain);
  const schemaBytes = normalizedUtf8(schema);
  return concat([
    AUTHORITY_PREFIX,
    u32(domainBytes.byteLength),
    domainBytes,
    u32(schemaBytes.byteLength),
    schemaBytes,
    encodeValue(value, { nodes: 0, ancestors: new Set() }, 0),
  ]);
}

// Digest execution only. The contiguous encoder and every array subtree retain
// the historical encoder, including caller-owned map and immediate concat copies.
// Array subtrees still have its 16 MiB operational ceiling. Resource exhaustion
// is execution unavailability, never a completed canonical invalidity verdict.
const MAX_RETAINED_DIGEST_BYTES = MAX_OUTPUT_BYTES;
type DigestState = EncodingState & { retainedBytes: number };
type DigestNode = AuthorityBytes
  | Readonly<{ byteLength: number; text: string }>
  | Readonly<{ byteLength: number; children: readonly DigestNode[] }>;

export class AuthorityDigestExecutionUnavailable extends TypeError {
  readonly artifactValidity = "not-evaluated";
  readonly maximum = MAX_RETAINED_DIGEST_BYTES;
  constructor(readonly retainedSnapshotBytes: number, readonly requestedBytes: number) {
    super("AUTHORITY_ENCODING_RESOURCE_LIMIT");
  }
}

function reserveDigestBytes(state: DigestState, length: number): void {
  if (!Number.isSafeInteger(length) || length < 0 || state.retainedBytes + length > MAX_RETAINED_DIGEST_BYTES) {
    throw new AuthorityDigestExecutionUnavailable(state.retainedBytes, length);
  }
  state.retainedBytes += length;
}

function retainDigestBytes(state: DigestState, bytes: AuthorityBytes): AuthorityBytes {
  reserveDigestBytes(state, bytes.byteLength);
  return bytes;
}

function* digestTextChunks(text: string): Generator<AuthorityBytes> {
  for (let offset = 0; offset < text.length;) {
    let end = Math.min(offset + 32768, text.length);
    if (end < text.length && text.charCodeAt(end - 1) >= 0xd800 && text.charCodeAt(end - 1) <= 0xdbff
      && text.charCodeAt(end) >= 0xdc00 && text.charCodeAt(end) <= 0xdfff) end += 1;
    yield textEncoder.encode(text.slice(offset, end));
    offset = end;
  }
}

function digestText(value: string): DigestNode & { text: string } {
  const text = value.normalize("NFC");
  let byteLength = 0;
  for (const bytes of digestTextChunks(text)) byteLength += bytes.byteLength;
  return { text, byteLength };
}

function digestKey(value: string, state: DigestState): AuthorityBytes {
  const node = digestText(value);
  reserveDigestBytes(state, node.byteLength);
  return textEncoder.encode(node.text);
}

function joinDigestNodes(children: readonly DigestNode[]): DigestNode {
  const byteLength = children.reduce((total, child) => total + child.byteLength, 0);
  if (!Number.isSafeInteger(byteLength)) fail("AUTHORITY_ENCODING_RESOURCE_LIMIT");
  return { byteLength, children };
}

function frameDigestNode(tag: number, payload: DigestNode): DigestNode {
  return joinDigestNodes([Uint8Array.of(tag), u32(payload.byteLength), payload]);
}

function digestValueNode(value: unknown, state: DigestState, depth: number): DigestNode {
  // Array.isArray performs no caller callback. Delegate before touching the
  // shared counters/ancestors so the original subtree performs every visit once.
  if (Array.isArray(value) || (typeof value !== "string" && (value === null || typeof value !== "object"))
    || ArrayBuffer.isView(value)) {
    return retainDigestBytes(state, encodeValue(value, state, depth));
  }
  state.nodes += 1;
  if (depth > MAX_DEPTH || state.nodes > MAX_NODES) fail("AUTHORITY_ENCODING_RESOURCE_LIMIT");
  if (typeof value === "string") return frameDigestNode(0x03, digestText(value));

  // Preserve the exact observable ArrayBuffer slice/constructor/concat sequence.
  // Delegating after instanceof would observe a proxy prototype chain twice.
  if (value instanceof ArrayBuffer) {
    const snapshot: AuthorityBytes = new Uint8Array(value.slice(0));
    return retainDigestBytes(state, concat(framed(0x05, snapshot)));
  }
  if (typeof SharedArrayBuffer !== "undefined" && value instanceof SharedArrayBuffer) {
    fail("AUTHORITY_ENCODING_SHARED_BUFFER");
  }
  if (state.ancestors.has(value)) fail("AUTHORITY_ENCODING_CYCLE");
  state.ancestors.add(value);
  try {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail("AUTHORITY_ENCODING_PROTOTYPE");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const entries: Array<{ key: AuthorityBytes; encoded: DigestNode }> = [];
    const normalizedKeys = new Set<string>();
    for (const originalKey of Reflect.ownKeys(descriptors)) {
      if (typeof originalKey !== "string") fail("AUTHORITY_ENCODING_UNSUPPORTED_VALUE");
      const descriptor = descriptors[originalKey]!;
      if (!descriptor.enumerable) continue;
      if (!("value" in descriptor)) fail("AUTHORITY_ENCODING_ACCESSOR");
      const key = originalKey.normalize("NFC");
      if (normalizedKeys.has(key)) fail("AUTHORITY_ENCODING_DUPLICATE_KEY");
      normalizedKeys.add(key);
      if (key.startsWith("!")) fail("AUTHORITY_ENCODING_UNKNOWN_CRITICAL_FIELD");
      const keyBytes = digestKey(key, state);
      entries.push({
        key: keyBytes,
        encoded: joinDigestNodes([u32(keyBytes.byteLength), keyBytes, digestValueNode(descriptor.value, state, depth + 1)]),
      });
    }
    entries.sort((left, right) => compareBytes(left.key, right.key));
    return frameDigestNode(0x07, joinDigestNodes([u32(entries.length), ...entries.map((entry) => entry.encoded)]));
  } finally {
    state.ancestors.delete(value);
  }
}

function planDigest(domain: ReceizAuthorityDomain, schema: string, value: unknown): DigestNode {
  if (!RECEIZ_AUTHORITY_DOMAINS.includes(domain) || schema.length === 0) {
    fail("AUTHORITY_ENCODING_DOMAIN_REQUIRED");
  }
  const state: DigestState = { nodes: 0, ancestors: new Set(), retainedBytes: 0 };
  const domainBytes = digestKey(domain, state);
  const schemaBytes = digestKey(schema, state);
  return joinDigestNodes([AUTHORITY_PREFIX, u32(domainBytes.byteLength), domainBytes,
    u32(schemaBytes.byteLength), schemaBytes, digestValueNode(value, state, 0)]);
}

function* digestNodeChunks(node: DigestNode): Generator<AuthorityBytes> {
  if (node instanceof Uint8Array) { yield node; return; }
  if ("text" in node) { yield* digestTextChunks(node.text); return; }
  for (const child of node.children) yield* digestNodeChunks(child);
}

export async function digestReceizAuthority(
  domain: ReceizAuthorityDomain,
  schema: string,
  value: unknown,
): Promise<string> {
  const tree = planDigest(domain, schema, value);
  const hash = sha256.create();
  for (const bytes of digestNodeChunks(tree)) hash.update(bytes);
  return [...hash.digest()].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

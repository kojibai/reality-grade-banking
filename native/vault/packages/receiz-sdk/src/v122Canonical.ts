const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export type ReceizV122ZeroWriteValidationFailure<Code extends string = string> = Readonly<{
  ok: false;
  code: Code;
  writesOnFailure: 0;
}>;

export type ReceizV122ExactBytesValidationResult<Code extends string> =
  | Readonly<{ ok: true }>
  | ReceizV122ZeroWriteValidationFailure<Code>;

export type ReceizPersistedPlannedTransactionV122 = Readonly<{
  schema: "receiz.persisted-planned-transaction.v122";
  canonicalBytesB64u: string;
  transactionDigest: string;
}>;

export type ReceizSemanticIdempotencyInputV122 = Readonly<{
  operation: string;
  ownerReceizId: string;
  semanticIntent: unknown;
}>;

function fail(code: string): never {
  throw new TypeError(code);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalize(value: unknown, ancestors: Set<object>): string {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("V122_CANONICAL_FINITE_NUMBER_REQUIRED");
    return JSON.stringify(value);
  }
  if (typeof value !== "object") fail("V122_CANONICAL_UNSUPPORTED_VALUE");
  if (ancestors.has(value)) fail("V122_CANONICAL_CYCLE");
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const entries: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = descriptors[String(index)];
        if (!descriptor || !("value" in descriptor)) fail("V122_CANONICAL_UNSUPPORTED_VALUE");
        entries.push(canonicalize(descriptor.value, ancestors));
      }
      for (const key of Reflect.ownKeys(descriptors)) {
        if (key === "length" || (typeof key === "string" && /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < value.length)) continue;
        fail("V122_CANONICAL_ARRAY_PROPERTY");
      }
      return `[${entries.join(",")}]`;
    }
    if (!isPlainRecord(value)) fail("V122_CANONICAL_PROTOTYPE");
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    if (keys.some((key) => typeof key !== "string")) fail("V122_CANONICAL_SYMBOL_KEY");
    const stringKeys = keys as string[];
    stringKeys.sort();
    return `{${stringKeys.map((key) => {
      const descriptor = descriptors[key]!;
      if (!descriptor.enumerable || !("value" in descriptor)) fail("V122_CANONICAL_PROPERTY_DESCRIPTOR");
      return `${JSON.stringify(key)}:${canonicalize(descriptor.value, ancestors)}`;
    }).join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalizeReceizV122(value: unknown): string {
  return canonicalize(value, new Set());
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const snapshot = new Uint8Array(bytes.byteLength);
  snapshot.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", snapshot.buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function digestReceizCanonicalV122(value: unknown): Promise<string> {
  return sha256Hex(textEncoder.encode(canonicalizeReceizV122(value)));
}

function requireSha256Hex(value: string, code: string): void {
  if (!/^[0-9a-f]{64}$/.test(value)) fail(code);
}

export async function deriveReceizSubjectIdV122(admittedProofDigest: string): Promise<string> {
  requireSha256Hex(admittedProofDigest, "V122_PROOF_DIGEST_INVALID");
  const identityDigest = await digestReceizCanonicalV122({
    schema: "receiz.subject.identity.v122",
    admittedProofDigest,
  });
  return `receiz:subject:${identityDigest}`;
}

export async function createReceizSemanticIdempotencyKey(
  input: ReceizSemanticIdempotencyInputV122,
): Promise<string> {
  const operation = input.operation.trim();
  const ownerReceizId = input.ownerReceizId.trim();
  if (!/^[a-z][a-z0-9.-]{0,127}$/.test(operation)) fail("V122_IDEMPOTENCY_OPERATION_INVALID");
  if (ownerReceizId.length === 0) fail("V122_IDEMPOTENCY_OWNER_REQUIRED");
  const digest = await digestReceizCanonicalV122({
    schema: "receiz.semantic-idempotency.v122",
    operation,
    ownerReceizId,
    semanticIntent: input.semanticIntent,
  });
  return `receiz:v122:${operation}:${digest}`;
}

export function createReceizWorldIdempotencyDigestV122(worldId: string, idempotencyKey: string): Promise<string> {
  return digestReceizCanonicalV122({ schema: "receiz.world.idempotency.v122", worldId, idempotencyKey });
}

function exactHeadMapEntries(value: Readonly<Record<string, string>>): readonly (readonly [string, string])[] | null {
  if (!isPlainRecord(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) return null;
  const entries: Array<readonly [string, string]> = [];
  for (const key of keys as string[]) {
    const descriptor = descriptors[key]!;
    if (!descriptor.enumerable || !("value" in descriptor) || typeof descriptor.value !== "string") return null;
    entries.push([key, descriptor.value]);
  }
  return entries.sort(([left], [right]) => left.localeCompare(right));
}

export function equalReceizExactHeadMaps(
  left: Readonly<Record<string, string>>,
  right: Readonly<Record<string, string>>,
): boolean {
  const leftEntries = exactHeadMapEntries(left);
  const rightEntries = exactHeadMapEntries(right);
  if (!leftEntries || !rightEntries || leftEntries.length !== rightEntries.length) return false;
  return leftEntries.every(([key, head], index) => key === rightEntries[index]![0] && head === rightEntries[index]![1]);
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  let difference = 0;
  for (let index = 0; index < left.byteLength; index += 1) difference |= left[index]! ^ right[index]!;
  return difference === 0;
}

function validateExactBytes<Code extends string>(
  value: unknown,
  exactBytes: Uint8Array,
  code: Code,
): ReceizV122ExactBytesValidationResult<Code> {
  const canonicalBytes = textEncoder.encode(canonicalizeReceizV122(value));
  return equalBytes(canonicalBytes, exactBytes) ? { ok: true } : { ok: false, code, writesOnFailure: 0 };
}

export function validateReceizExactCommandBytes(
  command: unknown,
  exactBytes: Uint8Array,
): ReceizV122ExactBytesValidationResult<"command_bytes_mismatch"> {
  return validateExactBytes(command, exactBytes, "command_bytes_mismatch");
}

export function validateReceizExactTransactionBytes(
  transaction: unknown,
  exactBytes: Uint8Array,
): ReceizV122ExactBytesValidationResult<"transaction_bytes_mismatch"> {
  return validateExactBytes(transaction, exactBytes, "transaction_bytes_mismatch");
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) fail("V122_PERSISTED_TRANSACTION_ENCODING_INVALID");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    fail("V122_PERSISTED_TRANSACTION_ENCODING_INVALID");
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function persistReceizExactPlannedTransaction(
  transaction: unknown,
): Promise<ReceizPersistedPlannedTransactionV122> {
  const bytes = textEncoder.encode(canonicalizeReceizV122(transaction));
  return {
    schema: "receiz.persisted-planned-transaction.v122",
    canonicalBytesB64u: base64UrlEncode(bytes),
    transactionDigest: await sha256Hex(bytes),
  };
}

export async function restoreReceizExactPlannedTransaction<T = unknown>(
  persisted: ReceizPersistedPlannedTransactionV122,
): Promise<T> {
  if (persisted.schema !== "receiz.persisted-planned-transaction.v122") {
    fail("V122_PERSISTED_TRANSACTION_SCHEMA_INVALID");
  }
  requireSha256Hex(persisted.transactionDigest, "V122_PERSISTED_TRANSACTION_DIGEST_INVALID");
  const bytes = base64UrlDecode(persisted.canonicalBytesB64u);
  if (await sha256Hex(bytes) !== persisted.transactionDigest) fail("V122_PERSISTED_TRANSACTION_DIGEST_MISMATCH");
  let parsed: unknown;
  try {
    parsed = JSON.parse(textDecoder.decode(bytes));
  } catch {
    fail("V122_PERSISTED_TRANSACTION_JSON_INVALID");
  }
  const recanonicalized = textEncoder.encode(canonicalizeReceizV122(parsed));
  if (!equalBytes(bytes, recanonicalized)) fail("V122_PERSISTED_TRANSACTION_NONCANONICAL");
  return parsed as T;
}

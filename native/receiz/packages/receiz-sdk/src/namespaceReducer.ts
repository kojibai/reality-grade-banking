import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import type {
  ReceizNamespaceDigest,
  ReceizNamespaceId,
} from "./artifactTransition.js";
import { assertReceizProtocolMaximum } from "./verificationLimits.js";

export const RECEIZ_PROVENANCE_NAMESPACE_LAW_VERSION = "receiz.namespace.provenance-append.v112@1";
export const RECEIZ_PROVENANCE_NAMESPACE_REDUCER_VERSION = "receiz.namespace.provenance-append.reducer.v1";
export const RECEIZ_PROFILE_SHOWCASE_NAMESPACE_LAW_VERSION =
  "receiz.namespace.profile-showcase-append.v114@1";
export const RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REDUCER_VERSION =
  "receiz.namespace.profile-showcase.reducer.v1";
export const RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_LAW_VERSION =
  "receiz.namespace.economy-showcase-append.v114@1";
export const RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REDUCER_VERSION =
  "receiz.namespace.economy-showcase.reducer.v1";

export type ReceizNamespaceBodySnapshot = Readonly<{
  namespace: ReceizNamespaceId;
  bytes: Uint8Array;
  bodyDigest: ReceizNamespaceDigest;
}>;

export type ReceizNamespaceReduction = Readonly<{
  namespace: ReceizNamespaceId;
  namespaceLawVersion: string;
  namespaceReducerVersion: string;
  priorTarget: ReceizNamespaceBodySnapshot | null;
  proposedTargetBytes: Uint8Array;
  proposedTargetDigest: ReceizNamespaceDigest;
  preservedNamespaces: ReadonlyMap<string, ReceizNamespaceBodySnapshot>;
}>;

const decoder = new TextDecoder("utf-8", { fatal: true });
const encoder = new TextEncoder();

function namespaceId(value: string): ReceizNamespaceId {
  if (!value || value.normalize("NFC") !== value || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError("NAMESPACE_ID_INVALID");
  }
  return Object.freeze({ scheme: "receiz-namespace.v1", value });
}

function whitespace(byte: number | undefined): boolean {
  return byte === 0x20 || byte === 0x09 || byte === 0x0a || byte === 0x0d;
}

function skipWhitespace(bytes: Uint8Array, start: number): number {
  let index = start;
  while (whitespace(bytes[index])) index += 1;
  return index;
}

function scanString(bytes: Uint8Array, start: number): number {
  if (bytes[start] !== 0x22) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
  let escaped = false;
  for (let index = start + 1; index < bytes.length; index += 1) {
    const byte = bytes[index]!;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (byte === 0x5c) escaped = true;
    else if (byte === 0x22) return index + 1;
  }
  throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
}

function scanValue(bytes: Uint8Array, start: number): number {
  if (bytes[start] === 0x22) return scanString(bytes, start);
  if (bytes[start] === 0x7b || bytes[start] === 0x5b) {
    const stack: number[] = [bytes[start]!];
    let index = start + 1;
    while (index < bytes.length && stack.length > 0) {
      const byte = bytes[index]!;
      if (byte === 0x22) {
        index = scanString(bytes, index);
        continue;
      }
      if (byte === 0x7b || byte === 0x5b) stack.push(byte);
      else if (byte === 0x7d || byte === 0x5d) {
        const opening = stack.pop();
        if ((opening === 0x7b && byte !== 0x7d) || (opening === 0x5b && byte !== 0x5d)) {
          throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
        }
      }
      index += 1;
    }
    if (stack.length !== 0) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
    return index;
  }
  let index = start;
  while (index < bytes.length && bytes[index] !== 0x2c && bytes[index] !== 0x7d && !whitespace(bytes[index])) index += 1;
  if (index === start) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
  return index;
}

async function bodySnapshot(name: string, bytes: Uint8Array): Promise<ReceizNamespaceBodySnapshot> {
  const snapshot = bytes.slice();
  const value = await digestReceizAuthority("namespace", "receiz.namespace-body.v112", snapshot);
  return Object.freeze({
    namespace: namespaceId(name),
    bytes: snapshot,
    bodyDigest: Object.freeze({ algorithm: "sha-256", binds: "canonical-namespace-body", value }),
  });
}

/**
 * Parses only the top-level object framing. Namespace values are never decoded
 * or reconstructed, so every captured body retains its exact admitted bytes.
 */
export async function snapshotReceizNamespaceBodies(
  payloadBytes: Uint8Array,
): Promise<ReadonlyMap<string, ReceizNamespaceBodySnapshot>> {
  const bytes = payloadBytes.slice();
  let index = skipWhitespace(bytes, 0);
  if (bytes[index] !== 0x7b) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
  index = skipWhitespace(bytes, index + 1);
  const snapshots = new Map<string, ReceizNamespaceBodySnapshot>();
  while (bytes[index] !== 0x7d) {
    const keyStart = index;
    const keyEnd = scanString(bytes, keyStart);
    let name: unknown;
    try {
      name = JSON.parse(decoder.decode(bytes.slice(keyStart, keyEnd)));
    } catch {
      throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
    }
    if (typeof name !== "string" || snapshots.has(name)) throw new TypeError("NAMESPACE_ID_INVALID");
    namespaceId(name);
    index = skipWhitespace(bytes, keyEnd);
    if (bytes[index] !== 0x3a) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
    const valueStart = skipWhitespace(bytes, index + 1);
    const valueEnd = scanValue(bytes, valueStart);
    const raw = bytes.slice(valueStart, valueEnd);
    try {
      JSON.parse(decoder.decode(raw));
    } catch {
      throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
    }
    snapshots.set(name, await bodySnapshot(name, raw));
    index = skipWhitespace(bytes, valueEnd);
    if (bytes[index] === 0x2c) index = skipWhitespace(bytes, index + 1);
    else if (bytes[index] !== 0x7d) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
  }
  if (skipWhitespace(bytes, index + 1) !== bytes.length) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
  return snapshots;
}

function validNamespace(value: unknown): value is ReceizNamespaceId {
  return Boolean(value)
    && typeof value === "object"
    && (value as ReceizNamespaceId).scheme === "receiz-namespace.v1"
    && typeof (value as ReceizNamespaceId).value === "string";
}

function exactBodySlices(payloadBytes: Uint8Array): ReadonlyMap<string, Uint8Array> {
  const bytes = payloadBytes.slice();
  let index = skipWhitespace(bytes, 0);
  if (bytes[index] !== 0x7b) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
  index = skipWhitespace(bytes, index + 1);
  const bodies = new Map<string, Uint8Array>();
  while (bytes[index] !== 0x7d) {
    const keyStart = index;
    const keyEnd = scanString(bytes, keyStart);
    let name: unknown;
    try { name = JSON.parse(decoder.decode(bytes.slice(keyStart, keyEnd))); } catch {
      throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
    }
    if (typeof name !== "string" || bodies.has(name)) throw new TypeError("NAMESPACE_ID_INVALID");
    namespaceId(name);
    index = skipWhitespace(bytes, keyEnd);
    if (bytes[index] !== 0x3a) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
    const valueStart = skipWhitespace(bytes, index + 1);
    const valueEnd = scanValue(bytes, valueStart);
    const body = bytes.slice(valueStart, valueEnd);
    try { JSON.parse(decoder.decode(body)); } catch { throw new TypeError("NAMESPACE_PAYLOAD_INVALID"); }
    bodies.set(name, body);
    index = skipWhitespace(bytes, valueEnd);
    if (bytes[index] === 0x2c) index = skipWhitespace(bytes, index + 1);
    else if (bytes[index] !== 0x7d) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
  }
  if (skipWhitespace(bytes, index + 1) !== bytes.length) throw new TypeError("NAMESPACE_PAYLOAD_INVALID");
  return bodies;
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.byteLength === right.byteLength && left.every((byte, index) => byte === right[index]);
}

function compareUtf8(left: string, right: string): number {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.min(leftBytes.byteLength, rightBytes.byteLength);
  for (let index = 0; index < length; index += 1) {
    const difference = leftBytes[index]! - rightBytes[index]!;
    if (difference !== 0) return difference;
  }
  return leftBytes.byteLength - rightBytes.byteLength;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasForbiddenShowcaseArtifactDigest(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenShowcaseArtifactDigest);
  if (!isRecord(value)) return false;
  if (Object.prototype.hasOwnProperty.call(value, "artifactSha256")) return true;
  return Object.values(value).some(hasForbiddenShowcaseArtifactDigest);
}

/**
 * Rebuilds only the top-level namespace framing. Every non-target body is
 * copied from the reducer's exact admitted snapshot without parsing or
 * serialization.
 */
export function composeReceizNamespaceReductionPayload(input: Readonly<{
  originalPayloadBytes: Uint8Array;
  reduction: ReceizNamespaceReduction;
}>): Uint8Array {
  const original = exactBodySlices(input.originalPayloadBytes);
  const targetName = input.reduction.namespace.value;
  const priorTarget = original.get(targetName);
  if (!priorTarget || !input.reduction.priorTarget
    || !equalBytes(priorTarget, input.reduction.priorTarget.bytes)
    || input.reduction.preservedNamespaces.size !== original.size - 1) {
    throw new TypeError("NAMESPACE_REDUCTION_MISMATCH");
  }
  for (const [name, snapshot] of input.reduction.preservedNamespaces) {
    const body = original.get(name);
    if (!body || name === targetName || snapshot.namespace.value !== name
      || !equalBytes(body, snapshot.bytes)) throw new TypeError("NAMESPACE_REDUCTION_MISMATCH");
  }
  const names = [...original.keys()].sort(compareUtf8);
  const chunks: Uint8Array[] = [encoder.encode("{")];
  names.forEach((name, index) => {
    if (index > 0) chunks.push(encoder.encode(","));
    chunks.push(encoder.encode(`${JSON.stringify(name)}:`));
    chunks.push(name === targetName
      ? input.reduction.proposedTargetBytes.slice()
      : input.reduction.preservedNamespaces.get(name)!.bytes.slice());
  });
  chunks.push(encoder.encode("}"));
  const size = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const composed = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    composed.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return composed;
}

export async function reduceReceizNamespace(input: Readonly<{
  payloadBytes: Uint8Array;
  namespace: ReceizNamespaceId;
  namespaceLawVersion: string;
  namespaceReducerVersion: string;
  event: ReceizConstitutionJson;
}>): Promise<ReceizNamespaceReduction> {
  if (!validNamespace(input.namespace)) throw new TypeError("NAMESPACE_ID_INVALID");
  namespaceId(input.namespace.value);
  const provenance = input.namespace.value === "provenance";
  const profileShowcase = input.namespace.value === "profile-showcase";
  const economyShowcase = input.namespace.value === "economy-showcase";
  if (!provenance && !profileShowcase && !economyShowcase) {
    throw new TypeError("NAMESPACE_REDUCER_UNREGISTERED");
  }
  const expectedLaw = economyShowcase
    ? RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_LAW_VERSION
    : profileShowcase
    ? RECEIZ_PROFILE_SHOWCASE_NAMESPACE_LAW_VERSION
    : RECEIZ_PROVENANCE_NAMESPACE_LAW_VERSION;
  const expectedReducer = economyShowcase
    ? RECEIZ_ECONOMY_SHOWCASE_NAMESPACE_REDUCER_VERSION
    : profileShowcase
    ? RECEIZ_PROFILE_SHOWCASE_NAMESPACE_REDUCER_VERSION
    : RECEIZ_PROVENANCE_NAMESPACE_REDUCER_VERSION;
  if (input.namespaceLawVersion !== expectedLaw) {
    throw new TypeError("NAMESPACE_LAW_VERSION_MISMATCH");
  }
  if (input.namespaceReducerVersion !== expectedReducer) {
    throw new TypeError("NAMESPACE_REDUCER_VERSION_MISMATCH");
  }
  const bodies = await snapshotReceizNamespaceBodies(input.payloadBytes);
  const prior = bodies.get(input.namespace.value) ?? null;
  if (!prior) throw new TypeError("NAMESPACE_TARGET_MISSING");
  let priorValue: unknown;
  try {
    priorValue = JSON.parse(decoder.decode(prior.bytes));
  } catch {
    throw new TypeError("NAMESPACE_TARGET_INVALID");
  }
  if (!isRecord(priorValue)) throw new TypeError("NAMESPACE_TARGET_INVALID");
  let proposedValue: ReceizConstitutionJson;
  if (profileShowcase || economyShowcase) {
    const eventSchema = economyShowcase
      ? "receiz.economy-showcase.namespace-event.v1"
      : "receiz.profile-showcase.namespace-event.v1";
    const resultKey = economyShowcase
      ? "resultingEconomyShowcase"
      : "resultingShowcase";
    if (!isRecord(input.event)
      || Object.keys(input.event).sort().join(",") !== `${resultKey},schema`
      || input.event.schema !== eventSchema
      || !isRecord(input.event[resultKey])) {
      throw new TypeError(
        economyShowcase
          ? "ECONOMY_SHOWCASE_EVENT_INVALID"
          : "PROFILE_SHOWCASE_EVENT_INVALID",
      );
    }
    const resultingShowcase = input.event[resultKey] as Record<string, unknown>;
    if (hasForbiddenShowcaseArtifactDigest(resultingShowcase)) {
      throw new TypeError(
        economyShowcase
          ? "ECONOMY_SHOWCASE_SELF_DIGEST_FORBIDDEN"
          : "PROFILE_SHOWCASE_SELF_DIGEST_FORBIDDEN",
      );
    }
    const schemaValid = economyShowcase
      ? resultingShowcase.schema === "receiz.economy-showcase-head.v114"
      : [
          "receiz.profile-showcase.v1",
          "receiz.profile-showcase-head.v114",
        ].includes(String(resultingShowcase.schema));
    if (
      !schemaValid
      || resultingShowcase.artifactId !== priorValue.artifactId
      || (!economyShowcase
        && resultingShowcase.ownerReceizIdentity
          !== priorValue.ownerReceizIdentity)
      || (economyShowcase
        && resultingShowcase.artifactId !== "economy-showcase:receiz.com")
    ) {
      throw new TypeError(
        economyShowcase
          ? "ECONOMY_SHOWCASE_IDENTITY_CHANGED"
          : "PROFILE_SHOWCASE_IDENTITY_CHANGED",
      );
    }
    proposedValue = structuredClone(resultingShowcase) as ReceizConstitutionJson;
  } else {
    if (!Array.isArray(priorValue.appends)) throw new TypeError("NAMESPACE_TARGET_INVALID");
    assertReceizProtocolMaximum("reducerOperations", priorValue.appends.length + 1);
    canonicalizeReceizConstitution(input.event);
    proposedValue = {
      ...(priorValue as Record<string, ReceizConstitutionJson>),
      appends: [...(priorValue.appends as ReceizConstitutionJson[]), structuredClone(input.event)],
    };
  }
  const proposedTargetBytes = encoder.encode(canonicalizeReceizConstitution(proposedValue));
  const preserved = new Map<string, ReceizNamespaceBodySnapshot>();
  for (const [name, snapshot] of bodies) if (name !== input.namespace.value) preserved.set(name, snapshot);
  return Object.freeze({
    namespace: namespaceId(input.namespace.value),
    namespaceLawVersion: input.namespaceLawVersion,
    namespaceReducerVersion: input.namespaceReducerVersion,
    priorTarget: prior,
    proposedTargetBytes,
    proposedTargetDigest: (await bodySnapshot(input.namespace.value, proposedTargetBytes)).bodyDigest,
    preservedNamespaces: preserved,
  });
}

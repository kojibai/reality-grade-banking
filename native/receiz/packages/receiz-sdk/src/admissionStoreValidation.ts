import {
  canonicalizeReceizConstitution,
  type ReceizConstitutionJson,
} from "./constitution.js";
import type {
  ReceizAdmissionAggregateSeed,
  ReceizAdmissionUnitOfWork,
} from "./admissionStore.js";

function nonempty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

const FORBIDDEN_PROOF_SCHEMA_PREFIXES = ["receiz.sealed-artifact.", "receiz.proof-object."] as const;
const FORBIDDEN_BINARY_TAGS = new Set([
  "[object ArrayBuffer]",
  "[object SharedArrayBuffer]",
  "[object DataView]",
  "[object Blob]",
  "[object File]",
  "[object Uint8Array]",
  "[object Uint8ClampedArray]",
  "[object Uint16Array]",
  "[object Uint32Array]",
  "[object Int8Array]",
  "[object Int16Array]",
  "[object Int32Array]",
  "[object Float32Array]",
  "[object Float64Array]",
  "[object BigInt64Array]",
  "[object BigUint64Array]",
]);
const FORBIDDEN_PROOF_KEYS = new Set([
  "exactBytes",
  "artifactBytes",
  "sealedArtifact",
  "proofObject",
]);

function forbiddenPersistenceKey(key: string): boolean {
  return FORBIDDEN_PROOF_KEYS.has(key);
}

/**
 * Browser admission persistence is deliberately narrower than structured-clone.
 * Only canonical plain JSON admission coordination is eligible; proof objects,
 * byte carriers, custom containers, accessors, and serialized proof schemas are
 * rejected before an adapter can open storage.
 */
export function isReceizAdmissionPersistenceValueSafe(value: unknown): value is ReceizConstitutionJson {
  const seen = new Set<object>();
  const visit = (current: unknown, proofOnly: boolean): boolean => {
    if (current === null || typeof current === "boolean") return true;
    if (typeof current === "string") {
      const trimmed = current.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed) as unknown;
          if (!visit(parsed, true)) return false;
        } catch {
          // Ordinary text that merely starts with punctuation is still JSON text.
        }
      }
      return true;
    }
    if (typeof current === "number") return Number.isFinite(current);
    if (typeof current !== "object") return proofOnly;

    const object = current as object;
    if (seen.has(object)) return false;
    seen.add(object);
    try {
      if (ArrayBuffer.isView(object)) return false;
      const symbols = Object.getOwnPropertySymbols(object);
      if (symbols.length > 0) return false;
      const tag = Object.prototype.toString.call(object);
      if (FORBIDDEN_BINARY_TAGS.has(tag) || ArrayBuffer.isView(object)) return false;
      if (Array.isArray(object)) {
        const keys = Object.keys(object);
        if (keys.length !== object.length || keys.some((key, index) => key !== String(index))) return proofOnly;
        const descriptors = Object.getOwnPropertyDescriptors(object);
        for (let index = 0; index < object.length; index += 1) {
          const descriptor = descriptors[String(index)];
          if (!descriptor?.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return proofOnly;
          if (!visit(descriptor.value, proofOnly)) return false;
        }
        return true;
      }
      if (tag !== "[object Object]") return proofOnly;
      const prototype = Object.getPrototypeOf(object);
      const foreignPlainPrototype = prototype !== null
        && typeof prototype === "object"
        && Object.getPrototypeOf(prototype) === null
        && Object.keys(prototype).length === 0;
      if (prototype !== Object.prototype && prototype !== null && !foreignPlainPrototype) return proofOnly;
      const descriptors = Object.getOwnPropertyDescriptors(object);
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (!descriptor.enumerable || descriptor.get || descriptor.set || !("value" in descriptor)) return proofOnly;
        if (forbiddenPersistenceKey(key)) return false;
        if (key === "schema" && typeof descriptor.value === "string"
          && FORBIDDEN_PROOF_SCHEMA_PREFIXES.some((prefix) => descriptor.value.startsWith(prefix))) return false;
        if (!visit(descriptor.value, proofOnly)) return false;
      }
      return true;
    } catch {
      return false;
    } finally {
      seen.delete(object);
    }
  };
  return visit(value, false);
}

export function containsForbiddenReceizProofPersistence(value: unknown): boolean {
  const seen = new Set<object>();
  const visit = (current: unknown): boolean => {
    if (typeof current === "string") {
      const trimmed = current.trim();
      if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return false;
      try {
        return visit(JSON.parse(trimmed) as unknown);
      } catch {
        return false;
      }
    }
    if (!current || typeof current !== "object") return false;
    if (seen.has(current)) return false;
    seen.add(current);
    try {
      if (ArrayBuffer.isView(current)) return true;
      if (Object.getOwnPropertySymbols(current).length > 0) return true;
      if (FORBIDDEN_BINARY_TAGS.has(Object.prototype.toString.call(current))) return true;
      const descriptors = Object.getOwnPropertyDescriptors(current);
      for (const [key, descriptor] of Object.entries(descriptors)) {
        if (Array.isArray(current) && key === "length") continue;
        if (forbiddenPersistenceKey(key)) return true;
        if (!("value" in descriptor)) return true;
        if (key === "schema" && typeof descriptor.value === "string"
          && FORBIDDEN_PROOF_SCHEMA_PREFIXES.some((prefix) => descriptor.value.startsWith(prefix))) return true;
        if (visit(descriptor.value)) return true;
      }
      return false;
    } catch {
      return true;
    } finally {
      seen.delete(current);
    }
  };
  return visit(value);
}

export function validReceizAdmissionUnit(unit: ReceizAdmissionUnitOfWork): boolean {
  if (!isReceizAdmissionPersistenceValueSafe(unit)
    || unit.schema !== "receiz.admission.unit-of-work.v1"
    || !nonempty(unit.aggregateId)
    || !nonempty(unit.commandDigest)
    || !nonempty(unit.idempotencyKey)
    || !Number.isInteger(unit.expectedRevision)
    || unit.expectedRevision < 0
    || (unit.expectedHeadDigest !== null && !nonempty(unit.expectedHeadDigest))
    || unit.nextHead.revision !== unit.expectedRevision + 1
    || !nonempty(unit.nextHead.digest)
    || !Array.isArray(unit.events)
    || !Array.isArray(unit.outboxIntents)
    || Object.values(unit.resourceEffects).some((amount) => typeof amount !== "number" || !Number.isFinite(amount))) return false;
  try {
    if (unit.consumedPbiReceiptDigests !== undefined && (!Array.isArray(unit.consumedPbiReceiptDigests)
      || unit.consumedPbiReceiptDigests.some((value, index) => typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)
        || (index > 0 && unit.consumedPbiReceiptDigests![index - 1]! >= value)))) return false;
    if (unit.readDependencies !== undefined) {
      if (!Array.isArray(unit.readDependencies)) return false;
      for (const [index, dependency] of unit.readDependencies.entries()) {
        if (!dependency || typeof dependency !== "object"
          || Object.keys(dependency).sort().join(",") !== "aggregateId,expectedHeadDigest"
          || !nonempty(dependency.aggregateId) || dependency.aggregateId.normalize("NFC") !== dependency.aggregateId
          || !nonempty(dependency.expectedHeadDigest)
          || (index > 0 && unit.readDependencies[index - 1]!.aggregateId >= dependency.aggregateId)) return false;
      }
    }
    canonicalizeReceizConstitution(unit);
    return true;
  } catch {
    return false;
  }
}

export function receizAdmissionTransactionRecordCount(unit: ReceizAdmissionUnitOfWork): number {
  return 6 + unit.events.length + unit.outboxIntents.length + Object.keys(unit.resourceEffects).length
    + (unit.consumedPbiReceiptDigests?.length ?? 0);
}

export function validateReceizAdmissionAggregateSeed(input: ReceizAdmissionAggregateSeed): void {
  if (containsForbiddenReceizProofPersistence(input)) {
    throw new TypeError("RECEIZ_ADMISSION_PROOF_PERSISTENCE_FORBIDDEN");
  }
  const validIdentity = nonempty(input.aggregateId)
    && input.aggregateId.normalize("NFC") === input.aggregateId;
  const validRevision = Number.isInteger(input.revision) && input.revision >= 0;
  const validHead = input.headDigest === null || nonempty(input.headDigest);
  let validState = isReceizAdmissionPersistenceValueSafe(input.state);
  try {
    canonicalizeReceizConstitution(input.state);
  } catch {
    validState = false;
  }
  if (!validIdentity || !validRevision || !validHead || !validState) {
    throw new TypeError("RECEIZ_ADMISSION_AGGREGATE_SEED_INVALID");
  }
}

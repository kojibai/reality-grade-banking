import type { ProfileOriginal } from "@/app/lib/profile/types";

export const COMPLETE_LEGACY_SHOWCASE_MIGRATION_MIME =
  "application/vnd.receiz.profile-showcase-migration+json";
export const COMPLETE_LEGACY_SHOWCASE_MIGRATION_MAX_PAYLOAD_BYTES =
  512 * 1024;

type CompleteLegacyShowcaseMigrationPayload = Readonly<{
  schema: "receiz.profile-showcase.complete-migration.v1";
  ownerReceizIdentity: string;
  originals: readonly ProfileOriginal[];
  authority: Readonly<{
    migrationPayloadIsProofAuthority: false;
    strongerTruth: "enclosing-sealed-portable-proof-object";
    method: "observed-and-adopted";
  }>;
}>;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function isLegacyMigrationProfileOriginal(
  value: unknown,
): value is ProfileOriginal {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && typeof (value as Record<string, unknown>).id === "string"
    && typeof (value as Record<string, unknown>).slug === "string"
    && typeof (value as Record<string, unknown>).code === "string"
    && typeof (value as Record<string, unknown>).verifyPath === "string"
    && typeof (value as Record<string, unknown>).createdAt === "string"
    && typeof (value as Record<string, unknown>).showOnProfile === "boolean";
}

export function canonicalizeCompleteLegacyShowcaseOriginals(
  originals: readonly ProfileOriginal[],
): readonly ProfileOriginal[] {
  const byId = new Map<string, ProfileOriginal>();
  for (const original of originals) {
    if (!isLegacyMigrationProfileOriginal(original)) continue;
    const existing = byId.get(original.id);
    if (existing && canonicalJson(existing) !== canonicalJson(original)) {
      throw new TypeError(
        "PROFILE_SHOWCASE_LEGACY_MIGRATION_IDENTITY_CONFLICT",
      );
    }
    if (!existing) {
      byId.set(
        original.id,
        JSON.parse(JSON.stringify(original)) as ProfileOriginal,
      );
    }
  }
  return Object.freeze([...byId.values()].sort((left, right) => {
    const created = right.createdAt.localeCompare(left.createdAt);
    return created !== 0 ? created : left.id.localeCompare(right.id);
  }));
}

/**
 * Representation size is a recursive composition boundary, never a truth
 * boundary. The canonical legacy inventory is therefore divided into exact,
 * deterministic sealed child payloads before native showcase admission.
 */
export function partitionCompleteLegacyShowcaseMigrationOriginals(
  input: Readonly<{
    ownerReceizIdentity: string;
    originals: readonly ProfileOriginal[];
    maximumPayloadBytes?: number;
  }>,
): readonly (readonly ProfileOriginal[])[] {
  const maximumPayloadBytes = input.maximumPayloadBytes
    ?? COMPLETE_LEGACY_SHOWCASE_MIGRATION_MAX_PAYLOAD_BYTES;
  if (
    !input.ownerReceizIdentity.trim()
    || !Number.isSafeInteger(maximumPayloadBytes)
    || maximumPayloadBytes <= 0
  ) {
    throw new TypeError("PROFILE_SHOWCASE_LEGACY_MIGRATION_PARTITION_INVALID");
  }
  const originals = canonicalizeCompleteLegacyShowcaseOriginals(input.originals);
  if (originals.length === 0) return Object.freeze([]);
  const encoder = new TextEncoder();
  const emptyPayloadBytes = encodeCompleteLegacyShowcaseMigrationPayload({
    ownerReceizIdentity: input.ownerReceizIdentity,
    originals: [],
  }).byteLength;
  const chunks: ProfileOriginal[][] = [];
  let current: ProfileOriginal[] = [];
  let currentBytes = emptyPayloadBytes;
  for (const original of originals) {
    const originalBytes = encoder.encode(canonicalJson(original)).byteLength;
    const nextBytes = currentBytes + originalBytes + (current.length > 0 ? 1 : 0);
    if (nextBytes > maximumPayloadBytes && current.length > 0) {
      chunks.push(current);
      current = [];
      currentBytes = emptyPayloadBytes;
    }
    const isolatedBytes = currentBytes + originalBytes;
    if (isolatedBytes > maximumPayloadBytes) {
      throw new TypeError(
        "PROFILE_SHOWCASE_LEGACY_MIGRATION_RECURSIVE_SEGMENT_REQUIRED",
      );
    }
    current.push(original);
    currentBytes = isolatedBytes + (current.length > 1 ? 1 : 0);
  }
  if (current.length > 0) chunks.push(current);
  return Object.freeze(chunks.map((chunk) => Object.freeze(chunk.slice())));
}

export function encodeCompleteLegacyShowcaseMigrationPayload(input: Readonly<{
  ownerReceizIdentity: string;
  originals: readonly ProfileOriginal[];
}>): Uint8Array {
  if (!input.ownerReceizIdentity.trim()) {
    throw new TypeError("PROFILE_SHOWCASE_LEGACY_MIGRATION_OWNER_INVALID");
  }
  const payload: CompleteLegacyShowcaseMigrationPayload = {
    schema: "receiz.profile-showcase.complete-migration.v1",
    ownerReceizIdentity: input.ownerReceizIdentity,
    originals: canonicalizeCompleteLegacyShowcaseOriginals(input.originals),
    authority: {
      migrationPayloadIsProofAuthority: false,
      strongerTruth: "enclosing-sealed-portable-proof-object",
      method: "observed-and-adopted",
    },
  };
  return new TextEncoder().encode(canonicalJson(payload));
}

export function decodeCompleteLegacyShowcaseMigrationPayload(
  bytes: Uint8Array,
): readonly ProfileOriginal[] {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    throw new TypeError("PROFILE_SHOWCASE_LEGACY_MIGRATION_PAYLOAD_INVALID");
  }
  const payload = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(bytes),
  ) as unknown;
  if (
    payload === null
    || typeof payload !== "object"
    || Array.isArray(payload)
  ) {
    throw new TypeError("PROFILE_SHOWCASE_LEGACY_MIGRATION_PAYLOAD_INVALID");
  }
  const record = payload as Record<string, unknown>;
  const authority = record.authority;
  if (
    record.schema !== "receiz.profile-showcase.complete-migration.v1"
    || typeof record.ownerReceizIdentity !== "string"
    || !Array.isArray(record.originals)
    || !record.originals.every(isLegacyMigrationProfileOriginal)
    || authority === null
    || typeof authority !== "object"
    || Array.isArray(authority)
    || (authority as Record<string, unknown>)
      .migrationPayloadIsProofAuthority !== false
    || (authority as Record<string, unknown>).strongerTruth
      !== "enclosing-sealed-portable-proof-object"
    || (authority as Record<string, unknown>).method !== "observed-and-adopted"
  ) {
    throw new TypeError("PROFILE_SHOWCASE_LEGACY_MIGRATION_PAYLOAD_INVALID");
  }
  const canonical = canonicalizeCompleteLegacyShowcaseOriginals(
    record.originals,
  );
  if (canonicalJson(record.originals) !== canonicalJson(canonical)) {
    throw new TypeError(
      "PROFILE_SHOWCASE_LEGACY_MIGRATION_PAYLOAD_NONCANONICAL",
    );
  }
  return canonical;
}

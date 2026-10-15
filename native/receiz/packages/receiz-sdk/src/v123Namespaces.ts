import { sha256ReceizBytes } from "./artifacts.js";
import { receizBase64UrlDecode } from "./identity.js";
import { digestReceizCanonicalV122 } from "./v122Canonical.js";
import type { ReceizSubjectStateV122 } from "./v122Subjects.js";

const SHA256 = /^[0-9a-f]{64}$/;
const NAME = /^[a-z][a-z0-9._-]{0,63}$/;

export type ReceizSubjectNamespaceResolutionInputV123 = Readonly<{
  subjectId: string;
  atHead: string;
  names: readonly string[];
}>;

export type ReceizSubjectNamespaceResolutionV123 = Readonly<{
  schema: "receiz.subject.namespace-resolution.v123";
  subjectId: string;
  atHead: string;
  admittedProofDigest: string;
  ownershipHead: string;
  registryDigest: string;
  reducerDigest: string;
  namespaces: readonly Readonly<{
    name: string;
    found: boolean;
    exactBytesB64u: string | null;
    digest: string | null;
  }>[];
  authority: Readonly<{
    resolutionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
  resolutionDigest: string;
}>;

export type ReceizSubjectNamespaceResolutionFailureV123 = Readonly<{
  ok: false;
  code: "SUBJECT_HEAD_STALE" | "NOT_FOUND_OR_NOT_AUTHORIZED" | "NAMESPACE_INPUT_INVALID";
  writes: 0;
  currentHead?: string;
}>;

export type ReceizSubjectNamespaceResolutionResultV123 =
  | ReceizSubjectNamespaceResolutionV123
  | ReceizSubjectNamespaceResolutionFailureV123;

function fail(): never {
  throw new TypeError("V123_NAMESPACE_RESOLUTION_INVALID");
}

export function normalizeReceizNamespaceNamesV123(names: readonly string[]): readonly string[] {
  if (!Array.isArray(names) || names.length === 0 || names.length > 32) fail();
  const normalized = names.map((name) => typeof name === "string" ? name.trim().toLowerCase() : "");
  if (normalized.some((name) => !NAME.test(name))) fail();
  return Object.freeze([...new Set(normalized)].sort((left, right) => left.localeCompare(right)));
}

export async function projectReceizSubjectNamespacesV123(
  state: Pick<ReceizSubjectStateV122, "subjectId" | "head" | "admittedProofDigest" | "ownershipHead" | "registryDigest" | "reducerDigest" | "opaqueNamespaces">,
  names: readonly string[],
): Promise<ReceizSubjectNamespaceResolutionV123> {
  const requested = normalizeReceizNamespaceNamesV123(names);
  const available = new Map(state.opaqueNamespaces.map((entry) => [entry.namespace, entry]));
  const namespaces = Object.freeze(requested.map((name) => {
    const entry = available.get(name);
    return entry
      ? Object.freeze({ name, found: true, exactBytesB64u: entry.exactBytesB64u, digest: entry.digest })
      : Object.freeze({ name, found: false, exactBytesB64u: null, digest: null });
  }));
  const basis = {
    schema: "receiz.subject.namespace-resolution.v123" as const,
    subjectId: state.subjectId,
    atHead: state.head,
    admittedProofDigest: state.admittedProofDigest,
    ownershipHead: state.ownershipHead,
    registryDigest: state.registryDigest,
    reducerDigest: state.reducerDigest,
    namespaces,
    authority: { resolutionIsProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const },
  };
  return Object.freeze({ ...basis, resolutionDigest: await digestReceizCanonicalV122(basis) });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function validateReceizNamespaceResolutionV123(
  value: unknown,
  input: ReceizSubjectNamespaceResolutionInputV123,
): Promise<ReceizSubjectNamespaceResolutionResultV123> {
  if (!isRecord(value)) fail();
  if (value.ok === false) {
    if (!["SUBJECT_HEAD_STALE", "NOT_FOUND_OR_NOT_AUTHORIZED", "NAMESPACE_INPUT_INVALID"].includes(String(value.code)) || value.writes !== 0) fail();
    if (value.code === "SUBJECT_HEAD_STALE" && (typeof value.currentHead !== "string" || !SHA256.test(value.currentHead))) fail();
    if ("namespaces" in value) fail();
    return value as unknown as ReceizSubjectNamespaceResolutionFailureV123;
  }
  const requested = normalizeReceizNamespaceNamesV123(input.names);
  if (value.schema !== "receiz.subject.namespace-resolution.v123"
    || value.subjectId !== input.subjectId || value.atHead !== input.atHead
    || ![value.admittedProofDigest, value.ownershipHead, value.registryDigest, value.reducerDigest, value.resolutionDigest].every((entry) => typeof entry === "string" && SHA256.test(entry))
    || !Array.isArray(value.namespaces) || value.namespaces.length !== requested.length
    || !isRecord(value.authority) || value.authority.resolutionIsProofAuthority !== false
    || value.authority.strongerTruth !== "sealed-receiz-proof-object") fail();
  for (let index = 0; index < requested.length; index += 1) {
    const entry = value.namespaces[index];
    if (!isRecord(entry) || entry.name !== requested[index] || typeof entry.found !== "boolean") fail();
    if (!entry.found) {
      if (entry.exactBytesB64u !== null || entry.digest !== null) fail();
      continue;
    }
    if (typeof entry.exactBytesB64u !== "string" || typeof entry.digest !== "string" || !SHA256.test(entry.digest)) fail();
    let bytes: Uint8Array;
    try { bytes = receizBase64UrlDecode(entry.exactBytesB64u); } catch { fail(); }
    if (await sha256ReceizBytes(bytes) !== entry.digest) fail();
  }
  const { resolutionDigest, ...basis } = value;
  if (await digestReceizCanonicalV122(basis) !== resolutionDigest) fail();
  return value as unknown as ReceizSubjectNamespaceResolutionV123;
}

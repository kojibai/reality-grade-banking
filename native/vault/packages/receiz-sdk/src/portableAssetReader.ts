// Pure portable source reader. The parser and ownership derivation are shared
// unchanged with portableAsset; transport/producers remain in that module.
import { ReceizError } from "./errors.js";
import type { ReceizProofHistory } from "./proofHistory.js";

export type PortableJson = null | boolean | number | string | PortableJson[] | { [key: string]: PortableJson };

export type ReceizPortableAssetType =
  | "proof_object"
  | "sports_card"
  | "signal_card"
  | "wallet_note"
  | "reserve_funding"
  | "market_certificate"
  | "profile_original"
  | "document";

export type ReceizPortableAssetErrorCode =
  | "continuity_payload_missing"
  | "continuity_media_unbound"
  | "continuity_ownership_missing"
  | "continuity_provenance_missing"
  | "continuity_settlement_missing"
  | "continuity_append_mismatch"
  | "continuity_schema_unsupported"
  | "continuity_identity_mismatch"
  | "continuity_namespace_mismatch"
  | "continuity_offline_verification_failed"
  | "continuity_round_trip_failed"
  | "profile_showcase_carrier_invalid"
  | "profile_showcase_identity_invalid";

export class ReceizPortableAssetError extends ReceizError<ReceizPortableAssetErrorCode> {
  constructor(code: ReceizPortableAssetErrorCode) {
    super(code, code, { rail: "continuity", retryable: false });
    this.name = "ReceizPortableAssetError";
  }
}

export type ReceizPortableAssetDocument = Readonly<{
  schema: "receiz.portable_asset.v1";
  assetType: ReceizPortableAssetType;
  payload: Readonly<{
    mimeType: string;
    bytesBase64Url: string;
    sha256: string;
  }>;
  ownership: Readonly<{
    ownerReceizId: string;
    custody: string;
    proofRef: string;
  }>;
  provenance: Readonly<{
    root: string;
    appends: readonly Readonly<Record<string, PortableJson>>[];
  }>;
  settlement: Readonly<Record<string, PortableJson>>;
  receizProofHistory?: Readonly<{
    schema: "receiz.carried-proof-history.v113";
    history: ReceizProofHistory;
    commitmentDigest: string;
  }>;
}>;

export type ReceizProfileShowcaseArtifactId = `profile-showcase:${string}`;

export type ReceizProfileShowcaseCarrier = Readonly<{
  schema: "receiz.profile-showcase-carrier.v114";
  artifactId: ReceizProfileShowcaseArtifactId;
  ownerReceizIdentity: string;
  "profile-showcase": Readonly<Record<string, PortableJson>>;
  receizProofHistory: Readonly<{
    schema: "receiz.carried-proof-history.v113";
    history: ReceizProofHistory;
    commitmentDigest: string;
  }>;
}>;

export type ReceizPortableOwnershipContinuity = Readonly<{
  artifactId: string;
  namespace: string;
  genesisOwnerReceizId: string;
  ownerReceizId: string;
  historyDigestSha256: string;
  appendCount: number;
}>;

export type ReceizPortableAssetInput = Readonly<{
  assetType: ReceizPortableAssetType;
  payload: Readonly<{ mimeType: string; bytes: Uint8Array }>;
  ownership: ReceizPortableAssetDocument["ownership"];
  provenance: ReceizPortableAssetDocument["provenance"];
  settlement: ReceizPortableAssetDocument["settlement"];
}>;

const ASSET_TYPES = new Set<ReceizPortableAssetType>([
  "proof_object",
  "sports_card",
  "signal_card",
  "wallet_note",
  "reserve_funding",
  "market_certificate",
  "profile_original",
  "document",
]);
export const HEX64_RE = /^[0-9a-f]{64}$/;
const B64URL_RE = /^[A-Za-z0-9_-]*$/;
export const OWNER_RECEIZ_ID_RE = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/;
export const OWNERSHIP_APPEND_TYPE = "receiz.ownership.bearer-claim.v108" as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function canonicalize(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalize(entry)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  throw new ReceizPortableAssetError("continuity_round_trip_failed");
}

export function nonempty(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function base64UrlDecode(value: string): Uint8Array {
  if (!B64URL_RE.test(value)) throw new ReceizPortableAssetError("continuity_payload_missing");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new ReceizPortableAssetError("continuity_payload_missing");
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", copy.buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function parseOwnership(value: unknown): ReceizPortableAssetDocument["ownership"] {
  if (!isRecord(value)) throw new ReceizPortableAssetError("continuity_ownership_missing");
  const ownerReceizId = nonempty(value.ownerReceizId);
  const custody = nonempty(value.custody);
  const proofRef = nonempty(value.proofRef);
  if (!ownerReceizId || !custody || !proofRef) throw new ReceizPortableAssetError("continuity_ownership_missing");
  return { ownerReceizId, custody, proofRef };
}

function parseProvenance(value: unknown): ReceizPortableAssetDocument["provenance"] {
  if (!isRecord(value)) throw new ReceizPortableAssetError("continuity_provenance_missing");
  const root = nonempty(value.root);
  if (!root || !Array.isArray(value.appends)) throw new ReceizPortableAssetError("continuity_provenance_missing");
  if (value.appends.some((append) => !isRecord(append))) {
    throw new ReceizPortableAssetError("continuity_append_mismatch");
  }
  return {
    root,
    appends: value.appends.map((append) => ({ ...(append as Record<string, PortableJson>) })),
  };
}

function parseSettlement(value: unknown): ReceizPortableAssetDocument["settlement"] {
  if (!isRecord(value) || !nonempty(value.state)) {
    throw new ReceizPortableAssetError("continuity_settlement_missing");
  }
  return { ...(value as Record<string, PortableJson>) };
}

export async function parseReceizPortableAssetDocument(value: unknown): Promise<ReceizPortableAssetDocument> {
  if (!isRecord(value) || value.schema !== "receiz.portable_asset.v1") {
    throw new ReceizPortableAssetError("continuity_schema_unsupported");
  }
  if (typeof value.assetType !== "string" || !ASSET_TYPES.has(value.assetType as ReceizPortableAssetType)) {
    throw new ReceizPortableAssetError("continuity_schema_unsupported");
  }
  if (!isRecord(value.payload)) throw new ReceizPortableAssetError("continuity_payload_missing");
  const mimeType = nonempty(value.payload.mimeType);
  const bytesBase64Url = typeof value.payload.bytesBase64Url === "string" ? value.payload.bytesBase64Url : null;
  const claimedSha256 = typeof value.payload.sha256 === "string" ? value.payload.sha256.trim().toLowerCase() : "";
  if (!mimeType || bytesBase64Url === null || !HEX64_RE.test(claimedSha256)) {
    throw new ReceizPortableAssetError("continuity_payload_missing");
  }
  const payloadBytes = base64UrlDecode(bytesBase64Url);
  if ((await sha256Hex(payloadBytes)) !== claimedSha256) {
    throw new ReceizPortableAssetError("continuity_media_unbound");
  }
  let receizProofHistory: ReceizPortableAssetDocument["receizProofHistory"];
  if (value.receizProofHistory !== undefined) {
    if (!isRecord(value.receizProofHistory)
      || value.receizProofHistory.schema !== "receiz.carried-proof-history.v113"
      || !isRecord(value.receizProofHistory.history)
      || typeof value.receizProofHistory.commitmentDigest !== "string"
      || !HEX64_RE.test(value.receizProofHistory.commitmentDigest)
      || await sha256Hex(new TextEncoder().encode(canonicalize(value.receizProofHistory.history)))
        !== value.receizProofHistory.commitmentDigest) {
      throw new ReceizPortableAssetError("continuity_offline_verification_failed");
    }
    receizProofHistory = {
      schema: "receiz.carried-proof-history.v113",
      history: structuredClone(value.receizProofHistory.history) as unknown as ReceizProofHistory,
      commitmentDigest: value.receizProofHistory.commitmentDigest,
    };
  }
  canonicalize(value);
  return {
    ...structuredClone(value),
    schema: "receiz.portable_asset.v1",
    assetType: value.assetType as ReceizPortableAssetType,
    payload: { mimeType, bytesBase64Url, sha256: claimedSha256 },
    ownership: parseOwnership(value.ownership),
    provenance: parseProvenance(value.provenance),
    settlement: parseSettlement(value.settlement),
    ...(receizProofHistory ? { receizProofHistory } : {}),
  } as ReceizPortableAssetDocument;
}


export function canonicalOwnerReceizId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return OWNER_RECEIZ_ID_RE.test(normalized) ? normalized : null;
}

export async function ownershipHistoryDigest(value: unknown): Promise<string> {
  return sha256Hex(new TextEncoder().encode(canonicalize(value)));
}

export async function deriveReceizPortableOwnershipContinuity(
  document: ReceizPortableAssetDocument,
): Promise<ReceizPortableOwnershipContinuity> {
  const parsed = await parseReceizPortableAssetDocument(document);
  const currentOwnerReceizId = canonicalOwnerReceizId(parsed.ownership.ownerReceizId);
  if (!currentOwnerReceizId) throw new ReceizPortableAssetError("continuity_identity_mismatch");
  const provenanceAppends = parsed.provenance.appends;
  const headBearingAppends = provenanceAppends.filter(
    (append) => nonempty(append.priorHeadReference) !== null,
  );
  const latestHeadBearingAppend = headBearingAppends.at(-1);
  if (
    (parsed.ownership.proofRef === "genesis" && headBearingAppends.length !== 0)
    || (parsed.ownership.proofRef !== "genesis"
      && (!latestHeadBearingAppend
        || nonempty(latestHeadBearingAppend.priorHeadReference) !== parsed.ownership.proofRef))
  ) {
    throw new ReceizPortableAssetError("continuity_append_mismatch");
  }
  const ownershipAppends = parsed.provenance.appends.filter(
    (append) => append.type === OWNERSHIP_APPEND_TYPE,
  );
  const firstAppend = ownershipAppends[0];
  const genesisOwnerReceizId = firstAppend
    ? canonicalOwnerReceizId(firstAppend.fromOwnerReceizId)
    : currentOwnerReceizId;
  if (!genesisOwnerReceizId) throw new ReceizPortableAssetError("continuity_identity_mismatch");

  let expectedOwnerReceizId = genesisOwnerReceizId;
  let historyDigestSha256 = await ownershipHistoryDigest({
    schema: "receiz.ownership.genesis.v1",
    artifactId: parsed.payload.sha256,
    namespace: parsed.provenance.root,
    ownerReceizId: genesisOwnerReceizId,
  });
  const seenPriorHeads = new Set<string>();
  const seenSourceArtifacts = new Set<string>();

  for (const append of ownershipAppends) {
    const fromOwnerReceizId = canonicalOwnerReceizId(append.fromOwnerReceizId);
    const toOwnerReceizId = canonicalOwnerReceizId(append.toOwnerReceizId);
    const priorHeadReference = nonempty(append.priorHeadReference);
    const sourceArtifactSha256 = typeof append.sourceArtifactSha256 === "string"
      ? append.sourceArtifactSha256.trim().toLowerCase()
      : "";
    const priorHistoryDigestSha256 = typeof append.priorHistoryDigestSha256 === "string"
      ? append.priorHistoryDigestSha256.trim().toLowerCase()
      : "";
    if (
      !fromOwnerReceizId
      || fromOwnerReceizId !== expectedOwnerReceizId
      || !toOwnerReceizId
      || !priorHeadReference
      || priorHeadReference === "genesis"
      || seenPriorHeads.has(priorHeadReference)
      || !HEX64_RE.test(sourceArtifactSha256)
      || seenSourceArtifacts.has(sourceArtifactSha256)
      || priorHistoryDigestSha256 !== historyDigestSha256
    ) {
      throw new ReceizPortableAssetError("continuity_append_mismatch");
    }
    historyDigestSha256 = await ownershipHistoryDigest({
      schema: "receiz.ownership.append.v1",
      priorHistoryDigestSha256,
      sourceArtifactSha256,
      priorHeadReference,
      fromOwnerReceizId,
      toOwnerReceizId,
    });
    seenPriorHeads.add(priorHeadReference);
    seenSourceArtifacts.add(sourceArtifactSha256);
    expectedOwnerReceizId = toOwnerReceizId;
  }

  if (expectedOwnerReceizId !== currentOwnerReceizId) {
    throw new ReceizPortableAssetError("continuity_append_mismatch");
  }

  return Object.freeze({
    artifactId: parsed.payload.sha256,
    namespace: parsed.provenance.root,
    genesisOwnerReceizId,
    ownerReceizId: currentOwnerReceizId,
    historyDigestSha256,
    appendCount: ownershipAppends.length,
  });
}

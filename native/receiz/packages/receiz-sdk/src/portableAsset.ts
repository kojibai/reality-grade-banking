import { ReceizPortableAssetError, parseReceizPortableAssetDocument, deriveReceizPortableOwnershipContinuity, isRecord, canonicalize, nonempty, base64UrlDecode, sha256Hex, canonicalOwnerReceizId, HEX64_RE, OWNER_RECEIZ_ID_RE, OWNERSHIP_APPEND_TYPE, type PortableJson, type ReceizPortableAssetType, type ReceizPortableAssetDocument, type ReceizProfileShowcaseArtifactId, type ReceizProfileShowcaseCarrier, type ReceizPortableAssetInput } from "./portableAssetReader.js";
export { ReceizPortableAssetError, parseReceizPortableAssetDocument, deriveReceizPortableOwnershipContinuity } from "./portableAssetReader.js";
export type { PortableJson, ReceizPortableAssetType, ReceizPortableAssetErrorCode, ReceizPortableAssetDocument, ReceizProfileShowcaseArtifactId, ReceizProfileShowcaseCarrier, ReceizPortableOwnershipContinuity, ReceizPortableAssetInput } from "./portableAssetReader.js";
import type { ReceizProofHistory, ReceizVerifiedProofHistory } from "./proofHistory.js";
import { transportReceizProofHistory } from "./proofHistory.js";
import {
  assertReceizProfileShowcaseCarrierV114TransportContract,
  assertReceizProfileShowcaseGenesisV114TransportContract,
} from "./profileShowcaseTransport.js";

export async function extractReceizPortableAssetPayload(value: unknown): Promise<Readonly<{
  assetType: ReceizPortableAssetType;
  mimeType: string;
  bytes: Uint8Array;
  sha256: string;
}>> {
  const parsed = await parseReceizPortableAssetDocument(value);
  const bytes = base64UrlDecode(parsed.payload.bytesBase64Url);
  if (await sha256Hex(bytes) !== parsed.payload.sha256) {
    throw new ReceizPortableAssetError("continuity_media_unbound");
  }
  return Object.freeze({
    assetType: parsed.assetType,
    mimeType: parsed.payload.mimeType,
    bytes: bytes.slice(),
    sha256: parsed.payload.sha256,
  });
}

export async function parseReceizProfileShowcaseCarrier(
  value: unknown,
): Promise<ReceizProfileShowcaseCarrier> {
  if (!isRecord(value)
    || Object.keys(value).sort().join(",")
      !== "artifactId,ownerReceizIdentity,profile-showcase,receizProofHistory,schema"
    || value.schema !== "receiz.profile-showcase-carrier.v114"
    || typeof value.artifactId !== "string"
    || typeof value.ownerReceizIdentity !== "string"
    || !OWNER_RECEIZ_ID_RE.test(value.ownerReceizIdentity)) {
    throw new ReceizPortableAssetError("profile_showcase_carrier_invalid");
  }
  if (value.artifactId !== `profile-showcase:${value.ownerReceizIdentity}`
    || !isRecord(value["profile-showcase"])
    || value["profile-showcase"].schema !== "receiz.profile-showcase.v1"
    || value["profile-showcase"].artifactId !== value.artifactId
    || value["profile-showcase"].ownerReceizIdentity !== value.ownerReceizIdentity
    || !isRecord(value.receizProofHistory)
    || !isRecord(value.receizProofHistory.history)
    || value.receizProofHistory.history.artifactId !== value.artifactId) {
    throw new ReceizPortableAssetError("profile_showcase_identity_invalid");
  }
  try {
    assertReceizProfileShowcaseCarrierV114TransportContract(value["profile-showcase"]);
    const showcase = value["profile-showcase"];
    const parents = showcase.parentArtifactDigests as readonly unknown[];
    if (parents.length === 0) {
      const operations = showcase.directOperations as readonly Record<string, unknown>[];
      assertReceizProfileShowcaseGenesisV114TransportContract(showcase, {
        artifactId: value.artifactId as ReceizProfileShowcaseArtifactId,
        ownerReceizIdentity: value.ownerReceizIdentity,
        profileIdentity: showcase.profileIdentity as string,
        actorEvidenceRoot: operations.length === 0
          ? ""
          : operations[0]!.authorityEvidenceRoot as string,
        genesisKaiUpulse: showcase.headKaiUpulse as string,
      });
    }
  } catch {
    throw new ReceizPortableAssetError("profile_showcase_carrier_invalid");
  }
  if (hasForbiddenShowcaseArtifactDigest(value["profile-showcase"])
    || Object.keys(value.receizProofHistory).sort().join(",")
      !== "commitmentDigest,history,schema"
    || value.receizProofHistory.schema !== "receiz.carried-proof-history.v113"
    || typeof value.receizProofHistory.commitmentDigest !== "string"
    || !HEX64_RE.test(value.receizProofHistory.commitmentDigest)) {
    throw new ReceizPortableAssetError("profile_showcase_carrier_invalid");
  }
  const expectedCommitment = await sha256Hex(
    new TextEncoder().encode(canonicalize(value.receizProofHistory.history)),
  );
  if (expectedCommitment !== value.receizProofHistory.commitmentDigest) {
    throw new ReceizPortableAssetError("continuity_offline_verification_failed");
  }
  canonicalize(value);
  return structuredClone(value) as unknown as ReceizProfileShowcaseCarrier;
}

export async function createReceizProfileShowcaseCarrier(input: Readonly<{
  artifactId: ReceizProfileShowcaseArtifactId;
  ownerReceizIdentity: string;
  showcase: Readonly<Record<string, PortableJson>>;
  proofHistory: ReceizProofHistory;
}>): Promise<ReceizProfileShowcaseCarrier> {
  const history = structuredClone(input.proofHistory);
  return parseReceizProfileShowcaseCarrier({
    schema: "receiz.profile-showcase-carrier.v114",
    artifactId: input.artifactId,
    ownerReceizIdentity: input.ownerReceizIdentity,
    "profile-showcase": structuredClone(input.showcase),
    receizProofHistory: {
      schema: "receiz.carried-proof-history.v113",
      history,
      commitmentDigest: await sha256Hex(new TextEncoder().encode(canonicalize(history))),
    },
  });
}

export function serializeReceizProfileShowcaseCarrier(
  carrier: ReceizProfileShowcaseCarrier,
): Uint8Array {
  return new TextEncoder().encode(canonicalize(carrier));
}

export async function attachReceizProfileShowcaseProofHistoryBytes(
  originalBytes: Uint8Array,
  proofHistory: ReceizProofHistory,
): Promise<Uint8Array> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(originalBytes));
  } catch {
    throw new ReceizPortableAssetError("profile_showcase_carrier_invalid");
  }
  const carrier = await parseReceizProfileShowcaseCarrier(decoded);
  if (proofHistory.artifactId !== carrier.artifactId) {
    throw new ReceizPortableAssetError("profile_showcase_identity_invalid");
  }
  return serializeReceizProfileShowcaseCarrier(await createReceizProfileShowcaseCarrier({
    artifactId: carrier.artifactId,
    ownerReceizIdentity: carrier.ownerReceizIdentity,
    showcase: carrier["profile-showcase"],
    proofHistory,
  }));
}

export async function attachReceizPortableProofHistory(
  value: unknown,
  history: ReceizVerifiedProofHistory,
): Promise<ReceizPortableAssetDocument> {
  const parsed = await parseReceizPortableAssetDocument(value);
  const transported = transportReceizProofHistory(history);
  if (transported.artifactId !== parsed.payload.sha256) {
    throw new ReceizPortableAssetError("continuity_identity_mismatch");
  }
  const carried = {
    schema: "receiz.carried-proof-history.v113" as const,
    history: transported,
    commitmentDigest: await sha256Hex(new TextEncoder().encode(canonicalize(transported))),
  };
  const composed = {
    ...(isRecord(value) ? value : parsed),
    receizProofHistory: carried,
  };
  await parseReceizPortableAssetDocument(composed);
  return composed as unknown as ReceizPortableAssetDocument;
}

function assertReceizPortableTopLevelMembersAreUnique(text: string): void {
  const members = new Set<string>();
  let depth = 0;
  let inString = false;
  let escaped = false;
  let stringStart = -1;
  let expectingTopLevelKey = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') {
        inString = false;
        if (depth === 1 && expectingTopLevelKey) {
          let cursor = index + 1;
          while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
          if (text[cursor] !== ":") {
            throw new ReceizPortableAssetError("continuity_round_trip_failed");
          }
          let member: unknown;
          try { member = JSON.parse(text.slice(stringStart, index + 1)); } catch {
            throw new ReceizPortableAssetError("continuity_round_trip_failed");
          }
          if (typeof member !== "string" || members.has(member)) {
            throw new ReceizPortableAssetError("continuity_round_trip_failed");
          }
          members.add(member);
          expectingTopLevelKey = false;
        }
        stringStart = -1;
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      stringStart = index;
      continue;
    }
    if (character === "{") {
      depth += 1;
      if (depth === 1) expectingTopLevelKey = true;
      continue;
    }
    if (character === "[") {
      depth += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      depth -= 1;
      continue;
    }
    if (character === "," && depth === 1) expectingTopLevelKey = true;
  }
  if (inString || depth !== 0) {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
}

export async function attachReceizPortableProofHistoryBytes(
  originalBytes: Uint8Array,
  history: ReceizVerifiedProofHistory,
): Promise<Uint8Array> {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(originalBytes);
  assertReceizPortableTopLevelMembersAreUnique(text);
  const parsedValue = JSON.parse(text) as unknown;
  if (!isRecord(parsedValue) || parsedValue.receizProofHistory !== undefined) {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
  const attached = await attachReceizPortableProofHistory(parsedValue, history);
  const carried = attached.receizProofHistory;
  if (!carried) throw new ReceizPortableAssetError("continuity_offline_verification_failed");
  const closing = text.lastIndexOf("}");
  if (closing < 0 || text.slice(closing + 1).trim() !== "") {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
  const field = `${Object.keys(parsedValue).length === 0 ? "" : ","}${JSON.stringify("receizProofHistory")}:${canonicalize(carried)}`;
  const result = new TextEncoder().encode(`${text.slice(0, closing)}${field}}${text.slice(closing + 1)}`);
  await parseReceizPortableAssetDocument(JSON.parse(new TextDecoder().decode(result)));
  return result;
}

/** Package-internal transition mechanic: writes only the carried history projection. */
export async function replaceReceizPortableProofHistoryBytes(
  originalBytes: Uint8Array,
  proofHistory: ReceizProofHistory,
): Promise<Uint8Array> {
  let text: string;
  let decoded: unknown;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(originalBytes);
    assertReceizPortableTopLevelMembersAreUnique(text);
    decoded = JSON.parse(text);
  } catch {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
  const parsed = await parseReceizPortableAssetDocument(decoded);
  if (proofHistory.artifactId !== parsed.payload.sha256) {
    throw new ReceizPortableAssetError("continuity_identity_mismatch");
  }
  const history = structuredClone(proofHistory);
  const composed = {
    ...(decoded as Record<string, unknown>),
    receizProofHistory: {
      schema: "receiz.carried-proof-history.v113" as const,
      history,
      commitmentDigest: await sha256Hex(new TextEncoder().encode(canonicalize(history))),
    },
  };
  await parseReceizPortableAssetDocument(composed);
  if ((decoded as Record<string, unknown>).receizProofHistory === undefined) {
    const closing = text.lastIndexOf("}");
    if (closing < 0 || text.slice(closing + 1).trim() !== "") {
      throw new ReceizPortableAssetError("continuity_round_trip_failed");
    }
    const field = `${Object.keys(decoded as Record<string, unknown>).length === 0 ? "" : ","}${JSON.stringify("receizProofHistory")}:${canonicalize(composed.receizProofHistory)}`;
    const result = new TextEncoder().encode(
      `${text.slice(0, closing)}${field}}${text.slice(closing + 1)}`,
    );
    await parseReceizPortableAssetDocument(JSON.parse(new TextDecoder().decode(result)));
    return result;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  let keyStart = -1;
  let valueStart = -1;
  let valueEnd = -1;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]!;
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') {
        inString = false;
        if (depth === 1 && keyStart >= 0) {
          const key = JSON.parse(text.slice(keyStart, index + 1)) as string;
          if (key === "receizProofHistory") {
            let cursor = index + 1;
            while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
            if (text[cursor] !== ":") throw new ReceizPortableAssetError("continuity_round_trip_failed");
            cursor += 1;
            while (/\s/u.test(text[cursor] ?? "")) cursor += 1;
            valueStart = cursor;
          }
          keyStart = -1;
        }
      }
      continue;
    }
    if (character === '"') {
      inString = true;
      if (depth === 1 && valueStart < 0) keyStart = index;
      continue;
    }
    if (character === "{" || character === "[") depth += 1;
    else if (character === "}" || character === "]") {
      if (valueStart >= 0 && valueEnd < 0 && depth === 2) valueEnd = index + 1;
      depth -= 1;
    } else if (valueStart >= 0 && valueEnd < 0 && depth === 1 && (character === "," || character === "}")) {
      valueEnd = index;
    }
    if (valueEnd >= 0) break;
  }
  if (valueStart < 0 || valueEnd <= valueStart) {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
  const replacement = canonicalize(composed.receizProofHistory);
  const result = new TextEncoder().encode(`${text.slice(0, valueStart)}${replacement}${text.slice(valueEnd)}`);
  await parseReceizPortableAssetDocument(JSON.parse(new TextDecoder().decode(result)));
  return result;
}

export async function createReceizPortableAssetDocument(
  input: ReceizPortableAssetInput,
): Promise<ReceizPortableAssetDocument> {
  if (!input?.payload?.bytes || !(input.payload.bytes instanceof Uint8Array)) {
    throw new ReceizPortableAssetError("continuity_payload_missing");
  }
  return parseReceizPortableAssetDocument({
    schema: "receiz.portable_asset.v1",
    assetType: input.assetType,
    payload: {
      mimeType: input.payload.mimeType,
      bytesBase64Url: base64UrlEncode(input.payload.bytes),
      sha256: await sha256Hex(input.payload.bytes),
    },
    ownership: input.ownership,
    provenance: input.provenance,
    settlement: input.settlement,
  });
}

export async function appendReceizPortableAssetOwnership(
  document: ReceizPortableAssetDocument,
  input: Readonly<{
    ownerReceizId: string;
    priorHeadReference: string;
    sourceArtifactSha256: string;
  }>,
): Promise<ReceizPortableAssetDocument> {
  const ownerReceizId = input.ownerReceizId.trim();
  if (!canonicalOwnerReceizId(ownerReceizId)) {
    throw new ReceizPortableAssetError("continuity_identity_mismatch");
  }
  const priorHeadReference = input.priorHeadReference.trim();
  const sourceArtifactSha256 = input.sourceArtifactSha256.trim().toLowerCase();
  if (!priorHeadReference || priorHeadReference === "genesis" || !HEX64_RE.test(sourceArtifactSha256)) {
    throw new ReceizPortableAssetError("continuity_append_mismatch");
  }
  const priorContinuity = await deriveReceizPortableOwnershipContinuity(document);
  return parseReceizPortableAssetDocument({
    ...document,
    ownership: {
      ownerReceizId,
      custody: "bearer",
      proofRef: priorHeadReference,
    },
    provenance: {
      ...document.provenance,
      appends: [...document.provenance.appends, {
        type: OWNERSHIP_APPEND_TYPE,
        fromOwnerReceizId: document.ownership.ownerReceizId,
        toOwnerReceizId: ownerReceizId,
        priorHeadReference,
        sourceArtifactSha256,
        priorHistoryDigestSha256: priorContinuity.historyDigestSha256,
      }],
    },
  });
}

export function serializeReceizPortableAssetDocument(document: ReceizPortableAssetDocument): Uint8Array {
  return new TextEncoder().encode(canonicalize(document));
}

export async function extractReceizPortableAssetDocument(artifactBytes: Uint8Array): Promise<{
  document: ReceizPortableAssetDocument;
  originalBytes: Uint8Array;
  artifactBasisSha256: string;
  proofClaimId: string;
}> {
  let envelope: unknown;
  try {
    envelope = JSON.parse(new TextDecoder().decode(artifactBytes)) as unknown;
  } catch {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
  if (!isRecord(envelope) || envelope.kind !== "receiz.bundle.v1" || !isRecord(envelope.manifest) || !isRecord(envelope.proofbundle)) {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
  const originalBase64 = typeof envelope.originalBase64 === "string" ? envelope.originalBase64 : "";
  const originalBytes = base64UrlDecode(originalBase64);
  const artifactBasisSha256 = await sha256Hex(originalBytes);
  const manifestBasis = typeof envelope.manifest.basisSha256 === "string" ? envelope.manifest.basisSha256.trim().toLowerCase() : "";
  const proofBasis = typeof envelope.proofbundle.artifactSha256Basis === "string"
    ? envelope.proofbundle.artifactSha256Basis.trim().toLowerCase()
    : "";
  const proofClaimId = nonempty(envelope.proofbundle.receizClaimId);
  if (!proofClaimId || manifestBasis !== artifactBasisSha256 || proofBasis !== artifactBasisSha256) {
    throw new ReceizPortableAssetError("continuity_offline_verification_failed");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(originalBytes)) as unknown;
  } catch {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
  const document = await parseReceizPortableAssetDocument(parsed);
  const canonicalBytes = serializeReceizPortableAssetDocument(document);
  if (new TextDecoder().decode(canonicalBytes) !== new TextDecoder().decode(originalBytes)) {
    throw new ReceizPortableAssetError("continuity_round_trip_failed");
  }
  return { document, originalBytes, artifactBasisSha256, proofClaimId };
}

function hasForbiddenShowcaseArtifactDigest(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenShowcaseArtifactDigest);
  if (!isRecord(value)) return false;
  if (Object.prototype.hasOwnProperty.call(value, "artifactSha256")) return true;
  return Object.values(value).some(hasForbiddenShowcaseArtifactDigest);
}


function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

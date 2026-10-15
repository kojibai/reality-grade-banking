import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import {
  admitReceizAuthenticatedRuntimeWireV124,
  createReceizAuthenticatedRuntimeRequestV124,
  getReceizAuthenticatedRuntimeAdmissionV124,
  type ReceizAuthenticatedRuntimeReceiptV124,
  type ReceizAuthenticatedRuntimeRequestV124,
} from "./v124AuthenticatedRuntime.js";
import {
  admitReceizCheckpointRuntimeWireV124,
  admitReceizDomainReplayRuntimeWireV124,
  compareReceizVerifiedDomainReplaySourcesV124,
  createReceizDomainReplayCustodyCarrierV124,
  readReceizVerifiedDomainReplaySourceV124,
  restoreReceizDomainReplayProofCarrierV124,
  validateReceizCheckpointV124,
  validateReceizDomainReplayV124,
  type ReceizCheckpointV124,
  type ReceizDomainReplayExpectationV124,
  type ReceizDomainReplayV124,
} from "./v124Replay.js";
import {
  createReceizDomainReplayProofObjectExportV124,
  parseReceizPortableReplaySourceArtifactV124,
  type ReceizDomainReplayRuntimeSourceAdmissionV124,
  type ReceizDomainReplayProofCarrierV124,
  type ReceizDomainReplayProofObjectExportInputV124,
  type ReceizDomainReplayProofObjectRestoreInputV124,
} from "./v124ReplayProofObject.js";
import type { ReceizPortableSealedArtifactV124 } from "./v124PortableAuthority.js";
import { applicationId, canonicalBytes, closedRecord, digest, domainId, freeze, text } from "./v124Contracts.js";

/** Source-internal authenticated request seam; deliberately absent from package-root exports. */
export type ReceizV124DomainsRemoteV124 = (request: ReceizAuthenticatedRuntimeRequestV124) => Promise<Readonly<{
  wire: unknown;
  receipt: unknown;
}>>;

/** Source-internal options; neither the public domain call nor a route chooses audience authority. */
export type ReceizV124DomainsRuntimeOptions = Readonly<{
  audience: string;
}>;

export type ReceizPrivateDomainAdditionsInputV124 = Readonly<{
  applicationId: string;
  domainId: string;
  afterHead: string | null;
  authoritySessionHandle: string;
  accessGrantHandle: string;
  expectedViewerSubjectId: string;
  expectedViewerSubjectHead: string;
  expectedGrantHead: string;
}>;

type ReceizPrivateDomainAdditionBaseV124 = Readonly<{
  additionKind: "public" | "private";
  appendId: string;
  sequence: number;
  cursor: number;
  exactPublicEventBytesB64u: string;
  eventDigest: string;
  priorHead: string;
  newHead: string;
  domainHead: string;
}>;

export type ReceizPrivateDomainPublicAdditionV124 = ReceizPrivateDomainAdditionBaseV124 & Readonly<{
  additionKind: "public";
}>;

export type ReceizPrivateRecipientWrapProjectionV124 = Readonly<{
  recipientSubjectId: string;
  recipientAccessKeyHead: string;
  ephemeralPublicKeyJwk: JsonWebKey;
  nonceB64u: string;
  wrappedContentKeyB64u: string;
  wrapDigest: string;
}>;

/**
 * One-viewer projection of an enclosing sealed V122 envelope. Full-envelope
 * verification stays server-internal; transport carries only its committed
 * envelope digest, non-leaking event source, and this one-viewer projection.
 */
export type ReceizPrivateWorldEnvelopeProjectionV124 = Readonly<{
  schema: "receiz.world.private-envelope-projection.v124";
  worldId: string;
  visibilityMode: "private" | "invited";
  ciphertextB64u: string;
  nonceB64u: string;
  aadDigest: string;
  payloadDigest: string;
  envelopeDigest: string;
  recipientWrap: ReceizPrivateRecipientWrapProjectionV124;
  authority: Readonly<{
    projectionIsProofAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizPrivateDomainEncryptedAdditionV124 = ReceizPrivateDomainAdditionBaseV124 & Readonly<{
  additionKind: "private";
  viewerSubjectId: string;
  viewerSubjectHead: string;
  grantHead: string;
  accessKeyHead: string;
  privateEnvelope: ReceizPrivateWorldEnvelopeProjectionV124;
  recipientWrapDigest: string;
}>;

export type ReceizPrivateDomainAdditionV124 =
  | ReceizPrivateDomainPublicAdditionV124
  | ReceizPrivateDomainEncryptedAdditionV124;

export type ReceizPrivateDomainAdditionsWireV124 =
  | Readonly<{
    schema: "receiz.private-domain-additions.v124";
    status: "authenticated";
    applicationId: string;
    domainId: string;
    afterHead: string | null;
    afterCursor: number;
    cursor: number;
    priorHead: string;
    head: string;
    viewerSubjectId: string;
    viewerSubjectHead: string;
    grantHead: string;
    accessKeyHead: string;
    additions: readonly ReceizPrivateDomainAdditionV124[];
    sourceArtifact: ReceizPortableSealedArtifactV124;
    viewerSubjectSourceArtifact: ReceizPortableSealedArtifactV124;
    accessGrantSourceArtifact: ReceizPortableSealedArtifactV124;
    authority: Readonly<{
      privateAdditionsAreProofAuthority: false;
      strongerTruth: "sealed-receiz-proof-object";
    }>;
  }>
  | Readonly<{
    schema: "receiz.private-domain-additions.v124";
    status: "not-found-or-not-authorized";
  }>;

export type ReceizPrivateDomainAdditionsResultV124 =
  | Readonly<{
    schema: "receiz.private-domain-additions.v124";
    status: "authenticated";
    applicationId: string;
    domainId: string;
    afterHead: string | null;
    afterCursor: number;
    cursor: number;
    priorHead: string;
    head: string;
    viewerSubjectId: string;
    viewerSubjectHead: string;
    grantHead: string;
    accessKeyHead: string;
    additions: readonly ReceizPrivateDomainAdditionV124[];
    authenticatedReceipt: ReceizAuthenticatedRuntimeReceiptV124;
    authority: Readonly<{
      privateAdditionsAreProofAuthority: false;
      strongerTruth: "sealed-receiz-proof-object";
    }>;
  }>
  | Readonly<{
    schema: "receiz.private-domain-additions.v124";
    status: "not-found-or-not-authorized";
  }>;

type PrivateAdditionsAuthority = Readonly<{
  privateAdditionsAreProofAuthority: false;
  strongerTruth: "sealed-receiz-proof-object";
}>;

const privateFailure = freeze({
  schema: "receiz.private-domain-additions.v124" as const,
  status: "not-found-or-not-authorized" as const,
});
const PRIVATE_PUBLIC_EVENT_KEYS = /^(?:privatePayload|privateGeometry|recipientWraps|ciphertextB64u|wrappedContentKeyB64u|envelope)$/i;

function fail(code: string): never { throw new TypeError(code); }
function containsPrivatePublicEventMaterial(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsPrivatePublicEventMaterial);
  return Object.entries(value as Record<string, unknown>).some(([key, entry]) =>
    PRIVATE_PUBLIC_EVENT_KEYS.test(key) || containsPrivatePublicEventMaterial(entry));
}
function upulse(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}

function runtimeOptions(value: ReceizV124DomainsRuntimeOptions): Readonly<{
  audience: string;
}> {
  const record = closedRecord(
    value,
    ["audience"],
    "V124_DOMAINS_RUNTIME_OPTIONS_INVALID",
  );
  return freeze({
    audience: text(record.audience, "V124_DOMAINS_RUNTIME_OPTIONS_INVALID"),
  });
}

function replayExpectation(value: ReceizDomainReplayExpectationV124): Readonly<{
  applicationId: string;
  domainId: string;
  afterHead: string | null;
  expectedRegistryDigest: string;
  expectedReducerDigest: string;
}> {
  const keys = Object.prototype.hasOwnProperty.call(value, "afterHead")
    ? ["applicationId", "domainId", "afterHead", "expectedRegistryDigest", "expectedReducerDigest"]
    : ["applicationId", "domainId", "expectedRegistryDigest", "expectedReducerDigest"];
  const record = closedRecord(value, keys, "V124_DOMAINS_REPLAY_EXPECTATION_INVALID");
  return freeze({
    applicationId: applicationId(record.applicationId, "V124_DOMAINS_REPLAY_EXPECTATION_INVALID"),
    domainId: domainId(record.domainId, "V124_DOMAINS_REPLAY_EXPECTATION_INVALID"),
    afterHead: record.afterHead === undefined || record.afterHead === null ? null : digest(record.afterHead, "V124_DOMAINS_REPLAY_EXPECTATION_INVALID"),
    expectedRegistryDigest: digest(record.expectedRegistryDigest, "V124_DOMAINS_REPLAY_EXPECTATION_INVALID"),
    expectedReducerDigest: digest(record.expectedReducerDigest, "V124_DOMAINS_REPLAY_EXPECTATION_INVALID"),
  });
}

function privateInput(value: ReceizPrivateDomainAdditionsInputV124): Readonly<{
  applicationId: string;
  domainId: string;
  afterHead: string | null;
  authoritySessionHandle: string;
  accessGrantHandle: string;
  expectedViewerSubjectId: string;
  expectedViewerSubjectHead: string;
  expectedGrantHead: string;
}> {
  const record = closedRecord(value, [
    "applicationId",
    "domainId",
    "afterHead",
    "authoritySessionHandle",
    "accessGrantHandle",
    "expectedViewerSubjectId",
    "expectedViewerSubjectHead",
    "expectedGrantHead",
  ], "V124_PRIVATE_DOMAIN_INPUT_INVALID");
  return freeze({
    applicationId: applicationId(record.applicationId, "V124_PRIVATE_DOMAIN_INPUT_INVALID"),
    domainId: domainId(record.domainId, "V124_PRIVATE_DOMAIN_INPUT_INVALID"),
    afterHead: record.afterHead === null ? null : digest(record.afterHead, "V124_PRIVATE_DOMAIN_INPUT_INVALID"),
    authoritySessionHandle: text(record.authoritySessionHandle, "V124_PRIVATE_DOMAIN_INPUT_INVALID"),
    accessGrantHandle: text(record.accessGrantHandle, "V124_PRIVATE_DOMAIN_INPUT_INVALID"),
    expectedViewerSubjectId: text(record.expectedViewerSubjectId, "V124_PRIVATE_DOMAIN_INPUT_INVALID"),
    expectedViewerSubjectHead: digest(record.expectedViewerSubjectHead, "V124_PRIVATE_DOMAIN_INPUT_INVALID"),
    expectedGrantHead: digest(record.expectedGrantHead, "V124_PRIVATE_DOMAIN_INPUT_INVALID"),
  });
}

function replayKey(input: Readonly<{ applicationId: string; domainId: string; registryDigest: string; reducerDigest: string; head: string }>): string {
  return JSON.stringify([input.applicationId, input.domainId, input.registryDigest, input.reducerDigest, input.head]);
}
function checkpointKey(input: Readonly<{ applicationId: string; domainId: string; head: string }>): string {
  return JSON.stringify([input.applicationId, input.domainId, input.head]);
}
function replayCoordinateKey(input: Readonly<{
  applicationId: string;
  domainId: string;
  registryDigest: string;
  reducerDigest: string;
}>): string {
  return JSON.stringify([
    input.applicationId,
    input.domainId,
    input.registryDigest,
    input.reducerDigest,
  ]);
}
function exactCanonical(left: unknown, right: unknown): boolean {
  try { return canonicalizeReceizV122(left) === canonicalizeReceizV122(right); } catch { return false; }
}
function sameReplayTruth(
  left: ReceizDomainReplayV124,
  right: ReceizDomainReplayV124,
): boolean {
  return left.applicationId === right.applicationId
    && left.domainId === right.domainId
    && left.registryDigest === right.registryDigest
    && left.reducerDigest === right.reducerDigest
    && left.head === right.head
    && left.cursor === right.cursor
    && left.namespace.name === right.namespace.name
    && left.namespace.head === right.namespace.head
    && left.namespace.digest === right.namespace.digest;
}

async function runtimeWire(
  remote: ReceizV124DomainsRemoteV124,
  request: ReceizAuthenticatedRuntimeRequestV124,
  path: string,
): Promise<Readonly<{ wire: unknown; receipt: ReceizAuthenticatedRuntimeReceiptV124 }>> {
  const response = closedRecord(await remote(request), ["wire", "receipt"], "V124_DOMAINS_REMOTE_RESPONSE_INVALID");
  const wire = await admitReceizAuthenticatedRuntimeWireV124({
    request,
    wire: response.wire,
    receipt: response.receipt,
  });
  const admitted = getReceizAuthenticatedRuntimeAdmissionV124(wire);
  if (admitted.request.requestDigest !== request.requestDigest
    || admitted.request.path !== path
    || admitted.request.strongerTruth !== "sealed-receiz-proof-object"
    || admitted.receipt.authority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_DOMAINS_RUNTIME_BINDING_INVALID");
  }
  return freeze({ wire, receipt: admitted.receipt });
}

function responseStatus(value: unknown, code: string): Readonly<{ schema: unknown; status: unknown }> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const schema = descriptors.schema;
  const status = descriptors.status;
  if (!schema || !status || !schema.enumerable || !status.enumerable || !("value" in schema) || !("value" in status)) fail(code);
  return freeze({ schema: schema.value, status: status.value });
}

function privateAuthority(value: unknown): PrivateAdditionsAuthority {
  const record = closedRecord(value, ["privateAdditionsAreProofAuthority", "strongerTruth"], "V124_PRIVATE_DOMAIN_AUTHORITY_INVALID");
  if (record.privateAdditionsAreProofAuthority !== false || record.strongerTruth !== "sealed-receiz-proof-object") fail("V124_PRIVATE_DOMAIN_AUTHORITY_INVALID");
  return freeze({ privateAdditionsAreProofAuthority: false as const, strongerTruth: "sealed-receiz-proof-object" as const });
}

function canonicalBase64Url(value: unknown, code: string, expectedLength?: number): string {
  const encoded = text(value, code);
  let bytes: Uint8Array;
  try { bytes = receizBase64UrlDecode(encoded); } catch { fail(code); }
  if ((expectedLength !== undefined && bytes.byteLength !== expectedLength) || receizBase64UrlEncode(bytes) !== encoded) fail(code);
  return encoded;
}

/** Source-internal V124 admission shared by every private-envelope custody path. */
export async function closeEphemeralPublicKeyJwk(value: unknown): Promise<JsonWebKey> {
  const record = closedRecord(value, ["key_ops", "ext", "kty", "crv", "x", "y"], "V124_PRIVATE_DOMAIN_WRAP_KEY_INVALID");
  if (!Array.isArray(record.key_ops) || record.key_ops.length !== 0 || record.ext !== true || record.kty !== "EC" || record.crv !== "P-256") {
    fail("V124_PRIVATE_DOMAIN_WRAP_KEY_INVALID");
  }
  const x = canonicalBase64Url(record.x, "V124_PRIVATE_DOMAIN_WRAP_KEY_INVALID", 32);
  const y = canonicalBase64Url(record.y, "V124_PRIVATE_DOMAIN_WRAP_KEY_INVALID", 32);
  const publicKeyJwk = freeze({ key_ops: freeze([]) as KeyUsage[], ext: true, kty: "EC", crv: "P-256", x, y });
  try {
    await globalThis.crypto.subtle.importKey(
      "jwk",
      publicKeyJwk,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
  } catch {
    fail("V124_PRIVATE_DOMAIN_WRAP_KEY_INVALID");
  }
  return publicKeyJwk;
}

async function closePrivateEnvelope(
  value: unknown,
  expectedWorldId: string,
): Promise<ReceizPrivateWorldEnvelopeProjectionV124> {
  const record = closedRecord(value, [
    "schema",
    "worldId",
    "visibilityMode",
    "ciphertextB64u",
    "nonceB64u",
    "aadDigest",
    "payloadDigest",
    "envelopeDigest",
    "recipientWrap",
    "authority",
  ], "V124_PRIVATE_DOMAIN_ENVELOPE_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.world.private-envelope-projection.v124"
    || (record.visibilityMode !== "private" && record.visibilityMode !== "invited")) {
    fail("V124_PRIVATE_DOMAIN_ENVELOPE_INVALID");
  }
  const visibilityMode = record.visibilityMode as "private" | "invited";
  const worldId = text(record.worldId, "V124_PRIVATE_DOMAIN_ENVELOPE_INVALID");
  if (worldId !== expectedWorldId) fail("V124_PRIVATE_DOMAIN_ENVELOPE_INVALID");
  const wrap = closedRecord(record.recipientWrap, [
    "recipientSubjectId",
    "recipientAccessKeyHead",
    "ephemeralPublicKeyJwk",
    "nonceB64u",
    "wrappedContentKeyB64u",
    "wrapDigest",
  ], "V124_PRIVATE_DOMAIN_WRAP_CLOSED_SHAPE_INVALID");
  const wrapBasis = freeze({
    recipientSubjectId: text(wrap.recipientSubjectId, "V124_PRIVATE_DOMAIN_WRAP_INVALID"),
    recipientAccessKeyHead: digest(wrap.recipientAccessKeyHead, "V124_PRIVATE_DOMAIN_WRAP_INVALID"),
    ephemeralPublicKeyJwk: await closeEphemeralPublicKeyJwk(wrap.ephemeralPublicKeyJwk),
    nonceB64u: canonicalBase64Url(wrap.nonceB64u, "V124_PRIVATE_DOMAIN_WRAP_ENCODING_INVALID", 12),
    wrappedContentKeyB64u: canonicalBase64Url(wrap.wrappedContentKeyB64u, "V124_PRIVATE_DOMAIN_WRAP_ENCODING_INVALID"),
  });
  const wrapDigest = digest(wrap.wrapDigest, "V124_PRIVATE_DOMAIN_WRAP_INVALID");
  if (await digestReceizCanonicalV122(wrapBasis) !== wrapDigest) {
    fail("V124_PRIVATE_DOMAIN_WRAP_INVALID");
  }
  const authority = closedRecord(
    record.authority,
    ["projectionIsProofAuthority", "strongerTruth"],
    "V124_PRIVATE_DOMAIN_ENVELOPE_AUTHORITY_INVALID",
  );
  if (authority.projectionIsProofAuthority !== false
    || authority.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_PRIVATE_DOMAIN_ENVELOPE_AUTHORITY_INVALID");
  }
  const envelope = freeze({
    schema: "receiz.world.private-envelope-projection.v124" as const,
    worldId,
    visibilityMode,
    ciphertextB64u: canonicalBase64Url(record.ciphertextB64u, "V124_PRIVATE_DOMAIN_ENVELOPE_ENCODING_INVALID"),
    nonceB64u: canonicalBase64Url(record.nonceB64u, "V124_PRIVATE_DOMAIN_ENVELOPE_ENCODING_INVALID", 12),
    aadDigest: digest(record.aadDigest, "V124_PRIVATE_DOMAIN_ENVELOPE_INVALID"),
    payloadDigest: digest(record.payloadDigest, "V124_PRIVATE_DOMAIN_ENVELOPE_INVALID"),
    envelopeDigest: digest(record.envelopeDigest, "V124_PRIVATE_DOMAIN_ENVELOPE_INVALID"),
    recipientWrap: freeze({ ...wrapBasis, wrapDigest }),
    authority: freeze({
      projectionIsProofAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  return envelope;
}

async function assertPublicEventBindsEnvelope(
  value: unknown,
  domain: string,
  envelope: ReceizPrivateWorldEnvelopeProjectionV124,
): Promise<void> {
  const source = value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  const candidate = source?.schema === "receiz.world.private-command-public.v122"
    ? source
    : source?.publicPayload !== null && typeof source?.publicPayload === "object" && !Array.isArray(source.publicPayload)
      ? source.publicPayload
      : source?.payload !== null && typeof source?.payload === "object" && !Array.isArray(source.payload)
        ? source.payload
        : null;
  const record = closedRecord(candidate, ["schema", "worldId", "publicPayload", "publicPayloadDigest", "privateEnvelopeDigest"], "V124_PRIVATE_DOMAIN_EVENT_BINDING_INVALID");
  if (record.schema !== "receiz.world.private-command-public.v122" || text(record.worldId, "V124_PRIVATE_DOMAIN_EVENT_BINDING_INVALID") !== domain
    || digest(record.privateEnvelopeDigest, "V124_PRIVATE_DOMAIN_EVENT_BINDING_INVALID") !== envelope.envelopeDigest) {
    fail("V124_PRIVATE_DOMAIN_EVENT_BINDING_INVALID");
  }
  const publicPayloadDigest = digest(record.publicPayloadDigest, "V124_PRIVATE_DOMAIN_EVENT_BINDING_INVALID");
  let actualPayloadDigest: string;
  try { actualPayloadDigest = await digestReceizCanonicalV122(record.publicPayload); } catch { fail("V124_PRIVATE_DOMAIN_EVENT_BINDING_INVALID"); }
  if (actualPayloadDigest !== publicPayloadDigest) fail("V124_PRIVATE_DOMAIN_EVENT_BINDING_INVALID");
}

async function privateWireResult(
  value: unknown,
  expected: ReturnType<typeof privateInput>,
  sourceAdmission?: Extract<ReceizDomainReplayRuntimeSourceAdmissionV124, {
    kind: "private" | "private-failure";
  }>,
): Promise<ReceizPrivateDomainAdditionsWireV124> {
  const status = responseStatus(value, "V124_PRIVATE_DOMAIN_CLOSED_SHAPE_INVALID");
  if (status.schema !== "receiz.private-domain-additions.v124") fail("V124_PRIVATE_DOMAIN_STATUS_INVALID");
  if (status.schema === "receiz.private-domain-additions.v124" && status.status === "not-found-or-not-authorized") {
    closedRecord(value, ["schema", "status"], "V124_PRIVATE_DOMAIN_CLOSED_SHAPE_INVALID");
    if (sourceAdmission && sourceAdmission.kind !== "private-failure") {
      fail("V124_PRIVATE_DOMAIN_SOURCE_BINDING_INVALID");
    }
    return privateFailure;
  }
  if (status.status !== "authenticated") fail("V124_PRIVATE_DOMAIN_STATUS_INVALID");
  const record = closedRecord(value, [
    "schema",
    "status",
    "applicationId",
    "domainId",
    "afterHead",
    "afterCursor",
    "cursor",
    "priorHead",
    "head",
    "viewerSubjectId",
    "viewerSubjectHead",
    "grantHead",
    "accessKeyHead",
    "additions",
    "sourceArtifact",
    "viewerSubjectSourceArtifact",
    "accessGrantSourceArtifact",
    "authority",
  ], "V124_PRIVATE_DOMAIN_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.private-domain-additions.v124" || record.status !== "authenticated" || !Array.isArray(record.additions)) fail("V124_PRIVATE_DOMAIN_STATUS_INVALID");
  const app = applicationId(record.applicationId, "V124_PRIVATE_DOMAIN_COORDINATE_INVALID");
  const domain = domainId(record.domainId, "V124_PRIVATE_DOMAIN_COORDINATE_INVALID");
  const afterHead = record.afterHead === null ? null : digest(record.afterHead, "V124_PRIVATE_DOMAIN_COORDINATE_INVALID");
  const afterCursor = upulse(record.afterCursor, "V124_PRIVATE_DOMAIN_CURSOR_INVALID");
  const cursor = upulse(record.cursor, "V124_PRIVATE_DOMAIN_CURSOR_INVALID");
  const priorHead = digest(record.priorHead, "V124_PRIVATE_DOMAIN_HEAD_INVALID");
  const head = digest(record.head, "V124_PRIVATE_DOMAIN_HEAD_INVALID");
  const viewerSubjectId = text(record.viewerSubjectId, "V124_PRIVATE_DOMAIN_VIEWER_INVALID");
  const viewerSubjectHead = digest(record.viewerSubjectHead, "V124_PRIVATE_DOMAIN_VIEWER_INVALID");
  const grantHead = digest(record.grantHead, "V124_PRIVATE_DOMAIN_GRANT_INVALID");
  const accessKeyHead = digest(record.accessKeyHead, "V124_PRIVATE_DOMAIN_ACCESS_KEY_INVALID");
  const sourceArtifact = parseReceizPortableReplaySourceArtifactV124(record.sourceArtifact);
  const viewerSubjectSourceArtifact = parseReceizPortableReplaySourceArtifactV124(
    record.viewerSubjectSourceArtifact,
  );
  const accessGrantSourceArtifact = parseReceizPortableReplaySourceArtifactV124(
    record.accessGrantSourceArtifact,
  );
  if (sourceAdmission && (sourceAdmission.kind !== "private"
    || !exactCanonical(sourceArtifact, sourceAdmission.eventSource.artifact)
    || !exactCanonical(viewerSubjectSourceArtifact, sourceAdmission.viewerSubjectSource.artifact)
    || !exactCanonical(accessGrantSourceArtifact, sourceAdmission.accessGrantSource.artifact))) {
    fail("V124_PRIVATE_DOMAIN_SOURCE_BINDING_INVALID");
  }
  if (app !== expected.applicationId || domain !== expected.domainId || afterHead !== expected.afterHead
    || viewerSubjectId !== expected.expectedViewerSubjectId || viewerSubjectHead !== expected.expectedViewerSubjectHead
    || grantHead !== expected.expectedGrantHead || cursor !== afterCursor + record.additions.length
    || (afterHead !== null && priorHead !== afterHead)) {
    fail("V124_PRIVATE_DOMAIN_RESPONSE_COORDINATE_MISMATCH");
  }
  let currentHead = priorHead;
  const appendIds = new Set<string>();
  const additions: ReceizPrivateDomainAdditionV124[] = [];
  for (let index = 0; index < record.additions.length; index += 1) {
    const source = record.additions[index];
    if (source === null || typeof source !== "object" || Array.isArray(source)) fail("V124_PRIVATE_DOMAIN_ADDITION_CLOSED_SHAPE_INVALID");
    const additionKind = (source as Record<string, unknown>).additionKind;
    if (additionKind !== "public" && additionKind !== "private") fail("V124_PRIVATE_DOMAIN_ADDITION_KIND_INVALID");
    const commonKeys = [
      "additionKind",
      "appendId",
      "sequence",
      "cursor",
      "exactPublicEventBytesB64u",
      "eventDigest",
      "priorHead",
      "newHead",
      "domainHead",
    ];
    const item = closedRecord(source, additionKind === "private" ? [
      ...commonKeys,
      "viewerSubjectId", "viewerSubjectHead", "grantHead", "accessKeyHead", "privateEnvelope", "recipientWrapDigest",
    ] : commonKeys, "V124_PRIVATE_DOMAIN_ADDITION_CLOSED_SHAPE_INVALID");
    const appendId = text(item.appendId, "V124_PRIVATE_DOMAIN_APPEND_INVALID");
    const sequence = upulse(item.sequence, "V124_PRIVATE_DOMAIN_CURSOR_INVALID");
    const itemCursor = upulse(item.cursor, "V124_PRIVATE_DOMAIN_CURSOR_INVALID");
    const event = await canonicalBytes(item.exactPublicEventBytesB64u, item.eventDigest, "V124_PRIVATE_DOMAIN_EVENT_INVALID");
    const itemPriorHead = digest(item.priorHead, "V124_PRIVATE_DOMAIN_HEAD_INVALID");
    const newHead = digest(item.newHead, "V124_PRIVATE_DOMAIN_HEAD_INVALID");
    const domainHead = digest(item.domainHead, "V124_PRIVATE_DOMAIN_HEAD_INVALID");
    if (appendIds.has(appendId) || sequence !== afterCursor + index + 1 || itemCursor !== sequence
      || itemPriorHead !== currentHead || domainHead !== newHead) {
      fail("V124_PRIVATE_DOMAIN_ADDITION_BINDING_INVALID");
    }
    if (additionKind === "public") {
      if (containsPrivatePublicEventMaterial(event.value)) fail("V124_PRIVATE_DOMAIN_PUBLIC_EVENT_INVALID");
      additions.push(freeze({
        additionKind: "public" as const,
        appendId,
        sequence,
        cursor: itemCursor,
        exactPublicEventBytesB64u: item.exactPublicEventBytesB64u as string,
        eventDigest: event.digest,
        priorHead: itemPriorHead,
        newHead,
        domainHead,
      }));
      appendIds.add(appendId);
      currentHead = newHead;
      continue;
    }
    const itemViewerSubjectId = text(item.viewerSubjectId, "V124_PRIVATE_DOMAIN_VIEWER_INVALID");
    const itemViewerSubjectHead = digest(item.viewerSubjectHead, "V124_PRIVATE_DOMAIN_VIEWER_INVALID");
    const itemGrantHead = digest(item.grantHead, "V124_PRIVATE_DOMAIN_GRANT_INVALID");
    const itemAccessKeyHead = digest(item.accessKeyHead, "V124_PRIVATE_DOMAIN_ACCESS_KEY_INVALID");
    const envelope = await closePrivateEnvelope(item.privateEnvelope, domain);
    await assertPublicEventBindsEnvelope(event.value, domain, envelope);
    if (itemViewerSubjectId !== viewerSubjectId || itemViewerSubjectHead !== viewerSubjectHead || itemGrantHead !== grantHead || itemAccessKeyHead !== accessKeyHead
      || envelope.worldId !== domain) {
      fail("V124_PRIVATE_DOMAIN_ADDITION_BINDING_INVALID");
    }
    const recipientWrapDigest = digest(item.recipientWrapDigest, "V124_PRIVATE_DOMAIN_WRAP_INVALID");
    const viewerWrap = envelope.recipientWrap;
    if (viewerWrap.recipientSubjectId !== viewerSubjectId
      || viewerWrap.recipientAccessKeyHead !== accessKeyHead
      || viewerWrap.wrapDigest !== recipientWrapDigest) {
      fail("V124_PRIVATE_DOMAIN_WRAP_INVALID");
    }
    additions.push(freeze({
      additionKind: "private" as const,
      appendId,
      sequence,
      cursor: itemCursor,
      exactPublicEventBytesB64u: item.exactPublicEventBytesB64u as string,
      eventDigest: event.digest,
      priorHead: itemPriorHead,
      newHead,
      domainHead,
      viewerSubjectId,
      viewerSubjectHead,
      grantHead,
      accessKeyHead,
      privateEnvelope: envelope,
      recipientWrapDigest,
    }));
    appendIds.add(appendId);
    currentHead = newHead;
  }
  if (currentHead !== head) fail("V124_PRIVATE_DOMAIN_HEAD_CHAIN_INVALID");
  return freeze({
    schema: "receiz.private-domain-additions.v124" as const,
    status: "authenticated" as const,
    applicationId: app,
    domainId: domain,
    afterHead,
    afterCursor,
    cursor,
    priorHead,
    head,
    viewerSubjectId,
    viewerSubjectHead,
    grantHead,
    accessKeyHead,
    additions: freeze(additions),
    sourceArtifact,
    viewerSubjectSourceArtifact,
    accessGrantSourceArtifact,
    authority: privateAuthority(record.authority),
  });
}

/** Source-internal server/client validator for the exact private-additions wire. */
export async function validateReceizPrivateDomainAdditionsWireV124(
  value: unknown,
  expectation: ReceizPrivateDomainAdditionsInputV124,
): Promise<ReceizPrivateDomainAdditionsWireV124> {
  return privateWireResult(value, privateInput(expectation));
}

async function privateResult(
  value: unknown,
  receipt: ReceizAuthenticatedRuntimeReceiptV124,
  expected: ReturnType<typeof privateInput>,
): Promise<ReceizPrivateDomainAdditionsResultV124> {
  let sourceAdmission: ReceizDomainReplayRuntimeSourceAdmissionV124 | null = null;
  try {
    sourceAdmission = (getReceizAuthenticatedRuntimeAdmissionV124(value) as ReturnType<
      typeof getReceizAuthenticatedRuntimeAdmissionV124
    > & Readonly<{ sourceAdmission: ReceizDomainReplayRuntimeSourceAdmissionV124 | null }>).sourceAdmission;
  } catch {
    fail("V124_PRIVATE_DOMAIN_TRANSPORT_UNAUTHENTICATED");
  }
  if (!sourceAdmission || (sourceAdmission.kind !== "private"
    && sourceAdmission.kind !== "private-failure")) {
    fail("V124_PRIVATE_DOMAIN_SOURCE_ARTIFACT_REQUIRED");
  }
  const wire = await privateWireResult(value, expected, sourceAdmission);
  if (wire.status !== "authenticated") return wire;
  const {
    authority,
    sourceArtifact: _sourceArtifact,
    viewerSubjectSourceArtifact: _viewerSubjectSourceArtifact,
    accessGrantSourceArtifact: _accessGrantSourceArtifact,
    ...basis
  } = wire;
  return freeze({ ...basis, authenticatedReceipt: receipt, authority });
}

/**
 * Source-internal domain client composition.  Its replay/checkpoint custody maps hold
 * only objects verified through Task 1 primitives; no caller can inject a predecessor.
 */
export function createReceizV124Domains(
  remote: ReceizV124DomainsRemoteV124,
  options: ReceizV124DomainsRuntimeOptions,
) {
  if (typeof remote !== "function") fail("V124_DOMAINS_REMOTE_INVALID");
  const runtime = runtimeOptions(options);
  const replays = new Map<string, ReceizDomainReplayV124>();
  const checkpointReplays = new Map<string, ReceizDomainReplayV124>();
  const checkpoints = new Map<string, ReceizCheckpointV124>();
  const latestReplays = new Map<string, ReceizDomainReplayV124>();
  let replayProofRestoreQueue: Promise<void> = Promise.resolve();

  const verifiedReplayAt = async (route: "/api/sdk/v1/domains/verified-additions" | "/api/sdk/v1/domains/verified-replay", value: ReceizDomainReplayExpectationV124): Promise<ReceizDomainReplayV124> => {
    const expected = replayExpectation(value);
    const previous = expected.afterHead === null ? undefined : replays.get(replayKey({
      applicationId: expected.applicationId,
      domainId: expected.domainId,
      registryDigest: expected.expectedRegistryDigest,
      reducerDigest: expected.expectedReducerDigest,
      head: expected.afterHead,
    }));
    if (expected.afterHead !== null && !previous) fail("V124_DOMAINS_PREVIOUS_REPLAY_REQUIRED");
    const request = await createReceizAuthenticatedRuntimeRequestV124({
      method: "POST",
      path: route,
      applicationId: expected.applicationId,
      audience: runtime.audience,
      strongerTruth: "sealed-receiz-proof-object",
      body: {
        applicationId: expected.applicationId,
        domainId: expected.domainId,
        afterHead: expected.afterHead,
        expectedRegistryDigest: expected.expectedRegistryDigest,
        expectedReducerDigest: expected.expectedReducerDigest,
      },
    });
    const outer = await runtimeWire(remote, request, route);
    const admitted = await admitReceizDomainReplayRuntimeWireV124(
      outer.wire,
      previous,
    );
    const result = await validateReceizDomainReplayV124(admitted, {
      applicationId: expected.applicationId,
      domainId: expected.domainId,
      afterHead: expected.afterHead,
      expectedRegistryDigest: expected.expectedRegistryDigest,
      expectedReducerDigest: expected.expectedReducerDigest,
    });
    if (!previous || result.additions.length > 0) {
      const key = replayKey({ applicationId: result.applicationId, domainId: result.domainId, registryDigest: result.registryDigest, reducerDigest: result.reducerDigest, head: result.head });
      replays.set(key, result);
      const checkpointReplayKey = checkpointKey({ applicationId: result.applicationId, domainId: result.domainId, head: result.head });
      const collision = checkpointReplays.get(checkpointReplayKey);
      if (collision && (collision.registryDigest !== result.registryDigest || collision.reducerDigest !== result.reducerDigest)) fail("V124_DOMAINS_REPLAY_CONTEXT_AMBIGUOUS");
      checkpointReplays.set(checkpointReplayKey, result);
      const coordinate = replayCoordinateKey(result);
      const latest = latestReplays.get(coordinate);
      if (!latest || result.cursor > latest.cursor
        || (result.cursor === latest.cursor && result.head === latest.head)) {
        latestReplays.set(coordinate, result);
      }
    }
    return result;
  };

  const verifiedAdditionsV124 = (value: ReceizDomainReplayExpectationV124) => verifiedReplayAt("/api/sdk/v1/domains/verified-additions", value);
  const verifiedReplayV124 = (value: ReceizDomainReplayExpectationV124) => verifiedReplayAt("/api/sdk/v1/domains/verified-replay", value);
  const verifiedCheckpointV124 = async (value: Readonly<{ applicationId: string; domainId: string; throughHead: string }>): Promise<ReceizCheckpointV124> => {
    const record = closedRecord(value, ["applicationId", "domainId", "throughHead"], "V124_DOMAINS_CHECKPOINT_INPUT_INVALID");
    const coordinates = freeze({
      applicationId: applicationId(record.applicationId, "V124_DOMAINS_CHECKPOINT_INPUT_INVALID"),
      domainId: domainId(record.domainId, "V124_DOMAINS_CHECKPOINT_INPUT_INVALID"),
      throughHead: digest(record.throughHead, "V124_DOMAINS_CHECKPOINT_INPUT_INVALID"),
    });
    const replay = checkpointReplays.get(checkpointKey({ applicationId: coordinates.applicationId, domainId: coordinates.domainId, head: coordinates.throughHead }));
    if (!replay) fail("V124_DOMAINS_HELD_REPLAY_REQUIRED");
    const request = await createReceizAuthenticatedRuntimeRequestV124({
      method: "POST",
      path: "/api/sdk/v1/domains/verified-checkpoint",
      applicationId: coordinates.applicationId,
      audience: runtime.audience,
      strongerTruth: "sealed-receiz-proof-object",
      body: coordinates,
    });
    const outer = await runtimeWire(remote, request, "/api/sdk/v1/domains/verified-checkpoint");
    const admitted = await admitReceizCheckpointRuntimeWireV124(outer.wire);
    const checkpoint = await validateReceizCheckpointV124(admitted, { replay });
    checkpoints.set(checkpointKey({
      applicationId: checkpoint.applicationId,
      domainId: checkpoint.domainId,
      head: checkpoint.throughHead,
    }), checkpoint);
    return checkpoint;
  };

  const exportVerifiedReplayProofObjectV124 = async (
    value: ReceizDomainReplayProofObjectExportInputV124,
  ) => {
    const includeCheckpointKey = Object.prototype.hasOwnProperty.call(
      value,
      "includeCheckpoint",
    );
    const record = closedRecord(value, [
      "applicationId",
      "domainId",
      "expectedRegistryDigest",
      "expectedReducerDigest",
      "throughHead",
      ...(includeCheckpointKey ? ["includeCheckpoint"] : []),
      "ownership",
      "provenance",
      "settlement",
    ], "V124_DOMAINS_REPLAY_PROOF_EXPORT_INPUT_INVALID");
    if (record.includeCheckpoint !== undefined
      && typeof record.includeCheckpoint !== "boolean") {
      fail("V124_DOMAINS_REPLAY_PROOF_EXPORT_INPUT_INVALID");
    }
    const coordinates = freeze({
      applicationId: applicationId(
        record.applicationId,
        "V124_DOMAINS_REPLAY_PROOF_EXPORT_INPUT_INVALID",
      ),
      domainId: domainId(
        record.domainId,
        "V124_DOMAINS_REPLAY_PROOF_EXPORT_INPUT_INVALID",
      ),
      registryDigest: digest(
        record.expectedRegistryDigest,
        "V124_DOMAINS_REPLAY_PROOF_EXPORT_INPUT_INVALID",
      ),
      reducerDigest: digest(
        record.expectedReducerDigest,
        "V124_DOMAINS_REPLAY_PROOF_EXPORT_INPUT_INVALID",
      ),
      throughHead: digest(
        record.throughHead,
        "V124_DOMAINS_REPLAY_PROOF_EXPORT_INPUT_INVALID",
      ),
    });
    const replay = replays.get(replayKey({
      applicationId: coordinates.applicationId,
      domainId: coordinates.domainId,
      registryDigest: coordinates.registryDigest,
      reducerDigest: coordinates.reducerDigest,
      head: coordinates.throughHead,
    }));
    if (!replay) fail("V124_DOMAINS_HELD_REPLAY_REQUIRED");
    const latest = latestReplays.get(replayCoordinateKey(replay));
    if (!latest || latest !== replay) {
      fail("V124_DOMAINS_REPLAY_PROOF_LATEST_REQUIRED");
    }
    let checkpoint: ReceizCheckpointV124 | null = null;
    if (record.includeCheckpoint === true) {
      const heldCheckpoint = checkpoints.get(checkpointKey({
        applicationId: replay.applicationId,
        domainId: replay.domainId,
        head: replay.head,
      }));
      if (!heldCheckpoint) fail("V124_DOMAINS_HELD_CHECKPOINT_REQUIRED");
      checkpoint = heldCheckpoint;
    }
    const carrier: ReceizDomainReplayProofCarrierV124 =
      createReceizDomainReplayCustodyCarrierV124({ replay, checkpoint });
    return createReceizDomainReplayProofObjectExportV124(carrier, {
      ownership: record.ownership as ReceizDomainReplayProofObjectExportInputV124["ownership"],
      provenance: record.provenance as ReceizDomainReplayProofObjectExportInputV124["provenance"],
      settlement: record.settlement as ReceizDomainReplayProofObjectExportInputV124["settlement"],
    });
  };

  const restoreVerifiedReplayProofObjectUnlockedV124 = async (
    value: ReceizDomainReplayProofObjectRestoreInputV124,
  ) => {
    // The outer custody object and both nested exact sources validate before a
    // factory map is inspected or changed.
    const restored = await restoreReceizDomainReplayProofCarrierV124(value, {
      expectedAudience: runtime.audience,
    });
    const imported = restored.restoration.replay;
    const importedSource = restored.replaySource;
    const coordinate = replayCoordinateKey(imported);
    const current = latestReplays.get(coordinate);
    let replaceCurrent = current === undefined;
    if (current) {
      if (imported.cursor < current.cursor) {
        fail("V124_DOMAINS_REPLAY_REWIND_FORBIDDEN");
      }
      if (imported.cursor === current.cursor) {
        if (imported.head === current.head && sameReplayTruth(imported, current)) {
          replaceCurrent = false;
        } else {
          const currentSource = readReceizVerifiedDomainReplaySourceV124(current);
          const selection = compareReceizVerifiedDomainReplaySourcesV124(
            importedSource,
            currentSource,
          );
          if (selection <= 0) fail("V124_DOMAINS_REPLAY_PROOF_CONFLICT");
          replaceCurrent = true;
        }
      } else {
        const currentSource = readReceizVerifiedDomainReplaySourceV124(current);
        const direct = importedSource.carrier.predecessor;
        const carriesCurrent = (direct !== null
          && direct.artifactSha256 === currentSource.artifactSha256
          && direct.head.headDigest === currentSource.head.headDigest)
          || importedSource.head.fibonacci.checkpoints.some((reference) =>
            reference.operationCount === currentSource.head.segmentCount
            && reference.artifactDigest === currentSource.artifactSha256);
        if (!carriesCurrent) fail("V124_DOMAINS_REPLAY_PROOF_CONFLICT");
        replaceCurrent = true;
      }
    }
    const importedReplayKey = replayKey({ applicationId: imported.applicationId, domainId: imported.domainId, registryDigest: imported.registryDigest, reducerDigest: imported.reducerDigest, head: imported.head });
    const importedCheckpointKey = checkpointKey({ applicationId: imported.applicationId, domainId: imported.domainId, head: imported.head });
    const heldReplay = replays.get(importedReplayKey);
    if (heldReplay && !sameReplayTruth(heldReplay, imported)) fail("V124_DOMAINS_REPLAY_PROOF_CONFLICT");
    const heldCheckpointReplay = checkpointReplays.get(importedCheckpointKey);
    if (heldCheckpointReplay && !sameReplayTruth(heldCheckpointReplay, imported)) fail("V124_DOMAINS_REPLAY_CONTEXT_AMBIGUOUS");
    if (restored.restoration.checkpoint) {
      const heldCheckpoint = checkpoints.get(checkpointKey({
        applicationId: restored.restoration.checkpoint.applicationId,
        domainId: restored.restoration.checkpoint.domainId,
        head: restored.restoration.checkpoint.throughHead,
      }));
      if (heldCheckpoint
        && !exactCanonical(heldCheckpoint, restored.restoration.checkpoint)) {
        fail("V124_DOMAINS_REPLAY_PROOF_CONFLICT");
      }
    }

    // Installation begins only after the complete source, checkpoint,
    // anti-rewind/branch selection, and collision set have validated.
    replays.set(importedReplayKey, heldReplay ?? imported);
    checkpointReplays.set(importedCheckpointKey, heldCheckpointReplay ?? heldReplay ?? imported);
    if (replaceCurrent) {
      latestReplays.set(coordinate, imported);
    }
    if (restored.restoration.checkpoint) {
      const key = checkpointKey({
        applicationId: restored.restoration.checkpoint.applicationId,
        domainId: restored.restoration.checkpoint.domainId,
        head: restored.restoration.checkpoint.throughHead,
      });
      checkpoints.set(key, checkpoints.get(key) ?? restored.restoration.checkpoint);
    }
    return restored.restoration;
  };
  const restoreVerifiedReplayProofObjectV124 = (
    value: ReceizDomainReplayProofObjectRestoreInputV124,
  ) => {
    const result = replayProofRestoreQueue.then(
      () => restoreVerifiedReplayProofObjectUnlockedV124(value),
    );
    replayProofRestoreQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  };
  const verifiedPrivateAdditionsV124 = async (value: ReceizPrivateDomainAdditionsInputV124): Promise<ReceizPrivateDomainAdditionsResultV124> => {
    const expected = privateInput(value);
    const request = await createReceizAuthenticatedRuntimeRequestV124({
      method: "POST",
      path: "/api/sdk/v1/domains/verified-private-additions",
      applicationId: expected.applicationId,
      audience: runtime.audience,
      strongerTruth: "sealed-receiz-proof-object",
      body: expected,
    });
    const admitted = await runtimeWire(remote, request, "/api/sdk/v1/domains/verified-private-additions");
    return privateResult(admitted.wire, admitted.receipt, expected);
  };
  return freeze({
    verifiedAdditionsV124,
    verifiedAdditions: verifiedAdditionsV124,
    verifiedReplayV124,
    verifiedReplay: verifiedReplayV124,
    verifiedCheckpointV124,
    verifiedCheckpoint: verifiedCheckpointV124,
    exportVerifiedReplayProofObjectV124,
    exportVerifiedReplayProofObject: exportVerifiedReplayProofObjectV124,
    restoreVerifiedReplayProofObjectV124,
    restoreVerifiedReplayProofObject: restoreVerifiedReplayProofObjectV124,
    verifiedPrivateAdditionsV124,
    verifiedPrivateAdditions: verifiedPrivateAdditionsV124,
  });
}

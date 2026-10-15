import {
  createReceizArtifactAdmissionEngine,
  verifyReceizArtifactAdmission,
} from "./artifactAdmission.js";
import type { ReceizVerifiedArtifactAdmission } from "./artifactAdmissionTypes.js";
import { sha256ReceizBytes } from "./artifacts.js";
import {
  verifyReceizArtifact,
  verifyReceizArtifactWithCanonicalRoots,
} from "./artifactVerification.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { extractReceizPortableAssetPayload } from "./portableAsset.js";
import { digestReceizCanonicalV122 } from "./v122Canonical.js";
import { closedRecord, digest, freeze, text } from "./v124Contracts.js";
import { normalizeReceizPublicRecipientAliasV124 } from "./v124Recipient.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";

export type ReceizPublicRecipientPublicationPayloadV124 = Readonly<{
  schema: "receiz.public-recipient-publication.v124";
  normalizedAlias: string;
  priorPublicationHead: string | null;
  publisherReceizId: string;
  destinationSubjectId: string;
  destinationSubjectHead: string;
  purposes: readonly string[];
  display: Readonly<{ displayName: string; imageUrl: string | null }>;
  consentStatementDigest: string;
  publicationNonce: string;
  publishedAtKaiUPulse: number;
  expiresAtKaiUPulse: number;
  active: true;
  publicationHead: string;
  authority: Readonly<{
    publicationIsIdentityAuthority: false;
    publicationIsTransferAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizPublicRecipientPublicationInputV124 = Readonly<{
  normalizedAlias: string;
  priorPublicationHead: string | null;
  publisherReceizId: string;
  destinationSubjectId: string;
  destinationSubjectHead: string;
  purposes: readonly string[];
  display: Readonly<{ displayName: string; imageUrl: string | null }>;
  consentStatementDigest: string;
  publicationNonce: string;
  publishedAtKaiUPulse: number;
  expiresAtKaiUPulse: number;
  active: true;
}>;

export type ReceizAdmittedPublicRecipientPublicationV124 = Readonly<{
  schema: "receiz.public-recipient-publication-admission.v124";
  status: "admitted-public-recipient-publication";
  normalizedAlias: string;
  priorPublicationHead: string | null;
  purposes: readonly string[];
  display: Readonly<{ displayName: string; imageUrl: string | null }>;
  publishedAtKaiUPulse: number;
  expiresAtKaiUPulse: number;
  publicationHead: string;
  authority: Readonly<{
    admissionIsIdentityAuthority: false;
    admissionIsTransferAuthority: false;
    strongerTruth: "sealed-receiz-proof-object";
  }>;
}>;

export type ReceizPublicRecipientPublicationAuthorityV124 = Readonly<{
  publisherReceizId: string;
  destinationSubjectId: string;
  destinationSubjectHead: string;
  consentStatementDigest: string;
  publicationNonce: string;
  publicationHead: string;
  priorPublicationHead: string | null;
  artifactDigest: string;
  admission: Extract<ReceizVerifiedArtifactAdmission, { profile: "portable-state" }>;
}>;

const OWNER = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?\.receiz\.id$/;
const PURPOSE = /^[a-z][a-z0-9._:-]{0,63}$/;
const PUBLICATION_MIME = "application/vnd.receiz.public-recipient-publication+json";
const MAX_PUBLICATION_LIFETIME_UPULSES = 600_000_000;
const publicationAuthority = new WeakMap<object, ReceizPublicRecipientPublicationAuthorityV124>();

function fail(code: string): never {
  throw new TypeError(code);
}

function uPulse(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}

function ownerReceizId(value: unknown): string {
  const owner = text(value, "V124_RECIPIENT_PUBLICATION_OWNER_INVALID");
  if (!OWNER.test(owner)) fail("V124_RECIPIENT_PUBLICATION_OWNER_INVALID");
  return owner;
}

function publicationNonce(value: unknown): string {
  if (typeof value !== "string") fail("V124_RECIPIENT_PUBLICATION_NONCE_INVALID");
  let bytes: Uint8Array;
  try {
    bytes = receizBase64UrlDecode(value);
  } catch {
    return fail("V124_RECIPIENT_PUBLICATION_NONCE_INVALID");
  }
  if (bytes.byteLength < 32 || bytes.byteLength > 128 || receizBase64UrlEncode(bytes) !== value) {
    fail("V124_RECIPIENT_PUBLICATION_NONCE_INVALID");
  }
  return value;
}

function purposes(value: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 32) {
    fail("V124_RECIPIENT_PUBLICATION_PURPOSES_INVALID");
  }
  const result = value.map((entry) => text(entry, "V124_RECIPIENT_PUBLICATION_PURPOSES_INVALID"));
  if (result.some((entry) => !PURPOSE.test(entry))) {
    fail("V124_RECIPIENT_PUBLICATION_PURPOSES_INVALID");
  }
  if (result.some((entry, index) => index > 0 && result[index - 1]!.localeCompare(entry) >= 0)) {
    fail("V124_RECIPIENT_PUBLICATION_PURPOSES_NONCANONICAL");
  }
  return freeze(result);
}

function display(value: unknown): Readonly<{ displayName: string; imageUrl: string | null }> {
  const record = closedRecord(
    value,
    ["displayName", "imageUrl"],
    "V124_RECIPIENT_PUBLICATION_DISPLAY_INVALID",
  );
  const displayName = text(record.displayName, "V124_RECIPIENT_PUBLICATION_DISPLAY_INVALID");
  if (displayName.length > 128) fail("V124_RECIPIENT_PUBLICATION_DISPLAY_INVALID");
  const imageUrl = record.imageUrl === null
    ? null
    : text(record.imageUrl, "V124_RECIPIENT_PUBLICATION_DISPLAY_INVALID");
  if (imageUrl !== null && imageUrl.length > 2_048) {
    fail("V124_RECIPIENT_PUBLICATION_DISPLAY_INVALID");
  }
  return freeze({ displayName, imageUrl });
}

function publicationAuthorityMarker(value: unknown): ReceizPublicRecipientPublicationPayloadV124["authority"] {
  const record = closedRecord(
    value,
    ["publicationIsIdentityAuthority", "publicationIsTransferAuthority", "strongerTruth"],
    "V124_RECIPIENT_PUBLICATION_AUTHORITY_INVALID",
  );
  if (record.publicationIsIdentityAuthority !== false
    || record.publicationIsTransferAuthority !== false
    || record.strongerTruth !== "sealed-receiz-proof-object") {
    fail("V124_RECIPIENT_PUBLICATION_AUTHORITY_INVALID");
  }
  return freeze({
    publicationIsIdentityAuthority: false as const,
    publicationIsTransferAuthority: false as const,
    strongerTruth: "sealed-receiz-proof-object" as const,
  });
}

function validateLifetime(publishedAt: number, expiresAt: number): void {
  if (expiresAt <= publishedAt || expiresAt - publishedAt > MAX_PUBLICATION_LIFETIME_UPULSES) {
    fail("V124_RECIPIENT_PUBLICATION_EXPIRY_INVALID");
  }
}

function priorPublicationHead(value: unknown): string | null {
  return value === null
    ? null
    : digest(value, "V124_RECIPIENT_PUBLICATION_PRIOR_HEAD_INVALID");
}

async function publicationHead(
  basis: Readonly<Omit<ReceizPublicRecipientPublicationPayloadV124, "publicationHead" | "authority">>,
): Promise<string> {
  return digestReceizCanonicalV122({
    schema: "receiz.public-recipient-publication-head.v124",
    publication: basis,
  });
}

export async function createReceizPublicRecipientPublicationPayloadV124(
  value: ReceizPublicRecipientPublicationInputV124,
): Promise<ReceizPublicRecipientPublicationPayloadV124> {
  const record = closedRecord(value, [
    "normalizedAlias",
    "priorPublicationHead",
    "publisherReceizId",
    "destinationSubjectId",
    "destinationSubjectHead",
    "purposes",
    "display",
    "consentStatementDigest",
    "publicationNonce",
    "publishedAtKaiUPulse",
    "expiresAtKaiUPulse",
    "active",
  ], "V124_RECIPIENT_PUBLICATION_INPUT_INVALID");
  if (record.active !== true) fail("V124_RECIPIENT_PUBLICATION_INACTIVE");
  const publishedAt = uPulse(record.publishedAtKaiUPulse, "V124_RECIPIENT_PUBLICATION_EXPIRY_INVALID");
  const expiresAt = uPulse(record.expiresAtKaiUPulse, "V124_RECIPIENT_PUBLICATION_EXPIRY_INVALID");
  validateLifetime(publishedAt, expiresAt);
  const basis = freeze({
    schema: "receiz.public-recipient-publication.v124" as const,
    normalizedAlias: normalizeReceizPublicRecipientAliasV124(record.normalizedAlias),
    priorPublicationHead: priorPublicationHead(record.priorPublicationHead),
    publisherReceizId: ownerReceizId(record.publisherReceizId),
    destinationSubjectId: text(record.destinationSubjectId, "V124_RECIPIENT_PUBLICATION_DESTINATION_INVALID"),
    destinationSubjectHead: digest(record.destinationSubjectHead, "V124_RECIPIENT_PUBLICATION_DESTINATION_INVALID"),
    purposes: purposes(record.purposes),
    display: display(record.display),
    consentStatementDigest: digest(record.consentStatementDigest, "V124_RECIPIENT_PUBLICATION_CONSENT_INVALID"),
    publicationNonce: publicationNonce(record.publicationNonce),
    publishedAtKaiUPulse: publishedAt,
    expiresAtKaiUPulse: expiresAt,
    active: true as const,
  });
  const head = await publicationHead(basis);
  if (basis.priorPublicationHead === head) {
    fail("V124_RECIPIENT_PUBLICATION_PRIOR_HEAD_INVALID");
  }
  return freeze({
    ...basis,
    publicationHead: head,
    authority: freeze({
      publicationIsIdentityAuthority: false as const,
      publicationIsTransferAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
}

async function parsePublicationPayload(value: unknown): Promise<ReceizPublicRecipientPublicationPayloadV124> {
  const record = closedRecord(value, [
    "schema",
    "normalizedAlias",
    "priorPublicationHead",
    "publisherReceizId",
    "destinationSubjectId",
    "destinationSubjectHead",
    "purposes",
    "display",
    "consentStatementDigest",
    "publicationNonce",
    "publishedAtKaiUPulse",
    "expiresAtKaiUPulse",
    "active",
    "publicationHead",
    "authority",
  ], "V124_RECIPIENT_PUBLICATION_PAYLOAD_INVALID");
  if (record.schema !== "receiz.public-recipient-publication.v124" || record.active !== true) {
    fail("V124_RECIPIENT_PUBLICATION_PAYLOAD_INVALID");
  }
  const publishedAt = uPulse(record.publishedAtKaiUPulse, "V124_RECIPIENT_PUBLICATION_EXPIRY_INVALID");
  const expiresAt = uPulse(record.expiresAtKaiUPulse, "V124_RECIPIENT_PUBLICATION_EXPIRY_INVALID");
  validateLifetime(publishedAt, expiresAt);
  const basis = freeze({
    schema: "receiz.public-recipient-publication.v124" as const,
    normalizedAlias: normalizeReceizPublicRecipientAliasV124(record.normalizedAlias),
    priorPublicationHead: priorPublicationHead(record.priorPublicationHead),
    publisherReceizId: ownerReceizId(record.publisherReceizId),
    destinationSubjectId: text(record.destinationSubjectId, "V124_RECIPIENT_PUBLICATION_DESTINATION_INVALID"),
    destinationSubjectHead: digest(record.destinationSubjectHead, "V124_RECIPIENT_PUBLICATION_DESTINATION_INVALID"),
    purposes: purposes(record.purposes),
    display: display(record.display),
    consentStatementDigest: digest(record.consentStatementDigest, "V124_RECIPIENT_PUBLICATION_CONSENT_INVALID"),
    publicationNonce: publicationNonce(record.publicationNonce),
    publishedAtKaiUPulse: publishedAt,
    expiresAtKaiUPulse: expiresAt,
    active: true as const,
  });
  const expectedHead = await publicationHead(basis);
  if (digest(record.publicationHead, "V124_RECIPIENT_PUBLICATION_HEAD_INVALID") !== expectedHead) {
    fail("V124_RECIPIENT_PUBLICATION_HEAD_INVALID");
  }
  if (basis.priorPublicationHead === expectedHead) {
    fail("V124_RECIPIENT_PUBLICATION_PRIOR_HEAD_INVALID");
  }
  return freeze({
    ...basis,
    publicationHead: expectedHead,
    authority: publicationAuthorityMarker(record.authority),
  });
}

export async function admitReceizPublicRecipientPublicationV124(input: Readonly<{
  admission: unknown;
  expectedNormalizedAlias: string;
  expectedPurpose: string;
  currentKaiUPulse: number;
}>): Promise<ReceizAdmittedPublicRecipientPublicationV124> {
  const record = closedRecord(input, [
    "admission",
    "expectedNormalizedAlias",
    "expectedPurpose",
    "currentKaiUPulse",
  ], "V124_RECIPIENT_PUBLICATION_ADMISSION_INPUT_INVALID");
  const admission = await verifyReceizArtifactAdmission(record.admission);
  if ("code" in admission) fail(admission.code);
  if (admission.profile !== "portable-state" || !admission.ownerReceizId) {
    fail("V124_RECIPIENT_PUBLICATION_PROOF_REQUIRED");
  }
  const portablePayload = await extractReceizPortableAssetPayload(admission.recoveredState);
  if (portablePayload.assetType !== "proof_object" || portablePayload.mimeType !== PUBLICATION_MIME) {
    fail("V124_RECIPIENT_PUBLICATION_PROOF_REQUIRED");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(portablePayload.bytes));
  } catch {
    return fail("V124_RECIPIENT_PUBLICATION_PAYLOAD_INVALID");
  }
  const payload = await parsePublicationPayload(decoded);
  if (payload.publisherReceizId !== admission.ownerReceizId) {
    fail("V124_RECIPIENT_PUBLICATION_OWNER_MISMATCH");
  }
  const expectedAlias = normalizeReceizPublicRecipientAliasV124(record.expectedNormalizedAlias);
  if (payload.normalizedAlias !== expectedAlias) {
    fail("V124_RECIPIENT_PUBLICATION_ALIAS_MISMATCH");
  }
  const expectedPurpose = text(record.expectedPurpose, "V124_RECIPIENT_PUBLICATION_PURPOSE_INVALID");
  if (!PURPOSE.test(expectedPurpose) || !payload.purposes.includes(expectedPurpose)) {
    fail("V124_RECIPIENT_PUBLICATION_PURPOSE_NOT_GRANTED");
  }
  const now = uPulse(record.currentKaiUPulse, "V124_RECIPIENT_PUBLICATION_TIME_INVALID");
  if (now < payload.publishedAtKaiUPulse || now >= payload.expiresAtKaiUPulse) {
    fail("V124_RECIPIENT_PUBLICATION_EXPIRED");
  }
  const result = freeze({
    schema: "receiz.public-recipient-publication-admission.v124" as const,
    status: "admitted-public-recipient-publication" as const,
    normalizedAlias: payload.normalizedAlias,
    priorPublicationHead: payload.priorPublicationHead,
    purposes: payload.purposes,
    display: payload.display,
    publishedAtKaiUPulse: payload.publishedAtKaiUPulse,
    expiresAtKaiUPulse: payload.expiresAtKaiUPulse,
    publicationHead: payload.publicationHead,
    authority: freeze({
      admissionIsIdentityAuthority: false as const,
      admissionIsTransferAuthority: false as const,
      strongerTruth: "sealed-receiz-proof-object" as const,
    }),
  });
  publicationAuthority.set(result, freeze({
    publisherReceizId: payload.publisherReceizId,
    destinationSubjectId: payload.destinationSubjectId,
    destinationSubjectHead: payload.destinationSubjectHead,
    consentStatementDigest: payload.consentStatementDigest,
    publicationNonce: payload.publicationNonce,
    publicationHead: payload.publicationHead,
    priorPublicationHead: payload.priorPublicationHead,
    artifactDigest: admission.artifactSha256,
    admission,
  }));
  return result;
}

/**
 * Source-internal server readmission. Stored paths and row digests are only
 * subordinate coordinates: the exact sealed bytes are verified and admitted
 * again before publication or destination custody can exist in this process.
 */
export async function admitReceizPublicRecipientPublicationBytesV124(input: Readonly<{
  exactProofBytes: Uint8Array;
  expectedArtifactDigest: string;
  expectedByteLength: number;
  expectedNormalizedAlias: string;
  expectedPurpose: string;
  currentKaiUPulse: number;
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<ReceizAdmittedPublicRecipientPublicationV124> {
  const keys = Object.prototype.hasOwnProperty.call(input, "canonicalSignatureV4RootPublicKeys")
    ? [
      "exactProofBytes",
      "expectedArtifactDigest",
      "expectedByteLength",
      "expectedNormalizedAlias",
      "expectedPurpose",
      "currentKaiUPulse",
      "canonicalSignatureV4RootPublicKeys",
    ]
    : [
      "exactProofBytes",
      "expectedArtifactDigest",
      "expectedByteLength",
      "expectedNormalizedAlias",
      "expectedPurpose",
      "currentKaiUPulse",
    ];
  closedRecord(input, keys, "V124_RECIPIENT_PUBLICATION_EXACT_BYTES_INVALID");
  const expectedDigest = digest(
    input.expectedArtifactDigest,
    "V124_RECIPIENT_PUBLICATION_EXACT_BYTES_INVALID",
  );
  if (!(input.exactProofBytes instanceof Uint8Array)
    || input.exactProofBytes.byteLength === 0
    || !Number.isSafeInteger(input.expectedByteLength)
    || input.expectedByteLength !== input.exactProofBytes.byteLength
    || await sha256ReceizBytes(input.exactProofBytes) !== expectedDigest) {
    fail("V124_RECIPIENT_PUBLICATION_EXACT_BYTES_INVALID");
  }
  const verification = input.canonicalSignatureV4RootPublicKeys
    ? await verifyReceizArtifactWithCanonicalRoots(
      input.exactProofBytes,
      input.canonicalSignatureV4RootPublicKeys,
    )
    : await verifyReceizArtifact(input.exactProofBytes);
  if (verification.status !== "verified-artifact"
    || verification.artifactDigest.value !== expectedDigest) {
    fail("V124_RECIPIENT_PUBLICATION_EXACT_BYTES_INVALID");
  }
  const admission = await createReceizArtifactAdmissionEngine(
    input.canonicalSignatureV4RootPublicKeys
      ? { canonicalSignatureV4RootPublicKeys: input.canonicalSignatureV4RootPublicKeys }
      : {},
  )(verification, { profile: "portable-state" });
  return admitReceizPublicRecipientPublicationV124({
    admission,
    expectedNormalizedAlias: input.expectedNormalizedAlias,
    expectedPurpose: input.expectedPurpose,
    currentKaiUPulse: input.currentKaiUPulse,
  });
}

/** Digest-only persistence binding below the admitted sealed publication. */
export async function digestReceizPublicRecipientPublicationBindingV124(
  publication: ReceizAdmittedPublicRecipientPublicationV124,
): Promise<string> {
  const authority = publicationAuthority.get(publication);
  if (!authority) fail("V124_RECIPIENT_PUBLICATION_NOT_ADMITTED");
  return digestReceizCanonicalV122({
    schema: "receiz.public-recipient-publication-binding.v124",
    publicationHead: authority.publicationHead,
    priorPublicationHead: authority.priorPublicationHead,
    artifactDigest: authority.artifactDigest,
    publisherReceizId: authority.publisherReceizId,
    destinationSubjectId: authority.destinationSubjectId,
    destinationSubjectHead: authority.destinationSubjectHead,
    consentStatementDigest: authority.consentStatementDigest,
    publicationNonce: authority.publicationNonce,
  });
}

/** Source-internal transfer composition; intentionally omitted from the package root. */
export function readReceizPublicRecipientPublicationAuthorityV124(
  publication: ReceizAdmittedPublicRecipientPublicationV124,
): ReceizPublicRecipientPublicationAuthorityV124 {
  const authority = publicationAuthority.get(publication);
  if (!authority) fail("V124_RECIPIENT_PUBLICATION_NOT_ADMITTED");
  return authority;
}

import { sha256ReceizBytes } from "./artifacts.js";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import {
  admitReceizAuthenticatedRuntimeWireV124,
  createReceizAuthenticatedRuntimeRequestV124,
  getReceizAuthenticatedRuntimeAdmissionV124,
  type ReceizAuthenticatedRuntimeReceiptV124,
  type ReceizAuthenticatedRuntimeRequestV124,
} from "./v124AuthenticatedRuntime.js";
import { applicationId, closedRecord, digest, freeze, text } from "./v124Contracts.js";

/** Source-internal authenticated request seam; deliberately absent from package-root exports. */
export type ReceizV124RecipientRemoteV124 = (request: ReceizAuthenticatedRuntimeRequestV124) => Promise<Readonly<{
  wire: unknown;
  receipt: unknown;
}>>;

/** Source-internal factory options.  The audience is supplied by existing identity binding, not the public call. */
export type ReceizV124RecipientRuntimeOptions = Readonly<{
  audience: string;
}>;

export type ReceizPublicRecipientResolutionInputV124 = Readonly<{
  applicationId: string;
  authoritySessionHandle: string;
  expectedRequesterSubjectId: string;
  normalizedAlias: string;
  purpose: string;
  operationNonce: string;
}>;

export type ReceizPublicRecipientResolutionV124 =
  | Readonly<{
    schema: "receiz.public-recipient-resolution.v124";
    status: "resolved";
    applicationId: string;
    normalizedAlias: string;
    purpose: string;
    operationNonce: string;
    display: Readonly<{ displayName: string; imageUrl: string | null }>;
    encryptedLocatorB64u: string;
    expiresAtKaiUPulse: number;
    locatorDigest: string;
    authenticatedReceipt: ReceizAuthenticatedRuntimeReceiptV124;
    authority: Readonly<{
      resolutionIsProofAuthority: false;
      resolutionIsIdentityAuthority: false;
      strongerTruth: "receiz-identity-artifact";
    }>;
  }>
  | Readonly<{
    schema: "receiz.public-recipient-resolution.v124";
    status: "not-found-or-not-authorized";
  }>;

/**
 * A non-authoritative, one-use reference to an encrypted recipient locator.
 * Recipient identity and destination-head custody remain inside the server's
 * sealed-publication admission boundary and are deliberately absent here.
 */
export type ReceizPublicRecipientLocatorReferenceV124 = Readonly<{
  schema: "receiz.public-recipient-locator-reference.v124";
  encryptedLocatorB64u: string;
  locatorDigest: string;
  purpose: string;
  operationNonce: string;
}>;

const ALIAS = /^[a-z][a-z0-9._-]{1,62}[a-z0-9]$/;
const TOKEN = /^[a-z][a-z0-9._-]{0,63}$/;
const privateFailure = freeze({
  schema: "receiz.public-recipient-resolution.v124" as const,
  status: "not-found-or-not-authorized" as const,
});

function fail(code: string): never { throw new TypeError(code); }

/** The one shared SDK/server normalization primitive for a public recipient alias. */
export function normalizeReceizPublicRecipientAliasV124(value: unknown): string {
  if (typeof value !== "string") fail("V124_RECIPIENT_ALIAS_INVALID");
  let normalized: string;
  try { normalized = value.normalize("NFKC").trim().toLowerCase(); } catch { fail("V124_RECIPIENT_ALIAS_INVALID"); }
  // The accepted alphabet is deliberately ASCII after NFKC.  This rejects invisible,
  // mixed-script, and confusable Unicode inputs rather than guessing a recipient.
  if (!ALIAS.test(normalized)) fail("V124_RECIPIENT_ALIAS_INVALID");
  return normalized;
}

function runtimeOptions(value: ReceizV124RecipientRuntimeOptions): Readonly<{
  audience: string;
}> {
  const record = closedRecord(value, ["audience"], "V124_RECIPIENT_RUNTIME_OPTIONS_INVALID");
  return freeze({ audience: text(record.audience, "V124_RECIPIENT_RUNTIME_OPTIONS_INVALID") });
}

function nonce(value: unknown): string {
  if (typeof value !== "string") fail("V124_RECIPIENT_NONCE_INVALID");
  let bytes: Uint8Array;
  try { bytes = receizBase64UrlDecode(value); } catch { fail("V124_RECIPIENT_NONCE_INVALID"); }
  if (bytes.byteLength < 32 || bytes.byteLength > 128 || receizBase64UrlEncode(bytes) !== value) fail("V124_RECIPIENT_NONCE_INVALID");
  return value;
}

export async function createReceizPublicRecipientLocatorReferenceV124(
  value: unknown,
): Promise<ReceizPublicRecipientLocatorReferenceV124> {
  const record = closedRecord(value, [
    "schema",
    "encryptedLocatorB64u",
    "locatorDigest",
    "purpose",
    "operationNonce",
  ], "V124_RECIPIENT_LOCATOR_REFERENCE_INVALID");
  if (record.schema !== "receiz.public-recipient-locator-reference.v124") {
    fail("V124_RECIPIENT_LOCATOR_REFERENCE_INVALID");
  }
  const purpose = text(record.purpose, "V124_RECIPIENT_PURPOSE_INVALID");
  if (!TOKEN.test(purpose)) fail("V124_RECIPIENT_PURPOSE_INVALID");
  const operationNonce = nonce(record.operationNonce);
  const encryptedLocatorB64u = text(record.encryptedLocatorB64u, "V124_RECIPIENT_LOCATOR_INVALID");
  let locatorBytes: Uint8Array;
  try { locatorBytes = receizBase64UrlDecode(encryptedLocatorB64u); } catch { return fail("V124_RECIPIENT_LOCATOR_INVALID"); }
  const locatorDigest = digest(record.locatorDigest, "V124_RECIPIENT_LOCATOR_INVALID");
  if (locatorBytes.byteLength === 0 || receizBase64UrlEncode(locatorBytes) !== encryptedLocatorB64u
    || await sha256ReceizBytes(locatorBytes) !== locatorDigest) {
    fail("V124_RECIPIENT_LOCATOR_INVALID");
  }
  return freeze({
    schema: "receiz.public-recipient-locator-reference.v124" as const,
    encryptedLocatorB64u,
    locatorDigest,
    purpose,
    operationNonce,
  });
}

export const validateReceizPublicRecipientLocatorReferenceV124 =
  createReceizPublicRecipientLocatorReferenceV124;

function input(value: ReceizPublicRecipientResolutionInputV124): Readonly<{
  applicationId: string;
  authoritySessionHandle: string;
  expectedRequesterSubjectId: string;
  normalizedAlias: string;
  purpose: string;
  operationNonce: string;
}> {
  const record = closedRecord(value, [
    "applicationId",
    "authoritySessionHandle",
    "expectedRequesterSubjectId",
    "normalizedAlias",
    "purpose",
    "operationNonce",
  ], "V124_RECIPIENT_INPUT_INVALID");
  const purpose = text(record.purpose, "V124_RECIPIENT_PURPOSE_INVALID");
  if (!TOKEN.test(purpose)) fail("V124_RECIPIENT_PURPOSE_INVALID");
  return freeze({
    applicationId: applicationId(record.applicationId, "V124_RECIPIENT_INPUT_INVALID"),
    authoritySessionHandle: text(record.authoritySessionHandle, "V124_RECIPIENT_INPUT_INVALID"),
    expectedRequesterSubjectId: text(record.expectedRequesterSubjectId, "V124_RECIPIENT_INPUT_INVALID"),
    normalizedAlias: normalizeReceizPublicRecipientAliasV124(record.normalizedAlias),
    purpose,
    operationNonce: nonce(record.operationNonce),
  });
}

function display(value: unknown): Readonly<{ displayName: string; imageUrl: string | null }> {
  const record = closedRecord(value, ["displayName", "imageUrl"], "V124_RECIPIENT_DISPLAY_INVALID");
  const displayName = text(record.displayName, "V124_RECIPIENT_DISPLAY_INVALID");
  if (displayName.length > 128) fail("V124_RECIPIENT_DISPLAY_INVALID");
  const imageUrl = record.imageUrl === null ? null : text(record.imageUrl, "V124_RECIPIENT_DISPLAY_INVALID");
  if (imageUrl !== null && imageUrl.length > 2048) fail("V124_RECIPIENT_DISPLAY_INVALID");
  return freeze({ displayName, imageUrl });
}

function authority(value: unknown): Readonly<{
  resolutionIsProofAuthority: false;
  resolutionIsIdentityAuthority: false;
  strongerTruth: "receiz-identity-artifact";
}> {
  const record = closedRecord(value, ["resolutionIsProofAuthority", "resolutionIsIdentityAuthority", "strongerTruth"], "V124_RECIPIENT_AUTHORITY_INVALID");
  if (record.resolutionIsProofAuthority !== false || record.resolutionIsIdentityAuthority !== false || record.strongerTruth !== "receiz-identity-artifact") {
    fail("V124_RECIPIENT_AUTHORITY_INVALID");
  }
  return freeze({ resolutionIsProofAuthority: false as const, resolutionIsIdentityAuthority: false as const, strongerTruth: "receiz-identity-artifact" as const });
}

function upulse(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}

async function authenticatedWire(
  remote: ReceizV124RecipientRemoteV124,
  request: ReceizAuthenticatedRuntimeRequestV124,
): Promise<Readonly<{ wire: unknown; receipt: ReceizAuthenticatedRuntimeReceiptV124 }>> {
  const response = closedRecord(await remote(request), ["wire", "receipt"], "V124_RECIPIENT_REMOTE_RESPONSE_INVALID");
  const wire = await admitReceizAuthenticatedRuntimeWireV124({ request, wire: response.wire, receipt: response.receipt });
  const admitted = getReceizAuthenticatedRuntimeAdmissionV124(wire);
  if (admitted.request.requestDigest !== request.requestDigest
    || admitted.request.path !== "/api/sdk/v1/identity/public-recipient/resolve"
    || admitted.request.strongerTruth !== "receiz-identity-artifact"
    || admitted.receipt.authority.strongerTruth !== "receiz-identity-artifact") {
    fail("V124_RECIPIENT_RUNTIME_BINDING_INVALID");
  }
  return freeze({ wire, receipt: admitted.receipt });
}

async function projection(
  wire: unknown,
  receipt: ReceizAuthenticatedRuntimeReceiptV124,
  expected: ReturnType<typeof input>,
): Promise<ReceizPublicRecipientResolutionV124> {
  const record = closedRecord(wire, [
    "schema",
    "status",
    "applicationId",
    "normalizedAlias",
    "purpose",
    "operationNonce",
    "display",
    "encryptedLocatorB64u",
    "expiresAtKaiUPulse",
    "locatorDigest",
    "authority",
  ], "V124_RECIPIENT_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.public-recipient-resolution.v124" || record.status !== "resolved") fail("V124_RECIPIENT_STATUS_INVALID");
  const app = applicationId(record.applicationId, "V124_RECIPIENT_RESPONSE_INVALID");
  const alias = normalizeReceizPublicRecipientAliasV124(record.normalizedAlias);
  const purpose = text(record.purpose, "V124_RECIPIENT_RESPONSE_INVALID");
  const operationNonce = nonce(record.operationNonce);
  if (!TOKEN.test(purpose) || app !== expected.applicationId || alias !== expected.normalizedAlias
    || purpose !== expected.purpose || operationNonce !== expected.operationNonce) {
    fail("V124_RECIPIENT_RESPONSE_COORDINATE_MISMATCH");
  }
  const encryptedLocatorB64u = text(record.encryptedLocatorB64u, "V124_RECIPIENT_LOCATOR_INVALID");
  let locatorBytes: Uint8Array;
  try { locatorBytes = receizBase64UrlDecode(encryptedLocatorB64u); } catch { fail("V124_RECIPIENT_LOCATOR_INVALID"); }
  if (locatorBytes.byteLength === 0 || receizBase64UrlEncode(locatorBytes) !== encryptedLocatorB64u
    || await sha256ReceizBytes(locatorBytes) !== digest(record.locatorDigest, "V124_RECIPIENT_LOCATOR_INVALID")) {
    fail("V124_RECIPIENT_LOCATOR_INVALID");
  }
  const expiresAtKaiUPulse = upulse(record.expiresAtKaiUPulse, "V124_RECIPIENT_EXPIRY_INVALID");
  if (expiresAtKaiUPulse <= receipt.issuedAtKaiUPulse || expiresAtKaiUPulse > receipt.expiresAtKaiUPulse) fail("V124_RECIPIENT_EXPIRY_INVALID");
  return freeze({
    schema: "receiz.public-recipient-resolution.v124" as const,
    status: "resolved" as const,
    applicationId: app,
    normalizedAlias: alias,
    purpose,
    operationNonce,
    display: display(record.display),
    encryptedLocatorB64u,
    expiresAtKaiUPulse,
    locatorDigest: digest(record.locatorDigest, "V124_RECIPIENT_LOCATOR_INVALID"),
    authenticatedReceipt: receipt,
    authority: authority(record.authority),
  });
}

function responseStatus(value: unknown): Readonly<{ schema: unknown; status: unknown }> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail("V124_RECIPIENT_CLOSED_SHAPE_INVALID");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const schema = descriptors.schema;
  const status = descriptors.status;
  if (!schema || !status || !schema.enumerable || !status.enumerable || !("value" in schema) || !("value" in status)) {
    fail("V124_RECIPIENT_CLOSED_SHAPE_INVALID");
  }
  return freeze({ schema: schema.value, status: status.value });
}

/**
 * Source-internal recipient client.  A caller-shaped fetch result can never become
 * recipient truth: only a runtime-admitted wire is projected, and safe failures are
 * intentionally coordinate-free.
 */
export function createReceizV124Recipient(
  remote: ReceizV124RecipientRemoteV124,
  options: ReceizV124RecipientRuntimeOptions,
) {
  if (typeof remote !== "function") fail("V124_RECIPIENT_REMOTE_INVALID");
  const runtime = runtimeOptions(options);
  const resolvePublicRecipientV124 = async (value: ReceizPublicRecipientResolutionInputV124): Promise<ReceizPublicRecipientResolutionV124> => {
    const expected = input(value);
    const request = await createReceizAuthenticatedRuntimeRequestV124({
      method: "POST",
      path: "/api/sdk/v1/identity/public-recipient/resolve",
      applicationId: expected.applicationId,
      audience: runtime.audience,
      strongerTruth: "receiz-identity-artifact",
      body: expected,
    });
    const admitted = await authenticatedWire(remote, request);
    const raw = responseStatus(admitted.wire);
    if (raw.schema === "receiz.public-recipient-resolution.v124" && raw.status === "not-found-or-not-authorized") {
      closedRecord(admitted.wire, ["schema", "status"], "V124_RECIPIENT_CLOSED_SHAPE_INVALID");
      return privateFailure;
    }
    return projection(admitted.wire, admitted.receipt, expected);
  };
  return freeze({ resolvePublicRecipientV124, resolvePublicRecipient: resolvePublicRecipientV124 });
}

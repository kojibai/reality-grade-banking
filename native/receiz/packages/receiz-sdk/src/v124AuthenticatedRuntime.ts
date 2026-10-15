import { applicationId, closedRecord, digest, freeze, text } from "./v124Contracts.js";
import { digestReceizCanonicalV122 } from "./v122Canonical.js";
import {
  readReceizSignedTransportEnvelopeV124,
  verifyReceizTransportBindingV124,
  type ReceizTransportBindingExpectationV124,
} from "./v124TransportBinding.js";
import {
  clearReceizDomainReplayRuntimeSourceAdmissionV124,
  consumeReceizDomainReplayRuntimeSourceAdmissionV124,
  verifyReceizDomainReplayRuntimeSourceV124,
  type ReceizDomainReplayRuntimeSourceAdmissionV124,
} from "./v124ReplayProofObject.js";

export type ReceizRuntimeStrongerTruthV124 = "receiz-identity-artifact" | "sealed-receiz-proof-object";

export type ReceizAuthenticatedRuntimeRequestInputV124 = Readonly<{
  method: "POST";
  path: string;
  applicationId: string;
  audience: string;
  strongerTruth: ReceizRuntimeStrongerTruthV124;
  body: unknown;
}>;

export type ReceizAuthenticatedRuntimeRequestV124 = Readonly<{
  schema: "receiz.authenticated-runtime-request.v124";
  method: "POST";
  path: string;
  applicationId: string;
  audience: string;
  strongerTruth: ReceizRuntimeStrongerTruthV124;
  body: unknown;
  requestDigest: string;
}>;

export type ReceizAuthenticatedRuntimeReceiptV124 = Readonly<{
  schema: "receiz.authenticated-runtime-receipt.v124";
  method: "POST";
  path: string;
  requestDigest: string;
  wireDigest: string;
  applicationId: string;
  audience: string;
  issuedAtKaiUPulse: number;
  expiresAtKaiUPulse: number;
  revocationHead: string;
  revokedAtKaiUPulse: null;
  authority: Readonly<{
    receiptIsProofAuthority: false;
    receiptIsIdentityAuthority: false;
    strongerTruth: ReceizRuntimeStrongerTruthV124;
  }>;
  receiptDigest: string;
}>;

type RuntimeAdmission = Readonly<{
  request: ReceizAuthenticatedRuntimeRequestV124;
  receipt: ReceizAuthenticatedRuntimeReceiptV124;
  sourceAdmission: ReceizDomainReplayRuntimeSourceAdmissionV124 | null;
}>;

type PendingRuntimeAdmission = RuntimeAdmission & Readonly<{ wire: object }>;

const RUNTIME_PATH = /^\/api\/sdk\/v1\/[a-z0-9][a-z0-9_./-]*$/;
const pendingAdmissions = new WeakMap<object, PendingRuntimeAdmission>();
const admissions = new WeakMap<object, RuntimeAdmission>();

const REPLAY_SOURCE_PATHS = new Set([
  "/api/sdk/v1/domains/verified-additions",
  "/api/sdk/v1/domains/verified-replay",
  "/api/sdk/v1/domains/verified-checkpoint",
  "/api/sdk/v1/domains/verified-private-additions",
  "/api/sdk/v1/subjects/namespaces/resolve",
]);

function fail(code: string): never { throw new TypeError(code); }
function upulse(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}
function strongerTruth(value: unknown, code: string): ReceizRuntimeStrongerTruthV124 {
  if (value !== "receiz-identity-artifact" && value !== "sealed-receiz-proof-object") fail(code);
  return value;
}
function audience(value: unknown, code: string): string {
  return applicationId(value, code);
}
function path(value: unknown, code: string): string {
  const result = text(value, code);
  if (!RUNTIME_PATH.test(result) || result.includes("//")) fail(code);
  return result;
}
function snapshot(value: unknown, code: string): unknown {
  try { return freeze(structuredClone(value)); } catch { return fail(code); }
}

async function requestDigest(input: Readonly<Omit<ReceizAuthenticatedRuntimeRequestV124, "requestDigest">>): Promise<string> {
  try { return await digestReceizCanonicalV122(input); } catch { return fail("V124_RUNTIME_REQUEST_BODY_INVALID"); }
}

export async function createReceizAuthenticatedRuntimeRequestV124(
  input: ReceizAuthenticatedRuntimeRequestInputV124,
): Promise<ReceizAuthenticatedRuntimeRequestV124> {
  const record = closedRecord(input, ["method", "path", "applicationId", "audience", "strongerTruth", "body"], "V124_RUNTIME_REQUEST_INVALID");
  if (record.method !== "POST") fail("V124_RUNTIME_REQUEST_METHOD_INVALID");
  const basis = freeze({
    schema: "receiz.authenticated-runtime-request.v124" as const,
    method: "POST" as const,
    path: path(record.path, "V124_RUNTIME_REQUEST_PATH_INVALID"),
    applicationId: applicationId(record.applicationId, "V124_RUNTIME_REQUEST_APPLICATION_INVALID"),
    audience: audience(record.audience, "V124_RUNTIME_REQUEST_AUDIENCE_INVALID"),
    strongerTruth: strongerTruth(record.strongerTruth, "V124_RUNTIME_REQUEST_AUTHORITY_INVALID"),
    body: snapshot(record.body, "V124_RUNTIME_REQUEST_BODY_INVALID"),
  });
  return freeze({ ...basis, requestDigest: await requestDigest(basis) });
}

async function validateRequest(value: unknown): Promise<ReceizAuthenticatedRuntimeRequestV124> {
  const record = closedRecord(value, ["schema", "method", "path", "applicationId", "audience", "strongerTruth", "body", "requestDigest"], "V124_RUNTIME_REQUEST_INVALID");
  if (record.schema !== "receiz.authenticated-runtime-request.v124" || record.method !== "POST") fail("V124_RUNTIME_REQUEST_INVALID");
  const basis = freeze({
    schema: "receiz.authenticated-runtime-request.v124" as const,
    method: "POST" as const,
    path: path(record.path, "V124_RUNTIME_REQUEST_PATH_INVALID"),
    applicationId: applicationId(record.applicationId, "V124_RUNTIME_REQUEST_APPLICATION_INVALID"),
    audience: audience(record.audience, "V124_RUNTIME_REQUEST_AUDIENCE_INVALID"),
    strongerTruth: strongerTruth(record.strongerTruth, "V124_RUNTIME_REQUEST_AUTHORITY_INVALID"),
    body: snapshot(record.body, "V124_RUNTIME_REQUEST_BODY_INVALID"),
  });
  const actual = digest(record.requestDigest, "V124_RUNTIME_REQUEST_DIGEST_INVALID");
  if (await requestDigest(basis) !== actual) fail("V124_RUNTIME_REQUEST_DIGEST_INVALID");
  return freeze({ ...basis, requestDigest: actual });
}

function receiptAuthority(value: unknown): ReceizAuthenticatedRuntimeReceiptV124["authority"] {
  const record = closedRecord(value, ["receiptIsProofAuthority", "receiptIsIdentityAuthority", "strongerTruth"], "V124_RUNTIME_RECEIPT_AUTHORITY_INVALID");
  if (record.receiptIsProofAuthority !== false || record.receiptIsIdentityAuthority !== false) fail("V124_RUNTIME_RECEIPT_AUTHORITY_INVALID");
  return freeze({
    receiptIsProofAuthority: false as const,
    receiptIsIdentityAuthority: false as const,
    strongerTruth: strongerTruth(record.strongerTruth, "V124_RUNTIME_RECEIPT_AUTHORITY_INVALID"),
  });
}

async function validateReceipt(value: unknown): Promise<ReceizAuthenticatedRuntimeReceiptV124> {
  const record = closedRecord(value, ["schema", "method", "path", "requestDigest", "wireDigest", "applicationId", "audience", "issuedAtKaiUPulse", "expiresAtKaiUPulse", "revocationHead", "revokedAtKaiUPulse", "authority", "receiptDigest"], "V124_RUNTIME_RECEIPT_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.authenticated-runtime-receipt.v124" || record.method !== "POST" || record.revokedAtKaiUPulse !== null) fail("V124_RUNTIME_RECEIPT_INVALID");
  const basis = freeze({
    schema: "receiz.authenticated-runtime-receipt.v124" as const,
    method: "POST" as const,
    path: path(record.path, "V124_RUNTIME_RECEIPT_INVALID"),
    requestDigest: digest(record.requestDigest, "V124_RUNTIME_RECEIPT_INVALID"),
    wireDigest: digest(record.wireDigest, "V124_RUNTIME_RECEIPT_INVALID"),
    applicationId: applicationId(record.applicationId, "V124_RUNTIME_RECEIPT_INVALID"),
    audience: audience(record.audience, "V124_RUNTIME_RECEIPT_INVALID"),
    issuedAtKaiUPulse: upulse(record.issuedAtKaiUPulse, "V124_RUNTIME_RECEIPT_UPULSE_INVALID"),
    expiresAtKaiUPulse: upulse(record.expiresAtKaiUPulse, "V124_RUNTIME_RECEIPT_UPULSE_INVALID"),
    revocationHead: digest(record.revocationHead, "V124_RUNTIME_RECEIPT_INVALID"),
    revokedAtKaiUPulse: null,
    authority: receiptAuthority(record.authority),
  });
  if (basis.expiresAtKaiUPulse <= basis.issuedAtKaiUPulse) fail("V124_RUNTIME_RECEIPT_UPULSE_INVALID");
  const actual = digest(record.receiptDigest, "V124_RUNTIME_RECEIPT_INVALID");
  if (await digestReceizCanonicalV122(basis) !== actual) fail("V124_RUNTIME_RECEIPT_DIGEST_INVALID");
  return freeze({ ...basis, receiptDigest: actual });
}

export async function admitReceizAuthenticatedRuntimeWireV124(
  input: Readonly<{ request: ReceizAuthenticatedRuntimeRequestV124; wire: unknown; receipt: unknown }>,
): Promise<unknown> {
  const holder = closedRecord(input, ["request", "wire", "receipt"], "V124_RUNTIME_ADMISSION_INVALID");
  if (holder.receipt === null || typeof holder.receipt !== "object" || Array.isArray(holder.receipt)) {
    fail("V124_RUNTIME_TRANSPORT_UNAUTHENTICATED");
  }
  const pending = pendingAdmissions.get(holder.receipt);
  if (pending) pendingAdmissions.delete(holder.receipt);
  const request = await validateRequest(holder.request);
  if (holder.wire === null || typeof holder.wire !== "object" || Array.isArray(holder.wire)) fail("V124_RUNTIME_AUTHENTICATION_REQUIRED");
  const wire = snapshot(holder.wire, "V124_RUNTIME_AUTHENTICATION_REQUIRED");
  const receipt = await validateReceipt(holder.receipt);
  if (!pending) fail("V124_RUNTIME_TRANSPORT_UNAUTHENTICATED");
  if (pending.request.requestDigest !== request.requestDigest
    || pending.request.path !== request.path
    || pending.receipt.receiptDigest !== receipt.receiptDigest) fail("V124_RUNTIME_RECEIPT_REQUEST_MISMATCH");
  if (receipt.method !== request.method || receipt.path !== request.path || receipt.requestDigest !== request.requestDigest
    || receipt.applicationId !== request.applicationId || receipt.audience !== request.audience
    || receipt.authority.strongerTruth !== request.strongerTruth) fail("V124_RUNTIME_RECEIPT_REQUEST_MISMATCH");
  let wireDigest: string;
  try { wireDigest = await digestReceizCanonicalV122(wire); } catch { return fail("V124_RUNTIME_RECEIPT_WIRE_MISMATCH"); }
  if (receipt.wireDigest !== wireDigest) fail("V124_RUNTIME_RECEIPT_WIRE_MISMATCH");
  if (admissions.get(pending.wire)?.receipt.receiptDigest === receipt.receiptDigest) {
    return pending.wire;
  }
  return fail("V124_RUNTIME_TRANSPORT_UNAUTHENTICATED");
}

export async function admitReceizSignedAuthenticatedRuntimeEnvelopeV124(
  input: Readonly<{ request: ReceizAuthenticatedRuntimeRequestV124; envelope: unknown }>,
): Promise<Readonly<{ wire: unknown; receipt: ReceizAuthenticatedRuntimeReceiptV124 }>> {
  const holder = closedRecord(input, ["request", "envelope"], "V124_RUNTIME_ADMISSION_INVALID");
  const request = await validateRequest(holder.request);
  const envelope = readReceizSignedTransportEnvelopeV124(holder.envelope);
  const receipt = await validateReceipt(envelope.receipt);
  const wireDigest = await digestReceizCanonicalV122(envelope.wire);
  if (receipt.method !== request.method || receipt.path !== request.path || receipt.requestDigest !== request.requestDigest
    || receipt.wireDigest !== wireDigest || receipt.applicationId !== request.applicationId
    || receipt.audience !== request.audience || receipt.authority.strongerTruth !== request.strongerTruth) {
    fail("V124_RUNTIME_RECEIPT_REQUEST_MISMATCH");
  }
  const expected: ReceizTransportBindingExpectationV124 = freeze({
    kind: "runtime" as const,
    method: request.method,
    path: request.path,
    requestDigest: request.requestDigest,
    wireDigest,
    receiptDigest: receipt.receiptDigest,
    applicationId: request.applicationId,
    audience: request.audience,
    revocationHead: receipt.revocationHead,
    revocationHeadAuthority: "authenticated-runtime-receipt" as const,
    strongerTruth: request.strongerTruth,
  });
  await verifyReceizTransportBindingV124(
    envelope.transportBinding,
    envelope.transportSignature,
    expected,
  );
  const wire = envelope.wire as object;
  try {
    let sourceAdmission: ReceizDomainReplayRuntimeSourceAdmissionV124 | null = null;
    if (REPLAY_SOURCE_PATHS.has(request.path)) {
      await verifyReceizDomainReplayRuntimeSourceV124(wire, request);
      sourceAdmission = consumeReceizDomainReplayRuntimeSourceAdmissionV124(
        wire,
        request.requestDigest,
      );
    }
    const admission = freeze({ request, receipt, sourceAdmission });
    admissions.set(wire, admission);
    pendingAdmissions.set(receipt, freeze({ ...admission, wire }));
    return freeze({ wire: envelope.wire, receipt });
  } catch (error) {
    clearReceizDomainReplayRuntimeSourceAdmissionV124(wire);
    throw error;
  }
}

export function getReceizAuthenticatedRuntimeAdmissionV124(value: unknown): RuntimeAdmission {
  if (value === null || typeof value !== "object") fail("V124_RUNTIME_AUTHENTICATION_REQUIRED");
  const admission = admissions.get(value);
  if (!admission) fail("V124_RUNTIME_AUTHENTICATION_REQUIRED");
  return admission;
}

export function isReceizAuthenticatedRuntimeWireV124(value: unknown): boolean {
  return value !== null && typeof value === "object" && admissions.has(value);
}

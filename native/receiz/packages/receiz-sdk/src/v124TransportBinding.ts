import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";
import { applicationId, closedRecord, digest, freeze, text } from "./v124Contracts.js";
import { receizKaiNow } from "./v124Kai.js";
import { receizCurrentPinnedSignatureV4Roots } from "./verifier/roots.js";
import type { ReceizSignatureV4RootPublicKey } from "./verifier/signatureV4.js";

export const RECEIZ_V124_TRANSPORT_BINDING_SCHEMA = "receiz.v124.transport-binding.v1" as const;
export const RECEIZ_V124_TRANSPORT_SIGNATURE_SCHEMA = "receiz.transport-signature.v124" as const;
export const RECEIZ_V124_SIGNED_TRANSPORT_ENVELOPE_SCHEMA = "receiz.signed-transport-envelope.v124" as const;
export const RECEIZ_V124_TRANSPORT_TTL_UPULSES = 5_000_000;
export const RECEIZ_V124_TRANSPORT_MAX_TTL_UPULSES = 10_000_000;

export type ReceizTransportBindingKindV124 = "runtime" | "execution";
export type ReceizTransportBindingDomainV124 = "receiz.v124.runtime-response" | "receiz.v124.execution-response";
export type ReceizTransportStrongerTruthV124 = "receiz-identity-artifact" | "sealed-receiz-proof-object";

export type ReceizTransportBindingAuthorityV124 = Readonly<{
  bindingIsProofAuthority: false;
  bindingIsIdentityAuthority: false;
  bindingIsExecutionAuthority: false;
  bindingIsHeadAuthority: false;
  strongerTruth: ReceizTransportStrongerTruthV124;
}>;

export type ReceizTransportBindingV124 = Readonly<{
  schema: typeof RECEIZ_V124_TRANSPORT_BINDING_SCHEMA;
  domain: ReceizTransportBindingDomainV124;
  issuerRootKid: string;
  method: "GET" | "POST";
  path: string;
  requestDigest: string;
  wireDigest: string;
  receiptDigest: string;
  applicationId: string;
  audience: string;
  issuedAtKaiPulse: number;
  issuedAtKaiUPulse: number;
  expiresAtKaiUPulse: number;
  revocationHead: string;
  authority: ReceizTransportBindingAuthorityV124;
}>;

export type ReceizTransportSignatureV124 = Readonly<{
  schema: typeof RECEIZ_V124_TRANSPORT_SIGNATURE_SCHEMA;
  kid: string;
  alg: "Ed25519";
  sig: string;
}>;

export type ReceizSignedTransportEnvelopeV124<TWire = unknown, TReceipt = unknown> = Readonly<{
  schema: typeof RECEIZ_V124_SIGNED_TRANSPORT_ENVELOPE_SCHEMA;
  wire: TWire;
  receipt: TReceipt;
  transportBinding: ReceizTransportBindingV124;
  transportSignature: ReceizTransportSignatureV124;
}>;

export type ReceizTransportBindingInputV124 = Readonly<{
  kind: ReceizTransportBindingKindV124;
  method: "GET" | "POST";
  path: string;
  requestDigest: string;
  wireDigest: string;
  receiptDigest: string;
  applicationId: string;
  audience: string;
  issuerRootKid: string;
  issuedAtKaiPulse: number;
  issuedAtKaiUPulse: number;
  expiresAtKaiUPulse: number;
  revocationHead: string;
  strongerTruth: ReceizTransportStrongerTruthV124;
}>;

export type ReceizTransportBindingExpectationV124 = Readonly<{
  kind: ReceizTransportBindingKindV124;
  method: "GET" | "POST";
  path: string;
  requestDigest: string;
  wireDigest: string;
  receiptDigest: string;
  applicationId: string;
  audience: string;
  revocationHead: string | null;
  revocationHeadAuthority: "authenticated-runtime-receipt" | "transport-coordinate-only";
  strongerTruth: ReceizTransportStrongerTruthV124;
}>;

export type ReceizExecutionTransportRequestInputV124 = Readonly<{
  method: "GET" | "POST";
  path: string;
  applicationId: string;
  audience: string;
  body: unknown;
}>;

const KID = /^[A-Za-z0-9._:-]{3,64}$/;
const PATH = /^\/api\/sdk\/v1\/[a-z0-9][A-Za-z0-9%_./:-]*$/;
const B64U = /^[A-Za-z0-9_-]+$/;

function fail(code: string): never { throw new TypeError(code); }
function safeNonnegative(value: unknown, code: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) fail(code);
  return value as number;
}
function method(value: unknown): "GET" | "POST" {
  if (value !== "GET" && value !== "POST") fail("V124_TRANSPORT_METHOD_INVALID");
  return value;
}
function kind(value: unknown): ReceizTransportBindingKindV124 {
  if (value !== "runtime" && value !== "execution") fail("V124_TRANSPORT_DOMAIN_INVALID");
  return value;
}
function domainFor(value: ReceizTransportBindingKindV124): ReceizTransportBindingDomainV124 {
  return value === "runtime" ? "receiz.v124.runtime-response" : "receiz.v124.execution-response";
}
function bindingKind(value: unknown): ReceizTransportBindingKindV124 {
  if (value === "receiz.v124.runtime-response") return "runtime";
  if (value === "receiz.v124.execution-response") return "execution";
  return fail("V124_TRANSPORT_DOMAIN_INVALID");
}
function path(value: unknown): string {
  const candidate = text(value, "V124_TRANSPORT_PATH_INVALID");
  if (!PATH.test(candidate) || candidate.includes("//")) fail("V124_TRANSPORT_PATH_INVALID");
  return candidate;
}

function kid(value: unknown): string {
  const candidate = text(value, "V124_TRANSPORT_ROOT_INVALID");
  if (!KID.test(candidate)) fail("V124_TRANSPORT_ROOT_INVALID");
  return candidate;
}
function strongerTruth(value: unknown): ReceizTransportStrongerTruthV124 {
  if (value !== "receiz-identity-artifact" && value !== "sealed-receiz-proof-object") {
    fail("V124_TRANSPORT_AUTHORITY_INVALID");
  }
  return value;
}
function authority(value: unknown): ReceizTransportBindingAuthorityV124 {
  const record = closedRecord(value, [
    "bindingIsProofAuthority",
    "bindingIsIdentityAuthority",
    "bindingIsExecutionAuthority",
    "bindingIsHeadAuthority",
    "strongerTruth",
  ], "V124_TRANSPORT_AUTHORITY_INVALID");
  if (record.bindingIsProofAuthority !== false
    || record.bindingIsIdentityAuthority !== false
    || record.bindingIsExecutionAuthority !== false
    || record.bindingIsHeadAuthority !== false) fail("V124_TRANSPORT_AUTHORITY_INVALID");
  return freeze({
    bindingIsProofAuthority: false as const,
    bindingIsIdentityAuthority: false as const,
    bindingIsExecutionAuthority: false as const,
    bindingIsHeadAuthority: false as const,
    strongerTruth: strongerTruth(record.strongerTruth),
  });
}
function validateTime(input: Readonly<{
  issuedAtKaiPulse: unknown;
  issuedAtKaiUPulse: unknown;
  expiresAtKaiUPulse: unknown;
}>): Readonly<{ issuedAtKaiPulse: number; issuedAtKaiUPulse: number; expiresAtKaiUPulse: number }> {
  const issuedAtKaiPulse = safeNonnegative(input.issuedAtKaiPulse, "V124_TRANSPORT_TIME_INVALID");
  const issuedAtKaiUPulse = safeNonnegative(input.issuedAtKaiUPulse, "V124_TRANSPORT_TIME_INVALID");
  const expiresAtKaiUPulse = safeNonnegative(input.expiresAtKaiUPulse, "V124_TRANSPORT_TIME_INVALID");
  const ttl = expiresAtKaiUPulse - issuedAtKaiUPulse;
  if (issuedAtKaiPulse !== Math.floor(issuedAtKaiUPulse / 1_000_000)
    || !Number.isSafeInteger(ttl)
    || ttl <= 0
    || ttl > RECEIZ_V124_TRANSPORT_MAX_TTL_UPULSES) fail("V124_TRANSPORT_TIME_INVALID");
  return freeze({ issuedAtKaiPulse, issuedAtKaiUPulse, expiresAtKaiUPulse });
}

function validateBinding(value: unknown): Readonly<{ binding: ReceizTransportBindingV124; kind: ReceizTransportBindingKindV124 }> {
  const record = closedRecord(value, [
    "schema", "domain", "issuerRootKid", "method", "path", "requestDigest", "wireDigest", "receiptDigest",
    "applicationId", "audience", "issuedAtKaiPulse", "issuedAtKaiUPulse", "expiresAtKaiUPulse", "revocationHead", "authority",
  ], "V124_TRANSPORT_BINDING_INVALID");
  if (record.schema !== RECEIZ_V124_TRANSPORT_BINDING_SCHEMA) fail("V124_TRANSPORT_BINDING_INVALID");
  const admittedKind = bindingKind(record.domain);
  const admittedAuthority = authority(record.authority);
  const time = validateTime({
    issuedAtKaiPulse: record.issuedAtKaiPulse,
    issuedAtKaiUPulse: record.issuedAtKaiUPulse,
    expiresAtKaiUPulse: record.expiresAtKaiUPulse,
  });
  return freeze({
    kind: admittedKind,
    binding: freeze({
      schema: RECEIZ_V124_TRANSPORT_BINDING_SCHEMA,
      domain: domainFor(admittedKind),
      issuerRootKid: kid(record.issuerRootKid),
      method: method(record.method),
      path: path(record.path),
      requestDigest: digest(record.requestDigest, "V124_TRANSPORT_REQUEST_INVALID"),
      wireDigest: digest(record.wireDigest, "V124_TRANSPORT_WIRE_INVALID"),
      receiptDigest: digest(record.receiptDigest, "V124_TRANSPORT_RECEIPT_INVALID"),
      applicationId: applicationId(record.applicationId, "V124_TRANSPORT_APPLICATION_INVALID"),
      audience: applicationId(record.audience, "V124_TRANSPORT_AUDIENCE_INVALID"),
      ...time,
      revocationHead: digest(record.revocationHead, "V124_TRANSPORT_REVOCATION_INVALID"),
      authority: admittedAuthority,
    }),
  });
}

function validateSignature(value: unknown): ReceizTransportSignatureV124 {
  const record = closedRecord(value, ["schema", "kid", "alg", "sig"], "V124_TRANSPORT_SIGNATURE_INVALID");
  if (record.schema !== RECEIZ_V124_TRANSPORT_SIGNATURE_SCHEMA || record.alg !== "Ed25519") {
    fail("V124_TRANSPORT_SIGNATURE_INVALID");
  }
  const signatureKid = kid(record.kid);
  if (typeof record.sig !== "string" || !B64U.test(record.sig)) fail("V124_TRANSPORT_SIGNATURE_INVALID");
  let bytes: Uint8Array;
  try { bytes = receizBase64UrlDecode(record.sig); } catch { return fail("V124_TRANSPORT_SIGNATURE_INVALID"); }
  if (bytes.byteLength !== 64 || receizBase64UrlEncode(bytes) !== record.sig) fail("V124_TRANSPORT_SIGNATURE_INVALID");
  return freeze({ schema: RECEIZ_V124_TRANSPORT_SIGNATURE_SCHEMA, kid: signatureKid, alg: "Ed25519" as const, sig: record.sig });
}

export function createReceizTransportBindingV124(input: ReceizTransportBindingInputV124): ReceizTransportBindingV124 {
  const record = closedRecord(input, [
    "kind", "method", "path", "requestDigest", "wireDigest", "receiptDigest", "applicationId", "audience", "issuerRootKid",
    "issuedAtKaiPulse", "issuedAtKaiUPulse", "expiresAtKaiUPulse", "revocationHead", "strongerTruth",
  ], "V124_TRANSPORT_BINDING_INVALID");
  const admittedKind = kind(record.kind);
  const time = validateTime({
    issuedAtKaiPulse: record.issuedAtKaiPulse,
    issuedAtKaiUPulse: record.issuedAtKaiUPulse,
    expiresAtKaiUPulse: record.expiresAtKaiUPulse,
  });
  return validateBinding(freeze({
    schema: RECEIZ_V124_TRANSPORT_BINDING_SCHEMA,
    domain: domainFor(admittedKind),
    issuerRootKid: kid(record.issuerRootKid),
    method: method(record.method),
    path: path(record.path),
    requestDigest: digest(record.requestDigest, "V124_TRANSPORT_REQUEST_INVALID"),
    wireDigest: digest(record.wireDigest, "V124_TRANSPORT_WIRE_INVALID"),
    receiptDigest: digest(record.receiptDigest, "V124_TRANSPORT_RECEIPT_INVALID"),
    applicationId: applicationId(record.applicationId, "V124_TRANSPORT_APPLICATION_INVALID"),
    audience: applicationId(record.audience, "V124_TRANSPORT_AUDIENCE_INVALID"),
    ...time,
    revocationHead: digest(record.revocationHead, "V124_TRANSPORT_REVOCATION_INVALID"),
    authority: freeze({
      bindingIsProofAuthority: false as const,
      bindingIsIdentityAuthority: false as const,
      bindingIsExecutionAuthority: false as const,
      bindingIsHeadAuthority: false as const,
      strongerTruth: strongerTruth(record.strongerTruth),
    }),
  })).binding;
}

export function canonicalizeReceizTransportBindingV124(value: unknown): string {
  return canonicalizeReceizV122(validateBinding(value).binding);
}

export function readReceizSignedTransportEnvelopeV124(
  value: unknown,
): ReceizSignedTransportEnvelopeV124 {
  const record = closedRecord(value, ["schema", "wire", "receipt", "transportBinding", "transportSignature"], "V124_TRANSPORT_ENVELOPE_INVALID");
  if (record.schema !== RECEIZ_V124_SIGNED_TRANSPORT_ENVELOPE_SCHEMA
    || record.wire === null
    || typeof record.wire !== "object"
    || Array.isArray(record.wire)) fail("V124_TRANSPORT_ENVELOPE_INVALID");
  let wire: unknown;
  let receipt: unknown;
  try {
    wire = freeze(structuredClone(record.wire));
    receipt = freeze(structuredClone(record.receipt));
  } catch {
    return fail("V124_TRANSPORT_ENVELOPE_INVALID");
  }
  return freeze({
    schema: RECEIZ_V124_SIGNED_TRANSPORT_ENVELOPE_SCHEMA,
    wire,
    receipt,
    transportBinding: validateBinding(record.transportBinding).binding,
    transportSignature: validateSignature(record.transportSignature),
  });
}

export async function digestReceizExecutionTransportRequestV124(
  input: ReceizExecutionTransportRequestInputV124,
): Promise<string> {
  const record = closedRecord(input, ["method", "path", "applicationId", "audience", "body"], "V124_TRANSPORT_REQUEST_INVALID");
  const app = applicationId(record.applicationId, "V124_TRANSPORT_APPLICATION_INVALID");
  const requestAudience = applicationId(record.audience, "V124_TRANSPORT_AUDIENCE_INVALID");
  let body: unknown;
  try { body = freeze(structuredClone(record.body)); } catch { return fail("V124_TRANSPORT_REQUEST_INVALID"); }
  return digestReceizCanonicalV122(freeze({
    schema: "receiz.v124.execution-transport-request.v1" as const,
    method: method(record.method),
    path: path(record.path),
    applicationId: app,
    audience: requestAudience,
    strongerTruth: "sealed-receiz-proof-object" as const,
    body,
  }));
}

function strictBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer;
}

function exactExpected(binding: ReceizTransportBindingV124, admittedKind: ReceizTransportBindingKindV124, expected: ReceizTransportBindingExpectationV124): void {
  const expectedRecord = closedRecord(expected, [
    "kind", "method", "path", "requestDigest", "wireDigest", "receiptDigest", "applicationId", "audience",
    "revocationHead", "revocationHeadAuthority", "strongerTruth",
  ], "V124_TRANSPORT_EXPECTATION_INVALID");
  const expectedKind = kind(expectedRecord.kind);
  if (expectedKind === "runtime") {
    if (expectedRecord.revocationHeadAuthority !== "authenticated-runtime-receipt"
      || binding.revocationHead !== digest(expectedRecord.revocationHead, "V124_TRANSPORT_EXPECTATION_INVALID")) {
      fail("V124_TRANSPORT_BINDING_MISMATCH");
    }
  } else if (expectedRecord.revocationHeadAuthority !== "transport-coordinate-only"
    || expectedRecord.revocationHead !== null) {
    fail("V124_TRANSPORT_EXPECTATION_INVALID");
  }
  if (admittedKind !== expectedKind
    || binding.method !== method(expectedRecord.method)
    || binding.path !== path(expectedRecord.path)
    || binding.requestDigest !== digest(expectedRecord.requestDigest, "V124_TRANSPORT_EXPECTATION_INVALID")
    || binding.wireDigest !== digest(expectedRecord.wireDigest, "V124_TRANSPORT_EXPECTATION_INVALID")
    || binding.receiptDigest !== digest(expectedRecord.receiptDigest, "V124_TRANSPORT_EXPECTATION_INVALID")
    || binding.applicationId !== applicationId(expectedRecord.applicationId, "V124_TRANSPORT_EXPECTATION_INVALID")
    || binding.audience !== applicationId(expectedRecord.audience, "V124_TRANSPORT_EXPECTATION_INVALID")
    || binding.authority.strongerTruth !== strongerTruth(expectedRecord.strongerTruth)) fail("V124_TRANSPORT_BINDING_MISMATCH");
}

function rootAtPulse(root: ReceizSignatureV4RootPublicKey, pulse: number): void {
  if (root.alg !== "Ed25519") fail("V124_TRANSPORT_ROOT_INVALID");
  try {
    const issued = BigInt(pulse);
    if (root.activeFromPulse !== undefined && issued < BigInt(root.activeFromPulse)) fail("V124_TRANSPORT_ROOT_INVALID");
    if (root.status === "retired" && root.retiredAtPulse === undefined) fail("V124_TRANSPORT_ROOT_INVALID");
    if (root.retiredAtPulse !== undefined && issued > BigInt(root.retiredAtPulse)) fail("V124_TRANSPORT_ROOT_INVALID");
  } catch (error) {
    if (error instanceof TypeError && error.message === "V124_TRANSPORT_ROOT_INVALID") throw error;
    fail("V124_TRANSPORT_ROOT_INVALID");
  }
}

async function verifyWithPinnedRoots(
  candidate: unknown,
  signatureCandidate: unknown,
  expected: ReceizTransportBindingExpectationV124,
): Promise<ReceizTransportBindingV124> {
  const roots = receizCurrentPinnedSignatureV4Roots();
  const decisionKai = receizKaiNow();
  const { binding, kind: admittedKind } = validateBinding(candidate);
  const signature = validateSignature(signatureCandidate);
  exactExpected(binding, admittedKind, expected);
  const decision = validateTime({
    issuedAtKaiPulse: decisionKai.pulse,
    issuedAtKaiUPulse: decisionKai.uPulse,
    expiresAtKaiUPulse: decisionKai.uPulse + 1,
  });
  if (decision.issuedAtKaiPulse !== decisionKai.pulse
    || binding.issuedAtKaiUPulse > decisionKai.uPulse
    || decisionKai.uPulse >= binding.expiresAtKaiUPulse) fail("V124_TRANSPORT_TIME_INVALID");
  if (signature.kid !== binding.issuerRootKid) fail("V124_TRANSPORT_ROOT_INVALID");
  const root = roots.get(binding.issuerRootKid);
  if (!root || root.kid !== binding.issuerRootKid) fail("V124_TRANSPORT_ROOT_INVALID");
  rootAtPulse(root, binding.issuedAtKaiPulse);
  let key: CryptoKey;
  try {
    const raw = receizBase64UrlDecode(root.publicKeyRawB64u);
    if (raw.byteLength !== 32 || receizBase64UrlEncode(raw) !== root.publicKeyRawB64u) fail("V124_TRANSPORT_ROOT_INVALID");
    key = await crypto.subtle.importKey("raw", strictBuffer(raw), { name: "Ed25519" }, false, ["verify"]);
  } catch {
    return fail("V124_TRANSPORT_ROOT_INVALID");
  }
  let verified = false;
  try {
    verified = await crypto.subtle.verify(
      "Ed25519",
      key,
      strictBuffer(receizBase64UrlDecode(signature.sig)),
      strictBuffer(new TextEncoder().encode(canonicalizeReceizV122(binding))),
    );
  } catch {
    verified = false;
  }
  if (!verified) fail("V124_TRANSPORT_SIGNATURE_INVALID");
  return binding;
}

export async function verifyReceizTransportBindingV124(
  candidate: unknown,
  signature: unknown,
  expected: ReceizTransportBindingExpectationV124,
): Promise<ReceizTransportBindingV124> {
  return verifyWithPinnedRoots(candidate, signature, expected);
}

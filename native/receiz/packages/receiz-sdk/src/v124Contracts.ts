import { receizBase64UrlDecode, receizBase64UrlEncode } from "./identity.js";
import { canonicalizeReceizV122, digestReceizCanonicalV122 } from "./v122Canonical.js";

const SHA256 = /^[0-9a-f]{64}$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;
// Registration has emitted rc_ + base64url(randomToken(18)) since its first
// implementation. This is syntax only; registered-client/proof admission is
// still required. Native slugs remain valid without changing any sealed ID.
export const RECEIZ_APPLICATION_ID_PATTERN = "^([a-z][a-z0-9.-]{0,127}|rc_[A-Za-z0-9_-]{24})$";
const APPLICATION_ID = new RegExp(RECEIZ_APPLICATION_ID_PATTERN);
const DOMAIN_ID = /^[a-z][a-z0-9:._/-]{0,255}$/;

export type ReceizOperationKindV124 = string;
export type ReceizOperationPlanV124 = Readonly<{ schema: "receiz.operation_plan.v124"; applicationId: string; domainId: string; operationKind: ReceizOperationKindV124; registryDigest: string; reducerDigest: string; exactPlanBytesB64u: string; exactPlanDigest: string; expectedParticipantHeads: Readonly<Record<string, string>>; semanticIdempotencyKey: string; attemptId: string; writesOnFailure: 0 }>;
export type ReceizExecutionStatusV124 = "staged" | "committed" | "zero-write" | "cancelled" | "unknown";
export type ReceizAuthoritySessionStatusV124 = "active" | "expired" | "revoked" | "closed";
export type ReceizQualificationStatusV124 = "available" | "degraded" | "unavailable";
export type ReceizRecipientResolutionStatusV124 = "resolved" | "not-found-or-not-authorized";
export type ReceizExecutionProjectionV124 = Readonly<{ status: ReceizExecutionStatusV124; executionId: string; planDigest: string; writesOnFailure: 0 }>;
export type ReceizAuthoritySessionProjectionV124 = Readonly<{ status: ReceizAuthoritySessionStatusV124; sessionHandle: string; applicationId: string; actorSubjectId: string }>;
export type ReceizQualificationProjectionV124 = Readonly<{ status: ReceizQualificationStatusV124; capability: string; reasonCode: string | null }>;
export type ReceizPublicRecipientProjectionV124 = Readonly<{ status: ReceizRecipientResolutionStatusV124; locator: string | null }>;

function fail(code: string): never { throw new TypeError(code); }
function isPlainRecord(value: unknown): value is Record<string, unknown> { if (value === null || typeof value !== "object" || Array.isArray(value)) return false; const prototype = Object.getPrototypeOf(value); return prototype === Object.prototype || prototype === null; }

export function closedRecord(value: unknown, expectedKeys: readonly string[], code: string): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.length !== expectedKeys.length || actual.some((key) => typeof key !== "string") || actual.some((key) => !expectedKeys.includes(key as string))) fail(code);
  const output: Record<string, unknown> = {};
  for (const key of expectedKeys) { const descriptor = descriptors[key]; if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail(code); output[key] = descriptor.value; }
  return output;
}
export function text(value: unknown, code: string): string { if (typeof value !== "string" || value.length === 0 || value.trim() !== value) fail(code); return value; }
export function digest(value: unknown, code: string): string { if (typeof value !== "string" || !SHA256.test(value)) fail(code); return value; }
export function isReceizApplicationId(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && value.trim() === value && APPLICATION_ID.test(value);
}
export function applicationId(value: unknown, code: string): string { if (!isReceizApplicationId(value)) fail(code); return value; }
export function domainId(value: unknown, code: string): string { if (typeof value !== "string" || !DOMAIN_ID.test(value)) fail(code); return value; }

export async function canonicalBytes(encoded: unknown, expectedDigest: unknown, code: string): Promise<Readonly<{ value: unknown; digest: string }>> {
  if (typeof encoded !== "string" || !BASE64URL.test(encoded)) fail(code);
  const expected = digest(expectedDigest, code);
  let bytes: Uint8Array;
  try { bytes = receizBase64UrlDecode(encoded); } catch { fail(code); }
  if (receizBase64UrlEncode(bytes) !== encoded) fail(code);
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { fail(code); }
  let canonical: Uint8Array;
  try { canonical = new TextEncoder().encode(canonicalizeReceizV122(value)); } catch { fail(code); }
  if (canonical.byteLength !== bytes.byteLength || canonical.some((byte, index) => byte !== bytes[index]) || await digestReceizCanonicalV122(value) !== expected) fail(code);
  return Object.freeze({ value, digest: expected });
}
export function exactBase64Url(encoded: unknown, code: string): Uint8Array { if (typeof encoded !== "string" || !BASE64URL.test(encoded)) fail(code); let bytes: Uint8Array; try { bytes = receizBase64UrlDecode(encoded); } catch { fail(code); } if (receizBase64UrlEncode(bytes) !== encoded) fail(code); return bytes; }
export function freeze<T>(value: T): T { if (value && typeof value === "object" && !Object.isFrozen(value)) { for (const key of Reflect.ownKeys(value)) { const descriptor = Object.getOwnPropertyDescriptor(value, key); if (descriptor && "value" in descriptor) freeze(descriptor.value); } Object.freeze(value); } return value; }

function participantHeads(value: unknown): Readonly<Record<string, string>> {
  if (!isPlainRecord(value)) fail("V124_OPERATION_PLAN_PARTICIPANTS_INVALID");
  const descriptors = Object.getOwnPropertyDescriptors(value); const keys = Reflect.ownKeys(descriptors);
  if (keys.length === 0 || keys.some((key) => typeof key !== "string")) fail("V124_OPERATION_PLAN_PARTICIPANTS_INVALID");
  const names = keys as string[];
  if (names.some((name, index) => index > 0 && names[index - 1]!.localeCompare(name) >= 0)) fail("V124_OPERATION_PLAN_PARTICIPANTS_NONCANONICAL");
  const output: Record<string, string> = {};
  for (const name of names) { const descriptor = descriptors[name]; if (!descriptor || !descriptor.enumerable || !("value" in descriptor)) fail("V124_OPERATION_PLAN_PARTICIPANTS_INVALID"); Object.defineProperty(output, text(name, "V124_OPERATION_PLAN_PARTICIPANTS_INVALID"), { value: digest(descriptor.value, "V124_OPERATION_PLAN_PARTICIPANTS_INVALID"), enumerable: true, writable: false, configurable: false }); }
  return freeze(output);
}

export async function validateReceizOperationPlanV124(value: unknown): Promise<ReceizOperationPlanV124> {
  const record = closedRecord(value, ["schema", "applicationId", "domainId", "operationKind", "registryDigest", "reducerDigest", "exactPlanBytesB64u", "exactPlanDigest", "expectedParticipantHeads", "semanticIdempotencyKey", "attemptId", "writesOnFailure"], "V124_OPERATION_PLAN_CLOSED_SHAPE_INVALID");
  if (record.schema !== "receiz.operation_plan.v124") fail("V124_OPERATION_PLAN_SCHEMA_INVALID");
  const exactPlan = await canonicalBytes(record.exactPlanBytesB64u, record.exactPlanDigest, "V124_OPERATION_PLAN_BYTES_INVALID");
  return freeze({ schema: "receiz.operation_plan.v124" as const, applicationId: applicationId(record.applicationId, "V124_OPERATION_PLAN_APPLICATION_INVALID"), domainId: domainId(record.domainId, "V124_OPERATION_PLAN_DOMAIN_INVALID"), operationKind: text(record.operationKind, "V124_OPERATION_PLAN_OPERATION_INVALID"), registryDigest: digest(record.registryDigest, "V124_OPERATION_PLAN_REGISTRY_DIGEST_INVALID"), reducerDigest: digest(record.reducerDigest, "V124_OPERATION_PLAN_REDUCER_DIGEST_INVALID"), exactPlanBytesB64u: record.exactPlanBytesB64u as string, exactPlanDigest: exactPlan.digest, expectedParticipantHeads: participantHeads(record.expectedParticipantHeads), semanticIdempotencyKey: text(record.semanticIdempotencyKey, "V124_OPERATION_PLAN_IDEMPOTENCY_INVALID"), attemptId: text(record.attemptId, "V124_OPERATION_PLAN_ATTEMPT_INVALID"), writesOnFailure: record.writesOnFailure === 0 ? 0 as const : fail("V124_OPERATION_PLAN_ZERO_WRITE_REQUIRED") });
}

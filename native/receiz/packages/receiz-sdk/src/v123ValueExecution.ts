import { digestReceizCanonicalV122 } from "./v122Canonical.js";
import { validateReceizProofAuthorityV123, type ReceizProofAuthorityV123 } from "./v123ProofAuthority.js";
import { validateReceizValueIntentV122, type ReceizValueRailV122, type ReceizWorldValueIntentV122 } from "./v122Value.js";

const HEAD = /^[0-9a-f]{64}$/;

export type ReceizValueExecutionReceiptV123 = Readonly<{
  schema: "receiz.value.execution-receipt.v123";
  executionId: string;
  rail: ReceizValueRailV122;
  valueIntentDigest: string;
  amountPhiMicro: string;
  sourcePriorHead: string;
  sourceHead: string;
  destinationPriorHead: string;
  destinationHead: string;
  authorityDigest: string;
  idempotencyKey: string;
  registryDigest: string;
  reducerDigest: string;
  acceptedAtKai: number;
  authority: Readonly<{ receiptIsProofAuthority: false; strongerTruth: "settlement-proof-object" | "reserve-proof-object" }>;
  receiptDigest: string;
}>;

export type ReceizValueProofReferenceV123 = Readonly<{
  schema: "receiz.value.proof-reference.v123";
  objectId: string;
  head: string;
  proofDigest: string;
}>;

export type ReceizValueExecutionOutcomeV123 =
  | Readonly<{ status: "committed"; rail: ReceizValueRailV122; intent: ReceizWorldValueIntentV122; receipt: ReceizValueExecutionReceiptV123; sourceHead: string; destinationHead: string; proofReferences: readonly ReceizValueProofReferenceV123[] }>
  | Readonly<{ status: "zero-write"; rail: ReceizValueRailV122; failure: Readonly<{ code: string; writesOnFailure: 0 }>; currentSourceHead: string | null; currentDestinationHead: string | null }>
  | Readonly<{ status: "unknown" }>;

type Request = <T>(path: string, options?: Readonly<{ method?: string; body?: Record<string, unknown>; bearerToken?: string }>) => Promise<T>;

function fail(): never { throw new TypeError("V123_VALUE_EXECUTION_OUTCOME_INVALID"); }
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }

export async function validateReceizValueExecutionOutcomeV123(value: unknown): Promise<ReceizValueExecutionOutcomeV123> {
  if (!record(value) || !["committed", "zero-write", "unknown"].includes(String(value.status))) fail();
  if (value.status === "unknown") return Object.freeze({ status: "unknown" });
  if (value.rail !== "settlement" && value.rail !== "reserve") fail();
  if (value.status === "zero-write") {
    if (!record(value.failure) || typeof value.failure.code !== "string" || value.failure.writesOnFailure !== 0
      || (value.currentSourceHead !== null && (typeof value.currentSourceHead !== "string" || !HEAD.test(value.currentSourceHead)))
      || (value.currentDestinationHead !== null && (typeof value.currentDestinationHead !== "string" || !HEAD.test(value.currentDestinationHead)))) fail();
    return value as unknown as ReceizValueExecutionOutcomeV123;
  }
  if (!record(value.intent) || !await validateReceizValueIntentV122(value.intent as unknown as ReceizWorldValueIntentV122)
    || value.intent.rail !== value.rail || !record(value.receipt) || !HEAD.test(String(value.sourceHead)) || !HEAD.test(String(value.destinationHead))
    || !Array.isArray(value.proofReferences)) fail();
  const receipt = value.receipt;
  if (receipt.schema !== "receiz.value.execution-receipt.v123" || receipt.rail !== value.rail
    || receipt.valueIntentDigest !== value.intent.valueIntentDigest || receipt.amountPhiMicro !== value.intent.amountPhiMicro
    || receipt.sourcePriorHead !== value.intent.sourceValueHead || receipt.destinationPriorHead !== value.intent.expectedDestinationHead
    || receipt.sourceHead !== value.sourceHead || receipt.destinationHead !== value.destinationHead
    || receipt.idempotencyKey !== value.intent.idempotencyKey || !HEAD.test(String(receipt.authorityDigest))
    || !HEAD.test(String(receipt.registryDigest)) || !HEAD.test(String(receipt.reducerDigest)) || !HEAD.test(String(receipt.receiptDigest))
    || !Number.isSafeInteger(receipt.acceptedAtKai) || !record(receipt.authority) || receipt.authority.receiptIsProofAuthority !== false
    || receipt.authority.strongerTruth !== `${value.rail}-proof-object`) fail();
  const { receiptDigest, ...receiptBasis } = receipt;
  if (await digestReceizCanonicalV122(receiptBasis) !== receiptDigest) fail();
  for (const reference of value.proofReferences) {
    if (!record(reference) || reference.schema !== "receiz.value.proof-reference.v123" || typeof reference.objectId !== "string"
      || !HEAD.test(String(reference.head)) || !HEAD.test(String(reference.proofDigest))) fail();
  }
  return value as unknown as ReceizValueExecutionOutcomeV123;
}

export function createReceizRemoteValueExecutionV123(request: Request) {
  const lookup = async (idempotencyKey: string, authority?: ReceizProofAuthorityV123): Promise<ReceizValueExecutionOutcomeV123> => {
    if (!idempotencyKey.trim() || idempotencyKey.length > 256) throw new TypeError("V123_VALUE_IDEMPOTENCY_KEY_INVALID");
    try {
      return await validateReceizValueExecutionOutcomeV123(await request<unknown>(`/api/sdk/v1/value/executions/by-idempotency/${encodeURIComponent(idempotencyKey)}`, authority ? { bearerToken: authority.accessToken } : undefined));
    } catch (error) {
      if (error instanceof TypeError) return Object.freeze({ status: "unknown" });
      throw error;
    }
  };
  const execute = async (rail: ReceizValueRailV122, intent: ReceizWorldValueIntentV122, authority: ReceizProofAuthorityV123): Promise<ReceizValueExecutionOutcomeV123> => {
    if (intent.rail !== rail) return Object.freeze({ status: "zero-write" as const, rail, failure: { code: "RAIL_MISMATCH", writesOnFailure: 0 as const }, currentSourceHead: intent.sourceValueHead, currentDestinationHead: intent.expectedDestinationHead });
    if (!await validateReceizValueIntentV122(intent)) throw new TypeError("V123_VALUE_INTENT_INVALID");
    if (!intent.idempotencyKey) throw new TypeError("V123_VALUE_IDEMPOTENCY_KEY_REQUIRED");
    const verifiedAuthority = await validateReceizProofAuthorityV123(authority);
    if (!verifiedAuthority.grantedScopes.includes(`receiz:${rail}.write`)) return Object.freeze({ status: "zero-write" as const, rail, failure: { code: "SCOPE_NOT_GRANTED", writesOnFailure: 0 as const }, currentSourceHead: intent.sourceValueHead, currentDestinationHead: intent.expectedDestinationHead });
    try {
      return await validateReceizValueExecutionOutcomeV123(await request<unknown>(`/api/sdk/v1/value/${rail}/execute`, {
        method: "POST", bearerToken: verifiedAuthority.accessToken,
        body: { intent: intent as unknown as Record<string, unknown>, authority: { authorityDigest: verifiedAuthority.authorityDigest, applicationId: verifiedAuthority.applicationId, keyId: verifiedAuthority.keyId, artifactDigest: verifiedAuthority.artifactDigest, revocationHead: verifiedAuthority.revocationHead } },
      }));
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      return lookup(intent.idempotencyKey, verifiedAuthority);
    }
  };
  return Object.freeze({
    executeSettlement: (intent: ReceizWorldValueIntentV122, authority: ReceizProofAuthorityV123) => execute("settlement", intent, authority),
    executeReserve: (intent: ReceizWorldValueIntentV122, authority: ReceizProofAuthorityV123) => execute("reserve", intent, authority),
    executionByIdempotencyKey: lookup,
  });
}

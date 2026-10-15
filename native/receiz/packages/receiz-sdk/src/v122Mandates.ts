import { digestReceizCanonicalV122 } from "./v122Canonical.js";

export type ReceizSubjectMandateV122 = Readonly<{
  schema: "receiz.subject-mandate.v122";
  mandateId: string;
  ownerSubjectId: string;
  workerSubjectId: string;
  allowedCommandKinds: readonly string[];
  worldIds: readonly string[];
  regionIds: readonly string[];
  maximumResourcePhiMicro: string;
  maximumGeometryUnits: string;
  expiresAtKai: string;
  nonce: string;
  expectedOwnerHead: string;
  expectedWorkerHead: string;
  revocationHead: string;
  mandateDigest: string;
}>;

export async function createReceizSubjectMandateV122(input: Omit<ReceizSubjectMandateV122, "schema" | "mandateId" | "mandateDigest">): Promise<ReceizSubjectMandateV122> {
  const normalized = { ...input, allowedCommandKinds: [...new Set(input.allowedCommandKinds)].sort(), worldIds: [...new Set(input.worldIds)].sort(), regionIds: [...new Set(input.regionIds)].sort() };
  const identity = await digestReceizCanonicalV122({ schema: "receiz.subject-mandate.identity.v122", ownerSubjectId: input.ownerSubjectId, workerSubjectId: input.workerSubjectId, nonce: input.nonce });
  const basis = { schema: "receiz.subject-mandate.v122" as const, mandateId: `receiz:mandate:${identity}`, ...normalized };
  return Object.freeze({ ...basis, mandateDigest: await digestReceizCanonicalV122(basis) });
}

export async function validateReceizMandateUseV122(input: Readonly<{
  mandate: ReceizSubjectMandateV122;
  commandKind: string;
  worldId?: string;
  regionId?: string;
  resourcePhiMicro: string;
  geometryUnits: string;
  currentKai: string;
  ownerHead: string;
  workerHead: string;
  revocationHead: string;
}>): Promise<Readonly<{ ok: true; mandateDigest: string }> | Readonly<{ ok: false; code: string; writesOnFailure: 0 }>> {
  const { mandateDigest, ...basis } = input.mandate;
  const invalid = (code: string) => ({ ok: false as const, code, writesOnFailure: 0 as const });
  if (await digestReceizCanonicalV122(basis) !== mandateDigest) return invalid("mandate_digest_mismatch");
  if (input.ownerHead !== input.mandate.expectedOwnerHead || input.workerHead !== input.mandate.expectedWorkerHead) return invalid("mandate_subject_head_mismatch");
  if (input.revocationHead !== input.mandate.revocationHead) return invalid("mandate_revoked_or_stale");
  if (BigInt(input.currentKai) > BigInt(input.mandate.expiresAtKai)) return invalid("mandate_expired");
  if (!input.mandate.allowedCommandKinds.includes(input.commandKind)) return invalid("mandate_command_out_of_scope");
  if (input.worldId && !input.mandate.worldIds.includes(input.worldId)) return invalid("mandate_world_out_of_scope");
  if (input.regionId && !input.mandate.regionIds.includes(input.regionId)) return invalid("mandate_region_out_of_scope");
  if (BigInt(input.resourcePhiMicro) > BigInt(input.mandate.maximumResourcePhiMicro) || BigInt(input.geometryUnits) > BigInt(input.mandate.maximumGeometryUnits)) return invalid("mandate_limit_exceeded");
  return { ok: true, mandateDigest };
}

export function createReceizRemoteSubjectMandatesV122(request: <T>(path: string, options?: { method?: string; body?: Record<string, unknown> }) => Promise<T>) {
  return Object.freeze({
    issue: (input: Readonly<Record<string, unknown>>) => request("/api/sdk/v1/subject-mandates/issue", { method: "POST", body: input as Record<string, unknown> }),
    state: (input: Readonly<{ mandateId: string }>) => request(`/api/sdk/v1/subject-mandates/${encodeURIComponent(input.mandateId)}`),
    revoke: (input: Readonly<Record<string, unknown>> & { mandateId: string }) => request(`/api/sdk/v1/subject-mandates/${encodeURIComponent(input.mandateId)}/revoke`, { method: "POST", body: input as Record<string, unknown> }),
  });
}

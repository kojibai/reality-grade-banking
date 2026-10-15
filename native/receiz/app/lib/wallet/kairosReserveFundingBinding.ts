"use client";

import {
  createReceizArtifactAdmissionEngine,
} from "../../../packages/receiz-sdk/src/artifactAdmission";
import type { ReceizVerifiedArtifactAdmission } from "../../../packages/receiz-sdk/src/artifactAdmissionTypes";
import {
  extractReceizPortableAssetPayload,
  parseReceizPortableAssetDocument,
} from "../../../packages/receiz-sdk/src/portableAsset";
import {
  deriveReceizOfflineReserveFundingOwnerId,
  verifyReceizOfflineReserveFundingBinding,
  type ReceizOfflineReserveFundingBindingV1,
} from "../../../packages/receiz-sdk/src/offlineReserveFundingBinding";
import { verifyReceizArtifact } from "../../../packages/receiz-sdk/src/index";

const evidenceCustody = new WeakSet<object>();

export type KairosVerifiedOfflineReserveFundingEvidence = Readonly<{
  schema: "receiz.verified-offline-reserve-funding-evidence.v1";
  artifactSha256: string;
  payloadSha256: string;
  funding: ReceizOfflineReserveFundingBindingV1;
}>;

export function isRuntimeCustodiedKairosVerifiedOfflineReserveFundingEvidence(
  value: unknown,
): value is KairosVerifiedOfflineReserveFundingEvidence {
  return Boolean(value && typeof value === "object" && evidenceCustody.has(value));
}

export async function verifyKairosOfflineReserveFundingArtifactAdmission(
  admissionInput: ReceizVerifiedArtifactAdmission,
): Promise<KairosVerifiedOfflineReserveFundingEvidence> {
  const admission = admissionInput;
  if (admission.profile !== "portable-state") {
    throw new Error("OFFLINE_RESERVE_CANONICAL_FUNDING_PROOF_REQUIRED");
  }
  const document = await parseReceizPortableAssetDocument(admission.recoveredState);
  if (document.assetType !== "reserve_funding"
    || document.settlement.state !== "funded_reserve_binding"
    || document.ownership.proofRef !== "genesis") {
    throw new Error("OFFLINE_RESERVE_CANONICAL_FUNDING_PROOF_REQUIRED");
  }
  const payload = await extractReceizPortableAssetPayload(document);
  if (payload.mimeType !== "application/json") {
    throw new Error("OFFLINE_RESERVE_CANONICAL_FUNDING_PROOF_REQUIRED");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload.bytes));
  } catch {
    throw new Error("OFFLINE_RESERVE_CANONICAL_FUNDING_PROOF_REQUIRED");
  }
  const funding = await verifyReceizOfflineReserveFundingBinding(decoded);
  if (document.ownership.ownerReceizId !== deriveReceizOfflineReserveFundingOwnerId(funding)
    || document.provenance.root !== `receiz.reserve-funding:${funding.externalFundingEventId}`) {
    throw new Error("OFFLINE_RESERVE_CANONICAL_FUNDING_PROOF_REQUIRED");
  }
  const evidence = Object.freeze({
    schema: "receiz.verified-offline-reserve-funding-evidence.v1" as const,
    artifactSha256: admission.artifactSha256,
    payloadSha256: admission.payloadSha256,
    funding,
  });
  evidenceCustody.add(evidence);
  return evidence;
}

export async function verifyKairosOfflineReserveFundingArtifactBytes(
  artifactBytes: Uint8Array,
): Promise<KairosVerifiedOfflineReserveFundingEvidence> {
  const verification = await verifyReceizArtifact(artifactBytes);
  const admission = await createReceizArtifactAdmissionEngine()(verification, {
    profile: "portable-state",
  });
  if ("code" in admission || admission.profile !== "portable-state") {
    throw new Error("OFFLINE_RESERVE_CANONICAL_FUNDING_PROOF_REQUIRED");
  }
  return verifyKairosOfflineReserveFundingArtifactAdmission(
    admission as ReceizVerifiedArtifactAdmission,
  );
}

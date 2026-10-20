"use client";

import {
  attachReceizPortableProofHistoryBytes,
  createReceizArtifactAdmissionEngine,
  createReceizPortableAssetDocument,
  planReceizArtifactRecovery,
  serializeReceizPortableAssetDocument,
  verifyReceizArtifact,
  type ReceizArtifactAdmissionResult,
  type ReceizVerifiedPortableStateAdmission,
} from "../../../../packages/receiz-sdk/src/index";
import { sha256ReceizBytes } from "../../../../packages/receiz-sdk/src/artifacts";
import { receizeDocumentBytesClient } from "@/app/lib/documentSeal/receizeDocumentBytesClient";
import { encodeProfileOriginalRouteProjection } from "./routeProjectionEncoding";

export type ComposerProfileOriginalChildSealer = (input: Readonly<{
  payloadBytes: Uint8Array;
  ownerReceizId: string;
  recordId: string;
  filename: string;
  mimeType: "application/json";
}>) => Promise<Blob>;

export type ComposerProfileOriginalChildAdmitter = (input: Readonly<{
  artifact: Blob;
  ownerReceizId: string;
}>) => Promise<ReceizArtifactAdmissionResult>;

async function defaultSeal(
  input: Parameters<ComposerProfileOriginalChildSealer>[0],
): Promise<Blob> {
  const sealed = await receizeDocumentBytesClient({
    fileBytes: input.payloadBytes,
    filename: input.filename,
    mime: input.mimeType,
    options: {
      forceBundleEnvelope: true,
      nativeRecordSeal: {
        ownerReceizId: input.ownerReceizId,
        recordId: input.recordId,
      },
    },
  });
  const mimeType = sealed.kind === "bundle"
    ? "application/vnd.receiz.bundle+json"
    : "application/octet-stream";
  return new File([sealed.artifactBytes.slice()], sealed.downloadName, { type: mimeType });
}

async function defaultAdmit(
  input: Parameters<ComposerProfileOriginalChildAdmitter>[0],
): Promise<ReceizArtifactAdmissionResult> {
  const verification = await verifyReceizArtifact(input.artifact);
  return createReceizArtifactAdmissionEngine()(verification, {
    profile: "portable-state",
    ownerConstraint: input.ownerReceizId,
  });
}

async function requirePortableAdmission(
  candidate: ReceizArtifactAdmissionResult,
  ownerReceizId: string,
): Promise<ReceizVerifiedPortableStateAdmission> {
  if (candidate.verdict === "invalid" || candidate.verdict === "profile-denied") {
    throw new TypeError(
      `PROFILE_ORIGINAL_CHILD_ADMISSION_REQUIRED:${candidate.explanation.summaryCode}`,
    );
  }
  if (
    candidate.profile !== "portable-state"
    || candidate.verdict !== "bearer-recovery"
    || candidate.ownerReceizId !== ownerReceizId
    || candidate.openedArtifact.legacyCompatibility !== "current-native"
  ) {
    const detail = candidate.profile !== "portable-state"
      ? `PROFILE_${candidate.profile}`
      : candidate.verdict !== "bearer-recovery"
        ? `VERDICT_${candidate.verdict}`
        : candidate.ownerReceizId !== ownerReceizId
            ? "OWNER_MISMATCH"
            : "NATIVE_RECORD_REQUIRED";
    throw new TypeError(`PROFILE_ORIGINAL_CHILD_ADMISSION_REQUIRED:${detail}`);
  }
  return candidate;
}

/**
 * Seals the already-rendered Receiz artifact as the payload of its independent
 * profile-original proof object, then seals the proof-history-bearing state.
 * The locally verified sealed proof object—not an SDK reauthorization, hash,
 * row, receipt, or UI object—is the child accepted by showcase composition.
 */
export async function sealAndAdmitComposerProfileOriginalChild(input: Readonly<{
  renderedSealedBytes: Uint8Array;
  renderedMimeType: string;
  ownerReceizId: string;
  immutableVersion: string;
  routeProjection: Readonly<Record<string, unknown>>;
  seal?: ComposerProfileOriginalChildSealer;
  admit?: ComposerProfileOriginalChildAdmitter;
}>): Promise<ReceizVerifiedPortableStateAdmission> {
  if (
    !(input.renderedSealedBytes instanceof Uint8Array)
    || input.renderedSealedBytes.byteLength === 0
    || !input.renderedMimeType.trim()
    || !input.ownerReceizId.trim()
    || !/^(0|[1-9][0-9]*)$/.test(input.immutableVersion)
    || !input.routeProjection
    || typeof input.routeProjection.id !== "string"
    || typeof input.routeProjection.slug !== "string"
    || typeof input.routeProjection.code !== "string"
  ) {
    throw new TypeError("PROFILE_ORIGINAL_CHILD_INPUT_INVALID");
  }
  const seal = input.seal ?? defaultSeal;
  const admit = input.admit ?? defaultAdmit;
  const contentDigest = await sha256ReceizBytes(input.renderedSealedBytes);
  const routeProjectionJson = encodeProfileOriginalRouteProjection(
    input.routeProjection,
  );
  const portable = await createReceizPortableAssetDocument({
    assetType: "profile_original",
    payload: {
      mimeType: input.renderedMimeType,
      bytes: input.renderedSealedBytes.slice(),
    },
    ownership: {
      ownerReceizId: input.ownerReceizId,
      custody: "bearer",
      proofRef: "genesis",
    },
    provenance: {
      root: `profile-original:${contentDigest}`,
      appends: [{
        type: "profile-original.immutable-version",
        immutableVersion: input.immutableVersion,
        contentDigest,
      }, {
        type: "receiz.profile-original-render.v1",
        projectionJson: routeProjectionJson,
        renderedArtifactSha256: contentDigest,
      }],
    },
    settlement: { state: "unsettled" },
  });
  const seedBytes = serializeReceizPortableAssetDocument(portable);
  const filename = `profile-original-${contentDigest}.json`;
  const seedArtifact = await seal({
    payloadBytes: seedBytes,
    ownerReceizId: input.ownerReceizId,
    recordId: `profile-original:${contentDigest}:genesis`,
    filename,
    mimeType: "application/json",
  });
  const seedAdmission = await requirePortableAdmission(
    await admit({ artifact: seedArtifact, ownerReceizId: input.ownerReceizId }),
    input.ownerReceizId,
  );
  const recovery = await planReceizArtifactRecovery(seedAdmission);
  if (!recovery || "code" in recovery) {
    throw new TypeError("PROFILE_ORIGINAL_CHILD_HISTORY_REQUIRED");
  }
  const carriedBytes = await attachReceizPortableProofHistoryBytes(
    seedBytes,
    recovery.proofHistory,
  );
  const carriedArtifact = await seal({
    payloadBytes: carriedBytes,
    ownerReceizId: input.ownerReceizId,
    recordId: `profile-original:${contentDigest}:history`,
    filename,
    mimeType: "application/json",
  });
  const admitted = await requirePortableAdmission(
    await admit({ artifact: carriedArtifact, ownerReceizId: input.ownerReceizId }),
    input.ownerReceizId,
  );
  if (
    admitted.artifactId !== contentDigest
    || admitted.proofHistory === null
    || admitted.recoveredState["schema"] !== "receiz.portable_asset.v1"
  ) {
    throw new TypeError("PROFILE_ORIGINAL_CHILD_HISTORY_REQUIRED");
  }
  return admitted;
}

"use client";

import {
  createReceizArtifactAdmissionEngine,
  deriveReceizVerifiedProofHistoryFromAdmission,
  verifyReceizArtifact,
} from "../../../packages/receiz-sdk/src/index";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../packages/receiz-sdk/src/artifactVerification";
import {
  attachReceizPortableProofHistory,
  createReceizPortableAssetDocument,
  deriveReceizPortableOwnershipContinuity,
  extractReceizPortableAssetPayload,
  parseReceizPortableAssetDocument,
  serializeReceizPortableAssetDocument,
  type PortableJson,
} from "../../../packages/receiz-sdk/src/portableAsset";
import {
  deriveKairosNoteCustodyOwnerId,
  verifyKairosNoteReceivingCustody,
} from "@/app/lib/wallet/kairosNoteCustodyVerification";
import type { ReceizSignatureV4RootPublicKey } from "../../../packages/receiz-sdk/src/verifier/signatureV4";
import { receizeDocumentBytesClient } from "@/app/lib/documentSeal/receizeDocumentBytesClient";
import {
  buildKairosWalletNotePacket,
  buildKairosWalletNoteSvg,
  embedKairosWalletNotePacketInPng,
  type BuildKairosWalletNoteArgs,
  type KairosNoteReceivingCustodyCommitment,
  type KairosWalletNotePacket,
} from "@/app/lib/wallet/kairosNoteArtifact";
import { readPngTextChunk } from "@/app/utils/pngChunks";
import { sha256Hex } from "@/app/utils/sha256";

type SealDocument = typeof receizeDocumentBytesClient;

async function renderExactNoteSvg(svg: string): Promise<Uint8Array> {
  if (typeof document === "undefined") {
    throw new Error("KAIROS_NOTE_CLIENT_RASTER_UNAVAILABLE");
  }
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("KAIROS_NOTE_CLIENT_RASTER_FAILED"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1440;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("KAIROS_NOTE_CLIENT_RASTER_FAILED");
    context.drawImage(image, 0, 0, 2400, 1440);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (value) => value ? resolve(value) : reject(new Error("KAIROS_NOTE_CLIENT_RASTER_FAILED")),
      "image/png",
    ));
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pngDimensions(bytes: Uint8Array): Readonly<{ width: number; height: number }> {
  if (bytes.byteLength < 24
    || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
    throw new Error("KAIROS_NOTE_PNG_REQUIRED");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return Object.freeze({ width: view.getUint32(16, false), height: view.getUint32(20, false) });
}

async function admit(
  bytes: Uint8Array,
  owner: string,
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
) {
  const verification = roots
    ? await verifyReceizArtifactWithCanonicalRoots(bytes, roots)
    : await verifyReceizArtifact(bytes);
  const admission = await createReceizArtifactAdmissionEngine({ canonicalSignatureV4RootPublicKeys: roots })(
    verification,
    { profile: "portable-state", ownerConstraint: owner },
  );
  if ("code" in admission || admission.profile !== "portable-state") {
    throw new Error("KAIROS_NOTE_CANONICAL_ADMISSION_REQUIRED");
  }
  return admission;
}

export type KairosNoteQualifiedGenesisClientInput = Omit<BuildKairosWalletNoteArgs, "receivingSeal" | "mintedKaiUpulse"> & Readonly<{
  receivingCustody: KairosNoteReceivingCustodyCommitment;
  admissionRootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>;

export async function prepareKairosNoteQualifiedGenesisClient(
  input: KairosNoteQualifiedGenesisClientInput,
  options: Readonly<{
    sealDocument?: SealDocument;
    rasterizeSvg?: (svg: string) => Promise<Uint8Array>;
  }> = {},
) {
  const roots = input.admissionRootPublicKeys;
  const custody = await verifyKairosNoteReceivingCustody(input.receivingCustody, { roots });
  const owner = await deriveKairosNoteCustodyOwnerId(custody, { roots });
  const embeddedPacket = buildKairosWalletNotePacket({
    ...input,
    receivingCustody: custody,
    mintedKaiUpulse: input.acceptedAtKai ?? "",
  });
  const payloadBytes = embedKairosWalletNotePacketInPng(
    await (options.rasterizeSvg ?? renderExactNoteSvg)(buildKairosWalletNoteSvg(embeddedPacket)),
    embeddedPacket,
  );
  const payloadPacket = JSON.parse(readPngTextChunk(payloadBytes, "kairos_note_packet_v2") ?? "null") as KairosWalletNotePacket;
  if (JSON.stringify(payloadPacket) !== JSON.stringify(embeddedPacket)) throw new Error("KAIROS_NOTE_PACKET_MISMATCH");
  const portable = await createReceizPortableAssetDocument({
    assetType: "wallet_note",
    payload: { mimeType: "image/png", bytes: payloadBytes },
    ownership: {
      ownerReceizId: owner,
      custody: `receiz.offline-note.qualified:${custody.receivingCustodyCommitmentDigest}`,
      proofRef: "genesis",
    },
    provenance: { root: `receiz.wallet-note:${input.noteId}`, appends: [] },
    settlement: {
      state: "held_bound",
      noteId: input.noteId,
      wholeValuePhiMicro: input.amountPhiMicro.toString(),
      acceptedAtKai: input.acceptedAtKai ?? "",
      transitionNonce: input.transitionNonce ?? "",
      holderCustodyCommitmentDigest: custody.receivingCustodyCommitmentDigest,
      holderInstallationCommitment: custody.installationCommitment,
      irreversibleConsumptionReceiptDigest: null,
      packet: structuredClone(embeddedPacket) as unknown as PortableJson,
    },
  });
  const continuity = await deriveReceizPortableOwnershipContinuity(portable);
  const packet: KairosWalletNotePacket = Object.freeze({ ...embeddedPacket, proofArtifactId: continuity.artifactId });
  const document = await parseReceizPortableAssetDocument({
    ...portable,
    settlement: { ...portable.settlement, packet: structuredClone(packet) as unknown as PortableJson },
  });
  const seal = options.sealDocument ?? receizeDocumentBytesClient;
  const filename = `settlement-note-${input.noteId.slice(0, 8)}.receiz.json`;
  const first = await seal({
    fileBytes: serializeReceizPortableAssetDocument(document), filename, mime: "application/json",
    options: { nativeRecordSeal: { ownerReceizId: owner, recordId: input.noteId, ownershipContinuity: continuity } },
  });
  const firstAdmission = await admit(first.artifactBytes, owner, input.admissionRootPublicKeys);
  const carried = await attachReceizPortableProofHistory(
    document,
    await deriveReceizVerifiedProofHistoryFromAdmission(firstAdmission),
  );
  const finalContinuity = await deriveReceizPortableOwnershipContinuity(carried);
  const final = await seal({
    fileBytes: serializeReceizPortableAssetDocument(carried), filename, mime: "application/json",
    options: { nativeRecordSeal: { ownerReceizId: owner, recordId: input.noteId, ownershipContinuity: finalContinuity } },
  });
  const finalAdmission = await admit(final.artifactBytes, owner, input.admissionRootPublicKeys);
  if (finalAdmission.verdict === "profile-denied"
    || finalAdmission.proofHistory?.artifactId !== finalContinuity.artifactId) {
    throw new Error("KAIROS_NOTE_CARRIED_HISTORY_REQUIRED");
  }
  const finalDocument = await parseReceizPortableAssetDocument(finalAdmission.recoveredState);
  const extracted = await extractReceizPortableAssetPayload(finalDocument);
  const finalPacket = JSON.parse(readPngTextChunk(extracted.bytes, "kairos_note_packet_v2") ?? "null") as KairosWalletNotePacket;
  if (JSON.stringify(finalPacket) !== JSON.stringify(embeddedPacket)) throw new Error("KAIROS_NOTE_QUALIFIED_GENESIS_INVALID");
  return Object.freeze({
    packet,
    artifactBytes: final.artifactBytes.slice(),
    artifactSha256: await sha256Hex(final.artifactBytes),
    filename: final.downloadName,
    payloadBytes: extracted.bytes.slice(),
    payloadMime: finalDocument.payload.mimeType,
    payloadDimensions: pngDimensions(extracted.bytes),
    payloadPacket: finalPacket,
  });
}

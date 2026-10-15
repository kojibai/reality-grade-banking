import {
  createReceizArtifactAdmissionEngine,
  verifyReceizArtifact,
} from "../../../packages/receiz-sdk/src/index";
import { verifyReceizArtifactWithCanonicalRoots } from "../../../packages/receiz-sdk/src/artifactVerification";
import type { ReceizSignatureV4RootPublicKey } from "../../../packages/receiz-sdk/src/verifier/signatureV4";
import { verifyAndExtractReceizDocumentBytesLocal } from "../../../packages/receiz-sdk/src/verifier/canonical";
import {
  attachReceizPortableProofHistory,
  deriveReceizPortableOwnershipContinuity,
  parseReceizPortableAssetDocument,
  serializeReceizPortableAssetDocument,
  type PortableJson,
  type ReceizPortableAssetDocument,
} from "../../../packages/receiz-sdk/src/portableAsset";
import { prepareNativeProofObjectSeal } from "@/app/lib/documentSeal/prepareNativeProofObjectSeal";
import { receizeDocumentBytesClient } from "@/app/lib/documentSeal/receizeDocumentBytesClient";
import type {
  KairosNoteCanonicalCarrier,
  KairosNoteLocalPacket,
  KairosNoteOpenedCarrier,
} from "@/app/lib/wallet/kairosNoteLocalTransition";
import {
  deriveKairosNoteCustodyOwnerId,
  verifyKairosNoteReceivingCustody,
} from "./kairosNoteCustodyVerification";
import { verifyReceizOfflineNoteWebAuthnConsumptionReceipt } from "../../../packages/receiz-sdk/src/offlineNoteWebAuthnCustody";

const SHA256_RE = /^[0-9a-f]{64}$/;
const KAI_RE = /^(0|[1-9][0-9]*)$/;

type OpenedPortable = Readonly<{
  document: ReceizPortableAssetDocument;
  artifactBytes: Uint8Array;
  filename: string;
  mimeType: string;
}>;

async function packetFromDocument(
  document: ReceizPortableAssetDocument,
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>,
): Promise<KairosNoteLocalPacket> {
  const packet = document.settlement.packet;
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new Error("KAIROS_NOTE_PACKET_INVALID");
  }
  const candidate = packet as unknown as KairosNoteLocalPacket;
  if (candidate.kind !== "kairos_note_packet_v2"
    || candidate.noteState !== "held_bound"
    || !candidate.noteId.trim()
    || candidate.proofArtifactId !== document.payload.sha256
    || !KAI_RE.test(candidate.wholeValuePhiMicro)
    || BigInt(candidate.wholeValuePhiMicro) <= 0n
    || candidate.currentHolderReceizId !== document.ownership.ownerReceizId
    || !KAI_RE.test(candidate.acceptedAtKai)
    || !candidate.transitionNonce.trim()
    || document.settlement.state !== "held_bound"
    || document.settlement.noteId !== candidate.noteId
    || document.settlement.wholeValuePhiMicro !== candidate.wholeValuePhiMicro) {
    throw new Error("KAIROS_NOTE_PACKET_INVALID");
  }
  if (candidate.custodyMode === "qualified-anonymous") {
    const custody = await verifyKairosNoteReceivingCustody(candidate.currentCustody, { roots });
    if (candidate.currentHolderReceizId !== await deriveKairosNoteCustodyOwnerId(custody, { roots })
      || document.settlement.holderCustodyCommitmentDigest !== custody.receivingCustodyCommitmentDigest
      || document.settlement.holderInstallationCommitment !== custody.installationCommitment) {
      throw new Error("KAIROS_NOTE_PACKET_INVALID");
    }
    if (candidate.irreversibleConsumptionReceipt) {
      const receipt = await verifyReceizOfflineNoteWebAuthnConsumptionReceipt(
        candidate.irreversibleConsumptionReceipt,
      );
      if (receipt.receiverCustodyCommitmentDigest !== custody.receivingCustodyCommitmentDigest
        || receipt.predecessorArtifactSha256 !== candidate.predecessorArtifactSha256
        || receipt.noteId !== candidate.noteId
        || receipt.wholeValuePhiMicro !== candidate.wholeValuePhiMicro
        || receipt.acceptedAtKai !== candidate.acceptedAtKai) {
        throw new Error("KAIROS_NOTE_PACKET_INVALID");
      }
    } else if (candidate.predecessorArtifactSha256 !== null) {
      throw new Error("KAIROS_NOTE_PACKET_INVALID");
    }
    return Object.freeze(structuredClone(candidate));
  }
  if (!SHA256_RE.test(candidate.holderIdentityArtifactSha256)
    || !SHA256_RE.test(candidate.holderDestinationDigest)
    || !SHA256_RE.test(candidate.holderReceivingSealDigest)
    || !SHA256_RE.test(candidate.holderInstallationCommitment)
    || !SHA256_RE.test(candidate.holderIdentityKeyId)
    || document.settlement.holderReceivingSealDigest !== candidate.holderReceivingSealDigest) {
    throw new Error("KAIROS_NOTE_PACKET_INVALID");
  }
  return Object.freeze(structuredClone(candidate));
}

function packetJson(packet: KairosNoteLocalPacket): PortableJson {
  return structuredClone(packet) as unknown as PortableJson;
}

export function createKairosNotePortableCarrier(options: Readonly<{
  canonicalSignatureV4RootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  sealDocument?: typeof receizeDocumentBytesClient;
}> = {}): KairosNoteCanonicalCarrier {
  const opened = new Map<string, OpenedPortable>();

  const open = async (artifactBytesInput: Uint8Array): Promise<KairosNoteOpenedCarrier> => {
    const artifactBytes = artifactBytesInput.slice();
    const verification = options.canonicalSignatureV4RootPublicKeys
      ? await verifyReceizArtifactWithCanonicalRoots(
          artifactBytes,
          options.canonicalSignatureV4RootPublicKeys,
        )
      : await verifyReceizArtifact(artifactBytes);
    const admission = await createReceizArtifactAdmissionEngine({
      canonicalSignatureV4RootPublicKeys: options.canonicalSignatureV4RootPublicKeys,
    })(verification, {
      profile: "portable-state",
    });
    if (admission.verdict === "profile-denied"
      || "code" in admission
      || admission.profile !== "portable-state"
      || !admission.proofHistory) {
      throw new Error("KAIROS_NOTE_CANONICAL_ADMISSION_REQUIRED");
    }
    const document = await parseReceizPortableAssetDocument(admission.recoveredState);
    if (document.assetType !== "wallet_note"
      || admission.artifactId !== document.payload.sha256
      || admission.ownerReceizId !== document.ownership.ownerReceizId
      || admission.proofHistory.artifactId !== document.payload.sha256) {
      throw new Error("KAIROS_NOTE_CANONICAL_ADMISSION_REQUIRED");
    }
    const result: KairosNoteOpenedCarrier = Object.freeze({
      artifactBytes,
      artifactSha256: admission.artifactSha256,
      packet: await packetFromDocument(document, options.canonicalSignatureV4RootPublicKeys),
      history: admission.proofHistory,
    });
    opened.set(result.artifactSha256, Object.freeze({
      document,
      artifactBytes: artifactBytes.slice(),
      filename: admission.openedArtifact.sealedArtifact.filename,
      mimeType: admission.openedArtifact.sealedArtifact.mimeType,
    }));
    return result;
  };

  return Object.freeze({
    open,

    async reseal({ packet, history }): Promise<Uint8Array> {
      const predecessorSha256 = packet.predecessorArtifactSha256;
      if (!predecessorSha256 || !SHA256_RE.test(predecessorSha256)) {
        throw new Error("KAIROS_NOTE_PREDECESSOR_REQUIRED");
      }
      const predecessor = opened.get(predecessorSha256);
      if (!predecessor) throw new Error("KAIROS_NOTE_PREDECESSOR_NOT_OPENED");
      const prepared = await prepareNativeProofObjectSeal({
        fileBytes: predecessor.artifactBytes.slice(),
        filename: predecessor.filename,
        mime: predecessor.mimeType,
        ownerReceizId: packet.currentHolderReceizId,
        openVerifiedArtifact: options.canonicalSignatureV4RootPublicKeys
          ? (verifiedInput) => verifyAndExtractReceizDocumentBytesLocal({
              ...verifiedInput,
              signatureV4RootPublicKeys: options.canonicalSignatureV4RootPublicKeys,
            })
          : undefined,
      });
      if (!prepared.nativeRecordSeal?.ownershipContinuity) {
        throw new Error("KAIROS_NOTE_NATIVE_OWNERSHIP_APPEND_REQUIRED");
      }
      const transferred = await parseReceizPortableAssetDocument(
        JSON.parse(new TextDecoder().decode(prepared.fileBytes)) as unknown,
      );
      const updated = await parseReceizPortableAssetDocument({
        ...transferred,
        ownership: {
          ...transferred.ownership,
          custody: packet.custodyMode === "qualified-anonymous"
            ? `receiz.offline-note.qualified:${packet.currentCustody.receivingCustodyCommitmentDigest}`
            : `receiz.offline-note.installation:${packet.holderInstallationCommitment}`,
        },
        settlement: {
          ...transferred.settlement,
          state: "held_bound",
          noteId: packet.noteId,
          wholeValuePhiMicro: packet.wholeValuePhiMicro,
          acceptedAtKai: packet.acceptedAtKai,
          transitionNonce: packet.transitionNonce,
          ...(packet.custodyMode === "qualified-anonymous"
            ? {
                holderCustodyCommitmentDigest: packet.currentCustody.receivingCustodyCommitmentDigest,
                holderInstallationCommitment: packet.currentCustody.installationCommitment,
                irreversibleConsumptionReceiptDigest: packet.irreversibleConsumptionReceipt?.receiptDigest ?? null,
              }
            : {
                holderReceivingSealDigest: packet.holderReceivingSealDigest,
                holderInstallationCommitment: packet.holderInstallationCommitment,
              }),
          packet: packetJson(packet),
        },
      });
      const carried = await attachReceizPortableProofHistory(updated, history);
      const continuity = await deriveReceizPortableOwnershipContinuity(carried);
      const sealed = await (options.sealDocument ?? receizeDocumentBytesClient)({
        fileBytes: serializeReceizPortableAssetDocument(carried),
        filename: prepared.filename,
        mime: prepared.mime,
        options: {
          nativeRecordSeal: {
            ownerReceizId: packet.currentHolderReceizId,
            recordId: prepared.nativeRecordSeal.recordId,
            ownershipContinuity: continuity,
          },
        },
      });
      return sealed.artifactBytes;
    },

    verifySuccessor: open,
  });
}

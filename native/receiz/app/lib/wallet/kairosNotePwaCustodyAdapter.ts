import { digestReceizAuthority } from "../../../packages/receiz-sdk/src/authorityEncoding";
import { receizBase64UrlDecode, receizBase64UrlEncode } from "../../../packages/receiz-sdk/src/identity";
import {
  createReceizOfflineNoteCustodyQualification,
  createReceizOfflineNoteReceivingCustodyCommitment,
  verifyReceizOfflineNoteCustodyQualification,
  type ReceizOfflineNoteCustodyQualificationV1,
  type ReceizOfflineNoteReceivingCustodyCommitmentV1,
} from "../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import {
  finalizeReceizOfflineNoteWebAuthnActivationReceipt,
  finalizeReceizOfflineNoteWebAuthnConsumptionReceipt,
  prepareReceizOfflineNoteWebAuthnActivationChallenge,
  prepareReceizOfflineNoteWebAuthnConsumptionChallenge,
  verifyReceizOfflineNoteWebAuthnAssertion,
  type ReceizOfflineNoteWebAuthnActivationReceiptV1,
  type ReceizOfflineNoteWebAuthnConsumptionReceiptV1,
} from "../../../packages/receiz-sdk/src/offlineNoteWebAuthnCustody";
import {
  RECEIZ_OFFLINE_NOTE_PWA_CUSTODY_PROFILES,
  resolveKairosNotePwaCustodyProfile,
  type KairosNotePwaCustodyProfile,
} from "./kairosNotePwaCustodyProfiles";
import {
  verifyReceizOfflineNotePlatformAttestationCertificate,
  type ReceizOfflineNotePlatformAttestationCertificateV1,
} from "../../../packages/receiz-sdk/src/offlineNotePlatformAttestation";
import {
  createReceizOfflineNoteAttestedReceivingCustodyCommitment,
  type ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2,
} from "../../../packages/receiz-sdk/src/offlineNoteAttestedCustody";
import type { ReceizSignatureV4RootPublicKey } from "../../../packages/receiz-sdk/src/verifier/signatureV4";
import {
  runKairosNotePwaRollbackConformance,
  type KairosNotePwaRollbackConformance,
} from "./kairosNotePwaRollbackConformance";

const STATE_SCHEMA = "receiz.offline-note.pwa-custody-state.v1" as const;
const QUALIFICATION_CHALLENGE_SCHEMA = "receiz.offline-note.pwa-qualification-challenge.v1" as const;
const SHA256_RE = /^[0-9a-f]{64}$/;

export type KairosNotePwaCredential = Readonly<{
  credentialIdB64u: string;
  custodyPublicKeyRawB64u: string;
  aaguid: string;
  rpId: string;
  origin: string;
  platformAttestationCertificate?: ReceizOfflineNotePlatformAttestationCertificateV1;
}>;

export type KairosNotePwaAssertion = Readonly<{
  authenticatorDataB64u: string;
  clientDataJSONB64u: string;
  signatureB64u: string;
}>;

export interface KairosNotePwaWebAuthnClient {
  enroll(): Promise<KairosNotePwaCredential>;
  assert(input: Readonly<{
    credentialIdB64u: string;
    challengeB64u: string;
  }>): Promise<KairosNotePwaAssertion>;
}

type ActiveState = Readonly<{
  schema: typeof STATE_SCHEMA;
  status: "active";
  credential: KairosNotePwaCredential;
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  attestedEvidence?: Readonly<{
    certificate: ReceizOfflineNotePlatformAttestationCertificateV1;
    conformance: KairosNotePwaRollbackConformance;
  }>;
}>;

type ReceivingCustodyCommitment =
  | ReceizOfflineNoteReceivingCustodyCommitmentV1
  | ReceizOfflineNoteAttestedReceivingCustodyCommitmentV2;

type HeldState = Readonly<{
  schema: typeof STATE_SCHEMA;
  status: "held";
  credential: KairosNotePwaCredential;
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  receivingCustody: ReceivingCustodyCommitment;
  noteId: string;
  artifactSha256: string;
  wholeValuePhiMicro: string;
  activationReceipt: ReceizOfflineNoteWebAuthnActivationReceiptV1;
}>;

type RetiredState = Readonly<{
  schema: typeof STATE_SCHEMA;
  status: "retired";
  credential: KairosNotePwaCredential;
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  code: "OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED" | "OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED";
  receiptDigest: string | null;
  consumeInput?: KairosNoteConsumeExactHeadInput;
  consumptionReceipt?: ReceizOfflineNoteWebAuthnConsumptionReceiptV1;
}>;

export type KairosNotePwaCustodyState = ActiveState | HeldState | RetiredState;

export interface KairosNotePwaCustodyStorage {
  read(): Promise<KairosNotePwaCustodyState | null>;
  write(state: KairosNotePwaCustodyState): Promise<void>;
}

export type KairosNotePwaQualificationResult =
  | ReceizOfflineNoteCustodyQualificationV1
  | Readonly<{
      status: "unsupported";
      code:
        | "OFFLINE_NOTE_CUSTODY_PROFILE_NOT_REGISTERED"
        | "OFFLINE_NOTE_CUSTODY_BACKUP_ELIGIBLE"
        | "OFFLINE_NOTE_CUSTODY_BACKUP_STATE"
        | "OFFLINE_NOTE_CUSTODY_COUNTER_UNAVAILABLE"
        | "OFFLINE_NOTE_CUSTODY_ASSERTION_INVALID"
        | "OFFLINE_NOTE_CUSTODY_ATTESTATION_INVALID"
        | "OFFLINE_NOTE_CUSTODY_ATTESTATION_FORMAT_UNSUPPORTED"
        | "OFFLINE_NOTE_CUSTODY_ATTESTATION_CHAIN_REQUIRED"
        | "OFFLINE_NOTE_CUSTODY_BACKUP_CAPABLE"
        | "OFFLINE_NOTE_CUSTODY_BACKED_UP"
        | "OFFLINE_NOTE_CUSTODY_USER_VERIFICATION_REQUIRED"
        | "OFFLINE_NOTE_CUSTODY_PLATFORM_AUTHENTICATOR_REQUIRED"
        | "OFFLINE_NOTE_DEVICE_ATTESTATION_INSUFFICIENT";
    }>
  | Readonly<{
      status: "retired";
      code: "OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED" | "OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED";
    }>;

export type KairosNoteConsumeExactHeadInput = Readonly<{
  qualificationDigest: string;
  currentCustodyCommitmentDigest: string;
  noteId: string;
  predecessorArtifactSha256: string;
  receiverCustodyCommitmentDigest: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
  successorBasisDigest: string;
}>;

export type KairosNoteActivateExactSuccessorInput = Readonly<{
  qualificationDigest: string;
  noteId: string;
  verifiedSuccessorArtifactSha256: string;
  receivingCustodyCommitmentDigest: string;
  wholeValuePhiMicro: string;
  acceptedAtKai: string;
}>;

function cloneState<T>(value: T): T {
  return structuredClone(value);
}

function authData(assertion: KairosNotePwaAssertion): Readonly<{ flags: number; signCount: number }> {
  const bytes = receizBase64UrlDecode(assertion.authenticatorDataB64u);
  if (bytes.byteLength < 37) throw new Error("OFFLINE_NOTE_CUSTODY_ASSERTION_INVALID");
  return Object.freeze({
    flags: bytes[32] ?? 0,
    signCount: new DataView(bytes.buffer, bytes.byteOffset + 33, 4).getUint32(0, false),
  });
}

function digestChallenge(digest: string): string {
  if (!SHA256_RE.test(digest)) throw new Error("OFFLINE_NOTE_CUSTODY_ASSERTION_INVALID");
  const bytes = Uint8Array.from({ length: 32 }, (_, index) => Number.parseInt(
    digest.slice(index * 2, index * 2 + 2),
    16,
  ));
  return receizBase64UrlEncode(bytes);
}

export function createKairosNoteMemoryPwaCustodyStorage(): KairosNotePwaCustodyStorage & Readonly<{
  snapshot(): KairosNotePwaCustodyState | null;
  restore(state: KairosNotePwaCustodyState | null): void;
}> {
  let state: KairosNotePwaCustodyState | null = null;
  return {
    async read() { return state ? cloneState(state) : null; },
    async write(next) { state = cloneState(next); },
    snapshot() { return state ? cloneState(state) : null; },
    restore(next) { state = next ? cloneState(next) : null; },
  };
}

export function createKairosNotePwaCustodyAdapter(input: Readonly<{
  webAuthn: KairosNotePwaWebAuthnClient;
  storage: KairosNotePwaCustodyStorage;
  profiles?: readonly KairosNotePwaCustodyProfile[];
  attestationRoots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>) {
  const profiles = input.profiles ?? RECEIZ_OFFLINE_NOTE_PWA_CUSTODY_PROFILES;

  async function retire(
    state: ActiveState | HeldState,
    code: RetiredState["code"],
    receiptDigest: string | null,
  ): Promise<void> {
    await input.storage.write(Object.freeze({
      schema: STATE_SCHEMA,
      status: "retired",
      credential: state.credential,
      qualification: state.qualification,
      code,
      receiptDigest,
    }));
  }

  return Object.freeze({
    async qualifyInstallation(): Promise<KairosNotePwaQualificationResult> {
      const stored = await input.storage.read();
      if (stored?.status === "retired") {
        return Object.freeze({ status: "retired", code: stored.code });
      }
      if (stored?.status === "held") {
        return verifyReceizOfflineNoteCustodyQualification(stored.qualification);
      }
      if (stored?.status === "active") {
        return verifyReceizOfflineNoteCustodyQualification(stored.qualification);
      }
      const credential = await input.webAuthn.enroll();
      let qualificationChallengeDigest: string;
      let stateSequence: string;
      let profile: KairosNotePwaCustodyProfile;
      let attestedEvidence: ActiveState["attestedEvidence"];
      if (credential.platformAttestationCertificate) {
        try {
          const certificate = await verifyReceizOfflineNotePlatformAttestationCertificate(
            credential.platformAttestationCertificate,
            {
              roots: input.attestationRoots,
              expectedRpId: credential.rpId,
              expectedOrigin: credential.origin,
              expectedCustodyPublicKeyRawB64u: credential.custodyPublicKeyRawB64u,
            },
          );
          const conformance = await runKairosNotePwaRollbackConformance({
            credential,
            webAuthn: input.webAuthn,
            registrationCounter: certificate.registrationCounter,
          });
          qualificationChallengeDigest = conformance.conformanceEvidenceDigest;
          stateSequence = conformance.conformedStateSequence;
          profile = Object.freeze({
            profileId: `receiz.attested.${certificate.attestationFormat}.${certificate.aaguid}`,
            profileEvidenceDigest: certificate.certificateDigest,
            aaguid: certificate.aaguid,
            rpId: certificate.rpId,
            allowedOrigins: Object.freeze([certificate.origin]),
          });
          attestedEvidence = Object.freeze({ certificate, conformance });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const code = /^(?:OFFLINE_NOTE_CUSTODY_(?:ATTESTATION_INVALID|ATTESTATION_FORMAT_UNSUPPORTED|ATTESTATION_CHAIN_REQUIRED|BACKUP_CAPABLE|BACKED_UP|USER_VERIFICATION_REQUIRED|PLATFORM_AUTHENTICATOR_REQUIRED))$/.test(message)
            ? message as Extract<KairosNotePwaQualificationResult, { status: "unsupported" }>["code"]
            : "OFFLINE_NOTE_DEVICE_ATTESTATION_INSUFFICIENT";
          return Object.freeze({ status: "unsupported", code });
        }
      } else {
        qualificationChallengeDigest = await digestReceizAuthority(
          "transition",
          QUALIFICATION_CHALLENGE_SCHEMA,
          credential,
        );
        const challengeB64u = digestChallenge(qualificationChallengeDigest);
        let assertion: KairosNotePwaAssertion;
        try {
          assertion = await input.webAuthn.assert({
            credentialIdB64u: credential.credentialIdB64u,
            challengeB64u,
          });
        } catch {
          return Object.freeze({ status: "unsupported", code: "OFFLINE_NOTE_CUSTODY_ASSERTION_INVALID" });
        }
        const observed = authData(assertion);
        const resolution = resolveKairosNotePwaCustodyProfile({
          aaguid: credential.aaguid.toLowerCase(),
          rpId: credential.rpId,
          origin: credential.origin,
          backupEligible: (observed.flags & 0x08) === 0x08,
          backupState: (observed.flags & 0x10) === 0x10,
          signCount: observed.signCount,
        }, profiles);
        if (resolution.status !== "qualified") return resolution;
        try {
          await verifyReceizOfflineNoteWebAuthnAssertion({
            custodyPublicKeyRawB64u: credential.custodyPublicKeyRawB64u,
            rpId: credential.rpId,
            origin: credential.origin,
            challengeB64u,
            expectedSignCount: String(observed.signCount),
            ...assertion,
          });
        } catch {
          return Object.freeze({ status: "unsupported", code: "OFFLINE_NOTE_CUSTODY_ASSERTION_INVALID" });
        }
        stateSequence = String(observed.signCount);
        profile = resolution.profile;
      }
      const stateCommitment = await digestReceizAuthority("transition", STATE_SCHEMA, {
        credentialIdB64u: credential.credentialIdB64u,
        custodyPublicKeyRawB64u: credential.custodyPublicKeyRawB64u,
        stateSequence,
        causeDigest: qualificationChallengeDigest,
      });
      const qualification = await createReceizOfflineNoteCustodyQualification({
        profileId: profile.profileId,
        profileEvidenceDigest: profile.profileEvidenceDigest,
        adapterKind: "pwa-webauthn",
        custodyPublicKeyRawB64u: credential.custodyPublicKeyRawB64u,
        stateCommitment,
        stateSequence,
      });
      await input.storage.write(Object.freeze({
        schema: STATE_SCHEMA,
        status: "active",
        credential,
        qualification,
        ...(attestedEvidence ? { attestedEvidence } : {}),
      }));
      return qualification;
    },

    async createReceivingCommitment(
      qualificationInput: ReceizOfflineNoteCustodyQualificationV1,
    ): Promise<ReceivingCustodyCommitment> {
      const state = await input.storage.read();
      if (!state || state.status !== "active"
        || state.qualification.qualificationDigest !== qualificationInput.qualificationDigest) {
        throw new Error("OFFLINE_NOTE_CUSTODY_QUALIFICATION_REQUIRED");
      }
      if (state.attestedEvidence) {
        return createReceizOfflineNoteAttestedReceivingCustodyCommitment({
          qualification: qualificationInput,
          platformAttestationCertificate: state.attestedEvidence.certificate,
          rollbackConformanceEvidence: state.attestedEvidence.conformance,
          roots: input.attestationRoots,
        });
      }
      return createReceizOfflineNoteReceivingCustodyCommitment(qualificationInput);
    },

    async activateExactSuccessor(
      activationInput: KairosNoteActivateExactSuccessorInput,
    ): Promise<ReceizOfflineNoteWebAuthnActivationReceiptV1> {
      const state = await input.storage.read();
      if (!state || state.status === "retired") {
        throw new Error("OFFLINE_NOTE_CUSTODY_UNSUPPORTED");
      }
      if (state.status === "held") {
        if (state.noteId === activationInput.noteId
          && state.artifactSha256 === activationInput.verifiedSuccessorArtifactSha256
          && state.receivingCustody.receivingCustodyCommitmentDigest
            === activationInput.receivingCustodyCommitmentDigest) {
          return state.activationReceipt;
        }
        throw new Error("OFFLINE_NOTE_EXACT_SUCCESSOR_ALREADY_ACTIVE");
      }
      if (state.qualification.qualificationDigest !== activationInput.qualificationDigest) {
        throw new Error("OFFLINE_NOTE_RECEIVING_CUSTODY_MISMATCH");
      }
      const receivingCustody = state.attestedEvidence
        ? await createReceizOfflineNoteAttestedReceivingCustodyCommitment({
            qualification: state.qualification,
            platformAttestationCertificate: state.attestedEvidence.certificate,
            rollbackConformanceEvidence: state.attestedEvidence.conformance,
            roots: input.attestationRoots,
          })
        : await createReceizOfflineNoteReceivingCustodyCommitment(state.qualification);
      if (receivingCustody.receivingCustodyCommitmentDigest
        !== activationInput.receivingCustodyCommitmentDigest) {
        throw new Error("OFFLINE_NOTE_RECEIVING_CUSTODY_MISMATCH");
      }
      const activeStateSequence = String(BigInt(state.qualification.stateSequence) + 1n);
      const activeStateCommitment = await digestReceizAuthority("transition", STATE_SCHEMA, {
        credentialIdB64u: state.credential.credentialIdB64u,
        previousStateCommitment: state.qualification.stateCommitment,
        activeStateSequence,
        noteId: activationInput.noteId,
        verifiedSuccessorArtifactSha256: activationInput.verifiedSuccessorArtifactSha256,
        receivingCustodyCommitmentDigest: activationInput.receivingCustodyCommitmentDigest,
        wholeValuePhiMicro: activationInput.wholeValuePhiMicro,
      });
      const prepared = await prepareReceizOfflineNoteWebAuthnActivationChallenge({
        qualification: state.qualification,
        noteId: activationInput.noteId,
        verifiedSuccessorArtifactSha256: activationInput.verifiedSuccessorArtifactSha256,
        receivingCustodyCommitmentDigest: activationInput.receivingCustodyCommitmentDigest,
        expectedStateCommitment: state.qualification.stateCommitment,
        activeStateCommitment,
        expectedStateSequence: state.qualification.stateSequence,
        activeStateSequence,
        wholeValuePhiMicro: activationInput.wholeValuePhiMicro,
        acceptedAtKai: activationInput.acceptedAtKai,
        rpId: state.credential.rpId,
        origin: state.credential.origin,
      });
      try {
        const assertion = await input.webAuthn.assert({
          credentialIdB64u: state.credential.credentialIdB64u,
          challengeB64u: prepared.challengeB64u,
        });
        const receipt = await finalizeReceizOfflineNoteWebAuthnActivationReceipt({ prepared, ...assertion });
        const qualification = await createReceizOfflineNoteCustodyQualification({
          profileId: state.qualification.profileId,
          profileEvidenceDigest: state.qualification.profileEvidenceDigest,
          adapterKind: state.qualification.adapterKind,
          custodyPublicKeyRawB64u: state.qualification.custodyPublicKeyRawB64u,
          stateCommitment: receipt.activeStateCommitment,
          stateSequence: receipt.activeStateSequence,
        });
        await input.storage.write(Object.freeze({
          schema: STATE_SCHEMA,
          status: "held",
          credential: state.credential,
          qualification,
          receivingCustody,
          noteId: receipt.noteId,
          artifactSha256: receipt.verifiedSuccessorArtifactSha256,
          wholeValuePhiMicro: receipt.wholeValuePhiMicro,
          activationReceipt: receipt,
        }));
        return receipt;
      } catch {
        await retire(state, "OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED", null);
        throw new Error("OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED");
      }
    },

    async consumeExactHead(
      consumeInput: KairosNoteConsumeExactHeadInput,
    ): Promise<ReceizOfflineNoteWebAuthnConsumptionReceiptV1> {
      const state = await input.storage.read();
      if (state?.status === "retired") {
        if (state.code === "OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED"
          && state.consumeInput && state.consumptionReceipt) {
          const [requestedDigest, consumedDigest] = await Promise.all([
            digestReceizAuthority("transition", "receiz.offline-note.consume-input.v1", consumeInput),
            digestReceizAuthority("transition", "receiz.offline-note.consume-input.v1", state.consumeInput),
          ]);
          if (requestedDigest === consumedDigest) return state.consumptionReceipt;
        }
        throw new Error(state.code);
      }
      if (!state || state.status !== "held") {
        throw new Error("OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED");
      }
      if (state.noteId !== consumeInput.noteId
        || state.artifactSha256 !== consumeInput.predecessorArtifactSha256
        || state.wholeValuePhiMicro !== consumeInput.wholeValuePhiMicro
        || state.receivingCustody.qualificationDigest !== consumeInput.qualificationDigest
        || state.receivingCustody.receivingCustodyCommitmentDigest
          !== consumeInput.currentCustodyCommitmentDigest) {
        throw new Error("OFFLINE_NOTE_EXACT_HEAD_REQUIRED");
      }
      const consumedStateSequence = String(BigInt(state.qualification.stateSequence) + 1n);
      const consumedStateCommitment = await digestReceizAuthority("transition", STATE_SCHEMA, {
        credentialIdB64u: state.credential.credentialIdB64u,
        previousStateCommitment: state.qualification.stateCommitment,
        consumedStateSequence,
        noteId: consumeInput.noteId,
        predecessorArtifactSha256: consumeInput.predecessorArtifactSha256,
        currentCustodyCommitmentDigest: consumeInput.currentCustodyCommitmentDigest,
        receiverCustodyCommitmentDigest: consumeInput.receiverCustodyCommitmentDigest,
        successorBasisDigest: consumeInput.successorBasisDigest,
      });
      const prepared = await prepareReceizOfflineNoteWebAuthnConsumptionChallenge({
        qualification: state.qualification,
        activationReceipt: state.activationReceipt,
        noteId: consumeInput.noteId,
        predecessorArtifactSha256: consumeInput.predecessorArtifactSha256,
        currentCustodyCommitmentDigest: consumeInput.currentCustodyCommitmentDigest,
        expectedStateCommitment: state.qualification.stateCommitment,
        consumedStateCommitment,
        expectedStateSequence: state.qualification.stateSequence,
        consumedStateSequence,
        receiverCustodyCommitmentDigest: consumeInput.receiverCustodyCommitmentDigest,
        wholeValuePhiMicro: consumeInput.wholeValuePhiMicro,
        acceptedAtKai: consumeInput.acceptedAtKai,
        successorBasisDigest: consumeInput.successorBasisDigest,
        rpId: state.credential.rpId,
        origin: state.credential.origin,
      });
      try {
        const assertion = await input.webAuthn.assert({
          credentialIdB64u: state.credential.credentialIdB64u,
          challengeB64u: prepared.challengeB64u,
        });
        const receipt = await finalizeReceizOfflineNoteWebAuthnConsumptionReceipt({ prepared, ...assertion });
        await input.storage.write(Object.freeze({
          schema: STATE_SCHEMA,
          status: "retired",
          credential: state.credential,
          qualification: state.qualification,
          code: "OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED",
          receiptDigest: receipt.receiptDigest,
          consumeInput: structuredClone(consumeInput),
          consumptionReceipt: structuredClone(receipt),
        }));
        return receipt;
      } catch {
        await retire(state, "OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED", null);
        throw new Error("OFFLINE_NOTE_CUSTODY_ROLLBACK_DETECTED");
      }
    },
  });
}

export type KairosNotePwaCustodyAdapter = ReturnType<typeof createKairosNotePwaCustodyAdapter>;

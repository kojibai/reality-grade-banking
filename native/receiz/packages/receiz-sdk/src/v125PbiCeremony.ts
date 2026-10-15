import { isReceizSourceBoundPbiVerifierV125 } from "./v125PbiSourceVerifier.js";
export { createReceizSourceBoundPbiAuthorshipVerifierV125, type ReceizPbiSourceBindingV125 } from "./v125PbiSourceVerifier.js";
import { digestReceizAuthority } from "./authorityEncoding.js";
import {
  receizBase64UrlEncode,
  signReceizIdentityLoginProof,
  verifyReceizIdentityPublicKeyProjectionSignature,
  type ReceizIdentityLoginProof,
  type ReceizKeyFile,
} from "./identity.js";
import {
  verifyReceizPbiProofObjectAuthorshipChainV1,
  type ReceizPbiProofObjectAuthorshipAppendV1,
} from "./proofObjectAuthorship.js";
import { freeze } from "./v124Contracts.js";

const HEX64 = /^[0-9a-f]{64}$/u;
const KAI = /^(0|[1-9][0-9]*)$/u;
const TOKEN = /^[A-Za-z0-9:._-]{1,256}$/u;

export type ReceizPbiCeremonyChallengeV125 = Readonly<{
  schema: "receiz.pbi.ceremony-challenge.v125";
  verifierReceizId: string;
  holderReceizId: string;
  proofObjectId: string;
  acceptedHead: string;
  presentationDigest: string;
  disclosureDigest: string;
  consentDigest: string;
  issuedKai: string;
  expiresAtKai: string;
  nonce: string;
  challengeDigest: string;
}>;

export type ReceizPbiCeremonyApprovalV125 = Readonly<{
  schema: "receiz.pbi.ceremony-approval.v125";
  challengeDigest: string;
  holderReceizId: string;
  pbiAuthorship: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
  receizIdPublicKeyRawB64u: string;
  holderProof: ReceizIdentityLoginProof;
  approvalDigest: string;
}>;

export type ReceizPbiCeremonyReceiptV125 = Readonly<{
  schema: "receiz.pbi.ceremony-receipt.v125";
  verifierReceizId: string;
  holderReceizId: string;
  proofObjectId: string;
  acceptedHead: string;
  presentationDigest: string;
  disclosureDigest: string;
  consentDigest: string;
  issuedKai: string;
  expiresAtKai: string;
  nonce: string;
  challengeDigest: string;
  approval: ReceizPbiCeremonyApprovalV125;
  receiptDigest: string;
  authority: Readonly<{ receiptIsIdentityAuthority: false; strongerTruth: "pbi-authorship-and-receiz-id-proof" }>;
}>;

export type ReceizPbiCeremonyVerificationV125 = Readonly<{
  schema: "receiz.pbi.ceremony-verification.v125";
  valid: boolean;
  code: "verified" | "invalid" | "expired" | "replayed" | "binding-mismatch";
  proofObjectId: string;
  acceptedHead: string;
  holderReceizId: string;
  verifierReceizId: string;
  writesPerformed: 0 | 1;
  authority: Readonly<{ receiptIsIdentityAuthority: false; strongerTruth: "pbi-authorship-and-receiz-id-proof" }>;
}>;

export type ReceizPbiCeremonyReplayGuardV125 = Readonly<{
  consume(receiptDigest: string): boolean;
  consumedCount(): number;
}>;

export type ReceizPbiAuthorshipVerifierV125 = (input: Readonly<{
  history: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
  holderReceizId: string;
  proofObjectId: string;
  acceptedHead: string;
  holderProof?: ReceizIdentityLoginProof;
  challengeDigest?: string;
}>) => Promise<boolean>;

type ChallengeInput = Omit<ReceizPbiCeremonyChallengeV125, "schema" | "challengeDigest">;

function text(value: string, code: string): string {
  if (!TOKEN.test(value) || value.normalize("NFC") !== value) throw new TypeError(code);
  return value;
}

function digest(value: string, code: string): string {
  if (!HEX64.test(value)) throw new TypeError(code);
  return value;
}

function kai(value: string, code: string): string {
  if (!KAI.test(value)) throw new TypeError(code);
  return value;
}

function challengeBasis(input: ChallengeInput) {
  return freeze({
    verifierReceizId: text(input.verifierReceizId, "V125_PBI_VERIFIER_INVALID"),
    holderReceizId: text(input.holderReceizId, "V125_PBI_HOLDER_INVALID"),
    proofObjectId: text(input.proofObjectId, "V125_PBI_PROOF_OBJECT_INVALID"),
    acceptedHead: digest(input.acceptedHead, "V125_PBI_HEAD_INVALID"),
    presentationDigest: digest(input.presentationDigest, "V125_PBI_PRESENTATION_DIGEST_INVALID"),
    disclosureDigest: digest(input.disclosureDigest, "V125_PBI_DISCLOSURE_DIGEST_INVALID"),
    consentDigest: digest(input.consentDigest, "V125_PBI_CONSENT_DIGEST_INVALID"),
    issuedKai: kai(input.issuedKai, "V125_PBI_ISSUED_KAI_INVALID"),
    expiresAtKai: kai(input.expiresAtKai, "V125_PBI_EXPIRY_KAI_INVALID"),
    nonce: text(input.nonce, "V125_PBI_NONCE_INVALID"),
  });
}

export async function createReceizPbiCeremonyChallengeV125(
  input: ChallengeInput,
): Promise<ReceizPbiCeremonyChallengeV125> {
  const basis = challengeBasis(input);
  if (BigInt(basis.expiresAtKai) <= BigInt(basis.issuedKai)) throw new TypeError("V125_PBI_EXPIRY_INVALID");
  return freeze({
    schema: "receiz.pbi.ceremony-challenge.v125" as const,
    ...basis,
    challengeDigest: await digestReceizAuthority("identity", "receiz.pbi.ceremony-challenge.v125", basis),
  });
}

async function verifyChallenge(challenge: ReceizPbiCeremonyChallengeV125): Promise<boolean> {
  try {
    if (challenge.schema !== "receiz.pbi.ceremony-challenge.v125") return false;
    const basis = challengeBasis(challenge);
    return challenge.challengeDigest === await digestReceizAuthority(
      "identity",
      "receiz.pbi.ceremony-challenge.v125",
      basis,
    );
  } catch {
    return false;
  }
}

export async function approveReceizPbiCeremonyV125(input: Readonly<{
  challenge: ReceizPbiCeremonyChallengeV125;
  pbiAuthorship: readonly ReceizPbiProofObjectAuthorshipAppendV1[];
  keyFile: ReceizKeyFile;
  passphrase?: string;
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizPbiCeremonyApprovalV125> {
  input = Object.freeze({ ...input, challenge: freeze(structuredClone(input.challenge)),
    pbiAuthorship: freeze(structuredClone(input.pbiAuthorship)), keyFile: freeze(structuredClone(input.keyFile)) });
  if (!isReceizSourceBoundPbiVerifierV125(input.verifyPbiAuthorship)
    || !await verifyChallenge(input.challenge)
    || !await verifyReceizPbiProofObjectAuthorshipChainV1(input.pbiAuthorship)) {
    throw new TypeError("V125_PBI_CHALLENGE_INVALID");
  }
  const last = input.pbiAuthorship.at(-1);
  if (!last || last.receizId !== input.challenge.holderReceizId
    || input.keyFile.owner.uid !== input.challenge.holderReceizId) {
    throw new TypeError("V125_PBI_HOLDER_BINDING_MISMATCH");
  }
  if (BigInt(last.kaiUpulse) > BigInt(input.challenge.issuedKai)) throw new TypeError("V125_PBI_AUTHORSHIP_AFTER_CHALLENGE");
  const challengeB64Url = receizBase64UrlEncode(new TextEncoder().encode(input.challenge.challengeDigest));
  const holderProof = await signReceizIdentityLoginProof({
    keyFile: input.keyFile,
    challengeB64Url,
    passphrase: input.passphrase,
  });
  if (!await input.verifyPbiAuthorship({ history: input.pbiAuthorship,
    holderReceizId: input.challenge.holderReceizId, proofObjectId: input.challenge.proofObjectId,
    acceptedHead: input.challenge.acceptedHead, holderProof, challengeDigest: input.challenge.challengeDigest })) {
    throw new TypeError("V125_PBI_CHALLENGE_INVALID");
  }
  const basis = freeze({
    challengeDigest: input.challenge.challengeDigest,
    holderReceizId: input.challenge.holderReceizId,
    pbiAuthorship: freeze([...input.pbiAuthorship]),
    receizIdPublicKeyRawB64u: input.keyFile.crypto.publicKeyRawB64u,
    holderProof,
  });
  return freeze({
    schema: "receiz.pbi.ceremony-approval.v125" as const,
    ...basis,
    approvalDigest: await digestReceizAuthority("identity", "receiz.pbi.ceremony-approval.v125", basis),
  });
}

async function verifyApproval(
  challenge: ReceizPbiCeremonyChallengeV125,
  approval: ReceizPbiCeremonyApprovalV125,
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125,
): Promise<boolean> {
  if (!isReceizSourceBoundPbiVerifierV125(verifyPbiAuthorship)
    || approval.schema !== "receiz.pbi.ceremony-approval.v125"
    || approval.challengeDigest !== challenge.challengeDigest
    || approval.holderReceizId !== challenge.holderReceizId
    || !await verifyReceizPbiProofObjectAuthorshipChainV1(approval.pbiAuthorship)
    || !approval.pbiAuthorship.length
    || BigInt(approval.pbiAuthorship.at(-1)!.kaiUpulse) > BigInt(challenge.issuedKai)
    || !await verifyPbiAuthorship({
      history: approval.pbiAuthorship,
      holderReceizId: challenge.holderReceizId,
      proofObjectId: challenge.proofObjectId,
      acceptedHead: challenge.acceptedHead,
      holderProof: approval.holderProof,
      challengeDigest: challenge.challengeDigest,
    })
    || approval.pbiAuthorship.at(-1)?.receizId !== challenge.holderReceizId) return false;
  const basis = freeze({
    challengeDigest: approval.challengeDigest,
    holderReceizId: approval.holderReceizId,
    pbiAuthorship: approval.pbiAuthorship,
    receizIdPublicKeyRawB64u: approval.receizIdPublicKeyRawB64u,
    holderProof: approval.holderProof,
  });
  if (approval.approvalDigest !== await digestReceizAuthority("identity", "receiz.pbi.ceremony-approval.v125", basis)) return false;
  return await verifyReceizIdentityPublicKeyProjectionSignature({
    keyId: approval.holderProof.keyId,
    alg: approval.holderProof.alg,
    publicKeyRawB64u: approval.receizIdPublicKeyRawB64u,
    challengeB64Url: approval.holderProof.challengeB64Url,
    signatureB64Url: approval.holderProof.signatureB64Url,
  }) && approval.holderProof.challengeB64Url === receizBase64UrlEncode(
    new TextEncoder().encode(challenge.challengeDigest),
  );
}

export async function issueReceizPbiCeremonyReceiptV125(input: Readonly<{
  challenge: ReceizPbiCeremonyChallengeV125;
  approval: ReceizPbiCeremonyApprovalV125;
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizPbiCeremonyReceiptV125> {
  input = Object.freeze({ ...input, challenge: freeze(structuredClone(input.challenge)),
    approval: freeze(structuredClone(input.approval)) });
  if (!await verifyChallenge(input.challenge)
    || !await verifyApproval(input.challenge, input.approval, input.verifyPbiAuthorship)) {
    throw new TypeError("V125_PBI_APPROVAL_INVALID");
  }
  const basis = freeze({
    verifierReceizId: input.challenge.verifierReceizId,
    holderReceizId: input.challenge.holderReceizId,
    proofObjectId: input.challenge.proofObjectId,
    acceptedHead: input.challenge.acceptedHead,
    presentationDigest: input.challenge.presentationDigest,
    disclosureDigest: input.challenge.disclosureDigest,
    consentDigest: input.challenge.consentDigest,
    issuedKai: input.challenge.issuedKai,
    expiresAtKai: input.challenge.expiresAtKai,
    nonce: input.challenge.nonce,
    challengeDigest: input.challenge.challengeDigest,
    approval: input.approval,
  });
  return freeze({
    schema: "receiz.pbi.ceremony-receipt.v125" as const,
    ...basis,
    receiptDigest: await digestReceizAuthority("receipt", "receiz.pbi.ceremony-receipt.v125", basis),
    authority: freeze({ receiptIsIdentityAuthority: false as const, strongerTruth: "pbi-authorship-and-receiz-id-proof" as const }),
  });
}

export function createReceizPbiCeremonyReplayGuardV125(): ReceizPbiCeremonyReplayGuardV125 {
  const consumed = new Set<string>();
  return freeze({
    consume(receiptDigest: string) {
      if (consumed.has(receiptDigest)) return false;
      consumed.add(receiptDigest);
      return true;
    },
    consumedCount() { return consumed.size; },
  });
}

function verification(
  receipt: ReceizPbiCeremonyReceiptV125,
  code: ReceizPbiCeremonyVerificationV125["code"],
  writesPerformed: 0 | 1 = 0,
): ReceizPbiCeremonyVerificationV125 {
  return freeze({
    schema: "receiz.pbi.ceremony-verification.v125" as const,
    valid: code === "verified",
    code,
    proofObjectId: receipt.proofObjectId,
    acceptedHead: receipt.acceptedHead,
    holderReceizId: receipt.holderReceizId,
    verifierReceizId: receipt.verifierReceizId,
    writesPerformed,
    authority: freeze({ receiptIsIdentityAuthority: false as const, strongerTruth: "pbi-authorship-and-receiz-id-proof" as const }),
  });
}

export async function verifyReceizPbiCeremonyReceiptV125(input: Readonly<{
  receipt: ReceizPbiCeremonyReceiptV125;
  selectedKai: string;
  replayGuard?: ReceizPbiCeremonyReplayGuardV125;
  verifyPbiAuthorship: ReceizPbiAuthorshipVerifierV125;
}>): Promise<ReceizPbiCeremonyVerificationV125> {
  input = Object.freeze({ ...input, receipt: freeze(structuredClone(input.receipt)) });
  const receipt = input.receipt;
  try {
    if (receipt.schema !== "receiz.pbi.ceremony-receipt.v125" || !KAI.test(input.selectedKai)) {
      return verification(receipt, "invalid");
    }
    const challenge = await createReceizPbiCeremonyChallengeV125(receipt);
    if (challenge.challengeDigest !== receipt.challengeDigest) return verification(receipt, "binding-mismatch");
    if (!await verifyApproval(challenge, receipt.approval, input.verifyPbiAuthorship)) return verification(receipt, "invalid");
    const basis = freeze({
      verifierReceizId: receipt.verifierReceizId,
      holderReceizId: receipt.holderReceizId,
      proofObjectId: receipt.proofObjectId,
      acceptedHead: receipt.acceptedHead,
      presentationDigest: receipt.presentationDigest,
      disclosureDigest: receipt.disclosureDigest,
      consentDigest: receipt.consentDigest,
      issuedKai: receipt.issuedKai,
      expiresAtKai: receipt.expiresAtKai,
      nonce: receipt.nonce,
      challengeDigest: receipt.challengeDigest,
      approval: receipt.approval,
    });
    if (receipt.receiptDigest !== await digestReceizAuthority("receipt", "receiz.pbi.ceremony-receipt.v125", basis)) {
      return verification(receipt, "binding-mismatch");
    }
    if (BigInt(input.selectedKai) >= BigInt(receipt.expiresAtKai)) return verification(receipt, "expired");
    if (BigInt(input.selectedKai) < BigInt(receipt.issuedKai)) return verification(receipt, "invalid");
    if (input.replayGuard && !input.replayGuard.consume(receipt.receiptDigest)) return verification(receipt, "replayed");
    return verification(receipt, "verified", input.replayGuard ? 1 : 0);
  } catch {
    return verification(receipt, "binding-mismatch");
  }
}

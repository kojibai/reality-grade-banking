import { digestReceizAuthority } from "../../../../packages/receiz-sdk/src/authorityEncoding";
import { receizBase64UrlEncode } from "../../../../packages/receiz-sdk/src/identity";
import { verifyReceizOfflineNoteCustodyQualification, createReceizOfflineNoteCustodyQualification, type ReceizOfflineNoteCustodyQualificationV1 } from "../../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import { verifyReceizOfflineNoteWebAuthnAssertion } from "../../../../packages/receiz-sdk/src/offlineNoteWebAuthnCustody";
import type { KairosNotePwaAssertion } from "../kairosNotePwaCustodyAdapter";

export type BankCashAccountRebaseBasis = Readonly<{
  schema: "receiz.bank.cash-account-head-rebase.v1";
  fundingArtifactSha256: string;
  qualificationDigest: string;
  installationCommitment: string;
  custodyPublicKeyRawB64u: string;
  rpId: string;
  origin: string;
  predecessorAccountPortableStateDigest: string;
  successorAccountPortableStateDigest: string;
  reservePhiMicro: string;
  reserveUsdCents: string;
  expectedStateCommitment: string;
  expectedStateSequence: string;
  nextStateSequence: string;
  acceptedAtKai: string;
  nonce: string;
}>;
export type BankCashAccountRebaseReceipt = BankCashAccountRebaseBasis & KairosNotePwaAssertion & Readonly<{
  nextStateCommitment: string;
  receiptDigest: string;
}>;
const keys = ["schema","fundingArtifactSha256","qualificationDigest","installationCommitment","custodyPublicKeyRawB64u","rpId","origin",
  "predecessorAccountPortableStateDigest","successorAccountPortableStateDigest","reservePhiMicro","reserveUsdCents","expectedStateCommitment","expectedStateSequence","nextStateSequence","acceptedAtKai","nonce"];
const fail = (): never => { throw Error("BANK_CASH_ACCOUNT_REBASE_INVALID"); };
export const bankCashRebaseChallenge = (digest: string) => receizBase64UrlEncode(Uint8Array.from(digest.match(/../g)!, value => parseInt(value,16)));

export async function prepareBankCashAccountRebase(basisInput: BankCashAccountRebaseBasis) {
  const basis = structuredClone(basisInput);
  if (!basis || Object.keys(basis).sort().join("|") !== [...keys].sort().join("|") || basis.schema !== "receiz.bank.cash-account-head-rebase.v1"
    || ![basis.fundingArtifactSha256,basis.qualificationDigest,basis.installationCommitment,basis.predecessorAccountPortableStateDigest,basis.successorAccountPortableStateDigest,basis.expectedStateCommitment].every(value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value))
    || ![basis.reservePhiMicro,basis.reserveUsdCents,basis.expectedStateSequence,basis.nextStateSequence,basis.acceptedAtKai].every(value => typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value))
    || BigInt(basis.nextStateSequence) !== BigInt(basis.expectedStateSequence)+1n || basis.predecessorAccountPortableStateDigest === basis.successorAccountPortableStateDigest
    || !basis.custodyPublicKeyRawB64u || !basis.rpId || !basis.origin || typeof basis.nonce !== "string" || !basis.nonce.trim()) fail();
  const nextStateCommitment = await digestReceizAuthority("transition","receiz.bank.cash-account-head-rebase-state.v1",basis);
  const unsigned = {...basis,nextStateCommitment};
  const receiptDigest = await digestReceizAuthority("transition","receiz.bank.cash-account-head-rebase-receipt.v1",unsigned);
  return Object.freeze({...unsigned,receiptDigest});
}

/** Zero financial effect. Authority remains the original complete funding
 * source and its strict qualified counter. This assertion only binds that
 * unchanged component budget to a newer whole-account projection head. */
export async function verifyBankCashAccountRebase(receiptInput: BankCashAccountRebaseReceipt, expected: Readonly<{
  qualification: ReceizOfflineNoteCustodyQualificationV1; fundingArtifactSha256: string;
  rpId: string; origin: string; accountHead: string; reservePhiMicro: string; reserveUsdCents: string;
}>) {
  const receipt = structuredClone(receiptInput);
  if (!receipt || Object.keys(receipt).sort().join("|") !== [...keys,"nextStateCommitment","receiptDigest","authenticatorDataB64u","clientDataJSONB64u","signatureB64u"].sort().join("|")) fail();
  const {nextStateCommitment,receiptDigest,authenticatorDataB64u,clientDataJSONB64u,signatureB64u,...basis}=receipt;
  const made = await prepareBankCashAccountRebase(basis);
  const q=await verifyReceizOfflineNoteCustodyQualification(expected.qualification);
  if (nextStateCommitment !== made.nextStateCommitment || receiptDigest !== made.receiptDigest
    || basis.qualificationDigest !== q.qualificationDigest || basis.expectedStateCommitment !== q.stateCommitment || basis.expectedStateSequence !== q.stateSequence
    || basis.installationCommitment !== q.installationCommitment || basis.custodyPublicKeyRawB64u !== q.custodyPublicKeyRawB64u
    || basis.fundingArtifactSha256 !== expected.fundingArtifactSha256 || basis.origin !== expected.origin || basis.rpId !== expected.rpId
    || basis.predecessorAccountPortableStateDigest !== expected.accountHead || basis.reservePhiMicro !== expected.reservePhiMicro || basis.reserveUsdCents !== expected.reserveUsdCents) fail();
  await verifyReceizOfflineNoteWebAuthnAssertion({custodyPublicKeyRawB64u:q.custodyPublicKeyRawB64u,rpId:basis.rpId,origin:basis.origin,
    challengeB64u:bankCashRebaseChallenge(receiptDigest),expectedSignCount:basis.nextStateSequence,authenticatorDataB64u,clientDataJSONB64u,signatureB64u});
  return createReceizOfflineNoteCustodyQualification({profileId:q.profileId,profileEvidenceDigest:q.profileEvidenceDigest,adapterKind:q.adapterKind,
    custodyPublicKeyRawB64u:q.custodyPublicKeyRawB64u,stateCommitment:nextStateCommitment,stateSequence:basis.nextStateSequence});
}

import { verifyReceizIdentityPortableStateProof, type ReceizKeyFileV1 } from "../../../packages/receiz-sdk/src/identity";
import {
  qualifyReceizAndroidNoteReceivingCustody,
  verifyReceizAndroidNoteReceivingCustody,
  type ReceizAndroidNoteSign,
} from "../../../packages/receiz-sdk/src/offlineNoteAndroidHandoff";
import {
  signReceizOfflineReserveAndroidConsumption,
  type ReceizOfflineReserveAndroidConsumptionReceiptV1,
} from "../../../packages/receiz-sdk/src/offlineReserveAndroidCustody";
import type { ReceizSignatureV4RootPublicKey } from "../../../packages/receiz-sdk/src/verifier/signatureV4";
import { bankAllocatedPhi, bankAllocationRail, verifyBankNoteAllocation } from "./bankNotes/allocationEvidence";
import { openBankAllocationCashSnapshot } from "./bankNotes/cashSnapshot";
import { openBankSettlementAllocationCashSnapshot } from "./bankNotes/settlementCashSnapshot";
import type { BankReserveAllocationEvidence } from "./bankNotes/allocation";
import type { BankSettlementAllocationEvidence } from "./bankNotes/settlementAllocation";
import type { KairosReserveConsumeExactSuccessorInput } from "./kairosReservePwaCustodyAdapter";

/** One committed Reserve Original is consumed in full by one disposable key.
 * Reopening uses the retained allocation and the APK's exact signed-retry journal. */
export async function createKairosReserveAndroidCustodyAdapter(input: Readonly<{
  artifactBytes: Uint8Array;
  privateCashSnapshot: Uint8Array;
  accountProof: ReceizKeyFileV1;
  custody: unknown;
  origin: string;
  sign: ReceizAndroidNoteSign;
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>) {
  const options = { roots: input.roots };
  const [evidence, custody] = await Promise.all([
    verifyBankNoteAllocation(input.artifactBytes, options),
    verifyReceizAndroidNoteReceivingCustody(input.custody, options),
  ]);
  const { funding, artifactSha256: fundingArtifactSha256 } = evidence;
  const account = structuredClone(input.accountProof);
  if (custody.attestation.purpose !== "reserve" || custody.attestation.origin !== input.origin
    || funding.qualificationDigest !== custody.qualificationDigest
    || funding.installationCommitment !== custody.installationCommitment
    || funding.receivingCustodyCommitmentDigest !== custody.receivingCustodyCommitmentDigest
    || BigInt(funding.fundedAtKai) < BigInt(custody.attestation.issuedAtKai)
    || funding.receizKeyId !== account.keyId
    || funding.predecessorAccountPortableStateDigest !== account.portableState?.proof?.digestSha256Hex
    || (account.portableState.snapshot as { account?: { userId?: string } }).account?.userId !== funding.accountUserId
    || await verifyReceizIdentityPortableStateProof(account) !== "verified") {
    throw Error("BANK_NOTE_FUNDING_CUSTODY_MISMATCH");
  }
  if ("fundedSettlementPhiMicro" in funding) {
    await openBankSettlementAllocationCashSnapshot(evidence as BankSettlementAllocationEvidence, input.privateCashSnapshot);
  } else {
    await openBankAllocationCashSnapshot(evidence as BankReserveAllocationEvidence, input.privateCashSnapshot);
  }
  const qualification = await qualifyReceizAndroidNoteReceivingCustody(custody, options);
  const phi = bankAllocatedPhi(funding);
  let receipt: ReceizOfflineReserveAndroidConsumptionReceiptV1 | undefined;
  let committedDigest: string | undefined;
  return Object.freeze({
    async inspectBoundHead() {
      return Object.freeze({
        qualificationDigest: qualification.qualificationDigest,
        accountPortableStateDigest: committedDigest ?? funding.predecessorAccountPortableStateDigest,
        reservePhiMicro: committedDigest ? "0" : phi,
        reserveUsdCents: committedDigest ? "0" : funding.amountUsdCents,
        bankAllocationId: funding.allocationId,
        bankAllocationRail: bankAllocationRail(funding),
        bankAllocationUsdPerPhiMicrocents: funding.usdPerPhiMicrocents,
      });
    },
    async consumeExactSuccessor(split: KairosReserveConsumeExactSuccessorInput) {
      const { qualificationDigest, ...command } = structuredClone(split);
      if (qualificationDigest !== qualification.qualificationDigest
        || split.predecessorAccountPortableStateDigest !== funding.predecessorAccountPortableStateDigest
        || split.reserveBeforePhiMicro !== phi || split.amountPhiMicro !== phi
        || split.reserveBeforeUsdCents !== funding.amountUsdCents || split.amountUsdCents !== funding.amountUsdCents
        || split.usdPerPhiMicrocents !== funding.usdPerPhiMicrocents
        || BigInt(split.acceptedAtKai) < BigInt(funding.fundedAtKai)) throw Error("OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");
      receipt = await signReceizOfflineReserveAndroidConsumption({
        command, custody, fundingArtifactSha256, sign: input.sign, ...options,
      });
      return receipt;
    },
    async commitExactSuccessor(input: { receiptDigest: string; successorAccountProof: ReceizKeyFileV1 }) {
      const proof = structuredClone(input.successorAccountProof);
      if (!receipt || input.receiptDigest !== receipt.receiptDigest
        || proof.portableState?.proof?.digestSha256Hex !== receipt.successorReserveStateContentDigest
        || proof.keyId !== account.keyId || proof.owner.uid !== account.owner.uid
        || proof.crypto.publicKeyRawB64u !== account.crypto.publicKeyRawB64u
        || await verifyReceizIdentityPortableStateProof(proof) !== "verified") {
        throw Error("OFFLINE_RESERVE_SUCCESSOR_PROOF_INVALID");
      }
      committedDigest = receipt.successorReserveStateContentDigest;
    },
  });
}

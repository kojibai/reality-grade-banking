import { readBankLocalCreditJournalHead, type BankLocalCreditJournalHead } from "./bankNotes/localCreditJournal";
import { prepareBankCashAccountRebase, verifyBankCashAccountRebase, bankCashRebaseChallenge, type BankCashAccountRebaseReceipt } from "./bankNotes/cashAccountRebase";
import { readBankLocalAccountCredit, verifyBankLocalCreditAccountSuccessor, type BankLocalAccountCreditEvidence } from "./bankNotes/localAccountCredit";
import { readBankFundedNoteHead } from "./bankNotes/fundedNote";
import type { KairosNotePwaCustodyState } from "./kairosNotePwaCustodyAdapter";
import { isBankSettlementAllocationEvidence, type BankSettlementAllocationEvidence } from "./bankNotes/settlementAllocation";
import { openBankSettlementAllocationCashSnapshot } from "./bankNotes/settlementCashSnapshot";
import { parseReceizIdentityArtifactText } from "../../../packages/receiz-sdk/src/identity";
import {isBankReserveAllocationEvidence,type BankReserveAllocationEvidence} from "./bankNotes/allocation";
import {openBankAllocationCashSnapshot} from "./bankNotes/cashSnapshot";
import { assertReserveAccountSourcePreserved } from "./kairosReserveAccountSuccessor";
import { digestReceizAuthority } from "../../../packages/receiz-sdk/src/authorityEncoding";
import {
  createReceizOfflineNoteCustodyQualification,
  verifyReceizOfflineNoteCustodyQualification,
  type ReceizOfflineNoteCustodyQualificationV1,
} from "../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import {
  finalizeReceizOfflineReserveWebAuthnConsumptionReceipt,
  prepareReceizOfflineReserveWebAuthnConsumptionChallenge,
  type ReceizOfflineReserveWebAuthnConsumptionReceiptV1,
} from "../../../packages/receiz-sdk/src/offlineReserveWebAuthnCustody";
import type { KairosNotePwaCredential, KairosNotePwaWebAuthnClient } from "./kairosNotePwaCustodyAdapter";
import {
  verifyReceizIdentityPortableStateProof,
  type ReceizKeyFileV1,
} from "../../../packages/receiz-sdk/src/identity";
import {
  isRuntimeCustodiedKairosVerifiedOfflineReserveFundingEvidence,
  type KairosVerifiedOfflineReserveFundingEvidence,
} from "./kairosReserveFundingBinding";
import {
  verifyKairosNoteReceivingCustody,
  requireKairosNoteAttestedReceivingCustody,
  type KairosVerifiedReceivingCustody,
} from "./kairosNoteCustodyVerification";
import type { KairosOfflineCashFundingAuthorizationV1 } from "./kairosOfflineCashFundingAuthorization";
import { verifyReserveCreditProof } from "./verifiedReserveCreditProof";

const STATE_SCHEMA = "receiz.offline-reserve.pwa-custody-state.v1" as const;

export type KairosReserveConsumeExactSuccessorInput = Readonly<{
  qualificationDigest: string;
  predecessorAccountPortableStateDigest: string;
  successorReserveStateContentDigest: string;
  noteArtifactSha256: string;
  amountPhiMicro: string;
  amountUsdCents: string;
  usdPerPhiMicrocents: string;
  reserveBeforePhiMicro: string;
  reserveAfterPhiMicro: string;
  reserveBeforeUsdCents: string;
  reserveAfterUsdCents: string;
  acceptedAtKai: string;
  transitionNonce: string;
}>;

export type KairosReserveConsumptionReceiptV1 = ReceizOfflineReserveWebAuthnConsumptionReceiptV1;

type BoundState = Readonly<{
  schema: typeof STATE_SCHEMA;
  status: "bound";
  credential: KairosNotePwaCredential;
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  accountPortableStateDigest: string;
  accountProof?: ReceizKeyFileV1;
  reservePhiMicro?: string;
  reserveUsdCents: string;
  bankAccountRebases?: readonly BankCashAccountRebaseReceipt[];
  bankAllocationId?: string;
  bankAllocationRail?: "reserve" | "settlement";
  bankAllocationUsdPerPhiMicrocents?: string;
  fundingArtifactSha256?: string;
  fundingBindingDigest?: string;
  fundingPredecessorAccountProof?: ReceizKeyFileV1;
  lastCommittedInput?: KairosReserveConsumeExactSuccessorInput;
  lastCommittedReceipt?: KairosReserveConsumptionReceiptV1;
  lastSuccessorAccountPortableStateDigest?: string;
}>;

type FundingPreparedState = Readonly<{
  schema: typeof STATE_SCHEMA;
  status: "funding-prepared";
  credential: KairosNotePwaCredential;
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  receivingCustody: KairosVerifiedReceivingCustody;
  predecessorAccountProof?: ReceizKeyFileV1;
  fundingAuthorization?: KairosOfflineCashFundingAuthorizationV1;
}>;

type PendingState = Readonly<{
  schema: typeof STATE_SCHEMA;
  status: "pending";
  credential: KairosNotePwaCredential;
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  input: KairosReserveConsumeExactSuccessorInput;
  intentDigest: string;
  receipt: KairosReserveConsumptionReceiptV1;
  accountProof?: ReceizKeyFileV1;
  bankAccountRebases?: readonly BankCashAccountRebaseReceipt[];
  bankAllocationId?: string;
  bankAllocationRail?: "reserve" | "settlement";
  bankAllocationUsdPerPhiMicrocents?: string;
  fundingArtifactSha256?: string;
  fundingBindingDigest?: string;
  fundingPredecessorAccountProof?: ReceizKeyFileV1;
}>;

type RetiredState = Readonly<{
  schema: typeof STATE_SCHEMA;
  status: "retired";
  credential: KairosNotePwaCredential;
  qualification: ReceizOfflineNoteCustodyQualificationV1;
  code: "OFFLINE_RESERVE_CUSTODY_ROLLBACK_DETECTED";
}>;

export type KairosReservePwaCustodyState = FundingPreparedState | BoundState | PendingState | RetiredState;

export interface KairosReservePwaCustodyStorage {
  read(): Promise<KairosReservePwaCustodyState | null>;
  write(state: KairosReservePwaCustodyState): Promise<void>;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function canonicalUint(value: unknown): bigint | null {
  const text = String(value ?? "").trim();
  return /^(0|[1-9]\d*)$/.test(text) ? BigInt(text) : null;
}

function accountReserveProjection(
  proof: ReceizKeyFileV1,
): Readonly<{
  userId: string;
  reserveUsdCents: bigint;
  reservePhiMicro: bigint;
  usdPerPhiMicrocents: bigint;
}> | null {
  const snapshot = record(proof.portableState?.snapshot);
  const account = record(snapshot?.account);
  const wallet = record(snapshot?.wallet);
  const summary = record(wallet?.routeSummary);
  const valueStates = record(summary?.valueStates);
  const quote = record(summary?.quote);
  const userId = typeof account?.userId === "string" ? account.userId.trim() : "";
  const summaryUserId = typeof summary?.userId === "string" ? summary.userId.trim() : "";
  const reserveUsdCents = canonicalUint(valueStates?.settledBalanceUsdCents);
  const usdPerPhiMicrocents = canonicalUint(quote?.usdPerPhiMicrocents);
  if (proof.portableState?.schema !== "receiz.account.state.v3"
    || snapshot?.schema !== "receiz.account.state.v3"
    || !userId || userId !== summaryUserId
    || reserveUsdCents === null
    || usdPerPhiMicrocents === null || usdPerPhiMicrocents <= 0n) return null;
  const reservePhiMicro = (reserveUsdCents * 1_000_000_000_000n) / usdPerPhiMicrocents;
  if ((reservePhiMicro * usdPerPhiMicrocents + 500_000_000_000n) / 1_000_000_000_000n
    !== reserveUsdCents) return null;
  return Object.freeze({ userId, reserveUsdCents, reservePhiMicro, usdPerPhiMicrocents });
}

export async function verifyExactFundedAccountSuccessor(args: Readonly<{
  funding: KairosVerifiedOfflineReserveFundingEvidence["funding"];
  predecessorAccountProof: ReceizKeyFileV1;
  successorAccountProof: ReceizKeyFileV1;
}>): Promise<Readonly<{
  successorDigest: string;
  reserveUsdCents: string;
  reservePhiMicro: string;
}>> {
  const predecessor = args.predecessorAccountProof;
  const successor = args.successorAccountProof;
  const predecessorDigest = predecessor.portableState?.proof?.digestSha256Hex ?? "";
  const successorDigest = successor.portableState?.proof?.digestSha256Hex ?? "";
  if (await verifyReceizIdentityPortableStateProof(predecessor) !== "verified"
    || await verifyReceizIdentityPortableStateProof(successor) !== "verified"
    || predecessorDigest !== args.funding.predecessorAccountPortableStateDigest
    || !successorDigest || successorDigest === predecessorDigest
    || predecessor.keyId !== args.funding.receizKeyId
    || successor.keyId !== predecessor.keyId
    || successor.alg !== predecessor.alg
    || successor.crypto.publicKeyRawB64u !== predecessor.crypto.publicKeyRawB64u
    || successor.owner.uid !== predecessor.owner.uid) {
    throw new Error("OFFLINE_RESERVE_FUNDING_ACCOUNT_SUCCESSOR_REQUIRED");
  }
  assertReserveAccountSourcePreserved(predecessor, successor);
  const before = accountReserveProjection(predecessor);
  const after = accountReserveProjection(successor);
  const fundedUsdCents = BigInt(args.funding.amountUsdCents);
  const fundedPhiMicro = BigInt(args.funding.fundedReservePhiMicro);
  if (!before || !after
    || before.userId !== args.funding.accountUserId
    || after.userId !== before.userId
    || before.usdPerPhiMicrocents !== BigInt(args.funding.usdPerPhiMicrocents)
    || after.usdPerPhiMicrocents !== before.usdPerPhiMicrocents
    || after.reserveUsdCents - before.reserveUsdCents !== fundedUsdCents
    || after.reservePhiMicro - before.reservePhiMicro !== fundedPhiMicro) {
    throw new Error("OFFLINE_RESERVE_FUNDING_ACCOUNT_SUCCESSOR_REQUIRED");
  }
  return Object.freeze({
    successorDigest,
    reserveUsdCents: after.reserveUsdCents.toString(),
    reservePhiMicro: after.reservePhiMicro.toString(),
  });
}

export function createKairosReserveMemoryPwaCustodyStorage(initial: KairosReservePwaCustodyState | null = null) {
  let state = initial ? structuredClone(initial) : null;
  return Object.freeze({
    async read() { return state ? structuredClone(state) : null; },
    async write(next: KairosReservePwaCustodyState) { state = structuredClone(next); },
  });
}

export function createKairosReservePwaCustodyAdapter(input: Readonly<{
  webAuthn: KairosNotePwaWebAuthnClient;
  storage: KairosReservePwaCustodyStorage;
  attestationRoots?: ReadonlyMap<string, import("../../../packages/receiz-sdk/src/verifier/signatureV4").ReceizSignatureV4RootPublicKey>;
}>) {
  return Object.freeze({
    async prepareFundingCustody(args: Readonly<{
      credential: KairosNotePwaCredential;
      qualification: ReceizOfflineNoteCustodyQualificationV1;
      receivingCustody: KairosVerifiedReceivingCustody;
      predecessorAccountProof?: ReceizKeyFileV1;
      fundingAuthorization?: KairosOfflineCashFundingAuthorizationV1;
    }>) {
      const existing = await input.storage.read();
      if (existing) throw new Error("OFFLINE_RESERVE_LEGACY_OR_ALREADY_BOUND");
      const qualification = await verifyReceizOfflineNoteCustodyQualification(args.qualification);
      const receivingCustody = await verifyKairosNoteReceivingCustody(args.receivingCustody, { roots: input.attestationRoots });
      if (args.credential.custodyPublicKeyRawB64u !== qualification.custodyPublicKeyRawB64u
        || receivingCustody.qualificationDigest !== qualification.qualificationDigest
        || receivingCustody.installationCommitment !== qualification.installationCommitment) {
        throw new Error("OFFLINE_RESERVE_PRESELECTED_CUSTODY_REQUIRED");
      }
      if (args.predecessorAccountProof
        && await verifyReceizIdentityPortableStateProof(args.predecessorAccountProof) !== "verified") {
        throw new Error("OFFLINE_RESERVE_VERIFIED_ACCOUNT_STATE_V3_REQUIRED");
      }
      await input.storage.write(Object.freeze({
        schema: STATE_SCHEMA, status: "funding-prepared", credential: structuredClone(args.credential),
        qualification, receivingCustody,
        ...(args.predecessorAccountProof
          ? { predecessorAccountProof: structuredClone(args.predecessorAccountProof) }
          : {}),
        ...(args.fundingAuthorization
          ? { fundingAuthorization: structuredClone(args.fundingAuthorization) }
          : {}),
      }));
      return receivingCustody;
    },

    async activateBankAllocatedReserve(args: Readonly<{evidence:BankReserveAllocationEvidence;privateCashSnapshot:Uint8Array}>):Promise<void> {
      if(!isBankReserveAllocationEvidence(args.evidence))throw Error("BANK_ALLOCATION_CUSTODY_REQUIRED");
      const funding=args.evidence.funding,opening=await openBankAllocationCashSnapshot(args.evidence,args.privateCashSnapshot);
      const state=await input.storage.read();
      if(state?.status==="bound"&&state.bankAllocationId===funding.allocationId&&state.fundingArtifactSha256===args.evidence.artifactSha256)return;
      if(!state||state.status!=="funding-prepared"||!state.predecessorAccountProof)throw Error("OFFLINE_RESERVE_PRESELECTED_CUSTODY_REQUIRED");
      const proof=state.predecessorAccountProof,projection=accountReserveProjection(proof);
      if(await verifyReceizIdentityPortableStateProof(proof)!=="verified"||!projection
        ||proof.keyId!==funding.receizKeyId||proof.portableState?.proof?.digestSha256Hex!==funding.predecessorAccountPortableStateDigest
        ||projection.userId!==funding.accountUserId||projection.reserveUsdCents.toString()!==opening.reserveBeforeUsdCents
        ||projection.reserveUsdCents<BigInt(funding.amountUsdCents)
        ||state.qualification.qualificationDigest!==funding.qualificationDigest
        ||state.receivingCustody.installationCommitment!==funding.installationCommitment
        ||state.receivingCustody.receivingCustodyCommitmentDigest!==funding.receivingCustodyCommitmentDigest)throw Error("OFFLINE_RESERVE_FUNDING_BINDING_MISMATCH");
      await input.storage.write(Object.freeze({schema:STATE_SCHEMA,status:"bound",credential:state.credential,qualification:state.qualification,accountPortableStateDigest:funding.predecessorAccountPortableStateDigest,accountProof:structuredClone(proof),reservePhiMicro:funding.fundedReservePhiMicro,reserveUsdCents:funding.amountUsdCents,bankAllocationId:funding.allocationId,bankAllocationRail:"reserve",bankAllocationUsdPerPhiMicrocents:funding.usdPerPhiMicrocents,fundingArtifactSha256:args.evidence.artifactSha256,fundingBindingDigest:funding.allocationId,fundingPredecessorAccountProof:structuredClone(proof)}));
    },

    /** The qualified custody kernel reserves exact Phi for note issuance. Its
     * internal reserve budget is distinct from the user's USD Reserve rail. */
    async activateBankAllocatedSettlement(args: Readonly<{ evidence: BankSettlementAllocationEvidence; privateCashSnapshot: Uint8Array }>): Promise<void> {
      if (!isBankSettlementAllocationEvidence(args.evidence)) throw Error("BANK_ALLOCATION_CUSTODY_REQUIRED");
      const funding = args.evidence.funding;
      const opening = await openBankSettlementAllocationCashSnapshot(args.evidence, args.privateCashSnapshot);
      const state = await input.storage.read();
      if (state?.status === "bound" && state.bankAllocationRail === "settlement" && state.bankAllocationId === funding.allocationId && state.fundingArtifactSha256 === args.evidence.artifactSha256) return;
      if (!state || state.status !== "funding-prepared" || !state.predecessorAccountProof) throw Error("OFFLINE_RESERVE_PRESELECTED_CUSTODY_REQUIRED");
      const proof = parseReceizIdentityArtifactText(JSON.stringify(state.predecessorAccountProof));
      const projection = accountReserveProjection(proof);
      const summary = record(record(record(proof.portableState?.snapshot)?.wallet)?.routeSummary);
      const totalPhi = canonicalUint(summary?.balancePhiMicro);
      const settlementUsd = canonicalUint(record(summary?.valueStates)?.ecosystemBalanceUsdCents);
      if (await verifyReceizIdentityPortableStateProof(proof) !== "verified" || !projection || totalPhi === null || settlementUsd === null
        || proof.keyId !== funding.receizKeyId || proof.portableState?.proof?.digestSha256Hex !== funding.predecessorAccountPortableStateDigest
        || projection.userId !== funding.accountUserId || projection.reserveUsdCents.toString() !== opening.reserveBeforeUsdCents
        || projection.usdPerPhiMicrocents.toString() !== funding.usdPerPhiMicrocents
        || totalPhi.toString() !== opening.walletBeforePhiMicro || totalPhi - projection.reservePhiMicro < BigInt(funding.fundedSettlementPhiMicro)
        || state.qualification.qualificationDigest !== funding.qualificationDigest
        || state.receivingCustody.installationCommitment !== funding.installationCommitment
        || state.receivingCustody.receivingCustodyCommitmentDigest !== funding.receivingCustodyCommitmentDigest) throw Error("OFFLINE_SETTLEMENT_FUNDING_BINDING_MISMATCH");
      await input.storage.write(Object.freeze({ schema: STATE_SCHEMA, status: "bound", credential: state.credential, qualification: state.qualification,
        accountPortableStateDigest: funding.predecessorAccountPortableStateDigest, accountProof: structuredClone(proof), reservePhiMicro: funding.fundedSettlementPhiMicro,
        reserveUsdCents: funding.amountUsdCents, bankAllocationId: funding.allocationId, bankAllocationRail: "settlement", bankAllocationUsdPerPhiMicrocents: funding.usdPerPhiMicrocents, fundingArtifactSha256: args.evidence.artifactSha256,
        fundingBindingDigest: funding.allocationId, fundingPredecessorAccountProof: structuredClone(proof) }));
    },

    /** Qualification-only native extension. No browser/API route selects this
     * family until the shared writer and offline acceptance suite qualify it. */
    async activateBankLocalAccountCredit(args: Readonly<{
      evidence: BankLocalAccountCreditEvidence;
      predecessorAccountProof: ReceizKeyFileV1;
      successorAccountProof: ReceizKeyFileV1;
      consumedNoteCustody: KairosNotePwaCustodyState;
    }>): Promise<void> {
      const held = readBankLocalAccountCredit(args.evidence), evidence = args.evidence;
      if (held.intent.schema !== "receiz.bank.note-local-credit.v1") throw Error("BANK_LOCAL_CREDIT_SOURCE_REQUIRED");
      const wallet=record(record(args.successorAccountProof.portableState?.snapshot)?.wallet);
      const version=record(wallet?.localNoteCreditValuationVersions)?.[evidence.creditId];
      if(version!==undefined&&version!=="exact-rail-phi-v1")throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
      await verifyBankLocalCreditAccountSuccessor({ schema: version==="exact-rail-phi-v1"?"receiz.bank.local-account-credit-preparation.v2":"receiz.bank.local-account-credit-preparation.v1", intent: held.intent,
        predecessorAccountProof: args.predecessorAccountProof, successorAccountProof: args.successorAccountProof });
      const consumed = structuredClone(args.consumedNoteCustody), head = readBankFundedNoteHead(held.note);
      if (head.packet.custodyMode !== "qualified-anonymous") throw Error("BANK_LOCAL_CREDIT_QUALIFIED_SUCCESSOR_REQUIRED");
      const receiving = head.packet.currentCustody;
      requireKairosNoteAttestedReceivingCustody(receiving);
      if (head.packet.custodyMode !== "qualified-anonymous" || consumed.status !== "retired"
        || consumed.code !== "OFFLINE_NOTE_CUSTODY_IRREVERSIBLY_CONSUMED"
        || consumed.consumptionReceipt?.receiptDigest !== held.receipt.receiptDigest
        || consumed.credential.custodyPublicKeyRawB64u !== evidence.qualification.custodyPublicKeyRawB64u
        || consumed.credential.credentialIdB64u !== receiving.platformAttestationCertificate.credentialIdB64u
        || consumed.credential.origin !== held.receipt.origin || consumed.credential.rpId !== held.receipt.rpId) throw Error("BANK_LOCAL_CREDIT_QUALIFIED_SUCCESSOR_REQUIRED");
      const existing = await input.storage.read();
      if (existing) {
        if (existing.status === "bound" && existing.bankAllocationId === evidence.creditId
          && existing.fundingArtifactSha256 === evidence.artifactSha256
          && existing.accountPortableStateDigest === evidence.successorAccountPortableStateDigest) return;
        throw Error("BANK_LOCAL_CREDIT_CUSTODY_ALREADY_BOUND");
      }
      await input.storage.write(Object.freeze({ schema: STATE_SCHEMA, status: "bound", credential: consumed.credential,
        qualification: evidence.qualification, accountPortableStateDigest: evidence.successorAccountPortableStateDigest,
        accountProof: structuredClone(args.successorAccountProof), reservePhiMicro: evidence.amountPhiMicro,
        reserveUsdCents: evidence.amountUsdCents, bankAllocationId: evidence.creditId, bankAllocationRail: evidence.rail,
        bankAllocationUsdPerPhiMicrocents: evidence.usdPerPhiMicrocents, fundingArtifactSha256: evidence.artifactSha256,
        fundingBindingDigest: evidence.creditId, fundingPredecessorAccountProof: structuredClone(args.predecessorAccountProof) }));
    },

    async activateFundedReserve(args: Readonly<{
      evidence: KairosVerifiedOfflineReserveFundingEvidence;
      successorAccountProof: ReceizKeyFileV1;
    }>): Promise<void> {
      if (!isRuntimeCustodiedKairosVerifiedOfflineReserveFundingEvidence(args.evidence)) {
        throw new Error("OFFLINE_RESERVE_CANONICAL_FUNDING_PROOF_REQUIRED");
      }
      const state = await input.storage.read();
      if (state?.status === "bound") {
        const successorDigest = args.successorAccountProof.portableState?.proof?.digestSha256Hex ?? "";
        if (state.fundingArtifactSha256 === args.evidence.artifactSha256
          && state.fundingBindingDigest === args.evidence.funding.fundingBindingDigest
          && state.accountPortableStateDigest === successorDigest
          && await verifyReceizIdentityPortableStateProof(args.successorAccountProof) === "verified") {
          return;
        }
        throw new Error("OFFLINE_RESERVE_FUNDING_EVENT_ALREADY_ACTIVATED");
      }
      if (!state || state.status !== "funding-prepared") {
        throw new Error("OFFLINE_RESERVE_PRESELECTED_CUSTODY_REQUIRED");
      }
      const funding = args.evidence.funding;
      if (!state.predecessorAccountProof) {
        throw new Error("OFFLINE_RESERVE_VERIFIED_ACCOUNT_STATE_V3_REQUIRED");
      }
      const accountSuccessor = await verifyExactFundedAccountSuccessor({
        funding,
        predecessorAccountProof: state.predecessorAccountProof,
        successorAccountProof: args.successorAccountProof,
      });
      if (funding.qualificationDigest !== state.qualification.qualificationDigest
        || funding.installationCommitment !== state.receivingCustody.installationCommitment
        || funding.predecessorAccountPortableStateDigest === accountSuccessor.successorDigest) {
        throw new Error("OFFLINE_RESERVE_FUNDING_BINDING_MISMATCH");
      }
      await input.storage.write(Object.freeze({
        schema: STATE_SCHEMA, status: "bound", credential: state.credential,
        qualification: state.qualification,
        accountPortableStateDigest: accountSuccessor.successorDigest,
        accountProof: structuredClone(args.successorAccountProof),
        reservePhiMicro: accountSuccessor.reservePhiMicro,
        reserveUsdCents: accountSuccessor.reserveUsdCents,
        fundingArtifactSha256: args.evidence.artifactSha256,
        fundingBindingDigest: funding.fundingBindingDigest,
        fundingPredecessorAccountProof: structuredClone(state.predecessorAccountProof),
      }));
    },

    async activateVerifiedReserveHead(args: Readonly<{
      accountProof: ReceizKeyFileV1;
      reserveCreditProof: unknown;
    }>): Promise<void> {
      const state = await input.storage.read();
      if (!state || state.status !== "funding-prepared") {
        throw new Error("OFFLINE_RESERVE_PRESELECTED_CUSTODY_REQUIRED");
      }
      if (await verifyReceizIdentityPortableStateProof(args.accountProof) !== "verified") {
        throw new Error("OFFLINE_RESERVE_VERIFIED_ACCOUNT_STATE_V3_REQUIRED");
      }
      const projection = accountReserveProjection(args.accountProof);
      if (!projection) throw new Error("OFFLINE_RESERVE_VERIFIED_ACCOUNT_STATE_V3_REQUIRED");
      const fundingProof = await verifyReserveCreditProof(args.reserveCreditProof, projection.userId);
      const snapshot = record(args.accountProof.portableState?.snapshot);
      const wallet = record(snapshot?.wallet);
      const summary = record(wallet?.routeSummary);
      const sync = record(summary?.sync);
      const acceptedSettlementIds = Array.isArray(sync?.acceptedSettlementIds)
        ? sync.acceptedSettlementIds.map((value) => String(value ?? "").trim()).filter(Boolean)
        : [];
      const carriedProofs = Array.isArray(wallet?.reserveFundingProofs) ? wallet.reserveFundingProofs : [];
      const carriesExactProof = carriedProofs.some((value) => {
        const candidate = record(value);
        return record(candidate?.proofBundle)?.bundleHash === fundingProof.proofBundle.bundleHash;
      });
      if (!carriesExactProof
        || !acceptedSettlementIds.includes(fundingProof.settlementId)
        || projection.reserveUsdCents < BigInt(fundingProof.amountUsdCents)
        || projection.usdPerPhiMicrocents !== BigInt(fundingProof.usdPerPhiMicrocents)) {
        throw new Error("OFFLINE_RESERVE_VERIFIED_FUNDING_PROOF_REQUIRED");
      }
      await input.storage.write(Object.freeze({
        schema: STATE_SCHEMA,
        status: "bound",
        credential: state.credential,
        qualification: state.qualification,
        accountPortableStateDigest: args.accountProof.portableState!.proof!.digestSha256Hex,
        accountProof: structuredClone(args.accountProof),
        reservePhiMicro: projection.reservePhiMicro.toString(),
        reserveUsdCents: projection.reserveUsdCents.toString(),
        fundingArtifactSha256: fundingProof.proofBundle.bundleHash,
        fundingBindingDigest: fundingProof.proofBundle.capsuleHash,
      }));
    },

    async rebaseBankAccount(args: Readonly<{ head: BankLocalCreditJournalHead; acceptedAtKai: string; nonce: string }>) {
      const successor = await readBankLocalCreditJournalHead(args.head), state = await input.storage.read();
      if (!state || state.status !== "bound" || !state.accountProof || !state.bankAllocationId || !state.fundingArtifactSha256 || state.reservePhiMicro === undefined) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_SOURCE_REQUIRED");
      const previous = parseReceizIdentityArtifactText(JSON.stringify(state.accountProof));
      const priorAccount = record(record(previous.portableState?.snapshot)?.account);
      const nextAccount = record(record(successor.portableState?.snapshot)?.account);
      if (await verifyReceizIdentityPortableStateProof(previous) !== "verified" || await verifyReceizIdentityPortableStateProof(successor) !== "verified"
        || previous.portableState?.proof?.digestSha256Hex !== state.accountPortableStateDigest
        || successor.keyId !== previous.keyId || successor.owner.uid !== previous.owner.uid || successor.alg !== previous.alg
        || successor.crypto.publicKeyRawB64u !== previous.crypto.publicKeyRawB64u || args.head.keyId !== previous.keyId
        || priorAccount?.userId !== args.head.userId || nextAccount?.userId !== args.head.userId) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
      const last = state.bankAccountRebases?.at(-1);
      if (state.accountPortableStateDigest === args.head.digest && last?.successorAccountPortableStateDigest === args.head.digest) return structuredClone(last);
      const prepared = await prepareBankCashAccountRebase({schema:"receiz.bank.cash-account-head-rebase.v1",fundingArtifactSha256:state.fundingArtifactSha256,
        qualificationDigest:state.qualification.qualificationDigest,installationCommitment:state.qualification.installationCommitment,custodyPublicKeyRawB64u:state.credential.custodyPublicKeyRawB64u,
        rpId:state.credential.rpId,origin:state.credential.origin,predecessorAccountPortableStateDigest:state.accountPortableStateDigest,successorAccountPortableStateDigest:args.head.digest,
        reservePhiMicro:state.reservePhiMicro,reserveUsdCents:state.reserveUsdCents,expectedStateCommitment:state.qualification.stateCommitment,expectedStateSequence:state.qualification.stateSequence,
        nextStateSequence:String(BigInt(state.qualification.stateSequence)+1n),acceptedAtKai:args.acceptedAtKai,nonce:args.nonce});
      const accountKai = record(record(record(successor.portableState?.snapshot)?.wallet)?.routeSummary);
      const latestKai = record(accountKai?.rollup)?.lastEntryKaiPulse;
      if (!/^(0|[1-9][0-9]*)$/.test(args.acceptedAtKai) || typeof latestKai !== "string" || BigInt(args.acceptedAtKai) < BigInt(latestKai)
        || state.lastCommittedReceipt && BigInt(args.acceptedAtKai) <= BigInt(state.lastCommittedReceipt.acceptedAtKai)
        || last && BigInt(args.acceptedAtKai) < BigInt(last.acceptedAtKai)) throw Error("BANK_CASH_ACCOUNT_REBASE_INVALID");
      await readBankLocalCreditJournalHead(args.head);
      const assertion = await input.webAuthn.assert({credentialIdB64u:state.credential.credentialIdB64u,challengeB64u:bankCashRebaseChallenge(prepared.receiptDigest)});
      const receipt = Object.freeze({...prepared,...assertion});
      const qualification = await verifyBankCashAccountRebase(receipt,{qualification:state.qualification,fundingArtifactSha256:state.fundingArtifactSha256,rpId:state.credential.rpId,origin:state.credential.origin,
        accountHead:state.accountPortableStateDigest,reservePhiMicro:state.reservePhiMicro,reserveUsdCents:state.reserveUsdCents});
      await input.storage.write(Object.freeze({...state,qualification,accountPortableStateDigest:args.head.digest,accountProof:successor,bankAccountRebases:[...(state.bankAccountRebases??[]),receipt]}));
      return receipt;
    },

    async inspectBoundHead() {
      const state = await input.storage.read();
      if (!state || state.status !== "bound") return null;
      return Object.freeze({
        qualificationDigest: state.qualification.qualificationDigest,
        accountPortableStateDigest: state.accountPortableStateDigest,
        accountProof: state.accountProof ? structuredClone(state.accountProof) : undefined,
        reservePhiMicro: state.reservePhiMicro,
        reserveUsdCents: state.reserveUsdCents,
        bankAccountRebases: state.bankAccountRebases,
        bankAllocationId: state.bankAllocationId,
        bankAllocationRail: state.bankAllocationRail,
        bankAllocationUsdPerPhiMicrocents: state.bankAllocationUsdPerPhiMicrocents,
        fundingArtifactSha256: state.fundingArtifactSha256,
        fundingBindingDigest: state.fundingBindingDigest,
        fundingPredecessorAccountProof: state.fundingPredecessorAccountProof ? structuredClone(state.fundingPredecessorAccountProof) : undefined,
      });
    },

    async inspectFundingPrepared() {
      const state = await input.storage.read();
      if (!state || state.status !== "funding-prepared" || !state.predecessorAccountProof) return null;
      return Object.freeze({
        credential: structuredClone(state.credential),
        qualification: structuredClone(state.qualification),
        receivingCustody: structuredClone(state.receivingCustody),
        predecessorAccountProof: structuredClone(state.predecessorAccountProof),
        fundingAuthorization: state.fundingAuthorization
          ? structuredClone(state.fundingAuthorization)
          : undefined,
      });
    },

    async consumeExactSuccessor(
      split: KairosReserveConsumeExactSuccessorInput,
    ): Promise<KairosReserveConsumptionReceiptV1> {
      const state = await input.storage.read();
      if (!state) throw new Error("OFFLINE_RESERVE_QUALIFIED_CUSTODY_REQUIRED");
      if (state.status === "funding-prepared") throw new Error("OFFLINE_RESERVE_FUNDING_PROOF_REQUIRED");
      if (state.status === "retired") throw new Error("OFFLINE_RESERVE_CUSTODY_ROLLBACK_DETECTED");
      if (state.status === "bound" && state.lastCommittedInput && state.lastCommittedReceipt) {
        const digest = await digestReceizAuthority("transition", "receiz.offline-reserve.split-intent.v1", split);
        const committedDigest = await digestReceizAuthority(
          "transition", "receiz.offline-reserve.split-intent.v1", state.lastCommittedInput,
        );
        if (digest === committedDigest) return state.lastCommittedReceipt;
      }
      if (state.status === "pending") {
        const digest = await digestReceizAuthority("transition", "receiz.offline-reserve.split-intent.v1", split);
        if (digest === state.intentDigest) return state.receipt;
        throw new Error("OFFLINE_RESERVE_EXACT_HEAD_CONSUMED");
      }
      if (state.qualification.qualificationDigest !== split.qualificationDigest
        || state.accountPortableStateDigest !== split.predecessorAccountPortableStateDigest
        || state.reserveUsdCents !== split.reserveBeforeUsdCents
        || (state.reservePhiMicro !== undefined && state.reservePhiMicro !== split.reserveBeforePhiMicro)) {
        throw new Error("OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");
      }
      const intentDigest = await digestReceizAuthority(
        "transition", "receiz.offline-reserve.split-intent.v1", split,
      );
      const nextSequence = String(BigInt(state.qualification.stateSequence) + 1n);
      const nextCommitment = await digestReceizAuthority(
        "transition", STATE_SCHEMA, {
          previousStateCommitment: state.qualification.stateCommitment,
          nextSequence,
          intentDigest,
          successorReserveStateContentDigest: split.successorReserveStateContentDigest,
          noteArtifactSha256: split.noteArtifactSha256,
        },
      );
      const prepared = await prepareReceizOfflineReserveWebAuthnConsumptionChallenge({
        qualification: state.qualification,
        ...split,
        expectedReserveStateCommitment: state.qualification.stateCommitment,
        nextReserveStateCommitment: nextCommitment,
        expectedReserveStateSequence: state.qualification.stateSequence,
        nextReserveStateSequence: nextSequence,
        rpId: state.credential.rpId,
        origin: state.credential.origin,
      });
      try {
        const assertion = await input.webAuthn.assert({
          credentialIdB64u: state.credential.credentialIdB64u,
          challengeB64u: prepared.challengeB64u,
        });
        const receipt = await finalizeReceizOfflineReserveWebAuthnConsumptionReceipt({ prepared, ...assertion });
        const nextQualification = await createReceizOfflineNoteCustodyQualification({
          profileId: state.qualification.profileId,
          profileEvidenceDigest: state.qualification.profileEvidenceDigest,
          adapterKind: state.qualification.adapterKind,
          custodyPublicKeyRawB64u: state.qualification.custodyPublicKeyRawB64u,
          stateCommitment: receipt.nextReserveStateCommitment,
          stateSequence: receipt.nextReserveStateSequence,
        });
        await input.storage.write(Object.freeze({
          schema: STATE_SCHEMA, status: "pending", credential: state.credential,
          qualification: nextQualification, input: split, intentDigest, receipt,
          accountProof: state.accountProof ? structuredClone(state.accountProof) : undefined,
          bankAccountRebases: state.bankAccountRebases,
        bankAllocationId: state.bankAllocationId,
          bankAllocationRail: state.bankAllocationRail,
          bankAllocationUsdPerPhiMicrocents: state.bankAllocationUsdPerPhiMicrocents,
          fundingArtifactSha256: state.fundingArtifactSha256,
          fundingBindingDigest: state.fundingBindingDigest,
          fundingPredecessorAccountProof: state.fundingPredecessorAccountProof ? structuredClone(state.fundingPredecessorAccountProof) : undefined,
        }));
        return receipt;
      } catch {
        await input.storage.write(Object.freeze({
          schema: STATE_SCHEMA, status: "retired", credential: state.credential,
          qualification: state.qualification, code: "OFFLINE_RESERVE_CUSTODY_ROLLBACK_DETECTED",
        }));
        throw new Error("OFFLINE_RESERVE_CUSTODY_ROLLBACK_DETECTED");
      }
    },

    async commitExactSuccessor(args: Readonly<{
      receiptDigest: string;
      successorAccountProof: ReceizKeyFileV1;
    }>): Promise<void> {
      const successorAccountPortableStateDigest = args.successorAccountProof.portableState?.proof?.digestSha256Hex ?? "";
      if (!successorAccountPortableStateDigest
        || await verifyReceizIdentityPortableStateProof(args.successorAccountProof) !== "verified") {
        throw new Error("OFFLINE_RESERVE_SUCCESSOR_PROOF_INVALID");
      }
      const state = await input.storage.read();
      if (state?.status === "bound"
        && state.lastCommittedReceipt?.receiptDigest === args.receiptDigest
        && state.lastSuccessorAccountPortableStateDigest === successorAccountPortableStateDigest) {
        return;
      }
      if (!state || state.status !== "pending" || state.receipt.receiptDigest !== args.receiptDigest) {
        throw new Error("OFFLINE_RESERVE_PENDING_SPLIT_REQUIRED");
      }
      if (state.input.successorReserveStateContentDigest !== successorAccountPortableStateDigest
        || state.accountProof && (
          state.accountProof.keyId !== args.successorAccountProof.keyId
          || state.accountProof.alg !== args.successorAccountProof.alg
          || state.accountProof.crypto.publicKeyRawB64u !== args.successorAccountProof.crypto.publicKeyRawB64u
          || state.accountProof.owner.uid !== args.successorAccountProof.owner.uid
        )) {
        throw new Error("OFFLINE_RESERVE_SUCCESSOR_PROOF_INVALID");
      }
      await input.storage.write(Object.freeze({
        schema: STATE_SCHEMA, status: "bound", credential: state.credential,
        qualification: state.qualification,
        accountPortableStateDigest: successorAccountPortableStateDigest,
        accountProof: structuredClone(args.successorAccountProof),
        reservePhiMicro: state.input.reserveAfterPhiMicro,
        reserveUsdCents: state.input.reserveAfterUsdCents,
        bankAccountRebases: state.bankAccountRebases,
        bankAllocationId: state.bankAllocationId,
        bankAllocationRail: state.bankAllocationRail,
        bankAllocationUsdPerPhiMicrocents: state.bankAllocationUsdPerPhiMicrocents,
        fundingArtifactSha256: state.fundingArtifactSha256,
        fundingBindingDigest: state.fundingBindingDigest,
        fundingPredecessorAccountProof: state.fundingPredecessorAccountProof ? structuredClone(state.fundingPredecessorAccountProof) : undefined,
        lastCommittedInput: state.input,
        lastCommittedReceipt: state.receipt,
        lastSuccessorAccountPortableStateDigest: successorAccountPortableStateDigest,
      }));
    },
  });
}

export type KairosReservePwaCustodyAdapter = ReturnType<typeof createKairosReservePwaCustodyAdapter>;

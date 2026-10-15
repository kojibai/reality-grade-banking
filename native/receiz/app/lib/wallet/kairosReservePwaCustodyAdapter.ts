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
  bankAllocationId?: string;
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
  bankAllocationId?: string;
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
      await input.storage.write(Object.freeze({schema:STATE_SCHEMA,status:"bound",credential:state.credential,qualification:state.qualification,accountPortableStateDigest:funding.predecessorAccountPortableStateDigest,accountProof:structuredClone(proof),reservePhiMicro:funding.fundedReservePhiMicro,reserveUsdCents:funding.amountUsdCents,bankAllocationId:funding.allocationId,fundingArtifactSha256:args.evidence.artifactSha256,fundingBindingDigest:funding.allocationId,fundingPredecessorAccountProof:structuredClone(proof)}));
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

    async inspectBoundHead() {
      const state = await input.storage.read();
      if (!state || state.status !== "bound") return null;
      return Object.freeze({
        qualificationDigest: state.qualification.qualificationDigest,
        accountPortableStateDigest: state.accountPortableStateDigest,
        accountProof: state.accountProof ? structuredClone(state.accountProof) : undefined,
        reservePhiMicro: state.reservePhiMicro,
        reserveUsdCents: state.reserveUsdCents,
        bankAllocationId: state.bankAllocationId,
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
          bankAllocationId: state.bankAllocationId,
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
        bankAllocationId: state.bankAllocationId,
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

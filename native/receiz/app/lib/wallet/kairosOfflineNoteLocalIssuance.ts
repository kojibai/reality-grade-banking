"use client";

import type { ReceizAdmissionStore } from "../../../packages/receiz-sdk/src/admissionStore";
import { digestReceizAuthority } from "../../../packages/receiz-sdk/src/authorityEncoding";
import {
  appendReceizIdentityPortableState,
  readReceizIdentityArtifact,
  serializeReceizIdentityArtifact,
  verifyReceizIdentityPortableStateProof,
  type ReceizKeyFileV1,
} from "../../../packages/receiz-sdk/src/identity";
import type { ReceizSignatureV4RootPublicKey } from "../../../packages/receiz-sdk/src/verifier/signatureV4";
import { sha256Hex } from "../../utils/sha256";
import { prepareKairosNoteQualifiedGenesisClient } from "./kairosNoteQualifiedGenesisClient";
import { createKairosNotePortableCarrier } from "./kairosNotePortableCarrier";
import type { KairosNotePwaCustodyAdapter } from "./kairosNotePwaCustodyAdapter";
import type {
  KairosReserveConsumeExactSuccessorInput,
  KairosReserveConsumptionReceiptV1,
  KairosReservePwaCustodyAdapter,
} from "./kairosReservePwaCustodyAdapter";
import type { KairosVerifiedReceivingCustody } from "./kairosNoteCustodyVerification";

const STAGE_SCHEMA = "receiz.offline-note.local-issuance-stage.v1" as const;
const PROOF_CUSTODY_SCHEMA = "receiz.offline-note.local-proof-custody.v1" as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PreparedNote = Awaited<ReturnType<typeof prepareKairosNoteQualifiedGenesisClient>>;

type IssuanceStage = Readonly<{
  schema: typeof STAGE_SCHEMA;
  preparationId: string;
  intentDigest: string;
  phase: "prepared" | "consumed" | "completed";
  predecessorAccountPortableStateDigest: string;
  successorAccountProof: ReceizKeyFileV1;
  successorAccountProofBytes: Uint8Array;
  successorAccountProofSha256: string;
  receivingCustody: KairosVerifiedReceivingCustody;
  note: PreparedNote;
  reserveInput: KairosReserveConsumeExactSuccessorInput;
  reserveReceipt: KairosReserveConsumptionReceiptV1 | null;
  activationReceiptDigest: string | null;
}>;

export type KairosOfflineNoteCommittedProofCustody = Readonly<{
  schema: typeof PROOF_CUSTODY_SCHEMA;
  preparationId: string;
  intentDigest: string;
  accountUserId: string;
  predecessorAccountPortableStateDigest: string;
  successorAccountPortableStateDigest: string;
  successorAccountProofSha256: string;
  successorAccountProofBytes: Uint8Array;
  noteId: string;
  noteArtifactSha256: string;
  noteArtifactBytes: Uint8Array;
}>;

export interface KairosOfflineNoteProofCustodyStore {
  read(preparationId: string): Promise<KairosOfflineNoteCommittedProofCustody | null>;
  commitExactSuccessors(value: KairosOfflineNoteCommittedProofCustody): Promise<KairosOfflineNoteCommittedProofCustody>;
}

export type KairosOfflineNoteLocalIssuanceResult = Readonly<{
  schema: "receiz.offline-note.local-issuance-result.v1";
  preparationId: string;
  accountSuccessor: Readonly<{
    proof: ReceizKeyFileV1;
    proofBytes: Uint8Array;
    proofSha256: string;
    portableStateDigest: string;
    reserveBeforePhiMicro: string;
    reserveAfterPhiMicro: string;
    reserveBeforeUsdCents: string;
    reserveAfterUsdCents: string;
  }>;
  noteGenesis: Readonly<{
    noteId: string;
    amountPhiMicro: string;
    amountUsdCents: string;
    artifactBytes: Uint8Array;
    artifactSha256: string;
    filename: string;
    activatedInQualifiedCustody: true;
  }>;
  serverRequests: readonly [];
}>;

export type KairosOfflineNoteIssuanceInput = Readonly<{
  preparationId: string;
  accountProof: ReceizKeyFileV1;
  identityPassphrase?: string;
  deviceIdentity: Readonly<{ localUid: string; keyId: string }>;
  accountBinding: Readonly<{ accountUserId: string; receizKeyId: string }>;
  amountPhiMicro: bigint;
  amountUsdCents: bigint;
  usdPerPhiMicrocents: bigint;
  acceptedAtKai: string;
  transitionNonce: string;
  note: Readonly<{
    noteId: string;
    noteToken: string;
    mintedAt: string;
    mintClientNonce: string;
    memo?: string | null;
  }>;
  noteCustody: KairosNotePwaCustodyAdapter;
  reserveCustody: KairosReservePwaCustodyAdapter;
  stageStore: KairosOfflineNoteIssuanceStageStore;
  proofCustody: KairosOfflineNoteProofCustodyStore;
  admissionStore: ReceizAdmissionStore;
  assertSelectedPredecessor?: () => void;
  projectCommittedSuccessors?: (value: KairosOfflineNoteCommittedProofCustody) => Promise<void>;
  admissionRootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>;

export interface KairosOfflineNoteIssuanceStageStore {
  read(preparationId: string): Promise<IssuanceStage | null>;
  write(preparationId: string, value: IssuanceStage): Promise<void>;
}

export function createKairosOfflineNoteMemoryIssuanceStageStore(): KairosOfflineNoteIssuanceStageStore {
  const records = new Map<string, IssuanceStage>();
  return Object.freeze({
    async read(preparationId: string) {
      const value = records.get(preparationId);
      return value === undefined ? null : structuredClone(value);
    },
    async write(preparationId: string, value: IssuanceStage) {
      records.set(preparationId, structuredClone(value));
    },
  });
}

export function createKairosOfflineNoteBrowserIssuanceStageStore(options: Readonly<{
  indexedDB?: IDBFactory;
  databaseName?: string;
}> = {}): KairosOfflineNoteIssuanceStageStore {
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (!factory) throw new Error("OFFLINE_NOTE_ISSUANCE_STAGE_STORAGE_REQUIRED");
  const databaseName = options.databaseName?.trim() || "receiz-offline-note-issuance-stage-v1";
  const open = async () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(databaseName, 1);
    request.onerror = () => reject(request.error ?? new Error("OFFLINE_NOTE_ISSUANCE_STAGE_STORAGE_FAILED"));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("issuance-stage")) {
        request.result.createObjectStore("issuance-stage", { keyPath: "preparationId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
  return Object.freeze({
    async read(preparationId: string) {
      const database = await open();
      try {
        const transaction = database.transaction("issuance-stage", "readonly");
        const value = await idbRequest(transaction.objectStore("issuance-stage").get(preparationId));
        await idbComplete(transaction);
        return value ? structuredClone(value as IssuanceStage) : null;
      } finally {
        database.close();
      }
    },
    async write(preparationId: string, value: IssuanceStage) {
      if (preparationId !== value.preparationId || value.schema !== STAGE_SCHEMA) {
        throw new Error("OFFLINE_NOTE_ISSUANCE_STAGE_INVALID");
      }
      const database = await open();
      try {
        const transaction = database.transaction("issuance-stage", "readwrite");
        const store = transaction.objectStore("issuance-stage");
        const existing = await idbRequest(store.get(preparationId)) as IssuanceStage | undefined;
        if (existing && existing.intentDigest !== value.intentDigest) {
          transaction.abort();
          throw new Error("OFFLINE_NOTE_PREPARATION_CONFLICT");
        }
        store.put(structuredClone(value));
        await idbComplete(transaction);
      } finally {
        database.close();
      }
    },
  });
}

function exactProofCustodyEqual(
  left: KairosOfflineNoteCommittedProofCustody,
  right: KairosOfflineNoteCommittedProofCustody,
): boolean {
  return left.schema === right.schema
    && left.preparationId === right.preparationId
    && left.intentDigest === right.intentDigest
    && left.accountUserId === right.accountUserId
    && left.predecessorAccountPortableStateDigest === right.predecessorAccountPortableStateDigest
    && left.successorAccountPortableStateDigest === right.successorAccountPortableStateDigest
    && left.successorAccountProofSha256 === right.successorAccountProofSha256
    && left.noteId === right.noteId
    && left.noteArtifactSha256 === right.noteArtifactSha256;
}

export function createKairosOfflineNoteMemoryProofCustodyStore(): KairosOfflineNoteProofCustodyStore {
  const records = new Map<string, KairosOfflineNoteCommittedProofCustody>();
  return Object.freeze({
    async read(preparationId: string) {
      const value = records.get(preparationId);
      return value ? structuredClone(value) : null;
    },
    async commitExactSuccessors(value: KairosOfflineNoteCommittedProofCustody) {
      const existing = records.get(value.preparationId);
      if (existing && !exactProofCustodyEqual(existing, value)) {
        throw new Error("OFFLINE_NOTE_PROOF_CUSTODY_CONFLICT");
      }
      const committed = existing ?? structuredClone(value);
      records.set(value.preparationId, committed);
      return structuredClone(committed);
    },
  });
}

function idbRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("OFFLINE_NOTE_PROOF_CUSTODY_STORAGE_FAILED"));
    request.onsuccess = () => resolve(request.result);
  });
}

function idbComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error("OFFLINE_NOTE_PROOF_CUSTODY_STORAGE_FAILED"));
    transaction.onerror = () => undefined;
  });
}

async function openProofCustodyDatabase(factory: IDBFactory, databaseName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(databaseName, 1);
    request.onerror = () => reject(request.error ?? new Error("OFFLINE_NOTE_PROOF_CUSTODY_STORAGE_FAILED"));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("proof-custody")) {
        request.result.createObjectStore("proof-custody", { keyPath: "preparationId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export function createKairosOfflineNoteBrowserProofCustodyStore(options: Readonly<{
  indexedDB?: IDBFactory;
  databaseName?: string;
}> = {}): KairosOfflineNoteProofCustodyStore {
  const factory = options.indexedDB ?? globalThis.indexedDB;
  if (!factory) throw new Error("OFFLINE_NOTE_PROOF_CUSTODY_STORAGE_REQUIRED");
  const databaseName = options.databaseName?.trim() || "receiz-offline-note-proof-custody-v1";
  return Object.freeze({
    async read(preparationId: string) {
      const database = await openProofCustodyDatabase(factory, databaseName);
      try {
        const transaction = database.transaction("proof-custody", "readonly");
        const value = await idbRequest(transaction.objectStore("proof-custody").get(preparationId));
        await idbComplete(transaction);
        return value ? structuredClone(value as KairosOfflineNoteCommittedProofCustody) : null;
      } finally {
        database.close();
      }
    },
    async commitExactSuccessors(value: KairosOfflineNoteCommittedProofCustody) {
      const database = await openProofCustodyDatabase(factory, databaseName);
      try {
        const transaction = database.transaction("proof-custody", "readwrite");
        const store = transaction.objectStore("proof-custody");
        const existing = await idbRequest(store.get(value.preparationId)) as KairosOfflineNoteCommittedProofCustody | undefined;
        if (existing && !exactProofCustodyEqual(existing, value)) {
          transaction.abort();
          throw new Error("OFFLINE_NOTE_PROOF_CUSTODY_CONFLICT");
        }
        if (!existing) store.add(structuredClone(value));
        await idbComplete(transaction);
        return structuredClone(existing ?? value);
      } finally {
        database.close();
      }
    },
  });
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function canonicalUint(value: unknown, code: string): bigint {
  const text = typeof value === "bigint" ? value.toString() : String(value ?? "").trim();
  if (!/^(0|[1-9]\d*)$/.test(text)) throw new Error(code);
  return BigInt(text);
}

function usdCents(value: unknown): bigint {
  const text = String(value ?? "").trim();
  const match = /^(0|[1-9]\d*)\.(\d{2})$/.exec(text);
  if (!match) throw new Error("OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");
  return BigInt(match[1]!) * 100n + BigInt(match[2]!);
}

function formatPhiMicro(value: bigint): string {
  const whole = value / 1_000_000n;
  const fraction = (value % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function formatUsdCents(value: bigint): string {
  return `${value / 100n}.${(value % 100n).toString().padStart(2, "0")}`;
}

function accountReserve(keyFile: ReceizKeyFileV1, accountUserId: string) {
  const snapshot = record(keyFile.portableState?.snapshot);
  const account = record(snapshot?.account);
  const wallet = record(snapshot?.wallet);
  const summary = record(wallet?.routeSummary);
  const quote = record(summary?.quote);
  const rollup = record(summary?.rollup);
  const valueStates = record(summary?.valueStates);
  if (keyFile.portableState?.schema !== "receiz.account.state.v3"
    || snapshot?.schema !== "receiz.account.state.v3"
    || account?.userId !== accountUserId
    || summary?.userId !== accountUserId
    || !quote || !rollup || !valueStates) {
    throw new Error("OFFLINE_RESERVE_VERIFIED_ACCOUNT_STATE_V3_REQUIRED");
  }
  const reserveUsdCents = canonicalUint(
    valueStates.settledBalanceUsdCents,
    "OFFLINE_RESERVE_EXACT_HEAD_REQUIRED",
  );
  const usdPerPhiMicrocents = canonicalUint(quote.usdPerPhiMicrocents, "OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");
  if (usdPerPhiMicrocents <= 0n) throw new Error("OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");
  const reservePhiMicro = (reserveUsdCents * 1_000_000_000_000n) / usdPerPhiMicrocents;
  const projectedReserveUsdCents = (
    reservePhiMicro * usdPerPhiMicrocents + 500_000_000_000n
  ) / 1_000_000_000_000n;
  if (projectedReserveUsdCents !== reserveUsdCents) {
    throw new Error("OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");
  }
  return {
    snapshot,
    summary,
    quote,
    rollup,
    valueStates,
    totalPhiMicro: canonicalUint(summary.balancePhiMicro, "OFFLINE_RESERVE_EXACT_HEAD_REQUIRED"),
    totalUsdCents: usdCents(summary.balanceUsd),
    phiMicro: reservePhiMicro,
    usdCents: reserveUsdCents,
    usdPerPhiMicrocents,
  };
}

function successorSnapshot(
  source: ReturnType<typeof accountReserve>,
  input: KairosOfflineNoteIssuanceInput,
  reserveAfterPhiMicro: bigint,
  reserveAfterUsdCents: bigint,
): Record<string, unknown> {
  const snapshot = structuredClone(source.snapshot);
  const wallet = record(snapshot.wallet)!;
  const summary = record(wallet.routeSummary)!;
  const rollup = record(summary.rollup)!;
  const valueStates = record(summary.valueStates)!;
  const totalAfterPhiMicro = source.totalPhiMicro - input.amountPhiMicro;
  const totalAfterUsdCents = source.totalUsdCents - input.amountUsdCents;
  summary.balancePhiMicro = totalAfterPhiMicro.toString();
  summary.balancePhi = formatPhiMicro(totalAfterPhiMicro);
  summary.balanceUsd = formatUsdCents(totalAfterUsdCents);
  valueStates.settledBalanceUsdCents = reserveAfterUsdCents.toString();
  valueStates.settledBalanceUsd = formatUsdCents(reserveAfterUsdCents);
  rollup.totalDebitPhiMicro = (
    canonicalUint(rollup.totalDebitPhiMicro, "OFFLINE_RESERVE_EXACT_HEAD_REQUIRED") + input.amountPhiMicro
  ).toString();
  rollup.totalDebitUsdCents = (
    canonicalUint(rollup.totalDebitUsdCents, "OFFLINE_RESERVE_EXACT_HEAD_REQUIRED") + input.amountUsdCents
  ).toString();
  rollup.noteMintCount = Number(canonicalUint(rollup.noteMintCount, "OFFLINE_RESERVE_EXACT_HEAD_REQUIRED") + 1n);
  rollup.lastEntryAt = input.note.mintedAt;
  rollup.lastEntryKaiPulse = input.acceptedAtKai;
  return snapshot;
}

function resultFromStage(stage: IssuanceStage): KairosOfflineNoteLocalIssuanceResult {
  if (stage.phase !== "completed" || !stage.reserveReceipt || !stage.activationReceiptDigest) {
    throw new Error("OFFLINE_NOTE_LOCAL_ISSUANCE_INCOMPLETE");
  }
  return Object.freeze({
    schema: "receiz.offline-note.local-issuance-result.v1",
    preparationId: stage.preparationId,
    accountSuccessor: Object.freeze({
      proof: structuredClone(stage.successorAccountProof),
      proofBytes: stage.successorAccountProofBytes.slice(),
      proofSha256: stage.successorAccountProofSha256,
      portableStateDigest: stage.reserveInput.successorReserveStateContentDigest,
      reserveBeforePhiMicro: stage.reserveInput.reserveBeforePhiMicro,
      reserveAfterPhiMicro: stage.reserveInput.reserveAfterPhiMicro,
      reserveBeforeUsdCents: stage.reserveInput.reserveBeforeUsdCents,
      reserveAfterUsdCents: stage.reserveInput.reserveAfterUsdCents,
    }),
    noteGenesis: Object.freeze({
      noteId: stage.note.packet.noteId,
      amountPhiMicro: stage.reserveInput.amountPhiMicro,
      amountUsdCents: stage.reserveInput.amountUsdCents,
      artifactBytes: stage.note.artifactBytes.slice(),
      artifactSha256: stage.note.artifactSha256,
      filename: stage.note.filename,
      activatedInQualifiedCustody: true,
    }),
    serverRequests: Object.freeze([]) as readonly [],
  });
}

async function verifyStagedProofs(stage: IssuanceStage, roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>) {
  const reopened = await readReceizIdentityArtifact(stage.successorAccountProofBytes);
  if (await verifyReceizIdentityPortableStateProof(reopened) !== "verified"
    || reopened.portableState?.proof?.digestSha256Hex !== stage.reserveInput.successorReserveStateContentDigest
    || await sha256Hex(stage.successorAccountProofBytes) !== stage.successorAccountProofSha256) {
    throw new Error("OFFLINE_RESERVE_SUCCESSOR_PROOF_INVALID");
  }
  const opened = await createKairosNotePortableCarrier({ canonicalSignatureV4RootPublicKeys: roots }).open(
    stage.note.artifactBytes,
  );
  if (opened.artifactSha256 !== stage.note.artifactSha256
    || opened.packet.noteId !== stage.note.packet.noteId
    || opened.packet.custodyMode !== "qualified-anonymous"
    || opened.packet.currentCustody.receivingCustodyCommitmentDigest
      !== stage.receivingCustody.receivingCustodyCommitmentDigest) {
    throw new Error("OFFLINE_NOTE_CANONICAL_ADMISSION_REQUIRED");
  }
}

async function admitDigestTransition(input: KairosOfflineNoteIssuanceInput, stage: IssuanceStage): Promise<void> {
  const aggregateId = `offline-reserve:${input.accountBinding.accountUserId}`;
  const current = await input.admissionStore.readAggregate(aggregateId);
  if (current && current.headDigest !== stage.predecessorAccountPortableStateDigest
    && current.headDigest !== stage.reserveInput.successorReserveStateContentDigest) {
    throw new Error("OFFLINE_RESERVE_ADMISSION_HEAD_CONFLICT");
  }
  if (current?.headDigest === stage.reserveInput.successorReserveStateContentDigest) return;
  const commandDigest = await digestReceizAuthority("transition", "receiz.offline-note.local-issuance-admission.v1", {
    preparationId: stage.preparationId,
    intentDigest: stage.intentDigest,
    predecessorAccountPortableStateDigest: stage.predecessorAccountPortableStateDigest,
    successorAccountPortableStateDigest: stage.reserveInput.successorReserveStateContentDigest,
    noteArtifactSha256: stage.note.artifactSha256,
    reserveReceiptDigest: stage.reserveReceipt?.receiptDigest ?? "",
    activationReceiptDigest: stage.activationReceiptDigest ?? "",
  });
  const receipt = {
    schema: "receiz.offline-note.local-issuance-admission-receipt.v1",
    preparationId: stage.preparationId,
    commandDigest,
    successorAccountPortableStateDigest: stage.reserveInput.successorReserveStateContentDigest,
    noteArtifactSha256: stage.note.artifactSha256,
  };
  const committed = await input.admissionStore.commit({
    schema: "receiz.admission.unit-of-work.v1",
    aggregateId,
    commandDigest,
    idempotencyKey: `offline-note-issuance:${stage.preparationId}`,
    expectedRevision: current?.revision ?? 0,
    expectedHeadDigest: current?.headDigest ?? null,
    acceptedCommand: { schema: "receiz.offline-note.local-issuance-command.v1", commandDigest },
    events: [{ ...receipt, schema: "receiz.offline-note.local-issuance-admitted.v1" }],
    nextHead: {
      revision: (current?.revision ?? 0) + 1,
      digest: stage.reserveInput.successorReserveStateContentDigest,
      state: receipt,
    },
    resourceEffects: {},
    receipt,
    outboxIntents: [],
    auditReference: { schema: "receiz.offline-note.local-issuance-audit.v1", commandDigest },
  });
  if (committed.status !== "committed" && committed.status !== "idempotent") {
    throw new Error(`OFFLINE_RESERVE_ADMISSION_FAILED:${committed.code}`);
  }
}

export async function issueKairosOfflineNoteLocally(
  input: KairosOfflineNoteIssuanceInput,
  options: Parameters<typeof prepareKairosNoteQualifiedGenesisClient>[1] = {},
): Promise<KairosOfflineNoteLocalIssuanceResult> {
  const localUid = input.deviceIdentity.localUid.trim();
  const accountUserId = input.accountBinding.accountUserId.trim();
  const keyId = input.accountProof.keyId.trim();
  if (!localUid
    || !accountUserId
    || input.deviceIdentity.keyId !== keyId
    || input.accountBinding.receizKeyId !== keyId
    || ![localUid, accountUserId].includes(input.accountProof.owner.uid.trim())) {
    throw new Error("OFFLINE_RESERVE_BOUND_DEVICE_ACCOUNT_REQUIRED");
  }
  if (!UUID_RE.test(input.preparationId)) throw new Error("OFFLINE_NOTE_PREPARATION_ID_INVALID");
  if (await verifyReceizIdentityPortableStateProof(input.accountProof) !== "verified") {
    throw new Error("OFFLINE_RESERVE_VERIFIED_ACCOUNT_STATE_V3_REQUIRED");
  }
  const predecessorDigest = input.accountProof.portableState?.proof?.digestSha256Hex ?? "";
  const intentDigest = await digestReceizAuthority("transition", STAGE_SCHEMA, {
    preparationId: input.preparationId,
    predecessorDigest,
    accountUserId,
    keyId,
    amountPhiMicro: input.amountPhiMicro.toString(),
    amountUsdCents: input.amountUsdCents.toString(),
    usdPerPhiMicrocents: input.usdPerPhiMicrocents.toString(),
    acceptedAtKai: input.acceptedAtKai,
    transitionNonce: input.transitionNonce,
    noteId: input.note.noteId,
  });
  let stage = await input.stageStore.read(input.preparationId);
  if (stage) {
    if (stage.schema !== STAGE_SCHEMA || stage.intentDigest !== intentDigest) {
      throw new Error("OFFLINE_NOTE_PREPARATION_CONFLICT");
    }
    await verifyStagedProofs(stage, input.admissionRootPublicKeys);
    if (stage.phase === "completed") {
      const committed = await input.proofCustody.read(stage.preparationId);
      if (!committed
        || committed.intentDigest !== stage.intentDigest
        || committed.successorAccountProofSha256 !== stage.successorAccountProofSha256
        || committed.noteArtifactSha256 !== stage.note.artifactSha256) {
        throw new Error("OFFLINE_NOTE_PROOF_CUSTODY_REQUIRED");
      }
      return resultFromStage(stage);
    }
  } else {
    const reserve = accountReserve(input.accountProof, accountUserId);
    const reserveHead = await input.reserveCustody.inspectBoundHead();
    const component=Boolean(reserveHead?.bankAllocationId);
    if (input.amountPhiMicro <= 0n || input.amountUsdCents <= 0n
      || reserve.totalPhiMicro < input.amountPhiMicro || !component && reserve.phiMicro < input.amountPhiMicro || reserve.usdCents < input.amountUsdCents
) {
      throw new Error("OFFLINE_RESERVE_CONSERVATION_REQUIRED");
    }
    const qualification = await input.noteCustody.qualifyInstallation();
    if (qualification.status !== "qualified") {
      throw new Error(`OFFLINE_NOTE_CUSTODY_UNSUPPORTED:${qualification.code}`);
    }
    const receivingCustody = await input.noteCustody.createReceivingCommitment(qualification);
    if(!component&&reserve.usdPerPhiMicrocents!==input.usdPerPhiMicrocents)throw Error("OFFLINE_RESERVE_CONSERVATION_REQUIRED");
    const budgetPhi=component?BigInt(reserveHead!.reservePhiMicro!):reserve.phiMicro;
    const budgetUsd=component?BigInt(reserveHead!.reserveUsdCents):reserve.usdCents;
    if (!reserveHead
      || reserveHead.accountPortableStateDigest !== predecessorDigest
      || budgetPhi<input.amountPhiMicro || budgetUsd<input.amountUsdCents
      || !component && reserveHead.reserveUsdCents !== reserve.usdCents.toString()
      || !component && reserveHead.reservePhiMicro !== undefined && reserveHead.reservePhiMicro !== reserve.phiMicro.toString()) {
      throw new Error("OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");
    }
    const reserveAfterPhiMicro = budgetPhi - input.amountPhiMicro;
    const reserveAfterUsdCents = budgetUsd - input.amountUsdCents;
    const successorAccountProof = await appendReceizIdentityPortableState({
      keyFile: input.accountProof,
      schema: "receiz.account.state.v3",
      snapshot: successorSnapshot(reserve, input, reserve.phiMicro-input.amountPhiMicro, reserve.usdCents-input.amountUsdCents),
      passphrase: input.identityPassphrase,
      exportedAt: input.note.mintedAt,
    });
    if (await verifyReceizIdentityPortableStateProof(successorAccountProof) !== "verified") {
      throw new Error("OFFLINE_RESERVE_SUCCESSOR_PROOF_INVALID");
    }
    const successorAccountProofBytes = new TextEncoder().encode(serializeReceizIdentityArtifact(successorAccountProof));
    const note = await prepareKairosNoteQualifiedGenesisClient({
      ...input.note,
      amountPhiMicro: input.amountPhiMicro,
      amountUsdCents: input.amountUsdCents,
      usdPerPhiMicrocents: input.usdPerPhiMicrocents,
      receivingCustody,
      acceptedAtKai: input.acceptedAtKai,
      transitionNonce: input.transitionNonce,
      mintedByUserId: accountUserId,
      admissionRootPublicKeys: input.admissionRootPublicKeys,
    }, options);
    const reserveInput: KairosReserveConsumeExactSuccessorInput = Object.freeze({
      qualificationDigest: reserveHead.qualificationDigest,
      predecessorAccountPortableStateDigest: predecessorDigest,
      successorReserveStateContentDigest: successorAccountProof.portableState!.proof!.digestSha256Hex,
      noteArtifactSha256: note.artifactSha256,
      amountPhiMicro: input.amountPhiMicro.toString(),
      amountUsdCents: input.amountUsdCents.toString(),
      usdPerPhiMicrocents: input.usdPerPhiMicrocents.toString(),
      reserveBeforePhiMicro: budgetPhi.toString(),
      reserveAfterPhiMicro: reserveAfterPhiMicro.toString(),
      reserveBeforeUsdCents: budgetUsd.toString(),
      reserveAfterUsdCents: reserveAfterUsdCents.toString(),
      acceptedAtKai: input.acceptedAtKai,
      transitionNonce: input.transitionNonce,
    });
    stage = Object.freeze({
      schema: STAGE_SCHEMA, preparationId: input.preparationId, intentDigest, phase: "prepared",
      predecessorAccountPortableStateDigest: predecessorDigest,
      successorAccountProof, successorAccountProofBytes,
      successorAccountProofSha256: await sha256Hex(successorAccountProofBytes),
      receivingCustody, note, reserveInput, reserveReceipt: null, activationReceiptDigest: null,
    });
    await input.stageStore.write(input.preparationId, stage);
    await verifyStagedProofs(stage, input.admissionRootPublicKeys);
  }

  if (stage.phase === "prepared") input.assertSelectedPredecessor?.();
  const reserveReceipt = await input.reserveCustody.consumeExactSuccessor(stage.reserveInput);
  if (stage.phase === "prepared") {
    stage = Object.freeze({ ...stage, phase: "consumed", reserveReceipt });
    await input.stageStore.write(input.preparationId, stage);
  } else if (stage.reserveReceipt?.receiptDigest !== reserveReceipt.receiptDigest) {
    throw new Error("OFFLINE_RESERVE_CONSUMPTION_RECEIPT_MISMATCH");
  }
  const activation = await input.noteCustody.activateExactSuccessor({
    qualificationDigest: stage.receivingCustody.qualificationDigest,
    noteId: stage.note.packet.noteId,
    verifiedSuccessorArtifactSha256: stage.note.artifactSha256,
    receivingCustodyCommitmentDigest: stage.receivingCustody.receivingCustodyCommitmentDigest,
    wholeValuePhiMicro: stage.reserveInput.amountPhiMicro,
    acceptedAtKai: input.acceptedAtKai,
  });
  stage = Object.freeze({ ...stage, reserveReceipt, activationReceiptDigest: activation.receiptDigest });
  await input.stageStore.write(input.preparationId, stage);
  await admitDigestTransition(input, stage);
  const committedProofCustody = await input.proofCustody.commitExactSuccessors(Object.freeze({
    schema: PROOF_CUSTODY_SCHEMA,
    preparationId: stage.preparationId,
    intentDigest: stage.intentDigest,
    accountUserId,
    predecessorAccountPortableStateDigest: stage.predecessorAccountPortableStateDigest,
    successorAccountPortableStateDigest: stage.reserveInput.successorReserveStateContentDigest,
    successorAccountProofSha256: stage.successorAccountProofSha256,
    successorAccountProofBytes: stage.successorAccountProofBytes.slice(),
    noteId: stage.note.packet.noteId,
    noteArtifactSha256: stage.note.artifactSha256,
    noteArtifactBytes: stage.note.artifactBytes.slice(),
  }));
  await input.reserveCustody.commitExactSuccessor({
    receiptDigest: reserveReceipt.receiptDigest,
    successorAccountProof: stage.successorAccountProof,
  });
  await input.projectCommittedSuccessors?.(committedProofCustody);
  stage = Object.freeze({ ...stage, phase: "completed" });
  await input.stageStore.write(input.preparationId, stage);
  return resultFromStage(stage);
}

/** Reuse completed issuance custody, including the exact consumed Reserve relation. */
export async function verifyKairosOfflineNoteCommittedAccountSuccessor(input: Readonly<{
  preparationId: string;
  predecessor: ReceizKeyFileV1;
  successor: ReceizKeyFileV1;
  stageStore: KairosOfflineNoteIssuanceStageStore;
  proofCustody: KairosOfflineNoteProofCustodyStore;
  reserveCustody: KairosReservePwaCustodyAdapter;
  admissionRootPublicKeys?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<void> {
  const stage = await input.stageStore.read(input.preparationId);
  const committed = await input.proofCustody.read(input.preparationId);
  if (!stage || !committed || stage.phase === "prepared" || !stage.reserveReceipt || !stage.activationReceiptDigest
    || stage.predecessorAccountPortableStateDigest !== input.predecessor.portableState?.proof?.digestSha256Hex
    || committed.predecessorAccountPortableStateDigest !== stage.predecessorAccountPortableStateDigest
    || committed.successorAccountPortableStateDigest !== input.successor.portableState?.proof?.digestSha256Hex
    || committed.successorAccountProofSha256 !== stage.successorAccountProofSha256
    || committed.noteArtifactSha256 !== stage.note.artifactSha256
    || committed.intentDigest !== stage.intentDigest) throw new Error("OFFLINE_NOTE_PROOF_CUSTODY_REQUIRED");
  await verifyStagedProofs(stage, input.admissionRootPublicKeys);
  if (await verifyReceizIdentityPortableStateProof(input.predecessor) !== "verified"
    || input.predecessor.keyId !== input.successor.keyId
    || input.predecessor.crypto.publicKeyRawB64u !== input.successor.crypto.publicKeyRawB64u
    || input.predecessor.owner.uid !== input.successor.owner.uid
    || await sha256Hex(committed.successorAccountProofBytes) !== stage.successorAccountProofSha256) {
    throw new Error("OFFLINE_NOTE_PROOF_CUSTODY_REQUIRED");
  }
  const receipt = await input.reserveCustody.consumeExactSuccessor(stage.reserveInput);
  if (receipt.receiptDigest !== stage.reserveReceipt.receiptDigest) throw new Error("OFFLINE_RESERVE_CONSUMPTION_RECEIPT_MISMATCH");
  const head = await input.reserveCustody.inspectBoundHead();
  if (head?.accountPortableStateDigest !== committed.successorAccountPortableStateDigest) throw new Error("OFFLINE_RESERVE_EXACT_HEAD_REQUIRED");
}

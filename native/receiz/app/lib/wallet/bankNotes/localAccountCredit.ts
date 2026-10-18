import {projectBankLocalWalletMovement} from "./localWalletValuation";
import { canonicalizeReceizConstitution as canonical } from "../../../../packages/receiz-sdk/src/constitution";
import { digestReceizAuthority } from "../../../../packages/receiz-sdk/src/authorityEncoding";
import { appendReceizIdentityPortableState, parseReceizIdentityArtifactText, projectReceizIdentityAccount, type ReceizKeyFileV1 } from "../../../../packages/receiz-sdk/src/identity";
import { createReceizOfflineNoteCustodyQualification } from "../../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import type { KairosNotePwaCustodyAdapter } from "../kairosNotePwaCustodyAdapter";
import { readBankFundedNoteHead, readBankFundedNoteIssuance, readBankFundedNoteSource, verifyBankFundedNoteSource, type BankVerifiedFundedNote } from "./fundedNote";
import { prepareBankNoteRedemption, readBankNoteRedemption, verifyBankNoteRedemption, type BankLocalAccountCreditIntent } from "./redemption";
import type { receizeDocumentBytesClient } from "../../documentSeal/receizeDocumentBytesClient";

type Options = Readonly<{ roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>; localCreditDepth?: number }>;
export type BankLocalAccountCreditPreparation = Readonly<{
  schema: "receiz.bank.local-account-credit-preparation.v1" | "receiz.bank.local-account-credit-preparation.v2";
  intent: BankLocalAccountCreditIntent;
  predecessorAccountProof: ReceizKeyFileV1;
  successorAccountProof: ReceizKeyFileV1;
}>;
export type BankLocalAccountCreditEvidence = Readonly<{
  rail: "reserve" | "settlement";
  creditId: string;
  noteId: string;
  receiverUserId: string;
  receiverKeyId: string;
  predecessorAccountPortableStateDigest: string;
  successorAccountPortableStateDigest: string;
  amountPhiMicro: string;
  amountUsdCents: string;
  usdPerPhiMicrocents: string;
  acceptedAtKai: string;
  artifactSha256: string;
  qualification: Awaited<ReturnType<typeof createReceizOfflineNoteCustodyQualification>>;
}>;
const verified = new WeakMap<BankLocalAccountCreditEvidence, Awaited<ReturnType<typeof verifyBankNoteRedemption>>>();
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_INVALID");
  return value as Record<string, unknown>;
};
const uint = (value: unknown): bigint => {
  if (typeof value !== "string" && typeof value !== "number" || !/^(0|[1-9][0-9]*)$/.test(String(value))) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_INVALID");
  return BigInt(String(value));
};
const usd = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
const phi = (value: bigint) => `${value / 1000000n}${value % 1000000n ? "." + String(value % 1000000n).padStart(6, "0").replace(/0+$/, "") : ""}`;

async function account(proofInput: ReceizKeyFileV1, uid: string) {
  const original = structuredClone(proofInput);
  const proof = parseReceizIdentityArtifactText(JSON.stringify(original));
  const projection = await projectReceizIdentityAccount(proof);
  if (!projection.portableStateVerified || projection.authority !== "verified-identity-portable-state" || projection.accountStateSchema !== "receiz.account.state.v3") throw Error("BANK_LOCAL_CREDIT_ACCOUNT_INVALID");
  const snapshot = structuredClone(object(projection.verifiedState));
  if (canonical(original.portableState?.snapshot) !== canonical(snapshot)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_INSPECTION_MISMATCH");
  const summary = object(object(snapshot.wallet).routeSummary);
  if (object(snapshot.account).userId !== uid || summary.userId !== uid || snapshot.schema !== "receiz.account.state.v3") throw Error("BANK_LOCAL_CREDIT_ACCOUNT_INVALID");
  return { proof, snapshot, digest: proof.portableState!.proof!.digestSha256Hex };
}

async function creditId(intent: Omit<BankLocalAccountCreditIntent, "localCreditId" | "successorAccountPortableStateDigest">) {
  return digestReceizAuthority("transition", "receiz.bank.local-account-credit-id.v1", intent);
}

/** Private account projection. The public financial source remains the entire
 * verified terminal/funding lineage, never this identity-signed snapshot. */
function successorSnapshot(snapshotInput: Record<string, unknown>, note: Pick<BankVerifiedFundedNote, "rail" | "amountPhiMicro" | "amountUsdCents">, id: string, acceptedAtKai: string, exportedAt: string, exact = false) {
  const snapshot = structuredClone(snapshotInput), wallet = object(snapshot.wallet), summary = object(wallet.routeSummary);
  const states = object(summary.valueStates), rollup = object(summary.rollup), quote = object(summary.quote);
  const credited = Array.isArray(wallet.localNoteCreditIds) ? wallet.localNoteCreditIds : [];
  if (credited.some(value => typeof value !== "string") || new Set(credited).size !== credited.length || credited.includes(id)) throw Error("BANK_LOCAL_CREDIT_ALREADY_ADOPTED");
  const amountPhi = uint(note.amountPhiMicro), amountUsd = uint(note.amountUsdCents), rate = uint(quote.usdPerPhiMicrocents);
  if (rate <= 0n || amountPhi <= 0n || amountUsd <= 0n) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_INVALID");
  const movement = exact ? projectBankLocalWalletMovement(summary,note.rail,note.amountPhiMicro,note.amountUsdCents,"credit") : undefined;
  const reserve = uint(states.settledBalanceUsdCents) + (note.rail === "reserve" ? amountUsd : 0n);
  const settlement = uint(states.ecosystemBalanceUsdCents ?? "0") + (note.rail === "settlement" ? (amountPhi * rate + 500000000000n) / 1000000000000n : 0n);
  const totalPhi = uint(summary.balancePhiMicro) + amountPhi;
  summary.balancePhiMicro = String(totalPhi); summary.balancePhi = phi(totalPhi); summary.balanceUsd = usd(reserve + settlement);
  states.settledBalanceUsdCents = String(reserve); states.settledBalanceUsd = usd(reserve);
  states.ecosystemBalanceUsdCents = String(settlement); states.ecosystemBalanceUsd = usd(settlement);
  if(movement)Object.assign(summary,movement.summary);
  rollup.totalCreditPhiMicro = String(uint(rollup.totalCreditPhiMicro) + amountPhi);
  rollup.totalCreditUsdCents = String(uint(rollup.totalCreditUsdCents) + (movement ? uint(movement.displayUsdCents) : (note.rail === "reserve" ? amountUsd : (amountPhi * rate + 500000000000n) / 1000000000000n)));
  const claims = uint(rollup.noteClaimCount) + 1n;
  if (claims > BigInt(Number.MAX_SAFE_INTEGER)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_INVALID");
  rollup.noteClaimCount = Number(claims); rollup.lastEntryKaiPulse = acceptedAtKai; rollup.lastEntryAt = exportedAt;
  wallet.localNoteCreditIds = [...credited, id];
  if (exact) {
    const versions = wallet.localNoteCreditValuationVersions === undefined ? {} : object(wallet.localNoteCreditValuationVersions);
    if (Object.hasOwn(versions, id)) throw Error("BANK_LOCAL_CREDIT_ALREADY_ADOPTED");
    wallet.localNoteCreditValuationVersions = { ...versions, [id]: "exact-rail-phi-v1" };
  }
  return snapshot;
}

export async function prepareBankLocalAccountCredit(input: Readonly<{
  note: BankVerifiedFundedNote; accountProof: ReceizKeyFileV1; passphrase?: string; accountUserId: string;
  acceptedAtKai: string; transitionNonce: string; exportedAt: string;
}>): Promise<BankLocalAccountCreditPreparation> {
  const head = readBankFundedNoteHead(input.note);
  if (!input.note.allocationId || head.packet.custodyMode !== "qualified-anonymous") throw Error("BANK_NOTE_EXCLUSIVE_FUNDING_REQUIRED");
  const before = await account(input.accountProof, input.accountUserId);
  if (before.proof.crypto.privateKeyPkcs8B64u) throw Error("BANK_NOTE_PROTECTED_IDENTITY_REQUIRED");
  const basis = { schema: "receiz.bank.note-local-credit.v1" as const, rail: input.note.rail, noteId: input.note.noteId,
    noteArtifactSha256: input.note.noteArtifactSha256, receiverUserId: input.accountUserId, receiverKeyId: before.proof.keyId,
    amountPhiMicro: input.note.amountPhiMicro, amountUsdCents: input.note.amountUsdCents, acceptedAtKai: input.acceptedAtKai,
    nonce: input.transitionNonce, predecessorAccountPortableStateDigest: before.digest,
    receiverCashCustodyCommitmentDigest: head.packet.currentCustody.receivingCustodyCommitmentDigest };
  const id = await creditId(basis);
  const successor = await appendReceizIdentityPortableState({ keyFile: before.proof, passphrase: input.passphrase, schema: "receiz.account.state.v3",
    snapshot: successorSnapshot(before.snapshot, input.note, id, input.acceptedAtKai, input.exportedAt, true), exportedAt: input.exportedAt });
  const result = Object.freeze({ schema: "receiz.bank.local-account-credit-preparation.v2" as const, intent: { ...basis, localCreditId: id,
    successorAccountPortableStateDigest: successor.portableState!.proof!.digestSha256Hex }, predecessorAccountProof: before.proof, successorAccountProof: successor });
  await verifyBankLocalCreditAccountSuccessor(result);
  return result;
}

export async function verifyBankLocalCreditAccountSuccessor(preparation: BankLocalAccountCreditPreparation): Promise<void> {
  const value = structuredClone(preparation), intent = value.intent;
  if (!["receiz.bank.local-account-credit-preparation.v1","receiz.bank.local-account-credit-preparation.v2"].includes(value.schema) || intent.schema !== "receiz.bank.note-local-credit.v1") throw Error("BANK_LOCAL_CREDIT_ACCOUNT_INVALID");
  const { localCreditId, successorAccountPortableStateDigest, ...basis } = intent;
  if (await creditId(basis) !== localCreditId) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
  const before = await account(value.predecessorAccountProof, intent.receiverUserId), after = await account(value.successorAccountProof, intent.receiverUserId);
  if (before.proof.keyId !== intent.receiverKeyId || after.proof.keyId !== before.proof.keyId || before.proof.alg !== after.proof.alg
    || before.proof.owner.uid !== after.proof.owner.uid || before.proof.crypto.publicKeyRawB64u !== after.proof.crypto.publicKeyRawB64u
    || before.digest !== intent.predecessorAccountPortableStateDigest || after.digest !== successorAccountPortableStateDigest
    || before.digest === after.digest || canonical(after.snapshot) !== canonical(successorSnapshot(before.snapshot, intent, localCreditId, intent.acceptedAtKai, value.successorAccountProof.portableState!.exportedAt, value.schema === "receiz.bank.local-account-credit-preparation.v2"))) {
    throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
  }
}

/** The caller durably retains preparation before entering this irreversible
 * step. The native custody adapter recovers only the same consumed intent. */
export async function commitBankLocalAccountCredit(input: Readonly<{
  preparation: BankLocalAccountCreditPreparation; note: BankVerifiedFundedNote;
  custody: Pick<KairosNotePwaCustodyAdapter, "consumeExactHead">;
  roots?: Options["roots"]; sealDocument?: typeof receizeDocumentBytesClient; localCreditDepth?: number;
  retainConsumedSource(bytes: Uint8Array): Promise<void>;
}>) {
  if (typeof input.retainConsumedSource !== "function") throw Error("BANK_LOCAL_CREDIT_DURABLE_RECOVERY_REQUIRED");
  const preparation = structuredClone(input.preparation);
  await verifyBankLocalCreditAccountSuccessor(preparation);
  const depth = input.localCreditDepth ?? 0;
  if (!Number.isSafeInteger(depth) || depth < 0 || depth >= 32) throw Error("BANK_NOTE_TRANSPORT_CAPACITY");
  // Admission at the successor nesting depth occurs before any custody assertion.
  await verifyBankFundedNoteSource(readBankFundedNoteSource(input.note), { ...input, localCreditDepth: depth + 1 });
  const terminal = await prepareBankNoteRedemption(input.note, preparation.intent, input.custody, { ...input, onSealedSource: input.retainConsumedSource });
  const sourceBytes = readBankNoteRedemption(terminal).bytes;
  const evidence = await verifyBankLocalAccountCreditSource(sourceBytes, input);
  return Object.freeze({ sourceBytes, evidence, successorAccountProof: preparation.successorAccountProof });
}

/** Admission derives credit from the current qualified holder's exact native
 * terminal and its complete funding lineage. No credit issuer is substituted. */
export async function verifyBankLocalAccountCreditSource(bytesInput: Uint8Array, options: Options = {}): Promise<BankLocalAccountCreditEvidence> {
  const depth = options.localCreditDepth ?? 0;
  if (!Number.isSafeInteger(depth) || depth < 0 || depth >= 32 || bytesInput.length > 32 * 1024 * 1024) throw Error("BANK_NOTE_TRANSPORT_CAPACITY");
  const terminal = await verifyBankNoteRedemption(bytesInput.slice(), { ...options, localCreditDepth: depth + 1 });
  const source = readBankNoteRedemption(terminal), intent = source.intent;
  if (intent.schema !== "receiz.bank.note-local-credit.v1") throw Error("BANK_LOCAL_CREDIT_SOURCE_REQUIRED");
  const { localCreditId, successorAccountPortableStateDigest, ...basis } = intent;
  if (await creditId(basis) !== localCreditId) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
  const head = readBankFundedNoteHead(source.note);
  if (head.packet.custodyMode !== "qualified-anonymous") throw Error("BANK_LOCAL_CREDIT_SOURCE_REQUIRED");
  const receiving = head.packet.currentCustody, receipt = source.receipt;
  const qualification = await createReceizOfflineNoteCustodyQualification({ profileId: receiving.profileId, profileEvidenceDigest: receiving.profileEvidenceDigest,
    adapterKind: receiving.adapterKind, custodyPublicKeyRawB64u: receiving.custodyPublicKeyRawB64u,
    stateCommitment: receipt.consumedStateCommitment, stateSequence: receipt.consumedStateSequence });
  const result = Object.freeze({ rail: terminal.rail, creditId: localCreditId, noteId: terminal.noteId, receiverUserId: terminal.receiverUserId,
    receiverKeyId: terminal.receiverKeyId, predecessorAccountPortableStateDigest: intent.predecessorAccountPortableStateDigest,
    successorAccountPortableStateDigest, amountPhiMicro: terminal.amountPhiMicro, amountUsdCents: terminal.amountUsdCents,
    usdPerPhiMicrocents: source.note.usdPerPhiMicrocents, acceptedAtKai: intent.acceptedAtKai, artifactSha256: terminal.artifactSha256, qualification });
  verified.set(result, terminal);
  return result;
}

export function readBankLocalAccountCredit(evidence: BankLocalAccountCreditEvidence) {
  const terminal = verified.get(evidence);
  if (!terminal) throw Error("BANK_LOCAL_CREDIT_CUSTODY_REQUIRED");
  return readBankNoteRedemption(terminal);
}

export function isBankLocalAccountCreditSource(bytes: Uint8Array): boolean {
  if (bytes[0] !== 123) return false;
  try { return ["receiz.bank.note-redemption-source.v1", "receiz.bank.note-redemption-source.v2"].includes(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))?.schema); }
  catch { return false; }
}

/** A private debit is adopted only when the same qualified cash consumption
 * bound these exact signed account heads and the complete funded note source. */
export async function verifyBankLocalDebitAccountSuccessor(input: Readonly<{
  note: BankVerifiedFundedNote; predecessorAccountProof: ReceizKeyFileV1; successorAccountProof: ReceizKeyFileV1;
}>) {
  const issuance = readBankFundedNoteIssuance(input.note), receipt = issuance.receipt;
  if (!issuance.account) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_SOURCE_REQUIRED");
  const before = await account(input.predecessorAccountProof, issuance.account.userId);
  const after = await account(input.successorAccountProof, issuance.account.userId);
  if (before.proof.keyId !== issuance.account.keyId || after.proof.keyId !== before.proof.keyId
    || before.proof.alg !== after.proof.alg || before.proof.owner.uid !== after.proof.owner.uid
    || before.proof.crypto.publicKeyRawB64u !== after.proof.crypto.publicKeyRawB64u
    || receipt.predecessorAccountPortableStateDigest !== before.digest
    || receipt.successorReserveStateContentDigest !== after.digest
    || typeof issuance.packet.mintedAt !== "string" || input.successorAccountProof.portableState?.exportedAt !== issuance.packet.mintedAt) {
    throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
  }
  const expected = structuredClone(before.snapshot), summary = object(object(expected.wallet).routeSummary);
  const states = object(summary.valueStates), rollup = object(summary.rollup);
  const afterWallet = object(after.snapshot.wallet);
  const versions = afterWallet.localNoteDebitValuationVersions === undefined ? {} : object(afterWallet.localNoteDebitValuationVersions);
  const version = versions[input.note.noteId];
  if (version !== undefined && version !== "exact-rail-phi-v1") throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
  // The current transition, not an inherited account marker, selects arithmetic.
  // A retained v1 client may preserve newer predecessor fields byte for byte.
  if(version === "exact-rail-phi-v1"){
    const wallet = object(expected.wallet);
    const previousVersions = wallet.localNoteDebitValuationVersions === undefined ? {} : object(wallet.localNoteDebitValuationVersions);
    if (Object.hasOwn(previousVersions, input.note.noteId)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
    wallet.localNoteDebitValuationVersions = { ...previousVersions, [input.note.noteId]: version };
    const movement=projectBankLocalWalletMovement(summary,input.note.rail,input.note.amountPhiMicro,input.note.amountUsdCents,"debit");
    Object.assign(summary,movement.summary);
    rollup.totalDebitPhiMicro=String(uint(rollup.totalDebitPhiMicro)+uint(input.note.amountPhiMicro));
    rollup.totalDebitUsdCents=String(uint(rollup.totalDebitUsdCents)+uint(movement.displayUsdCents));
  }else{
  const valuePhi = uint(input.note.amountPhiMicro), valueUsd = uint(input.note.amountUsdCents);
  const selected = input.note.rail === "settlement" ? "ecosystemBalanceUsdCents" : "settledBalanceUsdCents";
  const beforeTotalPhi = uint(summary.balancePhiMicro), beforeSelected = uint(states[selected]);
  const totalUsd = uint(states.settledBalanceUsdCents) + uint(states.ecosystemBalanceUsdCents ?? "0");
  if (beforeTotalPhi < valuePhi || beforeSelected < valueUsd || totalUsd < valueUsd) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
  summary.balancePhiMicro = String(beforeTotalPhi - valuePhi); summary.balancePhi = phi(beforeTotalPhi - valuePhi); summary.balanceUsd = usd(totalUsd - valueUsd);
  states[selected] = String(beforeSelected - valueUsd);
  states[input.note.rail === "settlement" ? "ecosystemBalanceUsd" : "settledBalanceUsd"] = usd(beforeSelected - valueUsd);
  rollup.totalDebitPhiMicro = String(uint(rollup.totalDebitPhiMicro) + valuePhi);
  rollup.totalDebitUsdCents = String(uint(rollup.totalDebitUsdCents) + valueUsd);
  }
  const count = uint(rollup.noteMintCount) + 1n;
  if (count > BigInt(Number.MAX_SAFE_INTEGER)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
  rollup.noteMintCount = Number(count); rollup.lastEntryAt = issuance.packet.mintedAt; rollup.lastEntryKaiPulse = receipt.acceptedAtKai;
  if (canonical(expected) !== canonical(after.snapshot)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
}

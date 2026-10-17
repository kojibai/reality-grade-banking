import { canonicalizeReceizConstitution as canonical } from "../../../../packages/receiz-sdk/src/constitution";
import { parseReceizIdentityArtifactText, type ReceizKeyFileV1 } from "../../../../packages/receiz-sdk/src/identity";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import type { KairosNotePwaCustodyAdapter, KairosNotePwaCustodyState } from "../kairosNotePwaCustodyAdapter";
import type { createKairosReservePwaCustodyAdapter } from "../kairosReservePwaCustodyAdapter";
import type { receizeDocumentBytesClient } from "../../documentSeal/receizeDocumentBytesClient";
import { projectReceizIdentityAccount } from "../../../../packages/receiz-sdk/src/identity";
import { verifyBankNoteAllocation } from "./allocationEvidence";
import { openBankAllocationCashSnapshot } from "./cashSnapshot";
import { openBankSettlementAllocationCashSnapshot } from "./settlementCashSnapshot";
import type { BankReserveAllocationEvidence } from "./allocation";
import type { BankSettlementAllocationEvidence } from "./settlementAllocation";
import { packBankNoteRedemptionSource } from "./redemption";
import { decodeBankFundedSource, encodeBankFundedSource } from "./sourceCodec";
import { readBankFundedNoteSource, verifyBankFundedNoteSource, type BankVerifiedFundedNote } from "./fundedNote";
import { prepareBankLocalAccountCredit, commitBankLocalAccountCredit, verifyBankLocalAccountCreditSource,
  verifyBankLocalCreditAccountSuccessor, verifyBankLocalDebitAccountSuccessor, readBankLocalAccountCredit, type BankLocalAccountCreditPreparation } from "./localAccountCredit";

export type BankLocalCreditDeposit = {
  noteId: string;
  noteArtifactSha256: string;
  phase: "prepared" | "consumed" | "complete";
  preparationRef: string;
  noteSourceRef: string;
  successorProofRef: string;
  creditSourceRef?: string;
};
export type BankLocalCreditJournalState = {
  schema: "receiz.bank.local-credit-journal.v1";
  keyId: string;
  uid: string;
  accountProofRef: string | null;
  deposits: Record<string, BankLocalCreditDeposit>;
  components: Record<string, { noteId: string; creditSourceRef: string; successorProofRef: string }>;
  preparedFunding?: { accountProofRef: string; artifactRef: string; privateCashRef: string };
  issuances?: Record<string, { noteSourceRef: string; predecessorProofRef: string; successorProofRef: string }>;
};
export type BankLocalCreditJournalHead = Readonly<{ userId: string; keyId: string; digest: string }>;
const heads = new WeakMap<BankLocalCreditJournalHead, { proof: ReceizKeyFileV1; assertCurrent(): Promise<void> }>();
export async function readBankLocalCreditJournalHead(head: BankLocalCreditJournalHead) {
  const held = heads.get(head);
  if (!held) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_HEAD_CUSTODY_REQUIRED");
  await held.assertCurrent();
  return structuredClone(held.proof);
}
type Cash = ReturnType<typeof createKairosReservePwaCustodyAdapter>;
type Inputs = Readonly<{
  identity: ReceizKeyFileV1;
  uid: string;
  roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
  sealDocument?: typeof receizeDocumentBytesClient;
  assertOpen(): void;
  read(): Promise<unknown>;
  write(next: BankLocalCreditJournalState, expected: unknown): Promise<void>;
  retain(bytes: Uint8Array): Promise<string>;
  restore(reference: string): Promise<Uint8Array>;
  noteCustody(note: BankVerifiedFundedNote): { adapter: Pick<KairosNotePwaCustodyAdapter, "consumeExactHead">; read(): Promise<KairosNotePwaCustodyState | null> };
  cashCustody(creditId: string): Pick<Cash, "activateBankLocalAccountCredit">;
}>;
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("BANK_LOCAL_CREDIT_JOURNAL_INVALID");
  return value as Record<string, unknown>;
};

/** Private recovery pointers only. Every financial result is reopened from its
 * complete source; journal phases and caller-created objects grant no credit.
 * The caller serializes operations with its existing account lock. Writes use
 * compare-and-swap so a losing operation cannot replace a newer account head. */
export function createBankLocalCreditJournal(input: Inputs) {
  const identity = parseReceizIdentityArtifactText(JSON.stringify(input.identity));
  function sameIdentity(proof: ReceizKeyFileV1) {
    if (proof.keyId !== identity.keyId || proof.alg !== identity.alg || proof.owner.uid !== identity.owner.uid
      || proof.crypto.publicKeyRawB64u !== identity.crypto.publicKeyRawB64u) throw Error("BANK_NOTE_IDENTITY_CHANGED");
  }
  async function load() {
    input.assertOpen();
    const previous = await input.read();
    if (previous == null) return { previous, state: { schema: "receiz.bank.local-credit-journal.v1", keyId: identity.keyId,
      uid: input.uid, accountProofRef: null, deposits: {}, components: {} } as BankLocalCreditJournalState };
    const state = structuredClone(object(previous)) as BankLocalCreditJournalState;
    if (state.schema !== "receiz.bank.local-credit-journal.v1" || state.keyId !== identity.keyId || state.uid !== input.uid
      || state.accountProofRef !== null && typeof state.accountProofRef !== "string") throw Error("BANK_NOTE_IDENTITY_CHANGED");
    object(state.deposits); object(state.components);
    for (const [id, item] of Object.entries(state.deposits)) {
      if (!item || item.noteId !== id || !["prepared", "consumed", "complete"].includes(item.phase)
        || ![item.noteArtifactSha256, item.preparationRef, item.noteSourceRef, item.successorProofRef].every(x => typeof x === "string" && x.length > 0)
        || item.phase !== "prepared" && typeof item.creditSourceRef !== "string") throw Error("BANK_LOCAL_CREDIT_JOURNAL_INVALID");
    }
    return { previous, state };
  }
  async function change(previous: unknown, state: BankLocalCreditJournalState, mutate: (next: BankLocalCreditJournalState) => void) {
    const next = structuredClone(state); mutate(next);
    input.assertOpen(); await input.write(next, previous); input.assertOpen();
    return { previous: next, state: next };
  }
  async function restoreJson(ref: string) {
    input.assertOpen();
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await input.restore(ref))) as unknown;
  }
  async function reopen(item: BankLocalCreditDeposit) {
    const preparation = await restoreJson(item.preparationRef) as BankLocalAccountCreditPreparation;
    await verifyBankLocalCreditAccountSuccessor(preparation);
    sameIdentity(preparation.predecessorAccountProof); sameIdentity(preparation.successorAccountProof);
    const successorAccountProof = parseReceizIdentityArtifactText(JSON.stringify(await restoreJson(item.successorProofRef)));
    sameIdentity(successorAccountProof);
    if (canonical(successorAccountProof) !== canonical(preparation.successorAccountProof)
      || preparation.intent.receiverUserId !== input.uid || preparation.intent.noteId !== item.noteId
      || preparation.intent.noteArtifactSha256 !== item.noteArtifactSha256) throw Error("BANK_LOCAL_CREDIT_JOURNAL_BINDING_MISMATCH");
    const note = await verifyBankFundedNoteSource(decodeBankFundedSource(await restoreJson(item.noteSourceRef)), input);
    if (note.noteId !== item.noteId || note.noteArtifactSha256 !== item.noteArtifactSha256) throw Error("BANK_NOTE_EXACT_DEPOSIT_REQUIRED");
    return { preparation, successorAccountProof, note };
  }
  async function result(item: BankLocalCreditDeposit, held: Awaited<ReturnType<typeof reopen>>) {
    if (!item.creditSourceRef) throw Error("BANK_LOCAL_CREDIT_SOURCE_REQUIRED");
    const sourceBytes = await packBankNoteRedemptionSource(await input.restore(item.creditSourceRef));
    const evidence = await verifyBankLocalAccountCreditSource(sourceBytes, input);
    const terminal = readBankLocalAccountCredit(evidence);
    if (canonical(terminal.intent) !== canonical(held.preparation.intent)) throw Error("BANK_LOCAL_CREDIT_JOURNAL_BINDING_MISMATCH");
    return { sourceBytes, evidence, successorAccountProof: held.successorAccountProof };
  }
  async function currentAccount(state: BankLocalCreditJournalState, reference = state.accountProofRef, visited = new Set<string>()): Promise<ReceizKeyFileV1 | null> {
    if (!reference) return null;
    if (visited.has(reference) || visited.size >= 1024) throw Error("BANK_LOCAL_CREDIT_JOURNAL_INVALID");
    visited.add(reference);
    if (state.preparedFunding?.accountProofRef === reference) {
      const seed = state.preparedFunding;
      const proof = parseReceizIdentityArtifactText(JSON.stringify(await restoreJson(seed.accountProofRef)));
      await verifyPreparedAccount(proof, await input.restore(seed.artifactRef), await input.restore(seed.privateCashRef));
      return proof;
    }
    const issued = Object.values(state.issuances ?? {}).find(value => value.successorProofRef === reference);
    if (issued) {
      const before = await currentAccount(state, issued.predecessorProofRef, visited);
      if (!before) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_SOURCE_REQUIRED");
      const after = parseReceizIdentityArtifactText(JSON.stringify(await restoreJson(reference)));
      sameIdentity(after);
      const note = await verifyBankFundedNoteSource(decodeBankFundedSource(await restoreJson(issued.noteSourceRef)), input);
      await verifyBankLocalDebitAccountSuccessor({ note, predecessorAccountProof: before, successorAccountProof: after });
      return after;
    }
    const item = Object.values(state.deposits).find(value => value.phase === "complete" && value.successorProofRef === reference);
    if (!item) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_SOURCE_REQUIRED");
    const held = await reopen(item), verified = await result(item, held);
    const component = state.components[verified.evidence.creditId];
    if (!component || component.noteId !== item.noteId || component.creditSourceRef !== item.creditSourceRef
      || component.successorProofRef !== item.successorProofRef) throw Error("BANK_LOCAL_CREDIT_JOURNAL_BINDING_MISMATCH");
    return verified.successorAccountProof;
  }
  async function verifyPreparedAccount(proof: ReceizKeyFileV1, artifactBytes: Uint8Array, privateCashSnapshot: Uint8Array) {
    sameIdentity(proof);
    const projection = await projectReceizIdentityAccount(proof), evidence = await verifyBankNoteAllocation(artifactBytes, input), f = evidence.funding;
    const state = projection.verifiedState as {account?: {userId?:string}; wallet?:{routeSummary?:{userId?:string}}} | null;
    if (!projection.portableStateVerified || projection.accountStateSchema !== "receiz.account.state.v3" || state?.account?.userId !== input.uid || state.wallet?.routeSummary?.userId !== input.uid
      || f.accountUserId !== input.uid || f.receizKeyId !== identity.keyId || f.predecessorAccountPortableStateDigest !== proof.portableState?.proof?.digestSha256Hex
      || canonical(proof.portableState?.snapshot) !== canonical(projection.verifiedState)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
    if ("fundedSettlementPhiMicro" in f) await openBankSettlementAllocationCashSnapshot(evidence as BankSettlementAllocationEvidence, privateCashSnapshot);
    else await openBankAllocationCashSnapshot(evidence as BankReserveAllocationEvidence, privateCashSnapshot);
  }
  return Object.freeze({
    async initializePreparedFunding(args: Readonly<{accountProof: ReceizKeyFileV1; artifactBytes: Uint8Array; privateCashSnapshot: Uint8Array}>) {
      await verifyPreparedAccount(args.accountProof, args.artifactBytes, args.privateCashSnapshot);
      const loaded = await load();
      if (loaded.state.accountProofRef) {
        const seed = loaded.state.preparedFunding;
        if (!seed || canonical(await restoreJson(seed.accountProofRef)) !== canonical(args.accountProof)
          || canonical(Array.from(await input.restore(seed.artifactRef))) !== canonical(Array.from(args.artifactBytes))) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_HEAD_CONFLICT");
        return;
      }
      if (Object.keys(loaded.state.deposits).length) throw Error("BANK_LOCAL_CREDIT_RECOVERY_REQUIRED");
      const accountProofRef = await input.retain(encode(args.accountProof)), artifactRef = await input.retain(args.artifactBytes), privateCashRef = await input.retain(args.privateCashSnapshot);
      await change(loaded.previous, loaded.state, next => { next.preparedFunding = {accountProofRef, artifactRef, privateCashRef}; next.accountProofRef = accountProofRef; });
    },
    async accountProof() { return currentAccount((await load()).state); },
    async accountHead(): Promise<BankLocalCreditJournalHead | null> {
      const {state} = await load();
      if (Object.values(state.deposits).some(item=>item.phase!=="complete")) throw Error("BANK_LOCAL_CREDIT_RECOVERY_REQUIRED");
      const proof = await currentAccount(state);
      if (!proof) return null;
      const head = Object.freeze({userId:input.uid,keyId:identity.keyId,digest:proof.portableState!.proof!.digestSha256Hex});
      const reference = state.accountProofRef;
      heads.set(head,{proof,assertCurrent:async()=>{const current=(await load()).state;
        if(current.accountProofRef!==reference || Object.values(current.deposits).some(item=>item.phase!=="complete")) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_HEAD_CONFLICT");}});
      return head;
    },
    async recordIssuance(args: Readonly<{ note: BankVerifiedFundedNote; predecessorAccountProof: ReceizKeyFileV1; successorAccountProof: ReceizKeyFileV1 }>) {
      await verifyBankLocalDebitAccountSuccessor(args);
      sameIdentity(args.predecessorAccountProof); sameIdentity(args.successorAccountProof);
      const loaded = await load(), existing = loaded.state.issuances?.[args.note.noteId];
      if (existing) {
        const old = await restoreJson(existing.successorProofRef);
        if (canonical(old) !== canonical(args.successorAccountProof)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_BINDING_MISMATCH");
        return;
      }
      if (Object.values(loaded.state.deposits).some(item => item.phase !== "complete")) throw Error("BANK_LOCAL_CREDIT_RECOVERY_REQUIRED");
      const current = await currentAccount(loaded.state);
      if (!current || canonical(current) !== canonical(args.predecessorAccountProof)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_HEAD_CONFLICT");
      const noteSourceRef = await input.retain(encode(encodeBankFundedSource(readBankFundedNoteSource(args.note))));
      const successorProofRef = await input.retain(encode(args.successorAccountProof));
      await change(loaded.previous, loaded.state, next => {
        next.issuances = { ...next.issuances, [args.note.noteId]: { noteSourceRef, predecessorProofRef: next.accountProofRef!, successorProofRef } };
        next.accountProofRef = successorProofRef;
      });
    },
    async deposit(args: Readonly<{ note: BankVerifiedFundedNote; accountProof: ReceizKeyFileV1; passphrase?: string;
      acceptedAtKai: string; transitionNonce: string; exportedAt: string }>) {
      // Runtime custody is required even when the same deposit is retried.
      readBankFundedNoteSource(args.note);
      let loaded = await load(), item = loaded.state.deposits[args.note.noteId];
      if (!item) {
        if (Object.values(loaded.state.deposits).some(value => value.phase !== "complete")) throw Error("BANK_LOCAL_CREDIT_RECOVERY_REQUIRED");
        const accountProof = await currentAccount(loaded.state) ?? args.accountProof;
        sameIdentity(accountProof);
        const preparation = await prepareBankLocalAccountCredit({ ...args, accountProof, accountUserId: input.uid });
        const preparationRef = await input.retain(encode(preparation));
        const noteSourceRef = await input.retain(encode(encodeBankFundedSource(readBankFundedNoteSource(args.note))));
        const successorProofRef = await input.retain(encode(preparation.successorAccountProof));
        // Persist the signed predecessor/successor, exact note source and original
        // intent before any irreversible hardware consumption can begin.
        loaded = await change(loaded.previous, loaded.state, next => { next.deposits[args.note.noteId] = {
          noteId: args.note.noteId, noteArtifactSha256: args.note.noteArtifactSha256, phase: "prepared", preparationRef, noteSourceRef, successorProofRef }; });
        item = loaded.state.deposits[args.note.noteId]!;
      }
      if (item.noteArtifactSha256 !== args.note.noteArtifactSha256) throw Error("BANK_NOTE_EXACT_DEPOSIT_REQUIRED");
      const held = await reopen(item);
      if (item.phase === "complete") return result(item, held);
      const assertPredecessor = async () => {
        if (loaded.state.accountProofRef) {
          const proof = parseReceizIdentityArtifactText(JSON.stringify(await restoreJson(loaded.state.accountProofRef)));
          if (proof.portableState?.proof?.digestSha256Hex !== held.preparation.intent.predecessorAccountPortableStateDigest) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_HEAD_CONFLICT");
        }
        const current = await currentAccount(loaded.state) ?? identity;
        if (canonical(current) !== canonical(held.preparation.predecessorAccountProof)) throw Error("BANK_LOCAL_CREDIT_ACCOUNT_HEAD_CONFLICT");
      };
      await assertPredecessor();
      if (item.phase === "prepared") {
        input.assertOpen();
        await commitBankLocalAccountCredit({ preparation: held.preparation, note: held.note,
          custody: input.noteCustody(held.note).adapter, roots: input.roots, sealDocument: input.sealDocument,
          retainConsumedSource: async bytes => {
            const creditSourceRef = await input.retain(bytes);
            loaded = await change(loaded.previous, loaded.state, next => { next.deposits[item.noteId] = { ...item, phase: "consumed", creditSourceRef }; });
            item = loaded.state.deposits[item.noteId]!;
          } });
      }
      const verified = await result(item, held);
      const consumed = await input.noteCustody(held.note).read();
      if (!consumed) throw Error("BANK_LOCAL_CREDIT_QUALIFIED_SUCCESSOR_REQUIRED");
      await assertPredecessor();
      input.assertOpen();
      await input.cashCustody(verified.evidence.creditId).activateBankLocalAccountCredit({ evidence: verified.evidence,
        predecessorAccountProof: held.preparation.predecessorAccountProof, successorAccountProof: held.successorAccountProof, consumedNoteCustody: consumed });
      await change(loaded.previous, loaded.state, next => {
        next.deposits[item.noteId] = { ...item, phase: "complete" };
        next.components[verified.evidence.creditId] = { noteId: item.noteId, creditSourceRef: item.creditSourceRef!, successorProofRef: item.successorProofRef };
        next.accountProofRef = item.successorProofRef;
      });
      return verified;
    },
  });
}

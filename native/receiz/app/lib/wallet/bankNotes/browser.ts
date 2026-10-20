import {createBankPreparedCashStorage} from "./preparedCashStorage";
export {createBankNoteAccountReceivingRequest,verifyBankNoteAccountReceivingRequest} from './accountReceiving';
export {openBankNoteAccountDeposit,readBankNoteAccountDeposit,exportBankNoteAccountDepositImage,verifyBankNoteAccountDepositCredit,prepareBankNoteAccountDepositSubmission,isBankNoteAccountDeposit} from './accountDeposit';
export {prepareBankNoteAccountTransfer} from './accountTransfer';
export {openBankNoteDepositReceipt} from './credit';
export {packBankNoteBytes,unpackBankNoteBytes} from './compression';
import {verifyBankNoteAccountReceivingRequest} from './accountReceiving';
import {prepareBankNoteAccountTransfer} from './accountTransfer';
import {isBankNoteAccountDeposit,readBankNoteAccountDeposit,exportBankNoteAccountDepositImage} from './accountDeposit';
import {createBankPreparedNotesRuntime,type BankPreparedNotesInput} from "./preparedBrowser";
import { createBankFundingResume } from "./fundingResume";
import { packBankNoteBytes, unpackBankNoteBytes } from "./compression";
import { parseReceizIdentityArtifactText, receizBase64UrlDecode as decode, type ReceizKeyFileV1 } from "../../../../packages/receiz-sdk/src/identity";
import { createReceizBrowserAdmissionStore } from "../../../../packages/receiz-sdk/src/browserAdmissionStore";
import { createKairosNoteBrowserWebAuthnClient, createKairosNoteIndexedDbPwaCustodyStorage, createKairosReserveIndexedDbPwaCustodyStorage, createKairosNoteBrowserPwaCustodyAdapter } from "../kairosNoteBrowserPwaCustody";
import { createKairosNotePwaCustodyAdapter } from "../kairosNotePwaCustodyAdapter";
import { createKairosReservePwaCustodyAdapter } from "../kairosReservePwaCustodyAdapter";
import { createKairosOfflineCashFundingAuthorization } from "../kairosOfflineCashFundingAuthorization";
import { createKairosOfflineNoteBrowserIssuanceStageStore, createKairosOfflineNoteBrowserProofCustodyStore, issueKairosOfflineNoteLocally } from "../kairosOfflineNoteLocalIssuance";
import { verifyBankNoteAllocation, bankAllocationRail, bankAllocatedPhi, type BankNoteRail } from "./allocationEvidence";
import { createBankSettlementNoteFundingAuthorization } from "./settlementFundingAuthorization";
import { verifyBankFundedNoteSource, readBankFundedNoteHead, readBankFundedNoteSource, type BankFundedNoteSource } from "./fundedNote";
import { exportBankNoteImage, openBankNoteImage } from "./noteImage";
import { prepareBankNoteRedemption, readBankNoteRedemption, type BankNoteRedemptionIntent } from "./redemption";
import { verifyBankReserveCreditArtifact,exportBankNoteDepositReceipt } from "./credit";
import { encodeBankFundedSource, decodeBankFundedSource } from "./sourceCodec";
import { computeKaiLocally } from "../../../utils/kai_pulse";
import { verifyKairosNoteReceivingCustody, requireKairosNoteAttestedReceivingCustody } from "../kairosNoteCustodyVerification";
import { createKairosNotePortableCarrier } from "../kairosNotePortableCarrier";
import { settleKairosNoteQualifiedCustodyTransition } from "../kairosNoteQualifiedCustodyTransition";
import { InMemoryKairosNoteSettlementStore } from "../kairosNoteLocalTransition";
import { verifyReceizArtifact, createReceizArtifactAdmissionEngine } from "../../../../packages/receiz-sdk/src/index";
import { parseReceizPortableAssetDocument, extractReceizPortableAssetPayload } from "../../../../packages/receiz-sdk/src/portableAsset";
import type { receizeDocumentBytesClient } from "../../documentSeal/receizeDocumentBytesClient";
type JsonRequest = (path: string, options: {
    method: "GET" | "POST";
    body?: Record<string, unknown>;
}) => Promise<unknown>;
type IssueIntent = {
    preparationId: string;
    noteId: string;
    noteToken: string;
    mintedAt: string;
    acceptedAtKai: string;
    transitionNonce: string;
};
type CreateAttempt = {
    rail?: BankNoteRail;
    id: string;
    phase: "preparing" | "funding" | "issuing" | "complete";
    amountUsdCents: string;
    accountProofRef: string;
    intent: IssueIntent;
    authorization?: unknown;
    receivingCustody?: unknown;
    fundingBytes?: string;
    privateCash?: string;
    sourceRef?: string;
    imageRef?: string;

    transferComplete?: boolean;
    transfer?: {
        request: unknown;
        acceptedAtKai: string;
        nonce: string;
        terminalRef?: string;
    };
};
type DepositAttempt = {
    intent: BankNoteRedemptionIntent;
    imageRef: string;
    terminalRef?: string;
    creditRef?: string;
    privateCash?: string;
};
type State = {
    schema: "receiz.bank.offline-notes-device.v1";
    keyId: string;
    uid: string;
    create: CreateAttempt | null;
    notes: Record<string, CreateAttempt>;
    deposits: Record<string, DepositAttempt>;
    receivers: Record<string, string>;
};
const obj = (v: unknown) => { if (!v || typeof v !== "object" || Array.isArray(v))
    throw Error("BANK_NOTE_RESPONSE_INVALID"); return v as Record<string, unknown>; };
const nowKai = () => String(Math.max(0, Math.trunc(computeKaiLocally(new Date()).pulse)));
function laterKai(after: string) { const now = BigInt(nowKai()); return (now > BigInt(after) ? now : BigInt(after) + 1n).toString(); }
export function createBankOfflineNotesRuntime(input: Readonly<{
    keyId: string;
    uid: string;
    localUid: string;
    origin: string;
    passphrase: string;
    fetchImpl: typeof fetch;
    request: JsonRequest;
    sealDocument: typeof receizeDocumentBytesClient;
    read(): Promise<unknown>;
    retain(bytes:Uint8Array):Promise<string>;restore(digest:string):Promise<Uint8Array>;
    write(next: unknown, previous: unknown): Promise<void>;
    assertOpen(): void;
    artwork?(amountUsdCents: string, noteId: string, compact?: boolean, rail?: BankNoteRail): Promise<Uint8Array>;
}>) {
    // Application composition: each production origin keeps its own WebAuthn realm.
    const realms: Readonly<Record<string, string>> = {
        "https://bankeiz.com": "bankeiz.com",
        "https://bank.receiz.com": "receiz.com",
        "http://localhost:4173": "localhost",
        "http://localhost:5173": "localhost",
    };
    const rpId = Object.hasOwn(realms, input.origin) ? realms[input.origin] : null;
    if (!rpId) throw Error("BANK_NOTE_TRANSPORT_REALM_INVALID");
    const path = (kind: string) => `/api/connect/offline-notes/${kind}?origin=${encodeURIComponent(input.origin)}`;
    const noteAdapter = (slotId: string) => createKairosNoteBrowserPwaCustodyAdapter({ slotId, rpId, origin: input.origin, fetchImpl: input.fetchImpl });
    async function load(): Promise<State> { input.assertOpen(); const raw = await input.read(); if (!raw)
        return { schema: "receiz.bank.offline-notes-device.v1", keyId: input.keyId, uid: input.uid, create: null, notes: {}, deposits: {}, receivers: {} }; const value = raw as State; if (value.schema !== "receiz.bank.offline-notes-device.v1" || value.keyId !== input.keyId || value.uid !== input.uid)
        throw Error("BANK_NOTE_IDENTITY_CHANGED"); return structuredClone(value); }
    async function save(state: State, previous: State | null) { input.assertOpen(); await input.write(state, previous); input.assertOpen(); }
    async function change(state: State, mutate: (next: State) => void) { const next = structuredClone(state); mutate(next); await save(next, state); return next; }
    async function imageFor(source: BankFundedNoteSource) { const admitted = await verifyBankFundedNoteSource(source), head = readBankFundedNoteHead(admitted); const verification = await verifyReceizArtifact(head.artifactBytes), a = await createReceizArtifactAdmissionEngine()(verification, { profile: "portable-state" }); if (a.verdict === "profile-denied" || "code" in a || a.profile !== "portable-state")
        throw Error("BANK_NOTE_SOURCE_REQUIRED"); const document = await parseReceizPortableAssetDocument(a.recoveredState), payload = await extractReceizPortableAssetPayload(document); return exportBankNoteImage(admitted, input.artwork ? await input.artwork(admitted.amountUsdCents, admitted.noteId, false, admitted.rail) : payload.bytes); }
    return Object.freeze({
        async savedNotes() { const state = await load(), result = []; for (const saved of Object.values(state.notes)) {
            if (!saved.imageRef || state.deposits[saved.intent.noteId]?.creditRef)
                continue;
            const image = await input.restore(saved.imageRef), note = isBankNoteAccountDeposit(image)?await readBankNoteAccountDeposit(image):await openBankNoteImage(image);
            result.push({ rail: note.rail, amountPhiMicro: note.amountPhiMicro, noteId: note.noteId, amountUsdCents: note.amountUsdCents, image, transferred: saved.transferComplete === true, transferPending: Boolean(saved.transfer) && saved.transferComplete !== true });
        } return result; },
        async pending() { const state = await load(); return state.create && state.create.phase !== "complete" ? { rail: state.create.rail ?? "reserve", amountUsdCents: state.create.amountUsdCents, noteId: state.create.intent.noteId, canCancel: state.create.phase === "preparing" || state.create.phase === "funding" } : null; },
        async cancelUnfunded() {
            const state = await load(), attempt = state.create;
            if (!attempt || !["preparing", "funding"].includes(attempt.phase)) throw Error("BANK_NOTE_FUNDING_PENDING");
            if (attempt.phase === "funding") {
                const auth = obj(attempt.authorization), proof = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await input.restore(attempt.accountProofRef))) as ReceizKeyFileV1;
                // A durable host tombstone serializes with allocation. A GET miss
                // alone can never authorize abandoning an unknown funding result.
                const result = obj(await input.request(path("funding"), { method: "POST", body: { action: "cancel", authorization: attempt.authorization, accountProof: proof, resumeAuthorization: await createBankFundingResume(proof, input.passphrase, String(auth.authorizationDigest)) } }));
                if (result.ok !== true || result.cancelled !== true) throw Error("BANK_NOTE_FUNDING_PENDING");
            }
            await change(state, next => { next.create = null; });
        },
        async createNote(amountUsdCents: string, accountProof: ReceizKeyFileV1, rail: BankNoteRail = "reserve") {
            if(rail !== "reserve" && rail !== "settlement")throw Error("BANK_NOTE_RAIL_INVALID");
            accountProof=parseReceizIdentityArtifactText(JSON.stringify(accountProof));
            let state = await load(), attempt = state.create;
            if (attempt?.phase === "complete") {
                attempt = null;
            }
            if (!attempt) {
                if (!/^[1-9][0-9]*$/.test(amountUsdCents) || BigInt(amountUsdCents) > 100000000n || Object.keys(state.notes).length >= 64)
                    throw Error("BANK_NOTE_AMOUNT_INVALID");
                if (accountProof.keyId !== input.keyId || accountProof.crypto.privateKeyPkcs8B64u)
                    throw Error("BANK_NOTE_PROTECTED_IDENTITY_REQUIRED");
                const at = new Date();
                attempt = { rail, id: crypto.randomUUID(), phase: "preparing", amountUsdCents, accountProofRef:await input.retain(new TextEncoder().encode(JSON.stringify(accountProof))), intent: { preparationId: crypto.randomUUID(), noteId: crypto.randomUUID(), noteToken: crypto.randomUUID().replace(/-/g, ""), mintedAt: at.toISOString(), acceptedAtKai: nowKai(), transitionNonce: crypto.randomUUID() } };
                const prior = await input.read();
                const next = { ...state, create: attempt };
                await input.write(next, prior);
                state = next;
            }
            else if (attempt.amountUsdCents !== amountUsdCents || (attempt.rail ?? "reserve") !== rail)
                throw Error("BANK_NOTE_RESUME_EXACT_AMOUNT");
            const heldAttempt = attempt;
        const accountProofSource=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await input.restore(attempt.accountProofRef))) as ReceizKeyFileV1;
            const webAuthn = createKairosNoteBrowserWebAuthnClient({ origin: input.origin, rpId, fetchImpl: input.fetchImpl }), qualStorage = createKairosNoteIndexedDbPwaCustodyStorage(`bank-reserve:${input.keyId}:${attempt.id}`);
            const qualifier = createKairosNotePwaCustodyAdapter({ webAuthn, storage: qualStorage, profiles: [] }), reserve = createKairosReservePwaCustodyAdapter({ webAuthn, storage: createKairosReserveIndexedDbPwaCustodyStorage(`bank:${input.keyId}:${attempt.id}`) });
            const noteCustody = noteAdapter(`wallet-note:${attempt.intent.noteId}`);
            if (attempt.phase === "preparing") {
                // Qualify both slots before a cash allocation can be requested.
                const noteQ = await noteCustody.qualifyInstallation();
                if (noteQ.status !== "qualified")
                    throw Error(`OFFLINE_NOTE_CUSTODY_UNSUPPORTED:${noteQ.code}`);
                const q = await qualifier.qualifyInstallation();
                if (q.status !== "qualified")
                    throw Error(`OFFLINE_NOTE_CUSTODY_UNSUPPORTED:${q.code}`);
                const receivingCustody = await qualifier.createReceivingCommitment(q);
                requireKairosNoteAttestedReceivingCustody(receivingCustody);
                const prepared = await reserve.inspectFundingPrepared();
                const commitment = prepared?.receivingCustody ?? receivingCustody;
                const common = {keyFile:accountProofSource,passphrase:input.passphrase,accountUserId:input.uid,amountUsdCents,qualificationDigest:commitment.qualificationDigest,installationCommitment:commitment.installationCommitment,receivingCustodyCommitmentDigest:commitment.receivingCustodyCommitmentDigest};
                const summary=(accountProofSource.portableState!.snapshot as {wallet:{routeSummary:{quote:{usdPerPhiMicrocents:string}}}}).wallet.routeSummary;
                const rate=BigInt(summary.quote.usdPerPhiMicrocents);
                if(rate<=0n)throw Error("BANK_NOTE_ALLOCATION_QUOTE_MISMATCH");
                const auth = rail === "settlement" ? await createBankSettlementNoteFundingAuthorization({...common,amountPhiMicro:((BigInt(amountUsdCents)*1000000000000n+rate/2n)/rate).toString(),usdPerPhiMicrocents:rate.toString()})
                  : prepared?.fundingAuthorization ?? await createKairosOfflineCashFundingAuthorization({...common,predecessorAccountPortableStateDigest:accountProofSource.portableState!.proof!.digestSha256Hex});
                const qualified = (await qualStorage.read())!;
                if (!await reserve.inspectFundingPrepared())
                    await reserve.prepareFundingCustody({ credential: qualified.credential, qualification: q, receivingCustody, predecessorAccountProof: accountProofSource, ...(rail === "reserve" ? {fundingAuthorization: auth as import("../kairosOfflineCashFundingAuthorization").KairosOfflineCashFundingAuthorizationV1} : {}) });
                state = await change(state, next => { next.create = { ...heldAttempt, phase: "funding", authorization: auth, receivingCustody: prepared?.receivingCustody ?? receivingCustody }; });
                attempt = state.create!;
            }
            if (attempt.phase === "funding") {
                const auth = obj(attempt.authorization), recovered = obj(await input.request(`${path("funding")}&allocationId=${auth.authorizationDigest}`, { method: "GET" }));
                input.assertOpen();
                const result = recovered.found === false ? obj(await input.request(path("funding"), { method: "POST", body: { authorization: attempt.authorization, receivingCustody: attempt.receivingCustody, accountProof: accountProofSource, resumeAuthorization: await createBankFundingResume(accountProofSource, input.passphrase, String(auth.authorizationDigest)) } })) : recovered;
                if (result.ok !== true || typeof result.artifactBytes !== "string" || typeof result.privateCashSnapshot !== "string")
                    throw Error("BANK_NOTE_FUNDING_PENDING");
                const evidence = await verifyBankNoteAllocation(decode(result.artifactBytes));
                if(bankAllocationRail(evidence.funding) !== rail)throw Error("BANK_NOTE_FUNDING_RAIL_MISMATCH");
                if("fundedSettlementPhiMicro" in evidence.funding)await reserve.activateBankAllocatedSettlement({evidence: evidence as import("./settlementAllocation").BankSettlementAllocationEvidence,privateCashSnapshot:decode(result.privateCashSnapshot)});
                else await reserve.activateBankAllocatedReserve({ evidence: evidence as import("./allocation").BankReserveAllocationEvidence, privateCashSnapshot: decode(result.privateCashSnapshot) });
                state = await change(state, next => { next.create = { ...next.create!, phase: "issuing", fundingBytes: result.artifactBytes as string, privateCash: result.privateCashSnapshot as string }; });
                attempt = state.create!;
            }
            const evidence = await verifyBankNoteAllocation(decode(attempt.fundingBytes!)), stages = createKairosOfflineNoteBrowserIssuanceStageStore(), proofs = createKairosOfflineNoteBrowserProofCustodyStore();
            const fundedAt = evidence.funding.fundedAtKai;
            if (BigInt(attempt.intent.acceptedAtKai) < BigInt(fundedAt)) {
                if (await stages.read(attempt.intent.preparationId))
                    throw Error("BANK_NOTE_ISSUE_INTENT_CONFLICT");
                state = await change(state, next => { next.create!.intent.acceptedAtKai = laterKai(fundedAt); });
                attempt = state.create!;
            }
            input.assertOpen();
            const issued = await issueKairosOfflineNoteLocally({ preparationId: attempt.intent.preparationId, accountProof: accountProofSource, identityPassphrase: input.passphrase, deviceIdentity: { localUid: input.localUid, keyId: input.keyId }, accountBinding: { accountUserId: input.uid, receizKeyId: input.keyId }, fundingRail: rail, amountPhiMicro: BigInt(bankAllocatedPhi(evidence.funding)), amountUsdCents: BigInt(evidence.funding.amountUsdCents), usdPerPhiMicrocents: BigInt(evidence.funding.usdPerPhiMicrocents), acceptedAtKai: attempt.intent.acceptedAtKai, transitionNonce: attempt.intent.transitionNonce, note: { noteId: attempt.intent.noteId, noteToken: attempt.intent.noteToken, mintedAt: attempt.intent.mintedAt, mintClientNonce: attempt.intent.transitionNonce }, reserveCustody: reserve, noteCustody, stageStore: stages, proofCustody: proofs, admissionStore: createReceizBrowserAdmissionStore({ databaseName: "receiz-bank-offline-note-admission-v129", namespace: `${input.uid}:allocation:${evidence.funding.allocationId}` }), assertSelectedPredecessor: input.assertOpen }, { sealDocument: input.sealDocument, ...(input.artwork ? { rasterizeSvg: () => input.artwork!(evidence.funding.amountUsdCents, attempt!.intent.noteId, true, rail) } : {}) });
            const stage = (await stages.read(issued.preparationId))!;
            const source: BankFundedNoteSource = { schema: "receiz.bank.funded-note-source.v1", fundingArtifactBytes: evidence.artifactBytes, fundingCustody: attempt.receivingCustody as BankFundedNoteSource["fundingCustody"], reserveConsumptions: [stage.reserveReceipt!], noteArtifacts: [issued.noteGenesis.artifactBytes] };
            const image = await imageFor(source);
            const sourceRef=await input.retain(new TextEncoder().encode(JSON.stringify(encodeBankFundedSource(source)))),imageRef=await input.retain(image);
            state = await change(state, next => { const complete = { ...next.create!, phase: "complete" as const, sourceRef,imageRef }; next.create = null; next.notes[issued.noteGenesis.noteId] = complete; });
            return { rail, amountPhiMicro: issued.noteGenesis.amountPhiMicro, noteId: issued.noteGenesis.noteId, amountUsdCents: issued.noteGenesis.amountUsdCents, image, successorAccountProof: issued.accountSuccessor.proof };
        },
        async receivingRequest() {
            const state = await load();
            if (Object.keys(state.receivers).length >= 64)
                throw Error("BANK_NOTE_RECEIVING_CAPACITY");
            const slot = `bank-receive:${input.keyId}:${crypto.randomUUID()}`, adapter = noteAdapter(slot), q = await adapter.qualifyInstallation();
            if (q.status !== "qualified")
                throw Error(`OFFLINE_NOTE_CUSTODY_UNSUPPORTED:${q.code}`);
            const custody = await adapter.createReceivingCommitment(q);
            requireKairosNoteAttestedReceivingCustody(custody);
            const prior = await input.read();
            state.receivers[custody.receivingCustodyCommitmentDigest] = slot;
            await input.write(state, prior);
            return new TextEncoder().encode(JSON.stringify({ schema: "receiz.bank.note-receiving-request.v1", receivingCustody: custody }));
        },
        async transferNote(noteId: string, requestBytes?: Uint8Array) {
            let state = await load();
            const stored = state.notes[noteId];
            if (!stored?.sourceRef)
                throw Error("BANK_NOTE_ORIGINAL_SOURCE_REQUIRED");
            if (stored.transferComplete && stored.imageRef) return { noteId, image: await input.restore(stored.imageRef) };
            const request = requestBytes ? obj(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(requestBytes))) : obj(stored.transfer?.request);
            if(request.schema==='receiz.bank.note-account-receiving-request.v1'){
                const requestSource=new TextEncoder().encode(JSON.stringify(request)),receiver=await verifyBankNoteAccountReceivingRequest(requestSource);
                if(stored.transfer&&JSON.stringify(stored.transfer.request)!==JSON.stringify(request))throw Error('BANK_NOTE_TRANSFER_PENDING');
                if(!stored.transfer){const original=await openBankNoteImage(await input.restore(stored.imageRef!)),head=readBankFundedNoteHead(original);
                    state=await change(state,next=>{next.notes[noteId]!.transfer={request,acceptedAtKai:laterKai(head.packet.acceptedAtKai),nonce:crypto.randomUUID()};});}
                const intent=state.notes[noteId]!.transfer!;
                let terminal=intent.terminalRef?await input.restore(intent.terminalRef):null;
                let image:Uint8Array;
                if(terminal)image=await exportBankNoteAccountDepositImage(terminal,await input.restore(stored.imageRef!),{receiverUserId:receiver.receiverUserId,receiverKeyId:receiver.receiverKeyId});
                else{
                    const transferred=await prepareBankNoteAccountTransfer({image:await input.restore(stored.imageRef!),request:requestSource,acceptedAtKai:intent.acceptedAtKai,nonce:intent.nonce,custody:noteAdapter(`wallet-note:${noteId}`),sealDocument:input.sealDocument,
                        onSealedSource:async bytes=>{const terminalRef=await input.retain(bytes);state=await change(state,next=>{next.notes[noteId]!.transfer!.terminalRef=terminalRef;});}});
                    terminal=transferred.terminalSourceBytes;image=transferred.image;
                }
                const imageRef=await input.retain(image);
                state=await change(state,next=>{next.notes[noteId]!.imageRef=imageRef;next.notes[noteId]!.transferComplete=true;});
                return {noteId,image};
            }
            if (request.schema !== "receiz.bank.note-receiving-request.v1" || Object.keys(request).sort().join("|") !== "receivingCustody|schema")
                throw Error("BANK_NOTE_RECEIVING_REQUEST_INVALID");
            const receiver = await verifyKairosNoteReceivingCustody(request.receivingCustody as Parameters<typeof verifyKairosNoteReceivingCustody>[0]);
            requireKairosNoteAttestedReceivingCustody(receiver);
            if (stored.transfer && JSON.stringify(stored.transfer.request) !== JSON.stringify(request))
                throw Error("BANK_NOTE_TRANSFER_PENDING");
            const source = decodeBankFundedSource(JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await input.restore(stored.sourceRef)))), note = await verifyBankFundedNoteSource(source), head = readBankFundedNoteHead(note);
            if (!stored.transfer) {
                state = await change(state, next => { next.notes[noteId]!.transfer = { request, acceptedAtKai: laterKai(head.packet.acceptedAtKai), nonce: crypto.randomUUID() }; });
            }
            if (head.packet.custodyMode === "qualified-anonymous" && head.packet.currentCustody.receivingCustodyCommitmentDigest === receiver.receivingCustodyCommitmentDigest && stored.imageRef) {
                await change(state, next => { next.notes[noteId]!.transferComplete = true; });
                return { noteId, image: await input.restore(stored.imageRef) };
            }
            const intent = state.notes[noteId]!.transfer!, carrier = createKairosNotePortableCarrier({ sealDocument: input.sealDocument }), opened = await carrier.open(head.artifactBytes), store = new InMemoryKairosNoteSettlementStore();
            await store.admitVerifiedHeldHead(opened);
            const successor = await settleKairosNoteQualifiedCustodyTransition({ store, carrier, senderCustody: noteAdapter(`wallet-note:${noteId}`), predecessorArtifactBytes: head.artifactBytes, expectedPredecessorArtifactSha256: head.artifactSha256, successorCustody: receiver, acceptedAtKai: intent.acceptedAtKai, transitionNonce: intent.nonce });
            const transferred = { ...source, noteArtifacts: [...source.noteArtifacts, successor.artifactBytes] }, image = await imageFor(transferred);
            const sourceRef=await input.retain(new TextEncoder().encode(JSON.stringify(encodeBankFundedSource(transferred)))),imageRef=await input.retain(image);
            state = await change(state, next => { next.notes[noteId] = { ...next.notes[noteId]!, sourceRef,imageRef, transferComplete: true }; });
            return { noteId, image };
        },
        async inspectNote(image: Uint8Array) { const note = isBankNoteAccountDeposit(image)?await readBankNoteAccountDeposit(image):await openBankNoteImage(image); return { rail: note.rail, noteId: note.noteId, amountUsdCents: note.amountUsdCents, amountPhiMicro: note.amountPhiMicro }; },
        async depositNote(image: Uint8Array) {
            let state = await load();
            const note = await openBankNoteImage(image), head = readBankFundedNoteHead(note), packet = head.packet;
            if (packet.custodyMode !== "qualified-anonymous" || !note.allocationId)
                throw Error("BANK_NOTE_EXCLUSIVE_FUNDING_REQUIRED");
            let attempt = state.deposits[note.noteId];
            if (!attempt) {
                const preview = obj(await input.request(path("redemption"), { method: "POST", body: { action: "preview", keyId: input.keyId, source: await packBankNoteBytes(new TextEncoder().encode(JSON.stringify(encodeBankFundedSource(readBankFundedNoteSource(note))))) } }));
                if (preview.ok !== true || preview.noteId !== note.noteId || preview.amountUsdCents !== note.amountUsdCents || preview.amountPhiMicro !== note.amountPhiMicro || preview.rail !== note.rail)
                    throw Error("BANK_NOTE_DEPOSIT_UNAVAILABLE");
                const intent: BankNoteRedemptionIntent = { schema: note.rail === "settlement" ? "receiz.bank.note-redemption.v2" : "receiz.bank.note-redemption.v1", ...(note.rail === "settlement" ? {rail: "settlement" as const} : {}), noteId: note.noteId, noteArtifactSha256: note.noteArtifactSha256, receiverUserId: input.uid, receiverKeyId: input.keyId, amountPhiMicro: note.amountPhiMicro, amountUsdCents: note.amountUsdCents, acceptedAtKai: laterKai(packet.acceptedAtKai), nonce: crypto.randomUUID() };
                const prior = await input.read();
                state.deposits[note.noteId] = { intent, imageRef:await input.retain(image) };
                await input.write(state, prior);
                attempt = state.deposits[note.noteId]!;
            }
            if (attempt.intent.noteArtifactSha256 !== note.noteArtifactSha256)
                throw Error("BANK_NOTE_EXACT_DEPOSIT_REQUIRED");
            if (!attempt.creditRef) {
                const recovered = obj(await input.request(`${path("redemption")}&noteId=${note.noteId}`, { method: "GET" }));
                input.assertOpen();
                let result = recovered;
                if (recovered.found === false) {
                    if (!attempt.terminalRef) {
                        const receivingSlot = state.receivers[packet.currentCustody.receivingCustodyCommitmentDigest], adapter = noteAdapter(receivingSlot ?? `wallet-note:${note.noteId}`);
                        // Retired custody must reach consumeExactHead, which only recovers
                        // the SAME intent receipt. It never activates or spends again.
                        if (receivingSlot && (await createKairosNoteIndexedDbPwaCustodyStorage(receivingSlot).read())?.status !== "retired")
                            await adapter.activateExactSuccessor({ qualificationDigest: packet.currentCustody.qualificationDigest, noteId: note.noteId, verifiedSuccessorArtifactSha256: note.noteArtifactSha256, receivingCustodyCommitmentDigest: packet.currentCustody.receivingCustodyCommitmentDigest, wholeValuePhiMicro: note.amountPhiMicro, acceptedAtKai: packet.acceptedAtKai });
                        input.assertOpen();
                        const terminal = await prepareBankNoteRedemption(note, attempt.intent, adapter, { sealDocument: input.sealDocument }), bytes = readBankNoteRedemption(terminal).bytes;
                        const packed = await packBankNoteBytes(bytes),terminalRef=await input.retain(new TextEncoder().encode(packed));
                        state = await change(state, next => { next.deposits[note.noteId]!.terminalRef = terminalRef; });
                        attempt = state.deposits[note.noteId]!;
                    }
                    result = obj(await input.request(path("redemption"), { method: "POST", body: { terminalArtifactBytes:new TextDecoder().decode(await input.restore(attempt.terminalRef!)) } }));
                }
                if (result.ok !== true || typeof result.artifactBytes !== "string" || typeof result.privateCashSnapshot !== "string")
                    throw Error("BANK_NOTE_DEPOSIT_PENDING");
                const terminalSource = attempt.terminalRef ? new TextDecoder().decode(await input.restore(attempt.terminalRef)) : result.terminalSourceBytes;
                if (typeof terminalSource !== "string")
                    throw Error("BANK_NOTE_DEPOSIT_PENDING");
                const credit = await verifyBankReserveCreditArtifact(decode(result.artifactBytes), decode(result.privateCashSnapshot), { terminalSource: await unpackBankNoteBytes(terminalSource) });
                if (credit.credit.receiverUserId !== input.uid || credit.credit.receiverKeyId !== input.keyId || credit.credit.redemptionDigest !== await (await import("../../../../packages/receiz-sdk/src/authorityEncoding")).digestReceizAuthority("transition", attempt.intent.schema, attempt.intent))
                    throw Error("BANK_NOTE_DEPOSIT_BINDING_MISMATCH");
                const terminalRef=await input.retain(new TextEncoder().encode(terminalSource)),creditRef=await input.retain(decode(result.artifactBytes));
                state = await change(state, next => { next.deposits[note.noteId]!.terminalRef = terminalRef; next.deposits[note.noteId]!.creditRef = creditRef; next.deposits[note.noteId]!.privateCash = result.privateCashSnapshot as string; delete next.receivers[packet.currentCustody.receivingCustodyCommitmentDigest]; });
                attempt = state.deposits[note.noteId]!;
            }
            const proof = await verifyBankReserveCreditArtifact(await input.restore(attempt.creditRef!), decode(attempt.privateCash!), { terminalSource: await unpackBankNoteBytes(new TextDecoder().decode(await input.restore(attempt.terminalRef!))) });
            return { rail: proof.rail, amountPhiMicro: proof.credit.amountPhiMicro, walletAfterPhiMicro: proof.snapshot.walletAfterPhiMicro, noteId: note.noteId, amountUsdCents: proof.credit.amountUsdCents, proofBytes: await exportBankNoteDepositReceipt(proof), reserveAfterUsdCents: proof.snapshot.reserveAfterUsdCents };
        }
    });
}
/** Existing SDK enrollment signs native note documents with their exact native
 * owner/history. The identity remains in the Bank closure; no key is exported. */
export async function createBankNativeNoteSealer(input: Readonly<{
    enrollment: import("../../../../packages/receiz-sdk/src/offlineSeal").ReceizOfflineSealEnrollment;
    resources: {
        wasm: Uint8Array;
        zkey: Uint8Array;
    };
}>): Promise<typeof receizeDocumentBytesClient> {
    if (input.enrollment.privateKey.extractable)
        throw Error("BANK_NOTE_NONEXPORTABLE_SEAL_KEY_REQUIRED");
    const { receizeDocumentBytesCore } = await import("../../documentSeal/receizeDocumentBytesCore");
    const { generateDocumentSealGroth16ProofWithResources } = await import("../../documentSeal/realGroth16ProofCore");
    const { maybeSignReceizBundleV4 } = await import("../../security/receizSignatureV4");
    return args => receizeDocumentBytesCore(args, {
        signingKey: "receiz-offline-signing-key-v2", verifyOrigin: "https://receiz.com",
        generateProof: basis => generateDocumentSealGroth16ProofWithResources(basis, { wasmPath: input.resources.wasm, zkeyPath: input.resources.zkey }),
        attachTrustedSignature: async (bundle) => { const signatureV4 = await maybeSignReceizBundleV4(bundle, { cert: input.enrollment.cert, sign: async (bytes) => new Uint8Array(await crypto.subtle.sign("Ed25519", input.enrollment.privateKey, bytes.slice().buffer)) }); if (!signatureV4)
            throw Error("BANK_NOTE_NATIVE_SEAL_REQUIRED"); return { ...bundle, signatureV4 }; }
    });
}

/** The same v129 browser custody primitives, composed over previously funded
 * complete sources and prequalified slots. No network fund allocator here. */
export function createBankPreparedBrowserRuntime(input:Omit<BankPreparedNotesInput,"slot"|"createSlot"|"cash"|"admission"|"clock"|"roots"> & {keyId:string;origin:string;fetchImpl:typeof fetch}) {
  const realms:Readonly<Record<string,string>>={"https://bankeiz.com":"bankeiz.com","https://bank.receiz.com":"receiz.com","http://localhost:4173":"localhost","http://localhost:5173":"localhost"};
  const rpId=Object.hasOwn(realms,input.origin)?realms[input.origin]:null;
  if(!rpId||input.identity.keyId!==input.keyId)throw Error("BANK_NOTE_TRANSPORT_REALM_INVALID");
  const webAuthn=createKairosNoteBrowserWebAuthnClient({origin:input.origin,rpId,fetchImpl:input.fetchImpl});
  const slot=(id:string)=>({adapter:createKairosNoteBrowserPwaCustodyAdapter({slotId:id,rpId,origin:input.origin,fetchImpl:input.fetchImpl}),read:()=>createKairosNoteIndexedDbPwaCustodyStorage(id).read()});
  return createBankPreparedNotesRuntime({...input,slot,createSlot:async id=>slot(id),cash:id=>createKairosReservePwaCustodyAdapter({webAuthn,storage:createBankPreparedCashStorage(input,id)}),admission:id=>createReceizBrowserAdmissionStore({databaseName:"receiz-bank-prepared-admission-v1",namespace:`bank-prepared:${input.keyId}:${input.uid}:${id}`}),clock:()=>({acceptedAtKai:nowKai(),exportedAt:new Date().toISOString()})});
}

// Connected account custody remains a distinct app profile; qualification is unchanged.
export * from "./connectedNote";
export * from "./connectedNoteImage";
export type {BankNoteAccountReceivingRequest} from "./accountReceiving";

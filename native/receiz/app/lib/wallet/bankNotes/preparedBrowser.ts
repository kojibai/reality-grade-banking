import {projectBankLocalWalletMovement} from "./localWalletValuation";
import {createReceizOfflineNoteCustodyQualification} from "../../../../packages/receiz-sdk/src/offlineNoteIrreversibleCustody";
import {sha256ReceizBytes} from "../../../../packages/receiz-sdk/src/index";
import {verifyBankCashAccountRebase} from "./cashAccountRebase";
import { canonicalizeReceizConstitution as canonical } from "../../../../packages/receiz-sdk/src/constitution";
import { parseReceizIdentityArtifactText, receizBase64UrlEncode, receizBase64UrlDecode, type ReceizKeyFileV1 } from "../../../../packages/receiz-sdk/src/identity";
import type { ReceizSignatureV4RootPublicKey } from "../../../../packages/receiz-sdk/src/verifier/signatureV4";
import type { ReceizAdmissionStore } from "../../../../packages/receiz-sdk/src/admissionStore";
import type { receizeDocumentBytesClient } from "../../documentSeal/receizeDocumentBytesClient";
import type { KairosNotePwaCustodyAdapter, KairosNotePwaCustodyState } from "../kairosNotePwaCustodyAdapter";
import type { createKairosReservePwaCustodyAdapter } from "../kairosReservePwaCustodyAdapter";
import { issueKairosOfflineNoteLocally, type KairosOfflineNoteIssuanceStageStore, type KairosOfflineNoteProofCustodyStore } from "../kairosOfflineNoteLocalIssuance";
import { verifyKairosNoteReceivingCustody, requireKairosNoteAttestedReceivingCustody } from "../kairosNoteCustodyVerification";
import { createKairosNotePortableCarrier } from "../kairosNotePortableCarrier";
import { InMemoryKairosNoteSettlementStore } from "../kairosNoteLocalTransition";
import { settleKairosNoteQualifiedCustodyTransition } from "../kairosNoteQualifiedCustodyTransition";
import { verifyBankNoteAllocation, bankAllocationRail, type BankNoteRail } from "./allocationEvidence";
import type { BankReserveAllocationEvidence } from "./allocation";
import type { BankSettlementAllocationEvidence } from "./settlementAllocation";
import { createBankLocalCreditJournal, type BankLocalCreditJournalState } from "./localCreditJournal";
import { verifyBankLocalAccountCreditSource, readBankLocalAccountCredit } from "./localAccountCredit";
import { verifyBankFundedNoteSource, readBankFundedNoteHead, readBankFundedNoteCashSuccessor, type BankFundedNoteSource } from "./fundedNote";
import { openBankNoteImage, exportBankNoteImage, assertBankNoteTransportCapacity } from "./noteImage";
import { encodeBankFundedSource, decodeBankFundedSource } from "./sourceCodec";

// Exact encrypted blob encoding: user namespace objects cannot collide with
// typed-byte tags because every node, including ordinary objects, is tagged.
type PrivateNode = ["bytes", string] | ["array", PrivateNode[]] | ["object", [string, PrivateNode][]] | ["scalar", string | number | boolean | null];
function encodeNode(value: unknown): PrivateNode {
  if(value instanceof Uint8Array)return ["bytes",receizBase64UrlEncode(value)];
  if(Array.isArray(value))return ["array",value.map(encodeNode)];
  if(value && typeof value==="object")return ["object",Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,encodeNode(v)])];
  if(value===null || typeof value==="string" || typeof value==="boolean" || typeof value==="number" && Number.isFinite(value))return ["scalar",value];
  throw Error("BANK_NOTE_PRIVATE_SOURCE_INVALID");
}
function decodeNode(node:PrivateNode):unknown {
  if(!Array.isArray(node)||node.length!==2)throw Error("BANK_NOTE_PRIVATE_SOURCE_INVALID");
  switch(node[0]) {
    case "bytes":return receizBase64UrlDecode(node[1]);
    case "array":return node[1].map(decodeNode);
    case "object":return Object.fromEntries(node[1].map(([k,v])=>[k,decodeNode(v)]));
    case "scalar":return node[1];
    default:throw Error("BANK_NOTE_PRIVATE_SOURCE_INVALID");
  }
}
const json=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value));
// Exact source-backed component arithmetic, never a new funding authority.
// The last denomination consumes its actual remaining Phi; repeating a rounded
// average quote must not strand a fixed-dollar Reserve claim.
function preparedNotePhi(cents:string,phi:string,usd:string,rate:string,rail:BankNoteRail){
 const c=BigInt(cents),p=BigInt(phi),u=BigInt(usd),r=BigInt(rate),D=1000000000000n;
 if(c<=0n||u<c||p<=0n||r<=0n)throw Error("BANK_NOTE_DENOMINATION_PRECISION");
 let amount=c===u?p:rail==="reserve"?(p*c+u-1n)/u:(c*D+r/2n)/r;
 if(c<u){
  // Intersect the integer-Phi intervals which round to the requested cents
  // AND the remaining cents. A valid first note must leave issuable backing.
  const minimum=(value:bigint)=>(value*D-D/2n+r-1n)/r;
  const maximum=(value:bigint)=>(value*D+D/2n-1n)/r;
  const low=[1n,minimum(c),p-maximum(u-c)].reduce((a,b)=>a>b?a:b);
  const high=[p-1n,maximum(c),p-minimum(u-c)].reduce((a,b)=>a<b?a:b);
  if(low>high)throw Error("BANK_NOTE_DENOMINATION_PRECISION");
  amount=amount<low?low:amount>high?high:amount;
 }
 if(amount<=0n||amount>p||(amount*r+D/2n)/D!==c||c<u&&((p-amount)*r+D/2n)/D!==u-c)throw Error("BANK_NOTE_DENOMINATION_PRECISION");
 return amount.toString();
}

type Slot = Readonly<{adapter:KairosNotePwaCustodyAdapter;read():Promise<KairosNotePwaCustodyState|null>}>;
type Cash=ReturnType<typeof createKairosReservePwaCustodyAdapter>;
type PreparedSlot={id:string;role:"note"|"receive";status:"preparing"|"ready"|"reserved"|"used";receivingCustody?:BankFundedNoteSource["fundingCustody"];noteId?:string};
type Component={id:string;slotId:string;rail:BankNoteRail;sourceRef:string;kind:"allocation"|"credit";receivingCustody:BankFundedNoteSource["fundingCustody"];consumptions:BankFundedNoteSource["reserveConsumptions"];lastSourceRef?:string;exhausted?:boolean};
type Create={accountValuation?:"exact-rail-phi-v1";amountPhiMicro?:string;componentId:string;slotId:string;predecessorRef:string;artworkRef:string;amountUsdCents:string;rail:BankNoteRail;preparationId:string;noteId:string;noteToken:string;acceptedAtKai:string;exportedAt:string;nonce:string;priorConsumptions:BankFundedNoteSource["reserveConsumptions"];rebases:NonNullable<BankFundedNoteSource["accountRebases"]>};
type Saved={sourceRef:string;imageRef:string;slotId:string;transferComplete?:boolean;transfer?:{request:BankFundedNoteSource["fundingCustody"];acceptedAtKai:string;nonce:string;artworkRef?:string}};
type State={schema:"receiz.bank.prepared-notes-device.v1";keyId:string;uid:string;journal:BankLocalCreditJournalState|null;slots:Record<string,PreparedSlot>;components:Record<string,Component>;create:Create|null;notes:Record<string,Saved>;stages:Record<string,string>;proofs:Record<string,string>};
export type BankPreparedNotesInput=Readonly<{
  identity:ReceizKeyFileV1;uid:string;localUid:string;passphrase:string;roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;sealDocument:typeof receizeDocumentBytesClient;
  assertOpen():void;read():Promise<unknown>;write(next:unknown,previous:unknown,accountProof?:ReceizKeyFileV1):Promise<void>;
  retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>;
  slot(id:string):Slot;createSlot(id:string):Promise<Slot>;cash(slotId:string):Cash;admission(componentId:string):ReceizAdmissionStore;
  artwork(amount:string,noteId:string,compact?:boolean,rail?:BankNoteRail):Promise<Uint8Array>;
  clock():{acceptedAtKai:string;exportedAt:string};
}>;
/** Browser composition of v129 sources and qualified custody. Persisted resource
 * labels are pointers only; every spending budget is reopened from its source.
 * Caller holds its existing per-account operation lock through every mutation. */
export function createBankPreparedNotesRuntime(input:BankPreparedNotesInput) {
  const identity=parseReceizIdentityArtifactText(JSON.stringify(input.identity));
  if(identity.crypto.privateKeyPkcs8B64u)throw Error("BANK_NOTE_PROTECTED_IDENTITY_REQUIRED");
  const verifyOptions={roots:input.roots};
  async function load(){input.assertOpen();const previous=await input.read();
    const state=previous==null?{schema:"receiz.bank.prepared-notes-device.v1",keyId:identity.keyId,uid:input.uid,journal:null,slots:{},components:{},create:null,notes:{},stages:{},proofs:{}} as State:structuredClone(previous) as State;
    if(state.schema!=="receiz.bank.prepared-notes-device.v1"||state.keyId!==identity.keyId||state.uid!==input.uid)throw Error("BANK_NOTE_IDENTITY_CHANGED");
    for(const value of [state.slots,state.components,state.notes,state.stages,state.proofs])if(!value||typeof value!=="object"||Array.isArray(value))throw Error("BANK_NOTE_PRIVATE_SOURCE_INVALID");
    return {state,previous};
  }
  async function mutate(change:(state:State)=>void,head?:ReceizKeyFileV1){const {state,previous}=await load();change(state);input.assertOpen();await input.write(state,previous,head);input.assertOpen();return state;}
  async function restoreJson(ref:string){input.assertOpen();return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await input.restore(ref)));}
  const stages:KairosOfflineNoteIssuanceStageStore={read:async id=>{const ref=(await load()).state.stages[id];return ref?decodeNode(await restoreJson(ref)) as Awaited<ReturnType<KairosOfflineNoteIssuanceStageStore["read"]>>:null;},write:async(id,value)=>{const ref=await input.retain(json(encodeNode(value)));await mutate(s=>{s.stages[id]=ref;});}};
  const proofs:KairosOfflineNoteProofCustodyStore={read:async id=>{const ref=(await load()).state.proofs[id];return ref?decodeNode(await restoreJson(ref)) as Awaited<ReturnType<KairosOfflineNoteProofCustodyStore["read"]>>:null;},commitExactSuccessors:async value=>{const old=await proofs.read(value.preparationId);if(old){if(canonical(encodeNode(old))!==canonical(encodeNode(value)))throw Error("OFFLINE_NOTE_PROOF_CUSTODY_CONFLICT");return old;}const ref=await input.retain(json(encodeNode(value)));await mutate(s=>{s.proofs[value.preparationId]=ref;});return value;}};
  const journal=createBankLocalCreditJournal({identity,uid:input.uid,roots:input.roots,sealDocument:input.sealDocument,assertOpen:input.assertOpen,
    read:async()=>(await load()).state.journal,
    write:async(next,expected)=>{const loaded=await load();if(canonical(loaded.state.journal)!==canonical(expected))throw Error("BANK_LOCAL_CREDIT_ACCOUNT_HEAD_CONFLICT");
      const proof=next.accountProofRef!==loaded.state.journal?.accountProofRef && next.accountProofRef?parseReceizIdentityArtifactText(JSON.stringify(await restoreJson(next.accountProofRef))):undefined;
      for(const deposit of Object.values(next.deposits)){const preparation=await restoreJson(deposit.preparationRef),slotId=slotBindings.get(preparation.intent.receiverCashCustodyCommitmentDigest);if(slotId)creditBindings.set(preparation.intent.localCreditId,slotId);}
      loaded.state.journal=next;await input.write(loaded.state,loaded.previous,proof);input.assertOpen();},retain:input.retain,restore:input.restore,
    noteCustody:note=>{const held=readBankFundedNoteHead(note),digest=held.packet.custodyMode==="qualified-anonymous"?held.packet.currentCustody.receivingCustodyCommitmentDigest:"";
      // Slot resolution is synchronous after source/custody preparation below.
      const slotId=slotBindings.get(digest);if(!slotId)throw Error("BANK_NOTE_RECEIVING_CUSTODY_REQUIRED");return input.slot(slotId);},
    cashCustody:id=>{const slotId=creditBindings.get(id);if(!slotId)throw Error("BANK_NOTE_RECEIVING_CUSTODY_REQUIRED");return input.cash(slotId);}});
  const slotBindings=new Map<string,string>(),creditBindings=new Map<string,string>();
  const temporal=(after:string)=>{const time=input.clock(),now=BigInt(time.acceptedAtKai);return{acceptedAtKai:String(now>BigInt(after)?now:BigInt(after)+1n),exportedAt:time.exportedAt};};
  const pending=async()=>{const c=(await load()).state.create;return c?{noteId:c.noteId,rail:c.rail,amountUsdCents:c.amountUsdCents,canCancel:false}:null;};
  async function source(ref:string){return decodeBankFundedSource(await restoreJson(ref));}
  async function imageFor(s:BankFundedNoteSource,artwork?:Uint8Array){const note=await verifyBankFundedNoteSource(s,verifyOptions);return exportBankNoteImage(note,artwork??await input.artwork(note.amountUsdCents,note.noteId,false,note.rail));}
  async function componentHead(component:Component) {
    try {
      const original=await input.restore(component.sourceRef),receiving=await verifyKairosNoteReceivingCustody(component.receivingCustody,verifyOptions);requireKairosNoteAttestedReceivingCustody(receiving);
      let qualification:Awaited<ReturnType<typeof createReceizOfflineNoteCustodyQualification>>,phi:string,usd:string,head:string,kai:string,artifactSha:string,rate:string;
      if(component.kind==="allocation"){
        const e=await verifyBankNoteAllocation(original,verifyOptions),f=e.funding;
        if(f.allocationId!==component.id||bankAllocationRail(f)!==component.rail||f.accountUserId!==input.uid||f.receizKeyId!==identity.keyId
          ||f.qualificationDigest!==receiving.qualificationDigest||f.receivingCustodyCommitmentDigest!==receiving.receivingCustodyCommitmentDigest)throw Error("binding");
        qualification=await createReceizOfflineNoteCustodyQualification(receiving);phi="fundedSettlementPhiMicro" in f?f.fundedSettlementPhiMicro:f.fundedReservePhiMicro;usd=f.amountUsdCents;head=f.predecessorAccountPortableStateDigest;kai=f.fundedAtKai;artifactSha=e.artifactSha256;rate=f.usdPerPhiMicrocents;
      }else{
        const e=await verifyBankLocalAccountCreditSource(original,verifyOptions),terminal=readBankLocalAccountCredit(e),origin=readBankFundedNoteHead(terminal.note);
        if(e.creditId!==component.id||e.receiverUserId!==input.uid||e.receiverKeyId!==identity.keyId||e.rail!==component.rail||origin.packet.custodyMode!=="qualified-anonymous"||canonical(origin.packet.currentCustody)!==canonical(receiving))throw Error("binding");
        qualification=e.qualification;phi=e.amountPhiMicro;usd=e.amountUsdCents;head=e.successorAccountPortableStateDigest;kai=e.acceptedAtKai;artifactSha=e.artifactSha256;rate=e.usdPerPhiMicrocents;
      }
      let usedRebases=0;
      if(component.lastSourceRef){
        const complete=await source(component.lastSourceRef),note=await verifyBankFundedNoteSource(complete,verifyOptions),verified=readBankFundedNoteCashSuccessor(note);
        if(await sha256ReceizBytes(complete.fundingArtifactBytes)!==await sha256ReceizBytes(original)||canonical(complete.reserveConsumptions)!==canonical(component.consumptions)||note.allocationId!==component.id)throw Error("binding");
        qualification=verified.qualification;phi=verified.amountPhiMicro;usd=verified.amountUsdCents;head=verified.accountHead;kai=verified.acceptedAtKai;usedRebases=complete.accountRebases?.length??0;
      }else if(component.consumptions.length)throw Error("source-required");
      const bound=await input.cash(component.slotId).inspectBoundHead();if(!bound)throw Error("cash-required");
      const rebases=bound.bankAccountRebases??[];
      if(component.lastSourceRef){const prior=(await source(component.lastSourceRef)).accountRebases??[];if(canonical(rebases.slice(0,usedRebases))!==canonical(prior))throw Error("binding");}
      for(const step of rebases.slice(usedRebases)){
        if(BigInt(step.acceptedAtKai)<BigInt(kai))throw Error("causal-order");
        qualification=await verifyBankCashAccountRebase(step,{qualification,fundingArtifactSha256:artifactSha,rpId:receiving.platformAttestationCertificate.rpId,origin:receiving.platformAttestationCertificate.origin,accountHead:head,reservePhiMicro:phi,reserveUsdCents:usd});head=step.successorAccountPortableStateDigest;kai=step.acceptedAtKai;
      }
      if(bound.qualificationDigest!==qualification.qualificationDigest||bound.reservePhiMicro!==phi||bound.reserveUsdCents!==usd||bound.accountPortableStateDigest!==head||bound.bankAllocationId!==component.id||bound.fundingArtifactSha256!==artifactSha||bound.bankAllocationUsdPerPhiMicrocents!==undefined&&bound.bankAllocationUsdPerPhiMicrocents!==rate)throw Error("binding");
      return Object.freeze({...bound,bankAllocationUsdPerPhiMicrocents:rate});
    }catch(error){throw Error("BANK_NOTE_COMPONENT_HEAD_MISMATCH",{cause:error});}
  }
  // A committed account transition can outlive an interrupted pointer write.
  // Recover only references to independently reopened complete native sources.
  async function recoverCompletedCredits(){
    const {state}=await load();
    for(const [id,entry] of Object.entries(state.journal?.components??{})){
      if(state.components[id])continue;
      const evidence=await verifyBankLocalAccountCreditSource(await input.restore(entry.creditSourceRef),verifyOptions);
      if(evidence.creditId!==id||evidence.receiverUserId!==input.uid||evidence.receiverKeyId!==identity.keyId)throw Error("BANK_NOTE_IDENTITY_CHANGED");
      const original=readBankFundedNoteHead(readBankLocalAccountCredit(evidence).note);
      if(original.packet.custodyMode!=="qualified-anonymous")throw Error("BANK_NOTE_QUALIFIED_CUSTODY_REQUIRED");
      const receiving=original.packet.currentCustody;requireKairosNoteAttestedReceivingCustody(receiving);
      const slot=Object.values(state.slots).find(s=>s.receivingCustody?.receivingCustodyCommitmentDigest===receiving.receivingCustodyCommitmentDigest);
      const slotId=slot?.id??state.notes[entry.noteId]?.slotId;
      if(!slotId)throw Error("BANK_NOTE_RECEIVING_CUSTODY_REQUIRED");
      await mutate(s=>{s.components[id]??={id,slotId,rail:evidence.rail,sourceRef:entry.creditSourceRef,kind:"credit",receivingCustody:receiving,consumptions:[]};if(s.slots[slotId])s.slots[slotId]!.status="used";});
    }
  }
  async function accountProof(){return journal.accountProof();}
  return Object.freeze({accountProof,pending,
    async hasPreparedFunding(rail:BankNoteRail){await recoverCompletedCredits();return Object.values((await load()).state.components).some(c=>c.rail===rail&&!c.exhausted);},
    async holdsReceivingCustody(image:Uint8Array){
      const note=await openBankNoteImage(image,verifyOptions),head=readBankFundedNoteHead(note),{state}=await load();
      if(head.packet.custodyMode!=="qualified-anonymous")return false;
      const digest=head.packet.currentCustody.receivingCustodyCommitmentDigest;
      if(Object.values(state.slots).some(s=>s.receivingCustody?.receivingCustodyCommitmentDigest===digest))return true;
      const saved=state.notes[note.noteId];if(!saved)return false;
      const held=await source(saved.sourceRef),original=readBankFundedNoteHead(await verifyBankFundedNoteSource(held,verifyOptions));
      return original.packet.custodyMode==="qualified-anonymous"&&original.packet.currentCustody.receivingCustodyCommitmentDigest===digest;
    },
    async prepareResources(count:Readonly<{notes:number;receivers:number}>){
      if(![count.notes,count.receivers].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=16))throw Error("BANK_NOTE_RESOURCE_CAPACITY");
      for(const [role,needed] of [["note",count.notes],["receive",count.receivers]] as const){
        for(;;){const {state}=await load();const ready=Object.values(state.slots).filter(s=>s.role===role&&s.status==="ready");if(ready.length>=needed)break;
          let slot=Object.values(state.slots).find(s=>s.role===role&&s.status==="preparing");
          if(!slot){if(Object.keys(state.slots).length>=64)throw Error("BANK_NOTE_RESOURCE_CAPACITY");slot={id:`bank-prepared:${input.uid}:${identity.keyId}:${crypto.randomUUID()}`,role,status:"preparing"};const held=slot;await mutate(s=>{s.slots[held.id]=held;});}
          const adapter=await input.createSlot(slot.id),q=await adapter.adapter.qualifyInstallation();if(q.status!=="qualified")throw Error(`OFFLINE_NOTE_CUSTODY_UNSUPPORTED:${q.code}`);
          const receiving=await verifyKairosNoteReceivingCustody(await adapter.adapter.createReceivingCommitment(q),verifyOptions);requireKairosNoteAttestedReceivingCustody(receiving);
          const id=slot.id;await mutate(s=>{s.slots[id]={...s.slots[id]!,status:"ready",receivingCustody:receiving};});
        }
      }
    },
    async importPreparedFunding(args:Readonly<{slotId:string;artifactBytes:Uint8Array;privateCashSnapshot:Uint8Array;accountProof:ReceizKeyFileV1}>){
      const {state}=await load();if(state.create)throw Error("BANK_LOCAL_CREDIT_RECOVERY_REQUIRED");
      const evidence=await verifyBankNoteAllocation(args.artifactBytes,verifyOptions),f=evidence.funding;
      if(f.accountUserId!==input.uid||f.receizKeyId!==identity.keyId)throw Error("BANK_NOTE_IDENTITY_CHANGED");
      await journal.initializePreparedFunding(args);
      const slot=input.slot(args.slotId),held=await slot.read();if(!held||held.status!=="active")throw Error("BANK_NOTE_QUALIFIED_CUSTODY_REQUIRED");
      const q=await slot.adapter.qualifyInstallation();if(q.status!=="qualified")throw Error("BANK_NOTE_QUALIFIED_CUSTODY_REQUIRED");
      const receiving=await verifyKairosNoteReceivingCustody(await slot.adapter.createReceivingCommitment(q),verifyOptions);requireKairosNoteAttestedReceivingCustody(receiving);
      const cash=input.cash(args.slotId);if(!await cash.inspectFundingPrepared()&&!await cash.inspectBoundHead())await cash.prepareFundingCustody({credential:held.credential,qualification:q,receivingCustody:receiving,predecessorAccountProof:args.accountProof});
      if("fundedSettlementPhiMicro" in f)await cash.activateBankAllocatedSettlement({evidence:evidence as BankSettlementAllocationEvidence,privateCashSnapshot:args.privateCashSnapshot});
      else await cash.activateBankAllocatedReserve({evidence:evidence as BankReserveAllocationEvidence,privateCashSnapshot:args.privateCashSnapshot});
      const ref=await input.retain(args.artifactBytes);await mutate(s=>{s.components[f.allocationId]??={id:f.allocationId,slotId:args.slotId,rail:bankAllocationRail(f),sourceRef:ref,kind:"allocation",receivingCustody:receiving,consumptions:[]};});
    },
    async receivingRequest(){const {state}=await load();const slot=Object.values(state.slots).find(s=>s.role==="receive"&&s.status==="ready");if(!slot?.receivingCustody)throw Error("BANK_NOTE_PREPARED_RECEIVER_REQUIRED");await mutate(s=>{s.slots[slot.id]!.status="reserved";});return json({schema:"receiz.bank.note-receiving-request.v1",receivingCustody:slot.receivingCustody});},
    async createNote(amountUsdCents:string,_accountProof:ReceizKeyFileV1,rail:BankNoteRail="reserve"){
      if(!["reserve","settlement"].includes(rail)||! /^[1-9][0-9]*$/.test(amountUsdCents)||BigInt(amountUsdCents)>100000000n)throw Error("BANK_NOTE_AMOUNT_INVALID");
      await recoverCompletedCredits();
      let {state}=await load(),attempt=state.create;
      if(!attempt){
        const head=await journal.accountHead();if(!head)throw Error("BANK_LOCAL_CREDIT_ACCOUNT_SOURCE_REQUIRED");const proof=(await journal.accountProof())!;
        let selected:Component|undefined,bound:Awaited<ReturnType<Cash["inspectBoundHead"]>>=null;
        for(const component of Object.values(state.components)){if(component.rail!==rail)continue;const candidate=await componentHead(component);if(candidate&&BigInt(candidate.reserveUsdCents)>=BigInt(amountUsdCents)){selected=component;bound=candidate;break;}}
        if(!selected||!bound)throw Error("BANK_NOTE_INSUFFICIENT_PREPARED_FUNDS");
        const amountPhiMicro=preparedNotePhi(amountUsdCents,bound.reservePhiMicro!,bound.reserveUsdCents,bound.bankAllocationUsdPerPhiMicrocents!,rail);
        projectBankLocalWalletMovement((proof.portableState!.snapshot as {wallet:{routeSummary:Record<string,unknown>}}).wallet.routeSummary,rail,amountPhiMicro,amountUsdCents,"debit");
        const slot=Object.values(state.slots).find(s=>s.role==="note"&&s.status==="ready");if(!slot)throw Error("BANK_NOTE_PREPARED_RESOURCE_REQUIRED");
        const now=temporal(String((proof.portableState!.snapshot as {wallet:{routeSummary:{rollup:{lastEntryKaiPulse?:string}}}}).wallet.routeSummary.rollup.lastEntryKaiPulse??"0"));
        const cash=input.cash(selected.slotId);if(bound.accountPortableStateDigest!==head.digest){await cash.rebaseBankAccount({head,acceptedAtKai:now.acceptedAtKai,nonce:crypto.randomUUID()});bound=await cash.inspectBoundHead();}
        const id=crypto.randomUUID(),predecessorRef=await input.retain(json(proof)),artworkRef=await input.retain(await input.artwork(amountUsdCents,id,false,rail));
        attempt={accountValuation:"exact-rail-phi-v1",amountPhiMicro,componentId:selected.id,slotId:slot.id,predecessorRef,artworkRef,amountUsdCents,rail,preparationId:crypto.randomUUID(),noteId:id,noteToken:crypto.randomUUID().replace(/-/g,""),acceptedAtKai:temporal(now.acceptedAtKai).acceptedAtKai,exportedAt:now.exportedAt,nonce:crypto.randomUUID(),priorConsumptions:selected.consumptions,rebases:bound?.bankAccountRebases??[]};const retained=attempt;await mutate(s=>{if(s.create)throw Error("BANK_LOCAL_CREDIT_RECOVERY_REQUIRED");s.create=retained;s.slots[slot.id]!.status="reserved";s.slots[slot.id]!.noteId=id;});state=(await load()).state;
      }else if(attempt.amountUsdCents!==amountUsdCents||attempt.rail!==rail)throw Error("BANK_NOTE_RESUME_EXACT_AMOUNT");
      const held=attempt,component=state.components[held.componentId];if(!component)throw Error("BANK_NOTE_COMPLETE_FUNDING_SOURCE_REQUIRED");
      const fundingBytes=await input.restore(component.sourceRef),proof=parseReceizIdentityArtifactText(JSON.stringify(await restoreJson(held.predecessorRef)));
      const rate=component.kind==="allocation"?(await verifyBankNoteAllocation(fundingBytes,verifyOptions)).funding.usdPerPhiMicrocents:(await verifyBankLocalAccountCreditSource(fundingBytes,verifyOptions)).usdPerPhiMicrocents;
      const staged=await stages.read(held.preparationId);
      const before=staged?null:await componentHead(component);
      const exactPhi=staged?staged.reserveInput.amountPhiMicro:preparedNotePhi(amountUsdCents,before!.reservePhiMicro!,before!.reserveUsdCents,rate,rail);
      if(held.amountPhiMicro!==undefined&&held.amountPhiMicro!==exactPhi)throw Error("BANK_NOTE_INTENT_CHANGED");
      // Preserve older retained stages exactly. Unstarted legacy intents adopt
      // the source-derived amount before any irreversible custody operation.
      if(held.amountPhiMicro===undefined)await mutate(s=>{if(s.create?.preparationId!==held.preparationId)throw Error("BANK_NOTE_INTENT_CHANGED");s.create.amountPhiMicro=exactPhi;});
      const amountPhi=BigInt(exactPhi),artwork=await input.restore(held.artworkRef);
      const build=(noteBytes:Uint8Array,consumptions:BankFundedNoteSource["reserveConsumptions"]):BankFundedNoteSource=>({schema:held.rebases.length?"receiz.bank.funded-note-source.v2":"receiz.bank.funded-note-source.v1",...(held.rebases.length?{accountRebases:held.rebases}:{}),fundingArtifactBytes:fundingBytes,fundingCustody:component.receivingCustody,noteArtifacts:[noteBytes],reserveConsumptions:consumptions});
      const issued=await issueKairosOfflineNoteLocally({preparationId:held.preparationId,accountValuation:held.accountValuation,accountProof:proof,identityPassphrase:input.passphrase,deviceIdentity:{localUid:input.localUid,keyId:identity.keyId},accountBinding:{accountUserId:input.uid,receizKeyId:identity.keyId},fundingRail:rail,amountPhiMicro:amountPhi,amountUsdCents:BigInt(amountUsdCents),usdPerPhiMicrocents:BigInt(rate),acceptedAtKai:held.acceptedAtKai,transitionNonce:held.nonce,note:{noteId:held.noteId,noteToken:held.noteToken,mintedAt:held.exportedAt,mintClientNonce:held.nonce},noteCustody:input.slot(held.slotId).adapter,reserveCustody:input.cash(component.slotId),stageStore:stages,proofCustody:proofs,admissionStore:input.admission(component.id),admissionRootPublicKeys:input.roots,assertSelectedPredecessor:input.assertOpen,
        preflightTransport:async prepared=>assertBankNoteTransportCapacity(build(prepared.artifactBytes,held.priorConsumptions),artwork)}, {sealDocument:input.sealDocument,rasterizeSvg:()=>input.artwork(amountUsdCents,held.noteId,true,rail)});
      const stage=(await stages.read(held.preparationId))!,consumptions=[...held.priorConsumptions,stage.reserveReceipt!],complete=build(issued.noteGenesis.artifactBytes,consumptions);
      const note=await verifyBankFundedNoteSource(complete,verifyOptions),image=await imageFor(complete,artwork),sourceRef=await input.retain(json(encodeBankFundedSource(complete))),imageRef=await input.retain(image);
      await journal.recordIssuance({note,predecessorAccountProof:proof,successorAccountProof:issued.accountSuccessor.proof});
      await mutate(s=>{if(s.create?.noteId!==held.noteId)throw Error("BANK_NOTE_INTENT_CHANGED");s.components[component.id]!.consumptions=consumptions;s.components[component.id]!.lastSourceRef=sourceRef;s.components[component.id]!.exhausted=stage.reserveInput.reserveAfterPhiMicro==="0"&&stage.reserveInput.reserveAfterUsdCents==="0";s.notes[held.noteId]={sourceRef,imageRef,slotId:held.slotId};s.create=null;});
      return{rail,noteId:note.noteId,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro,image,successorAccountProof:issued.accountSuccessor.proof,localAccountHead:true as const};
    },
    async savedNotes(){const {state}=await load(),result=[];for(const [id,saved]of Object.entries(state.notes)){if(state.journal?.deposits[id]?.phase==="complete")continue;const image=await input.restore(saved.imageRef),note=await openBankNoteImage(image,verifyOptions);result.push({rail:note.rail,noteId:note.noteId,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro,image,transferred:!!saved.transferComplete,transferPending:!!saved.transfer&&!saved.transferComplete});}return result;},
    async inspectNote(image:Uint8Array){const note=await openBankNoteImage(image,verifyOptions);return{rail:note.rail,noteId:note.noteId,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro};},
    async transferNote(noteId:string,request?:Uint8Array){let {state}=await load();if(state.create)throw Error("BANK_LOCAL_CREDIT_RECOVERY_REQUIRED");let saved=state.notes[noteId];if(!saved)throw Error("BANK_NOTE_HELD_SOURCE_REQUIRED");if(saved.transferComplete)return{noteId,image:await input.restore(saved.imageRef)};
      const complete=await source(saved.sourceRef),note=await verifyBankFundedNoteSource(complete,verifyOptions),head=readBankFundedNoteHead(note);
      if(!saved.transfer){if(!request)throw Error("BANK_NOTE_RECEIVING_REQUEST_REQUIRED");const row=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(request));if(row.schema!=="receiz.bank.note-receiving-request.v1"||Object.keys(row).sort().join("|")!=="receivingCustody|schema")throw Error("BANK_NOTE_RECEIVING_REQUEST_REQUIRED");const receiving=await verifyKairosNoteReceivingCustody(row.receivingCustody,verifyOptions);requireKairosNoteAttestedReceivingCustody(receiving);const at=temporal(head.packet.acceptedAtKai);const intent={request:receiving,acceptedAtKai:at.acceptedAtKai,nonce:crypto.randomUUID()};await mutate(s=>{s.notes[noteId]!.transfer=intent;});state=(await load()).state;saved=state.notes[noteId]!;}
      const carrier=createKairosNotePortableCarrier({canonicalSignatureV4RootPublicKeys:input.roots,sealDocument:input.sealDocument}),store=new InMemoryKairosNoteSettlementStore();await store.admitVerifiedHeldHead(await carrier.open(head.artifactBytes));
      if(!saved.transfer!.artworkRef){
        const artwork=await input.artwork(note.amountUsdCents,note.noteId,false,note.rail);
        await assertBankNoteTransportCapacity(complete,artwork,Math.ceil((head.artifactBytes.length+json(saved.transfer!.request).length+262144)*4/3));
        const artworkRef=await input.retain(artwork);await mutate(s=>{s.notes[noteId]!.transfer!.artworkRef=artworkRef;});saved=(await load()).state.notes[noteId]!;
      }
      const transferArtwork=await input.restore(saved.transfer!.artworkRef!);
      await assertBankNoteTransportCapacity(complete,transferArtwork,Math.ceil((head.artifactBytes.length+json(saved.transfer!.request).length+262144)*4/3));
      const moved=await settleKairosNoteQualifiedCustodyTransition({store,carrier,senderCustody:input.slot(saved.slotId).adapter,predecessorArtifactBytes:head.artifactBytes,expectedPredecessorArtifactSha256:head.artifactSha256,successorCustody:saved.transfer!.request,acceptedAtKai:saved.transfer!.acceptedAtKai,transitionNonce:saved.transfer!.nonce,admissionRootPublicKeys:input.roots});
      const nextSource={...complete,noteArtifacts:[...complete.noteArtifacts,moved.artifactBytes]},image=await imageFor(nextSource,transferArtwork),sourceRef=await input.retain(json(encodeBankFundedSource(nextSource))),imageRef=await input.retain(image);await mutate(s=>{s.notes[noteId]={...s.notes[noteId]!,sourceRef,imageRef,transferComplete:true};});return{noteId,image};
    },
    async depositNote(image:Uint8Array,account:ReceizKeyFileV1){const {state}=await load();if(state.create)throw Error("BANK_LOCAL_CREDIT_RECOVERY_REQUIRED");const note=await openBankNoteImage(image,verifyOptions),head=readBankFundedNoteHead(note);if(head.packet.custodyMode!=="qualified-anonymous")throw Error("BANK_NOTE_QUALIFIED_CUSTODY_REQUIRED");
      const digest=head.packet.currentCustody.receivingCustodyCommitmentDigest,slot=Object.values(state.slots).find(s=>s.receivingCustody?.receivingCustodyCommitmentDigest===digest),id=slot?.id??state.notes[note.noteId]?.slotId;if(!id)throw Error("BANK_NOTE_RECEIVING_CUSTODY_REQUIRED");slotBindings.set(digest,id);
      const adapter=input.slot(id),held=await adapter.read();if(slot&&held?.status!=="retired")await adapter.adapter.activateExactSuccessor({qualificationDigest:head.packet.currentCustody.qualificationDigest,noteId:note.noteId,verifiedSuccessorArtifactSha256:note.noteArtifactSha256,receivingCustodyCommitmentDigest:digest,wholeValuePhiMicro:note.amountPhiMicro,acceptedAtKai:head.packet.acceptedAtKai});
      const previous=state.journal?.deposits[note.noteId];if(previous){const preparation=await restoreJson(previous.preparationRef);creditBindings.set(preparation.intent.localCreditId,id);}
      const at=temporal(head.packet.acceptedAtKai);
      // Credit identity is derived from the retained native preparation, including
      // restart after consumption. Bind only the exact matching receiver slot.
      const result=await journal.deposit({note,accountProof:account,passphrase:input.passphrase,acceptedAtKai:at.acceptedAtKai,transitionNonce:crypto.randomUUID(),exportedAt:at.exportedAt});const terminal=readBankLocalAccountCredit(result.evidence),original=readBankFundedNoteHead(terminal.note);if(original.packet.custodyMode!=="qualified-anonymous")throw Error("BANK_NOTE_QUALIFIED_CUSTODY_REQUIRED");const receiving=original.packet.currentCustody;requireKairosNoteAttestedReceivingCustody(receiving);const ref=await input.retain(result.sourceBytes);
        await mutate(s=>{s.components[result.evidence.creditId]??={id:result.evidence.creditId,slotId:id,rail:note.rail,sourceRef:ref,kind:"credit",receivingCustody:receiving,consumptions:[]};if(s.slots[id])s.slots[id]!.status="used";});
        const summary=(result.successorAccountProof.portableState!.snapshot as {wallet:{routeSummary:{balancePhiMicro:string;valueStates:{settledBalanceUsdCents:string}}}}).wallet.routeSummary;
        return{rail:note.rail,noteId:note.noteId,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro,walletAfterPhiMicro:summary.balancePhiMicro,reserveAfterUsdCents:summary.valueStates.settledBalanceUsdCents,proofBytes:result.sourceBytes,successorAccountProof:result.successorAccountProof,localAccountHead:true as const};
    }
  });
}

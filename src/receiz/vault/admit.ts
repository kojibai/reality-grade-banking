import type {ReceizKeyFile} from '@receiz/sdk';
import {BANK_APPLICATION_ID} from '../config';
import {loadBankNoteRuntime,type BankNoteInspection} from '../offline-notes';
import {admitPreparedVaultCustody,admitVaultCustodyForBank} from './custody';
import {encodeVaultPrivateSource,readVaultPrivateSource,type VaultPrivateSource} from './source';
import {admitVaultMoneyState,readVaultMoney,createVaultMoneyNative,type MoneyNativeInput,type VaultMoneyNative} from './money';
import {createVaultAssets,admitVaultAssetConsentForBank,admitVaultAssetPreflightForBank,admitVaultAssetResultForBank,admitVaultAssetSourceForBank,admitVaultAssetSuccessorForBank,type VaultAssetProjection} from './assets';
import {createVaultMarket,type VaultMarketProjection} from './market';
import {vaultBytes} from './encoding';
import type {VaultNativeCustodySubmission,VaultNativeRuntime} from './runtime';

export type VaultPrivateWorkflowsProjection={
 money:(BankNoteInspection&{sourceRef:string})[];
 assets:VaultAssetProjection[];
 investments:VaultMarketProjection[];
 pending:boolean;
};
/** Recorded, source-admitted holdings. No private credentials or live balance
 * observation are returned. A prepared backup has no admitted native account. */
export type VaultPrivateProjection=VaultPrivateWorkflowsProjection&{
 phase:'prepared'|'ready';nativeAccountAdmitted:boolean;
 vaultId:string;name:string;ownerReceizId:string;
};
export type VaultPrivateAdmissionOptions={
 sdk?():Promise<typeof import('@receiz/sdk')>;
 native?():Promise<VaultNativeRuntime>;
 /** Compatible independent readers inject the existing local Note verifier. */
 notes?:MoneyNativeInput['module'];
 signal?:AbortSignal;
 /** Qualification fixtures may supply their isolated native financial port. */
 money?:VaultMoneyNative;
};

const parse=(bytes:Uint8Array)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
const forbidden=async():Promise<never>=>{throw Error('VAULT_READ_ONLY');};
const empty=():VaultPrivateWorkflowsProjection=>({money:[],assets:[],investments:[],pending:false});
function moneyView(note:BankNoteInspection,sourceRef:string):BankNoteInspection&{sourceRef:string}{
 // Native admission also returns the exact funding proof and private account
 // opening projection. They remain private source material, not display rows.
 const part=(value:{amountUsdCents:string;amountPhiMicro:string})=>({amountUsdCents:value.amountUsdCents,amountPhiMicro:value.amountPhiMicro});
 return{noteId:note.noteId,amountUsdCents:note.amountUsdCents,amountPhiMicro:note.amountPhiMicro,sourceRef,...(note.rail?{rail:note.rail}:{}),...(note.fundingParts?{fundingParts:{reserve:part(note.fundingParts.reserve),settlement:part(note.fundingParts.settlement)}}:{}),...(note.consumption?{consumption:note.consumption}:{})};
}

/** The manager uses this same local workflow replay after its custody gate.
 * Call admitVaultPrivateSourceForBank for a complete independent admission. No
 * request, Connect grant, storage, signer enrollment or UI capability exists. */
export async function admitVaultPrivateWorkflowsForBank(value:VaultPrivateSource,options:VaultPrivateAdmissionOptions={}):Promise<VaultPrivateWorkflowsProjection>{
 const live=()=>{options.signal?.throwIfAborted();};live();
 const source=await readVaultPrivateSource(encodeVaultPrivateSource(value));live();
 if(!source.custody.sourceRef)return empty();
 const blocks=new Map(source.blocks.map(b=>[b.sha256,b.exactBytesB64u]));
 const restore=async(ref:string)=>{live();const encoded=blocks.get(ref);if(!encoded)throw Error('VAULT_SOURCE_REQUIRED');return vaultBytes(encoded,23*1024*1024);};
 const sdk=await(options.sdk?options.sdk():import('@receiz/sdk'));live();
 const submission=parse(await restore(source.custody.submissionRef)) as VaultNativeCustodySubmission;
 if(submission.request.applicationId!==BANK_APPLICATION_ID)throw Error('VAULT_CUSTODY_MISMATCH');
 const coordinates={vaultId:source.vaultId,ownerReceizId:source.owner.receizId,ownerAccountId:source.owner.accountId,ownerKeyId:source.owner.keyId,custodyAccountId:source.custody.accountId,custodyKeyId:source.custody.keyId};
 let identity:ReceizKeyFile|undefined;
 const native=options.money??createVaultMoneyNative({applicationId:BANK_APPLICATION_ID,vaultId:source.vaultId,ownerUserId:source.owner.accountId,owner:forbidden,child:async()=>{live();identity??=sdk.parseReceizIdentityArtifactText(source.custody.keyFileText);return{userId:source.custody.accountId,receizId:source.owner.receizId,identity,passphrase:source.custody.passphrase,request:forbidden};},module:options.notes??loadBankNoteRuntime,sdk,assertOpen:live,origin:'https://bankeiz.com',transferSource:forbidden});
 const result=empty();
 if(source.workflows.money!==null){
  const state=readVaultMoney(source.workflows.money);
  if(state.vaultId!==source.vaultId||state.ownerKeyId!==source.owner.keyId||state.childKeyId!==source.custody.keyId)throw Error('VAULT_MONEY_CUSTODY_CHANGED');
  await admitVaultMoneyState(state,restore,native);live();
  const outgoing=state.operations.some(o=>!o.complete&&o.intent.kind!=='add');
  if(!outgoing){for(const ref of state.notes)result.money.push(moneyView(await native.inspectNote(await restore(ref)),ref));if(state.nativeRef)result.money.push(moneyView(await native.inspectRemainder(await restore(state.nativeRef)),state.nativeRef));}
  result.pending=state.operations.some(o=>!o.complete);
 }
 const common={...coordinates,assertOpen:live,restore,assertCapacity:forbidden,lock:forbidden,write:forbidden,retain:forbidden,approve:forbidden,backupAndReopen:forbidden,sign:forbidden,request:forbidden};
 if(source.workflows.assets!==null){
  const assets=createVaultAssets({...common,receivingAddress:`vault-${source.custody.accountId}.receiz.id`,read:async()=>source.workflows.assets,preflightDeposit:forbidden,source:forbidden,admitSuccessor:(previous,next)=>admitVaultAssetSuccessorForBank(previous,next,{...coordinates,applicationId:BANK_APPLICATION_ID,accountId:source.custody.accountId,keyId:source.custody.keyId,native:options.native}),admitPreflight:(bytes,intent)=>admitVaultAssetPreflightForBank(bytes,intent,{native:options.native}),admitSource:bytes=>admitVaultAssetSourceForBank(bytes,{...coordinates,applicationId:BANK_APPLICATION_ID,accountId:source.custody.accountId,keyId:source.custody.keyId,native:options.native}),admitResult:admitVaultAssetResultForBank,admitConsent:(proof,review,role)=>admitVaultAssetConsentForBank(proof,review,role==='owner'?submission.request.parent:submission.request.custody)});
  result.assets=await assets.holdings();live();
 }
 if(source.workflows.market!==null){
  const market=createVaultMarket({...common,read:async()=>source.workflows.market});
  result.investments=await market.holdings();live();
 }
 result.pending ||= Object.values(source.workflows).some(w=>(w as {operations?:{complete?:boolean;phase?:string}[]}|null)?.operations?.some(o=>o.complete===false||['prepared','submitted','pending'].includes(o.phase??'')))||source.journal.entries.some(e=>e.phase==='prepared'||e.phase==='submitted');
 live();return result;
}

/** Pure private-original reader for a CLI or compatible offline reader. The
 * caller first verifies/opens the outer canonical PNG and, when protected,
 * decrypts it with the original passkey. Native contained sources and actual
 * child key possession admit authority; the outer seal alone never does. */
export async function admitVaultPrivateSourceForBank(value:Uint8Array|VaultPrivateSource,options:VaultPrivateAdmissionOptions={}):Promise<VaultPrivateProjection>{
 options.signal?.throwIfAborted();
 const source=await readVaultPrivateSource(value instanceof Uint8Array?value:encodeVaultPrivateSource(value));
 const basic={vaultId:source.vaultId,name:source.name,ownerReceizId:source.owner.receizId};
 if(!source.custody.sourceRef){await admitPreparedVaultCustody(source,options,BANK_APPLICATION_ID);options.signal?.throwIfAborted();return{...empty(),...basic,phase:'prepared',nativeAccountAdmitted:false,pending:true};}
 await admitVaultCustodyForBank(source,options);options.signal?.throwIfAborted();
 return{...await admitVaultPrivateWorkflowsForBank(source,options),...basic,phase:'ready',nativeAccountAdmitted:true};
}

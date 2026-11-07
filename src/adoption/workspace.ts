/** Private preparation and owner-reported progress, never an outbox or financial proof. */
export type ReceivingDraft={id:string;recipient:string;recipientUserId?:string;recipientUsername?:string;recipientName?:string;amount:string;purpose:string;message:string;includeContext:boolean;institution?:{id?:string;name:string};status:'draft'|'link-copied'|'sharing-initiated'|'closed'|'declined';reportedResponse?:'ready'|'declined';followUp:boolean};
export interface ReceivingWork{known():ReceivingDraft[];save(draft:ReceivingDraft):Promise<void>;remove(id:string):Promise<void>}
export type ReceivingWorkState={schema:'bankeiz.receiving-work.v1';identityDigest:string;revision:number;drafts:ReceivingDraft[]};
export type ReceivingWorkStore={load():Promise<unknown>;save(next:ReceivingWorkState,expected:unknown):Promise<void>;assertOpen?():void};
const statuses=['draft','link-copied','sharing-initiated','closed','declined'],maxDrafts=100,maxBytes=2*1024*1024;
function invalid():never{throw Error('RECEIVING_WORK_INVALID');}
function exact(value:unknown,fields:readonly string[]):asserts value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))invalid();
 for(const key of Reflect.ownKeys(value)){if(typeof key!=='string'||!fields.includes(key))invalid();const descriptor=Object.getOwnPropertyDescriptor(value,key)!;if(descriptor.get||descriptor.set||!descriptor.enumerable)invalid();}
}
const text=(value:unknown,max:number,empty=false):value is string=>typeof value==='string'&&(empty||value.trim().length>0)&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value);
const id=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value);
function readDraft(value:unknown):ReceivingDraft{
 exact(value,['id','recipient','recipientUserId','recipientUsername','recipientName','amount','purpose','message','includeContext','institution','status','reportedResponse','followUp']);
 if(!id(value.id)||!text(value.recipient,254,true)||!text(value.amount,40,true)||!text(value.purpose,500,true)||!text(value.message,4000)||typeof value.includeContext!=='boolean'||typeof value.followUp!=='boolean'||typeof value.status!=='string'||!statuses.includes(value.status)||value.reportedResponse!==undefined&&(typeof value.reportedResponse!=='string'||!['ready','declined'].includes(value.reportedResponse)))invalid();
 for(const[key,max]of [['recipientUserId',160],['recipientUsername',160],['recipientName',200]]as const)if(value[key]!==undefined&&!text(value[key],max))invalid();
 let institution:ReceivingDraft['institution'];if(value.institution!==undefined){exact(value.institution,['id','name']);if(!text(value.institution.name,200)||value.institution.id!==undefined&&(typeof value.institution.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(value.institution.id)))invalid();institution={...(value.institution.id!==undefined?{id:value.institution.id as string}:{}),name:value.institution.name};}
 return{id:value.id,recipient:value.recipient,...(value.recipientUserId!==undefined?{recipientUserId:value.recipientUserId as string}:{}),...(value.recipientUsername!==undefined?{recipientUsername:value.recipientUsername as string}:{}),...(value.recipientName!==undefined?{recipientName:value.recipientName as string}:{}),amount:value.amount,purpose:value.purpose,message:value.message,includeContext:value.includeContext,...(institution?{institution}:{}),status:value.status as ReceivingDraft['status'],...(value.reportedResponse!==undefined?{reportedResponse:value.reportedResponse as ReceivingDraft['reportedResponse']}:{}),followUp:value.followUp};
}
function bounded(state:ReceivingWorkState):ReceivingWorkState{if(state.drafts.length>maxDrafts||new TextEncoder().encode(JSON.stringify(state)).byteLength>maxBytes)throw Error('RECEIVING_WORK_CAPACITY');return state;}
function readState(raw:unknown,identityDigest:string):ReceivingWorkState{
 if(raw===null)return{schema:'bankeiz.receiving-work.v1',identityDigest,revision:0,drafts:[]};
 exact(raw,['schema','identityDigest','revision','drafts']);if(raw.identityDigest!==identityDigest)throw Error('RECEIVING_WORK_OWNER_MISMATCH');
 if(raw.schema!=='bankeiz.receiving-work.v1'||!Number.isSafeInteger(raw.revision)||Number(raw.revision)<0||!Array.isArray(raw.drafts)||raw.drafts.length>maxDrafts)invalid();
 const drafts:ReceivingDraft[]=[];for(let index=0;index<raw.drafts.length;index++){const descriptor=Object.getOwnPropertyDescriptor(raw.drafts,index);if(!descriptor||descriptor.get||descriptor.set)invalid();drafts.push(readDraft(descriptor.value));}if(new Set(drafts.map(draft=>draft.id)).size!==drafts.length)invalid();
 return bounded({schema:'bankeiz.receiving-work.v1',identityDigest,revision:Number(raw.revision),drafts});
}

/** Loads once on explicit open. Only durable successful CAS writes advance the held view. */
export async function createReceivingWork(binding:{artifactSha256:string},store:ReceivingWorkStore):Promise<ReceivingWork>{
 const identityDigest=binding.artifactSha256;if(!/^[a-f0-9]{64}$/.test(identityDigest))throw Error('RECEIVING_WORK_OWNER_MISMATCH');
 store.assertOpen?.();let expected=await store.load();store.assertOpen?.();let state=readState(expected,identityDigest),tail=Promise.resolve();
 // Capture the exact loaded CAS value independently of a storage port's references.
 expected=structuredClone(expected);
 const update=(change:(drafts:ReceivingDraft[])=>ReceivingDraft[])=>{
  const pending=tail.then(async()=>{
   store.assertOpen?.();const drafts=change(state.drafts);
   if(drafts===state.drafts)return;if(state.revision===Number.MAX_SAFE_INTEGER)invalid();
   const next=bounded({...state,revision:state.revision+1,drafts});
   await store.save(next,expected);store.assertOpen?.();state=next;expected=next;
  });tail=pending.then(()=>{},()=>{});return pending;
 };
 return Object.freeze({
  known(){store.assertOpen?.();return structuredClone(state.drafts);},
  async save(input:ReceivingDraft){const captured=readDraft(input);return update(drafts=>{const index=drafts.findIndex(draft=>draft.id===captured.id);if(index<0)return [...drafts,captured];if(JSON.stringify(drafts[index])===JSON.stringify(captured))return drafts;const next=[...drafts];next[index]=captured;return next;});},
  async remove(draftId:string){if(!id(draftId))invalid();return update(drafts=>drafts.some(draft=>draft.id===draftId)?drafts.filter(draft=>draft.id!==draftId):drafts);},
 });
}
export async function openReceivingWork(binding:{artifactSha256:string}):Promise<ReceivingWork>{
 const captured={artifactSha256:binding.artifactSha256};const vault=await import('../receiz/identity-vault');
 return createReceivingWork(captured,{load:()=>vault.loadReceivingWork(captured),save:(next,expected)=>vault.saveReceivingWork(captured,next,expected)});
}

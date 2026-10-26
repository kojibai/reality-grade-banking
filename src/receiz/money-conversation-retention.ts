import type {MoneyQuestion} from './money-conversation';
import type {MoneyReceipt} from './money-workspace';
import {moneyActionFingerprint,moneyToolNames,parseMoneyAction} from './money-tools';
import {isOwnerTwinThreadKey} from './twin-conversations';

export type MoneyConversationState={schema:'bank.money-conversation.v1';identityDigest:string;accountUid:string;revision:number;question:MoneyQuestion|null;threads?:Record<string,MoneyQuestion>};
export type MoneyConversationRetention={checkpoint(question:MoneyQuestion|null,threadKey?:string):Promise<void>;recoverQuestion(threadKey?:string):Promise<MoneyQuestion|null>;retainedThreads?():Promise<Array<{threadKey:string;title:string;preview:string}>>};
function invalid():never{throw Error('MONEY_CONVERSATION_INVALID');}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const text=(value:unknown,max:number):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max;
function exact(value:unknown,allowed:readonly string[]):asserts value is Record<string,unknown>{if(!object(value)||Object.keys(value).some(key=>!allowed.includes(key)))invalid();}
function json(value:unknown,ancestors=new Set<object>()){
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return;
 if(!value||typeof value!=='object'||ancestors.has(value)||!Array.isArray(value)&&!object(value))invalid();
 ancestors.add(value);for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))){if(descriptor.get||descriptor.set)invalid();}
 if(Array.isArray(value)){for(let index=0;index<value.length;index++){if(!Object.hasOwn(value,index))invalid();json(value[index],ancestors);}}else for(const child of Object.values(value))json(child,ancestors);
 ancestors.delete(value);
}
function receipt(value:unknown):asserts value is MoneyReceipt{
 exact(value,['id','tool','status','summary','data']);
 if(!text(value.id,160)||typeof value.tool!=='string'||!moneyToolNames.includes(value.tool as typeof moneyToolNames[number])||!['accepted','refused','unknown','needs-confirmation'].includes(String(value.status))||!text(value.summary,64000)||value.data!==undefined&&!object(value.data))invalid();
 json(value);
}
/** Retained choreography is not human approval, settlement evidence or an outbox.
 * Complete receipts and their exact action fingerprints survive without truncation. */
export async function readMoneyQuestion(raw:unknown,accountUid:string):Promise<MoneyQuestion>{
 exact(raw,['message','requestId','quoteExpiresAt','threadKey','context','moneyContext','moneyTools','businessSetup','moneyTask','moneyPaused']);
 const value={...raw};for(const key of Object.keys(value))if(value[key]===undefined)delete value[key];
 if(!text(value.message,1200)||!text(value.requestId,160)||value.requestId.trim().length<8||typeof value.quoteExpiresAt!=='string'||!Number.isFinite(Date.parse(value.quoteExpiresAt))||value.moneyTools!==true||value.businessSetup!==undefined&&typeof value.businessSetup!=='boolean'||value.threadKey!==undefined&&!isOwnerTwinThreadKey(value.threadKey,accountUid)||value.moneyPaused!==undefined&&value.moneyPaused!=='credits')invalid();
 json(value);
 let heldReceipts:MoneyReceipt[]=[];
 if(value.moneyTask!==undefined){
  const task=value.moneyTask;exact(task,['humanRequestId','humanText','step','receipts','completed']);
  if(!text(task.humanRequestId,160)||task.humanRequestId.trim().length<8||task.humanText!==value.message||!Number.isSafeInteger(task.step)||Number(task.step)<0||Number(task.step)>6||!Array.isArray(task.receipts)||task.receipts.length>24||!object(task.completed))invalid();
  heldReceipts=task.receipts;const byId=new Map<string,MoneyReceipt>();
  for(const held of heldReceipts){receipt(held);if(byId.has(held.id))invalid();byId.set(held.id,held);}
  const entries=Object.entries(task.completed);if(entries.length!==heldReceipts.length)invalid();
  const covered=new Set<string>();
  for(const[fingerprint,held]of entries){
   let action;try{action=parseMoneyAction(JSON.parse(fingerprint));}catch{return invalid();}
   if(moneyActionFingerprint(action)!==fingerprint)invalid();receipt(held);
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
   if(held.id!==`${task.humanRequestId.slice(0,100)}:${hash}`||held.tool!==action.tool||covered.has(held.id)||JSON.stringify(byId.get(held.id))!==JSON.stringify(held))invalid();covered.add(held.id);
  }
 }
 if(value.moneyContext!==undefined){
  const context=value.moneyContext;exact(context,['schema','ownerUid','results']);
  if(context.schema!=='bank.money-tool-results.v1'||context.ownerUid!==accountUid||typeof context.results!=='string'||context.results.length>32000)invalid();
  let projected:unknown;try{projected=JSON.parse(context.results);}catch{return invalid();}
  if(!Array.isArray(projected)||projected.length>heldReceipts.length)invalid();
  const ids=new Set<string>();for(const row of projected){receipt(row);const held=heldReceipts.find(held=>held.id===row.id);if(!held||held.tool!==row.tool||held.status!==row.status||ids.has(row.id))invalid();ids.add(row.id);}
 }
 if(value.context!==undefined){
  const context=value.context;exact(context,['schema','ownerUid','disclosure','records']);
  if(context.schema!=='receiz.owner-twin.context.v1'||context.ownerUid!==accountUid||context.disclosure!=='owner-approved-for-this-request'||!Array.isArray(context.records)||!context.records.length||context.records.length>12)invalid();
  const ids=new Set<string>();let total=0;for(const item of context.records){exact(item,['id','title','text']);if(!text(item.id,160)||!text(item.title,160)||!text(item.text,2400)||ids.has(item.id))invalid();ids.add(item.id);total+=item.id.length+item.title.length+item.text.length;if(total>16000)invalid();}
 }
 if(new TextEncoder().encode(JSON.stringify(value)).byteLength>32*1024*1024)throw Error('MONEY_CONVERSATION_CAPACITY');
 return structuredClone(value) as MoneyQuestion;
}
async function readState(raw:unknown,identityDigest:string,accountUid:string):Promise<MoneyConversationState>{
 if(raw==null)return{schema:'bank.money-conversation.v1',identityDigest,accountUid,revision:0,question:null};
 if(!object(raw)||raw.identityDigest!==identityDigest||raw.accountUid!==accountUid)throw Error('MONEY_CONVERSATION_OWNER_MISMATCH');
 exact(raw,['schema','identityDigest','accountUid','revision','question','threads']);
 if(raw.schema!=='bank.money-conversation.v1'||!Number.isSafeInteger(raw.revision)||Number(raw.revision)<0||raw.question===undefined)invalid();
 const question=raw.question===null?null:await readMoneyQuestion(raw.question,accountUid),threads:Record<string,MoneyQuestion>={};
 if(raw.threads!==undefined){if(!object(raw.threads))invalid();for(const[key,value]of Object.entries(raw.threads)){if(!isOwnerTwinThreadKey(key,accountUid))invalid();const held=await readMoneyQuestion(value,accountUid);if((held.threadKey??`api:${accountUid}`)!==key)invalid();threads[key]=held;}}
 if(question)threads[question.threadKey??`api:${accountUid}`]=question;
 return{schema:'bank.money-conversation.v1',identityDigest,accountUid,revision:Number(raw.revision),question,threads};
}
export function createMoneyConversationRetention(input:{identityDigest:string;accountUid:string;assertOpen():void;store:{read():Promise<unknown>;write(next:MoneyConversationState,expected:unknown):Promise<void>};lock<T>(work:()=>Promise<T>):Promise<T>}):MoneyConversationRetention{
 return Object.freeze({
  async checkpoint(question:MoneyQuestion|null,threadKey?:string){
   if(threadKey!==undefined&&!isOwnerTwinThreadKey(threadKey,input.accountUid))throw Error('MONEY_CONVERSATION_OWNER_MISMATCH');
   input.assertOpen();let captured:MoneyQuestion|null;try{captured=structuredClone(question);}catch{return invalid();}
   await input.lock(async()=>{input.assertOpen();const held=captured===null?null:await readMoneyQuestion(captured,input.accountUid);input.assertOpen();const previous=await input.store.read();input.assertOpen();const state=await readState(previous,input.identityDigest,input.accountUid);input.assertOpen();if(state.revision>=Number.MAX_SAFE_INTEGER)invalid();
    const key=threadKey??held?.threadKey??state.question?.threadKey??`api:${input.accountUid}`;if(held&&(held.threadKey??`api:${input.accountUid}`)!==key)invalid();
    const threads={...state.threads};if(held)threads[key]=held;else delete threads[key];
    const current=held??(state.question&&(state.question.threadKey??`api:${input.accountUid}`)!==key?state.question:Object.values(threads).at(-1)??null);
    await input.store.write({...state,revision:state.revision+1,question:current,threads},previous);input.assertOpen();});
  },
  recoverQuestion(threadKey?:string){return input.lock(async()=>{input.assertOpen();if(threadKey!==undefined&&!isOwnerTwinThreadKey(threadKey,input.accountUid))throw Error('MONEY_CONVERSATION_OWNER_MISMATCH');const raw=await input.store.read();input.assertOpen();const state=await readState(raw,input.identityDigest,input.accountUid);input.assertOpen();return threadKey?state.threads?.[threadKey]??null:state.question;});},
  retainedThreads(){return input.lock(async()=>{input.assertOpen();const raw=await input.store.read();input.assertOpen();const state=await readState(raw,input.identityDigest,input.accountUid);input.assertOpen();return Object.entries(state.threads??{}).map(([threadKey,question])=>({threadKey,title:(question.moneyTask?.humanText??question.message).slice(0,100),preview:question.moneyPaused?'Money task saved · add credits to continue':'Response not yet confirmed'}));});},
 });
}

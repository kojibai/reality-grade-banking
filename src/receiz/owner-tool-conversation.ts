import {canonicalizeReceizConstitution} from '@receiz/sdk';
import type {NativeTwinAsk,NativeTwinReply} from './native-twin';
import type {BusinessChatReceipt} from './business-chat';
/** Same owner turn + actual native results, using the existing Twin endpoint.
 * Working context is never a new human confirmation or an execution authority. */
export function createOwnerToolConversation(input:{accountUid:string;question:NativeTwinAsk;ask(question:NativeTwinAsk):Promise<NativeTwinReply>;execute(id:string,actions:NonNullable<NativeTwinReply['businessActions']>):Promise<BusinessChatReceipt[]>;assertOpen():void;onReceipts?(receipts:BusinessChatReceipt[]):void;onReply?(reply:NativeTwinReply):void}){
 const completed=new Map<string,BusinessChatReceipt[]>();let reply:NativeTwinReply,steps=0;
 const receipts=()=>[...completed.values()].flat();
 async function ask(){input.assertOpen();let records=[...(input.question.context?.records??[]),...receipts().slice(-6).map(row=>({id:'native:'+row.id,title:row.title.slice(0,160),text:JSON.stringify({tool:row.tool,status:row.status,summary:row.summary,...(row.details?{nativeResult:row.details.slice(0,2100)}:{})}).slice(0,2400)}))];while(records.length>12||records.reduce((sum,row)=>sum+row.id.length+row.title.length+row.text.length,0)>15500)records=records.slice(1);const next=await input.ask({...input.question,message:input.question.message,requestId:crypto.randomUUID(),quoteExpiresAt:new Date(Date.now()+5*60*1000).toISOString(),moneyTools:false,...(records.length?{context:{schema:'receiz.owner-twin.context.v1',ownerUid:input.accountUid,disclosure:'owner-approved-for-this-request',records}}:{})});input.assertOpen();reply=next;input.onReply?.(reply);}
 async function advance(first?:NativeTwinReply){input.assertOpen();if(first)reply=first;else await ask();
  for(;;){input.assertOpen();const actions=reply.businessActions??[];if(!actions.length)return{reply,receipts:receipts()};if(steps>=4){reply={...reply,message:reply.message+'\n\nThe completed work is kept here. Reply to continue with the next steps.',businessActions:[]};input.onReply?.(reply);return{reply,receipts:receipts()};}
   for(const action of actions){const fingerprint=canonicalizeReceizConstitution(action);let held=completed.get(fingerprint);if(!held){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))].map(value=>value.toString(16).padStart(2,'0')).join('').slice(0,24);input.assertOpen();held=await input.execute(input.question.requestId.slice(0,100)+':'+hash,[action]);input.assertOpen();completed.set(fingerprint,held);input.onReceipts?.(receipts());}if(held.some(row=>row.status!=='accepted'))return{reply,receipts:receipts()};}
   steps++;await ask();
  }
 }
 return{start:(first:NativeTwinReply)=>advance(first),async resume(updated:BusinessChatReceipt[]){input.assertOpen();const byId=new Map(updated.map(row=>[row.id,row]));for(const[key,rows]of completed)completed.set(key,rows.map(row=>byId.get(row.id)??row));input.onReceipts?.(receipts());if(receipts().some(row=>row.status!=='accepted'))return{reply,receipts:receipts()};return advance();}};
}
export type OwnerToolConversation=ReturnType<typeof createOwnerToolConversation>;

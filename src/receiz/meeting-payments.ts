import {bankOperationDollars} from './bank-operations';
import type {ChatPerson} from './native-messaging';
import type {WalletSend,WalletSendContext,WalletSendOutcome,WalletSendReceipt,WalletSendReview} from './wallet-send';
export interface MeetingPaymentState {busy:boolean;ready:boolean;blocked:boolean;error:string;context:WalletSendContext|null;outcome:WalletSendOutcome|null;receipt:WalletSendReceipt|null;}
/** A scoped composer over the existing Wallet. Its view owns no financial state. */
export function createMeetingPayments(input:{conversationId:string;viewerId:string;members():readonly ChatPerson[];wallet():Promise<WalletSend>;onRecorded?():void}){
 let state:MeetingPaymentState={busy:false,ready:false,blocked:false,error:'',context:null,outcome:null,receipt:null},active=true,busy=false,apiPromise:Promise<WalletSend>|undefined,opened:Promise<void>|undefined;
 const listeners=new Set<()=>void>(),notified=new Set<string>();
 const patch=(next:Partial<MeetingPaymentState>)=>{if(!active)return;state={...state,...next};listeners.forEach(fn=>fn());};
 const assertActive=()=>{if(!active)throw Error('This meeting has closed.');};
 const member=(id:string)=>input.members().find(p=>p.kind==='user'&&p.userId===id&&id!==input.viewerId);
 const wallet=()=>apiPromise??=input.wallet().catch(e=>{apiPromise=undefined;throw e;});
 const scoped=(context:WalletSendContext|undefined|null)=>context?.conversationId===input.conversationId&&context.accountUid===input.viewerId;
 async function refresh(api:WalletSend){
  const result=await api.status();assertActive();
  if(!result){patch({ready:true,blocked:false,context:null,outcome:null,receipt:null});return;}
  if(!scoped(result.context)){
   const pending=result.status==='unknown'||result.status==='funding';
   patch({ready:true,blocked:pending,context:null,outcome:null,receipt:null,error:pending?'Finish your pending payment in your account before sending another.':''});return;
  }
  const context=result.context!,person=member(context.recipientUserId),display={...context,recipientLabel:person?.displayName||person?.username||context.recipientLabel};
  let receipt:WalletSendReceipt|null=null;
  if(result.status==='recorded'){
   const retained=await api.retainedResult(result.clientNonce);assertActive();
   if(!retained?.receipt||retained.receipt.senderUserId!==input.viewerId||retained.receipt.recipientUserId!==context.recipientUserId||retained.receipt.amountUsdCents!==context.amountUsdCents||retained.outcome.status!=='recorded'||retained.outcome.transferId!==result.transferId)throw Error('The payment result needs to be checked in your account.');
   receipt=retained.receipt;
  }
  patch({ready:true,blocked:false,context:display,outcome:result,receipt});
  if(receipt&&!notified.has(receipt.clientNonce)){notified.add(receipt.clientNonce);try{input.onRecorded?.();}catch{/* Optional message repaint never changes the retained payment. */}}
 }
 async function run(work:(api:WalletSend)=>Promise<void>){
  if(busy||!active)return;busy=true;patch({busy:true,error:''});
  let api:WalletSend|undefined;try{api=await wallet();assertActive();await work(api);}catch(cause){
   if(active){try{if(api)await refresh(api);}catch{/* Saved Wallet checkpoint remains authoritative. */}
    patch({error:state.blocked?state.error:cause instanceof Error&& !cause.message.startsWith('BANK_')?cause.message:'Check your payment in your account before trying again.'});}
  }finally{busy=false;patch({busy:false});}
 }
 async function ownPending(api:WalletSend){await refresh(api);if(state.blocked||!scoped(state.context))return false;return true;}
 return {
  subscribe:(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};},getSnapshot:()=>state,
  open(){active=true;return opened??=run(async api=>{await refresh(api);}).finally(()=>{opened=undefined;});},
  send(recipient:string,amount:string){return run(async api=>{
   const cents=bankOperationDollars(amount),person=member(recipient);if(!person)throw Error('Choose someone in this meeting.');
   await refresh(api);if(state.blocked)return;if(state.outcome?.status==='funding'||state.outcome?.status==='unknown')throw Error('Check the current payment before sending another.');
   let review:WalletSendReview|undefined;
   try{review=await api.prepare({recipient,amountUsdCents:cents},{conversationId:input.conversationId});assertActive();
    if(review.accountUid!==input.viewerId||review.recipientUserId!==recipient||review.amountUsdCents!==cents||review.conversationId!==input.conversationId||!member(recipient))throw Error('The people in this meeting changed. Check the recipient and try again.');
    await api.execute(review,review.digest);assertActive();await refresh(api);
   }finally{if(review)api.discard(review);}
  });},
  check(){return run(async api=>{if(!await ownPending(api))return;
   if(state.outcome?.status==='unknown')await api.resolve(true,state.outcome.clientNonce);
   else if(state.outcome?.status==='funding'){if(!member(state.context!.recipientUserId))throw Error('This person is no longer in the conversation. Cancel this checkout or finish from your account.');await api.resumeFunding(state.outcome.clientNonce);}
   assertActive();await refresh(api);
  });},
  cancel(){return run(async api=>{if(!await ownPending(api)||state.outcome?.status!=='funding')return;await api.cancelFunding(state.outcome.clientNonce);assertActive();await refresh(api);});},
  close(){active=false;listeners.clear();},
 };
}

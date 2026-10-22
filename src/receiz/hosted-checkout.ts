import {checkoutApprovalDigest,checkoutInteger,emptyCheckoutSnapshot,readHostedCheckoutState,hasPendingHostedCheckout,type CheckoutApproval,type CheckoutMethod,type CheckoutSnapshot,type CheckoutStateStore,type HostedCheckoutState,type CheckoutReceipt} from './checkout-state';
import type {CheckoutNotes} from './checkout-notes';
import type {SharedWallet} from './shared-wallet';
import type {WalletSend,WalletSendOutcome,WalletSendReview} from './wallet-send';
export interface HostedCheckoutDependencies {identityDigest:string;assertCurrent():void;walletSend():Promise<WalletSend>;notes:CheckoutNotes;readWallet():Promise<SharedWallet>;store:CheckoutStateStore;lock<T>(work:()=>Promise<T>):Promise<T>;}
const centsToDollars=(n:bigint)=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
function message(cause:unknown){const code=cause instanceof Error?cause.message:'';if(/ALREADY_DEPOSITED|already_claimed/.test(code))return 'This Note has already been deposited.';if(/IDENTITY|identity|closed/.test(code))return 'Your identity changed. Reopen this checkout.';if(/APPROVAL|CONFIRMATION/.test(code))return 'Review this payment before approving it.';if(/PENDING|pending/.test(code))return 'Your original payment is pending. Check its saved result before starting another.';if(/INSUFFICIENT|funding_changed/.test(code))return 'Your available balance changed. Review the payment again.';if(/RECEIVING_CUSTODY|BINDING|EXACT_HEAD/.test(code))return 'Use the Identity Record that owns this Note, or ask its holder to address it to your identity.';return 'This payment needs attention. Your original request is saved; check its result to continue.';}
export function createHostedCheckout(input:HostedCheckoutDependencies){
 let closed=false,stored:HostedCheckoutState|null=null,view=emptyCheckoutSnapshot(),prepared:WalletSendReview|null=null,preparedApi:WalletSend|null=null;
 const listeners=new Set<()=>void>();
 const assert=()=>{if(closed)throw Error('Checkout is closed.');input.assertCurrent();};
 const publish=(row:CheckoutSnapshot)=>{view=row;for(const listener of listeners)listener();};
 async function load(){assert();stored=await readHostedCheckoutState(await input.store.read(),input.identityDigest);assert();publish(stored?.current??emptyCheckoutSnapshot());}
 async function save(row:CheckoutSnapshot,history=stored?.history??[]){
  assert();const next:HostedCheckoutState={schema:'bank.hosted-checkouts.v1',identityDigest:input.identityDigest,revision:(stored?.revision??-1)+1,current:row,history};await readHostedCheckoutState(next,input.identityDigest);assert();await input.store.write(next,stored);assert();stored=next;publish(row);
 }
 async function admittedReceipt(outcome:WalletSendOutcome,row:CheckoutSnapshot=view):Promise<CheckoutReceipt>{
  const a=row.approval;if(!a||outcome.status!=='recorded'||outcome.clientNonce!==a.clientNonce)throw Error('CHECKOUT_RESULT_MISMATCH');
  const result=await(await input.walletSend()).retainedResult(a.clientNonce);assert();const r=result?.receipt;
  if(!r||result.outcome.status!=='recorded'||r.transferId!==outcome.transferId||r.senderUserId!==a.accountUid||r.recipientUserId!==a.recipient.userId||r.amountUsdCents!==a.amountUsdCents||r.clientNonce!==a.clientNonce)throw Error('CHECKOUT_RESULT_MISMATCH');
  return{...r,checkoutId:a.checkoutId,recipient:a.recipient,method:a.method};
 }
 const ready=load().then(async()=>{if(view.phase==='paid'){if(!view.walletOutcome)throw Error('CHECKOUT_RESULT_MISMATCH');await admittedReceipt(view.walletOutcome);}}).catch(error=>{if(!closed)publish({...view,phase:'attention-required',error:message(error)});throw error;});void ready.catch(()=>{});
 async function run<T>(work:()=>Promise<T>):Promise<T>{
  await ready;return input.lock(async()=>{assert();await load();try{return await work();}catch(error){if(!closed){try{assert();await save({...view,phase:view.approvalHistory.length?'attention-required':view.approval?'reviewed':'editing',error:message(error)});}catch{/* A failed private write cannot erase the original attempt. */}}throw error;}});
 }
 const sign=async(body:Omit<CheckoutApproval,'digest'>):Promise<CheckoutApproval>=>Object.freeze({...body,digest:await checkoutApprovalDigest(body)});
 function observedProposal(wallet:SharedWallet,amountUsdCents:string,accountUid?:string){
  assert();if(accountUid&&wallet.userId!==accountUid||!wallet.projectionComplete||!checkoutInteger(wallet.totalUsdCents))throw Error('CHECKOUT_BALANCE_UNAVAILABLE');
  const amount=BigInt(amountUsdCents),available=BigInt(wallet.totalUsdCents),contribution=available<amount?available:amount,missing=amount-contribution,charge=missing>0n?(missing<50n?50n:missing):0n;
  if(charge>10000000n)throw Error('CHECKOUT_CARD_LIMIT');return{card:charge.toString(),balance:contribution.toString()};
 }
 async function walletProposal(a:{accountUid:string;amountUsdCents:string}){return observedProposal(await input.readWallet(),a.amountUsdCents,a.accountUid);}
 function walletOptions(a:CheckoutApproval){return{clientNonce:a.clientNonce,...(a.method==='card'?{fundingPreference:'card' as const}:{}),cardFundingLimitUsdCents:a.cardAmountUsdCents,checkoutContext:{checkoutId:a.checkoutId,username:a.recipient.username}};}
 async function adopt(outcome:WalletSendOutcome){
  assert();if(outcome.clientNonce!==view.approval?.clientNonce)throw Error('CHECKOUT_RESULT_MISMATCH');
  if(outcome.status==='recorded'){const receipt=await admittedReceipt(outcome);await save({...view,phase:'paid',walletOutcome:outcome,receipt,error:null});}
  else await save({...view,phase:outcome.status==='funding'?'funding':outcome.status==='unknown'?'confirming':'not-sent',walletOutcome:outcome,error:outcome.status==='not-sent'?message(Error(outcome.reason)):null});
 }
 async function continuePayment(recover=false){
  const a=view.approval;if(!a||!view.approvalHistory.some(old=>old.digest===a.digest)||view.phase==='not-sent')return;
  const api=await input.walletSend(),existing=await api.retainedResult(a.clientNonce);assert();
  if(existing){const o=existing.outcome;if(o.status==='unknown'){const result=await api.resolve(true);if(result)await adopt(result);}else if(o.status==='funding'){const result=await api.resumeFunding();if(result)await adopt(result);}else await adopt(o);return;}
  if(a.method==='note'){
   for(const source of a.noteSourceDigests){let entry=view.notes.find(n=>n.sourceDigest===source);if(!entry)throw Error('CHECKOUT_NOTE_SOURCE_REQUIRED');
    if(entry.status==='confirmed')continue;
    if(recover||entry.status!=='inspected'){entry=await input.notes.check(entry);assert();await save({...view,notes:view.notes.map(n=>n.sourceDigest===source?entry!:n)});}
    if(entry.status==='inspected'){
     // Native Note custody retains its exact intent before any claim. Keep
     // this source recoverable even if the page closes before invocation.
     await save({...view,phase:'funding'});entry=await input.notes.deposit(entry);assert();await save({...view,notes:view.notes.map(n=>n.sourceDigest===source?entry!:n)});
    }
    if(entry.status!=='confirmed'){await save({...view,phase:'funding'});return;}
   }
   const funding=await walletProposal(a);if(BigInt(funding.card)>BigInt(a.cardAmountUsdCents)){
    const {digest:_,...body}=a,next=await sign({...body,cardAmountUsdCents:funding.card,balanceContributionUsdCents:funding.balance});assert();prepared=null;await save({...view,phase:'reviewed',approval:next,error:null});return;
   }
  }
  const w=preparedApi===api&&prepared&&prepared.clientNonce===a.clientNonce&&prepared.cardFundingLimitUsdCents===a.cardAmountUsdCents?prepared:await api.prepare({recipient:a.recipient.userId,amountUsdCents:a.amountUsdCents},walletOptions(a));assert();
  if(w.accountUid!==a.accountUid||w.recipientUserId!==a.recipient.userId||w.amountUsdCents!==a.amountUsdCents||w.clientNonce!==a.clientNonce||w.fundingPreference!==(a.method==='card'?'card':undefined))throw Error('CHECKOUT_RESULT_MISMATCH');
  await save({...view,phase:'submitting',error:null});const result=await api.execute(w,w.digest);prepared=null;assert();await adopt(result);
 }
 const approve=(digest:string)=>run(async()=>{
  if(view.phase==='paid')return;const a=view.approval;if(!a||a.digest!==digest)throw Error('CHECKOUT_EXACT_APPROVAL_REQUIRED');if(view.approvalHistory.some(old=>old.digest===digest))return;
  await save({...view,phase:'funding',approvalHistory:[...view.approvalHistory,a],error:null});await continuePayment();
 });
 return{
  ready,snapshot:()=>view,subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  prepare(value:{recipient:string;amountUsdCents:string;method:CheckoutMethod}){return run(async()=>{
   if(!checkoutInteger(value.amountUsdCents,true)||!['card','balance','note'].includes(value.method))throw Error('Enter an amount greater than zero.');
   const old=view.approval,continuing=view.approvalHistory.length>0&&view.phase!=='paid'&&view.phase!=='not-sent';
   if(continuing&&(!old||value.method!=='note'||old.method!=='note'||old.amountUsdCents!==value.amountUsdCents||old.recipient.username!==value.recipient||view.walletOutcome||view.notes.some(n=>n.status!=='inspected'&&n.status!=='confirmed')))throw Error('CHECKOUT_PAYMENT_PENDING');
   if(!continuing&&stored&&hasPendingHostedCheckout(stored))throw Error('CHECKOUT_PAYMENT_PENDING');
   if(value.method==='note'&&!view.notes.length)throw Error('Choose a Note before reviewing payment.');
   const nonce=continuing?old!.clientNonce:crypto.randomUUID(),api=await input.walletSend();
   if(prepared)preparedApi?.discard(prepared);prepared=null;preparedApi=null;
   const username=value.recipient.replace(/^@/,'').replace(/\.receiz\.id$/i,'').toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(username))throw Error('Use a Receiz ID.');
   let funding={card:value.method==='card'?value.amountUsdCents:'0',balance:'0'};
   const balance=value.method==='balance'?await input.readWallet():null;if(balance)funding=observedProposal(balance,value.amountUsdCents);
   const w=await api.prepare({recipient:continuing?old!.recipient.userId:username,amountUsdCents:value.amountUsdCents},{clientNonce:nonce,...(value.method==='card'?{fundingPreference:'card' as const}:{}),cardFundingLimitUsdCents:funding.card,checkoutContext:{checkoutId:nonce,username}});assert();if(balance&&balance.userId!==w.accountUid)throw Error('CHECKOUT_RESULT_MISMATCH');
   const recipient=continuing?old!.recipient:{userId:w.recipientUserId,username,displayName:w.recipientLabel.startsWith('@')?w.recipientLabel.slice(1):username,avatarUrl:null};
   const a=await sign({checkoutId:nonce,clientNonce:nonce,identityDigest:input.identityDigest,accountUid:w.accountUid,recipient,amountUsdCents:value.amountUsdCents,method:value.method,cardAmountUsdCents:funding.card,balanceContributionUsdCents:funding.balance,noteSourceDigests:value.method==='note'?view.notes.map(n=>n.sourceDigest):[]});assert();
   prepared=w;preparedApi=api;
   const history=[...(stored?.history??[])];if(!continuing&&old&&old.checkoutId!==nonce)history.push(view.phase==='paid'||view.phase==='not-sent'?view:{...view,phase:'not-sent'});
   await save({...emptyCheckoutSnapshot(),phase:'reviewed',approval:a,notes:value.method==='note'?view.notes:[],approvalHistory:continuing?view.approvalHistory:[]},history);return a;
  });},
  inspectNote(file:File){return run(async()=>{
   if(view.walletOutcome&&view.walletOutcome.status!=='not-sent'||view.notes.some(n=>['depositing','received','attention-required'].includes(n.status)))throw Error('CHECKOUT_PAYMENT_PENDING');
   const entry=await input.notes.inspect(file);assert();if(view.notes.some(n=>n.noteId===entry.noteId))throw Error('This Note is already selected.');
   const notes=[...view.notes,entry];let a=view.approval;
   if(a){if(a.method!=='note')throw Error('CHECKOUT_PAYMENT_PENDING');const {digest:_,...body}=a;a=await sign({...body,noteSourceDigests:notes.map(n=>n.sourceDigest),cardAmountUsdCents:'0'});}
   await save({...view,phase:a?'reviewed':'editing',notes,approval:a,error:null});return entry;
  });},
  approve,approveShortfall:approve,
  inspectReturn(checkoutId:string,sessionId:string){return run(async()=>{
   const row=[view,...(stored?.history??[])].find(candidate=>candidate.approval?.checkoutId===checkoutId);
   if(!row?.approval)return{matched:false,receipt:null};
   const retained=await(await input.walletSend()).retainedResult(row.approval.clientNonce);assert();
   if(retained?.fundingSessionId!==sessionId)return{matched:false,receipt:null};
   return{matched:true,receipt:retained.outcome.status==='recorded'?await admittedReceipt(retained.outcome,row):null};
  });},
  check(){return run(async()=>{await continuePayment(true);});},
  back(){return run(async()=>{
   if(view.approvalHistory.length&&!['paid','not-sent'].includes(view.phase))return;
   if(prepared)preparedApi?.discard(prepared);prepared=null;preparedApi=null;const history=[...(stored?.history??[])];if(view.approval)history.push(view.phase==='paid'||view.phase==='not-sent'?view:{...view,phase:'not-sent'});await save(emptyCheckoutSnapshot(),history);
  });},
  dispose(){closed=true;listeners.clear();prepared=null;},
 };
}
export type HostedCheckoutController=ReturnType<typeof createHostedCheckout>;
export {centsToDollars};

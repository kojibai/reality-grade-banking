import type {PaidBookingPreparation,PaidBookingReview} from './paid-booking';
import {readBookingCheckoutContext,sameBookingCheckout,checkoutUuid,type BookingCheckoutContext,checkoutApprovalDigest,checkoutInteger,emptyCheckoutSnapshot,readHostedCheckoutState,hasPendingHostedCheckout,type CheckoutApproval,type CheckoutMethod,type CheckoutSnapshot,type CheckoutStateStore,type HostedCheckoutState,type CheckoutReceipt} from './checkout-state';
import type {CheckoutNotes} from './checkout-notes';
import type {SharedWallet} from './shared-wallet';
import type {WalletSend,WalletSendOutcome,WalletSendReview} from './wallet-send';
import {createFixedSale,fixedSalePaymentNote,type FixedSaleFields,type FixedSale} from './fixed-checkout';
export interface HostedCheckoutDependencies {identityDigest:string;assertCurrent():void;checkFixedSale?(sale:FixedSale):Promise<'open'|'paid'|'cancelled'|'legacy'>;walletSend():Promise<WalletSend>;notes:CheckoutNotes;readWallet():Promise<SharedWallet>;store:CheckoutStateStore;lock<T>(work:()=>Promise<T>):Promise<T>;}
const centsToDollars=(n:bigint)=>`${n/100n}.${String(n%100n).padStart(2,'0')}`;
function message(cause:unknown){const code=cause instanceof Error?cause.message:'';if(code==='merchant_counter_closed')return 'This checkout was cancelled. No payment was sent. Any funding already completed stays in your balance.';if(code==='merchant_counter_paid')return 'This checkout has already been paid. Ask for a new checkout.';if(/ALREADY_DEPOSITED|already_claimed/.test(code))return 'This Note has already been deposited.';if(/NOTE_IDENTITY_BINDING|NOTE_RECEIVING_CUSTODY/.test(code))return 'Use the Identity Record that owns this Note, or ask its holder to address it to your identity.';if(/IDENTITY|identity|closed/.test(code))return 'Your identity changed. Reopen this checkout.';if(/APPROVAL|CONFIRMATION/.test(code))return 'Review this payment before approving it.';if(/PENDING|pending/.test(code))return 'Your original payment is pending. Check its saved result before starting another.';if(/INSUFFICIENT|funding_changed/.test(code))return 'Your available balance changed. Review the payment again.';if(/RECEIVING_CUSTODY|BINDING|EXACT_HEAD/.test(code))return 'Use the Identity Record that owns this Note, or ask its holder to address it to your identity.';return 'This payment needs attention. Your original request is saved; check its result to continue.';}
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
  if(!r||result.outcome.status!=='recorded'||r.transferId!==outcome.transferId||r.senderUserId!==a.accountUid||r.recipientUserId!==a.recipient.userId||r.amountUsdCents!==a.amountUsdCents||r.clientNonce!==a.clientNonce||a.fixedSale&&result.note!==fixedSalePaymentNote(a.fixedSale,a.clientNonce)||!sameBookingCheckout(result?.booking,a.booking))throw Error('CHECKOUT_RESULT_MISMATCH');
  return{...r,checkoutId:a.checkoutId,recipient:a.recipient,method:a.method,...(a.fixedSale?{fixedSale:a.fixedSale}:{}),...(a.booking?{booking:a.booking}:{})};
 }
 async function paidFixedSale(fields:FixedSaleFields){
  const sale=await createFixedSale(fields);assert();const row=[view,...(stored?.history??[])].find(row=>row.phase==='paid'&&row.approval?.fixedSale?.digest===sale.digest);
  if(!row)return null;if(!row.walletOutcome)throw Error('CHECKOUT_RESULT_MISMATCH');return admittedReceipt(row.walletOutcome,row);
 }
 const ready=load().then(async()=>{if(view.phase==='paid'){if(!view.walletOutcome)throw Error('CHECKOUT_RESULT_MISMATCH');await admittedReceipt(view.walletOutcome);}}).catch(error=>{if(!closed)publish({...view,phase:'attention-required',error:message(error)});throw error;});void ready.catch(()=>{});
 async function run<T>(work:()=>Promise<T>):Promise<T>{
  await ready;return input.lock(async()=>{assert();await load();try{return await work();}catch(error){if(!closed){try{assert();await save({...view,phase:view.approvalHistory.length?'attention-required':view.approval?'reviewed':'editing',error:message(error)});}catch{/* A failed private write cannot erase the original attempt. */}}throw error;}});
 }
 const sign=async(body:Omit<CheckoutApproval,'digest'>):Promise<CheckoutApproval>=>Object.freeze({...body,digest:await checkoutApprovalDigest(body)});
 function observedProposal(wallet:SharedWallet,amountUsdCents:string,accountUid?:string){
  assert();if(accountUid&&wallet.userId!==accountUid||(!wallet.projectionComplete&&wallet.accountOnlyComplete!==true)||!checkoutInteger(wallet.totalUsdCents))throw Error('CHECKOUT_BALANCE_UNAVAILABLE');
  const amount=BigInt(amountUsdCents),available=BigInt(wallet.totalUsdCents),contribution=available<amount?available:amount,missing=amount-contribution,charge=missing>0n?(missing<50n?50n:missing):0n;
  if(charge>10000000n)throw Error('CHECKOUT_CARD_LIMIT');return{card:charge.toString(),balance:contribution.toString()};
 }
 async function walletProposal(a:{accountUid:string;amountUsdCents:string}){return observedProposal(await input.readWallet(),a.amountUsdCents,a.accountUid);}
 async function noteProposal(amountUsdCents:string,notes:CheckoutSnapshot['notes'],accountUid?:string){
  const wallet=await input.readWallet();assert();if(accountUid&&wallet.userId!==accountUid||(!wallet.projectionComplete&&wallet.accountOnlyComplete!==true)||!checkoutInteger(wallet.totalUsdCents))throw Error('CHECKOUT_BALANCE_UNAVAILABLE');
  const amount=BigInt(amountUsdCents),noteAmount=notes.filter(n=>n.status!=='confirmed').reduce((sum,n)=>sum+BigInt(n.inspection.amountUsdCents),0n),needed=amount>noteAmount?amount-noteAmount:0n;
  const fromBalance=BigInt(wallet.totalUsdCents)<needed?BigInt(wallet.totalUsdCents):needed,missing=needed-fromBalance,charge=missing>0n?(missing<50n?50n:missing):0n;
  if(charge>10000000n)throw Error('CHECKOUT_CARD_LIMIT');
  return{accountUid:wallet.userId,card:charge.toString(),balance:fromBalance.toString(),noteAmountUsdCents:noteAmount.toString(),noteSurplusUsdCents:(noteAmount>amount?noteAmount-amount:0n).toString()};
 }
 function walletOptions(a:CheckoutApproval){return{clientNonce:a.clientNonce,...(a.method==='card'?{fundingPreference:'card' as const}:{}),cardFundingLimitUsdCents:a.cardAmountUsdCents,checkoutContext:{checkoutId:a.checkoutId,username:a.recipient.username,...(a.booking?{booking:a.booking,bookingOptions:view.bookingPreparation?.options??{}}:{})},...(a.booking?{booking:a.booking}:{})};}
 function walletRequest(a:CheckoutApproval){return{recipient:a.recipient.userId,amountUsdCents:a.amountUsdCents,...(a.fixedSale?{note:fixedSalePaymentNote(a.fixedSale,a.clientNonce)}:{})};}
 async function adopt(outcome:WalletSendOutcome){
  assert();if(outcome.clientNonce!==view.approval?.clientNonce)throw Error('CHECKOUT_RESULT_MISMATCH');
  if(outcome.status==='recorded'){const receipt=await admittedReceipt(outcome);await save({...view,phase:'paid',walletOutcome:outcome,receipt,error:null});}
  else await save({...view,phase:outcome.status==='funding'?'funding':outcome.status==='unknown'?'confirming':'not-sent',walletOutcome:outcome,error:outcome.status==='not-sent'?message(Error(outcome.reason)):null});
 }
 async function continuePayment(recover=false){
  const a=view.approval;if(!a||!view.approvalHistory.some(old=>old.digest===a.digest)||view.phase==='not-sent')return;
  const api=await input.walletSend(),existing=await api.retainedResult(a.clientNonce);assert();
  if(existing){if(a.fixedSale&&existing.note!==fixedSalePaymentNote(a.fixedSale,a.clientNonce)||!sameBookingCheckout(existing.booking,a.booking))throw Error('CHECKOUT_RESULT_MISMATCH');const o=existing.outcome;if(o.status==='unknown'){const result=await api.resolve(true,a.clientNonce);if(result)await adopt(result);}else if(o.status==='funding'){const result=await api.resumeFunding(a.clientNonce);if(result)await adopt(result);}else await adopt(o);return;}
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
   const funding=await walletProposal(a),expectedWallet=BigInt(a.balanceContributionUsdCents)+BigInt(a.noteAmountUsdCents??'0');if(funding.card!==a.cardAmountUsdCents||BigInt(funding.balance)!==(expectedWallet>BigInt(a.amountUsdCents)?BigInt(a.amountUsdCents):expectedWallet)){
    const {digest:_,...body}=a,next=await sign({...body,cardAmountUsdCents:funding.card,balanceContributionUsdCents:funding.balance,noteAmountUsdCents:'0',noteSurplusUsdCents:'0'});assert();prepared=null;await save({...view,phase:'reviewed',approval:next,error:null});return;
   }
  }
  const w=preparedApi===api&&prepared&&prepared.clientNonce===a.clientNonce&&prepared.cardFundingLimitUsdCents===a.cardAmountUsdCents?prepared:await api.prepare(walletRequest(a),walletOptions(a));assert();
  if(w.accountUid!==a.accountUid||w.recipientUserId!==a.recipient.userId||w.amountUsdCents!==a.amountUsdCents||w.clientNonce!==a.clientNonce||w.fundingPreference!==(a.method==='card'?'card':undefined)||a.fixedSale&&w.note!==fixedSalePaymentNote(a.fixedSale,a.clientNonce)||!sameBookingCheckout(w.booking,a.booking))throw Error('CHECKOUT_RESULT_MISMATCH');
  await save({...view,phase:'submitting',error:null});const result=await api.execute(w,w.digest);prepared=null;assert();await adopt(result);
 }
 const approve=(digest:string)=>run(async()=>{
  if(view.phase==='paid')return;const a=view.approval;if(!a||a.digest!==digest)throw Error('CHECKOUT_EXACT_APPROVAL_REQUIRED');if(view.approvalHistory.some(old=>old.digest===digest))return;
  if(a.method==='note')for(const digest of a.noteSourceDigests){const entry=view.notes.find(n=>n.sourceDigest===digest);if(!entry)throw Error('CHECKOUT_NOTE_SOURCE_REQUIRED');await input.notes.validate(entry);assert();}
  await save({...view,phase:'funding',approvalHistory:[...view.approvalHistory,a],error:null});await continuePayment();
 });
 return{
  ready,snapshot:()=>view,subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  inspectFixedSale(fields:FixedSaleFields){return run(()=>paidFixedSale(fields));},
  retainBookingPreparation(value:PaidBookingPreparation){return run(async()=>{
   const {readPaidBookingPreparation}=await import('./paid-booking');const next=await readPaidBookingPreparation(value);assert();const prior=view.bookingPreparation;
   if(prior?.operationId===next.operationId){if(await checkoutApprovalDigest(prior as never)!==await checkoutApprovalDigest({...next,review:prior.review} as never))throw Error('BOOKING_PREPARATION_CONFLICT');return prior;}
   if(stored&&hasPendingHostedCheckout(stored))throw Error('CHECKOUT_PAYMENT_PENDING');
   const history=[...(stored?.history??[])];if(view.approval||prior)history.push(view);await save({...emptyCheckoutSnapshot(),phase:'preparing',bookingPreparation:next},history);return next;
  });},
  retainBookingReview(review:PaidBookingReview,operationId:string){return run(async()=>{
   const held=view.bookingPreparation;if(!held||held.operationId!==operationId)throw Error('BOOKING_PREPARATION_CONFLICT');
   const {readPaidBookingReview}=await import('./paid-booking');const next=await readPaidBookingReview(review,held);assert();
   if(held.review&&(held.review.termsDigest!==next.termsDigest||held.review.sourceReference!==next.sourceReference))throw Error('BOOKING_TERMS_CHANGED');
   if(held.review?.phase==='cancelled-unpaid'&&next.phase!=='cancelled-unpaid'||['confirmed-paid','cancelled-paid'].includes(held.review?.phase??'')&&!['confirmed-paid','cancelled-paid'].includes(next.phase))throw Error('BOOKING_TRUTH_DOWNGRADE');
   await save({...view,bookingPreparation:{...held,review:next}});return next;
  });},
  closeBooking(booking:BookingCheckoutContext){return run(async()=>{
   const exact=readBookingCheckoutContext(booking),a=view.approval;if(view.bookingPreparation?.operationId!==exact.operationId||a&&!sameBookingCheckout(a.booking,exact))throw Error('BOOKING_PREPARATION_CONFLICT');
   if(a){const api=await input.walletSend();let held=await api.retainedResult(a.clientNonce);assert();if(held?.outcome.status==='funding'){await api.cancelFunding(a.clientNonce);held=await api.retainedResult(a.clientNonce);assert();}if(held?.outcome.status==='unknown'){const found=await api.resolve(true,a.clientNonce);if(found)await adopt(found);return;}if(held){await adopt(held.outcome);return;}}
   if(prepared)preparedApi?.discard(prepared);prepared=null;await save({...view,phase:'not-sent',error:null});
  });},
  prepare(value:{recipient:string;amountUsdCents:string;method:CheckoutMethod;fixedSale?:FixedSaleFields;counter?:true;checkoutId?:string;booking?:BookingCheckoutContext}){return run(async()=>{
   if(!checkoutInteger(value.amountUsdCents,true)||!['card','balance','note'].includes(value.method))throw Error('Enter an amount greater than zero.');
   const booking=value.booking===undefined?undefined:readBookingCheckoutContext(value.booking);if((value.checkoutId!==undefined)!==(booking!==undefined)||booking&&(!checkoutUuid(value.checkoutId)||value.checkoutId!==booking.operationId||value.method==='note'))throw Error('BOOKING_CHECKOUT_CONTEXT_INVALID');
   const fixedSale=value.fixedSale?await createFixedSale(value.fixedSale):undefined;
   if(fixedSale&&(fixedSale.username!==value.recipient||fixedSale.amountUsdCents!==value.amountUsdCents))throw Error('This checkout has a fixed recipient and total. Open the original payment link.');
   if(booking&&(!fixedSale||fixedSale.saleId!==booking.reservationId))throw Error('BOOKING_CHECKOUT_CONTEXT_INVALID');
   if(!booking&&view.bookingPreparation&&['confirmed-paid','cancelled-paid','cancelled-unpaid'].includes(view.bookingPreparation.review?.phase??'')){
    // Native terminal terms do not erase unresolved Wallet/Note custody.
    // Preserve the complete accepted booking before starting an ordinary edit.
    if(stored&&hasPendingHostedCheckout(stored))throw Error('CHECKOUT_PAYMENT_PENDING');
    await save(emptyCheckoutSnapshot(),[...(stored?.history??[]),view]);
   }
   if(view.bookingPreparation&&(!booking||view.bookingPreparation.operationId!==booking.operationId||view.bookingPreparation.review?.phase!=='ready'))throw Error('BOOKING_REVIEW_REQUIRED');
   if(booking&&view.approval?.booking){const old=view.approval;if(!sameBookingCheckout(old.booking,booking)||old.recipient.username!==value.recipient||old.amountUsdCents!==value.amountUsdCents||old.fixedSale?.digest!==fixedSale?.digest)throw Error('BOOKING_TERMS_CHANGED');if(old.method===value.method)return old;if(view.approvalHistory.length)throw Error('CHECKOUT_PAYMENT_PENDING');}
   if(value.fixedSale&&await paidFixedSale(value.fixedSale))throw Error('This checkout was already paid. Open its saved payment receipt.');
   if(value.counter&&!fixedSale)throw Error('CHECKOUT_FIXED_REQUEST_REQUIRED');
   const statusRead=value.counter&&fixedSale&&!booking&&input.checkFixedSale?input.checkFixedSale(fixedSale).then(value=>({value}),error=>({error})):null;
   const old=view.approval,continuing=view.approvalHistory.length>0&&view.phase!=='paid'&&view.phase!=='not-sent';
   if(continuing&&(!old||value.method!=='note'||old.method!=='note'||old.amountUsdCents!==value.amountUsdCents||old.recipient.username!==value.recipient||old.fixedSale?.digest!==fixedSale?.digest||view.walletOutcome||view.notes.some(n=>n.status!=='inspected'&&n.status!=='confirmed')))throw Error('CHECKOUT_PAYMENT_PENDING');
   if(!continuing&&stored&&hasPendingHostedCheckout(booking?{...stored,current:{...stored.current,bookingPreparation:undefined}}:stored))throw Error('CHECKOUT_PAYMENT_PENDING');
   if(value.method==='note'&&!view.notes.length)throw Error('Choose a Note before reviewing payment.');
   const nonce=continuing?old!.clientNonce:value.checkoutId??crypto.randomUUID(),api=await input.walletSend();
   if(prepared)preparedApi?.discard(prepared);prepared=null;preparedApi=null;
   const username=value.recipient.replace(/^@/,'').replace(/\.receiz\.id$/i,'').toLowerCase();if(!/^[a-z0-9_]{3,24}$/.test(username))throw Error('Use a Receiz ID.');
   let funding={card:value.method==='card'?value.amountUsdCents:'0',balance:'0'};
   const balance=value.method==='balance'?await input.readWallet():null;if(balance)funding=observedProposal(balance,value.amountUsdCents);
   const noteFunding=value.method==='note'?await noteProposal(value.amountUsdCents,view.notes,old?.accountUid):null;if(noteFunding)funding=noteFunding;
   const w=await api.prepare({recipient:continuing&&!fixedSale?old!.recipient.userId:username,amountUsdCents:value.amountUsdCents,...(fixedSale?{note:fixedSalePaymentNote(fixedSale,nonce)}:{})},{clientNonce:nonce,...(value.method==='card'?{fundingPreference:'card' as const}:{}),cardFundingLimitUsdCents:funding.card,checkoutContext:{checkoutId:nonce,username,...(booking?{booking,bookingOptions:view.bookingPreparation?.options??{}}:{})},...(booking?{booking}:{})});assert();if(balance&&balance.userId!==w.accountUid||noteFunding&&noteFunding.accountUid!==w.accountUid)throw Error('CHECKOUT_RESULT_MISMATCH');
   if(statusRead){const result=await statusRead;if('error'in result){api.discard(w);throw result.error;}if(result.value==='legacy'){api.discard(w);throw Error('Counter checkout is not registered yet. Ask for a new checkout.');}if(result.value==='cancelled'||result.value==='paid'){api.discard(w);throw Error(result.value==='cancelled'?'merchant_counter_closed':'merchant_counter_paid');}}
   if(fixedSale&&w.recipientUserId!==fixedSale.recipientUserId){api.discard(w);throw Error('The recipient no longer matches this checkout. Ask for a new payment link.');}
   const recipient=continuing?old!.recipient:{userId:w.recipientUserId,username,displayName:w.recipientLabel.startsWith('@')?w.recipientLabel.slice(1):username,avatarUrl:w.recipientAvatarUrl??null};
   const a=await sign({checkoutId:nonce,clientNonce:nonce,identityDigest:input.identityDigest,accountUid:w.accountUid,recipient,amountUsdCents:value.amountUsdCents,method:value.method,cardAmountUsdCents:funding.card,balanceContributionUsdCents:funding.balance,...(noteFunding?{noteAmountUsdCents:noteFunding.noteAmountUsdCents,noteSurplusUsdCents:noteFunding.noteSurplusUsdCents}:{}),noteSourceDigests:value.method==='note'?view.notes.map(n=>n.sourceDigest):[],...(fixedSale?{fixedSale}:{}),...(booking?{booking}:{})});assert();
   prepared=w;preparedApi=api;
   const history=[...(stored?.history??[])];if(!continuing&&old&&old.checkoutId!==nonce)history.push(view.phase==='paid'||view.phase==='not-sent'?view:{...view,phase:'not-sent'});
   await save({...emptyCheckoutSnapshot(),...(view.bookingPreparation?{bookingPreparation:view.bookingPreparation}:{}),phase:'reviewed',approval:a,notes:value.method==='note'?view.notes:[],approvalHistory:continuing?view.approvalHistory:[]},history);return a;
  });},
  inspectNote(file:File){return run(async()=>{
   if(view.walletOutcome&&view.walletOutcome.status!=='not-sent'||view.notes.some(n=>['depositing','received','attention-required'].includes(n.status)))throw Error('CHECKOUT_PAYMENT_PENDING');
   const entry=await input.notes.inspect(file);assert();if(view.notes.some(n=>n.noteId===entry.noteId))throw Error('This Note is already selected.');
   const notes=[...view.notes,entry];let a=view.approval;
   if(a){if(a.method!=='note')throw Error('CHECKOUT_PAYMENT_PENDING');const {digest:_,...body}=a,funding=await noteProposal(a.amountUsdCents,notes,a.accountUid);a=await sign({...body,noteSourceDigests:notes.map(n=>n.sourceDigest),cardAmountUsdCents:funding.card,balanceContributionUsdCents:funding.balance,noteAmountUsdCents:funding.noteAmountUsdCents,noteSurplusUsdCents:funding.noteSurplusUsdCents});}
   await save({...view,phase:a?'reviewed':'editing',notes,approval:a,error:null});return entry;
  });},
  approve,approveShortfall:approve,
  inspectReturn(checkoutId:string,sessionId:string){return run(async()=>{
   const row=[view,...(stored?.history??[])].find(candidate=>candidate.approval?.checkoutId===checkoutId);
   if(!row?.approval)return{matched:false as const,receipt:null};
   const retained=await(await input.walletSend()).retainedResult(row.approval.clientNonce);assert();
   if(retained?.fundingSessionId!==sessionId)return{matched:false as const,receipt:null};
   if(row.approval.fixedSale&&retained.note!==fixedSalePaymentNote(row.approval.fixedSale,row.approval.clientNonce))throw Error('CHECKOUT_RESULT_MISMATCH');
   return{matched:true as const,username:row.approval.recipient.username,checkoutId:row.approval.checkoutId,status:retained.outcome.status,receipt:retained.outcome.status==='recorded'?await admittedReceipt(retained.outcome,row):null,...(row.approval.fixedSale?{fixedSale:row.approval.fixedSale}:{})};
  });},
  check(expectedCheckoutId?:string){return run(async()=>{if(expectedCheckoutId&&view.approval?.checkoutId!==expectedCheckoutId)return;await continuePayment(true);});},
  back(expectedCheckoutId?:string){return run(async()=>{
   if(expectedCheckoutId&&view.approval?.checkoutId!==expectedCheckoutId)return false;
   if(view.bookingPreparation&&!['confirmed-paid','cancelled-paid','cancelled-unpaid'].includes(view.bookingPreparation.review?.phase??''))return false;
   // Back withdraws an unsent payment approval. Card funding is not a
   // submitted transfer; its original deposit remains independently retained.
   // Never discard an uncertain transfer or a Note whose credit is pending.
   if(view.notes.some(note=>['depositing','received','attention-required'].includes(note.status)))return;
   if(view.approvalHistory.length&&!['paid','not-sent'].includes(view.phase)){
    const api=await input.walletSend(),nonce=view.approval!.clientNonce;
    let retained=await api.retainedResult(nonce);assert();
    if(retained?.outcome.status==='funding'){await api.cancelFunding(nonce);retained=await api.retainedResult(nonce);assert();}
    if(retained){if(retained.outcome.status!=='not-sent'&&retained.outcome.status!=='recorded')return;await adopt(retained.outcome);}
   }
   if(prepared)preparedApi?.discard(prepared);prepared=null;preparedApi=null;const history=[...(stored?.history??[])];if(view.approval)history.push(view.phase==='paid'||view.phase==='not-sent'?view:{...view,phase:'not-sent'});await save(emptyCheckoutSnapshot(),history);return true;
  });},
  dispose(){closed=true;listeners.clear();prepared=null;},
 };
}
export type HostedCheckoutController=ReturnType<typeof createHostedCheckout>;
export {centsToDollars};

import {loadReceiz} from './client';
import {buildCheckoutReturn,parseCheckoutReturn} from './checkout-request';
import type {CheckoutContext} from './wallet-send';
import {bookingOverrides,BOOKING_LINK_KEYS} from './booking-link';
import {checkoutUuid,checkoutDigest,checkoutInteger,emptyCheckoutSnapshot,readBookingCheckoutContext,readBookingTransferOriginal,type BookingCheckoutContext,type CheckoutSnapshot} from './checkout-state';
import {readFixedSale,fixedSalePaymentNote,type FixedSale} from './fixed-checkout';
import type {HostedCheckoutController} from './hosted-checkout';
import type {GuestBookingInput} from './public-booking';
import type {BookingSchedule} from './organizer-types';
import type {OrganizerRequest} from './native-organizer';

export type BookingTerms=Readonly<{reservationId:string;operationId:string;sourceOperationId:string;hostUserId:string;guestUserId:string;policyRevision:string;startAt:string;endAt:string;attendeeEmail:string;guestInputDigest:string;priceUsdCents:string;feeUsdCents:'0';totalUsdCents:string;currency:'usd';clientNonce:string;fixedSaleDigest:string;expiresAt:string}>;
export type PaidBookingPhase='preparing'|'ready'|'payment-dispatching'|'confirmed-paid'|'cancelled-unpaid'|'cancelled-paid';
export interface PaidBookingReview {phase:PaidBookingPhase;terms:BookingTerms;termsDigest:string;sourceReference:string;owner:{userId:string;username:string;displayName:string};fixedSale:FixedSale;event?:Record<string,unknown>;original?:unknown;delivery?:'delivered'|'pending'|'unknown';}
export type PaidBookingInput=GuestBookingInput&{scheduleConfig?:BookingSchedule;meeting?:true;bookingPolicyRevision?:string};
export interface PaidBookingPreparation {accountUid:string;username:string;operationId:string;options:Record<string,string>;input:PaidBookingInput;review:PaidBookingReview|null;}
export interface PaidBookingSnapshot {preparation:PaidBookingPreparation|null;booking:PaidBookingReview|null;checkout:CheckoutSnapshot;error:string|null;}
const object=(raw:unknown):Record<string,unknown>=>raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};
const invalid=():never=>{throw Error('PAID_BOOKING_SOURCE_INVALID');};
const iso=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const digest=async(value:unknown)=>(await loadReceiz()).digestReceizCanonicalV122(value);
const terminal=(phase:unknown)=>['confirmed-paid','cancelled-paid','cancelled-unpaid'].includes(String(phase));
export function bookingCheckoutContext(review:PaidBookingReview):BookingCheckoutContext{return readBookingCheckoutContext({reservationId:review.terms.reservationId,operationId:review.terms.operationId,termsDigest:review.termsDigest,sourceReference:review.sourceReference});}
export async function readPaidBookingReview(raw:unknown,scope:Pick<PaidBookingPreparation,'accountUid'|'username'|'operationId'|'input'>):Promise<PaidBookingReview>{
 const row=object(raw),terms=object(row.terms),owner=object(row.owner);
 const fields=['reservationId','operationId','sourceOperationId','hostUserId','guestUserId','policyRevision','startAt','endAt','attendeeEmail','guestInputDigest','priceUsdCents','feeUsdCents','totalUsdCents','currency','clientNonce','fixedSaleDigest','expiresAt'];
 if(Object.keys(terms).length!==fields.length||fields.some(key=>!Object.hasOwn(terms,key))||!['reservationId','operationId','hostUserId','guestUserId'].every(key=>checkoutUuid(terms[key]))||terms.hostUserId===terms.guestUserId||terms.guestUserId!==scope.accountUid||terms.operationId!==scope.operationId||terms.sourceOperationId!==scope.operationId||terms.clientNonce!==scope.operationId||scope.input.bookingPolicyRevision!==undefined&&terms.policyRevision!==scope.input.bookingPolicyRevision||terms.startAt!==scope.input.slotStartAt||terms.attendeeEmail!==scope.input.email.trim().toLowerCase()||!iso(terms.startAt)||!iso(terms.endAt)||!iso(terms.expiresAt)||Date.parse(terms.endAt)<=Date.parse(terms.startAt)||typeof terms.policyRevision!=='string'||!terms.policyRevision||terms.policyRevision.length>200||!checkoutDigest(terms.guestInputDigest)||!checkoutDigest(terms.fixedSaleDigest)||!checkoutInteger(terms.priceUsdCents,true)||BigInt(terms.priceUsdCents)>10000000n||terms.totalUsdCents!==terms.priceUsdCents||terms.feeUsdCents!=='0'||terms.currency!=='usd'||!checkoutDigest(row.termsDigest)||await digest(terms)!==row.termsDigest||!checkoutDigest(row.sourceReference)||owner.userId!==terms.hostUserId||owner.username!==scope.username||typeof owner.displayName!=='string'||!['preparing','ready','payment-dispatching','confirmed-paid','cancelled-unpaid','cancelled-paid'].includes(String(row.phase)))return invalid();
 const sale=await readFixedSale(row.fixedSale);
 if(sale.saleId!==terms.reservationId||sale.recipientUserId!==terms.hostUserId||sale.username!==scope.username||sale.amountUsdCents!==terms.totalUsdCents||sale.digest!==terms.fixedSaleDigest)return invalid();
 const review=row as unknown as PaidBookingReview;
 if(['confirmed-paid','cancelled-paid'].includes(review.phase)){
  const original=readBookingTransferOriginal(row.original,bookingCheckoutContext(review));
  if(original.senderUserId!==scope.accountUid||original.recipientUserId!==terms.hostUserId||original.amountUsdCents!==terms.totalUsdCents||original.clientNonce!==scope.operationId||original.carried[0].note!==fixedSalePaymentNote(sale,scope.operationId)||object(row.event).id!==terms.reservationId||object(row.event).ownerUserId!==terms.hostUserId)return invalid();
 }else if(row.event!==undefined||row.original!==undefined)return invalid();
 if(row.delivery!==undefined&&!['delivered','pending','unknown'].includes(String(row.delivery)))return invalid();
 return structuredClone(review);
}
export async function readPaidBookingPreparation(raw:unknown):Promise<PaidBookingPreparation>{
 const row=object(raw),input=object(row.input),options=object(row.options);
 if(Object.keys(row).sort().join('|')!=='accountUid|input|operationId|options|review|username'||!checkoutUuid(row.accountUid)||!checkoutUuid(row.operationId)||typeof row.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(row.username)||Object.keys(input).some(key=>!['slotStartAt','name','email','timezone','notes','questions','scheduleConfig','meeting','bookingPolicyRevision'].includes(key))||input.meeting!==undefined&&input.meeting!==true||input.bookingPolicyRevision!==undefined&&(typeof input.bookingPolicyRevision!=='string'||!input.bookingPolicyRevision||input.bookingPolicyRevision.length>200)||!iso(input.slotStartAt)||typeof input.name!=='string'||!input.name.trim()||input.name.length>72||typeof input.email!=='string'||input.email.length>200||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)||typeof input.timezone!=='string'||input.timezone.length>120||typeof input.notes!=='string'||input.notes.length>2000||!Array.isArray(input.questions)||input.questions.length>12||input.questions.some(raw=>{const q=object(raw);return typeof q.id!=='string'||typeof q.label!=='string'||typeof q.answer!=='string'||q.answer.length>2000||typeof q.required!=='boolean';})||Object.values(options).some(value=>typeof value!=='string'))return invalid();
 const allowed=bookingOverrides(new URLSearchParams(options as Record<string,string>));if(allowed.size!==Object.keys(options).length)return invalid();
 const preparation=row as unknown as PaidBookingPreparation;if(row.review!==null)await readPaidBookingReview(row.review,preparation);return structuredClone(preparation);
}
/** This adapter composes accepted Calendar terms with existing Checkout. It
 * never sends a financial request, creates identity, or infers payment from a
 * card return, local phase or missing transfer observation. */
export function createPaidBooking({accountUid,username,options=new URLSearchParams(),checkout,request,assertCurrent}:{accountUid:string;username:string;options?:URLSearchParams;checkout:HostedCheckoutController;request:OrganizerRequest;assertCurrent():void}){
 if(!checkoutUuid(accountUid)||!/^[a-z0-9_]{3,24}$/.test(username))throw Error('PAID_BOOKING_IDENTITY_REQUIRED');
 const params=bookingOverrides(new URLSearchParams(options));params.sort();const link=Object.fromEntries(params),base='/api/calendar/embed/'+username+'/paid';let inFlight:Promise<unknown>|null=null,error:string|null=null,cached:PaidBookingSnapshot|undefined;
 const hiddenCheckout=emptyCheckoutSnapshot();const listeners=new Set<()=>void>();const publish=()=>{cached=undefined;for(const notify of listeners)notify();};const unsubscribe=checkout.subscribe(publish);let disposed=false;
 const assert=()=>{if(disposed)throw Error('PAID_BOOKING_IDENTITY_CLOSED');assertCurrent();};
 const preparation=(allowClosedForeign=false)=>{assert();const held=checkout.snapshot().bookingPreparation;if(held&&(held.accountUid!==accountUid||held.username!==username||JSON.stringify(held.options)!==JSON.stringify(link))){if(allowClosedForeign&&held.accountUid===accountUid&&terminal(held.review?.phase))return undefined;throw Error('PAID_BOOKING_IDENTITY_CHANGED');}return held;};
 async function run<T>(work:()=>Promise<T>):Promise<T>{if(inFlight)throw Error('PAID_BOOKING_OPERATION_PENDING');const task=(async()=>{await checkout.ready;assert();error=null;publish();return work();})();inFlight=task;try{return await task;}catch(cause){if(!disposed){error=cause instanceof Error?cause.message:'PAID_BOOKING_UNAVAILABLE';publish();}throw cause;}finally{inFlight=null;}}
 async function read(action:'prepare'|'reconcile'|'cancel'|'status',held:PaidBookingPreparation){
  assert();let path=base,init:RequestInit|undefined;
  if(action==='status'){const query=new URLSearchParams({operationId:held.operationId});if(held.review)query.set('reservationId',held.review.terms.reservationId);path+='?'+query;}
  else{path+=params.size?'?'+params:'';init={method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(action==='prepare'?{action,operationId:held.operationId,input:held.input}:{action,reservationId:held.review!.terms.reservationId,operationId:held.operationId})};}
  const response=await request(path,init);assert();const data=object(await response.json());assert();if(!response.ok||data.ok!==true)throw Error(typeof data.error==='string'?data.error:'PAID_BOOKING_UNAVAILABLE');if(data.booking===null)return null;return readPaidBookingReview(data.booking,held);
 }
 async function accept(review:PaidBookingReview,method?:'balance'|'card'){
  assert();const held=preparation();if(!held)throw Error('BOOKING_PREPARATION_REQUIRED');
  if(review.phase==='cancelled-unpaid'){
   await checkout.closeBooking(bookingCheckoutContext(review));assert();if(checkout.snapshot().phase==='paid')throw Error('BOOKING_TRUTH_DOWNGRADE');
  }
  await checkout.retainBookingReview(review,held.operationId);assert();
  if(review.phase==='ready'&&(!checkout.snapshot().approval||method!==undefined&&checkout.snapshot().approval!.method!==method)){const {digest:_,...fixedSale}=review.fixedSale;await checkout.prepare({recipient:username,amountUsdCents:review.terms.totalUsdCents,method:method??'balance',fixedSale,checkoutId:review.terms.operationId,booking:bookingCheckoutContext(review)});}
 }
 async function check(){
  const held=preparation();if(!held)return;
  const native=await read(held.review?'reconcile':'status',held);assert();
  if(!native)return;await accept(native);if(native.phase==='cancelled-unpaid'||native.phase==='preparing')return;
  const current=checkout.snapshot();if(!current.approvalHistory.length)return;
  await checkout.check(held.operationId);assert();
  if(checkout.snapshot().phase==='paid'&&!['confirmed-paid','cancelled-paid'].includes(native.phase)){const final=await read('reconcile',preparation()!);if(final)await accept(final);}
 }
 return{
  ready:checkout.ready,
  snapshot():PaidBookingSnapshot{
   const current=checkout.snapshot(),held=current.bookingPreparation;
   const mismatch=!!held&&(held.accountUid!==accountUid||held.username!==username||JSON.stringify(held.options)!==JSON.stringify(link));
   const ordinaryPending=!held&&(current.approvalHistory.length>0&&!['paid','not-sent'].includes(current.phase)||current.notes.some(note=>['depositing','received','attention-required'].includes(note.status)));
   // An ordinary Checkout has no accepted booking binding. Its approval,
   // funding frame and original belong to that Checkout, never this page.
   const visible=!held||mismatch?hiddenCheckout:current,problem=mismatch||ordinaryPending?'CHECKOUT_PAYMENT_PENDING':error;
   if(!cached||cached.checkout!==visible||cached.error!==problem)cached={preparation:mismatch?null:held??null,booking:mismatch?null:held?.review??null,checkout:visible,error:problem};return cached;
  },
  subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
  prepare(input:PaidBookingInput,method:'balance'|'card'='balance'){return run(async()=>{
   if(!['balance','card'].includes(method))throw Error('BOOKING_PAYMENT_METHOD_INVALID');const prior=preparation(true);
   const same=prior&&await digest(prior.input)===await digest(input);
   if(prior&&!same&&!terminal(prior.review?.phase))throw Error('CHECKOUT_PAYMENT_PENDING');
   const held=same&&prior.review?.phase!=='cancelled-unpaid'?prior:await checkout.retainBookingPreparation({accountUid,username,operationId:crypto.randomUUID(),options:link,input:structuredClone(input),review:null});assert();
   if(held.review&&terminal(held.review.phase))return held.review;
   const review=await read('prepare',held);if(review)await accept(review,method);return review;
  });},
  approve(exactDigest:string){return run(async()=>{const held=preparation();if(!held?.review||held.review.phase!=='ready')throw Error('BOOKING_REVIEW_REQUIRED');const a=checkout.snapshot().approval;if(!a||a.digest!==exactDigest||a.accountUid!==accountUid||a.clientNonce!==held.operationId)throw Error('CHECKOUT_EXACT_APPROVAL_REQUIRED');await checkout.approve(exactDigest);assert();if(checkout.snapshot().phase==='paid'){const review=await read('reconcile',held);if(review)await accept(review);}});},
  check(){return run(check);},
  cancelUnpaid(){return run(async()=>{let held=preparation();if(!held)return;if(!held.review){const known=await read('status',held);if(!known)throw Error('BOOKING_OUTCOME_UNKNOWN');await checkout.retainBookingReview(known,held.operationId);held=preparation()!;}if(['confirmed-paid','cancelled-paid'].includes(held.review!.phase))throw Error('BOOKING_ALREADY_PAID');const closed=await read('cancel',held);if(!closed)throw Error('BOOKING_OUTCOME_UNKNOWN');await accept(closed);});},
  dispose(){disposed=true;unsubscribe();listeners.clear();},
 };
}
export type PaidBookingController=ReturnType<typeof createPaidBooking>;

/** Navigation coordinates only: the retained Checkout remains the authority. */
export function buildPaidBookingReturn(context:CheckoutContext,origin:string){
 const booking=readBookingCheckoutContext(context.booking);if(context.checkoutId!==booking.operationId)throw Error('BOOKING_CHECKOUT_CONTEXT_INVALID');
 const regular=buildCheckoutReturn(context,origin),url=new URL(regular);url.pathname='/book/'+context.username+'/';
 const params=bookingOverrides(new URLSearchParams(context.bookingOptions));for(const [key,value]of params)url.searchParams.set(key,value);
 return url.href.replace('%7BCHECKOUT_SESSION_ID%7D','{CHECKOUT_SESSION_ID}');
}

export function parsePaidBookingReturn(input:string,origin:string){
 const url=new URL(input,origin);if(!url.searchParams.has('checkoutReturn'))return null;
 const match=/^\/book\/([a-z0-9_]{3,24})\/?$/.exec(url.pathname);if(!match)throw Error('Invalid booking return.');
 const options=bookingOverrides(url.searchParams);for(const key of BOOKING_LINK_KEYS)url.searchParams.delete(key);
 url.pathname='/pay/'+match[1]+'/';const locator=parseCheckoutReturn(url.href,origin);if(!locator)throw Error('Invalid booking return.');
 return{...locator,options:Object.fromEntries(options)};
}

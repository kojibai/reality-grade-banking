import {readWalletTransferOriginal} from './wallet-transfer-original';
import type {PaidBookingPreparation} from './paid-booking';
import {loadReceiz} from './client';
import type {BankNoteInspection,BankNoteRail} from './offline-notes';
import type {WalletSendOutcome,WalletSendReceipt} from './wallet-send';
import {readFixedSale,type FixedSale} from './fixed-checkout';
export type BookingCheckoutContext=Readonly<{reservationId:string;operationId:string;termsDigest:string;sourceReference:string}>;
export type CheckoutMethod='card'|'balance'|'note';
export type CheckoutPhase='editing'|'preparing'|'reviewed'|'funding'|'submitting'|'confirming'|'paid'|'not-sent'|'attention-required';
export interface CheckoutRecipient {readonly userId:string;readonly username:string;readonly displayName:string;readonly avatarUrl:string|null;}
export interface CheckoutApproval {readonly checkoutId:string;readonly identityDigest:string;readonly accountUid:string;readonly recipient:CheckoutRecipient;readonly amountUsdCents:string;readonly method:CheckoutMethod;readonly clientNonce:string;readonly cardAmountUsdCents:string;readonly balanceContributionUsdCents:string;readonly noteAmountUsdCents?:string;readonly noteSurplusUsdCents?:string;readonly noteSourceDigests:readonly string[];readonly fixedSale?:FixedSale;readonly booking?:BookingCheckoutContext;readonly digest:string;}
export interface CheckoutNoteEntry {sourceDigest:string;sourceRef:string;noteId:string;rail:BankNoteRail;inspection:BankNoteInspection;status:'inspected'|'depositing'|'received'|'confirmed'|'attention-required';creditSourceDigest?:string;}
export interface CheckoutReceipt extends WalletSendReceipt {checkoutId:string;recipient:CheckoutRecipient;method:CheckoutMethod;fixedSale?:FixedSale;booking?:BookingCheckoutContext;}
export interface CheckoutSnapshot {phase:CheckoutPhase;approval:CheckoutApproval|null;approvalHistory:CheckoutApproval[];walletOutcome:WalletSendOutcome|null;notes:CheckoutNoteEntry[];receipt:CheckoutReceipt|null;error:string|null;bookingPreparation?:PaidBookingPreparation;}
export interface HostedCheckoutState {schema:'bank.hosted-checkouts.v1';identityDigest:string;revision:number;current:CheckoutSnapshot;history:CheckoutSnapshot[];}
export interface CheckoutStateStore {read():Promise<unknown>;write(next:HostedCheckoutState,expected:unknown):Promise<void>;}
export const checkoutUuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export const checkoutDigest=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const checkoutInteger=(v:unknown,positive=false):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,19})$/.test(v)&&(!positive||v!=='0');
const invalid=():never=>{throw Error('HOSTED_CHECKOUT_STATE_INVALID');};
export function readBookingCheckoutContext(raw:unknown):BookingCheckoutContext{
 const v=raw as BookingCheckoutContext;
 if(!v||typeof v!=='object'||Object.keys(v).sort().join('|')!=='operationId|reservationId|sourceReference|termsDigest'||!checkoutUuid(v.reservationId)||!checkoutUuid(v.operationId)||!checkoutDigest(v.termsDigest)||!checkoutDigest(v.sourceReference))throw Error('BOOKING_CHECKOUT_CONTEXT_INVALID');
 return Object.freeze({reservationId:v.reservationId,operationId:v.operationId,termsDigest:v.termsDigest,sourceReference:v.sourceReference});
}
export function sameBookingCheckout(a:unknown,b:unknown):boolean{
 if(a===undefined&&b===undefined)return true;
 try{const x=readBookingCheckoutContext(a),y=readBookingCheckoutContext(b);return x.reservationId===y.reservationId&&x.operationId===y.operationId&&x.termsDigest===y.termsDigest&&x.sourceReference===y.sourceReference;}catch{return false;}
}
/** Project the existing enclosing Wallet original; the booking digest is not
 * an admission authority and cannot substitute for any of its carried copies. */
export function readBookingTransferOriginal(raw:unknown,booking:BookingCheckoutContext){
 const original=readWalletTransferOriginal(raw),source=raw as {source:{message:{receiz_receipt:{payload?:{walletTransfer?:Record<string,unknown>}}}}};
 const carried=[...original.carried,source.source.message.receiz_receipt.payload?.walletTransfer];
 for(const value of carried)if(!value||!sameBookingCheckout(value.booking,booking)||value.senderUserId!==original.senderUserId||value.recipientUserId!==original.recipientUserId||value.amountUsdCents!==original.amountUsdCents||value.amountPhiMicro!==original.carried[0].amountPhiMicro||value.usdPerPhiMicrocents!==original.carried[0].usdPerPhiMicrocents||value.note!==original.carried[0].note||value.noteVisibility!=='public')throw Error('BANK_WALLET_BOOKING_MISMATCH');
 if(original.clientNonce!==booking.operationId)throw Error('BANK_WALLET_BOOKING_MISMATCH');return original;
}

export const emptyCheckoutSnapshot=():CheckoutSnapshot=>({phase:'editing',approval:null,approvalHistory:[],walletOutcome:null,notes:[],receipt:null,error:null});
export async function checkoutApprovalDigest(input:Omit<CheckoutApproval,'digest'>){return(await loadReceiz()).digestReceizCanonicalV122(input);}
async function approval(value:CheckoutApproval,owner:string){
 if(!value||value.identityDigest!==owner||!checkoutUuid(value.checkoutId)||value.clientNonce!==value.checkoutId||!checkoutUuid(value.accountUid)||!value.recipient||!checkoutUuid(value.recipient.userId)||value.recipient.userId===value.accountUid||!/^[a-z0-9_]{3,24}$/.test(value.recipient.username)||typeof value.recipient.displayName!=='string'||value.recipient.displayName.length>160||!['card','balance','note'].includes(value.method)||!checkoutInteger(value.amountUsdCents,true)||!checkoutInteger(value.cardAmountUsdCents)||!checkoutInteger(value.balanceContributionUsdCents)||!Array.isArray(value.noteSourceDigests)||value.noteSourceDigests.some(v=>!checkoutDigest(v))||new Set(value.noteSourceDigests).size!==value.noteSourceDigests.length||!checkoutDigest(value.digest))invalid();
 if(value.noteAmountUsdCents!==undefined&&!checkoutInteger(value.noteAmountUsdCents)||value.noteSurplusUsdCents!==undefined&&!checkoutInteger(value.noteSurplusUsdCents))invalid();
 if(value.fixedSale!==undefined){let sale:FixedSale;try{sale=await readFixedSale(value.fixedSale);}catch{return invalid();}if(sale.recipientUserId!==value.recipient.userId||sale.username!==value.recipient.username||sale.amountUsdCents!==value.amountUsdCents)invalid();}
 if(value.booking!==undefined){let booking:BookingCheckoutContext;try{booking=readBookingCheckoutContext(value.booking);}catch{return invalid();}if(booking.operationId!==value.checkoutId||!value.fixedSale||booking.reservationId!==value.fixedSale.saleId)invalid();}
 const {digest,...body}=value;if(await checkoutApprovalDigest(body)!==digest)invalid();
 if(value.method==='card'&&(value.cardAmountUsdCents!==value.amountUsdCents||value.balanceContributionUsdCents!=='0'))invalid();
}
function note(value:CheckoutNoteEntry){
 if(!value||!checkoutDigest(value.sourceDigest)||value.sourceRef!==value.sourceDigest||!checkoutUuid(value.noteId)||!['reserve','settlement','composite'].includes(value.rail)||!['inspected','depositing','received','confirmed','attention-required'].includes(value.status)||!value.inspection||value.inspection.noteId!==value.noteId||(value.inspection.rail??'reserve')!==value.rail||!checkoutInteger(value.inspection.amountUsdCents,true)||!checkoutInteger(value.inspection.amountPhiMicro,true)||value.status==='confirmed'&&!checkoutDigest(value.creditSourceDigest))invalid();
}
/** Validates retained consent/recovery only. Financial results are reopened
 * through the existing Wallet/Note validators before acting on this state. */
export async function readHostedCheckoutState(input:unknown,owner:string):Promise<HostedCheckoutState|null>{
 if(input==null)return null;const s=input as HostedCheckoutState;
 if(!checkoutDigest(owner)||s.schema!=='bank.hosted-checkouts.v1'||s.identityDigest!==owner||!Number.isSafeInteger(s.revision)||s.revision<0||!Array.isArray(s.history)||s.history.length>1000||!s.current)invalid();
 const nonces=new Set<string>();
 for(const row of [s.current,...s.history]){
  if(!row||!['editing','preparing','reviewed','funding','submitting','confirming','paid','not-sent','attention-required'].includes(row.phase)||!Array.isArray(row.notes)||!Array.isArray(row.approvalHistory)||row.approvalHistory.length>1000||row.error!==null&&(typeof row.error!=='string'||row.error.length>2000))invalid();
  if(row.bookingPreparation!==undefined){const {readPaidBookingPreparation,bookingCheckoutContext}=await import('./paid-booking');await readPaidBookingPreparation(row.bookingPreparation);if(row.approval&&(row.approval.accountUid!==row.bookingPreparation.accountUid||row.approval.clientNonce!==row.bookingPreparation.operationId||!row.bookingPreparation.review||!sameBookingCheckout(row.approval.booking,bookingCheckoutContext(row.bookingPreparation.review))))invalid();}
  for(const n of row.notes)note(n);if(new Set(row.notes.map(n=>n.noteId)).size!==row.notes.length)invalid();
  if(row.approval){await approval(row.approval,owner);if(nonces.has(row.approval.clientNonce))invalid();nonces.add(row.approval.clientNonce);}
  for(const a of row.approvalHistory){await approval(a,owner);if(a.checkoutId!==row.approval?.checkoutId||a.accountUid!==row.approval?.accountUid||a.recipient.userId!==row.approval?.recipient.userId||a.amountUsdCents!==row.approval?.amountUsdCents||a.fixedSale?.digest!==row.approval?.fixedSale?.digest||!sameBookingCheckout(a.booking,row.approval?.booking))invalid();}
  if(['funding','submitting','confirming','paid'].includes(row.phase)&&(!row.approval||!row.approvalHistory.length))invalid();
  if(row.walletOutcome&&row.walletOutcome.clientNonce!==row.approval?.clientNonce)invalid();
  if(row.phase==='paid'){
   const a=row.approval,r=row.receipt,o=row.walletOutcome;
   if(!a||!r)return invalid();
   if(!a||!r||!o||o.status!=='recorded'||r.transferId!==o.transferId||!checkoutUuid(r.transferId)||r.clientNonce!==a.clientNonce||r.checkoutId!==a.checkoutId||r.senderUserId!==a.accountUid||r.recipientUserId!==a.recipient.userId||r.amountUsdCents!==a.amountUsdCents||r.method!==a.method||r.recordedAt!==null&&!Number.isFinite(Date.parse(r.recordedAt)))invalid();
   if(r.fixedSale!==undefined){try{await readFixedSale(r.fixedSale);}catch{return invalid();}}if(r.fixedSale?.digest!==a.fixedSale?.digest||!sameBookingCheckout(r.booking,a.booking))invalid();
  }
 }
 return s;
}
export function hasPendingBookingCheckout(state:HostedCheckoutState,continuingOperationId?:string){return[state.current,...state.history].some(row=>row.bookingPreparation&&row.bookingPreparation.operationId!==continuingOperationId&&!['confirmed-paid','cancelled-paid','cancelled-unpaid'].includes(row.bookingPreparation.review?.phase??''));}
export function hasPendingHostedCheckout(state:HostedCheckoutState){return hasPendingBookingCheckout(state)||[state.current,...state.history].some(row=>row.notes.some(n=>['depositing','received','attention-required'].includes(n.status))||row.approvalHistory.length>0&&!['paid','not-sent'].includes(row.phase));}

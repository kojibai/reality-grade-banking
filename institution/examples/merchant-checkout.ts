import type {ReceizClient} from '@receiz/sdk';

/** Trusted server order data. Never reconstruct an order from browser success
 * parameters. This example composes the existing host; it is not a commit store. */
export interface MerchantOrder {
 readonly referenceId:string;
 readonly merchantUsername:string;
 readonly merchantUserId:string;
 readonly amountUsdCents:string;
}
export interface PreparedMerchantCheckout {
 readonly order:Readonly<MerchantOrder>;
 readonly sessionId:string;
 /** Contains a short-lived checkout secret. Do not log, publish or share it. */
 readonly frameUrl:string;
}
type Client=Pick<ReceizClient,'payments'|'request'>;
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const validSession=(value:unknown):value is string=>typeof value==='string'&&/^cs_[a-zA-Z0-9_]{8,200}$/.test(value);

function validateOrder(order:MerchantOrder){
 if(!/^[a-z0-9_]{3,24}$/.test(order.merchantUsername)||!order.merchantUserId||order.merchantUserId.length>160||/\s/.test(order.merchantUserId)
  ||!order.referenceId.trim()||order.referenceId.length>120||order.referenceId!==order.referenceId.trim()
  ||!/^\d{1,8}$/.test(order.amountUsdCents)||BigInt(order.amountUsdCents)<50n||BigInt(order.amountUsdCents)>10_000_000n)throw Error('MERCHANT_ORDER_INVALID');
}

/** Call once on an explicit customer checkout action. Serialize creation per
 * order and persist its exact returned session before exposing the frame. */
export async function prepareMerchantCardCheckout(client:Client,input:MerchantOrder):Promise<PreparedMerchantCheckout>{
 validateOrder(input);
 const order=Object.freeze({...input,amountUsdCents:String(BigInt(input.amountUsdCents))});
 const cents=BigInt(order.amountUsdCents),amountUsd=`${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
 const result=await client.payments.embeddedCheckout({username:order.merchantUsername,amountUsd,currency:'usd',uiMode:'embedded',referenceId:order.referenceId});
 const merchant=record(result.merchant),checkout=record(result.checkout);
 if(result.ok!==true||merchant.username!==order.merchantUsername||checkout.mode!=='embedded'||!validSession(checkout.sessionId)
  ||checkout.amountUsdCents!==order.amountUsdCents||checkout.currency!=='usd'||checkout.referenceId!==order.referenceId
  ||typeof checkout.clientSecret!=='string'||!checkout.clientSecret.startsWith(checkout.sessionId+'_secret_')||checkout.clientSecret.length>1000)throw Error('MERCHANT_CHECKOUT_RESPONSE_INVALID');
 const frame=new URL('https://receiz.com/payments/embed/checkout');
 frame.hash=new URLSearchParams({client_secret:checkout.clientSecret,session_id:checkout.sessionId,merchant:order.merchantUsername,amount_usd_cents:order.amountUsdCents}).toString();
 return Object.freeze({order,sessionId:checkout.sessionId,frameUrl:frame.href});
}

/** Read the retained original session using a trusted Receiz client. This host
 * route can reconcile an already-paid checkout; never poll it on a timer. */
export async function readMerchantCardCheckout(client:Client,pending:PreparedMerchantCheckout){
 validateOrder(pending.order);
 if(!validSession(pending.sessionId))throw Error('MERCHANT_CHECKOUT_REFERENCE_INVALID');
 const query=new URLSearchParams({session_id:pending.sessionId,merchant:pending.order.merchantUsername});
 const result=record(await client.request<unknown>(`/api/payments/embed/checkout/session?${query}`));
 const session=record(result.session),settlement=record(result.settlement);
 if(result.ok!==true||session.sessionId!==pending.sessionId||session.merchantUsername!==pending.order.merchantUsername)throw Error('MERCHANT_CHECKOUT_RESULT_INVALID');
 if(session.isPaid===true){
  if(session.state!=='paid'||session.isTerminal!==true||settlement.kind!=='connect_payment_checkout'
   ||settlement.userId!==pending.order.merchantUserId||settlement.amountUsdCents!==pending.order.amountUsdCents
   ||typeof settlement.amountPhiMicro!=='string'||!/^\d+$/.test(settlement.amountPhiMicro)||BigInt(settlement.amountPhiMicro)<=0n
   ||typeof settlement.alreadyProcessed!=='boolean')throw Error('MERCHANT_CHECKOUT_CREDIT_MISMATCH');
  return {status:'paid' as const,sessionId:pending.sessionId,order:pending.order,settlement};
 }
 if(session.isPaid!==false||typeof session.isTerminal!=='boolean'||!['open','complete_unpaid','expired','unknown'].includes(String(session.state)))throw Error('MERCHANT_CHECKOUT_RESULT_INVALID');
 return {status:session.isTerminal?'closed' as const:'pending' as const,sessionId:pending.sessionId,order:pending.order};
}

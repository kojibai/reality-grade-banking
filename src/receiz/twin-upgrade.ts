import {readTwinCreditFunding} from './twin-credit-funding.js';
export type TwinBillingInterval='month'|'year';
export type TwinUpgradeInput={action:'checkout';interval:TwinBillingInterval}|{action:'status';sessionId?:string}|{action:'billing'}|{action:'credits-checkout';amountUsd:string;operationId:string}|{action:'credits-status';sessionId:string}|{action:'credits-balance'}|{action:'credits-quote';amountUsd:string;operationId:string;fundingMode?:'balance'}|{action:'credits-purchase'|'credits-purchase-status';operationId:string;fundingMode?:'balance'};
export type TwinUpgradeResult={accountUid:string;twinAccess:boolean;checkout?:{sessionId:string;clientSecret:string;interval:TwinBillingInterval};billingPortal?:string;creditsCheckout?:{sessionId:string;clientSecret:string;amountUsdCents:string;credits:string};creditsBalance?:{grantRemaining:string;purchasedRemaining:string;totalRemaining:string};creditsReserveEligible?:boolean;creditFunding?:import('./twin-credit-funding').TwinCreditFunding;creditsStatus?:{sessionId:string;state:string;settled:boolean}};
export class TwinUpgradeError extends Error{
 constructor(readonly checkoutNotStarted=false){super('Your account upgrade could not be confirmed. Check your account before starting another payment.');}
}
export const twinCheckoutSession=(value:unknown):value is string=>typeof value==='string'&&/^cs_[A-Za-z0-9_]{8,200}$/.test(value);
export function twinCheckoutSecret(sessionId:string,value:unknown):value is string {return typeof value==='string'&&value.length<=1000&&value.startsWith(sessionId+'_secret_')&&value.length>sessionId.length+8;}
export function twinBillingPortalUrl(value:unknown):value is string {
 if(typeof value!=='string'||value.length>4096)return false;
 try{const url=new URL(value);return url.origin==='https://billing.stripe.com'&&!url.username&&!url.password&&url.pathname.startsWith('/p/session/');}catch{return false;}
}
/** Receiz owns checkout, billing and entitlement. This transports an SDK-signed
 * account continuation only after the owner chooses the upgrade. */
export async function requestTwinUpgrade(accountUid:string,continuation:unknown,input:TwinUpgradeInput):Promise<TwinUpgradeResult>{
 const response=await fetch('/api/bank/native/twin-upgrade',{method:'POST',headers:{'content-type':'application/json'},credentials:'omit',redirect:'error',body:JSON.stringify({accountUid,continuation:JSON.stringify(continuation),...input}),signal:AbortSignal.timeout(60_000)});
 const raw=await response.text();if(raw.length>8192)throw Error('Upgrade response could not be confirmed.');
 let value;try{value=JSON.parse(raw);}catch{throw Error('Upgrade response could not be confirmed.');}
 if(!response.ok||value?.ok!==true)throw new TwinUpgradeError(value?.checkoutOutcome==='not-started');
 if(value.accountUid!==accountUid||typeof value.twinAccess!=='boolean'||value.billingPortal!==undefined&&!twinBillingPortalUrl(value.billingPortal)||value.checkout&&(!twinCheckoutSession(value.checkout.sessionId)||!twinCheckoutSecret(value.checkout.sessionId,value.checkout.clientSecret)||!['month','year'].includes(value.checkout.interval)))throw Error('Upgrade response could not be confirmed.');
 if(value.creditFunding){if(!('operationId' in input))throw Error('Credit funding could not be confirmed.');readTwinCreditFunding(value.creditFunding,accountUid,input.operationId);}
 return value;
}

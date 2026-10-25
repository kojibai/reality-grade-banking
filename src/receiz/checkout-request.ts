import {readFixedSaleFields,type FixedSaleFields} from './fixed-checkout';
import {BANK_PUBLIC_ORIGIN,BANK_PAYMENT_ORIGINS} from './config';
import {publicReceizId} from './public-receiz-id';
export interface CheckoutRequest {username:string;amount?:string;fixedSale?:FixedSaleFields;}
export interface CheckoutReturn {username:string;checkoutId:string;sessionId:string;}
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const tracking=/^(?:utm_[a-z0-9_]{1,64}|fbclid|igsh|igshid|mibextid|gclid|dclid|gbraid|wbraid|msclkid|ttclid|twclid|li_fat_id|srsltid|mc_cid|mc_eid)$/;
function username(value:string){const id=publicReceizId(value);if(!id)throw Error('Use a Receiz ID.');return id.slice(0,-10);}
function dollars(value:string){if(!/^\d{1,18}(?:\.\d{1,2})?$/.test(value))throw Error('Enter a positive amount with up to two decimal places.');const [whole,fraction='']=value.split('.');if(BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'))<=0n)throw Error('Enter an amount greater than zero.');return `${BigInt(whole)}.${fraction.padEnd(2,'0')}`;}
function permittedOrigin(value:string){return BANK_PAYMENT_ORIGINS.some(origin=>origin===value)||/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(value);}
function checked(input:string,origin?:string){const url=new URL(input,origin??BANK_PUBLIC_ORIGIN);if(!(BANK_PAYMENT_ORIGINS.some(value=>value===url.origin)||origin===url.origin&&permittedOrigin(origin))||url.username||url.password||url.hash)throw Error('Open a Bankeiz checkout link.');return url;}
export function buildCheckoutRequest(coordinate:string,amount?:string){const url=new URL(`/pay/${username(coordinate)}/`,BANK_PUBLIC_ORIGIN);if(amount)url.searchParams.set('amount',dollars(amount));return url.href;}
export function parseCheckoutRequest(input:string,origin?:string):CheckoutRequest|null{
 const initial=new URL(input,origin??BANK_PUBLIC_ORIGIN);if(!initial.pathname.startsWith('/pay/'))return null;
 const url=checked(input,origin),match=/^\/pay\/([a-z0-9_]{3,24})\/?$/.exec(url.pathname);if(!match)throw Error('This checkout address could not be read.');
 for(const [key,value]of url.searchParams)if(url.searchParams.getAll(key).length!==1||!['amount','sale','recipient','fixed'].includes(key)&&(!tracking.test(key)||value.length>2048))throw Error('This checkout request could not be read.');
 const amount=url.searchParams.has('amount')?dollars(url.searchParams.get('amount')!):undefined;
 if(['sale','recipient','fixed'].some(key=>url.searchParams.has(key))){
  if(!amount||url.searchParams.get('fixed')!=='1'||!url.searchParams.has('sale')||!url.searchParams.has('recipient'))throw Error('This fixed checkout request is incomplete.');
  const [whole,fraction]=amount.split('.'),fixedSale=readFixedSaleFields({schema:'bank.fixed-checkout.v1',saleId:url.searchParams.get('sale'),recipientUserId:url.searchParams.get('recipient'),username:match[1],currency:'usd',amountUsdCents:String(BigInt(whole)*100n+BigInt(fraction))});
  return{username:match[1],amount,fixedSale};
 }
 return{username:match[1],...(amount?{amount}:{})};
}
export function buildCheckoutReturn(context:{username:string;checkoutId:string},origin:string){
 if(!uuid.test(context.checkoutId)||!permittedOrigin(origin))throw Error('Invalid checkout return.');
 return `${origin}/pay/${username(context.username)}/?checkoutReturn=1&checkout_id=${context.checkoutId}&session_id={CHECKOUT_SESSION_ID}`;
}
export function parseCheckoutReturn(input:string,origin:string):CheckoutReturn|null{
 const url=checked(input,origin);if(!url.searchParams.has('checkoutReturn'))return null;
 const match=/^\/pay\/([a-z0-9_]{3,24})\/?$/.exec(url.pathname),id=url.searchParams.get('checkout_id'),session=url.searchParams.get('session_id');
 if(!match||url.searchParams.get('checkoutReturn')!=='1'||!id||!uuid.test(id)||!session||!/^cs_[a-zA-Z0-9_]{8,200}$/.test(session)||[...url.searchParams.keys()].length!==3||['checkoutReturn','checkout_id','session_id'].some(key=>url.searchParams.getAll(key).length!==1))throw Error('Invalid checkout return.');
 return{username:match[1],checkoutId:id,sessionId:session};
}

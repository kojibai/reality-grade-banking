import {BANK_PUBLIC_ORIGIN} from './config';
import {loadReceiz} from './client';
export interface FixedSaleFields{schema:'bank.fixed-checkout.v1';saleId:string;recipientUserId:string;username:string;currency:'usd';amountUsdCents:string;}
export interface FixedSale extends FixedSaleFields{digest:string;}
const fields=['schema','saleId','recipientUserId','username','currency','amountUsdCents'] as const;
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
const invalid=():never=>{throw Error('FIXED_CHECKOUT_INVALID');};
export function readFixedSaleFields(raw:unknown):FixedSaleFields{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return invalid();const v=raw as Record<string,unknown>;
 if(Object.keys(v).length!==fields.length||fields.some(key=>!Object.hasOwn(v,key))||v.schema!=='bank.fixed-checkout.v1'||!uuid(v.saleId)||!uuid(v.recipientUserId)||typeof v.username!=='string'||!/^[a-z0-9_]{3,24}$/.test(v.username)||v.currency!=='usd'||typeof v.amountUsdCents!=='string'||!/^[1-9]\d{0,19}$/.test(v.amountUsdCents))return invalid();
 return{schema:'bank.fixed-checkout.v1',saleId:v.saleId,recipientUserId:v.recipientUserId,username:v.username,currency:'usd',amountUsdCents:v.amountUsdCents};
}
export async function createFixedSale(raw:FixedSaleFields):Promise<FixedSale>{const value=readFixedSaleFields(raw);return{...value,digest:await(await loadReceiz()).digestReceizCanonicalV122(value)};}
export async function readFixedSale(raw:unknown):Promise<FixedSale>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return invalid();const {digest,...value}=raw as Record<string,unknown>;if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))return invalid();const sale=await createFixedSale(value as unknown as FixedSaleFields);if(sale.digest!==digest)return invalid();return sale;
}
/** Public request coordinates, not a signed invoice or a payment approval. */
export function buildFixedSaleUrl(input:FixedSaleFields){
 const value=readFixedSaleFields(Object.fromEntries(fields.map(key=>[key,input[key]]))),amount=BigInt(value.amountUsdCents),url=new URL(`/pay/${value.username}/`,BANK_PUBLIC_ORIGIN);
 url.searchParams.set('fixed','1');url.searchParams.set('sale',value.saleId);url.searchParams.set('recipient',value.recipientUserId);url.searchParams.set('amount',`${amount/100n}.${String(amount%100n).padStart(2,'0')}`);
 if(new TextEncoder().encode(url.href).length>230)return invalid();return url.href;
}
export function fixedSalePaymentNote(sale:FixedSale,clientNonce:string){if(!/^[a-f0-9]{64}$/.test(sale.digest)||!uuid(clientNonce))return invalid();return`bank.sale.v1:${sale.digest}:${clientNonce}`;}
export function parseFixedSalePaymentNote(note:unknown):{saleDigest:string;clientNonce:string}|null{
 if(typeof note!=='string')return null;const match=/^bank\.sale\.v1:([a-f0-9]{64}):([a-f0-9-]{36})$/.exec(note);return match&&uuid(match[2])?{saleDigest:match[1],clientNonce:match[2]}:null;
}

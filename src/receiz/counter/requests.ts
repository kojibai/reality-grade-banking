import {readFixedSale,type FixedSale} from '../fixed-checkout';
export interface CounterRequestIndex{request:FixedSale;createdAt:string;status:'open'|'paid'|'cancelled';}
export async function readCounterRequestIndex(raw:unknown,ownerUid:string):Promise<CounterRequestIndex[]>{
 if(!Array.isArray(raw)||raw.length>1100)throw Error('Saved checkout index is unavailable.');const ids=new Set<string>();return Promise.all(raw.map(async value=>{if(!value||!['open','paid','cancelled'].includes(value.status)||!Number.isFinite(Date.parse(value.createdAt)))throw Error('Saved checkout index is unavailable.');const request=await readFixedSale(value.request);if(request.recipientUserId!==ownerUid||ids.has(request.saleId))throw Error('Saved checkout owner does not match.');ids.add(request.saleId);return{request,createdAt:value.createdAt,status:value.status};}));
}

import {safeReceizPublicUrl,type PublicMarketItem} from './public-market';
export interface PublicCardDetails {ownerUsername:string|null;ownerDisplayName:string|null;ownerProfileUrl:string|null;sealedAt:string|null;}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max:number)=>typeof v==='string'&&v.length>0&&v.length<=max?v:null;
/** Public presentation only. An ownership-history response grants no custody. */
export function parsePublicCardDetails(input:unknown,binding:{cardId:string;claimHash:string;circulationCount?:number}):PublicCardDetails{
 const data=object(input),rows=data.provenance;
 // The existing source caps its query at 200, so a full page cannot establish
 // the latest owner. Refuse truncation rather than showing an old owner as current.
 if(data.ok!==true||data.cardId!==binding.cardId||data.claimHash!==binding.claimHash||!Array.isArray(rows)||rows.length>=200||data.count!==rows.length)throw Error('PUBLIC_CARD_HISTORY_INCOMPLETE');
 const seen=new Set<string>(),history=rows.map(raw=>{
  const row=object(raw),hash=text(row.appendHash,64),at=text(row.occurredAt,64),owner=object(row.owner),name=text(owner.username,64);
  if(row.collectibleId!==binding.cardId||row.claimHash!==binding.claimHash||!hash||!/^[a-f0-9]{64}$/i.test(hash)||seen.has(hash)||!at||!Number.isFinite(Date.parse(at)))throw Error('PUBLIC_CARD_HISTORY_INVALID');
  seen.add(hash);return {kind:row.eventKind,at,ms:Date.parse(at),ownerUsername:name&&/^[a-zA-Z0-9_-]{1,64}$/.test(name)?name:null,ownerDisplayName:text(owner.displayName,128)};
 });
 const issues=history.filter(row=>row.kind==='issue');
 const singleCopy=(binding.circulationCount??1)===1&&issues.length<=1,last=history.reduce((latest,row)=>Math.max(latest,row.ms),-Infinity),heads=history.filter(row=>row.ms===last),owners=new Set(heads.map(row=>JSON.stringify([row.ownerUsername,row.ownerDisplayName]))),owner=singleCopy&&owners.size===1?heads[0]:null;
 return {ownerUsername:owner?.ownerUsername??null,ownerDisplayName:owner?.ownerDisplayName??null,ownerProfileUrl:owner?.ownerUsername?`https://receiz.com/${encodeURIComponent(owner.ownerUsername)}`:null,sealedAt:singleCopy&&issues.length===1?issues[0].at:null};
}
export async function fetchPublicCardDetails(item:PublicMarketItem,signal:AbortSignal):Promise<PublicCardDetails>{
 const safe=safeReceizPublicUrl(item.sourceUrl);if(item.category!=='sports'||!safe)throw Error('PUBLIC_CARD_HISTORY_UNAVAILABLE');
 const url=new URL(safe),claimHash=url.searchParams.get('claimHash'),cardId=url.pathname.split('/').filter(Boolean).at(-1);
 if(cardId!==item.assetId||!/^rsc_[a-f0-9]{16}$/i.test(cardId)||!claimHash||!/^[a-f0-9]{64}$/i.test(claimHash))throw Error('PUBLIC_CARD_HISTORY_INVALID');
 const query=new URLSearchParams({collectibleId:cardId,claimHash}),response=await fetch(`/api/bank/public-market/provenance?${query}`,{credentials:'omit',signal});
 if(!response.ok)throw Error('PUBLIC_CARD_HISTORY_UNAVAILABLE');
 return parsePublicCardDetails(await response.json(),{cardId,claimHash,circulationCount:item.circulationCount});
}

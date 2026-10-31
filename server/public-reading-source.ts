import {createPublicOriginalReader} from './public-profile.js';
import {parsePublicOriginal} from '../src/receiz/public-profile.js';
import type {PublicReadingAsset} from './public-reading-document';
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
function scalarFields(input:unknown,keys:readonly string[]){
 const source=object(input),fields:Record<string,string|number|boolean>={};
 for(const key of keys){const value=source[key];if(typeof value==='number'&&Number.isFinite(value)||typeof value==='boolean'||typeof value==='string'&&value.length>0&&value.length<=512)fields[key]=value;}
 return fields;
}
function project(input:unknown,username:string,id:string):PublicReadingAsset{
 // Admission stays with the existing public Original parser. Only the exact
 // selected row contributes additional public display fields, never siblings.
 const item=parsePublicOriginal(input,username,id),rows=object(object(input).viewer).originals as unknown[],row=object(rows.find(value=>object(value).id===id));
 return{...item,readingPricing:scalarFields(row.marketPreview,['quoteUsdPerPhi','priceUsd','pricePhi','intrinsicPhi','changePct','volumeUsd','liquidityUsd','holders','premiumX','momentX']),readingMedia:scalarFields(row.media,['kind','name','mime','size','sha256Hex','originalDownloadMime','originalDownloadName','originalDownloadSize','originalDownloadSha256Hex','originalDownloadPriceCents','originalDownloadLimit','allowOriginalDownload','derivativeDownloadMime','derivativeDownloadName','derivativeDownloadSize','derivativeDownloadSha256Hex','derivativeDownloadPriceCents','derivativeDownloadLimit','allowDerivativeDownload','allowMomentRecordDownload','receiptTzMinutesEast','receiptMs','collectionReleaseAt','collectionReleasePulse'])};
}
export function createPublicReadingOriginalReader(fetchImpl:typeof fetch=fetch){
 const read=createPublicOriginalReader(fetchImpl,project),pending=new Map<string,ReturnType<typeof read>>();
 return(username:string,id:string)=>{
  const key=username+':'+id,held=pending.get(key);if(held)return held;
  const attempt=read(username,id);pending.set(key,attempt);void attempt.finally(()=>{if(pending.get(key)===attempt)pending.delete(key);}).catch(()=>{});return attempt;
 };
}

import {receizBase64UrlDecode,receizBase64UrlEncode,sha256ReceizBytes} from '@receiz/sdk';
import {PUBLIC_NETWORK_INSPECTION_VERSION,PUBLIC_SOURCES,type PublicRecord,type PublicSource} from './public-network';
import {parsePublicNetworkCache,type PublicNetworkCache} from './public-network-cache';
import {ledgerValueForRecord,readLedgerValueDisplay,type LedgerValueDisplay,type LedgerValueIndex} from './ledger-value';
import {ledgerCurrentAssetValue,ledgerValuationContext} from './ledger-economy';
import {readLedgerValuationTrace,type LedgerFields} from './ledger-inspection';

export type LocalLedgerDisplay=Readonly<{id:string;value:LedgerValueDisplay;currentValue:LedgerValueDisplay|null;valuation:LedgerFields|null}>;
export type LocalLedgerInput=Readonly<{records:readonly PublicRecord[];capturedAt:string|null;sources:Partial<Record<PublicSource,{complete:boolean;observedAt?:number}>>;valueSource?:LedgerValueIndex|null;displayValues?:readonly LocalLedgerDisplay[]}>;
export type LocalLedgerArchive=Readonly<{records:readonly PublicRecord[];capturedAt:string|null;coverage:PublicNetworkCache['coverage'];dataSha256:string;displayValues:readonly LocalLedgerDisplay[]}>;
export type LocalLedgerCarrier=Readonly<{kind:'bankeiz.public-ledger-archive';version:'v1';codec:'gzip-base64url';dataSha256:string;dataBytes:number;recordCount:number;data:string}>;
const MAX_RAW=64*1024*1024,MAX_COMPRESSED=12*1024*1024;
const fail=():never=>{throw Error('PUBLIC_LEDGER_ARCHIVE_INVALID');};
async function streamBytes(stream:ReadableStream<Uint8Array>,max:number){
 const reader=stream.getReader(),parts:Uint8Array[]=[];let size=0;
 try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>max)throw Error('PUBLIC_LEDGER_ARCHIVE_CAPACITY');parts.push(chunk.value);}}
 finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
/** Application data inside a new SDK-sealed document. This never creates a
 * native Action Ledger statement or enters account/custody admission. */
export async function packLocalLedger(input:LocalLedgerInput):Promise<{carrier:LocalLedgerCarrier;archive:LocalLedgerArchive}>{
 if(!input.records.length)throw Error('PUBLIC_LEDGER_ARCHIVE_EMPTY');
 if(input.records.length>100000)throw Error('PUBLIC_LEDGER_ARCHIVE_CAPACITY');
 // Pick public fields explicitly. Never serialize a hook, account source or
 // future private property by spreading caller objects into a public file.
 const rows=input.records.map(row=>{
  if(row.authority!=='public-source-projection'||row.origin!==undefined)throw Error('PUBLIC_LEDGER_ARCHIVE_PRIVATE_SOURCE');
  return {id:row.id,sourceId:row.sourceId,source:row.source,kind:row.kind,title:row.title,detail:row.detail,time:row.time,actor:row.actor,
   amountUsdCents:row.amountUsdCents,kaiUpulse:row.kaiUpulse,pulse:row.pulse,sourceUrl:row.sourceUrl,...row.sender!==undefined?{sender:row.sender}:{},...row.recipient!==undefined?{recipient:row.recipient}:{},
   evidence:row.evidence,valueOperands:row.valueOperands,details:row.details,authority:'public-source-projection'};
 });
 const coverage=PUBLIC_SOURCES.map(source=>({source,complete:input.sources[source]?.complete===true,observedAt:input.sources[source]?.observedAt}));
 const cache=parsePublicNetworkCache({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',inspectionVersion:PUBLIC_NETWORK_INSPECTION_VERSION,records:rows,capturedAt:input.capturedAt,coverage});
 if(cache.records.length!==rows.length)throw Error('PUBLIC_LEDGER_ARCHIVE_DUPLICATE');
 const displayValues=input.displayValues??input.records.flatMap(record=>{
  // Most Ledger rows are nonfinancial actions. Preserve their bytes without
  // asking the valuation engine for an amount they do not carry or reference.
  if(record.amountUsdCents===null&&!Object.keys(record.valueOperands??{}).length&&record.source!=='proofs'&&!record.sourceId.startsWith('market-asset-')&&!record.evidence.objectId&&!record.evidence.claimHash)return [];
  const value=ledgerValueForRecord(record,input.valueSource??null),currentValue=/transfer|send/i.test(record.kind)?ledgerCurrentAssetValue(record,input.valueSource??null):null;
  return value.amountUsdCents!==null||currentValue!==null&&currentValue.amountUsdCents!==null?[{id:record.id,value,currentValue,valuation:ledgerValuationContext(record,input.valueSource??null,value)}]:[];
 });
 const bytes=new TextEncoder().encode(JSON.stringify({schema:'receiz.bank.public-ledger-cache.v1',authority:'public-source-projection',...cache,displayValues}));
 if(bytes.length>MAX_RAW)throw Error('PUBLIC_LEDGER_ARCHIVE_CAPACITY');
 const compressed=await streamBytes(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')),MAX_COMPRESSED),dataSha256=await sha256ReceizBytes(bytes);
 return {carrier:{kind:'bankeiz.public-ledger-archive',version:'v1',codec:'gzip-base64url',dataSha256,dataBytes:bytes.length,recordCount:cache.records.length,data:receizBase64UrlEncode(compressed)},archive:{records:cache.records,capturedAt:cache.capturedAt,coverage:cache.coverage,dataSha256,displayValues}};
}
/** Only call after the enclosing image has passed canonical SDK verification. */
export async function openLocalLedgerCarrier(value:unknown):Promise<LocalLedgerArchive>{
 const v=value as LocalLedgerCarrier;
 if(!v||Object.keys(v).sort().join(',')!=='codec,data,dataBytes,dataSha256,kind,recordCount,version'||v.kind!=='bankeiz.public-ledger-archive'||v.version!=='v1'||v.codec!=='gzip-base64url'
  ||typeof v.dataSha256!=='string'||!/^[a-f0-9]{64}$/.test(v.dataSha256)||!Number.isSafeInteger(v.dataBytes)||v.dataBytes<=0||v.dataBytes>MAX_RAW
  ||!Number.isSafeInteger(v.recordCount)||v.recordCount<=0||v.recordCount>100000||typeof v.data!=='string'||v.data.length>Math.ceil(MAX_COMPRESSED*4/3)||!/^[A-Za-z0-9_-]+$/.test(v.data))fail();
 const compressed=receizBase64UrlDecode(v.data);if(receizBase64UrlEncode(compressed)!==v.data)fail();
 const bytes=await streamBytes(new Blob([new Uint8Array(compressed)]).stream().pipeThrough(new DecompressionStream('gzip')),v.dataBytes);
 if(bytes.length!==v.dataBytes||await sha256ReceizBytes(bytes)!==v.dataSha256)fail();
 const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),cache=parsePublicNetworkCache(raw);
 if(cache.records.length!==v.recordCount||cache.records.some(row=>row.authority!=='public-source-projection'||row.origin!==undefined))fail();
 const ids=new Set(cache.records.map(row=>row.id)),seen=new Set<string>();
 if(raw.displayValues!==undefined&&(!Array.isArray(raw.displayValues)||raw.displayValues.length>cache.records.length))fail();
 const displayValues:LocalLedgerDisplay[]=(raw.displayValues??[]).map((item:LocalLedgerDisplay)=>{
  if(!item||typeof item.id!=='string'||!ids.has(item.id)||seen.has(item.id))fail();seen.add(item.id);
  const value=readLedgerValueDisplay(item.value),currentValue=item.currentValue===null?null:readLedgerValueDisplay(item.currentValue),valuation=item.valuation===null?null:readLedgerValuationTrace(item.valuation);
  if(!value||item.currentValue!==null&&!currentValue||item.valuation!==null&&!valuation)fail();
  return {id:item.id,value:value!,currentValue,valuation};
 });
 return {records:cache.records,capturedAt:cache.capturedAt,coverage:cache.coverage,dataSha256:v.dataSha256,displayValues};
}

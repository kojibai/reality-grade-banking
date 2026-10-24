import {cachedReceiptSnapshot,retainReceiptSnapshot} from './receipt-snapshot-cache';
import {BANK_PUBLIC_ORIGIN} from './config';
import {readLedgerReceipt,type LedgerReceipt} from './ledger-receipts';
const MAX_BYTES=8*1024*1024;
const endpoint=(digest:string)=>`https://receiz.com/api/public/display-snapshots/${digest}`;
const valid=(digest:string)=>/^[a-f0-9]{64}$/.test(digest);
export function receiptSnapshotDigest(link:string){const url=new URL(link,BANK_PUBLIC_ORIGIN);return !url.search&&!url.hash?url.pathname.match(/^\/receipt\/([a-f0-9]{64})\/?$/)?.[1]??null:null;}
export function receiptSnapshotUrl(digest:string){if(!valid(digest))throw Error('RECEIPT_INVALID');return `${BANK_PUBLIC_ORIGIN}/receipt/${digest}/`;}
export async function receiptDigest(bytes:Uint8Array){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.slice().buffer)),b=>b.toString(16).padStart(2,'0')).join('');}
async function boundedBody(response:Response){if(Number(response.headers.get('content-length'))>MAX_BYTES)throw Error('RECEIPT_TOO_LARGE');if(!response.body)throw Error('RECEIPT_INVALID');const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES)throw Error('RECEIPT_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;}
export async function readReceiptSnapshot(digest:string,fetcher:typeof fetch=fetch):Promise<LedgerReceipt>{
 if(!valid(digest))throw Error('RECEIPT_INVALID');
 const retained=typeof window!=='undefined'?await cachedReceiptSnapshot(digest):null;
 if(retained){const bytes=new TextEncoder().encode(retained.payload);if(await receiptDigest(bytes)===digest)return readLedgerReceipt(JSON.parse(retained.payload));}
 const response=await fetcher(endpoint(digest),{credentials:'omit',cache:'force-cache',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error(response.status===404?'RECEIPT_NOT_FOUND':'RECEIPT_READ_UNAVAILABLE');
 const bytes=await boundedBody(response);if(await receiptDigest(bytes)!==digest)throw Error('RECEIPT_INTEGRITY_FAILED');
 return readLedgerReceipt(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}
// Successful URLs only; failures remain retryable. No account/row initialization.
const inFlight=new Map<string,Promise<string>>(),saved=new Map<string,string>();
export async function saveReceiptSnapshot(receipt:LedgerReceipt,fetcher:typeof fetch=fetch){
 const payload=JSON.stringify(readLedgerReceipt(receipt)),bytes=new TextEncoder().encode(payload);if(bytes.length>MAX_BYTES)throw Error('RECEIPT_TOO_LARGE');
 const digest=await receiptDigest(bytes),url=receiptSnapshotUrl(digest);
 if(saved.has(digest))return url;
 const existing=inFlight.get(digest);if(existing)return existing;
 const work=(async()=>{const retained=await cachedReceiptSnapshot(digest);if(retained?.payload===payload){saved.set(digest,url);return url;}const response=await fetcher(endpoint(digest),{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:payload,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('RECEIPT_SAVE_UNAVAILABLE');const result=await response.json();if(result.ok!==true||result.sha256!==digest)throw Error('RECEIPT_SAVE_UNAVAILABLE');saved.set(digest,url);void retainReceiptSnapshot(digest,payload);if(saved.size>128)saved.delete(saved.keys().next().value!);return url;})();
 inFlight.set(digest,work);try{return await work;}finally{inFlight.delete(digest);}
}
/** A seed is supplied only by the short receipt server after its digest check. */
export function initialReceiptSnapshot(link:string):LedgerReceipt|null{
 const digest=receiptSnapshotDigest(link);if(!digest||typeof document==='undefined')return null;
 const seed=document.getElementById('receipt-snapshot');if(seed?.getAttribute('data-digest')!==digest)return null;
 try{return readLedgerReceipt(JSON.parse(seed.textContent??''));}catch{return null;}
}
export function receiptLedgerUrl(receipt:LedgerReceipt){return `${BANK_PUBLIC_ORIGIN}/ledger/#record=${encodeURIComponent(receipt.source+':'+receipt.id)}`;}

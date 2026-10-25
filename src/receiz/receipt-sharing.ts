import {BANK_PUBLIC_ORIGIN} from './config';
import {readReceiptLink} from './ledger-receipts';
import {encodeReceiptPacket} from './receipt-packet';
import type {LedgerReceipt} from './ledger-receipts';
import {receiptSnapshotDigest,receiptSnapshotUrl,saveReceiptSnapshot} from './receipt-snapshot';

export function compactReceiptLink(link:string):string{
 const receipt=readReceiptLink(link),url=new URL(link,BANK_PUBLIC_ORIGIN);
 // Canonical origin also keeps a localhost receipt useful outside this device.
 if(url.searchParams.has('r'))return `${BANK_PUBLIC_ORIGIN}/receipt/${url.search}`;
 if(new URLSearchParams(url.hash.slice(1)).has('p'))return `${BANK_PUBLIC_ORIGIN}/receipt/${url.hash}`;
 return `${BANK_PUBLIC_ORIGIN}/receipt/?r=${encodeReceiptPacket(receipt)}`;
}
export async function copyReceiptLink(link:string):Promise<void>{await navigator.clipboard.writeText(compactReceiptLink(link));}
/** Copy is one action. Promise-backed clipboard data preserves Safari's
 * original tap while the exact immutable short link is saved for the first time. */
export async function copySavedReceiptLink(receipt:LedgerReceipt,readyUrl?:string):Promise<void>{
 const clipboard=navigator.clipboard;if(!clipboard?.write&&!clipboard?.writeText)throw Error('COPY_UNAVAILABLE');
 const digest=readyUrl?receiptSnapshotDigest(readyUrl):null;
 const url=digest?Promise.resolve(receiptSnapshotUrl(digest)):saveReceiptSnapshot(receipt);void url.catch(()=>{});
 if(typeof ClipboardItem!=='undefined'&&typeof clipboard.write==='function'){
  await clipboard.write([new ClipboardItem({'text/plain':url.then(value=>new Blob([value],{type:'text/plain'}))})]);
 }else await clipboard.writeText(await url);
}
export async function shareReceiptLink(link:string):Promise<'shared'|'copied'|'cancelled'>{
 const url=compactReceiptLink(link);
 if(typeof navigator.share==='function'){
  // Call before any await so Safari retains the original tap's activation.
  try{await navigator.share({title:'Bankeiz receipt',url});return 'shared';}
  catch(error){if(error instanceof Error&&error.name==='AbortError')return 'cancelled';throw error;}
 }
 await navigator.clipboard.writeText(url);return 'copied';
}

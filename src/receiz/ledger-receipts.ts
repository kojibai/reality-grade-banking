import type {PublicRecord} from './public-network';
import {safeReceizPublicUrl} from './public-market';
import {BANK_PUBLIC_ORIGIN} from './config';
import {ledgerValueForRecord,readLedgerValueDisplay,type LedgerValueDisplay} from './ledger-value';
export const ACTIVITY_FILTERS=['all','transactions','transfers','actions','proofs'] as const;
export type ActivityCategory=typeof ACTIVITY_FILTERS[number];
export function activityCategory(record:Pick<PublicRecord,'source'|'kind'|'amountUsdCents'>):Exclude<ActivityCategory,'all'>{
 if(/transfer|send|payment_sent|payment_received/i.test(record.kind))return 'transfers';
 if(record.source==='wallet'||/purchase|sale|trade|exchange|note_(mint|claim)|reserve_credit|deposit|withdraw/i.test(record.kind))return 'transactions';
 return record.source==='actions'?'actions':'proofs';
}
export interface LedgerReceipt {schema:'bankeiz.ledger-receipt.v1';id:string;kind:string;title:string;amountUsdCents:string|null;pulse:string|null;kaiUpulse:string|null;time:string|null;sender:string|null;recipient:string|null;sourceUrl:string|null;evidence:Record<string,string>;value:LedgerValueDisplay|null;}
export function safeReceiptSourceUrl(input:unknown):string|null{
 if(typeof input!=='string'||input.length>24000)return null;
 try{const url=new URL(input,'https://receiz.com');return url.origin==='https://receiz.com'&&!url.username&&!url.password&&!url.hash&&/^\/[tv]\/\d{8}_\d{4}\/[A-Z0-9]{8,32}\/[1-9]\d{0,23}\/?$/i.test(url.pathname)&&[...url.searchParams.keys()].every(key=>['a','ms','c','p','tz','r'].includes(key)&&url.searchParams.getAll(key).length===1)?url.href:null;}catch{return null;}
}
export const safeLedgerSourceUrl=(value:unknown)=>safeReceiptSourceUrl(value)??safeReceizPublicUrl(value,'proof')??safeReceizPublicUrl(value,'source');
const text=(v:unknown,max=4096)=>typeof v==='string'&&v.length>0&&v.length<=max?v:null;
function read(input:unknown):LedgerReceipt{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('RECEIPT_INVALID');
 const v=input as Record<string,unknown>,id=text(v.id,512),kind=text(v.kind,128),title=text(v.title);
 const uint=(value:unknown,max=30)=>typeof value==='string'&&new RegExp(`^(0|[1-9]\\d{0,${max-1}})$`).test(value)?value:null;
 if(v.schema!=='bankeiz.ledger-receipt.v1'||!id||!kind||!title)throw Error('RECEIPT_INVALID');
 const evidence:Record<string,string>={};
 if(v.evidence&&typeof v.evidence==='object')for(const [key,value]of Object.entries(v.evidence)){if(['entryHash','prevHash','transferId','objectId','proofHead','bundleHash','capsuleHash','claimHash','artifactDigest'].includes(key)&&text(value,512))evidence[key]=value as string;}
 return{schema:'bankeiz.ledger-receipt.v1',id,kind,title,amountUsdCents:uint(v.amountUsdCents),pulse:uint(v.pulse,24),kaiUpulse:uint(v.kaiUpulse),time:text(v.time,64)&&Number.isFinite(Date.parse(String(v.time)))?String(v.time):null,sender:text(v.sender,128),recipient:text(v.recipient,128),sourceUrl:safeLedgerSourceUrl(v.sourceUrl),evidence,value:readLedgerValueDisplay(v.value)};
}
export function receiptLink(record:PublicRecord,value=ledgerValueForRecord(record)):string|null{
 const receipt=read({schema:'bankeiz.ledger-receipt.v1',id:record.sourceId,kind:record.kind,title:record.title,amountUsdCents:record.amountUsdCents,pulse:record.pulse,kaiUpulse:record.kaiUpulse,time:record.time,sender:record.sender,recipient:record.recipient,sourceUrl:record.sourceUrl,evidence:record.evidence,value});
 const bytes=new TextEncoder().encode(JSON.stringify(receipt));if(bytes.length>24000)return null;
 let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);
 return `${BANK_PUBLIC_ORIGIN}/receipt/#r=${btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}`;
}
export function readReceiptLink(link:string):LedgerReceipt{
 const url=new URL(link,BANK_PUBLIC_ORIGIN),params=new URLSearchParams(url.hash.slice(1)),encoded=params.get('r');
 if(url.pathname!=='/receipt/'||params.size!==1||!encoded||encoded.length>32000||!/^[A-Za-z0-9_-]+$/.test(encoded))throw Error('RECEIPT_INVALID');
 const bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 return read(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}
export function openLedgerReceipt(event:React.MouseEvent<HTMLAnchorElement>,link:string){
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();const url=new URL(link);history.pushState({bankReceipt:true},'',url.pathname+url.hash);dispatchEvent(new Event('bankeiz:receipt'));dispatchEvent(new Event('receiz-bank:surface'));scrollTo(0,0);
}

import {isCertificateMovement} from './ledger-share-certificate';
import {readLedgerFundingContext,compactLedgerFundingContext} from './ledger-funding-context';
import type {PublicRecord} from './public-network';
import {safeReceizPublicUrl} from './public-market';
import {BANK_PUBLIC_ORIGIN} from './config';
import {ledgerValueForRecord,readLedgerValueDisplay,readLedgerValueOperands,type LedgerValueDisplay,type LedgerValueOperands,type LedgerValueIndex} from './ledger-value';
import {readLedgerDetails,readLedgerValuationTrace,type LedgerFields} from './ledger-inspection';
import {decodeReceiptPacket,encodeReceiptPacket} from './receipt-packet';
import {ledgerAssetTradeSide,ledgerAssetTrade} from './ledger-asset-trade';
export const ACTIVITY_FILTERS=['all','transactions','transfers','actions','proofs'] as const;
export type ActivityCategory=typeof ACTIVITY_FILTERS[number];
export function activityCategory(record:Pick<PublicRecord,'source'|'kind'|'amountUsdCents'>):Exclude<ActivityCategory,'all'>{
 if(/transfer|send|payment_sent|payment_received/i.test(record.kind))return 'transfers';
 if(ledgerAssetTradeSide(record)||isCertificateMovement(record.kind))return 'transactions';
 if(record.source==='wallet'||/purchase|sale|trade|exchange|note_(mint|claim)|reserve_credit|deposit|withdraw/i.test(record.kind))return 'transactions';
 return record.source==='actions'?'actions':'proofs';
}
export interface LedgerReceipt {schema:'bankeiz.ledger-receipt.v1';id:string;kind:string;title:string;source:PublicRecord['source'];authority:PublicRecord['authority'];detail:string;amountUsdCents:string|null;pulse:string|null;kaiUpulse:string|null;time:string|null;sender:string|null;recipient:string|null;sourceUrl:string|null;evidence:Record<string,string>;value:LedgerValueDisplay|null;details:LedgerFields|null;valueOperands:LedgerValueOperands;valuation:LedgerFields|null;contextOmitted:boolean;}
export function safeReceiptSourceUrl(input:unknown):string|null{
 if(typeof input!=='string'||input.length>24000)return null;
 try{const url=new URL(input,'https://receiz.com');return url.origin==='https://receiz.com'&&!url.username&&!url.password&&!url.hash&&/^\/[tv]\/\d{8}_\d{4}\/[A-Z0-9]{8,32}\/[1-9]\d{0,23}\/?$/i.test(url.pathname)&&[...url.searchParams.keys()].every(key=>['a','ms','c','p','tz','r'].includes(key)&&url.searchParams.getAll(key).length===1)?url.href:null;}catch{return null;}
}
export const safeLedgerSourceUrl=(value:unknown)=>safeReceiptSourceUrl(value)??safeReceizPublicUrl(value,'proof')??safeReceizPublicUrl(value,'source');
const text=(v:unknown,max=4096)=>typeof v==='string'&&v.length>0&&v.length<=max?v:null;
export function readLedgerReceipt(input:unknown):LedgerReceipt{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('RECEIPT_INVALID');
 const v=input as Record<string,unknown>,id=text(v.id,512),kind=text(v.kind,128),title=text(v.title);
 const uint=(value:unknown,max=30)=>typeof value==='string'&&new RegExp(`^(0|[1-9]\\d{0,${max-1}})$`).test(value)?value:null;
 if(v.schema!=='bankeiz.ledger-receipt.v1'||!id||!kind||!title)throw Error('RECEIPT_INVALID');
 const evidence:Record<string,string>={};
 if(v.evidence&&typeof v.evidence==='object')for(const [key,value]of Object.entries(v.evidence)){if(['entryHash','prevHash','transferId','noteId','objectId','proofHead','bundleHash','capsuleHash','claimHash','artifactDigest'].includes(key)&&text(value,512))evidence[key]=value as string;}
 return{schema:'bankeiz.ledger-receipt.v1',id,kind,title,source:['wallet','actions','graph','proofs'].includes(String(v.source))?v.source as PublicRecord['source']:/proof|market.asset/i.test(kind)?'proofs':'wallet',authority:v.authority==='account-source-projection'?'account-source-projection':'public-source-projection',detail:text(v.detail,8192)??'',amountUsdCents:uint(v.amountUsdCents),pulse:uint(v.pulse,24),kaiUpulse:uint(v.kaiUpulse),time:text(v.time,64)&&Number.isFinite(Date.parse(String(v.time)))?String(v.time):null,sender:text(v.sender,128),recipient:text(v.recipient,128),sourceUrl:safeLedgerSourceUrl(v.sourceUrl),evidence,value:readLedgerValueDisplay(v.value),details:v.details?readLedgerDetails(v.details):null,valueOperands:readLedgerValueOperands(v.valueOperands),valuation:readLedgerValuationTrace(v.valuation),contextOmitted:v.contextOmitted===true};
}
/** Complete curated display capture. Called only for an explicitly selected
 * share, never while preparing every Ledger row. Original proofs retain authority. */
export function completeLedgerReceipt(record:PublicRecord,value=ledgerValueForRecord(record),valuation?:LedgerFields|null):LedgerReceipt{
 const details=readLedgerDetails(record.details),context=readLedgerFundingContext(details.fundingContext);
 return readLedgerReceipt({schema:'bankeiz.ledger-receipt.v1',id:record.sourceId,source:record.source,authority:record.authority,detail:record.authority==='public-source-projection'?record.detail:'',kind:record.kind,title:record.title,amountUsdCents:record.amountUsdCents,pulse:record.pulse,kaiUpulse:record.kaiUpulse,time:record.time,sender:record.sender,recipient:record.recipient,sourceUrl:record.sourceUrl,evidence:record.evidence,value,details,valueOperands:record.valueOperands,valuation,contextOmitted:context?.coverage.status==='incomplete'});
}
export function receiptLink(record:PublicRecord,value=ledgerValueForRecord(record),valuation?:LedgerFields|null):string|null{
 // Keep the shared source cohort by reference in the in-app receipt/archive.
 // Do not repeatedly serialize hundreds of originals into every row's URL.
 const {fundingCohorts,fundingContext,...retainedDetails}=record.details??{};
 const context=readLedgerFundingContext(fundingContext),fullNote=!!context&&/note_(mint|claim|create|deposit)/i.test(record.kind+' '+String(record.details?.ledgerEntryKind??'')),compact=context?(fullNote?context:compactLedgerFundingContext(context)):undefined;
 const details:LedgerFields={...retainedDetails,...(compact?{fundingContext:compact as unknown as LedgerFields}:{})};
 // Both views share the same curated fields of the selected record. The
 // reader excludes arbitrary account/chat metadata and custody material.
 const trade=ledgerAssetTrade(record),tradeDetails=trade?readLedgerDetails({ledgerEntryKind:details.ledgerEntryKind,assetTrade:trade}):null;
 const receipt=readLedgerReceipt({schema:'bankeiz.ledger-receipt.v1',id:record.sourceId,source:record.source,authority:record.authority,detail:record.authority==='public-source-projection'?record.detail:'',kind:record.kind,title:record.title,amountUsdCents:record.amountUsdCents,pulse:record.pulse,kaiUpulse:record.kaiUpulse,time:record.time,sender:record.sender,recipient:record.recipient,sourceUrl:record.sourceUrl,evidence:record.evidence,value,details,valueOperands:record.valueOperands,valuation,contextOmitted:!!fundingCohorts||compact?.coverage.status==='incomplete'});
 // Notes carry their complete already-held funding graph in a bounded lossless
 // packet. A fragment keeps large evidence out of HTTP request/query limits.
 // Existing ordinary receipt links and their compact transport stay unchanged.
 if(fullNote){
  try{return `${BANK_PUBLIC_ORIGIN}/receipt/#p=${encodeReceiptPacket(receipt)}`;}
  catch(error){if(!(error instanceof Error)||error.message!=='RECEIPT_TOO_LARGE')throw error;}
  receipt.details=readLedgerDetails({...retainedDetails,fundingContext:compactLedgerFundingContext(context!)});receipt.contextOmitted=true;
 }
 let bytes=new TextEncoder().encode(JSON.stringify(receipt));
 // Large optional descriptions and model traces must not remove the receipt.
 if(bytes.length>24000){receipt.detail='';receipt.details=tradeDetails;receipt.valuation=null;receipt.contextOmitted=true;bytes=new TextEncoder().encode(JSON.stringify(receipt));}
 if(bytes.length>24000){receipt.sourceUrl=null;bytes=new TextEncoder().encode(JSON.stringify(receipt));}
 if(bytes.length>24000)return null;
 let raw='';for(const byte of bytes)raw+=String.fromCharCode(byte);
 return `${BANK_PUBLIC_ORIGIN}/receipt/#r=${btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}`;
}
export function readReceiptLink(link:string):LedgerReceipt{
 const compactUrl=new URL(link,BANK_PUBLIC_ORIGIN);
 if(compactUrl.search){
  if(compactUrl.pathname!=='/receipt/'||compactUrl.hash||compactUrl.searchParams.size!==1||!compactUrl.searchParams.has('r'))throw Error('RECEIPT_INVALID');
  return readLedgerReceipt(decodeReceiptPacket(compactUrl.searchParams.get('r')!));
 }
 const url=new URL(link,BANK_PUBLIC_ORIGIN),params=new URLSearchParams(url.hash.slice(1));
 if(url.pathname==='/receipt/'&&params.size===1&&params.has('p'))return readLedgerReceipt(decodeReceiptPacket(params.get('p')!));
 const encoded=params.get('r');
 if(url.pathname!=='/receipt/'||params.size!==1||!encoded||encoded.length>32000||!/^[A-Za-z0-9_-]+$/.test(encoded))throw Error('RECEIPT_INVALID');
 const bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
 return readLedgerReceipt(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
}
export function localReceiptPath(link:string){const url=new URL(link,BANK_PUBLIC_ORIGIN);return url.pathname+url.search+url.hash;}
export type LedgerReceiptContext={record:PublicRecord;value:LedgerValueDisplay;valuation?:LedgerFields|null;valueSource?:LedgerValueIndex|null;relations?:ReturnType<typeof import('./ledger-economy').indexLedgerRelations>};
// One selected in-app record, by reference, until its receipt unmounts. No
// account history is persisted, serialized into URLs, or exposed to new tabs.
let localContext:{path:string;context:LedgerReceiptContext}|null=null;
export function readLocalReceiptContext(link:string){return localContext?.path===localReceiptPath(link)?localContext.context:null;}
export function releaseLocalReceiptContext(context:LedgerReceiptContext|null){if(localContext?.context===context)localContext=null;}
export function openLedgerReceipt(event:React.MouseEvent<HTMLAnchorElement>,link:string,context?:LedgerReceiptContext){
 if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 event.preventDefault();
 if(context){const core=readReceiptLink(link);if(core.id!==context.record.sourceId||core.source!==context.record.source||core.kind!==context.record.kind||core.authority!==context.record.authority)throw Error('RECEIPT_CONTEXT_MISMATCH');localContext={path:localReceiptPath(link),context};}else localContext=null;
 history.pushState({bankReceipt:true},'',localReceiptPath(link));dispatchEvent(new Event('bankeiz:receipt'));dispatchEvent(new Event('receiz-bank:surface'));scrollTo(0,0);
}

export function readPublicLedgerSelection(link:string){try{const url=new URL(link,BANK_PUBLIC_ORIGIN),key=new URLSearchParams(url.hash.slice(1)).get('record');if(url.pathname!=='/ledger/'||!key||key.length>600||!/^(wallet|actions|graph|proofs):.+$/.test(key))return null;return{key,search:key.replace(/^(wallet|actions|graph|proofs):/,'')};}catch{return null;}}

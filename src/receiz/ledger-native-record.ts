import type {PublicRecord} from './public-network';
import {decodeSharePayload} from '../../native/receiz/app/utils/shareBundleCodec';
import {safeReceizPublicUrl} from './public-market';
import {buildWalletLedgerReceiptPayload,buildWalletLedgerVHref,type WalletLedgerLinkEvent} from '../../native/receiz/app/lib/transactions/walletLedgerLinks';
import {readPngTextChunks} from '../../native/receiz/app/utils/pngChunks';
import {jcsCanonicalize} from '../../native/receiz/app/utils/jcs';
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
const digits=(v:unknown):v is string=>typeof v==='string'&&/^\d{1,30}$/.test(v);
export type LedgerNativeRecord={path:string;filename:string;payload?:Record<string,unknown>};
/** Presence only. No request, compression or proof work belongs on row opening. */
export function hasLedgerNativeRecord(record:PublicRecord):boolean{
 if(record.evidence.artifactDigest)return false;
 const b=object(record.details?.proofBundle),m=object(record.details?.receiz);
 return record.source==='wallet'&&b.verificationVersion==='wallet-ledger-v1'&&hex(b.bundleHash)&&hex(b.capsuleHash)&&!!record.time&&digits(record.pulse)&&digits(record.valueOperands?.amountPhiMicro)&&digits(record.amountUsdCents)
  ||typeof record.sourceUrl==='string'&&/^https:\/\/receiz\.com\/[tv]\//.test(record.sourceUrl)
  ||typeof m.slug==='string'&&/^\d{8}_\d{4}$/.test(m.slug)&&typeof m.code==='string'&&/^[a-f0-9]{8}$/i.test(m.code)&&digits(m.ms)&&typeof m.anchorId==='string'&&/^[a-f0-9]{8}$/i.test(m.anchorId);
}
/** The same native v/ payload and export used by Receiz, prepared only for an
 * explicit download/inspection. No Bank seal or display-JSON export exists. */
export function ledgerNativeRecord(record:PublicRecord):LedgerNativeRecord|null{
 if(!hasLedgerNativeRecord(record))return null;
 // A carried native transaction link already contains the exact receipt.
 // Decode only on the explicit file action; opening the row remains IO-free.
 if(record.sourceUrl&&record.sourceUrl.length<=8192)try{
  const url=new URL(record.sourceUrl),token=url.searchParams.get('p');
  if(url.origin==='https://receiz.com'&&!url.hash&&/^\/[tv]\/\d{8}_\d{4}\/[a-z0-9]{8,32}\/\d{1,24}$/i.test(url.pathname)&&token&&[...url.searchParams.keys()].every(key=>['a','ms','p','tz'].includes(key)&&url.searchParams.getAll(key).length===1)){
   const payload=object(decodeSharePayload(token));
   if(payload.verificationVersion==='wallet-ledger-v1'&&hex(payload.bundleHash)&&hex(payload.capsuleHash)){
    url.pathname=url.pathname.replace(/^\/t\//,'/v/');const parts=url.pathname.split('/');
    return{path:url.pathname+url.search,filename:`receiz_${parts[2]}_${parts[3]}_record.png`,payload};
   }
  }
 }catch{/* Unsupported carried payload; only the existing selected operands may continue. */}
 const details=record.details??{},b=object(details.proofBundle),m=object(details.receiz),ops=record.valueOperands??{},values=ops as unknown as Record<string,unknown>;
 if(record.source==='wallet'&&b.verificationVersion==='wallet-ledger-v1'&&hex(b.bundleHash)&&hex(b.capsuleHash)&&record.time&&digits(record.pulse)&&digits(ops.amountPhiMicro)&&digits(record.amountUsdCents)){
  const event={id:record.sourceId,kind:record.kind,createdAt:record.time,pulse:Number(record.pulse),amountPhiMicro:ops.amountPhiMicro,amountUsdCents:record.amountUsdCents,...(ops.usdPerPhiMicrocents?{usdPerPhiMicrocents:ops.usdPerPhiMicrocents}:{}),proofBundle:b,
   ...(Object.keys(m).length?{receiz:m}:{}),valueReceipt:details.valueReceipt??{...Object.fromEntries(['settledUsdCents','phiUsdCents','fundingRule','fundingSource','cardValueUsdCents','cardValueState'].filter(k=>values[k]!==undefined).map(k=>[k,values[k]]))},
   ...Object.fromEntries(['sender','recipient','actor','noteTokenSuffix','reserveCreditKind','ledgerEntryKind','direction','sport','collectibleId','claimHash','cardName','cardOpenPath','note'].filter(k=>details[k]!==undefined).map(k=>[k,details[k]])),
   ...Object.fromEntries(['transferId','conversationId','messageId','noteId'].filter(k=>record.evidence[k]!==undefined).map(k=>[k,record.evidence[k]]))} as unknown as WalletLedgerLinkEvent;
  const href=buildWalletLedgerVHref(event),url=new URL(href,'https://receiz.com');return{path:url.pathname+url.search,filename:`receiz_${url.pathname.split('/')[2]}_${url.pathname.split('/')[3]}_record.png`,payload:buildWalletLedgerReceiptPayload(event)};
 }
 let href=record.sourceUrl;
 if(typeof m.slug==='string'&&typeof m.code==='string'&&typeof m.pulse==='string'&&typeof m.ms==='string'&&typeof m.anchorId==='string')href=`https://receiz.com/v/${m.slug}/${m.code}/${m.pulse}?${new URLSearchParams({a:m.anchorId,ms:m.ms})}`;
 const safe=safeReceizPublicUrl(href,'proof');if(!safe)return null;const url=new URL(safe);if(!/^\/v\/\d{8}_\d{4}\/[a-f0-9]{8}\/\d+$/i.test(url.pathname)||!url.searchParams.get('a')||!url.searchParams.get('ms'))return null;
 return{path:url.pathname+url.search,filename:`receiz_${url.pathname.split('/')[2]}_${url.pathname.split('/')[3]}_record.png`};
}
/** Canonical signature/Groth16 verification must precede these selected-source
 * checks. The native PNG carries the transaction envelope, never Bank display JSON. */
export function assertLedgerNativeRecord(bytes:Uint8Array,reference:LedgerNativeRecord,verification:Record<string,unknown>){
 const bundle=object(verification.bundle),url=new URL(reference.path,'https://receiz.com');
 const parts=url.pathname.split('/'),canonicalPath=reference.payload?`/v/${parts[2]}/${parts[3].slice(-8).toUpperCase()}/${parts[4]}`:url.pathname;
 // Native transaction exports use an eight-character QR code while retaining
 // the full selected v/ identity in verifyUrl and the signed receipt envelope.
 if(bundle.verifyPath!==canonicalPath||String(bundle.kaiPulseEternal)!==parts[4])throw Error('SELECTED_RECORD_SOURCE_MISMATCH');
 if(reference.payload&&new URL(String(bundle.verifyUrl),'https://receiz.com').pathname!==url.pathname)throw Error('SELECTED_RECORD_SOURCE_MISMATCH');
 if(reference.payload){
  const chunks=readPngTextChunks(bytes,{keyword:'receiz.wallet_ledger_receipt',maxCompressedBytes:2*1024*1024,maxTextBytes:2*1024*1024});
  if(chunks.length!==1)throw Error('SELECTED_RECORD_SOURCE_MISMATCH');
  let source:unknown;try{source=JSON.parse(chunks[0].text);}catch{throw Error('SELECTED_RECORD_SOURCE_MISMATCH');}
  if(jcsCanonicalize(source)!==jcsCanonicalize({kind:'receiz.wallet_ledger_receipt',version:1,payload:reference.payload}))throw Error('SELECTED_RECORD_SOURCE_MISMATCH');
 }else if(object(verification.anchor).anchorId!==url.searchParams.get('a')||String(bundle.createdAtMs)!==url.searchParams.get('ms'))throw Error('SELECTED_RECORD_SOURCE_MISMATCH');
}

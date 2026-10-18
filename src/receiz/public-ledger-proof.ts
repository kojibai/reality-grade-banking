import {receizBase64UrlDecode,receizBase64UrlEncode,sha256ReceizBytes} from '@receiz/sdk';
import {readPublicOriginal} from './public-ledger-native.mjs';
import {receizCurrentPinnedSignatureV4Roots} from '../../native/receiz/packages/receiz-sdk/src/verifier/roots';
import {PUBLIC_LEDGER_MAX_BYTES,verifyPublicLedgerStatement,type PublicLedgerSnapshot,type PublicLedgerSource} from './public-ledger-statement';
import {isPublicLedgerPng,readPublicLedgerPng} from './public-ledger-png';
export type PublicLedgerFileReview=Readonly<{kind:'ledger'|'proof';format:'original'|'crystal';artifactSha256:string;filename:string;byteLength:number;ownerReceizId:string|null;kaiPulse:string;sourceMimeType:string;financialAdmission:false;snapshot?:PublicLedgerSnapshot}>;
type Held=Readonly<{bytes:Uint8Array;filename:string;mimeType:string;source?:PublicLedgerSource}>;
const held=new WeakMap<PublicLedgerFileReview,Held>();
export function heldPublicLedgerFile(review:PublicLedgerFileReview):Held{const source=held.get(review);if(!source)throw Error('PUBLIC_LEDGER_FILE_CUSTODY_REQUIRED');return{...source,bytes:source.bytes.slice()};}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
function privateSource(payload:unknown,depth=0):boolean{
 if(depth>64)throw Error('PUBLIC_LEDGER_FILE_CAPACITY');
 if(!payload||typeof payload!=='object')return false;
 if(Array.isArray(payload))return payload.some(v=>privateSource(v,depth+1));
 const v=payload as Record<string,unknown>;
 if(typeof v.schema==='string'&&/^(?:receiz\.(?:key\.|device|identity|account|bank\.|offline-note|kairos|wallet|funded|portable-execution|intelligence)|bankeiz\.proof-backup)/.test(v.schema))return true;
 return Object.entries(v).some(([key,value])=>/^(?:privateKey(?:Pkcs8(?:B64u|CiphertextB64u))?|encryptedPrivateKey|recoveryPhrase|seedPhrase|passphrase|noteToken|receivingSecret|custodyCapability)$/i.test(key)||privateSource(value,depth+1));
}
async function payloadJson(bytes:Uint8Array,mime:string):Promise<unknown>{
 let decoded=bytes;
 if(mime==='application/gzip'){
  const reader=new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts:Uint8Array[]=[];let size=0;
  try{for(;;){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>64*1024*1024)throw Error('PUBLIC_LEDGER_FILE_CAPACITY');parts.push(chunk.value);}}finally{await reader.cancel().catch(()=>{});}
  decoded=new Uint8Array(size);let offset=0;for(const part of parts){decoded.set(part,offset);offset+=part.length;}
 }
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decoded));}catch{if(mime==='application/gzip')throw Error('PUBLIC_LEDGER_FILE_SCOPE_UNSUPPORTED');return undefined;}
}
/** Fixed v129 canonical roots, exact original bytes, then supported domain read.
 * An image, digest, URL or transported verdict cannot substitute for this read. */
export async function inspectPublicLedgerFile(input:Readonly<{bytes:Uint8Array;filename:string}>):Promise<PublicLedgerFileReview>{
 if(!input.bytes.length||input.bytes.length>24*1024*1024)throw Error('PUBLIC_LEDGER_FILE_CAPACITY');
 let bytes:Uint8Array=input.bytes.slice(),filename=input.filename,format:'original'|'crystal'='original',wire:PublicLedgerSource|undefined;
 if(isPublicLedgerPng(bytes)){
  const embedded=readPublicLedgerPng(bytes);
  if(embedded){const v:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(embedded));
   if(!object(v)||Object.keys(v).sort().join(',')!=='kind,source,version'||v.kind!=='receiz.ledger_proof_bundle'||v.version!=='v2'||!object(v.source))throw Error('PUBLIC_LEDGER_FILE_SCOPE_UNSUPPORTED');
   wire=v.source as unknown as PublicLedgerSource;format='crystal';
  }
 }
 if(wire){
  if(Object.keys(wire).sort().join(',')!=='artifactSha256,exactBytesB64u,filename,mimeType,payloadSha256,schema'||wire.schema!=='receiz.sealed-artifact-bytes.v124'||wire.mimeType!=='application/vnd.receiz.bundle+json'
   ||typeof wire.exactBytesB64u!=='string'||wire.exactBytesB64u.length>Math.ceil(PUBLIC_LEDGER_MAX_BYTES*4/3)||!/^[A-Za-z0-9_-]+$/.test(wire.exactBytesB64u)
   ||typeof wire.filename!=='string'||!wire.filename||wire.filename.length>240||/[/\\\x00-\x1f]/.test(wire.filename))throw Error('PUBLIC_LEDGER_FILE_UNVERIFIED');
  bytes=receizBase64UrlDecode(wire.exactBytesB64u);if(receizBase64UrlEncode(bytes)!==wire.exactBytesB64u)throw Error('PUBLIC_LEDGER_FILE_UNVERIFIED');filename=wire.filename;
 }
 if(!bytes.length||bytes.length>PUBLIC_LEDGER_MAX_BYTES)throw Error('PUBLIC_LEDGER_FILE_CAPACITY');
 const roots=receizCurrentPinnedSignatureV4Roots(),opened=await readPublicOriginal(bytes,filename);
 if(!opened.ok||!opened.verification.integrity.ok)throw Error('PUBLIC_LEDGER_FILE_UNVERIFIED');
 const artifactSha256=await sha256ReceizBytes(bytes),payloadSha256=await sha256ReceizBytes(opened.payloadBytes);
 if(wire&&(wire.artifactSha256!==artifactSha256||wire.payloadSha256!==payloadSha256))throw Error('PUBLIC_LEDGER_FILE_UNVERIFIED');
 const parsed=await payloadJson(opened.payloadBytes,opened.payloadMimeType);
 if(object(parsed)&&parsed.schema==='receiz.public-action-ledger.v1'){
  const snapshot=await verifyPublicLedgerStatement(parsed,roots);
  if(!snapshot||String(opened.verification.bundle?.kaiPulseEternal)!==(BigInt(snapshot.kaiUpulse)/1_000_000n).toString())throw Error('PUBLIC_LEDGER_SOURCE_UNVERIFIED');
  const review=Object.freeze({kind:'ledger' as const,format,artifactSha256,filename,byteLength:bytes.length,ownerReceizId:null,kaiPulse:(BigInt(snapshot.kaiUpulse)/1_000_000n).toString(),sourceMimeType:opened.payloadMimeType,financialAdmission:false as const,snapshot});
  const source=Object.freeze({schema:'receiz.sealed-artifact-bytes.v124' as const,exactBytesB64u:receizBase64UrlEncode(bytes),filename,mimeType:'application/vnd.receiz.bundle+json',artifactSha256,payloadSha256});held.set(review,{bytes,filename,mimeType:source.mimeType,source});return review;
 }
 if(wire)throw Error('PUBLIC_LEDGER_FILE_SCOPE_UNSUPPORTED');
 if(privateSource(parsed)||/\.receizkey$/i.test(filename))throw Error('PUBLIC_LEDGER_PRIVATE_SOURCE');
 if(isPublicLedgerPng(opened.payloadBytes)&&/(?:receiz[._-](?:bank[._-]note|account|identity)|kairos[._-]offline|offline[._-]note)/i.test(new TextDecoder().decode(opened.payloadBytes)))throw Error('PUBLIC_LEDGER_PRIVATE_SOURCE');
 const native=opened.verification.bundle?.nativeRecordSeal,owner=object(native)&&typeof native.ownerReceizId==='string'?native.ownerReceizId:null,pulse=String(opened.verification.bundle?.kaiPulseEternal??'');
 if(!owner||!/^[A-Za-z0-9_.:-]{1,240}$/.test(owner)||!/^[1-9][0-9]{0,39}$/.test(pulse))throw Error('PUBLIC_LEDGER_PROOF_OWNERSHIP_REQUIRED');
 const review=Object.freeze({kind:'proof' as const,format,artifactSha256,filename,byteLength:bytes.length,ownerReceizId:owner,kaiPulse:pulse,sourceMimeType:opened.payloadMimeType,financialAdmission:false as const});held.set(review,{bytes,filename,mimeType:'application/octet-stream'});return review;
}
export async function openPublicLedgerSource(source:PublicLedgerSource){
 // JSON wire is not a proof. Decode its original and verify its declared digests.
 if(!source||typeof source.exactBytesB64u!=='string'||source.exactBytesB64u.length>Math.ceil(PUBLIC_LEDGER_MAX_BYTES*4/3))throw Error('PUBLIC_LEDGER_SOURCE_UNVERIFIED');
 const result=await inspectPublicLedgerFile({bytes:receizBase64UrlDecode(source.exactBytesB64u),filename:source.filename});
 const heldSource=heldPublicLedgerFile(result).source;
 if(!heldSource||JSON.stringify(heldSource)!==JSON.stringify({...source})){
  if(!heldSource||Object.keys(source).length!==6||Object.entries(heldSource).some(([key,value])=>source[key as keyof PublicLedgerSource]!==value))throw Error('PUBLIC_LEDGER_SOURCE_UNVERIFIED');
 }
 return result;
}

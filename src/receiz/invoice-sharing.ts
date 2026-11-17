import type {BuiltReceizMaterialCompositeTransport,ReceizMaterialCompositeManifest} from '@receiz/sdk';
import {loadReceiz} from './client';
import {BANK_PUBLIC_ORIGIN} from './config';
import {openCanonicalProofFile} from './proof-capture';
import {openInvoiceOriginal,type InvoiceSource} from './invoice-source';
import {loadInvoiceSourceRuntime} from './invoice-source-runtime';
const complete=new Map<string,InvoiceSource>(),reading=new Map<string,Promise<InvoiceSource>>();
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');
function sourceHead(value:string):string{
 const url=new URL(value);if(url.origin!=='https://receiz.com'||url.username||url.password||url.search||!/^\/v\/[^/?#]+\/[^/?#]+\/[^/?#]+$/.test(url.pathname))throw Error('INVOICE_LINK_INVALID');
 const fields=new URLSearchParams(url.hash.slice(1));if(fields.getAll('material').length!==1||[...fields.keys()].some(key=>key!=='material')||!/^rmc[12]:[a-f0-9]{64}$/.test(fields.get('material')!))throw Error('INVOICE_LINK_INVALID');return url.href;
}
export function invoiceLinkSource(href:string):string{
 const url=new URL(href,BANK_PUBLIC_ORIGIN),fields=new URLSearchParams(url.hash.slice(1));if(!/^\/invoice\/view\/?$/.test(url.pathname)||url.search||fields.getAll('source').length!==1||[...fields.keys()].some(key=>key!=='source'))throw Error('INVOICE_LINK_INVALID');return sourceHead(fields.get('source')!);
}
export function knownInvoiceLink(href:string):InvoiceSource|null{try{return complete.get(invoiceLinkSource(href))??null;}catch{return null;}}
const transportFetch=(fetcher:typeof fetch):typeof fetch=>(input,init)=>fetcher(input,{...init,signal:init?.signal??AbortSignal.timeout(30000)});
function transportFrom(manifest:ReceizMaterialCompositeManifest,capsuleBytes:Uint8Array,canonicalManifest:string):BuiltReceizMaterialCompositeTransport{return{manifest,manifestBytes:new TextEncoder().encode(canonicalManifest),segments:manifest.segments.map(segment=>capsuleBytes.slice(segment.offset,segment.offset+segment.byteLength)),token:`${manifest.capsuleEncoding==='rma3/raw'?'rmc2':'rmc1'}:${manifest.packageDigest}`};}
async function retainFamily(transport:BuiltReceizMaterialCompositeTransport,proofUrl:string){const [sdk,runtime]=await Promise.all([loadReceiz(),loadInvoiceSourceRuntime()]),family=sdk.createReceizMaterialSourceFamily({proofUrl,transport});await runtime.holdReceizMaterialSourceFamily({headUrl:family.headUrl,sourceUrls:[family.manifestUrl,...family.segmentUrls]});return family;}
/** Explicit invoice sharing only. The actor already holds the native sealed
 * Original; publishing distributes the same bytes through the installed rail. */
export async function publishInvoiceLink(input:InvoiceSource,options:{fetcher?:typeof fetch;isCurrent():boolean}):Promise<string>{
 const assert=()=>{if(!options.isCurrent())throw Error('INVOICE_CONTEXT_CHANGED');};assert();
 const source=await openInvoiceOriginal(input.original);assert();if(source.artifactSha256!==input.artifactSha256)throw Error('INVOICE_SOURCE_CHANGED');
 const [sdk,opened]=await Promise.all([loadReceiz(),openCanonicalProofFile(source.original)]);assert();const bundle=opened.sealedArtifact.verification.bundle,pulse=String(bundle.kaiPulseEternal),raw=bundle.kaiUPulse??bundle.kaiUpulse??bundle.issuedAtKaiUPulse;
 if(!/^\d+$/.test(pulse))throw Error('INVOICE_SOURCE_KAI_REQUIRED');const uPulse=typeof raw==='string'||typeof raw==='number'?String(raw):String(BigInt(pulse)*1000000n);
 const capsuleBytes=sdk.encodeReceizMaterialCapsuleBytes({exactArtifactBytes:new Uint8Array(await source.original.arrayBuffer()),filename:source.original.name,mimeType:source.original.type});assert();
 const transport=await sdk.buildReceizMaterialCompositeTransport({capsuleBytes,sealedArtifactSha256:source.artifactSha256,sealedArtifactByteLength:source.original.size,sealedFilename:source.original.name,sealedMimeType:source.original.type,verifyPath:opened.sealedArtifact.continuity.verifyPath,issuedAtKaiPulse:pulse,issuedAtKaiUPulse:uPulse});assert();
 const proofUrl='https://receiz.com'+opened.sealedArtifact.continuity.verifyPath,family=await retainFamily(transport,proofUrl);assert();
 await sdk.publishReceizMaterialCompositeTransport({transport,receizOrigin:'https://receiz.com',fetcher:transportFetch(options.fetcher??fetch)});assert();
 complete.set(family.headUrl,source);return `${BANK_PUBLIC_ORIGIN}/invoice/view/#${new URLSearchParams({source:family.headUrl})}`;
}
/** Only genuinely missing source uses remote transport. The same native
 * custody owns cold reopen, with canonical admission of exact bytes locally. */
export async function readInvoiceLink(href:string,options:{fetcher?:typeof fetch}={}):Promise<InvoiceSource>{
 const headUrl=invoiceLinkSource(href),held=complete.get(headUrl);if(held)return held;const existing=reading.get(headUrl);if(existing)return existing;
 const work=(async()=>{
  const [sdk,runtime]=await Promise.all([loadReceiz(),loadInvoiceSourceRuntime()]);
  const resolved=await runtime.resolveReceizMaterialCompositeLocalFirst({headUrl,resolveRemote:({packageDigest})=>sdk.resolveReceizMaterialCompositeTransport({packageDigest,receizOrigin:'https://receiz.com',fetcher:transportFetch(options.fetcher??fetch)})});
  const {manifest,capsuleBytes}=resolved,capsule=manifest.capsuleEncoding==='rma3/raw'?sdk.decodeReceizRawMaterialCapsuleBytes({capsuleBytes,manifest}):sdk.decodeReceizMaterialCapsuleBytes(capsuleBytes);
  if(capsule.exactArtifactBytes.length!==manifest.sealedArtifactByteLength||await hash(capsule.exactArtifactBytes)!==manifest.sealedArtifactSha256||new URL(headUrl).pathname!==manifest.verifyPath)throw Error('INVOICE_SOURCE_CHANGED');
  const source=await openInvoiceOriginal(new File([new Uint8Array(capsule.exactArtifactBytes)],capsule.filename,{type:capsule.mimeType}));
  const opened=await openCanonicalProofFile(source.original);if(source.artifactSha256!==manifest.sealedArtifactSha256||opened.sealedArtifact.continuity.verifyPath!==manifest.verifyPath)throw Error('INVOICE_SOURCE_CHANGED');
  complete.set(headUrl,source);
  if(resolved.source==='remote'){try{await retainFamily(transportFrom(manifest,capsuleBytes,runtime.canonicalizeReceizConstitution(manifest)),'https://receiz.com'+manifest.verifyPath);}catch{const visible=Object.freeze({...source,offlineRetained:false});complete.set(headUrl,visible);return visible;}}
  return source;
 })();reading.set(headUrl,work);try{return await work;}finally{if(reading.get(headUrl)===work)reading.delete(headUrl);}
}

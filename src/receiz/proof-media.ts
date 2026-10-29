import {retainedAssetPublicationSource} from './asset-publication-adoption';
import {isEpubArchive} from './proof-media-archive';
import {resolvePublicOriginalUrl,PublicOriginalPurchaseRequired} from './public-original';
import {readPublicLedgerBytes} from './public-ledger-transfer';
import {readPublicProofReading,type ProofReading} from './proof-reading';
import type {ReceizVerifiedPayload} from '@receiz/sdk';
import {retainProofInspection,trackProofInspection} from './proof-inspection';
import {loadOfflineProofVerifier} from './ledger-offline-proof';
import {readAssetMoment,type MomentMetadata} from './asset-moment';
import {readComposerAssetContent,readComposerCapacity,type ComposerAssetFile} from './asset-composer';
import {safeImportedSourceUrl} from './imported-source-url';
import {safeReceizPublicUrl} from './public-market';
import {readExactByteBlocks} from '../../native/receiz/packages/receiz-sdk/src/exactByteBlocks';
import {ORIGINAL_PNG_MAX_BYTES,originalReadLimit} from './original-capacity';

export type MediaKind='image'|'audio'|'video'|'pdf'|'text'|'book'|'file';
export type BookBlock={kind:'paragraph'|'heading'|'quote'|'image';text:string;path?:string};
export type BookChapter={title:string;text:string;blocks?:BookBlock[]};
export type MediaFile={kind:MediaKind;filename:string;mimeType:string;bytes:Uint8Array;payloadDigest:string;memberPath?:string;text?:string;details?:MomentMetadata;chapters?:BookChapter[];book?:{title:string;author:string|null;images:{path:string;mimeType:string;bytes:Uint8Array}[]}};
export type ProofMediaSource={kind:'held';bytes:Uint8Array;filename:string;digest:string;related?:readonly {digest:string;bytes:Uint8Array;filename:string}[]}|{kind:'public';url:string;digest:string;postUrl?:string;hasLongForm?:boolean};
export type OpenedProofMedia={artifactDigest:string;files:MediaFile[];linkedArtifactDigest?:string;readText?:(signal?:AbortSignal)=>Promise<ProofReading>};
const publicMedia=new Map<string,OpenedProofMedia>();
type PublicMediaPreparation={controller:AbortController;work:Promise<OpenedProofMedia>;readers:number;done:boolean};
const publicMediaPreparations=new Map<string,PublicMediaPreparation>();
const mediaCacheKey=(source:ProofMediaSource)=>source.kind==='public'?`${source.digest}:${source.url}:${source.postUrl??''}:${source.hasLongForm===true}`:null;
export function retainedPublicMedia(source:ProofMediaSource){const key=mediaCacheKey(source);return key?publicMedia.get(key)??null:null;}
const MAX=16*1024*1024;
const image=new Set(['image/png','image/jpeg','image/webp','image/gif','image/avif','image/bmp']);
const decode=(bytes:Uint8Array)=>new TextDecoder('utf-8',{fatal:true}).decode(bytes);
const cleanName=(name:string)=>name.replace(/[\x00-\x1f\x7f/\\]/g,'-').slice(0,240)||'original';
/** Plain text only. Markup is never inserted into a document, so scripts,
 * frames, remote images, styles and book links cannot execute or fetch. */
export function readDocumentText(html:string){
 return html.replace(/<(script|style|iframe|object|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'')
  .replace(/<(?:br|hr)\s*\/?>/gi,'\n').replace(/<\/(?:p|div|h[1-6]|section|article|li|blockquote|tr)\s*>/gi,'\n\n').replace(/<[^>]*>/g,'')
  .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d{1,7}|#x[a-f0-9]{1,6});/gi,value=>{const entities:Record<string,string>={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};if(entities[value.toLowerCase()])return entities[value.toLowerCase()];const n=value[2].toLowerCase()==='x'?parseInt(value.slice(3,-1),16):Number(value.slice(2,-1));return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';})
  .replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function isSelfContainedMedia(bytes:Uint8Array){const start=String.fromCharCode(...bytes.subarray(0,12));return start.startsWith('ID3')||start.startsWith('OggS')||start.startsWith('fLaC')||start.startsWith('RIFF')&&start.slice(8,12)==='WAVE'||start.slice(4,8)==='ftyp'||bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3||bytes[0]===255&&(bytes[1]&0xe0)===0xe0;}
function readMediaJson(payload:ReceizVerifiedPayload){
 if(payload.mimeType.split(';')[0].trim().toLowerCase()!=='application/json')return undefined;
 if(!payload.bytes.length||payload.bytes.length>MAX)throw Error('This media exceeds the supported reader capacity.');
 const text=decode(payload.bytes);try{return {text,value:JSON.parse(text),valid:true};}catch{return {text,value:undefined,valid:false};}
}
async function readBasicMediaPayload(payload:ReceizVerifiedPayload,json?:ReturnType<typeof readMediaJson>,maximum=MAX):Promise<MediaFile[]>{
 if(!payload.bytes.length||payload.bytes.length>originalReadLimit(payload.bytes,maximum,payload.mimeType))throw Error('This media exceeds the supported reader capacity.');
 const mime=payload.mimeType.split(';')[0].trim().toLowerCase(),file:MediaFile={kind:'file',filename:cleanName(payload.filename),mimeType:mime,bytes:payload.bytes,payloadDigest:payload.sha256};
 if(mime==='application/epub+zip'||['application/octet-stream','application/zip','application/x-zip-compressed'].includes(mime)&&isEpubArchive(payload.bytes))return (await import('./proof-book')).readBook(payload);
 if((mime==='application/octet-stream'||mime==='application/pdf')&&String.fromCharCode(...payload.bytes.subarray(0,5))==='%PDF-'){file.kind='pdf';file.mimeType='application/pdf';if(!/\.pdf$/i.test(file.filename))file.filename='Document.pdf';}
 else if(image.has(mime))file.kind='image';else if(new Set(['audio/mpeg','audio/mp3','audio/mp4','audio/aac','audio/ogg','audio/flac','audio/wav','audio/x-wav','audio/webm']).has(mime)&&isSelfContainedMedia(payload.bytes))file.kind='audio';else if(new Set(['video/mp4','video/webm','video/ogg','video/quicktime']).has(mime)&&isSelfContainedMedia(payload.bytes))file.kind='video';else if(mime==='application/pdf')file.kind='pdf';
 else if(['text/plain','text/markdown','text/html','application/xhtml+xml','application/json'].includes(mime)){
  file.kind='text';if(mime==='application/json'){const parsed=json??readMediaJson(payload)!;file.text=parsed.valid?JSON.stringify(parsed.value,null,2):parsed.text;}else{const text=decode(payload.bytes);file.text=['text/html','application/xhtml+xml'].includes(mime)?readDocumentText(text):text;}
 }
 return [file];
}
export type ComposerMediaContext={ownerReceizId:string;resolveFile(file:ComposerAssetFile):Promise<Uint8Array>};
async function readPayload(payload:ReceizVerifiedPayload,json:ReturnType<typeof readMediaJson>,composer?:ComposerMediaContext):Promise<MediaFile[]>{
 if(!payload.bytes.length||payload.bytes.length>originalReadLimit(payload.bytes,MAX,payload.mimeType))throw Error('This media exceeds the supported reader capacity.');
 if(json){
  const value=json.value;
  if(value?.schema==='receiz.bank.asset-content.v2'){
   if(!composer)throw Error('The original files are not available in this view.');
   const content=readComposerAssetContent(value,composer.ownerReceizId),files:MediaFile[]=[];
   const primary=content.files.find(file=>file.role==='primary');
   if(primary){const bytes=await composer.resolveFile(primary),{sha256ReceizBytes}=await import('@receiz/sdk');if(bytes.length!==primary.size||await sha256ReceizBytes(bytes)!==primary.sha256)throw Error('The original file does not match its sealed source.');files.push(...await readBasicMediaPayload({bytes,filename:primary.name,mimeType:primary.mime,sha256:primary.sha256},undefined,readComposerCapacity().maxPrimaryBytes[content.kind]??MAX));}
   if(content.longForm){const {sha256ReceizBytes}=await import('@receiz/sdk'),bytes=new TextEncoder().encode(content.title+'\n\n'+content.longForm);files.push(...await readBasicMediaPayload({bytes,sha256:await sha256ReceizBytes(bytes),filename:'Long-form text.txt',mimeType:'text/plain'}));}
   return files;
  }
  if(value?.schema==='receiz.bank.asset-definition.v1'&&value.moment!=null){
   const moment=await readAssetMoment(value.moment),files:MediaFile[]=[];
   for(const original of moment.files)files.push(...await readBasicMediaPayload(original));
   if(moment.title||moment.text){const {sha256ReceizBytes}=await import('@receiz/sdk'),bytes=new TextEncoder().encode([moment.title,moment.text].filter(Boolean).join('\n\n'));files.push(...await readBasicMediaPayload({bytes,sha256:await sha256ReceizBytes(bytes),filename:'Long-form text.txt',mimeType:'text/plain'}));}
   if(files.length){files[0].details=moment.metadata;return files;}
  }
 }
 return readBasicMediaPayload(payload,json);
}
export function readMediaPayload(payload:ReceizVerifiedPayload,composer?:ComposerMediaContext):Promise<MediaFile[]>{
 return readPayload(payload,readMediaJson(payload),composer);
}
/** The unchanged native canonical read is the only payload entry. Rendering
 * does not admit ownership, custody, transfers or account value. */
export function openProofMedia(source:ProofMediaSource,signal?:AbortSignal):Promise<OpenedProofMedia>{
 signal?.throwIfAborted();const cached=retainedPublicMedia(source);if(cached)return Promise.resolve(cached);
 const key=mediaCacheKey(source);
 if(!key)return trackProofInspection(source.digest,openOriginalMedia(source,signal));
 let preparation=publicMediaPreparations.get(key);
 if(!preparation){
  const controller=new AbortController(),work=trackProofInspection(source.digest,openOriginalMedia(source,controller.signal).then(opened=>{
   controller.signal.throwIfAborted();
   const size=(media:OpenedProofMedia)=>media.files.reduce((sum,file)=>sum+file.bytes.length+(file.text?.length??0)*2+(file.chapters?.reduce((sum,chapter)=>sum+chapter.text.length*2+(chapter.blocks?.reduce((size,block)=>size+block.text.length*2,0)??0),0)??0),0),bytes=size(opened),limit=16*1024*1024;
   // Public originals only. Never publish private held media through this map.
   if(bytes<=limit){while(publicMedia.size&&(publicMedia.size>=4||[...publicMedia.values()].reduce((sum,media)=>sum+size(media),0)+bytes>limit))publicMedia.delete(publicMedia.keys().next().value!);publicMedia.set(key,opened);}return opened;
  }));
  preparation={controller,work,readers:0,done:false};publicMediaPreparations.set(key,preparation);
  const held=preparation,finish=()=>{held.done=true;if(publicMediaPreparations.get(key)===held)publicMediaPreparations.delete(key);};
  void work.then(finish,finish);
 }
 const held=preparation;held.readers++;
 return new Promise((resolve,reject)=>{
  let active=true;
  const release=()=>{if(!active)return;active=false;signal?.removeEventListener('abort',abort);held.readers--;if(!held.readers&&!held.done){if(publicMediaPreparations.get(key)===held)publicMediaPreparations.delete(key);held.controller.abort();}};
  const abort=()=>{if(!active)return;release();reject(signal?.reason??new DOMException('Aborted','AbortError'));};
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  void held.work.then(value=>{if(active){release();resolve(value);}},cause=>{if(active){release();reject(cause);}});
 });
}
async function openOriginalMedia(source:ProofMediaSource,signal?:AbortSignal):Promise<OpenedProofMedia>{
 if(!/^[a-f0-9]{64}$/i.test(source.digest))throw Error('The original digest is unavailable.');
 signal?.throwIfAborted();const retained=source.kind==='public'?retainedAssetPublicationSource(source.digest):null;
 if(source.kind==='held'&&(!source.bytes.length||source.bytes.length>originalReadLimit(source.bytes,MAX)))throw Error('This original exceeds the supported reader capacity.');
 if(source.kind==='public'&&!retained&&!safeReceizPublicUrl(source.url,'original'))throw Error('This original source is not supported.');
 const readBytes=async()=>{let bytes:Uint8Array,filename:string;
 if(source.kind==='held'){bytes=new Uint8Array(source.bytes);filename=source.filename;}else if(retained){bytes=new Uint8Array(await retained.arrayBuffer());filename=retained.name;}else{
  const timeout=AbortSignal.timeout(90_000),publicSignal=signal?AbortSignal.any([signal,timeout]):timeout;
  const url=new URL(await resolvePublicOriginalUrl(source.url,source.digest,publicSignal));publicSignal.throwIfAborted();
  // Immutable public material already supports anonymous CORS. Use its exact
  // image/cache coordinate rather than downloading a second proxy copy.
  const direct=/^\/api\/proof-material\/packages\/[a-f0-9]{64}\/artifact$/.test(url.pathname)&&!url.search;
  const response=await fetch(direct?url.href:`/api/bank/public-market/original?path=${encodeURIComponent(url.pathname+url.search)}`,{credentials:'omit',redirect:'error',signal:publicSignal});
  if(response.status===402)throw new PublicOriginalPurchaseRequired();
  if(!response.ok)throw Error('The original could not be opened. You can retry or inspect its source.');bytes=await readPublicLedgerBytes(response,MAX,ORIGINAL_PNG_MAX_BYTES);filename='original.receiz';
 }
 if(!bytes.length||bytes.length>originalReadLimit(bytes,MAX))throw Error('This original exceeds the supported reader capacity.');
 return {bytes,filename};
 };
 // Observe code failure independently; the exact source keeps its original
 // refusal/receiving result even when verifier preparation fails first.
 const preparedVerifier=loadOfflineProofVerifier().then(value=>({ok:true as const,value}),()=>({ok:false as const}));
 const {bytes,filename}=await readBytes();signal?.throwIfAborted();
 const prepared=await preparedVerifier;signal?.throwIfAborted();
 if(!prepared.ok)throw Error('This original could not be opened as verified media. Inspect its proof source for details.');
 const verifier=prepared.value;
 // Rendering needs the canonical read contract, including older carriers.
 // Append/admission custody is separate and is never relaxed by this reader.
 let opened;try{opened=await verifier.readArtifact(bytes,filename);}catch{throw Error('This original could not be opened as verified media. Inspect its proof source for details.');}signal?.throwIfAborted();
 if(opened.report.artifactSha256.toLowerCase()!==source.digest.toLowerCase())throw Error('This original does not match the selected proof.');
 retainProofInspection(opened.report,bytes,filename);
 const json=readMediaJson(opened.payload);
 const verification=opened.report.verification as {bundle?:{nativeRecordSeal?:{ownerReceizId?:string}}};
 const composer:ComposerMediaContext|undefined=json?.value?.schema==='receiz.bank.asset-content.v2'?{
  ownerReceizId:verification.bundle?.nativeRecordSeal?.ownerReceizId??'',
  resolveFile:async file=>{
   signal?.throwIfAborted();
   if(source.kind==='public'&&!retained){
    const safe=safeImportedSourceUrl(source.url,'artifact');if(!safe)throw Error('The original file coordinate is unavailable.');
    const target=new URL(safe),reference=JSON.parse(target.searchParams.get('reference')!);if(reference.artifactSha256!==source.digest.toLowerCase())throw Error('The original file coordinate does not match its source.');target.searchParams.set('file',file.id);
    const response=await fetch('/api/bank/public-market/resource?path='+encodeURIComponent(target.pathname+target.search),{credentials:'omit',redirect:'error',signal});if(!response.ok)throw Error('The original file is temporarily unavailable.');return readPublicLedgerBytes(response,file.size);
   }
   const runtime=await(await import('./asset-publication-runtime')).loadAssetPublicationRuntime(),parts:Uint8Array[]=[];
   for await(const bytes of readExactByteBlocks(file.bytes,runtime.resolveComposerBlock,{component:'Bank composer media',maxContentBytes:file.size,maxBlockReads:131072})){signal?.throwIfAborted();parts.push(bytes);}
   const result=new Uint8Array(file.size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;
  }
 }:undefined;
 const files=await readPayload(opened.payload,json,composer);signal?.throwIfAborted();
 if(source.kind==='held'&&json){
  const value=json.value;
  const linked=value?.schema==='receiz.bank.asset-definition.v1'?value.definition?.linkedProofDigest:null;
  if(typeof linked==='string'&&/^[a-f0-9]{64}$/.test(linked)&&linked!==source.digest){
   let held=source.related?.find(item=>item.digest===linked);const carried=value.linkedSource;
   if(!held&&carried?.digest===linked&&typeof carried.filename==='string'&&carried.filename.length<=240&&typeof carried.exactArtifactB64u==='string'&&carried.exactArtifactB64u.length<=Math.ceil(MAX*4/3)&&/^[A-Za-z0-9_-]+$/u.test(carried.exactArtifactB64u))held={digest:linked,filename:cleanName(carried.filename),bytes:(await import('@receiz/sdk')).receizBase64UrlDecode(carried.exactArtifactB64u)};
   if(held){const media=await openProofMedia({kind:'held',...held},signal);return {artifactDigest:source.digest,linkedArtifactDigest:linked,files:[...media.files,...files]};}
  }
 }
 return {artifactDigest:source.digest,files,...(source.kind==='public'&&source.postUrl?{readText:(signal?:AbortSignal)=>readPublicProofReading(source.postUrl!,source.digest,signal)}:{})};
}

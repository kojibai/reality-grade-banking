import {openBookArchive} from './proof-media-archive';
import {loadReceiz} from './client';
import {safeReceizPublicUrl} from './public-market';
import {readPublicLedgerBytes} from './public-ledger-transfer';
import type {ReceizVerifiedPayload} from '@receiz/sdk';

export type MediaKind='image'|'audio'|'video'|'pdf'|'text'|'book'|'file';
export type MediaFile={kind:MediaKind;filename:string;mimeType:string;bytes:Uint8Array;payloadDigest:string;memberPath?:string;text?:string;chapters?:{title:string;text:string}[]};
export type ProofMediaSource={kind:'held';bytes:Uint8Array;filename:string;digest:string;related?:readonly {digest:string;bytes:Uint8Array;filename:string}[]}|{kind:'public';url:string;digest:string};
export type OpenedProofMedia={artifactDigest:string;files:MediaFile[];linkedArtifactDigest?:string};
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
function archivePath(base:string,href:string){
 if(!href||/[\\\x00-\x1f]|^[a-z][a-z0-9+.-]*:|^\//i.test(href))throw Error('The book references media outside its original.');
 const parts=base.split('/').slice(0,-1);for(const part of decodeURIComponent(href.split('#')[0]).split('/')){if(part==='..'){if(!parts.length)throw Error('The book path is invalid.');parts.pop();}else if(part&&part!=='.')parts.push(part);}
 return parts.join('/');
}
async function readBook(payload:ReceizVerifiedPayload):Promise<MediaFile[]>{
 const files=await openBookArchive(payload.bytes);
 const xml=(path:string)=>{if(!files[path])throw Error('The book is missing part of its original.');const text=decode(files[path]);if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('This book requires an external document reader.');const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('The book index could not be opened.');return doc;};
 const elements=(doc:Document,name:string)=>[...doc.getElementsByTagName('*')].filter(e=>e.localName===name);
 const container=xml('META-INF/container.xml'),path=elements(container,'rootfile')[0]?.getAttribute('full-path');if(!path)throw Error('The book index is missing.');
 const opfPath=archivePath('root',path),opf=xml(opfPath),items=elements(opf,'item');if(items.length>2000)throw Error('The book has too many media references for this reader.');const manifest=new Map(items.map(item=>[item.getAttribute('id'),item]));
 const chapters:{title:string;text:string}[]=[],illustrations:MediaFile[]=[];
 const spine=elements(opf,'itemref');if(spine.length>512)throw Error('The book has too many chapter references for this reader.');let materialized=0;const chapterCache=new Map<string,{title:string;text:string}>();
 for(const ref of spine){const item=manifest.get(ref.getAttribute('idref'));if(!item)throw Error('The book is missing a chapter.');const chapterPath=archivePath(opfPath,item.getAttribute('href')??'');if(!files[chapterPath])throw Error('The book is missing a chapter.');materialized+=files[chapterPath].length;if(materialized>16*1024*1024)throw Error('The book exceeds the supported text capacity.');const cached=chapterCache.get(chapterPath);if(cached){chapters.push(cached);continue;}const raw=decode(files[chapterPath]),heading=raw.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];const chapter={title:heading?readDocumentText(heading):`Chapter ${chapters.length+1}`,text:readDocumentText(raw)};chapterCache.set(chapterPath,chapter);chapters.push(chapter);}
 if(!chapters.length)throw Error('The book has no readable chapters.');
 const illustratedPaths=new Set<string>();for(const item of manifest.values()){const mime=item.getAttribute('media-type')??'';if(!image.has(mime))continue;const path=archivePath(opfPath,item.getAttribute('href')??'');if(files[path]&&!illustratedPaths.has(path)){if(illustrations.length>=128)throw Error('The book has too many illustrations for this reader.');illustratedPaths.add(path);illustrations.push({kind:'image',filename:cleanName(path.split('/').at(-1)!),mimeType:mime,bytes:files[path],payloadDigest:payload.sha256,memberPath:path});}}
 return [{kind:'book',filename:cleanName(payload.filename),mimeType:'application/epub+zip',bytes:payload.bytes,payloadDigest:payload.sha256,chapters},...illustrations];
}
function isSelfContainedMedia(bytes:Uint8Array){const start=String.fromCharCode(...bytes.subarray(0,12));return start.startsWith('ID3')||start.startsWith('OggS')||start.startsWith('fLaC')||start.startsWith('RIFF')&&start.slice(8,12)==='WAVE'||start.slice(4,8)==='ftyp'||bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3||bytes[0]===255&&(bytes[1]&0xe0)===0xe0;}
export async function readMediaPayload(payload:ReceizVerifiedPayload):Promise<MediaFile[]>{
 if(!payload.bytes.length||payload.bytes.length>MAX)throw Error('This media exceeds the supported reader capacity.');
 const mime=payload.mimeType.split(';')[0].trim().toLowerCase(),file:MediaFile={kind:'file',filename:cleanName(payload.filename),mimeType:mime,bytes:payload.bytes,payloadDigest:payload.sha256};
 if(mime==='application/epub+zip')return readBook(payload);
 if(image.has(mime))file.kind='image';else if(new Set(['audio/mpeg','audio/mp3','audio/mp4','audio/aac','audio/ogg','audio/flac','audio/wav','audio/x-wav','audio/webm']).has(mime)&&isSelfContainedMedia(payload.bytes))file.kind='audio';else if(new Set(['video/mp4','video/webm','video/ogg','video/quicktime']).has(mime)&&isSelfContainedMedia(payload.bytes))file.kind='video';else if(mime==='application/pdf')file.kind='pdf';
 else if(['text/plain','text/markdown','text/html','application/xhtml+xml','application/json'].includes(mime)){
  file.kind='text';const text=decode(payload.bytes);file.text=['text/html','application/xhtml+xml'].includes(mime)?readDocumentText(text):mime==='application/json'?(()=>{try{return JSON.stringify(JSON.parse(text),null,2);}catch{return text;}})():text;
 }
 return [file];
}
/** Existing SDK enclosing-artifact open is the only payload entry. Rendering
 * does not admit ownership, custody, transfers or account value. */
export async function openProofMedia(source:ProofMediaSource,signal?:AbortSignal):Promise<OpenedProofMedia>{
 if(!/^[a-f0-9]{64}$/i.test(source.digest))throw Error('The original digest is unavailable.');
 signal?.throwIfAborted();let bytes:Uint8Array,filename:string;
 if(source.kind==='held'){bytes=new Uint8Array(source.bytes);filename=source.filename;}else{
  const safe=safeReceizPublicUrl(source.url,'original');if(!safe)throw Error('This original source is not supported.');const url=new URL(safe);
  const response=await fetch(`/api/bank/public-market/original?path=${encodeURIComponent(url.pathname+url.search)}`,{credentials:'omit',redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90_000)]):AbortSignal.timeout(90_000)});
  if(!response.ok)throw Error('The original could not be opened. You can retry or inspect its source.');bytes=await readPublicLedgerBytes(response,MAX);filename='original.receiz';
 }
 if(!bytes.length||bytes.length>MAX)throw Error('This original exceeds the supported reader capacity.');
 const sdk=await loadReceiz();let opened;try{opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(bytes)],filename));}catch{throw Error('This original could not be opened as verified media. Inspect its proof source for details.');}signal?.throwIfAborted();
 if(opened.sealedArtifact.artifactSha256.toLowerCase()!==source.digest.toLowerCase())throw Error('This original does not match the selected proof.');
 const files=await readMediaPayload(opened.verifiedPayload);signal?.throwIfAborted();
 if(source.kind==='held'&&opened.verifiedPayload.mimeType==='application/json'){
  let value;try{value=JSON.parse(decode(opened.verifiedPayload.bytes));}catch{/* Ordinary text remains readable. */}
  const linked=value?.schema==='receiz.bank.asset-definition.v1'?value.definition?.linkedProofDigest:null;
  if(typeof linked==='string'&&/^[a-f0-9]{64}$/.test(linked)&&linked!==source.digest){const held=source.related?.find(item=>item.digest===linked);if(held){const media=await openProofMedia({kind:'held',...held},signal);return {artifactDigest:source.digest,linkedArtifactDigest:linked,files:[...media.files,...files]};}}
 }
 return {artifactDigest:source.digest,files};
}

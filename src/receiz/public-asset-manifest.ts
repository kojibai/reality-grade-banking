import {safeImportedSourceUrl} from "./imported-source-url.js";
/** The live-player manifest, projected from the same public ProfileOriginal.
 * These are source display fields. Rendering them performs no verification. */
export type PublicAssetManifestRow={label:string;value:string;href?:string;downloadName?:string};
export type PublicAssetManifestSource={mediaKind?:string|null;code:string|null;pulse:string|null;verifyPath:string|null;claimHashHex:string|null;pbiReceiptHash:string|null;recordCardMediaSha256Hex:string|null;recordMediaSha256Hex:string|null;proof:{circuit:string|null;groth16Id:string|null;poseidon:string|null};media:{sha256Hex:string|null;originalDownloadSha256Hex:string|null}|null;attachments:{id:string|null;name:string|null;src:string|null;downloadName:string|null;sha256Hex:string|null}[]};
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const text=(value:unknown,max=4096)=>typeof value==='string'&&value.trim()&&value.length<=max?value.trim():typeof value==='number'&&Number.isSafeInteger(value)?String(value):null;
const hash=(value:unknown)=>{const raw=text(value,160);return raw&&/^[a-f0-9]{64}$/i.test(raw)?raw.toUpperCase():null;};
/** Keep only bounded public inputs in discovery. Allocate the manifest rows for
 * the selected asset, rather than thousands of unused backs in the catalogue. */
export function readPublicAssetManifestSource(input:unknown):PublicAssetManifestSource|undefined{
 const source=record(input),proof=record(source.proof),media=record(source.media);
 if(!['code','pulse','verifyPath','claimHashHex','pbiReceiptHash','proof','attachments','recordCardMediaSha256Hex','recordMediaSha256Hex'].some(key=>Object.hasOwn(source,key)))return;
 return {mediaKind:text(source.mediaKind,40)??text(media.kind,40)??(source.media===null?'moment':null),code:text(source.code,80),pulse:text(source.pulse,80),verifyPath:text(source.verifyPath,1000),claimHashHex:hash(source.claimHashHex),pbiReceiptHash:hash(source.pbiReceiptHash),recordCardMediaSha256Hex:hash(source.recordCardMediaSha256Hex),recordMediaSha256Hex:hash(source.recordMediaSha256Hex),proof:{circuit:text(proof.circuit,80),groth16Id:text(proof.groth16Id,160),poseidon:text(proof.poseidon,160)},media:source.media===null?null:{sha256Hex:hash(media.sha256Hex),originalDownloadSha256Hex:hash(media.originalDownloadSha256Hex)},attachments:Array.isArray(source.attachments)?source.attachments.slice(0,200).map(input=>{const row=record(input);return {id:text(row.id,240),name:text(row.name),src:publicManifestLink(row.src),downloadName:text(row.downloadName,240),sha256Hex:hash(row.sha256Hex)};}):[]};
}
/** No arbitrary hosts, script URLs, credentials, or account routes on the back. */
export function publicManifestLink(value:unknown):string|null{
 const raw=text(value,8192);if(!raw||/[\x00-\x20\x7f\\]/.test(raw))return null;
 try{const url=new URL(raw,'https://receiz.com');if(url.origin!=='https://receiz.com'||url.username||url.password||url.hash)return null;
  const imported=safeImportedSourceUrl(value);if(imported)return imported;
  const only=(keys:string[])=>[...url.searchParams.keys()].every(key=>keys.includes(key)&&url.searchParams.getAll(key).length===1);
  if(['/offline-verifier.html','/zk/verification_key.json'].includes(url.pathname)&&!url.search)return url.href;
  if(/^\/v\/[a-zA-Z0-9_-]{1,64}\/[a-f0-9]{8,64}\/\d{1,24}\/?$/i.test(url.pathname)&&only(['a','ms','c','p','tz']))return url.href;
  if(/^\/api\/proof-material\/packages\/[a-f0-9]{64}\/artifact$/i.test(url.pathname)&&only(['attachment'])&&(!url.searchParams.has('attachment')||/^[a-zA-Z0-9:_-]{1,240}$/.test(url.searchParams.get('attachment')!)))return url.href;
  if(url.pathname==='/api/profile/originals/download'&&only(['receizId','kind'])&&/^[a-zA-Z0-9_-]{1,128}$/.test(url.searchParams.get('receizId')??'')&&url.searchParams.get('kind')==='original')return url.href;
  if(url.pathname==='/api/storage/object'&&only(['bucket','path'])&&['receiz-profile-originals','receiz-profile-media'].includes(url.searchParams.get('bucket')??'')){
   const path=url.searchParams.get('path')??'';if(path.length<=2048&&/^[a-zA-Z0-9_./-]+$/.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'))return url.href;
  }
  return null;
 }catch{return null;}
}
export function publicAssetManifest(profileInput:unknown,fallback:{verifyUrl?:string|null;pulse?:string|null}={}):PublicAssetManifestRow[]{
 const profile=record(profileInput),media=record(profile.media),proof=record(profile.proof),verifyPath=text(profile.verifyPath,1000)??fallback.verifyUrl??null;
 let parts:string[]=[];try{parts=new URL(verifyPath??'','https://receiz.com').pathname.split('/').filter(Boolean);}catch{}
 const v=parts.indexOf('v'),code=text(profile.code,80)??(v>=0?parts[v+2]:null),pulse=text(profile.pulse,80)??fallback.pulse??(v>=0?parts[v+3]:null);
 const rows:PublicAssetManifestRow[]=[
  {label:'Coordinate',value:`${code??'pending'}/${pulse??'pending'}`},
  {label:'Pulse',value:pulse??'pending'},
  {label:'Verify Path',value:verifyPath??'Unavailable',...(publicManifestLink(verifyPath)?{href:publicManifestLink(verifyPath)!}:{})},
  {label:'Circuit',value:text(proof.circuit,80)??'Groth16'},
  {label:'Groth16',value:text(proof.groth16Id,160)??'Unavailable'},
  {label:'Poseidon',value:text(proof.poseidon,160)??'Unavailable'},
  {label:'Claim SHA-256',value:hash(profile.claimHashHex)??'Unavailable'},
  {label:'Media SHA-256',value:hash(media.sha256Hex)??hash(media.originalDownloadSha256Hex)??(profile.media===null||profile.mediaKind==='moment'?hash(profile.recordCardMediaSha256Hex):null)??hash(profile.recordMediaSha256Hex)??'Unavailable'},
 ];
 if(Array.isArray(profile.attachments))for(const [index,input]of profile.attachments.slice(0,200).entries()){
  const attachment=record(input),href=publicManifestLink(attachment.src),name=text(attachment.name)??text(attachment.id)??'Proof attachment',downloadName=text(attachment.downloadName,240)??text(attachment.name,240);
  rows.push({label:`Attachment ${index+1}`,value:name,...(href?{href,...(downloadName?{downloadName}:{})}:{})},{label:`Attachment ${index+1} SHA-256`,value:hash(attachment.sha256Hex)??'Unavailable'});
 }
 rows.push({label:'PBI Signature',value:hash(profile.pbiReceiptHash)??'Not attached'},
  {label:'Offline Verifier',value:'/offline-verifier.html',href:'https://receiz.com/offline-verifier.html',downloadName:'offline-verifier.html'},
  {label:'Verification Key',value:'/zk/verification_key.json',href:'https://receiz.com/zk/verification_key.json',downloadName:'verification_key.json'});
 return rows;
}

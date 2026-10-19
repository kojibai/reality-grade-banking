export const MAX_MOMENT_BYTES=6*1024*1024,MAX_MOMENT_FILES=8,MAX_MOMENT_TEXT=100_000;
export type MomentMetadata=Record<string,string|boolean>;
export type AssetMomentDraft={files:readonly File[];title?:string;text?:string;metadata?:MomentMetadata};
export type AssetMomentContent={schema:'receiz.bank.moment-content.v1';title:string;text:string;metadata:MomentMetadata;files:{filename:string;mimeType:string;size:number;sha256:string;bytesB64u:string}[]};
const metadataKeys=new Set(['creator','title','subtitle','releaseType','genre','subgenre','isrc','writers','producer','label','explicit','contributors','series','edition','language','isbn','publisher','imprint','tags','link']);
const invalid=()=>Error('This sealed moment contains invalid or unsupported content.');
function metadata(input:unknown):MomentMetadata{
 if(input===undefined)return {};if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>metadataKeys.size)throw invalid();
 const entries=Object.entries(input);let length=0;
 for(const [key,value]of entries){if(!metadataKeys.has(key)||!(typeof value==='boolean'&&key==='explicit'||typeof value==='string'&&value.length<=2000&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(value)))throw invalid();length+=String(value).length;}
 if(length>16000)throw invalid();return Object.fromEntries(entries);
}
function story(title:unknown,text:unknown){if(typeof title!=='string'||title.length>160||typeof text!=='string'||text.length>MAX_MOMENT_TEXT||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(title+text))throw invalid();return {title,text};}
const cleanName=(name:string)=>name.replace(/[\x00-\x1f\x7f/\\]/g,'-').slice(0,240)||'original';
/** Originals stay inside the same authored payload. This never uploads files,
 * declares backing or changes the native financial definition contract. */
export async function prepareAssetMoment(draft?:AssetMomentDraft):Promise<AssetMomentContent|null>{
 if(!draft)return null;const title=draft.title?.trim()??'',text=draft.text?.trim()??'';
 if(text.length>MAX_MOMENT_TEXT)throw Error('Keep long-form text within 100,000 characters.');
 story(title,text);const details=metadata(draft.metadata);
 if(draft.files.length>MAX_MOMENT_FILES)throw Error('Choose up to 8 originals for this moment.');
 if(draft.files.some(file=>!Number.isSafeInteger(file.size)||file.size<=0)||draft.files.reduce((sum,file)=>sum+file.size,0)>MAX_MOMENT_BYTES)throw Error('Keep the originals within 6 MB combined.');
 if(!draft.files.length&&!title&&!text&&!Object.values(details).some(Boolean))return null;
 const {receizBase64UrlEncode,sha256ReceizBytes}=await import('@receiz/sdk');
 const files:AssetMomentContent['files']=[];let total=0;
 for(const file of draft.files){
  const bytes=new Uint8Array(await file.arrayBuffer());total+=bytes.length;if(bytes.length!==file.size||total>MAX_MOMENT_BYTES)throw Error('Keep the originals within 6 MB combined.');
  const mimeType=(file.type||'application/octet-stream').split(';')[0].toLowerCase().trim();if(!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/u.test(mimeType)||mimeType.length>120)throw invalid();
  files.push({filename:cleanName(file.name),mimeType,size:bytes.length,sha256:await sha256ReceizBytes(bytes),bytesB64u:receizBase64UrlEncode(bytes)});
 }
 return {schema:'receiz.bank.moment-content.v1',title,text,metadata:details,files};
}
/** Called only after the enclosing proof has passed canonical verification.
 * The carried hash/size are checked before the existing inert media reader runs. */
export async function readAssetMoment(input:unknown){
 const value=input as AssetMomentContent|null;
 if(!value||value.schema!=='receiz.bank.moment-content.v1'||Object.keys(value).sort().join(',')!=='files,metadata,schema,text,title'||!Array.isArray(value.files)||value.files.length>MAX_MOMENT_FILES)throw invalid();
 const narrative=story(value.title,value.text),details=metadata(value.metadata);let total=0;
 for(const file of value.files){
  if(!file||typeof file!=='object'||Object.keys(file).sort().join(',')!=='bytesB64u,filename,mimeType,sha256,size'||typeof file.filename!=='string'||!file.filename||file.filename!==cleanName(file.filename)||typeof file.mimeType!=='string'||file.mimeType.length>120||! /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/u.test(file.mimeType)||!Number.isSafeInteger(file.size)||file.size<=0||typeof file.sha256!=='string'||! /^[a-f0-9]{64}$/u.test(file.sha256)||typeof file.bytesB64u!=='string'||file.bytesB64u.length!==Math.ceil(file.size*4/3)||! /^[A-Za-z0-9_-]+$/u.test(file.bytesB64u))throw invalid();
  total+=file.size;if(total>MAX_MOMENT_BYTES)throw invalid();
 }
 const {receizBase64UrlDecode,receizBase64UrlEncode,sha256ReceizBytes}=await import('@receiz/sdk');
 const files=[];
 for(const file of value.files){const bytes=receizBase64UrlDecode(file.bytesB64u);if(bytes.length!==file.size||receizBase64UrlEncode(bytes)!==file.bytesB64u||await sha256ReceizBytes(bytes)!==file.sha256)throw invalid();files.push({filename:file.filename,mimeType:file.mimeType,bytes,sha256:file.sha256});}
 return {...narrative,metadata:details,files};
}

import {ImportedProofSourceUnavailableError} from "./showcase/importedSourceErrors";
import type {ProfileOriginalAudioDistribution,ProfileOriginalEpubMetadata} from "./mediaMetadata";
import {parseExactByteBlockReference,type ExactByteBlockReference} from "../transport/exactByteBlocks";
import {parseImportedProofSourceReference,type ImportedProofSourceReference} from "./showcase/importedSourceReference";
export type ComposerMediaKind="moment"|"image"|"audio"|"video"|"epub"|"pdf"|"file";
export type ComposerFileDraft=Readonly<{id:string;file:File;role:"primary"|"cover"|"attachment";attachmentRole?:"source"|"appendix"|"dataset"|"contract"|"receipt"|"research"|"other";description?:string}>;
export type ComposerAssetDefinition=Readonly<{name:string;symbol:string;units:string;description:string;linkedProofDigest:string|null}>;
export type ComposerAssetDraft=Readonly<{definition?:ComposerAssetDefinition;title:string;description:string;kind:ComposerMediaKind;longForm:string;files:readonly ComposerFileDraft[];music?:ProfileOriginalAudioDistribution;book?:ProfileOriginalEpubMetadata}>;
export type ComposerCapacity=Readonly<{maxAttachments:number;maxTotalBytes:number;maxAttachmentBytes:number;maxPrimaryBytes:Readonly<Partial<Record<ComposerMediaKind,number>>>;maxCoverBytes:number;maxTextCharacters:100000}>;
export type ComposerAssetFile=Readonly<Omit<ComposerFileDraft,"file">&{name:string;mime:string;size:number;sha256:string;bytes:ExactByteBlockReference}>;
export type ComposerNativeAssetBinding=Readonly<{authoredSource:ImportedProofSourceReference;publicCertificateB64u:string;publicCertificateSha256:string}>;
export type ComposerAssetContent=Readonly<{nativeAsset?:ComposerNativeAssetBinding;definition?:ComposerAssetDefinition;schema:"receiz.bank.asset-content.v2";ownerReceizId:string;title:string;description:string;kind:ComposerMediaKind;longForm:string;files:readonly ComposerAssetFile[];music?:ProfileOriginalAudioDistribution;book?:ProfileOriginalEpubMetadata}>;
export type PreparedComposerSource=Readonly<{artifact:File;reference:ImportedProofSourceReference;content:ComposerAssetContent}>;
const MIB=1024*1024;
const KINDS=new Set<ComposerMediaKind>(["moment","image","audio","video","epub","pdf","file"]);
const ATTACHMENT_ROLES=new Set(["source","appendix","dataset","contract","receipt","research","other"]);
const MUSIC_FIELDS=["releaseTitle","primaryArtist","releaseType","genre","subgenre","explicit","isrc","writers","producer","label","releaseDate","territories"] as const;
const BOOK_FIELDS=["title","subtitle","primaryAuthor","contributors","publisher","imprint","genre","language","isbn","edition","series"] as const;
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
function fail(code:string):never{throw new TypeError(`COMPOSER_${code}`);}
function text(value:unknown,max:number,multiline=false):value is string{return typeof value==="string"&&value.length<=max&&!(multiline?/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u:/[\x00-\x1f\x7f]/u).test(value);}
/** Conservative connected authoring profile: the narrowest current complete-source
 * consumer, not a change to canonical proof validity or an unlimited-file claim. */
export function readComposerCapacity():ComposerCapacity{
 return Object.freeze({maxAttachments:200,maxTotalBytes:64*MIB,maxAttachmentBytes:16*MIB,maxPrimaryBytes:Object.freeze({image:16*MIB,audio:64*MIB,video:64*MIB,epub:16*MIB,pdf:64*MIB,file:16*MIB}),maxCoverBytes:12*MIB,maxTextCharacters:100000 as const});
}
export function composerFileMime(file:Pick<File,"name"|"type">):string{
 if(file.type&&/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/iu.test(file.type))return file.type.toLowerCase();
 const ext=file.name.split(".").at(-1)?.toLowerCase()??"";
 const types:Record<string,string>={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",webp:"image/webp",avif:"image/avif",heic:"image/heic",heif:"image/heif",svg:"image/svg+xml",mp3:"audio/mpeg",m4a:"audio/mp4",aac:"audio/aac",flac:"audio/flac",wav:"audio/wav",ogg:"audio/ogg",opus:"audio/opus",mp4:"video/mp4",mov:"video/quicktime",webm:"video/webm",pdf:"application/pdf",epub:"application/epub+zip",txt:"text/plain",json:"application/json",zip:"application/zip"};
 return types[ext]??"application/octet-stream";
}
export function composerMediaKind(mime:string):ComposerMediaKind{return mime.startsWith("image/")?"image":mime.startsWith("audio/")?"audio":mime.startsWith("video/")?"video":mime==="application/pdf"?"pdf":mime==="application/epub+zip"?"epub":"file";}
function metadata<T>(input:unknown,fields:readonly string[]):T|undefined{
 if(input===undefined)return;
 const source=record(input);if(!input||Object.keys(source).some(key=>!fields.includes(key)))fail("METADATA_INVALID");
 const result:Record<string,string|boolean|null>={};
 for(const key of fields){const value=source[key];
  if(key==="explicit"){if(typeof value!=="boolean")fail("METADATA_INVALID");result[key]=value;}
  else{if(value!==null&&!text(value,2000))fail("METADATA_INVALID");if(key==="releaseType"&&value!==null&&!["single","ep","album","mixtape","live"].includes(String(value)))fail("METADATA_INVALID");result[key]=value as string|null;}
 }
 return Object.freeze(result) as T;
}
function definition(input:unknown):ComposerAssetDefinition|undefined{
 if(input===undefined)return;
 const v=record(input);if(Object.keys(v).sort().join("|")!=="description|linkedProofDigest|name|symbol|units"||!text(v.name,80)||!v.name.trim()||!text(v.description,2000,true)||typeof v.symbol!=="string"||! /^[A-Z][A-Z0-9]{1,7}$/.test(v.symbol)||typeof v.units!=="string"||! /^\d{1,18}(?:\.\d{1,6})?$/.test(v.units)||! /[1-9]/.test(v.units)||v.linkedProofDigest!==null&&(typeof v.linkedProofDigest!=="string"||! /^[a-f0-9]{64}$/.test(v.linkedProofDigest)))fail("DEFINITION_INVALID");
 return Object.freeze({name:v.name.trim(),symbol:v.symbol,units:v.units,description:v.description,linkedProofDigest:v.linkedProofDigest}) as ComposerAssetDefinition;
}
function fields(value:ComposerAssetDraft|ComposerAssetContent){
 if(!text(value.title,160)||!value.title.trim()||!text(value.description,2000,true)||!text(value.longForm,100000,true)||!KINDS.has(value.kind))fail(value.longForm?.length>100000?"TEXT_CAPACITY":"DRAFT_INVALID");
 if(value.music!==undefined&&value.kind!=="audio"||value.book!==undefined&&!["epub","pdf"].includes(value.kind))fail("METADATA_KIND_INVALID");
 return {...(value.definition!==undefined?{definition:definition(value.definition)}:{}),title:value.title.trim(),description:value.description,kind:value.kind,longForm:value.longForm,
  ...(value.music!==undefined?{music:metadata<ProfileOriginalAudioDistribution>(value.music,MUSIC_FIELDS)}:{}),...(value.book!==undefined?{book:metadata<ProfileOriginalEpubMetadata>(value.book,BOOK_FIELDS)}:{})};
}
function roles(files:readonly {id:string;role:string;mime:string;size:number;attachmentRole?:string;description?:string}[],kind:ComposerMediaKind){
 const ids=new Set<string>();let primary=0,cover=0;
 for(const file of files){
  if(typeof file.id!=="string"||!/^[A-Za-z0-9_-]{1,100}$/u.test(file.id)||!["primary","cover","attachment"].includes(file.role)||!Number.isSafeInteger(file.size)||file.size<=0||!text(file.mime,120)||!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/u.test(file.mime))fail("FILE_INVALID");
  if(ids.has(file.id))fail("DUPLICATE_FILE");ids.add(file.id);
  if(file.role==="primary"){primary++;if(composerMediaKind(file.mime)!==kind)fail("MEDIA_KIND_INVALID");}
  if(file.role==="cover"){cover++;if(!file.mime.startsWith("image/"))fail("COVER_INVALID");}
  if(file.attachmentRole!==undefined&&(file.role!=="attachment"||!ATTACHMENT_ROLES.has(file.attachmentRole))||file.description!==undefined&&!text(file.description,2000,true))fail("ATTACHMENT_INVALID");
 }
 if(primary!==(kind==="moment"?0:1))fail("PRIMARY_REQUIRED");if(cover>1||kind==="moment"&&cover>0)fail("COVER_INVALID");
}
export function validateComposerAssetDraft(draft:ComposerAssetDraft,capacity:ComposerCapacity):ComposerAssetDraft{
 const content=fields(draft);if(!Array.isArray(draft.files))fail("FILES_INVALID");
 let total=0,attachments=0;
 const files=draft.files.map(selected=>{
  if(!(selected.file instanceof File)||!selected.file.name||!text(selected.file.name,240)||/[\/\\]/u.test(selected.file.name))fail("FILE_INVALID");
  const size=selected.file.size;total+=size;if(selected.role==="attachment")attachments++;
  const maximum=selected.role==="cover"?capacity.maxCoverBytes:selected.role==="attachment"?capacity.maxAttachmentBytes:capacity.maxPrimaryBytes[draft.kind]??0;
  if(size>maximum||total>capacity.maxTotalBytes||attachments>capacity.maxAttachments)fail("FILE_CAPACITY");
  return Object.freeze({id:selected.id,file:selected.file,role:selected.role,...(selected.attachmentRole!==undefined?{attachmentRole:selected.attachmentRole}:{}),...(selected.description!==undefined?{description:selected.description}:{})});
 });
 roles(files.map(file=>({...file,mime:composerFileMime(file.file),size:file.file.size})),draft.kind);
 if(draft.longForm.length>capacity.maxTextCharacters)fail("TEXT_CAPACITY");
 return Object.freeze({...content,files:Object.freeze(files)});
}
/** Called only after the enclosing canonical source passed verification. Block
 * addresses locate committed bytes; they never provide ownership/admission. */
export function readComposerAssetContent(input:unknown,ownerReceizId:string|null):ComposerAssetContent{
 const v=record(input),allowed=["schema","ownerReceizId","title","description","kind","longForm","files","music","book","definition","nativeAsset"];
 if(v.schema!=="receiz.bank.asset-content.v2"||v.ownerReceizId!==ownerReceizId||!ownerReceizId||Object.keys(v).some(key=>!allowed.includes(key))||!Array.isArray(v.files))fail("CONTENT_INVALID");
 if(v.files.length>202)throw new ImportedProofSourceUnavailableError("COMPOSER_FILE_COUNT_CAPACITY","VERIFICATION_RESOURCE_UNAVAILABLE","verified");
 const content=fields(v as unknown as ComposerAssetContent);
 const files=v.files.map(raw=>{const f=record(raw);if(Object.keys(f).some(key=>!["id","role","attachmentRole","description","name","mime","size","sha256","bytes"].includes(key))||!text(f.name,240)||!f.name||/[\/\\]/u.test(f.name)||typeof f.sha256!=="string"||! /^[a-f0-9]{64}$/u.test(f.sha256))fail("CONTENT_FILE_INVALID");
  const bytes=parseExactByteBlockReference(f.bytes);if(bytes.contentByteLength!==f.size)fail("CONTENT_FILE_INVALID");
  return Object.freeze({...f,bytes}) as ComposerAssetFile;
 });
 roles(files,content.kind);
 let nativeAsset:ComposerNativeAssetBinding|undefined;
 if(v.nativeAsset!==undefined){const binding=record(v.nativeAsset);if(Object.keys(binding).sort().join('|')!=='authoredSource|publicCertificateB64u|publicCertificateSha256'||typeof binding.publicCertificateB64u!=='string'||binding.publicCertificateB64u.length>11*1024*1024||!/^[A-Za-z0-9_-]+$/.test(binding.publicCertificateB64u)||typeof binding.publicCertificateSha256!=='string'||!/^[a-f0-9]{64}$/.test(binding.publicCertificateSha256))fail('NATIVE_ASSET_BINDING_INVALID');nativeAsset=Object.freeze({...binding,authoredSource:parseImportedProofSourceReference(binding.authoredSource as ImportedProofSourceReference)}) as ComposerNativeAssetBinding;}
 return Object.freeze({schema:"receiz.bank.asset-content.v2",ownerReceizId,...content,files:Object.freeze(files),...(nativeAsset?{nativeAsset}:{})});
}

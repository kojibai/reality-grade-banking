/** Descriptive sealed attachment metadata. Upload credentials never belong in
 * message display retention, model input or this public value. */
export interface ChatAttachmentInfo {
 readonly mediaKind:'image'|'file';readonly name:string;readonly url:string|null;
 readonly bucket:'receiz-chat-attachments'|'receiz-signed-artifacts';readonly path:string;
 readonly mime:string;readonly size:number;readonly sha256Hex:string;readonly verifyPath:string;
 readonly verifyUrl:string|null;readonly code:string;readonly pulse:string;readonly ts:string;
 readonly anchorId:string|null;readonly anchorMs:string|null;
}
export interface ChatAttachment extends ChatAttachmentInfo {readonly conversationId:string}
export const CHAT_ATTACHMENT_MAX_BYTES=25*1024*1024;
const record=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const string=(value:unknown)=>typeof value==='string'?value:'';
export const chatAttachmentName=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=140&&value.trim()===value&&!/[\u0000-\u001f\u007f/\\<>]/.test(value)&&value!=='.'&&value!=='..';
export const chatAttachmentMime=(value:unknown):value is string=>typeof value==='string'&&value.length<=160&&/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(value);
const storagePath=(value:unknown):value is string=>typeof value==='string'&&value.length<=1024&&/^[A-Za-z0-9/_\-.]+$/.test(value)&&!value.split('/').some(part=>!part||part==='.'||part==='..');
function receiptPath(value:unknown):value is string {
 if(typeof value!=='string'||value.length>512||!/^\/v\/\d{8}_\d{4}\/[A-Z0-9]{8,32}\/\d{1,64}(?:\?[^#\s]*)?$/.test(value))return false;
 const url=new URL(value,'https://receiz.com');
 return url.origin==='https://receiz.com'&&!url.username&&!url.password;
}
function receiptUrl(value:unknown,verifyPath:string):value is string|null {
 if(value===null||value===undefined)return true;
 if(typeof value!=='string'||value.length>2048)return false;
 try{const url=new URL(value);return url.origin==='https://receiz.com'&&!url.username&&!url.password&&!url.hash&&url.pathname+url.search===verifyPath;}catch{return false;}
}
/** Only known metadata survives. This never admits the attachment as proof. */
export function readChatAttachmentInfo(value:unknown):ChatAttachmentInfo|null {
 const v=record(value),path=v.path,verifyPath=v.verifyPath,mime=v.mime;
 if(!['image','file'].includes(string(v.mediaKind))||!chatAttachmentName(v.name)||!chatAttachmentMime(mime)||!storagePath(path)||!['receiz-chat-attachments','receiz-signed-artifacts'].includes(string(v.bucket))||v.bucket==='receiz-chat-attachments'&&!path.startsWith('sealed/chat/')||!Number.isSafeInteger(v.size)||Number(v.size)<=0||Number(v.size)>CHAT_ATTACHMENT_MAX_BYTES||typeof v.sha256Hex!=='string'||! /^[a-f0-9]{64}$/.test(v.sha256Hex)||!receiptPath(verifyPath)||!receiptUrl(v.verifyUrl,verifyPath)||! /^[A-Z0-9]{8,32}$/.test(string(v.code))||! /^\d{1,64}$/.test(string(v.pulse))||typeof v.ts!=='string'||!v.ts||v.ts.length>80||/[\u0000-\u001f\u007f]/.test(v.ts)||v.anchorId!=null&&! /^[a-f0-9]{8}$/.test(string(v.anchorId))||v.anchorMs!=null&&! /^\d{10,17}$/.test(string(v.anchorMs)))return null;
 // Current private uploads carry a storage reference, not a public URL. Older
 // signed artifacts can carry one; it is retained descriptively and never fetched.
 let url:string|null=null;
 if(v.url!=null){if(typeof v.url!=='string'||v.url.length>2048)return null;try{const parsed=new URL(v.url);if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.hash)return null;const match=/^\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/.exec(parsed.pathname);if(!match||match[1]!==v.bucket||decodeURIComponent(match[2])!==path)return null;url=parsed.toString();}catch{return null;}}
 const receipt=new URL(verifyPath,'https://receiz.com');
 if(receipt.pathname.split('/')[3]!==v.code||receipt.pathname.split('/')[4]!==v.pulse)return null;
 return {mediaKind:v.mediaKind as 'image'|'file',name:v.name,url,bucket:v.bucket as ChatAttachmentInfo['bucket'],path,mime,size:Number(v.size),sha256Hex:v.sha256Hex,verifyPath,verifyUrl:typeof v.verifyUrl==='string'?v.verifyUrl:null,code:string(v.code),pulse:string(v.pulse),ts:v.ts,anchorId:typeof v.anchorId==='string'?v.anchorId:null,anchorMs:typeof v.anchorMs==='string'?v.anchorMs:null};
}
export function retainedChatAttachment(value:unknown):Record<string,unknown>|null {
 const v=record(value);if(v.kind!=='chat_attachment')return null;
 const info=readChatAttachmentInfo(v);if(!info)return null;
 return {kind:'chat_attachment',...info,...(typeof v.attachmentId==='string'&&v.attachmentId.length<=200?{attachmentId:v.attachmentId}:{}),caption:typeof v.caption==='string'?v.caption.slice(0,16384):null,autoBody:v.autoBody===true,...(typeof v.createdAt==='string'&&v.createdAt.length<=50?{createdAt:v.createdAt}:{})};
}
export async function chatAttachmentSha256(bytes:Uint8Array):Promise<string>{return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource))].map(byte=>byte.toString(16).padStart(2,'0')).join('');}

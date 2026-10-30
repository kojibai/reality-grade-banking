export type PublicBookSource={assetId:string;url:string;payloadDigest:string};
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** The existing anonymous reading role, never the Original sale or a private file. */
export function safePublicBookUrl(value:unknown,assetId:string):string|null{
 if(typeof value!=='string'||value.length>4096||/[\s\\\x00-\x1f\x7f]/.test(value)||! /^[a-zA-Z0-9_-]{1,128}$/.test(assetId))return null;
 try{const url=new URL(value,'https://receiz.com'),q=url.searchParams;return url.origin==='https://receiz.com'&&!url.username&&!url.password&&!url.hash&&url.pathname==='/api/profile/originals/media'&&q.size===2&&q.getAll('receizId').length===1&&q.get('receizId')===assetId&&q.getAll('slot').length===1&&q.get('slot')==='preview'?url.href:null;}catch{return null;}
}
export function publicBookSource(input:unknown):PublicBookSource|null{
 const source=object(input),profile=object(source.profileOriginal),media=object(profile.media),assetId=source.receizId,digest=media.sha256Hex;
 // Material-carried books retain their stronger, verified payload reader.
 if((profile.mediaKind??media.kind)!=='epub'||media.material||typeof assetId!=='string'||typeof digest!=='string'||!/^[a-f0-9]{64}$/i.test(digest))return null;
 const url=safePublicBookUrl(`/api/profile/originals/media?${new URLSearchParams({receizId:assetId,slot:'preview'})}`,assetId);
 return url?{assetId,url,payloadDigest:digest.toLowerCase()}:null;
}

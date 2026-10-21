const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
/** Existing public document role only. No arbitrary hosts or account authority. */
export function safePublicDocumentUrl(value:unknown,assetId:string):string|null{
 if(typeof value!=='string'||value.length>4096||/[\s\\\x00-\x1f\x7f]/.test(value)||! /^[a-zA-Z0-9_-]{1,128}$/.test(assetId))return null;
 try{const u=new URL(value,'https://receiz.com'),q=u.searchParams;if(u.origin!=='https://receiz.com'||u.username||u.password||u.hash)return null;
  if(u.pathname==='/api/profile/originals/media')return [...q.keys()].length===2&&q.getAll('receizId').length===1&&q.get('receizId')===assetId&&q.getAll('slot').length===1&&q.get('slot')==='preview'?u.href:null;
  if(/^\/api\/proof-material\/packages\/[a-f0-9]{64}\/artifact$/.test(u.pathname)&&!u.search)return u.href;
  if(u.pathname==='/api/storage/object'&&[...q.keys()].length===2&&q.getAll('bucket').length===1&&['receiz-profile-originals','receiz-profile-media'].includes(q.get('bucket')??'')&&q.getAll('path').length===1&&/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.pdf$/i.test(q.get('path')??''))return u.href;
  return null;
 }catch{return null;}
}
export function publicDocumentUrl(input:unknown,exactOriginalUrl?:string|null):string|null{
 const source=object(input),profile=object(source.profileOriginal),media=object(profile.media),material=object(media.material);
 if((profile.mediaKind??media.kind)!=='pdf'||media.gateAudioPlayback===true)return null;
 if(typeof source.receizId!=='string')return null;
 const direct=safePublicDocumentUrl(profile.documentUrl??media.src,source.receizId);if(direct)return direct;
 return media.gateAudioPlayback===false&&media.originalDownloadMime==='application/pdf'&&typeof media.originalDownloadSha256Hex==='string'&&media.originalDownloadSha256Hex===material.sealedArtifactSha256Hex?safePublicDocumentUrl(exactOriginalUrl,source.receizId):null;
}
export function publicDocumentReaderUrl(url:string,assetId:string){const safe=safePublicDocumentUrl(url,assetId);return safe?'/api/bank/public-document?'+new URLSearchParams({source:safe,asset:assetId}):null;}

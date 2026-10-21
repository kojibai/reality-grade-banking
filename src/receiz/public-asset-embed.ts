import {safeImportedSourceUrl} from "./imported-source-url.js";
import type {PublicMarketItem} from './public-market.js';

export type PublicPlayback={url:string;mimeType:string|null};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** Public presentation locators only. The existing Receiz host enforces its
 * current source policy; these fields never admit or verify media bytes. */
export function publicMediaPlayback(input:unknown,exactOriginalUrl?:string|null):PublicPlayback|null{
 const source=record(input),profile=record(source.profileOriginal),media=record(profile.media),held=record(profile.playback),material=record(media.material);
 const kind=profile.mediaKind??media.kind;
 if(!['audio','video'].includes(String(kind))||media.gateAudioPlayback===true)return null;
 // The same public self-contained MP3 used by the verified viewer can play
 // directly. A paid download URL, PNG carrier or unbound artifact cannot.
 const digest=media.originalDownloadSha256Hex,mime=media.originalDownloadMime;
 const artifactAudio=kind==='audio'&&media.gateAudioPlayback===false&&typeof mime==='string'&&/^audio\/[a-zA-Z0-9.+-]+$/.test(mime)
  &&typeof digest==='string'&&/^[a-f0-9]{64}$/i.test(digest)&&digest===material.sealedArtifactSha256Hex
  &&typeof exactOriginalUrl==='string'&&/^https:\/\/receiz\.com\/api\/proof-material\/packages\/[a-f0-9]{64}\/artifact$/.test(exactOriginalUrl)?{url:exactOriginalUrl,mimeType:mime}:null;
 const unpreparedCoordinate=(value:unknown)=>{try{const url=new URL(String(value),'https://receiz.com'),q=url.searchParams;return url.origin==='https://receiz.com'&&!url.username&&!url.password&&!url.hash&&[...q.keys()].length===2&&q.getAll('receizId').length===1&&q.get('receizId')===source.receizId&&(url.pathname==='/api/profile/originals/media'&&q.getAll('slot').length===1&&q.get('slot')==='playback'||url.pathname==='/api/profile/originals/download'&&q.getAll('kind').length===1&&q.get('kind')==='original');}catch{return false;}};
 const unprepared=artifactAudio&&!held.url&&!media.playbackMime&&!media.playbackReadyAt&&(!media.playbackSrc||unpreparedCoordinate(media.playbackSrc))&&(!source.playbackSrc||unpreparedCoordinate(source.playbackSrc));
 // Older public videos already carry a native source without a prepared
 // playback derivative. Stream that same source, never the paid download.
 const videoSource=kind==='video'&&media.gateAudioPlayback===false?media.src:null;
 for(const candidate of [held.url,...(unprepared?[artifactAudio.url]:[]),media.playbackSrc,source.playbackSrc,videoSource]){
  if(typeof candidate!=='string'||candidate.length>4096||/[\s\\\x00-\x1f\x7f]/.test(candidate))continue;
  try{
   const url=new URL(candidate,'https://receiz.com');
   if(url.origin!=='https://receiz.com'||url.username||url.password||url.hash)continue;
   const query=url.searchParams;
   const imported=safeImportedSourceUrl(candidate,"media");
   const native=url.pathname==='/api/profile/originals/media'&&[...query.keys()].length===2&&query.getAll('receizId').length===1&&query.get('receizId')===source.receizId&&query.getAll('slot').length===1&&['preview','playback'].includes(query.get('slot')??'');
   const publicFile=!url.search&&!url.pathname.startsWith('/api/')&&!url.pathname.startsWith('/storage/')&&/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:mp3|m4a|aac|wav|ogg|opus|mp4|m4v|mov|webm|m3u8)$/i.test(url.pathname)&&!url.pathname.split('/').some(part=>part==='.'||part==='..');
   const storage=url.pathname==='/api/storage/object'&&[...query.keys()].length===2&&query.getAll('bucket').length===1&&['receiz-profile-originals','receiz-profile-media'].includes(query.get('bucket')??'')&&query.getAll('path').length===1&&/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:mp3|m4a|aac|wav|ogg|opus|mp4|m4v|mov|webm|m3u8)$/i.test(query.get('path')??'')&&!(query.get('path')??'').split('/').some(part=>part==='.'||part==='..');
   const artifact=artifactAudio?.url===url.href;
   if(!native&&!publicFile&&!storage&&!artifact&&!imported)continue;
   if(artifact)return artifactAudio;
   const mime=held.mimeType??media.playbackMime??source.mediaMime??media.mime;
   const mimeType=typeof mime==='string'&&(new RegExp(`^${kind}/[a-zA-Z0-9.+-]+$`).test(mime)||kind==='video'&&['application/vnd.apple.mpegurl','application/x-mpegURL'].includes(mime))?mime:null;
   return {url:url.href,mimeType};
  }catch{/* An unsupported locator stays absent. */}
 }
 return null;
}

/** A small embeddable presentation over the same public Receiz media role. */
export function publicAssetEmbed(item:PublicMarketItem|null){
 if(!item||item.category!=='proof'||!['audio','video'].includes(item.mediaKind??'')||!item.sourceUrl)return null;
 try{
  const source=new URL(item.sourceUrl),match=/^\/([a-zA-Z0-9_-]{1,64})\/verified\/([a-zA-Z0-9_-]{1,128})\/?$/.exec(source.pathname);
  if(source.origin!=='https://receiz.com'||source.username||source.password||source.search||source.hash||!match||match[2]!==item.assetId)return null;
  const stream=publicMediaPlayback({receizId:item.assetId,profileOriginal:{mediaKind:item.mediaKind,playback:item.playback,media:{gateAudioPlayback:item.playback?false:undefined,originalDownloadMime:item.playback?.mimeType,originalDownloadSha256Hex:item.originalDigest,material:{sealedArtifactSha256Hex:item.originalDigest}}}},item.originalUrl);
  if(!stream)return null;
  return {kind:item.mediaKind as 'audio'|'video',playerUrl:`https://bankeiz.com/asset/${encodeURIComponent(item.id)}/player/`,width:1280,height:item.mediaKind==='audio'?376:720,stream};
 }catch{return null;}
}

/** Carried presentation fields for the already-mounted public page runtime. */
export function publicAssetMediaMetadata(embed:ReturnType<typeof publicAssetEmbed>):Record<string,string|number>|null{
 if(!embed)return null;
 const fields:Record<string,string|number>={'og:type':embed.kind==='audio'?'music.song':'video.other','twitter:card':'player','twitter:player':embed.playerUrl,'twitter:player:width':embed.width,'twitter:player:height':embed.height,['og:'+embed.kind]:embed.stream.url,['og:'+embed.kind+':secure_url']:embed.stream.url,'twitter:player:stream':embed.stream.url};
 if(embed.stream.mimeType){fields['og:'+embed.kind+':type']=embed.stream.mimeType;fields['twitter:player:stream:content_type']=embed.stream.mimeType;}
 return fields;
}

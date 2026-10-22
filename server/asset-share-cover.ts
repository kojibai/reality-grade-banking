import {safeReceizArtworkUrl} from '../src/receiz/public-market';

const MAX_BYTES=4*1024*1024;
const cache=new Map<string,{until:number;value:Promise<string|null>}>();

async function prepareCover(url:string):Promise<string|null>{
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3000);
 try{
  const path=new URL(url).pathname;
  // The same existing Receiz image service used for public artwork supplies a
  // compact raster, including covers whose source is a large sealed image.
  const thumbnail=/^\/api\/(?:proof-material\/packages\/|profile\/originals\/media|storage\/object|receiz\/download)/.test(path)||path.startsWith('/storage/v1/object/public/');
  const target=thumbnail?'https://receiz.com/api/media/image?'+new URLSearchParams({src:url,w:'512',q:'80'}):url;
  const response=await fetch(target,{credentials:'omit',redirect:'error',headers:{Accept:'image/png,image/jpeg,image/webp,image/gif,image/avif'},signal:controller.signal});
  if(!response.ok||!/^image\/(?:png|jpe?g|webp|gif|avif)(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>MAX_BYTES){await response.body?.cancel();return null;}
  const reader=response.body?.getReader();if(!reader)return null;
  const chunks:Uint8Array[]=[];let length=0;
  try{for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>MAX_BYTES){await reader.cancel();return null;}chunks.push(next.value);}}finally{reader.releaseLock();}
  const {default:sharp}=await import('sharp');
  const raster=sharp(Buffer.concat(chunks),{limitInputPixels:4096*4096,pages:1,animated:false,failOn:'warning'}),size=await raster.metadata();
  if(!['png','jpeg','webp','gif','heif','avif'].includes(size.format??'')||!size.width||!size.height||size.width>4096||size.height>4096)return null;
  // Retain only a small presentation derivative. It carries no proof or media
  // authority and contains no external URL for the final PNG renderer to open.
  const png=await raster.rotate().resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  return 'data:image/png;base64,'+png.toString('base64');
 }catch{return null;}finally{clearTimeout(timer);}
}

/** OG image requests only. Coalesce public cover reads, bound retained memory,
 * and retry a failed optional cover sooner than a successfully prepared one. */
export function assetShareCover(input:unknown):Promise<string|null>{
 const url=safeReceizArtworkUrl(input);if(!url)return Promise.resolve(null);
 const previous=cache.get(url);if(previous&&previous.until>Date.now())return previous.value;
 const entry={until:Infinity,value:Promise.resolve(null) as Promise<string|null>};
 entry.value=prepareCover(url).then(value=>{entry.until=Date.now()+(value?300_000:15_000);return value;});
 cache.delete(url);cache.set(url,entry);if(cache.size>24)cache.delete(cache.keys().next().value!);
 return entry.value;
}

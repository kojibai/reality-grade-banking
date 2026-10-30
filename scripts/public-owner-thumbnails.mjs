import {createHash} from 'node:crypto';
import {Resvg} from '@resvg/resvg-js';
import sharp from 'sharp';
const held=new Map();
/** Small first-paint portraits of the existing canonical public Seal artwork.
 * Embedded in the same page/seed; no media endpoint, identity read or authority. */
export async function publicOwnerThumbnails(items,server){
 const {publicOwnerSealAvatar}=await server.ssrLoadModule('/src/public-explorer/PublicOwnerAvatar.tsx');
 return await Promise.all(items.map(async item=>{
  if(item.ownerAvatarUrl||!item.ownerIdentity)return item;
  const source=publicOwnerSealAvatar(item);if(!source?.startsWith('data:image/svg+xml;charset=utf-8,'))return item;
  const key=createHash('sha256').update(source).digest('hex');let work=held.get(key);
  if(!work){work=(async()=>{const svg=decodeURIComponent(source.slice(source.indexOf(',')+1)),png=new Resvg(svg,{fitTo:{mode:'width',value:128}}).render().asPng(),bytes=await sharp(png).webp({quality:90,effort:4}).toBuffer();return 'data:image/webp;base64,'+bytes.toString('base64');})();held.set(key,work);if(held.size>64)held.delete(held.keys().next().value);}
  return {...item,ownerAvatarFallback:await work};
 }));
}

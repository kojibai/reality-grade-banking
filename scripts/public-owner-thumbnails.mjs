import {createHash} from 'node:crypto';
import {Resvg} from '@resvg/resvg-js';
import sharp from 'sharp';
const held=new Map();
function thumbnail(source,width=128){
 if(!source?.startsWith('data:image/svg+xml;charset=utf-8,'))return null;
 const key=width+':'+createHash('sha256').update(source).digest('hex');let work=held.get(key);
 if(!work){work=(async()=>{const svg=decodeURIComponent(source.slice(source.indexOf(',')+1)),png=new Resvg(svg,{fitTo:{mode:'width',value:width}}).render().asPng(),bytes=await sharp(png).webp({quality:75,effort:4}).toBuffer();return 'data:image/webp;base64,'+bytes.toString('base64');})();held.set(key,work);if(held.size>64)held.delete(held.keys().next().value);}
 return work;
}
/** Small first-paint portraits of the existing canonical public Seal artwork.
 * Embedded in the same page/seed; no media endpoint, identity read or authority. */
export async function publicOwnerThumbnails(items,server){
 const {publicOwnerSealAvatar}=await server.ssrLoadModule('/src/public-explorer/PublicOwnerAvatar.tsx');
 return await Promise.all(items.map(async item=>{
  if(item.ownerAvatarUrl||!item.ownerIdentity)return item;
  const source=publicOwnerSealAvatar(item);if(!source?.startsWith('data:image/svg+xml;charset=utf-8,'))return item;
  const work=thumbnail(source);
  return {...item,ownerAvatarFallback:await work};
 }));
}

/** Header-only people use the same canonical artwork and bounded local image
 * preparation as Original owners. Preserve the source header and custom URL. */
export async function publicProfileHeadThumbnails(heads,server){
 const {publicProfileAvatar}=await server.ssrLoadModule('/src/receiz/profile-artwork.ts');
 return Promise.all(heads.map(async head=>{
  if(head.profile.avatarUrl)return head;
  const work=thumbnail(publicProfileAvatar(head.profile),80);
  return work?{...head,avatarFallback:await work}:head;
 }));
}

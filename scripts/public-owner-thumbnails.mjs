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

const inlineRaster = /^data:image\/(?:png|jpeg|gif|webp|avif);base64,([a-z0-9+/=]+)$/i;
const peoplePortraitWidth = 80;

/** The inline portrait belongs to the selected header. Prepare a compact
 * display copy for Discover. The shared catalog retains the original bytes. */
async function compactCustomPortrait(avatarUrl) {
 if (typeof avatarUrl !== 'string' || avatarUrl.length <= 2048) return null;
 const match = inlineRaster.exec(avatarUrl);
 if (!match) return null;
 const input = Buffer.from(match[1], 'base64');
 const pixels = sharp(input, {limitInputPixels: 16_000_000})
  .autoOrient().resize(peoplePortraitWidth, peoplePortraitWidth, {fit: 'cover'});
 const bytes = await pixels.webp({quality: 65, effort: 4}).toBuffer().catch(() => null);
 return bytes ? 'data:image/webp;base64,' + bytes.toString('base64') : null;
}

/** Prepare the visible People portraits from existing header data. */
export async function publicProfileHeadThumbnails(heads, server) {
 const {publicProfileAvatar} = await server.ssrLoadModule('/src/receiz/profile-artwork.ts');
 return Promise.all(heads.map(async head => {
  if (head.profile.avatarUrl) {
   const avatarUrl = await compactCustomPortrait(head.profile.avatarUrl);
   return avatarUrl ? {...head, profile: {...head.profile, avatarUrl}} : head;
  }
  const work = thumbnail(publicProfileAvatar(head.profile), peoplePortraitWidth);
  return work ? {...head, avatarFallback: await work} : head;
 }));
}

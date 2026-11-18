import {resolve} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {readFile} from 'node:fs/promises';
import {prepareConformanceEvidenceRenderer} from '../src/conformance/evidence-renderer';
import {bankMarkPaths} from '../branding/bank-mark.mjs';
import {assetCardFont} from './asset-share-art';
import {bookingShareName,bookingShareTextFit} from './booking-share-art';
import {publicBannerCover,publicPortraitCover,rasterCover} from './asset-share-cover';
import {publicProfileUsername} from '../src/receiz/account-name';
import type {PublicProfileHeader} from '../src/receiz/public-profile';
export const profileCardFont={...assetCardFont,fontFiles:[...assetCardFont.fontFiles,resolve('scripts/social/fonts/NotoSansCJKsc-Regular.otf')]};
let svgResources:Promise<{engine:typeof import('@resvg/resvg-wasm');fontBuffers:Uint8Array[]}>|undefined;
function profileSvgResources(){return svgResources??=(async()=>{const {engine}=await prepareConformanceEvidenceRenderer();return{engine,fontBuffers:await Promise.all(profileCardFont.fontFiles.map(async path=>new Uint8Array(await readFile(path))))};})().catch(error=>{svgResources=undefined;throw error;});}
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const clean=(value:string)=>value.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim();
const png=(value:string|null)=>value&&value.length<=6*1024*1024&&/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(value)?value:null;
/** Realize only this selected public image. Carried bytes precede optional URL
 * transport; raster derivatives contain no external resources or proof claims. */
async function profileImage(input:string|null,portrait:boolean):Promise<string|null>{
 try{
  if(input?.startsWith('data:image/svg+xml')&&input.length<=256*1024){
   const comma=input.indexOf(','),head=input.slice(0,comma),body=input.slice(comma+1),svg=head.includes(';base64')?Buffer.from(body,'base64'):decodeURIComponent(body);
   const {engine,fontBuffers}=await profileSvgResources(),target=portrait?512:1600;
   // The existing WASM renderer has no host file reader. Native Resvg resolves
   // file: images during construction, before its unresolved-image accessor.
   const image=new engine.Resvg(svg,{font:{fontBuffers,defaultFontFamily:'Inter'},fitTo:{mode:'width',value:target}});
   try{
    const width=image.width,height=image.height,scaledHeight=Math.ceil(height*target/width);
    // Match the existing raster reader's4K/16MP bounds before allocation,
    // including the actual width-fit output rather than only SVG source size.
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||width>4096||height>4096||width*height>4096*4096||!Number.isFinite(scaledHeight)||scaledHeight<1||scaledHeight>4096||target*scaledHeight>4096*4096||image.imagesToResolve().length)return null;
    const visible=image.getBBox();if(!visible)return null;visible.free();
    const rendered=image.render();try{return await rasterCover(new Uint8Array(rendered.asPng()),portrait,target);}finally{rendered.free();}
   }finally{image.free();}
  }
  const carried=input&&/^data:image\/(?:png|jpeg|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(input);
  if(carried&&input!.length<=6*1024*1024)return rasterCover(Buffer.from(carried[1],'base64'),portrait,portrait?512:1600);
  return portrait?publicPortraitCover(input):publicBannerCover(input);
 }catch{return null;}
}
/** Public identity presentation only. No invented authorship badge, quantity,
 * private identifier, Original body, or financial authority enters this image. */
export function profileShareCardSvg(profile:PublicProfileHeader,images:Readonly<{banner:string|null;portrait:string|null}>={banner:null,portrait:null}){
 const username=publicProfileUsername(profile.username,profile.receivingUsername),name=clean(profile.displayName).slice(0,200)||username,layout=bookingShareName(name,profileCardFont),size=Math.min(76,layout.size),bio=clean(profile.bio??''),bioLine=bookingShareTextFit(Array.from(bio).slice(0,280).join(''),27,1260,profileCardFont),portrait=png(images.portrait),banner=png(images.banner),initials=name.split(' ').slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase(),y=layout.lines.length===1?642:599;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="909" viewBox="0 0 1730 909" role="img" aria-labelledby="profile-title profile-description"><title id="profile-title">${esc(name)} · @${esc(username)} | Bankeiz</title><desc id="profile-description">${esc(bio||'Explore this public profile on Bankeiz.')}</desc><defs><clipPath id="banner"><rect x="38" y="34" width="1654" height="490" rx="26"/></clipPath><clipPath id="portrait"><circle cx="183" cy="572" r="105"/></clipPath><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fcfdff"/><stop offset="1" stop-color="#eef3fb"/></linearGradient></defs><rect width="1730" height="909" fill="#fbfcfe"/><rect x="38" y="34" width="1654" height="490" rx="26" fill="url(#paper)"/>${banner?`<image x="38" y="34" width="1654" height="490" preserveAspectRatio="xMidYMid slice" clip-path="url(#banner)" href="${banner}"/>`:`<g transform="translate(1260 108) scale(.58)" fill="#254bd8" opacity=".075">${bankMarkPaths}</g><text x="87" y="143" font-family="Inter" font-size="20" font-weight="600" letter-spacing="3" fill="#6e83a0">PUBLIC PROFILE</text><text x="82" y="263" font-family="Inter" font-size="52" font-weight="600" letter-spacing="-1.8" fill="#254bd8">@${esc(username)}</text><path d="M38 391h1654M38 423h1654M38 455h1654" stroke="#d5dfed" stroke-width="1"/><path d="M38 516h1654" stroke="#254bd8" stroke-opacity=".18" stroke-width="16"/>`}<circle cx="183" cy="572" r="117" fill="#fbfcfe"/><circle cx="183" cy="572" r="105" fill="#edf2fc"/>${portrait?`<image x="78" y="467" width="210" height="210" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)" href="${portrait}"/>`:`<text x="183" y="598" text-anchor="middle" font-family="Inter" font-size="67" font-weight="600" fill="#254bd8">${esc(initials)}</text>`}<circle cx="183" cy="572" r="105" fill="none" stroke="#fff" stroke-width="3"/><g font-family="Inter" font-size="${size}" font-weight="600" letter-spacing="${-.035*size}" fill="#172b45">${layout.lines.map((line,index)=>`<text x="342" y="${y+index*80}">${esc(line)}</text>`).join('')}</g><text x="346" y="${layout.lines.length===1?694:724}" font-family="Inter" font-size="31" fill="#254bd8">@${esc(username)}</text>${bioLine?`<text x="346" y="${layout.lines.length===1?751:776}" font-family="Inter" font-size="27" letter-spacing="-.945" fill="#697d97">${esc(bioLine)}</text>`:''}<path d="M66 820h1598" stroke="#e2e8f1"/><g transform="translate(65 849) scale(.1111111111)" fill="#172b45"><g transform="translate(-112 -112)">${bankMarkPaths}</g></g><text x="110" y="873" font-family="Inter" font-size="24" font-weight="600" letter-spacing="-.4" fill="#172b45">Bankeiz</text><text x="1663" y="873" text-anchor="end" font-family="Inter" font-size="23" fill="#73849b">bankeiz.com/${esc(username)}</text></svg>`;
}
export async function renderProfileImage(profile:PublicProfileHeader):Promise<Uint8Array>{
 const [banner,portrait]=await Promise.all([profileImage(profile.bannerUrl,false),profileImage(profile.avatarUrl,true)]);
 return new Resvg(profileShareCardSvg(profile,{banner,portrait}),{font:profileCardFont}).render().asPng();
}

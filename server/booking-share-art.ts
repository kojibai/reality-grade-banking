import {resolve} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {bankMarkSvg} from '../branding/bank-mark.mjs';
import {publicPortraitCover} from './asset-share-cover';
import type {BookingShareOwner} from './booking-preview';
const font={fontFiles:['Inter-SemiBold.ttf','Inter-Regular.ttf'].map(name=>resolve('scripts/social/fonts',name)),loadSystemFonts:false,defaultFontFamily:'Inter'};
const esc=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const clean=(value:string)=>value.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim();
function width(value:string,size:number){return new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="10000" height="250"><text y="180" font-family="Inter" font-size="${size}" font-weight="600" letter-spacing="${-.035*size}">${esc(value)}</text></svg>`,{font}).getBBox()?.width??0;}
function fit(value:string,size:number){if(width(value,size)<=860)return value;const chars=Array.from(value);let low=0,high=chars.length;while(low<high){const mid=Math.ceil((low+high)/2);if(width(chars.slice(0,mid).join('')+'…',size)<=860)low=mid;else high=mid-1;}return chars.slice(0,low).join('').trimEnd()+'…';}
export function bookingShareName(value:string){
 const name=clean(value).slice(0,200)||'Your host';
 if(width(name,88)<=860)return{size:88,lines:[name]};
 for(const size of [88,80,72,64,56]){
  const words=name.split(' ');let first='',index=0;
  while(index<words.length&&width((first+' '+words[index]).trim(),size)<=860)first=(first+' '+words[index++]).trim();
  if(first&&width(words.slice(index).join(' '),size)<=860)return{size,lines:[first,words.slice(index).join(' ')]};
 }
 const words=name.split(' '),split=Math.max(1,Math.ceil(words.length/2));return{size:56,lines:[fit(words.slice(0,split).join(' '),56),fit(words.slice(split).join(' '),56)].filter(Boolean)};
}
/** A social presentation derivative of the public booking owner. It contains
 * no identity seal, calendar availability, guest data or account authority. */
export function bookingShareCardSvg(owner:BookingShareOwner,portrait:string|null=null){
 const name=clean(owner.displayName).slice(0,200)||owner.username,layout=bookingShareName(name),initials=name.split(' ').slice(0,2).map(word=>Array.from(word)[0]).join('').toLocaleUpperCase();
 portrait=portrait&&portrait.length<=2*1024*1024&&/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(portrait)?portrait:null;
 const dots=Array.from({length:28},(_,i)=>{const column=i%7,row=Math.floor(i/7),selected=i===17;return `<rect x="${1116+column*51}" y="${628+row*32}" width="${selected?31:5}" height="${selected?25:5}" rx="${selected?8:2.5}" fill="${selected?'#2a50d5':'#b4c3d7'}"${selected?'':` opacity="${i<3||i>24?'.35':'.85'}"`}/>${selected?`<path d="m${1124+column*51} ${641+row*32} 5 5 9-10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`:''}`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1730" height="909" viewBox="0 0 1730 909" role="img" aria-labelledby="invitation-title invitation-description">
<title id="invitation-title">Make time with ${esc(name)}</title><desc id="invitation-description">A personal booking invitation from ${esc(name)}. bankeiz.com/book/${owner.username}</desc>
<defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fffefd"/><stop offset="1" stop-color="#f4f7fc"/></linearGradient><radialGradient id="halo"><stop stop-color="#c5d5ff" stop-opacity=".7"/><stop offset="1" stop-color="#edf3ff" stop-opacity="0"/></radialGradient><linearGradient id="navy" x2="1" y2="1"><stop stop-color="#2d4566"/><stop offset=".55" stop-color="#142b49"/><stop offset="1" stop-color="#071932"/></linearGradient><linearGradient id="glass" x2=".8" y2="1"><stop stop-color="#fff" stop-opacity=".97"/><stop offset=".48" stop-color="#ecf3ff" stop-opacity=".56"/><stop offset="1" stop-color="#c4d4ee" stop-opacity=".85"/></linearGradient><linearGradient id="edge" x2="1" y2="1"><stop stop-color="#fff"/><stop offset=".36" stop-color="#a8bfe4"/><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#7294c8"/></linearGradient><filter id="lift" x="-.3" y="-.3" width="1.6" height="1.8"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-color="#193762" flood-opacity=".13"/></filter><filter id="soft"><feGaussianBlur stdDeviation="28"/></filter><clipPath id="portrait"><rect x="1098" y="150" width="424" height="424" rx="74"/></clipPath></defs>
<rect width="1730" height="909" fill="url(#paper)"/><ellipse cx="1310" cy="411" rx="490" ry="422" fill="url(#halo)"/><path d="M989 140c82-112 319-105 478 15s210 333 97 496" fill="none" stroke="#ccd9ed" stroke-width="1.5"/>
<g transform="translate(80 70) scale(.135)" fill="#172e4a">${bankMarkSvg.replace(/<svg[^>]*>|<\/svg>/g,'')}</g>
<text x="82" y="185" font-family="Inter" font-size="19" font-weight="600" letter-spacing="4" fill="#647d9d">A PERSONAL INVITATION</text>
<text x="76" y="304" font-family="Inter" font-size="96" font-weight="600" letter-spacing="-5" fill="#192e4a">Let’s make time.</text>
<g font-family="Inter" font-size="${layout.size}" font-weight="600" letter-spacing="${-.035*layout.size}" fill="#2148ca">${layout.lines.map((line,i)=>`<text x="78" y="${layout.lines.length===1?457:416+i*98}">${esc(line)}</text>`).join('')}</g>
<text x="82" y="604" font-family="Inter" font-size="28" letter-spacing="-.5" fill="#627b9b">@${owner.username}</text>
<g><rect x="80" y="681" width="270" height="76" rx="19" fill="#172e4a"/><text x="109" y="729" font-family="Inter" font-size="27" font-weight="600" letter-spacing="-.5" fill="#fff">Find a time</text><path d="M290 718h22m-9-9 9 9-9 9" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></g>
<text x="82" y="831" font-family="Inter" font-size="23" letter-spacing="-.3" fill="#7b8ea7">bankeiz.com/book/${owner.username}</text>
<ellipse cx="1317" cy="801" rx="280" ry="28" fill="#244681" opacity=".14" filter="url(#soft)"/>
<g transform="rotate(6 1310 380)" filter="url(#lift)"><rect x="1060" y="108" width="505" height="543" rx="91" fill="url(#glass)" stroke="url(#edge)" stroke-width="2.5"/><rect x="1074" y="122" width="477" height="515" rx="80" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.5"/><rect x="1098" y="150" width="424" height="424" rx="74" fill="url(#navy)"/>
${portrait?`<image x="1098" y="150" width="424" height="424" preserveAspectRatio="xMidYMid slice" clip-path="url(#portrait)" href="${portrait}"/>`:`<circle cx="1310" cy="353" r="122" fill="#34547e" opacity=".45"/><text x="1310" y="397" text-anchor="middle" font-family="Inter" font-size="112" font-weight="600" letter-spacing="-5" fill="#fff">${esc(initials)}</text>`}
<rect x="1098" y="150" width="424" height="424" rx="74" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/></g>
<g transform="rotate(-7 1325 670)" filter="url(#lift)"><rect x="1052" y="580" width="496" height="203" rx="31" fill="url(#glass)" stroke="url(#edge)" stroke-width="2"/><path d="M1084 611h431" stroke="#d7e1ef" stroke-width="1"/>${dots}<g transform="translate(1490 627)" fill="none" stroke="#476b9f" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><rect width="23" height="25" y="3" rx="5"/><path d="M5 0v7m13-7v7M0 11h23"/></g></g>
</svg>`;
}
export async function renderBookingImage(owner:BookingShareOwner):Promise<Uint8Array>{return new Resvg(bookingShareCardSvg(owner,await publicPortraitCover(owner.avatarUrl)),{font}).render().asPng();}

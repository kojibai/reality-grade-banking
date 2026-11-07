import {resolve} from 'node:path';
import {Resvg} from '@resvg/resvg-js';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import type {ReceivingInvitation} from '../src/adoption/invitation';
const font={fontFiles:['Inter-SemiBold.ttf','Inter-Regular.ttf'].map(name=>resolve('scripts/social/fonts',name)),loadSystemFonts:false,defaultFontFamily:'Inter'};
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const clean=(value:string)=>value.replace(/[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,' ').replace(/\s+/g,' ').trim().slice(0,200);
function width(value:string,size:number){return new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="10000" height="250"><text y="180" font-family="Inter" font-weight="600" font-size="${size}" letter-spacing="-.04em">${escape(value)}</text></svg>`,{font}).getBBox()?.width??0;}
function fit(value:string,max:number,initial:number){
 const minimum=Math.min(32,initial);for(let size=initial;size>=minimum;size-=4)if(width(value,size)<=max)return{text:value,size};
 const chars=Array.from(value);let low=0,high=chars.length;while(low<high){const mid=Math.ceil((low+high)/2);if(width(chars.slice(0,mid).join('')+'…',minimum)<=max)low=mid;else high=mid-1;}return{text:chars.slice(0,low).join('').trimEnd()+'…',size:minimum};
}
/** Names only. No account lookup, remote portrait, reviewed message or payment
 * amount enters the share artwork; the Original retains its own authority. */
export function invitationShareCardSvg(invitation:ReceivingInvitation){
 const recipient=fit(clean(invitation.recipientName??'Your next payment.'),960,104),heading=fit('Your receiving invitation.',960,76),sender=fit(invitation.senderName?'From '+clean(invitation.senderName):'Choose your receiving path.',1460,31);
 return shareCardSvg({lines:[recipient.text,heading.text],sizes:[recipient.size,heading.size],caption:sender.text,motif:'bank'});
}
export async function renderInvitationImage(invitation:ReceivingInvitation):Promise<Uint8Array>{return new Resvg(invitationShareCardSvg(invitation),{font}).render().asPng();}

import {createContext} from 'react';
/** Freeze the server's public presentation through hydration. Default readers
 * continue using the user's locale and timezone after that first commit. */
export type PublicDocumentFormat={locale:string;timeZone:string};
export const PublicDocumentFormatContext=createContext<PublicDocumentFormat|undefined>(undefined);
export const PublicDocumentCapabilitiesContext=createContext<{intersectionObserver:boolean}|undefined>(undefined);

/** A presentation coordinate only; it never creates proof or action authority. */
export const PublicDocumentPulseContext=createContext<number|undefined>(undefined);
export type PublicFirstFrame={locale:string;timeZone:string;pulse:number};
export function readPublicFirstFrame(root:HTMLElement):PublicFirstFrame|null{
 const text=root.getAttribute('data-public-first-frame');if(!text||text.length>512)return null;
 try{const value=JSON.parse(text);return typeof value.locale==='string'&&value.locale.length<=80&&typeof value.timeZone==='string'&&value.timeZone.length<=80&&Number.isSafeInteger(value.pulse)&&value.pulse>=0&&value.pulse<=1e10?value:null;}catch{return null;}
}

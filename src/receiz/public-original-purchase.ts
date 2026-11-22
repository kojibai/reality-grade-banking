import {safeImportedSourceUrl} from './imported-source-url.js';

export type PublicOriginalOffer={amountCents:number;locked:boolean};
export const ORIGINAL_PURCHASE_INTENT='#purchase-original';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};

export function readPublicOriginalOffer(value:unknown):PublicOriginalOffer|undefined{
 const {amountCents,locked}=record(value);
 return typeof amountCents==='number'&&Number.isSafeInteger(amountCents)&&amountCents>0&&amountCents<=1_000_000&&typeof locked==='boolean'?{amountCents,locked}:undefined;
}

export function publicOriginalCheckoutUrl(source:unknown,assetId:unknown):string|null{
 if(typeof source!=='string'||typeof assetId!=='string')return null;
 try{
  const url=new URL(source,'https://receiz.com');
  const match=/^\/([a-zA-Z0-9_-]{1,64})\/verified\/([a-zA-Z0-9_-]{1,128})\/?$/.exec(url.pathname);
  if(url.origin!=='https://receiz.com'||url.username||url.password||url.search||url.hash||match?.[2]!==assetId)return null;
  url.hash=ORIGINAL_PURCHASE_INTENT;
  return url.href;
 }catch{return null;}
}

/** Carry only the selected price and presentation state. Checkout resolves the
 * source policy and deliverable file again on the existing Receiz route. */
export function projectPublicOriginalOffer(input:unknown):PublicOriginalOffer|undefined{
 const item=record(input),profile=record(item.profileOriginal),media=record(profile.media),imported=record(profile.importedSource);
 if(!publicOriginalCheckoutUrl(item.canonicalHref,item.receizId))return;
 const carried=readPublicOriginalOffer(profile.originalOffer);
 if(carried)return carried;
 if(media.allowOriginalDownload===false||typeof media.originalDownloadSrc!=='string'||!media.originalDownloadSrc)return;
 const preview=media.src,cover=media.audioCoverSrc??media.videoPosterSrc??media.epubCoverSrc;
 const locked=media.gateAudioPlayback===true||imported.protectedOriginal===true&&(
  !preview||preview===cover||new URL(safeImportedSourceUrl(preview,'media')??'https://receiz.com/').searchParams.get('file')==='collection-preview'
 );
 return readPublicOriginalOffer({amountCents:media.originalDownloadPriceCents,locked});
}

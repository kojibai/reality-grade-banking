import {safeImportedSourceUrl} from './imported-source-url.js';

export type PublicOriginalOffer={amountCents:number;locked:boolean};
export function isPurchasableOriginalId(value:unknown):value is string{
 return typeof value==='string'&&/^(?:imported-[a-f0-9]{64}|[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/.test(value);
}
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};

export function readPublicOriginalOffer(value:unknown):PublicOriginalOffer|undefined{
 const {amountCents,locked}=record(value);
 return typeof amountCents==='number'&&Number.isSafeInteger(amountCents)&&amountCents>0&&amountCents<=1_000_000&&typeof locked==='boolean'?{amountCents,locked}:undefined;
}

export function publicOriginalSourceSeller(source:unknown,assetId:unknown):string|null{
 if(typeof source!=='string'||typeof assetId!=='string')return null;
 try{
  const url=new URL(source,'https://receiz.com');
  const match=/^\/([a-zA-Z0-9_-]{1,64})\/verified\/([a-zA-Z0-9_-]{1,128})\/?$/.exec(url.pathname);
  if(url.origin!=='https://receiz.com'||url.username||url.password||url.search||url.hash||match?.[2]!==assetId)return null;
  return match[1];
 }catch{return null;}
}

export function publicOriginalCheckoutUrl(source:unknown,assetId:unknown):string|null{
 const username=publicOriginalSourceSeller(source,assetId);
 if(!username||!/^[a-z0-9_]{3,24}$/.test(username)||!isPurchasableOriginalId(assetId))return null;
 return '/pay/'+username+'/?original='+assetId;
}

/** Carry only the selected price and presentation state. Checkout reopens the exact Source and deliverable under its existing policy. */
export function projectPublicOriginalOffer(input:unknown):PublicOriginalOffer|undefined{
 const item=record(input),profile=record(item.profileOriginal),media=record(profile.media),imported=record(profile.importedSource);
 if(!publicOriginalSourceSeller(item.canonicalHref,item.receizId))return;
 const carried=readPublicOriginalOffer(profile.originalOffer);
 if(carried)return carried;
 if(media.allowOriginalDownload===false||typeof media.originalDownloadSrc!=='string'||!media.originalDownloadSrc)return;
 const preview=media.src,cover=media.audioCoverSrc??media.videoPosterSrc??media.epubCoverSrc;
 const locked=media.gateAudioPlayback===true||imported.protectedOriginal===true&&(
  !preview||preview===cover||new URL(safeImportedSourceUrl(preview,'media')??'https://receiz.com/').searchParams.get('file')==='collection-preview'
 );
 return readPublicOriginalOffer({amountCents:media.originalDownloadPriceCents,locked});
}

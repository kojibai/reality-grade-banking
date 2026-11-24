import {readFixedSaleFields,type FixedSaleFields} from './fixed-checkout';
import {originalPurchasePath} from './original-checkout-path';
export {originalPurchasePath,ORIGINAL_TRANSFER_ROUTE} from './original-checkout-path';

export const originalPurchaseRefusals=new Set(['original_purchase_mismatch','original_purchase_already_paid','original_purchase_limit_reached']);
export type OriginalPurchaseOffer={paid:true}|{paid:false;terms:FixedSaleFields};

export function createOriginalPurchaseClient(fetch:(path:string)=>Promise<Response>){
 return {
  async quote(originalId:string,username:string):Promise<OriginalPurchaseOffer>{
   const response=await fetch(originalPurchasePath(originalId,username));
   if(!response.ok)throw Error('This Original is unavailable for purchase. No payment was sent.');
   const raw=await response.json();
   if(raw?.ok===true&&raw.paid&&typeof raw.paid.transferId==='string')return{paid:true};
   const terms=readFixedSaleFields(raw?.terms);
   if(raw?.ok!==true||terms.originalId!==originalId||terms.username!==username)throw Error('ORIGINAL_PURCHASE_MISMATCH');
   return{paid:false,terms};
  },
  async download(originalId:string,expectedSha256?:string){
   const response=await fetch(originalPurchasePath(originalId));
   const disposition=response.headers.get('content-disposition');
   if(!response.ok||!disposition?.startsWith('attachment;'))throw Error('The Original download is unavailable. Try again from this checkout.');
   const encoded=/filename\*=UTF-8''([^;]+)$/i.exec(disposition)?.[1],quoted=/filename="([^"]+)"/i.exec(disposition)?.[1];
   const filename=(encoded?decodeURIComponent(encoded):quoted??'Original').replace(/[\u0000-\u001f\u007f/\\]/g,'_').slice(0,240);
   const bytes=await response.blob();
   if(!bytes.size)throw Error('ORIGINAL_DOWNLOAD_EMPTY');
   const receiptSha256=expectedSha256??response.headers.get('x-receiz-original-sha256');
   if(!receiptSha256||!/^[a-f0-9]{64}$/.test(receiptSha256))throw Error('ORIGINAL_DOWNLOAD_MISMATCH');
   const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await bytes.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
   if(sha256!==receiptSha256)throw Error('ORIGINAL_DOWNLOAD_MISMATCH');
   return{bytes,filename};
  },
 };
}

export type OriginalPurchaseClient=ReturnType<typeof createOriginalPurchaseClient>;

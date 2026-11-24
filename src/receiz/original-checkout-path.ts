import {isPurchasableOriginalId} from './public-original-purchase.js';

export const ORIGINAL_DOWNLOAD_ROUTE='/api/profile/originals/download';
export const ORIGINAL_TRANSFER_ROUTE='/api/connect/transfers/original';

export function originalPurchasePath(originalId:string,username?:string){
 if(!isPurchasableOriginalId(originalId)||username!==undefined&&!/^[a-z0-9_]{3,24}$/.test(username))throw Error('ORIGINAL_PURCHASE_INVALID');
 const query=new URLSearchParams({receizId:originalId,kind:'original',bankeiz:username===undefined?'download':'quote'});
 if(username!==undefined)query.set('seller',username);
 return ORIGINAL_DOWNLOAD_ROUTE+'?'+query;
}

export function isOriginalPurchasePath(url:URL,method:string){
 if(url.pathname!==ORIGINAL_DOWNLOAD_ROUTE||method!=='GET')return false;
 const id=url.searchParams.get('receizId'),seller=url.searchParams.get('seller')??undefined;
 return isPurchasableOriginalId(id)&&(seller===undefined||/^[a-z0-9_]{3,24}$/.test(seller))&&url.search===new URL(originalPurchasePath(id,seller),url.origin).search;
}

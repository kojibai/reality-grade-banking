import type {HeldDeposit} from '../../receiz/deposit-source';
import type {PublicMarketItem} from '../../receiz/public-market';
import {retainAssetPublicationDelivery} from '../../receiz/asset-publication';

/** Display continuity only. The exact Original and its SDK signing path remain
 * authoritative; a late Source acknowledgment cannot erase its held signature. */
export function retainCreatedAssetResult(current:HeldDeposit|null,next:HeldDeposit):HeldDeposit{
 if(current?.digest!==next.digest)return next;
 const publication=retainAssetPublicationDelivery(current.publication,next.publication),marketPublication=retainAssetPublicationDelivery(current.marketPublication,next.marketPublication);
 return {...next,...(current.pbiSigned?{pbiSigned:true}:{}),...(publication?{publication}:{}),...(marketPublication?{marketPublication}:{})};
}
export function createdAssetHasHeldSignature(result:HeldDeposit,item:PublicMarketItem|null,username:string|null|undefined,accountUid:string|null|undefined){
 return !!accountUid&&!!item&&item.originalDigest===result.digest&&item.ownerUsername===username&&item.hasPbiSignature===true&&typeof item.pbiReceiptHash==='string'&&/^[a-f0-9]{64}$/.test(item.pbiReceiptHash)&&(item.ownerIdentity?.userId??item.admittedOwnerUserId)===accountUid;
}

/** Reuse the exact already-held owner/source membership for editor display.
 * This does not acknowledge publication or supply signing/financial authority. */
export function createdAssetHeldItem(result:HeldDeposit,items:readonly PublicMarketItem[],username:string|null|undefined,accountUid:string|null|undefined):PublicMarketItem|null{
 if(!username||!accountUid)return null;
 return items.find(item=>item.originalDigest===result.digest&&item.ownerUsername===username&&(item.ownerIdentity?.userId??item.admittedOwnerUserId)===accountUid)??null;
}

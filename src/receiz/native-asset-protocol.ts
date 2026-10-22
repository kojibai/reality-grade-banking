import {parseImportedProofSourceReference,type ImportedProofSourceReference} from '../../native/receiz/app/lib/profile/showcase/importedSourceReference';
import {inspectNativeAssetBacking,inspectNativeAssetFundingComponents,type NativeAssetFundingComponent} from './native-asset-backing';
export {inspectNativeAssetFundingComponents} from './native-asset-backing';
import {canonicalizeReceizV122} from '@receiz/sdk';
import {receizBase64UrlEncode,receizBase64UrlDecode} from '@receiz/sdk';
export const ASSET_DOMAIN='receiz.bank.native-asset.root-signature.v1';
export type NativeAssetDefinition=Readonly<{name:string;symbol:string;units:string;description:string;linkedProofDigest:string|null}>;
export type NativeAssetInput=
 |Readonly<{kind:'fund-asset';fundingRule:'reserve-first-then-settlement';amountUsdCents:string;definition:NativeAssetDefinition;authoredSource?:ImportedProofSourceReference}>
 |Readonly<{kind:'fund-asset';rail:'reserve'|'settlement';amountUsdCents:string;definition:NativeAssetDefinition;authoredSource?:ImportedProofSourceReference}>
 |Readonly<{kind:'send-ownership';assetDigest:string;quantityMicro:string;recipient:string}>
 |Readonly<{kind:'buy-shares';assetDigest:string;quantityMicro:string;rail:'reserve'|'settlement'}>
 |Readonly<{kind:'sell-share';assetDigest:string;quantityMicro:string;rail:'reserve'|'settlement';buyer:'bank'|'market'}>
 |Readonly<{kind:'exchange';assetDigest:string;amountUsdCents:string;rail:'reserve'|'settlement'}>
 |Readonly<{kind:'redeem-asset';assetDigest:string}>;
export type NativeAssetRequest=NativeAssetInput&Readonly<{schema:'bankeiz.operation-request.v1';applicationId:string;requestId:string;actorReceizId:string}>;
export type NativeAssetTerms=Readonly<{debitUsdCents:string;debitPhiMicro:string;creditUsdCents:string;creditPhiMicro:string;feeUsdCents:string;quantityMicro:string;assetDigest:string|null;recipient:string|null;expiresAtKaiUPulse:number;fundingComponents?:readonly NativeAssetFundingComponent[]}>;
export type NativeAssetReview=Readonly<{schema:'receiz.bank.native-asset-review.v1';request:NativeAssetRequest;keyId:string;planDigest:string;terms:NativeAssetTerms}>;
export type NativeAssetPrepared=NativeAssetReview&Readonly<{ticket:string;challengeB64Url:string}>;
export type NativeAssetReceipt=Readonly<{schema:'receiz.bank.native-asset-receipt.v1';domain:typeof ASSET_DOMAIN;issuerRootKid:string;review:NativeAssetReview;transactionId:string;kaiUPulse:string;issuedAtKaiUPulse:string;nativeAssetSourceSha256:string;actorAfter:Readonly<{balancePhiMicro:string;reserveUsdCents:string;reserveBackingPhiMicro:string}>;assetAfter:Readonly<{id:string;sourceSha256:string;supplyMicro:string;ownerQuantityMicro:string;backingRail:'reserve'|'settlement'|'composite';backingComponents?:readonly NativeAssetFundingComponent[];backingPhiMicro:string;backingUsdCents:string;status:'active'|'redeemed'}>;rootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>}>;
export type NativeAssetRefusal=Readonly<{schema:'receiz.bank.native-asset-refusal.v1';domain:typeof ASSET_DOMAIN;issuerRootKid:string;review:NativeAssetReview;reasonCode:'EXPIRED';kaiUPulse:string;rootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>}>;
export const assetSame=(a:unknown,b:unknown)=>canonicalizeReceizV122(a)===canonicalizeReceizV122(b);
export const assetHex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/u.test(v);
const integer=(v:unknown,positive=false):v is string=>typeof v==='string'&&/^(0|[1-9][0-9]{0,39})$/u.test(v)&&(!positive||v!=='0');
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x1f\x7f]/u.test(v);
function record(v:unknown,keys:readonly string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||!keys.every(k=>Object.hasOwn(v,k)))throw Error('BANK_ASSET_CLOSED_SOURCE_INVALID');return v as Record<string,unknown>;}
export function nativeAssetSupplyMicro(units:unknown):string{
 if(typeof units!=='string'||!/^\d{1,30}(\.\d{1,6})?$/u.test(units))throw Error('BANK_ASSET_SUPPLY_INVALID');const [whole,fraction='']=units.split('.'),supply=BigInt(whole)*1000000n+BigInt(fraction.padEnd(6,'0'));if(supply===0n)throw Error('BANK_ASSET_SUPPLY_INVALID');return supply.toString();
}
export function inspectNativeAssetDefinition(input:unknown):NativeAssetDefinition{
 const d=record(input,['name','symbol','units','description','linkedProofDigest']);
 if(!text(d.name,80)||d.name.trim()!==d.name||typeof d.symbol!=='string'||! /^[A-Z][A-Z0-9]{1,7}$/u.test(d.symbol)||typeof d.description!=='string'||d.description.length>2000||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(d.description)||d.linkedProofDigest!==null&&!assetHex(d.linkedProofDigest))throw Error('BANK_ASSET_DEFINITION_INVALID');nativeAssetSupplyMicro(d.units);return structuredClone(d) as NativeAssetDefinition;
}
export function inspectNativeAssetRequest(input:unknown):NativeAssetRequest{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('BANK_ASSET_REQUEST_INVALID');const v=input as Record<string,unknown>;
 const fields:Record<string,readonly string[]>={'fund-asset':[Object.hasOwn(v,'fundingRule')?'fundingRule':'rail','amountUsdCents','definition',...(Object.hasOwn(v,'authoredSource')?['authoredSource']:[])],'send-ownership':['assetDigest','quantityMicro','recipient'],'buy-shares':['assetDigest','quantityMicro','rail'],'sell-share':['assetDigest','quantityMicro','rail','buyer'],exchange:['assetDigest','amountUsdCents','rail'],'redeem-asset':['assetDigest']};
 if(typeof v.kind!=='string'||!Object.hasOwn(fields,v.kind))throw Error('BANK_ASSET_REQUEST_INVALID');record(v,['schema','applicationId','requestId','actorReceizId','kind',...fields[v.kind]]);
 if(v.schema!=='bankeiz.operation-request.v1'||typeof v.applicationId!=='string'||!/^rc_[A-Za-z0-9_-]{1,128}$/u.test(v.applicationId)||typeof v.requestId!=='string'||!/^[A-Za-z0-9._:-]{8,120}$/u.test(v.requestId)||!text(v.actorReceizId,160)||! /^[A-Za-z0-9_@.-]+$/u.test(v.actorReceizId))throw Error('BANK_ASSET_REQUEST_INVALID');
 if('fundingRule'in v&&v.fundingRule!=='reserve-first-then-settlement'||'rail'in v&&!['reserve','settlement'].includes(String(v.rail))||'assetDigest'in v&&!assetHex(v.assetDigest)||'quantityMicro'in v&&!integer(v.quantityMicro,true)||'amountUsdCents'in v&&!integer(v.amountUsdCents,true)||'recipient'in v&&(!text(v.recipient,160)||! /^[A-Za-z0-9_@.-]+$/u.test(v.recipient))||'buyer'in v&&!['bank','market'].includes(String(v.buyer)))throw Error('BANK_ASSET_REQUEST_INVALID');
 if(v.kind==='fund-asset'){const definition=inspectNativeAssetDefinition(v.definition);if(Object.hasOwn(v,'authoredSource')){const source=parseImportedProofSourceReference(v.authoredSource as ImportedProofSourceReference);if(definition.linkedProofDigest!==source.artifactSha256)throw Error('BANK_ASSET_AUTHORED_SOURCE_MISMATCH');}else if(definition.linkedProofDigest!==null)throw Error('BANK_ASSET_AUTHORED_SOURCE_REQUIRED');}return structuredClone(v) as NativeAssetRequest;
}
export function inspectNativeAssetReview(input:unknown):NativeAssetReview{
 const v=record(input,['schema','request','keyId','planDigest','terms']);if(v.schema!=='receiz.bank.native-asset-review.v1'||!assetHex(v.keyId)||!assetHex(v.planDigest))throw Error('BANK_ASSET_REVIEW_INVALID');
 const request=inspectNativeAssetRequest(v.request),t=record(v.terms,['debitUsdCents','debitPhiMicro','creditUsdCents','creditPhiMicro','feeUsdCents','quantityMicro','assetDigest','recipient','expiresAtKaiUPulse',...('fundingRule'in request?['fundingComponents']:[])]);
 if(!['debitUsdCents','debitPhiMicro','creditUsdCents','creditPhiMicro','feeUsdCents','quantityMicro'].every(k=>integer(t[k]))||!Number.isSafeInteger(t.expiresAtKaiUPulse)||Number(t.expiresAtKaiUPulse)<=0||t.assetDigest!==null&&!assetHex(t.assetDigest)||t.recipient!==null&&!text(t.recipient,160)||t.quantityMicro==='0'||t.feeUsdCents!=='0')throw Error('BANK_ASSET_REVIEW_INVALID');
 if('assetDigest'in request&&t.assetDigest!==request.assetDigest||'quantityMicro'in request&&t.quantityMicro!==request.quantityMicro||t.recipient!==(request.kind==='send-ownership'?request.recipient:null))throw Error('BANK_ASSET_REVIEW_INVALID');
 if(request.kind==='fund-asset'&&(t.assetDigest!==null||t.quantityMicro!==nativeAssetSupplyMicro(request.definition.units)||t.debitUsdCents!==request.amountUsdCents||t.debitPhiMicro==='0'||t.creditUsdCents!=='0'||t.creditPhiMicro!=='0'))throw Error('BANK_ASSET_REVIEW_INVALID');
 if(request.kind==='send-ownership'&&['debitUsdCents','debitPhiMicro','creditUsdCents','creditPhiMicro'].some(k=>t[k]!=='0'))throw Error('BANK_ASSET_REVIEW_INVALID');
 if((request.kind==='buy-shares'||request.kind==='exchange')&&(request.rail==='reserve'&&t.debitUsdCents==='0'||t.debitPhiMicro==='0'||t.creditUsdCents!=='0'||t.creditPhiMicro!=='0'||request.kind==='exchange'&&BigInt(t.debitUsdCents as string)>BigInt(request.amountUsdCents)))throw Error('BANK_ASSET_REVIEW_INVALID');
 if(['sell-share','redeem-asset'].includes(request.kind)&&(t.debitUsdCents!=='0'||t.debitPhiMicro!=='0'||t.creditPhiMicro==='0'))throw Error('BANK_ASSET_REVIEW_INVALID');
 if('fundingRule'in request)inspectNativeAssetFundingComponents(t.fundingComponents,{amountUsdCents:t.debitUsdCents as string,amountPhiMicro:t.debitPhiMicro as string});
 return structuredClone(v) as NativeAssetReview;
}
export const nativeAssetChallenge=(review:NativeAssetReview)=>receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122({schema:'receiz.bank.native-asset-consent.v1',review:inspectNativeAssetReview(review)})));
export function nativeAssetReviewFromChallenge(challenge:string):NativeAssetReview{
 if(typeof challenge!=='string'||challenge.length>20000)throw Error('BANK_ASSET_CONSENT_INVALID');const raw=new TextDecoder('utf-8',{fatal:true}).decode(receizBase64UrlDecode(challenge)),v=record(JSON.parse(raw),['schema','review']);if(v.schema!=='receiz.bank.native-asset-consent.v1'||canonicalizeReceizV122(v)!==raw)throw Error('BANK_ASSET_CONSENT_INVALID');return inspectNativeAssetReview(v.review);
}
export function inspectNativeAssetReceipt(input:unknown):NativeAssetReceipt{
 const v=record(input,['schema','domain','issuerRootKid','review','transactionId','kaiUPulse','issuedAtKaiUPulse','nativeAssetSourceSha256','actorAfter','assetAfter','rootSignature']);
 if(v.schema!=='receiz.bank.native-asset-receipt.v1'||v.domain!==ASSET_DOMAIN||!text(v.issuerRootKid,256)||!assetHex(v.nativeAssetSourceSha256)||!integer(v.kaiUPulse)||!integer(v.issuedAtKaiUPulse)||BigInt(v.issuedAtKaiUPulse)<BigInt(v.kaiUPulse)||!text(v.transactionId,128))throw Error('BANK_ASSET_RECEIPT_INVALID');const review=inspectNativeAssetReview(v.review);
 const a=record(v.actorAfter,['balancePhiMicro','reserveUsdCents','reserveBackingPhiMicro']),asset=record(v.assetAfter,['id','sourceSha256','supplyMicro','ownerQuantityMicro','backingRail','backingPhiMicro','backingUsdCents','status',...(v.assetAfter&&typeof v.assetAfter==='object'&&Object.hasOwn(v.assetAfter,'backingComponents')?['backingComponents']:[])]),signature=record(v.rootSignature,['kid','alg','sig']);
 if(!Object.values(a).every(x=>integer(x))||BigInt(a.reserveBackingPhiMicro as string)>BigInt(a.balancePhiMicro as string)||!text(asset.id,128)||!assetHex(asset.sourceSha256)||!['supplyMicro','ownerQuantityMicro','backingPhiMicro','backingUsdCents'].every(k=>integer(asset[k]))||BigInt(asset.ownerQuantityMicro as string)>BigInt(asset.supplyMicro as string)||!['reserve','settlement','composite'].includes(String(asset.backingRail))||!['active','redeemed'].includes(String(asset.status))||asset.status==='redeemed'&&['supplyMicro','backingPhiMicro','backingUsdCents'].some(k=>asset[k]!=='0')||signature.kid!==v.issuerRootKid||signature.alg!=='Ed25519'||typeof signature.sig!=='string'||!/^[A-Za-z0-9_-]{86}$/u.test(signature.sig))throw Error('BANK_ASSET_RECEIPT_INVALID');inspectNativeAssetBacking(asset);if(review.request.kind==='fund-asset'&&('fundingRule'in review.request? !assetSame(asset.backingComponents,review.terms.fundingComponents):Object.hasOwn(asset,'backingComponents')))throw Error('BANK_ASSET_RECEIPT_INVALID');return structuredClone(v) as NativeAssetReceipt;
}
export function inspectNativeAssetRefusal(input:unknown):NativeAssetRefusal{
 const v=record(input,['schema','domain','issuerRootKid','review','reasonCode','kaiUPulse','rootSignature']),s=record(v.rootSignature,['kid','alg','sig']);const review=inspectNativeAssetReview(v.review);
 if(v.schema!=='receiz.bank.native-asset-refusal.v1'||v.domain!==ASSET_DOMAIN||v.reasonCode!=='EXPIRED'||!integer(v.kaiUPulse)||BigInt(v.kaiUPulse)<BigInt(review.terms.expiresAtKaiUPulse)||!text(v.issuerRootKid,256)||s.kid!==v.issuerRootKid||s.alg!=='Ed25519'||typeof s.sig!=='string'||!/^[A-Za-z0-9_-]{86}$/u.test(s.sig))throw Error('BANK_ASSET_REFUSAL_INVALID');return structuredClone(v) as NativeAssetRefusal;
}

import {loadReceiz} from './client';
import type {ReceizIdentityPublicBinding} from '@receiz/sdk';
import {verifyNativeAssetHoldingSignature,type NativeAssetHolding} from './native-asset-holding-protocol';
import type {HeldDeposit} from './deposit-source';
export interface VerifiedNativeHolding {certificate:NativeAssetHolding;deposit:HeldDeposit;}
/** An accepted position certificate is read beneath canonical v129 verification.
 * It cannot confer title or replace current execution-source admission. */
export async function openNativeAssetHolding(bytes:Uint8Array,filename:string,owner:Pick<ReceizIdentityPublicBinding,'keyId'|'artifactOwnerReceizId'>):Promise<VerifiedNativeHolding>{
 const sdk=await loadReceiz(),opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(bytes)],filename,{type:'application/vnd.receiz.bundle+json'}));
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes),parsed=JSON.parse(raw),certificate=await verifyNativeAssetHoldingSignature(parsed);
 if(!certificate||sdk.canonicalizeReceizV122(certificate)!==raw||opened.sealedArtifact.kind!=='receiz.native-record-seal'||opened.sealedArtifact.continuity.ownerReceizId!==owner.artifactOwnerReceizId||certificate.holder.receizId!==owner.artifactOwnerReceizId||certificate.holder.keyId!==owner.keyId||opened.sealedArtifact.continuity.recordId!==`record:${opened.verifiedPayload.sha256}`||String(opened.verification.bundle?.kaiPulseEternal)!==(BigInt(certificate.issuedAtKaiUPulse)/1000000n).toString()||BigInt(certificate.issuedAtKaiUPulse)>BigInt(sdk.receizKaiNow().uPulse))throw Error('BANK_ASSET_HOLDING_UNVERIFIED');
 const a=certificate.asset;
 return {certificate,deposit:{digest:opened.sealedArtifact.artifactSha256,filename,title:a.definition.name,kind:'proof',status:'held-proof',pulse:(BigInt(certificate.issuedAtKaiUPulse)/1000000n).toString(),bytes:new Uint8Array(bytes),executionDigest:a.headSourceSha256,nativeAsset:{assetId:a.id,quantityMicro:a.quantityMicro,lockedQuantityMicro:a.lockedAskQuantityMicro,supplyMicro:a.supplyMicro,symbol:a.definition.symbol,backingRail:a.backingRail,...(Object.hasOwn(a,'backingComponents')?{backingComponents:a.backingComponents}:{}),backingUsdCents:a.backingUsdCents,backingPhiMicro:a.backingPhiMicro,status:a.status,sourceKaiUPulse:a.headKaiUPulse,issuedAtKaiUPulse:certificate.issuedAtKaiUPulse}}};
}
export function selectNativeAssetHoldings(sources:readonly HeldDeposit[]):HeldDeposit[]{
 const current=new Map<string,HeldDeposit>(),other:HeldDeposit[]=[];
 for(const source of sources){const a=source.nativeAsset;if(!a){other.push(source);continue;}const prior=current.get(a.assetId);
  if(!prior||BigInt(a.sourceKaiUPulse)>BigInt(prior.nativeAsset!.sourceKaiUPulse)||a.sourceKaiUPulse===prior.nativeAsset!.sourceKaiUPulse&&source.executionDigest===prior.executionDigest&&BigInt(a.issuedAtKaiUPulse)>BigInt(prior.nativeAsset!.issuedAtKaiUPulse))current.set(a.assetId,source);
  else if(a.sourceKaiUPulse===prior.nativeAsset!.sourceKaiUPulse&&source.executionDigest!==prior.executionDigest)throw Error('BANK_ASSET_HOLDING_CONFLICT');
 }
 return [...other,...[...current.values()].filter(v=>v.nativeAsset!.status==='active'&&BigInt(v.nativeAsset!.quantityMicro)+BigInt(v.nativeAsset!.lockedQuantityMicro)>0n)];
}

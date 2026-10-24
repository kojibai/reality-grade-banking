import {custodyBytes} from './custody';
import type {VaultAssetPosition,VaultAssetTitleStep} from './assetSource';
import type {VaultAssetAuthoredOriginal} from './assetOriginal';
/** Operational ceiling for the fixed canonical proof metadata of these new
 * selective asset packets. Original/media bytes are accounted separately. */
export const VAULT_ASSET_PROOF_METADATA_MAX_BYTES=64*1024;
const b64=(n:number)=>Math.ceil(n*4/3),n='9'.repeat(40),h='f'.repeat(64),kid='\u0000'.repeat(256),uuid='f'.repeat(36);
/** No payload/placeholder allocation proportional to the reserved byte count.
 * Measurements retain exact immutable definitions/references. A new account's
 * two holder quantities can each grow from1to40digits (78bytes/oldstep).
 * One maximum closed send-ownership step is added. Receipt/request schema fields
 * have no authored media; their actual worst-width closed forms are measured. */
export function vaultAssetSourceReservation(input:Readonly<{asset:VaultAssetPosition;authoredSource:unknown;authoredOwnerReceizId:string|null;authoredOriginal:VaultAssetAuthoredOriginal|null;lineage:readonly VaultAssetTitleStep[]}>){
 const currentLineageBytes=custodyBytes(input.lineage).length,currentLineageSteps=input.lineage.length;
 if(!currentLineageSteps||currentLineageSteps>100000)throw Error('VAULT_ASSET_SOURCE_INVALID');
 // A valid retained source at the existing execution ceiling stays readable.
 // Its prospective budget deliberately cannot fit any bounded private carrier.
 if(currentLineageSteps===100000)return {currentLineageBytes,currentLineageSteps,reservedSourceBytes:Number.MAX_SAFE_INTEGER};
 const step={nativeSourceSha256:h,predecessorAssetSourceSha256:h,operation:'send-ownership',beforeQuantityMicro:n,afterQuantityMicro:n,acceptedAtKaiUPulse:n,supplyMicro:n,backingPhiMicro:n,backingUsdCents:n,status:'redeemed'};
 const asset={...input.asset,quantityMicro:n,lockedAskQuantityMicro:n,headSourceSha256:h,headKaiUPulse:n};
 const signature={kid,alg:'Ed25519',sig:'a'.repeat(86)},title={schema:'receiz.bank.vault-asset-title.v1',domain:'receiz.bank.vault-asset-title.root-signature.v1',vaultId:'v'.repeat(120),applicationId:'r'.repeat(131),ownerReceizId:'o'.repeat(40),accountId:uuid,keyId:h,asset,authoredSource:input.authoredSource,authoredOwnerReceizId:input.authoredOwnerReceizId,lineage:[],issuedAtKaiUPulse:n,issuerRootKid:kid,rootSignature:signature};
 const titlePayloadMax=custodyBytes(title).length+currentLineageBytes+78*currentLineageSteps+custodyBytes(step).length+1;
 const envelope=(payload:number)=>b64(payload)+VAULT_ASSET_PROOF_METADATA_MAX_BYTES+custodyBytes({kind:'receiz.bundle.v1',manifest:{filename:'vault-asset.receizbundle.json',mime:'application/json',basisSha256:h,createdAt:Number.MAX_SAFE_INTEGER,version:1},originalBase64:'',proofbundle:{}}).length;
 const authoredOriginal=input.authoredOriginal===null?null:{reference:input.authoredOriginal.reference,ownerReceizId:input.authoredOriginal.ownerReceizId,blocks:input.authoredOriginal.blocks.map(b=>({reference:b.reference,sourceRef:h}))};
 const titleDescriptorShell=custodyBytes({schema:'bank.vault.asset-native-packet.v1',packetSha256:h,packet:{schema:'receiz.bank.vault-asset-source.v1',source:{filename:'vault-asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',artifactSha256:h,exactBytesB64u:''},authoredOriginal}}).length;
 const request={schema:'bankeiz.operation-request.v1',applicationId:'r'.repeat(131),requestId:'r'.repeat(120),actorReceizId:'r'.repeat(160),kind:'send-ownership',assetDigest:h,quantityMicro:n,recipient:'r'.repeat(160)},terms={debitUsdCents:n,debitPhiMicro:n,creditUsdCents:n,creditPhiMicro:n,feeUsdCents:n,quantityMicro:n,assetDigest:h,recipient:'r'.repeat(160),expiresAtKaiUPulse:Number.MAX_SAFE_INTEGER},review={schema:'receiz.bank.native-asset-review.v1',request,keyId:h,planDigest:h,terms};
 const receipt={schema:'receiz.bank.native-asset-receipt.v1',domain:'receiz.bank.native-asset.root-signature.v1',issuerRootKid:kid,review,transactionId:'r'.repeat(128),kaiUPulse:n,issuedAtKaiUPulse:n,nativeAssetSourceSha256:h,actorAfter:{balancePhiMicro:n,reserveUsdCents:n,reserveBackingPhiMicro:n},assetAfter:{id:'r'.repeat(128),sourceSha256:h,supplyMicro:n,ownerQuantityMicro:n,backingRail:'composite',backingPhiMicro:n,backingUsdCents:n,status:'redeemed',backingComponents:[{rail:'settlement',amountUsdCents:n,amountPhiMicro:n},{rail:'settlement',amountUsdCents:n,amountPhiMicro:n}]},rootSignature:signature};
 const resultShell=custodyBytes({schema:'receiz.bank.native-asset-result.v1',status:'committed',source:{filename:'native-asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',artifactSha256:h,exactBytesB64u:''}}).length;
 // Each retained descriptor/result itself becomes a base64 exact-byte block.
 //65536ASCII ticket +32768request/proofs/state metadata includes2review challenges.
 const reservedSourceBytes=b64(titleDescriptorShell+b64(envelope(titlePayloadMax)))+b64(resultShell+b64(envelope(custodyBytes(receipt).length)))+65536+32768+1024;
 if(!Number.isSafeInteger(reservedSourceBytes))throw Error('VAULT_ASSET_ORIGINAL_EXECUTION_CAPACITY');return {currentLineageBytes,currentLineageSteps,reservedSourceBytes};
}

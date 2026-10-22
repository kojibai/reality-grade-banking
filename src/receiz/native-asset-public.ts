import {loadReceiz} from './client';
import {verifyNativeAssetPublicSignature} from './native-asset-holding-protocol';
/** A public snapshot describes an existing asset; it never admits a position,
 * authorizes an operation, or replaces a current offer. */
export async function openNativeAssetPublic(bytes:Uint8Array,filename='native-asset-public.receizbundle'){
 const sdk=await loadReceiz(),opened=await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(bytes)],filename,{type:'application/vnd.receiz.bundle+json'}));
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes),certificate=await verifyNativeAssetPublicSignature(JSON.parse(raw));
 if(!certificate||sdk.canonicalizeReceizV122(certificate)!==raw||opened.sealedArtifact.kind!=='receiz.native-record-seal'||opened.sealedArtifact.continuity.ownerReceizId!==certificate.asset.id||opened.sealedArtifact.continuity.recordId!==`record:${opened.verifiedPayload.sha256}`||String(opened.verification.bundle?.kaiPulseEternal)!==(BigInt(certificate.issuedAtKaiUPulse)/1000000n).toString()||BigInt(certificate.issuedAtKaiUPulse)>BigInt(sdk.receizKaiNow().uPulse))throw Error('BANK_NATIVE_ASSET_PUBLIC_UNVERIFIED');
 return{certificate,artifactSha256:opened.sealedArtifact.artifactSha256};
}

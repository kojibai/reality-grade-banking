import {readVerifiedReceizDocumentBytesCanonical} from '../../../../packages/receiz-sdk/src/verifier/canonical';
import {verifyNativeAssetPublicSignature} from './nativeAssetHolding';
import type {ReceizSignatureV4RootPublicKey} from '../../../../packages/receiz-sdk/src/verifier/signatureV4';
import {receizCurrentPinnedSignatureV4Roots} from '../../../../packages/receiz-sdk/src/verifier/roots';
import {sha256} from '@noble/hashes/sha2.js';import {bytesToHex} from '@noble/hashes/utils.js';import {canonicalizeReceizV122} from '../../../../packages/receiz-sdk/src/v122Canonical';
export async function readNativeAssetPublicArtifact(bytes:Uint8Array,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>=receizCurrentPinnedSignatureV4Roots()){
 if(bytes.length>8*1024*1024)throw Error('BANK_NATIVE_ASSET_PUBLIC_CAPACITY');
 const opened=await readVerifiedReceizDocumentBytesCanonical({fileBytes:bytes,filename:'native-asset-public.receizbundle',mime:'application/vnd.receiz.bundle+json',signatureV4RootPublicKeys:roots});
 if(!opened.ok||!opened.verification.integrity.ok)throw Error('BANK_NATIVE_ASSET_PUBLIC_UNVERIFIED');const raw=new TextDecoder('utf-8',{fatal:true}).decode(opened.payloadBytes),certificate=await verifyNativeAssetPublicSignature(JSON.parse(raw),roots),record=opened.verification.bundle?.nativeRecordSeal as Readonly<{ownerReceizId?:unknown;recordId?:unknown}>|null|undefined;
 if(!certificate||canonicalizeReceizV122(certificate)!==raw||String(opened.verification.bundle?.kaiPulseEternal)!==(BigInt(certificate.issuedAtKaiUPulse)/1000000n).toString()||!record||record.ownerReceizId!==certificate.asset.id||record.recordId!==`record:${bytesToHex(sha256(opened.payloadBytes))}`)throw Error('BANK_NATIVE_ASSET_PUBLIC_UNVERIFIED');
 return{certificate,artifactSha256:bytesToHex(sha256(bytes))};
}

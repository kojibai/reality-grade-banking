import {expect,it} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonicalizeReceizV122} from '@receiz/sdk';
import {inspectNativeAssetHolding,verifyNativeAssetPublicSignature,inspectNativeAssetPublicProjection,NATIVE_ASSET_PUBLIC_DOMAIN} from '../src/receiz/native-asset-holding-protocol';
it('verifies only a closed public asset snapshot and rejects private fields, tampering and private holding reads',async()=>{
 const pair=generateKeyPairSync('ed25519'),kid='test.public.asset',root={kid,alg:'Ed25519' as const,publicKeyRawB64u:pair.publicKey.export({format:'jwk'}).x!,status:'active' as const};
 const payload={schema:'receiz.bank.native-asset-public.v1',domain:NATIVE_ASSET_PUBLIC_DOMAIN,issuerRootKid:kid,asset:{id:'a'.repeat(64),definition:{name:'A complete work',symbol:'WORK',supplyMicro:'10000000',description:'The original work',linkedProofDigest:'b'.repeat(64)},supplyMicro:'10000000',backingRail:'reserve',backingUsdCents:'100',backingPhiMicro:'500000',status:'active',issuanceSourceSha256:'c'.repeat(64),headSourceSha256:'c'.repeat(64),headKaiUPulse:'100000000'},issuedAtKaiUPulse:'100000001'};
 const certificate={...payload,rootSignature:{kid,alg:'Ed25519',sig:sign(null,Buffer.from(canonicalizeReceizV122(payload)),pair.privateKey).toString('base64url')}};
 expect(await verifyNativeAssetPublicSignature(certificate,new Map([[kid,root]]))).toEqual(certificate);
 expect(()=>inspectNativeAssetHolding(certificate)).toThrow();expect(()=>inspectNativeAssetPublicProjection({...certificate,holder:{accountId:'private'}})).toThrow();
 expect(await verifyNativeAssetPublicSignature({...certificate,asset:{...certificate.asset,backingUsdCents:'101'}},new Map([[kid,root]]))).toBeNull();
 expect(await verifyNativeAssetPublicSignature({...certificate,asset:{...certificate.asset,quantityMicro:'1'}},new Map([[kid,root]]))).toBeNull();
});

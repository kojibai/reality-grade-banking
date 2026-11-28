import {expect,it,vi} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {canonicalizeReceizV122} from '@receiz/sdk';
import {inspectNativeAssetHolding,verifyNativeAssetPublicSignature,inspectNativeAssetPublicProjection,NATIVE_ASSET_PUBLIC_DOMAIN} from '../src/receiz/native-asset-holding-protocol';
import {openNativeAssetPublic} from '../src/receiz/native-asset-public';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';

const synthetic=vi.hoisted(()=>({roots:new Map<string,unknown>(),sdk:null as unknown}));
vi.mock('../native/receiz/packages/receiz-sdk/src/verifier/roots',async importOriginal=>({
 ...await importOriginal<Record<string,unknown>>(),receizCurrentPinnedSignatureV4Roots:()=>synthetic.roots,
}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>synthetic.sdk}));
it('verifies only a closed public asset snapshot and rejects private fields, tampering and private holding reads',async()=>{
 const pair=generateKeyPairSync('ed25519'),kid='test.public.asset',root={kid,alg:'Ed25519' as const,publicKeyRawB64u:pair.publicKey.export({format:'jwk'}).x!,status:'active' as const};
 const payload={schema:'receiz.bank.native-asset-public.v1',domain:NATIVE_ASSET_PUBLIC_DOMAIN,issuerRootKid:kid,asset:{id:'a'.repeat(64),definition:{name:'A complete work',symbol:'WORK',supplyMicro:'10000000',description:'The original work',linkedProofDigest:'b'.repeat(64)},supplyMicro:'10000000',backingRail:'reserve',backingUsdCents:'100',backingPhiMicro:'500000',status:'active',issuanceSourceSha256:'c'.repeat(64),headSourceSha256:'c'.repeat(64),headKaiUPulse:'100000000'},issuedAtKaiUPulse:'100000001'};
 const certificate={...payload,rootSignature:{kid,alg:'Ed25519',sig:sign(null,Buffer.from(canonicalizeReceizV122(payload)),pair.privateKey).toString('base64url')}};
 expect(await verifyNativeAssetPublicSignature(certificate,new Map([[kid,root]]))).toEqual(certificate);
 expect(()=>inspectNativeAssetHolding(certificate)).toThrow();expect(()=>inspectNativeAssetPublicProjection({...certificate,holder:{accountId:'private'}})).toThrow();
 expect(await verifyNativeAssetPublicSignature({...certificate,asset:{...certificate.asset,backingUsdCents:'101'}},new Map([[kid,root]]))).toBeNull();
 expect(await verifyNativeAssetPublicSignature({...certificate,asset:{...certificate.asset,quantityMicro:'1'}},new Map([[kid,root]]))).toBeNull();
});

it('opens the exact signed asset-coordinate certificate used by connected currency publication',async()=>{
 const fixture=await conformanceOfflineFixture({account:true,composer:true}),sdk=fixture.runtime;
 synthetic.roots=new Map(fixture.roots.map(root=>[root.kid,root]));synthetic.sdk=sdk;
 const seal=await sdk.createBankNativeNoteSealer({enrollment:await fixture.store.load(),resources:fixture.resources});
 const id='a'.repeat(64),issuedAtKaiUPulse=String(sdk.receizKaiNow().uPulse);
 const authoredSource={schema:'receiz.imported-proof-source.v1',artifactSha256:'b'.repeat(64),byteLength:2,filename:'authored.receizbundle',
  mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'e'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
 const payload={schema:'receiz.bank.native-asset-public.v1',domain:NATIVE_ASSET_PUBLIC_DOMAIN,issuerRootKid:fixture.roots[0].kid,
  asset:{id,definition:{name:'Spotlight',symbol:'SPT',supplyMicro:'1000000',description:'The existing Original',linkedProofDigest:authoredSource.artifactSha256},
   supplyMicro:'1000000',backingRail:'reserve',backingUsdCents:'0',backingPhiMicro:'0',status:'active',
   currency:{policy:{kind:'fixed-reserve-pool',priceUsdCentsPerUnit:'3',preset:'currency',issuerControls:true,quantityIncrementMicro:'1000'},
    issuerAccountId:'00000000-0000-4000-8000-000000000001',salesPaused:false,availableQuantityMicro:'1000000',
    liquidityReserveUsdCents:'0',liquidityReservePhiMicro:'0',liquiditySettlementPhiMicro:'0'},
   issuanceSourceSha256:'c'.repeat(64),headSourceSha256:'c'.repeat(64),headKaiUPulse:issuedAtKaiUPulse},issuedAtKaiUPulse};
 const signature=await fixture.signFinancial(new TextEncoder().encode(canonicalizeReceizV122(payload)));
 const certificate={...payload,rootSignature:{kid:signature.kid,alg:signature.alg,sig:signature.sig}};
 const fileBytes=new TextEncoder().encode(canonicalizeReceizV122(certificate));
 const sealFor=async(ownerReceizId:string)=>(await seal({fileBytes,filename:'native-asset-public.json',mime:'application/json',kaiUpulse:issuedAtKaiUPulse,
  options:{forceBundleEnvelope:true,nativeRecordSeal:{ownerReceizId,recordId:'record:'+await sdk.sha256ReceizBytes(fileBytes)}}})).artifactBytes as Uint8Array;
 const exact=await sealFor(id);
 const artifactSha256=await sdk.sha256ReceizBytes(exact);
 await expect(openNativeAssetPublic(exact)).resolves.toEqual({certificate,artifactSha256});
 const ownerReceizId='artist.receiz.id';
 const content=new Blob([JSON.stringify({schema:'receiz.bank.asset-content.v2',ownerReceizId,title:'Spotlight',description:'The existing Original',
  kind:'moment',longForm:'',files:[],nativeAsset:{authoredSource,publicCertificateB64u:sdk.receizBase64UrlEncode(exact),publicCertificateSha256:artifactSha256}})],{type:'application/json'});
 await expect(sdk.readBankAssetContent(content,ownerReceizId)).resolves.toMatchObject({nativeAsset:{id,publicCertificateSha256:artifactSha256,currency:{symbol:'SPT',preset:'currency',priceUsdCentsPerUnit:'3'}}});
 await expect(openNativeAssetPublic(await sealFor('d'.repeat(64)))).rejects.toThrow('BANK_NATIVE_ASSET_PUBLIC_UNVERIFIED');
},60000);

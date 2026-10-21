import {describe,it,expect} from 'vitest';
import {inspectAccountStatement} from '../src/receiz/account-proof-statement';
const h=(c:string)=>c.repeat(64);
function source(){return {schema:'bankeiz.public-account-statement.v4',applicationId:'rc_test',domain:'receiz.bank.native-account-statement.root-signature.v2',issuerRootKid:'root',rootSignature:{kid:'root',alg:'Ed25519',sig:'s'.repeat(86)},
 account:{receizId:'owner.receiz.id',keyId:h('a'),alg:'Ed25519',publicKeyRawB64u:'AQID'},
 checkpoint:{accountHead:h('a'),identityBindingDigest:h('b'),genesisHead:h('c'),historyHead:h('c'),transactionCount:0,kaiUPulse:'100',reserveUsdCents:'0',settlementPhiMicro:'0',balancePhiMicro:'0',usdPerPhiMicrocents:'1',historyDigest:h('d')},transactions:[],
 sourceFrontier:{schema:'receiz.bank.account-source-frontier.v1',authorizationHead:h('a'),walletHead:h('b'),lawfulInventoryHead:h('c'),accountHistoryHead:h('c'),assetHistoryDigest:h('d'),assetHeads:[],artifactSourceHead:h('e'),offlineSourceHead:h('f')},
 components:{lawfulValues:[],assets:[],assetOffers:[],artifactIntrinsicPhiMicro:'900',offlineLockedPhiMicro:'400',offlineLockedUsdCents:'10'}};}
describe('account source closures',()=>{
 it('carries exact mixed asset backing without changing historical proof encodings',()=>{
  const v=source(),assetId=h('a'),head=h('b'),backingComponents=[{rail:'reserve',amountUsdCents:'6000',amountPhiMicro:'3000000'},{rail:'settlement',amountUsdCents:'4000',amountPhiMicro:'2000000'}];
  Object.assign(v.sourceFrontier,{assetHeads:[{assetId,sourceSha256:head}]});Object.assign(v.components,{assets:[{assetId,name:'Unit',symbol:'UNIT',description:'',linkedProofDigest:null,supplyMicro:'100',quantityMicro:'100',backingRail:'composite',backingPhiMicro:'5000000',backingUsdCents:'10000',backingComponents,status:'active',issuanceSourceSha256:h('c'),headSourceSha256:head}]});
  expect(JSON.stringify(inspectAccountStatement(v,'rc_test'))).toBe(JSON.stringify(v));
  const invalid=structuredClone(v);Object.assign(invalid.components.assets[0],{backingComponents:[]});expect(()=>inspectAccountStatement(invalid,'rc_test')).toThrow();
 });
 it('keeps original-source value and outstanding Note funding separate from cash',()=>{
  const proof=inspectAccountStatement(source(),'rc_test');expect(proof.schema).toBe('bankeiz.public-account-statement.v4');
  expect(proof.checkpoint.balancePhiMicro).toBe('0');expect(proof.components!.offlineLockedPhiMicro).toBe('400');
 });
 it('requires actual source heads for nonzero source components and rejects private data',()=>{
  for(const field of ['artifactSourceHead','offlineSourceHead'] as const){const v=source();(v.sourceFrontier[field] as string|null)=null;expect(()=>inspectAccountStatement(v,'rc_test')).toThrow(/SOURCE_CLOSURE/);}
  const v=source();Object.assign(v.components,{privateArchive:'secret'});expect(()=>inspectAccountStatement(v,'rc_test')).toThrow(/PRIVATE_OR_UNSUPPORTED/);
 });
 it('preserves retained v3 inspection without changing its original contract',()=>{
  const v=source();v.schema='bankeiz.public-account-statement.v3';v.components.artifactIntrinsicPhiMicro='0';v.components.offlineLockedPhiMicro='0';v.components.offlineLockedUsdCents='0';expect(inspectAccountStatement(v,'rc_test').schema).toBe('bankeiz.public-account-statement.v3');
 });
 it('requires the real native signature over every closure component and the frontier',async()=>{
  const sdk=await import('@receiz/sdk'),{verifyBankNativeAccountStatementSignature:verify}=await import('../src/receiz/account-proof-signature');
  const key=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']) as CryptoKeyPair;
  const publicKeyRawB64u=sdk.receizBase64UrlEncode(new Uint8Array(await crypto.subtle.exportKey('raw',key.publicKey)));
  const v=source();v.account.publicKeyRawB64u=publicKeyRawB64u;v.account.keyId=await sdk.deriveReceizIdentityKeyIdFromPublicKeyRawB64u(publicKeyRawB64u,'Ed25519');
  v.checkpoint.accountHead=await sdk.digestReceizCanonicalV122(v.sourceFrontier);v.checkpoint.identityBindingDigest=await sdk.digestReceizCanonicalV122(v.account);v.checkpoint.historyDigest=await sdk.digestReceizCanonicalV122(v.transactions);
  const {rootSignature:ignored,...payload}=v;void ignored;
  v.rootSignature.sig=sdk.receizBase64UrlEncode(new Uint8Array(await crypto.subtle.sign('Ed25519',key.privateKey,new TextEncoder().encode(sdk.canonicalizeReceizConstitution(payload)))));
  const roots=new Map([['root',{kid:'root',alg:'Ed25519' as const,publicKeyRawB64u,status:'active' as const}]]);
  expect(await verify(v,'rc_test',roots)).not.toBeNull();
  const changed=structuredClone(v);changed.components.offlineLockedPhiMicro='401';expect(await verify(changed,'rc_test',roots)).toBeNull();
  const detached=structuredClone(v);detached.sourceFrontier.artifactSourceHead=h('a');expect(await verify(detached,'rc_test',roots)).toBeNull();
  expect(await verify(v,'rc_test',new Map())).toBeNull();
 });
});

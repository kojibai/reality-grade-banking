import {expect,it} from 'vitest';
import {createReceizIdentityKeyFile,signReceizIdentityLoginProof,canonicalizeReceizV122,digestReceizCanonicalV122} from '@receiz/sdk';
import {verifyPbiAccountBindingStatement,verifyPbiAccountCredentialStatement} from '../src/receiz/pbi-account-source';

it('admits only the original root-signed binding to the exact recovered account, local key and fresh signed request',async()=>{
 const {keyFile:root}=await createReceizIdentityKeyFile({owner:{uid:'root'}}),{keyFile:device}=await createReceizIdentityKeyFile({owner:{uid:'device'}});
 const request={keyId:device.keyId,alg:device.alg,publicKeyRawB64u:device.crypto.publicKeyRawB64u,localUid:'device',challengeB64Url:'Y2hhbGxlbmdl',signatureB64Url:'c2lnbmF0dXJl',next:'/account'};
 const effect={id:'binding',keyId:device.keyId,localUid:'device',publicKeyRawB64u:device.crypto.publicKeyRawB64u,deviceName:null,boundAt:'2026-10-24T00:00:00Z',lastUsedAt:'2026-10-24T00:00:00Z',revokedAt:null,createdAt:'2026-10-24T00:00:00Z'};
 const acceptedInputSha256=await digestReceizCanonicalV122(request),payload={schema:'receiz.account-device-binding.v1',domain:'receiz.account-device-binding.root-signature.v1',issuerRootKid:'test-root',accountId:'original-account',operation:'identity.device.bind',acceptedInputSha256,predecessorSourceSha256:'a'.repeat(64),acceptedAtKaiPulse:'100',admissionEvidenceSha256:[acceptedInputSha256],effect};
 const signed=await signReceizIdentityLoginProof({keyFile:root,challengeText:canonicalizeReceizV122(payload)});
 const statement={...payload,rootSignature:{kid:'test-root',alg:'Ed25519',sig:signed.signatureB64Url}};
 const roots=new Map([['test-root',{kid:'test-root',alg:'Ed25519' as const,status:'active' as const,publicKeyRawB64u:root.crypto.publicKeyRawB64u}]]);
 const expected={accountUid:'original-account',request};
 expect(await verifyPbiAccountBindingStatement(statement,expected,roots)).toEqual(statement);
 for(const changed of [{...statement,accountId:'other-account'},{...statement,effect:{...effect,keyId:'f'.repeat(64)}},{...statement,acceptedInputSha256:'0'.repeat(64)},{...statement,effect:{...effect,revokedAt:'2026-10-24T00:01:00Z'}},{...statement,session:{uid:'original-account'}},{uid:'original-account'}])expect(await verifyPbiAccountBindingStatement(changed,expected,roots)).toBeNull();
 expect(await verifyPbiAccountBindingStatement(statement,{...expected,request:{...request,challengeB64Url:'b3RoZXI'}},roots)).toBeNull();
 expect(await verifyPbiAccountBindingStatement(statement,expected,new Map())).toBeNull();
});
it('accepts a newly connected native credential only for the exact already active account',async()=>{
 const {keyFile:root}=await createReceizIdentityKeyFile({owner:{uid:'root'}});
 const payload={schema:'receiz.account-credential.v1',domain:'receiz.account-credential.root-signature.v1',issuerRootKid:'test-root',accountId:'original-account',operation:'identity.credential.register',acceptedInputSha256:'a'.repeat(64),predecessorSourceSha256:'b'.repeat(64),acceptedAtKaiPulse:'100',admissionEvidenceSha256:['a'.repeat(64)],effect:{id:'credential-source',credentialId:'new-credential',publicKeyPem:'-----BEGIN PUBLIC KEY-----\nsource\n-----END PUBLIC KEY-----',legacyCredentialId:'new-credential',createdAt:'2026-10-24T00:00:00Z',lastUsedAt:'2026-10-24T00:00:00Z',signCount:0,signCountUpdatedAt:'2026-10-24T00:00:00Z',cloneDetectedAt:null}};
 const signed=await signReceizIdentityLoginProof({keyFile:root,challengeText:canonicalizeReceizV122(payload)}),statement={...payload,rootSignature:{kid:'test-root',alg:'Ed25519',sig:signed.signatureB64Url}};
 const roots=new Map([['test-root',{kid:'test-root',alg:'Ed25519' as const,status:'active' as const,publicKeyRawB64u:root.crypto.publicKeyRawB64u}]]),expected={accountUid:'original-account',credentialId:'new-credential'};
 expect(await verifyPbiAccountCredentialStatement(statement,expected,roots)).toEqual(statement);
 expect(await verifyPbiAccountCredentialStatement(statement,{...expected,accountUid:'another-account'},roots)).toBeNull();expect(await verifyPbiAccountCredentialStatement(statement,{...expected,credentialId:'older-credential'},roots)).toBeNull();expect(await verifyPbiAccountCredentialStatement({...statement,effect:{...payload.effect,cloneDetectedAt:'2026-10-24T00:01:00Z'}},expected,roots)).toBeNull();
});
it.each(['identity.credential.use','identity.credential.counter','identity.credential.pbi-upsert','identity.credential.counter-observation'])('admits a genuine current credential lifecycle original after %s',async operation=>{
 const {keyFile:root}=await createReceizIdentityKeyFile({owner:{uid:'root'}});
 const payload={schema:'receiz.account-credential.v1',domain:'receiz.account-credential.root-signature.v1',issuerRootKid:'root',accountId:'account',operation,acceptedInputSha256:'a'.repeat(64),predecessorSourceSha256:'b'.repeat(64),acceptedAtKaiPulse:'100',admissionEvidenceSha256:['a'.repeat(64)],effect:{id:'id',credentialId:'credential',publicKeyPem:'-----BEGIN PUBLIC KEY-----\nsource\n-----END PUBLIC KEY-----',legacyCredentialId:'credential',createdAt:'2026-10-24T00:00:00Z',lastUsedAt:'2026-10-25T00:00:00Z',signCount:2,signCountUpdatedAt:'2026-10-25T00:00:00Z',cloneDetectedAt:null}};
 const signed=await signReceizIdentityLoginProof({keyFile:root,challengeText:canonicalizeReceizV122(payload)}),statement={...payload,rootSignature:{kid:'root',alg:'Ed25519',sig:signed.signatureB64Url}},roots=new Map([['root',{kid:'root',alg:'Ed25519' as const,status:'active' as const,publicKeyRawB64u:root.crypto.publicKeyRawB64u}]]);
 expect(await verifyPbiAccountCredentialStatement(statement,{accountUid:'account',credentialId:'credential'},roots)).toEqual(statement);
});

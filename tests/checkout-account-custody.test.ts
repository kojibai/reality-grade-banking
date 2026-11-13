import {IDBFactory} from 'fake-indexeddb';
import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import * as vault from '../src/receiz/identity-vault';
import * as cryptoSdk from '@receiz/sdk';
import {matchesCheckoutAccountEmail} from '../src/receiz/checkout-account-match';
const fixture=vi.hoisted(()=>({runtime:null as any,accounts:new Map<string,string>(),prepared:[] as string[],matches:[] as string[]}));
// Substitute only the remote account adapter. The exact enclosing identity,
// real SDK admission, AES custody and atomic account selection all execute.
vi.mock('../src/receiz/native-identity',()=>({openCanonicalIdentity:async(bytes:Uint8Array,phrase:string,filename:string)=>{
 const runtime=fixture.runtime,verification=await runtime.verifyReceizArtifact(new File([new Uint8Array(bytes)],filename));
 const admission=await runtime.createReceizArtifactAdmissionEngine()(verification,{profile:'identity',identityPassphrase:phrase});
 if(admission.verdict!=='canonical-identity')throw Error('SDK_IDENTITY_REFUSED');
 const binding=await runtime.readReceizIdentityPublicBinding(admission);
 const keyFile=await cryptoSdk.readReceizIdentityArtifact(bytes);
 return{binding,backup:()=>({bytes,phrase,filename}),matchesAccountEmail:(email:string)=>matchesCheckoutAccountEmail({sdk:cryptoSdk,keyFile,phrase,accountUid:binding.artifactOwnerReceizId,request:async(_input,init)=>{fixture.matches.push(binding.artifactOwnerReceizId);const headers=new Headers(init?.headers),proof={keyId:keyFile.keyId,alg:keyFile.alg,publicKeyRawB64u:keyFile.crypto.publicKeyRawB64u,challengeB64Url:headers.get('x-receiz-local-action-challenge')!,signatureB64Url:headers.get('x-receiz-local-action-signature')!};expect(await cryptoSdk.verifyReceizIdentityPublicKeyProjectionSignature(proof)).toBe(true);const body=JSON.parse(String(init?.body));return Response.json({matched:fixture.accounts.get(body.email)===binding.artifactOwnerReceizId});}},email),prepareAccountView:async()=>{fixture.prepared.push(binding.artifactOwnerReceizId);return{wallet:{userId:binding.artifactOwnerReceizId}};},persistDeviceCustody:()=>vault.saveDeviceIdentity(bytes,filename,phrase,true),dispose(){}};
}}));
import {importCheckoutIdentityRecord} from '../src/checkout/checkout-account';
let original:Awaited<ReturnType<typeof conformanceOfflineFixture>>,other:{bytes:Uint8Array;phrase:string};
beforeAll(async()=>{original=await conformanceOfflineFixture();fixture.runtime=original.runtime;other=await original.otherIdentity();},60000);
afterEach(()=>vi.unstubAllGlobals());
const digest=async(bytes:Uint8Array)=>Buffer.from(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes))).toString('hex');
async function binding(bytes:Uint8Array,phrase:string){const report=await fixture.runtime.verifyReceizArtifact(new File([new Uint8Array(bytes)],'record.png')),admitted=await fixture.runtime.createReceizArtifactAdmissionEngine()(report,{profile:'identity',identityPassphrase:phrase});expect(admitted.verdict).toBe('canonical-identity');return fixture.runtime.readReceizIdentityPublicBinding(admitted);}
async function prepare(){fixture.prepared=[];fixture.matches=[];fixture.accounts.clear();vi.stubGlobal('indexedDB',new IDBFactory());vi.stubGlobal('navigator',{locks:{request:(_key:string,work:()=>Promise<unknown>)=>work()}});const a=original.identity,b=other,first=await binding(a.bytes,a.phrase),second=await binding(b.bytes,b.phrase);fixture.accounts.set('target@example.org',second.artifactOwnerReceizId);fixture.accounts.set('guest@example.org',first.artifactOwnerReceizId);await vault.saveDeviceIdentity(a.bytes,'guest.png',a.phrase,true);await vault.saveMessagingConsent({artifactSha256:await digest(a.bytes)},{approved:true,closedBooking:'exact-retained-guest-booking'},null);return{a,b,first,second,previous:{binding:{artifactSha256:await digest(a.bytes)},knownWallet:()=>({wallet:{userId:first.artifactOwnerReceizId}})}};}
it('closed guest custody and exact Identity Record remain independently SDK-admissible after paid selection and cold reopening',async()=>{
 const f=await prepare();await importCheckoutIdentityRecord(f.previous as never,new File([new Uint8Array(f.b.bytes)],'existing.png'),f.b.phrase,'target@example.org');expect((await vault.loadDeviceIdentity())?.bytes).toEqual(f.b.bytes);
 const back=await vault.prepareVerifiedEmailAccountSelection({accountUid:f.second.artifactOwnerReceizId,artifactSha256:await digest(f.b.bytes)},f.first.artifactOwnerReceizId);expect((await binding(back.saved!.bytes,back.saved!.phrase)).keyId).toBe(f.first.keyId);await back.activateRetained();expect((await vault.loadDeviceIdentity())?.bytes).toEqual(f.a.bytes);expect(await vault.loadMessagingConsent({artifactSha256:await digest(f.a.bytes)})).toEqual({approved:true,closedBooking:'exact-retained-guest-booking'});
});
it('the actual SDK rejects an altered enclosing record before paid selection can change guest custody',async()=>{
 const f=await prepare(),altered=new Uint8Array(f.b.bytes);altered[0]^=255;await expect(importCheckoutIdentityRecord(f.previous as never,new File([altered],'altered.png'),f.b.phrase,'target@example.org')).rejects.toThrow();expect((await vault.loadDeviceIdentity())?.bytes).toEqual(f.a.bytes);
});
it('an uploaded real record reuses its complete retained account custody on a later paid selection',async()=>{
 const f=await prepare(),selected=await importCheckoutIdentityRecord(f.previous as never,new File([new Uint8Array(f.b.bytes)],'existing.png'),f.b.phrase,'target@example.org');
 const restored=await importCheckoutIdentityRecord(selected,new File([new Uint8Array(f.a.bytes)],'guest-original.png'),f.a.phrase,'guest@example.org');expect(restored.binding.keyId).toBe(f.first.keyId);expect((await vault.loadDeviceIdentity())?.bytes).toEqual(f.a.bytes);expect(await vault.loadMessagingConsent({artifactSha256:await digest(f.a.bytes)})).toEqual({approved:true,closedBooking:'exact-retained-guest-booking'});
});
it('a wrong but genuinely SDK-admitted record cannot bootstrap or change guest custody for the intended email',async()=>{
 const f=await prepare(),wrong=await original.otherIdentity(),wrongBinding=await binding(wrong.bytes,wrong.phrase);
 await expect(importCheckoutIdentityRecord(f.previous as never,new File([new Uint8Array(wrong.bytes)],'wrong-valid.png'),wrong.phrase,'target@example.org')).rejects.toThrow('CHECKOUT_IDENTITY_ACCOUNT_MISMATCH');
 expect(fixture.matches).toEqual([wrongBinding.artifactOwnerReceizId]);expect(fixture.prepared).toEqual([]);expect((await vault.loadDeviceIdentity())?.bytes).toEqual(f.a.bytes);expect(await vault.loadMessagingConsent({artifactSha256:await digest(f.a.bytes)})).toEqual({approved:true,closedBooking:'exact-retained-guest-booking'});
});

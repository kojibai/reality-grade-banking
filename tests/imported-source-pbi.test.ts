import {beforeAll,afterEach,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {createLocalPbiAuthorshipProof,normalizeLocalPbiAuthorshipInput} from '../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship';
import {verifyLocalPbiAssertion} from '../native/receiz/packages/receiz-sdk/src/pbiLocalVerifier';
const encode=(bytes:Uint8Array|ArrayBuffer)=>Buffer.from(bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)).toString('base64url');
let f:Awaited<ReturnType<typeof conformanceOfflineFixture>>;
beforeAll(async()=>{f=await conformanceOfflineFixture({composer:true});},30000);
afterEach(()=>{vi.unstubAllGlobals();});
async function original(){
 vi.stubGlobal('indexedDB',new IDBFactory());
 const r=f.runtime,identity=await r.createReceizArtifactAdmissionEngine()(await r.verifyReceizArtifact(f.identity.bytes),{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=(await r.readReceizIdentityPublicBinding(identity)).artifactOwnerReceizId,enrollment=await f.store.load(),seal=await r.createBankNativeNoteSealer({enrollment,resources:f.resources});
 const custody=r.createImportedProofSourceCustody(),prepared=await r.composer.prepareConnectedComposerSource({draft:{kind:'image',title:'Exact Original',description:'Actual claim',longForm:'Complete essay',files:[{id:'image',role:'primary',file:new File([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQmcAAAAASUVORK5CYII=','base64')],'original.png',{type:'image/png'})}]},ownerReceizId:owner,sealDocument:seal,writeBlock:custody.writeBlock,assertCurrent(){}});
 const source=await r.openImportedProofSource(prepared.artifact,{resolveSourceBlock:custody.resolveBlock,nestedColdSpool:custody.createColdSpool}),reference=await custody.hold(source);
 return{r,owner,source,reference,prepared,seal};
}
it('uses the Showcase signing contract for a legacy owner and never reopens its already verified Source',async()=>{
 const {r,source}=await original(),input=await r.sourceAuthorship.importedSourceAuthorshipInput(source,'bjklock.receiz.id','14750000000000');
 expect(input).toEqual({slug:source.verification.bundle.slug,code:source.verification.bundle.code,pulse:source.verification.bundle.kaiPulseEternal,claimHashHex:source.verification.bundle.artifactSha256Basis});
 expect(normalizeLocalPbiAuthorshipInput(input)).toEqual(input);
 await expect(r.sourceAuthorship.importedSourceAuthorshipInput({...source},'bjklock.receiz.id','14750000000000')).rejects.toThrow('IMPORTED_SOURCE_CANONICAL_OPEN_REQUIRED');
},30000);
it('verifies the actual SDK PBI signature and rejects altered action inputs without resealing the Original',async()=>{
 const {r,source,reference}=await original(),input=await r.sourceAuthorship.importedSourceAuthorshipInput(source,'bjklock.receiz.id','14750000000000');
 const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']),spki=await crypto.subtle.exportKey('spki',keys.publicKey),credential={credIdB64Url:'AQI',pubKeyPem:`-----BEGIN PUBLIC KEY-----\n${Buffer.from(spki).toString('base64')}\n-----END PUBLIC KEY-----`};
 const proof=await createLocalPbiAuthorshipProof({input,credential,dependencies:{performAssertion:async({challengeB64Url,credIdB64Url,pubKeyPem})=>{
  const auth=new Uint8Array(37);auth.set(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('receiz.com'))));auth[32]=5;
  const client=new TextEncoder().encode(JSON.stringify({type:'webauthn.get',challenge:challengeB64Url,origin:'https://bankeiz.com',crossOrigin:false})),payload=new Uint8Array(69);payload.set(auth);payload.set(new Uint8Array(await crypto.subtle.digest('SHA-256',client)),37);
  const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,payload);
  return{credIdB64Url,pubKeyPem,authenticatorDataB64Url:encode(auth),clientDataJSONB64Url:encode(client),signatureB64Url:encode(signature)};
 },verifyAssertion:args=>verifyLocalPbiAssertion({...args,policy:{rpId:'receiz.com',originAllowList:['https://bankeiz.com'],requireUP:true,requireUV:true}})}});
 const bytes=await source.exactArtifact.arrayBuffer(),signed=await r.sourceAuthorship.projectPbiSignedImportedSourceOriginal(source,reference,proof);
 expect(signed.hasPbiSignature).toBe(true);expect(signed.pbiReceiptHash).toBe(proof.pbiReceiptHash);
 await expect(r.sourceAuthorship.projectPbiSignedImportedSourceOriginal(source,reference,{...proof,input:{...proof.input,claimHashHex:'f'.repeat(64)}})).rejects.toThrow('PBI_PROOF_INVALID');
 expect(new Uint8Array(await source.exactArtifact.arrayBuffer())).toEqual(new Uint8Array(bytes));
},30000);
it('opens the PBI ceremony before any publication request, Showcase restoration or sealing',async()=>{
 const {r,prepared,seal}=await original();let requests=0,ceremonies=0,seals=0;
 const runtime=await r.connectedComposer.createConnectedAssetPublicationRuntime({identity:new Uint8Array(f.identity.bytes),passphrase:f.identity.phrase,account:{uid:'fixture-account',username:'sdk_artist'},assertCurrent(){},fetchImpl:async()=>{requests++;throw Error('HISTORY_FORBIDDEN');},sealDocument:async(args:any)=>{seals++;return seal(args);}});
 await expect(runtime.publish(prepared.artifact,async(input:any)=>{ceremonies++;expect(normalizeLocalPbiAuthorshipInput(input)).toEqual(input);throw Error('passkey_cancelled');})).rejects.toThrow('passkey_cancelled');
 expect(ceremonies).toBe(1);expect(requests).toBe(0);expect(seals).toBe(0);
},30000);

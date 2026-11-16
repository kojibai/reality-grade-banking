import {beforeAll,expect,it,vi} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import {createReceizClient,canonicalizeReceizConstitution,receizBase64UrlEncode} from '@receiz/sdk';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {readChatDocumentTerms,chatDocumentTermsDigest} from '../src/receiz/chat-document';
import {createDocumentConsentSigner,verifyDocumentConsent,type DocumentConsentRequest} from '../src/receiz/document-consent';
const ports=vi.hoisted(()=>({sdk:null as unknown}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>ports.sdk}));
const issuerUid='11111111-1111-4111-8111-111111111111',signerUid='22222222-2222-4222-8222-222222222222';
let fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>,runtime:Awaited<ReturnType<typeof conformanceOfflineFixture>>['runtime'];
let seal:ReturnType<typeof runtime.offline.createReceizOfflineSealer>,binding:Awaited<ReturnType<typeof runtime.readReceizIdentityPublicBinding>>;
let request:DocumentConsentRequest;
const hash=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function sealedFile(bytes:Uint8Array,name='source.json',mime='application/json'){
 const result=await seal.seal({bytes,filename:name,mimeType:mime});return new File([new Uint8Array(result.artifactBytes)],result.filename,{type:result.mimeType});
}
beforeAll(async()=>{
 fixture=await conformanceOfflineFixture({account:true});runtime=fixture.runtime;ports.sdk=runtime;
 const admission=await runtime.createReceizArtifactAdmissionEngine()(await runtime.verifyReceizArtifact(fixture.identity.bytes),{profile:'identity',identityPassphrase:fixture.identity.phrase});
 binding=await runtime.readReceizIdentityPublicBinding(admission);
 seal=runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:fixture.store,resources:fixture.resources,fetch:async()=>{throw Error('NETWORK_FORBIDDEN');}});
 const other=await fixture.otherIdentity(),issuerAdmission=await runtime.createReceizArtifactAdmissionEngine()(await runtime.verifyReceizArtifact(other.bytes),{profile:'identity',identityPassphrase:other.phrase});
 const issuerBinding=await runtime.readReceizIdentityPublicBinding(issuerAdmission),sourceSealer=runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:issuerAdmission,store:fixture.store,resources:fixture.resources,fetch:async()=>{throw Error('NETWORK_FORBIDDEN');}});
 const id='33333333-3333-4333-8333-333333333333',terms=readChatDocumentTerms({schema:'bankeiz.chat.document-terms.v1',id,conversationId:'44444444-4444-4444-8444-444444444444',createdAt:'2026-11-15T12:00:00.000Z',issuer:{userId:issuerUid,name:'Studio',username:'studio',ownerReceizId:issuerBinding.artifactOwnerReceizId},recipients:[signerUid],draft:{kind:'agreement',title:'Website agreement',summary:'Build the agreed website',sections:[{heading:'Terms',body:'One revision; payment after delivery.'}],tables:[]},source:{messageIds:['55555555-5555-4555-8555-555555555555'],digest:'a'.repeat(64),hasEarlier:false},signatureRequested:true});
 const pdf=await PDFDocument.create();pdf.addPage();await pdf.attach(new TextEncoder().encode(JSON.stringify(terms)),'bankeiz-document.json',{mimeType:'application/json'});
 const sourceResult=await sourceSealer.seal({bytes:new Uint8Array(await pdf.save()),filename:'website-agreement.pdf',mimeType:'application/pdf'}),original=new File([new Uint8Array(sourceResult.artifactBytes)],sourceResult.filename,{type:sourceResult.mimeType});
 request={documentId:id,conversationId:terms.conversationId,termsDigest:await chatDocumentTermsDigest(terms),original,signerUid,partyUids:[issuerUid,signerUid]};
},60000);
function signer(){
 const files=new Map<string,File>();let seals=0,writes=0,failWrite=false,failSeal=false,open=true;
 const sign=createDocumentConsentSigner({ownerReceizId:binding.artifactOwnerReceizId,accountUid:signerUid,assertOpen(){if(!open)throw Error('IDENTITY_CLOSED');},
  seal:async input=>{seals++;if(failSeal)throw Error('SEAL_UNAVAILABLE');return sealedFile(input.bytes,input.filename,input.mimeType);},
  read:async digest=>files.get(digest)??null,retain:async(digest,file)=>{writes++;if(failWrite)throw Error('STORAGE_UNAVAILABLE');files.set(digest,file);},
 });
 return{sign,files,counts:()=>({seals,writes}),failWrite(value:boolean){failWrite=value;},failSeal(value:boolean){failSeal=value;},close(){open=false;}};
}
async function expected(){return{documentId:request.documentId,conversationId:request.conversationId,termsDigest:request.termsDigest,originalArtifactSha256:await hash(new Uint8Array(await request.original.arrayBuffer())),partyUids:request.partyUids,signerUid};}
it('signs exact complete reviewed terms in the actual SDK-native owner Original',async()=>{
 const owner=signer(),file=await owner.sign(request),verified=await verifyDocumentConsent(file,await expected());
 expect(verified.signerUid).toBe(signerUid);expect(verified.signerOwnerReceizId).toBe(binding.artifactOwnerReceizId);
 expect(verified.sealedArtifact.continuity.ownerReceizId).toBe(binding.artifactOwnerReceizId);
 expect(verified.statement).toContain('agree');expect(verified.method).toBe('receiz-native-owner');
 expect(new Uint8Array(await verified.original.arrayBuffer())).toEqual(new Uint8Array(await request.original.arrayBuffer()));
 expect(verified.terms.draft.sections[0].body).toBe('One revision; payment after delivery.');
 expect(verified).not.toHaveProperty('signerIdentity');expect(verified).not.toHaveProperty('proof');
 expect(owner.counts()).toEqual({seals:1,writes:1});
},60000);
it('reuses the exact completed consent and retained cold result without signing or sealing again',async()=>{
 const owner=signer(),[first,second]=await Promise.all([owner.sign(request),owner.sign(request)]);expect(first).toBe(second);
 const cold=createDocumentConsentSigner({ownerReceizId:binding.artifactOwnerReceizId,accountUid:signerUid,assertOpen(){},seal:async()=>{throw Error('SEAL_FORBIDDEN');},read:async digest=>owner.files.get(digest)??null,retain:async()=>{throw Error('WRITE_FORBIDDEN');}});
 const reopened=await cold(request);expect(new Uint8Array(await reopened.arrayBuffer())).toEqual(new Uint8Array(await first.arrayBuffer()));
},60000);
it('refuses substituted expected terms, source, signer, thread, parties and raw unsealed JSON',async()=>{
 const file=await signer().sign(request),basis=await expected();
 for(const change of [{termsDigest:'b'.repeat(64)},{originalArtifactSha256:'c'.repeat(64)},{signerUid:issuerUid},{conversationId:'66666666-6666-4666-8666-666666666666'},{partyUids:[signerUid]}])await expect(verifyDocumentConsent(file,{...basis,...change})).rejects.toThrow();
 const opened=await runtime.createReceizClient().artifacts.verifyAndOpen(file);
 await expect(verifyDocumentConsent(new File([new Uint8Array(opened.verifiedPayload.bytes)],'unsigned.json',{type:'application/json'}),basis)).rejects.toThrow();
},60000);
it('refuses re-sealed payloads with changed statements, identity bindings, proofs or embedded Originals',async()=>{
 const file=await signer().sign(request),opened=await runtime.createReceizClient().artifacts.verifyAndOpen(file),payload=JSON.parse(new TextDecoder().decode(opened.verifiedPayload.bytes));
 const changes=[
  (v:typeof payload)=>{v.basis.statement='I agree to different terms.';},
  (v:typeof payload)=>{v.basis.signerOwnerReceizId='foreign.receiz.id';},
  (v:typeof payload)=>{v.signerIdentity={...binding};},
  (v:typeof payload)=>{v.original.bytesB64Url=receizBase64UrlEncode(new TextEncoder().encode('substituted'));},
  (v:typeof payload)=>{v.terms.draft.sections[0].body='Different obligations';},
 ];
 for(const change of changes){const v=structuredClone(payload);change(v);const bad=await sealedFile(new TextEncoder().encode(canonicalizeReceizConstitution(v)));await expect(verifyDocumentConsent(bad,await expected())).rejects.toThrow();}
},60000);
it('refuses wrong native sender or terms before invoking the owner sealer',async()=>{
 const owner=signer();for(const change of [{signerUid:issuerUid},{termsDigest:'f'.repeat(64)},{partyUids:[signerUid]},{documentId:'66666666-6666-4666-8666-666666666666'},{statement:'I do not agree to this agreement.'}])await expect(owner.sign({...request,...change})).rejects.toThrow();
 expect(owner.counts()).toEqual({seals:0,writes:0});owner.close();await expect(owner.sign(request)).rejects.toThrow('IDENTITY_CLOSED');
});
it('refuses a valid SDK-native owner signature over a nonconsent statement',async()=>{
 const file=await signer().sign(request),opened=await runtime.createReceizClient().artifacts.verifyAndOpen(file),payload=JSON.parse(new TextDecoder().decode(opened.verifiedPayload.bytes));
 payload.basis.statement='I do not agree to this agreement.';payload.consentDigest=await hash(new TextEncoder().encode(canonicalizeReceizConstitution(payload.basis)));
 const contradictory=await sealedFile(new TextEncoder().encode(canonicalizeReceizConstitution(payload)));await expect(verifyDocumentConsent(contradictory,await expected())).rejects.toThrow('DOCUMENT_CONSENT_INVALID');
},60000);
it('keeps the actual signed source across a retention failure without a second seal',async()=>{
 const owner=signer();owner.failWrite(true);await expect(owner.sign(request)).rejects.toThrow('STORAGE_UNAVAILABLE');owner.failWrite(false);const file=await owner.sign(request);await verifyDocumentConsent(file,await expected());expect(owner.counts()).toEqual({seals:1,writes:2});
},60000);
it('refuses a changing File source before owner-signing the reviewed agreement',async()=>{
 const owner=signer(),originalBytes=await request.original.arrayBuffer();let reads=0;
 class ChangingFile extends File{override async arrayBuffer(){reads++;return reads===1?originalBytes:new Uint8Array(originalBytes.byteLength).buffer;}}
 const original=new ChangingFile([originalBytes],request.original.name,{type:request.original.type});
 await expect(owner.sign({...request,original})).rejects.toThrow('DOCUMENT_CONSENT_SOURCE_CHANGED');expect(owner.counts()).toEqual({seals:0,writes:0});
},60000);
it('retries a failed seal with the same exact consent payload',async()=>{
 const owner=signer();owner.failSeal(true);await expect(owner.sign(request)).rejects.toThrow('SEAL_UNAVAILABLE');owner.failSeal(false);const file=await owner.sign(request);await verifyDocumentConsent(file,await expected());expect(owner.counts()).toEqual({seals:2,writes:1});
},60000);
it('refuses an unrelated auxiliary identity key endorsed inside a genuine different-owner Original',async()=>{
 const file=await signer().sign(request),opened=await runtime.createReceizClient().artifacts.verifyAndOpen(file),payload=JSON.parse(new TextDecoder().decode(opened.verifiedPayload.bytes));
 const other=await fixture.otherIdentity(),admission=await runtime.createReceizArtifactAdmissionEngine()(await runtime.verifyReceizArtifact(other.bytes),{profile:'identity',identityPassphrase:other.phrase}),otherBinding=await runtime.readReceizIdentityPublicBinding(admission),otherKey=await createReceizClient().identity.readArtifact(other.bytes);
 const {signerOwnerReceizId:owner,signerIdentity:claimed,...rest}=payload.basis;void owner;void claimed;
 const basis={...rest,schema:'bankeiz.document-consent.intent.v1',signerIdentity:{...otherBinding,artifactOwnerReceizId:binding.artifactOwnerReceizId}},consentDigest=await hash(new TextEncoder().encode(canonicalizeReceizConstitution(basis)));
 const challengeB64Url=receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizConstitution({schema:'bankeiz.document-consent.signature.v1',consentDigest}))),proof=await createReceizClient().identity.signLoginProof({keyFile:otherKey,passphrase:other.phrase,challengeB64Url});
 const endorsed=await sealedFile(new TextEncoder().encode(canonicalizeReceizConstitution({schema:'bankeiz.document-consent.v1',method:'receiz-id',basis,consentDigest,proof,terms:payload.terms,original:payload.original})));
 await expect(verifyDocumentConsent(endorsed,await expected())).rejects.toThrow();
},60000);

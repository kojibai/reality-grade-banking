import {readFileSync} from 'node:fs';
import {renderConformanceEvidencePng} from '../src/conformance/evidence-renderer';
import {beforeAll,expect,it} from 'vitest';
import {referenceContractAdapter,runContractAssessment} from '../src/conformance/contract';
import {createConformanceEvidenceObject,bindConformanceEvidenceHolder,type ConformanceEvidenceObject} from '../src/conformance/evidence-object';
import {sealConformanceEvidenceObject,openSealedConformanceEvidenceObject,getConformanceEvidenceSealStatus} from '../src/conformance/receiz-evidence-seal';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
let object:ConformanceEvidenceObject,fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>,ownerReceizId:string,ownerAdmission:unknown;
beforeAll(async()=>{
 object=await createConformanceEvidenceObject(await runContractAssessment(referenceContractAdapter,{name:'Synthetic conformance integration',buildSha256:'a'.repeat(64)},'canonical-evidence-local-test'));
 fixture=await conformanceOfflineFixture();
 ownerAdmission=await fixture.runtime.createReceizArtifactAdmissionEngine()(await fixture.runtime.verifyReceizArtifact(fixture.identity.bytes),{profile:'identity',identityPassphrase:fixture.identity.phrase});
 ownerReceizId=(await fixture.runtime.readReceizIdentityPublicBinding(ownerAdmission)).artifactOwnerReceizId;
},60000);
const render=renderConformanceEvidencePng;
it('returns an explicit identity requirement without signer, resources or enrollment when no existing identity is supplied',async()=>{
 await expect(sealConformanceEvidenceObject(object,{identitySource:async()=>null})).rejects.toMatchObject({code:'CONFORMANCE_IDENTITY_REQUIRED'});
});
it('reports a missing signer without enrolling, proving resources or rendering',async()=>{
 const store={load:async()=>null,save:async()=>{throw Error('STATUS_MUST_NOT_WRITE');}};
 expect(await getConformanceEvidenceSealStatus({identitySource:async()=>fixture.identity},{...fixture.ports,store})).toEqual({state:'enrollment-required'});
 await expect(sealConformanceEvidenceObject(object,{identitySource:async()=>fixture.identity},{...fixture.ports,store,render:async()=>{throw Error('RENDER_MUST_NOT_RUN');},resources:async()=>{throw Error('RESOURCES_MUST_NOT_RUN');}})).rejects.toMatchObject({code:'CONFORMANCE_ENROLLMENT_REQUIRED'});
});
it('creates a real canonical nonfinancial proof with verified native continuity and exact SVG/transcript recovery, then opens it cold offline',async()=>{
 const result=await sealConformanceEvidenceObject(object,{identitySource:async()=>fixture.identity},{...fixture.ports,render});
 expect(result.mimeType).toBe('image/png');expect(result.verification.ok).toBe(true);expect(result.verification.assetContinuity?.state).toBe('verified');
 const opened=await openSealedConformanceEvidenceObject(result.bytes,{verifyOffline:fixture.ports.verifyOffline,openPayload:fixture.ports.openPayload});
 expect(opened.object.report).toEqual({...object.report,credentialHolder:{schema:'receiz.bank.conformance-holder.v1',receizId:ownerReceizId}});
 expect(opened.object.svg).toContain(ownerReceizId);expect(opened.object.svg).not.toBe(object.svg);expect(opened.object.digest).not.toBe(object.digest);
 expect(opened.object.svg).toBe(result.object.svg);expect(opened.object.digest).toBe(result.object.digest);expect(opened.verification.assetContinuity?.artifactId).toBe(result.verification.assetContinuity?.artifactId);
},60000);
it('refuses a real canonical public document which has no native object continuity before exposing its payload',async()=>{
 const bytes=new Uint8Array(readFileSync(new URL('./fixtures/public-essay-record.png',import.meta.url)));
 await expect(openSealedConformanceEvidenceObject(bytes,{openPayload:async()=>{throw Error('UNVERIFIED_PAYLOAD_MUST_NOT_OPEN');}})).rejects.toMatchObject({code:'CONFORMANCE_CONTINUITY_REQUIRED'});
});
it('turns a wrong local identity phrase into an identity-required refusal before signer effects',async()=>{
 await expect(sealConformanceEvidenceObject(object,{identitySource:async()=>({...fixture.identity,phrase:'wrong-private-phrase'})},{...fixture.ports,resources:async()=>{throw Error('RESOURCES_MUST_NOT_RUN');},render})).rejects.toMatchObject({code:'CONFORMANCE_IDENTITY_REQUIRED'});
});
it('refuses an identity removed while generating an otherwise valid proof object',async()=>{
 let reads=0;
 await expect(sealConformanceEvidenceObject(object,{identitySource:async()=>++reads===1?fixture.identity:null},{...fixture.ports,render})).rejects.toMatchObject({code:'CONFORMANCE_IDENTITY_CHANGED'});
},60000);
it('requires explicit enrollment permission before entering the enrollment port',async()=>{
 let attempts=0;
 const offline=await fixture.ports.offline!();
 const empty={load:async()=>null,save:async()=>{throw Error('UNEXPECTED_SAVE');}};
 const ports={...fixture.ports,store:empty,offline:async()=>({...offline,createReceizOfflineSealer:(config:Parameters<typeof offline.createReceizOfflineSealer>[0])=>{const actual=offline.createReceizOfflineSealer(config);return{...actual,enroll:async()=>{attempts++;throw Error('ISOLATED_EXPLICIT_ENROLLMENT_PORT');}};}}),render};
 await expect(sealConformanceEvidenceObject(object,{identitySource:async()=>fixture.identity},ports)).rejects.toMatchObject({code:'CONFORMANCE_ENROLLMENT_REQUIRED'});
 expect(attempts).toBe(0);
 await expect(sealConformanceEvidenceObject(object,{identitySource:async()=>fixture.identity,allowEnrollment:true},ports)).rejects.toThrow('ISOLATED_EXPLICIT_ENROLLMENT_PORT');
 expect(attempts).toBe(1);
});
it('preserves the complete original when proving resources are unavailable',async()=>{
 const svg=object.svg,report=JSON.stringify(object.report);
 await expect(sealConformanceEvidenceObject(object,{identitySource:async()=>fixture.identity},{...fixture.ports,resources:async()=>{throw Error('PROVING_RESOURCES_UNAVAILABLE');},render})).rejects.toThrow('PROVING_RESOURCES_UNAVAILABLE');
 expect(object.svg).toBe(svg);expect(JSON.stringify(object.report)).toBe(report);
});
it('refuses a changed signed PNG chunk even with a repaired PNG checksum before opening any transcript',async()=>{
 const result=await sealConformanceEvidenceObject(object,{identitySource:async()=>fixture.identity},{...fixture.ports,render});
 const changed=result.bytes.slice(),view=new DataView(changed.buffer);let at=8,mutated=false;
 while(at+12<=changed.length){const length=view.getUint32(at),text=new TextDecoder().decode(changed.subarray(at+8,at+8+length));
  if(text.startsWith('bankeiz.conformance.evidence.v1\0')){const offset=text.indexOf('Synthetic conformance integration');expect(offset).toBeGreaterThan(0);changed[at+8+offset]=88;
   let crc=0xffffffff;for(const byte of changed.subarray(at+4,at+8+length)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}view.setUint32(at+8+length,(crc^0xffffffff)>>>0);mutated=true;break;}
  at+=length+12;
 }
 expect(mutated).toBe(true);
 await expect(openSealedConformanceEvidenceObject(changed,{verifyOffline:fixture.ports.verifyOffline,openPayload:async()=>{throw Error('TAMPERED_PAYLOAD_MUST_NOT_OPEN');}})).rejects.toMatchObject({code:'CONFORMANCE_PROOF_INVALID'});
},60000);
it('does not load offline sealing or proving resources merely to report a missing identity',async()=>{
 expect(await getConformanceEvidenceSealStatus({identitySource:async()=>null},{offline:async()=>{throw Error('OFFLINE_SIGNER_MUST_NOT_LOAD');},resources:async()=>{throw Error('PROVING_RESOURCES_MUST_NOT_LOAD');}})).toEqual({state:'identity-required'});
});
it('refuses a valid canonical seal of a different complete conformance object while preserving the requested original',async()=>{
 const {canonicalJson}=await import('../src/conformance/assessment'),{insertPngTextChunks}=await import('../native/receiz/app/utils/pngChunks');
 const other=await bindConformanceEvidenceHolder(await createConformanceEvidenceObject({...object.report,implementation:{...object.report.implementation,name:'A different complete conformance result'}}),ownerReceizId),offline=await fixture.ports.offline!();
 const ports={...fixture.ports,render,offline:async()=>({...offline,createReceizOfflineSealer:(config:Parameters<typeof offline.createReceizOfflineSealer>[0])=>{const actual=offline.createReceizOfflineSealer(config);return{...actual,seal:async(input:Parameters<typeof actual.seal>[0])=>actual.seal({...input,bytes:insertPngTextChunks(await render(other.svg),[{keyword:'bankeiz.conformance.evidence.v1',text:JSON.stringify({schema:'bankeiz.conformance.receiz-source.v1',evidenceDigest:other.digest,svg:other.svg,transcript:canonicalJson(other.report)})}])})};}})};
 const svg=object.svg;
 await expect(sealConformanceEvidenceObject(object,{identitySource:async()=>fixture.identity},ports)).rejects.toMatchObject({code:'CONFORMANCE_SOURCE_CHANGED'});
 expect(object.svg).toBe(svg);
},60000);

async function canonicallySignDeclaredHolder(evidence:ConformanceEvidenceObject){
 const {canonicalJson}=await import('../src/conformance/assessment'),{insertPngTextChunks}=await import('../native/receiz/app/utils/pngChunks');
 const offline=await fixture.ports.offline!(),resources=await fixture.ports.resources!();
 const sealer=offline.createReceizOfflineSealer({store:fixture.store,resources,ownerIdentityAdmission:ownerAdmission,fetch:async()=>{throw Error('NO_NETWORK_IN_HOLDER_TEST');}});
 const png=insertPngTextChunks(await render(evidence.svg),[{keyword:'bankeiz.conformance.evidence.v1',text:JSON.stringify({schema:'bankeiz.conformance.receiz-source.v1',evidenceDigest:evidence.digest,svg:evidence.svg,transcript:canonicalJson(evidence.report)})}]);
 return sealer.seal({bytes:png,filename:'declared-holder.png',mimeType:'image/png'});
}
it.each(['missing','foreign']as const)('refuses a %s displayed credential holder even when the full object has a valid canonical ownership seal',async kind=>{
 const evidence=kind==='missing'?object:await bindConformanceEvidenceHolder(object,'different-holder.receiz.id');
 const sealed=await canonicallySignDeclaredHolder(evidence);
 const verification=await fixture.ports.verifyOffline!({bytes:sealed.artifactBytes,filename:sealed.filename,mimeType:'image/png'});
 expect(verification.ok).toBe(true);expect(verification.assetContinuity?.ownerReceizId).toBe(ownerReceizId);
 await expect(openSealedConformanceEvidenceObject(sealed.artifactBytes,{verifyOffline:fixture.ports.verifyOffline,openPayload:fixture.ports.openPayload})).rejects.toMatchObject({code:'CONFORMANCE_HOLDER_MISMATCH'});
},60000);
it('refuses another declared Receiz ID before proving, rendering or enrolling under the actual admitted identity',async()=>{
 const foreign=await bindConformanceEvidenceHolder(object,'different-holder.receiz.id');
 await expect(sealConformanceEvidenceObject(foreign,{identitySource:async()=>fixture.identity},{...fixture.ports,resources:async()=>{throw Error('PROVING_MUST_NOT_RUN');},render:async()=>{throw Error('RENDER_MUST_NOT_RUN');}})).rejects.toMatchObject({code:'CONFORMANCE_HOLDER_MISMATCH'});
});
it('refuses canonically signed pixels that do not depict the exact embedded certificate',async()=>{
 const bound=await bindConformanceEvidenceHolder(object,ownerReceizId),{canonicalJson}=await import('../src/conformance/assessment'),{insertPngTextChunks}=await import('../native/receiz/app/utils/pngChunks');
 const offline=await fixture.ports.offline!(),resources=await fixture.ports.resources!();
 const sealer=offline.createReceizOfflineSealer({store:fixture.store,resources,ownerIdentityAdmission:ownerAdmission,fetch:async()=>{throw Error('NO_NETWORK_IN_ARTWORK_TEST');}});
 const fake=bound.svg.replaceAll(ownerReceizId,'victim.receiz.id');
 const png=insertPngTextChunks(await render(fake),[{keyword:'bankeiz.conformance.evidence.v1',text:JSON.stringify({schema:'bankeiz.conformance.receiz-source.v1',evidenceDigest:bound.digest,svg:bound.svg,transcript:canonicalJson(bound.report)})}]);
 const sealed=await sealer.seal({bytes:png,filename:'forged-front.png',mimeType:'image/png'});
 expect((await fixture.ports.verifyOffline!({bytes:sealed.artifactBytes,filename:sealed.filename,mimeType:'image/png'})).ok).toBe(true);
 await expect(openSealedConformanceEvidenceObject(sealed.artifactBytes,{verifyOffline:fixture.ports.verifyOffline,openPayload:fixture.ports.openPayload})).rejects.toMatchObject({code:'CONFORMANCE_ARTWORK_MISMATCH'});
},60000);

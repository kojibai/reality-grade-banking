import {beforeAll,expect,it,vi} from 'vitest';
import * as sdk from '@receiz/sdk';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {REGISTRY_NATIVE_PART_BYTES,REGISTRY_NATIVE_PART_NAMESPACE,REGISTRY_NATIVE_INDEX_NAMESPACE,type RegistryPublicationPlan,type RegistryInstitutionState} from '../src/registry/types';
import {publishRegistryOriginal,inspectRegistryPublisher,type RegistryPublisherJournal,type RegistryPublisherPorts} from '../src/registry/publish';

let fixture:Awaited<ReturnType<typeof conformanceOfflineFixture>>,identitySdk:NonNullable<RegistryPublisherPorts['sdk']>,holder:string,key:sdk.ReceizKeyFile;
beforeAll(async()=>{
 fixture=await conformanceOfflineFixture({financial:true});
 const runtime=fixture.runtime;
 identitySdk=async()=>({...sdk,verifyReceizArtifact:runtime.verifyReceizArtifact,createReceizArtifactAdmissionEngine:runtime.createReceizArtifactAdmissionEngine,readReceizIdentityPublicBinding:runtime.readReceizIdentityPublicBinding,readReceizIdentityArtifact:runtime.identityTools.readReceizIdentityArtifact});
 const admitted=await runtime.createReceizArtifactAdmissionEngine()(await runtime.verifyReceizArtifact(fixture.identity.bytes),{profile:'identity',identityPassphrase:fixture.identity.phrase});
 holder=(await runtime.readReceizIdentityPublicBinding(admitted)).artifactOwnerReceizId;
 key=await runtime.identityTools.readReceizIdentityArtifact(fixture.identity.bytes);
},60000);
const sha=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(value=>value.toString(16).padStart(2,'0')).join('');
async function input(){
 const bytes=new Uint8Array(REGISTRY_NATIVE_PART_BYTES+17).fill(7),hash=await sha(bytes);
 const plan:RegistryPublicationPlan={publication:{schema:'bank.registry.publication.v1',institutionId:'synthetic-bank',name:'Synthetic Bank',scope:'Public integration contract',cases:33,artifactSha256:hash,evidenceSha256:'b'.repeat(64),holderReceizId:holder,implementationBuildSha256:'c'.repeat(64),officialProofUrl:'https://example.test/.well-known/reality-grade-banking/conformance.png',acceptedAt:'2026-11-06T10:00:00.000Z',url:'/api/bank/registry/original/synthetic-bank/'+hash},originalBytes:bytes.length,partCount:2};
 return{institutionId:'synthetic-bank',bytes,plan};
}
function setup(plan:RegistryPublicationPlan){
 const held=new Map<string,unknown>();const journal:RegistryPublisherJournal={load:async key=>structuredClone(held.get(key)??null),save:async(key,value)=>{held.set(key,structuredClone(value));}};
 const entry:RegistryInstitutionState={institutionId:plan.publication.institutionId,revision:1,current:plan.publication,history:[]};
 const posted:unknown[]=[];
 const fetcher=vi.fn(async(_url:RequestInfo|URL,init?:RequestInit)=>{
  if(!init?.method)return Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:[]});
  const body=JSON.parse(String(init.body));posted.push(body);
  // The native public-proof validator admits app projections only. Exercise
  // the actual SDK-created record rather than a handwritten feed fixture.
  expect(body.signed.feed.records.every((row:{schema:string})=>/^receiz\.app\.[a-z0-9_.:-]+\.v1$/.test(row.schema))).toBe(true);
  expect(body.signed.feed.records[0].schema).toBe(body.signed.storeStateRecord.schema);
  expect(body.signed.feed.records[0].platform).toBe('Reality-Grade Banking');
  expect(await sdk.verifyReceizIdentityLoginProof({keyFile:key,challengeB64Url:body.signed.identityProof.challengeB64Url,signatureB64Url:body.signed.identityProof.signatureB64Url})).toBe(true);
  return Response.json(body.signed.storeStateRecord.schema==='receiz.app.bank.registry.original-index.v1'?{ok:true,entry}:{ok:true});
 });
 const ports:RegistryPublisherPorts={sdk:identitySdk,identitySource:async()=>({...fixture.identity,readConsent:true}),fetch:fetcher as typeof fetch,journal};
 return{ports,posted,held,fetcher,entry};
}

it('uses genuine admitted device identity and SDK signatures to publish bounded exact Original parts before its index',async()=>{
 const value=await input(),f=setup(value.plan),status:string[]=[];
 expect(await publishRegistryOriginal({...value,onStatus:message=>status.push(message)},f.ports)).toEqual(f.entry);
 expect(f.posted).toHaveLength(3);
 const signed=f.posted.map(value=>(value as {signed:sdk.ReceizPublicStoreSignedPublish}).signed);
 expect(signed.slice(0,2).map(value=>value.storeStateRecord.index)).toEqual([0,1]);
 expect(signed.slice(0,2).every(value=>value.feed.records[0].namespace===REGISTRY_NATIVE_PART_NAMESPACE)).toBe(true);
 expect(signed[2].feed.records[0].namespace).toBe(REGISTRY_NATIVE_INDEX_NAMESPACE);
 expect(f.posted.every(body=>new TextEncoder().encode(JSON.stringify(body)).length<=2*1024*1024)).toBe(true);
 const recovered=Buffer.concat(signed.slice(0,2).map(value=>Buffer.from(value.storeStateRecord.bytesB64u as string,'base64url')));
 expect(new Uint8Array(recovered)).toEqual(value.bytes);
 const wire=JSON.stringify(f.posted);expect(wire).not.toContain(fixture.identity.phrase);expect(wire).not.toContain(key.crypto.privateKeyPkcs8CiphertextB64u);expect(wire).not.toContain('privateKeyPkcs8');expect(wire).not.toContain('keyFile');
 expect(JSON.stringify([...f.held.values()])).not.toContain(fixture.identity.phrase);expect(JSON.stringify([...f.held.values()])).not.toContain('privateKeyPkcs8');
 expect(status.some(message=>message.includes('part 1 of 2'))).toBe(true);
});

it('inspects only the actual admitted publisher’s public ID and key without signing, transport or journal writes',async()=>{
 const value=await input(),f=setup(value.plan),actual=await identitySdk();
 const createClient=vi.fn(()=>{throw Error('INSPECTION_MUST_NOT_CREATE_SIGNER_CLIENT');});
 const result=await inspectRegistryPublisher({...f.ports,sdk:async()=>({...actual,createReceizClient:createClient as typeof actual.createReceizClient})});
 expect(result).toEqual({receizId:holder,keyId:key.keyId});expect(Object.keys(result).sort()).toEqual(['keyId','receizId']);
 expect(createClient).not.toHaveBeenCalled();expect(f.fetcher).not.toHaveBeenCalled();expect(f.held.size).toBe(0);
 expect(JSON.stringify(result)).not.toContain('privateKey');expect(JSON.stringify(result)).not.toContain(fixture.identity.phrase);
 await expect(inspectRegistryPublisher({...f.ports,identitySource:async()=>null})).rejects.toMatchObject({code:'REGISTRY_IDENTITY_REQUIRED',uncertain:false});
});

it('refuses a publisher different from the explicitly checked public ID before any retained intent or transport write',async()=>{
 const value=await input(),f=setup(value.plan);
 await expect(publishRegistryOriginal({...value,expectedPublisherReceizId:'bjklock.receiz.id'},f.ports)).rejects.toMatchObject({code:'REGISTRY_PUBLISHER_CHANGED',uncertain:false});
 expect(f.fetcher).not.toHaveBeenCalled();expect(f.held.size).toBe(0);
});

it('lets a genuinely admitted publisher index another holder’s public Original without relabelling its holder',async()=>{
 const value=await input();value.plan.publication.holderReceizId='original-credential-holder.receiz.id';const f=setup(value.plan);
 const accepted=await publishRegistryOriginal(value,f.ports);
 expect(accepted.current.holderReceizId).toBe('original-credential-holder.receiz.id');
 const envelopes=f.posted.map(body=>(body as {signed:sdk.ReceizPublicStoreSignedPublish}).signed);
 expect(envelopes.every(envelope=>envelope.merchantReceizId===holder)).toBe(true);
 expect(envelopes.every(envelope=>envelope.storeStateRecord.publisherReceizId===holder&&envelope.storeStateRecord.publisherKeyId===key.keyId)).toBe(true);
 const index=envelopes[2].storeStateRecord;
 expect((index.publication as Record<string,unknown>).holderReceizId).toBe('original-credential-holder.receiz.id');
 const intent=[...f.held.values()][0] as {credentialHolderReceizId:string;publisherReceizId:string;publisherKeyId:string};
 expect(intent.credentialHolderReceizId).toBe('original-credential-holder.receiz.id');expect(intent.publisherReceizId).toBe(holder);expect(intent.publisherKeyId).toBe(key.keyId);
});

it('retains independent part and index addresses before the first write without exposing future addresses in that first part',async()=>{
 const value=await input(),f=setup(value.plan);let first=true;
 const transport=async(url:RequestInfo|URL,init?:RequestInit)=>{
  if(first&&init?.method){first=false;
   const intent=[...f.held.values()][0] as {parts:{id:string;nonce:string}[];index:{id:string;nonce:string}};
   expect(intent.parts).toHaveLength(2);expect(new Set([...intent.parts.map(part=>part.nonce),intent.index.nonce]).size).toBe(3);
   expect(String(init.body)).toContain(intent.parts[0].nonce);expect(String(init.body)).not.toContain(intent.parts[1].nonce);expect(String(init.body)).not.toContain(intent.index.nonce);
  }
  return f.fetcher(url,init);
 };
 await publishRegistryOriginal(value,{...f.ports,fetch:transport as typeof fetch});
 const envelopes=f.posted.map(body=>(body as {signed:sdk.ReceizPublicStoreSignedPublish}).signed);
 expect(envelopes[2].storeStateRecord.partIds).toEqual(envelopes.slice(0,2).map(envelope=>envelope.feed.records[0].id));
 expect(envelopes[2].storeStateRecord.transportNonce).not.toBe(envelopes[0].storeStateRecord.transportNonce);
});

it('requires an existing publisher identity and read consent without creating an identity or publishing',async()=>{
 const value=await input(),f=setup(value.plan);
 await expect(publishRegistryOriginal(value,{...f.ports,identitySource:async()=>null})).rejects.toMatchObject({code:'REGISTRY_IDENTITY_REQUIRED',uncertain:false});
 await expect(publishRegistryOriginal(value,{...f.ports,identitySource:async()=>({...fixture.identity,readConsent:false})})).rejects.toMatchObject({code:'REGISTRY_IDENTITY_REQUIRED'});
 expect(f.fetcher).not.toHaveBeenCalled();
});

it('rejects exact source substitution before posting any public envelope',async()=>{
 const value=await input(),f=setup(value.plan);
 const changed=value.bytes.slice();changed[0]++;
 await expect(publishRegistryOriginal({...value,bytes:changed},f.ports)).rejects.toMatchObject({code:'REGISTRY_SOURCE_CHANGED'});
 expect(f.fetcher).not.toHaveBeenCalled();
});

it('stops before the index if the selected device identity changes during part publication',async()=>{
 const value=await input(),f=setup(value.plan);let selected=true;
 const fetcher=async(url:RequestInfo|URL,init?:RequestInit)=>{const result=await f.fetcher(url,init);if(init?.method)selected=false;return result;};
 await expect(publishRegistryOriginal(value,{...f.ports,identitySource:async()=>selected?{...fixture.identity,readConsent:true}:null,fetch:fetcher as typeof fetch})).rejects.toMatchObject({code:'REGISTRY_IDENTITY_CHANGED'});
 expect(f.posted).toHaveLength(1);expect((f.posted[0] as {signed:{storeStateRecord:{schema:string}}}).signed.storeStateRecord.schema).toBe('receiz.app.bank.registry.original-part.v1');
});

it('retains an unknown outcome and retries its exact signed envelope only after an explicit retry and public lookup',async()=>{
 const value=await input(),f=setup(value.plan);let first=true;
 const attempted:string[]=[];const transport=async(url:RequestInfo|URL,init?:RequestInit)=>{if(init?.method){attempted.push(String(init.body));if(first){first=false;throw new TypeError('Acknowledgement lost');}}return f.fetcher(url,init);};
 const ports={...f.ports,fetch:transport as typeof fetch};
 await expect(publishRegistryOriginal(value,ports)).rejects.toMatchObject({code:'REGISTRY_PUBLICATION_UNCONFIRMED',uncertain:true});
 expect(attempted).toHaveLength(1);
 expect(await publishRegistryOriginal(value,ports)).toEqual(f.entry);
 expect(attempted[0]).toBe(attempted[1]);
 expect(f.fetcher.mock.calls.some(([,options])=>!options?.method)).toBe(true);
});

it('requires durable intent retention before a signed envelope leaves the device',async()=>{
 const value=await input(),f=setup(value.plan);
 await expect(publishRegistryOriginal(value,{...f.ports,journal:{load:async()=>null,save:async()=>{throw Error('Storage full');}}})).rejects.toMatchObject({code:'REGISTRY_PUBLICATION_STORAGE_REQUIRED',uncertain:false});
 expect(f.fetcher).not.toHaveBeenCalled();
});

it('uses public readback to resolve a lost final acknowledgement without signing or posting again',async()=>{
 const value=await input(),f=setup(value.plan);let finalUnknown=false,posts=0;
 const transport=async(url:RequestInfo|URL,init?:RequestInit)=>{
  if(init?.method){posts++;const signed=JSON.parse(String(init.body)).signed;if(signed.storeStateRecord.schema==='receiz.app.bank.registry.original-index.v1'){finalUnknown=true;throw new TypeError('Final acknowledgement lost');}return f.fetcher(url,init);}
  return Response.json({schema:'bank.registry.public.v1',publishingAvailable:true,records:finalUnknown?[f.entry]:[]});
 };
 const ports={...f.ports,fetch:transport as typeof fetch};
 await expect(publishRegistryOriginal(value,ports)).rejects.toMatchObject({uncertain:true});expect(posts).toBe(3);
 expect(await publishRegistryOriginal(value,ports)).toEqual(f.entry);expect(posts).toBe(3);
});

it('replays previously acknowledged public parts unchanged during an explicit incomplete-publication retry',async()=>{
 const value=await input(),f=setup(value.plan),attempted:string[]=[];let stop=true;
 const transport=async(url:RequestInfo|URL,init?:RequestInit)=>{if(init?.method){attempted.push(String(init.body));const state=JSON.parse(String(init.body)).signed.storeStateRecord;if(stop&&state.index===1){stop=false;throw new TypeError('Second part acknowledgement lost');}}return f.fetcher(url,init);};
 const ports={...f.ports,fetch:transport as typeof fetch};
 await expect(publishRegistryOriginal(value,ports)).rejects.toMatchObject({uncertain:true});
 expect(await publishRegistryOriginal(value,ports)).toEqual(f.entry);
 expect(attempted[0]).toBe(attempted[2]);expect(attempted[1]).toBe(attempted[3]);
});

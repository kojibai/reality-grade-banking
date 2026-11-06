import {readFileSync} from 'node:fs';
import {beforeAll,expect,it,vi} from 'vitest';
import {createReceizClient,createReceizIdentityKeyFile,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizKeyFile,type ReceizPublicStoreSignedPublish} from '@receiz/sdk';
import {createReceizRegistryStore,registryStore} from '../server/registry-store';
import {admitRegistryProof} from '../server/registry-proof';
import {institutionDirectoryRecords} from '../src/content/institution-scorecard.mjs';
import {REGISTRY_NATIVE_PART_BYTES,REGISTRY_NATIVE_PART_NAMESPACE,REGISTRY_NATIVE_INDEX_NAMESPACE,registryNativePartId,registryNativeIndexId,registryNativeSourceUrl,type RegistryOriginalIndex,type RegistryOriginalPart} from '../src/registry/types';
const bytes=new Uint8Array(readFileSync('public/conformance/bankeiz-public-conformance.png'));
const institution=institutionDirectoryRecords.find(row=>row.id==='bankeiz')!;
let keyFile:ReceizKeyFile;
beforeAll(async()=>{keyFile=(await createReceizIdentityKeyFile({owner:{uid:'registry-fixture-holder',username:'bjklock'},pbkdf2Iterations:1000})).keyFile;});

/** A bounded native HTTP fixture, with actual SDK signatures and no mock artifact verifier. */
function native(registeredHolder='bjklock.receiz.id',registeredKeyFile:ReceizKeyFile=keyFile){
 const rows=new Map<string,Record<string,unknown>>(),writes:ReceizPublicStoreSignedPublish[]=[],readIds:string[]=[];
 const registrations=new Map([[registeredKeyFile.keyId,registeredHolder]]);
 let refusedStatus:number|undefined;
 let ack:'ok'|'false'|'unknown'='ok',hideReadback=false,hideAfterIndex=false,hideNamespace=false;
 const client=createReceizClient({fetchImpl:async(input,init)=>{
  const url=new URL(String(input));
  if(url.pathname==='/api/public-proof/registry/feed'){
   if(refusedStatus){const status=refusedStatus;refusedStatus=undefined;return Response.json({ok:false,error:'private upstream schema diagnostic'},{status});}
   const signed=JSON.parse(String(init?.body)) as ReceizPublicStoreSignedPublish;
   const {keyId,alg,publicKeyRawB64u,challengeB64Url,signatureB64Url}=signed.identityProof;
   expect(await verifyReceizIdentityPublicKeyProjectionSignature({keyId,alg,publicKeyRawB64u,challengeB64Url,signatureB64Url})).toBe(true);
   // The native host's registered-holder authorization remains a remote
   // boundary. This isolated host registers only this fixture's signing key.
   if(registrations.get(keyId)!==signed.merchantReceizId)return Response.json({ok:false,error:'unauthorized'},{status:403});
   const row=signed.feed.records[0];rows.set(row.id,structuredClone(row));writes.push(signed);
   if(hideAfterIndex&&row.schema==='receiz.app.bank.registry.original-index.v1')hideReadback=true;
   if(ack==='unknown'){ack='ok';throw Error('fixture connection lost after acceptance');}
   if(ack==='false'){ack='ok';return Response.json({ok:false});}
   return Response.json({ok:true,storeStateRecordId:row.id,tenantHost:'bankeiz.com',kaiPulse:'fixture',appendAnchorId:'fixture',appendProof:{},knownHead:{afterKaiUpulse:'1',appendAnchorId:'fixture'}});
  }
  if(url.pathname.startsWith('/api/public-proof/namespace/')){
   const namespace=decodeURIComponent(url.pathname.slice('/api/public-proof/namespace/'.length));
   return Response.json({ok:true,records:hideNamespace?[]:[...rows.values()].filter(row=>row.namespace===namespace)});
  }
  const id=decodeURIComponent(url.pathname.slice('/api/public-proof/'.length));readIds.push(id);
  return Response.json({ok:true,record:hideReadback?null:rows.get(id)??null});
 }});
 return{client,rows,writes,readIds,register(publisher:string,key:ReceizKeyFile){registrations.set(key.keyId,publisher);},refuseNext(status:number){refusedStatus=status;},setAck(value:typeof ack){ack=value;},hideReadback(value:boolean){hideReadback=value;},hideAfterIndex(value:boolean){hideAfterIndex=value;},hideNamespace(value:boolean){hideNamespace=value;}};
}
async function prepared(client:ReturnType<typeof createReceizClient>,merchantReceizId='bjklock.receiz.id',options:{bytes?:Uint8Array;publication?:Awaited<ReturnType<typeof admitRegistryProof>>;keyFile?:ReceizKeyFile;passphrase?:string;prior?:{parts:ReceizPublicStoreSignedPublish[];index:ReceizPublicStoreSignedPublish}}={}){
 const source=options.bytes??bytes,publication=options.publication??await admitRegistryProof(institution,source,{now:()=>new Date('2026-11-06T00:00:00.000Z')}),count=Math.ceil(source.length/REGISTRY_NATIVE_PART_BYTES),signer={keyFile:options.keyFile??keyFile,passphrase:options.passphrase};
 const parts:ReceizPublicStoreSignedPublish<RegistryOriginalPart&Record<string,unknown>>[]=[];
 for(let index=0;index<count;index++){
  const payload:RegistryOriginalPart={schema:'receiz.app.bank.registry.original-part.v1',institutionId:publication.institutionId,artifactSha256:publication.artifactSha256,index,count,originalBytes:source.length,publisherReceizId:merchantReceizId,publisherKeyId:signer.keyFile.keyId,transportNonce:String(options.prior?.parts[index].storeStateRecord.transportNonce??crypto.randomUUID()),bytesB64u:Buffer.from(source.subarray(index*REGISTRY_NATIVE_PART_BYTES,(index+1)*REGISTRY_NATIVE_PART_BYTES)).toString('base64url')};
  const id=registryNativePartId(publication.institutionId,publication.artifactSha256,index,payload.publisherKeyId,payload.transportNonce);
  parts.push(await client.publicStore.signPublish({tenantHost:'bankeiz.com',merchantReceizId,...signer,id,sourceUrl:registryNativeSourceUrl(id),namespace:REGISTRY_NATIVE_PART_NAMESPACE,schema:payload.schema,storeStateRecord:{...payload}}));
 }
 const payload:RegistryOriginalIndex={schema:'receiz.app.bank.registry.original-index.v1',publication,originalBytes:source.length,partCount:count,publisherReceizId:merchantReceizId,publisherKeyId:signer.keyFile.keyId,transportNonce:String(options.prior?.index.storeStateRecord.transportNonce??crypto.randomUUID()),partIds:parts.map(signed=>signed.feed.records[0].id)},id=registryNativeIndexId(publication.institutionId,publication.artifactSha256,payload.publisherKeyId,payload.transportNonce);
 const signed=await client.publicStore.signPublish({tenantHost:'bankeiz.com',merchantReceizId,...signer,id,sourceUrl:registryNativeSourceUrl(id),namespace:REGISTRY_NATIVE_INDEX_NAMESPACE,schema:payload.schema,storeStateRecord:{...payload}});
 return{publication,parts,index:signed};
}

it('uses Receiz publication without a Redis, environment token or unsigned append path',async()=>{
 const store=registryStore(),record=await admitRegistryProof(institution,bytes);
 expect(store).not.toBeNull();
 await expect(store.append(record,bytes)).rejects.toMatchObject({code:'REGISTRY_PUBLISH_SIGNATURE_REQUIRED',status:428});
});
it('publishes signed exact-byte parts before the index and verifies the real Original on a cold public read',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 await expect(store.publishProof(plan.index)).rejects.toMatchObject({code:'REGISTRY_NATIVE_SOURCE_INVALID'});
 expect(host.writes).toHaveLength(0);
 for(const part of plan.parts)await store.publishPart(part);
 const accepted=await store.publishProof(plan.index);
 expect(accepted).toEqual({institutionId:'bankeiz',revision:1,current:plan.publication,history:[]});
 expect(host.writes.map(write=>write.storeStateRecord.schema)).toEqual([...plan.parts.map(()=> 'receiz.app.bank.registry.original-part.v1'),'receiz.app.bank.registry.original-index.v1']);
 const cold=createReceizRegistryStore({client:host.client});
 expect(await cold.list()).toEqual([accepted]);
 expect(await cold.original('bankeiz',plan.publication.artifactSha256)).toEqual(bytes);
},30000);
it('retries the same Original by public lookup without publishing duplicate parts or reordering history',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 for(const part of plan.parts)await store.publishPart(part);
 const accepted=await store.publishProof(plan.index),writes=host.writes.length;
 for(const part of plan.parts)await store.publishPart(part);
 expect(await store.publishProof(plan.index)).toEqual(accepted);
 expect(host.writes).toHaveLength(writes);
},30000);
it('rejects source substitution, malformed signatures, mismatched publisher keys and foreign namespaces before an index write',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 const changed=structuredClone(plan.parts[0]);changed.storeStateRecord.bytesB64u='eA';
 await expect(store.publishPart(changed)).rejects.toMatchObject({code:'REGISTRY_NATIVE_SOURCE_INVALID'});
 const signature=structuredClone(plan.parts[0]);signature.identityProof.signatureB64Url='AA';
 await expect(store.publishPart(signature)).rejects.toMatchObject({code:'REGISTRY_NATIVE_AUTHORIZATION_REQUIRED'});
 const foreign=structuredClone(plan.parts[0]);foreign.feed.namespace='other.application';
 await expect(store.publishPart(foreign)).rejects.toMatchObject({code:'REGISTRY_NATIVE_SOURCE_INVALID'});
 for(const part of plan.parts)await store.publishPart(part);
 const other=structuredClone(plan.parts[0]);other.storeStateRecord.publisherKeyId='different-key';
 await expect(store.publishPart(other)).rejects.toMatchObject({code:'REGISTRY_NATIVE_AUTHORIZATION_REQUIRED'});
 const publisher=structuredClone(plan.index);publisher.storeStateRecord.publisherReceizId='different-publisher.receiz.id';
 await expect(store.publishProof(publisher)).rejects.toMatchObject({code:'REGISTRY_NATIVE_AUTHORIZATION_REQUIRED'});
 expect(host.writes).toHaveLength(plan.parts.length);
},30000);
it('does not accept a namespace projection as proof authority or lose previously held accepted truth to a partial response',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 for(const part of plan.parts)await store.publishPart(part);
 const accepted=await store.publishProof(plan.index);
 const id=plan.index.feed.records[0].id,forged=structuredClone(host.rows.get(id)!);
 (forged.data as {storeStateRecord:RegistryOriginalIndex}).storeStateRecord.publication.cases=999;
 host.rows.set(id,forged);
 const cold=createReceizRegistryStore({client:host.client});expect(await cold.list()).toEqual([]);
 host.rows.clear();expect(await store.list()).toEqual([accepted]);
},30000);
it('refuses conflicting stored parts rather than overwriting their content-addressed identity',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 const part=structuredClone(plan.parts[0].feed.records[0]);
 (part.data.storeStateRecord as RegistryOriginalPart).bytesB64u='eA';host.rows.set(part.id,part);
 await expect(store.publishPart(plan.parts[0])).rejects.toMatchObject({code:'REGISTRY_NATIVE_SOURCE_CONFLICT'});
 expect(host.writes).toHaveLength(0);
});
it('reports an unknown native outcome without claiming that no write occurred, then recovers the identical attempt by readback',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 host.setAck('unknown');
 await expect(store.publishPart(plan.parts[0])).rejects.toMatchObject({code:'REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED',status:503});
 expect(host.writes).toHaveLength(1);
 await store.publishPart(plan.parts[0]);expect(host.writes).toHaveLength(1);
 for(const part of plan.parts.slice(1))await store.publishPart(part);
 host.setAck('false');
 await expect(store.publishProof(plan.index)).rejects.toMatchObject({code:'REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED'});
 expect((await store.publishProof(plan.index)).current).toEqual(plan.publication);
},30000);
it('reports a definitive native schema refusal separately from an unknown publication outcome',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 host.refuseNext(400);
 await expect(store.publishPart(plan.parts[0])).rejects.toMatchObject({code:'REGISTRY_NATIVE_PUBLICATION_REFUSED',status:400});
 expect(host.rows.size).toBe(0);expect(host.writes).toHaveLength(0);
 host.refuseNext(400);
 await expect(store.publishPart(plan.parts[0])).rejects.not.toThrow('private upstream schema diagnostic');
});
it.each([408,429,500,503])('keeps a native %i publication response unconfirmed',async status=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});host.refuseNext(status);
 await expect(store.publishPart(plan.parts[0])).rejects.toMatchObject({code:'REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED',status:503});
});
it('requires confirmed native acceptance and public readback before returning a new PASS',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 for(const part of plan.parts)await store.publishPart(part);
 host.hideReadback(true);
 await expect(store.publishProof(plan.index)).rejects.toMatchObject({code:'REGISTRY_NATIVE_SOURCE_INVALID'});
 expect(host.writes).toHaveLength(plan.parts.length);
});
it('keeps failed public lookup distinct from a successful empty register',async()=>{
 const host=native(),client={...host.client,appState:{...host.client.appState,byNamespace:vi.fn(async()=>({ok:false,records:[]}))}};
 await expect(createReceizRegistryStore({client}).list()).rejects.toMatchObject({code:'REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED'});
});
it('does not turn a failed native Original-part response into an empty successful lookup',async()=>{
 const host=native(),plan=await prepared(host.client);
 for(const signed of [...plan.parts,plan.index]){const row=signed.feed.records[0];host.rows.set(row.id,structuredClone(row));}
 const client={...host.client,appState:{...host.client.appState,byId:vi.fn(async()=>({ok:false,record:null}))}};
 await expect(createReceizRegistryStore({client}).list()).rejects.toMatchObject({code:'REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED'});
});
it('keeps the original publication time when the same exact proof is prepared and signed again',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 for(const part of plan.parts)await store.publishPart(part);
 const accepted=await store.publishProof(plan.index),count=host.writes.length;
 const retry=await prepared(host.client,'bjklock.receiz.id',{publication:{...plan.publication,acceptedAt:'2026-11-07T00:00:00.000Z'},prior:plan});
 expect(await store.publishProof(retry.index)).toEqual(accepted);expect(host.writes).toHaveLength(count);
},30000);
it('does not return PASS when native acceptance occurred but the final public index cannot be read back',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 for(const part of plan.parts)await store.publishPart(part);
 host.hideAfterIndex(true);
 await expect(store.publishProof(plan.index)).rejects.toMatchObject({code:'REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED'});
 expect(host.writes).toHaveLength(plan.parts.length+1);
 host.hideReadback(false);host.hideAfterIndex(false);
 expect((await store.publishProof(plan.index)).current).toEqual(plan.publication);
 expect(host.writes).toHaveLength(plan.parts.length+1);
},30000);
it('rejects oversized native envelopes before any native request',async()=>{
 const host=native(),store=createReceizRegistryStore({client:host.client});
 await expect(store.publishPart({data:'x'.repeat(2*1024*1024)})).rejects.toMatchObject({code:'REGISTRY_NATIVE_SOURCE_INVALID',status:413});
 expect(host.writes).toHaveLength(0);expect(host.readIds).toHaveLength(0);
});
it('waits for public namespace lookup to locate a new accepted index before exposing PASS',async()=>{
 const host=native(),plan=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 for(const part of plan.parts)await store.publishPart(part);
 host.hideNamespace(true);
 await expect(store.publishProof(plan.index)).rejects.toMatchObject({code:'REGISTRY_NATIVE_PUBLICATION_UNCONFIRMED'});
 expect(await store.list()).toEqual([]);
 expect(host.writes).toHaveLength(plan.parts.length+1);
 host.hideNamespace(false);
 expect((await store.publishProof(plan.index)).current).toEqual(plan.publication);
 expect(host.writes).toHaveLength(plan.parts.length+1);
},30000);
it('allows an authenticated directory publisher to publish somebody else’s public passing Original without changing its holder',async()=>{
 const editor=(await createReceizIdentityKeyFile({owner:{uid:'registry-editor',username:'directory-editor'},pbkdf2Iterations:1000})).keyFile;
 const publisher='directory-editor.receiz.id',host=native(publisher,editor),plan=await prepared(host.client,publisher,{keyFile:editor}),store=createReceizRegistryStore({client:host.client});
 expect(plan.publication.holderReceizId).toBe('bjklock.receiz.id');expect(plan.publication.holderReceizId).not.toBe(publisher);
 for(const part of plan.parts)await store.publishPart(part);
 const accepted=await store.publishProof(plan.index);
 expect(accepted.current.holderReceizId).toBe('bjklock.receiz.id');expect(accepted.current.artifactSha256).toBe(plan.publication.artifactSha256);
 for(const row of host.rows.values())expect(row.externalCreatorId).toBe(publisher);
 expect(await createReceizRegistryStore({client:host.client}).list()).toEqual([accepted]);
},30000);
it('deduplicates the exact verified Original across independently authenticated publishers and transport nonces',async()=>{
 const host=native(),first=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 for(const part of first.parts)await store.publishPart(part);
 const accepted=await store.publishProof(first.index);
 const editor=(await createReceizIdentityKeyFile({owner:{uid:'registry-second-editor',username:'second-editor'},pbkdf2Iterations:1000})).keyFile,publisher='second-editor.receiz.id';host.register(publisher,editor);
 const second=await prepared(host.client,publisher,{keyFile:editor});
 expect(second.parts[0].feed.records[0].id).not.toBe(first.parts[0].feed.records[0].id);
 expect(second.index.feed.records[0].id).not.toBe(first.index.feed.records[0].id);
 for(const part of second.parts)await store.publishPart(part);
 expect(await store.publishProof(second.index)).toEqual(accepted);
 const cold=createReceizRegistryStore({client:host.client});expect(await cold.list()).toEqual([accepted]);
 expect(await cold.original('bankeiz',first.publication.artifactSha256)).toEqual(bytes);
},30000);
it('isolates a preoccupied corrupt transport from a fresh publisher and does not let its index shadow a valid same-hash Original',async()=>{
 const host=native(),good=await prepared(host.client),store=createReceizRegistryStore({client:host.client});
 const attacker=(await createReceizIdentityKeyFile({owner:{uid:'registry-attacker',username:'attacker'},pbkdf2Iterations:1000})).keyFile,publisher='attacker.receiz.id';host.register(publisher,attacker);
 const corrupt=bytes.slice();corrupt[100]^=1;
 const bad=await prepared(host.client,publisher,{keyFile:attacker,bytes:corrupt,publication:good.publication});
 for(const part of bad.parts)await store.publishPart(part);
 await expect(store.publishProof(bad.index)).rejects.toMatchObject({code:'REGISTRY_NATIVE_SOURCE_INVALID'});
 // Generic native publication remains public app state, not Registry admission.
 // A receiver must reject this genuinely signed but invalid candidate on read.
 await host.client.publicStore.publishSigned(bad.index);
 const occupied=new Set(host.rows.keys());
 for(const part of good.parts){expect(occupied.has(part.feed.records[0].id)).toBe(false);await store.publishPart(part);}
 const accepted=await store.publishProof(good.index);
 expect(accepted.revision).toBe(1);
 expect(await createReceizRegistryStore({client:host.client}).list()).toEqual([accepted]);
 const part=good.parts[0].storeStateRecord;
 const forgedId=registryNativePartId(part.institutionId,part.artifactSha256,part.index,attacker.keyId,part.transportNonce);
 expect(forgedId).not.toBe(good.parts[0].feed.records[0].id);
},30000);
it.each(['missing','corrupt'] as const)('does not admit an official current Original whose native parts are %s on a cold read',async kind=>{
 const host=native(),receiver={...institution,id:'official-native-fixture',website:'https://official-native.example/',recordedConformance:undefined};
 const fetcher=vi.fn(async()=>new Response(new Uint8Array(bytes)));
 const publication=await admitRegistryProof(receiver,bytes,{fetch:fetcher});
 const carried=bytes.slice();if(kind==='corrupt')carried[100]^=1;
 const plan=await prepared(host.client,'bjklock.receiz.id',{publication,bytes:carried});
 if(kind==='corrupt')for(const part of plan.parts)await host.client.publicStore.publishSigned(part);
 // The generic native rail stores a signed projection. Official association
 // and a matching index cannot stand in for its complete stored Original.
 await host.client.publicStore.publishSigned(plan.index);
 const cold=createReceizRegistryStore({client:host.client,institutions:[receiver],fetch:fetcher});
 expect(await cold.list()).toEqual([]);
 expect(await cold.original(receiver.id,publication.artifactSha256)).toBeNull();
 const complete=await prepared(host.client,'bjklock.receiz.id',{publication});
 for(const part of complete.parts)await host.client.publicStore.publishSigned(part);
 await host.client.publicStore.publishSigned(complete.index);
 const recovered=await cold.list();
 expect(recovered).toHaveLength(1);expect(recovered[0].revision).toBe(1);
 expect(await cold.original(receiver.id,publication.artifactSha256)).toEqual(bytes);
},30000);
it('retains genuine scoped proof history and selects the official current Original without timestamp ordering',async()=>{
 const {conformanceOfflineFixture}=await import('./helpers/conformance-offline-sealer');
 const {runContractAssessment,referenceContractAdapter}=await import('../src/conformance/contract');
 const {createConformanceEvidenceObject}=await import('../src/conformance/evidence-object');
 const {sealConformanceEvidenceObject,openSealedConformanceEvidenceObject}=await import('../src/conformance/receiz-evidence-seal');
 const fixture=await conformanceOfflineFixture({account:true});
 const receiver={id:'synthetic-registry-receiver',name:'Synthetic Registry Receiver',website:'https://receiver.example/',assessment:null};
 const make=async(build:string,nonce:string)=>sealConformanceEvidenceObject(await createConformanceEvidenceObject(await runContractAssessment(referenceContractAdapter,{name:receiver.name,buildSha256:build.repeat(64)},nonce)),{identitySource:async()=>fixture.identity},fixture.ports);
 const first=await make('a','registry-first-independent-contract'),second=await make('b','registry-second-independent-contract');
 const holder=first.object.report.credentialHolder!.receizId;
 expect(second.object.report.credentialHolder!.receizId).toBe(holder);
 const signingKey=await fixture.runtime.createReceizClient().identity.readArtifact(fixture.identity.bytes) as ReceizKeyFile;
 const host=native(holder,signingKey);let official=first.bytes;
 const fetcher=vi.fn(async()=>new Response(new Uint8Array(official)));
 const open=vi.fn((bytes:Uint8Array)=>openSealedConformanceEvidenceObject(bytes,fixture.ports));
 const ports={client:host.client,institutions:[receiver],openProof:open,fetch:fetcher};
 const prepare=async(original:typeof first,date:string)=>prepared(host.client,holder,{bytes:original.bytes,publication:await admitRegistryProof(receiver,original.bytes,{openProof:open,fetch:fetcher,now:()=>new Date(date)}),keyFile:signingKey,passphrase:fixture.identity.phrase});
 const firstPlan=await prepare(first,'2026-11-07T00:00:00.000Z'),store=createReceizRegistryStore(ports);
 for(const part of firstPlan.parts)await store.publishPart(part);
 await store.publishProof(firstPlan.index);
 official=second.bytes;
 // The current selected Original has an earlier display date: dates cannot win.
 const secondPlan=await prepare(second,'2026-11-06T00:00:00.000Z');
 for(const part of secondPlan.parts)await store.publishPart(part);
 const accepted=await store.publishProof(secondPlan.index);
 expect(accepted.revision).toBe(2);expect(accepted.current.artifactSha256).toBe(second.artifactSha256);expect(accepted.history.map(record=>record.artifactSha256)).toEqual([first.artifactSha256]);
 expect(await store.publishProof(firstPlan.index)).toEqual(accepted);
 const cold=createReceizRegistryStore(ports);expect(await cold.list()).toEqual([accepted]);
 const retryCold=createReceizRegistryStore(ports);expect(await retryCold.publishProof(firstPlan.index)).toEqual(accepted);
 const opens=open.mock.calls.length,fetches=fetcher.mock.calls.length;
 host.rows.clear();expect(await cold.list()).toEqual([accepted]);
 expect(await cold.original(receiver.id,first.artifactSha256)).toEqual(first.bytes);
 expect(open).toHaveBeenCalledTimes(opens);expect(fetcher).toHaveBeenCalledTimes(fetches);
},120000);

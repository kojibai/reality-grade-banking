import {expect,it,vi} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import type {OpenIdentity} from '../src/receiz/native-identity';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
const ports=vi.hoisted(()=>({sdk:null as unknown,read:vi.fn()}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>ports.sdk}));
vi.mock('../src/receiz/native-transport',()=>({nativeFetch:(url:URL)=>ports.read(url)}));

it('reopens retained public charter bytes in a fresh verifier while delivery is down, then appends the next accepted Original',async()=>{
 const f=await conformanceOfflineFixture({account:true}),installed=await import('@receiz/sdk');ports.sdk={...installed,...f.runtime};
 const sdk=f.runtime,admission=await sdk.createReceizArtifactAdmissionEngine()(await sdk.verifyReceizArtifact(f.identity.bytes),{profile:'identity',identityPassphrase:f.identity.phrase}),binding=await sdk.readReceizIdentityPublicBinding(admission);
 const sealer=sdk.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('OFFLINE');}});
 const identity={binding,sealRecordExport:async input=>{const r=await sealer.seal(input);return new File([new Uint8Array(r.artifactBytes)],r.filename,{type:r.mimeType});}} as OpenIdentity;
 const retained=new Map<string,Response>(),cache={
   keys:async()=>[...retained.keys()].map(url=>new Request(url)),
   match:async(key:string|Request)=>retained.get(typeof key==='string'?key:key.url)?.clone(),
   put:async(key:string,r:Response)=>{retained.set(key,r.clone());},
 };
 vi.stubGlobal('caches',{open:async()=>cache});vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 try{
   const documents=await import('../src/receiz/governance-documents'),first=await import('../src/receiz/governance-directory');
   const charter=await documents.sealGovernanceOriginal(identity,{kind:'charter',rules:{name:'Community lab',purpose:'Shared research',founders:[binding.artifactOwnerReceizId],membership:'Founders',decisions:'Members vote',representation:'Direct',amendments:'By consent',appeals:'Open objections',treasury:'None',approvalPercent:70,minimumSupportPercent:50,voteDays:3,appealDays:1,allowMandates:false}});
   const ratification=await documents.sealGovernanceOriginal(identity,{kind:'ratification',charter:charter.digest});
   const transport=async(o:typeof charter)=>{const r=await first.publicationRecord(o);return {...r,appObjectId:r.id,appNamespace:r.namespace,appProjectionClientId:BANK_APPLICATION_ID};};
   const old=await transport(charter),addition=await transport(ratification);
   await first.admitPublicGovernanceRow(old);
   vi.resetModules();ports.sdk={...installed,...await f.reloadRuntime()};
   const cold=await import('../src/receiz/governance-directory');await cold.restoreGovernanceDirectory();
   ports.read.mockRejectedValueOnce(Error('OFFLINE'));await expect(cold.refreshGovernanceDirectory()).rejects.toThrow('OFFLINE');
   expect(cold.governanceRows().map(r=>r.digest)).toEqual([charter.digest]);
   expect(new Uint8Array(await (await cold.heldGovernanceOriginal(charter.digest)).file.arrayBuffer())).toEqual(new Uint8Array(await charter.file.arrayBuffer()));
   const a='2026-11-18T12:00:00.000001+00:00~11111111-1111-4111-8111-111111111111',b='2026-11-18T12:00:00.000002+00:00~11111111-1111-4111-8111-111111111111';
   ports.read.mockResolvedValueOnce(Response.json({ok:true,records:[old],nextCursor:a,checkpoint:a})).mockResolvedValueOnce(Response.json({ok:true,records:[addition],nextCursor:null,checkpoint:b})).mockResolvedValueOnce(Response.json({ok:true,records:[],nextCursor:null,checkpoint:b}));
   await cold.refreshGovernanceDirectory();await cold.refreshGovernanceDirectory();
   expect(ports.read.mock.lastCall?.[0].searchParams.get('after')).toBe(b);
   expect(cold.governanceRows().map(r=>r.digest).sort()).toEqual([charter.digest,ratification.digest].sort());
   vi.resetModules();const resumed=await import('../src/receiz/governance-directory');await resumed.restoreGovernanceDirectory();
   expect((await resumed.heldGovernanceOriginal(ratification.digest)).document.terms).toEqual({kind:'ratification',charter:charter.digest});
 }finally{vi.unstubAllGlobals();}
},60000);

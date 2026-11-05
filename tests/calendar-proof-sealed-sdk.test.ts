import {expect,it} from 'vitest';
import {canonicalizeReceizConstitution} from '@receiz/sdk';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {verifyCalendarProof,calendarProofExportInput} from '../src/receiz/calendar-proof';
import {createRecordProofExports} from '../src/receiz/record-proof-export';
import type {OrganizerEvent} from '../src/receiz/organizer-types';

it('seals an exact Calendar capture with the real SDK and rejects altered history under explicit fixture roots',async()=>{
 const f=await conformanceOfflineFixture();
 const identityVerification=await f.runtime.verifyReceizArtifact(f.identity.bytes),admission=await f.runtime.createReceizArtifactAdmissionEngine()(identityVerification,{profile:'identity',identityPassphrase:f.identity.phrase});
 const owner=await f.runtime.readReceizIdentityPublicBinding(admission),sealer=f.runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('NETWORK_FORBIDDEN');}});
 const event:OrganizerEvent={id:'10000000-0000-4000-8000-000000000003',ownerUserId:'synthetic-owner',createdByUserId:null,title:'Synthetic share sale',kind:'traction',source:'system',startAt:'2026-11-04T12:00:00Z',endAt:'2026-11-04T12:10:00Z',location:'',note:'Synthetic record capture only',attendees:[],metadata:{actionKind:'market.share.sell',amountUsdCents:'590',entryHash:'a'.repeat(64)},createdAt:'2026-11-04T12:00:00Z',updatedAt:'2026-11-04T12:00:00Z'};
 const core={kind:'receiz.calendar.event.bundle.v1',version:1,hashAlgorithm:'sha256-jcs',event,provenance:{entryHash:'a'.repeat(64)},conversation:{request:null,reply:null},visitor:{kind:'unknown'},summary:null};
 const sha=async(value:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(value)))].map(n=>n.toString(16).padStart(2,'0')).join(''),bundleHash=await sha(new TextEncoder().encode(canonicalizeReceizConstitution(core)));
 const proof=await verifyCalendarProof({ok:true,bundleHash,bundle:{...core,bundleHash}},event,event.ownerUserId),input=calendarProofExportInput(proof,event,event.ownerUserId),states=new Map(),blobs=new Map<string,Uint8Array>();let seals=0;
 const ports={assertOpen(){},read:async(key:string)=>states.get(key)??null,write:async(key:string,next:unknown)=>{states.set(key,next);},retain:async(bytes:Uint8Array)=>{const key=await sha(bytes);blobs.set(key,new Uint8Array(bytes));return key;},restore:async(key:string)=>new Uint8Array(blobs.get(key)!),seal:async(source:{bytes:Uint8Array;filename:string;mimeType?:string})=>{seals++;return sealer.seal(source);}};
 const file=await createRecordProofExports(ports).export(input),bytes=new Uint8Array(await file.arrayBuffer()),verified=await f.runtime.verifyReceizArtifact(bytes);
 expect(verified.status).toBe('verified-artifact');
 const opened=await f.runtime.openPayload({fileBytes:bytes,filename:file.name,mime:file.type,signatureV4RootPublicKeys:new Map(f.roots.map(root=>[root.kid,root]))});expect(opened.ok).toBe(true);expect(opened.verification.bundle.nativeRecordSeal.ownerReceizId).toBe(owner.artifactOwnerReceizId);expect(JSON.parse(new TextDecoder().decode(opened.payloadBytes))).toEqual(JSON.parse(new TextDecoder().decode(input.bytes)));
 const restored=await createRecordProofExports(ports).export(input);expect(new Uint8Array(await restored.arrayBuffer())).toEqual(bytes);expect(seals).toBe(1);
 const altered=JSON.parse(new TextDecoder().decode(bytes));expect(altered.event.title).toBe(event.title);altered.event={...altered.event,title:'Changed share sale'};
 const changedCore={...core,event:altered.event};altered.bundleHash=await sha(new TextEncoder().encode(canonicalizeReceizConstitution(changedCore)));
 expect((await f.runtime.verifyReceizArtifact(new TextEncoder().encode(JSON.stringify(altered)))).status).not.toBe('verified-artifact');
 expect((await f.runtime.verifyReceizArtifact(input.bytes)).status).not.toBe('verified-artifact');
},60000);

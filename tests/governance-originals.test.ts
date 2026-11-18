import {beforeAll,expect,it,vi} from 'vitest';
import {conformanceOfflineFixture} from './helpers/conformance-offline-sealer';
import {verifyGovernanceTally,verifyGovernanceEvidence} from '../src/receiz/governance-evidence';
import {governanceSchema,openGovernanceOriginal,sealGovernanceOriginal,type CharterRules} from '../src/receiz/governance-documents';
import {publicationRecord,admitPublicGovernanceRow,heldGovernanceOriginal,governanceRows} from '../src/receiz/governance-directory';
import {charterRatification,ofKind,ballotRegister} from '../src/receiz/governance-view';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import type {OpenIdentity} from '../src/receiz/native-identity';
const ports=vi.hoisted(()=>({sdk:null as unknown}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>ports.sdk}));
let first:OpenIdentity,second:OpenIdentity,rules:CharterRules;
beforeAll(async()=>{
 const f=await conformanceOfflineFixture({account:true}),sdk=f.runtime;ports.sdk={...await import('@receiz/sdk'),...sdk};
 async function actor(id:typeof f.identity,uid:string){
   const admission=await sdk.createReceizArtifactAdmissionEngine()(await sdk.verifyReceizArtifact(id.bytes),{profile:'identity',identityPassphrase:id.phrase});
   const binding=await sdk.readReceizIdentityPublicBinding(admission),sealer=sdk.offline.createReceizOfflineSealer({ownerIdentityAdmission:admission,store:f.store,resources:f.resources,fetch:async()=>{throw Error('NETWORK_UNAVAILABLE');}});
   return {binding,walletReceivingAddress:()=>uid,sealRecordExport:async input=>{const result=await sealer.seal(input);return new File([new Uint8Array(result.artifactBytes)],result.filename,{type:result.mimeType});}} as OpenIdentity;
 }
 first=await actor(f.identity,'11111111-1111-4111-8111-111111111111');second=await actor(await f.otherIdentity(),'22222222-2222-4222-8222-222222222222');
 rules={name:'Open workshop',purpose:'Maintain the common workshop.',founders:[first.binding.artifactOwnerReceizId,second.binding.artifactOwnerReceizId],membership:'Named founders',decisions:'One vote each',representation:'Direct votes',amendments:'Ratify a successor',appeals:'Record an objection',treasury:'No spending authority',approvalPercent:67,minimumSupportPercent:25,voteDays:7,appealDays:2,allowMandates:true};
},60000);
it('opens, ratifies and votes on exact public Originals using two real identities with external reads unavailable',async()=>{
 const orig=await sealGovernanceOriginal(first,{kind:'charter',rules});
 const copy=new File([await orig.file.arrayBuffer()],orig.file.name,{type:orig.file.type});
 const reopened=await openGovernanceOriginal(copy);
 expect(reopened.digest).toBe(orig.digest);expect(reopened.document.terms).toEqual({kind:'charter',rules});
 const publish=async(o:typeof orig)=>{
   const record=await publicationRecord(o);
   expect(record.schema).toMatch(/^receiz\.app\.[a-z0-9_.:-]+\.v1$/);
   const row={...record,appObjectId:record.id,appNamespace:record.namespace,appProjectionClientId:BANK_APPLICATION_ID,appProjectionPublishedByReceizUserId:o.document.accountUid};
   await admitPublicGovernanceRow(row);await admitPublicGovernanceRow(row);
   return row;
 };
 const delivered=await publish(orig);
 const charter=ofKind(governanceRows(),'charter')[0];expect(charter.digest).toBe(orig.digest);
 expect(charter.profileUid).toBe(first.walletReceivingAddress!());
 for(const actor of [first,second]){await publish(await sealGovernanceOriginal(actor,{kind:'ratification',charter:orig.digest}));expect(charterRatification(charter,governanceRows()).complete).toBe(actor===second);}
 const proposal=await sealGovernanceOriginal(first,{kind:'proposal',charter:orig.digest,title:'Workshop hours',text:'Open on Sunday?',decision:'Poll',choices:['Yes','No']});await publish(proposal);
 const ballot={kind:'ballot',charter:orig.digest,proposal:proposal.digest,choice:'Yes',previous:null} as const;
 const earlier=await sealGovernanceOriginal(second,ballot);await publish(earlier);
 const revised=await sealGovernanceOriginal(second,{...ballot,choice:'No',previous:earlier.digest});await publish(revised);
 const poll=ofKind(governanceRows(),'proposal')[0];expect([...ballotRegister(poll,charter,governanceRows()).counts]).toEqual([['Yes',0],['No',1]]);
 const evidence=await verifyGovernanceEvidence(revised.digest,heldGovernanceOriginal,governanceRows());
 expect(evidence.scope).toContain('counted direct ballot');expect(evidence.original.document.author).toBe(second.binding.artifactOwnerReceizId);
 expect(evidence.references.map(r=>r.digest)).toEqual(expect.arrayContaining([orig.digest,proposal.digest,earlier.digest]));
 expect((await verifyGovernanceEvidence(earlier.digest,heldGovernanceOriginal,governanceRows())).scope).toContain('successor');
 const partial=await verifyGovernanceEvidence(revised.digest,async d=>{if(d!==revised.digest)throw Error('OFFLINE');return reopenedBallot();},[]);
 function reopenedBallot(){return openGovernanceOriginal(revised.file);}
 expect(partial.scope).toContain('Supporting Originals are missing');
 const audit=await verifyGovernanceTally(proposal.digest,heldGovernanceOriginal,governanceRows());expect(audit.tally.counts.get('No')).toBe(1);expect(audit.originalCount).toBe(6);
 expect(governanceRows().length).toBe(6);
 await publish(await sealGovernanceOriginal(second,{...ballot,previous:earlier.digest}));
 expect(ballotRegister(poll,charter,governanceRows()).disputed.has(second.binding.artifactOwnerReceizId)).toBe(true);
 const fake=new File([JSON.stringify({schema:governanceSchema,terms:orig.document.terms})],'charter.json',{type:'application/json'});
 await expect(openGovernanceOriginal(fake)).rejects.toThrow();
 await expect(admitPublicGovernanceRow({...delivered,appObjectId:'bankeiz-voting-'+'b'.repeat(64),data:{...delivered.data,digest:'b'.repeat(64)}})).rejects.toThrow();
},120000);

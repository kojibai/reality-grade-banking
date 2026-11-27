import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';
import {beforeAll,expect,it,vi} from 'vitest';
import * as installed from '@receiz/sdk';
import {createGovernanceExecution,type GovernanceExecutionPorts} from '../src/receiz/governance-execution';
import {openGovernanceOriginal} from '../src/receiz/governance-documents';
import {readGovernanceDecision} from '../src/receiz/governance-execution-plan';
import {openGovernanceRegister,exactRegisterFile} from '../src/receiz/governance-execution-register';
import type {ReceizPortableSealedArtifactV124} from '@receiz/sdk';

type Sources={proposal:string;originals:ReceizPortableSealedArtifactV124[]};
const fixture=JSON.parse(gunzipSync(readFileSync('tests/fixtures/governance-example/binding-sources.json.gz')).toString()) as {
 election:Sources;policy:Sources;treasury:Sources;register:ReceizPortableSealedArtifactV124;roots:{kid:string}[]
};
const testSdk=vi.hoisted(()=>({module:null as unknown}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>testSdk.module}));
async function fixtureRuntime(roots:{kid:string}[],contents:string){
 // Only the verification root is replaced in this isolated SDK instance. Every
 // seal, KKS proof, admission, carrier, hash and tally is verified normally.
 const built=await build({stdin:{contents,resolveDir:process.cwd()},
   bundle:true,platform:'browser',format:'esm',target:'es2022',minify:true,write:false,external:['node:*'],
   plugins:[{name:'isolated-signed-election-root',setup(plugin){plugin.onLoad({filter:/sdk\/dist\/verifier\/roots\.js$/},()=>({contents:
    'export const receizCurrentPinnedSignatureV4Roots=()=>new Map('+JSON.stringify(roots)+'.map(key=>[key.kid,key]));export const receizV109PinnedSignatureV4Roots=receizCurrentPinnedSignatureV4Roots;'}));}}]});
 return import(/* @vite-ignore */'data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].contents).toString('base64'));
}
beforeAll(async()=>{
 const runtime=await fixtureRuntime(fixture.roots,"export {createReceizClient,verifyReceizArtifact,createReceizArtifactAdmissionEngine} from '@receiz/sdk';");
 testSdk.module={...installed,...runtime};
});
async function inputs(source:Sources){
 return {proposal:source.proposal,originals:await Promise.all(source.originals.map(async wire=>openGovernanceOriginal(await exactRegisterFile(wire))))};
}
it('reads closed signed election, policy and treasury decisions without custody or a network request',async()=>{
 for(const [source,kind] of [[fixture.election,'Election'],[fixture.policy,'Policy'],[fixture.treasury,'Treasury']] as const){
  const input=await inputs(source),signed=await readGovernanceDecision(input);
  expect(signed.decision).toBe(kind);expect(signed.approved).toBe(true);
  expect(signed.closures).toHaveLength(2);expect(BigInt(signed.closedAtKai)).toBeGreaterThan(0n);
  expect(signed.counts.reduce((n,choice)=>n+choice.count,0)).toBe(2);
  if(kind==='Election')expect(signed.seated).toHaveLength(1);
  if(kind==='Treasury')expect(signed.payment?.amountPhiMicro).toBeTruthy();
  await expect(readGovernanceDecision({...input,originals:input.originals.filter(o=>o.digest!==signed.closures[0])})).rejects.toThrow(/each elector/i);
  await expect(readGovernanceDecision({...input,originals:[{...input.originals[0]},...input.originals.slice(1)]})).rejects.toThrow(/complete governance Original/i);
 }
},60000);
it('opens the pinned genesis offline, retains the exact Original on cold reopen and reviews only its ratified successor',async()=>{
 const input=await inputs(fixture.election),source=await exactRegisterFile(fixture.register);
 const charter=input.originals.find(o=>o.document.terms.kind==='charter')!.document.terms;
 if(charter.kind!=='charter'||!charter.rules.execution)throw Error('Qualified binding charter required');
 const authority=charter.rules.execution;
 const records=new Map<string,unknown>(),blobs=new Map<string,Uint8Array>();
 const denied=vi.fn(async()=>{throw Error('unavailable');});
 const ports:GovernanceExecutionPorts={owner:authority.custodian,assertOpen(){},quote(){throw Error('unavailable');},
  read:async slot=>records.get(slot)??null,write:async(slot,next,previous)=>{expect(records.get(slot)??null).toEqual(previous);records.set(slot,structuredClone(next));},
  hold:async file=>{const bytes=new Uint8Array(await file.arrayBuffer()),digest=await installed.sha256ReceizBytes(bytes);blobs.set(digest,bytes);return digest;},
  file:async digest=>blobs.get(digest)??null,plan:denied,seal:denied,coordinate:denied,context:denied,recovery:denied,settlement:denied,signer:denied};
 const device=createGovernanceExecution(ports),first=await device.selectRegister(source);
 expect(first).toMatchObject({registerProofObjectId:authority.registerProofObjectId,registerGenesisHead:authority.registerGenesisHead,head:authority.registerGenesisHead});
 const restarted=createGovernanceExecution(ports);
 expect(await restarted.selectedRegister()).toEqual(first);
 const copy=await restarted.exportSelectedRegister();expect(await installed.sha256ReceizBytes(new Uint8Array(await copy.arrayBuffer()))).toBe(fixture.register.artifactSha256);
 expect(await restarted.transportHeldRegisterGenesis(first.registerProofObjectId,first.registerGenesisHead)).toMatchObject({
  artifactSha256:fixture.register.artifactSha256,exactBytesB64u:fixture.register.exactBytesB64u,
 });
 await expect(restarted.transportHeldRegisterGenesis(first.registerProofObjectId,'f'.repeat(64))).rejects.toThrow(/coordinate/);
 const issuerRecords=new Map<string,unknown>();
 const issuerPorts={...ports,owner:'issuer.receiz.id',read:async(slot:string)=>issuerRecords.get(slot)??null,
  write:async(slot:string,next:unknown,previous:unknown)=>{expect(issuerRecords.get(slot)??null).toEqual(previous);issuerRecords.set(slot,structuredClone(next));}};
 const issuer=createGovernanceExecution(issuerPorts);
 await expect(issuer.retainCustodianRegisterGenesis(source,'other.receiz.id')).rejects.toThrow();
 expect(await issuer.retainCustodianRegisterGenesis(source,authority.custodian)).toEqual(first);
 expect(await issuer.selectedRegister()).toBeNull();
 const reopenedIssuer=createGovernanceExecution(issuerPorts);
 expect(await reopenedIssuer.transportHeldRegisterGenesis(first.registerProofObjectId,first.registerGenesisHead,authority.custodian)).toMatchObject({
  artifactSha256:fixture.register.artifactSha256,exactBytesB64u:fixture.register.exactBytesB64u,
 });
 const review=await restarted.prepare(input);expect(review.registerHead).toBe(first.head);expect(review.decision.seated).toHaveLength(1);
 await expect(restarted.execute({...review},review.exactPlanDigest)).rejects.toThrow(/exact governance plan/);
 await expect(restarted.execute(review,'wrong')).rejects.toThrow(/exact governance plan/);
 expect(await restarted.reopen(input.proposal)).toBeNull();await expect(restarted.exportRegister(input.proposal)).rejects.toThrow();
 await expect(openGovernanceRegister(source,'another.receiz.id')).rejects.toThrow();
 expect(denied).not.toHaveBeenCalled();
},90000);

it('retains the exact authorized installment after a lost response and requires independent financial evidence',async()=>{
 const {governanceSettlement}=await import('../src/receiz/governance-execution-settlement');
 const decision=await readGovernanceDecision(await inputs(fixture.treasury));
 const certification=async()=>({decision,executionId:'fixture-only-certified-id'});
 const checkout=new Map<string,unknown>();
 const quote=vi.fn(()=>({usdPerPhiMicrocents:'100000000',priceBasis:{sourceSha256:'1'.repeat(64),computedPulse:1000,usdPerPhiMicrocents:'100000000'}}));
 const settlement=vi.fn(async()=>{throw Error('Dropped response');});
 const ports={assertOpen(){},quote,settlement,read:async(key:string)=>checkout.get(key)??null,
   write:async(key:string,next:unknown,old:unknown)=>{expect(checkout.get(key)??null).toEqual(old);checkout.set(key,structuredClone(next));}} as unknown as GovernanceExecutionPorts;
 const device=governanceSettlement(ports,certification),review=await device.prepareSettlement(decision.proposal);
 expect(review.intent).toMatchObject({rail:'settlement',sourceValueHead:decision.payment!.sourceValueHead,amountPhiMicro:decision.payment!.amountPhiMicro});
 await expect(device.executeSettlement({...review},review.intentDigest)).rejects.toThrow();
 expect(settlement).not.toHaveBeenCalled();expect((await device.executeSettlement(review,review.intentDigest)).status).toBe('unknown');
 const reopened=governanceSettlement(ports,certification);
 expect(await reopened.reopenSettlement(decision.proposal)).toEqual({status:'unknown',intentDigest:review.intentDigest});
 const retry=await reopened.prepareSettlement(decision.proposal);
 expect(retry.intent).toEqual(review.intent);expect(quote).toHaveBeenCalledTimes(1);
 await expect(reopened.verifySettlement(decision.proposal,new File(['{}'],'unissued.json'))).rejects.toThrow(/matching native/);
},30000);

it('signs a real protected issuer observation into the private candidate and reopens the offline draft',async()=>{
 const {conformanceOfflineFixture}=await import('./helpers/conformance-offline-sealer');
 const {createReceizNodeOfflineKaiProofFactory}=await import('@receiz/sdk/offline/kai/node');
 const {RECEIZ_V125_TEMPORAL_AUTHORITY_VALID_VECTOR:genesis}=await import('../node_modules/@receiz/sdk/dist/v125TemporalAuthorityConformanceVector.js');
 const actual=Date.now();vi.useFakeTimers({toFake:['Date']});
 const {__resetReceizKaiNowHeadForTests}=await import('../node_modules/@receiz/sdk/dist/v124Kai.js');__resetReceizKaiNowHeadForTests();
 try{
  const origin=actual-4*86400000;
  vi.setSystemTime(origin);
  const clock=Object.create(performance);
  Object.defineProperties(clock,{timeOrigin:{value:origin},now:{value:()=>Date.now()-origin}});
  vi.stubGlobal('performance',clock);
  const f=await conformanceOfflineFixture({account:true,certificateDays:7}),runtime=f.runtime;
  const sdk=await fixtureRuntime(f.roots,`
   export {createReceizClient,readReceizIdentityArtifact,appendReceizIdentityPortableState,serializeReceizIdentityArtifact,receizKaiNow,RECEIZ_CURRENT_REGISTRY_DIGEST} from '@receiz/sdk';
   export {createGovernanceExecution} from './src/receiz/governance-execution';
   export {verifyReceizPortableExecutionTransitionSetV124,createReceizPortableExecutionTransitionRecoveryV124} from './node_modules/@receiz/sdk/dist/v124PortableAuthority.js';
   export {createReceizInMemoryArtifactTransitionStore} from './node_modules/@receiz/sdk/dist/artifactTransitionStore.js';
   export {commitArtifactTransition} from './node_modules/@receiz/sdk/dist/artifactTransition.js';
   export {verifyReceizArtifact} from '@receiz/sdk';
   export {sealGovernanceOriginal} from './src/receiz/governance-documents';
  `);
  const admitted=await runtime.createReceizArtifactAdmissionEngine()(await runtime.verifyReceizArtifact(f.identity.bytes),{profile:'identity',identityPassphrase:f.identity.phrase});
  const binding=await runtime.readReceizIdentityPublicBinding(admitted),owner=binding.artifactOwnerReceizId;
  const unavailable=vi.fn(async()=>{throw Error('NETWORK_UNAVAILABLE');});
  const local=runtime.offline.createReceizOfflineSealer({ownerIdentityAdmission:admitted,store:f.store,resources:f.resources,fetch:unavailable});
  const sealFile=async(bytes:Uint8Array,filename:string)=>{
   const result=await local.seal({bytes,filename,mimeType:'application/json'});
   return new File([new Uint8Array(result.artifactBytes)],result.filename,{type:result.mimeType});
  };
  const identity={binding,sealRecordExport:(v:{bytes:Uint8Array;filename:string})=>sealFile(v.bytes,v.filename)};
  const keyFile=await sdk.readReceizIdentityArtifact(f.identity.bytes),passphrase=f.identity.phrase;
  const kks=await createReceizNodeOfflineKaiProofFactory();
  let next:import('@receiz/sdk').ReceizKksV1ProofCoordinate|undefined;
  const coordinate=async(previous?:import('@receiz/sdk').ReceizKksV1ProofCoordinate)=>previous?(next??=await kks({previousKaiSigilProofHead:previous.kaiSigil.proofHead})):genesis;
  const seal=async(bytes:Uint8Array,name:string)=>(await sdk.createReceizClient().artifacts.verifyAndOpen(await sealFile(bytes,name))).sealedArtifact;
  const records=new Map<string,unknown>(),blobs=new Map<string,Uint8Array>();
  let observation=new File([new Uint8Array(f.identity.bytes)],'private-identity.png',{type:'image/png'});
  const ports:GovernanceExecutionPorts={owner,assertOpen(){},quote(){throw Error('unavailable');},
   read:async key=>records.get(key)??null,write:async(key,value,old)=>{expect(records.get(key)??null).toEqual(old);records.set(key,structuredClone(value));},
   hold:async file=>{const bytes=new Uint8Array(await file.arrayBuffer()),digest=await installed.sha256ReceizBytes(bytes);blobs.set(digest,bytes);return digest;},
   file:async id=>blobs.get(id)??null,seal,coordinate,signer:async()=>({keyFile,passphrase,identityArtifact:observation,coordinate,seal}),plan:unavailable,
   context:unavailable,recovery:unavailable,settlement:unavailable};
  const device=sdk.createGovernanceExecution(ports),reg=await device.createRegister();
  const rules={name:'Workshop',purpose:'Choose workshop policy.',founders:[owner],membership:'Member',decisions:'Vote',representation:'Direct',amendments:'Vote',appeals:'Challenge',treasury:'None',
   approvalPercent:51,minimumSupportPercent:50,voteDays:1,appealDays:1,allowMandates:false,execution:{rule:'unanimous-evidence-closure-v1',custodian:owner,registerProofObjectId:reg.registerProofObjectId,registerGenesisHead:reg.registerGenesisHead,treasury:null}};
  const charter=await sdk.sealGovernanceOriginal(identity,{kind:'charter',rules});
  const ratified=await sdk.sealGovernanceOriginal(identity,{kind:'ratification',charter:charter.digest});
  const proposal=await sdk.sealGovernanceOriginal(identity,{kind:'proposal',charter:charter.digest,title:'Sunday hours',text:'Open on Sundays?',decision:'Policy',choices:['Approve','Reject']});
  const ballot=await sdk.sealGovernanceOriginal(identity,{kind:'ballot',charter:charter.digest,proposal:proposal.digest,choice:'Approve',previous:null});
  vi.setSystemTime(actual);
  const sources=[charter,ratified,proposal,ballot];
  sources.push(await sdk.sealGovernanceOriginal(identity,{kind:'closure',charter:charter.digest,proposal:proposal.digest,evidence:sources.map(x=>x.digest).sort()}));
  const {proposalEvidence,closureOpens}=await import('../src/receiz/governance-closure');
  const {ofKind}=await import('../src/receiz/governance-view');
  const rows=sources.map(o=>({digest:o.digest,pulse:o.pulse,document:o.document,profileUid:null})),p=ofKind(rows,'proposal')[0],c=ofKind(rows,'charter')[0];
  expect(proposalEvidence(p,rows)).toEqual(sources.slice(0,-1).map(o=>o.digest).sort());
  expect(BigInt(sources.at(-1)!.pulse)).toBeGreaterThanOrEqual(closureOpens(p,c));
  const review=await device.prepare({proposal:proposal.digest,originals:sources});
  await expect(device.execute(review,review.exactPlanDigest)).rejects.toThrow();
  // This fixture's issuer owns the freshly generated key and its empty
  // revocation ledger. Observe the actual current fixture pulse, then seal it.
  const terminal=await coordinate(genesis);
  while(BigInt(sdk.receizKaiNow().pulse)<BigInt(terminal.kaiPulse))vi.setSystemTime(Date.now()+500);
  const observed=await sdk.appendReceizIdentityPortableState({keyFile,passphrase,schema:'receiz.identity-key-state.v113',
    snapshot:{issuerKeyId:keyFile.keyId,actorId:keyFile.owner.uid,registryDigest:sdk.RECEIZ_CURRENT_REGISTRY_DIGEST,observedThroughKai:String(sdk.receizKaiNow().pulse),revokedAtKai:null}});
  observation=await sealFile(new TextEncoder().encode(sdk.serializeReceizIdentityArtifact(observed)),'identity.receizkey');
  expect((await device.execute(review,review.exactPlanDigest)).status).toBe('prepared');
  const restarted=sdk.createGovernanceExecution(ports),read=await restarted.reopen(proposal.digest);
  expect(read.status).toBe('prepared');expect(read.exactPlanDigest).toBe(review.exactPlanDigest);
  const retained=await restarted.reopenReview(proposal.digest);expect(retained.exactPlanDigest).toBe(review.exactPlanDigest);
  await expect(restarted.exportRegister(proposal.digest)).rejects.toThrow(/committed register/);
  // An isolated native store performs the actual commit. Start at the persisted
  // terminal checkpoint to exercise restart between commit and source adoption.
  const draft=records.get('signed:'+proposal.digest) as {signed:import('@receiz/sdk').ReceizPortableExecutionTransitionSetV124},set=draft.signed;
  const member=(await sdk.verifyReceizPortableExecutionTransitionSetV124(set,{audience:set.applicationId})).members[0];
  const store=sdk.createReceizInMemoryArtifactTransitionStore({commitDomain:member.plan.commitDomain,verifyCandidate:async({exactBytes}:{exactBytes:Uint8Array})=>
   await installed.sha256ReceizBytes(exactBytes)===member.candidate.artifactDigest.value&&(await sdk.verifyReceizArtifact(exactBytes)).status==='verified-artifact'});
  await store.seedHead(member.plan.resource,member.plan.transition.expectedHead);
  const committed=await sdk.commitArtifactTransition({plan:member.plan,capability:member.capability,staged:await store.stageCandidate(member.candidate),store});
  expect(committed.status).toBe('committed-artifact-transition');
  const recovery=await sdk.createReceizPortableExecutionTransitionRecoveryV124({applicationId:set.applicationId,transitionSet:set,committedTransitions:[committed]});
  const nativePlan=set.members[0].operationPlan;
  records.set('decision:'+proposal.digest,{schema:'bank.execution-checkpoint.v1',state:'committed',operationId:nativePlan.attemptId,executionId:'fixture:'+nativePlan.attemptId,plan:nativePlan,transitionSet:set,recovery});
  vi.setSystemTime(actual+86400000);
  await expect(sdk.verifyReceizPortableExecutionTransitionSetV124(set,{audience:set.applicationId})).rejects.toThrow();
  const accepted=await restarted.reopen(proposal.digest);
  expect(accepted.status).toBe('committed');expect(accepted.registerHead).toBe(recovery.members[0].receipt.acceptedHead.value);
  const file=await restarted.exportRegister(proposal.digest);
  expect(await installed.sha256ReceizBytes(new Uint8Array(await file.arrayBuffer()))).toBe(set.members[0].candidate.artifactSha256);
  expect(await file.text()).not.toMatch(/privateKeyPkcs8|signedCapability|identityArtifact|exactBytesB64u/);
 }finally{vi.useRealTimers();vi.unstubAllGlobals();__resetReceizKaiNowHeadForTests();}
},120000);

it('keeps the genuine rollback-only SQL receipt recorded and refuses a legacy claim or unmatched edge references',async()=>{
 const {verifyGovernanceQualification}=await import('../src/features/voting/qualification/verify');
 const {decision}=await verifyGovernanceQualification('treasury',new Uint8Array(readFileSync('src/features/voting/qualification/treasury.json')));
 const receipt=JSON.parse(readFileSync('src/features/voting/qualification/settlement.json','utf8')).outcome;
 const {governanceSettlement}=await import('../src/receiz/governance-execution-settlement');
 const records=new Map<string,unknown>(),slot='settlement:'+decision.proposal;
 const ports={assertOpen(){},quote:()=>({priceBasis:{schema:'test.quote'},usdPerPhiMicrocents:'200000000'}),
  settlement:async()=>structuredClone(receipt),read:async(key:string)=>records.get(key)??null,
  write:async(key:string,v:unknown,old:unknown)=>{expect(records.get(key)??null).toEqual(old);records.set(key,structuredClone(v));},
  hold:async()=>installed.sha256ReceizBytes(new Uint8Array([0])),file:async()=>new Uint8Array([0])} as unknown as GovernanceExecutionPorts;
 const controller=governanceSettlement(ports,async()=>({decision,executionId:'isolated-sql-replay'})),review=await controller.prepareSettlement(decision.proposal);
 expect(review.intent).toEqual(receipt.intent);
 expect(await controller.executeSettlement(review,review.intentDigest)).toMatchObject({status:'recorded',receiptDigest:receipt.receipt.receiptDigest});
 const original=records.get(slot) as Record<string,unknown>;
 records.set(slot,{...original,verifiedRecoveryDigest:'0'.repeat(64),verifiedEffects:{intentDigest:review.intentDigest,receiptDigest:receipt.receipt.receiptDigest,sourceHead:receipt.sourceHead,destinationHead:receipt.destinationHead}});
 expect((await controller.reopenSettlement(decision.proposal))?.status).toBe('recorded');
 for(const references of [receipt.proofReferences,[],[receipt.proofReferences[0],receipt.proofReferences[0]],receipt.proofReferences.map((r:Record<string,string>,i:number)=>({...r,head:receipt.proofReferences[1-i].head}))]){
  records.set(slot,{...original,outcome:{...receipt,proofReferences:references}});
  await expect(controller.verifySettlement(decision.proposal,new File(['{}'],'unissued-recovery.json'))).rejects.toThrow(/both approved Settlement objects/);
  expect((await controller.reopenSettlement(decision.proposal))?.status).toBe('recorded');
 }
},30000);

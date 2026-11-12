import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {expect,it,vi} from 'vitest';

// Execute the actual outer orchestration with controlled admitted-custody
// ports. Canonical sealing, admission and cold receiver tests qualify those
// ports separately; this test cannot issue a proof or financial admission.
function publisher(ensure:unknown){
 const path='native/receiz/app/lib/profile/showcase/connectedAssetPublication.client.ts',text=readFileSync(path,'utf8');
 const parsed=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const node=parsed.statements.find((node):node is ts.FunctionDeclaration=>ts.isFunctionDeclaration(node)&&node.name?.text==='openConnectedAssetPublisher')!;
 const code=ts.transpileModule(node.getText(parsed)+'\nexports.open=openConnectedAssetPublisher;',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const digest='a'.repeat(64),owner='cold.receiz.id',artifactId=`profile-showcase:${owner}`,username='cold_owner',uid='cold-account';
 const head={artifactId,artifactDigest:digest,operationCount:3,headKaiUpulse:'3'},exports:{}={};
 const forbidden=vi.fn(()=>{throw Error('COLD_REPLAY_MUST_NOT_EXPORT_SEAL_OR_DELIVER');}),admitMaterial=vi.fn();
 const vault={resolveOriginalChildCustody:async()=>({}),readFirstPaint:async()=>({artifactDigest:digest}),readPublicationHead:async()=>head,exportCompleteSource:forbidden};
 const incremental=vi.fn(async()=>null),ensureCurrent=vi.fn(async()=>ensure);
 runInNewContext(code,{exports,URL,Request,Map,Set,Promise,TypeError,
  readRecoveredAccountShowcaseScope:async()=>({locator:{showcaseArtifactId:artifactId,acceptedArtifactDigest:digest}}),
  createProfileShowcaseBoundedEdgeVault:()=>vault,createIncrementalAssetPublisher:()=>({publish:incremental}),createImportedProofSourceCustody:()=>({exportBlocks:forbidden}),
  withProfileShowcaseCausalAppendLock:async(_id:string,run:()=>unknown)=>run(),recoverAcceptedShowcasePredecessor:async()=>{},
  retainImportedProfileOriginalMaterial:admitMaterial,ensureCurrentProfileShowcasePublicProjection:ensureCurrent,
  publishProfileShowcaseTransport:forbidden,sealAndAdmitImportedSourcePlacement:forbidden,
 });
 return{digest,owner,artifactId,username,uid,forbidden,admitMaterial,incremental,ensureCurrent,async open(){return await (exports as {open:Function}).open({account:{username,uid},assertCurrent(){},fetchImpl:forbidden,sealDocument:forbidden},{ownerReceizId:owner},{},forbidden);}};
}
it('returns the exact durable published receipt on cold recovery when no in-process delivery promise exists',async()=>{
 const receipt={status:'published',publicationVersion:2,scope:{publicationVersion:2,ownerReceizId:'cold.receiz.id',artifactId:'profile-showcase:cold.receiz.id',profileIdentity:'cold-account',username:'cold_owner',artifactDigest:'a'.repeat(64)},artifactDigest:'a'.repeat(64),operationCount:3,visibleChildCount:2,publicFamilyStatus:'pending'};
 const f=publisher({status:'published',artifactDigest:receipt.artifactDigest,publishedReceipt:receipt}),runtime=await f.open(),opened={source:{projection:{},exactArtifact:new Blob(['held source'])},reference:{artifactSha256:'b'.repeat(64)},original:{id:'held-original'}};
 expect(await runtime.publishOpened(opened)).toBe(receipt);
 expect(await runtime.publishOpened(opened)).toBe(receipt);
 expect(f.ensureCurrent).toHaveBeenCalledOnce();expect(f.forbidden).not.toHaveBeenCalled();
});
it.each([
 {status:'pending',artifactDigest:'a'.repeat(64),code:'EXACT_SOURCE_NOT_ACCEPTED'},
 {status:'published',artifactDigest:'a'.repeat(64)},
 {status:'published',artifactDigest:'c'.repeat(64),publishedReceipt:{status:'published',artifactDigest:'c'.repeat(64)}},
])('does not fabricate a receipt from a missing or different accepted head: $status',async ensure=>{
 const f=publisher(ensure),runtime=await f.open();
 expect((await runtime.publishOpened({source:{projection:{},exactArtifact:new Blob(['held source'])},reference:{artifactSha256:'b'.repeat(64)},original:{id:'held-original'}})).status).toBe('pending');
 expect(f.forbidden).not.toHaveBeenCalled();
});

import {expect,it,vi} from 'vitest';
import {createReceizClient,createReceizCustomReducerBindingsV124,planAtomicOperationV124} from '@receiz/sdk';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {createBankExecutionRecovery} from '../src/receiz/bank-execution-recovery';
import type {BankExecutionCheckpoint} from '../src/receiz/bank-execution';

// Actual pinned SDK + Bank recovery controller; synthetic transport only.
// No admitted financial source, credentials, network or financial action.
async function checkpoint():Promise<BankExecutionCheckpoint>{
 const domainId='custom:bank-recovery-contract',heads={fixture:'a'.repeat(64)},bindings=await createReceizCustomReducerBindingsV124({namespace:domainId,registryDigest:'b'.repeat(64),reducerDigest:'c'.repeat(64)});
 const plan=await planAtomicOperationV124({applicationId:BANK_APPLICATION_ID,operations:[{operationId:'contract-inspection',category:'custom',domainId,...bindings,participants:['fixture'],payload:{schema:'receiz.custom-reducer-operation.v124',namespace:domainId,registryDigest:'b'.repeat(64),reducerDigest:'c'.repeat(64),expectedParticipantHeads:heads,operation:{schema:'bank.recovery-contract-inspection.v1'}}}],participants:['fixture'],expectedParticipantHeads:heads,semanticIdempotencyKey:'retained-coordinate',attemptId:'retained-attempt'});
 return{schema:'bank.execution-checkpoint.v1',operationId:plan.attemptId,plan,transitionSet:{}as never,state:'unknown'};
}
function controller(retained:BankExecutionCheckpoint,reply:()=>Response){
 const requests:{url:string;method:string;body:unknown}[]=[],fetcher=vi.fn<typeof fetch>(async(url,init)=>{requests.push({url:String(url),method:init?.method??'GET',body:init?.body});return reply();});
 const client=createReceizClient({baseUrl:'https://synthetic.invalid',applicationId:BANK_APPLICATION_ID,accessToken:'synthetic-not-a-credential',fetchImpl:fetcher}),saveNew=vi.fn(),replace=vi.fn(),connect=vi.fn(async()=>client);
 const recovery=createBankExecutionRecovery({store:{load:async()=>structuredClone(retained),saveNew,replace},connect,assertOpen(){},lock:async work=>work()});
 return{recovery,requests,fetcher,connect,saveNew,replace};
}
it.each(['unavailable','unsigned-committed']as const)('existing recovery keeps the exact unknown request after %s lookup without another execution',async mode=>{
 const retained=await checkpoint(),before=structuredClone(retained),f=controller(retained,()=>Response.json(mode==='unavailable'?{error:'synthetic_unavailable'}:{schema:'receiz.execution-outcome.v124',status:'committed',verified:true},{status:mode==='unavailable'?503:200}));
 await expect(f.recovery.resolve(true)).rejects.toThrow();
 expect(f.requests).toHaveLength(1);const request=f.requests[0],path=new URL(request.url).pathname,p=retained.plan;
 expect(path).toBe(`/api/sdk/v1/execution/by-idempotency/${encodeURIComponent(p.applicationId)}/${encodeURIComponent(p.domainId)}/${encodeURIComponent(p.operationKind)}/${encodeURIComponent(p.semanticIdempotencyKey)}`);
 expect(request.method).toBe('GET');expect(request.body).toBeUndefined();expect(f.connect).toHaveBeenCalledExactlyOnceWith(BANK_APPLICATION_ID);
 expect(retained).toEqual(before);expect(f.saveNew).not.toHaveBeenCalled();expect(f.replace).not.toHaveBeenCalled();expect((await f.recovery.status())?.state).toBe('unknown');
});
it('read-only recovery needs consent before lookup and never substitutes execution',async()=>{
 const retained=await checkpoint(),f=controller(retained,()=>Response.json({}));await expect(f.recovery.resolve()).rejects.toThrow('RECOVERY_CONSENT_REQUIRED');expect(f.fetcher).not.toHaveBeenCalled();expect(f.connect).not.toHaveBeenCalled();expect(f.replace).not.toHaveBeenCalled();
});
it('source publication does not accept a recovery as an additional publication argument',async()=>{
 const fetcher=vi.fn<typeof fetch>(),client=createReceizClient({applicationId:BANK_APPLICATION_ID,accessToken:'synthetic-not-a-credential',fetchImpl:fetcher});
 await expect(client.sources.publishSealedSourceV124({applicationId:BANK_APPLICATION_ID,authoritySessionHandle:null,sourceArtifact:{},recovery:{schema:'receiz.portable-execution-transition-recovery.v124'}}as never)).rejects.toThrow('V124_SOURCE_PUBLICATION_INPUT_INVALID');expect(fetcher).not.toHaveBeenCalled();
});
it('source publication cannot substitute raw committed-recovery JSON for a sealed source artifact',async()=>{
 const fetcher=vi.fn<typeof fetch>(),client=createReceizClient({applicationId:BANK_APPLICATION_ID,accessToken:'synthetic-not-a-credential',fetchImpl:fetcher});
 await expect(client.sources.publishSealedSourceV124({applicationId:BANK_APPLICATION_ID,authoritySessionHandle:null,sourceArtifact:{schema:'receiz.portable-execution-transition-recovery.v124',transitionSet:{},members:[],authority:{strongerTruth:'sealed-receiz-proof-object'}}}as never)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
});
it('exporting recovery requires an SDK-admitted committed result, not a generated success label',()=>{
 const fetcher=vi.fn<typeof fetch>(),client=createReceizClient({applicationId:BANK_APPLICATION_ID,fetchImpl:fetcher});expect(()=>client.execution.exportCommittedRecovery({status:'committed',verified:true}as never)).toThrow('V124_EXECUTION_COMMITTED_RECOVERY_CUSTODY_REQUIRED');expect(fetcher).not.toHaveBeenCalled();
});

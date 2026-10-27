import {it,expect} from 'vitest';
import {parseOriginalsObservation,createOriginalsProgressReader} from '../src/qualification/progress';
const data=()=>({ok:true,observation:{schema:'bankeiz.originals-observation.v1',authority:'observation-only',accountUid:'owner',username:'owner',sourceOriginalIds:['one'],membershipComplete:true,witnessComplete:true,originals:1,witnessedBreaths:100,retention:{starts:100,retained:40},fundingUsdCents:null,baseline:{pbi:true,avatar:true,header:true,threeOriginals:false,verifiedOriginal:null},acceptance:'not-admitted',economyActive:false}});
it('binds progress to the open account and rejects a rounded display as source',()=>{
 expect(()=>parseOriginalsObservation(data(),'someone-else')).toThrow('QUALIFICATION_ACCOUNT_MISMATCH');
 const rounded=data();(rounded.observation.retention as unknown)=40;expect(()=>parseOriginalsObservation(rounded,'owner')).toThrow();
});
it('rejects fabricated funding, qualification, incomplete exact counters and duplicate membership',()=>{
 for(const patch of [{fundingUsdCents:'25000000'},{acceptance:'qualified'},{economyActive:true},{sourceOriginalIds:['one','one']},{witnessComplete:false,witnessedBreaths:100}])expect(()=>parseOriginalsObservation({ok:true,observation:{...data().observation,...patch}},'owner')).toThrow();
});
it('retains a held observation after failed explicit read and never reads on construction',async()=>{
 let calls=0;const reader=createOriginalsProgressReader('owner',async()=>{calls++;if(calls>1)throw Error('offline');return data();});
 expect(calls).toBe(0);expect(reader.known()).toBe(null);
 const first=await reader.read();expect(first.originals).toBe(1);
 await expect(reader.read()).rejects.toThrow('offline');expect(reader.known()).toBe(first);
});
it('does not admit a late response after the account has closed',async()=>{
 let open=true;const reader=createOriginalsProgressReader('owner',async()=>{open=false;return data();},()=>open);
 await expect(reader.read()).rejects.toThrow('QUALIFICATION_ACCOUNT_CLOSED');expect(reader.known()).toBe(null);
});
it('retains an entire complete observation when an explicit read returns a partial source',async()=>{
 let calls=0;const reader=createOriginalsProgressReader('owner',async()=>++calls===1?data():{ok:true,observation:{...data().observation,sourceOriginalIds:['two'],membershipComplete:false,witnessComplete:false,originals:null,witnessedBreaths:null,retention:null}});
 const complete=await reader.read();await expect(reader.read()).rejects.toThrow('incomplete');expect(reader.known()).toBe(complete);expect(reader.known()?.sourceOriginalIds).toEqual(['one']);
});

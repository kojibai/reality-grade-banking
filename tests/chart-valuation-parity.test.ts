import {expect,it} from 'vitest';
import {computeIntrinsicUnsigned,type SigilMetadataLite} from '@receiz/sdk/valuation';
import {computeIntrinsicUnsigned as chartUnsigned} from '../src/receiz/generated/chart-valuation.mjs';
it('retains the exact v129 unsigned result for sampled object origins, rhythms, ages and cash flows',()=>{
 for(let i=0;i<72;i++)for(const age of [0,1,484,17491,1000000]){
  const meta:SigilMetadataLite={kaiPulse:10825210+i*34871,pulse:10825210+i*34871,beat:i%36,stepIndex:i%44,stepsPerBeat:44,quality:i%2?'high':'med',creatorVerified:i%3!==0,kaiSignature:`subject-${i}`,userPhiKey:`object-${i}`,...(i%4?{}:{ip:{expectedCashflowPhi:[{atPulse:14710000,amountPhi:100}]}})};
  expect(chartUnsigned(meta,meta.kaiPulse!+age)).toEqual(computeIntrinsicUnsigned(meta,meta.kaiPulse!+age).unsigned);
 }
});

import {readFileSync} from 'node:fs';
import {it,expect,vi} from 'vitest';
import {inspectOriginalExample,challengeOriginalExample,ORIGINAL_EXAMPLE} from '../src/qualification/example';
import * as proofReader from '../src/value-explainer/proof';
const file=()=>new File([readFileSync(new URL('./fixtures/public-essay-record.png',import.meta.url))],'sealed-essay.png',{type:'image/png'});
it('reproduces the real public sample with the existing reader and no network or account writes',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  const result=await inspectOriginalExample(file(),'14710100000123');
  expect(result.projection.status).toBe('available');if(result.projection.status!=='available')return;
  expect(result.projection.proofDigest).toBe(ORIGINAL_EXAMPLE.sha256);expect(result.projection.originKaiPulse).toBe('14611069');expect(result.projection.originKaiUPulse).toBeNull();
  expect(result.projection.historyHead).toBeNull();
  expect(result).toHaveProperty('verifiedSource.status','verified-artifact');
  expect(result).toHaveProperty('displayFacts',{originKaiUPulse:'14611069000000',originBasis:'Carried whole-pulse origin expressed in µPulses',headLabel:'Sealed proof head',head:'51ceab4b3909e7e67570ee5822c41af5'});
  expect(result.projection.proofValuePhiMicro).toBe('18784744');expect(result.projection.displayUsdCents).toBe('474929');
  expect(result.replayVerification?.status).toBe('verified-replay');expect(result.projection.writesPerformed).toBe(0);expect(result.projection.authority.valuationIsSettlementAuthority).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
 }finally{fetcher.mockRestore();}
});
it('prefers the exact admitted origin and history head without relabelling the enclosing proof head',async()=>{
 expect(proofReader).toHaveProperty('projectProofDisplayFacts',expect.any(Function));
 const result=await inspectOriginalExample(file(),'14710100000123');
 expect(result.projection.status).toBe('available');if(result.projection.status!=='available')return;
 const projection={...result.projection,originKaiUPulse:'14611069123456',historyHead:'a'.repeat(64)};
 expect(proofReader.projectProofDisplayFacts(projection,result.verifiedSource)).toEqual({originKaiUPulse:'14611069123456',originBasis:'Carried exact µPulse origin',headLabel:'Admitted history head',head:'a'.repeat(64)});
 expect(()=>proofReader.projectProofDisplayFacts({...projection,proofDigest:'0'.repeat(64)},result.verifiedSource)).toThrow('does not match');
});
it('keeps the SDK-selected Original origin beneath a later portable or transfer envelope',async()=>{
 const result=await inspectOriginalExample(file(),'14710100000123');
 expect(result.projection.status).toBe('available');if(result.projection.status!=='available')return;
 // Presentation-boundary fixture, not a newly admitted proof: the SDK's
 // verified inner-origin projection survives a differently sealed envelope.
 const outerDigest='f'.repeat(64),outerHead='b'.repeat(32);
 const projection={...result.projection,proofDigest:outerDigest};
 const envelope={...result.verifiedSource,artifactDigest:{...result.verifiedSource.artifactDigest,value:outerDigest},verification:{...result.verifiedSource.verification,bundle:{...result.verifiedSource.verification.bundle,kaiPulseEternal:'14612069',receizClaimId:outerHead}}};
 expect(projection.originKaiPulse).toBe('14611069');expect(projection.originKaiUPulse).toBeNull();
 const beforeProjection=JSON.stringify(projection),beforeReplay=JSON.stringify(result.replay);
 expect(proofReader.projectProofDisplayFacts(projection,envelope)).toEqual({originKaiUPulse:'14611069000000',originBasis:'Carried whole-pulse origin expressed in µPulses',headLabel:'Sealed proof head',head:outerHead});
 expect(projection.proofValuePhiMicro).toBe('18784744');expect(projection.displayUsdCents).toBe('474929');
 expect(JSON.stringify(projection)).toBe(beforeProjection);expect(JSON.stringify(result.replay)).toBe(beforeReplay);
});
it('changes actual carried essay text, repairs its PNG checksum, and still fails canonical proof verification',async()=>{
 const challenge=await challengeOriginalExample(file(),'14710100000123');
 expect(challenge).toContain('ARTIFACT_VERIFICATION_FAILED');
 expect(await inspectOriginalExample(file(),'14710100000123')).toMatchObject({projection:{status:'available'}});
});

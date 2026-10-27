import {readFileSync} from 'node:fs';
import {it,expect,vi} from 'vitest';
import {inspectOriginalExample,challengeOriginalExample,ORIGINAL_EXAMPLE} from '../src/qualification/example';
const file=()=>new File([readFileSync(new URL('./fixtures/public-essay-record.png',import.meta.url))],'sealed-essay.png',{type:'image/png'});
it('reproduces the real public sample with the existing reader and no network or account writes',async()=>{
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 try{
  const result=await inspectOriginalExample(file(),'14710100000123');
  expect(result.projection.status).toBe('available');if(result.projection.status!=='available')return;
  expect(result.projection.proofDigest).toBe(ORIGINAL_EXAMPLE.sha256);expect(result.projection.originKaiPulse).toBe('14611069');expect(result.projection.originKaiUPulse).toBeNull();
  expect(result.projection.proofValuePhiMicro).toBe('18784744');expect(result.projection.displayUsdCents).toBe('474929');
  expect(result.replayVerification?.status).toBe('verified-replay');expect(result.projection.writesPerformed).toBe(0);expect(result.projection.authority.valuationIsSettlementAuthority).toBe(false);
 }finally{fetcher.mockRestore();}
});
it('changes actual carried essay text, repairs its PNG checksum, and still fails canonical proof verification',async()=>{
 const challenge=await challengeOriginalExample(file(),'14710100000123');
 expect(challenge).toContain('ARTIFACT_VERIFICATION_FAILED');
 expect(await inspectOriginalExample(file(),'14710100000123')).toMatchObject({projection:{status:'available'}});
});

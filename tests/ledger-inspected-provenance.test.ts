import {expect,it,vi} from 'vitest';
import type {ReceizOpenedArtifact} from '@receiz/sdk';
import {retainOpenedProofInspection} from '../src/receiz/proof-inspection';
import {ledgerInspectedProvenance} from '../src/receiz/ledger-inspected-provenance';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
const digest='a'.repeat(64),claim='b'.repeat(64),head='c'.repeat(64);
it('reuses only the digest-bound canonical open and rejects an unadmitted report copy without IO',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  const payload={collectibleId:'rsc_original',claimHash:claim,privateWitness:'never project this',causalOwnershipProofs:[{schema:'receiz.sports_arena.card_causal_ownership_proof.v1',hash:head,collectibleId:'rsc_original',claimHash:claim,anchors:{previousCausalProofHash:null},fundingSource:'reserve',acquisitionKind:'purchase',cardAllocation:{rule:'native_exact_allocation'},steps:[{id:'funding',kind:'reserve_funding',label:'Reserve origin',detail:'Recorded allocation',amountUsdCents:'250',kaiPulse:'100'},{id:'purchase',kind:'pack_purchase',label:'Purchase',detail:'Recorded acquisition',kaiPulse:'110'}]}]};
  // This fixture represents the SDK's already successful open. The projection
  // under test must neither rerun cryptography nor trust an arbitrary report.
  const opened={sealedArtifact:{artifactSha256:digest},verification:{ok:true,integrity:{ok:true},bundle:{}},verifiedPayload:{bytes:new TextEncoder().encode(JSON.stringify(payload)),mimeType:'application/json',filename:'original.json',sha256:'d'.repeat(64)}} as unknown as ReceizOpenedArtifact;
  const original=retainOpenedProofInspection(opened,new Uint8Array([1]),'original.png',digest)!;
  const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'tx',actionKind:'sports_card_transfer',collectibleId:'rsc_original',claimHash:claim,pulse:120,artifactDigest:digest}]}).records[0];
  const bound={...record,evidence:{...record.evidence,artifactDigest:digest}};
  const trace=ledgerInspectedProvenance(bound,original.report)!;
  expect(trace.steps).toHaveLength(2);expect(trace.sources[0].amountUsdCents).toBe('250');expect(trace.steps[0].allocationRule).toBe('native_exact_allocation');expect(JSON.stringify(trace)).not.toContain('never project this');
  expect(ledgerInspectedProvenance(bound,{...original.report})).toBeNull();expect(ledgerInspectedProvenance({...bound,evidence:{...bound.evidence,artifactDigest:'e'.repeat(64)}},original.report)).toBeNull();expect(fetch).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();}
});

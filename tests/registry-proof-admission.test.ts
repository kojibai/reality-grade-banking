import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {institutionDirectoryRecords} from '../src/content/institution-scorecard.mjs';
import {openSealedConformanceEvidenceObject,type SealedConformanceEvidence} from '../src/conformance/receiz-evidence-seal';
import {admitRegistryProof,officialRegistryProofUrl} from '../server/registry-proof';
const bytes=new Uint8Array(readFileSync('public/conformance/bankeiz-public-conformance.png'));
const bankeiz=institutionDirectoryRecords.find(row=>row.id==='bankeiz')!;
const chase=institutionDirectoryRecords.find(row=>row.id==='chase')!;
let original:Promise<SealedConformanceEvidence>|undefined;
const open=()=>original??=openSealedConformanceEvidenceObject(bytes);

it('admits the real published Bankeiz Original with its existing pinned holder and exact scope',async()=>{
 const network=vi.fn(async()=>{throw Error('NO_NETWORK_OR_PRIVATE_IDENTITY');});
 const record=await admitRegistryProof(bankeiz,bytes,{fetch:network,now:()=>new Date('2026-11-06T00:00:00Z')});
 expect(record.name).toBe('Bankeiz');expect(record.scope).toBe('Public integration contract');expect(record.cases).toBe(33);
 expect(record.holderReceizId).toBe('bjklock.receiz.id');expect(record.artifactSha256).toBe(bankeiz.recordedConformance!.artifactSha256);
 expect(record.url).toBe(`/api/bank/registry/original/bankeiz/${record.artifactSha256}`);expect(network).not.toHaveBeenCalled();
},30000);
it('does not move another institution to PASS using Bankeiz’s genuine passing Original',async()=>{
 await expect(admitRegistryProof(chase,bytes)).rejects.toMatchObject({code:'REGISTRY_INSTITUTION_MISMATCH'});
},30000);
it('rejects ordinary images and changed Originals through the actual installed verifier',async()=>{
 await expect(admitRegistryProof(bankeiz,new Uint8Array(readFileSync('public/institution-logos/chase.png')))).rejects.toMatchObject({code:'REGISTRY_PROOF_INVALID'});
 const changed=bytes.slice();changed[100]^=1;
 await expect(admitRegistryProof(bankeiz,changed)).rejects.toMatchObject({code:'REGISTRY_PROOF_INVALID'});
},30000);
it('uses only the curated HTTPS origin and a fixed publication address',()=>{
 expect(officialRegistryProofUrl(chase)).toBe('https://www.jpmorganchase.com/.well-known/reality-grade-banking/conformance.png');
 expect(()=>officialRegistryProofUrl({...chase,website:'http://127.0.0.1/'})).toThrow();
});
it('requires the identical public Original at the institution’s official origin, without credentials or redirects',async()=>{
 // This port isolates publication policy; the actual verifier is exercised above.
 const held=await open(),institution={...bankeiz,id:'fixture-institution',recordedConformance:undefined,website:'https://bank.example/'};
 const fetcher=vi.fn(async()=>new Response(bytes,{headers:{'content-type':'image/png'}}));
 const record=await admitRegistryProof(institution,bytes,{openProof:async()=>held,fetch:fetcher});
 expect(record.officialProofUrl).toBe('https://bank.example/.well-known/reality-grade-banking/conformance.png');
 expect(fetcher).toHaveBeenCalledWith(record.officialProofUrl,expect.objectContaining({credentials:'omit',redirect:'error',cache:'no-store'}));
 expect(fetcher.mock.calls[0]).toHaveLength(2);
 await expect(admitRegistryProof(institution,bytes,{openProof:async()=>held,fetch:async()=>new Response('different')})).rejects.toMatchObject({code:'REGISTRY_OFFICIAL_PROOF_MISMATCH'});
 await expect(admitRegistryProof(institution,bytes,{openProof:async()=>held,fetch:async()=>new Response(null,{status:302,headers:{location:'https://attacker.example/proof.png'}})})).rejects.toMatchObject({code:'REGISTRY_OFFICIAL_PROOF_REQUIRED'});
},30000);
it('does not accept a self-named passing holder without institution endorsement',async()=>{
 const held=await open(),institution={...bankeiz,recordedConformance:undefined};
 const forged={...held,object:{...held.object,report:{...held.object.report,credentialHolder:{schema:'receiz.bank.conformance-holder.v1' as const,receizId:'different.receiz.id'}}}};
 await expect(admitRegistryProof(institution,bytes,{openProof:async()=>forged,fetch:async()=>new Response(null,{status:404})})).rejects.toMatchObject({code:'REGISTRY_OFFICIAL_PROOF_REQUIRED'});
},30000);

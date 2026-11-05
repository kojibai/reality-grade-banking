import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {verifyReceizArtifact} from '@receiz/sdk';
import {downloadLedgerOriginal} from '../src/receiz/ledger-offline-proof';
import {retainProofInspection,type ProofInspection} from '../src/receiz/proof-inspection';
import type {PublicRecord} from '../src/receiz/public-network';
const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
const record=(sha:string):PublicRecord=>({id:'proofs:download-original',sourceId:'download-original',source:'proofs',kind:'proof recorded',title:'Existing public sealed Original',detail:'',time:null,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:null,sourceUrl:null,evidence:{artifactDigest:sha},details:{},authority:'public-source-projection'});
afterEach(()=>vi.unstubAllGlobals());
async function admitted(){
 const bytes=new Uint8Array(await readFile(new URL('../public/proofs/sealed-essay.png',import.meta.url))),sha=digest(bytes),verified=await verifyReceizArtifact(bytes);
 if(verified.status!=='verified-artifact'||verified.artifactDigest.value!==sha)throw Error('Genuine canonical verification required');
 // This transport test needs only the genuine SDK artifact verdict and exact
 // byte coordinates, not an invented payload or financial projection.
 const report={artifactSha256:sha,artifactBytes:bytes.length,verification:verified.verification} as unknown as ProofInspection;
 const entry=retainProofInspection(report,bytes,'existing-public-original.png');return {bytes,sha,entry};
}
it('downloads the exact already-admitted Original and passes the unchanged default SDK offline reader',async()=>{
 const {bytes,sha,entry}=await admitted(),fetcher=vi.fn(()=>{throw Error('No network for held Original');});vi.stubGlobal('fetch',fetcher);
 const first=await downloadLedgerOriginal(record(sha),entry.report),second=await downloadLedgerOriginal(record(sha),entry.report);
 expect(second).toBe(first);expect(first.name).toBe('existing-public-original.png');expect(new Uint8Array(await first.arrayBuffer())).toEqual(bytes);
 expect((await verifyReceizArtifact(new Uint8Array(await first.arrayBuffer()))).status).toBe('verified-artifact');expect(fetcher).not.toHaveBeenCalled();
 // The returned immutable File remains exact even if a separate mutable view
 // is later changed. No download or historical verification is repeated.
 entry.bytes.fill(0);expect(await downloadLedgerOriginal(record(sha),entry.report)).toBe(first);expect(new Uint8Array(await first.arrayBuffer())).toEqual(bytes);
});
it('refuses forged reports, wrong record binding and changed held bytes before a file is returned',async()=>{
 const {bytes,sha,entry}=await admitted(),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 await expect(downloadLedgerOriginal(record(sha),structuredClone(entry.report))).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');
 await expect(downloadLedgerOriginal(record('a'.repeat(64)),entry.report)).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');
 const changed=bytes.slice();changed[changed.length-1]^=1;const report={...entry.report};retainProofInspection(report,changed,entry.filename);
 await expect(downloadLedgerOriginal(record(sha),report)).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');expect(fetcher).not.toHaveBeenCalled();
});

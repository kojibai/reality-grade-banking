import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {unzipSync} from 'fflate';
import {afterEach,beforeAll,expect,it,vi} from 'vitest';
import {verifyReceizArtifact} from '@receiz/sdk';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
const NativeURL=URL,source=new Uint8Array(readFileSync('public/proofs/sealed-essay.png'));
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');
// A genuine public canonical fixture qualifies export/kit transport, not the
// presence of a production transaction's missing source.
beforeAll(()=>execFileSync(process.execPath,['scripts/build-proof-verifier.mjs'],{stdio:'pipe'}));
async function setup(){
 vi.resetModules();let open!:()=>void,fail!:(error:Error)=>void;const wait=new Promise<void>((resolve,reject)=>{open=resolve;fail=reject;}),tag=crypto.randomUUID();
 let markStarted!:()=>void;const entered=new Promise<void>(resolve=>markStarted=resolve);vi.stubGlobal('__bankKitLoadStarted',markStarted);
 vi.stubGlobal('__bankKitLoadGate',wait);vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 vi.stubGlobal('URL',class extends NativeURL{constructor(input:string|URL,base?:string|URL){super(input,base);if(this.pathname==='/proof-verifier/v129/verifier.js')return new NativeURL('./fixtures/offline-kit-runtime.mjs?run='+tag,import.meta.url);}});
 const api=await import('../src/receiz/ledger-offline-proof'),inspection=await import('../src/receiz/proof-inspection');
 const verified=await verifyReceizArtifact(source);if(verified.status!=='verified-artifact'||verified.artifactDigest.value!==sha(source))throw Error('GENUINE_CANONICAL_VERIFICATION_REQUIRED');
 const report={artifactSha256:sha(source),artifactBytes:source.length,verification:verified.verification,groth16:null} as unknown as import('../src/receiz/proof-inspection').ProofInspection;
 inspection.retainProofInspection(report,source,'exact-existing-original.png');
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'kit-record',kind:'chat_transfer',amountUsdCents:'12500',pulse:'123',proofBundle:{artifactDigest:sha(source)}}]}).records[0];
 const build=JSON.parse(readFileSync('public/proof-verifier/v129/build.json','utf8'));
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async url=>new Response(readFileSync('public/proof-verifier/v129/'+String(url).split('/').at(-1)!)));
 return{open,fail,entered,api,record,report,build,fetcher};
}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
it('exports the exact admitted Original, its unchanged carried proof and every required offline resource',async()=>{
 const {api,record,open,entered,fetcher}=await setup(),work=api.downloadLedgerEvidence(record);await entered;
 expect(fetcher.mock.calls.map(c=>c[0])).toEqual(['/proof-verifier/v129/build.json']);open();const files=unzipSync(await work);
 expect(files['original.receiz']).toEqual(source);expect(JSON.parse(new TextDecoder().decode(files['availability.json']))).toMatchObject({sealedOriginal:true,artifactSha256:sha(source),missing:[]});
 for(const name of ['verifier.js','verifier.js.map','verification-material.json','verify.mjs','verify.html','README.txt','proof-inspection.json'])expect(files[name]?.length).toBeGreaterThan(0);
 expect(JSON.parse(new TextDecoder().decode(files['proof-inspection.json'])).verification).toEqual((await verifyReceizArtifact(source) as any).verification);
 const hashes=JSON.parse(new TextDecoder().decode(files['hashes.json']));for(const [name,bytes]of Object.entries(files))if(name!=='hashes.json')expect(hashes[name]).toEqual({sha256:sha(bytes),bytes:bytes.length});
 // Actual verifier from the ZIP: no account, node_modules or network required.
 const directory=mkdtempSync(join(tmpdir(),'bank-exact-proof-kit-'));
 try{for(const [name,bytes]of Object.entries(files))writeFileSync(join(directory,name),bytes);
  const result=execFileSync(process.execPath,['verify.mjs','original.receiz',sha(source)],{cwd:directory,encoding:'utf8'});expect(JSON.parse(result).artifactSha256).toBe(sha(source));
  const changed=source.slice();changed[changed.length-1]^=1;writeFileSync(join(directory,'changed.receiz'),changed);
  expect(()=>execFileSync(process.execPath,['verify.mjs','changed.receiz',sha(source)],{cwd:directory,stdio:'pipe'})).toThrow();
  expect(()=>execFileSync(process.execPath,['verify.mjs','original.receiz','a'.repeat(64)],{cwd:directory,stdio:'pipe'})).toThrow();
 }finally{rmSync(directory,{recursive:true,force:true});}
});
it('refuses a hash-only transaction or an unadmitted report before any kit or network work',async()=>{
 const {api,record,report,open,fetcher}=await setup();try{
  await expect(api.downloadLedgerEvidence({...record,evidence:{bundleHash:'b'.repeat(64),capsuleHash:'c'.repeat(64)}})).rejects.toThrow('ORIGINAL_NOT_SUPPLIED');
  await expect(api.downloadLedgerEvidence(record,structuredClone(report))).rejects.toThrow('ORIGINAL_INSPECTION_REQUIRED');expect(fetcher).not.toHaveBeenCalled();
 }finally{open();}
});
it('keeps build refusal retryable and refuses altered or incomplete verifier-kit resources',async()=>{
 const {api,record,open,build,fetcher}=await setup();fetcher.mockResolvedValueOnce(new Response(null,{status:503}));
 const failed=expect(api.downloadLedgerEvidence(record)).rejects.toThrow('OFFLINE_VERIFIER_UNAVAILABLE');open();await failed;
 fetcher.mockResolvedValueOnce(Response.json({...build,files:{...build.files,'README.txt':{sha256:'a'.repeat(64),bytes:3}}}));
 await expect(api.downloadLedgerEvidence(record)).rejects.toThrow('OFFLINE_VERIFIER_INTEGRITY');
 const {['verify.html']:omitted,...incomplete}=build.files;expect(omitted).toBeDefined();fetcher.mockResolvedValueOnce(Response.json({...build,files:incomplete}));
 await expect(api.downloadLedgerEvidence(record)).rejects.toThrow('OFFLINE_VERIFIER_BUILD_INVALID');
});
it('preserves verifier-first failure when metadata also rejects, with no unhandled rejection',async()=>{
 const {api,record,fail,entered,fetcher}=await setup();fetcher.mockRejectedValue(Error('METADATA_REFUSED'));
 const result=api.downloadLedgerEvidence(record).then(value=>({value}),error=>({error}));
 await entered;fail(Error('VERIFIER_IMPORT_REFUSED'));expect(await result).toMatchObject({error:Error('VERIFIER_IMPORT_REFUSED')});expect(fetcher).toHaveBeenCalledOnce();
});

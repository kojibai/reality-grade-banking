import {it,expect}from'vitest';
import {mkdtemp,readFile,rm}from'node:fs/promises';
import {tmpdir}from'node:os';
import {join}from'node:path';
it('ships the exact installed verifier browser runtime at the SDK default offline URL',async()=>{
 // @ts-expect-error Build assets are plain ESM.
 const {writeProofVerifierRuntime}=await import('../scripts/value-explainer-assets.mjs');
 const path=await mkdtemp(join(tmpdir(),'bank-proof-runtime-'));
 try{await writeProofVerifierRuntime(path);expect(await readFile(join(path,'snarkjs.min.js'))).toEqual(await readFile('node_modules/snarkjs/build/snarkjs.min.js'));}finally{await rm(path,{recursive:true,force:true});}
});

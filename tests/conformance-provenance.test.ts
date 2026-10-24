import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect,it} from 'vitest';

// The producer uses three bounded20s child processes; the unit default5s cannot
// bound that integration under concurrent CI source hashing.
const root=fileURLToPath(new URL('../',import.meta.url));
it('binds the engineering baseline to shipped native runtime bytes and manifests',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'bank-conformance-provenance-'));
 try{
  const input=join(dir,'fixture-run.json'),output=join(dir,'fixture-baseline.json'),snapshot=join(dir,'sources.json');
  execFileSync(process.execPath,['scripts/conformance-baseline.mjs','--snapshot',snapshot],{cwd:root,encoding:'utf8',timeout:20000});
  const startTime=Date.now();
  await writeFile(input,JSON.stringify({startTime,success:true,testResults:[{name:join(root,'tests/conformance-audit.test.ts'),status:'passed',endTime:startTime,assertionResults:[{fullName:'explicit synthetic baseline producer fixture',status:'passed',duration:0}]}]}));
  execFileSync(process.execPath,['scripts/conformance-baseline.mjs',input,output,'--sources',snapshot],{cwd:root,encoding:'utf8',timeout:20000});
  const report=JSON.parse(await readFile(output,'utf8'));
  const paths=report.sourceIdentity.inputs.map((row:{path:string})=>row.path);
  expect(paths).toContain('public/native/offline-notes.v129.mjs');
  expect(paths).toContain('public/native/receiver-verifier.v129.manifest.json');
  expect(paths).toContain('public/native/receiver-verifier.v129.mjs');
  expect(paths).toContain('public/zk/document-seal.wasm');
  expect(paths).toContain('branding/profile.mjs');
  expect(paths).toContain('public/proof-verifier/v129/verifier.js');
  expect(paths).toContain('server/profile-document.tsx');
  expect(paths).toContain('scripts/build-profile-preview.mjs');
  expect(paths.some((path:string)=>/^server\/(?:profile|receipt|asset)-runtime\/.*\.mjs$/.test(path))).toBe(false);
  const changed=JSON.parse(await readFile(snapshot,'utf8'));
  changed.inputs.find((entry:{path:string})=>entry.path==='public/native/offline-notes.v129.mjs').sha256='0'.repeat(64);
  await writeFile(snapshot,JSON.stringify(changed));
  expect(()=>execFileSync(process.execPath,['scripts/conformance-baseline.mjs',input,output,'--sources',snapshot],{cwd:root,encoding:'utf8',timeout:20000,stdio:'pipe'})).toThrow('TEST_SOURCE_SNAPSHOT_MISMATCH');
 }finally{await rm(dir,{recursive:true,force:true});}
},60_000);

it('identifies CLI orchestration and locked dependencies in standalone checker provenance',()=>{
 const script=new URL('../scripts/conformance-reference.mjs',import.meta.url).href;
 const code=`const {conformanceSourceIdentity}=await import(${JSON.stringify(script)}); console.log(JSON.stringify(await conformanceSourceIdentity())); process.exit(0);`;
 const report=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:root,encoding:'utf8',timeout:20000}));
 const paths=report.inputs.map((row:{path:string})=>row.path);
 for(const path of ['scripts/conformance-reference.mjs','scripts/conformance-contract.mjs','scripts/conformance-assess.mjs','scripts/conformance-adapter.mjs','package-lock.json','public/native/receiver-verifier.v129.manifest.json'])expect(paths).toContain(path);
},30_000);

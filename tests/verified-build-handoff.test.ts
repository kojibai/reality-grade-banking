import {expect,it} from 'vitest';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {existsSync,readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';

const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const workflow=readFileSync('.github/workflows/verify.yml','utf8');
const packageStep=workflow.match(/- name: Package verified build for independent checks\n        run: \|\n((?:          [^\n]*\n)+)/)![1].split('\n').map(line=>line.slice(10)).join('\n');

it('hands off the exact generated renderer fingerprint with its source and compiled dependencies, without rebuilding',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-verified-build-handoff-'));
 try{
  const runner=join(root,'runner'),source=join(root,'source','reality-grade-banking'),restored=join(root,'restored');
  const put=async(path:string,bytes:string|Uint8Array)=>{await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes);};
  const sourcePath='server/profile-runtime/public-market-document.mjs',distPath='dist/assets/explore-fixture.js',fingerprintPath='server/profile-runtime/public-market-render-build.json';
  const renderer='export const renderer="exact verified source";\n',browser='globalThis.verifiedBrowser="exact compiled output";\n';
  const files=[{path:sourcePath,sha256:sha(renderer),bytes:Buffer.byteLength(renderer)},{path:distPath,sha256:sha(browser),bytes:Buffer.byteLength(browser)}];
  const fingerprint=JSON.stringify({schema:'bank.public-market.render-build.v1',sha256:sha(JSON.stringify(files)),files})+'\n';
  await put(join(source,sourcePath),renderer);
  await put(join(source,'SOURCE-ARCHIVE.json'),JSON.stringify({files:files.filter(file=>!file.path.startsWith('dist/'))}));
  await put(join(root,distPath),browser);
  await put(join(root,fingerprintPath),fingerprint);
  // The source archive intentionally omits this final generated coordinate.
  expect(existsSync(join(source,fingerprintPath))).toBe(false);
  await put(join(root,'scripts/build-public-market-render-build.mjs'),'throw Error("The verified fingerprint must not be regenerated");');
  await put(join(root,'package.json'),JSON.stringify({scripts:{build:'node scripts/build-public-market-render-build.mjs'}}));
  await mkdir(join(root,'dist/source'),{recursive:true});
  execFileSync('tar',['-czf',join(root,'dist/source/fixture.tgz'),'-C',join(root,'source'),'reality-grade-banking']);
  await put(join(root,'dist/source/index.json'),JSON.stringify({url:'/source/fixture.tgz'}));
  await mkdir(runner);await mkdir(restored);
  execFileSync('bash',['-e','-c',packageStep],{cwd:root,env:{...process.env,RUNNER_TEMP:runner}});
  execFileSync('tar',['-xzf',join(runner,'verified-build.tgz'),'-C',restored]);
  expect(existsSync(join(restored,fingerprintPath)),'The post-build fingerprint is outside the source archive and must be copied explicitly.').toBe(true);
  expect(await readFile(join(restored,fingerprintPath))).toEqual(Buffer.from(fingerprint));
  for(const file of files){const bytes=await readFile(join(restored,file.path));expect(sha(bytes)).toBe(file.sha256);expect(bytes.length).toBe(file.bytes);}
  expect(packageStep).not.toMatch(/build-public-market-render-build|npm\s+run\s+build|vite\s+build/);
 }finally{await rm(root,{recursive:true,force:true});}
});

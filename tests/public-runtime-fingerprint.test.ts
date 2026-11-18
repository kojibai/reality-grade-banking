import{it,expect}from'vitest';
import{mkdtemp,mkdir,writeFile,readFile,rm}from'node:fs/promises';
import{tmpdir}from'node:os';
import{join,resolve}from'node:path';
import{execFileSync}from'node:child_process';

it('binds the Observatory document and unlisted generated workers to the renderer fingerprint',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-runtime-fingerprint-')),script=resolve('scripts/build-public-market-render-build.mjs');
 const save=async(path:string,body:string)=>{await mkdir(join(root,path,'..'),{recursive:true});await writeFile(join(root,path),body);};
 try{
  for(const path of ['server/public-market-preparation.ts','server/prepared-public-market-state.ts','server/public-ledger-preparation.ts','server/prepared-public-material.ts','server/public-market.ts','src/receiz/prepared-public-page-path.ts','public/receiz-public-share-chart-history.json','server/profile-runtime/public-market-document.mjs','server/profile-runtime/public-page-preparation.mjs'])await save(path,'fixed renderer operand');
  for(const path of ['explore','explore/music','explore/images','explore/videos','explore/books','explore/essays','explore/moments','explore/collectibles','explore/documents','market-cap'])await save('dist/'+path+'/index.html','<script src="/assets/explore-Abcdef12.js"></script>');
  const observatory='dist/observatory/index.html';
  await save(observatory,'<main>Observatory</main>');
  await save('dist/.vite/manifest.json',JSON.stringify({'explore/index.html':{file:'assets/explore-Abcdef12.js'}}));
  await save('dist/assets/explore-Abcdef12.js','export const exact=true;');await save('dist/assets/composite-wallet-worker-Abcdef34.js','worker version one');
  const run=async()=>{execFileSync(process.execPath,[script],{cwd:root,stdio:'pipe'});return JSON.parse(await readFile(join(root,'server/profile-runtime/public-market-render-build.json'),'utf8'));};
  const initial=await run();
  await save(observatory,'<main>Updated Observatory</main>');
  const before=await run();expect(before.sha256).not.toBe(initial.sha256);
  await save('dist/assets/composite-wallet-worker-Abcdef34.js','worker version two');const after=await run();
  expect(after.sha256).not.toBe(before.sha256);expect(after.files.some((file:{path:string})=>file.path==='dist/assets/composite-wallet-worker-Abcdef34.js')).toBe(true);
 }finally{await rm(root,{recursive:true,force:true});}
});

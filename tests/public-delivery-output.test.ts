import{it,expect}from'vitest';import{mkdtemp,mkdir,writeFile,readFile,access,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{readFileSync}from'node:fs';
it('stages byte-identical immutable documents outside canonical prepared routes without changing private build templates',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-delivery-')),source=join(root,'dist'),output=join(root,'dist-public');
 try{for(const[path,body]of Object.entries({'index.html':'<html>Exact bank</html>','explore/index.html':'<html>Historical explore</html>','explore/images/index.html':'<html>Historical images</html>','ledger/index.html':'<html>Historical Ledger</html>','ledger/proofs/index.html':'<html>Settled Proofs</html>','feed/index.html':'<html>Historical Feed</html>','discover/index.html':'<html>Historical Discover</html>','assets/app.js':'unchanged app','learn/index.html':'unchanged guide'})){await mkdir(join(source,path,'..'),{recursive:true});await writeFile(join(source,path),body);}
 const module=await import('../scripts/build-public-delivery-output.mjs');await module.buildPublicDeliveryOutput({source,output});
 for(const path of['index.html','explore/index.html','explore/images/index.html','ledger/index.html','ledger/proofs/index.html','feed/index.html','discover/index.html']){await expect(access(join(output,path))).rejects.toThrow();const name=path==='index.html'?'bank/index.html':path;expect(await readFile(join(output,'__bank_static_entry',name),'utf8')).toBe(await readFile(join(source,path),'utf8'));}
 expect(await readFile(join(output,'assets/app.js'),'utf8')).toBe('unchanged app');expect(await readFile(join(output,'learn/index.html'),'utf8')).toBe('unchanged guide');
 }finally{await rm(root,{recursive:true,force:true});}
});
it('opens Bank and public views from their existing static documents without a prepared-page gate',()=>{
 const v=JSON.parse(readFileSync('vercel.json','utf8')),route=(source:string)=>v.rewrites.find((r:{source:string})=>r.source===source)?.destination;
 expect(v.outputDirectory).toBe('dist-public');expect(route('/')).toBe('/__bank_static_entry/bank/index.html');expect(route('/explore/')).toBe('/__bank_static_entry/explore/index.html');expect(route('/index.html')).toBe('/__bank_static_entry/bank/index.html');expect(route('/explore/index.html')).toBe('/__bank_static_entry/explore/index.html');expect(route('/receive/')).toBe('/__bank_static_entry/bank/index.html');expect(route('/auth/receiz/callback')).toBe('/__bank_static_entry/bank/index.html');expect(v.functions['api/explore.ts'].includeFiles).toContain('dist/index.html');
});
it('keeps function packaging globs within the Vercel schema length limit',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 for(const [name,entry]of Object.entries(config.functions) as Array<[string,Record<string,unknown>]>)for(const key of ['includeFiles','excludeFiles'])if(entry[key]!==undefined){expect(typeof entry[key],name+'.'+key).toBe('string');expect((entry[key] as string).length,name+'.'+key).toBeLessThanOrEqual(256);}
});
it('retains the exact prepared public entry and data packaging selection',async()=>{
 const {createRequire}=await import('node:module'),{braceExpand}=createRequire(import.meta.url)('minimatch'),config=JSON.parse(readFileSync('vercel.json','utf8'));
 expect(braceExpand(config.functions['api/explore.ts'].includeFiles).sort()).toEqual(['dist/index.html','dist/explore/**','dist/market-cap/index.html','dist/ledger/**','dist/feed/index.html','dist/discover/index.html','server/profile-runtime/**','public/receiz-public-market.json','public/receiz-public-capitalization.json','public/receiz-public-ledger.json.gz.bin','public/receiz-public-share-chart-history.json','public/receiz-public-sports.json'].sort());
});

it('serves both canonical Discover links from the existing static alias without a Source gate',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 for(const path of ['/discover','/discover/'])expect(config.rewrites.find((route:{source:string})=>route.source===path).destination).toBe('/__bank_static_entry/discover/index.html');
 expect(config.functions['api/explore.ts'].includeFiles).toContain('discover');
});

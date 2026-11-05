import{it,expect}from'vitest';import{mkdtemp,mkdir,writeFile,readFile,access,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{readFileSync}from'node:fs';
it('stages byte-identical immutable documents outside canonical prepared routes without changing private build templates',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-delivery-')),source=join(root,'dist'),output=join(root,'dist-public');
 try{for(const[path,body]of Object.entries({'index.html':'<html>Exact bank</html>','explore/index.html':'<html>Historical explore</html>','explore/images/index.html':'<html>Historical images</html>','ledger/index.html':'<html>Historical Ledger</html>','feed/index.html':'<html>Historical Feed</html>','discover/index.html':'<html>Historical Discover</html>','assets/app.js':'unchanged app','learn/index.html':'unchanged guide'})){await mkdir(join(source,path,'..'),{recursive:true});await writeFile(join(source,path),body);}
 const module=await import('../scripts/build-public-delivery-output.mjs');await module.buildPublicDeliveryOutput({source,output});
 for(const path of['index.html','explore/index.html','explore/images/index.html','ledger/index.html','feed/index.html','discover/index.html']){await expect(access(join(output,path))).rejects.toThrow();const name=path==='index.html'?'bank/index.html':path;expect(await readFile(join(output,'__bank_static_entry',name),'utf8')).toBe(await readFile(join(source,path),'utf8'));}
 expect(await readFile(join(output,'assets/app.js'),'utf8')).toBe('unchanged app');expect(await readFile(join(output,'learn/index.html'),'utf8')).toBe('unchanged guide');
 }finally{await rm(root,{recursive:true,force:true});}
});
it('routes canonical pages through the prepared wrapper and keeps direct immutable/private-entry aliases static',()=>{
 const v=JSON.parse(readFileSync('vercel.json','utf8')),route=(source:string)=>v.rewrites.find((r:{source:string})=>r.source===source)?.destination;
 expect(v.outputDirectory).toBe('dist-public');expect(route('/')).toBe('/api/explore?path=bank-entry&entry=1');expect(route('/explore/')).toBe('/api/explore?path=explore&entry=1');expect(route('/index.html')).toBe('/__bank_static_entry/bank/index.html');expect(route('/explore/index.html')).toBe('/__bank_static_entry/explore/index.html');expect(route('/receive/')).toBe('/__bank_static_entry/bank/index.html');expect(route('/auth/receiz/callback')).toBe('/__bank_static_entry/bank/index.html');expect(v.functions['api/explore.ts'].includeFiles).toContain('dist/index.html');
});

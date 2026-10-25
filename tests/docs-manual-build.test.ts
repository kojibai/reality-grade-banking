import {expect,it} from 'vitest';
import {mkdtemp,readFile,rm,cp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {docsArticles} from '../src/content/banking-docs.mjs';
it('builds the complete manual alone with matching Markdown, public source, examples and mirror links',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bankeiz-docs-manual-'));
 try{
  const project=join(root,'docs-app');await cp('docs-app',project,{recursive:true,filter:path=>!/(?:^|\/)(?:dist|node_modules|\.vercel)(?:\/|$)/.test(path)});
  execFileSync(process.execPath,['build.mjs'],{cwd:project,encoding:'utf8'});
  const built=join(project,'dist');const data=JSON.parse(await readFile(join(built,'articles.json'),'utf8'));
  expect(data.description).toContain('not proof');expect(data.articles.map((p:{slug:string})=>p.slug)).toEqual(docsArticles.map(p=>p.slug));
  const full=await readFile(join(built,'llms-full.txt'),'utf8'),sitemap=await readFile(join(built,'sitemap.xml'),'utf8');
  for(const p of docsArticles){const md=await readFile(join(built,p.slug,'index.md'),'utf8');expect(md).toContain('# '+p.title);expect(full).toContain('# '+p.title);expect(sitemap).toContain('https://docs.bankeiz.com/'+p.slug+'/');expect(md).toContain('## Implementation sources');}
  expect(await readFile(join(built,'examples/sdk-sandbox.mjs'),'utf8')).toContain('createReceizEmulator');
  const mirror=join(root,'mirror');execFileSync(process.execPath,['--input-type=module','-e',"import {buildDocs} from './docs-app/build.mjs'; await buildDocs({root:process.argv[1],base:'/docs/'});",mirror],{cwd:resolve('.'),encoding:'utf8'});
  const html=await readFile(join(mirror,'merchant-checkout/index.html'),'utf8');expect(html).toContain('href="/docs/receiving/"');expect(html).toContain('href="https://docs.bankeiz.com/merchant-checkout/"');expect(html).not.toMatch(/receiz-navigation|serviceWorker|type="module"/);
 }finally{await rm(root,{recursive:true,force:true});}
},20000);
it('executes the exact downloadable examples in the documented no-money sandbox',()=>{
 const output=execFileSync(process.execPath,['--input-type=module','-e',"import {sdkSandboxExample} from './docs-app/examples.mjs'; const {spawnSync}=await import('node:child_process'); const r=spawnSync(process.execPath,['--input-type=module'],{input:sdkSandboxExample,encoding:'utf8'}); process.stdout.write(r.stdout); if(r.status)throw Error(r.stderr);"],{encoding:'utf8'});
 expect(JSON.parse(output)).toMatchObject({version:'129.0.0',namespace:'sandbox.receiz.test',sandboxVerified:true,checks:{failed:0,networkCalls:0,dbCalls:0}});
});

it('executes the downloadable MCP checks without external writes',()=>{
 const output=execFileSync(process.execPath,['--input-type=module','-e',"import {mcpCheckExample} from './docs-app/examples.mjs'; const {spawnSync}=await import('node:child_process'); const r=spawnSync(process.execPath,['--input-type=module'],{input:mcpCheckExample,encoding:'utf8'}); process.stdout.write(r.stdout); if(r.status)throw Error(r.stderr);"],{encoding:'utf8'});
 expect(output).toContain('receiz_conformance_run');expect(output).toContain('receiz_release_verify');expect(output.match(/"writesPerformed": 0/g)).toHaveLength(2);expect(output).not.toContain('"ok": false');expect(output.match(/"networkCalls": 0/g)).toHaveLength(2);
});

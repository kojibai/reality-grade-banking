import {afterEach,expect,it} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Window} from 'happy-dom';
import {parsePublicMarket} from '../src/receiz/public-market';
import {publicMarketRecord} from '../src/receiz/public-network';
import {readingPageContent,writePublicReadingPages} from '../scripts/public-reading-pages.mjs';
const roots:string[]=[];afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'Public work',summary:'Exact public summary',ownerUsername:'artist',valueUsd:42,pulse:'14800000'}]}}).items[0];

it('removes application machinery while retaining public copy, semantic structure and absolute crawlable links',()=>{
 const source='<main><h1>A guide</h1><p>Complete public paragraph.</p><a href="/asset/profile%3Aartist%3Asource/">Read the work</a><script>hostile()</script><style>.app{}</style><template>HUGE NAVIGATION</template><svg><text>Decorative</text></svg><form><input value="not public content"></form><a href="javascript:hostile()" onclick="hostile()">Unsafe link</a><img src="https://bankeiz.com/art/work.webp" onerror="hostile()" alt="Actual artwork"></main>';
 const result=readingPageContent(source,'https://bankeiz.com/guide/'),window=new Window();window.document.body.innerHTML=result.html;
 expect(window.document.querySelector('script,style,template,svg,form,input,[onclick],[onerror]')).toBeNull();expect(window.document.body.textContent).toContain('Complete public paragraph.');expect(result.text).toContain('https://bankeiz.com/asset/profile%3Aartist%3Asource/');expect(result.text).not.toContain('HUGE NAVIGATION');expect(result.html).not.toContain('javascript:');expect(window.document.querySelector('img')?.getAttribute('alt')).toBe('Actual artwork');
});

it('omits malformed source links without losing surrounding public text',()=>{
 const result=readingPageContent('<p>Keep this text.</p><a href="https://[">Broken link</a><img src="https://[" alt="broken">','https://bankeiz.com/guide/');
 expect(result.text).toContain('Keep this text.');expect(result.text).toContain('Broken link');expect(result.html).not.toContain('href=');
});

it('writes linked public guide, catalog and Ledger views without altering their input or exposing account records',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-reading-'));roots.push(root);const record=publicMarketRecord(item),pages={'/guide/':{title:'Practical guide',content:'<main><p>Existing authored copy.</p></main>'}},input={outdir:root,pages,catalog:{items:[item],observedAt:'2026-10-31T10:00:00Z'},ledger:{records:[record],capturedAt:'2026-10-30T10:00:00Z'}},before=JSON.stringify(input);
 await writePublicReadingPages(input);
 const guide=await readFile(join(root,'read/pages/guide/index.html'),'utf8'),directory=await readFile(join(root,'read/public/index.html'),'utf8'),catalog=await readFile(join(root,'read/catalog/index.html'),'utf8'),ledger=await readFile(join(root,'read/ledger/index.txt'),'utf8');
 expect(guide).toContain('Existing authored copy.');expect(guide).not.toContain('receiz-navigation');expect(directory).toContain('/read/pages/guide/');expect(catalog).toContain('/read/assets/profile%3Aartist%3Asource/');expect(catalog).toContain('/read/profiles/artist/');expect(ledger).toContain('4200');expect(ledger).toContain('14800000');expect(JSON.stringify(input)).toBe(before);
 expect(await readFile(join(root,'read/pages/guide/index.txt'),'utf8')).toContain('Existing authored copy.');expect(await readFile(join(root,'reading-sitemap.xml'),'utf8')).toContain('/read/public/');
 await expect(writePublicReadingPages({...input,ledger:{...input.ledger,records:[{...record,authority:'account-source-projection'}]}})).rejects.toThrow('READING_PUBLIC_SOURCE_REQUIRED');
});

it('retains every catalog item and public Ledger record across small linked pages',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-reading-'));roots.push(root);const items=Array.from({length:101},(_,i)=>({...item,id:'profile:artist:work-'+i,title:'Original '+i}));
 await writePublicReadingPages({outdir:root,pages:{},catalog:{items,observedAt:null},ledger:{records:items.map(publicMarketRecord),capturedAt:null}});
 expect(await readFile(join(root,'read/catalog/index.html'),'utf8')).toContain('/read/catalog/2/');expect(await readFile(join(root,'read/catalog/2/index.html'),'utf8')).toContain('Original 50');expect(await readFile(join(root,'read/catalog/3/index.txt'),'utf8')).toContain('Original 100');
});

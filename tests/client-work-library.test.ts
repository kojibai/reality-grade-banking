import {afterEach,expect,it} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Window} from 'happy-dom';
import {renderClientWorkResource,resourceDownload,writeClientWorkLibrary} from '../scripts/client-work-library.mjs';

const roots:string[]=[];
afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
const page={id:'resource-template-web-design-proposal',slug:'web-design-proposal',kind:'template',path:'/learn/templates/web-design-proposal/',niche:'Web designers',title:'Web design proposal template',description:'A complete project brief and reviewed example.',intro:'Put the page list, scope and next decision together.',problem:'The client asks for another page after the scope is agreed.',sections:[{heading:'Review the scope',paragraphs:['Keep the actual client brief beside the proposed work.'],bullets:['Name the person who reviews the work.']}],template:'Client: [name]\nPages: [agreed list]\nPrice: [reviewed amount]',example:'Fictional example\nClient: Cedar Studio\nPages: Home, About, Contact\nPrice: $900',bankeiz:'Use the context you choose in Messages to prepare wording you can review.',related:['/learn/resources/','/business/for/designers/'],keywords:['web design proposal template']};
const head='<title>Web design proposal template | Bankeiz</title><meta name="description" content="A complete project brief and reviewed example."><link rel="canonical" href="https://bankeiz.com/learn/templates/web-design-proposal/">';

it('delivers the complete useful template and example before scripts or remote data',()=>{
 const html=renderClientWorkResource(page,{head,footer:'<footer>Bankeiz</footer>'}),w=new Window();w.document.body.innerHTML=html;
 expect(w.document.querySelector('h1')?.textContent).toBe('Web design proposal template');
 expect(w.document.querySelector('main')?.textContent).toContain('Client: [name]');expect(w.document.querySelector('main')?.textContent).toContain('Client: Cedar Studio');
 expect(w.document.querySelector('a[download]')?.getAttribute('href')).toBe('/learn/templates/web-design-proposal/template.txt');
 expect(w.document.querySelector('script[src],iframe')).toBeNull();expect(html).not.toMatch(/receiz-navigation|public-market-seed|fetch\(|setTimeout\(|<link[^>]+rel="stylesheet"/);expect(Buffer.byteLength(html)).toBeLessThan(150000);
});

it('keeps template input as inert text and rejects executable source or related links',()=>{
 const html=renderClientWorkResource({...page,template:'<script>hostile()</script>'},{head,footer:''}),w=new Window();w.document.body.innerHTML=html;
 expect(w.document.querySelector('pre')?.textContent).toBe('<script>hostile()</script>');expect(w.document.querySelector('main script')).toBeNull();
 expect(()=>renderClientWorkResource({...page,related:['javascript:hostile()']},{head,footer:''})).toThrow('RESOURCE_LINK_INVALID');
 expect(()=>renderClientWorkResource({...page,sources:[{label:'Source',url:'https://user:password@example.com'}]},{head,footer:''})).toThrow('RESOURCE_LINK_INVALID');
});

it('writes a real UTF-8 download with the same complete template and explicitly labeled example',async()=>{
 const root=await mkdtemp(join(tmpdir(),'bank-client-library-'));roots.push(root);
 await writeClientWorkLibrary({outdir:root,pages:[page],head:()=>head,footer:()=>'<footer>Bankeiz</footer>'});
 const html=await readFile(join(root,page.path,'index.html'),'utf8'),download=await readFile(join(root,page.path,'template.txt'),'utf8');
 expect(html).toContain('Client: Cedar Studio');expect(download).toBe(resourceDownload(page));expect(download).toContain('Client: [name]');expect(download).toContain('Fictional example');expect(download).toContain('Price: $900');
});

it('renders a useful linked directory without a search script or empty results shell',()=>{
 const hub={id:'resource-directory',kind:'directory',path:'/learn/resources/',title:'Client work resources',description:'Useful working documents.',intro:'Find a concrete starting point.',entries:[page]};
 const html=renderClientWorkResource(hub,{head:'<title>Client work resources</title>',footer:''}),w=new Window();w.document.body.innerHTML=html;
 expect(w.document.querySelector('main a[href="/learn/templates/web-design-proposal/"]')?.textContent).toContain('Web design proposal template');expect(w.document.querySelector('main')?.textContent).toContain('Web designers');expect(w.document.querySelector('script[src]')).toBeNull();
});

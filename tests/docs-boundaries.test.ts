// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {sourceFiles} from '../scripts/source-files.mjs';
it('leaves /docs/ clicks to its separate document app while retaining the current surface',()=>{
 const before=location.pathname;history.replaceState({},'','/trust/');vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){}}));vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const body='<header class="learn-header">Standard</header><main><h1>Trust</h1><a href="/docs/">Documentation</a></main>';
 document.head.innerHTML='<title>Trust</title>';document.body.innerHTML='<div id="public-learn-root">'+body+'</div>';
 const nav=document.createElement('script');nav.id='receiz-navigation';nav.type='application/json';nav.textContent=JSON.stringify({pages:{'/trust/':{head:'<title>Trust</title>',content:body},'/explore/':{head:'<title>Explore</title><link rel="canonical" href="https://bankeiz.com/explore/">',content:'<main>Explorer</main>'}},bank:{head:'',styles:[],entry:'/unused-bank.js'}});document.body.append(nav);
 const main=document.querySelector('main');let nativeAllowed=false;const observe=(e:Event)=>{nativeAllowed=!e.defaultPrevented;e.preventDefault();};
 try{new Function(readFileSync('public/learn/learn.js','utf8'))();document.addEventListener('click',observe);document.querySelector<HTMLAnchorElement>('main a')!.click();expect(nativeAllowed).toBe(true);expect(document.querySelector('main')).toBe(main);expect(document.title).toBe('Trust');}finally{document.removeEventListener('click',observe);vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';history.replaceState({},'',before);}
});
it('includes the standalone docs project and deployment configuration in corresponding source',async()=>{
 const inventory=await sourceFiles(),paths=inventory.map((entry:{path:string})=>entry.path);expect(paths).toEqual(expect.arrayContaining(['docs-app/README.md','docs-app/package.json','docs-app/build.mjs','docs-app/vercel.json']));expect(paths.some((path:string)=>path.startsWith('docs-dist/')||path.startsWith('docs-app/dist/'))).toBe(false);
},15000);

it('is a dependency-free Vercel project rooted at docs-app',()=>{const config=JSON.parse(readFileSync('docs-app/vercel.json','utf8')),pkg=JSON.parse(readFileSync('docs-app/package.json','utf8'));expect(config).toMatchObject({framework:null,buildCommand:'npm run build',outputDirectory:'dist'});expect(pkg.scripts.build).toBe('node build.mjs');expect(pkg.dependencies??{}).toEqual({});for(const file of ['docs-app/build.mjs','docs-app/renderer.mjs','docs-app/content.mjs'])expect(readFileSync(file,'utf8')).not.toMatch(/from ['"]\.\.\//);});

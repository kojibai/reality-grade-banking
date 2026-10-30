// @vitest-environment happy-dom
import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import type {PreviewServer} from 'vite';
import {docsArticles,docsOrigin} from '../src/content/banking-docs.mjs';
import {publicPage,publicPages,applyPublicMetadata} from '../scripts/public-page-metadata.mjs';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';
import {publicMetadataPlugin} from '../scripts/public-metadata-plugin.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import {gzipSync} from 'node:zlib';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
const parse=(html:string)=>new DOMParser().parseFromString(html,'text/html');
it('reserves a canonical indexed user-guide route while preserving its public username route',()=>{
 const page=publicPage('/guide/');expect(page).toMatchObject({id:'guide',path:'/guide/'});expect(publicPages).toHaveLength(155);
 expect(publicPage('/guide')).toBe(page);expect(page?.noindex).not.toBe(true);
 expect(profilePagePath('guide')).toBe('/u/guide/');expect(profilePageUsername('/guide/')).toBeNull();expect(profilePageUsername('/u/guide/')).toBe('guide');
 const rewrites=JSON.parse(readFileSync('vercel.json','utf8')).rewrites;
 for(const source of ['/guide','/guide/'])expect(rewrites.find((r:{source:string})=>r.source===source)?.destination).toBe('/guide/index.html');
 expect(rewrites.findIndex((r:{source:string})=>r.source==='/guide/')).toBeLessThan(rewrites.findIndex((r:{source:string})=>r.source.startsWith('/u/')));
 const html=applyPublicMetadata('<html><head></head><body></body></html>',page!,{url:'/social/guide-example.png',width:1730,height:909,bytes:1,sha256:'a'.repeat(64),alt:'How to use Bankeiz'}),doc=parse(html);
 expect(doc.querySelector('link[rel=canonical]')?.getAttribute('href')).toBe('https://bankeiz.com/guide/');expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toContain('guide-example.png');
 expect(readFileSync('public/llms.txt','utf8')).toContain('https://bankeiz.com/guide/');
});
it('renders practical task controls and all 47 canonical chapters without copying their manuals or loading an account',async()=>{
 const {guideContent,guideStyles}=await import('../scripts/user-guide-page.mjs');
 const {guideTasks}=await import('../src/content/user-guide.mjs');
 const html=guideContent(),doc=parse(html),main=doc.querySelector('main')!;
 expect(main.querySelector('h1')?.textContent).toContain('What would you like to do?');
 expect(main.querySelectorAll('[data-guide-task]')).toHaveLength(guideTasks.length);
 for(const task of guideTasks){const row=main.querySelector(`[data-guide-task="${task.id}"]`)!;expect(row.textContent).toContain(task.why);for(const field of ['click','result','evidence'] as const)expect(row.textContent).toContain(task[field]);expect(row.querySelector('a')?.getAttribute('href')).toBe(docsOrigin+'/'+task.slug+'/');}
 const chapters=[...main.querySelectorAll<HTMLAnchorElement>('[data-guide-article]')];expect(chapters).toHaveLength(47);
 expect(new Set(chapters.map(a=>a.getAttribute('href')))).toEqual(new Set(docsArticles.map(a=>docsOrigin+'/'+a.slug+'/')));
 for(const href of ['/learn/','/banking/','#guide-money','#guide-people','#guide-business','#guide-protection','#guide-manual'])expect(main.querySelector(`a[href="${href}"]`),href).not.toBeNull();
 expect(main.querySelector('script,iframe,form,canvas,video')).toBeNull();expect(html).not.toMatch(/\/api\/|type="module"|data-coop|data-product-walkthrough/);
 expect(guideStyles).toContain('@media');expect(guideStyles).not.toMatch(/@import|url\(/);
});
it('carries page-only styles through the existing builder and keeps tours discoverable and unchanged',async()=>{
 const {guideContent}=await import('../scripts/user-guide-page.mjs');
 const builder=readFileSync('scripts/build-public-pages.mjs','utf8');expect(builder).toContain('guideContent()');expect(builder).toContain('data-public-page-style="guide"');
 expect(readFileSync('scripts/build-offline-shell.mjs','utf8')).toContain("'/guide/'");
 expect(parse(siteFooterHtml('/learn/')).querySelector('a[href="/guide/"]')).not.toBeNull();expect(parse(siteFooterHtml('/guide/')).querySelector('a[href="/guide/"]')).toBeNull();
 // @ts-expect-error Static Learn template is standalone ESM.
 const {learnHome}=await import('../scripts/learn-template.mjs');
 // @ts-expect-error Static Banking template is standalone ESM.
 const {bankingContent}=await import('../scripts/banking-page.mjs');
 expect(parse(learnHome()).querySelector('main a[href="/guide/"]')).not.toBeNull();expect(parse(bankingContent()).querySelector('main a[href="/guide/"]')).not.toBeNull();
 expect(learnHome()).toContain('data-product-walkthrough="learn-banking"');expect(bankingContent()).toContain('id="walkthrough"');
 expect(guideContent()).not.toContain('data-example-views');
});
it('routes preview and draws distinct source artwork without adding a page script',()=>{
 let middleware!:(req:{url:string},res:unknown,next:()=>void)=>void;const configure=publicMetadataPlugin().configurePreviewServer;if(typeof configure!=='function')throw Error('PUBLIC_PREVIEW_REQUIRED');
 configure.call(undefined as never,{middlewares:{use(fn:typeof middleware){middleware=fn;}}} as unknown as PreviewServer);
 for(const path of ['/guide/','/guide']){const req={url:path+'?from=preview'};middleware(req,{},()=>{});expect(req.url).toBe('/guide/index.html?from=preview');}
 const svg=new DOMParser().parseFromString(shareCardSvg(publicPage('/guide/')!),'image/svg+xml');expect(svg.querySelector('parsererror')).toBeNull();expect(svg.querySelector('[data-guide-share]')).not.toBeNull();expect(svg.documentElement.textContent).toContain('From here to done.');
});
it('uses existing retained navigation for guide transitions without a document or private read',async()=>{
 const {guideContent,guideStyles}=await import('../scripts/user-guide-page.mjs');const html=guideContent(),header=html.match(/<header class="learn-header">[\s\S]*?<\/header>/)![0];
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){}}));vi.spyOn(window,'scrollTo').mockImplementation(()=>{});const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 history.replaceState({},'','/learn/');document.head.innerHTML='<title>Learn</title>';document.body.innerHTML='<div id="public-learn-root">'+header+'<main><a href="/guide/">User guide</a></main></div>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';data.textContent=JSON.stringify({pages:{'/learn/':{head:'<title>Learn</title>',content:header+'<main>Learn</main>'},'/guide/':{head:'<title>Your guide</title><style data-public-page-style="guide">'+guideStyles+'</style>',content:html}},bank:{head:'',styles:[],entry:'/unused-bank.js'}});document.body.append(data);
 const retainedHeader=document.querySelector('header');try{new Function(readFileSync('public/learn/learn.js','utf8'))();document.querySelector<HTMLAnchorElement>('main a')!.click();expect(location.pathname).toBe('/guide/');expect(document.querySelector('h1')?.textContent).toContain('What would you like to do?');expect(document.querySelector('header')).toBe(retainedHeader);expect(document.querySelector('style[data-public-page-style="guide"]')).not.toBeNull();expect(fetch).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();vi.restoreAllMocks();document.body.innerHTML='';history.replaceState({},'','/');}
});

it('keeps the shared presentation runtime within its established budget',async()=>{
 const {learnAssets}=await import('../scripts/learn-assets.mjs');const assets=await learnAssets();
 expect(gzipSync(assets.css).length+gzipSync(assets.js).length).toBeLessThan(15000);
});

it('serves the same static guide in development and leaves the reserved username route alone',async()=>{
 const {userGuidePageDevPlugin}=await import('../scripts/user-guide-page-dev.mjs');
 const {guideContent}=await import('../scripts/user-guide-page.mjs');
 let middleware!:(req:{url:string},res:any,next:()=>void)=>Promise<void>;
 const transform=vi.fn(async(_path:string,html:string)=>html);const configure=userGuidePageDevPlugin().configureServer;if(typeof configure!=='function')throw Error('GUIDE_DEV_REQUIRED');
 configure.call(undefined as never,{middlewares:{use(fn:typeof middleware){middleware=fn;}},transformIndexHtml:transform} as any);
 let body='';const res={statusCode:0,setHeader:vi.fn(),end(value:string){body=value;}};
 await middleware({url:'/guide?from=dev'},res,()=>{throw Error('GUIDE_NOT_SERVED');});
 expect(res.statusCode).toBe(200);expect(body).toContain(guideContent());expect(body).toContain('data-public-page-style="guide"');expect(body).not.toContain('type="module"');expect(transform).toHaveBeenCalledWith('/guide/',expect.any(String));
 const next=vi.fn();await middleware({url:'/u/guide/'},res,next);expect(next).toHaveBeenCalledTimes(1);
});
it('keeps the public capitalization guide aligned with the implemented share accounting',async()=>{
 const {learningPages}=await import('../src/content/learning-pages.mjs');const page=learningPages.find(p=>p.slug==='global-market-cap')!;const copy=page.sections.flat().join(' ');
 for(const phrase of ['current unit value','outstanding shares plus remaining buying capacity','Account and Vault holdings and live certificates','issued supply','release capacity'])expect(copy).toContain(phrase);
});

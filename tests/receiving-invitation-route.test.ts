// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import type {PreviewServer,ViteDevServer} from 'vite';
// @ts-expect-error Static public descriptor is plain ESM.
import {receivingInvitationPage} from '../src/content/receiving-invitation-page.mjs';
import {learningPages} from '../src/content/learning-pages.mjs';
import {applyPublicMetadata,publicPage,publicPages} from '../scripts/public-page-metadata.mjs';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';
import {publicIllustration,withPublicIllustration} from '../scripts/public-imagery.mjs';
// @ts-expect-error Static public invitation template is plain ESM.
import {invitationContent} from '../scripts/receiving-page.mjs';
import {publicMetadataPlugin} from '../scripts/public-metadata-plugin.mjs';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();history.replaceState(null,'','/');});
it('publishes one generic noindex invitation document outside the guide directory and sitemap',()=>{
 expect(receivingInvitationPage).toMatchObject({slug:'invitation',path:'/invitation/',invitation:true,noindex:true,sections:[]});expect(learningPages.some(page=>page.slug==='invitation')).toBe(false);
 const metadata=publicPage('/invitation/')!;expect(metadata).toMatchObject({id:'receiving-invitation',path:'/invitation/',noindex:true});expect(publicPage('/invitation')).toBe(metadata);expect(publicPages.filter(page=>!page.noindex).map(page=>page.path)).not.toContain('/invitation/');
 const html=applyPublicMetadata('<html><head><title>Old</title><meta name="robots" content="index,follow"></head><body>Static invitation</body></html>',metadata,{url:'/social/generic-invitation.png',width:1730,height:909,sha256:'a'.repeat(64),bytes:1,alt:'Receiving invitation'}),doc=new DOMParser().parseFromString(html,'text/html');expect(doc.title).toBe(metadata.title);expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex,follow');expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://bankeiz.com/invitation/');expect(shareCardSvg(metadata)).not.toMatch(/supplier@example|Invoice #1048|4800|private-fragment/);
});
it('routes both invitation spellings to the exact static page before account fallback',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8')) as {rewrites:{source:string;destination:string}[]};for(const path of ['/invitation','/invitation/'])expect(config.rewrites.find(row=>row.source===path)?.destination).toBe('/invitation/index.html');
 let middleware!:(req:{url:string},res:unknown,next:()=>void)=>void;const configure=publicMetadataPlugin().configurePreviewServer;if(typeof configure!=='function')throw Error('PUBLIC_PREVIEW_REQUIRED');configure.call(undefined as never,{middlewares:{use(fn:typeof middleware){middleware=fn;}}} as unknown as PreviewServer);for(const path of ['/invitation','/invitation/']){const req={url:path+'?from=share'};middleware(req,null,()=>{});expect(req.url).toBe('/invitation/index.html?from=share');}
});
it('excludes the invitation fragment from retained navigation metadata without changing its local address',()=>{
 document.body.innerHTML='<div id="root"><a href="/invitation/#invite=private-fragment">Open invitation</a></div>';const data=document.createElement('script');data.id='receiz-navigation';data.textContent=JSON.stringify({pages:{'/invitation/':{title:'Invitation',head:'<title>Receiving invitation</title>',content:'<main>Invitation</main>'}},bank:{styles:[],head:'<title>Bank</title>',entry:'/unused.js'}});document.body.append(data);history.replaceState(null,'','/#account');const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{}),source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];new Function('window','document','location','history','scrollTo','Event','URL',source)(window,document,location,history,scroll,Event,URL);document.querySelector<HTMLAnchorElement>('#root a')!.click();expect(location.pathname+location.hash).toBe('/invitation/#invite=private-fragment');expect(history.state.publicNavigation.url).toBe('/invitation/');expect(data.textContent).not.toContain('private-fragment');
});

it('uses the same public static invitation in development and serves only its local presentation module',async()=>{
 let middleware!:(req:{url:string},res:{statusCode:number;setHeader:(name:string,value:string)=>void;end:(value:string)=>void},next:(error?:unknown)=>void)=>Promise<void>;const transformIndexHtml=vi.fn(async(_path:string,html:string)=>html),configure=publicMetadataPlugin().configureServer;if(typeof configure!=='function')throw Error('PUBLIC_DEV_REQUIRED');configure.call(undefined as never,{transformIndexHtml,middlewares:{use(fn:typeof middleware){middleware=fn;}}} as unknown as ViteDevServer);const fetch=vi.spyOn(globalThis,'fetch'),response={statusCode:0,setHeader:vi.fn(),end:vi.fn()},next=vi.fn();await middleware({url:'/invitation/?from=share'},response,next);expect(response.statusCode).toBe(200);expect(transformIndexHtml.mock.calls[0]?.[0]).toBe('/invitation/');const html=response.end.mock.calls[0]?.[0] as string;expect(html).toContain('data-receiving-invitation-page');expect(html).toContain('id="public-learn-root"');expect(html).not.toContain('/src/main.tsx');expect(html).not.toContain('private-fragment');expect(fetch).not.toHaveBeenCalled();const module={url:'/learn/receiving.js'};await middleware(module,response,next);expect(module.url).toBe('/src/adoption/receiving-public.ts');expect(next).toHaveBeenCalledOnce();
});

it('keeps the personal brief first without a generic guide illustration and preserves matching public profile aliases',()=>{const content=invitationContent();expect(publicIllustration(receivingInvitationPage)).toBeNull();expect(withPublicIllustration(content,receivingInvitationPage)).toBe(content);for(const name of ['receiving','invitation']){expect(profilePagePath(name)).toBe('/u/'+name+'/');expect(profilePageUsername('/'+name+'/')).toBeNull();expect(profilePageUsername('/u/'+name+'/')).toBe(name);}});

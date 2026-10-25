// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import type {PreviewServer} from 'vite';
import {shareCardSvg} from '../scripts/social/share-card-art.mjs';
import {publicRouteAliases,canonicalPublicPath} from '../src/content/public-routes.mjs';
import {publicPage,applyPublicMetadata,publicPages} from '../scripts/public-page-metadata.mjs';
import {publicMetadataPlugin} from '../scripts/public-metadata-plugin.mjs';
import {profilePagePath,profilePageUsername} from '../src/receiz/public-profile';
import social from '../public/social/manifest.json';

it('gives the complete marketing documents short canonical, social and structured-data URLs while preserving old URLs',()=>{
 expect(publicRouteAliases).toEqual({'/learn/identity-continuity/':'/id/','/learn/protect-your-value/':'/protect/','/learn/vaults/':'/vaults/','/business/for/':'/fit/','/cooperatives/':'/coops/','/cooperate/':'/coops/'});
 for(const [old,path] of Object.entries(publicRouteAliases)){
  expect(publicPage(old)).toBe(publicPage(path));expect(publicPage(old+'index.html?ref=old')).toBe(publicPage(path));
  expect(publicPages.some(page=>page.path===old)).toBe(false);
  const page=publicPage(old)!,image=social.images[path as keyof typeof social.images];expect(image).toBeTruthy();
  const doc=new DOMParser().parseFromString(applyPublicMetadata('<html><head></head><body><h1>Retained complete source</h1></body></html>',page,image),'text/html');
  expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://bankeiz.com'+path);
  expect(doc.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://bankeiz.com'+path);
  const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph'];
  expect(graph[0].url).toBe('https://bankeiz.com'+path);expect(graph[1].itemListElement.at(-1).item).toBe('https://bankeiz.com'+path);
  const username=path.slice(1,-1);expect(profilePageUsername(path)).toBeNull();if(username==='id'){expect(()=>profilePagePath(username)).toThrow('PROFILE_USERNAME_INVALID');expect(profilePageUsername('/u/id/')).toBeNull();}else{expect(profilePagePath(username)).toBe('/u/'+username+'/');expect(profilePageUsername('/u/'+username+'/')).toBe(username);}
 }
 expect(canonicalPublicPath('/vault/held-proof/')).toBe('/vault/held-proof/');expect(publicPage('/vault/held-proof/')).toBeUndefined();
 expect(publicPage('/business/for/agencies/')?.path).toBe('/business/for/agencies/');expect(publicPage('/cooperatives/producers/')?.path).toBe('/cooperatives/producers/');
});

it('routes direct canonical and legacy documents in preview and deployment without intercepting vault proofs',()=>{
 let middleware!:(req:{url:string},res:unknown,next:()=>void)=>void;
 const configure=publicMetadataPlugin().configurePreviewServer;if(typeof configure!=='function')throw Error('PUBLIC_PREVIEW_REQUIRED');configure.call(undefined as never,{middlewares:{use:(fn:typeof middleware)=>{middleware=fn;}}} as unknown as PreviewServer);
 const deployment=JSON.parse(readFileSync('vercel.json','utf8'));
 for(const [old,path] of Object.entries(publicRouteAliases))for(const input of [old,old.slice(0,-1),path,path.slice(0,-1)]){
  const req={url:input+'?ref=retained'};middleware(req,null,()=>{});expect(req.url).toBe(path+'index.html?ref=retained');
 }
 for(const path of Object.values(publicRouteAliases))for(const input of [path,path.slice(0,-1)])expect(deployment.rewrites.find((r:{source:string})=>r.source===input)?.destination).toBe(path+'index.html');
 const proof={url:'/vault/held-proof/'};middleware(proof,null,()=>{});expect(proof.url).toBe('/vault/held-proof/');
});

it('retains settled legacy first paint and navigates canonical aliases without a document or proof fetch',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){}}));vi.spyOn(window,'scrollTo').mockImplementation(()=>{});const request=vi.fn();vi.stubGlobal('fetch',request);
 const header='<header class="learn-header">Bankeiz</header>',body=header+'<main><h1>Protect your value</h1><a href="/vaults/">Vaults</a></main>';
 history.replaceState({},'','/learn/protect-your-value/');document.head.innerHTML='<title>Protection</title><link rel="canonical" href="https://bankeiz.com/protect/">';document.body.innerHTML='<div id="public-learn-root">'+body+'</div>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';data.textContent=JSON.stringify({aliases:publicRouteAliases,pages:{'/protect/':{head:document.head.innerHTML,content:body},'/vaults/':{head:'<title>Vaults</title><link rel="canonical" href="https://bankeiz.com/vaults/">',content:header+'<main><h1>Your Vaults</h1><a href="/learn/protect-your-value/">Protection</a></main>'}},bank:{head:'',styles:[],entry:'/unused.js'}});document.body.append(data);
 const main=document.querySelector('main'),brand=document.querySelector('header');
 try{
  new Function(readFileSync('public/learn/learn.js','utf8'))();expect(document.querySelector('main')).toBe(main);
  window.dispatchEvent(new CustomEvent('bankeiz:profile-metadata',{detail:{username:'protect',title:'Wrong profile',description:'A reserved document is not a profile'}}));expect(document.title).toBe('Protection');
  document.querySelector<HTMLAnchorElement>('main a')!.click();expect(document.querySelector('h1')?.textContent).toBe('Your Vaults');expect(location.pathname).toBe('/vaults/');expect(document.querySelector('header')).toBe(brand);
  document.querySelector<HTMLAnchorElement>('main a')!.click();expect(document.querySelector('h1')?.textContent).toBe('Protect your value');expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://bankeiz.com/protect/');expect(request).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();vi.restoreAllMocks();document.documentElement.className='';history.replaceState({},'','/');}
});

it('keeps the complete bank logo on cooperative share images and subtle branding on short landing cards',()=>{
 for(const page of publicPages.filter(page=>page.id.startsWith('cooperatives'))){
  const doc=new DOMParser().parseFromString(shareCardSvg(page),'image/svg+xml');
  const logo=doc.querySelector('svg[viewBox="112 112 288 288"]')!;
  expect(logo.querySelectorAll('rect[width][height]'),page.id).toHaveLength(6);
  expect(logo.getAttribute('fill')).toBe('#172e4b');
 }
 const vault=new DOMParser().parseFromString(shareCardSvg(publicPage('/vaults/')!),'image/svg+xml');
 expect([...vault.querySelectorAll('text')].some(text=>text.textContent==='Bankeiz'&&Number(text.getAttribute('font-size'))>18)).toBe(false);
});

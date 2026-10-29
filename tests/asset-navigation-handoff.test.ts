// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {retainPublicAsset} from '../src/receiz/public-asset-page';
import type {PublicMarketItem} from '../src/receiz/public-market';
it('keeps an early asset interaction and its source metadata through late navigation and explicit return',()=>{
 const ready=vi.spyOn(document,'readyState','get').mockReturnValue('loading');history.replaceState({},'','/asset/profile%3Aartist%3Aearly/');
 document.head.innerHTML='<title>Carried Original | Bankeiz</title><meta name="description" content="Exact original source."><meta property="og:image" content="https://bankeiz.com/asset/profile%3Aartist%3Aearly/og.png"><link rel="canonical" href="https://bankeiz.com/asset/profile%3Aartist%3Aearly/">';
 document.body.dataset.bankSurface='explore';document.body.innerHTML='<div id="public-explore-root" data-public-runtime="explore"><main><details open><summary>History</summary><input aria-label="Source search" value="chosen"><img src="https://receiz.com/original.webp"></details><a href="/learn/">Learn</a></main></div>';
 const root=document.getElementById('public-explore-root')!,input=root.querySelector('input')!,image=root.querySelector('img')!;input.focus();
 retainPublicAsset({id:'profile:artist:early',assetId:'early',title:'Carried Original',summary:'Exact original source.',category:'proof',mediaKind:'image'} as PublicMarketItem);
 const nav=document.createElement('script');nav.id='receiz-navigation';nav.textContent=JSON.stringify({pages:{'/explore/':{runtime:'explore',entry:'/explore.js',head:'<title>Explore</title><meta name="description" content="Explore"><link rel="canonical" href="https://bankeiz.com/explore/">',content:'<main>Explore</main>'},'/learn/':{head:'<title>Learn</title>',content:'<main>Learn<a href="/asset/profile%3Aartist%3Aearly/">Return</a></main>'}},bank:{head:'',entry:'/bank.js',styles:[],content:''}});document.body.append(nav);
 const script='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1],load=vi.fn(),scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 try{
  new Function('loadModule',script.replaceAll('import(','loadModule('))(load);document.dispatchEvent(new Event('DOMContentLoaded'));
  expect(document.title).toBe('Carried Original | Bankeiz');expect(document.activeElement).toBe(input);expect(scroll).not.toHaveBeenCalled();expect(root.querySelector('details')?.open).toBe(true);
  root.querySelector<HTMLAnchorElement>('a')!.click();document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();
  expect(document.title).toBe('Carried Original | Bankeiz');expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Exact original source.');expect(document.getElementById('public-explore-root')).toBe(root);expect(root.querySelector('img')).toBe(image);expect(root.querySelector('input')).toBe(input);expect(input.value).toBe('chosen');expect(root.querySelector('details')?.open).toBe(true);expect(load).not.toHaveBeenCalled();
 }finally{ready.mockRestore();scroll.mockRestore();}
});

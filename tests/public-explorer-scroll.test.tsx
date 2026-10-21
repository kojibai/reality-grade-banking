// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
vi.mock('../src/components/SiteFooter',()=>({SiteFooter:()=>null}));
vi.mock('../src/components/KaiKlok',()=>({KaiKlok:()=>null}));
vi.mock('../src/components/BankMark',()=>({BankMark:()=>null}));
vi.mock('../src/features/market/Market',()=>({Market:()=> <section><h1>Explore</h1><input aria-label="Retained search" defaultValue="Music"/><a href="/asset/profile%3Aartist%3Asong/">Open song</a></section>}));
vi.mock('../src/public-explorer/PublicAssetPage',()=>({PublicAssetPage:({returnPath='/explore/'}:{returnPath?:string})=><article><h1>Song title</h1><a href={returnPath}>Back to Explore</a></article>}));
vi.mock('../src/receiz/usePublicMarket',()=>({usePublicMarket:()=>({status:'live',catalog:{items:[{id:'profile:artist:song',title:'Song title'}]}})}));
import {PublicExplorer} from '../src/public-explorer/PublicExplorer';
import {lockDocumentScroll} from '../src/core/scroll-lock';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});

it('starts an asset at the top after its retained React view commits, then restores the prior Explore position and search',async()=>{
 history.replaceState({},'','/explore/music/');
 document.head.innerHTML='<title>Music</title>';
 document.body.innerHTML='<div id="public-explore-root" data-public-runtime="explore"></div>';
 const page={runtime:'explore',entry:'/already-loaded.js',head:'<title>Explore</title><meta name="description" content="Explore"><link rel="canonical" href="https://bankeiz.com/explore/">',content:'<main>Explore</main>'};
 const navigation=document.createElement('script');navigation.id='receiz-navigation';navigation.type='application/json';navigation.textContent=JSON.stringify({pages:{'/explore/':page,'/explore/music/':page},bank:{styles:[],entry:'/unused.js',head:''}});document.body.append(navigation);
 let position=0;
 vi.spyOn(window,'scrollY','get').mockImplementation(()=>position);
 const paints:{top:number;heading:string|null}[]=[];
 vi.spyOn(window,'scrollTo').mockImplementation(((first:number|ScrollToOptions,second?:number)=>{position=typeof first==='number'?second??0:first.top??0;paints.push({top:position,heading:document.querySelector('article h1')?.textContent??null});})as typeof scrollTo);
 const request=vi.fn();vi.stubGlobal('fetch',request);
 const root=createRoot(document.getElementById('public-explore-root')!);
 try{
  await act(async()=>root.render(<PublicExplorer/>));
  expect(document.querySelector('.public-market-nav a[href="/explore/"]')).toBeNull();
  new Function('// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1])();
  const search=document.querySelector<HTMLInputElement>('[aria-label="Retained search"]')!;search.value='A saved search';
  position=1340;paints.length=0;
  // Explore's asset sheet fixes the document at its saved offset. Browser
  // scrollY is then zero, and the URL includes the selected object's hash.
  history.replaceState({},'','/explore/music/#object/profile%3Aartist%3Asong');
  const unlock=lockDocumentScroll();position=0;addEventListener('receiz-bank:surface',unlock,{once:true});
  await act(async()=>document.querySelector<HTMLAnchorElement>('a[href^="/asset/"]')!.click());
  expect(location.pathname).toBe('/asset/profile%3Aartist%3Asong/');
  expect(paints).toContainEqual({top:0,heading:'Song title'});
  position=760;
  await act(async()=>document.querySelector<HTMLAnchorElement>('article a')!.click());
  expect(location.pathname).toBe('/explore/music/');expect(position).toBe(1340);expect(document.querySelector('[aria-label="Retained search"]')).toBe(search);expect(search.value).toBe('A saved search');
  position=1650;
  await act(async()=>document.querySelector<HTMLAnchorElement>('a[href^="/asset/"]')!.click());
  expect(position).toBe(0);
  position=760;
  const traverse=async(direction:'back'|'forward')=>act(async()=>{const moved=new Promise<void>(resolve=>addEventListener('popstate',()=>resolve(),{once:true}));history[direction]();await moved;});
  await traverse('back');expect(position).toBe(1650);expect(location.pathname).toBe('/explore/music/');
  await traverse('forward');expect(position).toBe(760);expect(location.pathname).toBe('/asset/profile%3Aartist%3Asong/');
  expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();document.documentElement.className='';}
});

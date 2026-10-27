// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {act,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import App from '../src/App';
import {parsePublicMarket} from '../src/receiz/public-market';
import {assetReturnDestination} from '../src/core/asset-return';
const fixture=vi.hoisted(()=>({identity:{binding:{identityOwnerReceizId:'fixture'},localHistory:{}},source:{} as Record<string,unknown>}));
// Custody opens after BankApp has subscribed to surface changes. This mounts
// Market later, matching the signed-in app's real navigation listener order.
vi.mock('../src/receiz/useNativeAccount',()=>({useNativeAccount:()=>{const [identity,setIdentity]=useState<typeof fixture.identity|null>(null);useEffect(()=>setIdentity(fixture.identity),[]);return {identity,wallet:null,refresh:async()=>{},forget:async()=>{}};}}));
vi.mock('../src/receiz/usePublicMarket',()=>({usePublicMarket:()=>fixture.source}));
vi.mock('../src/receiz/usePrivateHistory',()=>({usePrivateHistory:()=>({cache:null})}));
vi.mock('../src/features/account/LiveAccount',()=>({LiveAccount:()=>null}));
vi.mock('../src/features/assets/LiveAssets',()=>({LiveAssets:()=>null}));
vi.mock('../src/features/ledger/Ledger',()=>({Ledger:()=>null}));
vi.mock('../src/features/market/PublicAssetTradePortal',()=>({PublicAssetTradePortal:()=>null}));
vi.mock('../src/features/market/MarketOverview',()=>({MarketOverview:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('restores the signed-in Market feed after the real retained App and selected asset sheet return',async()=>{
 history.replaceState({},'','/#market');
 fixture.source={catalog:parsePublicMarket({ok:true,transport:{publicOriginals:Array.from({length:130},(_,i)=>({id:'object-'+i,receizId:'asset-'+i,title:'Kept object '+i,valueUsd:5,profileOriginal:{hasPbiSignature:true,media:{kind:'audio'}}}))}}),status:'live',error:null,refresh:vi.fn()};
 document.head.innerHTML='<title>Market</title>';document.body.innerHTML='<div id="root"></div><div id="public-explore-root" data-public-runtime="explore" hidden><main><h1>Standalone asset</h1><a href="/#market">Back to Market</a></main></div>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';data.textContent=JSON.stringify({pages:{'/explore/':{runtime:'explore',entry:'/already-loaded.js',content:'',head:'<title>Explore</title><meta name="description" content="Explore"><link rel="canonical" href="https://bankeiz.com/explore/">'}},bank:{entry:'/unused.js',head:'<title>Market</title>',styles:[]}});document.body.append(data);
 let position=0;const paints:{top:number;locked:boolean;url:string}[]=[];
 vi.spyOn(window,'scrollY','get').mockImplementation(()=>document.body.style.position==='fixed'?0:position);
 vi.spyOn(window,'scrollTo').mockImplementation(((arg:number|ScrollToOptions,y?:number)=>{position=document.body.style.position==='fixed'?0:typeof arg==='number'?y??0:arg.top??0;paints.push({top:position,locked:document.body.style.position==='fixed',url:location.pathname+location.hash});})as typeof scrollTo);
 vi.stubGlobal('IntersectionObserver',undefined);const request=vi.fn();vi.stubGlobal('fetch',request);
 const host=document.getElementById('root')!,root=createRoot(host);
 try{
  await act(async()=>root.render(<App/>));
  new Function('// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1])();
  const input=host.querySelector<HTMLInputElement>('input[aria-label="Search assets or currencies"]')!;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Kept');input.dispatchEvent(new Event('input',{bubbles:true}));});
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('.filters button')].find(button=>button.textContent==='Music')!.click());
  await act(async()=>host.querySelector<HTMLButtonElement>('.public-market-more')!.click());
  const rows=[...host.querySelectorAll('.market-rows .asset-row')];expect(rows).toHaveLength(100);
  position=1780;
  await act(async()=>(rows[65] as HTMLButtonElement).click());
  expect(document.body.style.top).toBe('-1780px');
  await act(async()=>host.querySelector<HTMLAnchorElement>('dialog a[href^="/asset/"]')!.click());
  expect(position).toBe(0);expect(document.body.style.position).not.toBe('fixed');expect(assetReturnDestination(history.state,'/explore/')).toEqual({path:'/#market',label:'Market'});
  position=450;paints.length=0;
  await act(async()=>document.querySelector<HTMLAnchorElement>('#public-explore-root a')!.click());
  expect(location.pathname+location.hash).toBe('/#market');
  expect(position,JSON.stringify(paints)).toBe(1780);
  expect(host.querySelector('dialog')).toBeNull();expect(document.body.style.position).not.toBe('fixed');
  expect(host.querySelector('input')).toBe(input);expect(input.value).toBe('Kept');expect(host.querySelector('.filters button[aria-pressed="true"]')?.textContent).toBe('Music');expect([...host.querySelectorAll('.market-rows .asset-row')]).toEqual(rows);
  // A second round trip must update the retained position rather than reuse
  // either the first feed offset or the standalone asset's scroll.
  position=2410;
  await act(async()=>(rows[75] as HTMLButtonElement).click());
  await act(async()=>host.querySelector<HTMLAnchorElement>('dialog a[href^="/asset/"]')!.click());
  position=720;paints.length=0;
  await act(async()=>document.querySelector<HTMLAnchorElement>('#public-explore-root a')!.click());
  expect(position,JSON.stringify(paints)).toBe(2410);
  expect(paints.every(paint=>!paint.locked)).toBe(true);
  expect(host.querySelector('input')).toBe(input);expect(input.value).toBe('Kept');expect([...host.querySelectorAll('.market-rows .asset-row')]).toEqual(rows);
  expect(request).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.restoreAllMocks();vi.unstubAllGlobals();document.body.replaceChildren();history.replaceState({},'','/');}
});

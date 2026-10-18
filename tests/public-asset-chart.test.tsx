// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {afterEach,expect,it,vi} from 'vitest';
import sourceFile from '../public/receiz-public-capitalization.json';import input from '../public/receiz-public-market.json';
import {PublicAssetDetail} from '../src/features/market/PublicAssetDetail';import {parseMarketCapSource} from '../src/receiz/market-projection/source';import {publishMarketDisplaySource} from '../src/receiz/market-projection/display-source';import {parsePublicMarket} from '../src/receiz/public-market';
const clock=vi.hoisted(()=>({pulse:0}));vi.mock('@receiz/sdk',async original=>({...await original<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({pulse:clock.pulse,uPulse:clock.pulse*1_000_000})}));
const open=vi.hoisted(()=>vi.fn());vi.mock('../src/receiz/proof-media',()=>({openProofMedia:open}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const source=parseMarketCapSource(sourceFile);
const item=parsePublicMarket(input,input.snapshot).items.find(item=>source.valueRows.some(row=>row.marketItem?.id===item.id&&row.seed===item.assetId&&row.marketItem.livePulseSeed?.claimPulse===Number(item.pulse)))!;
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();vi.restoreAllMocks();open.mockReset();});
it('shares an already-admitted source, switches periods synchronously and advances offline without a request',async()=>{
 vi.useFakeTimers();clock.pulse=source.serverPulse;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={item}/>));expect(host.querySelector('.periods')).toBeNull();await act(async()=>publishMarketDisplaySource(source));
  const chart=()=>host.querySelector<SVGElement>('.asset-chart svg')!,range=()=>Number(chart().getAttribute('data-range-start')),path=()=>chart().querySelectorAll('path')[1]?.getAttribute('d');const all=range(),allPath=path();
  const buttons=[...host.querySelectorAll<HTMLButtonElement>('.periods button')];expect(buttons.map(button=>button.textContent)).toEqual(['All','1D','1W','1M','3M','1Y']);expect(open).not.toHaveBeenCalled();
  act(()=>buttons[1].click());const day=range(),dayPath=path();expect(day).toBeGreaterThan(all);expect(dayPath).not.toBe(allPath);act(()=>buttons[2].click());expect(range()).toBeLessThan(day);expect(path()).not.toBe(dayPath);expect(host.textContent).toContain('projected value');
  const end=Number(chart().getAttribute('data-range-end')),headline=host.querySelector('.asset-price')?.textContent;clock.pulse+=17000;await act(async()=>vi.advanceTimersByTimeAsync(5000));expect(Number(chart().getAttribute('data-range-end'))).toBeGreaterThan(end);expect(host.querySelector('.asset-price')?.textContent).not.toBe(headline);expect(fetch).not.toHaveBeenCalled();
  const advanced=Number(chart().getAttribute('data-range-end'));let visibility:DocumentVisibilityState='hidden';const visible=vi.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility);clock.pulse+=17000;await act(async()=>vi.advanceTimersByTimeAsync(5000));expect(Number(chart().getAttribute('data-range-end'))).toBe(advanced);visibility='visible';act(()=>document.dispatchEvent(new Event('visibilitychange')));expect(Number(chart().getAttribute('data-range-end'))).toBeGreaterThan(advanced);visible.mockRestore();expect(fetch).not.toHaveBeenCalled();
  for(const event of ['focus','pageshow']){const before=Number(chart().getAttribute('data-range-end'));clock.pulse+=17000;act(()=>window.dispatchEvent(new Event(event)));expect(Number(chart().getAttribute('data-range-end'))).toBeGreaterThan(before);}expect(fetch).not.toHaveBeenCalled();
  const actions=host.querySelector('.dual-actions')!,media=host.querySelector('.proof-media')!;expect(chart().compareDocumentPosition(actions)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();expect(actions.compareDocumentPosition(media)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 }finally{act(()=>root.unmount());}
});
it('retains an opened original and its verified reading through period and local-clock changes',async()=>{
 vi.useFakeTimers();clock.pulse=source.serverPulse;const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const readText=vi.fn(async()=>({title:'Carried essay',text:'Complete carried essay.',sha256:'b'.repeat(64),artifactDigest:'c'.repeat(64)}));open.mockResolvedValue({artifactDigest:item.originalDigest,files:[{kind:'image',filename:'original.png',mimeType:'image/png',bytes:new Uint8Array([1]),payloadDigest:'d'.repeat(64)}],readText});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicAssetDetail item={{...item,hasLongForm:true}}/>));const element=host.querySelector('.proof-media');await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());await act(async()=>host.querySelector<HTMLButtonElement>('.proof-reading-launch')!.click());act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());
  for(const button of host.querySelectorAll<HTMLButtonElement>('.periods button'))act(()=>button.click());clock.pulse+=17000;await act(async()=>vi.advanceTimersByTimeAsync(5000));expect(host.querySelector('.proof-media')).toBe(element);expect(host.textContent).toContain('Original verified');expect(host.textContent).toContain('Complete carried essay.');expect(open).toHaveBeenCalledTimes(1);expect(readText).toHaveBeenCalledTimes(1);expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('keeps an unsupported object’s supplied chart without inventing dates or period returns',()=>{
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<PublicAssetDetail item={{...item,id:'unknown-source',assetId:'unknown-object',chart:[1,2,3]}}/>));expect(host.querySelector('.periods')).toBeNull();expect(host.querySelector('svg[data-range-start]')).toBeNull();expect(host.textContent).not.toContain('projected value');expect(fetch).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});

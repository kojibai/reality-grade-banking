// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {parsePublicNetworkPage,PUBLIC_SOURCES} from '../src/receiz/public-network';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';

const held=vi.hoisted(()=>({ledger:{} as Record<string,unknown>}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>held.ledger}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
vi.mock('../src/public-ledger/LedgerProofControls',()=>({LedgerProofControls:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let host:HTMLDivElement,root:Root,y:number,frames:Map<number,FrameRequestCallback>,nextFrame:number;
const refresh=vi.fn(),loadMore=vi.fn(),fetcher=vi.fn();
beforeEach(()=>{
 history.replaceState({},'','/ledger/');y=0;frames=new Map();nextFrame=0;refresh.mockClear();loadMore.mockClear();fetcher.mockClear();
 const records=[...parsePublicNetworkPage('actions',{ok:true,actions:[{id:'kept-action',actionKind:'profile.created',summary:'Kept action',pulse:100}]}).records,...parsePublicNetworkPage('wallet',{ok:true,events:[{id:'kept-note',kind:'note_mint',amountUsdCents:'100',summary:'Kept payment',pulse:101}]}).records];
 held.ledger={records,sources:Object.fromEntries(PUBLIC_SOURCES.map(source=>[source,{status:'live',complete:true,busy:false,cursor:null,error:null}])),bootstrap:false,capturedAt:null,refresh,loadMore};
 vi.spyOn(window,'scrollY','get').mockImplementation(()=>y);
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++nextFrame,callback);return nextFrame;});
 vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));vi.stubGlobal('fetch',fetcher);
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
});
afterEach(()=>{act(()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();history.replaceState({},'','/');});
async function scroll(to:number){await act(async()=>{y=to;window.dispatchEvent(new Event('scroll'));const waiting=[...frames.values()];frames.clear();for(const frame of waiting)frame(0);});}
const tools=()=>host.querySelector<HTMLElement>('.public-ledger-tools')!;
const search=()=>host.querySelector<HTMLInputElement>('[aria-label="Search public activity"]')!;
it('reveals retained search and activity categories upward, hides them downward and preserves filtered rows without reading sources',async()=>{
 await act(()=>root.render(<PublicLedgerApp/>));
 const input=search(),filters=[...host.querySelectorAll<HTMLButtonElement>('[aria-label="Activity type"] button')];
 await act(()=>filters.find(button=>button.textContent==='Actions')!.click());
 await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Kept');input.dispatchEvent(new Event('input',{bubbles:true}));});
 const rows=[...host.querySelectorAll('.public-ledger-row')];expect(rows).toHaveLength(1);expect(tools()).not.toBeNull();expect(tools().contains(input)).toBe(true);expect(filters.every(button=>tools().contains(button))).toBe(true);
 await scroll(900);expect(tools().classList.contains('is-away')).toBe(true);
 await scroll(850);expect(tools().classList.contains('is-away')).toBe(false);
 await scroll(1000);expect(tools().classList.contains('is-away')).toBe(true);
 await scroll(100);expect(tools().classList.contains('is-away')).toBe(false);
 expect(search()).toBe(input);expect(input.value).toBe('Kept');expect(host.querySelector('[aria-pressed="true"]')).toBe(filters.find(button=>button.textContent==='Actions'));
 expect([...host.querySelectorAll('.public-ledger-row')]).toEqual(rows);expect([...host.querySelectorAll('[aria-label="Activity type"] button')]).toEqual(filters);
 expect(refresh).not.toHaveBeenCalled();expect(loadMore).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
});
it('reveals tools for keyboard focus and keeps search visible during downward scroll',async()=>{
 await act(()=>root.render(<PublicLedgerApp/>));await scroll(900);expect(tools()?.classList.contains('is-away')).toBe(true);
 const input=search();await act(()=>input.focus());expect(tools().classList.contains('is-away')).toBe(false);
 await scroll(1100);expect(tools().classList.contains('is-away')).toBe(false);
 await act(()=>input.blur());await scroll(1300);expect(tools().classList.contains('is-away')).toBe(true);
});
it('listens only while the retained Ledger route is active and cancels a queued hidden-route frame',async()=>{
 await act(()=>root.render(<PublicLedgerApp active={false}/>));expect(tools()).not.toBeNull();await scroll(900);expect(tools().classList.contains('is-away')).toBe(false);expect(frames.size).toBe(0);
 await act(()=>root.render(<PublicLedgerApp active/>));await scroll(1100);expect(tools().classList.contains('is-away')).toBe(true);
 await act(()=>{y=100;window.dispatchEvent(new Event('scroll'));});expect(frames.size).toBe(1);
 await act(()=>root.render(<PublicLedgerApp active={false}/>));expect(frames.size).toBe(0);await scroll(0);expect(tools().classList.contains('is-away')).toBe(true);
 expect(refresh).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
});
it('keeps the initial server-rendered tools and rows visible before scroll effects',()=>{
 const doc=new DOMParser().parseFromString(renderToStaticMarkup(<PublicLedgerApp active={false}/>),'text/html'),bar=doc.querySelector('.public-ledger-tools');
 expect(bar).not.toBeNull();expect(bar?.classList.contains('is-away')).toBe(false);expect(bar?.querySelector('[aria-label="Search public activity"]')).not.toBeNull();expect(bar?.querySelectorAll('[aria-label="Activity type"] button')).toHaveLength(5);expect(doc.querySelectorAll('.public-ledger-row')).toHaveLength(2);
});

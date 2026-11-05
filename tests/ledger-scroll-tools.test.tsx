// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {Ledger} from '../src/features/ledger/Ledger';
import {parsePublicNetworkPage,PUBLIC_SOURCES} from '../src/receiz/public-network';
const held=vi.hoisted(()=>({records:[] as ReturnType<typeof parsePublicNetworkPage>['records'],refresh:vi.fn(),more:vi.fn(),groups:vi.fn()}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:held.records,sources:Object.fromEntries(PUBLIC_SOURCES.map(source=>[source,{status:'live',busy:false,error:null}])),bootstrap:false,capturedAt:null,refresh:held.refresh,loadMore:held.more})}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
vi.mock('../src/receiz/ledger-payment-records',async original=>{const real=await original<typeof import('../src/receiz/ledger-payment-records')>();return{...real,groupLedgerPaymentRecords:(...args:Parameters<typeof real.groupLedgerPaymentRecords>)=>{held.groups();return real.groupLedgerPaymentRecords(...args);}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:ReturnType<typeof createRoot>[]=[];
afterEach(()=>{for(const root of roots.splice(0))act(()=>root.unmount());document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();});
function setup(active=true){
 held.records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'sent',actionKind:'market.share.sell',summary:'Blue Horizon',amountUsdCents:'100'},{id:'received',actionKind:'contacts.import',summary:'People imported'}]}).records;
 const personal={available:true,completeAtSealedHead:true,records:held.records.map((row,index)=>({...row,authority:'account-source-projection' as const,accountFlow:index?'in' as const:'out' as const}))};
 const privateRefresh=vi.fn(async()=>{}),privateHistory={cache:null,busy:false,error:'Retained account history.',failureCode:'SYNTHETIC',canLoadMore:false,refresh:privateRefresh,loadMore:vi.fn(async()=>{})};
 let y=0,id=0;const frames=new Map<number,FrameRequestCallback>();
 vi.spyOn(window,'scrollY','get').mockImplementation(()=>y);
 const raf=vi.fn((callback:FrameRequestCallback)=>{frames.set(++id,callback);return id;});vi.stubGlobal('requestAnimationFrame',raf);vi.stubGlobal('cancelAnimationFrame',(frame:number)=>frames.delete(frame));
 vi.stubGlobal('IntersectionObserver',undefined);const request=vi.fn();vi.stubGlobal('fetch',request);
 held.refresh.mockClear();held.more.mockClear();const host=document.createElement('div');document.body.append(host);const root=createRoot(host);roots.push(root);
 const render=(visible:boolean)=>act(()=>root.render(<Ledger active={visible} initialTab="mine" personalHistory={personal} privateHistory={privateHistory}/>));render(active);
 const button=(name:string)=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent===name)!;
 return{host,render,button,request,privateRefresh,raf,frames,scroll(at:number,flush=true){y=at;act(()=>window.dispatchEvent(new Event('scroll')));if(flush)act(()=>{const waiting=[...frames.values()];frames.clear();for(const callback of waiting)callback(performance.now());});}};
}
async function type(input:HTMLInputElement,value:string){await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
it('groups retained My history controls, tucks down and reveals up, and pins focused search without rebuilding rows or reading data',async()=>{
 const view=setup(),tools=view.host.querySelector('.ledger-scroll-tools')!;expect(tools).not.toBeNull();
 const search=tools.querySelector<HTMLInputElement>('[aria-label="Search your history"]')!;
 expect(tools.querySelector('.ledger-tabs')).not.toBeNull();expect(tools.querySelector('[aria-label="Your activity direction"]')).not.toBeNull();
 await type(search,'Blue');act(()=>view.button('Sent').click());
 const rows=[...view.host.querySelectorAll('.ledger-event')],work=held.groups.mock.calls.length;expect(rows).toHaveLength(1);
 view.scroll(500);expect(tools.classList.contains('is-away')).toBe(true);
 view.scroll(420);expect(tools.classList.contains('is-away')).toBe(false);
 view.scroll(650);expect(tools.classList.contains('is-away')).toBe(true);
 act(()=>search.focus());expect(tools.classList.contains('is-away')).toBe(false);
 view.scroll(900);expect(tools.classList.contains('is-away')).toBe(false);
 expect(search.value).toBe('Blue');expect(view.button('Sent').getAttribute('aria-pressed')).toBe('true');expect([...view.host.querySelectorAll('.ledger-event')]).toEqual(rows);
 expect(held.groups).toHaveBeenCalledTimes(work);expect(view.request).not.toHaveBeenCalled();expect(held.refresh).not.toHaveBeenCalled();expect(held.more).not.toHaveBeenCalled();expect(view.privateRefresh).not.toHaveBeenCalled();
 const status=view.host.querySelector('[role="status"]');expect(view.host.textContent).toContain('Retained account history.');expect(tools.contains(status)).toBe(false);
 act(()=>view.button('Refresh').click());expect(view.privateRefresh).toHaveBeenCalledTimes(1);
});
it('keeps separate searches and filters across tabs and installs no inactive scroll listener or pending frame',async()=>{
 const add=vi.spyOn(window,'addEventListener'),remove=vi.spyOn(window,'removeEventListener'),view=setup(false);
 expect(add.mock.calls.filter(([type])=>type==='scroll')).toHaveLength(0);view.scroll(500);expect(view.raf).not.toHaveBeenCalled();
 const mine=view.host.querySelector<HTMLInputElement>('[aria-label="Search your history"]')!;await type(mine,'Blue');act(()=>view.button('Sent').click());act(()=>view.button('Public').click());
 const search=view.host.querySelector<HTMLInputElement>('[aria-label="Search the Ledger"]')!;await type(search,'People');act(()=>view.button('Actions').click());
 expect(view.host.querySelector('.ledger-scroll-tools [aria-label="Activity type"]')).not.toBeNull();
 act(()=>view.button('My history').click());expect(view.host.querySelector<HTMLInputElement>('[aria-label="Search your history"]')?.value).toBe('Blue');expect(view.button('Sent').getAttribute('aria-pressed')).toBe('true');
 act(()=>view.button('Public').click());expect(view.host.querySelector<HTMLInputElement>('[aria-label="Search the Ledger"]')?.value).toBe('People');expect(view.button('Actions').getAttribute('aria-pressed')).toBe('true');
 view.render(true);expect(add.mock.calls.filter(([type])=>type==='scroll')).toHaveLength(1);view.scroll(800,false);expect(view.frames.size).toBe(1);view.render(false);expect(view.frames.size).toBe(0);expect(remove.mock.calls.filter(([type])=>type==='scroll')).toHaveLength(1);view.scroll(1000);expect(view.frames.size).toBe(0);
 expect(view.request).not.toHaveBeenCalled();expect(held.refresh).not.toHaveBeenCalled();expect(held.more).not.toHaveBeenCalled();
});
it('uses the existing safe-area transform pattern with a reduced-motion override scoped to in-app Ledger tools',()=>{
 const css=readFileSync('src/features/ledger/ledger-search.css','utf8');
 expect(css).toMatch(/\.ledger-scroll-tools\{[^}]*position:sticky;[^}]*top:max\(10px,env\(safe-area-inset-top\)\)/);
 expect(css).toMatch(/\.ledger-scroll-tools\{[^}]*transition:transform \.2s ease/);
 expect(css).toMatch(/\.ledger-scroll-tools\.is-away\{transform:translateY\(calc\(-100% - 20px - env\(safe-area-inset-top\)\)\)\}/);
 expect(css).toMatch(/@media\(prefers-reduced-motion:reduce\)\{\.ledger-scroll-tools\{transition:none\}\}/);
});

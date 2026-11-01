// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {Ledger} from '../src/features/ledger/Ledger';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';
import {parsePublicNetworkPage,PUBLIC_SOURCES} from '../src/receiz/public-network';
const state=vi.hoisted(()=>({records:[] as ReturnType<typeof parsePublicNetworkPage>['records'],refresh:vi.fn(),loadMore:vi.fn()}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:state.records,sources:Object.fromEntries(PUBLIC_SOURCES.map(source=>[source,{status:'live',complete:true,busy:false,cursor:null,error:null}])),bootstrap:false,capturedAt:null,refresh:state.refresh,loadMore:state.loadMore})}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
vi.mock('../src/public-ledger/LedgerProofControls',()=>({LedgerProofControls:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
async function type(host:HTMLElement,label:string,value:string){const field=host.querySelector<HTMLInputElement>('[aria-label="'+label+'"]')!;expect(field).not.toBeNull();await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(field,value);field.dispatchEvent(new Event('input',{bubbles:true}));});}
it('searches My history and Public separately as typed without requests or changing direction/category filters',async()=>{
 state.records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'one',actionKind:'market.share.sell',summary:'Blue Horizon',amountUsdCents:'5000000'},{id:'two',actionKind:'contacts.import',summary:'People imported'}]}).records;
 state.refresh.mockClear();state.loadMore.mockClear();const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<Ledger active={false} personalHistory={{available:true,completeAtSealedHead:true,records:state.records}}/>));
  await type(host,'Search the Ledger','blue');expect(host.querySelectorAll('.ledger-event')).toHaveLength(1);
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='My history')!.click());
  expect(host.querySelector<HTMLInputElement>('[aria-label="Search your history"]')?.value).toBe('');
  await type(host,'Search your history','people');expect(host.querySelectorAll('.ledger-event')).toHaveLength(1);expect(host.querySelector('.ledger-event')?.textContent).toContain('Contacts Imported');
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Clear search"]')!.click());expect(host.querySelectorAll('.ledger-event')).toHaveLength(2);
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Public')!.click());expect(host.querySelector<HTMLInputElement>('[aria-label="Search the Ledger"]')?.value).toBe('blue');
  expect(fetch).not.toHaveBeenCalled();expect(state.refresh).not.toHaveBeenCalled();expect(state.loadMore).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
it('uses the same rich local matching on the standalone public Ledger',async()=>{
 state.records=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'one',actionKind:'market.share.sell',summary:'Blue Horizon',amountUsdCents:'5000000'},{id:'two',actionKind:'contacts.import',summary:'People imported'}]}).records;
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<PublicLedgerApp active={false}/>));await type(host,'Search public activity','$50,000.00');expect(host.querySelectorAll('.public-ledger-row')).toHaveLength(1);expect(host.querySelector('.public-ledger-row')?.textContent).toContain('Asset Sale');}
 finally{await act(async()=>root.unmount());host.remove();}
});
it('lets a user reveal all loaded search matches without automatically fetching older pages',async()=>{
 vi.stubGlobal('IntersectionObserver',class{observe(){}disconnect(){}});
 state.records=parsePublicNetworkPage('actions',{ok:true,actions:Array.from({length:65},(_,i)=>({id:'found-'+i,actionKind:'contacts.import',summary:'Findable contact '+i}))}).records;state.loadMore.mockClear();
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{
  await act(async()=>root.render(<Ledger active={false}/>));await type(host,'Search the Ledger','findable');expect(host.querySelectorAll('.ledger-event')).toHaveLength(50);
  const more=[...host.querySelectorAll('button')].find(button=>button.textContent==='Show more activity');expect(more).toBeDefined();await act(async()=>more!.click());expect(host.querySelectorAll('.ledger-event')).toHaveLength(65);expect(state.loadMore).not.toHaveBeenCalled();
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});

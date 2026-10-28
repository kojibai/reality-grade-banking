// @vitest-environment happy-dom
import {act} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {openLedgerReceipt,receiptLink} from '../src/receiz/ledger-receipts';
import {receiptLedgerUrl} from '../src/receiz/receipt-snapshot';
import {completeLedgerReceipt} from '../src/receiz/ledger-receipts';
const observed=vi.hoisted(()=>({root:null as import('react-dom/client').Root|null,receiptPaths:[] as string[]}));
vi.mock('react-dom/client',async importOriginal=>{
 const actual=await importOriginal<typeof import('react-dom/client')>();
 return {...actual,createRoot:(...args:Parameters<typeof actual.createRoot>)=>(observed.root=actual.createRoot(...args))};
});
vi.mock('../src/public-ledger/PublicLedgerApp',()=>({PublicLedgerApp:()=> <main><h1>Retained Ledger</h1><input aria-label="Retained search" defaultValue="Already populated"/></main>}));
vi.mock('../src/features/receipts/ReceiptView',async importOriginal=>{
 const actual=await importOriginal<typeof import('../src/features/receipts/ReceiptView')>();
 return {...actual,ReceiptView:(props:Parameters<typeof actual.ReceiptView>[0])=>{observed.receiptPaths.push(location.pathname);return <actual.ReceiptView {...props}/>;}};
});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{if(observed.root)act(()=>observed.root!.unmount());observed.root=null;document.body.replaceChildren();delete document.body.dataset.bankSurface;history.replaceState(null,'','/');vi.restoreAllMocks();vi.unstubAllGlobals();});
it('View in Ledger reveals the already-populated Ledger without treating its record URL as a receipt',async()=>{
 const id='profile:receiz_vyfrbse0m0qbgrtxi:imported-d5de70a234ecd83a9791d0ac16a48c54dd1aec0e11f5788674dd8c43b692aa13';
 const record=parsePublicNetworkPage('proofs',{ok:true,transport:{publicOriginals:[{id,receizId:id,title:'Published Original',pulse:'14873317',valueUsd:42}]}}).records[0];
 const receipt=receiptLink(record)!,destination=new URL(receiptLedgerUrl(completeLedgerReceipt(record)));
 history.replaceState(null,'',destination.pathname+destination.hash);
 const host=document.createElement('div');host.dataset.publicRuntime='ledger';document.body.append(host);document.body.dataset.bankSurface='ledger';
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 await act(async()=>{await import('../src/public-ledger/main');});
 const input=host.querySelector('input')!;input.value='Retained record';
 for(let attempt=0;attempt<2;attempt++){
  act(()=>{
   openLedgerReceipt({button:0,metaKey:false,ctrlKey:false,shiftKey:false,altKey:false,preventDefault(){}} as never,receipt);
   host.hidden=true;document.body.dataset.bankSurface='receipt';dispatchEvent(new Event('receiz-bank:surface'));
  });
  act(()=>{
   history.pushState(null,'',destination.pathname+destination.hash);
   host.hidden=false;document.body.dataset.bankSurface='ledger';dispatchEvent(new Event('receiz-bank:surface'));
  });
  expect(location.pathname+location.hash).toBe(destination.pathname+destination.hash);
  expect(host.querySelector('.receipt-error')).toBeNull();
  expect(input.closest<HTMLElement>('[hidden]')).toBeNull();
  expect(host.querySelector('input')).toBe(input);expect(input.value).toBe('Retained record');
 }
 expect(observed.receiptPaths).not.toContain('/ledger/');expect(fetcher).not.toHaveBeenCalled();
});

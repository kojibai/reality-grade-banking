// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {Ledger} from '../src/features/ledger/Ledger';
import {LedgerFieldsView,LedgerInspector} from '../src/features/ledger/LedgerInspector';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
const held=vi.hoisted(()=>({network:{} as Record<string,unknown>,receipt:vi.fn(),title:vi.fn()}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>held.network}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
vi.mock('../src/receiz/ledger-payment-records',async original=>{const real=await original<typeof import('../src/receiz/ledger-payment-records')>();return {...real,ledgerRecordTitle:(...args:Parameters<typeof real.ledgerRecordTitle>)=>{held.title();return real.ledgerRecordTitle(...args);}};});
vi.mock('../src/receiz/ledger-receipts',async original=>{const real=await original<typeof import('../src/receiz/ledger-receipts')>();return {...real,receiptLink:(...args:Parameters<typeof real.receiptLink>)=>{held.receipt();return real.receiptLink(...args);}};});
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:ReturnType<typeof createRoot>;
afterEach(()=>{if(root)act(()=>root.unmount());document.body.replaceChildren();vi.unstubAllGlobals();});
it('expands a row without regenerating the other rows’ rich receipts or making a request',()=>{
 const records=parsePublicNetworkPage('actions',{ok:true,actions:Array.from({length:50},(_,i)=>({id:String(i),actionKind:'record',summary:`Recorded action ${i}`,pulse:i+1}))}).records;
 held.network={records,sources:{},bootstrap:false,refresh:()=>{},loadMore:()=>{}};
 const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 act(()=>root.render(<Ledger active={false}/>));const links=[...host.querySelectorAll('.ledger-receipt-actions a')].map(a=>a.getAttribute('href'));
 held.receipt.mockClear();held.title.mockClear();act(()=>host.querySelector<HTMLButtonElement>('.asset-row')!.click());
 expect(host.querySelectorAll('.ledger-inspector')).toHaveLength(1);
 expect(held.receipt.mock.calls.length).toBeLessThanOrEqual(1);
 expect(held.title.mock.calls.length).toBeLessThanOrEqual(2);
 expect([...host.querySelectorAll('.ledger-receipt-actions a')].map(a=>a.getAttribute('href'))).toEqual(links);expect(fetch).not.toHaveBeenCalled();
});
it('keeps every nested field available without rendering closed branches',()=>{
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 act(()=>root.render(<LedgerFieldsView fields={{sources:Array.from({length:1000},(_,i)=>({reference:`original-${i}`,amount:'100'}))}}/>));
 expect(host.querySelectorAll('dl')).toHaveLength(1);expect(host.textContent).not.toContain('original-999');
 const disclosure=host.querySelector('details')!;act(()=>{disclosure.open=true;disclosure.dispatchEvent(new Event('toggle'));});
 expect(host.querySelectorAll('dl')).toHaveLength(2);
 const last=[...host.querySelectorAll('details')].at(-1)!;act(()=>{last.open=true;last.dispatchEvent(new Event('toggle'));});
 expect(host.textContent).toContain('original-999');
});
it('formats the complete JSON only when its disclosure is opened, while keeping the record export available',()=>{
 const record=parsePublicNetworkPage('actions',{ok:true,actions:[{id:'selected',actionKind:'record',summary:'Selected original',pulse:1}]}).records[0];
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root.render(<LedgerInspector record={record} value={ledgerValueForRecord(record)}/>));
 const disclosure=host.querySelector<HTMLDetailsElement>('.ledger-exact-json')!;
 expect(disclosure.querySelector('pre')).toBeNull();expect(host.querySelector('[aria-label="Download record details"]')).not.toBeNull();
 act(()=>{disclosure.open=true;disclosure.dispatchEvent(new Event('toggle'));});expect(JSON.parse(disclosure.querySelector('pre')!.textContent!)).toMatchObject({id:'selected',title:'Selected original'});
});

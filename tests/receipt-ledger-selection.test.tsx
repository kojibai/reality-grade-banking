// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PublicLedgerApp} from '../src/public-ledger/PublicLedgerApp';
import {parsePublicNetworkPage,type PublicRecord,PUBLIC_SOURCES} from '../src/receiz/public-network';
import {completeLedgerReceipt,receiptLink} from '../src/receiz/ledger-receipts';
import {compactReceiptLink} from '../src/receiz/receipt-sharing';
import {initialLedgerReceipt,readLedgerReceiptSelection,receiptLedgerUrl,retainReceiptLedgerSelection,receiptDigest} from '../src/receiz/receipt-snapshot';
const source=vi.hoisted(()=>({records:[] as PublicRecord[]}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:source.records,capturedAt:null,bootstrap:false,sources:Object.fromEntries(PUBLIC_SOURCES.map(key=>[key,{status:'stale',complete:false,busy:false,cursor:null,error:null}])),refresh:vi.fn(),loadMore:vi.fn()})}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:ReturnType<typeof createRoot>[]=[];
afterEach(()=>{act(()=>{for(const root of roots.splice(0))root.unmount();});source.records=[];document.body.replaceChildren();history.replaceState(null,'','/');vi.restoreAllMocks();vi.unstubAllGlobals();});
function fixture(id:string){const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id,kind:'chat_transfer',summary:'A new transaction',amountUsdCents:'12500',pulse:'14800000',sender:{displayName:'Alex'},recipient:{displayName:'Sam'}}]}).records[0],receipt=completeLedgerReceipt(record),href=compactReceiptLink(receiptLink(record)!);return{record,receipt,href,destination:receiptLedgerUrl(receipt,href)};}
function locationFor(url:string){const value=new URL(url);history.replaceState(null,'',value.pathname+value.search+value.hash);}
function mount(){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);roots.push(root);act(()=>root.render(<PublicLedgerApp active={false}/>));return{host,root};}

it('shows the selected held receipt immediately when its transaction is absent from the Ledger projection',()=>{
 const value=fixture('new-held-selection'),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);retainReceiptLedgerSelection(value.receipt,value.href);locationFor(value.destination);
 expect(initialLedgerReceipt(location.href)).toBe(value.receipt);const {host}=mount();
 expect(host.querySelectorAll('.public-ledger-row')).toHaveLength(1);expect(host.querySelector('.public-ledger-row')?.textContent).toContain('$125.00');expect(host.querySelector('.public-ledger-record-detail')?.textContent).toContain('new-held-selection');expect(host.textContent).not.toMatch(/No matching public records|Public activity is unavailable/);expect(source.records).toEqual([]);expect(fetcher).not.toHaveBeenCalled();
});
it('reopens through the original receipt URL without needing the Ledger cache or a handoff memo',()=>{
 const value=fixture('portable-selected-receipt'),fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);locationFor(value.destination);const {host,root}=mount();
 expect(host.querySelectorAll('.public-ledger-row')).toHaveLength(1);expect(host.textContent).toContain('portable-selected-receipt');expect(fetcher).not.toHaveBeenCalled();
 source.records=[{...value.record,amountUsdCents:'15000'}];act(()=>root.render(<PublicLedgerApp active={false}/>));
 expect(host.querySelectorAll('.public-ledger-row')).toHaveLength(1);expect(host.textContent).not.toContain('Showing the transaction carried by your receipt.');expect(fetcher).not.toHaveBeenCalled();
});
it('refuses a receipt for a different selected record or a foreign receipt origin',async()=>{
 const value=fixture('correct-selection'),url=new URL(value.destination);url.hash=url.hash.replace('wallet%3Acorrect-selection','wallet%3Awrong-selection');expect(initialLedgerReceipt(url.href)).toBeNull();
 const foreign='https://foreign.example/receipt/'+'a'.repeat(64)+'/';url.hash='record=wallet%3Aforeign&receipt='+encodeURIComponent(foreign);const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);expect(await readLedgerReceiptSelection(url.href)).toBeNull();expect(fetcher).not.toHaveBeenCalled();
});
it('does not let a late short-receipt read replace a newer selected transaction',async()=>{
 const previous=fixture('late-selected-receipt'),next=fixture('newer-selected-receipt'),bytes=new TextEncoder().encode(JSON.stringify(previous.receipt)),digest=await receiptDigest(bytes);let finish!:(response:Response)=>void;
 vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(resolve=>{finish=resolve;})));
 const old=receiptLedgerUrl(previous.receipt,'https://bankeiz.com/receipt/'+digest+'/'),pending=readLedgerReceiptSelection(old);
 await vi.waitFor(()=>expect(typeof finish).toBe('function'));
 retainReceiptLedgerSelection(next.receipt,next.href);finish(new Response(bytes));await pending;expect(initialLedgerReceipt(next.destination)).toBe(next.receipt);
});

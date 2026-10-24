// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { useLedgerValueSource } from '../src/features/ledger/useLedgerValueSource';
import {retainedMarketDisplaySource,publishMarketDisplaySource} from '../src/receiz/market-projection/display-source';
import type {LedgerValueIndex} from '../src/receiz/ledger-value';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {Ledger} from '../src/features/ledger/Ledger';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import * as receipts from '../src/receiz/ledger-receipts';
const network=vi.hoisted(()=>({records:[] as ReturnType<typeof parsePublicNetworkPage>['records']}));
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:network.records,sources:{},bootstrap:false,refresh:()=>{},loadMore:()=>{}})}));
vi.mock('../src/receiz/client',()=>({RECEIZ_VERSION:'129.0.0',loadReceiz:async()=>({receizKaiNow:()=>({pulse:14647307})})}));
const input = JSON.parse(readFileSync('public/receiz-public-capitalization.json', 'utf8'));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | null = null;
afterEach(() => { if (root) act(() => root!.unmount()); root = null; document.body.replaceChildren(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function Probe({ active }: { active: boolean }) { const index = useLedgerValueSource(active); return <output data-source={index?.source.proofObjectHash}>{index?.evaluationPulse ?? 'No valuation source'}</output>; }
it('reads only the shared public projection and keeps it when the live source is unavailable', async () => {
  const requests: { path: string; credentials: RequestCredentials | undefined }[] = [];
  vi.stubGlobal('fetch', async (path: string, options: RequestInit) => { requests.push({ path, credentials: options.credentials }); return path === '/receiz-public-capitalization.json' ? Response.json(input) : new Response(null, { status: 503 }); });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => { root!.render(<Probe active={false}/>); });
  expect(requests).toEqual([]);
  await act(async () => { root!.render(<Probe active={true}/>); });
  expect(host.textContent).toBe('14647307');
  expect(retainedMarketDisplaySource()?.proofObjectHash).toBe(input.marketCapProjection.proofObjectHash);
  expect(requests).toEqual([{ path: '/receiz-public-capitalization.json', credentials: 'omit' }, { path: '/api/bank/public-market/capitalization', credentials: 'omit' }]);
});
it('opens from the retained valuation without rereading the shipped file and still adopts live refreshes',async()=>{
 vi.useFakeTimers();
 publishMarketDisplaySource(parseMarketCapSource(input),'shipped');
 const held=retainedMarketDisplaySource()!;
 let finish!:(response:Response)=>void;
 const fetch=vi.fn().mockImplementationOnce(()=>new Promise<Response>(resolve=>{finish=resolve;})).mockResolvedValue(new Response(null,{status:503}));vi.stubGlobal('fetch',fetch);
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<Probe active/>));
 expect(host.querySelector('output')?.getAttribute('data-source')).toBe(held.proofObjectHash);
 expect(fetch.mock.calls.map(([path])=>path)).toEqual(['/api/bank/public-market/capitalization']);
 await act(async()=>finish(Response.json({ok:true,marketCapProjection:{...input.marketCapProjection,proofObjectHash:'d'.repeat(64)}})));
 expect(host.querySelector('output')?.getAttribute('data-source')).toBe('d'.repeat(64));
 await act(async()=>vi.advanceTimersByTimeAsync(60000));
 await act(async()=>root!.render(<Probe active={false}/>));
 await act(async()=>root!.render(<Probe active/>));
 expect(fetch.mock.calls.map(([path])=>path)).toEqual(Array(3).fill('/api/bank/public-market/capitalization'));
 expect(host.querySelector('output')?.getAttribute('data-source')).toBe('d'.repeat(64));
});
it('adopts existing Market source enrichment immediately without making another request',async()=>{
 const fetch=vi.fn(async(path:string)=>path==='/receiz-public-capitalization.json'?Response.json(input):new Response(null,{status:503}));vi.stubGlobal('fetch',fetch);
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<Probe active/>));const requests=fetch.mock.calls.length;
 const held=retainedMarketDisplaySource()!;
 act(()=>publishMarketDisplaySource({...held,proofObjectHash:'e'.repeat(64)}));
 expect(host.querySelector('output')?.getAttribute('data-source')).toBe('e'.repeat(64));expect(fetch).toHaveBeenCalledTimes(requests);
});
it('keeps a quick retained return on the existing live refresh deadline',async()=>{
 vi.useFakeTimers();publishMarketDisplaySource(parseMarketCapSource(input),'shipped');
 const fetch=vi.fn(async()=>Response.json(input));vi.stubGlobal('fetch',fetch);
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<Probe active/>));
 const held=host.querySelector('output')!.getAttribute('data-source');expect(fetch).toHaveBeenCalledOnce();
 await act(async()=>vi.advanceTimersByTimeAsync(20_000));
 await act(async()=>root!.render(<Probe active={false}/>));
 await act(async()=>root!.render(<Probe active/>));
 expect(host.querySelector('output')!.getAttribute('data-source')).toBe(held);expect(fetch).toHaveBeenCalledOnce();
 await act(async()=>vi.advanceTimersByTimeAsync(39_999));expect(fetch).toHaveBeenCalledOnce();
 await act(async()=>vi.advanceTimersByTimeAsync(1));expect(fetch).toHaveBeenCalledTimes(2);
});
it('refreshes immediately after the existing deadline expires while inactive',async()=>{
 vi.useFakeTimers();publishMarketDisplaySource(parseMarketCapSource(input),'shipped');
 const fetch=vi.fn(async()=>Response.json(input));vi.stubGlobal('fetch',fetch);
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<Probe active/>));expect(fetch).toHaveBeenCalledOnce();
 await act(async()=>root!.render(<Probe active={false}/>));
 await act(async()=>vi.advanceTimersByTimeAsync(60_000));expect(fetch).toHaveBeenCalledOnce();
 await act(async()=>root!.render(<Probe active/>));expect(fetch).toHaveBeenCalledTimes(2);
});
it('retries a failed live read on a quick return while keeping held values visible',async()=>{
 publishMarketDisplaySource(parseMarketCapSource(input),'shipped');
 const fetch=vi.fn().mockResolvedValueOnce(new Response(null,{status:503})).mockImplementation(async()=>Response.json(input));vi.stubGlobal('fetch',fetch);
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<Probe active/>));const held=host.querySelector('output')!.getAttribute('data-source');
 await act(async()=>root!.render(<Probe active={false}/>));await act(async()=>root!.render(<Probe active/>));
 expect(host.querySelector('output')!.getAttribute('data-source')).toBe(held);expect(fetch).toHaveBeenCalledTimes(2);
});
it('retains the event index across cloned local-pulse updates but reindexes a changed copy model',async()=>{
 vi.stubGlobal('fetch',async()=>new Response(null,{status:503}));
 const frames:LedgerValueIndex[]=[];
 function Capture(){const index=useLedgerValueSource(true);if(index)frames.push(index);return null;}
 const held=retainedMarketDisplaySource()!,copy={collectibleId:'rsc_aaaaaaaaaaaaaaaa',claimHash:'a'.repeat(64),sealedAt:new Date('2026-05-10T12:00:00Z').toISOString(),birthUsdValue:10,proofValueUsd:20,currentValueUsd:21,valuationPulse:held.serverPulse,valuation:{baseUsdValue:20,birthUsdValue:10,marketUsdValue:25,scoreDelta:3,seed:'a'.repeat(64)}};
 const row={...held.valueRows.find(row=>row.source==='sports-economy-card')!,sealedCopies:[copy]};
 act(()=>publishMarketDisplaySource({...held,valueRows:[row],proofObjectHash:'f'.repeat(64)}));
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<Capture/>));const first=frames.at(-1)!;
 act(()=>publishMarketDisplaySource({...structuredClone(first.source),serverPulse:first.source.serverPulse+1}));
 expect(frames.at(-1)!.source.serverPulse).toBe(first.source.serverPulse+1);
 expect(frames.at(-1)!.copyValuations).toBe(first.copyValuations);
 expect(frames.at(-1)!.transferValues).toBe(first.transferValues);
 expect(frames.at(-1)!.valuationTraces).toBe(first.valuationTraces);
 const next=structuredClone(frames.at(-1)!.source);next.valueRows[0].sealedCopies![0].valuation!.baseUsdValue=22;next.valueRows[0].sealedCopies![0].proofValueUsd=22;
 act(()=>publishMarketDisplaySource(next));
 expect(frames.at(-1)!.copyValuations).not.toBe(first.copyValuations);
});
it('keeps held row values and receipts when the mounted Ledger is hidden on the way to Account',async()=>{
 publishMarketDisplaySource(parseMarketCapSource(input),'shipped');
 vi.stubGlobal('fetch',async()=>new Response(null,{status:503}));
 network.records=parsePublicNetworkPage('actions',{ok:true,actions:Array.from({length:50},(_,i)=>({id:String(i),actionKind:'record',summary:`Original ${i}`,pulse:i+1}))}).records;
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<Ledger active/>));
 const links=[...host.querySelectorAll('.ledger-receipt-actions a')].map(a=>a.getAttribute('href')),receipt=vi.spyOn(receipts,'receiptLink');
 try{
  await act(async()=>root!.render(<Ledger active={false}/>));
  expect(receipt.mock.calls.length).toBe(0);
  expect([...host.querySelectorAll('.ledger-receipt-actions a')].map(a=>a.getAttribute('href'))).toEqual(links);
 }finally{receipt.mockRestore();}
});
it('holds inactive values and immediately adopts the latest shared source when reopened',async()=>{
 vi.stubGlobal('fetch',async()=>new Response(null,{status:503}));
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root!.render(<Probe active/>));const held=host.querySelector('output')!.getAttribute('data-source');
 await act(async()=>root!.render(<Probe active={false}/>));
 const next={...retainedMarketDisplaySource()!,serverPulse:retainedMarketDisplaySource()!.serverPulse+1,proofObjectHash:'c'.repeat(64)};
 act(()=>publishMarketDisplaySource(next));expect(host.querySelector('output')!.getAttribute('data-source')).toBe(held);
 await act(async()=>root!.render(<Probe active/>));expect(host.querySelector('output')!.getAttribute('data-source')).toBe('c'.repeat(64));
});

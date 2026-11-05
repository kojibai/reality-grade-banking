// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {useLedgerValueSource} from '../src/features/ledger/useLedgerValueSource';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
const owner=vi.hoisted(()=>({enabled:true,source:null as unknown,listeners:new Set<()=>void>()}));
// The existing public family owner is isolated; valuation parsing/indexing and
// the hook's transport boundary remain real. No financial admission is mocked.
vi.mock('../src/receiz/prepared-bank-catalog',()=>({preparedBankCatalogEnabled:()=>owner.enabled,preparedBankCatalogState:()=>({phase:'ready',value:owner.source?{seed:{catalog:{complete:true}},capitalization:owner.source}:null}),subscribePreparedBankCatalog:(fn:()=>void)=>{owner.listeners.add(fn);return()=>owner.listeners.delete(fn);},readPreparedBankCatalog:async()=>null}));
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({receizKaiNow:()=>({pulse:14647307})})}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
let root:ReturnType<typeof createRoot>|undefined;
afterEach(()=>{if(root)act(()=>root!.unmount());root=undefined;document.body.replaceChildren();owner.listeners.clear();vi.unstubAllGlobals();vi.useRealTimers();});
it('opens and reopens Ledger from the complete Bank family without a competing capitalization request',async()=>{
 vi.useFakeTimers();const input=JSON.parse(readFileSync('public/receiz-public-capitalization.json','utf8'));owner.source=parseMarketCapSource(input);
 const requests:string[]=[];vi.stubGlobal('fetch',async(path:string)=>{requests.push(path);return Response.json(input);});
 const host=document.createElement('div');document.body.append(host);root=createRoot(host);
 function Probe({active}:{active:boolean}){const value=useLedgerValueSource(active);return <output>{value?.source.proofObjectHash}</output>;}
 await act(async()=>root!.render(<Probe active/>));expect(host.textContent).toBe(input.marketCapProjection.proofObjectHash);expect(requests).toEqual([]);
 await act(async()=>vi.advanceTimersByTimeAsync(61_000));await act(async()=>root!.render(<Probe active={false}/>));await act(async()=>root!.render(<Probe active/>));
 expect(host.textContent).toBe(input.marketCapProjection.proofObjectHash);expect(requests).toEqual([]);
});

// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import capInput from '../public/receiz-public-capitalization.json';
import historyInput from '../public/receiz-public-share-chart-history.json';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {packMarketHistory} from '../src/receiz/market-projection/history-wire';
const HISTORY='receiz-bank-pbi-market-share-graph-history-v1',PRICING='receiz-bank-public-object-value-source-v1',CATALOG='receiz-bank-public-discovery-v2';
const roots:Root[]=[];let finish:((response:Response|undefined)=>void)|undefined;
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const membership={ok:true,transport:{generatedAt:'2026-11-05T12:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'held-B'},publicOriginals:[{id:'held-B',receizId:'held-B',title:'Held B',profileOriginal:{media:null}}]}};
beforeEach(()=>{vi.resetModules();localStorage.clear();history.replaceState(null,'','/');document.body.innerHTML='<div id="root">Account remains available</div><script id="receiz-navigation" type="application/json">{}</script>';vi.stubGlobal('Worker',undefined);finish=undefined;});
afterEach(async()=>{for(const root of roots.splice(0))await act(()=>root.unmount());finish?.(undefined);vi.unstubAllGlobals();vi.restoreAllMocks();localStorage.clear();document.body.replaceChildren();});
function heldHistory(){return parseMarketHistory({...historyInput,summary:{...historyInput.summary,proofObjectHash:'b'.repeat(64)}});}
function savedOperands(catalog:boolean,historyValue:unknown=packMarketHistory(heldHistory())){
 localStorage.setItem(PRICING,JSON.stringify({ok:true,marketCapProjection:parseMarketCapSource(capInput),displaySourceKind:'live'}));localStorage.setItem(HISTORY,JSON.stringify(historyValue));if(catalog)localStorage.setItem(CATALOG,JSON.stringify(membership));
}
async function probe(){
 const cache={match:vi.fn(()=>new Promise<Response|undefined>(resolve=>{finish=resolve;})),put:vi.fn(async()=>{}),delete:vi.fn(async()=>true)};vi.stubGlobal('caches',{open:vi.fn(async()=>cache)});
 const fetcher=vi.fn((_path:RequestInfo|URL)=>new Promise<Response>(()=>{}));vi.stubGlobal('fetch',fetcher);
 const {usePublicMarket}=await import('../src/receiz/usePublicMarket'),{useMarketCapitalization}=await import('../src/receiz/market-projection/useMarketCapitalization'),reader=await import('../src/receiz/prepared-bank-catalog');
 let market!:ReturnType<typeof usePublicMarket>,chart!:ReturnType<typeof useMarketCapitalization>;const firstMarket:Array<{hash:string|null;points:number}>=[],host=document.createElement('div'),root=createRoot(host);document.body.append(host);roots.push(root);
 function Probe({active}:{active:boolean}){market=usePublicMarket(true,false);chart=useMarketCapitalization('ALL',active,market.historyCatalog,active);if(active)firstMarket.push({hash:chart.source?.proofObjectHash??null,points:chart.points.length});return <p>{active?`${chart.source?.proofObjectHash??'missing'}:${chart.points.length}`:'Account remains available'}</p>;}
 await vi.waitFor(()=>expect(typeof finish).toBe('function'));return{root,host,Probe,reader,fetcher,firstMarket,read:()=>({market,chart})};
}
it.each([false,true])('shows already accepted history on the first Market click while cache restore is paused (catalog=%s)',async(catalog)=>{
 savedOperands(catalog);const p=await probe();await act(()=>p.root.render(<p.Probe active={false}/>));expect(p.host.textContent).toBe('Account remains available');
 await act(()=>p.root.render(<p.Probe active/>));expect(p.reader.preparedBankCatalogState()).toMatchObject({phase:'pending',value:null,bootstrapping:true});
 expect(p.firstMarket.length).toBeGreaterThan(0);expect(p.firstMarket.every(frame=>frame.hash==='b'.repeat(64)&&frame.points>0)).toBe(true);expect(p.read().chart.status).toBe('cached');expect(p.read().market.historyCatalog?.items[0]?.title??null).toBe(catalog?'Held B':null);expect(p.fetcher).not.toHaveBeenCalled();
 await act(()=>p.root.render(<p.Probe active={false}/>));await act(()=>p.root.render(<p.Probe active/>));expect(p.read().chart.source?.proofObjectHash).toBe('b'.repeat(64));expect(p.read().chart.points.length).toBeGreaterThan(0);expect(p.fetcher).not.toHaveBeenCalled();
});
it('keeps accepted local history visible when optional bootstrap is missing without a remote Bank request',async()=>{
 savedOperands(true);const p=await probe();await act(()=>p.root.render(<p.Probe active/>));
 await act(async()=>{finish!(undefined);await p.reader.prepareCarriedBankCatalog();});
 expect(p.reader.preparedBankCatalogState()).toMatchObject({phase:'idle',value:null});expect(p.read().chart.source?.proofObjectHash).toBe('b'.repeat(64));expect(p.read().chart.points.length).toBeGreaterThan(0);expect(p.read().chart.status).toBe('cached');expect(p.fetcher.mock.calls.some(([path])=>String(path).startsWith('/api/'))).toBe(false);
});
it.each([['absent',null],['obsolete',{...historyInput,historyPolicy:'pbi-signed-share-capitalization-and-release-v1'}]] as const)('uses valid shipped history when saved history is %s during pending restore',async(_label,historyValue)=>{
 savedOperands(false,historyValue);const p=await probe();await act(()=>p.root.render(<p.Probe active/>));expect(p.read().chart.source?.proofObjectHash).toBe(historyInput.summary.proofObjectHash);expect(p.read().chart.points.length).toBeGreaterThan(0);expect(p.read().chart.status).toBe('cached');expect(p.reader.preparedBankCatalogState().value).toBeNull();expect(p.fetcher).not.toHaveBeenCalled();
});

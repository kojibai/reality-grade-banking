// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import sourceFile from '../public/receiz-public-capitalization.json';
import historyFile from '../public/receiz-public-share-chart-history.json';
import {parseMarketHistory} from '../src/receiz/market-projection/history';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {adoptMarketDisplaySource,publishMarketDisplaySource,retainedMarketDisplaySource} from '../src/receiz/market-projection/display-source';
import {useMarketCapitalization} from '../src/receiz/market-projection/useMarketCapitalization';
const held=vi.hoisted(()=>({snapshot:{phase:'idle',value:null,carried:undefined} as any}));
vi.mock('../src/receiz/prepared-bank-catalog',()=>({preparedBankCatalogEnabled:()=>false,preparedBankCatalogState:()=>held.snapshot,subscribePreparedBankCatalog:()=>()=>{},readPreparedBankCatalog:vi.fn()}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();vi.useRealTimers();localStorage.clear();held.snapshot={phase:'idle',value:null};});
it('keeps SSR history for hydration then applies the selected public family once on activation without a read',async()=>{
 vi.useFakeTimers();const initial=parseMarketHistory(historyFile),selected={...initial,basisSha256:'c'.repeat(64),summary:{...initial.summary,currentUsd:initial.summary.currentUsd+1},series:{...initial.series,ALL:[...initial.series.ALL]}};
 const capitalization=parseMarketCapSource(sourceFile),seed={generation:'c'.repeat(64)};
 const previousSource={...capitalization,serverPulse:capitalization.serverPulse+100};
 held.snapshot={phase:'ready',value:{seed:{generation:'b'.repeat(64)},capitalization:previousSource,history:initial,receipt:{state:'current'}}};
 adoptMarketDisplaySource(previousSource);const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);vi.stubGlobal('Worker',undefined);
 let state!:ReturnType<typeof useMarketCapitalization>;const root=createRoot(document.createElement('div'));
 function Probe({active}:{active:boolean}){state=useMarketCapitalization('ALL',active,null,active,initial);return null;}
 try{
  await act(async()=>root.render(<Probe active={false}/>));expect(state.source).toBe(initial.summary);
  await act(async()=>root.render(<Probe active/>));expect(state.source).toBe(initial.summary);
  held.snapshot={phase:'ready',value:{seed,capitalization,history:selected,receipt:{state:'current'}}};
  await act(async()=>root.render(<Probe active/>));expect(state.source).toBe(selected.summary);expect(state.points).toBe(selected.series.ALL);
  await act(async()=>root.render(<Probe active={false}/>));await act(async()=>root.render(<Probe active/>));expect(state.points).toBe(selected.series.ALL);expect(retainedMarketDisplaySource()).toBe(capitalization);await act(async()=>vi.advanceTimersByTimeAsync(60000));expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});

it('adopts the exact selected display operand without treating capture pulses as Source authority',()=>{
 const base=parseMarketCapSource(sourceFile),previous={...base,serverPulse:base.serverPulse+100},selected={...base,serverPulse:base.serverPulse+1};
 publishMarketDisplaySource(previous);const writes=vi.spyOn(JSON,'stringify');
 adoptMarketDisplaySource(selected);expect(retainedMarketDisplaySource()).toBe(selected);expect(writes).toHaveBeenCalledOnce();
 adoptMarketDisplaySource(selected);expect(retainedMarketDisplaySource()).toBe(selected);expect(writes).toHaveBeenCalledOnce();
 publishMarketDisplaySource({...base,serverPulse:base.serverPulse});expect(retainedMarketDisplaySource()).toBe(selected);
});

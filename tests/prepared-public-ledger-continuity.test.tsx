// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import type {PublicNetworkCache} from '../src/receiz/public-network-cache';
import type {PublicRecord} from '../src/receiz/public-network';
import type {PublicMarketCatalog} from '../src/receiz/public-market';
import {parsePublicMarket} from '../src/receiz/public-market';
const mocks=vi.hoisted(()=>({load:vi.fn(),save:vi.fn(async()=>true),seed:vi.fn(async()=>null),listeners:new Set<(catalog?:PublicMarketCatalog)=>void>()}));
vi.mock('../src/receiz/public-network-cache',async original=>({...await original<object>(),loadPublicNetworkCache:mocks.load,savePublicNetworkCache:mocks.save,loadPublicNetworkSeed:mocks.seed}));
vi.mock('../src/receiz/public-ledger-continuity',()=>({readHeldPublicLedger:async()=>null,synchronizePublicLedger:async()=>null,publicLedgerDisplayRows:async(_review:unknown,records:PublicRecord[])=>records}));
vi.mock('../src/receiz/asset-publication-adoption',()=>({assetPublicationFreshnessHint:()=>undefined,subscribeAssetPublicationAdmissions:(listener:(catalog?:PublicMarketCatalog)=>void)=>{mocks.listeners.add(listener);return()=>{mocks.listeners.delete(listener);};}}));
import {usePublicNetwork} from '../src/receiz/usePublicNetwork';
const row=(source:'wallet'|'proofs',id:string):PublicRecord=>({id:source+':'+id,sourceId:id,source,kind:source==='wallet'?'transfer':'proof recorded',title:id,detail:'Public retained record',time:null,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:null,sourceUrl:null,evidence:{},authority:'public-source-projection'});
const old=row('wallet','old'),added=row('wallet','new'),visible=row('proofs','visible'),withdrawn=row('proofs','withdrawn');
const snapshot:PublicNetworkCache={records:[old,visible],capturedAt:'2026-11-04T12:00:00Z',inspectionVersion:5,coverage:[{source:'wallet',complete:true,anchorIds:[old.id],observedAt:100},{source:'proofs',complete:true,anchorIds:[visible.id],observedAt:100}]};
afterEach(()=>{document.body.innerHTML='';vi.restoreAllMocks();mocks.load.mockReset();mocks.save.mockClear();mocks.seed.mockClear();});
it('keeps immediate HTML and asynchronously restores newer immutable local rows without reviving withdrawn proof membership',async()=>{
 let finish!:(value:PublicNetworkCache)=>void;const pending=new Promise<PublicNetworkCache>(resolve=>{finish=resolve;});mocks.load.mockReturnValue(pending);const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('OFFLINE'));
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);let held:ReturnType<typeof usePublicNetwork>|undefined;
 function Probe(){held=usePublicNetwork(false,snapshot);return <span>{held.records.map(row=>row.title).join(',')}</span>;}
 try{await act(async()=>root.render(<Probe/>));expect(host.textContent).toBe('old,visible');expect(mocks.load).toHaveBeenCalledTimes(1);
  await act(async()=>finish({...snapshot,records:[old,added,withdrawn],coverage:[{source:'proofs',complete:true,anchorIds:[withdrawn.id],observedAt:Date.now()+1000000}]}));
  expect(held?.records.map(row=>row.id)).toEqual(expect.arrayContaining([old.id,added.id,visible.id]));expect(held?.records.some(row=>row.id===withdrawn.id)).toBe(false);expect(held?.sources.wallet.complete).toBe(true);expect(held?.sources.proofs.complete).toBe(true);expect(mocks.seed).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('a confirmed public membership arriving during local restoration remains selected after the older cache settles',async()=>{
 let finish!:(value:PublicNetworkCache)=>void;mocks.load.mockReturnValue(new Promise<PublicNetworkCache>(resolve=>{finish=resolve;}));const host=document.createElement('div'),root=createRoot(host);let held:ReturnType<typeof usePublicNetwork>|undefined;
 function Probe(){held=usePublicNetwork(false,snapshot);return <span>{held.records.map(row=>row.title).join(',')}</span>;}
 try{await act(async()=>root.render(<Probe/>));const catalog=parsePublicMarket({ok:true,transport:{generatedAt:'2026-11-04T13:00:00Z',publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1},publicOriginals:[{id:'profile:artist:accepted-next',receizId:'accepted-next',title:'Accepted next',visibility:'public'}]}});
  await act(async()=>{for(const listener of mocks.listeners)listener(catalog);});
  await act(async()=>finish({...snapshot,records:[old,added,withdrawn]}));expect(held?.records.filter(row=>row.source==='proofs').map(row=>row.title)).toEqual(['Accepted next']);expect(held?.records.map(row=>row.id)).toContain(added.id);
 }finally{act(()=>root.unmount());}
});
it('does not reread the current document feeds or shipped seed during its initial active paint',async()=>{
 mocks.load.mockResolvedValue(null);const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NO_DUPLICATE_READ'));const host=document.createElement('div'),root=createRoot(host);
 function Probe(){const held=usePublicNetwork(true,snapshot);return <span>{held.records.length}</span>;}
 try{await act(async()=>root.render(<Probe/>));expect(host.textContent).toBe('2');expect(fetch).not.toHaveBeenCalled();expect(mocks.seed).not.toHaveBeenCalled();expect(mocks.load).toHaveBeenCalledTimes(1);}finally{act(()=>root.unmount());}
});

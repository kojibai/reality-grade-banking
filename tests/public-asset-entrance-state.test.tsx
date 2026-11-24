// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
import type {PublicMarketCatalog} from '../src/receiz/public-market';
import {retainedPublicAsset} from '../src/receiz/public-asset-page';
const selected=vi.hoisted(()=>({catalog:null as PublicMarketCatalog|null,status:'loading'}));
vi.mock('../src/receiz/usePublicMarket',()=>({usePublicMarket:()=>({...selected,error:null})}));
vi.mock('../src/components/KaiKlok',()=>({KaiKlok:()=>null}));
vi.mock('../src/features/market/Market',()=>({Market:()=>null}));
import {PublicExplorer} from '../src/public-explorer/PublicExplorer';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{document.body.replaceChildren();vi.unstubAllGlobals();});
it('never declares an Original absent from a historical, pending or failed collection, performs no missing-asset lookup, then displays the arriving Original',async()=>{
 const item=parsePublicProfile(profileFixture(),'alexmorgan').items[0],host=document.createElement('div'),root=createRoot(host),fetcher=vi.fn(()=>new Promise<Response>(()=>{}));
 vi.stubGlobal('fetch',fetcher);history.replaceState(null,'','/asset/'+encodeURIComponent(item.id)+'/');
 try{
  for(const status of ['loading','stale','error']){
   selected.catalog={items:[],complete:true,revision:'historical',observedAt:null,sourceCount:0};selected.status=status;
   await act(async()=>root.render(<PublicExplorer active={false}/>));
   expect(host.textContent).not.toContain('not in the available public collection');
   expect(host.textContent).not.toContain('being resolved');
  }
  selected.status='live';selected.catalog={...selected.catalog!,complete:false};
  await act(async()=>root.render(<PublicExplorer active={false}/>));expect(host.textContent).not.toContain('not in the available public collection');
  expect(fetcher).not.toHaveBeenCalled();
  selected.catalog={...selected.catalog!,items:[item],complete:true};
  await act(async()=>root.render(<PublicExplorer active={false}/>));
  expect(host.querySelector('.asset-detail-heading')?.textContent).toContain(item.title);expect(host.textContent).not.toContain('not in the available public collection');
 }finally{await act(async()=>root.unmount());}
});
it('retains the genuine complete live collection absence message',async()=>{
 selected.catalog={items:[],complete:true,revision:'selected',observedAt:null,sourceCount:0};selected.status='live';
 history.replaceState(null,'','/asset/genuinely-missing-original/');const host=document.createElement('div');
 const view=createRoot(host);try{await act(async()=>view.render(<PublicExplorer active={false}/>));expect(host.textContent).toContain('not in the available public collection');}finally{await act(async()=>view.unmount());}
});


it('advances the actual asset page to its exact PBI receipt while the remaining Market data stays held',async()=>{
 const base=parsePublicProfile(profileFixture(),'alexmorgan').items[0];
 const item={...base,id:'profile:alexmorgan:signed-transition',assetId:'signed-transition',originalDigest:'a'.repeat(64),
  ownerIdentity:{userId:'account-1',username:'alexmorgan',createdAt:'2026-11-21T15:06:34Z'},hasPbiSignature:false,pbiReceiptHash:undefined};
 const signed={...item,hasPbiSignature:true,pbiReceiptHash:'b'.repeat(64)};
 const host=document.createElement('div'),root=createRoot(host),fetcher=vi.fn(()=>new Promise<Response>(()=>{}));
 vi.stubGlobal('fetch',fetcher);
 const path='/asset/'+encodeURIComponent(item.id)+'/';
 history.replaceState(null,'',path);
 const frame=()=><PublicExplorer active={false} initialAsset={item} initialPath={path}/>;
 try{
  selected.status='stale';
  selected.catalog={items:[item],complete:true,revision:'held',observedAt:null,sourceCount:1};
  await act(async()=>root.render(frame()));
  expect(host.querySelector('.asset-detail-heading')?.textContent).toContain(item.title);
  expect(retainedPublicAsset(item.id)?.hasPbiSignature).toBe(false);
  const initialReads=fetcher.mock.calls.slice();
  selected.catalog={...selected.catalog,items:[signed],revision:'accepted'};
  await act(async()=>root.render(frame()));
  expect(retainedPublicAsset(item.id)?.pbiReceiptHash).toBe(signed.pbiReceiptHash);
  selected.catalog={...selected.catalog,items:[item],revision:'older-delivery'};
  await act(async()=>root.render(frame()));
  expect(retainedPublicAsset(item.id)?.pbiReceiptHash).toBe(signed.pbiReceiptHash);
  expect(fetcher.mock.calls).toEqual(initialReads);
 }finally{await act(async()=>root.unmount());}
});

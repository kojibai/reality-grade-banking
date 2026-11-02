// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market';
import {assetPagePath,retainPublicAsset} from '../src/receiz/public-asset-page';
const discovery=vi.hoisted(()=>({items:[] as PublicMarketItem[]}));
vi.mock('../src/receiz/usePublicMarket',()=>({usePublicMarket:()=>({status:'live',catalog:{items:discovery.items}})}));
import {PublicExplorer} from '../src/public-explorer/PublicExplorer';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps the standalone Moment basis from its held seed when a thin live catalogue arrives before the offline catalogue',async()=>{
 const verifyPath='/v/20261020_1200/ABCD1234/12345678?a=12345678&ms=1791828092396',profile={code:'ABCD1234',pulse:'12345678',verifyPath,claimHashHex:'a'.repeat(64),pbiReceiptHash:'b'.repeat(64),proof:{circuit:'Groth16',groth16Id:'original-proof',poseidon:'123456789'},media:null};
 const item=(fields:Record<string,unknown>)=>parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:held-moment',receizId:'held-moment',ownerUsername:'artist',title:'Held Moment',pulse:'12345678',verifyHref:verifyPath,profileOriginal:{...profile,...fields}}]}}).items[0];
 const held=item({recordCardMediaSha256Hex:'c'.repeat(64)});retainPublicAsset(held);discovery.items=[item({})];history.replaceState({},'',assetPagePath(held.id));
 const fetcher=vi.fn().mockRejectedValue(Error('offline'));vi.stubGlobal('fetch',fetcher);const host=document.createElement('div'),root=createRoot(host);
 try{
  await act(async()=>root.render(<PublicExplorer active={false}/>));const requests=fetcher.mock.calls.length;
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show proof material"]')!.click());
  const mediaSha=()=>[...host.querySelectorAll('.asset-proof-back-body>dl>div')].find(row=>row.querySelector('dt')?.textContent==='Media SHA-256')?.querySelector('dd')?.textContent;
  expect(mediaSha()).toBe('C'.repeat(64));expect(fetcher.mock.calls.length).toBe(requests);
  discovery.items=[item({pbiReceiptHash:'d'.repeat(64)})];await act(async()=>root.render(<PublicExplorer active={false}/>));expect(mediaSha()).toBe('Unavailable');
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});

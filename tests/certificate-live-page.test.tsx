// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {afterEach,expect,it,vi} from 'vitest';
import {PublicCertificatePage} from '../src/features/certificates/PublicCertificatePage';
import {formatMoney} from '../src/core/money';
const clock=vi.hoisted(()=>({pulse:14000200}));vi.mock('@receiz/sdk',async importOriginal=>({...await importOriginal<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({pulse:clock.pulse})}));
vi.mock('../src/public-explorer/PublicAssetTradeHost',()=>({PublicAssetTradeHost:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
const token='certificate-cold-live-test',seed={kind:'sigil',claimPulse:14000000,beat:2,stepIndex:3,creatorVerified:true};
const state={note:{noteToken:token,title:'Wheat harvest',summary:'A sealed harvest',status:'minted',mintedAt:'2026-10-26T12:00:00Z',claimedAt:null,originalShareQuantityMicro:'10000000',remainingShareQuantityMicro:'7500000',remainingCostBasisUsdCents:'75000',lastPriceUsdCents:'10000',historyEvents:[]},item:{id:'asset:cold-wheat',assetId:'cold-wheat',title:'Wheat harvest',summary:'A sealed harvest',priceUsd:100,livePulseSeed:seed},viewer:{signedIn:false,isOwner:false,canTrade:false,wallet:null,livePosition:null}};
it('cold certificate paints the existing full chart from its carried seed and advances value without more requests',async()=>{
 vi.useFakeTimers();clock.pulse=14000200;const fetcher=vi.fn(async()=>Response.json({ok:true,state}));vi.stubGlobal('fetch',fetcher);const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<PublicCertificatePage token={token}/>));
 expect(host.querySelectorAll('.periods button')).toHaveLength(6);expect(host.querySelector('path[fill="none"]')?.getAttribute('d')).toContain('C');
 const old=host.querySelector('.certificate-public-value')?.textContent;
 await act(async()=>{clock.pulse+=2;await vi.advanceTimersByTimeAsync(1100);});expect(host.querySelector('.certificate-public-value')?.textContent).not.toBe(old);expect(fetcher).toHaveBeenCalledTimes(1);
 expect(host.querySelector('.site-footer')).toBeNull();expect(host.querySelector('.certificate-public-footer')?.textContent).toContain('Reality-grade banking');
 for(const button of host.querySelectorAll<HTMLButtonElement>('.periods button')){await act(async()=>button.click());expect(host.querySelector('svg[role="img"]')).not.toBeNull();}expect(fetcher).toHaveBeenCalledTimes(1);
 }finally{act(()=>root.unmount());}
});
it('never gives a claimed certificate spendable shares while keeping its underlying live chart',async()=>{
 vi.stubGlobal('fetch',async()=>Response.json({ok:true,state:{...state,note:{...state.note,status:'claimed',remainingShareQuantityMicro:'0'}}}));const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<PublicCertificatePage token={token}/>));expect(host.querySelector<HTMLButtonElement>('.primary-button')?.disabled).toBe(true);expect(host.querySelector('.certificate-public-value')?.textContent).toContain(formatMoney('0'));expect(host.querySelectorAll('.periods button')).toHaveLength(6);}finally{act(()=>root.unmount());}
});
it('keeps an unsupported source explicitly recorded instead of labelling a static quote live',async()=>{vi.stubGlobal('fetch',async()=>Response.json({ok:true,state:{...state,item:{...state.item,livePulseSeed:null}}}));const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<PublicCertificatePage token={token}/>));expect(host.textContent).toContain('Recorded price');expect(host.textContent).not.toContain('Live value');}finally{act(()=>root.unmount());}});

it('preserves exact carried cents when an observed price exceeds safe numeric display range',async()=>{const exact='99999999999999999999';vi.stubGlobal('fetch',async()=>Response.json({ok:true,state:{...state,note:{...state.note,lastPriceUsdCents:exact},item:{...state.item,priceUsd:1e30,livePulseSeed:null}}}));const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<PublicCertificatePage token={token}/>));expect(host.querySelector('.certificate-chart-heading')?.textContent).toContain(formatMoney(exact));}finally{act(()=>root.unmount());}});

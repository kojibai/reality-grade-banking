// @vitest-environment happy-dom
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {act} from 'react';import{createRoot}from'react-dom/client';
import {expect,it} from 'vitest';
import {BalanceDetails}from'../src/features/account/BalanceDetails';
import {projectCompositeWalletAt,type CompositeWalletSource} from '../src/receiz/composite-wallet-history';
import {compositeWalletObservation} from '../src/receiz/composite-wallet-source';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('keeps the contributing list bounded and one expanded Original live at 1/250/500 source objects',async()=>{
 const rows=[];
 for(const count of [1,250,500]){const source:CompositeWalletSource={schema:'receiz.wallet.chart-source.v129',authority:'authenticated-display-source',earningMembershipPolicy:'public-pbi-original-v1',userId:'benchmark-display',throughKaiUPulse:'14860000000000',objects:Array.from({length:count},(_,i)=>({id:`original-${i}`,seed:{kind:'sigil',claimPulse:14800000+i,beat:i%36,stepIndex:i%44,creatorVerified:false},intervals:[{fromKaiUPulse:'14859900000000',toKaiUPulse:null}]})),movements:[],lawfulValues:[]};
  function frame(kai:string){const next={...source,throughKaiUPulse:kai},point=projectCompositeWalletAt(next,kai);return compositeWalletObservation({wallet:{userId:source.userId,totalUsdCents:point.totalUsdCents,reserveUsdCents:point.reserveUsdCents,settlementUsdCents:point.settlementUsdCents,balancePhiMicro:point.balancePhiMicro!,reservePhiMicro:'0',settlementPhiMicro:point.balancePhiMicro!,portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null},observedAt:point.at},next)!;}
  let current=frame(source.throughKaiUPulse);const host=document.createElement('div'),root=createRoot(host);const render=()=>act(async()=>root.render(<BalanceDetails wallet={current.wallet} observation={current}/>));
  try{await render();await act(async()=>{host.querySelector<HTMLElement>('[data-balance-rail="settlement"] summary')!.click();await import('../src/features/account/BalanceCalculationDetails');});const start=performance.now();await act(async()=>host.querySelector<HTMLElement>('.balance-calculation>summary')!.click());const aggregate=performance.now();
   expect(host.querySelectorAll('[data-balance-original]').length).toBe(Math.min(24,count));expect(host.querySelectorAll('.balance-original-calculation .balance-calculation-steps').length).toBe(0);
   await act(async()=>host.querySelector<HTMLElement>('[data-balance-original] summary')!.click());const original=performance.now();current=frame('14860001000000');const updateStart=performance.now();await render();const updated=performance.now();expect(host.querySelector<HTMLDetailsElement>('[data-balance-original]')!.open).toBe(true);expect(host.querySelectorAll('.balance-original-calculation .balance-calculation-steps').length).toBe(1);rows.push({originals:count,openAggregateRenderMs:+(aggregate-start).toFixed(3),openOneOriginalRenderMs:+(original-aggregate).toFixed(3),oneOpenLiveRenderMs:+(updated-updateStart).toFixed(3)});
  }finally{act(()=>root.unmount());}
 }if(process.env.BANK_BALANCE_RENDER_BENCH_LOG)writeFileSync(process.env.BANK_BALANCE_RENDER_BENCH_LOG,JSON.stringify(rows,null,2));
});

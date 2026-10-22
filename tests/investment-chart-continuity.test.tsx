// @vitest-environment happy-dom
import {act,useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {InvestmentChart} from '../src/features/assets/Investments';
import {useInvestmentHistory} from '../src/receiz/market-projection/useInvestmentHistory';
import {buildInvestmentHistory,type InvestmentHistory,type InvestmentHistoryRow} from '../src/receiz/market-projection/investment-history';
import {parsePublicMarket,type PublicMarketItem} from '../src/receiz/public-market';
import {parseMarketPortfolio,type MarketPortfolio} from '../src/receiz/market-portfolio';
import {marketPulseTime} from '../src/receiz/market-projection/project';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.unstubAllGlobals());
const seed={kind:'sigil' as const,claimPulse:14000000,beat:2,stepIndex:3,creatorVerified:true};
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'work',receizId:'work',title:'Light',pulse:String(seed.claimPulse),livePulseSeed:seed}]}}).items[0];
function portfolio(){const raw=portfolioFixture();raw.positions=raw.positions.slice(0,1);raw.positions[0].marketItemId=item.id;raw.trades=raw.trades.slice(0,1);raw.trades[0].marketItemId=item.id;raw.trades[0].executedAt=new Date(marketPulseTime(14000100)).toISOString();return parseMarketPortfolio(raw,portfolioUid);}
function harness(){
 const workers:HeldWorker[]=[];
 class HeldWorker {
  onmessage:((event:{data:{id:number;investments:InvestmentHistory|null}})=>void)|null=null;onerror:(()=>void)|null=null;
  messages:{id:number;pulse:number;investmentRows?:InvestmentHistoryRow[]}[]=[];rows:InvestmentHistoryRow[]=[];history:InvestmentHistory|null=null;
  constructor(){workers.push(this);}postMessage(message:HeldWorker['messages'][number]){this.messages.push(message);}terminate(){}
  async complete(){const message=this.messages.at(-1)!;if(message.investmentRows)this.rows=message.investmentRows;this.history=await buildInvestmentHistory(this.rows,message.pulse,()=>true,async()=>{},this.history);this.onmessage?.({data:{id:message.id,investments:this.history}});}
 }
 vi.stubGlobal('Worker',HeldWorker);
 const host=document.createElement('div'),root=createRoot(host),frames:(string|null)[]=[];
 function Probe({value,items,pulse=14000200}:{value:MarketPortfolio;items:PublicMarketItem[];pulse?:number}){
  const history=useInvestmentHistory(value,items,null,pulse,true,true);
  useLayoutEffect(()=>{frames.push(host.querySelector('path[fill="none"]')?.getAttribute('d')??null);});
  return <InvestmentChart history={history} value="3000"/>;
 }
 return{workers,host,root,frames,render:async(value:MarketPortfolio,items=[item],pulse=14000200)=>act(async()=>root.render(<Probe value={value} items={items} pulse={pulse}/>)),path:()=>host.querySelector('path[fill="none"]')?.getAttribute('d')};
}
it('keeps the completed investment curve through an equivalent portfolio/catalog refresh without a flat frame',async()=>{
 const h=harness(),p=portfolio();
 try{await h.render(p);await act(async()=>h.workers[0].complete());const path=h.path();expect(path).toContain('C');h.frames.length=0;
  const refreshed=structuredClone(p);refreshed.observedAt='2026-10-21T12:01:00Z';refreshed.positions[0].title='Updated display title';
  await h.render(refreshed,[{...structuredClone(item),title:'Updated display title',priceUsd:123}],14000201);
  expect(h.frames.every(frame=>frame===path)).toBe(true);
  expect(h.host.querySelectorAll('.periods button')).toHaveLength(6);
  expect(h.workers).toHaveLength(1);
  await act(async()=>h.workers[0].complete());expect(h.path()).toContain('C');expect(h.path()).not.toBe(path);
 }finally{act(()=>h.root.unmount());}
});
it('invalidates a completed curve when ownership changes instead of displaying previous shares as current history',async()=>{
 const h=harness(),p=portfolio();
 try{await h.render(p);await act(async()=>h.workers[0].complete());const changed=structuredClone(p);changed.positions[0].shareQuantityMicro='3500000';changed.trades.push({...changed.trades[0],id:'second-buy',shareQuantityMicro:'1000000',executedAt:new Date(marketPulseTime(14000150)).toISOString()});
  await h.render(changed);expect(h.path()).not.toContain('C');await act(async()=>h.workers.at(-1)!.complete());expect(h.path()).toContain('C');
 }finally{act(()=>h.root.unmount());}
});
it('never reuses another account’s identical curve',async()=>{
 const h=harness(),p=portfolio();
 try{await h.render(p);await act(async()=>h.workers[0].complete());await h.render({...p,accountUid:'10000000-0000-4000-8000-000000000009'});expect(h.path()).not.toContain('C');}
 finally{act(()=>h.root.unmount());}
});
it('invalidates the curve when its bound pricing seed changes',async()=>{
 const h=harness(),p=portfolio();
 try{await h.render(p);await act(async()=>h.workers[0].complete());const path=h.path();
  await h.render(p,[{...item,livePulseSeed:{...seed,beat:4}}]);expect(h.path()).not.toContain('C');
  await act(async()=>h.workers.at(-1)!.complete());expect(h.path()).toContain('C');expect(h.path()).not.toBe(path);
 }finally{act(()=>h.root.unmount());}
});
it('does not keep a completed history when the refreshed records cannot account for the held shares',async()=>{
 const h=harness(),p=portfolio();
 try{await h.render(p);await act(async()=>h.workers[0].complete());await h.render({...p,trades:[]});expect(h.path()).not.toContain('C');expect(h.host.querySelectorAll('.periods button')).toHaveLength(0);}
 finally{act(()=>h.root.unmount());}
});

// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {LiveAccount} from '../src/features/account/LiveAccount';
import {parseMarketPortfolio} from '../src/receiz/market-portfolio';
import {portfolioFixture,portfolioUid} from './fixtures/market-portfolio';
vi.mock('../src/features/account/BalanceChart',()=>({BalanceChart:()=>null}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('shows live owned-investment value, invested amount and return and opens Investments using existing data',()=>{
 const host=document.createElement('div'),root=createRoot(host),open=vi.fn(),balance=vi.fn(),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 const portfolio=parseMarketPortfolio(portfolioFixture(),portfolioUid);
 const props={wallet:null,busy:false,error:null,observedAt:null,onRefresh:()=>{},onSend:()=>{},onReceive:()=>{},onBalance:balance,onAssets:()=>{},onLedger:()=>{},onInvestments:open,portfolio};
 try{
  act(()=>root.render(<LiveAccount {...props}/>));
  const card=host.querySelector<HTMLButtonElement>('.account-investment-total')!;expect(card).not.toBeNull();expect(card.textContent).toContain('Investments');expect(card.textContent).toContain('$30.00');expect(card.textContent).toContain('Invested $26.00');expect(card.textContent).toContain('+$4.00');expect(card.textContent).toContain('+15.38%');
  act(()=>card.click());expect(open).toHaveBeenCalledOnce();expect(balance).not.toHaveBeenCalled();
  act(()=>root.render(<LiveAccount {...props} portfolio={{...portfolio,positions:[{...portfolio.positions[0],lastPriceUsdCents:'400'},portfolio.positions[1]]}}/>));
  expect(card.textContent).toContain('$15.00');expect(card.querySelector('.negative')?.textContent).toContain('−$11.00');expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});

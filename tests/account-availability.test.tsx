// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {LiveAccount} from '../src/features/account/LiveAccount';
import {BalanceDetails} from '../src/features/account/BalanceDetails';
import type {SharedWallet} from '../src/receiz/shared-wallet';
import type {WalletPoint} from '../src/receiz/wallet-series';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const at='2026-10-29T20:52:58.000Z';
const wallet={userId:'owner',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0',balancePhiMicro:'0',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null} satisfies SharedWallet;
const point={userId:'owner',at,kaiUPulse:'14893549000000',totalUsdCents:'0',reserveUsdCents:'0',settlementUsdCents:'0',valuation:'portfolio-model-v129',availabilityGapUsdCents:'65695304'} as WalletPoint&{availabilityGapUsdCents:string};
const noop=()=>{},props={wallet,busy:false,error:null,observedAt:at,onRefresh:noop,onSend:noop,onReceive:noop,onBalance:noop,onAssets:noop,onLedger:noop};
function render(history:WalletPoint[],overrides:Partial<typeof props>={}){const host=document.createElement('div');host.innerHTML=renderToStaticMarkup(<LiveAccount {...props} {...overrides} walletHistory={history}/>);return host;}
it('explains only the exact displayed zero-balance difference without changing the balance or issuing a request',()=>{
 const request=vi.spyOn(globalThis,'fetch');try{const host=render([point]);expect(host.querySelector('.balance-amount')?.textContent).toBe('$0.00');expect(host.querySelector('.account-availability')?.textContent).toContain('$656,953.04');expect(host.querySelector('.account-availability')?.textContent).not.toContain('$656,953.05');expect(request).not.toHaveBeenCalled();}finally{request.mockRestore();}
});
it('omits the disclosure for ordinary zero, positive balances, or anything other than the matching latest point',()=>{
 const positive={...wallet,totalUsdCents:'2000000',settlementUsdCents:'2000000'};
 for(const [history,overrides] of [[[],{}],[[{...point,availabilityGapUsdCents:'0'}],{}],[[{...point,availabilityGapUsdCents:'NaN'}],{}],[[{...point,userId:'other'}],{}],[[point],{observedAt:'2026-10-29T20:53:00.000Z'}],[[point],{wallet:positive}],[[point,{...point,at:'2026-10-29T20:53:00.000Z',availabilityGapUsdCents:undefined}],{observedAt:'2026-10-29T20:53:00.000Z'}]] as const){expect(render([...history] as WalletPoint[],overrides).querySelector('.account-availability')).toBeNull();}
});
it('updates the current difference and removes it on value recovery without requiring a sale or remount',async()=>{
 const host=document.createElement('div'),root=createRoot(host),holdings=vi.fn();
 try{await act(async()=>root.render(<LiveAccount {...props} walletHistory={[point]} onBalance={holdings}/>));expect(host.querySelector('.account-availability')).not.toBeNull();await act(async()=>host.querySelector<HTMLButtonElement>('.account-availability')!.click());expect(holdings).toHaveBeenCalledTimes(1);
 await act(async()=>root.render(<LiveAccount {...props} walletHistory={[{...point,availabilityGapUsdCents:'63695304'}]} onBalance={holdings}/>));expect(host.querySelector('.account-availability')?.textContent).toContain('$636,953.04');
 const recovered={...wallet,totalUsdCents:'1',settlementUsdCents:'1'};await act(async()=>root.render(<LiveAccount {...props} wallet={recovered} walletHistory={[{...point,totalUsdCents:'1',settlementUsdCents:'1',availabilityGapUsdCents:undefined}]} onBalance={holdings}/>));expect(host.querySelector('.account-availability')).toBeNull();expect(host.querySelector('.balance-amount')?.textContent).toBe('$0.01');
 }finally{await act(async()=>root.unmount());}
});


it('keeps Settlement visible only for the negative intermediate case and explains its exact floor inside the existing dropdown',async()=>{
 const host=document.createElement('div'),root=createRoot(host),observation={wallet,observedAt:at,history:[point]};
 try{
  await act(async()=>root.render(<BalanceDetails wallet={wallet} observation={observation}/>));
  const settlement=host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]');expect(settlement).not.toBeNull();
  await act(async()=>settlement!.querySelector('summary')!.click());
  expect(settlement!.textContent).toContain('−$656,953.04');expect(settlement!.textContent).toContain('$656,953.05');expect(settlement!.textContent).toContain('Available funds');
  await act(async()=>root.render(<BalanceDetails wallet={wallet} observation={{...observation,history:[{...point,availabilityGapUsdCents:undefined}]}}/>));
  expect(host.querySelector('[data-balance-rail="settlement"]')).toBeNull();
 }finally{await act(async()=>root.unmount());}
});

it('opens directly to the existing Settlement dropdown only for an explicit edge-case target',async()=>{
 const host=document.createElement('div'),root=createRoot(host),observation={wallet,observedAt:at,history:[point]};
 try{await act(async()=>root.render(<BalanceDetails wallet={wallet} observation={observation} focusSettlement/>));expect(host.querySelector<HTMLDetailsElement>('.balance-source-details')?.open).toBe(true);const settlement=host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]');expect(settlement?.open).toBe(true);expect(settlement?.textContent).toContain('−$656,953.04');await act(async()=>settlement!.querySelector('summary')!.click());expect(settlement?.open).toBe(false);
 }finally{await act(async()=>root.unmount());}
});

it('honors a new explicit Settlement target on a retained popover and preserves its open inspection when values recover',async()=>{
 const host=document.createElement('div'),root=createRoot(host),observation={wallet,observedAt:at,history:[point]};
 try{
  await act(async()=>root.render(<BalanceDetails wallet={wallet} observation={observation}/>));expect(host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]')?.open).toBe(false);
  await act(async()=>root.render(<BalanceDetails wallet={wallet} observation={observation} focusSettlement/>));expect(host.querySelector<HTMLDetailsElement>('.balance-source-details')?.open).toBe(true);expect(host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]')?.open).toBe(true);
  const recovered={...wallet,totalUsdCents:'1',settlementUsdCents:'1'},next={...observation,wallet:recovered,history:[{...point,totalUsdCents:'1',settlementUsdCents:'1',availabilityGapUsdCents:undefined}]};
  await act(async()=>root.render(<BalanceDetails wallet={recovered} observation={next} focusSettlement/>));expect(host.querySelector<HTMLDetailsElement>('.balance-source-details')?.open).toBe(true);expect(host.querySelector<HTMLDetailsElement>('[data-balance-rail="settlement"]')?.open).toBe(true);expect(host.querySelector('.account-availability-body')).toBeNull();
 }finally{await act(async()=>root.unmount());}
});

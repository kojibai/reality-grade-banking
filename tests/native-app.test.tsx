// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import App from '../src/App';
import type { SharedWallet } from '../src/receiz/shared-wallet';
import type { WalletPoint } from '../src/receiz/wallet-series';
const account = vi.hoisted(() => ({ state: { identity: null, wallet: null as SharedWallet|null, walletHistory: [] as WalletPoint[], opening: false, openingStage: 'identity' as 'identity'|'history'|'ready', busy: false, error: null, observedAt: null as string|null, create: vi.fn(), importId: vi.fn() } }));
vi.mock('../src/receiz/usePublicMarket',()=>({usePublicMarket:()=>({catalog:null,status:'loading',error:null})}));
vi.mock('../src/receiz/useNativeAccount', () => ({ useNativeAccount: () => account.state }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('opens the actual ID entrance without demo balances, with separate new and existing paths and consent through the chosen action', () => {
  localStorage.setItem('receiz-bank-demo-v1', '{"balance":99999999}');
  const host = document.createElement('div'), root = createRoot(host);
  try { act(() => root.render(<App />)); expect(host.textContent).not.toContain('Create your account'); expect(host.textContent).toContain('Enter'); expect(host.textContent).toContain('Use existing account'); expect(host.textContent).not.toContain('Demo'); expect(host.textContent).not.toContain('99999999');
    const create = [...host.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Enter')!;
    expect(create.disabled).toBe(false); expect(host.querySelector('input[type="checkbox"]')).toBeNull(); expect(host.textContent).toContain('By continuing, you authorize'); expect(host.querySelector('a[href="/learn/account-access/"]')?.textContent).toBe('account access'); expect(host.querySelector('a[href="/learn/signing-key/"]')?.textContent).toBe('signing key'); act(() => create.click()); expect(account.state.create).toHaveBeenCalledWith(true);
  } finally { act(() => root.unmount()); localStorage.clear(); }
});
it('keeps the entrance until the canonical identity and complete supported account frame are ready',()=>{
  const previous={...account.state},host=document.createElement('div'),root=createRoot(host);
  account.state.opening=true;
  account.state.openingStage='history';
  account.state.wallet={userId:'retained-user',totalUsdCents:'321',reserveUsdCents:'0',settlementUsdCents:'321',balancePhiMicro:'1000000',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:'100',kaiUpulse:'100000002'};
  account.state.observedAt='2026-10-18T12:00:00Z';
  account.state.walletHistory=[{userId:'retained-user',at:'2026-10-18T10:00:00Z',kaiUPulse:'100000001',totalUsdCents:'100',reserveUsdCents:'0',settlementUsdCents:'100'},{userId:'retained-user',at:account.state.observedAt,kaiUPulse:'100000002',totalUsdCents:'321',reserveUsdCents:'0',settlementUsdCents:'321'}];
  try{
    act(()=>root.render(<App/>));
    expect(host.querySelector('.balance-amount')).toBeNull();
    expect(host.querySelector('.value-chart svg')).toBeNull();
    expect(host.querySelector('.chart-period-change')).toBeNull();
    expect(host.querySelector('.account-opening[data-entry=resume] svg')).not.toBeNull();
    expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('1');
    expect(host.querySelector('.identity-entrance')?.hasAttribute('hidden')).toBe(true);
  }finally{act(()=>root.unmount());Object.assign(account.state,previous);}
});

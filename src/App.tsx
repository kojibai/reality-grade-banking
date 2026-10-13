import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsoleShell } from './components/ConsoleShell';
import type { Panel } from './components/BottomNav';
import { Sheet } from './components/Sheet';
import { Account } from './features/account/Account';
import { DepositSheet } from './features/deposit/DepositSheet';
import { loadState, saveState } from './core/storage';
import { applyOperation, projectBalance } from './core/account';
import { accountCurve, createDemoState } from './core/demo';
import { formatMoney, operationId } from './core/money';
import { BankContext, type UIAction } from './core/useBank';
import type { BankOperation, BankState } from './core/types';

export default function App() {
  const [panel, setPanel] = useState<Panel>('account');
  const [sheet, setSheet] = useState<UIAction | null>(null);
  const [state, setState] = useState(loadState);
  const current = useRef(state);
  const positions = useRef<Partial<Record<Panel, number>>>({});
  const update = useCallback((next: BankState) => { current.current = next; setState(next); saveState(next); }, []);
  const commit = useCallback((operation: BankOperation) => update(applyOperation(current.current, operation)), [update]);
  const open = (action: UIAction) => { history.pushState({ panel, sheet: action }, '', `#${panel}/${action.kind}`); setSheet(action); };
  const close = () => { if (history.state?.sheet) history.back(); else setSheet(null); };
  const navigate = (next: Panel) => { positions.current[panel] = scrollY; history.pushState({ panel: next, sheet: null }, '', `#${next}`); setPanel(next); setSheet(null); requestAnimationFrame(() => scrollTo(0, positions.current[next] ?? 0)); };
  useEffect(() => { saveState(current.current); history.replaceState({ panel: 'account', sheet: null }, '', '#account'); const onBack = (event: PopStateEvent) => { setPanel(event.state?.panel ?? 'account'); setSheet(event.state?.sheet ?? null); }; addEventListener('popstate', onBack); return () => removeEventListener('popstate', onBack); }, []);
  const balance = projectBalance(state);
  const context = { state, commit, open, close, navigate,
    updateIdentity: (publicName: boolean, username: string) => update({ ...current.current, identity: { ...current.current.identity, publicName, username: username.trim() } }),
    saveRule: (title: string, percentage: number, destination: string) => update({ ...current.current, rules: [...current.current.rules, { id: operationId('rule'), title, percentage, destination, status: 'draft' as const }] }),
    resetDemo: () => { update(createDemoState()); close(); },
  };
  const title = sheet?.kind === 'pending' ? 'Deposit' : sheet?.kind === 'balance' ? 'Your balance' : sheet?.kind === 'growth' ? 'Settlement growth' : sheet?.kind === 'profile' ? 'Your account' : sheet ? sheet.kind.charAt(0).toUpperCase() + sheet.kind.slice(1) : '';
  return <BankContext.Provider value={context}><ConsoleShell panel={panel} onNavigate={navigate} onDeposit={() => open({ kind: 'deposit' })} onProfile={() => open({ kind: 'profile' })}>
    <div hidden={panel !== 'account'}><Account state={state} view={{ balance: formatMoney(balance.totalUsdCents), growth: formatMoney(balance.growthUsdCents), values: [...accountCurve.slice(0, -1), Number(balance.totalUsdCents) / 100] }} onSend={() => open({ kind: 'send' })} onReceive={() => open({ kind: 'receive' })} onBalance={() => open({ kind: 'balance' })} onAssets={() => navigate('assets')} onAsset={assetId => open({ kind: 'asset', assetId })} onLedger={() => navigate('ledger')} onGrowth={() => open({ kind: 'growth' })} /></div>
    {panel !== 'account' && <section><h1>{panel.charAt(0).toUpperCase() + panel.slice(1)}</h1></section>}
  </ConsoleShell>{sheet && <Sheet key={`${sheet.kind}-${'assetId' in sheet ? sheet.assetId : ''}`} title={title} onClose={close}>
    {sheet.kind === 'deposit' || sheet.kind === 'pending' ? <DepositSheet depositId={sheet.kind === 'pending' ? sheet.depositId : undefined} /> : <><p className="body-copy">Demonstration account powered by Receiz 129.</p>{sheet.kind === 'balance' && <div className="detail-list"><div><span>Reserve</span><strong>{formatMoney(balance.reserveUsdCents)}</strong></div><div><span>Settlement</span><strong>{formatMoney(balance.settlementUsdCents)}</strong></div><div><span>Owned assets</span><strong>{formatMoney(balance.assetsUsdCents)}</strong></div><div><span>Currency backing</span><strong>{formatMoney(balance.backingUsdCents)}</strong></div><p className="body-copy">One account value. Asset ownership and liquid funds remain distinct.</p></div>}<button className="primary-button" onClick={close}>Back to account</button></>}
  </Sheet>}</BankContext.Provider>;
}

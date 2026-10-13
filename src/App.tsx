import { useCallback, useEffect, useRef, useState } from 'react';
import { ConsoleShell } from './components/ConsoleShell';
import type { Panel } from './components/BottomNav';
import { Account } from './features/account/Account';
import { Market } from './features/market/Market';
import { ActionSheets } from './components/ActionSheets';
import { Ledger } from './features/ledger/Ledger';
import { Assets } from './features/assets/Assets';
import { loadState, saveState } from './core/storage';
import { applyOperation, projectBalance } from './core/account';
import { accountCurve, createDemoState } from './core/demo';
import { formatMoney, operationId } from './core/money';
import { parseRoute, routeHash, sheetCloseBehavior } from './core/routes';
import { BankContext, type UIAction } from './core/useBank';
import type { BankOperation, BankState } from './core/types';

export default function App() {
  const [initialRoute] = useState(() => parseRoute(location.hash));
  const [panel, setPanel] = useState<Panel>(initialRoute.panel);
  const [sheet, setSheet] = useState<UIAction | null>(initialRoute.sheet);
  const [state, setState] = useState(loadState);
  const current = useRef(state);
  const positions = useRef<Partial<Record<Panel, number>>>({});
  const update = useCallback((next: BankState) => { current.current = next; setState(next); saveState(next); }, []);
  const commit = useCallback((operation: BankOperation) => update(applyOperation(current.current, operation)), [update]);
  const open = (action: UIAction) => { history.pushState({ panel, sheet: action, overlayEntry: true }, '', routeHash(panel, action)); setSheet(action); };
  const close = () => { if (sheetCloseBehavior(history.state) === 'back') history.back(); else { history.replaceState({ panel, sheet: null }, '', routeHash(panel)); setSheet(null); } };
  const navigate = (next: Panel) => { positions.current[panel] = scrollY; history.pushState({ panel: next, sheet: null }, '', routeHash(next)); setPanel(next); setSheet(null); requestAnimationFrame(() => scrollTo(0, positions.current[next] ?? 0)); };
  useEffect(() => { saveState(current.current); history.replaceState(initialRoute, '', routeHash(initialRoute.panel, initialRoute.sheet)); const onBack = (event: PopStateEvent) => { setPanel(event.state?.panel ?? 'account'); setSheet(event.state?.sheet ?? null); }; addEventListener('popstate', onBack); return () => removeEventListener('popstate', onBack); }, []);
  const balance = projectBalance(state);
  const context = { state, commit, open, close, navigate,
    updateIdentity: (publicName: boolean, username: string) => update({ ...current.current, identity: { ...current.current.identity, publicName, username: username.trim() } }),
    saveRule: (title: string, percentage: number, destination: string) => update({ ...current.current, rules: [...current.current.rules, { id: operationId('rule'), title, percentage, destination, status: 'draft' as const }] }),
    resetDemo: () => { update(createDemoState()); close(); },
  };
  return <BankContext.Provider value={context}><ConsoleShell panel={panel} onNavigate={navigate} onDeposit={() => open({ kind: 'deposit' })} onProfile={() => open({ kind: 'profile' })}>
    <div hidden={panel !== 'account'}><Account state={state} view={{ balance: formatMoney(balance.totalUsdCents), growth: formatMoney(balance.growthUsdCents), values: [...accountCurve.slice(0, -1), Number(balance.totalUsdCents) / 100] }} onSend={() => open({ kind: 'send' })} onReceive={() => open({ kind: 'receive' })} onBalance={() => open({ kind: 'balance' })} onAssets={() => navigate('assets')} onAsset={assetId => open({ kind: 'asset', assetId })} onLedger={() => navigate('ledger')} onGrowth={() => open({ kind: 'growth' })} /></div>
    <div hidden={panel !== 'market'}><Market active={panel === 'market'} /></div><div hidden={panel !== 'assets'}><Assets /></div><div hidden={panel !== 'ledger'}><Ledger active={panel === 'ledger'} /></div>
  </ConsoleShell>{sheet && <ActionSheets key={`${sheet.kind}-${'assetId' in sheet ? sheet.assetId : ''}-${'depositId' in sheet ? sheet.depositId : ''}`} action={sheet} />}</BankContext.Provider>;
}

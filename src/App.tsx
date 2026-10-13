import { useEffect, useMemo, useRef, useState } from 'react';
import { ConsoleShell } from './components/ConsoleShell';
import type { Panel } from './components/BottomNav';
import { Market } from './features/market/Market';
import { Ledger } from './features/ledger/Ledger';
import { Entrance } from './features/identity/Entrance';
import { LiveAccount } from './features/account/LiveAccount';
import { LiveActions } from './features/account/LiveActions';
import { parseRoute, routeHash, sheetCloseBehavior } from './core/routes';
import type { UIAction } from './core/useBank';
import { useNativeAccount } from './receiz/useNativeAccount';
import { projectPersonalHistory } from './receiz/personal-history';
export default function App() {
  const account = useNativeAccount();
  const [panel, setPanel] = useState<Panel>('account'), [sheet, setSheet] = useState<UIAction | null>(null);
  const positions = useRef<Partial<Record<Panel, number>>>({});
  const personalHistory = useMemo(() => { if (!account.identity) return null; try { return projectPersonalHistory(account.identity.localHistory); } catch { return { records: [], available: false, completeAtSealedHead: false }; } }, [account.identity]);
  const open = (action: UIAction) => { history.pushState({ panel, sheet: action, overlayEntry: true }, '', routeHash(panel, action)); setSheet(action); };
  const close = () => { if (sheetCloseBehavior(history.state) === 'back') history.back(); else { history.replaceState({ panel, sheet: null }, '', routeHash(panel)); setSheet(null); } };
  const navigate = (next: Panel) => { positions.current[panel] = scrollY; history.pushState({ panel: next, sheet: null }, '', routeHash(next)); setPanel(next); setSheet(null); requestAnimationFrame(() => scrollTo(0, positions.current[next] ?? 0)); };
  useEffect(() => { const back = () => { const route = parseRoute(location.hash); setPanel(route.panel); setSheet(route.sheet); }; addEventListener('popstate', back); return () => removeEventListener('popstate', back); }, []);
  useEffect(() => { if (account.identity) { setPanel('account'); setSheet(null); history.replaceState({ panel: 'account', sheet: null }, '', '#account'); } }, [account.identity]);
  if (!account.identity) return <Entrance opening={account.opening} busy={account.busy} error={account.error} onCreate={account.create} onImport={account.importId} />;
  return <ConsoleShell panel={panel} onNavigate={navigate} onDeposit={() => open({ kind: 'deposit' })} onProfile={() => open({ kind: 'profile' })}>
    <div hidden={panel !== 'account'}><LiveAccount wallet={account.wallet} busy={account.busy} error={account.error} observedAt={account.observedAt} onRefresh={() => void account.refresh()} onSend={() => open({ kind: 'send' })} onReceive={() => open({ kind: 'receive' })} onBalance={() => open({ kind: 'balance' })} onAssets={() => navigate('assets')} onLedger={() => navigate('ledger')} /></div>
    <div hidden={panel !== 'market'}><Market active={panel === 'market'} onAction={open} /></div>
    <div hidden={panel !== 'assets'}><section><h1>Your assets</h1><p className="page-subtitle">Hold it. Move ownership. Unlock value.</p><div className="rows-surface"><div className="empty-state">Owned asset sources and custody intake are not connected yet. Public showcase objects remain available in Market.</div></div></section></div>
    <div hidden={panel !== 'ledger'}><Ledger active={panel === 'ledger'} personalHistory={personalHistory} /></div>
    {sheet && <LiveActions key={sheet.kind} action={sheet} identity={account.identity} wallet={account.wallet} onClose={close} onForget={async () => { setSheet(null); await account.forget(); }} />}
  </ConsoleShell>;
}

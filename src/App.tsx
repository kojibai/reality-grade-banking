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
import { usePublicMarket } from './receiz/usePublicMarket';
import { projectAccountShowcase } from './receiz/account-showcase';
import { LiveAssets } from './features/assets/LiveAssets';
import { BANK_PUBLIC_ORIGIN } from './receiz/config';
import { parsePaymentRequest } from './receiz/payment-request';
import { CardDepositReturn, readCardReturn } from './features/deposit/CardDepositReturn';
export default function App() { const session = readCardReturn(location.search); return session ? <CardDepositReturn sessionId={session} /> : <BankApp />; }
function BankApp() {
  const account = useNativeAccount();
  const publicMarket = usePublicMarket(Boolean(account.identity));
  const showcase = useMemo(() => projectAccountShowcase(publicMarket.catalog, account.identity?.accountUsername?.() ?? account.identity?.username ?? null), [publicMarket.catalog, account.identity, account.wallet]);
  const [paymentRequest] = useState(() => { try { return location.search ? parsePaymentRequest(`${BANK_PUBLIC_ORIGIN}/${location.search}`) : null; } catch { return null; } });
  const [sourceRevision, setSourceRevision] = useState(0);
  const [panel, setPanel] = useState<Panel>('account'), [sheet, setSheet] = useState<UIAction | null>(null);
  const positions = useRef<Partial<Record<Panel, number>>>({});
  const personalHistory = useMemo(() => { if (!account.identity) return null; try { return projectPersonalHistory(account.identity.localHistory, account.wallet?.userId); } catch { return { records: [], available: false, completeAtSealedHead: false }; } }, [account.identity, account.wallet?.userId]);
  const open = (action: UIAction) => { history.pushState({ panel, sheet: action, overlayEntry: true }, '', routeHash(panel, action)); setSheet(action); };
  const close = () => { if (sheetCloseBehavior(history.state) === 'back') history.back(); else { history.replaceState({ panel, sheet: null }, '', routeHash(panel)); setSheet(null); } };
  const navigate = (next: Panel) => { positions.current[panel] = scrollY; history.pushState({ panel: next, sheet: null }, '', routeHash(next)); setPanel(next); setSheet(null); requestAnimationFrame(() => scrollTo(0, positions.current[next] ?? 0)); };
  useEffect(() => { const back = () => { const route = parseRoute(location.hash); setPanel(route.panel); setSheet(route.sheet); }; addEventListener('popstate', back); return () => removeEventListener('popstate', back); }, []);
  useEffect(() => { if (account.identity) { const route = paymentRequest ? { panel: 'account' as const, sheet: { kind: 'send' as const } } : parseRoute(location.hash); setPanel(route.panel); setSheet(route.sheet); history.replaceState(route, '', `${location.search}${routeHash(route.panel, route.sheet)}`); } }, [account.identity, paymentRequest]);
  if (!account.identity) {
    if (account.opening && account.wallet) return <ConsoleShell locked panel="account" onNavigate={() => {}} onDeposit={() => {}} onProfile={() => {}}><div className="known-account-paint"><LiveAccount ready={false} wallet={account.wallet} busy={false} error={null} observedAt={account.observedAt} onRefresh={() => {}} onSend={() => {}} onReceive={() => {}} onBalance={() => {}} onAssets={() => {}} onLedger={() => {}} /></div></ConsoleShell>;
    return <Entrance opening={account.opening} busy={account.busy} error={account.error} onCreate={account.create} onImport={account.importId} />;
  }
  return <ConsoleShell panel={panel} onNavigate={navigate} onDeposit={() => open({ kind: 'deposit' })} onProfile={() => open({ kind: 'profile' })}>
    <div hidden={panel !== 'account'}><LiveAccount walletHistory={account.identity.knownWallet?.()?.history} showcase={showcase} wallet={account.wallet} busy={account.busy} error={account.error} observedAt={account.observedAt} onRefresh={() => void account.refresh()} onSend={() => open({ kind: 'send' })} onReceive={() => open({ kind: 'receive' })} onBalance={() => open({ kind: 'balance' })} onAssets={() => navigate('assets')} onLedger={() => navigate('ledger')} /></div>
    <div hidden={panel !== 'market'}><Market source={publicMarket} active={panel === 'market'} onAction={open} /></div>
    <div hidden={panel !== 'assets'}><LiveAssets identity={account.identity} active={panel === 'assets'} revision={sourceRevision} showcase={showcase} showcaseBusy={publicMarket.status === 'loading'} onOpen={open} /></div>
    <div hidden={panel !== 'ledger'}><Ledger active={panel === 'ledger'} personalHistory={personalHistory} /></div>
    {sheet && <LiveActions key={sheet.kind} action={sheet} identity={account.identity} wallet={account.wallet} paymentRequest={paymentRequest} onClose={close} onRefresh={() => { setSourceRevision(value => value + 1); void account.refresh(); }} onForget={async () => { setSheet(null); await account.forget(); }} />}
  </ConsoleShell>;
}

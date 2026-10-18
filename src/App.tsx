import { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ConsoleShell } from './components/ConsoleShell';
import type { Panel } from './components/BottomNav';
import { Market } from './features/market/Market';
import {ReceiptView} from './features/receipts/ReceiptView';
import { Ledger } from './features/ledger/Ledger';
import { Entrance } from './features/identity/Entrance';
import { LiveAccount } from './features/account/LiveAccount';
import { LiveActions } from './features/account/LiveActions';
import { parseRoute, routeHash, sheetCloseBehavior } from './core/routes';
import type { UIAction } from './core/useBank';
import { useNativeAccount } from './receiz/useNativeAccount';
import { projectPersonalHistory } from './receiz/personal-history';
import { usePrivateHistory } from './receiz/usePrivateHistory';
import { usePublicMarket } from './receiz/usePublicMarket';
import { projectAccountShowcase } from './receiz/account-showcase';
import { LiveAssets } from './features/assets/LiveAssets';
import { BANK_PUBLIC_ORIGIN } from './receiz/config';
import { parsePaymentRequest } from './receiz/payment-request';
import { CardDepositReturn, readCardReturn } from './features/deposit/CardDepositReturn';
export default function App() {
 const [receipt,setReceipt]=useState(location.pathname==='/receipt/');
 const bankMounted=useRef(!receipt);
 useEffect(()=>{const changed=()=>{setReceipt(location.pathname==='/receipt/');if(location.pathname==='/')bankMounted.current=true;};addEventListener('popstate',changed);addEventListener('bankeiz:receipt',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('bankeiz:receipt',changed);};},[]);
 const session=readCardReturn(location.search);
 return <>{(bankMounted.current||!receipt)&&<div hidden={receipt} inert={receipt}>{session?<CardDepositReturn sessionId={session}/>:<BankApp/>}</div>}{receipt&&<ReceiptView onBack={()=>{if(history.state?.bankReceipt)history.back();else{history.replaceState(null,'','/#ledger');dispatchEvent(new Event('bankeiz:receipt'));dispatchEvent(new Event('receiz-bank:surface'));}}}/>}</>;
}
function BankApp() {
  const [onBank, setOnBank] = useState(location.pathname === '/');
  useEffect(() => { const change = () => flushSync(() => setOnBank(location.pathname === '/')); addEventListener('receiz-bank:surface', change); addEventListener('popstate',change); return () => { removeEventListener('receiz-bank:surface', change);removeEventListener('popstate',change); }; }, []);
  const account = useNativeAccount();
  const publicMarket = usePublicMarket(onBank);
  const showcase = useMemo(() => projectAccountShowcase(publicMarket.catalog, account.identity?.accountUsername?.() ?? account.identity?.username ?? null), [publicMarket.catalog, account.identity, account.wallet]);
  const [paymentRequest] = useState(() => { try { return location.search ? parsePaymentRequest(`${BANK_PUBLIC_ORIGIN}/${location.search}`) : null; } catch { return null; } });
  const [sourceRevision, setSourceRevision] = useState(0);
  const [panel, setPanel] = useState<Panel>('account'), [sheet, setSheet] = useState<UIAction | null>(null);
  const privateHistory = usePrivateHistory(account.identity, account.wallet?.userId, onBank && Boolean(account.identity));
  const positions = useRef<Partial<Record<Panel, number>>>({});
  const personalHistory = useMemo(() => { if (!account.identity) return null; try { return projectPersonalHistory(account.identity.localHistory, account.wallet?.userId); } catch { return { records: [], available: false, completeAtSealedHead: false }; } }, [account.identity, account.wallet?.userId]);
  const open = (action: UIAction) => { history.pushState({ panel, sheet: action, overlayEntry: true }, '', routeHash(panel, action)); setSheet(action); };
  const close = () => { if (sheetCloseBehavior(history.state) === 'back') history.back(); else { history.replaceState({ panel, sheet: null }, '', routeHash(panel)); setSheet(null); } };
  const navigate = (next: Panel) => { positions.current[panel] = scrollY; history.pushState({ panel: next, sheet: null }, '', routeHash(next)); setPanel(next); setSheet(null); requestAnimationFrame(() => scrollTo(0, positions.current[next] ?? 0)); };
  useEffect(() => { const back = () => { if (location.pathname !== '/') return; const route = parseRoute(location.hash); setPanel(route.panel); setSheet(route.sheet); }; addEventListener('popstate', back); addEventListener('receiz-bank:surface', back); return () => { removeEventListener('popstate', back); removeEventListener('receiz-bank:surface', back); }; }, []);
  useEffect(() => { if (account.identity && onBank) { const route = paymentRequest ? { panel: 'account' as const, sheet: { kind: 'send' as const } } : parseRoute(location.hash); setPanel(route.panel); setSheet(route.sheet); history.replaceState(route, '', `${location.search}${routeHash(route.panel, route.sheet)}`); } }, [account.identity, paymentRequest, onBank]);
  if (!account.identity) {
    return <Entrance opening={account.opening} busy={account.busy} error={account.error} onCreate={account.create} onImport={account.importId} />;
  }
  return <ConsoleShell panel={panel} onNavigate={navigate} onDeposit={() => open({ kind: 'deposit' })} onProfile={() => open({ kind: 'profile' })}>
    <div hidden={panel !== 'account'}><LiveAccount walletHistory={account.walletHistory} historyComplete={account.historyComplete} showcase={showcase} wallet={account.wallet} busy={account.busy} error={account.error} observedAt={account.observedAt} onRefresh={() => void account.refresh()} onSend={() => open({ kind: 'send' })} onReceive={() => open({ kind: 'receive' })} onBalance={() => open({ kind: 'balance' })} onAssets={() => navigate('assets')} onLedger={() => navigate('ledger')} /></div>
    <div hidden={panel !== 'market'}><Market source={publicMarket} active={onBank && panel === 'market'} onAction={open} /></div>
    <div hidden={panel !== 'assets'}><LiveAssets identity={account.identity} active={onBank && panel === 'assets'} revision={sourceRevision} showcase={showcase} showcaseBusy={publicMarket.status === 'loading'} onOpen={open} /></div>
    <div hidden={panel !== 'ledger'}><Ledger active={onBank && panel === 'ledger'} personalHistory={personalHistory} privateHistory={privateHistory} /></div>
    {sheet && <LiveActions marketItems={publicMarket.catalog?.items} key={sheet.kind} active={onBank} action={sheet} identity={account.identity} wallet={account.wallet} paymentRequest={paymentRequest} onClose={close} onRefresh={() => { setSourceRevision(value => value + 1); void account.refresh(); }} onForget={async () => { await account.forget(); setSheet(null); }} />}
  </ConsoleShell>;
}

import { useEffect, useState } from 'react';
import { ConsoleShell } from './components/ConsoleShell';
import type { Panel } from './components/BottomNav';
import { Sheet } from './components/Sheet';
import { Account } from './features/account/Account';
import { loadState, saveState } from './core/storage';
import { projectBalance } from './core/account';
import { accountCurve } from './core/demo';
import { formatMoney } from './core/money';

export default function App() {
  const [panel, setPanel] = useState<Panel>('account');
  const [sheet, setSheet] = useState<string | null>(null);
  const [state] = useState(loadState);
  useEffect(() => { saveState(state); }, [state]);
  const balance = projectBalance(state);
  return <><ConsoleShell panel={panel} onNavigate={setPanel} onDeposit={() => setSheet('Deposit')} onProfile={() => setSheet('Your account')}>{panel === 'account' ? <Account state={state} view={{ balance: formatMoney(balance.totalUsdCents), growth: formatMoney(balance.growthUsdCents), values: [...accountCurve.slice(0, -1), Number(balance.totalUsdCents) / 100] }} onSend={() => setSheet('Send')} onReceive={() => setSheet('Receive')} onBalance={() => setSheet('Your balance')} onAssets={() => setPanel('assets')} onAsset={() => setPanel('assets')} onLedger={() => setPanel('ledger')} onGrowth={() => setSheet('Settlement growth')} /> : <section><h1>{panel.charAt(0).toUpperCase() + panel.slice(1)}</h1></section>}</ConsoleShell>{sheet && <Sheet title={sheet} onClose={() => setSheet(null)}><p className="body-copy">Demonstration account powered by Receiz 129.</p>{sheet === 'Your balance' && <div className="detail-list"><div><span>Reserve</span><strong>{formatMoney(balance.reserveUsdCents)}</strong></div><div><span>Settlement</span><strong>{formatMoney(balance.settlementUsdCents)}</strong></div><div><span>Owned assets</span><strong>{formatMoney(balance.assetsUsdCents)}</strong></div><p className="body-copy">One account value. Asset ownership and liquid funds remain distinct.</p></div>}<button className="primary-button" onClick={() => setSheet(null)}>Back to account</button></Sheet>}</>;
}

import { useState } from 'react';
import { ConsoleShell } from './components/ConsoleShell';
import type { Panel } from './components/BottomNav';
import { Sheet } from './components/Sheet';
import { Account } from './features/account/Account';

export default function App() {
  const [panel, setPanel] = useState<Panel>('account');
  const [sheet, setSheet] = useState<string | null>(null);
  return <><ConsoleShell panel={panel} onNavigate={setPanel} onDeposit={() => setSheet('Deposit')} onProfile={() => setSheet('Your account')}>{panel === 'account' ? <Account view={{ balance: '$24,680.50', growth: '$184.20', values: [20100, 20400, 20600, 20800, 20700, 20900, 21200, 21600, 22000, 21900, 22200, 22500, 22900, 22800, 23100, 23300, 23200, 23400, 23800, 23700, 24000, 24400, 24500, 24680.5] }} onSend={() => setSheet('Send')} onReceive={() => setSheet('Receive')} onBalance={() => setSheet('Your balance')} onAssets={() => setPanel('assets')} onAsset={() => setPanel('assets')} onLedger={() => setPanel('ledger')} onGrowth={() => setSheet('Settlement growth')} /> : <section><h1>{panel.charAt(0).toUpperCase() + panel.slice(1)}</h1></section>}</ConsoleShell>{sheet && <Sheet title={sheet} onClose={() => setSheet(null)}><p className="body-copy">Demonstration account powered by Receiz 129.</p><button className="primary-button" onClick={() => setSheet(null)}>Back to account</button></Sheet>}</>;
}

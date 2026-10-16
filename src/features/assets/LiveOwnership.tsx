import { useEffect, useState } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { HeldDeposit } from '../../receiz/deposit-source';
import type { BankOperationInput, BankRail } from '../../receiz/bank-operations';
import { parseAmount } from '../../core/money';
import { AmountInput } from '../../components/AmountInput';
import { NativeOperation } from '../account/NativeOperation';

export function LiveOwnership({ identity, mode = 'send', initialDigest = '', onRefresh }: { identity: OpenIdentity; mode?: 'send' | 'sell' | 'buy' | 'redeem'; initialDigest?: string; onRefresh(): void }) {
  const [sources, setSources] = useState<HeldDeposit[]>([]), [assetDigest, setDigest] = useState(initialDigest), [quantity, setQuantity] = useState('1'), [recipient, setRecipient] = useState(''), [rail, setRail] = useState<BankRail>('reserve'), [buyer, setBuyer] = useState<'bank' | 'market'>('bank');
  useEffect(() => { let alive = true; void identity.listDeposits().then(items => { if (alive) setSources(items); }).catch(() => {}); return () => { alive = false; }; }, [identity]);
  const title = { send: 'Ownership transfer', sell: 'Sale', buy: 'Purchase', redeem: 'Redemption' }[mode];
  const input = (): BankOperationInput => {
    if (mode === 'redeem') return { kind: 'redeem-asset', assetDigest };
    const quantityMicro = parseAmount(quantity);
    if (mode === 'send') return { kind: 'send-ownership', assetDigest, quantityMicro, recipient };
    if (mode === 'sell') return { kind: 'sell-share', assetDigest, quantityMicro, rail, buyer };
    return { kind: 'buy-shares', assetDigest, quantityMicro, rail };
  };
  return <NativeOperation identity={identity} input={input} inputKey={JSON.stringify([mode, assetDigest, quantity, recipient, rail, buyer])} title={title} confirmLabel={{ send: 'Send ownership', sell: 'Confirm sale', buy: 'Confirm purchase', redeem: 'Confirm redemption' }[mode]} onRefresh={onRefresh}>
    <h1 className="sheet-hero">{{ send: 'Move ownership.', sell: 'Unlock what you need.', buy: 'Make it yours.', redeem: 'Redeem your asset.' }[mode]}</h1>
    <p className="body-copy">{mode === 'redeem' ? 'Review your ownership and the custodian’s release terms.' : 'Choose the exact ownership to move. Its original proof stays connected.'}</p>
    <label className="form-field"><span>Asset</span><select aria-label="Owned asset" value={assetDigest} onChange={event => setDigest(event.target.value)}><option value="">Choose an original source</option>{assetDigest && !sources.some(source => source.digest === assetDigest) && <option value={assetDigest}>Selected asset · {assetDigest.slice(0, 12)}…</option>}{sources.map(source => <option key={source.digest} value={source.digest}>{source.title}</option>)}</select></label>
    {mode !== 'redeem' && <AmountInput label={{ send: 'Ownership to send', sell: 'Ownership to sell', buy: 'Ownership to buy' }[mode]} value={quantity} onChange={setQuantity} suffix="units" />}
    {mode === 'send' && <label className="form-field"><span>Recipient</span><input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="Receiz ID or public username" maxLength={160} /></label>}
    {mode === 'sell' && <div className="segmented"><button className={buyer === 'bank' ? 'active' : ''} onClick={() => setBuyer('bank')}>Sell to bank</button><button className={buyer === 'market' ? 'active' : ''} onClick={() => setBuyer('market')}>Sell on Market</button></div>}
    {(mode === 'sell' || mode === 'buy') && <label className="form-field"><span>{mode === 'sell' ? 'Receive in' : 'Use value from'}</span><select value={rail} onChange={event => setRail(event.target.value as BankRail)}><option value="reserve">Reserve</option><option value="settlement">Settlement</option></select></label>}
  </NativeOperation>;
}

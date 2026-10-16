import { useState } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { PublicMarketItem } from '../../receiz/public-market';
import { bankOperationDollars, type BankRail } from '../../receiz/bank-operations';
import { AmountInput } from '../../components/AmountInput';
import { NativeOperation } from '../account/NativeOperation';

export function LiveExchange({ identity, items = [], onRefresh }: { identity: OpenIdentity; items?: PublicMarketItem[]; onRefresh(): void }) {
  const [amount, setAmount] = useState(''), [rail, setRail] = useState<BankRail>('reserve'), [assetDigest, setAssetDigest] = useState(''), [query, setQuery] = useState('');
  const candidates = items.filter(item => item.originalDigest && (!query || item.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()))).slice(0, 100);
  return <NativeOperation identity={identity} inputKey={JSON.stringify([amount, rail, assetDigest])} input={() => ({ kind: 'exchange', rail, amountUsdCents: bankOperationDollars(amount), assetDigest })} title="Exchange" confirmLabel="Confirm exchange" onRefresh={onRefresh}>
    <h1 className="sheet-hero">Change what<br />your value can do.</h1><p className="body-copy">Choose an asset. Review the exact amount you’ll receive.</p>
    <AmountInput label="Exchange amount" value={amount} onChange={setAmount} dollars />
    <label className="form-field"><span>From</span><select aria-label="Exchange from" value={rail} onChange={event => setRail(event.target.value as BankRail)}><option value="reserve">Reserve</option><option value="settlement">Settlement</option></select></label>
    {items.length > 100 && <label className="form-field"><span>Find an asset</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by name" /></label>}
    <label className="form-field"><span>To</span><select aria-label="Exchange to" value={assetDigest} onChange={event => setAssetDigest(event.target.value)}><option value="">Choose an asset</option>{assetDigest && !candidates.some(item => item.originalDigest === assetDigest) && <option value={assetDigest}>Selected source · {assetDigest.slice(0, 12)}…</option>}{candidates.map(item => <option key={item.id} value={item.originalDigest!}>{item.title}</option>)}</select></label>
    {!candidates.length && <p className="body-copy small-copy">No matching asset sources are available in this collection.</p>}
    <details className="transaction-proof-details"><summary>Use an original asset reference</summary><label className="form-field"><span>Asset source digest</span><input value={assetDigest} onChange={event => setAssetDigest(event.target.value.trim())} placeholder="Original source SHA-256" maxLength={64} spellCheck={false} /></label></details>
  </NativeOperation>;
}

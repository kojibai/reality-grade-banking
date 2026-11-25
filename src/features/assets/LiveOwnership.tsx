import { useState } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { BankOperationInput, BankRail } from '../../receiz/bank-operations';
import { parseAmount } from '../../core/money';
import { AmountInput } from '../../components/AmountInput';
import { NativeOperation } from '../account/NativeOperation';
import { SendHeldOwnership } from './SendHeldOwnership';
import { useHeldAssetSources } from './useHeldAssetSources';

type OwnershipProps = {
  identity: OpenIdentity;
  mode?: 'send' | 'sell' | 'buy' | 'redeem';
  initialDigest?: string;
  nativeAssetId?: string;
  onRefresh(): void;
};

export function LiveOwnership({ identity, mode = 'send', initialDigest = '', nativeAssetId, onRefresh }: OwnershipProps) {
  if (mode === 'send') return <SendHeldOwnership key={JSON.stringify([identity.binding?.artifactSha256, initialDigest])} identity={identity} initialDigest={initialDigest} onRefresh={onRefresh} />;
  return <TradeOwnership identity={identity} mode={mode} initialDigest={initialDigest} nativeAssetId={nativeAssetId} onRefresh={onRefresh} />;
}

function TradeOwnership({ identity, mode, initialDigest, nativeAssetId, onRefresh }: Omit<OwnershipProps, 'mode'> & { mode: 'sell' | 'buy' | 'redeem' }) {
  const { sources } = useHeldAssetSources(identity);
  const [assetDigest, setDigest] = useState(initialDigest ?? ''), [quantity, setQuantity] = useState('1'), [rail, setRail] = useState<BankRail>('reserve'), [buyer, setBuyer] = useState<'bank' | 'market'>(nativeAssetId?'market':'bank');
  const title = { sell: 'Sale', buy: 'Purchase', redeem: 'Redemption' }[mode];
  const input = (): BankOperationInput => {
    const selectedDigest=sources.find(source=>source.digest===assetDigest||source.nativeAsset?.assetId===(nativeAssetId??assetDigest))?.executionDigest??assetDigest;
    if (mode === 'redeem') return { kind: 'redeem-asset', assetDigest:selectedDigest };
    const quantityMicro = parseAmount(quantity);
    if (mode === 'sell') return { kind: 'sell-share', ...(nativeAssetId?{assetId:nativeAssetId}:{assetDigest:selectedDigest}), quantityMicro, rail, buyer };
    return { kind: 'buy-shares', ...(nativeAssetId?{assetId:nativeAssetId}:{assetDigest:selectedDigest}), quantityMicro, rail };
  };
  return <NativeOperation identity={identity} input={input} inputKey={JSON.stringify([mode, assetDigest, sources.find(source=>source.digest===assetDigest||source.nativeAsset?.assetId===(nativeAssetId??assetDigest))?.executionDigest, quantity, rail, buyer])} title={title} confirmLabel={{ sell: 'Confirm sale', buy: 'Confirm purchase', redeem: 'Confirm redemption' }[mode]} onRefresh={onRefresh}>
    <h1 className="sheet-hero">{{ sell: 'Unlock what you need.', buy: 'Make it yours.', redeem: 'Redeem your asset.' }[mode]}</h1>
    <p className="body-copy">{mode === 'redeem' ? 'Review your ownership and the custodian’s release terms.' : 'Choose the exact ownership to move. Its original proof stays connected.'}</p>
    {!nativeAssetId&&<label className="form-field"><span>Asset</span><select aria-label="Owned asset" value={assetDigest} onChange={event => setDigest(event.target.value)}><option value="">Choose an original source</option>{assetDigest && !sources.some(source => source.digest === assetDigest || source.nativeAsset?.assetId===(nativeAssetId??assetDigest)) && <option value={assetDigest}>Selected asset · {assetDigest.slice(0, 12)}…</option>}{sources.map(source => <option key={source.digest} value={source.nativeAsset?.assetId??source.digest}>{source.title}</option>)}</select></label>}
    {mode !== 'redeem' && <AmountInput label={{ sell: 'Ownership to sell', buy: 'Ownership to buy' }[mode]} value={quantity} onChange={setQuantity} suffix="units" />}
    {mode === 'sell' && !nativeAssetId && <div className="segmented"><button className={buyer === 'bank' ? 'active' : ''} onClick={() => setBuyer('bank')}>Sell to bank</button><button className={buyer === 'market' ? 'active' : ''} onClick={() => setBuyer('market')}>Sell on Market</button></div>}
    {(mode === 'sell' || mode === 'buy') && <label className="form-field"><span>{mode === 'sell' ? 'Receive in' : 'Use value from'}</span><select value={rail} onChange={event => setRail(event.target.value as BankRail)}><option value="reserve">Reserve</option><option value="settlement">Settlement</option></select></label>}
  </NativeOperation>;
}

import {nativeCurrencyPrice} from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import { useState } from 'react';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { BankOperationInput, BankRail } from '../../receiz/bank-operations';
import type {PublicCurrencyTerms} from '../../receiz/native-asset-public-binding';
import { formatMoney, parseAmount } from '../../core/money';
import { AmountInput } from '../../components/AmountInput';
import { NativeOperation } from '../account/NativeOperation';
import { SendHeldOwnership } from './SendHeldOwnership';
import type { PublicMarketItem } from '../../receiz/public-market';
import { useHeldAssetSources } from './useHeldAssetSources';

type OwnershipProps = {
  identity: OpenIdentity;
  mode?: 'send' | 'sell' | 'buy' | 'redeem';
  initialDigest?: string;
  nativeAssetId?: string;
  publicCurrency?: PublicCurrencyTerms;
  marketItems?: PublicMarketItem[];
  showcase?: PublicMarketItem[];
  onRefresh(): void;
};

export function LiveOwnership({ identity, mode = 'send', initialDigest = '', nativeAssetId, publicCurrency, marketItems, showcase, onRefresh }: OwnershipProps) {
  if (mode === 'send') return <SendHeldOwnership key={JSON.stringify([identity.binding?.artifactSha256, initialDigest])} identity={identity} initialDigest={initialDigest} marketItems={marketItems} showcase={showcase} onRefresh={onRefresh} />;
  return <TradeOwnership identity={identity} mode={mode} initialDigest={initialDigest} nativeAssetId={nativeAssetId} publicCurrency={publicCurrency} onRefresh={onRefresh} />;
}

function TradeOwnership({ identity, mode, initialDigest, nativeAssetId, publicCurrency, onRefresh }: Omit<OwnershipProps, 'mode'> & { mode: 'sell' | 'buy' | 'redeem' }) {
  const { sources: held } = useHeldAssetSources(identity);
  const heldCurrency=held.find(source=>source.nativeAsset?.currency&&source.nativeAsset.assetId===nativeAssetId);
  const heldInstrument = heldCurrency?.nativeAsset;
  const currency = publicCurrency ?? (heldInstrument?.currency ? {
    symbol: heldInstrument.symbol, supplyMicro: heldInstrument.supplyMicro, priceUsdCentsPerUnit: nativeCurrencyPrice(heldInstrument.currency),
    poolPricing: heldInstrument.currency.policy.kind === 'constant-product-pool',
  } : null);
  const sources=held.filter(source=>!source.nativeAsset?.currency||source===heldCurrency);
  const [assetDigest, setDigest] = useState(initialDigest ?? ''), [quantity, setQuantity] = useState('1'), [rail, setRail] = useState<BankRail>('reserve'), [buyer, setBuyer] = useState<'bank' | 'market'>(nativeAssetId?'market':'bank');
  const title = currency && mode==='sell' ? 'sale to currency pool' : { sell: 'Sale', buy: 'Purchase', redeem: 'Redemption' }[mode];
  const input = (): BankOperationInput => {
    const selectedDigest=sources.find(source=>source.digest===assetDigest||source.nativeAsset?.assetId===(nativeAssetId??assetDigest))?.executionDigest??assetDigest;
    if (mode === 'redeem') return { kind: 'redeem-asset', assetDigest:selectedDigest };
    const quantityMicro = parseAmount(quantity);
    if (currency && nativeAssetId) {
      if (BigInt(quantityMicro) % 1000000n !== 0n) throw Error('Enter a whole number of units.');
      if(mode==='buy')return {kind:'buy-currency',assetId:nativeAssetId,quantityMicro};
      return { kind:'sell-share', assetId:nativeAssetId, quantityMicro, rail:'reserve', buyer:'currency-pool' };
    }
    if (mode === 'sell') return { kind: 'sell-share', ...(nativeAssetId?{assetId:nativeAssetId}:{assetDigest:selectedDigest}), quantityMicro, rail, buyer };
    return { kind: 'buy-shares', ...(nativeAssetId?{assetId:nativeAssetId}:{assetDigest:selectedDigest}), quantityMicro, rail };
  };
  return <NativeOperation identity={identity} input={input} inputKey={JSON.stringify([mode, assetDigest, sources.find(source=>source.digest===assetDigest||source.nativeAsset?.assetId===(nativeAssetId??assetDigest))?.executionDigest, quantity, rail, buyer, currency])} title={title} confirmLabel={{ sell: 'Confirm sale', buy: 'Confirm purchase', redeem: 'Confirm redemption' }[mode]} onRefresh={onRefresh} ownership={heldCurrency&&currency?{title:heldCurrency.title,symbol:currency.symbol}:undefined}>
    <h1 className="sheet-hero">{{ sell: 'Unlock what you need.', buy: 'Make it yours.', redeem: 'Redeem your asset.' }[mode]}</h1>
    <p className="body-copy">{currency ? currency.poolPricing ? 'The pool prices your whole-unit trade. Review the exact quote before approving.' : mode==='sell'?'Return whole units for their share of the currency pool. Review the exact proceeds before selling.':`Purchase whole units at ${formatMoney(currency.priceUsdCentsPerUnit)} each from your available balance.` : mode === 'redeem' ? 'Review your ownership and the custodian’s release terms.' : 'Choose the exact ownership to move. Its original proof stays connected.'}</p>
    {!nativeAssetId&&<label className="form-field"><span>Asset</span><select aria-label="Owned asset" value={assetDigest} onChange={event => setDigest(event.target.value)}><option value="">Choose an original source</option>{assetDigest && !sources.some(source => source.digest === assetDigest || source.nativeAsset?.assetId===(nativeAssetId??assetDigest)) && <option value={assetDigest}>Selected asset · {assetDigest.slice(0, 12)}…</option>}{sources.map(source => <option key={source.digest} value={source.nativeAsset?.assetId??source.digest}>{source.title}</option>)}</select></label>}
    {mode !== 'redeem' && <AmountInput label={currency ? mode==='sell'?'Whole units to return':'Whole units to buy' : { sell: 'Ownership to sell', buy: 'Ownership to buy' }[mode]} value={quantity} onChange={setQuantity} suffix={currency?.symbol??"units"} />}
    {mode === 'sell' && !nativeAssetId && <div className="segmented"><button className={buyer === 'bank' ? 'active' : ''} onClick={() => setBuyer('bank')}>Sell to bank</button><button className={buyer === 'market' ? 'active' : ''} onClick={() => setBuyer('market')}>Sell on Market</button></div>}
    {!currency && (mode === 'sell' || mode === 'buy') && <label className="form-field"><span>{mode === 'sell' ? 'Receive in' : 'Use value from'}</span><select value={rail} onChange={event => setRail(event.target.value as BankRail)}><option value="reserve">Reserve</option><option value="settlement">Settlement</option></select></label>}
  </NativeOperation>;
}

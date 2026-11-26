import { useSyncExternalStore } from 'react';
import { CurrencyMark } from '../../components/CurrencyMark';
import { formatMoney, formatUnits } from '../../core/money';
import { retainedAssetPublicationArtwork, retainedDiscoveredPublicCatalog, subscribeAssetPublicationAdmissions } from '../../receiz/asset-publication-adoption';
import type { PublicCurrencyActivity } from '../../receiz/currency-ledger-view';
import { CurrencyPriceHistory } from '../market/CurrencyPriceHistory';

export function LedgerCurrencyArtwork({ currency }: {currency: PublicCurrencyActivity}) {
  const catalog = useSyncExternalStore(subscribeAssetPublicationAdmissions,retainedDiscoveredPublicCatalog,()=>null);
  const listing = catalog?.items.find(item=>item.nativeAsset?.id===currency.assetId && item.nativeAsset.currency?.symbol===currency.symbol);
  const artwork = listing?.originalDigest
    ? retainedAssetPublicationArtwork(listing.originalDigest,listing.ownerUsername??undefined) : null;
  return <CurrencyMark symbol={currency.symbol} artwork={artwork} />;
}

export function LedgerCurrencyDetails({ currency, at, kind }: {currency: PublicCurrencyActivity; at:string|null; kind:string}) {
  return <section aria-label={`${currency.symbol} details`}>
    <div className="detail-list">
      {currency.quantityMicro&&<div><span>Units recorded</span><strong>{formatUnits(currency.quantityMicro)} {currency.symbol}</strong></div>}
      {currency.tradeUsdCents!==undefined&&<div><span>{kind==='asset.sell-currency'?'Sale proceeds':'Amount paid'}</span><strong>{formatMoney(currency.tradeUsdCents)}</strong></div>}
      <div><span>Purchase price at this event</span><strong>{formatMoney(currency.priceUsdCentsPerUnit)} per {currency.symbol}</strong></div>
    </div>
    <CurrencyPriceHistory assetId={currency.assetId} symbol={currency.symbol}
      opening={{priceUsdCentsPerUnit:currency.priceUsdCentsPerUnit,at}}/>
  </section>;
}

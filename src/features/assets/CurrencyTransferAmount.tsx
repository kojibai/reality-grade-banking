import { formatMoney, formatUnits } from '../../core/money';

export type CurrencyTransferDetails = {
  quantityMicro: string;
  estimatedUsdCents?: string;
  recipient: string | null;
  feeUsdCents: string;
  retentionWarning?: string;
};

export function CurrencyTransferAmount({quantityMicro, symbol, estimatedUsdCents}: {
  quantityMicro: string;
  symbol: string;
  estimatedUsdCents?: string;
}) {
  const [whole, fraction] = formatUnits(quantityMicro).split('.');
  const units = new Intl.NumberFormat(undefined).format(BigInt(whole)) + (fraction ? '.' + fraction : '');
  return <div className="currency-transfer-amount">
    <div><strong>{units}</strong><span> {symbol}</span></div>
    {estimatedUsdCents !== undefined && <p>Estimated market value {formatMoney(estimatedUsdCents)}</p>}
  </div>;
}

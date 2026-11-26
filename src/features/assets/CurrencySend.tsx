import { lazy, Suspense, useState, useSyncExternalStore } from 'react';
import { Check } from 'lucide-react';
import { AmountInput } from '../../components/AmountInput';
import { CurrencyMark } from '../../components/CurrencyMark';
import { InlineOpening } from '../../components/InlineOpening';
import { formatMoney, formatUnits, parseAmount, SCALE } from '../../core/money';
import { nativeCurrencyPrice, nativeCurrencyQuantityIncrement } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { heldCurrencyPriceHistory, subscribeCurrencyPriceHistory } from '../../receiz/currency-ledger-view';
import { currencyPresets } from '../../receiz/currency-presets';
import type { HeldDeposit } from '../../receiz/deposit-source';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { PublicMarketItem } from '../../receiz/public-market';
import { shareCapitalizationUsdCents } from '../../receiz/market-share-inventory';
import { BankExecutionRecoveryPanel } from '../account/BankExecutionRecoveryPanel';
import { NativeOperation } from '../account/NativeOperation';
import { RecipientInput } from '../account/RecipientInput';
import { usePublicObjectArtwork } from '../media/usePublicObjectArtwork';
import { CurrencyTransferAmount, type CurrencyTransferDetails } from './CurrencyTransferAmount';
import './currency-send.css';

const IssueCurrencyNote = lazy(() => import('../notes/CurrencyNotes').then(module => ({default:module.IssueCurrencyNote})));
type CurrencyHolding = HeldDeposit & { executionDigest: string; nativeAsset: NonNullable<HeldDeposit['nativeAsset']> };
type Entry = 'units' | 'usd';

function exactCurrencyQuantity(value: string, entry: Entry, unitPrice: string, increment: bigint) {
  try {
    if (entry === 'units') {
      const quantity = BigInt(parseAmount(value));
      return quantity % increment === 0n ? quantity : null;
    }
    if (unitPrice !== '0') return BigInt(bankOperationDollars(value)) * SCALE / BigInt(unitPrice) / increment * increment;
  } catch { /* Keep the amount editable until review. */ }
  return null;
}

function editableDollars(cents: string) {
  return (BigInt(cents) / 100n).toString() + '.' + (BigInt(cents) % 100n).toString().padStart(2, '0');
}

export function CurrencySend({identity, holding, selected, listing, onBack, onRefresh}: {
  identity: OpenIdentity;
  holding: CurrencyHolding | null;
  selected: CurrencyHolding;
  listing?: PublicMarketItem;
  onBack(): void;
  onRefresh(): void;
}) {
  const [entry, setEntry] = useState<Entry>('units');
  const [value, setValue] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientUid, setRecipientUid] = useState('');
  const [note, showNote] = useState(false);
  const [receipt, setReceipt] = useState<CurrencyTransferDetails | null>(null);
  const [failedArtwork, setFailedArtwork] = useState<string | null>(null);
  const artwork = usePublicObjectArtwork(listing?.artworkUrl, listing);
  const {nativeAsset: asset, title} = holding ?? selected;
  const currency = asset.currency!;
  const symbol = asset.symbol;
  const preset = currencyPresets[currency.policy.preset ?? 'currency'].label;
  const heldPrice = nativeCurrencyPrice(currency);
  const price = useSyncExternalStore(subscribeCurrencyPriceHistory, () => {
    const latest = heldCurrencyPriceHistory(asset.assetId, symbol).at(-1);
    return latest && BigInt(latest.kaiUPulse) > BigInt(asset.sourceKaiUPulse) ? latest.usdCents : heldPrice;
  }, () => heldPrice);
  const increment = nativeCurrencyQuantityIncrement(currency.policy);
  const wholeUnits = increment === SCALE;
  const units = exactCurrencyQuantity(value, entry, price, increment);
  const quantityMicro = units?.toString();
  const estimate = quantityMicro && units !== 0n && price !== '0'
    ? shareCapitalizationUsdCents(price, quantityMicro) : undefined;
  const roundsDown = entry === 'usd' && estimate !== undefined && estimate !== bankOperationDollars(value);
  const available = holding ? formatUnits(holding.nativeAsset.quantityMicro) : '0';

  function switchEntry(next: Entry) {
    if (next === entry) return;
    setValue(units !== null && units > 0n
      ? next === 'units' ? formatUnits(units.toString()) : editableDollars(shareCapitalizationUsdCents(price,units.toString()))
      : '');
    setEntry(next);
  }

  const identityBlock = <div className="currency-send-identity">
    <CurrencyMark symbol={symbol} artwork={artwork === failedArtwork ? null : artwork}
      onArtworkError={() => setFailedArtwork(artwork ?? null)}/>
    <div><strong>{title}</strong><p>{symbol} · {preset}{currency.governanceCharterSha256 && ' · Community governed'}</p></div>
  </div>;

  if (receipt) return <section className="currency-send-receipt" aria-live="polite">
    {identityBlock}
    <h1 className="currency-send-receipt-title"><Check size={19} aria-hidden="true"/>Currency sent.</h1>
    <CurrencyTransferAmount {...receipt} symbol={symbol}/>
    <div className="detail-list">
      {receipt.recipient && <div><span>To</span><strong>{receipt.recipient}</strong></div>}
      <div><span>Fee</span><strong>{formatMoney(receipt.feeUsdCents)}</strong></div>
    </div>
    <p className="body-copy small-copy">Transaction proof saved on this device.</p>
    {receipt.retentionWarning && <p className="body-copy small-copy" role="status">{receipt.retentionWarning}</p>}
    <BankExecutionRecoveryPanel identity={identity} onRefresh={onRefresh}/>
    <button type="button" className="secondary-button" onClick={onBack}>Send another</button>
  </section>;

  if (holding && note) return <>
    <button type="button" className="back-link" onClick={() => showNote(false)}>Back to send</button>
    <Suspense fallback={<InlineOpening label="Opening currency note"/>}>
      <IssueCurrencyNote identity={identity} asset={holding} onRefresh={onRefresh}/>
    </Suspense>
  </>;

  return <section className="currency-send">
    <button type="button" className="back-link" onClick={onBack}>All holdings</button>
    {identityBlock}
    <NativeOperation identity={identity} title="Currency transfer" confirmLabel="Send currency" onRefresh={onRefresh}
      ownership={{title,symbol}} currencyTransfer={{unitPriceUsdCents:price,onCommitted:setReceipt}}
      inputKey={JSON.stringify([holding?.executionDigest, entry, value, recipient, recipientUid])}
      input={() => {
        if (!holding) throw Error('This currency is no longer available in your holdings.');
        if (entry === 'usd' && units === 0n) {
          const minimum = (BigInt(price)*increment+SCALE-1n)/SCALE;
          throw Error(`Enter at least ${formatMoney(minimum.toString())} for ${wholeUnits?'one':formatUnits(increment.toString())} ${symbol}.`);
        }
        if (!quantityMicro || units === 0n) throw Error(entry === 'units'
          ? wholeUnits?'Enter a positive whole number of units.':'Enter units in increments of 0.001.'
          : 'Enter a valid amount in USD.');
        if (BigInt(quantityMicro) > BigInt(holding.nativeAsset.quantityMicro)) throw Error('Enter a quantity within your available units.');
        return {kind:'send-ownership',assetDigest:holding.executionDigest,quantityMicro,recipient:recipientUid || recipient};
      }}>
      <div className="currency-send-amount">
        <div className="currency-send-amount-top">
          <span>{available} {symbol} available</span>
          <div className="currency-send-denomination" role="group" aria-label="Enter amount in">
            <button type="button" aria-pressed={entry === 'units'} onClick={() => switchEntry('units')}>{symbol}</button>
            <button type="button" aria-pressed={entry === 'usd'} disabled={price === '0'} onClick={() => switchEntry('usd')}>USD</button>
          </div>
        </div>
        <div className="ownership-send-amount">
          <AmountInput key={entry} label={entry === 'units' ? (wholeUnits?'Whole units to send':'Units to send') : 'Amount in USD'}
            value={value} onChange={setValue} suffix={entry === 'units' ? symbol : undefined}
            dollars={entry === 'usd'} inputMode={entry === 'units' && wholeUnits ? 'numeric' : 'decimal'}/>
          <button type="button" className="secondary-button" onClick={() => setValue(entry === 'units' ? available
            : editableDollars(shareCapitalizationUsdCents(price, holding?.nativeAsset.quantityMicro ?? '0')))}>All</button>
        </div>
        {entry === 'usd' && quantityMicro && <p className="currency-send-equivalent" role="status">
          {units === 0n ? `One ${symbol} is ${formatMoney(price)}` : `You send ${formatUnits(quantityMicro)} ${symbol}`}
        </p>}
        {estimate !== undefined && <p className="currency-send-estimate">Estimated market value {formatMoney(estimate)}</p>}
        {roundsDown && <p className="small-copy body-copy">Rounded down to {wholeUnits?'whole':'0.001'} {symbol} units.</p>}
        {asset.lockedQuantityMicro !== '0' && <p className="small-copy body-copy">{formatUnits(asset.lockedQuantityMicro)} {symbol} committed to offers</p>}
      </div>
      <RecipientInput identity={identity} value={recipient} placeholder="Receiz ID or public username"
        onChange={next => {setRecipient(next);setRecipientUid('');}}
        onSelect={person => {setRecipient(person.username);setRecipientUid(person.userId);}}/>
      {holding && identity.currencyNotes && <button type="button" className="text-button" onClick={() => showNote(true)}>Create currency note</button>}
    </NativeOperation>
  </section>;
}

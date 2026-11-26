import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AmountInput } from '../../components/AmountInput';
import { InlineOpening } from '../../components/InlineOpening';
import { formatMoney, formatUnits } from '../../core/money';
import { positionValue, portfolioItem } from '../../receiz/market-portfolio-value';
import type { MarketPosition } from '../../receiz/market-portfolio';
import { nativeAssetSupplyMicro } from '../../receiz/native-asset-protocol';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { OwnershipShareTransfer, ShareSendResult, ShareSendReview } from '../../receiz/ownership-share-transfer';
import type { PublicMarketCatalog, PublicMarketItem } from '../../receiz/public-market';
import { RecipientInput } from '../account/RecipientInput';

const CertificateManager = lazy(() => import('../certificates/CertificateManager').then(module => ({default:module.CertificateManager})));

export function SendMarketShares({identity, position, marketItems, onRefresh}: {
  identity: OpenIdentity;
  position?: MarketPosition;
  marketItems: readonly PublicMarketItem[];
  onRefresh(): void;
}) {
  const [quantity, setQuantity] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientUid, setRecipientUid] = useState('');
  const [review, setReview] = useState<ShareSendReview | null>(null);
  const [result, setResult] = useState<ShareSendResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(!position);
  const [error, setError] = useState('');
  const [certificate, setCertificate] = useState(false);
  const running = useRef(false);
  const active = useRef(true);
  const api = useRef<OwnershipShareTransfer | null>(null);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const available = position ? formatUnits(position.shareQuantityMicro) : '';
  let quantityMicro = '';
  try { quantityMicro = nativeAssetSupplyMicro(quantity.trim()); } catch { /* Wait for a valid amount. */ }
  const withinHolding = position && quantityMicro && BigInt(quantityMicro) <= BigInt(position.shareQuantityMicro);
  const currentValue = (amount: string) => position && amount ? positionValue(
    {...position, shareQuantityMicro:amount, lastPriceUsdCents:position.lastPriceUsdCents ?? null, costBasisUsdCents:null},
    portfolioItem(position, {items:marketItems} as PublicMarketCatalog),
  ).valueUsdCents : null;
  const estimate = currentValue(review?.quantityMicro ?? (withinHolding ? quantityMicro : ''));

  async function run(work: (transfer: OwnershipShareTransfer) => Promise<void>) {
    if (running.current || !identity.ownershipShares) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      api.current ??= await identity.ownershipShares();
      await work(api.current);
    } catch (cause) {
      if (!active.current) return;
      const code = cause instanceof Error ? cause.message : '';
      setError(/RECIPIENT/.test(code) ? 'Check the recipient’s Receiz ID and try again.'
        : /POSITION|QUANTITY|HOLDING|SOURCE_HEAD/.test(code) ? 'Your available shares may have changed. Check your holding and try again.'
        : 'The transfer could not be confirmed. Check your connection and try again.');
    } finally {
      running.current = false;
      if (active.current) setBusy(false);
    }
  }

  function complete(next: ShareSendResult) {
    if (!active.current) return;
    setResult(next);
    setReview(null);
    setPending(next.status === 'submitted');
    if (next.status === 'committed') onRefresh();
  }

  if (certificate && position) return <>
    <button type="button" className="back-link" onClick={() => setCertificate(false)}>Back to send</button>
    <Suspense fallback={<InlineOpening label="Opening share certificate"/>}>
      <CertificateManager embedded identity={identity} position={position} onClose={() => setCertificate(false)} onRefresh={onRefresh}/>
    </Suspense>
  </>;

  return <section aria-busy={busy}>
    <h1 className="sheet-hero">{result?.status === 'committed' ? 'Shares sent.' : 'Send shares.'}</h1>
    {result?.status === 'committed' ? <div className="detail-list">
      <div><span>Shares sent</span><strong>{formatUnits(result.quantityMicro)} · {result.title}</strong></div>
      <div><span>Recipient</span><strong>{result.recipient}</strong></div>
    </div> : pending ? <>
      <p className="body-copy" role="status">Your signed transfer is saved. Continue to confirm its result.</p>
      <button type="button" className="primary-button" disabled={busy} onClick={() => void run(async transfer => complete(await transfer.recover()))}>Resume transfer</button>
    </> : review ? <>
      <div className="detail-list">
        <div><span>Recipient</span><strong>{review.recipient}</strong></div>
        <div><span>You send</span><strong>{formatUnits(review.quantityMicro)} shares · {review.title}</strong></div>
        {estimate !== null && <div><span>Estimated market value</span><strong>{formatMoney(estimate)}</strong></div>}
      </div>
      <button type="button" className="primary-button" disabled={busy} onClick={() => void run(async transfer => complete(await transfer.execute(review)))}>Send shares</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => {api.current?.discard(review);setReview(null);}}>Edit details</button>
    </> : position && <>
      <div className="holding-panel"><strong>{position.title}</strong><p>{available} shares available</p></div>
      <div className="ownership-send-amount">
        <AmountInput label="Shares to send" value={quantity} onChange={setQuantity} suffix="Shares"/>
        <button type="button" className="secondary-button" onClick={() => setQuantity(available)}>All</button>
      </div>
      {estimate !== null && <p className="body-copy small-copy">Estimated market value {formatMoney(estimate)}</p>}
      <RecipientInput identity={identity} value={recipient} onChange={value => {setRecipient(value);setRecipientUid('');}}
        onSelect={person => {setRecipient(person.username);setRecipientUid(person.userId);}}/>
      <button type="button" className="primary-button" disabled={busy || !withinHolding || !recipient.trim()} onClick={() => void run(async transfer => {
        if (await transfer.pending()) { if (active.current) setPending(true); return; }
        const next = await transfer.prepare({positionId:position.id, marketItemId:position.marketItemId, quantityMicro, recipient:recipientUid || recipient.trim()});
        if (active.current) setReview(next);
      })}>Review send</button>
      {identity.shareCertificates && <button type="button" className="text-button" disabled={busy} onClick={() => setCertificate(true)}>Create share certificate</button>}
    </>}
    {busy && <InlineOpening compact label="Checking your share transfer"/>}
    {error && <p className="error-message" role="status">{error}</p>}
  </section>;
}

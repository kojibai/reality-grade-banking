import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ChevronRight, FileCheck2, Layers, Search } from 'lucide-react';
import { InlineOpening } from '../../components/InlineOpening';
import { AmountInput } from '../../components/AmountInput';
import { CurrencyMark } from '../../components/CurrencyMark';
import { AssetsRowArtwork } from './AssetsRowArtwork';
import { formatUnits } from '../../core/money';
import { nativeAssetSupplyMicro } from '../../receiz/native-asset-protocol';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { MarketPosition } from '../../receiz/market-portfolio';
import { readOpenPortfolio, subscribeOpenPortfolio } from '../../receiz/market-portfolio-presentation';
import type { HeldDeposit } from '../../receiz/deposit-source';
import type { PublicMarketItem } from '../../receiz/public-market';
import { RecipientInput } from '../account/RecipientInput';
import { NativeOperation } from '../account/NativeOperation';
import {useHeldOriginalPieces} from './useHeldOriginalPieces';
import { useHeldAssetSources } from './useHeldAssetSources';
import { CurrencySend } from './CurrencySend';
import './ownership-send.css';

type SendableHolding = HeldDeposit & {
  executionDigest: string;
  nativeAsset: NonNullable<HeldDeposit['nativeAsset']>;
};

function isSendableHolding(source: HeldDeposit): source is SendableHolding {
  return !!source.executionDigest && source.nativeAsset?.status === 'active'
    && source.nativeAsset.quantityMicro !== '0';
}

const pageSize = 24;
const SendOriginal = lazy(() => import('./SendOriginal').then(module => ({default: module.SendOriginal})));
const categories = {shares: 'Shares', currencies: 'Currencies', originals: 'Originals'} as const;
type Category = keyof typeof categories;
const SendMarketShares = lazy(() => import('./SendMarketShares').then(module => ({default:module.SendMarketShares})));
const emptyItems: PublicMarketItem[] = [];
const originalDigestPattern = /^[a-f0-9]{64}$/u;

export function SendHeldOwnership({ identity, initialDigest, marketItems = emptyItems, showcase = emptyItems, onRefresh }: {
  identity: OpenIdentity;
  initialDigest: string;
  marketItems?: readonly PublicMarketItem[];
  showcase?: PublicMarketItem[];
  onRefresh(): void;
}) {
  const { sources, busy, error } = useHeldAssetSources(identity, true, 0, identity.readHeldDeposits);
  const retainedPieces = useHeldOriginalPieces(identity, true, true);
  const canSendOriginals = Boolean(identity.originalPieces);
  const accountUid = identity.walletReceivingAddress?.() ?? identity.knownWallet?.()?.wallet.userId;
  const {heldPieces, originals, showcaseOriginals} = useMemo(() => {
    const heldPieces = retainedPieces.filter(piece => piece.ownedBytes > 0);
    const knownDigests = new Set(retainedPieces.map(piece => piece.originalSha256));
    const originals = canSendOriginals ? sources.filter(source => source.kind === 'proof' && !source.nativeAsset
      && source.bytes?.length && !knownDigests.has(source.digest)) : [];
    for (const source of originals) knownDigests.add(source.digest);
    const showcaseOriginals = canSendOriginals ? showcase.filter(item => {
      const owner = item.admittedOwnerUserId ?? item.ownerIdentity?.userId;
      const digest = item.originalDigest?.toLowerCase();
      if (!digest || !originalDigestPattern.test(digest) || knownDigests.has(digest)
        || (owner && accountUid && owner !== accountUid)) return false;
      knownDigests.add(digest);
      return true;
    }) : [];
    return {heldPieces, originals, showcaseOriginals};
  }, [accountUid, canSendOriginals, retainedPieces, showcase, sources]);
  const openPortfolio = useSyncExternalStore(subscribeOpenPortfolio, readOpenPortfolio, () => null);
  const portfolio = openPortfolio && openPortfolio.owner === identity.binding?.artifactSha256 ? openPortfolio.portfolio : identity.knownMarketPortfolio?.();
  const [marketShare, setMarketShare] = useState<MarketPosition | null>(null);
  const [recoverShare, setRecoverShare] = useState(false), [pendingShare, setPendingShare] = useState(false);
  const [currencySelection, setCurrencySelection] = useState<SendableHolding | null>(null);
  useEffect(() => {
    if (!identity.pendingOwnershipShare) return;
    let current = true;
    void identity.pendingOwnershipShare().then(pending => { if (current) setPendingShare(pending); }).catch(() => {});
    return () => { current = false; };
  }, [identity, marketShare, recoverShare]);
  const [selectedId, setSelectedId] = useState(initialDigest), [search, setSearch] = useState('');
  const [limit, setLimit] = useState(pageSize), [quantity, setQuantity] = useState('1');
  const [recipient, setRecipient] = useState(''), [recipientUid, setRecipientUid] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [pinned, setPinned] = useState<{source?:HeldDeposit; showcase?:PublicMarketItem; piece?:(typeof heldPieces)[number]} | null>(null);
  const positions = useMemo(() => sources.filter(isSendableHolding), [sources]);
  const selected = selectedId ? positions.find(source => source.nativeAsset.assetId === selectedId || source.digest === selectedId) : undefined;
  const selectedOriginal = pinned?.source ?? (selectedId ? originals.find(source => source.digest === selectedId) : undefined);
  const selectedShowcase = pinned?.showcase ?? (selectedId ? showcaseOriginals.find(item => item.originalDigest?.toLowerCase() === selectedId) : undefined);
  const selectedPiece = pinned ? pinned.piece : selectedId
    ? heldPieces.find(source => source.proofDigest === selectedId || source.originalSha256 === selectedId) : undefined;
  const selectedCurrency = selected?.nativeAsset.currency ? selected : null;
  useEffect(() => {
    if (selectedCurrency) setCurrencySelection(current =>
      current?.nativeAsset.assetId === selectedCurrency.nativeAsset.assetId ? current : selectedCurrency);
  }, [selectedCurrency]);

  function currencyListing(assetId: string, symbol: string) {
    const matches = (item: PublicMarketItem) => item.nativeAsset?.id === assetId && item.nativeAsset.currency?.symbol === symbol;
    const market = marketItems.find(matches);
    return market?.artworkUrl ? market : showcase.find(matches) ?? market;
  }

  if (marketShare || recoverShare) return <>
    <button type="button" className="back-link" onClick={() => {setMarketShare(null);setRecoverShare(false);}}>All holdings</button>
    <Suspense fallback={<InlineOpening label="Opening share transfer"/>}>
      <SendMarketShares identity={identity} position={portfolio?.positions.find(position => position.id === marketShare?.id) ?? marketShare ?? undefined} marketItems={marketItems} onRefresh={onRefresh}/>
    </Suspense>
  </>;

  if (selectedOriginal || selectedPiece || selectedShowcase) return <>
    <button type="button" className="back-link" onClick={() => {setSelectedId('');setPinned(null);}}>All holdings</button>
    <Suspense fallback={<InlineOpening label="Opening your Original"/>}>
      <SendOriginal key={selectedId} identity={identity} source={selectedOriginal} held={selectedPiece} showcase={selectedShowcase} onRefresh={onRefresh}/>
    </Suspense>
  </>;

  const currency = selectedCurrency ?? currencySelection;
  if (currency) return <CurrencySend key={currency.nativeAsset.assetId} identity={identity} holding={selectedCurrency}
    selected={currency} listing={currencyListing(currency.nativeAsset.assetId, currency.nativeAsset.symbol)}
    onBack={() => {setSelectedId('');setCurrencySelection(null);setCategory('currencies');}} onRefresh={onRefresh}/>;

  if (selected) {
    const { nativeAsset, executionDigest, title } = selected;
    const available = formatUnits(nativeAsset.quantityMicro);
    return <NativeOperation identity={identity} title="Ownership transfer" confirmLabel="Send ownership" onRefresh={onRefresh}
      ownership={{ title, symbol: nativeAsset.symbol }}
      inputKey={JSON.stringify([executionDigest, quantity, recipient, recipientUid])}
      input={() => {
        let quantityMicro: string;
        try {
          quantityMicro = nativeAssetSupplyMicro(quantity.trim());
        } catch {
          throw Error('Enter a positive quantity with up to 6 decimal places.');
        }
        if (BigInt(quantityMicro) > BigInt(nativeAsset.quantityMicro)) {
          throw Error('Enter a quantity within your available units.');
        }
        return { kind: 'send-ownership', assetDigest: executionDigest, quantityMicro, recipient: recipientUid || recipient };
      }}>
      <button type="button" className="back-link" onClick={() => setSelectedId('')}>All holdings</button>
      <div className="holding-panel">
        <span>Send ownership</span>
        <strong>{title}</strong>
        <p>{available} {nativeAsset.symbol} available</p>
        {nativeAsset.lockedQuantityMicro !== '0' && <p>{formatUnits(nativeAsset.lockedQuantityMicro)} {nativeAsset.symbol} committed to offers</p>}
      </div>
      <div className="ownership-send-amount">
        <AmountInput label="Ownership to send" value={quantity} onChange={setQuantity} suffix={nativeAsset.symbol} />
        <button type="button" className="secondary-button" onClick={() => setQuantity(available)}>All</button>
      </div>
      <RecipientInput identity={identity} value={recipient} placeholder="Receiz ID or public username"
        onChange={value => {setRecipient(value);setRecipientUid('');}}
        onSelect={person => {setRecipient(person.username);setRecipientUid(person.userId);}}/>
    </NativeOperation>;
  }

  const query = search.trim().toLowerCase();
  const marketPositions = identity.ownershipShares ? portfolio?.positions ?? [] : [];
  const offered: Category[] = [];
  if (marketPositions.length || positions.some(source => !source.nativeAsset.currency)) offered.push('shares');
  if (originals.length || heldPieces.length || showcaseOriginals.length) offered.push('originals');
  if (positions.some(source => source.nativeAsset.currency)) offered.push('currencies');
  const visibleCategory = category && offered.includes(category) ? category : offered[0];
  const matching = visibleCategory === 'originals' ? [] : positions.filter(source =>
    Boolean(source.nativeAsset.currency) === (visibleCategory === 'currencies')
    && (!query || [source.title, source.nativeAsset.symbol, source.nativeAsset.assetId].some(value => value.toLowerCase().includes(query))));
  const matchingMarket = visibleCategory !== 'shares' ? [] : query
    ? marketPositions.filter(position => [position.title, position.marketItemId].some(value => value.toLowerCase().includes(query))) : marketPositions;
  const matchingOriginals = visibleCategory !== 'originals' ? [] : [
    ...originals.map(source => ({id: source.digest, title: source.title, source})),
    ...showcaseOriginals.map(item => ({id: item.originalDigest!.toLowerCase(), title: item.title, showcase: item})),
    ...heldPieces.map(piece => ({id: piece.proofDigest, title: piece.filename, piece})),
  ].filter(original => !query || original.title.toLowerCase().includes(query) || original.id.toLowerCase().includes(query));
  const matchCount = matching.length + matchingMarket.length + matchingOriginals.length;
  const available = positions.length + marketPositions.length + originals.length + heldPieces.length + showcaseOriginals.length;

  return <section>
    <h1 className="sheet-hero">Send ownership.</h1>
    {pendingShare && <button type="button" className="text-button" onClick={() => setRecoverShare(true)}>Resume share transfer</button>}
    {available > 0 && <>
      {offered.length > 1 && <div className="segmented ownership-send-types" aria-label="Holding type" role="group">
        {offered.map(value => <button key={value} type="button" aria-pressed={visibleCategory === value}
          className={visibleCategory === value ? 'active' : ''} onClick={() => { setCategory(value); setLimit(pageSize); }}>
          {categories[value]}
        </button>)}
      </div>}
      <label className="search-field ownership-send-search"><Search size={17} aria-hidden="true" /><input
        type="search" aria-label="Search holdings" placeholder="Search holdings" value={search}
        onChange={event => { setSearch(event.target.value); setLimit(pageSize); }} /></label>
      <div className="rows-surface">{matching.slice(0, limit).map((source,index) => {
        const { assetId, quantityMicro, symbol, currency } = source.nativeAsset;
        const listing = currency ? currencyListing(assetId, symbol) : undefined;
        return <button key={assetId} type="button" className="asset-row" onClick={() => {
          setSelectedId(assetId);
          if (currency) setCurrencySelection(source);
          setRecipient('');
          setRecipientUid('');
          setQuantity(BigInt(quantityMicro) < 1_000_000n ? formatUnits(quantityMicro) : '1');
        }}>
          {listing ? <AssetsRowArtwork item={listing} initiallyNear={index < 8}/>
            : currency ? <CurrencyMark symbol={symbol}/>
            : <span className="asset-mark"><Layers size={20} aria-hidden="true"/></span>}
          <span className="row-copy"><strong>{source.title}</strong><span>{formatUnits(quantityMicro)} {symbol} available</span></span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>;
      })}{matchingMarket.slice(0, Math.max(0, limit - matching.length)).map(position => (
        <button key={position.id} type="button" className="asset-row" onClick={() => setMarketShare(position)}>
          <span className="asset-mark"><Layers size={20} aria-hidden="true" /></span>
          <span className="row-copy"><strong>{position.title}</strong><span>{formatUnits(position.shareQuantityMicro)} Market shares</span></span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      ))}{matchingOriginals.slice(0, limit).map(original => <button key={original.id} type="button" className="asset-row" onClick={() => {setSelectedId(original.id);setPinned(original);}}>
        <span className="asset-mark"><FileCheck2 size={20} aria-hidden="true"/></span>
        <span className="row-copy"><strong>{original.title}</strong><span>{'piece' in original
          ? `${original.piece.percentage} of Original · ${original.piece.ownedBytes.toLocaleString()} bytes`
          : 'source' in original ? 'Whole Original' : 'From your Showcase'}</span></span>
        <ChevronRight size={17} aria-hidden="true"/>
      </button>)}</div>
      {!matchCount && <p role="status" className="body-copy">No holdings match your search.</p>}
      {matchCount > limit && <button type="button" className="text-button" onClick={() => setLimit(value => value + pageSize)}>Show more holdings</button>}
    </>}
    {!available && <p role="status" className="body-copy">{busy ? 'Opening your holdings…' : error || 'You have no asset units available to send.'}</p>}
  </section>;
}

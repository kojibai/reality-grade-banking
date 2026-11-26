import { lazy, Suspense, useState, useSyncExternalStore } from 'react';
import { ChevronRight, Coins, FileCheck2, Layers, Search } from 'lucide-react';
import { InlineOpening } from '../../components/InlineOpening';
import { AmountInput } from '../../components/AmountInput';
import { formatUnits } from '../../core/money';
import { nativeAssetSupplyMicro } from '../../receiz/native-asset-protocol';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { MarketPosition } from '../../receiz/market-portfolio';
import { readOpenPortfolio, subscribeOpenPortfolio } from '../../receiz/market-portfolio-presentation';
import type { HeldDeposit } from '../../receiz/deposit-source';
import { NativeOperation } from '../account/NativeOperation';
import {useHeldOriginalPieces} from './useHeldOriginalPieces';
import { useHeldAssetSources } from './useHeldAssetSources';
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
const MarketShareVault = lazy(() => import('../vault/LegacyVaultExperience').then(module => ({ default: module.VaultExperience })));

export function SendHeldOwnership({ identity, initialDigest, onRefresh }: {
  identity: OpenIdentity;
  initialDigest: string;
  onRefresh(): void;
}) {
  const { sources, busy, error } = useHeldAssetSources(identity);
  const heldPieces = useHeldOriginalPieces(identity);
  const pieceDigests = new Set(heldPieces.map(piece => piece.originalSha256));
  const wholeSources = identity.originalPieces ? sources.filter(source => source.kind === 'proof' && !source.nativeAsset
    && source.bytes?.length) : [];
  const originals = wholeSources.filter(source=>!pieceDigests.has(source.digest));
  const openPortfolio = useSyncExternalStore(subscribeOpenPortfolio, readOpenPortfolio, () => null);
  const portfolio = openPortfolio && openPortfolio.owner === identity.binding?.artifactSha256 ? openPortfolio.portfolio : identity.knownMarketPortfolio?.();
  const [marketShare, setMarketShare] = useState<MarketPosition | null>(null);
  const [selectedId, setSelectedId] = useState(initialDigest), [search, setSearch] = useState('');
  const [limit, setLimit] = useState(pageSize), [quantity, setQuantity] = useState('1');
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [pinnedPiece, setPinnedPiece] = useState<(typeof heldPieces)[number] | null>(null);
  const positions = sources.filter(isSendableHolding);
  const selected = positions.find(source => source.nativeAsset.assetId === selectedId || source.digest === selectedId);
  const selectedOriginal = wholeSources.find(source => source.digest === selectedId);
  const selectedPiece = pinnedPiece ?? heldPieces.find(source => source.proofDigest === selectedId);

  if (marketShare) return <Suspense fallback={<InlineOpening label="Opening your vaults" />}>
    <MarketShareVault identity={identity} allowCreate={false} initialInvestment={marketShare} onClose={() => setMarketShare(null)} onRefresh={onRefresh}/>
  </Suspense>;

  if (selectedOriginal || selectedPiece) return <>
    <button type="button" className="back-link" onClick={() => {setSelectedId('');setPinnedPiece(null);}}>All holdings</button>
    <Suspense fallback={<InlineOpening label="Opening your Original"/>}>
      <SendOriginal key={selectedId} identity={identity} source={selectedOriginal} held={selectedPiece} onRefresh={onRefresh}/>
    </Suspense>
  </>;

  if (selected) {
    const { nativeAsset, executionDigest, title } = selected;
    const available = formatUnits(nativeAsset.quantityMicro);
    return <NativeOperation identity={identity} title="Ownership transfer" confirmLabel="Send ownership" onRefresh={onRefresh}
      ownership={{ title, symbol: nativeAsset.symbol }}
      inputKey={JSON.stringify([executionDigest, quantity, recipient])}
      input={() => {
        let quantityMicro: string;
        try {
          quantityMicro = nativeAssetSupplyMicro(quantity.trim());
        } catch {
          throw Error(nativeAsset.currency ? 'Enter a positive whole number of units.' : 'Enter a positive quantity with up to 6 decimal places.');
        }
        if (nativeAsset.currency && BigInt(quantityMicro) % 1_000_000n !== 0n) {
          throw Error('Enter a positive whole number of units.');
        }
        if (BigInt(quantityMicro) > BigInt(nativeAsset.quantityMicro)) {
          throw Error('Enter a quantity within your available units.');
        }
        return { kind: 'send-ownership', assetDigest: executionDigest, quantityMicro, recipient };
      }}>
      <button type="button" className="back-link" onClick={() => setSelectedId('')}>All holdings</button>
      <div className="holding-panel">
        <span>Send ownership</span>
        <strong>{title}</strong>
        <p>{available} {nativeAsset.symbol} available</p>
        {nativeAsset.lockedQuantityMicro !== '0' && <p>{formatUnits(nativeAsset.lockedQuantityMicro)} {nativeAsset.symbol} committed to offers</p>}
      </div>
      <div className="ownership-send-amount">
        <AmountInput label={nativeAsset.currency ? 'Whole units to send' : 'Ownership to send'} value={quantity} onChange={setQuantity} suffix={nativeAsset.symbol} />
        <button type="button" className="secondary-button" onClick={() => setQuantity(available)}>All</button>
      </div>
      <label className="form-field"><span>Recipient</span><input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="Receiz ID or public username" maxLength={160} /></label>
    </NativeOperation>;
  }

  const query = search.trim().toLowerCase();
  const marketPositions = identity.vaults ? portfolio?.positions ?? [] : [];
  const offered: Category[] = [];
  if (marketPositions.length || positions.some(source => !source.nativeAsset.currency)) offered.push('shares');
  if (positions.some(source => source.nativeAsset.currency)) offered.push('currencies');
  if (originals.length || heldPieces.length) offered.push('originals');
  const visibleCategory = category && offered.includes(category) ? category : offered[0];
  const matching = visibleCategory === 'originals' ? [] : positions.filter(source =>
    Boolean(source.nativeAsset.currency) === (visibleCategory === 'currencies')
    && [source.title, source.nativeAsset.symbol, source.nativeAsset.assetId].some(value => value.toLowerCase().includes(query)));
  const matchingMarket = visibleCategory !== 'shares' ? [] : marketPositions.filter(position => [position.title, position.marketItemId]
    .some(value => value.toLowerCase().includes(query)));
  const matchingOriginals = visibleCategory !== 'originals' ? [] : [
    ...originals.map(source => ({id: source.digest, title: source.title, detail: 'Whole Original'})),
    ...heldPieces.map(piece => ({id: piece.proofDigest, title: piece.filename, detail: `${piece.percentage} of Original · ${piece.ownedBytes.toLocaleString()} bytes`})),
  ].filter(original => [original.title, original.id].some(value => value.toLowerCase().includes(query)));
  const matchCount = matching.length + matchingMarket.length + matchingOriginals.length;
  const available = positions.length + marketPositions.length + originals.length + heldPieces.length;

  return <section>
    <h1 className="sheet-hero">Send ownership.</h1>
    {available > 0 && <>
      {offered.length > 1 && <div className="segmented" aria-label="Holding type" role="group">
        {offered.map(value => <button key={value} type="button" aria-pressed={visibleCategory === value}
          className={visibleCategory === value ? 'active' : ''} onClick={() => { setCategory(value); setLimit(pageSize); }}>
          {categories[value]}
        </button>)}
      </div>}
      <label className="search-field ownership-send-search"><Search size={17} aria-hidden="true" /><input
        type="search" aria-label="Search holdings" placeholder="Search holdings" value={search}
        onChange={event => { setSearch(event.target.value); setLimit(pageSize); }} /></label>
      <div className="rows-surface">{matching.slice(0, limit).map(source => {
        const { assetId, quantityMicro, symbol } = source.nativeAsset;
        return <button key={assetId} type="button" className="asset-row" onClick={() => {
          setSelectedId(assetId);
          setQuantity(BigInt(quantityMicro) < 1_000_000n ? formatUnits(quantityMicro) : '1');
        }}>
          <span className="asset-mark">{source.nativeAsset.currency ? <Coins size={20} aria-hidden="true" /> : <Layers size={20} aria-hidden="true" />}</span>
          <span className="row-copy"><strong>{source.title}</strong><span>{formatUnits(quantityMicro)} {symbol} available</span></span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>;
      })}{matchingMarket.slice(0, Math.max(0, limit - matching.length)).map(position => (
        <button key={position.id} type="button" className="asset-row" onClick={() => setMarketShare(position)}>
          <span className="asset-mark"><Layers size={20} aria-hidden="true" /></span>
          <span className="row-copy"><strong>{position.title}</strong><span>{formatUnits(position.shareQuantityMicro)} Market shares</span></span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      ))}{matchingOriginals.slice(0, limit).map(original => <button key={original.id} type="button" className="asset-row" onClick={() => {setSelectedId(original.id);setPinnedPiece(heldPieces.find(piece=>piece.proofDigest===original.id)??null);}}>
        <span className="asset-mark"><FileCheck2 size={20} aria-hidden="true"/></span>
        <span className="row-copy"><strong>{original.title}</strong><span>{original.detail}</span></span>
        <ChevronRight size={17} aria-hidden="true"/>
      </button>)}</div>
      {!matchCount && <p role="status" className="body-copy">No holdings match your search.</p>}
      {matchCount > limit && <button type="button" className="text-button" onClick={() => setLimit(value => value + pageSize)}>Show more holdings</button>}
    </>}
    {!available && <p role="status" className="body-copy">{busy ? 'Opening your holdings…' : error || 'You have no asset units available to send.'}</p>}
  </section>;
}

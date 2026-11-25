import { lazy, Suspense, useState, useSyncExternalStore } from 'react';
import { ChevronRight, Layers, Search } from 'lucide-react';
import { InlineOpening } from '../../components/InlineOpening';
import { AmountInput } from '../../components/AmountInput';
import { formatUnits } from '../../core/money';
import { nativeAssetSupplyMicro } from '../../receiz/native-asset-protocol';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { MarketPosition } from '../../receiz/market-portfolio';
import { readOpenPortfolio, subscribeOpenPortfolio } from '../../receiz/market-portfolio-presentation';
import type { HeldDeposit } from '../../receiz/deposit-source';
import { NativeOperation } from '../account/NativeOperation';
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
const MarketShareVault = lazy(() => import('../vault/LegacyVaultExperience').then(module => ({ default: module.VaultExperience })));

export function SendHeldOwnership({ identity, initialDigest, onRefresh }: {
  identity: OpenIdentity;
  initialDigest: string;
  onRefresh(): void;
}) {
  const { sources, busy, error } = useHeldAssetSources(identity);
  const openPortfolio = useSyncExternalStore(subscribeOpenPortfolio, readOpenPortfolio, () => null);
  const portfolio = openPortfolio && openPortfolio.owner === identity.binding?.artifactSha256 ? openPortfolio.portfolio : identity.knownMarketPortfolio?.();
  const [marketShare, setMarketShare] = useState<MarketPosition | null>(null);
  const [selectedId, setSelectedId] = useState(initialDigest), [search, setSearch] = useState('');
  const [limit, setLimit] = useState(pageSize), [quantity, setQuantity] = useState('1');
  const [recipient, setRecipient] = useState('');
  const positions = sources.filter(isSendableHolding);
  const selected = positions.find(source => source.nativeAsset.assetId === selectedId || source.digest === selectedId);

  if (marketShare) return <Suspense fallback={<InlineOpening label="Opening your vaults" />}>
    <MarketShareVault identity={identity} allowCreate={false} initialInvestment={marketShare} onClose={() => setMarketShare(null)} onRefresh={onRefresh}/>
  </Suspense>;

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
          throw Error('Enter a positive quantity with up to 6 decimal places.');
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
        <AmountInput label="Ownership to send" value={quantity} onChange={setQuantity} suffix={nativeAsset.symbol} />
        <button type="button" className="secondary-button" onClick={() => setQuantity(available)}>All</button>
      </div>
      <label className="form-field"><span>Recipient</span><input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="Receiz ID or public username" maxLength={160} /></label>
    </NativeOperation>;
  }

  const query = search.trim().toLowerCase();
  const matching = positions.filter(source => [source.title, source.nativeAsset.symbol, source.nativeAsset.assetId]
    .some(value => value.toLowerCase().includes(query)));

  const marketPositions = identity.vaults ? portfolio?.positions ?? [] : [];
  const matchingMarket = marketPositions.filter(position => [position.title, position.marketItemId]
    .some(value => value.toLowerCase().includes(query)));
  const available = positions.length + marketPositions.length;

  return <section>
    <h1 className="sheet-hero">Send ownership.</h1>
    {available > 0 && <>
      <label className="search-field ownership-send-search"><Search size={17} aria-hidden="true" /><input
        type="search" aria-label="Search holdings" placeholder="Search holdings" value={search}
        onChange={event => { setSearch(event.target.value); setLimit(pageSize); }} /></label>
      <div className="rows-surface">{matching.slice(0, limit).map(source => {
        const { assetId, quantityMicro, symbol } = source.nativeAsset;
        return <button key={assetId} type="button" className="asset-row" onClick={() => {
          setSelectedId(assetId);
          setQuantity(BigInt(quantityMicro) < 1_000_000n ? formatUnits(quantityMicro) : '1');
        }}>
          <span className="asset-mark"><Layers size={20} aria-hidden="true" /></span>
          <span className="row-copy"><strong>{source.title}</strong><span>{formatUnits(quantityMicro)} {symbol} available</span></span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>;
      })}{matchingMarket.slice(0, Math.max(0, limit - matching.length)).map(position => (
        <button key={position.id} type="button" className="asset-row" onClick={() => setMarketShare(position)}>
          <span className="asset-mark"><Layers size={20} aria-hidden="true" /></span>
          <span className="row-copy"><strong>{position.title}</strong><span>{formatUnits(position.shareQuantityMicro)} Market shares</span></span>
          <ChevronRight size={17} aria-hidden="true" />
        </button>
      ))}</div>
      {!matching.length && !matchingMarket.length && <p role="status" className="body-copy">No holdings match your search.</p>}
      {matching.length + matchingMarket.length > limit && <button type="button" className="text-button" onClick={() => setLimit(value => value + pageSize)}>Show more holdings</button>}
    </>}
    {!available && <p role="status" className="body-copy">{busy ? 'Opening your holdings…' : error || 'You have no asset units available to send.'}</p>}
  </section>;
}

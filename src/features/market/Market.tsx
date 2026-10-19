import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { BankContext, type UIAction } from '../../core/useBank';
import { AssetMark } from '../../components/AssetMark';
import { Sheet } from '../../components/Sheet';
import { usePublicMarket } from '../../receiz/usePublicMarket';
import { formatPublicPrice, type PublicMarketItem } from '../../receiz/public-market';
import { MarketOverview } from './MarketOverview';
import { PublicAssetDetail } from './PublicAssetDetail';
import './market.css';

function selectedObject(): string | null { try { return location.hash.startsWith('#market/public/') ? decodeURIComponent(location.hash.slice('#market/public/'.length)) : null; } catch { return null; } }
function Change({ value }: { value: number | null }) { return value === null ? null : <span className={value >= 0 ? 'positive' : 'negative'}>{value > 0 ? '+' : ''}{value}%</span>; }
function PublicObjectProvenance({item}:{item:PublicMarketItem}){
 const copies=item.category==='sports'&&(item.circulationCount??1)>1;
 const carried=item.sealedCopies??[],owners=[...new Set(carried.map(copy=>copy.ownerUsername?`@${copy.ownerUsername}`:copy.ownerDisplayName).filter((owner):owner is string=>!!owner))],times=carried.map(copy=>Date.parse(copy.sealedAt)).filter(Number.isFinite),first=times.length?Math.min(...times):null,last=times.length?Math.max(...times):null;
 const owner=copies&&owners.length?`${owners[0]}${owners.length>1?` +${owners.length-1} ${owners.length===2?'owner':'owners'}`:''}`:copies?'Owners vary by copy':item.ownerUsername?`@${item.ownerUsername}`:item.ownerDisplayName??'Owner not supplied';
 const sealed=copies&&first!==null?`Sealed ${first===last?new Date(first).toLocaleString():`${new Date(first).toLocaleDateString()}–${new Date(last!).toLocaleDateString()}`}`:copies?'Sealed times vary by copy':item.sealedAt?`Sealed ${new Date(item.sealedAt).toLocaleString()}`:'Sealed time not supplied';
 return <span className="market-object-provenance"><span>{owner}</span><span>{sealed}</span></span>;
}
type MarketProps = { active?: boolean; onAction?: (action: UIAction) => void; source?: ReturnType<typeof usePublicMarket> };
export function Market(props: MarketProps) { return props.source ? <MarketView {...props} source={props.source} /> : <ConnectedMarket {...props} />; }
function ConnectedMarket(props: MarketProps) { const source = usePublicMarket(props.active); return <MarketView {...props} source={source} />; }
function MarketView({ active = true, onAction, source }: MarketProps & { source: ReturnType<typeof usePublicMarket> }) {
  const bank = useContext(BankContext); const open = onAction ?? bank?.open ?? (() => {}); const { catalog, status, quoteStatus, sportsStatus, error, refresh } = source;
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('All'), [shown, setShown] = useState(50), [selectedId, setSelectedId] = useState(selectedObject);
  const labels = ['All', 'Proofs', 'Cards', 'Currencies', 'Physical', 'Stocks'];
  const assets = useMemo(() => (catalog?.items ?? []).filter(asset => (!query || `${asset.title} ${asset.summary} ${asset.assetId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) && (filter === 'All' || filter === 'Proofs' && asset.category === 'proof' || filter === 'Cards' && asset.category === 'sports')), [catalog, query, filter]);
  const selected = catalog?.items.find(item => item.id === selectedId);
  const loadMore = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!active || shown >= assets.length || !loadMore.current || typeof IntersectionObserver === 'undefined') return;
    let alive = true;
    const observer = new IntersectionObserver(entries => {
      if (alive && entries.some(entry => entry.isIntersecting)) setShown(count => Math.min(assets.length, count + 50));
    }, { rootMargin: '600px 0px' });
    observer.observe(loadMore.current); return () => { alive = false; observer.disconnect(); };
  }, [active, assets.length, shown]);
  const localPricing=catalog?.items.some(item=>item.localValuationPulse!==undefined);
  const sourceLabel = !catalog ? status === 'loading' ? 'Connecting to the public Market…' : 'Public Market unavailable' : localPricing ? `Live Kai valuation${status!=='live'?' · retained collection':''}` : status !== 'live' ? 'Public Market · cached collection' : quoteStatus === 'loading' ? 'Public Market · updating quotes' : quoteStatus === 'stale' ? 'Public Market · cached quotes' : 'Live public Market';
  useEffect(() => { const back = () => setSelectedId(selectedObject()); addEventListener('popstate', back); return () => removeEventListener('popstate', back); }, []);
  useEffect(() => { setShown(50); }, [query, filter]);
  const view = (item: PublicMarketItem) => { history.pushState({ ...history.state, panel: 'market', publicObjectId: item.id }, '', `#market/public/${encodeURIComponent(item.id)}`); setSelectedId(item.id); };
  const close = () => { if (history.state?.publicObjectId) history.back(); else { history.replaceState({ panel: 'market', sheet: null }, '', '#market'); setSelectedId(null); } };
  return <section><h1>Market</h1><p className="page-subtitle">Put your value to work.</p>
    <label className="search-field"><Search size={19} /><input placeholder="Search assets or currencies" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search assets or currencies" /></label>
    <div className="filters">{labels.map(label => <button key={label} className={filter === label ? 'active' : ''} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>
    <div className="market-source-status"><span role="status">{sourceLabel}{sportsStatus === 'retained' ? ' · card inventory retained' : sportsStatus === 'missing' ? ' · card inventory unavailable' : ''}{catalog?.sportsCoverage === 'partial' ? ' · card inventory partial' : catalog?.sportsCoverage === 'missing' && sportsStatus !== 'missing' ? ' · card inventory unavailable' : ''}{catalog && !catalog.complete ? ' · partial collection' : ''}</span><button className="icon-button" onClick={() => void refresh()} aria-label="Refresh public Market"><RefreshCw size={15} /></button></div>
    {error && <p className="body-copy small-copy market-error" role="status">{localPricing?'Collection refresh is unavailable. Retained pricing inputs continue at the live Kai pulse.':error}{catalog&&!localPricing ? ' Your last public collection remains available.' : ''}</p>}
    <div className="market-layout"><div><MarketOverview catalog={catalog} active={active} onExplore={() => document.getElementById('market-explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
    <div className="market-actions"><button className="primary-button navy-button" onClick={() => open({ kind: 'currency' })}><Plus size={19} />Create an asset</button><button className="secondary-button" onClick={() => open({ kind: 'exchange' })}><ArrowLeftRight size={19} />Exchange</button></div></div>
    <section id="market-explore"><div className="section-heading"><h2>Explore</h2><span className="muted result-count">{assets.length.toLocaleString()} assets</span></div><div className="market-rows">{assets.slice(0, shown).map(asset => <button key={asset.id} className="asset-row" onClick={() => view(asset)}><AssetMark kind="proof" /><span className="row-copy"><strong>{asset.title}</strong><span>{asset.category === 'sports' ? 'Collectible card' : 'Proof object'}</span><PublicObjectProvenance item={asset}/></span><span className="price-stack"><strong>{formatPublicPrice(asset.priceUsd)}</strong><Change value={asset.changePct} /></span></button>)}{!assets.length && <div className="empty-state">{catalog ? 'No matching public assets. Try another search.' : status === 'loading' ? 'Loading public proof objects…' : 'The public collection is temporarily unavailable.'}</div>}</div><div ref={loadMore} className="public-market-sentinel" aria-hidden="true" />{assets.length > shown && typeof IntersectionObserver === 'undefined' && <button className="text-button public-market-more" onClick={() => setShown(count => count + 50)}>Show more assets</button>}</section></div>
    {active && selectedId && <Sheet title="Public asset" onClose={close}>{selected ? <PublicAssetDetail key={selected.id} item={selected} onTrade={(mode, assetId) => { setSelectedId(null); history.replaceState({ panel: 'market', sheet: null }, '', '#market'); open({ kind: 'market-trade', marketItemId:assetId, side:mode }); }} /> : <p className="body-copy">{catalog ? 'This object is no longer in the public collection.' : 'Loading the public source…'}</p>}</Sheet>}
  </section>;
}

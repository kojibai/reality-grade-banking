import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Plus, Search, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { useBank } from '../../core/useBank';
import { AssetMark } from '../../components/AssetMark';
import { ValueChart } from '../../components/ValueChart';
import { Sheet } from '../../components/Sheet';
import { usePublicMarket } from '../../receiz/usePublicMarket';
import { formatPublicPrice, type PublicMarketItem } from '../../receiz/public-market';
import { PublicAssetDetail } from './PublicAssetDetail';

function selectedObject(): string | null { try { return location.hash.startsWith('#market/public/') ? decodeURIComponent(location.hash.slice('#market/public/'.length)) : null; } catch { return null; } }
function Change({ value }: { value: number | null }) { return value === null ? null : <span className={value >= 0 ? 'positive' : 'negative'}>{value > 0 ? '+' : ''}{value}%</span>; }
export function Market({ active = true }: { active?: boolean }) {
  const { open } = useBank(); const { catalog, status, error, refresh } = usePublicMarket(active);
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('All'), [shown, setShown] = useState(50), [selectedId, setSelectedId] = useState(selectedObject);
  const labels = ['All', 'Proofs', 'Currencies', 'Physical', 'Stocks'];
  const assets = useMemo(() => (catalog?.items ?? []).filter(asset => (!query || `${asset.title} ${asset.summary} ${asset.assetId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) && ['All', 'Proofs'].includes(filter)), [catalog, query, filter]);
  const featured = catalog?.items[0], selected = catalog?.items.find(item => item.id === selectedId);
  useEffect(() => { const back = () => setSelectedId(selectedObject()); addEventListener('popstate', back); return () => removeEventListener('popstate', back); }, []);
  useEffect(() => { setShown(50); }, [query, filter]);
  const view = (item: PublicMarketItem) => { history.pushState({ ...history.state, panel: 'market', publicObjectId: item.id }, '', `#market/public/${encodeURIComponent(item.id)}`); setSelectedId(item.id); };
  const close = () => { if (history.state?.publicObjectId) history.back(); else { history.replaceState({ panel: 'market', sheet: null }, '', '#market'); setSelectedId(null); } };
  return <section><h1>Market</h1><p className="page-subtitle">Put your value to work.</p>
    <label className="search-field"><Search size={19} /><input placeholder="Search assets or currencies" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search assets or currencies" /></label>
    <div className="filters">{labels.map(label => <button key={label} className={filter === label ? 'active' : ''} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>
    <div className="market-source-status"><span role="status">{status === 'live' ? 'Live public Market' : catalog ? 'Public Market · updating' : status === 'loading' ? 'Connecting to the public Market…' : 'Public Market unavailable'}{catalog && !catalog.complete ? ' · partial collection' : ''}</span><button className="icon-button" onClick={() => void refresh()} aria-label="Refresh public Market"><RefreshCw size={15} /></button></div>
    {error && <p className="body-copy small-copy market-error" role="status">{error}{catalog ? ' Your last public collection remains available.' : ''}</p>}
    <div className="market-layout"><div>{featured && <button className="featured-asset" onClick={() => view(featured)}><div><h2>{featured.title}</h2><p>Proof object</p><strong>{formatPublicPrice(featured.priceUsd)}</strong><Change value={featured.changePct} /><span className="view-asset">View asset<ArrowRight size={16} /></span></div>{featured.chart.length > 1 ? <ValueChart values={featured.chart} label="Public Market value in dollars" /> : <div className="public-proof-preview"><AssetMark kind="proof" /><span>Source attached</span></div>}</button>}
    <div className="market-actions"><button className="primary-button navy-button" onClick={() => open({ kind: 'currency' })}><Plus size={19} />Create a currency</button><button className="secondary-button" onClick={() => open({ kind: 'exchange' })}><ArrowLeftRight size={19} />Exchange</button></div></div>
    <section><div className="section-heading"><h2>Explore</h2><span className="muted result-count">{assets.length.toLocaleString()} assets</span></div><div className="market-rows">{assets.slice(0, shown).map(asset => <button key={asset.id} className="asset-row" onClick={() => view(asset)}><AssetMark kind="proof" /><span className="row-copy"><strong>{asset.title}</strong><span>Proof object</span></span><span className="price-stack"><strong>{formatPublicPrice(asset.priceUsd)}</strong><Change value={asset.changePct} /></span></button>)}{!assets.length && <div className="empty-state">{catalog ? 'No matching public assets. Try another search.' : status === 'loading' ? 'Loading public proof objects…' : 'The public collection is temporarily unavailable.'}</div>}</div>{assets.length > shown && <button className="text-button public-market-more" onClick={() => setShown(count => count + 50)}>Show more assets</button>}</section></div>
    {active && selectedId && <Sheet title="Public asset" onClose={close}>{selected ? <PublicAssetDetail key={selected.id} item={selected} /> : <p className="body-copy">{catalog ? 'This object is no longer in the public collection.' : 'Loading the public source…'}</p>}</Sheet>}
  </section>;
}

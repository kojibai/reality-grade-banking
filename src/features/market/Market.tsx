import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Search, RefreshCw } from 'lucide-react';
import {flushSync} from 'react-dom';
import { BankContext, type UIAction } from '../../core/useBank';
import { Sheet } from '../../components/Sheet';
import { usePublicMarket } from '../../receiz/usePublicMarket';
import { type PublicMarketItem } from '../../receiz/public-market';
import {PublicObjectRow} from './PublicObjectRow';
import { MarketOverview } from './MarketOverview';
import { PublicAssetDetail } from './PublicAssetDetail';
import {MARKET_CONTENT_FILTERS,matchesMarketContent,type MarketContentFilter} from '../../receiz/market-categories';
import {beginPublicAssetTrade} from '../../receiz/public-asset-trade';
import {PublicAssetTradeHost} from '../../public-explorer/PublicAssetTradeHost';
import './market.css';

function selectedObject(prefix:string): string | null { try { return location.hash.startsWith(prefix) ? decodeURIComponent(location.hash.slice(prefix.length)) : null; } catch { return null; } }
type MarketProps = { mode?:'market'|'explorer';active?: boolean; onAction?: (action: UIAction) => void; source?: ReturnType<typeof usePublicMarket>;publicCategory?:{label:string;description:string};overviewOnly?:boolean;sourceActive?:boolean };
export function Market(props: MarketProps) { return props.source ? <MarketView {...props} source={props.source} /> : <ConnectedMarket {...props} />; }
function ConnectedMarket(props: MarketProps) { const source = usePublicMarket(props.active); return <MarketView {...props} source={source} />; }
function MarketView({ mode='market',active = true, sourceActive=active, onAction, source,publicCategory,overviewOnly=false }: MarketProps & { source: ReturnType<typeof usePublicMarket> }) {
  const explorer=mode==='explorer',prefix=explorer?'#object/':'#market/public/';
  const bank = useContext(BankContext); const open = onAction ?? bank?.open ?? (() => {}); const { catalog, historyCatalog, status, quoteStatus, error, refresh } = source;
  const [query, setQuery] = useState(''), [filter, setFilter] = useState<MarketContentFilter>((publicCategory?.label as MarketContentFilter)??'All'), [shown, setShown] = useState(50), [selectedId, setSelectedId] = useState(()=>selectedObject(prefix));
  useEffect(()=>{if(explorer){setFilter((publicCategory?.label as MarketContentFilter)??'All');setQuery('');}},[explorer,publicCategory?.label]);
  const normalizedQuery=query.trim().toLocaleLowerCase();
  const assets = useMemo(() => (catalog?.items ?? []).filter(asset => matchesMarketContent(asset,filter)&&(!normalizedQuery || `${asset.title} ${asset.summary} ${asset.assetId}`.toLocaleLowerCase().includes(normalizedQuery))), [catalog, normalizedQuery, filter]);
  const selected = catalog?.items.find(item => item.id === selectedId);
  const loadMore = useRef<HTMLDivElement | null>(null), collection = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!active || shown >= assets.length || !loadMore.current || typeof IntersectionObserver === 'undefined') return;
    let alive = true;
    const observer = new IntersectionObserver(entries => {
      if (alive && entries.some(entry => entry.isIntersecting)) setShown(count => Math.min(assets.length, count + 50));
    }, { rootMargin: '600px 0px' });
    observer.observe(loadMore.current); return () => { alive = false; observer.disconnect(); };
  }, [active, assets.length, shown]);
  const localPricing=catalog?.items.some(item=>item.localValuationPulse!==undefined);
  const sourceLabel = !catalog ? status === 'loading' ? 'Connecting to the public Market…' : 'Public Market unavailable' : localPricing ? `Live valuation${status!=='live'?' · retained collection':''}` : status !== 'live' ? 'Public Market · cached collection' : quoteStatus === 'loading' ? 'Public Market · updating quotes' : quoteStatus === 'stale' ? 'Public Market · cached quotes' : 'Live public Market';
  // Finish closing a retained asset sheet before the public router restores
  // the feed scroll; its document unlock must not overwrite that position.
  useEffect(() => { const back = () => {if(explorer ? /^\/(?:explor(?:e|er)(?:\/[a-z]+)?|market-cap)\/?$/.test(location.pathname) : location.pathname==='/')flushSync(()=>setSelectedId(selectedObject(prefix)));}; addEventListener('popstate', back);addEventListener('receiz-bank:surface',back); return () => {removeEventListener('popstate', back);removeEventListener('receiz-bank:surface',back);}; }, [prefix,explorer]);
  useEffect(() => { setShown(50); }, [query, filter]);
  const view = (item: PublicMarketItem) => { history.pushState({ ...history.state, panel: 'market', publicObjectId: item.id }, '', `${prefix}${encodeURIComponent(item.id)}`); setSelectedId(item.id); };
  const close = () => { if (history.state?.publicObjectId) history.back(); else { history.replaceState({ panel: 'market', sheet: null }, '', explorer?location.pathname+location.search:'#market'); setSelectedId(null); } };
  return <section><h1>{overviewOnly?'Global Market Cap':publicCategory?.label??(explorer?'Explore proof objects':'Market')}</h1><p className="page-subtitle">{overviewOnly?'The public valuation universe. Connected to its sources.':publicCategory?.description??(explorer?'Sealed moments. Public value. Connected history.':'Put your value to work.')}</p>
    {!overviewOnly&&<>
    <label className="search-field"><Search size={19} /><input placeholder={explorer?'Search proof objects':'Search assets or currencies'} value={query} onChange={event => setQuery(event.target.value)} aria-label={explorer?'Search proof objects':'Search assets or currencies'} /></label>
    <div className="filters" role="group" aria-label="Asset categories">{MARKET_CONTENT_FILTERS.map(label => explorer?<a key={label} className={filter===label?'active':''} aria-current={filter===label?'page':undefined} href={label==='All'?'/explore/':`/explore/${label.toLowerCase()}/`}>{label}</a>:<button key={label} className={filter === label ? 'active' : ''} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div></>}
    <div className="market-source-status"><span role="status">{sourceLabel}</span><button className="icon-button" onClick={() => void refresh()} aria-label="Refresh public Market"><RefreshCw size={15} /></button></div>
    {error && <p className="body-copy small-copy market-error" role="status">{localPricing?'Collection refresh is unavailable. Retained pricing inputs continue at the live Kai pulse.':error}{catalog&&!localPricing ? ' Your last public collection remains available.' : ''}</p>}
    <div className={overviewOnly||publicCategory?'market-layout market-single':'market-layout'}><div>{!publicCategory&&<MarketOverview catalog={catalog} historyCatalog={historyCatalog} active={active} sourceActive={sourceActive} onExplore={() => overviewOnly?document.querySelector<HTMLAnchorElement>('[data-cap-explore]')?.click():collection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />}
    {!explorer&&<div className="market-actions"><button className="primary-button navy-button" onClick={() => open({ kind: 'currency' })}><Plus size={19} />Create an asset</button></div>}</div>
    {!overviewOnly&&<section id="market-explore" ref={collection}><div className="section-heading"><h2>{explorer?'Public collection':'Explore'}</h2><span className="muted result-count">{assets.length.toLocaleString()} assets</span></div><div className="market-rows">{assets.slice(0, shown).map(asset => <PublicObjectRow key={asset.id} item={asset} onOpen={()=>view(asset)}/>)}{!assets.length && <div className="empty-state">{catalog ? 'No matching public assets. Try another search.' : status === 'loading' ? 'Loading public proof objects…' : 'The public collection is temporarily unavailable.'}</div>}</div><div ref={loadMore} className="public-market-sentinel" aria-hidden="true" />{assets.length > shown && typeof IntersectionObserver === 'undefined' && <button className="text-button public-market-more" onClick={() => setShown(count => count + 50)}>Show more assets</button>}</section>}</div>
    {active && selectedId && <Sheet title="Public asset" onClose={close}>{selected ? <PublicAssetDetail key={selected.id} item={selected} onTrade={(side, marketItemId) => {if(explorer)beginPublicAssetTrade({itemId:marketItemId,side,title:selected.title});else open({kind:'market-trade',marketItemId,side});}} /> : <p className="body-copy">{catalog ? 'This object is no longer in the public collection.' : 'Loading the public source…'}</p>}</Sheet>}
    {active&&explorer&&<PublicAssetTradeHost/>}
  </section>;
}

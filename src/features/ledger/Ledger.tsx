import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, ShieldCheck, ChevronDown } from 'lucide-react';
import { AssetMark } from '../../components/AssetMark';
import { formatMoney } from '../../core/money';
import { PUBLIC_SOURCES, type PublicRecord } from '../../receiz/public-network';
import type { PersonalHistory } from '../../receiz/personal-history';
import { usePublicNetwork } from '../../receiz/usePublicNetwork';

const sourceLabels = { actions: 'Recorded actions', wallet: 'Wallet movements', graph: 'Proof Graph', proofs: 'Showcase proofs' };
function LedgerRow({ record, expanded, onExpand, personal = false }: { personal?: boolean; record: PublicRecord; expanded: boolean; onExpand: () => void }) {
  return <div className="ledger-event"><button className="asset-row" onClick={onExpand} aria-expanded={expanded}><AssetMark kind={record.source === 'wallet' ? 'send' : 'proof'} small /><span className="row-copy"><strong>{record.title}</strong><span>{record.time ? new Date(record.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Date not supplied'} · {sourceLabels[record.source]}</span></span><strong className="row-value">{record.amountUsdCents !== null ? formatMoney(record.amountUsdCents) : 'View record'}</strong><ChevronDown size={15} /></button>
    {expanded && <div className="projection-detail"><p>{record.detail || record.kind.replace(/[._]/g, ' ')}</p><div className="detail-list">{record.actor && <div><span>Public identity</span><strong className="proof-coordinate">{record.actor}</strong></div>}{record.pulse && <div><span>Kai pulse</span><strong>{record.pulse}</strong></div>}{record.kaiUpulse && <div><span>Kai uPulse</span><strong>{record.kaiUpulse}</strong></div>}<div><span>Source</span><strong>{sourceLabels[record.source]}</strong></div></div><code>{record.sourceId}</code>{Object.entries(record.evidence).map(([key, value]) => <p className="proof-coordinate" key={key}>{key}: {value}</p>)}<p className="body-copy small-copy">{personal ? 'History carried by your opened Identity Seal.' : 'Public source record. Inspect the original proof for independent verification.'}</p>{record.sourceUrl && <a href={record.sourceUrl} target="_blank" rel="noreferrer">Open public source<ExternalLink size={13} /></a>}</div>}
  </div>;
}
export function Ledger({ active = true, personalHistory = null }: { active?: boolean; personalHistory?: PersonalHistory | null }) {
  const [tab, setTab] = useState<'mine' | 'public'>('public'), [expanded, setExpanded] = useState<string | null>(null), [shown, setShown] = useState(50);
  const { records, sources, bootstrap, capturedAt, refresh, loadMore } = usePublicNetwork(active && tab === 'public');
  const sentinel = useRef<HTMLDivElement | null>(null);
  const sourceStates = Object.values(sources);
  const busy = sourceStates.some(source => source.busy), live = sourceStates.length === PUBLIC_SOURCES.length && sourceStates.every(source => source.status === 'live');
  const errors = PUBLIC_SOURCES.filter(source => sources[source]?.error);
  useEffect(() => {
    if (!active || tab !== 'public' || !sentinel.current || typeof IntersectionObserver === 'undefined') return;
    let alive = true; const observer = new IntersectionObserver(entries => {
      if (!alive || !entries.some(entry => entry.isIntersecting)) return;
      if (shown < records.length) setShown(count => Math.min(records.length, count + 50)); else if (!busy && !bootstrap) void loadMore();
    }, { rootMargin: '600px 0px' });
    observer.observe(sentinel.current); return () => { alive = false; observer.disconnect(); };
  }, [active, tab, shown, records.length, busy, bootstrap, loadMore]);
  return <section><h1>Ledger</h1><p className="page-subtitle">Every movement keeps its story.</p><div className="segmented ledger-tabs"><button className={tab === 'mine' ? 'active' : ''} onClick={() => { setTab('mine'); setExpanded(null); }}>My history</button><button className={tab === 'public' ? 'active' : ''} onClick={() => { setTab('public'); setExpanded(null); }}>Public</button></div>
    {tab === 'public' ? <><div className="ledger-public-header"><span><ShieldCheck size={16} />{live ? 'Receiz public activity' : bootstrap ? 'Opening public activity…' : 'Public activity · updating sources'}</span><button onClick={() => void refresh()} disabled={busy || bootstrap}><RefreshCw size={14} />{busy ? 'Updating…' : 'Refresh'}</button></div>
      <p className="body-copy small-copy">{records.length.toLocaleString()} source entries{capturedAt && !live ? ` · retained capture ${new Date(capturedAt).toLocaleDateString()}` : ''}</p>
      {errors.length > 0 && <p className="body-copy small-copy" role="status">Some public sources are unavailable: {errors.map(source => sourceLabels[source]).join(', ')}. Retained activity stays visible.</p>}
      <div className="rows-surface ledger-public-rows">{records.slice(0, shown).map(record => <LedgerRow key={record.id} record={record} expanded={expanded === record.id} onExpand={() => setExpanded(expanded === record.id ? null : record.id)} />)}{!records.length && <div className="empty-state">{bootstrap || busy ? 'Opening the public Receiz network…' : 'Public activity could not be retrieved. Refresh to try again.'}</div>}</div>
      <div ref={sentinel} className="public-market-sentinel" aria-hidden="true" />{typeof IntersectionObserver === 'undefined' && <button className="text-button public-market-more" onClick={() => shown < records.length ? setShown(count => count + 50) : void loadMore()}>Show more activity</button>}
    </> : personalHistory?.available ? <><p className="body-copy small-copy">History at your Identity Seal’s head{personalHistory.completeAtSealedHead ? '' : ' · partial carried history'}. Live private additions are not connected yet.</p><div className="rows-surface">{personalHistory.records.map(record => <LedgerRow personal key={record.id} record={record} expanded={expanded === record.id} onExpand={() => setExpanded(expanded === record.id ? null : record.id)} />)}{!personalHistory.records.length && <div className="empty-state">No activity is carried by this Identity Seal.</div>}</div></> : <div className="empty-state"><h2>Your Receiz history</h2><p>{personalHistory ? 'Your account is open. Its carried history is not available in this seal.' : 'Open your Receiz ID to see your own activity, including actions completed in this bank.'}</p><p className="body-copy small-copy">Personal history comes from your shared Receiz account. {personalHistory?.awaitingAccountBinding ? 'Your carried history will open after Receiz confirms the account bound to this device ID.' : personalHistory ? 'This Identity Seal does not carry personal history. Live private additions are not connected yet.' : 'No identity is connected here yet.'}</p></div>}
  </section>;
}

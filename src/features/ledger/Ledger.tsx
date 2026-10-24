import {CopyFeedbackIcon} from '../../components/CopyFeedback';
import {ledgerAssetTrade,ledgerTradeSummary} from '../../receiz/ledger-asset-trade';
import {LedgerExecutionRecords} from './LedgerExecutionRecords';
import {groupLedgerPaymentRecords,ledgerRecordTitle,ledgerPaymentRole} from '../../receiz/ledger-payment-records';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck, ChevronDown, Link2, Share2 } from 'lucide-react';
import {openReceiptShare} from '../receipts/openReceiptShare';
import {ACTIVITY_FILTERS,completeLedgerReceipt,activityCategory,receiptLink,openLedgerReceipt,type ActivityCategory} from '../../receiz/ledger-receipts';
import { LedgerInspector } from './LedgerInspector';
import {indexLedgerRelations,ledgerCurrentAssetValue,ledgerValuationContext} from '../../receiz/ledger-economy';
import { AssetMark } from '../../components/AssetMark';
import { ledgerValueForRecord, type LedgerValueIndex } from '../../receiz/ledger-value';
import { LedgerValue } from './LedgerValue';
import { useLedgerValueSource } from './useLedgerValueSource';
import { PUBLIC_SOURCES, mergePublicRecords, type PublicRecord } from '../../receiz/public-network';
import type { PersonalHistory } from '../../receiz/personal-history';
import { usePublicNetwork } from '../../receiz/usePublicNetwork';
import {enrichWalletFundingContext} from '../../receiz/ledger-wallet-enrichment';
import type { usePrivateHistory } from '../../receiz/usePrivateHistory';

const sourceLabels = { actions: 'Recorded actions', wallet: 'Wallet movements', graph: 'Proof Graph', proofs: 'Showcase proofs' };
const noRecords:PublicRecord[]=[];
const rowPresentations=new WeakMap<PublicRecord,{valueSource:LedgerValueIndex|null;value:ReturnType<typeof ledgerValueForRecord>;valuation:ReturnType<typeof ledgerValuationContext>;link:ReturnType<typeof receiptLink>}>();
function rowPresentation(record:PublicRecord,valueSource:LedgerValueIndex|null){
  const held=rowPresentations.get(record);if(held?.valueSource===valueSource)return held;
  const value=ledgerValueForRecord(record,valueSource),valuation=ledgerValuationContext(record,valueSource,value),result={valueSource,value,valuation,link:receiptLink(record,value,valuation)};
  rowPresentations.set(record,result);return result;
}
const LedgerRow=memo(function LedgerRow({ record, expanded, onExpand, personal = false, valueSource, relations, executionRecords = [] }: { personal?: boolean; executionRecords?:PublicRecord[]; record: PublicRecord; expanded: boolean; onExpand: (id:string) => void; valueSource: LedgerValueIndex | null; relations:ReturnType<typeof indexLedgerRelations> }) {
  const trade=ledgerAssetTrade(record),tradeSummary=ledgerTradeSummary(record),title=ledgerRecordTitle(record),flow=personal&&record.authority==='account-source-projection'?record.accountFlow:undefined;
  const {value,valuation,link}=useMemo(()=>rowPresentation(record,valueSource),[record,valueSource]),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState('');
  const copiedTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  useEffect(()=>()=>clearTimeout(copiedTimer.current),[]);
  const confirmCopy=()=>{setCopied(true);setCopyError('');clearTimeout(copiedTimer.current);copiedTimer.current=setTimeout(()=>setCopied(false),1800);};
  const copy=()=>openReceiptShare(()=>completeLedgerReceipt(record,value,valuation),link!,confirmCopy);
  const share=copy;
  return <div className="ledger-event"><div className="ledger-row-main"><button className="asset-row" onClick={()=>onExpand(record.id)} aria-expanded={expanded}><AssetMark kind={flow==='in'?'deposit':flow==='out'?'send':record.source==='wallet'?'send':'proof'} small /><span className="row-copy"><strong>{title}</strong>{tradeSummary&&<span className="ledger-trade-summary">{tradeSummary}</span>}<span>{record.time ? new Date(record.time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Date not supplied'} · {flow==='in'?'Received':flow==='out'?'Sent':flow==='self'?'Within your account':ledgerPaymentRole(record)==='movement'?'Payment':ledgerPaymentRole(record)==='execution'?'Execution record':sourceLabels[record.source]}</span></span><LedgerValue className="row-value" value={value} flow={flow} trade={trade}/><ChevronDown size={15} /></button>{link&&<div className="ledger-receipt-actions"><a href={link} onClick={event=>openLedgerReceipt(event,link,{record,value,valuation,valueSource,relations})} aria-label={`Open receipt: ${title}`} title="Open receipt"><Link2 size={15} strokeWidth={1.65}/></a><button onClick={()=>void copy()} aria-label={`Copy receipt link: ${title}`} title={copied?'Copied':'Copy receipt link'}><CopyFeedbackIcon copied={copied} size={15}/></button><button onClick={()=>void share()} aria-label={`Share receipt: ${title}`} title="Share receipt"><Share2 size={14} strokeWidth={1.65}/></button><span className="visually-hidden" role="status">{copied?'Receipt link copied.':copyError}</span></div>}</div>
    {expanded && <div className="projection-detail"><LedgerInspector record={record} value={value} currentValue={/transfer|send/i.test(record.kind)?ledgerCurrentAssetValue(record,valueSource):null} valuation={valuation} relations={relations} valueSource={valueSource} inApp/><LedgerExecutionRecords records={executionRecords} valueSource={valueSource} relations={relations}/><p className="body-copy small-copy">{personal ? record.origin === 'private-account' ? 'Private activity from your authenticated account. Held proof history remains authoritative.' : 'History carried by your opened Identity Record.' : 'Public source record. Inspect the original proof for independent verification.'}</p></div>}
  </div>;
});
export function Ledger({ active = true, personalHistory = null, privateHistory }: { active?: boolean; personalHistory?: PersonalHistory | null; privateHistory?: ReturnType<typeof usePrivateHistory> }) {
  const [filter,setFilter]=useState<ActivityCategory>('all');
  const [historyFilter,setHistoryFilter]=useState<'all'|'out'|'in'>('all');
  const valueSource = useLedgerValueSource(active);
  const [tab, setTab] = useState<'mine' | 'public'>('public'), [expanded, setExpanded] = useState<string | null>(null), [shown, setShown] = useState(50);
  const [prepareMine,setPrepareMine]=useState(false);
  const toggleExpanded=useCallback((id:string)=>setExpanded(current=>current===id?null:id),[]);
  const { records:sourceRecords, sources, bootstrap, capturedAt, refresh, loadMore } = usePublicNetwork(active && tab === 'public');
  const records=useMemo(()=>enrichWalletFundingContext(sourceRecords,sourceRecords),[sourceRecords]);
  const sentinel = useRef<HTMLDivElement | null>(null), privateSentinel = useRef<HTMLDivElement | null>(null);
  // Prepare private history on its first opening, then retain it across tabs.
  // A tab switch changes the view, not the already held source relationships.
  const mine = useMemo(()=>prepareMine?enrichWalletFundingContext(mergePublicRecords(privateHistory?.cache?.records ?? [], personalHistory?.records ?? []),records):noRecords,[prepareMine,privateHistory?.cache?.records,personalHistory?.records,records]);
  const publicRelations=useMemo(()=>indexLedgerRelations(records),[records]);
  const mineRelations=useMemo(()=>indexLedgerRelations(mine),[mine]);
  const relations=tab==='mine'?mineRelations:publicRelations;
  const mineGroups=useMemo(()=>groupLedgerPaymentRecords(mine),[mine]);
  const visibleMine=useMemo(()=>historyFilter==='all'?mineGroups:mineGroups.filter(group=>group.record.accountFlow===historyFilter),[mineGroups,historyFilter]);
  const publicGroups=useMemo(()=>groupLedgerPaymentRecords(records),[records]);
  const publicCategories=useMemo(()=>{
    const categories=Object.fromEntries(ACTIVITY_FILTERS.map(category=>[category,category==='all'?publicGroups:[]])) as Record<ActivityCategory,typeof publicGroups>;
    for(const group of publicGroups)categories[activityCategory(group.record)].push(group);
    return categories;
  },[publicGroups]);
  useEffect(() => { if (!active || tab !== 'mine' || !privateSentinel.current || typeof IntersectionObserver === 'undefined') return; let alive = true; const observer = new IntersectionObserver(entries => { if (!alive || !entries.some(entry => entry.isIntersecting)) return; if (shown < visibleMine.length) setShown(count => Math.min(visibleMine.length, count + 50)); else if (!privateHistory?.busy && privateHistory?.canLoadMore) void privateHistory.loadMore(); }, { rootMargin: '600px 0px' }); observer.observe(privateSentinel.current); return () => { alive = false; observer.disconnect(); }; }, [active, tab, shown, visibleMine.length, privateHistory?.busy, privateHistory?.canLoadMore, privateHistory?.loadMore]);
  const filtered=publicCategories[filter];
  const sourceStates = Object.values(sources);
  const busy = sourceStates.some(source => source.busy), live = sourceStates.length === PUBLIC_SOURCES.length && sourceStates.every(source => source.status === 'live');
  const errors = PUBLIC_SOURCES.filter(source => sources[source]?.error);
  useEffect(() => {
    if (!active || tab !== 'public' || !sentinel.current || typeof IntersectionObserver === 'undefined') return;
    let alive = true; const observer = new IntersectionObserver(entries => {
      if (!alive || !entries.some(entry => entry.isIntersecting)) return;
      if (shown < filtered.length) setShown(count => Math.min(filtered.length, count + 50)); else if (!busy && !bootstrap) void loadMore();
    }, { rootMargin: '600px 0px' });
    observer.observe(sentinel.current); return () => { alive = false; observer.disconnect(); };
  }, [active, tab, shown, filtered.length, busy, bootstrap, loadMore]);
  return <section data-history-error={privateHistory?.failureCode ?? undefined}><h1>Ledger</h1><p className="page-subtitle">Every movement keeps its story.</p><div className="segmented ledger-tabs"><button className={tab === 'mine' ? 'active' : ''} onClick={() => { setPrepareMine(true); setTab('mine'); setExpanded(null); }}>My history</button><button className={tab === 'public' ? 'active' : ''} onClick={() => { setTab('public'); setExpanded(null); }}>Public</button></div>
    {tab === 'public' ? <><div className="ledger-public-header"><span><ShieldCheck size={16} />{live ? 'Public activity' : bootstrap ? 'Opening public activity…' : 'Public activity · updating sources'}</span><div className="ledger-public-tools"><button onClick={() => void refresh()} disabled={busy || bootstrap}><RefreshCw size={14} />{busy ? 'Updating…' : 'Refresh'}</button></div></div>
      <p className="body-copy small-copy">{records.length.toLocaleString()} source entries{capturedAt && !live ? ` · retained capture ${new Date(capturedAt).toLocaleDateString()}` : ''}</p>
      {errors.length > 0 && <p className="body-copy small-copy" role="status">Some public sources are unavailable: {errors.map(source => sourceLabels[source]).join(', ')}. Retained activity stays visible.</p>}
      <nav className="ledger-activity-filters" aria-label="Activity type">{ACTIVITY_FILTERS.map(value=><button key={value} aria-pressed={value===filter} onClick={()=>{setFilter(value);setShown(50);setExpanded(null);}}>{value==='all'?'All activity':value[0].toUpperCase()+value.slice(1)}</button>)}</nav><div className="rows-surface ledger-public-rows">{filtered.slice(0, shown).map(({record,executionRecords}) => <LedgerRow executionRecords={executionRecords} key={record.id} record={record} valueSource={valueSource} relations={relations} expanded={expanded === record.id} onExpand={toggleExpanded} />)}{!filtered.length && <div className="empty-state">{bootstrap || busy ? 'Opening public activity…' : records.length ? 'No matching activity in the loaded sources.' : 'Public activity could not be retrieved. Refresh to try again.'}</div>}</div>
      <div ref={sentinel} className="public-market-sentinel" aria-hidden="true" />{typeof IntersectionObserver === 'undefined' && <button className="text-button public-market-more" onClick={() => shown < filtered.length ? setShown(count => count + 50) : void loadMore()}>Show more activity</button>}
    </> : personalHistory?.available || privateHistory?.cache ? <><div className="ledger-public-header"><span>{privateHistory?.cache ? 'Your private activity' : privateHistory ? 'Your private activity' : 'History carried by your Identity Record'}</span>{privateHistory && <button onClick={() => void privateHistory.refresh()} disabled={privateHistory.busy}><RefreshCw size={14} />Refresh</button>}</div>{privateHistory?.error && <p className="body-copy small-copy" role="status">{privateHistory.error}</p>}<nav className="ledger-activity-filters" aria-label="Your activity direction">{(['all','out','in'] as const).map(direction=><button key={direction} aria-pressed={historyFilter===direction} onClick={()=>{setHistoryFilter(direction);setShown(50);setExpanded(null);}}>{direction==='all'?'All':direction==='out'?'Sent':'Received'}</button>)}</nav><div className="rows-surface">{visibleMine.slice(0, shown).map(({record,executionRecords}) => <LedgerRow personal executionRecords={executionRecords} key={record.id} record={record} valueSource={valueSource} relations={relations} expanded={expanded === record.id} onExpand={toggleExpanded} />)}{!visibleMine.length && <div className="empty-state">{privateHistory?.busy ? 'Opening your activity…' : privateHistory?.error ? 'Your activity could not be loaded. Refresh to try again.' : historyFilter!=='all' ? `No ${historyFilter==='in'?'received':'sent'} activity in the loaded history.` : privateHistory?.cache ? 'No account activity recorded yet.' : 'Previous activity is not available yet.'}</div>}</div><div ref={privateSentinel} className="public-market-sentinel" aria-hidden="true" />{(shown < visibleMine.length || privateHistory?.canLoadMore) && <button className="text-button" disabled={privateHistory?.busy} onClick={() => shown < visibleMine.length ? setShown(count => count + 50) : void privateHistory?.loadMore()}>{privateHistory?.busy ? 'Loading activity…' : 'Show more activity'}</button>}</> : <div className="empty-state"><h2>Your history</h2><p>{privateHistory?.busy ? 'Opening your private activity…' : personalHistory ? 'Your account is open. Previous activity is not available yet.' : 'Open your account to see your transactions and receipts.'}</p>{privateHistory?.error && <p className="body-copy small-copy" role="status">{privateHistory.error}</p>}{privateHistory && <button className="secondary-button" onClick={() => void privateHistory.refresh()} disabled={privateHistory.busy}>Retry history</button>}</div>}
  </section>;
}

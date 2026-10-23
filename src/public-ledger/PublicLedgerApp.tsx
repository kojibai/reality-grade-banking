import {CopyFeedbackIcon,useCopyFeedback} from '../components/CopyFeedback';
import {LedgerExecutionRecords} from '../features/ledger/LedgerExecutionRecords';
import {groupLedgerPaymentRecords,ledgerRecordTitle} from '../receiz/ledger-payment-records';
import {SiteFooter} from '../components/SiteFooter';
import {LedgerProofControls} from './LedgerProofControls';
import type {PublicLedgerFileReview} from '../receiz/public-ledger-proof';
import type {LocalLedgerDisplay} from '../receiz/public-ledger-archive';
import { memo, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, Layers3, Link2, RefreshCw, Search, Share2 } from 'lucide-react';
import {copyReceiptLink,shareReceiptLink} from '../receiz/receipt-sharing';
import {BankMark} from '../components/BankMark';
import {ledgerAssetTrade,ledgerTradeSummary} from '../receiz/ledger-asset-trade';
import { usePublicNetwork } from '../receiz/usePublicNetwork';
import { PUBLIC_SOURCES, type PublicRecord, type PublicSource } from '../receiz/public-network';
import { ACTIVITY_FILTERS, activityCategory, receiptLink,openLedgerReceipt, type ActivityCategory } from '../receiz/ledger-receipts';
import { ledgerValueForRecord, type LedgerValueIndex } from '../receiz/ledger-value';
import { LedgerInspector } from '../features/ledger/LedgerInspector';
import { LedgerValue } from '../features/ledger/LedgerValue';
import { useLedgerValueSource } from '../features/ledger/useLedgerValueSource';
import {indexLedgerRelations,ledgerCurrentAssetValue,ledgerValuationContext} from '../receiz/ledger-economy';
import {enrichWalletFundingContext} from '../receiz/ledger-wallet-enrichment';

const sourceNames:Record<PublicSource,string>={actions:'Actions',wallet:'Transactions',graph:'Proof Graph',proofs:'Proof objects'};
const PublicRow=memo(function PublicRow({record,valueSource,relations,capture,executionRecords=[]}:{executionRecords?:PublicRecord[];record:PublicRecord;valueSource:LedgerValueIndex|null;capture?:LocalLedgerDisplay;relations:ReturnType<typeof indexLedgerRelations>}){
  const title=ledgerRecordTitle(record),trade=ledgerAssetTrade(record),tradeSummary=ledgerTradeSummary(record);
  const [open,setOpen]=useState(false),[copyError,setCopyError]=useState(false);
  const {copied,confirm,clear}=useCopyFeedback(record.id);
  const value=useMemo(()=>capture?.value??ledgerValueForRecord(record,valueSource),[record,valueSource,capture]),valuation=useMemo(()=>capture?capture.valuation:ledgerValuationContext(record,valueSource,value),[capture,record,valueSource,value]),receipt=useMemo(()=>receiptLink(record,value,valuation),[record,value,valuation]),kind=activityCategory(record);
  async function copy(){try{await copyReceiptLink(receipt!);confirm();setCopyError(false);}catch{clear();setCopyError(true);}}
  async function share(){try{const result=await shareReceiptLink(receipt!);if(result==='copied')confirm();if(result!=='cancelled')setCopyError(false);}catch{clear();setCopyError(true);}}
  const currentValue=useMemo(()=>capture?capture.currentValue:/transfer|send/i.test(record.kind)?ledgerCurrentAssetValue(record,valueSource):null,[record,valueSource,capture]);
  const localReceipt=receipt?new URL(receipt).pathname+new URL(receipt).hash:null;
  return <article className={`public-ledger-row ${open?'is-open':''}`}>
    <div className="public-ledger-row-line"><button className="public-ledger-event" onClick={()=>setOpen(!open)} aria-expanded={open}><span className={`public-ledger-event-icon ${kind}`}><Layers3 size={17} strokeWidth={1.5}/></span><span><strong>{title}</strong>{tradeSummary&&<span className="ledger-trade-summary">{tradeSummary}</span>}<small>{record.time?new Date(record.time).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}):'Time not supplied'}</small></span></button><span className="public-ledger-source">{kind==='transactions'?'Transactions':sourceNames[record.source]}</span><span className="public-ledger-coordinate" title={record.kaiUpulse??record.pulse??undefined}>{record.kaiUpulse?`☤µKAI ${record.kaiUpulse}`:record.pulse?`☤KAI ${record.pulse}`:'—'}</span><button className="public-ledger-amount-toggle" onClick={()=>setOpen(!open)} aria-expanded={open} aria-label={`${open?'Close':'Inspect'} value: ${title}`}><LedgerValue inlineChange className="public-ledger-amount" value={value} currentValue={currentValue} trade={trade}/><ChevronDown className="public-ledger-chevron" size={14} strokeWidth={1.5}/></button><div className="public-ledger-receipts">{receipt&&<><a href={localReceipt!} onClick={event=>openLedgerReceipt(event,receipt,{record,value,valuation,valueSource,relations})} aria-label={`Open receipt: ${title}`} title="Open receipt"><Link2 size={15}/></a><button onClick={()=>void copy()} aria-label={`${copied?'Receipt copied':'Copy receipt'}: ${title}`} title={copied?'Copied':'Copy receipt link'}><CopyFeedbackIcon copied={copied} size={15}/></button><button onClick={()=>void share()} aria-label={`Share receipt: ${title}`} title="Share receipt"><Share2 size={14}/></button></>}</div></div>
    {open&&<div className="public-ledger-record-detail"><LedgerInspector inApp record={record} value={value} currentValue={currentValue} valuation={valuation} relations={relations} valueSource={valueSource}/><LedgerExecutionRecords records={executionRecords} valueSource={valueSource} relations={relations}/>{copyError&&<p role="status">Open the receipt to copy its link from the address bar.</p>}</div>}
  </article>;
});

export function PublicLedgerApp({active=true}:{active?:boolean}){
  const [captured,setCaptured]=useState<PublicLedgerFileReview|null>(null),archive=captured?.archive;
  const liveValueSource=useLedgerValueSource(active&&!archive),valueSource=archive?null:liveValueSource,liveLedger=usePublicNetwork(active&&!archive);
  const enrichedRecords=useMemo(()=>archive?archive.records:enrichWalletFundingContext(liveLedger.records,liveLedger.records),[archive,liveLedger.records]);
  const ledger=useMemo(()=>archive?{...liveLedger,records:enrichedRecords,capturedAt:archive.capturedAt,bootstrap:false,sources:Object.fromEntries(PUBLIC_SOURCES.map(source=>[source,{status:'stale' as const,complete:archive.coverage.find(item=>item.source===source)?.complete===true,busy:false,cursor:null,error:null}]))}:{...liveLedger,records:enrichedRecords},[archive,liveLedger,enrichedRecords]);
  const [filter,setFilter]=useState<ActivityCategory>('all'),[search,setSearch]=useState(''),[shown,setShown]=useState(60);
  const states=Object.values(ledger.sources),busy=states.some(value=>value.busy),complete=states.length===4&&states.every(value=>value.complete),live=states.length===4&&states.every(value=>value.status==='live');
  const paymentGroups=useMemo(()=>groupLedgerPaymentRecords(ledger.records),[ledger.records]);
  const records=useMemo(()=>{const query=search.trim().toLocaleLowerCase();return paymentGroups.filter(({record,executionRecords})=>(filter==='all'||activityCategory(record)===filter)&&(!query||[record,...executionRecords].some(record=>[ledgerRecordTitle(record),record.title,ledgerTradeSummary(record),record.kind,record.sourceId,record.kaiUpulse,record.pulse,record.sender,record.recipient,record.actor,...Object.values(record.evidence),...Object.values(record.valueOperands??{})].some(value=>typeof value==='string'&&value.toLocaleLowerCase().includes(query)))));},[paymentGroups,filter,search]);
  const relations=useMemo(()=>indexLedgerRelations(ledger.records),[ledger.records]),capturedValues=useMemo(()=>new Map(archive?.displayValues.map(value=>[value.id,value])??[]),[archive]);
  const {transactions,representedSources}=useMemo(()=>{
    const representedSources=new Set<PublicSource>();let transactions=0;
    for(const record of ledger.records)representedSources.add(record.source);
    for(const {record} of paymentGroups)if(['transactions','transfers'].includes(activityCategory(record)))transactions++;
    return {transactions,representedSources};
  },[ledger.records,paymentGroups]);
  // Coverage counts represented feeds, not whether their latest pagination
  // finished. A partial refresh cannot erase a feed's already retained rows.
  const coveredSources=PUBLIC_SOURCES.filter(source=>representedSources.has(source)||ledger.sources[source]?.complete).length;
  return <div className="public-ledger-page"><a className="public-ledger-skip" href="#ledger-main">Skip to public ledger</a><header className="public-ledger-header"><a className="public-ledger-brand" href="/" aria-label="Bankeiz home"><BankMark/></a><span>Public Ledger</span><nav aria-label="Main navigation"><a href="/explore/">Explore</a><a href="/learn/">Learn</a><a href="/conformance/">Conformance</a><a href="/">Enter bank<ArrowUpRight size={15}/></a></nav></header>
    <main id="ledger-main"><section className="public-ledger-hero"><div><p className="public-ledger-eyebrow">A record you can inspect</p><h1>History.<br/>In the open.</h1><p>Public activity. Connected sources.<br/>A clear view of what happened.</p></div><aside className="public-ledger-continuity" aria-label="Record continuity"><div><span>01</span><strong>Source</strong><small>Inspect the original.</small></div><i/><div><span>02</span><strong>Record</strong><small>Follow what changed.</small></div><i/><div><span>03</span><strong>Continuity</strong><small>Keep the evidence connected.</small></div></aside></section>
      <section className="public-ledger-summary" aria-label="Loaded public records"><div><span>Public records</span><strong>{ledger.records.length?ledger.records.length.toLocaleString():'—'}</strong></div><div><span>Transactions &amp; transfers</span><strong>{ledger.records.length?transactions.toLocaleString():'—'}</strong></div><div title="Public feeds represented in retained records or successfully read. Earlier history and current refresh progress are separate."><span>Source coverage</span><strong>{coveredSources} <small>/ {PUBLIC_SOURCES.length}</small></strong></div><div className="public-ledger-observation"><span className={`public-ledger-status ${live?'is-live':''}`}><i/>{live?'Public sources current':ledger.bootstrap?'Opening retained history':'Retained public history'}</span><p>{ledger.capturedAt&&!live?`Captured ${new Date(ledger.capturedAt).toLocaleDateString()}`:'Original proofs remain authoritative.'}</p></div></section>
      <div className="public-ledger-value-clock"><span><i/>Values follow their source.</span><p>{archive?'Values carried by this Crystal':valueSource?`Valuation ☤KAI ${valueSource.evaluationPulse??valueSource.source.serverPulse}`:'Opening value sources…'}<a href="/learn/how-value-works/">Inspect the rules<ArrowUpRight size={12}/></a></p></div>{archive&&<p className="public-ledger-captured" role="status"><span>Captured Ledger · {archive.records.length.toLocaleString()} sealed records</span><button onClick={()=>{setCaptured(null);setShown(60);}}>Return to live Ledger</button></p>}<LedgerProofControls ledger={{...ledger,valueSource,...archive?{displayValues:archive.displayValues}:{}}} onOpenArchive={review=>{setCaptured(review);setFilter('all');setSearch('');setShown(60);}}/><section className="public-ledger-workspace" aria-label="Public activity"><div className="public-ledger-toolbar"><nav aria-label="Activity type">{ACTIVITY_FILTERS.map(value=><button key={value} aria-pressed={filter===value} onClick={()=>{setFilter(value);setShown(60);}}>{value==='all'?'All activity':value[0].toUpperCase()+value.slice(1)}</button>)}</nav><button className="public-ledger-refresh" onClick={()=>void ledger.refresh()} disabled={!!archive||busy||ledger.bootstrap} aria-label="Refresh public activity" title="Refresh"><RefreshCw size={16} className={busy?'is-spinning':''}/></button></div><div className="public-ledger-search"><Search size={16}/><input aria-label="Search public activity" placeholder="Search activity, records or coordinates" value={search} onChange={event=>{setSearch(event.target.value);setShown(60);}}/><span>{records.length.toLocaleString()} records</span></div>
        <div className="public-ledger-table-heading" aria-hidden="true"><span>Activity</span><span>Source</span><span>Coordinate</span><span>Amount</span><span>Receipt</span></div><div className="public-ledger-records">{records.slice(0,shown).map(({record,executionRecords})=><PublicRow executionRecords={executionRecords} key={record.id} record={record} valueSource={valueSource} relations={relations} capture={capturedValues.get(record.id)}/>)}{!records.length&&<p className="public-ledger-empty">{ledger.bootstrap?'Opening public history…':search?'No matching public records.':'Public activity is unavailable. Refresh to try again.'}</p>}</div>
        {(shown<records.length||!complete&&!archive)&&<button className="public-ledger-more" disabled={shown>=records.length&&busy} onClick={()=>shown<records.length?setShown(count=>count+60):void ledger.loadMore()}>{shown<records.length?'Show more activity':busy?'Reading sources…':'Read earlier history'}<ChevronDown size={15}/></button>}
      </section><p className="public-ledger-scope">This view brings together public source projections. A listed amount, record or receipt image is not an independently verified balance. Inspect the original proof for its supported claims.</p>
    </main><SiteFooter/>
  </div>;
}

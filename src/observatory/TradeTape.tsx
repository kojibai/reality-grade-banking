import {Fragment,useState} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {formatMoney} from '../core/money';
import {LedgerTradeDetails} from '../features/ledger/LedgerTradeDetails';
import {ledgerTradeAssetTitle} from '../receiz/ledger-asset-trade';
import {ledgerInspectionDocument} from '../receiz/ledger-inspection';
import {ledgerValueForRecord} from '../receiz/ledger-value';
import {ledgerLink,type MarketExecution} from './activity';
import {Pager} from './Pager';

const pageSize=6;
const date=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
const clock=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const cents=(value:string|undefined)=>value===undefined?'—':formatMoney(value);
function ExecutionDetails({execution}:{execution:MarketExecution}){
  const {record,side,time,trade}=execution;
  const [showRecord,setShowRecord]=useState(false);
  return <div className="obs-asset-inspection obs-execution-inspection" role="region" aria-label="Trade details">
    <header className="obs-section-head"><h3>{side==='buy'?'Buy execution':'Sell execution'}</h3><a href={ledgerLink(record)}>Open in Ledger <ArrowUpRight size={15} aria-hidden="true"/></a></header>
    <LedgerTradeDetails trade={trade}/>
    <dl>
      <div><dt>Recorded (UTC)</dt><dd><time dateTime={new Date(time).toISOString()}>{date.format(time)} · {clock.format(time)}</time></dd></div>
      {trade?.notionalUsdCents!==undefined&&<div><dt>Trade volume before fees</dt><dd>{cents(trade.notionalUsdCents)}</dd></div>}
      {trade?.tradeId&&<div><dt>Trade ID</dt><dd>{trade.tradeId}</dd></div>}
      <div><dt>Ledger record</dt><dd>{record.sourceId}</dd></div>
      {record.evidence.entryHash&&<div><dt>Entry hash</dt><dd>{record.evidence.entryHash}</dd></div>}
      {record.evidence.prevHash&&<div><dt>Previous entry hash</dt><dd>{record.evidence.prevHash}</dd></div>}
    </dl>
    <details onToggle={event=>setShowRecord(event.currentTarget.open)}><summary>Exact public record</summary>
      {showRecord&&<pre>{JSON.stringify(ledgerInspectionDocument(record,ledgerValueForRecord(record)),null,2)}</pre>}
    </details>
  </div>;
}

export function TradeTape({executions}:{executions:readonly MarketExecution[]}){
  const [requestedPage,setPage]=useState(0),[inspected,setInspected]=useState('');
  const page=Math.min(requestedPage,Math.max(0,Math.ceil(executions.length/pageSize)-1));
  const end=executions.length-page*pageSize;
  const rows=executions.slice(Math.max(0,end-pageSize),end).reverse();
  return <details className="obs-trade-tape"><summary>Trade tape <span>{executions.length.toLocaleString('en-US')} executions</span></summary>
    {rows.length?<><div className="obs-table-scroll"><table aria-label="Trade executions"><colgroup><col className="obs-tape-asset"/><col className="obs-tape-time"/><col className="obs-tape-price"/><col className="obs-tape-volume"/><col className="obs-tape-inspect"/></colgroup>
      <thead><tr><th scope="col">Asset</th><th scope="col" className="obs-tape-time">Recorded (UTC)</th><th scope="col" className="obs-tape-price">Price per share</th><th scope="col">Volume</th><th scope="col" aria-label="Trade details"/></tr></thead>
      <tbody>{rows.map(execution=>{
        const {record,time,side,trade}=execution,open=inspected===record.id;
        const title=trade&&(ledgerTradeAssetTitle(trade)||trade.marketItemId)||'Asset trade';
        return <Fragment key={record.id}><tr><th scope="row"><span className="obs-tape-title" title={title}>{title}</span><small>{side==='buy'?'Buy':'Sell'}</small></th>
          <td className="obs-tape-time">{date.format(time)} · {clock.format(time)}</td><td className="obs-tape-price">{cents(trade?.priceUsdCents)}</td>
          <td><span className="obs-tape-amount" title={cents(trade?.notionalUsdCents)}>{cents(trade?.notionalUsdCents)}</span></td>
          <td><button type="button" className="obs-link-button" aria-label={'Inspect '+(side==='buy'?'purchase':'sale')+' of '+title} aria-expanded={open} aria-controls={open?'obs-trade-details':undefined} onClick={()=>setInspected(open?'':record.id)}>Inspect</button></td>
        </tr>{open&&<tr id="obs-trade-details"><td colSpan={5}><ExecutionDetails execution={execution}/></td></tr>}</Fragment>;
      })}</tbody></table></div>
      {executions.length>pageSize&&<Pager count={executions.length} page={page} size={pageSize} onPage={next=>{setInspected('');setPage(next);}}/>}</>:<p>No executions in this interval.</p>}
  </details>;
}


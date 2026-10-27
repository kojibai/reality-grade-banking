import {useEffect,useMemo,useState} from 'react';
import {ArrowUpRight,Download,ShieldCheck} from 'lucide-react';
import type {OpenIdentity} from '../../../receiz/native-identity';
import type {OrganizerEvent,NativeOrganizer} from '../../../receiz/native-organizer';
import {organizerRecord} from '../../../receiz/organizer-types';
import type {CalendarProof} from '../../../receiz/calendar-proof';
import {calendarRecord} from '../../../receiz/calendar-record';
import {peekPrivateHistory} from '../../../receiz/private-history-restore';
import {ledgerAssetTrade} from '../../../receiz/ledger-asset-trade';
import {receiptLink,openLedgerReceipt} from '../../../receiz/ledger-receipts';
import {ledgerValueForRecord} from '../../../receiz/ledger-value';
import {LedgerTradeDetails} from '../../ledger/LedgerTradeDetails';
import {LedgerFundingTrace} from '../../ledger/LedgerFundingTrace';
import {formatMoney} from '../../../core/money';
import './calendar-record.css';
/** Selected record only. All visible financial facts reuse the event or held
 * Ledger; independent proof retrieval never holds up this first frame. */
export function CalendarRecordDetails({event,identity,api}:{event:OrganizerEvent;identity:OpenIdentity;api:NativeOrganizer}){
 const facts=useMemo(()=>{const record=calendarRecord(event,api.accountUid,peekPrivateHistory(identity,api.accountUid)?.records??[]);if(!record)return null;const value=ledgerValueForRecord(record);return{record,value,trade:ledgerAssetTrade(record),href:receiptLink(record,value)};},[event,identity,api]);
 const [proof,setProof]=useState<CalendarProof|null>(null),[error,setError]=useState(false),[download,setDownload]=useState('');
 useEffect(()=>{let current=true;setProof(null);setError(false);void api.eventProof(event).then(value=>{if(current)setProof(value);}).catch(()=>{if(current)setError(true);});return()=>{current=false;};},[event,api]);
 useEffect(()=>{if(!proof)return;const href=URL.createObjectURL(new Blob([JSON.stringify(proof)],{type:'application/json'}));setDownload(href);return()=>{URL.revokeObjectURL(href);};},[proof]);
 const context=useMemo(()=>{const m=event.metadata,conversation=organizerRecord(proof?.conversation),visitor=organizerRecord(m.visitorIdentity),verifiedVisitor=organizerRecord(proof?.visitor),text=(v:unknown,max=64000)=>typeof v==='string'&&v.trim()&&v.length<=max?v:null;
  const fields:Array<[string,string]>=[],labels:Record<string,string>={status:'Status',channel:'Channel',stage:'Stage',nextAction:'Next step',contactCount:'Contacts',importedCount:'Contacts imported',deliveredCount:'Delivered',bookedCount:'Appointments',targetCount:'Target',durationMinutes:'Duration (minutes)'};
  for(const[key,label]of Object.entries(labels)){const value=m[key];if(typeof value==='string'&&value.length<=1000)fields.push([label,key==='status'?value.replaceAll('_',' ').replace(/^./,v=>v.toUpperCase()):value]);else if(typeof value==='number'&&Number.isFinite(value))fields.push([label,String(value)]);}
  return{request:text(m.request)??text(conversation.request),reply:text(m.reply)??text(conversation.reply),person:text(visitor.displayName,300)??text(visitor.username,300)??(verifiedVisitor.kind!=='unknown'?text(verifiedVisitor.label,500):null),email:text(visitor.email,300)??text(verifiedVisitor.email,300),summary:text(m.summary,4000),fields};
 },[event,proof]);
 return <section className="organizer-record" aria-label="Recorded event details">
  {(context.person||context.email)&&<div className="organizer-card"><small>With</small>{context.person&&<h4>{context.person}</h4>}{context.email&&<p>{context.email}</p>}</div>}
  {context.request&&<div className="organizer-card organizer-record-conversation"><small>Visitor’s question</small><p>{context.request}</p></div>}
  {context.reply&&<div className="organizer-card organizer-record-conversation"><small>Your agent’s response</small><p>{context.reply}</p></div>}
  {context.summary&&context.summary!==event.title&&<p className="organizer-sub">{context.summary}</p>}
  {!!context.fields.length&&<dl>{context.fields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
  {facts&&<>{facts.record.amountUsdCents!==null&&<p className="organizer-record-amount">{formatMoney(facts.record.amountUsdCents)}</p>}<LedgerTradeDetails trade={facts.trade}/>{!facts.trade&&<dl>{facts.record.sender&&<div><dt>From</dt><dd>{facts.record.sender}</dd></div>}{facts.record.recipient&&<div><dt>To</dt><dd>{facts.record.recipient}</dd></div>}{facts.record.pulse&&<div><dt>Recorded ☤KAI</dt><dd>{facts.record.pulse}</dd></div>}</dl>}<LedgerFundingTrace record={facts.record}/>{facts.href&&<a className="organizer-record-link" aria-label="View receipt" href={facts.href} onClick={click=>openLedgerReceipt(click,facts.href!,{record:facts.record,value:facts.value})}>View receipt<ArrowUpRight size={14}/></a>}</>}
  <div className="organizer-record-proof"><p><ShieldCheck size={14}/>{proof?'Record integrity checked':error?'Proof record is temporarily unavailable':'Checking this record’s proof…'}</p>{proof&&download&&<a className="organizer-record-link" href={download} download={'calendar-'+event.id+'.receiz-calendar-bundle.json'}><Download size={14}/>Download proof record</a>}{proof&&<details className="organizer-details"><summary>Record continuity</summary><dl><div><dt>Record SHA-256</dt><dd>{proof.bundleHash}</dd></div>{facts?.record.evidence.entryHash&&<div><dt>Ledger entry</dt><dd>{facts.record.evidence.entryHash}</dd></div>}</dl><p>Integrity of this Calendar record and its carried provenance. Current ownership and available funds remain established by their originals.</p></details>}</div>
 </section>;
}

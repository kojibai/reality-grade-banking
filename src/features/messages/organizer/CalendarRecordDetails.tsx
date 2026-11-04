import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,Download,ShieldCheck,RotateCw} from 'lucide-react';
import type {OpenIdentity} from '../../../receiz/native-identity';
import type {OrganizerEvent,NativeOrganizer} from '../../../receiz/native-organizer';
import {organizerRecord} from '../../../receiz/organizer-types';
import type {CalendarProof} from '../../../receiz/calendar-proof';
import {calendarRecord} from '../../../receiz/calendar-record';
import {heldCalendarRecords,isCalendarSourceEvent,calendarSourceProofUrl} from '../../../receiz/calendar-source-projection';
import {ledgerAssetTrade} from '../../../receiz/ledger-asset-trade';
import {receiptLink,openLedgerReceipt} from '../../../receiz/ledger-receipts';
import {ledgerValueForRecord} from '../../../receiz/ledger-value';
import {LedgerTradeDetails} from '../../ledger/LedgerTradeDetails';
import {LedgerFundingTrace} from '../../ledger/LedgerFundingTrace';
import {formatMoney,formatUnits} from '../../../core/money';
import {heldAccountProofBytes,isVerifiedAccountProof} from '../../../receiz/account-proof';
import './calendar-record.css';
/** Selected record only. All visible financial facts reuse the event or held
 * Ledger; independent proof retrieval never holds up this first frame. */
export function CalendarRecordDetails({event,identity,api}:{event:OrganizerEvent;identity:OpenIdentity;api:NativeOrganizer}){
 const facts=useMemo(()=>{const record=calendarRecord(event,api.accountUid,heldCalendarRecords(identity,api.accountUid));if(!record)return null;const value=ledgerValueForRecord(record);return{record,value,trade:ledgerAssetTrade(record),href:receiptLink(record,value)};},[event,identity,api]);
 const sourceOnly=isCalendarSourceEvent(event),sourceProofUrl=calendarSourceProofUrl(event);
 const accountSource=event.sourceProof?.kind==='account'?event.sourceProof.accountSourceSha256:undefined;
 const accountProof=useMemo(()=>accountSource?identity.knownCalendarAccountProof?.(accountSource):null,[identity,accountSource]);
 const transaction=useMemo(()=>{
  const held=accountProof?.statement.transactions.find(row=>row.transactionId===event.sourceProof?.sourceId&&row.eventDigest===event.metadata.entryHash);
  if(held)return held;
  // These are carried display facts from the admitted event. They do not
  // manufacture a proof capability or supply current balances or spend rights.
  const m=event.metadata,signed=(v:unknown):v is string=>typeof v==='string'&&/^(0|-?[1-9]\d{0,29})$/.test(v);
  if(!sourceOnly||!accountSource||event.ownerUserId!==api.accountUid||m.ledgerEntryId!==event.sourceProof?.sourceId||typeof m.entryHash!=='string'||!/^[a-f0-9]{64}$/i.test(m.entryHash)||!signed(m.reserveDeltaUsdCents)||!signed(m.settlementDeltaPhiMicro)||typeof m.kaiUpulse!=='string'||!/^(0|[1-9]\d{0,29})$/.test(m.kaiUpulse))return null;
  return{reserveDeltaUsdCents:m.reserveDeltaUsdCents,settlementDeltaPhiMicro:m.settlementDeltaPhiMicro,kaiUPulse:m.kaiUpulse};
 },[accountProof,event,sourceOnly,accountSource,api.accountUid]);
 const phi=(value:string)=>{const n=BigInt(value);return `${n<0n?'−':n>0n?'+':''}${formatUnits((n<0n?-n:n).toString())} Φ`;};
 const [savingAccount,setSavingAccount]=useState(false),[accountError,setAccountError]=useState(''),accountGeneration=useRef(0),accountSaving=useRef(false);
 useEffect(()=>{accountGeneration.current++;accountSaving.current=false;setSavingAccount(false);setAccountError('');return()=>{accountGeneration.current++;};},[identity,event]);
 const saveAccountProof=async()=>{
  if(!accountSource||accountSaving.current)return;const ticket=accountGeneration.current;accountSaving.current=true;setSavingAccount(true);setAccountError('');
  try{
   const proof=identity.knownCalendarAccountProof?.(accountSource)??await identity.calendarAccountProof?.(accountSource);
   if(ticket!==accountGeneration.current)return;
   if(!proof||!isVerifiedAccountProof(proof)||proof.sourceDigest!==accountSource)throw Error('CALENDAR_ACCOUNT_SOURCE_NOT_HELD');
   const href=URL.createObjectURL(new Blob([new Uint8Array(heldAccountProofBytes(proof))],{type:'application/json'}));try{const link=document.createElement('a');link.href=href;link.download=`bankeiz-account-proof-${proof.sourceDigest.slice(0,16)}.json`;link.click();}finally{setTimeout(()=>URL.revokeObjectURL(href),3000);}
  }catch{if(ticket===accountGeneration.current)setAccountError('This event’s exact account proof is not available on this device. Its recorded details are preserved.');}
  finally{if(ticket===accountGeneration.current){accountSaving.current=false;setSavingAccount(false);}}
 };
 const [proof,setProof]=useState<CalendarProof|null>(null),[error,setError]=useState(false),[download,setDownload]=useState(''),[inspect,setInspect]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{if(!inspect||sourceOnly)return;let current=true;setProof(null);setError(false);void api.eventProof(event).then(value=>{if(current)setProof(value);}).catch(()=>{if(current)setError(true);});return()=>{current=false;};},[event,api,inspect,attempt,sourceOnly]);
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
  {facts&&<>{facts.record.amountUsdCents!==null&&<p className="organizer-record-amount">{formatMoney(facts.record.amountUsdCents)}</p>}<LedgerTradeDetails trade={facts.trade}/>{!facts.trade&&<dl>{facts.record.sender&&<div><dt>From</dt><dd>{facts.record.sender}</dd></div>}{facts.record.recipient&&<div><dt>To</dt><dd>{facts.record.recipient}</dd></div>}{facts.record.pulse&&<div><dt>Recorded ☤KAI</dt><dd className="organizer-record-number">{facts.record.pulse}</dd></div>}</dl>}<LedgerFundingTrace record={facts.record}/>{facts.href&&<a className="organizer-record-link" aria-label="View receipt" href={facts.href} onClick={click=>openLedgerReceipt(click,facts.href!,{record:facts.record,value:facts.value})}>View receipt<ArrowUpRight size={14}/></a>}</>}
  {transaction&&<><dl><div><dt>Reserve change</dt><dd>{formatMoney(transaction.reserveDeltaUsdCents)}</dd></div><div><dt>Settlement change</dt><dd>{phi(transaction.settlementDeltaPhiMicro)}</dd></div><div><dt>Recorded ☤µKAI</dt><dd>{transaction.kaiUPulse}</dd></div></dl>{(accountProof||identity.calendarAccountProof)&&<button type="button" disabled={savingAccount} className="organizer-record-link" onClick={()=>void saveAccountProof()}><Download size={14}/>{savingAccount?'Opening saved proof…':'Save account proof'}</button>}{accountError&&<p className="organizer-sub" role="status">{accountError}</p>}</>}
  {sourceProofUrl&&<a className="organizer-record-link" href={sourceProofUrl}>View original proof<ArrowUpRight size={14}/></a>}
  {!sourceOnly&&<details className="organizer-record-proof" onToggle={event=>{if(event.currentTarget.open)setInspect(true);}}><summary><ShieldCheck size={14}/>Calendar proof</summary>{inspect&&<><p className="organizer-proof-status">{proof?'Record integrity checked':error?'Calendar proof check failed':'Checking this record’s proof…'}</p>{error&&<button type="button" className="organizer-proof-retry" aria-label="Retry Calendar proof check" onClick={()=>setAttempt(value=>value+1)}><RotateCw size={12}/>Retry</button>}{proof&&download&&<a className="organizer-record-link" href={download} download={'calendar-'+event.id+'.receiz-calendar-bundle.json'}><Download size={14}/>Download proof record</a>}{proof&&<details className="organizer-details"><summary>Record continuity</summary><dl><div><dt>Record SHA-256</dt><dd>{proof.bundleHash}</dd></div>{facts?.record.evidence.entryHash&&<div><dt>Ledger entry</dt><dd>{facts.record.evidence.entryHash}</dd></div>}</dl><p>Integrity of this Calendar record and its carried provenance. Current ownership and available funds remain established by their originals.</p></details>}</>}</details>}
 </section>;
}

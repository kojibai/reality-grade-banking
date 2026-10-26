import type {PublicRecord} from './public-network';
import {ledgerRecordTitle} from './ledger-payment-records';
import {formatMoney} from '../core/money';
/** Project already held account records for automatic per-question relevance.
 * Exact history remains available through the existing financial tools.
 * This projection carries no proof authority. */
export function bankTwinContextRecords(records:readonly PublicRecord[]){
 const timeFormat=new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
 const seen=new Set<string>();return records.filter(record=>{if(seen.has(record.id))return false;seen.add(record.id);return true;}).map(record=>{
  const fields={authority:'Bank display projection; not independently verified by this conversation',kind:record.kind,occurredAt:record.time,kaiUPulse:record.kaiUpulse,pulse:record.pulse,recordedUsdCents:record.amountUsdCents,sender:record.sender,recipient:record.recipient,sourceUrl:record.sourceUrl,sourceCoordinates:record.evidence};
  const base=JSON.stringify(fields);const funding=record.details?.fundingAttribution;const extra=funding?JSON.stringify({calculatedFundingAttribution:funding}):'';
  const amount=record.amountUsdCents&&/^-?\d{1,25}$/.test(record.amountUsdCents)?formatMoney(record.amountUsdCents):null;
  const at=record.time&&Number.isFinite(Date.parse(record.time))?timeFormat.format(new Date(record.time)):null;
  const title=[ledgerRecordTitle(record)||'Recorded event',amount,at].filter(Boolean).join(' · ').slice(0,160);
  return {id:record.id.slice(0,160),title,text:base.length+extra.length<2400?base+(extra?'\n'+extra:''):base.slice(0,2150)+'\nFull funding trace is available in the original Bank receipt; it is not included in this excerpt.'};
 });
}

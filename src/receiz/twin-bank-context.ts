import type {PublicRecord} from './public-network';
/** Prepare a bounded menu from already visible records only. The owner chooses
 * which excerpts to send; this projection itself carries no proof authority. */
export function bankTwinContextRecords(records:readonly PublicRecord[]){
 const seen=new Set<string>();return records.filter(record=>{if(seen.has(record.id))return false;seen.add(record.id);return true;}).slice(0,12).map(record=>{
  const fields={authority:'Owner-selected Bank display projection; not independently verified by this conversation',kind:record.kind,occurredAt:record.time,kaiUPulse:record.kaiUpulse,pulse:record.pulse,recordedUsdCents:record.amountUsdCents,sender:record.sender,recipient:record.recipient,sourceUrl:record.sourceUrl,sourceCoordinates:record.evidence};
  const base=JSON.stringify(fields);const funding=record.details?.fundingAttribution;const extra=funding?JSON.stringify({calculatedFundingAttribution:funding}):'';
  return {id:record.id.slice(0,160),title:record.title.slice(0,160)||'Recorded event',text:base.length+extra.length<2400?base+(extra?'\n'+extra:''):base.slice(0,2150)+'\nFull funding trace is available in the original Bank receipt; it is not included in this excerpt.'};
 });
}

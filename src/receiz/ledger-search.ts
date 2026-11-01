import {formatMoney} from '../core/money';
import {ledgerRecordTitle,type LedgerPaymentGroup} from './ledger-payment-records';
import type {PublicRecord} from './public-network';

const documents=new WeakMap<PublicRecord,string>();
const groupDocuments=new WeakMap<LedgerPaymentGroup,string>();
const dateLabel=new Intl.DateTimeFormat(undefined,{month:'long',day:'numeric',year:'numeric'});
const normalize=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en-US').replace(/[$,]/g,'');
function document(record:PublicRecord){
 const held=documents.get(record);if(held!==undefined)return held;
 const parts:string[]=[ledgerRecordTitle(record)];
 // Search the carried fields once. Binary Originals are not search documents.
 const collect=(value:unknown,depth=0)=>{
  if(typeof value==='string'){if(value.length<=16384)parts.push(value);}
  else if(typeof value==='number'||typeof value==='boolean')parts.push(String(value));
  else if(value&&typeof value==='object'&&depth<6)for(const [key,child]of Object.entries(value))if(!/^(?:exactBytesB64u|artifactBytes|sourceJson|bytes|base64)$/i.test(key))collect(child,depth+1);
 };
 collect(record);
 if(record.amountUsdCents!==null)parts.push(formatMoney(record.amountUsdCents));
 if(record.time){const date=new Date(record.time);if(Number.isFinite(date.getTime()))parts.push(dateLabel.format(date));}
 const result=normalize(parts.join('\n'));documents.set(record,result);return result;
}
/** Local filtering retains causal order and the original row/proof references. */
export function filterLedgerGroups<T extends readonly LedgerPaymentGroup[]>(groups:T,query:string):T|LedgerPaymentGroup[]{
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
 if(!terms.length)return groups;
 return groups.filter(group=>{let text=groupDocuments.get(group);if(text===undefined){text=[document(group.record),...group.executionRecords.map(document)].join('\n');groupDocuments.set(group,text);}return terms.every(term=>text!.includes(term));});
}

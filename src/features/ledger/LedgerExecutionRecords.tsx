import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {PublicRecord} from '../../receiz/public-network';
import type {LedgerValueIndex} from '../../receiz/ledger-value';
import {ledgerValueForRecord} from '../../receiz/ledger-value';
import {ledgerRecordTitle} from '../../receiz/ledger-payment-records';
import {ledgerValuationContext,type indexLedgerRelations} from '../../receiz/ledger-economy';
import {LedgerInspector} from './LedgerInspector';
function ExecutionRecord({record,valueSource,relations}:{record:PublicRecord;valueSource:LedgerValueIndex|null;relations:ReturnType<typeof indexLedgerRelations>}){
 const [open,setOpen]=useState(false);
 return <details className="ledger-payment-execution" onToggle={event=>setOpen(event.currentTarget.open)}><summary><span><strong>{ledgerRecordTitle(record)}</strong><small>Same payment · execution record</small></span><ChevronDown size={14} strokeWidth={1.5}/></summary>{open&&<div><p className="ledger-payment-explanation">This is the execution record for the value transfer above. Its amount refers to the same payment.</p><LedgerInspector record={record} value={ledgerValueForRecord(record,valueSource)} valuation={ledgerValuationContext(record,valueSource)} relations={relations} valueSource={valueSource} inApp/></div>}</details>;
}
export function LedgerExecutionRecords({records,valueSource,relations}:{records:readonly PublicRecord[];valueSource:LedgerValueIndex|null;relations:ReturnType<typeof indexLedgerRelations>}){
 return records.length?<div className="ledger-payment-executions" aria-label="Execution records for this payment">{records.map(record=><ExecutionRecord key={record.id} record={record} valueSource={valueSource} relations={relations}/>)}</div>:null;
}

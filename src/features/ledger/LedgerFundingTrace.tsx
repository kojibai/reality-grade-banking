import {useMemo,useState,useSyncExternalStore} from 'react';
import {Layers3,ArrowDown,FileCheck2} from 'lucide-react';
import type {PublicRecord} from '../../receiz/public-network';
import {ledgerFundingTrace,type LedgerCausalStep} from '../../receiz/ledger-funding-trace';
import {retainedProofInspection,subscribeProofInspections} from '../../receiz/proof-inspection';
import {ledgerInspectedProvenance} from '../../receiz/ledger-inspected-provenance';
import {formatMoney} from '../../core/money';
const formatPhi=(value:string)=>{const n=BigInt(value),fraction=String(n%1000000n).padStart(6,'0').replace(/0+$/,'');return `${(n/1000000n).toLocaleString('en-US')}${fraction?'.'+fraction:''}`;};
const stamp=(step:LedgerCausalStep)=>step.occurredAt?new Date(step.occurredAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):step.timeLabel??null;
function Step({step,origin=false}:{step:LedgerCausalStep;origin?:boolean}){
 const when=stamp(step);
 return <li className={origin?'is-origin':''}><i aria-hidden="true">{origin?<FileCheck2 size={14}/>:<ArrowDown size={12}/>}</i><div><header><strong>{step.label}</strong>{step.amountUsdCents!==undefined&&<b>{formatMoney(step.amountUsdCents)}</b>}</header><p>{step.detail}</p>{(when||step.kaiPulse)&&<small>{when}{when&&step.kaiPulse?' · ':''}{step.kaiPulse?`☤KAI ${BigInt(step.kaiPulse).toLocaleString('en-US')}`:''}</small>}{step.amountPhiMicro!==undefined&&BigInt(step.amountPhiMicro)>0n&&<small>{formatPhi(step.amountPhiMicro)} Φ</small>}<details className="ledger-funding-evidence"><summary>Source evidence</summary><dl>{Object.entries(step).filter(([key])=>!['label','detail','timeLabel','sourceLabel'].includes(key)).map(([key,value])=><div key={key}><dt>{key.replace(/([a-z])([A-Z])/g,'$1 $2')}</dt><dd>{Array.isArray(value)?value.join(' · '):value}</dd></div>)}{step.sourceLabel&&!step.sourceId&&<div><dt>Source label</dt><dd>{step.sourceLabel}</dd></div>}</dl></details></div></li>;
}
export function LedgerFundingTrace({record}:{record:PublicRecord}){
 const original=useSyncExternalStore(subscribeProofInspections,()=>retainedProofInspection(record.evidence.artifactDigest),()=>null);
 const trace=useMemo(()=>ledgerInspectedProvenance(record,original?.report)??ledgerFundingTrace(record),[record,original]),[open,setOpen]=useState(false),[shown,setShown]=useState(30);
 // A balance split identifies the payment's components, not their origins.
 // Wait for carried history or the digest-bound original already held by the
 // shared reader; this subscription never starts another source request.
 if(!trace.steps.length&&!trace.sources.length&&!trace.valueOrigins.length)return null;
 const title=trace.basis==='proof-object-history'||trace.valueOrigins.length&&!trace.sources.length?'Value provenance':trace.sources.length?'Funding source':'Causal history';
 return <section className="ledger-funding-trace" aria-label={title}><header><span><Layers3 size={15} strokeWidth={1.5}/>{title}</span><small>{trace.sources.length>1?'Multiple sources':trace.sources.length===1?'Source event':'Carried evidence'}</small></header>
 {trace.components.length>0&&<dl className="ledger-funding-components">{trace.components.map(component=><div key={component.rail}><dt>{trace.components.length===1?'Funding amount':component.rail==='reserve'?'Reserve':'Settlement'}</dt><dd>{formatMoney(component.amountUsdCents)}</dd></div>)}</dl>}
 {trace.valueOrigins.length>0&&<section className="ledger-value-origin"><h4>Proof-native value origin</h4><ol className="ledger-funding-path">{trace.valueOrigins.map(step=><Step key={step.id} step={step} origin/>)}</ol></section>}
 {trace.sources.length>0&&<><p className="ledger-funding-intro">{trace.sources.length.toLocaleString()} originating {trace.sources.length===1?'source':'sources'} carried by the native causal history. {trace.basis==='proof-object-history'?'The genesis and subsequent states identify the proof’s derivation; this is separate from a payment allocation.':'Source identities and amounts are preserved as recorded.'}</p><ol className="ledger-funding-path ledger-funding-origins">{trace.sources.map(step=><Step key={step.id} step={step} origin/>)}</ol></>}
 {trace.steps.length>0&&<details className="ledger-funding-full" onToggle={event=>setOpen(event.currentTarget.open)}><summary>Full causal history <span>{trace.steps.length.toLocaleString()} moments</span></summary><p>Source events, allocated value, acquisition and custody—preserved in native causal order.</p>{open&&<><ol className="ledger-funding-path">{trace.steps.slice(0,shown).map(step=><Step key={step.id} step={step}/>)}</ol>{shown<trace.steps.length&&<button className="ledger-related-more" onClick={()=>setShown(count=>count+30)}>Show earlier carried depth · {trace.steps.length-shown} remaining</button>}</>}</details>}
 {trace.boundary==='undated-source-history'&&<p className="ledger-funding-boundary">This source includes moments without exact event coordinates. The full carried history is shown; its endpoint cannot be restricted to this transaction.</p>}
 {trace.boundary==='coordinate-conflict'&&<p className="ledger-funding-boundary">The carried event coordinates disagree. A funding chain cannot be placed at this transaction.</p>}
 {trace.proofHash&&<p className="ledger-funding-hash">Causal proof head <code>{trace.proofHash}</code></p>}
 </section>;
}

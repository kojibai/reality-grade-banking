import {useMemo,useState,useSyncExternalStore} from 'react';
import {Layers3,ArrowDown,FileCheck2,ChevronDown} from 'lucide-react';
import type {PublicRecord} from '../../receiz/public-network';
import {ledgerFundingTrace,type LedgerCausalStep} from '../../receiz/ledger-funding-trace';
import {retainedProofInspection,subscribeProofInspections} from '../../receiz/proof-inspection';
import {ledgerInspectedProvenance} from '../../receiz/ledger-inspected-provenance';
import {formatMoney} from '../../core/money';
import {indexLedgerRelations} from '../../receiz/ledger-economy';
import {readWalletFundingLinks} from '../../receiz/ledger-wallet-fifo';
import {receiptLink} from '../../receiz/ledger-receipts';
import {readWalletProofCohorts,walletProofCohortForSource,type WalletProofCohort} from '../../receiz/ledger-wallet-cohorts';
import {walletFundingTimeKey} from '../../receiz/ledger-wallet-fifo';
const formatPhi=(value:string)=>{const n=BigInt(value),fraction=String(n%1000000n).padStart(6,'0').replace(/0+$/,'');return `${(n/1000000n).toLocaleString('en-US')}${fraction?'.'+fraction:''}`;};
const stamp=(step:LedgerCausalStep)=>step.occurredAt?new Date(step.occurredAt).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):step.timeLabel??null;
function ProofBasis({cohort}:{cohort:WalletProofCohort}){
 const [open,setOpen]=useState(false),[shown,setShown]=useState(30);
 return <details className="ledger-funding-basis" onToggle={event=>setOpen(event.currentTarget.open)}><summary>Underlying proof objects <span>{cohort.members.length.toLocaleString()}</span></summary><p>The originals underlying this value credit. Membership is reconstructed from the original owned-and-received source rule. The payment's FIFO slice is attributed at credit level.</p>{open&&<><ol>{cohort.members.slice(0,shown).map(member=><li key={member.objectId}><a href={member.verifyUrl} target="_blank" rel="noreferrer">{member.title}</a><small>Recorded {new Date(member.createdAt).toLocaleDateString()}{member.pulse?` · ☤KAI ${BigInt(member.pulse).toLocaleString('en-US')}`:''}</small><code>{member.objectId}</code></li>)}</ol>{shown<cohort.members.length&&<button className="ledger-related-more" onClick={()=>setShown(value=>value+30)}>Show more originals · {cohort.members.length-shown} remaining</button>}</>}</details>;
}
function Step({step,origin=false,sourceObject,objectId,cohort}:{step:LedgerCausalStep;origin?:boolean;sourceObject?:PublicRecord;objectId?:string;cohort?:WalletProofCohort}){
 const when=stamp(step);
 const sourceLink=sourceObject?.sourceUrl??(sourceObject?receiptLink(sourceObject):null);
 return <li className={origin?'is-origin':''}><i aria-hidden="true">{origin?<FileCheck2 size={14}/>:<ArrowDown size={12}/>}</i><div><header><strong>{step.label}</strong>{step.amountUsdCents!==undefined&&<b>{formatMoney(step.amountUsdCents)}</b>}</header><p>{step.detail}</p>{objectId&&<div className="ledger-funding-object">{sourceLink?<a href={sourceLink} target="_blank" rel="noreferrer"><FileCheck2 size={12}/><span>{sourceObject!.title}</span></a>:<small>Object reference <code>{objectId}</code></small>}</div>}{(when||step.kaiPulse)&&<small>{when}{when&&step.kaiPulse?' · ':''}{step.kaiPulse?`☤KAI ${BigInt(step.kaiPulse).toLocaleString('en-US')}`:''}</small>}{step.amountPhiMicro!==undefined&&BigInt(step.amountPhiMicro)>0n&&<small>{formatPhi(step.amountPhiMicro)} Φ</small>}{cohort&&<ProofBasis cohort={cohort}/>}<details className="ledger-funding-evidence"><summary>Source evidence</summary><dl>{Object.entries(step).filter(([key])=>!['label','detail','timeLabel','sourceLabel'].includes(key)).map(([key,value])=><div key={key}><dt>{key.replace(/([a-z])([A-Z])/g,'$1 $2')}</dt><dd>{Array.isArray(value)?value.join(' · '):value}</dd></div>)}{step.sourceLabel&&!step.sourceId&&<div><dt>Source label</dt><dd>{step.sourceLabel}</dd></div>}</dl></details></div></li>;
}
export function LedgerFundingTrace({record,relations}:{record:PublicRecord;relations?:ReturnType<typeof indexLedgerRelations>}){
 const original=useSyncExternalStore(subscribeProofInspections,()=>retainedProofInspection(record.evidence.artifactDigest),()=>null);
 const trace=useMemo(()=>ledgerInspectedProvenance(record,original?.report)??ledgerFundingTrace(record),[record,original]),[open,setOpen]=useState(false),[sourcesOpen,setSourcesOpen]=useState(false),[shown,setShown]=useState(30),[shownSources,setShownSources]=useState(30);
 const fundingSources=useMemo(()=>[...(readWalletFundingLinks(record.details?.fundingLinks)??[]),...(trace.attribution?.parts.flatMap(part=>part.sources)??[]),...(trace.history?.flatMap(entry=>entry.parent.parts.flatMap(part=>part.sources))??[])],[record,trace]);
 const objectRefs=useMemo(()=>new Map(fundingSources.flatMap(source=>{const id=source.marketItemId??source.assetId;return id?[[source.sourceId,id]as const]:[];})),[fundingSources]);
 const sourceIndex=useMemo(()=>new Map(fundingSources.map(source=>[source.sourceId,source])),[fundingSources]);
 const cohorts=useMemo(()=>readWalletProofCohorts(record.details?.fundingCohorts),[record]);
 const renderStep=(step:LedgerCausalStep,origin=false)=>{
  const objectId=step.kind==='post_work_proof'?step.sourceId:step.sourceId?objectRefs.get(step.sourceId):undefined;
  const sourceObject=objectId?relations?.get(`object:${objectId}`)?.find(row=>row.source==='proofs'&&(row.valueOperands?.marketItemId===objectId||row.valueOperands?.assetId===objectId)):undefined;
  const source=step.sourceId?sourceIndex.get(step.sourceId):undefined;
  const sourcePulse=step.kaiPulse??(step.kaiUpulse?String(BigInt(step.kaiUpulse)/1000000n):record.pulse??(record.kaiUpulse?String(BigInt(record.kaiUpulse)/1000000n):null));
  const selectedCohort=source?walletProofCohortForSource(cohorts,source):(trace.basis==='native-causal-history'||trace.basis==='recorded-funding-context')&&step.kind==='glyph_economy_value'?cohorts?.find(cohort=>cohort.creditSourceId===step.sourceId&&step.occurredAt&&walletFundingTimeKey(cohort.computedAt)!<=walletFundingTimeKey(step.occurredAt)!&&(!step.amountPhiMicro||(trace.context?BigInt(step.amountPhiMicro)===BigInt(cohort.amountPhiMicro):BigInt(step.amountPhiMicro)<=BigInt(cohort.amountPhiMicro)))):undefined;
  const cohort=selectedCohort?.members.every(member=>!member.pulse||sourcePulse!==null&&BigInt(member.pulse)<=BigInt(sourcePulse))?selectedCohort:undefined;
  return <Step key={step.id} step={step} origin={origin} objectId={objectId} sourceObject={sourceObject} cohort={cohort}/>;
 };
 // A balance split identifies the payment's components, not their origins.
 // Wait for carried history or the digest-bound original already held by the
 // shared reader; this subscription never starts another source request.
 if(!trace.steps.length&&!trace.sources.length&&!trace.valueOrigins.length)return null;
 const title=trace.basis==='recorded-funding-context'?'Funding source':trace.basis==='proof-object-history'||trace.valueOrigins.length&&!trace.sources.length?'Value provenance':trace.sources.length?'Funding source':'Causal history';
 return <section className="ledger-funding-trace" aria-label={title}>
 {(trace.sources.length>0||trace.valueOrigins.length>0)&&<details className="ledger-funding-sources" onToggle={event=>{if(event.target===event.currentTarget)setSourcesOpen(event.currentTarget.open);}}><summary><span><Layers3 size={15} strokeWidth={1.5}/>{title}</span><small>{trace.sources.length>1?'Multiple sources':trace.sources.length===1?'Source event':'Carried evidence'}</small><ChevronDown size={14} aria-hidden="true"/></summary>{sourcesOpen&&<>
 {trace.components.length>0&&(!trace.attribution||trace.components.length===1)&&<dl className="ledger-funding-components">{trace.components.map(component=><div key={component.rail}><dt>{trace.components.length===1?'Funding amount':component.rail==='reserve'?'Reserve':'Settlement'}</dt><dd>{formatMoney(component.amountUsdCents)}</dd></div>)}</dl>}
 {trace.valueOrigins.length>0&&<section className="ledger-value-origin"><h4>Proof-native value origin</h4><ol className="ledger-funding-path">{trace.valueOrigins.map(step=>renderStep(step,true))}</ol></section>}
 {trace.sources.length>0&&<><p className="ledger-funding-intro">{trace.context?'Recorded funding basis and exact parent payments. Source context is preserved; parent amounts remain separate from this payment.':trace.attribution?'Calculated FIFO attribution. Credits follow their source order using exact funding units. Dollar amounts reconcile to this transaction.':`${trace.sources.length.toLocaleString()} originating ${trace.sources.length===1?'source':'sources'} carried by the native causal history. ${trace.basis==='proof-object-history'?'The genesis and subsequent states identify the proof’s derivation; this is separate from a payment allocation.':'Source identities and amounts are preserved as recorded.'}`}</p>{trace.attribution&&trace.components.length===2?trace.attribution.parts.map(part=><section key={part.rail} className="ledger-funding-rail"><h4>{part.rail==='reserve'?'Reserve':'Settlement'} <span>{formatMoney(part.amountUsdCents)}</span></h4><ol className="ledger-funding-path ledger-funding-origins">{trace.sources.filter(step=>step.id.startsWith(`${part.rail}:`)).map(step=>renderStep(step,true))}</ol></section>):<ol className="ledger-funding-path ledger-funding-origins">{trace.sources.slice(0,shownSources).map(step=>renderStep(step,true))}</ol>}{trace.sources.length>shownSources&&<button className="ledger-related-more" onClick={()=>setShownSources(count=>count+30)}>Show more sources · {trace.sources.length-shownSources} remaining</button>}</>}
 </>}</details>}
 {trace.steps.length>0&&<details className="ledger-funding-full" onToggle={event=>{if(event.target===event.currentTarget)setOpen(event.currentTarget.open);}}><summary>{trace.context?'Full funding history':trace.attribution?'Attribution & source evidence':'Full causal history'} <span>{trace.steps.length.toLocaleString()} moments</span></summary><p>{trace.context?'Recorded proof basis, incoming source context and exact parent payment links.':trace.attribution?'Exact source credit references and amounts with the calculated FIFO path to this recorded debit.':'Source events, allocated value, acquisition and custody—preserved in native causal order.'}</p>{open&&<><ol className="ledger-funding-path">{trace.steps.slice(0,shown).map(step=>renderStep(step))}</ol>{shown<trace.steps.length&&<button className="ledger-related-more" onClick={()=>setShown(count=>count+30)}>Show earlier carried depth · {trace.steps.length-shown} remaining</button>}</>}</details>}
 {(sourcesOpen||open)&&<>
 {trace.context?.coverage.status==='incomplete'&&<p className="ledger-funding-boundary">The delivered record retains the available source history and exact references to its remaining originals. {trace.context.coverage.continuations.length>0?'Additional history exceeds this record’s display capacity.':'Some source originals are outside this record’s carried history.'}</p>}
 {trace.boundary==='undated-source-history'&&<p className="ledger-funding-boundary">This source includes moments without exact event coordinates. The full carried history is shown; its endpoint cannot be restricted to this transaction.</p>}
 {trace.boundary==='coordinate-conflict'&&<p className="ledger-funding-boundary">The carried event coordinates disagree. A funding chain cannot be placed at this transaction.</p>}
 {trace.proofHash&&<p className="ledger-funding-hash">Causal proof head <code>{trace.proofHash}</code></p>}
 </>}
 </section>;
}

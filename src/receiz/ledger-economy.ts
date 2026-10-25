import {ledgerPaymentReference} from './ledger-payment-records';
import {RECEIZ_VERSION} from './client';
import type {PublicRecord} from './public-network';
import {ledgerUsdCents,ledgerValueForRecord,ledgerValueRow,ledgerProofValueSeed,ledgerCardHistory,ledgerCardCopyValuation,type LedgerValueIndex,type LedgerValueDisplay} from './ledger-value';
import {ledgerCardCopyUsdAtPulse} from './ledger-card-copy';
import {DEFAULT_ISSUANCE_POLICY} from './canonical-market-issuance';
import type {LedgerFields} from './ledger-inspection';
import {publicSportsQuoteAtPulse} from './market-projection/project';
import {readWalletFundingAttribution,readWalletFundingLinks} from './ledger-wallet-fifo';

type RelationIndex=Map<string,PublicRecord[]>;
function references(record:PublicRecord){
 const v=record.valueOperands;
 const funding=[...(readWalletFundingLinks(record.details?.fundingLinks)??[]),...(readWalletFundingAttribution(record.details?.fundingAttribution)?.parts.flatMap(part=>part.sources)??[])];
 return [...new Set([v?.assetId,v?.marketItemId,v?.objectId,v?.collectibleId,record.evidence.objectId,...funding.flatMap(source=>[source.assetId,source.marketItemId])].filter((key):key is string=>!!key))];
}
export function indexLedgerRelations(records:readonly PublicRecord[]):RelationIndex {
 const index:RelationIndex=new Map();
 const put=(key:string,record:PublicRecord)=>{const rows=index.get(key);if(rows)rows.push(record);else index.set(key,[record]);};
 for(const record of records){
  for(const key of references(record))put(`object:${key}`,record);
  if(record.evidence.transferId)put(`transfer:${record.evidence.transferId}`,record);
  const payment=ledgerPaymentReference(record);if(payment&&payment!==record.evidence.transferId)put(`transfer:${payment}`,record);
  if(record.evidence.entryHash)put(`entry:${record.evidence.entryHash}`,record);
  if(record.evidence.prevHash)put(`previous:${record.evidence.prevHash}`,record);
 }
 return index;
}
export function ledgerRelatedRecords(record:PublicRecord,index:RelationIndex){
 const related=new Map<string,{record:PublicRecord;relation:string}>();
 const add=(key:string|undefined,relation:string)=>{if(!key)return;for(const candidate of index.get(key)??[])if(candidate.id!==record.id&&!related.has(candidate.id))related.set(candidate.id,{record:candidate,relation});};
 if(record.evidence.prevHash)add(`entry:${record.evidence.prevHash}`,'Previous entry');
 if(record.evidence.entryHash)add(`previous:${record.evidence.entryHash}`,'Following entry');
 if(record.evidence.transferId)add(`transfer:${record.evidence.transferId}`,'Same transfer reference');
 const payment=ledgerPaymentReference(record);if(payment&&payment!==record.evidence.transferId)add(`transfer:${payment}`,'Same transfer reference');
 for(const key of references(record))add(`object:${key}`,'Same object reference');
 return [...related.values()];
}
const valueRow=ledgerValueRow;
export function ledgerCurrentAssetValue(record:PublicRecord,index:LedgerValueIndex|null,evaluationPulse?:number):LedgerValueDisplay|null {
 const copy=ledgerCardCopyValuation(record,index,true),pulse=Math.max(evaluationPulse??index?.evaluationPulse??index?.source.serverPulse??0,copy?.copy.valuationPulse??0);
 if(!Number.isSafeInteger(pulse)||pulse<0||pulse>1e10)return null;
 if(copy){const usd=ledgerCardCopyUsdAtPulse(copy,pulse),amount=usd===undefined?undefined:ledgerUsdCents(usd);return amount===undefined?null:{basis:'live-model',amountUsdCents:amount,pulse:String(pulse),considerationUsdCents:null};}
 if(!index)return null;
 const row=valueRow(record,index);
 if(ledgerProofValueSeed(record,index,row)?.kind==='sigil'){
  const value=ledgerValueForRecord({...record,source:'proofs',sourceId:record.valueOperands?.proofValuation?.marketItemId??record.sourceId,kind:'market-asset'},evaluationPulse===undefined?index:{...index,evaluationPulse:pulse});
  return value.basis==='intrinsic-model'?{...value,basis:'live-model'}:null;
 }
 if(!row)return null;
 if(row.source==='sports-economy-card'){
  const history=ledgerCardHistory(record,index,row);
  // Only the priced representative's seed supports this individual quote.
  // Another copy in the same group must not inherit its current price.
  if(!history||history.copy.claimHash!==row.seed)return null;
  const amount=ledgerUsdCents(publicSportsQuoteAtPulse(row,pulse));
  return amount!==undefined?{basis:'live-model',amountUsdCents:amount,pulse:String(pulse),considerationUsdCents:null}:null;
 }
 return null;
}
function calculateLedgerValuationContext(record:PublicRecord,index:LedgerValueIndex|null,value:LedgerValueDisplay):LedgerFields|null {
 if(value.basis==='card-snapshot')return {sdk:RECEIZ_VERSION,calculationKind:'carried-card-snapshot',evaluationPulse:value.pulse!,cardValueUsdCents:value.amountUsdCents!,source:'Selected event value inputs',rounding:'Exact carried cents; no current-price substitution'};
 const row=valueRow(record,index),copy=ledgerCardCopyValuation(record,index);
 const common:LedgerFields=index&&row?{sdk:RECEIZ_VERSION,projectionDigest:index.source.proofObjectHash,projectionObservedAt:index.source.generatedAt,projectionPulse:index.source.serverPulse,valuationRow:row.id,source:row.source}:{sdk:RECEIZ_VERSION,projectionPulse:copy?.copy.valuationPulse??index?.evaluationPulse??index?.source.serverPulse??0,source:record.valueOperands?.proofValuation?'Carried proof-object valuation inputs':'Carried native individual-copy display model'};
 if(value.basis==='card-model'){
  const history=ledgerCardHistory(record,index,row),pulse=Number(value.pulse),usesHistory=history&&pulse>=history.issue&&pulse<=history.until;
  if(copy&&!usesHistory){const context:LedgerFields=record.valueOperands?.cardValuation?{sdk:RECEIZ_VERSION,projectionPulse:copy.copy.valuationPulse,source:'Carried native individual-copy display model'}:common;return {...context,calculationKind:'native-copy-valuation-projection',evaluationPulse:value.pulse!,sealedCopy:JSON.parse(JSON.stringify(copy.copy)) as LedgerFields,issuePulse:copy.issue,observationPulse:copy.copy.valuationPulse,valuationFunction:'SportsCardPremiumValueChart.sportsCardHistoricalLivePulseChartPoint → sportsArenaLiveValueMotionAtPulse',rounding:'Math.round(native copy USD × 100)',meaning:'Deterministic individual-copy model evaluated at the event pulse'};}
  if(!history)return null;
  return {...common,calculationKind:'native-card-history-projection',evaluationPulse:value.pulse!,collectibleId:history.copy.collectibleId,claimHash:history.copy.claimHash,sealedAt:history.copy.sealedAt,birthUsdValue:history.birth,issuePulse:history.issue,observationPulse:history.until,observation:JSON.parse(JSON.stringify(history.observation)) as LedgerFields,valuationFunction:'SportsCardPremiumValueChart.sportsCardHistoricalLivePulseChartPoint → sportsArenaLiveValueMotionAtPulse',rounding:'Math.round(native historical USD × 100)',meaning:'Deterministic source-model projection at the event pulse; not a recorded transaction quote or sale price'};
 }
 if(!index)return null;
 const seed=ledgerProofValueSeed(record,index,row);
 if(value.basis!=='intrinsic-model'||seed?.kind!=='sigil')return row?{...common,calculationKind:'source-context',sourceValueUsd:row.marketUsdValue}:null;
 return {...common,evaluationPulse:value.basis==='intrinsic-model'&&value.pulse?value.pulse:String(index.evaluationPulse??index.source.serverPulse),seed:Object.fromEntries(Object.entries(seed).filter(([,v])=>v!==null&&v!==undefined)) as LedgerFields,intrinsicFunction:'@receiz/sdk/valuation.computeIntrinsicUnsigned',quoteFunction:'canonical-market-issuance.quotePhiForUsd',quote:{referenceUsd:100,currentStreakDays:0,lifetimeUsdSoFar:0,plannedHoldBeats:0},policy:JSON.parse(JSON.stringify(DEFAULT_ISSUANCE_POLICY)) as LedgerFields,rounding:'Math.round(valuePhi × usdPerPhi × 100)'};
}
export function ledgerValuationContext(record:PublicRecord,index:LedgerValueIndex|null,value?:LedgerValueDisplay):LedgerFields|null{
 const transfer=/transfer|send|payment_sent|payment_received/i.test(record.kind);
 if(transfer&&index?.valuationTraces.has(record))return index.valuationTraces.get(record)??null;
 const resolved=value??ledgerValueForRecord(record,index),recorded=transfer||(record.source!=='proofs'&&record.kind!=='market-asset');
 const held=recorded?index?.recordedValuationTraces.get(record):undefined;
 if(held&&held.source===index?.source&&held.value===resolved)return held.context;
 const context=calculateLedgerValuationContext(record,index,resolved);
 if(transfer)index?.valuationTraces.set(record,context);
 if(recorded&&index)index.recordedValuationTraces.set(record,{source:index.source,value:resolved,context});
 return context;
}

import {RECEIZ_VERSION} from './client';
import type {PublicRecord} from './public-network';
import {ledgerUsdCents,ledgerValueForRecord,type LedgerValueIndex,type LedgerValueDisplay} from './ledger-value';
import {DEFAULT_ISSUANCE_POLICY} from './canonical-market-issuance';
import type {LedgerFields} from './ledger-inspection';

type RelationIndex=Map<string,PublicRecord[]>;
function references(record:PublicRecord){
 const v=record.valueOperands;
 return [...new Set([v?.assetId,v?.marketItemId,v?.objectId,v?.collectibleId,record.evidence.objectId].filter((key):key is string=>!!key))];
}
export function indexLedgerRelations(records:readonly PublicRecord[]):RelationIndex {
 const index:RelationIndex=new Map();
 const put=(key:string,record:PublicRecord)=>{const rows=index.get(key);if(rows)rows.push(record);else index.set(key,[record]);};
 for(const record of records){
  for(const key of references(record))put(`object:${key}`,record);
  if(record.evidence.transferId)put(`transfer:${record.evidence.transferId}`,record);
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
 for(const key of references(record))add(`object:${key}`,'Same object reference');
 return [...related.values()];
}
function valueRow(record:PublicRecord,index:LedgerValueIndex|null){
 if(!index)return null;
 const candidates=[...references(record),record.valueOperands?.claimHash,record.evidence.claimHash,record.source==='proofs'?record.sourceId:record.sourceId.startsWith('market-asset-')?record.sourceId.slice('market-asset-'.length):undefined].filter((v):v is string=>!!v&&index.rows.has(v));
 const matches=new Set(candidates.map(key=>index.rows.get(key)));
 return matches.has(null)||matches.size!==1?null:[...matches][0]??null;
}
export function ledgerCurrentAssetValue(record:PublicRecord,index:LedgerValueIndex|null):LedgerValueDisplay|null {
 const row=valueRow(record,index);if(!row||!index)return null;
 if(row.marketItem?.livePulseSeed?.kind==='sigil'){
  const value=ledgerValueForRecord({...record,source:'proofs',kind:'market-asset'},index);
  return value.basis==='intrinsic-model'?value:null;
 }
 if(row.source==='sports-economy-card'){
  const amount=ledgerUsdCents(row.marketUsdValue);
  return amount!==undefined?{basis:'source-value',amountUsdCents:amount,pulse:String(index.source.serverPulse),considerationUsdCents:null}:null;
 }
 return null;
}
export function ledgerValuationContext(record:PublicRecord,index:LedgerValueIndex|null):LedgerFields|null {
 const value=ledgerValueForRecord(record,index);
 if(value.basis==='card-snapshot')return {sdk:RECEIZ_VERSION,calculationKind:'carried-card-snapshot',evaluationPulse:value.pulse!,cardValueUsdCents:value.amountUsdCents!,source:'Selected event value inputs',rounding:'Exact carried cents; no current-price substitution'};
 const row=valueRow(record,index);if(!row||!index)return null;
 const common={sdk:RECEIZ_VERSION,projectionDigest:index.source.proofObjectHash,projectionObservedAt:index.source.generatedAt,projectionPulse:index.source.serverPulse,valuationRow:row.id,source:row.source};
 const seed=row.marketItem?.livePulseSeed;
 if(value.basis!=='intrinsic-model'||seed?.kind!=='sigil')return {...common,calculationKind:'source-context',sourceValueUsd:row.marketUsdValue};
 return {...common,evaluationPulse:value.basis==='intrinsic-model'&&value.pulse?value.pulse:String(index.evaluationPulse??index.source.serverPulse),seed:Object.fromEntries(Object.entries(seed).filter(([,v])=>v!==null&&v!==undefined)) as LedgerFields,intrinsicFunction:'@receiz/sdk/valuation.computeIntrinsicUnsigned',quoteFunction:'canonical-market-issuance.quotePhiForUsd',quote:{referenceUsd:100,currentStreakDays:0,lifetimeUsdSoFar:0,plannedHoldBeats:0},policy:JSON.parse(JSON.stringify(DEFAULT_ISSUANCE_POLICY)) as LedgerFields,rounding:'Math.round(valuePhi × usdPerPhi × 100)'};
}

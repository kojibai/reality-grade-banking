import {ledgerFundingContextTrace,type LedgerFundingContext} from './ledger-funding-context';
import {carriedLedgerCardCopyValuation} from './ledger-card-copy';
import {ledgerProofHistorySteps} from './ledger-proof-history';
import type {PublicRecord} from './public-network';
import type {LedgerFields} from './ledger-inspection';
import {readWalletFundingAttribution,readWalletFundingLinks,walletAttributionFitsRecord,type WalletFundingAttribution} from './ledger-wallet-fifo';
import {readWalletFundingHistory,type WalletFundingHistory} from './ledger-funding-history';

/** Read-only native causal projection. Never allocates fungible funds, admits
 * custody, or substitutes a display timeline for the enclosing original. */
import {readLedgerCausalLineage,type LedgerCausalStep} from './ledger-causal-source';
export {readLedgerCausalLineage,ledgerCausalLineageFields,type LedgerCausalStep,type LedgerCausalLineage} from './ledger-causal-source';
export type LedgerFundingTrace = {
 basis:'recorded-funding-context'|'native-causal-history'|'proof-object-history'|'wallet-components'|'calculated-fifo';
 boundary:'source-origins'|'origins-not-carried'|'undated-source-history'|'coordinate-conflict';
 valueOrigins:LedgerCausalStep[];sources:LedgerCausalStep[];steps:LedgerCausalStep[];
 components:{rail:'reserve'|'settlement';amountUsdCents:string}[];
 proofHash?:string;sourceSchema?:string;
 attribution?:WalletFundingAttribution;
 history?:WalletFundingHistory;
 context?:LedgerFundingContext;
};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=512):string|undefined=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v)?v:undefined;
const uint=(v:unknown):string|undefined=>typeof v==='string'&&/^(0|[1-9]\d{0,29})$/.test(v)?v:typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?String(v):undefined;
const hash=(v:unknown):string|undefined=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v)?v:undefined;
const origins=new Set(['glyph_economy_value','market_growth_credit','reserve_funding','free_claim']);
function creditLabel(source:{source?:string;entryKind?:string;marketItemId?:string},rail:'reserve'|'settlement'){
 if(source.source==='stripe_checkout_wallet_deposit'||source.source==='wallet_deposit')return 'Deposit';
 if(source.source==='stripe_checkout_connect_payment')return 'Received payment';
 if(source.source==='stripe_checkout_profile_original_download')return 'Original-file payment';
 if(source.entryKind==='note_claim')return 'Note deposit';
 if(source.entryKind==='chat_transfer_receive')return 'Incoming payment';
 if(source.marketItemId)return 'Proof-object value credit';
 if(source.source==='profile_rollup_seed'||source.source==='sigil_upload_claim')return 'Proof-native value credit';
 return rail==='reserve'?'Funding event':'Incoming value credit';
}
/** Preserve source identity on an originating wallet credit without exporting
 * arbitrary metadata, payment provider secrets, conversations or custody. */
export function ledgerFundingOriginFields(raw:unknown):LedgerFields|undefined {
 const row=object(raw),value={...object(row.metadata),...object(row.payload),...row},result:LedgerFields={};
 const retained=object(row.fundingOrigin);
 for(const fields of [value,retained]){
  for(const key of ['source','direction','entryKind','entry_kind','rail','debit_lane','settledFundingSource','sigilFingerprint','uploadHash','contentHash','valuationPolicyChecksum'] as const){const v=text(fields[key]);if(v)result[key]=v;}
  for(const key of ['claimPulse','sigilPulse'] as const){const v=uint(fields[key]);if(v!==undefined)result[key]=v;}
 }
 return Object.keys(result).length?result:undefined;
}
const empty=(boundary:LedgerFundingTrace['boundary']='origins-not-carried'):LedgerFundingTrace=>({basis:'wallet-components',boundary,valueOrigins:[],sources:[],steps:[],components:[]});
const traces=new WeakMap<PublicRecord,LedgerFundingTrace>();
export function ledgerFundingTrace(record:PublicRecord):LedgerFundingTrace {
 const cached=traces.get(record);if(cached)return cached;
 const finish=(trace:LedgerFundingTrace)=>{traces.set(record,trace);return trace;};
 if(record.pulse&&record.kaiUpulse&&BigInt(record.pulse)!==BigInt(record.kaiUpulse)/1000000n)return finish(empty('coordinate-conflict'));
 const carried=ledgerFundingContextTrace(record);if(carried)return finish(carried);
 const result=empty(),operands=record.valueOperands??{};
 const attribution=readWalletFundingAttribution(record.details?.fundingAttribution);
 const matches=attribution&&walletAttributionFitsRecord(attribution,record,!!record.evidence.transferId&&record.details?.fundingTransferId===record.evidence.transferId);
 if(matches){
  const sources:LedgerCausalStep[]=[],steps:LedgerCausalStep[]=[];
  for(const part of attribution.parts)for(const source of part.sources){
   const proof=source.marketItemId??source.assetId??source.contentHash;
   if(proof)steps.push({id:`${part.rail}:origin:${source.sourceId}`,kind:'post_work_proof',label:'Source proof object',detail:'The originating credit explicitly references this proof object.',sourceId:proof,...(source.contentHash?{contentHash:source.contentHash}:{}),...(source.sigilPulse?{kaiPulse:source.sigilPulse}:{})});
   const step:LedgerCausalStep={id:`${part.rail}:fifo:${source.sourceId}`,kind:part.rail==='reserve'?'reserve_funding':source.marketItemId?'market_growth_credit':'wallet_credit',label:creditLabel(source,part.rail),detail:'Calculated FIFO share of the recorded source credit.',sourceId:source.sourceId,amountUsdCents:source.amountUsdCents,occurredAt:source.occurredAt,...(source.amountPhiMicro?{amountPhiMicro:source.amountPhiMicro}:{}),...(source.kaiUpulse?{kaiUpulse:source.kaiUpulse,kaiPulse:String(BigInt(source.kaiUpulse)/1000000n)}:{}),...(source.contentHash?{contentHash:source.contentHash}:{}),...(source.source?{source:source.source}:{})};sources.push(step);steps.push(step);
  }
  steps.push({id:`fifo:debit:${attribution.walletDebitId}`,kind:'wallet_debit',label:'This transaction',detail:'Recorded debit; source slices above are a calculated attribution.',sourceId:attribution.walletDebitId,amountUsdCents:attribution.amountUsdCents,occurredAt:attribution.occurredAt});
  const history=readWalletFundingHistory(record.details?.fundingHistory,attribution);
  if(history){const before:LedgerCausalStep[]=[];for(const {parent}of [...history].reverse()){
   const parentTrace=ledgerFundingTrace({...record,sourceId:parent.walletDebitId,amountUsdCents:parent.amountUsdCents,time:parent.occurredAt,kaiUpulse:parent.kaiUpulse??null,pulse:parent.kaiUpulse?String(BigInt(parent.kaiUpulse)/1000000n):null,valueOperands:{settledUsdCents:parent.parts.find(part=>part.rail==='reserve')?.amountUsdCents??'0',phiUsdCents:parent.parts.find(part=>part.rail==='settlement')?.amountUsdCents??'0'},evidence:{},details:{fundingAttribution:parent as unknown as LedgerFields}});
   before.push(...parentTrace.steps.map(step=>({...step,id:`parent:${parent.walletDebitId}:${step.id}`,...(step.kind==='wallet_debit'?{label:'Parent transaction',detail:'Full funding basis of the transaction linked to this incoming credit. Its amount is separate from the selected transaction’s attributed slice.'}:{})})));
  }steps.unshift(...before);}
  const completeOrigins=attribution.parts.every(part=>part.sources.every(source=>source.contentHash||source.marketItemId||source.assetId||part.rail==='reserve'&&['stripe_checkout_wallet_deposit','stripe_checkout_connect_payment','stripe_checkout_profile_original_download','wallet_deposit','stripe_origin'].includes(source.source??'')));
  return finish({...result,basis:'calculated-fifo',boundary:completeOrigins?'source-origins':'origins-not-carried',sources,steps,components:attribution.parts.map(part=>({rail:part.rail,amountUsdCents:part.amountUsdCents})),attribution,...(history?{history}:{})});
 }
 const copy=carriedLedgerCardCopyValuation(operands.cardValuation);
 if(copy&&(!record.pulse||BigInt(copy.issue)<=BigInt(record.pulse))){
  const ids=[operands.collectibleId,operands.objectId,record.evidence.objectId].filter((id):id is string=>!!id&&id.startsWith('rsc_')),claims=[operands.claimHash,record.evidence.claimHash].filter((id):id is string=>!!id);
  const birth=Math.round(copy.copy.birthUsdValue*100);
  if((ids.length||claims.length)&&ids.every(id=>id===copy.copy.collectibleId)&&claims.every(id=>id===copy.copy.claimHash)&&Number.isSafeInteger(birth)&&birth>=0)result.valueOrigins.push({id:`proof-origin:${copy.copy.collectibleId}:${copy.copy.claimHash}`,kind:'proof_value_origin',label:'Sealed proof value',detail:'The native individual-object valuation starts from this recorded opening value and seal coordinate.',sourceId:copy.copy.collectibleId,sourceHash:copy.copy.claimHash,collectibleId:copy.copy.collectibleId,claimHash:copy.copy.claimHash,occurredAt:copy.copy.sealedAt,kaiPulse:String(copy.issue),amountUsdCents:String(birth)});
 }
 // Card-snapshot phiUsdCents is an asset valuation, not money used to buy it.
 if(!/_card_transfer_card_value_snapshot$/.test(operands.fundingRule??'')){
  for(const [key,rail] of [['settledUsdCents','reserve'],['phiUsdCents','settlement']] as const){const amount=operands[key];if(amount&&BigInt(amount)>0n)result.components.push({rail,amountUsdCents:amount});}
 }
 const lineage=readLedgerCausalLineage(record.details?.causalLineage);
 if(!lineage){
  const steps=ledgerProofHistorySteps(record);
  if(steps?.length)return finish({...result,basis:'proof-object-history',steps,sources:steps.filter(step=>step.kind==='proof_genesis'),boundary:'source-origins',sourceSchema:'receiz.proof-history.v1',proofHash:String(object(record.details?.proofHistory).historyDigest)});
  const origin=object(record.details?.fundingOrigin),source=String(origin.source??'');
  const glyph=source==='sigil_upload_claim',reserve=['stripe_checkout_wallet_deposit','stripe_checkout_connect_payment','stripe_checkout_profile_original_download','wallet_deposit','stripe_origin'].includes(source);
  if((glyph||reserve)&&origin.direction!=='debit'){
   const step:LedgerCausalStep={id:record.id,kind:glyph?'glyph_economy_value':'reserve_funding',label:glyph?'Proof-native value credit':'Reserve funding event',detail:glyph?'Value derived from the source proof at its carried claim coordinate.':'Reserve value entered through this recorded funding event.',source,sourceId:record.sourceId,...(record.time?{occurredAt:record.time}:{}),...(record.pulse?{kaiPulse:record.pulse}:{}),...(record.amountUsdCents!==null?{amountUsdCents:record.amountUsdCents}:{}),...(operands.amountPhiMicro?{amountPhiMicro:operands.amountPhiMicro}:{})};
   if(hash(origin.contentHash??origin.uploadHash))step.contentHash=String(origin.contentHash??origin.uploadHash);if(uint(origin.claimPulse))step.claimPulse=String(origin.claimPulse);
   const seal:LedgerCausalStep|undefined=glyph&&step.contentHash?{id:`source-proof:${step.contentHash}`,kind:'post_work_proof',label:'Source proof',detail:'The sealed original from which this native value credit was derived.',contentHash:step.contentHash,...(uint(origin.sigilPulse)?{kaiPulse:String(origin.sigilPulse)}:{})}:undefined;
   return finish({...result,basis:'native-causal-history',sources:[step],steps:seal?[seal,step]:[step],boundary:glyph&&!step.contentHash?'origins-not-carried':'source-origins'});
  }
  return finish(result);
 }
 const ids=[operands.collectibleId,operands.objectId,record.evidence.objectId].filter((id):id is string=>!!id&&id.startsWith('rsc_'));
 const claims=[operands.claimHash,record.evidence.claimHash].filter((id):id is string=>!!id);
 if(!ids.length&&!claims.length||ids.some(id=>id!==lineage.collectibleId)||claims.some(id=>id!==lineage.claimHash))return finish(result);
 const pulse=record.pulse??(record.kaiUpulse?String(BigInt(record.kaiUpulse)/1000000n):null),time=record.time?Date.parse(record.time):null;
 // A matching exact native transfer ID also bounds older label-only history.
 // Chronology alone never manufactures funding allocations.
 const transfer=record.evidence.transferId,selected=transfer?lineage.steps.findIndex(step=>(step.kind==='transfer'||step.kind==='trade'||step.kind==='card_sale')&&step.sourceId===transfer):-1;
 const selectedHash=selected>=0?lineage.steps[selected].id.split(':')[0]:null;
 let undated=false;
 const selectedSteps=lineage.steps.filter((step,index)=>{
  if(step.kaiPulse!==undefined&&pulse!==null)return BigInt(step.kaiPulse)<=BigInt(pulse);
  if(step.occurredAt!==undefined&&time!==null)return Date.parse(step.occurredAt)<=time;
  if(selected>=0)return index<=selected||step.id.startsWith(selectedHash+':');
  undated=true;return true;
 });
 const links=new Map(readWalletFundingLinks(record.details?.fundingLinks)?.map(link=>[link.sourceId,link]));
 const steps=selectedSteps.flatMap(step=>{
  const link=step.sourceId?links.get(step.sourceId):undefined,proof=link?.marketItemId??link?.assetId??link?.contentHash;
  if(!link||!proof||step.occurredAt&&Date.parse(link.occurredAt)>Date.parse(step.occurredAt)||link.kaiUpulse&&pulse&&BigInt(link.kaiUpulse)>BigInt(pulse)*1000000n+999999n)return [step];
  return [{id:`linked-origin:${step.id}`,kind:'post_work_proof',label:'Source proof object',detail:'The native funding credit explicitly identifies this proof object. The original causal step and its source hash remain unchanged.',sourceId:proof,...(link.contentHash?{contentHash:link.contentHash}:{}),...(link.sigilPulse?{kaiPulse:link.sigilPulse}:{})},step];
 });
 const sources=steps.filter(step=>origins.has(step.kind));
 return finish({...result,basis:'native-causal-history',steps,sources,proofHash:lineage.proofHash,sourceSchema:lineage.sourceSchema,boundary:undated?'undated-source-history':lineage.missingParentHashes?.length||sources.some(step=>step.kind==='market_growth_credit')||!sources.length?'origins-not-carried':'source-origins'});
}


import {readLedgerShareCertificate,ledgerShareCertificate,certificateShareValue,isCertificateMovement} from './ledger-share-certificate';
import {publicSigilValuationMetadata} from './market-projection/source';
import { computeIntrinsicUnsigned } from '@receiz/sdk/valuation';
import { DEFAULT_ISSUANCE_POLICY, quotePhiForUsd } from './canonical-market-issuance';
import {ledgerAssetTrade} from './ledger-asset-trade';
import type { MarketCapSource, MarketPulseSeed, MarketValueRow } from './market-projection/source';
import type { PublicRecord } from './public-network';
import {prepareSportsCopyHistory,sportsCopyHistoryUsdAtPulse,type SportsCopyHistory} from './market-projection/interpolated-history';
import {prepareLedgerCardCopyValuation,carriedLedgerCardCopyValuation,ledgerCardCopyUsdAtPulse,type LedgerCardCopyValuation} from './ledger-card-copy';
import type {LedgerFields} from './ledger-inspection';
import {marketPulseAtOrAfterTime} from './market-projection/sealed-copies';
import {publicMarketPulseSeed} from './market-projection/source';

/** Display operands only. These neither admit a proof nor establish available funds. */
export interface LedgerValueOperands {
  assetId?: string; marketItemId?: string; objectId?: string; collectibleId?: string; claimHash?: string;
  amountPhiMicro?: string; usdPerPhiMicrocents?: string; considerationUsdCents?: string;
  cardValueUsdCents?: string; proofValueUsdCents?: string; valuePulse?: string;
  fundingRule?: string; cardValueRule?: string; cardValueRecordedAt?: string; cardValueState?: string; settledUsdCents?: string; phiUsdCents?: string;
  cardValuation?:LedgerCardCopyValuation['copy'];
  proofValuation?:{assetId:string;marketItemId:string;seed:MarketPulseSeed};
}
export interface LedgerValueDisplay {
  amountUsdCents: string | null;
  basis: 'card-snapshot' | 'card-model' | 'intrinsic-model' | 'live-model' | 'source-value' | 'payment' | 'unavailable';
  pulse: string | null;
  considerationUsdCents: string | null;
  comparison?: { pulse: string; amountUsdCents: string; percent: number };
  gap?: string;
}
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === 'string' && value.length > 0 && value.length <= 512 ? value : undefined;
const uint = (value: unknown): string | undefined => typeof value === 'string' && /^(0|[1-9]\d{0,29})$/.test(value) ? value : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? String(value) : undefined;
export function ledgerUsdCents(value: unknown): string | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(value * 100)) ? String(Math.round(value * 100)) : undefined;
}
function recordedDollarCents(value: unknown): string | undefined {
  const decimal = typeof value === 'number' || typeof value === 'string' ? String(value).trim().replace(/[$,]/g, '') : '';
  if (!/^\d{1,28}(?:\.\d{1,6})?$/.test(decimal)) return;
  const [whole, fraction = ''] = decimal.split('.');
  return (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0').slice(0, 2)) + (Number(fraction[2] ?? 0) >= 5 ? 1n : 0n)).toString();
}
/** Preserve the source's supported fields, never copy arbitrary metadata into a receipt. */
export function readLedgerValueOperands(input: unknown): LedgerValueOperands {
  const raw = object(input), payload = object(raw.payload), metadata = object(raw.metadata), receipt = object(raw.valueReceipt);
  const value = { ...metadata, ...payload, ...raw }, result: LedgerValueOperands = {};
  for (const key of ['assetId', 'marketItemId', 'objectId', 'collectibleId', 'claimHash', 'fundingRule', 'cardValueRule', 'cardValueRecordedAt', 'cardValueState'] as const) {
    const field = text(value[key] ?? receipt[key]); if (field !== undefined) result[key] = field;
  }
  for (const key of ['amountPhiMicro', 'usdPerPhiMicrocents', 'considerationUsdCents', 'cardValueUsdCents', 'proofValueUsdCents', 'valuePulse', 'settledUsdCents', 'phiUsdCents'] as const) {
    const field = uint(value[key] ?? receipt[key]); if (field !== undefined) result[key] = field;
  }
  const certificate=readLedgerShareCertificate(value.certificate);for(const key of ['marketItemId','assetId'] as const){if(certificate?.[key]&&!result[key])result[key]=certificate[key];}
  const proof=object(value.proofValuation),assetId=text(proof.assetId),marketItemId=text(proof.marketItemId),rawSeed=object(proof.seed),seed=publicMarketPulseSeed(rawSeed,String(rawSeed.claimPulse));
  if(assetId&&marketItemId&&seed&&(!result.assetId||result.assetId===assetId)&&(!result.marketItemId||result.marketItemId===marketItemId))result.proofValuation={assetId,marketItemId,seed};
  // The private v129 ledger explicitly names this amount as the transferred card snapshot.
  // Its legacy missing-value fallback is zero, so zero alone cannot support a card valuation.
  const snapshots = new Set<string>();
  if (/^(sports|signal)_card_transfer_card_value_snapshot$/.test(result.fundingRule ?? '') && result.phiUsdCents && BigInt(result.phiUsdCents) > 0n) snapshots.add(result.phiUsdCents);
  for (const source of [value, receipt]) for (const key of ['cardValueUsdCents', 'transferValueUsdCents', 'settledCardValueUsdCents'] as const) {
    const field = uint(source[key]); if (field !== undefined) snapshots.add(field);
  }
  // Older carried transfer payloads name their snapshot in dollars. Preserve
  // only explicit card/transfer fields; an ask, bid or current quote is not a
  // historical transaction valuation.
  for (const source of [value, receipt]) for (const key of ['transferValueUsd', 'cardValueUsd', 'settledCardValueUsd']) {
    const field = recordedDollarCents(source[key]); if (field !== undefined) snapshots.add(field);
  }
  if (snapshots.size === 1) result.cardValueUsdCents = [...snapshots][0]; else delete result.cardValueUsdCents;
  if (snapshots.size > 1) result.cardValueState = 'conflicting-recorded-snapshots';
  const card=carriedLedgerCardCopyValuation(value.cardValuation);if(card)result.cardValuation=card.copy;
  const chart = object(raw.marketAssetChart);
  if (raw.ledgerKind === 'market-asset' && typeof chart.live === 'number' && typeof chart.usdPerPhi === 'number' && chart.live >= 0 && chart.usdPerPhi > 0) {
    const quoted = ledgerUsdCents(chart.live * chart.usdPerPhi), pulse = uint(raw.sortKaiPulse);
    if (quoted !== undefined) result.proofValueUsdCents = quoted;
    if (pulse !== undefined) result.valuePulse = pulse;
  }
  return result;
}
export function readLedgerValueDisplay(input: unknown): LedgerValueDisplay | null {
  const value = object(input);
  if (!['card-snapshot', 'card-model', 'intrinsic-model', 'live-model', 'source-value', 'payment', 'unavailable'].includes(String(value.basis))) return null;
  const amount = uint(value.amountUsdCents), pulse = uint(value.pulse), consideration = uint(value.considerationUsdCents);
  if (value.amountUsdCents !== null && amount === undefined || value.pulse !== null && pulse === undefined) return null;
  const result: LedgerValueDisplay = { amountUsdCents: amount ?? null, basis: value.basis as LedgerValueDisplay['basis'], pulse: pulse ?? null, considerationUsdCents: consideration ?? null };
  const comparison = object(value.comparison), previousAmount = uint(comparison.amountUsdCents), previousPulse = uint(comparison.pulse);
  if (previousAmount && previousPulse && amount && pulse && BigInt(previousPulse) < BigInt(pulse) && BigInt(previousAmount) > 0n) {
    const percent = (Number(amount) / Number(previousAmount) - 1) * 100;
    if (Number.isFinite(percent)) result.comparison = { pulse: previousPulse, amountUsdCents: previousAmount, percent };
  }
  return result;
}
export type LedgerValueIndex = { source: MarketCapSource; evaluationPulse?:number; rows: Map<string, MarketValueRow | null>; cardHistory:Map<MarketValueRow,SportsCopyHistory>; copyValuations:Map<string,LedgerCardCopyValuation|null>; transferValues:WeakMap<PublicRecord,LedgerValueDisplay>; valuationTraces:WeakMap<PublicRecord,LedgerFields|null>; recordedValuationTraces:WeakMap<PublicRecord,{source:MarketCapSource;value:LedgerValueDisplay;context:LedgerFields|null}> };
export function indexLedgerValues(source: MarketCapSource): LedgerValueIndex {
  const rows = new Map<string, MarketValueRow | null>(),cardHistory=new Map<MarketValueRow,SportsCopyHistory>(),copyValuations=new Map<string,LedgerCardCopyValuation|null>();
  for (const row of source.valueRows) {
    for (const key of new Set([row.id,row.seed,row.marketItem?.id,...(row.sealedCopies??row.sealedBirths??[]).flatMap(copy=>[copy.collectibleId,copy.claimHash])].filter((key): key is string => Boolean(key)))) {
      if (!rows.has(key)) rows.set(key, row); else if (rows.get(key) !== row) rows.set(key, null);
    }
    const history=prepareSportsCopyHistory(row);if(history&&history.until<=source.serverPulse)cardHistory.set(row,history);
    for(const copy of row.sealedCopies??[]){const value=prepareLedgerCardCopyValuation(copy,row,source.serverPulse);if(!value)continue;for(const key of [copy.collectibleId,copy.claimHash])copyValuations.set(key,copyValuations.has(key)?null:value);}
  }
  return { source, rows,cardHistory,copyValuations,transferValues:new WeakMap(),valuationTraces:new WeakMap(),recordedValuationTraces:new WeakMap() };
}
const pricingFields=['id','source','seed','baseUsdValue','birthUsdValue','marketUsdValue','proofTotalValueUsd','scoreDelta','quoteUsdPerPhi','historyEvaluationPulse'];
const groupFields=['sport','cardId','rarity'],modelFields=['baseUsdValue','birthUsdValue','marketUsdValue','proofTotalValueUsd','scoreDelta','seed'];
const observationFields=['at','usdValue','scope','pricedCopies','vaultCopies','sourceHash','collectibleId','claimHash'];
const itemFields=['id','source','priceUsd','pricePhi','quoteUsdPerPhi','changePct','pricingSourceKey'],seedFields=['kind','claimPulse','beat','stepIndex','frequencyHz','creatorVerified','chakraDay','kaiSignature','userPhiKey'];
const copyFields=['collectibleId','claimHash','sealedAt','birthUsdValue','proofValueUsd','currentValueUsd','valuationPulse'],quoteFields=['at','usdValue','basis','pulse'];
function sameFields(a:unknown,b:unknown,keys:readonly string[]){if(a===b)return true;if(!a||!b)return false;const left=a as Record<string,unknown>,right=b as Record<string,unknown>;return keys.every(key=>left[key]===right[key]);}
function sameList<T>(a:readonly T[]|undefined,b:readonly T[]|undefined,equal:(a:T,b:T)=>boolean):boolean{return a===b||!!a&&!!b&&a.length===b.length&&a.every((value,i)=>equal(value,b[i]));}
function sameCopies(a:MarketValueRow['sealedCopies'],b:MarketValueRow['sealedCopies']){return sameList(a,b,(left,right)=>sameFields(left,right,copyFields)&&sameFields(left.valuation,right.valuation,modelFields)&&sameList(left.valueHistory,right.valueHistory,(x,y)=>sameFields(x,y,quoteFields)));}
/** A locally advancing display pulse does not change the original operands.
 * Keep the event index and memoized receipts across those existing updates. */
export function sameLedgerValueInputs(before:MarketCapSource,after:MarketCapSource):boolean{
 if(before.proofObjectHash!==after.proofObjectHash||before.generatedAt!==after.generatedAt||before.valueRows.length!==after.valueRows.length)return false;
 return before.valueRows.every((row,i)=>{const next=after.valueRows[i];return sameFields(row,next,pricingFields)&&sameCopies(row.sealedCopies,next.sealedCopies)&&sameList(row.sealedBirths,next.sealedBirths,(a,b)=>sameFields(a,b,copyFields))&&sameFields(row.sportsGroup,next.sportsGroup,groupFields)&&sameFields(row.historyObservation,next.historyObservation,observationFields)&&sameFields(row.historyObservation?.model,next.historyObservation?.model,modelFields)&&sameFields(row.historyObservation?.group,next.historyObservation?.group,groupFields)&&sameFields(row.marketItem,next.marketItem,itemFields)&&sameFields(row.marketItem?.livePulseSeed,next.marketItem?.livePulseSeed,seedFields)&&(!row.historyObservation||(marketPulseAtOrAfterTime(row.historyObservation.at)<=before.serverPulse)===(marketPulseAtOrAfterTime(row.historyObservation.at)<=after.serverPulse))&&(row.sealedCopies??[]).every(copy=>copy.valuationPulse===undefined||(copy.valuationPulse<=before.serverPulse)===(copy.valuationPulse<=after.serverPulse));});
}
export function ledgerCardCopyValuation(record:PublicRecord,index:LedgerValueIndex|null,current=false):LedgerCardCopyValuation|null{
 const operands=record.valueOperands;
 const ids=[operands?.collectibleId,operands?.objectId,record.evidence.objectId].filter((id):id is string=>!!id&&id.startsWith('rsc_'));
 const claims=[operands?.claimHash,record.evidence.claimHash].filter((hash):hash is string=>!!hash);
 const carried=carriedLedgerCardCopyValuation(operands?.cardValuation);
 const bound=(value:LedgerCardCopyValuation)=>(ids.length>0||claims.length>0)&&ids.every(id=>id===value.copy.collectibleId)&&claims.every(hash=>hash===value.copy.claimHash);
 const held=carried&&bound(carried)?carried:null;
 if(held&&!current||!index)return held;
 // A claim hash selects the exact original when several originals share a
 // collectible ID. Every supplied ID still has to bind to that selection.
 const candidates=(claims.length?claims:ids).filter(key=>index.copyValuations.has(key)).map(key=>index.copyValuations.get(key));
 const values=new Set(candidates.filter((value):value is LedgerCardCopyValuation=>!!value));if(candidates.some(value=>value===null)||values.size!==1)return held;
 const value=[...values][0];if(!bound(value))return held;
 return held&&(value.copy.valuationPulse<held.copy.valuationPulse||value.copy.birthUsdValue!==held.copy.birthUsdValue||Date.parse(value.copy.sealedAt)!==Date.parse(held.copy.sealedAt))?held:value;
}
/** Shared by valuation and its receipt trace, so conflicting identifiers never
 * resolve to one object in the amount and a different object in inspection. */
export function ledgerValueRow(record:PublicRecord,index:LedgerValueIndex|null):MarketValueRow|null{
  const operands=record.valueOperands;
  const keys=[operands?.marketItemId,operands?.assetId,operands?.objectId,operands?.collectibleId,operands?.claimHash,record.evidence.objectId,record.evidence.claimHash,record.source==='proofs'?record.sourceId:record.sourceId.startsWith('market-asset-')?record.sourceId.slice('market-asset-'.length):undefined];
  const resolved=index?keys.filter((key):key is string=>!!key&&index.rows.has(key)).map(key=>index.rows.get(key)):[];
  const matches=new Set(resolved.filter((row):row is MarketValueRow=>!!row));
  return resolved.some(row=>row===null)||matches.size!==1?null:[...matches][0];
}
/** A proof may already carry its Market inputs even when it is not listed in
 * the capitalization snapshot. Keep their exact object binding; a conflicting
 * recognized index entry cannot be bypassed by a carried display operand. */
export function ledgerProofValueSeed(record:PublicRecord,index:LedgerValueIndex|null,row=ledgerValueRow(record,index)):MarketPulseSeed|null{
 const carried=record.valueOperands?.proofValuation,keys=[record.valueOperands?.assetId,record.valueOperands?.marketItemId,record.valueOperands?.objectId,record.evidence.objectId,record.evidence.claimHash,record.valueOperands?.claimHash,record.source==='proofs'?record.sourceId:undefined];
 if(!row&&keys.some(key=>key&&index?.rows.has(key)))return null;
 const live=row?.source==='market-desk-live-asset'?row.marketItem?.livePulseSeed:null;
 if(!carried)return live??null;
 if(record.valueOperands?.assetId&&record.valueOperands.assetId!==carried.assetId||record.valueOperands?.marketItemId&&record.valueOperands.marketItemId!==carried.marketItemId||record.evidence.objectId&&record.evidence.objectId!==carried.assetId||record.source==='proofs'&&record.sourceId!==carried.marketItemId)return null;
 if(live){
  const selected=publicMarketPulseSeed(live,String(live.claimPulse));
  if(!selected||row?.seed!==carried.assetId||row.marketItem?.id!==carried.marketItemId)return null;
  const {frequencyHz:currentFrequency,...currentCore}=selected,{frequencyHz:recordedFrequency,...recordedCore}=carried.seed;
  if(JSON.stringify(currentCore)!==JSON.stringify(recordedCore)||currentFrequency!==undefined&&recordedFrequency!==undefined&&currentFrequency!==recordedFrequency)return null;
  // Complete a public derived valuation input only. Executed amounts are read
  // separately; an explicit conflicting operand is never replaced.
  if(recordedFrequency===undefined&&currentFrequency!==undefined)return {...carried.seed,frequencyHz:currentFrequency};
 }
 return carried.seed;
}
export function ledgerCardHistory(record:PublicRecord,index:LedgerValueIndex|null,row=ledgerValueRow(record,index)):SportsCopyHistory|null{
  const history=row&&index?.cardHistory.get(row);if(!history)return null;
  const operands=record.valueOperands;
  const copies=[operands?.collectibleId,operands?.objectId,record.evidence.objectId].filter((id):id is string=>!!id&&id.startsWith('rsc_'));
  const claims=[operands?.claimHash,record.evidence.claimHash].filter((hash):hash is string=>!!hash);
  // A group can contain several copies. Every carried individual identifier
  // must bind to this particular model, even if all aliases resolve to one row.
  return (copies.length||claims.length)&&copies.every(id=>id===history.copy.collectibleId)&&claims.every(hash=>hash===history.copy.claimHash)?history:null;
}
function valueAtPulse(seed: MarketPulseSeed, pulse: number): string | null {
  if (!Number.isSafeInteger(pulse) || pulse < seed.claimPulse) return null;
  const meta = publicSigilValuationMetadata(seed);
  const computed = computeIntrinsicUnsigned(meta, pulse);
  const quote = quotePhiForUsd({ meta, nowPulse: pulse, usd: 100, currentStreakDays: 0, lifetimeUsdSoFar: 0, plannedHoldBeats: 0 }, DEFAULT_ISSUANCE_POLICY, computed);
  const phi = computed.unsigned.valuePhi;
  return quote.usdPerPhi > 0 ? ledgerUsdCents(phi * quote.usdPerPhi) ?? null : null;
}
function calculateLedgerValue(record: PublicRecord, index: LedgerValueIndex | null): LedgerValueDisplay {
  const operands = readLedgerValueOperands(record.valueOperands), transfer = /transfer|send|payment_sent|payment_received/i.test(record.kind);
  const card = /(?:card|proof|original)[._-]transfer/i.test(record.kind);
  const eventPulse = record.pulse ?? (record.kaiUpulse ? String(BigInt(record.kaiUpulse) / 1_000_000n) : null);
  if(isCertificateMovement(record.kind)){
   const certificate=ledgerShareCertificate(record),seed=certificate?ledgerProofValueSeed(record,index):null;
   const cents=seed&&eventPulse&&(!record.kaiUpulse||BigInt(record.kaiUpulse)/1000000n===BigInt(eventPulse))?valueAtPulse(seed,Number(eventPulse)):null;
   return {amountUsdCents:certificate&&cents!==null?certificateShareValue(cents,certificate.shareQuantityMicro):null,basis:certificate&&cents!==null?'intrinsic-model':'unavailable',pulse:eventPulse,considerationUsdCents:null};
  }
  const trade=ledgerAssetTrade(record);
  if(trade?.settlementUsdCents!==undefined)return {amountUsdCents:trade.settlementUsdCents,basis:'payment',pulse:eventPulse,considerationUsdCents:null};
  if (operands.cardValueState === 'conflicting-recorded-snapshots') return { amountUsdCents: null, basis: 'unavailable', pulse: eventPulse, considerationUsdCents: null, gap: 'The source carries conflicting card value snapshots.' };
  if (transfer && record.pulse && record.kaiUpulse && BigInt(record.pulse) !== BigInt(record.kaiUpulse) / 1_000_000n) return { amountUsdCents: null, basis: 'unavailable', pulse: null, considerationUsdCents: null, gap: 'The source pulse and micro-pulse disagree.' };
  const snapshotAmountIsCard = /_card_value_snapshot$/.test(operands.fundingRule ?? '');
  const consideration = operands.considerationUsdCents ?? (snapshotAmountIsCard ? null : record.amountUsdCents);
  if (transfer && operands.cardValueUsdCents !== undefined && eventPulse && (!operands.valuePulse || operands.valuePulse === eventPulse)) return { amountUsdCents: operands.cardValueUsdCents, basis: 'card-snapshot', pulse: eventPulse, considerationUsdCents: consideration };
  if(transfer&&operands.cardValueUsdCents!==undefined&&operands.valuePulse&&operands.valuePulse!==eventPulse)return{amountUsdCents:null,basis:'unavailable',pulse:eventPulse,considerationUsdCents:consideration,gap:'The carried card snapshot belongs to a different event pulse.'};
  const keys = [operands.marketItemId, operands.assetId, operands.objectId, operands.collectibleId, operands.claimHash, record.evidence.objectId, record.evidence.claimHash, record.source === 'proofs' ? record.sourceId : record.sourceId.startsWith('market-asset-') ? record.sourceId.slice('market-asset-'.length) : undefined];
  const resolved=index?keys.filter((key):key is string=>!!key&&index.rows.has(key)).map(key=>index.rows.get(key)):[];
  const matches=new Set(resolved.filter((row):row is MarketValueRow=>!!row));
  if(resolved.some(row=>row===null)||matches.size>1)return{amountUsdCents:null,basis:'unavailable',pulse:eventPulse,considerationUsdCents:consideration,gap:'The source asset references disagree or are ambiguous.'};
  const row=[...matches][0]??null;
  if(card&&transfer&&eventPulse){
    const history=ledgerCardHistory(record,index,row),usd=history?sportsCopyHistoryUsdAtPulse(history,Number(eventPulse)):undefined;
    const cents=usd===undefined?undefined:ledgerUsdCents(usd);
    if(cents!==undefined)return{amountUsdCents:cents,basis:'card-model',pulse:eventPulse,considerationUsdCents:consideration};
    const copy=ledgerCardCopyValuation(record,index),copyUsd=copy?ledgerCardCopyUsdAtPulse(copy,Number(eventPulse)):undefined,copyCents=copyUsd===undefined?undefined:ledgerUsdCents(copyUsd);
    if(copyCents!==undefined)return {amountUsdCents:copyCents,basis:'card-model',pulse:eventPulse,considerationUsdCents:consideration};
  }
  const seed = ledgerProofValueSeed(record,index,row);
  const isProof = record.source === 'proofs' || record.kind === 'market-asset';
  if (seed?.kind === 'sigil' && (transfer || isProof)) {
    const pulse = transfer ? Number(eventPulse) : index?.evaluationPulse??index?.source.serverPulse;
    const amountUsdCents = pulse!==undefined&&(eventPulse !== null || isProof) ? valueAtPulse(seed, pulse) : null;
    if (amountUsdCents !== null) {
      const result: LedgerValueDisplay = { amountUsdCents, basis: 'intrinsic-model', pulse: String(pulse), considerationUsdCents: transfer ? consideration : null };
      const previous = !transfer ? valueAtPulse(seed, pulse! - 1) : null;
      if (previous && BigInt(previous) > 0n) result.comparison = { pulse: String(pulse! - 1), amountUsdCents: previous, percent: (Number(amountUsdCents) / Number(previous) - 1) * 100 };
      return result;
    }
  }
  if (isProof && operands.proofValueUsdCents !== undefined) return { amountUsdCents: operands.proofValueUsdCents, basis: 'source-value', pulse: operands.valuePulse ?? null, considerationUsdCents: null };
  if (card) return { amountUsdCents: null, basis: 'unavailable', pulse: eventPulse, considerationUsdCents: consideration, gap: 'The source carries no object value operands at this transfer coordinate.' };
  if (consideration !== null) return { amountUsdCents: consideration, basis: 'payment', pulse: eventPulse, considerationUsdCents: null };
  return { amountUsdCents: null, basis: 'unavailable', pulse: eventPulse, considerationUsdCents: null, gap: 'The source carries no supported value operands.' };
}
/** Event coordinates do not advance with the UI clock. Reuse their result for
 * list, inspector and receipt, including subsequent live-pulse renders. The
 * existing event cache also covers notes, trades and other recorded payments;
 * proof listings still evaluate at the current display pulse. A changed input
 * index owns a fresh cache, so newly supplied value operands remain visible. */
export function ledgerValueForRecord(record:PublicRecord,index:LedgerValueIndex|null=null):LedgerValueDisplay{
  const recorded=/transfer|send|payment_sent|payment_received/i.test(record.kind)||(record.source!=='proofs'&&record.kind!=='market-asset'),held=recorded?index?.transferValues.get(record):undefined;
  if(held)return held;
  const value=calculateLedgerValue(record,index);
  if(recorded)index?.transferValues.set(record,value);
  return value;
}
export function ledgerValueLabel(value: LedgerValueDisplay): string {
  return value.basis === 'card-snapshot' ? 'Card value at transfer' : value.basis==='card-model'?'Calculated transfer value':value.basis==='live-model'?'Current live value':value.basis === 'intrinsic-model' ? 'Calculated value' : value.basis === 'source-value' ? 'Carried value' : value.basis === 'payment' ? 'Recorded amount' : 'Value unavailable';
}

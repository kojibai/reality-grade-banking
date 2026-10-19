import {publicSportsSealedCopies,publicSportsSealedBirths,type MarketSealedCopy,type MarketSealedBirth} from './sealed-copies.js';
import {boundSportsHistoryObservation,publicSportsGroupIdentity,publicSportsHistorySnapshot,sameSportsPricingOperands,type SportsGroupIdentity,type SportsHistoryObservation,type SportsHistorySnapshot} from './sports-observations.js';
import {marketPulseAtOrAfterTime} from './sealed-copies.js';
/** Public Proof Graph display source, never ownership, cash backing or execution authority. */
export interface MarketPulseSeed { kind: string; claimPulse: number; beat: number; stepIndex: number; creatorVerified: boolean; chakraDay?: string | null; kaiSignature?: string | null; userPhiKey?: string | null; }
export interface MarketValueRow { id: string; source: 'market-desk-live-asset' | 'sports-economy-card'; baseUsdValue: number; birthUsdValue: number; marketUsdValue: number; proofTotalValueUsd: number; scoreDelta: number; seed: string; quoteUsdPerPhi?: number; sportsGroup?:SportsGroupIdentity;sealedCopies?:MarketSealedCopy[];sealedBirths?:MarketSealedBirth[];historyObservation?:SportsHistoryObservation;historyEvaluationPulse?:number;marketItem?: { id: string; source: string; priceUsd: number; pricePhi: number; quoteUsdPerPhi: number; changePct: number; pricingSourceKey?: string; livePulseSeed?: MarketPulseSeed | null; }; }
export interface MarketCapSource { schema: 'receiz.proof_graph.market_cap_projection.v1'; source: string; proofObjectHash: string; generatedAt: string; firstIssuancePulse: number; serverPulse: number; currentUsd: number; cardsInCirculation: number; sportsCardsPriced: number; marketAssetsPriced: number; valueRows: MarketValueRow[];unpricedSealedBirths?:MarketSealedBirth[];sportsHistorySnapshot?:SportsHistorySnapshot;sportsHistoryEvaluationPulse?:number;sourceEvaluation?:{pulse:number;usdValue:number;sourceHash:string};undatedHistory?:{rows:number;undatedRows?:number;birthOnlyRows?:number;unpricedCopies?:number;observationPulse:number;observationUsd:number;sourceReportedTotalUsd:number;modelPulse:number}; }
/** Existing public valuation operands only; this display input grants no rights. */
export function publicMarketPulseSeed(input:unknown,pulse:unknown):MarketPulseSeed|undefined{
 const seed=input as MarketPulseSeed|null;
 if(!seed||seed.kind!=='sigil'||typeof pulse!=='string'||!/^\d{1,10}$/.test(pulse)||!Number.isSafeInteger(seed.claimPulse)||seed.claimPulse<0||seed.claimPulse>1e10||seed.claimPulse!==Number(pulse)||!Number.isInteger(seed.beat)||seed.beat<0||seed.beat>35||!Number.isInteger(seed.stepIndex)||seed.stepIndex<0||seed.stepIndex>43||typeof seed.creatorVerified!=='boolean')return;
 for(const key of ['chakraDay','kaiSignature','userPhiKey']as const)if(seed[key]!=null&&(typeof seed[key]!=='string'||seed[key]!.length>(key==='chakraDay'?64:512)))return;
 return {kind:seed.kind,claimPulse:seed.claimPulse,beat:seed.beat,stepIndex:seed.stepIndex,creatorVerified:seed.creatorVerified,...Object.fromEntries((['chakraDay','kaiSignature','userPhiKey']as const).filter(key=>seed[key]!==undefined).map(key=>[key,seed[key]]))};
}
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 1e13;
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const text = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 512;
/** Retained public display fields are checked before worker or JSX use. */
export function validUndatedMarketHistory(input:unknown):boolean{
 if(input===undefined)return true;
 if(!input||typeof input!=='object'||Array.isArray(input))return false;
 const value=input as NonNullable<MarketCapSource['undatedHistory']>;
 return count(value.rows)&&value.rows<=10000&&(value.rows>0||count(value.unpricedCopies)&&Number(value.unpricedCopies)>0)&&(value.unpricedCopies===undefined||count(value.unpricedCopies)&&value.unpricedCopies<=10000)&&count(value.observationPulse)&&value.observationPulse<=1e10&&count(value.modelPulse)&&value.modelPulse>=value.observationPulse&&value.modelPulse<=1e10&&finite(value.observationUsd)&&finite(value.sourceReportedTotalUsd)&&value.sourceReportedTotalUsd>=0&&[value.undatedRows,value.birthOnlyRows].every(rows=>rows===undefined||count(rows)&&rows<=value.rows)&&(value.undatedRows===undefined||value.birthOnlyRows===undefined||value.undatedRows+value.birthOnlyRows===value.rows);
}
export function validMarketSourceHistory(input:Pick<MarketCapSource,'sportsHistorySnapshot'|'sportsHistoryEvaluationPulse'|'sourceEvaluation'>):boolean{
 if(input.sportsHistorySnapshot!==undefined&&!publicSportsHistorySnapshot(input.sportsHistorySnapshot))return false;
 if(input.sportsHistoryEvaluationPulse!==undefined&&(!count(input.sportsHistoryEvaluationPulse)||input.sportsHistoryEvaluationPulse>1e10))return false;
 const evaluation=input.sourceEvaluation;if(evaluation&&(!count(evaluation.pulse)||evaluation.pulse>1e10||!finite(evaluation.usdValue)||evaluation.usdValue<0||!/^[a-f0-9]{64}$/.test(evaluation.sourceHash)))return false;
 return input.sourceEvaluation===undefined||!!evaluation&&typeof evaluation==='object'&&!Array.isArray(evaluation);
}
/** A newer price evaluation cannot erase exact carried seals or earlier records. */
export function retainMarketSourceHistory(next:MarketCapSource,previous:MarketCapSource|null):MarketCapSource{
 if(!previous)return next;
 const held=new Map(previous.valueRows.map(row=>[row.id,row]));
 const valueRows=next.valueRows.map(row=>{
  const prior=held.get(row.id);if(row.source!=='sports-economy-card'||prior?.seed!==row.seed)return row;
  const record=row.historyObservation??prior.historyObservation,changed=record&&!sameSportsPricingOperands(row,prior),capture=record&&Date.parse(next.generatedAt)>Date.parse(record.at)?Math.min(next.serverPulse,marketPulseAtOrAfterTime(next.generatedAt)):next.serverPulse;
  const target={...row,...(!row.sportsGroup&&prior.sportsGroup?{sportsGroup:prior.sportsGroup}:{}),...(!row.sealedCopies&&prior.sealedCopies?{sealedCopies:prior.sealedCopies}:{}),...(!row.sealedBirths&&prior.sealedBirths?{sealedBirths:prior.sealedBirths}:{})};
  const historyObservation=boundSportsHistoryObservation(record,target);
  return {...target,historyObservation,...(historyObservation&&row.historyEvaluationPulse===undefined&&(changed||prior.historyEvaluationPulse!==undefined)?{historyEvaluationPulse:changed?capture:prior.historyEvaluationPulse}:{})};
 });
 const identity=(copy:MarketSealedBirth)=>`${copy.collectibleId.toLowerCase()}:${copy.claimHash.toLowerCase()}`;
 const priced=new Set(valueRows.flatMap(row=>(row.sealedCopies??row.sealedBirths??[]).map(identity))),unpriced=new Map((previous.unpricedSealedBirths??[]).map(copy=>[identity(copy),copy]));
 for(const copy of next.unpricedSealedBirths??[])unpriced.set(identity(copy),copy);
 for(const id of priced)unpriced.delete(id);
 if(unpriced.size>10000)throw Error('Public sealed birth coverage exceeds capacity.');
 return {...next,valueRows,unpricedSealedBirths:unpriced.size?[...unpriced.values()]:undefined,sportsHistorySnapshot:next.sportsHistorySnapshot??previous.sportsHistorySnapshot,sportsHistoryEvaluationPulse:next.sportsHistoryEvaluationPulse??previous.sportsHistoryEvaluationPulse,sourceEvaluation:next.sourceEvaluation??previous.sourceEvaluation};
}
/** Curate the existing public sports projection, bound to its carried claim. */
export function readPublicSportsValueRow(input:unknown,claim:unknown,context?:Record<string,unknown>):MarketValueRow|undefined{
 const row=input as MarketValueRow|null;
 if(typeof claim!=='string'||!/[a-f0-9]{64}/i.test(claim)||claim.length!==64||!row||row.source!=='sports-economy-card'||!text(row.id)||!row.id.endsWith(`:${claim}`)||row.seed!==claim||![row.baseUsdValue,row.birthUsdValue,row.marketUsdValue,row.proofTotalValueUsd,row.scoreDelta].every(value=>finite(value)&&value>=0))return;
 const sealedCopies=publicSportsSealedCopies(row.sealedCopies),sealedBirths=publicSportsSealedBirths(row.sealedBirths??context?.sealedBirths),sportsGroup=publicSportsGroupIdentity(row.sportsGroup??(context?{sport:context.sport,cardId:context.cardId??row.id.slice(0,-claim.length-1),rarity:context.rarity}:undefined));
 const target={...row,sportsGroup,sealedCopies,sealedBirths},historyObservation=boundSportsHistoryObservation(row.historyObservation,target);
 if(row.sportsGroup!==undefined&&!sportsGroup||row.historyObservation!==undefined&&!historyObservation)return;
 return {id:row.id,source:row.source,seed:claim,baseUsdValue:row.baseUsdValue,birthUsdValue:row.birthUsdValue,marketUsdValue:row.marketUsdValue,proofTotalValueUsd:row.proofTotalValueUsd,scoreDelta:row.scoreDelta,...(sportsGroup?{sportsGroup}:{}),...(sealedCopies?{sealedCopies}:{}),...(sealedBirths?{sealedBirths}:{}),...(historyObservation?{historyObservation}:{})};
}
export function publicSportsValueRow(input:unknown):MarketValueRow|undefined{
 const card=input as Record<string,unknown>|null;
 if(!card||typeof card.cardId!=='string'||!card.cardId||card.cardId.length>256||typeof card.claimHash!=='string'||!/^[a-f0-9]{64}$/i.test(card.claimHash))return;
 if(card.pricedCount===0&&card.liveValueUsd==null&&card.totalValueUsd==null&&publicSportsSealedBirths(card.sealedBirths))return;
 const positive=(value:unknown)=>finite(value)?Math.max(0,value as number):0;
 const proof=positive(card.proofValueUsd),priced=Math.max(1,Math.trunc(positive(card.pricedCount)||positive(card.vaultCount)||1));
 const score=card.card as Record<string,unknown>|null;
 return readPublicSportsValueRow({id:`${card.cardId}:${card.claimHash}`,source:'sports-economy-card',seed:card.claimHash,baseUsdValue:proof,birthUsdValue:proof,marketUsdValue:Math.max(proof,positive(card.liveValueUsd),positive(card.representativeValueUsd)),proofTotalValueUsd:Math.round((positive(card.proofTotalValueUsd)||proof*priced)*1e4)/1e4,scoreDelta:positive(score?.currentScore)||positive(score?.projectedScore)||positive(card.baseRating)/10,sealedCopies:card.sealedCopies,sealedBirths:card.sealedBirths,historyObservation:card.historyObservation},card.claimHash,card);
}
export function parseMarketCapSource(input: unknown): MarketCapSource {
  const envelope = input as { ok?: unknown; marketCapProjection?: MarketCapSource } | null, seed = envelope?.marketCapProjection;
  if (envelope?.ok !== true || !seed || seed.schema !== 'receiz.proof_graph.market_cap_projection.v1' || seed.source !== 'market-desk-live-assets.sum + single-card-current-live-value-proof.sum' || !/^[a-f0-9]{64}$/.test(seed.proofObjectHash) || !Number.isFinite(Date.parse(seed.generatedAt)) || !count(seed.firstIssuancePulse) || !count(seed.serverPulse) || seed.firstIssuancePulse > seed.serverPulse || seed.serverPulse > 1e10 || !finite(seed.currentUsd) || seed.currentUsd < 0 || !count(seed.cardsInCirculation) || !count(seed.sportsCardsPriced) || !count(seed.marketAssetsPriced) || seed.sportsCardsPriced > seed.cardsInCirculation || !Array.isArray(seed.valueRows) || seed.valueRows.length > 10000 || seed.valueRows.length !== seed.sportsCardsPriced + seed.marketAssetsPriced) throw new Error('Public capitalization source is incomplete.');
  if(!validUndatedMarketHistory(seed.undatedHistory)||seed.undatedHistory&&seed.undatedHistory.observationPulse>seed.serverPulse)throw new Error('Public capitalization observation is invalid.');
  if(!validMarketSourceHistory(seed))throw new Error('Public source history provenance is invalid.');
  if(seed.unpricedSealedBirths!==undefined&&!publicSportsSealedBirths(seed.unpricedSealedBirths))throw new Error('Public unpriced birth metadata is invalid.');
  if(seed.undatedHistory?.unpricedCopies!==undefined&&seed.undatedHistory.unpricedCopies!==(seed.unpricedSealedBirths?.length??0))throw new Error('Public unpriced birth coverage is invalid.');
  const ids = new Set<string>(); let market = 0, sports = 0;
  for (const row of seed.valueRows) {
    if (!text(row.id) || ids.has(row.id) || !text(row.seed) || ![row.baseUsdValue, row.birthUsdValue, row.marketUsdValue, row.proofTotalValueUsd, row.scoreDelta].every(finite) || [row.baseUsdValue, row.birthUsdValue, row.marketUsdValue, row.proofTotalValueUsd].some(v => v < 0)) throw new Error('Public capitalization row is invalid.');
    ids.add(row.id);
    if(row.sealedCopies!==undefined&&!publicSportsSealedCopies(row.sealedCopies))throw new Error('Public capitalization seal metadata is invalid.');
    if(row.sealedBirths!==undefined&&!publicSportsSealedBirths(row.sealedBirths))throw new Error('Public capitalization birth metadata is invalid.');
    if(row.sportsGroup!==undefined&&!publicSportsGroupIdentity(row.sportsGroup)||row.historyObservation!==undefined&&(row.source!=='sports-economy-card'||!boundSportsHistoryObservation(row.historyObservation,row))||row.historyEvaluationPulse!==undefined&&(!count(row.historyEvaluationPulse)||row.historyEvaluationPulse>1e10))throw new Error('Public sports history observation is invalid.');
    if (row.source === 'market-desk-live-asset') {
      market++; const item = row.marketItem;
      if (!item || !text(item.id) || !text(item.source) || ![item.priceUsd, item.pricePhi, item.quoteUsdPerPhi, item.changePct].every(finite) || item.priceUsd < 0 || item.pricePhi < 0 || item.quoteUsdPerPhi <= 0) throw new Error('Public market valuation basis is unavailable.');
      const meta = item.livePulseSeed;
      if (meta && (meta.kind !== 'sigil' || !count(meta.claimPulse) || !count(meta.beat) || meta.beat > 35 || !count(meta.stepIndex) || meta.stepIndex > 43 || typeof meta.creatorVerified !== 'boolean')) throw new Error('Public valuation metadata is invalid.');
    } else if (row.source === 'sports-economy-card') sports++;
    else throw new Error('Unknown public capitalization source.');
  }
  if (market !== seed.marketAssetsPriced || sports !== seed.sportsCardsPriced) throw new Error('Public capitalization coverage is incomplete.');
  const pricedCopies=new Set(seed.valueRows.flatMap(row=>(row.sealedCopies??row.sealedBirths??[]).map(copy=>`${copy.collectibleId.toLowerCase()}:${copy.claimHash.toLowerCase()}`)));
  if(seed.unpricedSealedBirths?.some(copy=>pricedCopies.has(`${copy.collectibleId.toLowerCase()}:${copy.claimHash.toLowerCase()}`)))throw new Error('Public birth metadata repeats a priced copy.');
  return seed;
}

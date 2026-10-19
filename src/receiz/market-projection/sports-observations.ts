import {marketPulseTime} from './coordinates.js';
export interface SportsGroupIdentity {sport:'baseball'|'soccer'|'fight';cardId:string;rarity:string;}
export interface SportsHistoryObservation {at:string;usdValue:number;scope:'single-copy'|'sports-group'|'unpriced-group';pricedCopies:number;vaultCopies:number;sourceHash:string;group?:SportsGroupIdentity;collectibleId?:string;claimHash?:string;model?:{baseUsdValue:number;birthUsdValue:number;marketUsdValue:number;proofTotalValueUsd:number;scoreDelta:number;seed:string};}
export interface SportsHistorySnapshot {at:string;totalUsd:number;sourceHash:string;groups:number;singleCopyGroups:number;aggregateGroups:number;unpricedGroups:number;evaluatedAt?:string;}
type PricingOperands={baseUsdValue:number;birthUsdValue:number;marketUsdValue:number;proofTotalValueUsd:number;scoreDelta:number;seed:string};
export function sameSportsPricingOperands(a:PricingOperands,b:PricingOperands):boolean{return (['baseUsdValue','birthUsdValue','marketUsdValue','proofTotalValueUsd','scoreDelta','seed']as const).every(key=>a[key]===b[key]);}
const amount=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e13;
const count=(value:unknown):value is number=>Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=10000;
const firstTime=marketPulseTime(0),lastTime=marketPulseTime(1e10);
const at=(value:unknown):value is string=>{if(typeof value!=='string'||value.length>64)return false;const time=Date.parse(value);return Number.isFinite(time)&&time>=firstTime&&time<=lastTime;};
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function publicSportsGroupIdentity(input:unknown):SportsGroupIdentity|undefined{
 const value=input as SportsGroupIdentity|null;if(!value||!['baseball','soccer','fight'].includes(value.sport)||typeof value.cardId!=='string'||!value.cardId||value.cardId.length>256||typeof value.rarity!=='string'||!value.rarity||value.rarity.length>40)return;
 return {sport:value.sport,cardId:value.cardId,rarity:value.rarity};
}
/** Source-carried display observations; the digest is provenance, not authority. */
export function publicSportsHistoryObservation(input:unknown):SportsHistoryObservation|undefined{
 const value=input as SportsHistoryObservation|null;if(!value||!at(value.at)||!amount(value.usdValue)||!hash(value.sourceHash)||!count(value.pricedCopies)||!count(value.vaultCopies)||value.pricedCopies>value.vaultCopies)return;
 const group=publicSportsGroupIdentity(value.group);if(value.group!==undefined&&!group)return;
 if(value.scope==='single-copy'){if(value.pricedCopies!==1||!/^rsc_[a-f0-9]{16}$/.test(value.collectibleId??'')||!hash(value.claimHash))return;}
 else if(value.scope==='sports-group'){if(value.pricedCopies<2||!group||value.collectibleId!==undefined||value.claimHash!==undefined)return;}
 else if(value.scope==='unpriced-group'){if(value.pricedCopies!==0||value.usdValue!==0||!group||value.collectibleId!==undefined||value.claimHash!==undefined)return;}
 else return;
 const model=value.model;if(model&&(![model.baseUsdValue,model.birthUsdValue,model.marketUsdValue,model.proofTotalValueUsd].every(amount)||typeof model.scoreDelta!=='number'||!Number.isFinite(model.scoreDelta)||Math.abs(model.scoreDelta)>1e13||!hash(model.seed)||value.scope==='single-copy'&&model.seed!==value.claimHash||value.scope==='unpriced-group'&&[model.baseUsdValue,model.birthUsdValue,model.marketUsdValue,model.proofTotalValueUsd].some(value=>value!==0)))return;
 return {at:value.at,usdValue:value.usdValue,scope:value.scope,pricedCopies:value.pricedCopies,vaultCopies:value.vaultCopies,sourceHash:value.sourceHash,...(group?{group}:{}),...(value.scope==='single-copy'?{collectibleId:value.collectibleId,claimHash:value.claimHash}:{}),...(model?{model:{baseUsdValue:model.baseUsdValue,birthUsdValue:model.birthUsdValue,marketUsdValue:model.marketUsdValue,proofTotalValueUsd:model.proofTotalValueUsd,scoreDelta:model.scoreDelta,seed:model.seed}}:{})};
}
interface ObservationTarget {id:string;seed:string;sportsGroup?:SportsGroupIdentity;sealedCopies?:ReadonlyArray<{collectibleId:string;claimHash:string;sealedAt:string}>;sealedBirths?:ReadonlyArray<{collectibleId:string;claimHash:string;sealedAt:string}>;}
/** Structural validity alone cannot attach another object's public quote. */
export function boundSportsHistoryObservation(input:unknown,row:ObservationTarget):SportsHistoryObservation|undefined{
 const value=publicSportsHistoryObservation(input);if(!value)return;
 const group=publicSportsGroupIdentity(row.sportsGroup);
 if(group&&(!row.id.endsWith(`:${row.seed}`)||row.id.slice(0,-row.seed.length-1)!==group.cardId))return;
 if(value.group&&(!group||(['sport','cardId','rarity']as const).some(key=>value.group![key]!==group[key])))return;
 const copies=[...(row.sealedCopies??[]),...(row.sealedBirths??[])];
 if(value.scope==='single-copy'){
  if(!copies.some(copy=>copy.collectibleId===value.collectibleId&&copy.claimHash===value.claimHash&&Date.parse(copy.sealedAt)<=Date.parse(value.at)))return;
 }else if(!group||!value.group||value.model&&value.model.seed!==row.seed&&!copies.some(copy=>copy.claimHash===value.model!.seed&&Date.parse(copy.sealedAt)<=Date.parse(value.at)))return;
 return value;
}
export function publicSportsHistorySnapshot(input:unknown):SportsHistorySnapshot|undefined{
 const value=input as SportsHistorySnapshot|null;if(!value||!at(value.at)||!amount(value.totalUsd)||!hash(value.sourceHash)||![value.groups,value.singleCopyGroups,value.aggregateGroups,value.unpricedGroups].every(count)||!value.groups||value.groups!==value.singleCopyGroups+value.aggregateGroups+value.unpricedGroups||value.evaluatedAt!==undefined&&(!at(value.evaluatedAt)||Date.parse(value.evaluatedAt)<Date.parse(value.at)))return;
 return {at:value.at,totalUsd:value.totalUsd,sourceHash:value.sourceHash,groups:value.groups,singleCopyGroups:value.singleCopyGroups,aggregateGroups:value.aggregateGroups,unpricedGroups:value.unpricedGroups,...(value.evaluatedAt?{evaluatedAt:value.evaluatedAt}:{})};
}

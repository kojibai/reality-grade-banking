import type {SigilMetadataLite} from '@receiz/sdk/valuation';
import {computeIntrinsicUnsigned as computeChartUnsigned} from './generated/chart-valuation.mjs';
import {quoteReceizDisplayUsdV122} from '@receiz/sdk';
import {quotePhiForUsd,DEFAULT_ISSUANCE_POLICY} from './canonical-market-issuance';
import {publicMarketPulseSeed,type MarketPulseSeed} from './market-projection/source';
import {historicalWalletUsdRate} from './historical-wallet';
import {walletPointTime,type WalletPoint} from './wallet-series';
import {sampleChartIndices} from '../core/chart-history';

/** Authenticated legacy read operands, not a public account proof, custody
 * source or execution input. Original source evidence remains authoritative. */
export interface CompositeWalletSource {
 schema:'receiz.wallet.chart-source.v129';composition?:'profile-plus-ledger'|'account-only';authority:'authenticated-display-source';userId:string;throughKaiUPulse:string;
 objects:{id:string;seed:MarketPulseSeed;intervals:{fromKaiUPulse:string;toKaiUPulse:string|null}[]}[];
 movements:{id:string;kaiUPulse:string;direction:'credit'|'debit';phiMicro:string;usdCents:string;reserveSliceUsdCents:string;profileSeed:boolean}[];
 lawfulValues:{id:string;kaiUPulse:string;deltaPhiMicro:string}[];
 transport?:{after:string|null;cursor:string|null;capturedKaiUPulse?:string};
}
export interface CompositeWalletPoint extends WalletPoint {balancePhiMicro?:string;valuation:'portfolio-model-v129';}
const nonnegative=(n:bigint)=>n>0n?n:0n;
const exact=(v:unknown,signed=false):bigint=>{if(typeof v!=='string'||!(signed?/^(0|-?[1-9]\d{0,39})$/:/^(0|[1-9]\d{0,39})$/).test(v))throw Error('COMPOSITE_HISTORY_AMOUNT_INVALID');return BigInt(v);};
const kai=(v:unknown):bigint=>{const n=exact(v);if(n>10_000_000_000_000_000n)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');return n;};
const identifier=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=512;
type Compiled=ReturnType<typeof compile>;
export function validateCompositeWalletSource(source:CompositeWalletSource):void{compile(source);}
function compile(source:CompositeWalletSource){
 if(source?.schema!=='receiz.wallet.chart-source.v129'||source.authority!=='authenticated-display-source'||!identifier(source.userId)||!Array.isArray(source.objects)||source.objects.length>10000||!Array.isArray(source.movements)||source.movements.length>100000||!Array.isArray(source.lawfulValues)||source.lawfulValues.length>100000)throw Error('COMPOSITE_HISTORY_SOURCE_REQUIRED');
 if(source.composition!==undefined&&!['profile-plus-ledger','account-only'].includes(source.composition))throw Error('COMPOSITE_HISTORY_SOURCE_REQUIRED');
 // Account-only history is a dollar timeline of recorded movements. Its
 // current Phi snapshot is separate; these operands do not reconstruct it.
 if(source.composition==='account-only'&&(source.objects.length||source.lawfulValues.length||source.movements.some(row=>row.profileSeed)))throw Error('COMPOSITE_HISTORY_SOURCE_REQUIRED');
 const end=kai(source.throughKaiUPulse),coordinates=new Set<bigint>([end]),ids=new Set<string>();
 const objects=source.objects.map(object=>{
  const seed=publicMarketPulseSeed(object.seed,String(object.seed?.claimPulse));
  if(!identifier(object.id)||ids.has(object.id)||!seed||!Array.isArray(object.intervals)||object.intervals.length>100000)throw Error('COMPOSITE_HISTORY_OBJECT_INVALID');ids.add(object.id);
  const birth=BigInt(seed.claimPulse)*1000000n;let last=-1n;
  const intervals=object.intervals.map(interval=>{const from=kai(interval.fromKaiUPulse),to=interval.toKaiUPulse===null?end+1n:kai(interval.toKaiUPulse);if(from<birth||from> end||from<last||to<=from||to>end+1n)throw Error('COMPOSITE_HISTORY_INTERVAL_INVALID');last=to;coordinates.add(from);if(to<=end)coordinates.add(to);return {from,to};});
  const meta={pulse:seed.claimPulse,kaiPulse:seed.claimPulse,beat:seed.beat,stepIndex:seed.stepIndex,stepsPerBeat:44,quality:'high',creatorVerified:seed.creatorVerified,creatorRep:0,chakraDay:seed.chakraDay??undefined,kaiSignature:seed.kaiSignature??undefined,userPhiKey:seed.userPhiKey??undefined}as SigilMetadataLite;
  return {intervals,meta,prices:new Map<number,{phi:bigint;usd:bigint}>()};
 });
 ids.clear();let gross=0n,creditsPhi=0n,creditsUsd=0n,seedPhi=0n,seedUsd=0n,reserve=0n;
 const states=source.movements.map((row,index)=>{if(!identifier(row.id)||ids.has(row.id)||!['credit','debit'].includes(row.direction)||typeof row.profileSeed!=='boolean')throw Error('COMPOSITE_HISTORY_MOVEMENT_INVALID');ids.add(row.id);const at=kai(row.kaiUPulse);if(at>end)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');coordinates.add(at);return {row,index,at};}).sort((a,b)=>a.at<b.at?-1:a.at>b.at?1:a.index-b.index).map(({row,at})=>{
  const phi=exact(row.phiMicro),usd=exact(row.usdCents),slice=exact(row.reserveSliceUsdCents),sign=row.direction==='credit'?1n:-1n;
  if(slice>usd||row.profileSeed&&row.direction!=='credit')throw Error('COMPOSITE_HISTORY_MOVEMENT_INVALID');
  // Recorded movements are a delta beneath proof-derived value. A negative
  // ledger-only delta is valid spending from that source, not an overdraft.
  gross+=sign*phi;creditsPhi+=sign*phi;creditsUsd+=sign*usd;reserve=nonnegative(reserve+sign*slice);
  if(row.profileSeed){seedPhi=phi;seedUsd=usd;}
  return {at,gross,deltaPhi:creditsPhi-seedPhi,deltaUsd:creditsUsd-seedUsd,reserve};
 });
 ids.clear();let lawful=0n;
 const values=source.lawfulValues.map((row,index)=>{if(!identifier(row.id)||ids.has(row.id))throw Error('COMPOSITE_HISTORY_LAWFUL_VALUE_INVALID');ids.add(row.id);const at=kai(row.kaiUPulse);if(at>end)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');coordinates.add(at);return {at,index,delta:exact(row.deltaPhiMicro,true)};}).sort((a,b)=>a.at<b.at?-1:a.at>b.at?1:a.index-b.index).map(row=>{lawful+=row.delta;if(lawful<0n)throw Error('COMPOSITE_HISTORY_LAWFUL_VALUE_INVALID');return {at:row.at,phi:lawful};});
 return {source,end,objects,states,values,coordinates:[...coordinates].sort((a,b)=>a<b?-1:a>b?1:0)};
}
function latest<T extends {at:bigint}>(rows:readonly T[],at:bigint):T|undefined{let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid].at<=at)lo=mid+1;else hi=mid;}return rows[lo-1];}
function point(model:Compiled,at:bigint):CompositeWalletPoint{
 let intrinsicPhi=0n,intrinsicUsd=0n;const pulse=Number(at/1000000n);
 for(const object of model.objects){if(!object.intervals.some(interval=>interval.from<=at&&at<interval.to))continue;
  let price=object.prices.get(pulse);
  if(!price){const unsigned=computeChartUnsigned(object.meta,pulse),phi=unsigned.valuePhi;
   if(!Number.isFinite(phi)||phi<0)throw Error('COMPOSITE_HISTORY_VALUE_UNAVAILABLE');
   const quote=quotePhiForUsd({meta:object.meta,nowPulse:pulse,usd:100,currentStreakDays:0,lifetimeUsdSoFar:0},DEFAULT_ISSUANCE_POLICY,{unsigned} as Parameters<typeof quotePhiForUsd>[2]),cents=Math.round(phi*quote.usdPerPhi*100),micro=Math.round(phi*1000000);
   if(!Number.isSafeInteger(cents)||cents<0||!Number.isSafeInteger(micro)||micro<0)throw Error('COMPOSITE_HISTORY_VALUE_UNAVAILABLE');price={phi:BigInt(micro),usd:BigInt(cents)};object.prices.set(pulse,price);
  }
  intrinsicPhi+=price.phi;intrinsicUsd+=price.usd;
 }
 const state=latest(model.states,at),lawful=latest(model.values,at)?.phi??0n,rate=lawful>0n||(state?.gross??0n)>0n?historicalWalletUsdRate(at.toString()):null;
 const lawfulUsd=lawful?BigInt(quoteReceizDisplayUsdV122(lawful.toString(),rate!)):0n,total=nonnegative(intrinsicUsd+lawfulUsd+(state?.deltaUsd??0n)),phi=nonnegative(intrinsicPhi+lawful+(state?.deltaPhi??0n));
 const grossUsd=state&&state.gross>0n?BigInt(quoteReceizDisplayUsdV122(state.gross.toString(),rate!)):0n,heldReserve=state?.reserve??0n,reserve=heldReserve<grossUsd?heldReserve:grossUsd;
 if(reserve>total)throw Error('COMPOSITE_HISTORY_RAILS_INCONSISTENT');
 return {userId:model.source.userId,at:walletPointTime(at.toString()),kaiUPulse:at.toString(),totalUsdCents:total.toString(),reserveUsdCents:reserve.toString(),settlementUsdCents:(total-reserve).toString(),...(model.source.composition==='account-only'?{}:{balancePhiMicro:phi.toString()}),valuation:'portfolio-model-v129'};
}
export function projectCompositeWalletAt(source:CompositeWalletSource,atKaiUPulse:string):CompositeWalletPoint{const model=compile(source),at=kai(atKaiUPulse);if(at>model.end)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');return point(model,at);}
/** Reconcile only display coordinates affected by newly received source rows.
 * The original movements are retained separately and are never synthesized. */
export function projectCompositeWalletCoordinates(source:CompositeWalletSource,coordinates:readonly string[]):CompositeWalletPoint[]{
 const model=compile(source),unique=new Set(coordinates.map(kai));
 return [...unique].filter(at=>at<=model.end).sort((a,b)=>a<b?-1:a>b?1:0).map(at=>point(model,at));
}
/** Six fitted display grids share the complete source, not a login anchor.
 * Recorded movements remain in the source; chart sampling creates no events. */
export function projectCompositeWalletHistory(source:CompositeWalletSource):CompositeWalletPoint[]{
 const model=compile(source),start=model.coordinates[0],end=model.end,coordinates=new Set<bigint>([start,end]);
 const indices=sampleChartIndices(model.coordinates.map(Number),768);
 for(const index of indices){const at=model.coordinates[index];coordinates.add(at);if(at>start)coordinates.add(at-1n);}
 const numerator=5236067977499789696409173668731276235440618359611525724270897245n,denominator=10n**66n;
 for(const days of [null,1,7,31,93,366]){const span=days===null?end-start:(BigInt(days)*86400000n*denominator+numerator-1n)/numerator,from=end-span>start?end-span:start;for(let i=0;i<=95;i++)coordinates.add(from+(end-from)*BigInt(i)/95n);}
 return [...coordinates].sort((a,b)=>a<b?-1:a>b?1:0).map(at=>point(model,at));
}

/** Populate only the newly elapsed interval. Switching periods reads the same
 * held curve without a fetch; a newly learned event reconciles its own suffix. */
export function projectCompositeWalletExtension(source:CompositeWalletSource,fromKaiUPulse:string):CompositeWalletPoint[]{
 const model=compile(source),from=kai(fromKaiUPulse),end=model.end;if(from>=end)return [];
 const coordinates=new Set<bigint>([end]);
 for(let i=1;i<=96;i++)coordinates.add(from+(end-from)*BigInt(i)/96n);
 for(const at of model.coordinates)if(at>from){coordinates.add(at);if(at-1n>from)coordinates.add(at-1n);}
 return [...coordinates].sort((a,b)=>a<b?-1:a>b?1:0).map(at=>point(model,at));
}

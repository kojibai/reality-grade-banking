import {readWalletCashBasis,type WalletCashBasis} from './wallet-cash-basis';
import type {CurrentBalanceSource} from './current-balance-source';
import {readBalanceOriginalProofReference,type BalanceOriginalProofReference} from './balance-source-references';
import type {SigilMetadataLite} from '@receiz/sdk/valuation';
import {computeIntrinsicUnsigned as computeChartUnsigned} from './generated/chart-valuation.mjs';
import {quoteReceizDisplayUsdV122} from '@receiz/sdk';
import {quotePhiForUsd,DEFAULT_ISSUANCE_POLICY} from './canonical-market-issuance';
import {publicMarketPulseSeed,publicSigilValuationMetadata,type MarketPulseSeed} from './market-projection/source';
import {historicalWalletUsdRate,type WalletRateCalculation} from './historical-wallet';
import {walletPointTime,type WalletPoint} from './wallet-series';
import {sampleChartIndices} from '../core/chart-history';

/** Authenticated legacy read operands, not a public account proof, custody
 * source or execution input. Original source evidence remains authoritative. */
export interface CompositeWalletSource {
 schema:'receiz.wallet.chart-source.v129';earningMembershipPolicy?:'public-pbi-original-v1';composition?:'profile-plus-ledger'|'account-only'|'cash-plus-originals';cashBasis?:WalletCashBasis;cashBasisAccepted?:boolean;cashCapture?:{accountBalancePhiMicro:string;usdPerPhiMicrocents:string};authority:'authenticated-display-source';userId:string;throughKaiUPulse:string;
 objects:{id:string;proof?:BalanceOriginalProofReference;seed:MarketPulseSeed;intervals:{fromKaiUPulse:string;toKaiUPulse:string|null}[]}[];
 movements:{id:string;kaiUPulse:string;direction:'credit'|'debit';phiMicro:string;usdCents:string;reserveSliceUsdCents:string;profileSeed:boolean;accountPostPhiMicro?:string}[];
 lawfulValues:{id:string;kaiUPulse:string;deltaPhiMicro:string}[];
 transport?:{after:string|null;cursor:string|null;capturedKaiUPulse?:string};
}
export interface CompositeWalletPoint extends WalletPoint {balancePhiMicro?:string;valuation:'portfolio-model-v129';}
export type BalanceCalculationStep=Readonly<{label:string;formula:string;operands:Readonly<Record<string,string>>;result:string;unit:string}>;
export type CompositeBalanceObject=Readonly<{id:string;proof?:BalanceOriginalProofReference;metadata:SigilMetadataLite;pulse:number;valuePhi:number;phiMicro:string;usdCents:string;quoteInputs:{usd:number;currentStreakDays:number;lifetimeUsdSoFar:number};quote:ReturnType<typeof quotePhiForUsd>}>;
export type CompositeBalanceCalculation=Readonly<{kind:'composite'|'current';source:CompositeWalletSource|CurrentBalanceSource;artifactBasePhiMicro:string;artifactBaseUsdCents:string;rateCalculation?:WalletRateCalculation;rateSource:'carried-wallet-quote'|'local-historical-quote'|'not-used';kaiUPulse:string;point:CompositeWalletPoint;objects:readonly CompositeBalanceObject[];steps:readonly BalanceCalculationStep[]}>;
const nonnegative=(n:bigint)=>n>0n?n:0n;
const exact=(v:unknown,signed=false):bigint=>{if(typeof v!=='string'||!(signed?/^(0|-?[1-9]\d{0,39})$/:/^(0|[1-9]\d{0,39})$/).test(v))throw Error('COMPOSITE_HISTORY_AMOUNT_INVALID');return BigInt(v);};
const kai=(v:unknown):bigint=>{const n=exact(v);if(n>10_000_000_000_000_000n)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');return n;};
const identifier=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=512;
type CurrentState={accountPostPhi?:bigint;at:bigint;gross:bigint;deltaPhi:bigint;deltaUsd:bigint;reserve:bigint;lawfulPhi:bigint;capturePulse:number;rate:string};
type Compiled=Omit<ReturnType<typeof compile>,'source'|'objects'>&{source:CompositeWalletSource|CurrentBalanceSource;objects:ReturnType<typeof compileObjects>;currentState?:CurrentState};
export function validateCompositeWalletSource(source:CompositeWalletSource):void{compile(source);}
function compileObjects(rows:readonly {id:string;proof?:BalanceOriginalProofReference;seed:MarketPulseSeed;intervals?:{fromKaiUPulse:string;toKaiUPulse:string|null}[]}[],end:bigint,coordinates:Set<bigint>,active=false){
 const ids=new Set<string>();return rows.map(object=>{
  const seed=publicMarketPulseSeed(object.seed,String(object.seed?.claimPulse));
  if(!identifier(object.id)||ids.has(object.id)||!seed||!active&&(!Array.isArray(object.intervals)||object.intervals.length>100000))throw Error('COMPOSITE_HISTORY_OBJECT_INVALID');ids.add(object.id);
  const birth=BigInt(seed.claimPulse)*1000000n;let last=-1n;
  const intervals=active?null:object.intervals!.map(interval=>{const from=kai(interval.fromKaiUPulse),to=interval.toKaiUPulse===null?end+1n:kai(interval.toKaiUPulse);if(from<birth||from> end||from<last||to<=from||to>end+1n)throw Error('COMPOSITE_HISTORY_INTERVAL_INVALID');last=to;coordinates.add(from);if(to<=end)coordinates.add(to);return {from,to};});
  const meta=publicSigilValuationMetadata(seed);
  return {id:object.id,proof:readBalanceOriginalProofReference(object.proof,object.id),intervals,meta,prices:new Map<number,{phi:bigint;usd:bigint}>()};
 });
}
function compile(source:CompositeWalletSource){
 if(source?.schema!=='receiz.wallet.chart-source.v129'||source.authority!=='authenticated-display-source'||!identifier(source.userId)||!Array.isArray(source.objects)||source.objects.length>10000||!Array.isArray(source.movements)||source.movements.length>100000||!Array.isArray(source.lawfulValues)||source.lawfulValues.length>100000)throw Error('COMPOSITE_HISTORY_SOURCE_REQUIRED');
 if(source.composition!==undefined&&!['profile-plus-ledger','account-only','cash-plus-originals'].includes(source.composition))throw Error('COMPOSITE_HISTORY_SOURCE_REQUIRED');
 // Account-only history is a dollar timeline of recorded movements. Its
 // current Phi snapshot is separate; these operands do not reconstruct it.
 if(source.composition==='account-only'&&(source.objects.length||source.lawfulValues.length||source.movements.some(row=>row.profileSeed)))throw Error('COMPOSITE_HISTORY_SOURCE_REQUIRED');
 const cashBasis=readWalletCashBasis(source.cashBasis);
 if((source.composition==='cash-plus-originals')!==Boolean(cashBasis)||cashBasis&&(typeof source.cashBasisAccepted!=='boolean'||BigInt(cashBasis.fromKaiUPulse)>kai(source.throughKaiUPulse)||source.movements.some(row=>row.profileSeed)))throw Error('COMPOSITE_HISTORY_SOURCE_REQUIRED');
 if(source.cashCapture){exact(source.cashCapture.accountBalancePhiMicro);if(exact(source.cashCapture.usdPerPhiMicrocents)===0n)throw Error('COMPOSITE_HISTORY_SOURCE_REQUIRED');}
 const end=kai(source.throughKaiUPulse),coordinates=new Set<bigint>([end]),ids=new Set<string>();
 if(cashBasis)coordinates.add(kai(cashBasis.fromKaiUPulse));
 const objects=compileObjects(source.objects,end,coordinates);
 ids.clear();let gross=0n,creditsPhi=0n,creditsUsd=0n,seedPhi=0n,seedUsd=0n,reserve=0n;let accountPostPhi:bigint|undefined;
 const states=source.movements.map((row,index)=>{if(!identifier(row.id)||ids.has(row.id)||!['credit','debit'].includes(row.direction)||typeof row.profileSeed!=='boolean')throw Error('COMPOSITE_HISTORY_MOVEMENT_INVALID');ids.add(row.id);const at=kai(row.kaiUPulse);if(at>end)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');coordinates.add(at);return {row,index,at};}).sort((a,b)=>a.at<b.at?-1:a.at>b.at?1:a.index-b.index).map(({row,at})=>{
  const phi=exact(row.phiMicro),usd=exact(row.usdCents),slice=exact(row.reserveSliceUsdCents),sign=row.direction==='credit'?1n:-1n;
  if(slice>usd||row.profileSeed&&row.direction!=='credit')throw Error('COMPOSITE_HISTORY_MOVEMENT_INVALID');
  // Recorded movements are a delta beneath proof-derived value. A negative
  // ledger-only delta is valid spending from that source, not an overdraft.
  gross+=sign*phi;creditsPhi+=sign*phi;creditsUsd+=sign*usd;reserve=nonnegative(reserve+sign*slice);
  if(row.profileSeed){seedPhi=phi;seedUsd=usd;}
  accountPostPhi=row.accountPostPhiMicro===undefined?undefined:exact(row.accountPostPhiMicro);
  return {at,gross,deltaPhi:creditsPhi-seedPhi,deltaUsd:creditsUsd-seedUsd,reserve,accountPostPhi};
 });
 ids.clear();let lawful=0n;
 const values=source.lawfulValues.map((row,index)=>{if(!identifier(row.id)||ids.has(row.id))throw Error('COMPOSITE_HISTORY_LAWFUL_VALUE_INVALID');ids.add(row.id);const at=kai(row.kaiUPulse);if(at>end)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');coordinates.add(at);return {at,index,delta:exact(row.deltaPhiMicro,true)};}).sort((a,b)=>a.at<b.at?-1:a.at>b.at?1:a.index-b.index).map(row=>{lawful+=row.delta;if(lawful<0n)throw Error('COMPOSITE_HISTORY_LAWFUL_VALUE_INVALID');return {at:row.at,phi:lawful};});
 return {source,end,objects,states,values,coordinates:[...coordinates].sort((a,b)=>a<b?-1:a>b?1:0)};
}
function latest<T extends {at:bigint}>(rows:readonly T[],at:bigint):T|undefined{let lo=0,hi=rows.length;while(lo<hi){const mid=(lo+hi)>>>1;if(rows[mid].at<=at)lo=mid+1;else hi=mid;}return rows[lo-1];}
function point(model:Compiled,at:bigint,observe?:(value:CompositeBalanceCalculation)=>void):CompositeWalletPoint{
 const observedObjects:CompositeBalanceObject[]|null=observe?[]:null;
 const cashBasis='composition'in model.source&&model.source.composition==='cash-plus-originals'?model.source.cashBasis:undefined,activeCash=!!cashBasis&&at>=BigInt(cashBasis.fromKaiUPulse);
 let intrinsicPhi=0n,intrinsicUsd=0n;const pulse=Number(at/1000000n);
 for(const object of model.objects){if(object.intervals&&!object.intervals.some(interval=>interval.from<=at&&at<interval.to))continue;
  let price=object.prices.get(pulse);
  if(!price){const unsigned=computeChartUnsigned(object.meta,pulse),phi=unsigned.valuePhi;
   if(!Number.isFinite(phi)||phi<0)throw Error('COMPOSITE_HISTORY_VALUE_UNAVAILABLE');
   const quote=quotePhiForUsd({meta:object.meta,nowPulse:pulse,usd:100,currentStreakDays:0,lifetimeUsdSoFar:0},DEFAULT_ISSUANCE_POLICY,{unsigned} as Parameters<typeof quotePhiForUsd>[2]),cents=Math.round(phi*quote.usdPerPhi*100),micro=Math.round(phi*1000000);
   if(!Number.isSafeInteger(cents)||cents<0||!Number.isSafeInteger(micro)||micro<0)throw Error('COMPOSITE_HISTORY_VALUE_UNAVAILABLE');price={phi:BigInt(micro),usd:BigInt(cents)};object.prices.set(pulse,price);
   observedObjects?.push({id:object.id,...(object.proof?{proof:object.proof}:{}),metadata:object.meta,pulse,valuePhi:phi,phiMicro:String(micro),usdCents:String(cents),quoteInputs:{usd:100,currentStreakDays:0,lifetimeUsdSoFar:0},quote});
  }
  intrinsicPhi+=price.phi;intrinsicUsd+=price.usd;
 }
 let rateCalculation:WalletRateCalculation|undefined;
 const state=model.currentState??latest(model.states,at),lawful=model.currentState?.lawfulPhi??latest(model.values,at)?.phi??0n,rate=lawful>0n||(state?.gross??0n)>0n?(model.currentState&&pulse===model.currentState.capturePulse?model.currentState.rate:historicalWalletUsdRate(at.toString(),observe?value=>{rateCalculation=value;}:undefined)):null;
 const lawfulUsd=lawful?BigInt(quoteReceizDisplayUsdV122(lawful.toString(),rate!)):0n,total=nonnegative(intrinsicUsd+lawfulUsd+(state?.deltaUsd??0n)+(activeCash?BigInt(cashBasis!.usdOffsetCents):0n)),phi=nonnegative(intrinsicPhi+lawful+(state?.deltaPhi??0n)+(activeCash?BigInt(cashBasis!.phiOffsetMicro):0n));
 const capture='cashCapture'in model.source?model.source.cashCapture:undefined,captureAt='transport'in model.source?model.source.transport?.capturedKaiUPulse:undefined;
 const captured=capture&&captureAt&&at>=BigInt(captureAt),grossPhi=captured?BigInt(capture.accountBalancePhiMicro):(cashBasis&&state?.accountPostPhi!==undefined?state.accountPostPhi:(state?.gross??0n)+(activeCash?BigInt(cashBasis!.phiOffsetMicro):0n));
 const capRate=captured&&pulse===Number(BigInt(captureAt)/1000000n)?capture.usdPerPhiMicrocents:rate??(grossPhi>0n?historicalWalletUsdRate(at.toString()):null);
 const grossUsd=grossPhi>0n?BigInt(quoteReceizDisplayUsdV122(grossPhi.toString(),capRate!)):0n,heldReserve=state?.reserve??0n,reserve=heldReserve<grossUsd?heldReserve:grossUsd;
 if(reserve>total)throw Error('COMPOSITE_HISTORY_RAILS_INCONSISTENT');
 const result:CompositeWalletPoint={userId:model.source.userId,at:walletPointTime(at.toString()),kaiUPulse:at.toString(),totalUsdCents:total.toString(),reserveUsdCents:reserve.toString(),settlementUsdCents:(total-reserve).toString(),...(('composition'in model.source&&model.source.composition==='account-only'||cashBasis&&!activeCash)?{}:{balancePhiMicro:phi.toString()}),valuation:'portfolio-model-v129'};
 const carriedCash=model.source.cashBasis,cashShown=Boolean(carriedCash&&(model.currentState||activeCash)),cashPhi=cashShown?BigInt(carriedCash!.phiOffsetMicro):0n,cashUsd=cashShown?BigInt(carriedCash!.usdOffsetCents):0n;
 const rawDeltaPhi=(state?.deltaPhi??0n)-(model.currentState?cashPhi:0n),rawDeltaUsd=(state?.deltaUsd??0n)-(model.currentState?cashUsd:0n);
 observe?.({kind:model.currentState?'current':'composite',source:model.source,artifactBasePhiMicro:String(intrinsicPhi),artifactBaseUsdCents:String(intrinsicUsd),...(rateCalculation?{rateCalculation}:{}),rateSource:rate===null?'not-used':model.currentState&&pulse===model.currentState.capturePulse?'carried-wallet-quote':'local-historical-quote',kaiUPulse:at.toString(),point:result,objects:observedObjects!,steps:[
  {label:'Originals in the current source cohort',formula:'sum(current Original projections)',operands:Object.fromEntries(observedObjects!.map(object=>[object.id,object.usdCents])),result:String(intrinsicUsd),unit:'USD cents'},
  {label:'Recorded ledger movement',formula:cashShown?'credits − debits + retained prior funds adjustment':'credits − debits − replaced profile seed',operands:{grossPhiMicro:String(state?.gross??0n),deltaPhiMicro:String(rawDeltaPhi),deltaUsdCents:String(rawDeltaUsd),...(cashShown?{cashPhiOffsetMicro:String(cashPhi),cashUsdOffsetCents:String(cashUsd)}:{})},result:String(rawDeltaUsd+cashUsd),unit:'USD cents'},
  {label:'Accepted lawful value',formula:'quoteReceizDisplayUsdV122(lawful Φµ, rate)',operands:{lawfulPhiMicro:String(lawful),usdPerPhiMicrocents:rate??'Not used'},result:String(lawfulUsd),unit:'USD cents'},
  {label:'Displayed dollar balance',formula:cashShown?'max(0, Original USD cents + lawful USD cents + recorded USD delta + prior funds adjustment)':'max(0, Original USD cents + lawful USD cents + recorded USD delta)',operands:{originalUsdCents:String(intrinsicUsd),lawfulUsdCents:String(lawfulUsd),ledgerDeltaUsdCents:String(rawDeltaUsd),...(cashShown?{cashUsdOffsetCents:String(cashUsd)}:{})},result:result.totalUsdCents,unit:'USD cents'},
  {label:'Reserve',formula:'min(held Reserve USD cents, quoted gross account Φ)',operands:{heldReserveUsdCents:String(heldReserve),grossPhiMicro:String(grossPhi),quotedGrossUsdCents:String(grossUsd),usdPerPhiMicrocents:capRate??'Not used'},result:result.reserveUsdCents,unit:'USD cents'},
  {label:'Settlement',formula:'displayed dollar balance − Reserve',operands:{totalUsdCents:result.totalUsdCents,reserveUsdCents:result.reserveUsdCents},result:result.settlementUsdCents,unit:'USD cents'},
  {label:'Total source Φ',formula:('composition'in model.source&&model.source.composition==='account-only')?'Account Φ is carried separately; this source is a dollar history':cashShown?'max(0, Original Φµ + lawful Φµ + recorded Φµ delta + prior funds adjustment)':'max(0, Original Φµ + lawful Φµ + recorded Φµ delta)',operands:{originalPhiMicro:String(intrinsicPhi),lawfulPhiMicro:String(lawful),ledgerDeltaPhiMicro:String(rawDeltaPhi),...(cashShown?{cashPhiOffsetMicro:String(cashPhi)}:{})},result:result.balancePhiMicro??'Carried separately',unit:'Φ micro-units'},
 ]});
 return result;
}
const compositeFrames=new WeakMap<CompositeWalletSource,CompositeBalanceCalculation>();
export function projectCompositeWalletAt(source:CompositeWalletSource,atKaiUPulse:string):CompositeWalletPoint{const model=compile(source),at=kai(atKaiUPulse);if(at>model.end)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');return point(model,at,value=>{compositeFrames.set(source,value);});}
/** Inspect the very same calculator at an explicitly held coordinate. The
 * optional observer above only records its existing operands and outputs. */
export function inspectCompositeWalletAt(source:CompositeWalletSource,atKaiUPulse:string):CompositeBalanceCalculation{
 const known=compositeFrames.get(source);if(known?.kaiUPulse===atKaiUPulse)return known;
 const model=compile(source),at=kai(atKaiUPulse);if(at>model.end)throw Error('COMPOSITE_HISTORY_COORDINATE_INVALID');
 let observed:CompositeBalanceCalculation|undefined;point(model,at,value=>{observed=value;});compositeFrames.set(source,observed!);return observed!;
}
/** Explicit current-only aggregate state. It is not a movement or a
 * historical chart source; the SAME point arithmetic consumes its operands. */
function currentModel(source:CurrentBalanceSource,at:bigint):Compiled{
 const capture=BigInt(source.computedPulse)*1_000_000n;if(at<capture)throw Error('CURRENT_BALANCE_PAST_UNAVAILABLE');
 const coordinates=new Set<bigint>([at]);
 const objects=compileObjects(source.glyphs.map(glyph=>({id:glyph.id,seed:glyph.livePulseSeed,proof:source.originalProofReferences?.[glyph.id]})),at,coordinates,true);
 return {source,end:at,objects,states:[],values:[],coordinates:[at],currentState:{at:capture,gross:exact(source.accountBalancePhiMicro),deltaPhi:exact(source.transactionDeltaPhiMicro,true),deltaUsd:exact(source.transactionDeltaUsdCents,true),reserve:exact(source.ledgerSettledUsdCents),lawfulPhi:exact(source.lawfulActionPhiMicro),capturePulse:source.computedPulse,rate:source.usdPerPhiMicrocents}};
}
const currentCaptures=new WeakMap<CurrentBalanceSource,CompositeBalanceCalculation>(),currentFrames=new WeakMap<CurrentBalanceSource,CompositeBalanceCalculation>();
function requireCurrentCapture(source:CurrentBalanceSource):CompositeBalanceCalculation{
 const known=currentCaptures.get(source);if(known)return known;
 const at=kai((BigInt(source.computedPulse)*1_000_000n).toString());let actual:CompositeBalanceCalculation|undefined;point(currentModel(source,at),at,value=>{actual=value;});
 if(!actual||actual.artifactBasePhiMicro!==source.artifactBasePhiMicro||actual.artifactBaseUsdCents!==source.artifactBaseUsdCents||actual.point.balancePhiMicro!==source.balancePhiMicro||actual.point.totalUsdCents!==source.balanceUsdCents||actual.point.reserveUsdCents!==source.reserveUsdCents||actual.point.settlementUsdCents!==source.settlementUsdCents)throw Error('CURRENT_BALANCE_CAPTURE_MISMATCH');
 if([source.reservePhiMicro,source.settlementPhiMicro].some(value=>value!==null&&BigInt(value)>BigInt(source.balancePhiMicro))||source.reservePhiMicro!==null&&source.settlementPhiMicro!==null&&BigInt(source.reservePhiMicro)+BigInt(source.settlementPhiMicro)!==BigInt(source.balancePhiMicro))throw Error('CURRENT_BALANCE_CAPTURE_MISMATCH');
 currentCaptures.set(source,actual);return actual;
}
export function inspectCurrentWalletAt(source:CurrentBalanceSource,atKaiUPulse:string):CompositeBalanceCalculation{
 if(source.historicalContextOnly||source.earningMembershipPolicy!=='public-pbi-original-v1'||source.creationSigilBenefitsEnabled!==true)throw Error('CURRENT_BALANCE_SOURCE_REQUIRED');
 const captured=requireCurrentCapture(source),at=kai(atKaiUPulse);if(at===BigInt(captured.kaiUPulse))return captured;
 const known=currentFrames.get(source);if(known?.kaiUPulse===atKaiUPulse)return known;
 let actual:CompositeBalanceCalculation|undefined;point(currentModel(source,at),at,value=>{actual=value;});currentFrames.set(source,actual!);return actual!;
}
export function projectCurrentWalletAt(source:CurrentBalanceSource,atKaiUPulse:string):CompositeWalletPoint{return inspectCurrentWalletAt(source,atKaiUPulse).point;}
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

import {CHART_PERIODS,sampleChartIndices,type ChartPeriod} from '../../core/chart-history';
import type {PublicMarketCatalog,PublicMarketItem} from '../public-market';
import {compatibleShareInventory,publicCapitalizationAssets,type PublicShareInventory} from '../market-share-inventory';
import {prepareShareCapitalizationAtPulse,type ShareCapitalizationCalculation} from '../market-share-chart';
import {publicAssetPulseSeed} from './asset';
import type {MarketCapSource,MarketPulseSeed} from './source';
import {marketPeriodPulses,marketPulseTime,publicSigilQuoteAtPulse} from './project';

export interface ProfileGrowthRow {seed:MarketPulseSeed;birthUsd:number;shareInventory?:PublicShareInventory}
export interface ProfileGrowthPoint {pulse:number;at:string;percent:number;usd:number;assets:number;basisUsd?:number;capitalizationUsdCents?:string|null}
export interface ProfileValueCalculation {usd:number;phi:number;usdPerPhi:number;capitalization:ShareCapitalizationCalculation|null}
export interface ProfileStartingCalculation {openingUsd:number;openingBirthPrefixUsd:number;currentBirthPrefixUsd:number}
export interface ProfileGrowthHistory {basis:string;pulse:number;series:Record<ChartPeriod,ProfileGrowthPoint[]>;calculation?:{current:ProfileValueCalculation[];startingUsd:Record<ChartPeriod,number[]>;summationOrder?:number[];startingTotals?:Record<ChartPeriod,ProfileStartingCalculation>}}
// A worker owns one immutable input revision until it receives a new rows
// array. A pulse changes the evaluation coordinate, not that input fingerprint.
const rowBases=new WeakMap<ProfileGrowthRow[],Promise<string>>();
function profileBasis(rows:ProfileGrowthRow[]){
 let basis=rowBases.get(rows);if(!basis){basis=crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(rows))).then(bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join(''));rowBases.set(rows,basis);void basis.catch(()=>rowBases.delete(rows));}return basis;
}
/** Whole current collection, using only each artifact's bound public operands. */
export function profileGrowthRows(items:PublicMarketItem[],source:MarketCapSource|null,catalog:PublicMarketCatalog|null=null):ProfileGrowthRow[]|null{
 if(!items.length)return null;
 const current=new Map(catalog?.items.map(item=>[item.assetId,item]));
 const inventories=new Map(publicCapitalizationAssets(catalog).items.map(item=>[item.assetId,item.shareInventory]));
 const supplied=new Set(catalog?.items.filter(item=>item.shareInventory).map(item=>item.assetId));
 try{return items.map(item=>{
  const quote=current.get(item.assetId),same=!!item.originalDigest&&quote?.originalDigest===item.originalDigest;
  // Share supply belongs to the canonical asset, rather than its latest media
  // export. An appended file digest must not hide that same asset's held tape.
  // Native inventory still requires its exact issuance binding in this reader.
  const selected=inventories.get(item.assetId),shareInventory=selected?compatibleShareInventory(item,selected):supplied.has(item.assetId)?undefined:compatibleShareInventory(item,item.shareInventory);
  const seed=publicAssetPulseSeed(same?{...item,livePulseSeed:quote.livePulseSeed??item.livePulseSeed}:item,source);if(!seed)throw Error('Missing public valuation');
  const birthUsd=publicSigilQuoteAtPulse(seed,seed.claimPulse).priceUsd;if(!Number.isFinite(birthUsd)||birthUsd<=0)throw Error('Missing birth value');return {seed,birthUsd,...(shareInventory?{shareInventory}:{})};
 });}catch{return null;}
}
/** Run in the existing projection worker. Assets enter at their own creation
 * pulse. Dividing by their corresponding birth values excludes new principal
 * from growth; the latest point matches the showcase's weighted Total. */
export async function buildProfileGrowth(rows:ProfileGrowthRow[],pulse:number,previous:ProfileGrowthHistory|null=null,continuing=()=>true,yieldSample:()=>Promise<void>=async()=>{}):Promise<ProfileGrowthHistory|null>{
 if(!rows.length||rows.length>10_000||!Number.isSafeInteger(pulse)||pulse<0||pulse>1e10||rows.some(row=>row.seed.kind!=='sigil'||!Number.isSafeInteger(row.seed.claimPulse)||row.seed.claimPulse<0||row.seed.claimPulse>pulse||!Number.isFinite(row.birthUsd)||row.birthUsd<=0))throw Error('Collection growth source unavailable');
 const basis=await profileBasis(rows);
 const reuse=previous?.basis===basis&&previous.pulse<=pulse?previous:null;if(reuse?.pulse===pulse)return reuse;
 const ordered=rows.map((row,index)=>({...row,index})).sort((a,b)=>a.seed.claimPulse-b.seed.claimPulse),capitalization=ordered.map(row=>{
  const inventory=row.shareInventory;if(!inventory)return null;
  const resolve=prepareShareCapitalizationAtPulse(inventory),first=inventory.releaseCapitalization?.kaiUPulse??inventory.capitalizationHistory?.[0]?.kaiUPulse;
  // Without a release record, an earlier unknown capacity is not zero.
  return (at:number,price:string,explain?:(value:ShareCapitalizationCalculation)=>void)=>inventory.family==='generic'&&BigInt(at)*1000000n<=BigInt(inventory.observedAtKaiUPulse)&&(!first||BigInt(at)*1000000n<BigInt(first))?null:resolve(at,price,explain);
 }),firstIssuancePulse=ordered[0].seed.claimPulse,memo=new Map<number,{usd:number;assets:number;capitalizationUsdCents:string|null}>(),series={}as ProfileGrowthHistory['series'];
 const samples=Object.fromEntries(CHART_PERIODS.map(period=>[period,marketPeriodPulses({firstIssuancePulse,serverPulse:pulse},period,64)]))as Record<ChartPeriod,number[]>;
 const openings=new Set(CHART_PERIODS.map(period=>samples[period][0])),starting=new Map<number,number[]>(),startingUsd={}as Record<ChartPeriod,number[]>;
 const current:ProfileValueCalculation[]=[],startingTotals={}as Record<ChartPeriod,ProfileStartingCalculation>;
 const births=[0];for(const row of ordered)births.push(births.at(-1)!+row.birthUsd);
 // Capture only the existing opening and current evaluations. The sampled
 // curve carries no per-object copies, and opening a disclosure prices nothing.
 const point=async(at:number)=>{let value=memo.get(at);if(!value){let usd=0,assets=0,cap=0n,complete=true;const bases=openings.has(at)?rows.map(row=>row.birthUsd):null;for(const row of ordered){if(row.seed.claimPulse>at)break;const quote=publicSigilQuoteAtPulse(row.seed,at),price=quote.priceUsd;usd+=price;if(bases)bases[row.index]=price;let calculation:ShareCapitalizationCalculation|null=null;const cents=capitalization[assets]?.(at,String(Math.round(price*100)),at===pulse?value=>{calculation=value;}:undefined);if(cents===null||cents===undefined)complete=false;else cap+=BigInt(cents);if(at===pulse)current[row.index]={usd:price,phi:quote.pricePhi,usdPerPhi:quote.quoteUsdPerPhi,capitalization:calculation};assets++;}if(bases)starting.set(at,bases);value={usd,assets,capitalizationUsdCents:complete?cap.toString():null};memo.set(at,value);await yieldSample();}return {pulse:at,at:new Date(marketPulseTime(at)).toISOString(),percent:NaN,...value};};
 for(const period of CHART_PERIODS){
  if(!continuing())return null;
  const pulses=samples[period];
  // The opening sample already contains every original then in existence.
  // Add later birth principal from the prefix, without pricing the opening again.
  const opening=await point(pulses[0]);
  startingUsd[period]=starting.get(pulses[0])!;
  startingTotals[period]={openingUsd:opening.usd,openingBirthPrefixUsd:births[opening.assets],currentBirthPrefixUsd:births.at(-1)!};
  const relative=(point:ProfileGrowthPoint)=>{const basisUsd=opening.usd+births[point.assets]-births[opening.assets],percent=(point.usd/basisUsd-1)*100;if(!Number.isFinite(percent))throw Error('Collection growth unavailable');return percent===point.percent&&point.basisUsd===basisUsd?point:{...point,percent,basisUsd};};
  if(reuse){const first=relative(opening),last=relative(await point(pulse)),points=[first,...reuse.series[period].filter(p=>p.pulse>first.pulse&&p.pulse<last.pulse).map(relative),...(first.pulse===last.pulse?[]:[last])];series[period]=sampleChartIndices(points.map(p=>p.percent),96).map(index=>points[index]);}
  else{series[period]=[];for(const at of pulses){if(!continuing())return null;series[period].push(relative(await point(at)));}}
 }
 return {basis,pulse,series,calculation:{current,startingUsd,summationOrder:ordered.map(row=>row.index),startingTotals}};
}

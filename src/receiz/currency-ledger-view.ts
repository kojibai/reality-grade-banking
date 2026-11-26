export type PublicCurrencyActivity = Readonly<{ assetId:string; symbol:string; priceUsdCentsPerUnit:string; quantityMicro?:string; tradeUsdCents?:string }>;
const object = (value:unknown):value is Record<string,unknown> => !!value&&typeof value==='object'&&!Array.isArray(value);
const exact = (value:Record<string,unknown>,keys:readonly string[]) => keys.length===Object.keys(value).length&&keys.every(key=>Object.hasOwn(value,key));
const hex = (value:unknown):value is string => typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const uint = (value:unknown):value is string => typeof value==='string'&&/^(0|[1-9][0-9]{0,39})$/.test(value);

export function readPublicCurrencyActivity(value:unknown):PublicCurrencyActivity|null {
 if(!object(value)||!exact(value,['assetId','symbol','priceUsdCentsPerUnit',...(Object.hasOwn(value,'quantityMicro')?['quantityMicro']:[]),...(Object.hasOwn(value,'tradeUsdCents')?['tradeUsdCents']:[])])||!hex(value.assetId)
  ||typeof value.symbol!=='string'||! /^[A-Z][A-Z0-9]{1,7}$/u.test(value.symbol)
  ||!uint(value.priceUsdCentsPerUnit)||value.priceUsdCentsPerUnit==='0'
  ||Object.hasOwn(value,'quantityMicro')&&(!uint(value.quantityMicro)||value.quantityMicro==='0')
  ||Object.hasOwn(value,'tradeUsdCents')&&!uint(value.tradeUsdCents))return null;
 return Object.freeze({assetId:value.assetId,symbol:value.symbol,priceUsdCentsPerUnit:value.priceUsdCentsPerUnit,...(typeof value.quantityMicro==='string'?{quantityMicro:value.quantityMicro}:{}),...(typeof value.tradeUsdCents==='string'?{tradeUsdCents:value.tradeUsdCents}:{})});
}

export type CurrencyPricePoint = Readonly<{at:string;usdCents:string;kaiUPulse:string}>;
type PriceHistory = readonly CurrencyPricePoint[];
const empty:PriceHistory = Object.freeze([]);
let activeLedger:{id:string;length:number;head:string;artifact:string}|undefined;
let prices = new Map<string,PriceHistory>();
const listeners = new Set<()=>void>();

export function subscribeCurrencyPriceHistory(listener:()=>void) {
  listeners.add(listener);
  return ()=>{listeners.delete(listener);};
}
export const heldCurrencyPriceHistory = (assetId:string,symbol:string)=>prices.get(assetId+':'+symbol) ?? empty;
export const emptyCurrencyPriceHistory = ()=>empty;

export function currencyPricesAlreadySelected(artifact:string) {
  return activeLedger?.artifact===artifact;
}

/** Publish only the display projection of the shared Ledger's admitted read. */
export function retainCurrencyPriceHistory(
  source:Readonly<{id:string;history:readonly string[];artifact:string}>, next:Map<string,PriceHistory>,
) {
  if (!source.history?.length) return;
  if (activeLedger && (source.id!==activeLedger.id || source.history[activeLedger.length-1]!==activeLedger.head)) return;
  activeLedger={id:source.id,length:source.history.length,head:source.history.at(-1)!,artifact:source.artifact};
  let changed = false;
  for(const [key,points] of next) {
    const previous=prices.get(key);
    if(previous?.length===points.length&&previous.every((point,index)=>
      point.kaiUPulse===points[index].kaiUPulse&&point.at===points[index].at&&point.usdCents===points[index].usdCents))continue;
    prices.set(key,points);
    changed = true;
  }
  if(changed)for(const listener of listeners)listener();
}

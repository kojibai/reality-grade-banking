import type {PublicRecord} from './public-network';

export interface LedgerAssetTrade {
 side:'buy'|'sell';title?:string;marketItemId?:string;shareQuantityMicro?:string;priceUsdCents?:string;
 notionalUsdCents?:string;settlementUsdCents?:string;feeUsdCents?:string;realizedCostBasisUsdCents?:string;
}
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
export function ledgerAssetTradeSide(record:Pick<PublicRecord,'kind'> & {details?:PublicRecord['details']}):'buy'|'sell'|null{
 const kind=record.kind==='wallet_ledger_entry'?record.details?.ledgerEntryKind:record.kind;
 return kind==='market.share.buy'||kind==='market_buy'?'buy':kind==='market.share.sell'||kind==='market_sell'?'sell':null;
}
/** Display facts from the recorded trade only; never a current quote or balance. */
export function readLedgerAssetTrade(input:unknown):LedgerAssetTrade|null{
 const value=object(input);if(value.side!=='buy'&&value.side!=='sell')return null;
 const result:LedgerAssetTrade={side:value.side};
 for(const key of ['title','marketItemId'] as const){const text=value[key];if(typeof text==='string'&&text.trim()&&text.length<=(key==='title'?4096:512)&&!/[\x00-\x1f\x7f]/.test(text))result[key]=text;}
 for(const key of ['shareQuantityMicro','priceUsdCents','notionalUsdCents','settlementUsdCents','feeUsdCents','realizedCostBasisUsdCents'] as const){const raw=value[key],text=typeof raw==='number'&&Number.isSafeInteger(raw)&&raw>=0?String(raw):raw;if(typeof text==='string'&&/^(0|[1-9]\d{0,39})$/.test(text))result[key]=text;}
 return result;
}
export function ledgerAssetTrade(record:PublicRecord):LedgerAssetTrade|null{
 const side=ledgerAssetTradeSide(record),trade=readLedgerAssetTrade(record.details?.assetTrade);
 if(!side||!trade||trade.side!==side||record.amountUsdCents!==null&&trade.settlementUsdCents!==undefined&&record.amountUsdCents!==trade.settlementUsdCents)return null;
 return trade;
}
export function ledgerTradeReturn(trade:LedgerAssetTrade):{amountUsdCents:string;percent:string|null;direction:'up'|'down'|'flat'}|null{
 if(trade.side!=='sell'||trade.settlementUsdCents===undefined||trade.realizedCostBasisUsdCents===undefined)return null;
 const cost=BigInt(trade.realizedCostBasisUsdCents),delta=BigInt(trade.settlementUsdCents)-cost,absolute=delta<0n?-delta:delta;
 const percent=cost>0n?(absolute*10000n+cost/2n)/cost:null;
 return {amountUsdCents:String(delta),percent:percent===null?null:`${delta>0n?'+':delta<0n?'−':''}${percent/100n}.${String(percent%100n).padStart(2,'0')}%`,direction:delta>0n?'up':delta<0n?'down':'flat'};
}
export function ledgerTradeSummary(record:PublicRecord):string|null{
 const trade=ledgerAssetTrade(record);if(!trade)return null;
 const shares=trade.shareQuantityMicro===undefined?null:(BigInt(trade.shareQuantityMicro)/1000000n).toLocaleString('en-US')+((BigInt(trade.shareQuantityMicro)%1000000n)===0n?'':'.'+String(BigInt(trade.shareQuantityMicro)%1000000n).padStart(6,'0').replace(/0+$/,''));
 return [trade.title,shares===null?null:`${shares} ${trade.shareQuantityMicro==='1000000'?'share':'shares'}`].filter(Boolean).join(' · ')||null;
}
/** Immutable event facts survive a compatible thin refresh. Public joins need
 * a shared proof coordinate; private joins stay within the admitted account read. */
export function retainLedgerAssetTrade(known:PublicRecord|undefined,incoming:PublicRecord):PublicRecord{
 if(!known||known.id!==incoming.id||known.source!==incoming.source||known.kind!==incoming.kind||known.authority!==incoming.authority)return incoming;
 const before=ledgerAssetTrade(known);if(!before)return incoming;
 const proofKeys=['entryHash','artifactDigest','proofHead','bundleHash','capsuleHash'];
 const shared=proofKeys.some(key=>/^[a-f0-9]{64}$/i.test(known.evidence[key]??'')&&known.evidence[key]===incoming.evidence[key]);
 if(!shared&&known.authority!=='account-source-projection')return incoming;
 const fail=():never=>{throw Error('Recorded asset trade facts conflict with their retained original.');};
 const conflict=(a:unknown,b:unknown)=>a!==undefined&&a!==null&&b!==undefined&&b!==null&&a!==b;
 if(proofKeys.some(key=>conflict(known.evidence[key],incoming.evidence[key]))||['amountUsdCents','pulse','kaiUpulse'].some(key=>conflict(known[key as keyof PublicRecord],incoming[key as keyof PublicRecord])))fail();
 const after=readLedgerAssetTrade(incoming.details?.assetTrade),side=ledgerAssetTradeSide(incoming);
 if(side!==null&&side!==before.side||after&&Object.entries(before).some(([key,value])=>conflict(value,after[key as keyof LedgerAssetTrade]))||conflict(before.settlementUsdCents,incoming.amountUsdCents)||conflict(after?.settlementUsdCents,known.amountUsdCents)||conflict(known.details?.ledgerEntryKind,incoming.details?.ledgerEntryKind))fail();
 return {...incoming,amountUsdCents:incoming.amountUsdCents??known.amountUsdCents,pulse:incoming.pulse??known.pulse,kaiUpulse:incoming.kaiUpulse??known.kaiUpulse,time:incoming.time??known.time,evidence:{...known.evidence,...incoming.evidence},details:{...known.details,...incoming.details,assetTrade:{...before,...after}}};
}

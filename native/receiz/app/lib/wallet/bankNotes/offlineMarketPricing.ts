import {marketPulsePriceAtPulse,marketShareTargetBudgetUsdCentsForItem,type MarketPulsePriceBasis}from '../../market/marketPulsePricing';
import {buildMarketShareQuoteSnapshot,MARKET_SHARE_RECENT_FLOW_WINDOW_HOURS}from '../../market/shareQuoteModel';
import {normalizeUsdPriceCents,usdCentsFromShareQuantityMicro}from '../../market/shareMath';
import {microPulsesSinceGenesis,GENESIS_TS}from '../../../utils/kai_pulse';
const FLOW_WINDOW_UPULSES=microPulsesSinceGenesis(BigInt(GENESIS_TS)+BigInt(MARKET_SHARE_RECENT_FLOW_WINDOW_HOURS*60*60*1000));
export type OfflineMarketPriceItem=MarketPulsePriceBasis&Readonly<{volumeUsd:number;liquidityUsd:number;holders:number}>;
export type OfflineMarketTradeFlow=Readonly<{side:'buy'|'sell';notionalUsdCents:string;atKaiUPulse:string}>;
export type OfflineMarketPriceBasis=Readonly<{schema:'receiz.bank.offline-market-pricing.v1';item:OfflineMarketPriceItem;livePositionQuantityMicro:string;certificateQuantityMicro:string;recentTrades:readonly OfflineMarketTradeFlow[]}>;
const MAX=(1n<<63n)-1n;
const EMPTY_FLOW:readonly OfflineMarketTradeFlow[]=Object.freeze([]);
function fail():never{throw Error('OFFLINE_MARKET_PRICING_INVALID');}
function exact(v:unknown,keys:readonly string[]):asserts v is Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail();}
function uint(v:unknown):bigint{if(typeof v!=='string'||!/^(0|[1-9][0-9]{0,18})$/u.test(v)||BigInt(v)>MAX)fail();return BigInt(v);}
function pulse(v:unknown){const n=uint(v);if(n<=0n||n/1000000n>BigInt(Number.MAX_SAFE_INTEGER))fail();return n;}
function flow(v:unknown):OfflineMarketTradeFlow{exact(v,['side','notionalUsdCents','atKaiUPulse']);if(!['buy','sell'].includes(String(v.side))||uint(v.notionalUsdCents)<=0n)fail();pulse(v.atKaiUPulse);return v as OfflineMarketTradeFlow;}
/** Compile retained operands once beneath the enclosing funded Source. This
 * calculator is not funding, custody, ownership or completeness authority. */
export function compileBankOfflineMarketPricing(input:unknown,openingKaiUPulse:string){
 const value=structuredClone(input),opening=pulse(openingKaiUPulse);
 exact(value,['schema','item','livePositionQuantityMicro','certificateQuantityMicro','recentTrades']);
 if(value.schema!=='receiz.bank.offline-market-pricing.v1'||!Array.isArray(value.recentTrades))fail();
 exact(value.item,['id','pricingSourceKey','source','priceUsd','pricePhi','intrinsicPhi','quoteUsdPerPhi','changePct','volumeUsd','liquidityUsd','holders','livePulseSeed']);
 const item=value.item;if(typeof item.id!=='string'||!item.id||item.id.length>240||item.pricingSourceKey!==null&&(typeof item.pricingSourceKey!=='string'||item.pricingSourceKey.length>240)||!['venture','assetseal','profile','starter'].includes(String(item.source)))fail();
 for(const key of['priceUsd','pricePhi','intrinsicPhi','quoteUsdPerPhi','changePct','volumeUsd','liquidityUsd','holders'])if(typeof item[key]!=='number'||!Number.isFinite(item[key])||key!=='changePct'&&item[key]<0)fail();
 if(!Number.isSafeInteger(item.holders))fail();
 if(item.livePulseSeed!==null){const seed=item.livePulseSeed;exact(seed,['kind','claimPulse','beat','stepIndex','chakraDay','creatorVerified','kaiSignature','userPhiKey',...(Object.hasOwn(seed,'frequencyHz')?['frequencyHz']:[])]);if(seed.kind!=='sigil'||typeof seed.creatorVerified!=='boolean')fail();if(seed.frequencyHz!==undefined&&(typeof seed.frequencyHz!=='number'||!Number.isFinite(seed.frequencyHz)||seed.frequencyHz<=0))fail();for(const key of['claimPulse','beat','stepIndex'])if(!Number.isSafeInteger(seed[key])||Number(seed[key])<0)fail();if(BigInt(Number(seed.claimPulse))>opening/1000000n||Number(seed.beat)>35||Number(seed.stepIndex)>43)fail();for(const key of['chakraDay','kaiSignature','userPhiKey'])if(seed[key]!==null&&typeof seed[key]!=='string')fail();}
 const initialQuantity=uint(value.livePositionQuantityMicro),certificateQuantity=uint(value.certificateQuantityMicro),trades=value.recentTrades.map(flow);
 for(const trade of trades)if(pulse(trade.atKaiUPulse)>opening)fail();
 const basis=value as unknown as OfflineMarketPriceBasis;
 let previous:{coordinate:string;delta:string;flow:readonly OfflineMarketTradeFlow[];quote:ReturnType<typeof buildMarketShareQuoteSnapshot>}|undefined;
 return Object.freeze({at(positionQuantityDelta:string,localFlow:readonly OfflineMarketTradeFlow[],atKaiUPulse:string){
  const at=pulse(atKaiUPulse);if(at<opening||!/^(-?[1-9][0-9]{0,18}|0)$/u.test(positionQuantityDelta))fail();
  const reusable=localFlow.length===0||Object.isFrozen(localFlow)&&localFlow.every(Object.isFrozen);
  if(reusable&&previous?.coordinate===atKaiUPulse&&previous.delta===positionQuantityDelta&&(previous.flow===localFlow||previous.flow.length===0&&localFlow.length===0))return previous.quote;
  const quantity=initialQuantity+BigInt(positionQuantityDelta);if(quantity<0n||quantity>MAX)fail();
  const wholePulse=Number(at/1000000n),price=marketPulsePriceAtPulse(basis.item,wholePulse),referenceMidUsdCents=normalizeUsdPriceCents(price.priceUsd);
  const cutoff=at-FLOW_WINDOW_UPULSES;let buy=0n,sell=0n;
  for(const trade of[...trades,...localFlow.map(flow)]){const coordinate=pulse(trade.atKaiUPulse);if(coordinate>at)fail();if(coordinate<cutoff)continue;if(trade.side==='buy')buy+=uint(trade.notionalUsdCents);else sell+=uint(trade.notionalUsdCents);}
  const quote=buildMarketShareQuoteSnapshot({referenceMidUsdCents,targetBudgetUsdCents:marketShareTargetBudgetUsdCentsForItem({...basis.item,priceUsd:price.priceUsd}),livePositionOpenInterestUsdCents:usdCentsFromShareQuantityMicro(quantity,referenceMidUsdCents),certificateOpenInterestUsdCents:usdCentsFromShareQuantityMicro(certificateQuantity,referenceMidUsdCents),recentBuyNotionalUsdCents:buy,recentSellNotionalUsdCents:sell,changePctBps:Math.round(Math.abs(price.changePct)*100)});
  Object.freeze(quote.pressure);Object.freeze(quote);
  if(reusable)previous={coordinate:atKaiUPulse,delta:positionQuantityDelta,flow:localFlow.length===0?EMPTY_FLOW:localFlow,quote};
  return quote;
 }});
}

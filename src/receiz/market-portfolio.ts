import type {ReceizIdentityAccountProjection} from '@receiz/sdk';
export interface MarketPosition {id:string;marketItemId:string;assetId:string|null;title:string;summary:string;shareQuantityMicro:string;costBasisUsdCents:string|null;lastPriceUsdCents:string|null;openedAt:string;lastTradeAt:string|null}
export interface MarketPositionTrade {id:string;marketItemId:string;title:string;side:'buy'|'sell';shareQuantityMicro:string;executionPriceUsdCents:string|null;settlementUsdCents:string|null;feeUsdCents:string|null;realizedPnlUsdCents:string|null;executedAt:string}
export interface MarketPortfolio {schema:'bankeiz.market-portfolio.v1';authority:'market-observation';accountUid:string;observedAt:string;source:'connected'|'sealed-head';complete?:false;positions:MarketPosition[];trades:MarketPositionTrade[]}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=512)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v)?v:null;
const exact=(v:unknown,signed=false):string|null=>typeof v==='string'&&(signed?/^(0|-?[1-9]\d{0,39})$/:/^(0|[1-9]\d{0,39})$/).test(v)?v:null;
const date=(v:unknown)=>text(v,64)&&Number.isFinite(Date.parse(v as string))?v as string:null;
export function marketDisplayCents(v:unknown,signed=false):string|null{if(typeof v!=='number'||!Number.isFinite(v)||!signed&&v<0)return null;const cents=Math.round(v*100);return Number.isSafeInteger(cents)?String(cents):null;}
function position(input:unknown):MarketPosition{
 const p=object(input),id=text(p.id),marketItemId=text(p.marketItemId),quantity=exact(p.shareQuantityMicro),openedAt=date(p.openedAt);
 if(!id||!marketItemId||quantity===null||!openedAt)throw Error('MARKET_PORTFOLIO_POSITION_INVALID');
 return{id,marketItemId,assetId:text(p.assetId),title:text(p.title,8192)??'Investment',summary:typeof p.summary==='string'?p.summary.slice(0,8192):'',shareQuantityMicro:quantity,costBasisUsdCents:exact(p.costBasisUsdCents)??marketDisplayCents(p.costBasisUsd),lastPriceUsdCents:exact(p.lastPriceUsdCents)??marketDisplayCents(p.lastPriceUsd),openedAt,lastTradeAt:date(p.lastTradeAt)};
}
function trade(input:unknown):MarketPositionTrade{
 const t=object(input),id=text(t.id),marketItemId=text(t.marketItemId),quantity=exact(t.shareQuantityMicro),executedAt=date(t.executedAt);
 if(!id||!marketItemId||!['buy','sell'].includes(String(t.side))||quantity===null||!executedAt)throw Error('MARKET_PORTFOLIO_TRADE_INVALID');
 return{id,marketItemId,title:text(t.title,8192)??'Investment',side:t.side as 'buy'|'sell',shareQuantityMicro:quantity,executionPriceUsdCents:exact(t.executionPriceUsdCents)??marketDisplayCents(t.executionPriceUsd),settlementUsdCents:exact(t.settlementUsdCents)??marketDisplayCents(t.settlementUsd),feeUsdCents:exact(t.feeUsdCents)??marketDisplayCents(t.feeUsd),realizedPnlUsdCents:exact(t.realizedPnlUsdCents,true)??marketDisplayCents(t.realizedPnlUsd,true),executedAt};
}
/** Private read-only position presentation, never a balance or trade authority. */
export function parseMarketPortfolio(input:unknown,accountUid:string):MarketPortfolio{
 const v=object(input),retained=v.schema==='bankeiz.market-portfolio.v1',observedAt=date(v.observedAt);
 if((retained?v.accountUid:v.actorUserId)!==accountUid||!accountUid||v.authority!=='market-observation'||!retained&&(v.ok!==true||v.schema!=='receiz.market.portfolio.v1')||!observedAt||!Array.isArray(v.positions)||v.positions.length>10_000||!Array.isArray(v.trades)||v.trades.length>100_000)throw Error('MARKET_PORTFOLIO_ACCOUNT_MISMATCH');
 const positions=v.positions.map(position),trades=v.trades.map(trade);
 if(new Set(positions.map(p=>p.marketItemId)).size!==positions.length||new Set(trades.map(t=>t.id)).size!==trades.length)throw Error('MARKET_PORTFOLIO_DUPLICATE');
 return{schema:'bankeiz.market-portfolio.v1',authority:'market-observation',accountUid,observedAt,source:retained&&v.source==='sealed-head'?'sealed-head':'connected',...(retained&&v.complete===false?{complete:false as const}:{}),positions:positions.filter(p=>BigInt(p.shareQuantityMicro)>0n),trades};
}
// Preserve PostgreSQL sub-millisecond ordering when two trades share a frame.
const preciseTime=(at:string)=>BigInt(Date.parse(at))*1000000n+BigInt((at.match(/\.(\d{1,9})/)?.[1]??'').padEnd(9,'0').slice(3));
function recordedPortfolio(previous:MarketPortfolio|null,raw:unknown,uid:string):MarketPortfolio{
 const r=object(raw),source=object(r.source),p=object(source.position),t=object(source.trade);
 if(r.ok!==true||r.authority!=='market-observation'||r.actorUserId!==uid||r.found!==true||r.recorded!==true||p.owner_user_id!==uid||t.owner_user_id!==uid||t.market_type!=='asset'||p.id!==t.position_id||p.market_item_id!==t.market_item_id)throw Error('MARKET_PORTFOLIO_ORIGINAL_MISMATCH');
 const nextPosition=position({id:p.id,marketItemId:p.market_item_id,assetId:p.asset_id,title:p.title,summary:p.summary,shareQuantityMicro:p.share_quantity_micro,costBasisUsdCents:p.cost_basis_usd_cents,lastPriceUsdCents:p.last_price_usd_cents,openedAt:p.opened_at,lastTradeAt:p.last_trade_at});
 const nextTrade=trade({id:t.id,marketItemId:t.market_item_id,title:t.title,side:t.side,shareQuantityMicro:t.share_quantity_micro,executionPriceUsdCents:t.price_usd_cents,settlementUsdCents:t.settlement_usd_cents,feeUsdCents:t.fee_usd_cents,executedAt:t.created_at});
 if(previous?.trades.some(row=>row.id===nextTrade.id))return previous;
 const held=previous?.positions.find(row=>row.marketItemId===nextPosition.marketItemId);
 const latest=held?.lastTradeAt??previous?.trades.reduce<string|null>((at,row)=>row.marketItemId===nextPosition.marketItemId&&(!at||preciseTime(row.executedAt)>preciseTime(at))?row.executedAt:at,null);
 const newer=!latest||preciseTime(nextPosition.lastTradeAt??nextTrade.executedAt)>preciseTime(latest);
 const positions=(previous?.positions??[]).flatMap(row=>row.marketItemId!==nextPosition.marketItemId||!newer?[row]:BigInt(nextPosition.shareQuantityMicro)>0n?[nextPosition]:[]);
 if(newer&&BigInt(nextPosition.shareQuantityMicro)>0n&&!previous?.positions.some(row=>row.marketItemId===nextPosition.marketItemId))positions.push(nextPosition);
 const observedAt=[previous?.observedAt,nextPosition.lastTradeAt,nextTrade.executedAt,date(p.updated_at)].filter((v):v is string=>!!v).sort((a,b)=>preciseTime(a)>preciseTime(b)?-1:preciseTime(a)<preciseTime(b)?1:0)[0];
 const trades=[...(previous?.trades??[])],at=preciseTime(nextTrade.executedAt),index=trades.findIndex(row=>preciseTime(row.executedAt)<=at);trades.splice(index<0?trades.length:index,0,nextTrade);
 return{schema:'bankeiz.market-portfolio.v1',authority:'market-observation',accountUid:uid,observedAt,source:'connected',...(!previous||previous.complete===false?{complete:false as const}:{}),positions,trades};
}
export function readSealedMarketPortfolio(projection:ReceizIdentityAccountProjection,uid:string):MarketPortfolio|null{
 if(!projection.portableStateVerified)return null;
 const market=object(object(projection.verifiedState).market),snapshot=object(market.snapshot);
 if(market.schema!=='receiz.market.account-portable.v1'||market.ownerUserId!==uid||market.completeAtSealedHead!==true||snapshot.viewerUserId!==uid||snapshot.signedIn!==true||!Array.isArray(snapshot.ownedItems))return null;
 try{const positions=snapshot.ownedItems.flatMap(value=>{const item=object(value),p=object(item.position);return item.marketType!==undefined&&item.marketType!=='asset'||!p.id?[]:[{...p,marketItemId:item.id,assetId:item.assetId,title:item.title,summary:item.summary}];});
 return{...parseMarketPortfolio({ok:true,schema:'receiz.market.portfolio.v1',authority:'market-observation',actorUserId:uid,observedAt:snapshot.generatedAt,positions,trades:snapshot.shareTradeHistory??[]},uid),source:'sealed-head'};}catch{return null;}
}
/** One shared account read; commits during a read queue one fresh successor.
 * A failure retains the settled view, and closing the owner prevents adoption. */
export function createMarketPortfolio(input:{accountUid:string;initial?:MarketPortfolio|null;assertOpen():void;request():Promise<unknown>;save?(value:MarketPortfolio):Promise<void>}){
 let current=input.initial??null,pending:Promise<MarketPortfolio>|null=null,observed=0,revision=0,dirty=false,saving=Promise.resolve();const listeners=new Set<()=>void>();
 function refresh(force=false):Promise<MarketPortfolio>{
  try{input.assertOpen();}catch(cause){return Promise.reject(cause);}
  if(pending)return pending;if(!force&&!dirty&&current&&Date.now()-observed<60_000)return Promise.resolve(current);
  const ticket=revision;dirty=false;
  const attempt=input.request().then(value=>{input.assertOpen();const next=parseMarketPortfolio(value,input.accountUid);if(ticket!==revision)throw Error('MARKET_PORTFOLIO_SUPERSEDED');
   if(current&&Date.parse(next.observedAt)<Date.parse(current.observedAt))throw Error('MARKET_PORTFOLIO_OLDER_OBSERVATION');
   const nextTrades=new Set(next.trades.map(row=>row.id));if(current?.trades.some(row=>!nextTrades.has(row.id)))throw Error('MARKET_PORTFOLIO_HISTORY_INCOMPLETE');
   current=next;observed=Date.now();for(const listener of listeners)listener();saving=saving.catch(()=>{}).then(async()=>{input.assertOpen();await input.save?.(next);}).catch(()=>{});return next;
  });pending=attempt;void attempt.finally(()=>{if(pending===attempt)pending=null;if(dirty){try{input.assertOpen();void refresh(true).catch(()=>{});}catch{/* Closed identity. */}}}).catch(()=>{});return attempt;
 }
 return{known:()=>current,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},refresh,
  /** Display only: the caller has already retained and admitted this original.
   * Its absolute position updates every open surface before background sync. */
  adoptRecorded(raw:unknown){input.assertOpen();const next=recordedPortfolio(current,raw,input.accountUid);if(next===current)return;revision++;dirty=true;current=next;for(const listener of listeners)listener();saving=saving.catch(()=>{}).then(async()=>{input.assertOpen();await input.save?.(next);}).catch(()=>{});},
  invalidate(){revision++;dirty=true;if(!pending)void refresh(true).catch(()=>{});}};
}
export type MarketPortfolioClient=ReturnType<typeof createMarketPortfolio>;

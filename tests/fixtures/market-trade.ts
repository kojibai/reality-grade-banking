// Explicitly synthetic originals for local UI/transport checks; no account or money.
export const marketFixtureUid='10000000-0000-4000-8000-000000000001';
export function syntheticMarketRecord(body:{marketItemId:string;side:'buy'|'sell';clientNonce:string;amountUsd?:string;shareQuantity?:string},uid=marketFixtureUid){
 const nonce=body.clientNonce,positionId='10000000-0000-4000-8000-000000000003',tradeId='10000000-0000-4000-8000-000000000004';
 const result={ok:true,authority:'market-observation',actorUserId:uid,found:true,recorded:true,source:{trade:{id:tradeId,owner_user_id:uid,position_id:positionId,market_item_id:'asset:one',side:'buy',market_type:'asset',client_nonce:nonce,metadata:{source:'market_desk_console',budgetUsdCents:'1000'},share_quantity_micro:'1250000',notional_usd_cents:'1000',settlement_usd_cents:'1000',fee_usd_cents:'0',notional_phi_micro:'10000000'},position:{id:positionId,owner_user_id:uid,market_item_id:'asset:one',share_quantity_micro:'2250000'},ledgerEntries:[{id:tradeId,user_id:uid,idempotency_key:`market_trade:buy:${nonce}`,entry_kind:'market_buy',direction:'debit',amount_usd_cents:'1000',amount_phi_micro:'10000000'}]}};
 result.source.trade.market_item_id=body.marketItemId;result.source.position.market_item_id=body.marketItemId;
 result.source.trade.side=body.side;result.source.ledgerEntries[0].entry_kind=`market_${body.side}`;result.source.ledgerEntries[0].idempotency_key=`market_trade:${body.side}:${nonce}`;result.source.ledgerEntries[0].direction=body.side==='buy'?'debit':'credit';
 if(body.side==='sell')result.source.trade.share_quantity_micro=String(BigInt(body.shareQuantity!.replace('.','')));
 return result;
}
export function syntheticMarketQuote(query:URLSearchParams,uid=marketFixtureUid){return{ok:true,authority:'market-observation',actorUserId:uid,pulse:14000000,request:Object.fromEntries(query),item:{id:query.get('marketItemId'),title:'Synthetic proof object'},quote:{binding:'advisory',modelVersion:'market-share-quote-v1'},preview:{shareQuantityMicro:query.get('side')==='sell'?String(BigInt(query.get('shareQuantity')!.replace('.',''))):'1250000',settlementUsdCents:'1000'},position:null};}

/** Public diagnostics only. Never retain arbitrary service payloads or text. */
export const marketFailureCodes=new Set(['BANK_MARKET_DOLLAR_SALE_UNAVAILABLE','market_invalid_amount','market_invalid_item','market_position_lookup_failed','market_original_lookup_failed','market_original_source_invalid','market_original_integer_invalid','market_original_mismatch','market_insufficient_shares','market_trade_price_unavailable','market_trade_live_only','market_quote_buy_side_paused','market_quote_trade_limit','market_quote_exposure_cap','market_amount_too_small','market_trade_closed','wallet_insufficient_balance']);
export type MarketFailure={code:string;status:number|null};
export function marketFailureDetails(error:unknown):MarketFailure{
 const value=error as {message?:unknown;status?:unknown;payload?:{error?:unknown}}|null;
 const status=typeof value?.status==='number'&&Number.isInteger(value.status)&&value.status>=400&&value.status<=599?value.status:null;
 const code=[value?.payload?.error,value?.message].find(code=>typeof code==='string'&&marketFailureCodes.has(code));
 return {code:typeof code==='string'?code:status?`HTTP_${status}`:'BANK_MARKET_UNAVAILABLE',status};
}
export function validMarketFailure(value:unknown):value is MarketFailure{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='code,status')return false;
 const v=value as MarketFailure;
 return (v.status===null||Number.isInteger(v.status)&&v.status>=400&&v.status<=599)&&(marketFailureCodes.has(v.code)||v.code==='BANK_MARKET_UNAVAILABLE'||v.status!==null&&v.code===`HTTP_${v.status}`);
}
export function marketFailureMessage(code:string):string|undefined{
 switch(code){
  case 'market_quote_trade_limit':return 'Each purchase is limited to one-third of this asset’s current soft exposure cap. Enter a smaller amount and review again.';
  case 'market_quote_exposure_cap':return 'The asset has reached its current purchase capacity. Choose a smaller amount or review again later.';
  case 'market_quote_buy_side_paused':return 'Purchases for this asset are paused. Review again when purchases resume.';
  case 'wallet_insufficient_balance':return 'Your available balance is below this purchase amount. Choose a smaller amount or add funds.';
  case 'market_insufficient_shares':return 'Your available shares are below this sale quantity. Review your current holding and try again.';
  case 'market_amount_too_small':return 'This amount is below the smallest tradable share quantity. Enter a larger amount and review again.';
  case 'market_trade_price_unavailable':return 'A current trade price is unavailable. Your amount is kept; review again.';
 }
}
export function marketFailureHeading(code:string):string|undefined{
 switch(code){
  case 'market_quote_trade_limit':return 'Amount exceeds trade limit';
  case 'market_quote_exposure_cap':return 'Purchase capacity reached';
  case 'market_quote_buy_side_paused':return 'Purchases paused';
  case 'wallet_insufficient_balance':return 'Amount exceeds available balance';
  case 'market_insufficient_shares':return 'Quantity exceeds available shares';
  case 'market_amount_too_small':return 'Amount below minimum';
 }
}

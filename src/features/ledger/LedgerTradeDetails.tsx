import {formatMoney,formatUnits} from '../../core/money';
import {ledgerTradeReturn,type LedgerAssetTrade} from '../../receiz/ledger-asset-trade';
import './ledger-trade.css';

export function LedgerTradeReturn({trade}:{trade:LedgerAssetTrade}){
 const result=ledgerTradeReturn(trade);if(!result)return null;
 return <small className={`ledger-trade-return is-${result.direction}`} title="Realized return after fees, compared with the recorded cost basis of the shares sold."><span>{BigInt(result.amountUsdCents)>0n?'+':''}{formatMoney(result.amountUsdCents)}</span>{result.percent!==null&&<span> ({result.percent})</span>}<span className="ledger-trade-return-label"> realized</span></small>;
}
export function LedgerTradeDetails({trade}:{trade:LedgerAssetTrade|null}){
 if(!trade)return null;const result=ledgerTradeReturn(trade),quantity=BigInt(trade.shareQuantityMicro??'0');
 const price=trade.priceUsdCents??(trade.notionalUsdCents!==undefined&&quantity>0n?String((BigInt(trade.notionalUsdCents)*1000000n+quantity/2n)/quantity):undefined);
 return <section className="ledger-trade-details" aria-label={trade.side==='buy'?'Asset purchase details':'Asset sale details'}>
  {trade.title&&<h4>{trade.title}</h4>}
  <dl>
   {trade.shareQuantityMicro!==undefined&&<div><dt>Shares {trade.side==='buy'?'purchased':'sold'}</dt><dd>{formatUnits(trade.shareQuantityMicro)}</dd></div>}
   {price!==undefined&&<div><dt>{trade.priceUsdCents!==undefined?'Price per share':'Average price per share'}</dt><dd>{formatMoney(price)}</dd></div>}
   {trade.feeUsdCents!==undefined&&<div><dt>Fees</dt><dd>{formatMoney(trade.feeUsdCents)}</dd></div>}
   {trade.settlementUsdCents!==undefined&&<div><dt>{trade.side==='buy'?'Total paid':'Sale proceeds'}</dt><dd>{formatMoney(trade.settlementUsdCents)}</dd></div>}
   {trade.side==='sell'&&trade.realizedCostBasisUsdCents!==undefined&&<div><dt>Cost basis of shares sold</dt><dd>{formatMoney(trade.realizedCostBasisUsdCents)}</dd></div>}
   {result&&<div><dt>{result.direction==='down'?'Realized loss':result.direction==='up'?'Realized gain':'Realized return'}</dt><dd><LedgerTradeReturn trade={trade}/></dd></div>}
  </dl>
  {trade.side==='sell'&&trade.realizedCostBasisUsdCents===undefined&&<p>Cost basis not carried by this record.</p>}
 </section>;
}

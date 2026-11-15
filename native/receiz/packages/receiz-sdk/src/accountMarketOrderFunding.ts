import {readReceizAccountFinancialSourceCustody,type ReceizAccountFinancialSource} from './accountFinancialSource.js';
import {readReceizAccountFinancialOperationCustody,type ReceizVerifiedAccountFinancialOperation} from './accountFinancialCommit.js';
import {exportReceizAccountMarketOrderRequest,type ReceizVerifiedAccountMarketOrderRequest} from './accountMarketOrder.js';
import type {ReceizAccountFinancialState} from './accountFinancialExecution.js';
import {marketNotionalPhiMicroFromUsdCents,marketWalletDebitFromAmounts,marketPositionCostForQuantity} from './accountFinancialMath.generated.js';
import {digestReceizCanonicalV122 as digest} from './v122Canonical.js';

type Money=Readonly<{kind:'money';amountUsdCents:string;amountPhiMicro:string;settledUsdCents:string;ecosystemUsdCents:string}>;
type Shares=Readonly<{kind:'shares';shareQuantityMicro:string;costBasisUsdCents:string;costBasisPhiMicro:string}>;
export type ReceizAccountMarketOrderPartition=Readonly<{
 schema:'receiz.account-market-order-partition.v1';orderId:string;
 sourceArtifactSha256:string;predecessorArtifactSha256:string;orderRequestArtifactSha256:string;
 accountUserId:string;ownerReceizId:string;applicationId:string;orderKaiUPulse:string;
 marketItemId:string;assetArtifactSha256:string;limitExecutionPriceUsdCents:string;
 action:ReceizVerifiedAccountMarketOrderRequest['action'];funding:Money|Shares;
}>;
const MAX=(1n<<63n)-1n;
function fail(code:string):never{throw new TypeError('ORDER_FUNDING_'+code);}
function amount(value:string){if(!/^(0|[1-9][0-9]{0,18})$/u.test(value)||BigInt(value)>MAX)fail('INTEGER');return BigInt(value);}
function bounded(value:bigint){if(value<0n||value>MAX)fail('INTEGER');return String(value);}

/** Candidate partition under a whole Source and its signed request. No amount
 * becomes reserved until the actual financial writer consumes this exact parent
 * and retains its Original. The partition's hash identifies a projection inside
 * that stronger Original; this JSON is never a standalone funding source. */
export async function projectReceizAccountMarketOrderFunding(input:Readonly<{source:ReceizAccountFinancialSource;predecessor?:ReceizVerifiedAccountFinancialOperation|null;request:ReceizVerifiedAccountMarketOrderRequest}>){
 const{source,request,predecessor}=input,custody=readReceizAccountFinancialSourceCustody(source);
 exportReceizAccountMarketOrderRequest(request);
 const program=custody.body.program as {schema:string;orderPolicy?:{schema:string}};
 if(program.schema!=='receiz.bank.offline-financial-program.v4'||program.orderPolicy?.schema!=='receiz.bank.account-market-order-policy.v1')fail('POLICY');
 if(predecessor&&readReceizAccountFinancialOperationCustody(predecessor).sourceSha256!==source.artifactSha256)fail('PARENT');
 if(request.sourceArtifactSha256!==source.artifactSha256||request.predecessorArtifactSha256!==(predecessor?.artifactSha256??source.artifactSha256)||request.predecessorOperationId!==(predecessor?.operationId??null))fail('PARENT');
 const state=predecessor?.nextState??custody.body.initialState as ReceizAccountFinancialState;
 if(amount(request.orderKaiUPulse)<=amount(state.lastKaiUPulse))fail('PULSE');
 if((state.orderEscrows??[]).some(row=>row.orderId===request.orderId))fail('DUPLICATE');
 const value=custody.valuation.at(state.walletLedger,source.accountUserId,request.orderKaiUPulse);
 let ledger={...state.walletLedger},positions=state.positions.map(row=>({...row})),funding:Money|Shares;
 if(request.reservation.kind==='money'){
  const cents=amount(request.reservation.amountUsdCents),phi=marketNotionalPhiMicroFromUsdCents(cents,amount(value.usdPerPhiMicrocents));
  if(cents>amount(value.marketAvailableUsdCents))fail('INSUFFICIENT');
  const rawSettled=amount(state.walletLedger.settledUsdCents),available=amount(value.wallet.availableUsdCents);
  const debit=marketWalletDebitFromAmounts({balance:amount(value.wallet.balancePhiMicro),available,settled:rawSettled<available?rawSettled:available,amount:cents,phi,rate:amount(value.usdPerPhiMicrocents),nativeValueEnabled:value.nativeValueEnabled});
  ledger={...ledger,accountBalancePhiMicro:bounded(debit.balance),totalDebitPhiMicro:bounded(amount(ledger.totalDebitPhiMicro)+phi),totalDebitUsdCents:bounded(amount(ledger.totalDebitUsdCents)+cents),settledUsdCents:bounded(rawSettled-debit.settledSpent)};
  funding={kind:'money',amountUsdCents:String(cents),amountPhiMicro:String(phi),settledUsdCents:String(debit.settledSpent),ecosystemUsdCents:String(cents-debit.settledSpent)};
 }else{
  const held=positions.find(row=>row.marketItemId===request.action.marketItemId);if(!held)fail('OWNERSHIP');
  const quantity=amount(request.reservation.shareQuantityMicro),total=amount(held.shareQuantityMicro),cost=marketPositionCostForQuantity(quantity,total,amount(held.costBasisUsdCents),amount(held.costBasisPhiMicro));
  funding={kind:'shares',shareQuantityMicro:String(quantity),costBasisUsdCents:String(cost.usd),costBasisPhiMicro:String(cost.phi)};
  positions=positions.filter(row=>row!==held);
  if(quantity<total)positions.push({...held,shareQuantityMicro:String(total-quantity),costBasisUsdCents:bounded(amount(held.costBasisUsdCents)-cost.usd),costBasisPhiMicro:bounded(amount(held.costBasisPhiMicro)-cost.phi)});
  positions.sort((a,b)=>a.marketItemId<b.marketItemId?-1:a.marketItemId>b.marketItemId?1:0);
 }
 const genesis:ReceizAccountMarketOrderPartition={schema:'receiz.account-market-order-partition.v1',orderId:request.orderId,sourceArtifactSha256:source.artifactSha256,predecessorArtifactSha256:request.predecessorArtifactSha256,orderRequestArtifactSha256:request.artifactSha256,accountUserId:source.accountUserId,ownerReceizId:source.ownerReceizId,applicationId:request.applicationId,orderKaiUPulse:request.orderKaiUPulse,marketItemId:request.action.marketItemId,assetArtifactSha256:request.assetArtifactSha256,limitExecutionPriceUsdCents:request.limitExecutionPriceUsdCents,action:request.action,funding};
 const fundingSourceSha256=await digest(genesis);
 const next:ReceizAccountFinancialState={...state,sequence:bounded(amount(state.sequence)+1n),lastKaiUPulse:request.orderKaiUPulse,walletLedger:ledger,wallet:custody.valuation.at(ledger,source.accountUserId,request.orderKaiUPulse).wallet,positions,orderEscrows:[...(state.orderEscrows??[]),{orderId:request.orderId,marketItemId:request.action.marketItemId,reservedShareQuantityMicro:funding.kind==='shares'?funding.shareQuantityMicro:'0',fundingSourceSha256}]};
 return{effect:{kind:'reserve-market-order'as const,orderId:request.orderId,orderRequestArtifactSha256:request.artifactSha256,fundingSourceSha256},next,genesis};
}

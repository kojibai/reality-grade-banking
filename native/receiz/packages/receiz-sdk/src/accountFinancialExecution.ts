import {readReceizAccountFinancialSourceCustody,type ReceizAccountFinancialSource}from './accountFinancialSource.js';
import {deriveMarketShareAccounting,marketNotionalPhiMicroFromUsdCents,marketShareBuyPreviewFromBudgetUsdCentsAtAsk,marketShareSellPreviewFromBudgetUsdCentsAtBid,type AccountExecutionMarketFlow,type AccountExecutionWalletAmounts,type AccountExecutionWalletLedger,type AccountExecutionPositionAmounts}from './accountFinancialMath.generated.js';

type Position=AccountExecutionPositionAmounts&Readonly<{marketItemId:string}>;
type Capacity=Readonly<{marketItemId:string;buyCapacityUsdCents:string;backedSellLiquidityUsdCents:string;buyShareQuantityMicro?:string}>;
type Term=Capacity&Readonly<{sourceArtifactSha256:string;bidPriceUsdCents:string;askPriceUsdCents:string;referenceMidUsdCents:string;maxSingleTradeUsdCents:string;targetBudgetUsdCents:string}>;
export type ReceizAccountFinancialState=Readonly<{schema:'receiz.account-financial-state.v1';allocationId:string;accountUserId:string;sequence:string;lastKaiUPulse:string;wallet:AccountExecutionWalletAmounts;walletLedger:AccountExecutionWalletLedger;positions:readonly Position[];marketCapacity:readonly Capacity[];marketActivity?:readonly Readonly<{marketItemId:string;trades:readonly AccountExecutionMarketFlow[]}>[]}>;
type Recipient=Readonly<{recipientUserId:string;recipientOwnerReceizId:string;conversationId:string;sourceAccountArtifactSha256:string}>;
export type ReceizAccountSendAction=Readonly<{kind:'send';recipientUserId:string;conversationId:string;amountUsdCents:string;note?:string}>;
export type ReceizAccountMarketAction=Readonly<{kind:'buy'|'sell';marketItemId:string;amountUsdCents?:string;shareQuantityMicro?:string}>;
const MAX=(1n<<63n)-1n;
const min=(a:bigint,b:bigint)=>a<b?a:b;
function fail(code:string):never{throw new TypeError('ACCOUNT_FINANCIAL_'+code);}
function uint(v:unknown,positive=false):bigint{if(typeof v!=='string'||!/^(0|[1-9][0-9]{0,18})$/u.test(v))fail('INTEGER');const n=BigInt(v);if(n>MAX||n<(positive?1n:0n))fail('INTEGER');return n;}
function bounded(v:bigint):string{if(v<0n||v>MAX)fail('INTEGER');return String(v);}
const indexed=new WeakMap<ReceizAccountFinancialSource,ReadonlyMap<string,Term>>();
/** Mechanical reduction under genuine funded source custody. This returns a
 * candidate only. It neither admits a supplied successor state nor commits a
 * trade; accepted ancestry, signatures and durable CAS are required separately. */
export function projectReceizAccountFinancialAction(source:ReceizAccountFinancialSource,state:ReceizAccountFinancialState,action:ReceizAccountMarketAction|ReceizAccountSendAction,atKaiUPulse:string){
 const custody=readReceizAccountFinancialSourceCustody(source),program=custody.body.program as {validFromKaiUPulse:string;expiresAtKaiUPulse:string;marketTerms:Term[];recipientBindings?:Recipient[]};
 if(state.schema!=='receiz.account-financial-state.v1'||state.allocationId!==source.allocationId||state.accountUserId!==source.accountUserId)fail('STATE');
 const at=uint(atKaiUPulse,true);if(at<uint(program.validFromKaiUPulse,true)||at>uint(program.expiresAtKaiUPulse,true)||at<=uint(state.lastKaiUPulse))fail('CAUSAL_PULSE');
 if(action?.kind==='send'){
  if(Object.keys(action).some(k=>!['kind','recipientUserId','conversationId','amountUsdCents','note'].includes(k)))fail('ACTION');
  const recipient=program.recipientBindings?.find(r=>r.recipientUserId===action.recipientUserId&&r.conversationId===action.conversationId);if(!recipient)fail('RECIPIENT_REQUIRED');
  const value=custody.valuation.at(state.walletLedger,source.accountUserId,atKaiUPulse),cents=uint(action.amountUsdCents,true),phi=marketNotionalPhiMicroFromUsdCents(cents,uint(value.usdPerPhiMicrocents,true));
  if(phi<=0n||cents>uint(value.wallet.availableUsdCents)||phi>uint(value.wallet.balancePhiMicro))fail('WALLET_INSUFFICIENT_BALANCE');
  const settled=min(cents,uint(value.wallet.settledUsdCents)),ecosystem=cents-settled;
  const note=action.note?.replace(/\s+/gu,' ').trim();if(action.note!==undefined&&(typeof action.note!=='string'||(note?.length??0)>280))fail('NOTE');
  const ledger:AccountExecutionWalletLedger={...state.walletLedger,accountBalancePhiMicro:bounded(uint(value.wallet.balancePhiMicro)-phi),totalDebitPhiMicro:bounded(uint(state.walletLedger.totalDebitPhiMicro)+phi),totalDebitUsdCents:bounded(uint(state.walletLedger.totalDebitUsdCents)+cents),settledUsdCents:bounded(uint(state.walletLedger.settledUsdCents)-settled)};
  return{effect:{kind:'send'as const,senderUserId:source.accountUserId,recipientUserId:recipient.recipientUserId,recipientOwnerReceizId:recipient.recipientOwnerReceizId,conversationId:recipient.conversationId,amountUsdCents:String(cents),amountPhiMicro:String(phi),settlementUsdCents:String(cents),settlementPhiMicro:String(phi),usdPerPhiMicrocents:value.usdPerPhiMicrocents,settledUsdCents:String(settled),ecosystemUsdCents:String(ecosystem),fundingRule:'settled_first_then_phi'as const,settledFundingSource:settled>=cents?'stripe_origin':settled>0n?'mixed_stripe_ecosystem':'unsettled_ecosystem',...(note?{note}:{})},next:{...state,sequence:bounded(uint(state.sequence)+1n),lastKaiUPulse:atKaiUPulse,wallet:custody.valuation.at(ledger,source.accountUserId,atKaiUPulse).wallet,walletLedger:ledger,positions:state.positions.map(p=>({...p})),marketCapacity:state.marketCapacity.map(c=>({...c}))}};
 }
 if(!action||!['buy','sell'].includes(action.kind)||typeof action.marketItemId!=='string'||Object.keys(action).some(k=>!['kind','marketItemId','amountUsdCents','shareQuantityMicro'].includes(k))||(action.amountUsdCents===undefined)===(action.shareQuantityMicro===undefined)||action.kind==='buy'&&action.amountUsdCents===undefined)fail('ACTION');
 let terms=indexed.get(source);if(!terms){terms=new Map(program.marketTerms.map(t=>[t.marketItemId,t]));indexed.set(source,terms);}
 const term=terms.get(action.marketItemId),capacity=state.marketCapacity.find(c=>c.marketItemId===action.marketItemId);if(!term||!capacity)fail('TERMS_REQUIRED');
 const value=custody.valuation.at(state.walletLedger,source.accountUserId,atKaiUPulse),position=state.positions.find(p=>p.marketItemId===action.marketItemId)??{marketItemId:action.marketItemId,shareQuantityMicro:'0',costBasisUsdCents:'0',costBasisPhiMicro:'0'};
 const localFlow=state.marketActivity?.find(row=>row.marketItemId===action.marketItemId)?.trades??[];
 const originalPosition=(custody.body.initialState as ReceizAccountFinancialState).positions.find(row=>row.marketItemId===action.marketItemId);
 const quote=custody.marketPricingAt(action.marketItemId,String(BigInt(position.shareQuantityMicro)-BigInt(originalPosition?.shareQuantityMicro??'0')),localFlow,atKaiUPulse);
 const bid=quote?String(quote.bidPriceUsdCents):term.bidPriceUsdCents,ask=quote?String(quote.askPriceUsdCents):term.askPriceUsdCents,reference=quote?String(quote.referenceMidUsdCents):term.referenceMidUsdCents;

 const budget=action.amountUsdCents===undefined?undefined:uint(action.amountUsdCents,true);
 const preview=action.kind==='buy'?marketShareBuyPreviewFromBudgetUsdCentsAtAsk(budget!,uint(ask,true),uint(reference,true))
  :budget!==undefined?marketShareSellPreviewFromBudgetUsdCentsAtBid(budget,uint(bid,true),uint(reference,true),uint(position.shareQuantityMicro))
  :null;
 const quantity=preview?.shareQuantityMicro??uint(action.shareQuantityMicro,true);
 // Market's existing writer uses original raw backing, whereas Wallet Send
 // uses its displayed settled cap. Keep these distinct without erasing either.
 const executionWallet={...value.wallet,settledUsdCents:String(min(uint(state.walletLedger.settledUsdCents),uint(value.wallet.availableUsdCents)))};
 const accounting=deriveMarketShareAccounting({side:action.kind,shareQuantityMicro:String(quantity),executionPriceUsdCents:action.kind==='buy'?ask:bid,usdPerPhiMicrocents:value.usdPerPhiMicrocents,feeBps:0,nativeValueEnabled:value.nativeValueEnabled,wallet:executionWallet,position,backedSellLiquidityUsdCents:capacity.backedSellLiquidityUsdCents});
 const cents=uint(accounting.settlementUsdCents,true),phi=uint(accounting.settlementPhiMicro,true),settled=uint(accounting.settledUsdCents),buy=action.kind==='buy';
 if(buy&&capacity.buyShareQuantityMicro!==undefined&&quantity>uint(capacity.buyShareQuantityMicro))fail('BUY_CAPACITY');
 if(buy&&quote&&(!quote.allowBuys||cents>quote.pressure.softCapUsdCents/3n||quote.pressure.openInterestUsdCents+cents>quote.pressure.hardCapUsdCents))fail('BUY_CAPACITY');
 if(buy&&(cents>uint(value.marketAvailableUsdCents)||cents>uint(term.maxSingleTradeUsdCents)||cents>uint(capacity.buyCapacityUsdCents)))fail('BUY_CAPACITY');
 const ledger:AccountExecutionWalletLedger={accountBalancePhiMicro:accounting.wallet.balancePhiMicro,totalCreditPhiMicro:bounded(uint(state.walletLedger.totalCreditPhiMicro)+(buy?0n:phi)),totalDebitPhiMicro:bounded(uint(state.walletLedger.totalDebitPhiMicro)+(buy?phi:0n)),totalCreditUsdCents:bounded(uint(state.walletLedger.totalCreditUsdCents)+(buy?0n:cents)),totalDebitUsdCents:bounded(uint(state.walletLedger.totalDebitUsdCents)+(buy?cents:0n)),settledUsdCents:bounded(uint(state.walletLedger.settledUsdCents)+(buy?-settled:settled))};
 const nextPosition={marketItemId:action.marketItemId,...accounting.position},positions=state.positions.filter(p=>p.marketItemId!==action.marketItemId).map(p=>({...p}));if(nextPosition.shareQuantityMicro!=='0')positions.push(nextPosition);positions.sort((a,b)=>a.marketItemId<b.marketItemId?-1:a.marketItemId>b.marketItemId?1:0);
 const nextCapacity={marketItemId:action.marketItemId,buyCapacityUsdCents:bounded(buy?uint(capacity.buyCapacityUsdCents)-cents:min(uint(term.buyCapacityUsdCents),uint(capacity.buyCapacityUsdCents)+cents)),backedSellLiquidityUsdCents:bounded(uint(capacity.backedSellLiquidityUsdCents)+(buy?settled:-settled)),...(capacity.buyShareQuantityMicro!==undefined?{buyShareQuantityMicro:bounded(buy?uint(capacity.buyShareQuantityMicro)-quantity:min(uint(term.buyShareQuantityMicro),uint(capacity.buyShareQuantityMicro)+quantity))}:{})};
 const next:ReceizAccountFinancialState={schema:state.schema,allocationId:state.allocationId,accountUserId:state.accountUserId,sequence:bounded(uint(state.sequence)+1n),lastKaiUPulse:atKaiUPulse,wallet:custody.valuation.at(ledger,source.accountUserId,atKaiUPulse).wallet,walletLedger:ledger,positions,marketCapacity:state.marketCapacity.map(c=>({...c,...(c.marketItemId===action.marketItemId?nextCapacity:{})})),
 ...(quote?{marketActivity:[...(state.marketActivity??[]).filter(row=>row.marketItemId!==action.marketItemId),{marketItemId:action.marketItemId,trades:[...localFlow,{side:action.kind,notionalUsdCents:accounting.notionalUsdCents,atKaiUPulse}]}].sort((a,b)=>a.marketItemId<b.marketItemId?-1:a.marketItemId>b.marketItemId?1:0)}:{})};
 return{effect:{kind:action.kind,marketItemId:action.marketItemId,shareQuantityMicro:String(quantity),executionPriceUsdCents:action.kind==='buy'?ask:bid,usdPerPhiMicrocents:value.usdPerPhiMicrocents,...(quote?{referenceMidUsdCents:reference,quoteMidUsdCents:String(quote.quoteMidUsdCents),bidPriceUsdCents:bid,askPriceUsdCents:ask,quoteModelVersion:quote.modelVersion}:{}),...accounting},next};
}

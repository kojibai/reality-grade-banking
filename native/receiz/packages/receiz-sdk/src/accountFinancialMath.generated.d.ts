/** Mechanical outputs only. Financial source admission is a separate boundary. */
export type AccountExecutionWalletAmounts = Readonly<{balancePhiMicro:string;availableUsdCents:string;settledUsdCents:string}>;
export type AccountExecutionWalletLedger = Readonly<{accountBalancePhiMicro:string;totalCreditPhiMicro:string;totalDebitPhiMicro:string;totalCreditUsdCents:string;totalDebitUsdCents:string;settledUsdCents:string}>;
export type AccountExecutionPositionAmounts = Readonly<{shareQuantityMicro:string;costBasisUsdCents:string;costBasisPhiMicro:string}>;
export type AccountExecutionShareAccountingInput = Readonly<{side:'buy'|'sell';shareQuantityMicro:string;executionPriceUsdCents:string;usdPerPhiMicrocents:string;feeBps:number;nativeValueEnabled:boolean;wallet:AccountExecutionWalletAmounts;position:AccountExecutionPositionAmounts;backedSellLiquidityUsdCents:string}>;
export type AccountExecutionShareAccountingResult = Readonly<{notionalUsdCents:string;notionalPhiMicro:string;feeUsdCents:string;settlementUsdCents:string;settlementPhiMicro:string;settledUsdCents:string;ecosystemUsdCents:string;realizedCostBasisUsdCents:string;realizedCostBasisPhiMicro:string;realizedGainUsdCents:string;wallet:AccountExecutionWalletAmounts;position:AccountExecutionPositionAmounts}>;
export type AccountExecutionSharePreview = Readonly<{shareQuantityMicro:bigint;referenceNotionalUsdCents:bigint;executionNotionalUsdCents:bigint;spreadCaptureUsdCents:bigint;settlementUsdCents:bigint;executionPriceUsdCents:bigint}>;
export declare function compileBankOfflineWalletValuation(input:unknown,openingKaiUPulse:string):Readonly<{at(ledger:unknown,accountUserId:string,kaiUPulse:string):Readonly<{wallet:AccountExecutionWalletAmounts;usdPerPhiMicrocents:string;nativeValueEnabled:boolean;marketAvailableUsdCents:string}>}>;
export declare function inspectBankOfflineWalletLedger(input:unknown):AccountExecutionWalletLedger;
export declare function deriveMarketShareAccounting(input:AccountExecutionShareAccountingInput):AccountExecutionShareAccountingResult;
export declare function marketNotionalPhiMicroFromUsdCents(cents:bigint,rate:bigint):bigint;
export declare function marketShareBuyPreviewFromBudgetUsdCentsAtAsk(budget:bigint,ask:bigint,reference?:bigint):AccountExecutionSharePreview;
export declare function marketShareSellPreviewFromBudgetUsdCentsAtBid(budget:bigint,bid:bigint,reference?:bigint,maxQuantity?:bigint|null):AccountExecutionSharePreview;

export type AccountExecutionMarketFlow=Readonly<{side:'buy'|'sell';notionalUsdCents:string;atKaiUPulse:string}>;
export type AccountExecutionMarketQuote=Readonly<{modelVersion:string;referenceMidUsdCents:bigint;quoteMidUsdCents:bigint;bidPriceUsdCents:bigint;askPriceUsdCents:bigint;spreadBps:number;shiftBps:number;allowBuys:boolean;pressure:Readonly<{targetBudgetUsdCents:bigint;softCapUsdCents:bigint;hardCapUsdCents:bigint;openInterestUsdCents:bigint}>}>;
export declare function compileBankOfflineMarketPricing(input:unknown,openingKaiUPulse:string):Readonly<{at(positionQuantityDelta:string,localFlow:readonly AccountExecutionMarketFlow[],atKaiUPulse:string):AccountExecutionMarketQuote}>;

/** Mechanical arithmetic beneath verified native wallet and funding sources.
 * These values are projections, never account admission or spend authority.
 * Reserve is an admitted fixed-dollar claim; Settlement is unencumbered Phi.
 * Quote changes cannot create another Reserve claim or another unit of Phi.
 */
export type BankNativeWalletAmounts=Readonly<{balancePhiMicro:string;reserveUsdCents:string;reserveBackingPhiMicro:string}>;
const max=(1n<<63n)-1n,D=1_000_000_000_000n;
const fail=(code:string):never=>{throw Error(`BANK_NATIVE_WALLET_${code}`);};
export function bankNativeWalletInteger(value:unknown,positive=false):bigint{
 if(typeof value!=="string"||!/^(0|[1-9][0-9]*)$/u.test(value))return fail("AMOUNT_INVALID");
 const n=BigInt(value);if(n>max||n<(positive?1n:0n))return fail("AMOUNT_INVALID");return n;
}
const ceil=(n:bigint,d:bigint)=>(n+d-1n)/d;
export function bankNativeWalletValue(value:BankNativeWalletAmounts,rateInput:string){
 const gross=bankNativeWalletInteger(value.balancePhiMicro),reserve=bankNativeWalletInteger(value.reserveUsdCents),rate=bankNativeWalletInteger(rateInput,true);
 // Original admitted backing remains encumbered across every display quote.
 const backing=bankNativeWalletInteger(value.reserveBackingPhiMicro);
 if(backing>gross||(reserve===0n)!==(backing===0n))return fail("SOURCE_MISMATCH");
 const settlement=gross-backing;
 const settlementCents=(settlement*rate+D/2n)/D;
 return Object.freeze({reserveUsdCents:reserve.toString(),reserveBackingPhiMicro:backing.toString(),
  settlementPhiMicro:settlement.toString(),settlementUsdCents:settlementCents.toString(),totalUsdCents:(reserve+settlementCents).toString()});
}
export function bankNativeWalletDebit(value:BankNativeWalletAmounts,rail:"reserve"|"settlement",centsInput:string,rateInput:string){
 const gross=bankNativeWalletInteger(value.balancePhiMicro),reserve=bankNativeWalletInteger(value.reserveUsdCents),cents=bankNativeWalletInteger(centsInput,true),rate=bankNativeWalletInteger(rateInput,true);
 const available=bankNativeWalletValue(value,rateInput);let phi:bigint;
 if(rail==="reserve"){
  if(cents>reserve)return fail("INSUFFICIENT_RESERVE");
  // Allocate a proportional part of the actual encumbered Phi. This preserves
  // both the fixed-denomination claim and total Phi even when the current
  // quote is below its original funded basis. No Phi is minted on repricing.
  phi=ceil(BigInt(available.reserveBackingPhiMicro)*cents,reserve);
  if(phi===0n||phi>gross||cents<reserve&&phi===BigInt(available.reserveBackingPhiMicro))return fail("DENOMINATION_PRECISION");
 }else if(rail==="settlement"){
  phi=(cents*D+rate/2n)/rate;
  if(phi===0n||(phi*rate+D/2n)/D!==cents)return fail("DENOMINATION_PRECISION");
  if(phi>BigInt(available.settlementPhiMicro))return fail("INSUFFICIENT_SETTLEMENT");
 }else return fail("RAIL_INVALID");
 const after=Object.freeze({balancePhiMicro:(gross-phi).toString(),reserveUsdCents:(reserve-(rail==="reserve"?cents:0n)).toString(),reserveBackingPhiMicro:(BigInt(available.reserveBackingPhiMicro)-(rail==="reserve"?phi:0n)).toString()});
 return Object.freeze({amountPhiMicro:phi.toString(),amountUsdCents:cents.toString(),after});
}
export function bankNativeWalletCredit(value:BankNativeWalletAmounts,rail:"reserve"|"settlement",phiInput:string,centsInput:string):BankNativeWalletAmounts{
 const phi=bankNativeWalletInteger(phiInput,true),gross=bankNativeWalletInteger(value.balancePhiMicro)+phi;
 const backing=bankNativeWalletInteger(value.reserveBackingPhiMicro)+(rail==="reserve"?phi:0n);
 const reserve=bankNativeWalletInteger(value.reserveUsdCents)+(rail==="reserve"?bankNativeWalletInteger(centsInput,true):0n);
 if(rail!=="reserve"&&rail!=="settlement")return fail("RAIL_INVALID");
 if(gross>max||reserve>max)return fail("AMOUNT_INVALID");
 return Object.freeze({balancePhiMicro:gross.toString(),reserveUsdCents:reserve.toString(),reserveBackingPhiMicro:backing.toString()});
}

/** The exact denomination carried by a native transfer, including fixed Reserve. */
export function bankNativeWalletTransferRate(amountPhiMicro:string,amountUsdCents:string):string{
 const phi=bankNativeWalletInteger(amountPhiMicro,true),cents=bankNativeWalletInteger(amountUsdCents,true);
 const rate=(cents*D+phi/2n)/phi;
 if(rate<1n||rate>max||(phi*rate+D/2n)/D!==cents)return fail("DENOMINATION_PRECISION");
 return rate.toString();
}

export type BankNativeWalletFundingParts = Readonly<{
 reserve: Readonly<{ amountUsdCents: string; amountPhiMicro: string }>;
 settlement: Readonly<{ amountUsdCents: string; amountPhiMicro: string }>;
}>;
const emptyFundingPart = Object.freeze({ amountUsdCents: "0", amountPhiMicro: "0" });

/** The ordinary Wallet sends one amount, spending fixed Reserve first and
 * taking any remainder from disjoint, unencumbered Settlement. */
export function bankNativeWalletDebitAvailable(value: BankNativeWalletAmounts, amountUsdCents: string, rate: string) {
 const cents = bankNativeWalletInteger(amountUsdCents, true);
 const availableReserve = bankNativeWalletInteger(value.reserveUsdCents);
 const reserveCents = availableReserve < cents ? availableReserve : cents;
 const settlementCents = cents - reserveCents;
 const reserveDebit = reserveCents ? bankNativeWalletDebit(value, "reserve", String(reserveCents), rate) : undefined;
 const intermediate = reserveDebit?.after ?? value;
 const settlementDebit = settlementCents ? bankNativeWalletDebit(intermediate, "settlement", String(settlementCents), rate) : undefined;
 const reserve = reserveDebit ? Object.freeze({ amountUsdCents: reserveDebit.amountUsdCents, amountPhiMicro: reserveDebit.amountPhiMicro }) : emptyFundingPart;
 const settlement = settlementDebit ? Object.freeze({ amountUsdCents: settlementDebit.amountUsdCents, amountPhiMicro: settlementDebit.amountPhiMicro }) : emptyFundingPart;
 const fundingParts: BankNativeWalletFundingParts = Object.freeze({ reserve, settlement });
 const rail = settlementDebit ? reserveDebit ? "composite" : "settlement" : "reserve";
 return Object.freeze({
  rail, amountUsdCents, amountPhiMicro: String(BigInt(reserve.amountPhiMicro) + BigInt(settlement.amountPhiMicro)),
  fundingParts, after: settlementDebit?.after ?? intermediate,
 });
}

export function bankNativeWalletCreditFundingParts(value: BankNativeWalletAmounts, funding: BankNativeWalletFundingParts) {
 const { reserve, settlement } = funding;
 const afterReserve = reserve.amountPhiMicro === "0" ? value
  : bankNativeWalletCredit(value, "reserve", reserve.amountPhiMicro, reserve.amountUsdCents);
 return settlement.amountPhiMicro === "0" ? afterReserve
  : bankNativeWalletCredit(afterReserve, "settlement", settlement.amountPhiMicro, settlement.amountUsdCents);
}

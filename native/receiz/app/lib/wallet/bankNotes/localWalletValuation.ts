/** Exact private display arithmetic beneath admitted account, complete funded
 * note sources and irreversible custody. This projection grants no funding,
 * ownership, spending authority or online credit. Fixed-dollar Reserve backing
 * is never inferred from a current quote. */
export const BANK_LOCAL_VALUE_SCHEMA="receiz.bank.local-rail-value.v1" as const;
const D=1000000000000n;
const fail=():never=>{throw Error("BANK_LOCAL_CREDIT_EXACT_RAIL_SOURCE_REQUIRED");};
const record=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=="object"||Array.isArray(v))return fail();return v as Record<string,unknown>;};
const uint=(v:unknown)=>{if(typeof v!=="string"||!/^(0|[1-9][0-9]{0,39})$/u.test(v))return fail();return BigInt(v);};
const dollars=(v:bigint)=>`${v/100n}.${String(v%100n).padStart(2,"0")}`;
const phi=(v:bigint)=>`${v/1000000n}${v%1000000n?"."+String(v%1000000n).padStart(6,"0").replace(/0+$/u,""):""}`;
const valued=(p:bigint,r:bigint)=>(p*r+D/2n)/D;
export function projectBankLocalWalletMovement(input:Readonly<Record<string,unknown>>,rail:"reserve"|"settlement",phiInput:string,centsInput:string,direction:"credit"|"debit"){
 const summary=record(structuredClone(input)),states=record(summary.valueStates),rate=uint(record(summary.quote).usdPerPhiMicrocents);
 const gross=uint(summary.balancePhiMicro),reserve=uint(states.settledBalanceUsdCents),settlement=uint(states.ecosystemBalanceUsdCents??"0"),amountPhi=uint(phiInput),amountCents=uint(centsInput);
 if(rate===0n||amountPhi===0n||amountCents===0n||!["reserve","settlement"].includes(rail)||!["credit","debit"].includes(direction))return fail();
 if(summary.bankNoteValuationVersion!==undefined&&summary.bankNoteValuationVersion!=="exact-rail-phi-v1")return fail();
 let backing:bigint|undefined,native:bigint|undefined;
 if(summary.bankNoteValueProjection!==undefined){
  const v=record(summary.bankNoteValueProjection);
  if(Object.keys(v).sort().join("|")!=="reserveBackingPhiMicro|schema|settlementPhiMicro"||v.schema!==BANK_LOCAL_VALUE_SCHEMA)return fail();
  backing=uint(v.reserveBackingPhiMicro);native=uint(v.settlementPhiMicro);
  if(reserve===0n){
   // An older client can preserve a newer projection while advancing the
   // signed account using v1 arithmetic. With no fixed-dollar claim the
   // actual gross Phi determines the unique native split; rederive it.
   backing=0n;native=gross;
  }else if(backing+native!==gross||backing===0n||valued(native,rate)!==settlement)return fail();
 }else if(reserve===0n){
  // With no fixed-dollar claim the entire actual Phi component is Settlement.
  // Ambiguous mixed legacy snapshots require their complete source split.
  backing=0n;native=gross;
 }else if(rail==="settlement")return fail();
 // A pure native legacy account may contain the sum of individually rounded
 // v1 credits. Revalue its exact aggregate just as a quote refresh does; that
 // display correction is not a new financial movement or a credit source.
 const before=reserve+(native!==undefined?valued(native,rate):settlement);
 const sign=direction==="credit"?1n:-1n,afterGross=gross+sign*amountPhi,afterReserve=reserve+(rail==="reserve"?sign*amountCents:0n);
 if(afterGross<0n||afterReserve<0n)return fail();
 let afterSettlement=settlement;
 if(backing!==undefined&&native!==undefined){
  backing+=rail==="reserve"?sign*amountPhi:0n;native+=rail==="settlement"?sign*amountPhi:0n;
  if(backing<0n||native<0n||backing+native!==afterGross||(afterReserve===0n)!==(backing===0n))return fail();
  afterSettlement=valued(native,rate);
  summary.bankNoteValueProjection={schema:BANK_LOCAL_VALUE_SCHEMA,reserveBackingPhiMicro:String(backing),settlementPhiMicro:String(native)};
 }
 const after=afterReserve+afterSettlement,displayDelta=direction==="credit"?after-before:before-after;
 if(displayDelta<0n)return fail();
 summary.balancePhiMicro=String(afterGross);summary.balancePhi=phi(afterGross);summary.balanceUsd=dollars(after);
 states.settledBalanceUsdCents=String(afterReserve);states.settledBalanceUsd=dollars(afterReserve);
 states.ecosystemBalanceUsdCents=String(afterSettlement);states.ecosystemBalanceUsd=dollars(afterSettlement);
 return{summary:{balancePhiMicro:summary.balancePhiMicro,balancePhi:summary.balancePhi,balanceUsd:summary.balanceUsd,valueStates:summary.valueStates,bankNoteValuationVersion:"exact-rail-phi-v1",...(summary.bankNoteValueProjection!==undefined?{bankNoteValueProjection:summary.bankNoteValueProjection}:{})},displayUsdCents:String(displayDelta)};
}

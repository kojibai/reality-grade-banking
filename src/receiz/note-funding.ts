import type {BankNoteRail,BankNoteReview,BankNoteFundingParts} from './offline-notes';
const D=1_000_000_000_000n,MAX=(1n<<63n)-1n;
function integer(v:unknown,positive=false){if(typeof v!=='string'||!/^(0|[1-9]\d{0,18})$/.test(v)||BigInt(v)>MAX||positive&&BigInt(v)===0n)throw Error('BANK_NOTE_QUOTE_INVALID');return BigInt(v);}
/** Presentation/planning beneath the exact native quote and signed issue. No
 * browser balance or cached label can authorize a debit. Reserve keeps its
 * admitted backing; Settlement contributes only the remaining denomination. */
export function selectNoteFunding(amount:string,value:unknown,requested?:BankNoteRail):BankNoteReview{
 const q=value as Record<string,unknown>,cents=integer(amount,true),reserve=integer(q?.reserveUsdCents),gross=integer(q?.balancePhiMicro),settlement=integer(q?.settlementPhiMicro),rate=integer(q?.usdPerPhiMicrocents,true);
 const backing=gross-settlement;
 if(cents>100000000n||backing<0n||(reserve===0n)!==(backing===0n))throw Error('BANK_NOTE_QUOTE_INVALID');
 const reserveCents=requested==='settlement'?0n:requested==='reserve'?cents:reserve<cents?reserve:cents;
 const settlementCents=cents-reserveCents;
 if(reserveCents>reserve)throw Error('BANK_NOTE_INSUFFICIENT_RESERVE');
 const reservePhi=reserveCents?(backing*reserveCents+reserve-1n)/reserve:0n;
 const settlementPhi=settlementCents?(settlementCents*D+rate/2n)/rate:0n;
 if(settlementPhi>settlement)throw Error('BANK_NOTE_INSUFFICIENT_FUNDS');
 if(reserveCents&&(reservePhi===0n||reserveCents<reserve&&reservePhi===backing)||settlementCents&&(settlementPhi===0n||(settlementPhi*rate+D/2n)/D!==settlementCents))throw Error('BANK_NOTE_DENOMINATION_PRECISION');
 const rail=reserveCents&&settlementCents?'composite':reserveCents?'reserve':'settlement';
 if(requested&&requested!==rail)throw Error('BANK_NOTE_EXACT_RESUME_REQUIRED');
 return{rail,amountUsdCents:amount,amountPhiMicro:(reservePhi+settlementPhi).toString(),...(rail==='composite'?{fundingParts:{reserve:{amountUsdCents:reserveCents.toString(),amountPhiMicro:reservePhi.toString()},settlement:{amountUsdCents:settlementCents.toString(),amountPhiMicro:settlementPhi.toString()}}}:{})};
}

export function sameNoteFundingParts(a?:BankNoteFundingParts,b?:BankNoteFundingParts):boolean {
 return a===undefined||b===undefined?a===b:['reserve','settlement'].every(rail=>{const key=rail as keyof BankNoteFundingParts;return a[key].amountUsdCents===b[key].amountUsdCents&&a[key].amountPhiMicro===b[key].amountPhiMicro;});
}

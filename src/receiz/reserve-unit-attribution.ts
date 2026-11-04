/** Optional read-only display beneath the existing complete FIFO funding
 * projection. Original credit units supply this allocation; neither a live USD
 * conversion nor this disclosure can establish native backing or spend rights. */
export type WalletReserveUnitAttribution = Readonly<{
 basis:'calculated-attribution';rule:'receiz-card-fifo-cent-intervals';
 accountId:string;lastEntryId:string;lastEntryAt:string;lastEntryKaiUpulse:string;
 recordedReserveUsdCents:string;reservePhiMicro:string;
 lots:readonly Readonly<{ledgerId:string;amountPhiMicro:string;amountUsdCents:string;reserveUsdCents:string;usedReserveUsdCents:string;creditReservePhiMicro:string;remainingReservePhiMicro:string}>[];
}>;
type Scope={userId:string;reserveUsdCents:string;lastEntryAt:string|null;lastEntryKaiUpulse:string|null};
const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,38})$/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function readWalletReserveUnitAttribution(input:unknown,scope:Scope):WalletReserveUnitAttribution|undefined{
 if(!record(input)||input.accountId!==scope.userId||!uuid(input.lastEntryId)||input.lastEntryAt!==scope.lastEntryAt
  ||input.lastEntryKaiUpulse!==scope.lastEntryKaiUpulse||!uint(input.lastEntryKaiUpulse)||typeof input.lastEntryAt!=='string'
  ||!Number.isFinite(Date.parse(input.lastEntryAt))||!uint(input.recordedReserveUsdCents)||input.recordedReserveUsdCents!==scope.reserveUsdCents
  ||!Array.isArray(input.lots)||input.lots.length>10000)return;
 let cents=0n,phi=0n;const ids=new Set<string>(),lots:WalletReserveUnitAttribution['lots'][number][]=[];
 for(const value of input.lots){
  if(!record(value)||!uuid(value.ledgerId)||ids.has(value.ledgerId)||!uint(value.amountPhiMicro)||!uint(value.amountUsdCents)
   ||!uint(value.reserveUsdCents)||!uint(value.usedReserveUsdCents))return;
  const gross=BigInt(value.amountPhiMicro),total=BigInt(value.amountUsdCents),reserve=BigInt(value.reserveUsdCents),used=BigInt(value.usedReserveUsdCents);
  if(total===0n||gross===0n||reserve===0n||reserve>total||used>=reserve)return;
  // Same integer split and cumulative interval rounding as Receiz's existing
  // advanceWalletFundingAttribution; no previous credits are replayed here.
  const creditPhi=gross*reserve/total,remainingPhi=creditPhi-creditPhi*used/reserve;
  if(value.creditReservePhiMicro!==undefined&&value.creditReservePhiMicro!==creditPhi.toString()
   ||value.remainingReservePhiMicro!==undefined&&value.remainingReservePhiMicro!==remainingPhi.toString())return;
  ids.add(value.ledgerId);cents+=reserve-used;phi+=remainingPhi;
  lots.push(Object.freeze({ledgerId:value.ledgerId,amountPhiMicro:value.amountPhiMicro,amountUsdCents:value.amountUsdCents,
   reserveUsdCents:value.reserveUsdCents,usedReserveUsdCents:value.usedReserveUsdCents,creditReservePhiMicro:creditPhi.toString(),remainingReservePhiMicro:remainingPhi.toString()}));
 }
 if(cents.toString()!==input.recordedReserveUsdCents||input.reservePhiMicro!==undefined&&input.reservePhiMicro!==phi.toString())return;
 return Object.freeze({basis:'calculated-attribution',rule:'receiz-card-fifo-cent-intervals',accountId:scope.userId,lastEntryId:input.lastEntryId,
  lastEntryAt:input.lastEntryAt,lastEntryKaiUpulse:input.lastEntryKaiUpulse,recordedReserveUsdCents:input.recordedReserveUsdCents,reservePhiMicro:phi.toString(),lots:Object.freeze(lots)});
}

import {publicMarketPulseSeed,type MarketPulseSeed} from './market-projection/source';
import {readBalanceOriginalProofReferences,readReserveFundingSource,type BalanceOriginalProofReference,type ReserveFundingSource} from './balance-source-references';
/** The already selected current aggregate operands. No transactions, historic
 * intervals, proof admission or financial execution authority are created. */
export type CurrentBalanceSource=Readonly<{
 userId:string;sourceSha256?:string;earningMembershipPolicy:'public-pbi-original-v1';creationSigilBenefitsEnabled:true;
 computedPulse:number;computedAt:string;glyphs:readonly Readonly<{id:string;livePulseSeed:MarketPulseSeed}>[];
 artifactBasePhiMicro:string;artifactBaseUsdCents:string;lawfulActionPhiMicro:string;
 accountBalancePhiMicro:string;transactionDeltaPhiMicro:string;transactionDeltaUsdCents:string;
 profileSeedPhiMicro:string;profileSeedUsdCents:string;ledgerSettledUsdCents:string;usdPerPhiMicrocents:string;
 balancePhiMicro:string;balanceUsdCents:string;reserveUsdCents:string;settlementUsdCents:string;
 reservePhiMicro:string|null;settlementPhiMicro:string|null;
 originalProofReferences?:Readonly<Record<string,BalanceOriginalProofReference>>;reserveFundingSource?:ReserveFundingSource;
}>;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,39})$/.test(v);
const signed=(v:unknown):v is string=>typeof v==='string'&&/^(0|-?[1-9]\d{0,39})$/.test(v);
function freeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export function readCurrentBalanceSource(input:unknown,userId:string):CurrentBalanceSource|undefined{
 if(!record(input)||input.userId!==userId||input.earningMembershipPolicy!=='public-pbi-original-v1'||input.creationSigilBenefitsEnabled!==true||!Number.isSafeInteger(input.computedPulse)||Number(input.computedPulse)<0||typeof input.computedAt!=='string'||!Number.isFinite(Date.parse(input.computedAt))||!Array.isArray(input.glyphs)||input.glyphs.length>10_000)return;
 const unsigned=['artifactBasePhiMicro','artifactBaseUsdCents','lawfulActionPhiMicro','accountBalancePhiMicro','profileSeedPhiMicro','profileSeedUsdCents','ledgerSettledUsdCents','usdPerPhiMicrocents','balancePhiMicro','balanceUsdCents','reserveUsdCents','settlementUsdCents'] as const;
 if(unsigned.some(key=>!uint(input[key]))||!signed(input.transactionDeltaPhiMicro)||!signed(input.transactionDeltaUsdCents)||input.usdPerPhiMicrocents==='0'||!(input.reservePhiMicro===null||uint(input.reservePhiMicro))||!(input.settlementPhiMicro===null||uint(input.settlementPhiMicro)))return;
 if(input.sourceSha256!==undefined&&(typeof input.sourceSha256!=='string'||!/^[a-f0-9]{64}$/.test(input.sourceSha256)))return;
 const glyphs:{id:string;livePulseSeed:MarketPulseSeed}[]=[],ids=new Set<string>();
 for(const row of input.glyphs){if(!record(row)||typeof row.id!=='string'||!row.id||row.id.length>512||ids.has(row.id)||!record(row.livePulseSeed))return;const seed=publicMarketPulseSeed(row.livePulseSeed,String(row.livePulseSeed.claimPulse));if(!seed)return;ids.add(row.id);glyphs.push({id:row.id,livePulseSeed:seed});}
 const originalProofReferences=readBalanceOriginalProofReferences(input.originalProofReferences),reserveFundingSource=readReserveFundingSource(input.reserveFundingSource,userId,input.reserveUsdCents as string);
 const scalar=Object.fromEntries(unsigned.map(key=>[key,input[key]])) as Pick<CurrentBalanceSource,typeof unsigned[number]>;
 return freeze({userId,...(input.sourceSha256?{sourceSha256:input.sourceSha256 as string}:{}),earningMembershipPolicy:'public-pbi-original-v1',creationSigilBenefitsEnabled:true,computedPulse:Number(input.computedPulse),computedAt:input.computedAt,glyphs,...scalar,transactionDeltaPhiMicro:input.transactionDeltaPhiMicro,transactionDeltaUsdCents:input.transactionDeltaUsdCents,reservePhiMicro:input.reservePhiMicro,settlementPhiMicro:input.settlementPhiMicro,...(originalProofReferences?{originalProofReferences}:{}),...(reserveFundingSource?{reserveFundingSource}:{})} as CurrentBalanceSource);
}
export const currentBalanceCaptureKai=(source:CurrentBalanceSource)=>(BigInt(source.computedPulse)*1_000_000n).toString();

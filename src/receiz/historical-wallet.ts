import {quoteReceizDisplayUsdV122} from '@receiz/sdk';
import {quotePhiForUsd,DEFAULT_ISSUANCE_POLICY} from './valuation/phi-issuance.v129';
import type {AccountProofTransaction} from './account-proof-statement';
import {sampleChartIndices} from '../core/chart-history';
import {walletPointTime,type WalletPoint} from './wallet-series';

const uint=(value:string)=>{if(!/^(0|[1-9]\d{0,29})$/.test(value))throw Error('ACCOUNT_HISTORY_COORDINATE_INVALID');return BigInt(value);};
/** Existing wallet rate: the v129 policy, empty cashflow metadata, $100 quote,
 * no streak/lifetime/hold. Explicit past Kai only; no clock or network read.
 * This is reproducible display math, never a recorded quote or credit source. */
export function historicalWalletUsdRate(kaiUPulse:string):string{
 const whole=uint(kaiUPulse)/1_000_000n;
 if(whole>BigInt(Number.MAX_SAFE_INTEGER))throw Error('ACCOUNT_HISTORY_COORDINATE_INVALID');
 const quote=quotePhiForUsd({meta:{ip:{expectedCashflowPhi:[]}},nowPulse:Number(whole),usd:100,currentStreakDays:0,lifetimeUsdSoFar:0,plannedHoldBeats:0},DEFAULT_ISSUANCE_POLICY);
 if(!Number.isFinite(quote.usdPerPhi)||quote.usdPerPhi<=0)throw Error('ACCOUNT_HISTORY_RATE_UNAVAILABLE');
 const fixed=quote.usdPerPhi.toFixed(8);
 if(!/^\d+\.\d{8}$/.test(fixed))throw Error('ACCOUNT_HISTORY_RATE_UNAVAILABLE');
 return BigInt(fixed.replace('.','')).toString();
}
type Holding={kai:bigint;reserve:bigint;phi:bigint};
export type WalletHistoryMovement=Pick<AccountProofTransaction,'kaiUPulse'|'reserveDeltaUsdCents'|'settlementDeltaPhiMicro'>;
const integer=(value:string)=>{if(!/^(0|-?[1-9]\d{0,39})$/.test(value))throw Error('ACCOUNT_HISTORY_MOVEMENT_INVALID');return BigInt(value);};
/** Projection input must come from a complete independently verified account
 * statement. This reducer is display-only and does not itself admit that input.
 * Keep actual movements separate from the bounded recomputed valuation grid. */
export function projectHistoricalWallet(input:{transactions:readonly WalletHistoryMovement[];userId:string;endKaiUPulse:string}):WalletPoint[]{
 const end=uint(input.endKaiUPulse);
 if(!input.userId||input.transactions.length>100_000)throw Error('ACCOUNT_HISTORY_SOURCE_REQUIRED');
 if(!input.transactions.length)return [];
 const records=input.transactions.map((row,index)=>({row,index,kai:uint(row.kaiUPulse)}));
 if(records.some(value=>value.kai>end))throw Error('ACCOUNT_HISTORY_COORDINATE_INVALID');
 records.sort((a,b)=>a.kai<b.kai?-1:a.kai>b.kai?1:a.index-b.index);
 const start=records[0].kai,states:Holding[]=[];
 let reserve=0n,phi=0n;
 for(const {row,kai}of records){
  const reserveDelta=integer(row.reserveDeltaUsdCents),phiDelta=integer(row.settlementDeltaPhiMicro);
  reserve+=reserveDelta;phi+=phiDelta;
  if(reserve<0n||phi<0n)throw Error('ACCOUNT_HISTORY_MOVEMENT_INVALID');
  if(states.length&&reserveDelta===0n&&phiDelta===0n)continue;
  const point={kai,reserve,phi};
  if(states.at(-1)?.kai===kai)states[states.length-1]=point;else states.push(point);
 }
 const selected=new Set<number>();
 for(const field of ['reserve','phi']as const)for(const index of sampleChartIndices(states.map(state=>Number(state[field])),768))selected.add(index);
 const coordinates=new Set<bigint>([start,end]);
 for(const index of selected){const kai=states[index].kai;coordinates.add(kai);if(kai>start)coordinates.add(kai-1n);}
 // Six fitted ranges, including All. The exact UTC bridge is display-only;
 // ceil the span so each selected calendar range has its full sample grid.
 const pulseMsNumerator=5236067977499789696409173668731276235440618359611525724270897245n;
 const pulseMsDenominator=10n**66n;
 for(const days of [null,1,7,31,93,366]){
  const span=days===null?end-start:(BigInt(days)*86_400_000n*pulseMsDenominator+pulseMsNumerator-1n)/pulseMsNumerator;
  const from=end-span>start?end-span:start;
  for(let i=0;i<=160;i++)coordinates.add(from+(end-from)*BigInt(i)/160n);
 }
 const ordered=[...coordinates].sort((a,b)=>a<b?-1:a>b?1:0),points:WalletPoint[]=[];
 let index=0;const rates=new Map<string,string>();
 for(const kai of ordered){
  while(index+1<states.length&&states[index+1].kai<=kai)index++;
  const state=states[index],key=(kai/1_000_000n).toString();
  let rate=rates.get(key);if(state.phi!==0n&&!rate){rate=historicalWalletUsdRate(kai.toString());rates.set(key,rate);}
  const settlement=state.phi===0n?'0':quoteReceizDisplayUsdV122(state.phi.toString(),rate!);
  points.push({userId:input.userId,at:walletPointTime(kai.toString()),kaiUPulse:kai.toString(),reserveUsdCents:state.reserve.toString(),settlementUsdCents:settlement,totalUsdCents:(state.reserve+BigInt(settlement)).toString(),valuation:'deterministic-v129'});
 }
 return points;
}

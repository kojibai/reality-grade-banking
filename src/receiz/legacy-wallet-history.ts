import {sampleChartIndices} from '../core/chart-history';
import {quoteReceizDisplayUsdV122,type ReceizIdentityAccountProjection} from '@receiz/sdk';
import {historicalWalletUsdRate} from './historical-wallet';
import {walletPointTime,appendWalletPoint,type WalletPoint} from './wallet-series';
import type {WalletObservation} from './wallet-observation';
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('LEGACY_HISTORY_SOURCE_REQUIRED');return v as Record<string,unknown>;};
const uint=(v:unknown)=>{if(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0)v=String(v);if(typeof v!=='string'||(!/^(0|[1-9]\d{0,29})$/.test(v)||/[^0-9]/.test(v)))throw Error('LEGACY_HISTORY_AMOUNT_INVALID');return BigInt(v);};
const stripes=new Set(['stripe_checkout_wallet_deposit','stripe_checkout_connect_payment','stripe_checkout_profile_original_download']);
const int64=(v:bigint)=>{if(v<-(1n<<63n)||v>(1n<<63n)-1n)throw Error('LEGACY_HISTORY_OVERFLOW');return v;};
const text=(v:unknown)=>{if(typeof v==='number'&&!Number.isSafeInteger(v))throw Error('LEGACY_HISTORY_PRECISION_UNAVAILABLE');return typeof v==='string'?v:typeof v==='number'||typeof v==='boolean'?String(v):null;};
/** Existing Receiz walletReserveProjection read law: explicit slices take
 * precedence, qualified credits add, every debit consumes/clamps. This is a
 * historical read projection, never native Reserve admission or funding. */
function reserveStep(balance:bigint,row:Record<string,unknown>){
 const metadata=row.metadata==null?{}:obj(row.metadata),amount=int64(uint(row.amount_usd_cents)),explicit=text(metadata.settledUsdCents);
 let slice=0n;if(explicit!==null&&explicit.length>0&&!/[^0-9]/.test(explicit)){const value=int64(BigInt(explicit));slice=value<amount?value:amount;}
 else if(row.direction==='debit'||row.entry_kind==='admin_adjustment'&&stripes.has(text(metadata.source)??'')||text(metadata.settledFundingSource)==='stripe_origin')slice=amount;
 const next=int64(row.direction==='credit'?balance+slice:balance-slice);return next<0n?0n:next;
}
function timeKey(value:unknown){if(typeof value!=='string')throw Error('LEGACY_HISTORY_ORDER_INVALID');const match=value.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?(?:Z|\+00:00)$/);if(!match||!Number.isFinite(Date.parse(value)))throw Error('LEGACY_HISTORY_ORDER_INVALID');return match[1]+'.'+(match[2]??'').padEnd(9,'0');}
/** The complete SDK-admitted private carrier can retain older wallet balances
 * without native rail tags. Use their recorded gross Phi, not current holdings
 * projected backwards. Only an exactly reconciled USD endpoint can enrich the
 * existing dollar chart. Failed checks leave the current wallet untouched. */
export function projectLegacyWalletObservation(projection:ReceizIdentityAccountProjection,observation:WalletObservation):WalletObservation|null{
 try{
  if(projection.authority!=='verified-identity-portable-state'||!projection.portableStateVerified||!projection.completeAtSealedHead)return null;
  const state=obj(projection.verifiedState),wallet=obj(state.wallet),owner=projection.owner.uid,end=uint(obj(state.accountStateHead).kaiUpulse),rows=wallet.ledgerEntries;
  if(!owner||obj(state.account).userId!==owner||observation.wallet.userId!==owner||!Array.isArray(rows)||!rows.length||rows.length>100000||Date.parse(walletPointTime(end.toString()))>Date.parse(observation.observedAt))return null;
  const ordered=rows.map(raw=>({row:obj(raw),time:timeKey(obj(raw).created_at),kai:uint(obj(raw).kai_upulse)})).sort((a,b)=>a.time.localeCompare(b.time)||String(a.row.id).localeCompare(String(b.row.id)));
  const ids=new Set<string>(),states:{kai:bigint;gross:bigint;reserve:bigint}[]=[];let gross=0n,reserve=0n,credit=0n,debit=0n;
  for(const {row,kai}of ordered){
   if(typeof row.id!=='string'||!row.id||ids.has(row.id)||row.user_id!==owner||!['credit','debit'].includes(String(row.direction))||kai>end||states.length&&kai<=states.at(-1)!.kai)return null;ids.add(row.id);
   const amount=uint(row.amount_phi_micro);if(row.direction==='credit'){gross+=amount;credit+=amount;}else{gross-=amount;debit+=amount;}
   if(gross<0n||uint(row.balance_after_phi_micro)!==gross)return null;reserve=reserveStep(reserve,row);states.push({kai,gross,reserve});
  }
  const rollup=obj(wallet.userRollup),account=obj(wallet.account);
  if(account.user_id!==owner||rollup.user_id!==owner||uint(account.balance_phi_micro)!==gross||uint(rollup.balance_phi_micro)!==gross||uint(rollup.total_credit_phi_micro)!==credit||uint(rollup.total_debit_phi_micro)!==debit||gross!==uint(observation.wallet.balancePhiMicro))return null;
  if(wallet.ledgerEntryCount!==undefined&&wallet.ledgerEntryCount!==rows.length)return null;
  if(rollup.last_entry_kai_upulse!==undefined&&uint(rollup.last_entry_kai_upulse)!==states.at(-1)!.kai)return null;
  const quote=wallet.routeSummary&&obj(wallet.routeSummary).quote,rate=quote?obj(quote).usdPerPhiMicrocents:undefined;
  if(rate===undefined||uint(rate)===0n)return null;
  const total=quoteReceizDisplayUsdV122(gross.toString(),uint(rate).toString()),displayReserve=reserve<BigInt(total)?reserve:BigInt(total);
  if(total!==observation.wallet.totalUsdCents||displayReserve.toString()!==observation.wallet.reserveUsdCents||(BigInt(total)-displayReserve).toString()!==observation.wallet.settlementUsdCents)return null;
  const start=states[0].kai,coordinates=new Set<bigint>([start,end]),selected=new Set<number>();for(const field of ['gross','reserve'] as const)for(const index of sampleChartIndices(states.map(state=>Number(state[field])),768))selected.add(index);for(const index of selected){const s=states[index];coordinates.add(s.kai);if(s.kai>start)coordinates.add(s.kai-1n);}
  const numerator=5236067977499789696409173668731276235440618359611525724270897245n,denominator=10n**66n;
  for(const days of [null,1,7,31,93,366]){const span=days===null?end-start:(BigInt(days)*86400000n*denominator+numerator-1n)/numerator,from=end-span>start?end-span:start;for(let i=0;i<=160;i++)coordinates.add(from+(end-from)*BigInt(i)/160n);}
  const history:WalletPoint[]=[],rates=new Map<string,string>();let index=0;
  for(const kai of [...coordinates].sort((a,b)=>a<b?-1:a>b?1:0)){
   while(index+1<states.length&&states[index+1].kai<=kai)index++;const current=states[index],key=(kai/1000000n).toString();let rate=rates.get(key);if(!rate){rate=historicalWalletUsdRate(kai.toString());rates.set(key,rate);}
   const all=BigInt(quoteReceizDisplayUsdV122(current.gross.toString(),rate)),reserved=current.reserve<all?current.reserve:all;
   history.push({userId:owner,at:walletPointTime(kai.toString()),kaiUPulse:kai.toString(),totalUsdCents:all.toString(),reserveUsdCents:reserved.toString(),settlementUsdCents:(all-reserved).toString(),valuation:'legacy-model-v129'});
  }
  return {...observation,history:appendWalletPoint(history,observation.wallet,walletPointTime(end.toString()),end.toString()),historyBasis:{schema:'bank.account-history-display.v1',kind:'legacy-wallet-observations',startKaiUPulse:start.toString(),endKaiUPulse:end.toString(),balancePhiMicro:gross.toString(),reserveUsdCents:displayReserve.toString()}};
 }catch{return null;}
}

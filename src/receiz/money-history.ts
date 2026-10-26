import {isVerifiedAccountProof,type AccountStatement,type VerifiedAccountProof} from './account-proof';
import {walletPointTime} from './wallet-series';

export type MoneyHistoryQuery={query?:string;from?:string;to?:string;direction?:'in'|'out'|'all';offset?:number;limit?:number};
/** Pure explanation projection. This function never admits its input as proof. */
export function projectMoneyHistory(statement:AccountStatement,input:MoneyHistoryQuery){
 const keys=['query','from','to','direction','offset','limit'];
 const invalid=():never=>{throw Error('MONEY_QUERY_INVALID');};
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!keys.includes(key)))invalid();
 const {query='',direction='all',offset=0,limit=10}=input;
 const date=(value:string|undefined)=>{if(value===undefined)return undefined;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value)))invalid();return Date.parse(value);};
 const from=date(input.from),to=date(input.to);
 if(typeof query!=='string'||query.length>160||!['in','out','all'].includes(direction)||!Number.isSafeInteger(offset)||offset<0||!Number.isSafeInteger(limit)||limit<1||limit>20||from!==undefined&&to!==undefined&&from>=to)invalid();
 const needle=query.trim().toLocaleLowerCase('en-US');
 const matched=statement.transactions.filter(row=>{
  const reserve=BigInt(row.reserveDeltaUsdCents),settlement=BigInt(row.settlementDeltaPhiMicro);
  if(direction==='in'&&reserve<=0n&&settlement<=0n||direction==='out'&&reserve>=0n&&settlement>=0n)return false;
  if(needle&&!`${row.transactionId} ${row.kind} ${row.description}`.toLocaleLowerCase('en-US').includes(needle))return false;
  if(from!==undefined||to!==undefined){const time=Date.parse(walletPointTime(row.kaiUPulse));if(from!==undefined&&time<from||to!==undefined&&time>=to)return false;}
  return true;
 }).sort((a,b)=>BigInt(a.kaiUPulse)===BigInt(b.kaiUPulse)?b.sequence-a.sequence:BigInt(a.kaiUPulse)>BigInt(b.kaiUPulse)?-1:1);
 let reserveIn=0n,reserveOut=0n,settlementIn=0n,settlementOut=0n;
 for(const row of matched){const r=BigInt(row.reserveDeltaUsdCents),s=BigInt(row.settlementDeltaPhiMicro);if(r>0n)reserveIn+=r;else reserveOut-=r;if(s>0n)settlementIn+=s;else settlementOut-=s;}
 return{authority:'derived-from-account-statement' as const,coverage:{accountHead:statement.checkpoint.accountHead,historyHead:statement.checkpoint.historyHead,throughKaiUPulse:statement.checkpoint.kaiUPulse,transactionCount:statement.transactions.length,descriptionSearchOnly:true},matchedCount:matched.length,totals:{reserveInUsdCents:String(reserveIn),reserveOutUsdCents:String(reserveOut),settlementInPhiMicro:String(settlementIn),settlementOutPhiMicro:String(settlementOut)},transactions:matched.slice(offset,offset+limit).map(row=>({...row,displayTime:walletPointTime(row.kaiUPulse)})),nextOffset:offset+limit<matched.length?offset+limit:null};
}
/** Only the existing canonical account-proof admission can supply this handle. */
export function searchMoneyHistory(proof:VerifiedAccountProof,owner:{keyId:string;artifactOwnerReceizId:string},query:MoneyHistoryQuery){
 if(!isVerifiedAccountProof(proof))throw Error('MONEY_VERIFIED_SOURCE_REQUIRED');
 if(proof.statement.account.keyId!==owner.keyId||proof.statement.account.receizId!==owner.artifactOwnerReceizId)throw Error('MONEY_SOURCE_OWNER_MISMATCH');
 return{...projectMoneyHistory(proof.statement,query),sourceDigest:proof.sourceDigest};
}

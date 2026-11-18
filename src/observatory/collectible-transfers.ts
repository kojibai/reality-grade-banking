import {ledgerValueForRecord} from '../receiz/ledger-value';
import type {PublicRecord} from '../receiz/public-network';
import {activityTime} from './activity';

type Transfer = {at:number; snapshots:Set<string>; modeled:Set<string>; payments:Set<string>; conflicting:boolean};
const cardActions=new Set(['receiz.sports_arena.card_transfer','signal_run.card.transfer']);
const single=(amounts:Set<string>)=>amounts.size===1?BigInt(amounts.values().next().value!):null;

export function collectibleActivity(records:readonly PublicRecord[]){
  const moves=new Map<string,Transfer>();
  for(const row of records){
    if(row.origin||row.authority!=='public-source-projection')continue;
    const isCardTransfer=row.source==='graph'&&row.kind==='card-transfer'
      ||row.source==='actions'&&cardActions.has(row.kind)
      ||row.source==='wallet'&&['sports_card_transfer','signal_card_transfer'].includes(row.kind);
    if(!isCardTransfer)continue;
    // One transfer can carry several copies. Both its transfer and copy must match.
    const reference=row.evidence.transferId;
    const copy=row.valueOperands?.claimHash??row.evidence.claimHash??row.details?.claimHash;
    const key=reference&&typeof copy==='string'&&copy?JSON.stringify([reference,copy]):row.id;
    let move=moves.get(key);
    if(!move){move={at:Infinity,snapshots:new Set(),modeled:new Set(),payments:new Set(),conflicting:false};moves.set(key,move);}
    const at=activityTime(row);
    if(Number.isFinite(at))move.at=Math.min(move.at,at);
    const value=ledgerValueForRecord(row,null);
    if(row.valueOperands?.cardValueState==='conflicting-recorded-snapshots')move.conflicting=true;
    if(value.amountUsdCents!==null){
      if(value.basis==='card-snapshot')move.snapshots.add(value.amountUsdCents);
      if(value.basis==='card-model')move.modeled.add(value.amountUsdCents);
    }
    if(value.considerationUsdCents!==null)move.payments.add(value.considerationUsdCents);
  }
  let volume=0n,priced=0,paid=0n,paymentCoverage=0;
  const timeline:{at:number;count:number;volume:bigint;paid:bigint;priced:number;paymentCoverage:number}[]=[];
  for(const [i,move] of [...moves.values()].sort((a,b)=>a.at-b.at).entries()){
    const amount=move.conflicting?null:single(move.snapshots.size?move.snapshots:move.modeled);
    if(amount!==null){priced++;volume+=amount;}
    const payment=single(move.payments);
    if(payment!==null){paymentCoverage++;paid+=payment;}
    if(!Number.isFinite(move.at))continue;
    const point={at:move.at,count:i+1,volume,paid,priced,paymentCoverage};
    if(timeline.at(-1)?.at===move.at)timeline[timeline.length-1]=point;
    else timeline.push(point);
  }
  return {total:moves.size,volume,priced,paid,paymentCoverage,timeline};
}

import {ledgerFundingTrace} from '../receiz/ledger-funding-trace';
import {ledgerPaymentRole} from '../receiz/ledger-payment-records';
import {publicLedgerAlias,type PublicRecord} from '../receiz/public-network';

export interface WalletPoint {at:number;addresses:number;transfers:number;volume:bigint;mints:number;claims:number}
export function walletActivity(records:readonly PublicRecord[]){
  const changes=new Map<number,WalletPoint>();
  function change(at:number){
    let point=changes.get(at);
    if(!point){point={at,addresses:0,transfers:0,volume:0n,mints:0,claims:0};changes.set(at,point);}
    return point;
  }
  const firstSeen=new Map<string,number>(),transfers:PublicRecord[]=[];
  let mints=0,claims=0,volume=0n,pricedTransfers=0;
  for(const row of records){
    if(row.origin||row.authority!=='public-source-projection'||row.source!=='wallet')continue;
    const at=Date.parse(row.time??'');
    for(const id of [publicLedgerAlias(row.actor),publicLedgerAlias(row.sender),publicLedgerAlias(row.recipient)]){
      if(id)firstSeen.set(id,Math.min(firstSeen.get(id)??Infinity,Number.isFinite(at)?at:Infinity));
    }
    const dated=Number.isFinite(at)?change(at):null;
    if(row.kind==='note_mint'){mints++;if(dated)dated.mints++;}
    if(row.kind==='note_claim'){claims++;if(dated)dated.claims++;}
    if(ledgerPaymentRole(row)==='movement'){
      transfers.push(row);if(dated)dated.transfers++;
      // The recorded face amount already covers both rails. If it is absent,
      // two carried rail amounts can still supply the complete transfer value.
      let cents=row.amountUsdCents===null?null:BigInt(row.amountUsdCents);
      const operands=row.valueOperands;
      if(cents===null&&operands?.settledUsdCents!==undefined&&operands.phiUsdCents!==undefined){
        const parts=ledgerFundingTrace(row).components;
        if(parts.length)cents=parts.reduce((sum,part)=>sum+BigInt(part.amountUsdCents),0n);
        else if(operands.settledUsdCents==='0'&&operands.phiUsdCents==='0')cents=0n;
      }
      if(cents!==null){volume+=cents;pricedTransfers++;if(dated)dated.volume+=cents;}
    }
  }
  for(const at of firstSeen.values())if(Number.isFinite(at))change(at).addresses++;
  const timeline=[...changes.values()].sort((a,b)=>a.at-b.at);
  for(let i=1;i<timeline.length;i++){
    const p=timeline[i],before=timeline[i-1];
    p.addresses+=before.addresses;p.transfers+=before.transfers;p.volume+=before.volume;p.mints+=before.mints;p.claims+=before.claims;
  }
  return {addresses:firstSeen.size,timeline,transfers,mints,claims,volume:pricedTransfers?volume.toString():null,pricedTransfers};
}

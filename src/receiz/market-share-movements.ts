/** Read-only account holding movements. These explain a certificate custody
 * move without relabelling it a purchase, sale or Settlement payment. */
export type MarketShareMovement={id:string;marketItemId:string;kind:'certificate-export'|'certificate-deposit'|'certificate-purchase';shareQuantityMicroDelta:string;at:string}&({kaiUPulse:string;kaiBasis?:'KKSv1.0'}|{kaiUPulse:null;kaiBasis:'legacy-chronos-projection'});
export function readMarketShareMovements(input:unknown):MarketShareMovement[]{
 if(input===undefined)return [];
 if(!Array.isArray(input)||input.length>100000)throw Error('MARKET_SHARE_MOVEMENTS_INVALID');
 const ids=new Set<string>();return input.map(value=>{
  const v=value as Partial<MarketShareMovement>;
  if(!v||typeof v!=='object'||typeof v.id!=='string'||!v.id||v.id.length>512||ids.has(v.id)||typeof v.marketItemId!=='string'||!v.marketItemId||v.marketItemId.length>512||!['certificate-export','certificate-deposit','certificate-purchase'].includes(v.kind??'')||typeof v.shareQuantityMicroDelta!=='string'||!/^(-?[1-9]\d{0,39})$/.test(v.shareQuantityMicroDelta)||(v.kind!=='certificate-deposit')!==(BigInt(v.shareQuantityMicroDelta)<0n)||typeof v.at!=='string'||!Number.isFinite(Date.parse(v.at)))throw Error('MARKET_SHARE_MOVEMENTS_INVALID');
  let timing:{kaiUPulse:string;kaiBasis?:'KKSv1.0'}|{kaiUPulse:null;kaiBasis:'legacy-chronos-projection'};
  if(v.kaiBasis==='legacy-chronos-projection'&&v.kaiUPulse===null)timing={kaiUPulse:null,kaiBasis:'legacy-chronos-projection'};
  else{if(v.kaiBasis!==undefined&&v.kaiBasis!=='KKSv1.0'||typeof v.kaiUPulse!=='string'||!/^\d{1,17}$/.test(v.kaiUPulse))throw Error('MARKET_SHARE_MOVEMENTS_INVALID');timing={kaiUPulse:v.kaiUPulse,...(v.kaiBasis==='KKSv1.0'?{kaiBasis:'KKSv1.0' as const}:{})};}
  ids.add(v.id);return{id:v.id,marketItemId:v.marketItemId,kind:v.kind!,shareQuantityMicroDelta:v.shareQuantityMicroDelta,...timing,at:v.at};
 });
}

/** Read-only attribution beneath complete, same-account wallet originals.
 * The cent intervals are the existing Receiz card FIFO overlap rule. Separate
 * rail queues preserve Wallet's recorded Reserve-first funding composition.
 * BigInt preserves the same integer result beyond JavaScript's safe range.
 * This projection creates neither a transfer allocation proof nor authority. */
export type WalletFundingSource={sourceId:string;amountUsdCents:string;offsetUsdCents:string;creditAmountUsdCents:string;occurredAt:string;allocationUnit?:'phi-micro';amountPhiMicro?:string;offsetPhiMicro?:string;creditPhiMicro?:string;creditReservePhiMicro?:string;kaiUpulse?:string;source?:string;entryKind?:string;contentHash?:string;claimPulse?:string;sigilPulse?:string;marketItemId?:string;assetId?:string;noteId?:string;transferId?:string};
export type WalletFundingAttribution={rule:'receiz-card-fifo-cent-intervals'|'receiz-card-fifo-source-units';basis:'calculated-attribution';walletDebitId:string;amountUsdCents:string;amountPhiMicro?:string;transferId?:string;noteId?:string;kaiUpulse?:string;occurredAt:string;parts:{rail:'reserve'|'settlement';amountUsdCents:string;sources:WalletFundingSource[]}[]};
export function walletAttributionFitsRecord(value:WalletFundingAttribution,record:{sourceId:string;amountUsdCents:string|null;time:string|null;kaiUpulse:string|null;pulse?:string|null;valueOperands?:{settledUsdCents?:string;phiUsdCents?:string}},exactTransferLink=false):boolean{
 if(value.amountUsdCents!==record.amountUsdCents||!record.time)return false;
 for(const [key,rail]of [['settledUsdCents','reserve'],['phiUsdCents','settlement']]as const){const amount=record.valueOperands?.[key];if(amount!==undefined&&amount!==(value.parts.find(part=>part.rail===rail)?.amountUsdCents??'0'))return false;}
 if(!exactTransferLink)return record.sourceId.replace(/^wallet_ledger:/,'')===value.walletDebitId&&record.time===value.occurredAt&&(!record.kaiUpulse||record.kaiUpulse===value.kaiUpulse);
 // Wallet posts the linked debit after the transfer, at its own coordinate.
 // Keep both originals' times; the exact FK, never proximity, joins them.
 const cutoff=record.kaiUpulse??(record.pulse?String(BigInt(record.pulse)*1000000n):undefined);
 const time=walletFundingTimeKey(record.time);if(time===undefined)return false;
 return value.parts.every(part=>part.sources.every(source=>{const sourceTime=walletFundingTimeKey(source.occurredAt);return sourceTime!==undefined&&sourceTime<=time&&(!source.kaiUpulse||!cutoff||BigInt(source.kaiUpulse)<=BigInt(cutoff));}));
}
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=512&&!/[\x00-\x1f\x7f]/.test(v);
const uint=(v:unknown):string|undefined=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?String(v):typeof v==='string'&&/^(0|[1-9]\d{0,38})$/.test(v)?v:undefined;
/** PostgreSQL originals retain microseconds. Compare the full RFC3339 instant,
 * including equivalent timezone offsets, without millisecond truncation. */
export function walletFundingTimeKey(value:unknown):bigint|undefined{
 if(typeof value!=='string'||value.length>64)return;
 const match=value.match(/^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?(Z|[+-]\d\d:\d\d)$/);if(!match)return;
 const whole=Date.parse(match[1]+match[3]);if(!Number.isFinite(whole))return;
 return BigInt(whole)*1000000n+BigInt((match[2]??'').padEnd(9,'0'));
}
const date=(v:unknown):v is string=>walletFundingTimeKey(v)!==undefined;
const reserveOrigins=new Set(['stripe_checkout_wallet_deposit','stripe_checkout_connect_payment','stripe_checkout_profile_original_download','wallet_deposit','stripe_origin']);
function sourceFields(raw:unknown):Omit<WalletFundingSource,'amountUsdCents'|'offsetUsdCents'|'creditAmountUsdCents'>|undefined{
 const v=object(raw);if(!text(v.sourceId)||!date(v.occurredAt))return;
 const out:ReturnType<typeof sourceFields>={sourceId:v.sourceId,occurredAt:v.occurredAt};
 for(const key of ['source','entryKind','marketItemId','assetId','noteId','transferId']as const)if(text(v[key]))out[key]=v[key];
 for(const key of ['kaiUpulse','claimPulse','sigilPulse']as const){const n=uint(v[key]);if(n!==undefined)out[key]=n;}
 if(typeof v.contentHash==='string'&&/^[a-f0-9]{64}$/i.test(v.contentHash))out.contentHash=v.contentHash;
 return out;
}
export function readWalletFundingSource(raw:unknown):WalletFundingSource|undefined{
 const v=object(raw),base=sourceFields(v),amount=uint(v.amountUsdCents),offset=uint(v.offsetUsdCents),credit=uint(v.creditAmountUsdCents);
 if(!base||amount===undefined||offset===undefined||credit===undefined)return;
 if(v.allocationUnit==='phi-micro'){
  const phi=uint(v.amountPhiMicro),start=uint(v.offsetPhiMicro),total=uint(v.creditPhiMicro),reserve=uint(v.creditReservePhiMicro)??'0';if(phi===undefined||start===undefined||total===undefined||v.creditReservePhiMicro!==undefined&&uint(v.creditReservePhiMicro)===undefined||BigInt(phi)===0n||BigInt(start)+BigInt(phi)+BigInt(reserve)>BigInt(total))return;
  return {...base,amountUsdCents:amount,offsetUsdCents:offset,creditAmountUsdCents:credit,allocationUnit:'phi-micro',amountPhiMicro:phi,offsetPhiMicro:start,creditPhiMicro:total,...(reserve!=='0'?{creditReservePhiMicro:reserve}:{})};
 }
 if(v.allocationUnit!==undefined||BigInt(amount)===0n||BigInt(offset)+BigInt(amount)>BigInt(credit))return;
 return {...base,amountUsdCents:amount,offsetUsdCents:offset,creditAmountUsdCents:credit,...(uint(v.creditPhiMicro)!==undefined?{creditPhiMicro:uint(v.creditPhiMicro)}:{})};
}
export function readWalletFundingLinks(raw:unknown):WalletFundingSource[]|undefined{
 if(!Array.isArray(raw)||!raw.length||raw.length>10000)return;
 const seen=new Set<string>(),out:WalletFundingSource[]=[];
 for(const value of raw){const source=readWalletFundingSource(value);if(!source||seen.has(source.sourceId))return;seen.add(source.sourceId);out.push(source);}return out;
}
export function readWalletFundingAttribution(raw:unknown):WalletFundingAttribution|undefined{
 const v=object(raw),amount=uint(v.amountUsdCents);
 if(!['receiz-card-fifo-cent-intervals','receiz-card-fifo-source-units'].includes(String(v.rule))||v.basis!=='calculated-attribution'||!text(v.walletDebitId)||amount===undefined||!date(v.occurredAt)||!Array.isArray(v.parts)||!v.parts.length||v.parts.length>2)return;
 const out:WalletFundingAttribution={rule:v.rule as WalletFundingAttribution['rule'],basis:v.basis,walletDebitId:v.walletDebitId,amountUsdCents:amount,occurredAt:v.occurredAt,parts:[]},rails=new Set<string>();let total=0n;
 if(v.kaiUpulse!==undefined){const n=uint(v.kaiUpulse);if(n===undefined)return;out.kaiUpulse=n;}
 if(v.amountPhiMicro!==undefined){const n=uint(v.amountPhiMicro);if(n===undefined)return;out.amountPhiMicro=n;}
 for(const key of ['transferId','noteId']as const)if(text(v[key]))out[key]=v[key];
 for(const raw of v.parts){const p=object(raw),n=uint(p.amountUsdCents);if(!['reserve','settlement'].includes(String(p.rail))||rails.has(String(p.rail))||n===undefined||BigInt(n)===0n||!Array.isArray(p.sources)||!p.sources.length||p.sources.length>10000)return;rails.add(String(p.rail));
  const sources:WalletFundingSource[]=[],ids=new Set<string>();let sum=0n;
  for(const raw of p.sources){const s=readWalletFundingSource(raw);if(!s||ids.has(s.sourceId)||walletFundingTimeKey(s.occurredAt)!>walletFundingTimeKey(v.occurredAt)!||s.kaiUpulse&&out.kaiUpulse&&BigInt(s.kaiUpulse)>BigInt(out.kaiUpulse)||s.allocationUnit==='phi-micro'&&p.rail!=='settlement')return;ids.add(s.sourceId);sum+=BigInt(s.amountUsdCents);sources.push(s);}
  if(sum!==BigInt(n))return;total+=sum;out.parts.push({rail:p.rail as 'reserve'|'settlement',amountUsdCents:n,sources});
 }
 if(total!==BigInt(amount))return;
 const settlement=out.parts.find(part=>part.rail==='settlement'),gross=BigInt(out.amountPhiMicro??'0');
 if(settlement&&gross>0n){
  if(out.rule!=='receiz-card-fifo-source-units')return;
  const reserve=BigInt(out.parts.find(part=>part.rail==='reserve')?.amountUsdCents??'0'),needed=gross-gross*reserve/total;let phi=0n,cents=0n;
  for(const source of settlement.sources){if(source.allocationUnit!=='phi-micro')return;phi+=BigInt(source.amountPhiMicro!);const next=phi*BigInt(settlement.amountUsdCents)/needed;if(next-cents!==BigInt(source.amountUsdCents))return;cents=next;}
  if(phi!==needed)return;
 }else if(out.rule==='receiz-card-fifo-source-units')return;
 return out;
}
type Lot={source:Omit<WalletFundingSource,'amountUsdCents'|'offsetUsdCents'>;used:bigint;amount:bigint};
/** Full source only. A page, current holdings or a public actor match cannot
 * stand in for prior debit offsets. Never fetches or evaluates a live clock. */
export function calculateWalletFundingAttributions(input:unknown,accountId:string,complete:boolean):Map<string,WalletFundingAttribution>{
 const result=new Map<string,WalletFundingAttribution>();if(!complete||!accountId||!Array.isArray(input)||input.length>100000)return result;
 try{
  const ids=new Set<string>(),rows=input.map(raw=>{const r=object(raw),time=walletFundingTimeKey(r.created_at);if(!text(r.id)||ids.has(r.id)||r.user_id!==accountId||!['credit','debit'].includes(String(r.direction))||time===undefined||uint(r.amount_usd_cents)===undefined)throw Error('WALLET_FIFO_SOURCE_INVALID');ids.add(r.id);return {row:r,time};}).sort((a,b)=>(a.time<b.time?-1:a.time>b.time?1:0)||String(a.row.id).localeCompare(String(b.row.id)));
  const queues:{reserve:Lot[];settlement:Lot[]}={reserve:[],settlement:[]},heads={reserve:0,settlement:0},deficits={reserve:0n,settlement:0n};let heldReserve=0n;
  const phiLots:Lot[]=[];let phiHead=0,phiDeficit=0n;
  for(const {row:r}of rows){const meta=object(r.metadata),amount=BigInt(uint(r.amount_usd_cents)!),explicit=uint(meta.settledUsdCents),isCredit=r.direction==='credit';
   const fallback=isCredit?reserveOrigins.has(String(meta.source))||meta.settledFundingSource==='stripe_origin'?amount:0n:heldReserve<amount?heldReserve:amount;
   const reserve=explicit===undefined?fallback:BigInt(explicit),settlement=amount-reserve;if(reserve>amount||!isCredit&&reserve>heldReserve)throw Error('WALLET_FIFO_RAILS_INVALID');
   heldReserve+=isCredit?reserve:-reserve;
   const grossPhi=BigInt(uint(r.amount_phi_micro)??'0');if(amount===0n&&grossPhi>0n)throw Error('WALLET_FIFO_RAILS_INVALID');
   const reservePhi=amount>0n?grossPhi*reserve/amount:0n,settlementPhi=grossPhi-reservePhi,phiSlices:{lot:Lot;amount:bigint;offset:bigint}[]=[];let phiRemaining=settlementPhi;
   const base=isCredit?sourceFields({...meta,sourceId:r.id,occurredAt:r.created_at,kaiUpulse:r.kai_upulse,entryKind:r.entry_kind,contentHash:meta.contentHash??meta.uploadHash,assetId:meta.assetId??meta.receizId,noteId:r.note_id,transferId:r.chat_transfer_id}):undefined;
   if(isCredit&&!base)throw Error('WALLET_FIFO_SOURCE_INVALID');
   if(isCredit&&settlementPhi>0n){const used=phiDeficit<settlementPhi?phiDeficit:settlementPhi;phiDeficit-=used;phiLots.push({source:{...base!,creditAmountUsdCents:settlement.toString(),creditPhiMicro:grossPhi.toString(),...(reservePhi>0n?{creditReservePhiMicro:reservePhi.toString()}:{})},used,amount:settlementPhi});}
   if(!isCredit){while(phiRemaining>0n&&phiHead<phiLots.length){const lot=phiLots[phiHead],available=lot.amount-lot.used,take=phiRemaining<available?phiRemaining:available;if(take>0n)phiSlices.push({lot,amount:take,offset:lot.used});lot.used+=take;phiRemaining-=take;if(lot.used===lot.amount)phiHead++;}phiDeficit+=phiRemaining;}
   const attribution:WalletFundingAttribution={rule:'receiz-card-fifo-cent-intervals',basis:'calculated-attribution',walletDebitId:String(r.id),amountUsdCents:amount.toString(),amountPhiMicro:grossPhi.toString(),occurredAt:String(r.created_at),parts:[]};const kai=uint(r.kai_upulse);if(kai!==undefined)attribution.kaiUpulse=kai;for(const [key,raw]of [['transferId',r.chat_transfer_id],['noteId',r.note_id]]as const)if(text(raw))attribution[key]=raw;
   let covered=true,reserveCovered=true;
   for(const [rail,need]of [['reserve',reserve],['settlement',settlement]]as const){if(need===0n)continue;const queue=queues[rail];
    if(isCredit){const used=deficits[rail]<need?deficits[rail]:need;deficits[rail]-=used;queue.push({source:{...base!,creditAmountUsdCents:need.toString(),creditPhiMicro:grossPhi.toString()},used,amount:need});continue;}
    let remaining=need;const sources:WalletFundingSource[]=[];
    while(remaining>0n&&heads[rail]<queue.length){const lot=queue[heads[rail]],available=lot.amount-lot.used,take=remaining<available?remaining:available;if(take>0n)sources.push({...lot.source,amountUsdCents:take.toString(),offsetUsdCents:lot.used.toString()});lot.used+=take;remaining-=take;if(lot.used===lot.amount)heads[rail]++;}
    if(remaining>0n){covered=false;if(rail==='reserve')reserveCovered=false;deficits[rail]+=remaining;}attribution.parts.push({rail,amountUsdCents:need.toString(),sources});
   }
   if(!isCredit&&settlementPhi>0n&&settlement>0n){
    // Each rail consumes only its own credits. Settlement uses its carried Phi
    // interval; cumulative integer remainders retain the exact recorded cents.
    let allocatedPhi=0n,allocatedCents=0n;const sources:WalletFundingSource[]=[];
    for(const slice of phiSlices){allocatedPhi+=slice.amount;const cents=allocatedPhi*settlement/settlementPhi;sources.push({...slice.lot.source,amountUsdCents:(cents-allocatedCents).toString(),offsetUsdCents:'0',allocationUnit:'phi-micro',amountPhiMicro:slice.amount.toString(),offsetPhiMicro:slice.offset.toString()});allocatedCents=cents;}
    covered=reserveCovered&&phiRemaining===0n&&allocatedPhi===settlementPhi&&allocatedCents===settlement;
    if(covered){attribution.rule='receiz-card-fifo-source-units';attribution.parts=attribution.parts.map(part=>part.rail==='settlement'?{...part,sources}:part);}
   }
   if(!isCredit&&covered&&amount>0n){const parsed=readWalletFundingAttribution(attribution);if(parsed)result.set(String(r.id),parsed);}
  }
  return result;
 }catch{return new Map();}
}

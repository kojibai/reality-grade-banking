import type { PublicSpotlightPlacement, PublicLedgerSnapshot } from './public-ledger-statement';

const empty:readonly PublicSpotlightPlacement[]=Object.freeze([]);
let placements=empty;
let accepted:{ledgerId:string;last:string;length:number;artifact:string}|undefined;
const listeners=new Set<()=>void>();
export function readPublicSpotlightPlacements(value:unknown):readonly PublicSpotlightPlacement[]|undefined{
  if(!Array.isArray(value)||value.length>16_384)return undefined;
  const seen=new Set<string>();
  const uint=(v:unknown):v is string=>typeof v==='string'&&/^\d{1,16}$/u.test(v)&&Number.isSafeInteger(Number(v));
  for(const row of value){
    if(!row||typeof row!=='object'||Object.keys(row).sort().join(',')!=='endKaiUPulse,id,originalSha256,startKaiUPulse,status,venueId'
      ||row.venueId!=='bankeiz-discover'||!['reserved','started'].includes(row.status)
      ||typeof row.id!=='string'||!/^[a-f0-9-]{36}$/u.test(row.id)||seen.has(row.id)
      ||typeof row.originalSha256!=='string'||!/^[a-f0-9]{64}$/u.test(row.originalSha256)
      ||!uint(row.startKaiUPulse)||!uint(row.endKaiUPulse)||Number(row.startKaiUPulse)>=Number(row.endKaiUPulse))return undefined;
    seen.add(row.id);
  }
  return value as readonly PublicSpotlightPlacement[];
}

export const heldSpotlightPlacements=()=>placements;
export const emptySpotlightPlacements=()=>empty;
export function subscribeSpotlightPlacements(listener:()=>void){
  listeners.add(listener);
  return ()=>{listeners.delete(listener);};
}

/** Called only while projecting a canonically verified, held Ledger Original. */
export function projectSpotlightPlacements(snapshot:PublicLedgerSnapshot,artifact:string,rows:readonly PublicSpotlightPlacement[]){
  const history=snapshot.sourceHistory;
  if(!history?.length||accepted?.artifact===artifact||accepted&&(
    snapshot.ledgerId!==accepted.ledgerId||history[accepted.length-1]!==accepted.last))return;
  const current=new Map<string,PublicSpotlightPlacement>();
  for(const placement of rows){
    if(placement.venueId!=='bankeiz-discover')continue;
    if(placement.status==='reserved'||placement.status==='started')current.set(placement.id,placement);
    else current.delete(placement.id);
  }
  accepted={ledgerId:snapshot.ledgerId,last:history.at(-1)!,length:history.length,artifact};
  const next=[...current.values()];
  if(next.length===placements.length&&next.every((item,index)=>Object.keys(item).every(key=>
    item[key as keyof PublicSpotlightPlacement]===placements[index][key as keyof PublicSpotlightPlacement])))return;
  placements=Object.freeze(next);
  for(const listener of listeners)listener();
}

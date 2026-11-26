import type { PublicSpotlightPlacement, PublicLedgerSnapshot } from './public-ledger-statement';

const empty:readonly PublicSpotlightPlacement[]=Object.freeze([]);
let placements=empty;
let accepted:{ledgerId:string;last:string;length:number;artifact:string}|undefined;
const listeners=new Set<()=>void>();
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

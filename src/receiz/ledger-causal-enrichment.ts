import type {PublicRecord} from './public-network';
import {readLedgerCausalLineage,type LedgerCausalLineage} from './ledger-funding-trace';

/** Existing native public response → carried display context. No source reads,
 * allocation inference, price calculation or modification of original events. */
export function enrichLedgerCausalHistory(records:readonly PublicRecord[],input:unknown):PublicRecord[]{
 const raw=input as {schema?:unknown;ok?:unknown;payload?:unknown;cards?:unknown[]}|null;
 const body=(raw?.schema==='receiz.sports_economy.first_paint.proof_object.v1'?raw.payload:raw) as {ok?:unknown;cards?:unknown[]}|null;
 if(!body||!Array.isArray(body.cards)||body.cards.length>10000||raw?.schema!=='receiz.sports_economy.first_paint.proof_object.v1'&&(raw?.schema!=='receiz.sports_economy.live_inventory.v1'||raw.ok!==true))throw Error('NATIVE_PUBLIC_CAUSAL_HISTORY_REQUIRED');
 const byClaim=new Map<string,LedgerCausalLineage|null>();
 for(const card of body.cards){const lineage=readLedgerCausalLineage(card);if(!lineage)continue;const key=`${lineage.collectibleId}:${lineage.claimHash}`;const before=byClaim.get(key);if(before===null)continue;if(before&&JSON.stringify(before)!==JSON.stringify(lineage)){byClaim.set(key,null);continue;}byClaim.set(key,lineage);}
 return records.map(record=>{
  if(!/card[._-]transfer|card[._-]sale|card[._-]trade/i.test(record.kind))return record;
  const operands=record.valueOperands,ids=[operands?.collectibleId,operands?.objectId,record.evidence.objectId].filter((id):id is string=>!!id&&id.startsWith('rsc_')),claims=[operands?.claimHash,record.evidence.claimHash].filter((id):id is string=>!!id);
  if(!ids.length||!claims.length||new Set(ids).size!==1||new Set(claims).size!==1)return record;
  const lineage=byClaim.get(`${ids[0]}:${claims[0]}`);if(!lineage)return record;
  const held=readLedgerCausalLineage(record.details?.causalLineage);
  // An older inventory capture must never replace a newer carried proof head.
  if(held&&held.proofHash!==lineage.proofHash)return record;
  // The same proof head may have an older label-only projection. Preserve
  // exact carried coordinates and source IDs already known for each step.
  const known=new Map(held?.steps.map(step=>[step.id,step]));
  const selected=held?{...lineage,steps:lineage.steps.map(step=>({...step,...known.get(step.id)}))}:lineage;
  return {...record,details:{...record.details,causalLineage:selected as unknown as NonNullable<PublicRecord['details']>}};
 });
}

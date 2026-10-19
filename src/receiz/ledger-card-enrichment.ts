import type {PublicRecord} from './public-network';
import {readLedgerValueOperands} from './ledger-value';
import {carriedLedgerCardCopyValuation,type LedgerCardCopyValuation} from './ledger-card-copy';

/** Build-time enrichment from the existing native public economy response.
 * The event, hash and recorded amounts stay exact. Only its public display
 * operands are appended; neither this response nor its prices admit custody. */
export function enrichLedgerCardValuations(records:readonly PublicRecord[],input:unknown):PublicRecord[]{
 const source=input as {ok?:unknown;schema?:unknown;fallback?:unknown;cards?:unknown[]}|null;
 if(source?.ok!==true||source.schema!=='receiz.sports_economy.live_inventory.v1'||source.fallback===true||!Array.isArray(source.cards)||source.cards.length>10000)throw Error('A complete native public card valuation capture is required.');
 const copies=new Map<string,LedgerCardCopyValuation|null>();
 for(const raw of source.cards){
  const card=raw as {sealedCopies?:unknown[]}|null;
  if(!Array.isArray(card?.sealedCopies))continue;
  for(const rawCopy of card.sealedCopies){const value=carriedLedgerCardCopyValuation(rawCopy);if(!value)continue;
   for(const key of [value.copy.collectibleId,value.copy.claimHash])copies.set(key,copies.has(key)?null:value);
  }
 }
 if(!copies.size)throw Error('The native capture carries no individual copy models.');
 return records.map(record=>{
  if(!/card[._-]transfer/i.test(record.kind))return record;
  const operands=readLedgerValueOperands(record.valueOperands),ids=[operands.collectibleId,operands.objectId,record.evidence.objectId].filter((id):id is string=>!!id&&id.startsWith('rsc_')),claims=[operands.claimHash,record.evidence.claimHash].filter((id):id is string=>!!id);
  const values=(claims.length?claims:ids).filter(id=>copies.has(id)).map(id=>copies.get(id)),unique=new Set(values.filter((value):value is LedgerCardCopyValuation=>!!value));
  if(values.some(value=>value===null)||unique.size!==1)return record;
  const value=[...unique][0];if(!ids.every(id=>id===value.copy.collectibleId)||!claims.every(hash=>hash===value.copy.claimHash))return record;
  return {...record,valueOperands:{...operands,cardValuation:value.copy}};
 });
}

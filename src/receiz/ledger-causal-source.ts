import type {LedgerFields} from './ledger-inspection';

export type LedgerCausalStep = {
 id:string;kind:string;label:string;detail:string;
 sourceId?:string;sourceHash?:string;contentHash?:string;source?:string;
 occurredAt?:string;kaiPulse?:string;claimPulse?:string;
 amountUsdCents?:string;amountPhiMicro?:string;collectibleId?:string;claimHash?:string;
 parentDigests?:string[];kaiUpulse?:string;headReference?:string;priorHeadReference?:string;
 timeLabel?:string;sourceLabel?:string;allocationRule?:string;previousCausalProofHash?:string;
};
export type LedgerCausalLineage = {sourceSchema:string;proofHash:string;collectibleId:string;claimHash:string;fundingSource:string;acquisitionKind:string;steps:LedgerCausalStep[];missingParentHashes?:string[]};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=512):string|undefined=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v)?v:undefined;
const uint=(v:unknown):string|undefined=>typeof v==='string'&&/^(0|[1-9]\d{0,29})$/.test(v)?v:typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?String(v):undefined;
const hash=(v:unknown):string|undefined=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v)?v:undefined;
const kinds=new Set(['post_work_proof','glyph_economy_value','market_growth_credit','reserve_funding','wallet_debit','free_claim','pack_purchase','card_sale','card_pack_allocation','transfer','trade','ownership_append','vault_custody']);
const parsed=new WeakMap<object,LedgerCausalLineage|undefined>();

/** The exact existing SportsArena causal wire, with public fields selected.
 * Refuse an unsupported/oversize chain as a whole; never truncate its steps. */
export function readLedgerCausalLineage(raw:unknown):LedgerCausalLineage|undefined {
 const row=object(raw);
 if(Array.isArray(row.causalOwnershipProofs))return readNativeCardCausalProofs(row);
 const lineage=object(row.causalLineage??raw);
 if(parsed.has(lineage)){const cached=parsed.get(lineage);return cached&&(row.collectibleId===undefined||row.collectibleId===cached.collectibleId)&&(row.claimHash===undefined||row.claimHash===cached.claimHash)?cached:undefined;}
 const finish=(value:LedgerCausalLineage|undefined)=>{parsed.set(lineage,value);if(value)parsed.set(value,value);return value;};
 const collectibleId=text(row.collectibleId??lineage.collectibleId),claimHash=hash(row.claimHash??lineage.claimHash);
 if(lineage.sourceSchema!=='receiz.sports_arena.card_causal_ownership_proof.v1'||!hash(lineage.proofHash)||!collectibleId||!claimHash||lineage.empty===true||!Array.isArray(lineage.steps)||!lineage.steps.length||lineage.steps.length>10000)return finish(undefined);
 const steps:LedgerCausalStep[]=[],ids=new Set<string>();
 for(const input of lineage.steps){
  const s=object(input),id=text(s.id),kind=text(s.kind),label=text(s.label,256),detail=text(s.detail,4096)??'';
  if(!id||ids.has(id)||!kind||!kinds.has(kind)||!label||s.collectibleId!==undefined&&s.collectibleId!==collectibleId||s.claimHash!==undefined&&s.claimHash!==claimHash)return finish(undefined);
  ids.add(id);const step:LedgerCausalStep={id,kind,label,detail};
  for(const key of ['sourceId','source','sourceLabel','timeLabel','allocationRule'] as const){const v=text(s[key]);if(v)step[key]=v;}
  for(const key of ['sourceHash','contentHash','previousCausalProofHash'] as const){const v=hash(s[key]);if(v)step[key]=v;}
  for(const key of ['kaiPulse','claimPulse','amountUsdCents','amountPhiMicro'] as const){if(s[key]!==undefined&&s[key]!==null&&uint(s[key])===undefined)return finish(undefined);const v=uint(s[key]);if(v!==undefined)step[key]=v;}
  if(s.occurredAt!==undefined&&s.occurredAt!==null){if(!text(s.occurredAt,64)||!Number.isFinite(Date.parse(String(s.occurredAt))))return finish(undefined);step.occurredAt=String(s.occurredAt);}
  step.collectibleId=collectibleId;step.claimHash=claimHash;steps.push(step);
 }
 return finish({sourceSchema:String(lineage.sourceSchema),proofHash:String(lineage.proofHash),collectibleId,claimHash,fundingSource:text(lineage.fundingSource,64)??'unknown',acquisitionKind:text(lineage.acquisitionKind,64)??'unknown',steps,...(Array.isArray(lineage.missingParentHashes)&&lineage.missingParentHashes.length<=10000&&lineage.missingParentHashes.every(hash)?{missingParentHashes:lineage.missingParentHashes as string[]}:{} )});
}
export function ledgerCausalLineageFields(raw:unknown):LedgerFields|undefined {
 const lineage=readLedgerCausalLineage(raw);return lineage?lineage as unknown as LedgerFields:undefined;
}
/** A newer/older panel projection of the same native proof head may be thin.
 * Preserve exact step operands without crossing a changed or conflicting head. */
export function mergeLedgerCausalProjection(before:unknown,after:unknown):LedgerCausalLineage|undefined{
 const prior=readLedgerCausalLineage(before),next=readLedgerCausalLineage(after);if(!prior||!next||prior.proofHash!==next.proofHash||prior.claimHash!==next.claimHash||prior.collectibleId!==next.collectibleId||prior.steps.length!==next.steps.length)return next;
 const keys=['sourceId','sourceHash','contentHash','kaiPulse','claimPulse','amountUsdCents','amountPhiMicro','occurredAt','previousCausalProofHash']as const;
 if(prior.steps.some((step,index)=>{const now=next.steps[index];return step.id!==now.id||step.kind!==now.kind||keys.some(key=>step[key]!==undefined&&now[key]!==undefined&&step[key]!==now[key]);}))return next;
 return {...next,steps:next.steps.map((step,index)=>({...prior.steps[index],...step}))};
}
/** The full native card asset carries the original causal proof appends, not
 * only its panel projection. Retain every step and declared predecessor. */
function readNativeCardCausalProofs(row:Record<string,unknown>):LedgerCausalLineage|undefined {
 if(parsed.has(row))return parsed.get(row);
 const proofs=row.causalOwnershipProofs as unknown[];if(!proofs.length||proofs.length>10000)return;
 const byHash=new Map<string,Record<string,unknown>>();let collectibleId:string|undefined,claimHash:string|undefined;
 for(const raw of proofs){const proof=object(raw),id=text(proof.collectibleId),claim=hash(proof.claimHash),head=hash(proof.hash);if(proof.schema!=='receiz.sports_arena.card_causal_ownership_proof.v1'||!id||!claim||!head||byHash.has(head)||collectibleId&&id!==collectibleId||claimHash&&claim!==claimHash||!Array.isArray(proof.steps))return;collectibleId=id;claimHash=claim;byHash.set(head,proof);}
 if(row.collectibleId!==undefined&&row.collectibleId!==collectibleId||row.claimHash!==undefined&&row.claimHash!==claimHash)return;
 const ordered:Record<string,unknown>[]=[],seen=new Set<string>(),missing=new Set<string>();let cursor=object(proofs.at(-1));
 while(cursor.hash){const head=String(cursor.hash);if(seen.has(head))return;seen.add(head);ordered.push(cursor);const before=object(cursor.anchors).previousCausalProofHash;if(before===null||before===undefined)break;if(!hash(before))return;const prior=byHash.get(String(before));if(!prior){missing.add(String(before));break;}cursor=prior;}
 // A linear custody append cannot inherit an unrelated proof merely because
 // both were placed in the same payload. Require the selected head's closure.
 if(seen.size!==proofs.length)return;
 ordered.reverse();const all=ordered,steps:Record<string,unknown>[]=[];
 for(const proof of all){const previous=object(proof.anchors).previousCausalProofHash;if(hash(previous)&&!byHash.has(String(previous)))missing.add(String(previous));for(const raw of proof.steps as unknown[]){const step=object(raw);if(!text(step.id))return;steps.push({...step,id:`${proof.hash}:${String(step.id)}`,collectibleId,claimHash,...(text(object(proof.cardAllocation).rule)?{allocationRule:object(proof.cardAllocation).rule}:{}),...(hash(previous)?{previousCausalProofHash:previous}:{})});if(steps.length>10000)return;}}
 const latest=object(proofs.at(-1)),value=readLedgerCausalLineage({collectibleId,claimHash,causalLineage:{sourceSchema:latest.schema,proofHash:latest.hash,fundingSource:latest.fundingSource,acquisitionKind:latest.acquisitionKind,steps,...(missing.size?{missingParentHashes:[...missing]}:{})}});parsed.set(row,value);return value;
}

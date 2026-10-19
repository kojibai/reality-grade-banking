import type {LedgerFields} from './ledger-inspection';
import type {PublicRecord} from './public-network';
import type {LedgerCausalStep} from './ledger-funding-trace';
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=512):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x1f\x7f]/.test(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,29})$/.test(v);
export type LedgerProofHistoryNode={nodeDigest:string;parentDigests:string[];artifactId:string;kaiPulse:string;kaiUpulse?:string;receiptDigest:string;eventType:string;fromOwnerReceizId?:string;toOwnerReceizId?:string;terminal?:string};
export type LedgerProofHistory={schema:'receiz.proof-history.v1';artifactId:string;rootDigest:string;historyDigest:string;headDigests:string[];nodes:LedgerProofHistoryNode[]};
const parsed=new WeakMap<object,LedgerProofHistory|undefined>();
/** Public history coordinates only. The selected original carries full receipts;
 * this projection never copies arbitrary namespace state or private witnesses. */
export function readLedgerProofHistory(input:unknown):LedgerProofHistory|undefined {
 const s=object(input);if(parsed.has(s))return parsed.get(s);
 const finish=(v:LedgerProofHistory|undefined)=>{parsed.set(s,v);if(v)parsed.set(v,v);return v;};
 if(s.schema!=='receiz.proof-history.v1'||!text(s.artifactId)||!hash(s.rootDigest)||!hash(s.historyDigest)||!Array.isArray(s.headDigests)||s.headDigests.length>10000||!s.headDigests.length||!s.headDigests.every(hash)||!Array.isArray(s.nodes)||!s.nodes.length||s.nodes.length>10000)return finish(undefined);
 let edges=0;
 const nodes:LedgerProofHistoryNode[]=[],byId=new Map<string,LedgerProofHistoryNode>();
 for(const raw of s.nodes){const n=object(raw),event=object(n.event),type=n.eventType??event.type;
  if(n.schema!==undefined&&n.schema!=='receiz.proof-history-node.v1'||!hash(n.nodeDigest)||byId.has(n.nodeDigest)||n.artifactId!==s.artifactId||!Array.isArray(n.parentDigests)||!n.parentDigests.every(hash)||new Set(n.parentDigests).size!==n.parentDigests.length||!uint(n.kaiPulse)||!hash(n.receiptDigest)||!['state.append','ownership.transition','lifecycle.terminal','profile-showcase.transition'].includes(String(type)))return finish(undefined);
  edges+=n.parentDigests.length;if(edges>100000)return finish(undefined);
  const exact=object(object(n.namespaceData)['receiz.kks-v1']),upulse=n.kaiUpulse??exact.kaiUpulse;
  if(upulse!==undefined&&(!uint(upulse)||BigInt(upulse)/1000000n!==BigInt(n.kaiPulse)))return finish(undefined);
  const node:LedgerProofHistoryNode={nodeDigest:n.nodeDigest,parentDigests:n.parentDigests as string[],artifactId:s.artifactId,kaiPulse:n.kaiPulse,receiptDigest:n.receiptDigest,eventType:String(type),...(upulse?{kaiUpulse:upulse as string}:{})};
  for(const key of ['fromOwnerReceizId','toOwnerReceizId','terminal']as const){const value=n[key]??event[key];if(text(value,128))node[key]=value;}
  nodes.push(node);byId.set(node.nodeDigest,node);
 }
 // Every parent and head must be carried. Topological order is derived from
 // recorded edges, never from list position, wall-clock labels or an actor.
 const children=new Map<string,string[]>(),degree=new Map<string,number>();
 for(const n of nodes){degree.set(n.nodeDigest,n.parentDigests.length);for(const p of n.parentDigests){const parent=byId.get(p);if(!parent||BigInt(parent.kaiPulse)>BigInt(n.kaiPulse))return finish(undefined);const rows=children.get(p)??[];rows.push(n.nodeDigest);children.set(p,rows);}}
 if(s.headDigests.some(id=>!byId.has(id))||nodes.filter(n=>!n.parentDigests.length).length!==1)return finish(undefined);
 const queue=nodes.filter(n=>!n.parentDigests.length),ordered:LedgerProofHistoryNode[]=[];
 for(let index=0;index<queue.length;index++){const n=queue[index];ordered.push(n);for(const id of children.get(n.nodeDigest)??[]){const d=degree.get(id)!-1;degree.set(id,d);if(d===0)queue.push(byId.get(id)!);}}
 if(ordered.length!==nodes.length)return finish(undefined);
 const covered=new Set<string>(),pending=[...s.headDigests] as string[];while(pending.length){const id=pending.pop()!;if(covered.has(id))continue;covered.add(id);pending.push(...byId.get(id)!.parentDigests);}
 if(covered.size!==nodes.length)return finish(undefined);
 return finish({schema:'receiz.proof-history.v1',artifactId:s.artifactId,rootDigest:s.rootDigest,historyDigest:s.historyDigest,headDigests:s.headDigests as string[],nodes:ordered});
}
export function ledgerProofHistoryFields(raw:unknown):LedgerFields|undefined {
 const row=object(raw),value=readLedgerProofHistory(row.proofHistory??object(row.receizProofHistory).history??object(row.proofBundle).proofHistory);return value?value as unknown as LedgerFields:undefined;
}
export function ledgerProofHistorySteps(record:PublicRecord):LedgerCausalStep[]|undefined {
 const history=readLedgerProofHistory(record.details?.proofHistory);if(!history)return;
 const ids=[record.valueOperands?.assetId,record.valueOperands?.objectId,record.evidence.objectId,record.source==='proofs'?record.sourceId:undefined].filter(Boolean);
 if(!ids.includes(history.artifactId)&&!(hash(record.evidence.artifactDigest)&&record.details?.proofHistoryArtifactDigest===record.evidence.artifactDigest))return;
 const event=/transfer|send|purchase|sale|trade|payment|redeem|claim/i.test(record.kind);
 const pulse=event?(record.pulse??(record.kaiUpulse?String(BigInt(record.kaiUpulse)/1000000n):null)):null;
 return history.nodes.filter(n=>event&&record.kaiUpulse&&n.kaiUpulse?BigInt(n.kaiUpulse)<=BigInt(record.kaiUpulse):pulse===null||BigInt(n.kaiPulse)<=BigInt(pulse)).map(n=>({id:n.nodeDigest,kind:n.parentDigests.length?n.eventType:'proof_genesis',label:n.parentDigests.length?n.eventType==='ownership.transition'?'Ownership transition':n.eventType==='lifecycle.terminal'?'Lifecycle settlement':'Recorded state transition':'Sealed proof origin',detail:n.toOwnerReceizId?`${n.fromOwnerReceizId??'Genesis'} → ${n.toOwnerReceizId}`:n.terminal?`Lifecycle: ${n.terminal}`:'Native state committed beneath the enclosing sealed proof.',sourceId:history.artifactId,sourceHash:n.receiptDigest,kaiPulse:n.kaiPulse,parentDigests:n.parentDigests,...(n.kaiUpulse?{kaiUpulse:n.kaiUpulse}:{})}));
}

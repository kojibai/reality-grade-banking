import type {PublicRecord} from './public-network';
import type {LedgerFields} from './ledger-inspection';
import type {LedgerFundingTrace,LedgerCausalStep} from './ledger-funding-trace';
import {readWalletFundingAttribution,type WalletFundingAttribution} from './ledger-wallet-fifo';
export type FundingRef={kind:'credit'|'debit'|'transfer'|'note'|'proof-basis'|'source-context';id:string};
export type FundingNode={ref:FundingRef;parents:FundingRef[];amountUsdCents?:string;amountPhiMicro?:string;kaiUpulse?:string;occurredAt?:string;source?:string;role?:string;objectIds?:string[];originalDigest?:string;attribution?:WalletFundingAttribution;proofBasis?:LedgerFields;parentRoles?:Record<string,string>};
export type LedgerFundingContext={schema:'receiz.wallet.funding-context.v1';root:FundingRef;nodes:Record<string,FundingNode>;coverage:{status:'complete'|'incomplete';missing:FundingRef[];continuations:FundingRef[]}};
const object=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9]\d{0,38})$/.test(v);
const key=(r:FundingRef)=>r.kind+':'+r.id;
function ref(raw:unknown):FundingRef|undefined{const v=object(raw);if(['credit','debit','transfer','note','proof-basis','source-context'].includes(String(v.kind))&&typeof v.id==='string'&&v.id.length>0&&v.id.length<=512&&/^[a-zA-Z0-9_.:-]+$/.test(v.id))return{kind:v.kind as FundingRef['kind'],id:v.id};}
const objectId=(v:unknown):v is string=>typeof v==='string'&&(/^(profile:[a-zA-Z0-9_.-]+:)?[a-fA-F0-9]{8}(?:-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$/.test(v)||/^[a-fA-F0-9]{64}$/.test(v));
const sources=new Set(['stripe_checkout_wallet_deposit','stripe_checkout_connect_payment','stripe_checkout_profile_original_download','wallet_deposit','stripe_origin','profile_rollup_seed','chat_transfer','note_claim','note_mint','market_buy','market_sell','asset_backing','asset_backing_redemption','market_trade','delegated_wallet_transfer','sigil_upload_claim']);
const reserveSources=new Set(['stripe_checkout_wallet_deposit','stripe_checkout_connect_payment','stripe_checkout_profile_original_download','wallet_deposit','stripe_origin']);
type Page={nodes:Record<string,FundingNode>;roots:Map<string,FundingRef>;coverage:Record<string,unknown>};
const pages=new WeakMap<object,Page>();
const closures=new WeakMap<object,Map<string,LedgerFundingContext>>();
function page(raw:unknown):Page|undefined{
 const v=object(raw);if(v.schema!=='receiz.wallet.funding-context.v1')return;const held=pages.get(v);if(held)return held;
 if(Object.keys(object(v.nodes)).length>10001)return;
 const nodes:Record<string,FundingNode>=Object.create(null);
 for(const [id,rawNode]of Object.entries(object(v.nodes))){
  const n=object(rawNode),own=ref(n.ref);if(!own||key(own)!==id||!Array.isArray(n.parents)||n.parents.length>10001)return;
  const parents=n.parents.map(ref);if(parents.some(v=>!v))return;
  const node:FundingNode={ref:own,parents:parents as FundingRef[]};
  for(const field of ['amountUsdCents','amountPhiMicro','kaiUpulse']as const)if(uint(n[field]))node[field]=n[field];
  if(typeof n.occurredAt==='string'&&n.occurredAt.length<65&&Number.isFinite(Date.parse(n.occurredAt)))node.occurredAt=n.occurredAt;
  if(typeof n.source==='string'&&sources.has(n.source))node.source=n.source;
  if(['source-frontier','native-proof-basis','recorded-source-basis','calculated-attribution','recorded-funding'].includes(String(n.role)))node.role=String(n.role);
  if(Array.isArray(n.objectIds)&&n.objectIds.every(objectId))node.objectIds=[...new Set(n.objectIds)] as string[];
  if(typeof n.originalDigest==='string'&&/^[a-f0-9]{64}$/.test(n.originalDigest))node.originalDigest=n.originalDigest;
  const basis=object(n.proofBasis);if(uint(basis.computedKaiPulse)&&typeof basis.projectedAt==='string'&&Number.isFinite(Date.parse(basis.projectedAt))&&typeof basis.membershipDigest==='string'&&/^[a-f0-9]{64}$/.test(basis.membershipDigest)&&typeof basis.projectorDigest==='string'&&/^[a-f0-9]{64}$/.test(basis.projectorDigest)){
   node.proofBasis={computedKaiPulse:basis.computedKaiPulse,projectedAt:basis.projectedAt,membershipDigest:basis.membershipDigest,projectorDigest:basis.projectorDigest};
   if(Array.isArray(basis.unresolvedContributions)&&basis.unresolvedContributions.length)node.proofBasis.unresolvedContributions=['lawful-action'];
  }
  const attribution=readWalletFundingAttribution(n.attribution);if(attribution)node.attribution=attribution;
  const relations:Record<string,string>={};for(const p of node.parents){const value=object(n.parentRoles)[key(p)];if(['source-context','funding-source','proof-membership'].includes(String(value)))relations[key(p)]=String(value);}if(Object.keys(relations).length)node.parentRoles=relations;
  nodes[id]=node;
 }
 const roots=new Map<string,FundingRef>();for(const r of Object.values(object(v.roots))){const value=ref(r);if(value)roots.set(key(value),value);}const single=ref(v.root);if(single)roots.set(key(single),single);
 const result={nodes,roots,coverage:object(v.coverage)};pages.set(v,result);return result;
}
/** Reads the existing SDK disclosure once. It grants no proof admission or
 * spending authority and never performs IO. Exact roots control every join. */
export function readLedgerFundingContext(raw:unknown,eventId?:string):LedgerFundingContext|undefined{
 const parsed=page(raw);if(!parsed)return;
 const root=eventId?parsed.roots.get(eventId)??parsed.roots.get('transfer:'+eventId)??parsed.roots.get('debit:'+eventId)??parsed.roots.get('credit:'+eventId)??parsed.roots.get('note:'+eventId):parsed.roots.size===1?[...parsed.roots.values()][0]:undefined;if(!root)return;
 const held=closures.get(raw as object)?.get(key(root));if(held)return held;
 const missing=new Map<string,FundingRef>(),continuations=new Map<string,FundingRef>(),active=new Set<string>(),done=new Set<string>();
 const stack:{ref:FundingRef;exit:boolean}[]=[{ref:root,exit:false}];
 while(stack.length){const current=stack.pop()!,id=key(current.ref);if(current.exit){active.delete(id);done.add(id);continue;}if(active.has(id)){missing.set(id,current.ref);continue;}if(done.has(id))continue;
  const node=parsed.nodes[id];if(!node){missing.set(id,current.ref);continue;}
  if(node.proofBasis?.unresolvedContributions)missing.set('unresolved:'+id,{kind:'proof-basis',id:'unresolved:'+id});
  if(!node.parents.length&&!node.objectIds?.length&&!node.originalDigest&&!node.proofBasis&&!reserveSources.has(node.source??''))missing.set(id,current.ref);
  active.add(id);stack.push({ref:current.ref,exit:true});for(const parent of node.parents)stack.push({ref:parent,exit:false});
 }
 const carried=object(parsed.coverage[key(root)]??parsed.coverage);for(const value of Array.isArray(carried.continuations)?carried.continuations:[]){const r=ref(value);if(r&&!parsed.nodes[key(r)]){continuations.set(key(r),r);missing.delete(key(r));}}
 const nodes:Record<string,FundingNode>=Object.create(null);for(const id of done)nodes[id]=parsed.nodes[id];
 const result:LedgerFundingContext={schema:'receiz.wallet.funding-context.v1',root,nodes,coverage:{status:missing.size||continuations.size?'incomplete':'complete',missing:[...missing.values()],continuations:[...continuations.values()]}};
 const retained=closures.get(raw as object)??new Map<string,LedgerFundingContext>();retained.set(key(root),result);closures.set(raw as object,retained);
 pages.set(result,{nodes,roots:new Map([[key(root),root]]),coverage:result.coverage});closures.set(result,new Map([[key(root),result]]));
 return result;
}
export function applyLedgerFundingContext(record:PublicRecord,raw:unknown):PublicRecord{
 const noteId=record.evidence.noteId??record.details?.noteId;
 const context=readLedgerFundingContext(raw,record.evidence.transferId??record.sourceId.replace(/^wallet_ledger:/,''))??(typeof noteId==='string'?readLedgerFundingContext(raw,noteId):undefined);if(!context)return record;
 const root=context.nodes[key(context.root)];if(!root||root.amountUsdCents!==record.amountUsdCents||record.valueOperands?.amountPhiMicro&&root.amountPhiMicro!==record.valueOperands.amountPhiMicro)return record;
 const attribution=root.attribution;
 return{...record,details:{...record.details,fundingContext:context as unknown as LedgerFields,...(attribution?{fundingAttribution:attribution as unknown as LedgerFields,...(record.evidence.transferId?{fundingTransferId:record.evidence.transferId}:{})}:{})}};
}
/** The graph describes recorded source basis and exact parent references.
 * Ancestor payment amounts are full originals, never this payment's slice. */
export function ledgerFundingContextTrace(record:PublicRecord):LedgerFundingTrace|undefined{
 const noteId=record.evidence.noteId??record.details?.noteId;
 const context=readLedgerFundingContext(record.details?.fundingContext,record.evidence.transferId??record.sourceId.replace(/^wallet_ledger:/,''))??(typeof noteId==='string'?readLedgerFundingContext(record.details?.fundingContext,noteId):undefined);if(!context)return;
 const root=context.nodes[key(context.root)];if(!root||root.amountUsdCents!==record.amountUsdCents)return;
 const order:FundingNode[]=[],seen=new Set<string>(),stack:{ref:FundingRef;exit:boolean}[]=[{ref:context.root,exit:false}];
 while(stack.length){const item=stack.pop()!,id=key(item.ref);if(item.exit){const node=context.nodes[id];if(node)order.push(node);continue;}if(seen.has(id))continue;seen.add(id);const node=context.nodes[id];if(!node)continue;stack.push({ref:item.ref,exit:true});for(const parent of node.parents)stack.push({ref:parent,exit:false});}
 const steps:LedgerCausalStep[]=[],origins:LedgerCausalStep[]=[];
 const representedDebits=new Set(order.filter(n=>n.ref.kind==='transfer').flatMap(n=>n.parents.map(key)));
 for(const node of order){
  for(const id of node.objectIds??[]){const step:LedgerCausalStep={id:key(node.ref)+':'+id,kind:'post_work_proof',label:'Source proof object',detail:'Original proof referenced by the recorded funding basis.',sourceId:id,...(/^[a-f0-9]{64}$/.test(id)?{contentHash:id}:{})};steps.push(step);origins.push(step);}
  if(node.ref.kind==='proof-basis'&&node.originalDigest){
   const step:LedgerCausalStep={id:key(node.ref),kind:'funding_original',label:'Funding original',detail:'Original proof preserved by the carried funding history.',sourceId:node.ref.id,sourceHash:node.originalDigest,...(node.amountUsdCents?{amountUsdCents:node.amountUsdCents}:{}),...(node.amountPhiMicro?{amountPhiMicro:node.amountPhiMicro}:{}),...(node.occurredAt?{occurredAt:node.occurredAt}:{}),...(node.kaiUpulse?{kaiUpulse:node.kaiUpulse,kaiPulse:String(BigInt(node.kaiUpulse)/1000000n)}:{})};
   steps.push(step);if(!node.parents.length)origins.push(step);
  }
  if(node.ref.kind==='source-context'||node.ref.kind==='proof-basis')continue;
  if(node.ref.kind==='debit'&&node.parents.length&&representedDebits.has(key(node.ref)))continue;
  const selected=key(node.ref)===key(context.root),payment=node.ref.kind==='transfer'||node.ref.kind==='note';
  const step:LedgerCausalStep={id:key(node.ref),kind:selected?'wallet_debit':node.ref.kind==='credit'?(node.source==='profile_rollup_seed'?'glyph_economy_value':'wallet_credit'):'transfer',label:selected?'This transaction':payment?'Parent payment':reserveSources.has(node.source??'')?'Funding deposit':'Incoming funding credit',detail:selected?'Recorded payment with its original source references.':payment?'Full amount of the original parent payment; separate from this transaction’s funding slice.':'Recorded source event preserved through the onward payment.',sourceId:node.ref.id,...(node.originalDigest?{sourceHash:node.originalDigest}:{}),...(node.amountUsdCents?{amountUsdCents:node.amountUsdCents}:{}),...(node.amountPhiMicro?{amountPhiMicro:node.amountPhiMicro}:{}),...(node.occurredAt?{occurredAt:node.occurredAt}:{}),...(node.kaiUpulse?{kaiUpulse:node.kaiUpulse,kaiPulse:String(BigInt(node.kaiUpulse)/1000000n)}:{})};steps.push(step);if(node.ref.kind==='credit'&&(reserveSources.has(node.source??'')||node.source==='profile_rollup_seed')||!selected&&node.originalDigest&&!node.parents.length)origins.push(step);
 }
 const components:LedgerFundingTrace['components']=[];for(const [field,rail]of [['settledUsdCents','reserve'],['phiUsdCents','settlement']]as const){const amount=record.valueOperands?.[field];if(amount&&BigInt(amount)>0n)components.push({rail,amountUsdCents:amount});}
 return{basis:'recorded-funding-context',boundary:context.coverage.status==='complete'?'source-origins':'origins-not-carried',valueOrigins:[],sources:origins,steps,components,context};
}

export function retainLedgerFundingContext(before:PublicRecord|undefined,after:PublicRecord):PublicRecord{
 if(!before||before.authority!==after.authority||before.source!==after.source||before.sourceId!==after.sourceId||before.kind!==after.kind||before.amountUsdCents!==after.amountUsdCents||before.time!==after.time||before.kaiUpulse!==after.kaiUpulse)return after;
 const known=readLedgerFundingContext(before.details?.fundingContext);if(!known)return after;
 const next=readLedgerFundingContext(after.details?.fundingContext);if(!next)return applyLedgerFundingContext(after,known);
 if(key(known.root)!==key(next.root))return after;
 const nodes={...known.nodes};for(const [id,node]of Object.entries(next.nodes)){if(nodes[id]&&JSON.stringify(nodes[id])!==JSON.stringify(node))throw Error('Public funding evidence conflicts with its retained original.');nodes[id]=node;}
 return applyLedgerFundingContext(after,{...next,nodes});
}
export function compactLedgerFundingContext(context:LedgerFundingContext,maxBytes=8000):LedgerFundingContext{
 const nodes:Record<string,FundingNode>={},queue=[context.root],seen=new Set<string>();let bytes=500;
 for(let i=0;i<queue.length;i++){const id=key(queue[i]);if(seen.has(id))continue;seen.add(id);const node=context.nodes[id];if(!node)continue;const size=new TextEncoder().encode(JSON.stringify({[id]:node})).length;if(bytes+size>maxBytes)continue;nodes[id]=node;bytes+=size;queue.push(...node.parents);}
 const compact=readLedgerFundingContext({...context,nodes})!;
 return{...compact,coverage:{...compact.coverage,continuations:compact.coverage.missing.filter(r=>!!context.nodes[key(r)]),missing:compact.coverage.missing.filter(r=>!context.nodes[key(r)])}};
}

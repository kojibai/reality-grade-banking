import {N_DAY_MICRO,DAYS_PER_MONTH,MONTHS_PER_YEAR,momentFromPulse} from '../../native/receiz/app/utils/kai_pulse';
import {KAI_DAYS} from '../components/kai-klok';
/** A display index of already-carried sources. Spatial proximity is visual;
 * edges mean index membership or recorded turns in the same conversation. */
export type MindNode={id:string;kind:'identity'|'source'|'user'|'assistant';label:string;body:string;at:number|null;pulse?:string;record:Record<string,unknown>};
export type MindEdge={from:string;to:string;kind:'membership'|'conversation'};
export type TwinMindGraph={nodes:MindNode[];edges:MindEdge[];sources:MindNode[];memory:MindNode[]};
export type MindPoint={node:MindNode;x:number;y:number;color?:string};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const rows=(value:unknown)=>Array.isArray(value)?value.map(record):[];
const text=(value:unknown)=>typeof value==='string'?value:'';
const kai=(v:unknown)=>typeof v==='string'&&/^(0|[1-9][0-9]{0,29})$/.test(v)?v:undefined;
const date=(value:unknown)=>{const n=Date.parse(text(value));return Number.isFinite(n)?n:null;};
export function buildTwinMindGraph(bundle:Record<string,unknown>):TwinMindGraph{
 const owner=record(bundle.owner),root:MindNode={id:'identity',kind:'identity',label:text(owner.displayName)||text(owner.username)||'Your Twin',body:'Your saved sources and conversations.',at:null,...(kai(record(bundle.proofBrain).showcaseHeadKai)?{pulse:kai(record(bundle.proofBrain).showcaseHeadKai)}:{}),record:owner};
 const sources=rows(record(bundle.showcase).items).map((row,index):MindNode=>({id:'source:'+(text(row.id)||index),kind:'source',label:text(row.title)||'Proof object',body:text(row.summary),at:date(row.createdAt),...(kai(row.kaiPulse)?{pulse:kai(row.kaiPulse)}:{}),record:row}));
 const memory=rows(record(bundle.memory).entries).map((row,index):MindNode=>({id:'memory:'+index,kind:row.role==='assistant'?'assistant':'user',label:row.role==='assistant'?'Your Twin':'Message',body:text(row.body),at:date(row.createdAt),record:row}));
 const edges:MindEdge[]=sources.map(node=>({from:root.id,to:node.id,kind:'membership'})),lastTurn=new Map<string,string>();
 for(const node of memory){const row=node.record;
  // An absent relationship key cannot establish that two turns belong together.
  const scoped=typeof row.scope==='string'&&['visitorKey','ventureId'].some(key=>typeof row[key]==='string'&&row[key]);
  const key=scoped?JSON.stringify([row.scope,row.channel??null,row.visitorKey??null,row.ventureId??null,row.districtSlug??null]):null;
  const previous=key?lastTurn.get(key):undefined;edges.push({from:previous??root.id,to:node.id,kind:previous?'conversation':'membership'});if(key)lastTurn.set(key,node.id);
 }
 return{nodes:[root,...sources,...memory],edges,sources,memory};
}
/** Preserve the complete index for inspection; bound only painted points. */
export function visibleMindNodes(graph:TwinMindGraph,selected?:string,limit=240){
 if(graph.nodes.length<=limit)return graph.nodes;
 const visible=[graph.nodes[0]],others=graph.nodes.slice(1),stride=others.length/(limit-1);
 for(let i=0;i<limit-1;i++)visible.push(others[Math.floor(i*stride)]);
 const node=selected?graph.nodes.find(n=>n.id===selected):undefined;if(node&&!visible.includes(node))visible[visible.length-1]=node;return visible;
}
export function layoutTwinMind(graph:TwinMindGraph,mode:'graph'|'continuity',selected?:string):MindPoint[]{
 const visible=visibleMindNodes(graph,selected),counts={source:0,user:0,assistant:0,identity:0};
 return visible.map(node=>{
  const i=counts[node.kind]++;
  if(mode==='continuity'){
   if(!node.pulse)return{node,x:.08+(i%14)*.064,y:.9};
   const p=BigInt(node.pulse),micro=p*1000000n,day=micro/N_DAY_MICRO;
   const dayPhase=Number(micro%N_DAY_MICRO)/Number(N_DAY_MICRO),dayOfMonth=Number(day%BigInt(DAYS_PER_MONTH)),monthIndex=Number(day/BigInt(DAYS_PER_MONTH)%BigInt(MONTHS_PER_YEAR));
   const monthPhase=(dayOfMonth+dayPhase)/DAYS_PER_MONTH,yearPhase=(monthIndex+monthPhase)/MONTHS_PER_YEAR,angle=dayPhase*Math.PI*2,rad=.3+.65*monthPhase;
   const x=Math.cos(angle)*rad,y=-.85+yearPhase*1.7+(node.kind==='source'?0:node.kind==='user'?.12:.24),z=Math.sin(angle)*rad;
   const rotY=-.28,rotX=-.18,px=x*Math.cos(rotY)+z*Math.sin(rotY),pz=z*Math.cos(rotY)-x*Math.sin(rotY),py=y*Math.cos(rotX)-pz*Math.sin(rotX);
   const color=KAI_DAYS.find(d=>d.name===momentFromPulse(p).weekday)?.color;
   return{node,x:.5+px*.4,y:.45+py*.25,color};
  }
  if(node.kind==='identity')return{node,x:.5,y:.49};
  // The native Receiz Network uses stable ID-hashed spherical coordinates.
  // Project the same geometry into this compact canvas, without an idle orbit.
  let a=2166136261,b=2246822519;
  for(const ch of node.id){a=Math.imul(a^ch.charCodeAt(0),16777619);b=Math.imul(b^ch.charCodeAt(0),3266489917);}
  const y=1-2*((a>>>0)+.5)/4294967296,phi=((b>>>0)+.5)/4294967296*Math.PI*2,r=Math.sqrt(1-y*y);
  const rawX=Math.cos(phi)*r,rawZ=Math.sin(phi)*r,rotY=-.28,rotX=.22;
  const x=rawX*Math.cos(rotY)+rawZ*Math.sin(rotY),z0=rawZ*Math.cos(rotY)-rawX*Math.sin(rotY),py=y*Math.cos(rotX)-z0*Math.sin(rotX),z=y*Math.sin(rotX)+z0*Math.cos(rotX),perspective=1+z*.11;
  return{node,x:.5+x*.43*perspective,y:.49+py*.31*perspective};
 });
}

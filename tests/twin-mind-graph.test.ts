import {expect,it} from 'vitest';
import {buildTwinMindGraph,layoutTwinMind,visibleMindNodes} from '../src/receiz/twin-mind-graph';
const bundle={owner:{userId:'one',displayName:'Maya'},showcase:{items:[{id:'source-a',title:'My original',createdAt:'2026-10-20T10:00:00Z'}]},memory:{entries:[
 {role:'user',body:'Question',scope:'relationship',channel:'web',visitorKey:'first',createdAt:'2026-10-21T10:00:00Z'},
 {role:'assistant',body:'Answer',scope:'relationship',channel:'web',visitorKey:'first',createdAt:'2026-10-21T10:01:00Z'},
 {role:'assistant',body:'Other conversation',scope:'relationship',channel:'web',visitorKey:'second',createdAt:'2026-10-21T10:02:00Z'},
 {role:'assistant',body:'Unscoped turn',createdAt:'invalid'}]},proofBrain:{showcaseHeadKai:'14800000'}};
it('uses only the carried source membership and exact conversation groups, never inventing causal or Kai edges',()=>{
 const graph=buildTwinMindGraph(bundle);expect(graph.nodes).toHaveLength(6);expect(graph.sources).toHaveLength(1);expect(graph.memory).toHaveLength(4);
 const question=graph.memory.find(n=>n.body==='Question')!,answer=graph.memory.find(n=>n.body==='Answer')!,other=graph.memory.find(n=>n.body==='Other conversation')!;
 expect(graph.edges).toContainEqual({from:question.id,to:answer.id,kind:'conversation'});
 expect(graph.edges.some(e=>e.from===answer.id&&e.to===other.id)).toBe(false);
 expect(graph.memory.every(n=>!('pulse' in n))).toBe(true);expect(graph.memory.at(-1)?.at).toBeNull();
 expect(graph.edges.every(e=>['membership','conversation'].includes(e.kind))).toBe(true);
});
it('keeps repeated turns and full source data while bounding only the drawing, including a selected hidden record',()=>{
 const value={...bundle,memory:{entries:Array.from({length:1000},()=>bundle.memory.entries[0])}},graph=buildTwinMindGraph(value);
 expect(graph.memory).toHaveLength(1000);expect(new Set(graph.nodes.map(n=>n.id)).size).toBe(graph.nodes.length);
 const selected=graph.memory.at(-1)!.id,visible=visibleMindNodes(graph,selected);expect(visible).toHaveLength(240);expect(visible.some(n=>n.id===selected)).toBe(true);expect(graph.memory.at(-1)?.body).toBe('Question');
});
it('lays out deterministically without physics and keeps records without original Kai outside the Continuity orb',()=>{
 const graph=buildTwinMindGraph(bundle),first=layoutTwinMind(graph,'graph');expect(layoutTwinMind(graph,'graph')).toEqual(first);
 expect(first.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.x>=0&&n.x<=1&&n.y>=0&&n.y<=1)).toBe(true);
 expect(layoutTwinMind(graph,'continuity').find(n=>n.node.body==='Unscoped turn')?.y).toBe(.9);
});

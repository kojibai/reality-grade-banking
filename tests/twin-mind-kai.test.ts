import {expect,it} from 'vitest';
import {buildTwinMindGraph,layoutTwinMind} from '../src/receiz/twin-mind-graph';
it('places Continuity from the original carried Kai, never from display dates or a new clock',()=>{
 const item={id:'one',title:'Source',kaiPulse:'14812345',createdAt:'2026-01-01T00:00:00Z'},make=(createdAt:string)=>buildTwinMindGraph({owner:{},showcase:{items:[{...item,createdAt}]},memory:{entries:[{role:'user',body:'No sealed coordinate',createdAt}]}});
 const a=make(item.createdAt),b=make('2031-01-01T00:00:00Z'),point=(graph:ReturnType<typeof make>)=>layoutTwinMind(graph,'continuity').find(p=>p.node.id==='source:one')!;
 expect(point(a)).toMatchObject({node:{pulse:'14812345'}});expect(point(a).x).toBe(point(b).x);expect(point(a).y).toBe(point(b).y);expect(point(a).color).toBeTruthy();expect(a.memory[0].pulse).toBeUndefined();expect(layoutTwinMind(a,'continuity').find(p=>p.node.body==='No sealed coordinate')?.y).toBe(.9);
});

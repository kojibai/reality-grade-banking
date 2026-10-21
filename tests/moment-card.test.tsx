// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {MomentCard} from '../src/features/media/MomentCard';
import {parsePublicMarket} from '../src/receiz/public-market';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('shows the whole carried moment and live-player front fields without extra reads or invented verification',async()=>{
 const caption='This is the first sentence. '+ 'Every part of the complete caption stays visible. '.repeat(20),item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:writer:moment',receizId:'moment',title:caption,summary:caption,ownerUsername:'writer',pulse:'13045461',createdAt:'2026-07-09T20:54:26Z',verifyHref:'/v/20260709_1654/AA5A3B82/13045461?a=514dffaa&ms=1783630466151',profileOriginal:{media:null,code:'AA5A3B82',proof:{groth16Id:'397E57BD3D2CF0C2',poseidon:'1'.repeat(64)}}}]}}).items[0];
 const host=document.createElement('div'),root=createRoot(host),fetcher=vi.spyOn(globalThis,'fetch');try{await act(()=>root.render(<MomentCard item={item}/>));expect(host.querySelector('blockquote')?.textContent).toBe(caption);expect(host.textContent).toContain('This Happened');for(const field of ['514dffaa','AA5A3B82','13045461','397E57BD3D2CF0C2','@writer'])expect(host.textContent).toContain(field);expect(host.textContent).not.toContain('…');expect(fetcher).not.toHaveBeenCalled();}finally{act(()=>root.unmount());host.remove();fetcher.mockRestore();}
});

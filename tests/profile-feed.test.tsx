// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {useProfileFeed} from '../src/public-explorer/useProfileFeed';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('reveals already held rows immediately while a background source read is pending',()=>{
 const onMore=vi.fn(),host=document.createElement('div'),root=createRoot(host);
 function View(){const feed=useProfileFeed({length:60,boundary:'held',hasMore:true,active:true,busy:true,onMore});return <button onClick={feed.loadMore}>{feed.count}</button>;}
 try{act(()=>root.render(<View/>));expect(host.textContent).toBe('24');act(()=>host.querySelector('button')!.click());expect(host.textContent).toBe('48');act(()=>host.querySelector('button')!.click());expect(host.textContent).toBe('60');act(()=>host.querySelector('button')!.click());expect(onMore).not.toHaveBeenCalled();}finally{act(()=>root.unmount());}
});

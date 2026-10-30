// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
vi.mock('../src/components/Sheet',()=>({Sheet:(p:any)=><div>{p.children}</div>}));vi.mock('../src/public-feed/PublicFeed',()=>({PublicFeed:(p:any)=><div data-first={p.seed[0]?.id}/> }));
import {MarketFeedPopover} from '../src/features/market/MarketFeedPopover';Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('starts with an explicitly selected work without changing the existing unselected ordering',async()=>{const items=[{id:'image',category:'proof',mediaKind:'image'},{id:'song',category:'proof',mediaKind:'audio'}] as any,host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<MarketFeedPopover items={items} selectedItemId="song" active onClose={()=>{}}/>));expect(host.querySelector('[data-first]')?.getAttribute('data-first')).toBe('song');}finally{act(()=>root.unmount());}});

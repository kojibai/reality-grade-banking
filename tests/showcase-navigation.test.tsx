// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {expect,it,vi} from 'vitest';
import {LiveAssets} from '../src/features/assets/LiveAssets';import {parsePublicProfile} from '../src/receiz/public-profile';import {profileFixture} from './fixtures/public-profile';import type {OpenIdentity} from '../src/receiz/native-identity';
vi.mock('../src/features/market/PublicAssetDetail',()=>({PublicAssetDetail:()=> <a href="/asset/test/">Asset page</a>}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
it('releases the Showcase modal scroll lock before entering a public page and preserves its return state',async()=>{
 const element=document.createElement('div');document.body.append(element);const root=createRoot(element),items=parsePublicProfile(profileFixture(),'alexmorgan').items,identity={listDeposits:async()=>[]} as unknown as OpenIdentity;
 const render=(active:boolean)=>act(async()=>root.render(<LiveAssets identity={identity} active={active} revision={0} showcase={items} onOpen={()=>{}}/>));
 try{await render(true);await act(()=>element.querySelector<HTMLButtonElement>('.market-rows .asset-row')!.click());expect(document.body.style.position).toBe('fixed');await render(false);expect(document.body.style.position).not.toBe('fixed');expect(element.querySelector('dialog')?.open).toBe(false);await render(true);expect(element.querySelector('dialog')?.open).toBe(true);}finally{await act(()=>root.unmount());element.remove();}
});

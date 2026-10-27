// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it} from 'vitest';
import {CreatedAssetResult,type CreatedAssetResultValue} from '../src/features/assets/CreatedAssetResult';

Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const result:CreatedAssetResultValue={title:'A recorded song',digest:'a'.repeat(64),publication:{status:'published'},assetDefinition:{name:'A recorded song',symbol:'SONG',units:'250',description:'The selected original',linkedProofDigest:null}};
const roots:ReturnType<typeof createRoot>[]=[];
afterEach(()=>{for(const root of roots.splice(0))act(()=>root.unmount());});
function render(value:CreatedAssetResultValue,options:{busy?:boolean;publicItem?:{id:string}|null;error?:string}={}){
 const actions:string[]=[],host=document.createElement('div'),root=createRoot(host);roots.push(root);
 act(()=>root.render(<CreatedAssetResult result={value} settings={{symbol:'DRAFT',units:'1000'}} busy={options.busy??false} error={options.error??''} username="artist" publicItem={options.publicItem??null} onRetryDelivery={()=>{actions.push('retry');}} onPublishMarket={()=>{actions.push('publish');}} onOpenAsset={()=>{actions.push('open');}} onSave={()=>{actions.push('save');}} onClose={()=>{actions.push('close');}}/>));
 return {host,actions,button:(label:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent===label)!};
}

it.each([{signed:false,label:'Retry public delivery',action:'retry'},{signed:true,label:'Finish publishing',action:'publish'}])('retries the same pending $signed Original through its original action',({signed,label,action})=>{
 const view=render({...result,pbiSigned:signed,publication:{status:'pending'}});
 expect(view.host.querySelector('.proof-coordinate')?.textContent).toBe('a'.repeat(64));
 expect(view.host.querySelector('h1')?.textContent).toBe(signed?'Your Original is signed.':'Your Original is sealed.');
 expect(view.host.querySelector('a.primary-button')).toBeNull();
 act(()=>view.button(label).click());expect(view.actions).toEqual([action]);
});

it('keeps signed public results openable and preserves the save and close actions',()=>{
 const view=render({...result,pbiSigned:true},{publicItem:{id:'profile:artist:song'}});
 const link=view.host.querySelector<HTMLAnchorElement>('a.primary-button')!;
 expect(link.getAttribute('href')).toBe('/asset/profile%3Aartist%3Asong/');
 link.addEventListener('click',event=>event.preventDefault());act(()=>link.click());
 act(()=>view.button('Save original proof').click());act(()=>view.button('Done').click());
 expect(view.actions).toEqual(['open','save','close']);
 expect(view.host.querySelector('h1')?.textContent).toBe('Your Original is signed and public.');
 expect(view.host.textContent).toContain('SONG');expect(view.host.textContent).toContain('250');
 expect(view.button('Sign')).toBeUndefined();
});

it('preserves the profile destination and prevents a busy unsigned result from signing again',()=>{
 const view=render(result,{busy:true,error:'Your original remains saved.'});
 expect(view.host.querySelector('a.primary-button')?.getAttribute('href')).toBe('/artist/');
 expect(view.host.querySelector('[role="alert"]')?.textContent).toBe('Your original remains saved.');
 expect(view.button('Signing your Original…').disabled).toBe(true);
 act(()=>view.button('Signing your Original…').click());expect(view.actions).toEqual([]);
});

it('shows sealed accrual before this Original’s own Sign action unlocks its value',()=>{
 const view=render(result);
 expect(view.host.querySelector('h1')?.textContent).toBe('Your Original is sealed.');
 expect(view.host.textContent).toContain('Your Original is already earning.');
 expect(view.host.textContent).toContain('Your Original is already public on Receiz');
 expect(view.host.textContent).not.toMatch(/Sign this Original with PBI to publish|PBI signing displays|same action publishes/i);
 expect(view.host.querySelector('a[href="/learn/earn-from-originals/"]')?.textContent).toContain('Sign this Original to unlock its value');
 expect(view.host.textContent).not.toMatch(/enable earning|earning turns on|start earning/i);
 act(()=>view.button('Sign').click());expect(view.actions).toEqual(['publish']);
});

it('keeps existing Receiz publication distinct from pending Market listing after signing',()=>{
 const view=render({...result,pbiSigned:true,marketPublication:{status:'pending',code:'DELIVERY_PENDING'}});
 expect(view.host.querySelector('h1')?.textContent).toBe('Your Original is signed and public.');
 expect(view.host.textContent).toContain('Your Original is public on Receiz.');
 expect(view.host.textContent).toContain('Market listing delivery is pending.');
 expect(view.host.textContent).not.toContain('public on your profile and in Market');
 expect(view.button('Sign')).toBeUndefined();
 expect(view.host.querySelector('a.primary-button')?.getAttribute('href')).toBe('/artist/');
});

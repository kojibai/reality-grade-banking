// @vitest-environment happy-dom
import {act} from 'react';import {createRoot} from 'react-dom/client';import {afterEach,expect,it,vi} from 'vitest';
import {TwinWorkspacePanel} from '../src/features/messages/TwinWorkspacePanel';import {createTwinWorkspace} from '../src/receiz/twin-workspace';import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});const cleanups:Array<()=>void>=[];afterEach(()=>cleanups.splice(0).forEach(f=>f()));
async function fixture(blockSettings=false,initialTab:'settings'|'mind'|'work'|'embed'='settings',failConnection=false){const owner='owner',agent={agentId:'agent',ownerUserId:owner,displayName:'Maya’s Twin',systemPersona:'Be clear and helpful',memoryScope:'relationship',capabilities:['greet','converse'],policy:{allowScheduling:true,replyVoiceMode:'muted'},updatedAt:'2026-10-26T12:00:00Z'},profile={userId:owner,username:'maya',displayName:'Maya'};
 const request=vi.fn(async(input:{action:string;patch?:Record<string,unknown>})=>blockSettings?new Promise<never>(()=>{}):input.action==='mind'?{ok:true,bundle:{schema:'receiz.world.public-twin.mind',owner:profile,memory:{entries:[{role:'assistant',body:'An exact saved answer',scope:'relationship'}]},showcase:{items:[{id:'original-one',title:'My work',summary:'An original source',href:'/maya/verified/one'}]}}}:input.action==='save'?{ok:true,agent:{...agent,...input.patch,updatedAt:'2026-10-26T13:00:00Z'}}:{ok:true,profile,agent,avatar:null});
 const api=createTwinWorkspace({accountUid:owner,request,assertOpen(){}}),open=vi.fn(async()=>{if(failConnection)throw Error('Unavailable');return api;}),identity={twinWorkspace:open,accountUsername:()=>profile.username,knownProfile:()=>profile,knownOrganizerDisplay:()=>({accountUid:owner,events:[{id:'event-one',ownerUserId:owner,title:'My work',note:'An original source',startAt:'2026-10-20T12:00:00Z',metadata:{pulse:'14800000'}}],contacts:[]})} as unknown as OpenIdentity,host=document.createElement('div');document.body.append(host);const root=createRoot(host);cleanups.push(()=>{act(()=>root.unmount());host.remove();});await act(async()=>root.render(<TwinWorkspacePanel identity={identity} accountUid={owner} initialTab={initialTab} active onBack={()=>{}}/>));
 const click=async(label:string)=>{const button=[...host.querySelectorAll('button')].find(b=>b.textContent===label||b.getAttribute('aria-label')===label);expect(button,label).toBeTruthy();await act(async()=>button!.click());};return{host,request,click,open};}
it('shows the actual Twin controls and reuses held Calendar records for Mind without an export request, retaining it across tab changes',async()=>{const f=await fixture();expect(f.host.textContent).toContain('Maya’s Twin');expect(f.host.querySelector('input[aria-label="Choose Twin image"]')).toBeTruthy();expect(f.request).toHaveBeenCalledTimes(1);await f.click('Mind');await act(async()=>{await import('../src/features/messages/twin-mind/TwinMindView');});expect(f.host.textContent).toContain('My work');await f.click('Settings');await f.click('Mind');expect(f.request).toHaveBeenCalledTimes(1);await f.click('Add to website');expect(f.host.textContent).toContain('data-username="maya"');const preview=f.host.querySelector('iframe[title="Your Twin website preview"]');expect(preview?.getAttribute('src')).toBe('https://receiz.com/world/embed/maya');expect(preview?.getAttribute('loading')).toBe('lazy');expect(f.host.textContent).not.toContain('Preview your Twin');expect(f.request).toHaveBeenCalledTimes(1);});
it('saving a name sends only that field and paints the accepted view without another read',async()=>{const f=await fixture(),input=f.host.querySelector<HTMLInputElement>('form input')!;await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Studio');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});await act(async()=>f.host.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(f.request.mock.calls.at(-1)?.[0]).toMatchObject({action:'save',patch:{displayName:'Studio'}});expect(f.request).toHaveBeenCalledTimes(2);expect(f.host.textContent).toContain('Studio');});
it('cancelling native image selection does not submit an image or leave the open panel',async()=>{const f=await fixture(),input=f.host.querySelector('input[type=file]')!;await act(async()=>{input.dispatchEvent(new Event('cancel',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});expect(f.host.textContent).toContain('Your Twin');expect(f.request).toHaveBeenCalledTimes(1);});

it('paints held Mind records even while the separate settings read never completes',async()=>{
 const f=await fixture(true);await f.click('Mind');await act(async()=>{await import('../src/features/messages/twin-mind/TwinMindView');});
 expect(f.host.textContent).toContain('My work');expect(f.host.textContent).not.toContain('saved mind is unavailable');expect(f.request).toHaveBeenCalledTimes(1);
});

it('opens Mind itself without starting the unrelated settings service',async()=>{
 const f=await fixture(false,'mind');await act(async()=>{await import('../src/features/messages/twin-mind/TwinMindView');});
 expect(f.host.textContent).toContain('My work');expect(f.open).not.toHaveBeenCalled();expect(f.request).not.toHaveBeenCalled();
});

it('keeps workspace connection errors visible on Work and Embed while leaving local Mind independent',async()=>{
 for(const tab of ['work','embed'] as const){const f=await fixture(false,tab,true);expect(f.host.querySelector('[role=alert]')?.textContent).toContain('could not be opened');expect(f.request).not.toHaveBeenCalled();}
});


it('paints already held settings and the inline embed on the first render without reconnecting',async()=>{
 const owner='held-owner',profile={userId:owner,username:'studio',displayName:'Studio'};
 const request=vi.fn(async()=>({ok:true,profile,agent:null,avatar:null})),api=createTwinWorkspace({accountUid:owner,request,assertOpen(){}});await api.settings();
 const open=vi.fn(()=>new Promise<never>(()=>{})),identity={knownTwinWorkspace:()=>api,twinWorkspace:open} as unknown as OpenIdentity;
 const host=document.createElement('div'),root=createRoot(host);cleanups.push(()=>act(()=>root.unmount()));
 act(()=>root.render(<TwinWorkspacePanel identity={identity} accountUid={owner} initialTab="embed" active onBack={()=>{}}/>));
 expect(host.querySelector('iframe')?.getAttribute('src')).toBe('https://receiz.com/world/embed/studio');
 expect(host.textContent).toContain('data-username="studio"');expect(host.querySelector('[role="status"]')).toBeNull();expect(open).not.toHaveBeenCalled();expect(request).toHaveBeenCalledOnce();
});

it('paints already held work on the first render without waiting for settings',async()=>{
 const owner='held-worker',request=vi.fn(async()=>({ok:true,tasks:[{id:'work-one',title:'Client meetings arranged',status:'completed'}],campaigns:[]})),api=createTwinWorkspace({accountUid:owner,request,assertOpen(){}});await api.work();
 const open=vi.fn(()=>new Promise<never>(()=>{})),identity={knownTwinWorkspace:()=>api,twinWorkspace:open} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);cleanups.push(()=>act(()=>root.unmount()));
 act(()=>root.render(<TwinWorkspacePanel identity={identity} accountUid={owner} initialTab="work" active onBack={()=>{}}/>));
 expect(host.textContent).toContain('Client meetings arranged');expect(host.querySelector('[role="status"]')).toBeNull();expect(open).not.toHaveBeenCalled();expect(request).toHaveBeenCalledOnce();
});

it('keeps an unopened inactive workspace quiet',async()=>{
 const open=vi.fn(()=>new Promise<never>(()=>{})),identity={twinWorkspace:open} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);cleanups.push(()=>act(()=>root.unmount()));
 await act(async()=>root.render(<TwinWorkspacePanel identity={identity} accountUid="owner" active={false} onBack={()=>{}}/>));expect(open).not.toHaveBeenCalled();
});

// @vitest-environment happy-dom
import {act,StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CallPanel} from '../src/features/messages/CallPanel';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
const conversationId='11111111-1111-4111-8111-111111111111',userId='33333333-3333-4333-8333-333333333333';
function setup(heldFetch:(input:string,init?:RequestInit)=>Promise<Response>,strict=false){
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host),onClose=vi.fn(),onMinimize=vi.fn(),onRestore=vi.fn(),identity={heldFetch};
 return {host,root,onClose,onMinimize,onRestore,render:(minimized=false)=>act(async()=>{const panel=<CallPanel identity={identity} conversationId={conversationId} conversationTitle="Studio" userId={userId} initialVideo={false} minimized={minimized} onMinimize={onMinimize} onRestore={onRestore} onClose={onClose}/>;root.render(strict?<StrictMode>{panel}</StrictMode>:panel);}),unmount:()=>{act(()=>root.unmount());host.remove();}};
}
it('shows explicit Start before touching devices and leaves camera as a preference until then',async()=>{
 const media=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:media}});
 const requests:string[]=[],f=setup(async(_url,init)=>{requests.push(init?.method??'GET');return Response.json({ok:true,calls:[],activeCall:null});});
 try{await f.render();expect(f.host.textContent).toContain('Studio');expect(f.host.querySelector<HTMLButtonElement>('[aria-label="Start call"]')).not.toBeNull();await act(async()=>f.host.querySelector<HTMLButtonElement>('[aria-label="Use video"]')!.click());expect(media).not.toHaveBeenCalled();expect(requests.every(m=>m==='GET')).toBe(true);expect(f.host.textContent).not.toContain('Connected');}finally{f.unmount();}
});
it('renders the actual delegated refusal without exposing a false active call',async()=>{
 const f=setup(async()=>Response.json({ok:false,error:'insufficient_scope'},{status:403}));try{await f.render();expect(f.host.querySelector('[role="alert"]')?.textContent).toContain('insufficient_scope');expect(f.host.textContent).not.toContain('Connected');}finally{f.unmount();}
});
it('retains the joined controller and media through minimize and page visibility, and leaves once on pagehide',async()=>{
 let stopped=false;const track={kind:'audio',id:'synthetic',enabled:true,readyState:'live',stop(){stopped=true;this.readyState='ended';}},stream=Object.assign(new MediaStream([track as unknown as MediaStreamTrack]),{getTracks:()=>[track]});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>stream}});
 const call={id:'22222222-2222-4222-8222-222222222222',conversationId,mode:'voice',topology:'mesh',status:'active',participants:[{participantKind:'user',userId,leftAt:null,displayName:'You'}],viewerPermissions:{canEndCall:true},activeParticipantCount:1};let joined=false,left=false;
 const f=setup(async(url,init)=>{
  if(url.endsWith('/participants')){if(init?.method==='DELETE'){left=true;joined=false;}else if(JSON.parse(String(init?.body)).action==='join')joined=true;return Response.json({ok:true,call});}
  if(url.endsWith('/ice'))return Response.json({ok:true,iceServers:[{urls:'stun:synthetic.invalid'}],source:'fallback'});
  if(url.includes('/signals?'))return Response.json({ok:true,signals:[],lastSignalAt:null});
  return Response.json({ok:true,call,calls:[call],activeCall:call});
 });
 try{await f.render();await act(async()=>f.host.querySelector<HTMLButtonElement>('[aria-label="Join call"]')!.click());expect(joined).toBe(true);expect(f.host.textContent).toContain('Waiting');expect(f.host.textContent).not.toContain('Connected');
  Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});await act(async()=>document.dispatchEvent(new Event('visibilitychange')));expect(stopped).toBe(false);expect(left).toBe(false);expect(joined).toBe(true);
  await act(async()=>f.host.querySelector<HTMLButtonElement>('[aria-label="Return to conversation"]')!.click());expect(f.onMinimize).toHaveBeenCalledOnce();expect(f.onClose).not.toHaveBeenCalled();expect(stopped).toBe(false);
  const video=f.host.querySelector('video');await f.render(true);expect(f.host.querySelector('video')).toBe(video);expect(f.host.querySelector('.bank-call')?.classList.contains('bank-call-minimized')).toBe(true);expect(stopped).toBe(false);
  await act(async()=>f.host.querySelector<HTMLButtonElement>('[aria-label="Return to call"]')!.click());expect(f.onRestore).toHaveBeenCalledOnce();await f.render(false);expect(f.host.querySelector('video')).toBe(video);expect(joined).toBe(true);
  await act(async()=>window.dispatchEvent(new Event('pagehide')));expect(stopped).toBe(true);expect(left).toBe(true);expect(joined).toBe(false);
 }finally{f.unmount();Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});}expect(stopped).toBe(true);
});

it('keeps Start usable after the application StrictMode effect replay',async()=>{
 const media=vi.fn(async()=>{throw new DOMException('Denied','NotAllowedError');});Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:media}});
 const f=setup(async()=>Response.json({ok:true,calls:[],activeCall:null}),true);
 try{await f.render();await act(async()=>f.host.querySelector<HTMLButtonElement>('[aria-label="Start call"]')!.click());expect(media).toHaveBeenCalledOnce();expect(f.host.querySelector('[role="alert"]')?.textContent).toContain('permission');}finally{f.unmount();}
});

it('offers explicit cancellation in the compact window while device acquisition is unresolved',async()=>{
 let resolve!:(stream:MediaStream)=>void;const pending=new Promise<MediaStream>(done=>{resolve=done;}),stop=vi.fn();
 const track={kind:'audio',id:'late-device',enabled:true,readyState:'live',stop},stream=Object.assign(new MediaStream([track as unknown as MediaStreamTrack]),{getTracks:()=>[track]});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>pending}});
 const mutations:string[]=[],f=setup(async(_url,init)=>{if(init?.method&&init.method!=='GET')mutations.push(init.method);return Response.json({ok:true,calls:[],activeCall:null});});
 try{
  await f.render();await act(async()=>f.host.querySelector<HTMLButtonElement>('[aria-label="Start call"]')!.click());await f.render(true);
  await act(async()=>f.host.querySelector<HTMLButtonElement>('[aria-label="Cancel joining call"]')!.click());await act(async()=>resolve(stream));
  expect(stop).toHaveBeenCalledOnce();expect(mutations).toEqual([]);expect(f.host.textContent).not.toContain('Connected');
 }finally{f.unmount();}
});

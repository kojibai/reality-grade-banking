// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {OfflineNotes} from '../src/features/notes/OfflineNotes';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
function gate<T>(){let open!:(v:T)=>void;return{wait:new Promise<T>(resolve=>open=resolve),open:(v:T)=>open(v)};}
const info={noteId:'fixture',rail:'reserve',amountUsdCents:'12500'};
function mount(){const host=document.createElement('div'),root=createRoot(host);return{host,root,render:async(identity:unknown,mode:'create'|'deposit'='deposit')=>{await act(async()=>root.render(<OfflineNotes identity={identity as OpenIdentity} mode={mode} onBack={()=>{}} onRefresh={()=>{}}/>));},close:()=>act(()=>root.unmount())};}
async function upload(host:HTMLElement,file:unknown){const input=host.querySelector<HTMLInputElement>('input[type=file]')!;Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(async()=>{input.dispatchEvent(new Event('change',{bubbles:true}));});}
it('shares one cold Note runtime between inventory opening and a selected original',async()=>{
 const g=gate<any>(),opening=vi.fn(()=>g.wait),inspect=vi.fn(async()=>info),ui=mount();
 try{await ui.render({offlineNotes:opening});await upload(ui.host,new File([new Uint8Array([1])],'note.png'));await act(async()=>g.open({receivedNotes:async()=>[],inspect}));expect(ui.host.textContent).toContain('$125.00');expect(inspect).toHaveBeenCalledExactlyOnceWith(new Uint8Array([1]));expect(opening).toHaveBeenCalledOnce();}finally{ui.close();}
});
it('starts runtime preparation while selected file bytes are being read',async()=>{
 const bytes=gate<ArrayBuffer>(),opening=vi.fn().mockRejectedValueOnce(Error('FIRST_PREPARATION_REFUSED')).mockResolvedValue({receivedNotes:async()=>[],inspect:async()=>info}),ui=mount();
 try{await ui.render({offlineNotes:opening});await upload(ui.host,{size:1,arrayBuffer:()=>bytes.wait});const starts=opening.mock.calls.length;await act(async()=>bytes.open(new Uint8Array([1]).buffer));expect(ui.host.textContent).toContain('$125.00');expect(starts).toBe(2);}finally{ui.close();}
});
it('starts saved inventory and pending custody together but admits review only after both complete',async()=>{
 const saved=gate<never[]>(),pending=gate<null>(),readPending=vi.fn(()=>pending.wait),ui=mount();
 try{await ui.render({offlineNotes:async()=>({savedNotes:()=>saved.wait,pending:readPending})},'create');const starts=readPending.mock.calls.length;expect(ui.host.querySelector<HTMLButtonElement>('.primary-button')!.disabled).toBe(true);await act(async()=>pending.open(null));expect(ui.host.querySelector<HTMLButtonElement>('.primary-button')!.disabled).toBe(true);await act(async()=>saved.open([]));expect(ui.host.querySelector<HTMLButtonElement>('.primary-button')!.disabled).toBe(false);expect(starts).toBe(1);}finally{saved.open([]);pending.open(null);ui.close();}
});
it('never reuses another identity runtime, including a late resolution from the previous identity',async()=>{
 const old=gate<any>(),first=vi.fn(()=>old.wait),second=vi.fn(async()=>({receivedNotes:async()=>[],inspect:async()=>info})),ui=mount();
 try{await ui.render({offlineNotes:first});await ui.render({offlineNotes:second});await act(async()=>old.open({receivedNotes:async()=>[],inspect:async()=>({...info,amountUsdCents:'99900'})}));await upload(ui.host,new File([new Uint8Array([1])],'note.png'));expect(ui.host.textContent).toContain('$125.00');expect(ui.host.textContent).not.toContain('$999.00');expect(first).toHaveBeenCalledOnce();expect(second).toHaveBeenCalledOnce();}finally{ui.close();}
});
it('keeps a synchronous runtime refusal inside the existing error UI and allows a retry',async()=>{
 const opening=vi.fn().mockImplementationOnce(()=>{throw Error('CONTROLLED_RUNTIME_REFUSAL');}).mockResolvedValue({receivedNotes:async()=>[],inspect:async()=>info}),ui=mount();
 try{await ui.render({offlineNotes:opening});expect(ui.host.querySelector('[role=alert]')).not.toBeNull();await upload(ui.host,new File([new Uint8Array([1])],'note.png'));expect(ui.host.textContent).toContain('$125.00');expect(opening).toHaveBeenCalledTimes(2);}finally{ui.close();}
});

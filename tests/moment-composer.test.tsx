// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CreateAsset} from '../src/features/assets/CreateAsset';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.restoreAllMocks());
const click=(host:HTMLElement,text:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes(text))!.click();
async function select(host:HTMLElement,file:File){const input=host.querySelector('input[type=file]')!;Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
it('keeps selection local, adapts to audio and carries the selected original only when the author seals',async()=>{
 const createAsset=vi.fn<OpenIdentity['createAsset']>(async()=>({bytes:new Uint8Array([1]),filename:'moment.receiz',title:'Moment',digest:'a'.repeat(64),kind:'proof',status:'held-proof',pulse:'1'})),host=document.createElement('div'),root=createRoot(host),file=new File(['original audio'],'song.mp3',{type:'audio/mpeg'});
 const identity={listDeposits:async()=>[],createAsset} as unknown as OpenIdentity;
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  expect(host.textContent).toContain('What does this moment claim?');expect(host.textContent).toContain('Long-form text');
  expect(host.querySelector('input[type=file]')).not.toBeNull();
  await select(host,file);expect(createAsset).not.toHaveBeenCalled();expect(host.textContent).toContain('Audio details');expect(host.textContent).toContain('song.mp3');
  await act(async()=>click(host,'Seal moment'));expect(createAsset).toHaveBeenCalledOnce();expect(createAsset.mock.calls[0]).toHaveLength(2);expect(createAsset.mock.calls[0][1]).toMatchObject({files:[file]});
  expect(host.textContent).toContain('Your moment is sealed.');
 }finally{act(()=>root.unmount());}
});
it('does not drop moment originals silently or start financial review when the funded contract cannot carry them',async()=>{
 const operations=vi.fn(),host=document.createElement('div'),root=createRoot(host),identity={listDeposits:async()=>[],operations} as unknown as OpenIdentity;
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  await select(host,new File(['evidence'],'evidence.txt',{type:'text/plain'}));
  act(()=>click(host,'Create with backing'));await act(async()=>click(host,'Review asset creation'));
  expect(operations).not.toHaveBeenCalled();expect(host.textContent).toContain('Backed issuance currently supports a plain definition');
  act(()=>click(host,'Seal a moment'));expect(host.textContent).toContain('evidence.txt');
 }finally{act(()=>root.unmount());}
});

// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CreateAsset} from '../src/features/assets/CreateAsset';
import type {OpenIdentity} from '../src/receiz/native-identity';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
afterEach(()=>vi.restoreAllMocks());
it('shows the published asset returned by funding recovery instead of reopening a blank composer',async()=>{
 const deposit={bytes:new Uint8Array([1]),filename:'work.receiz',title:'Recovered work',digest:'a'.repeat(64),kind:'proof',status:'held-proof',pulse:'1',publication:{status:'published'}};let published=false;
 const backed={pending:async()=>({state:{stage:published?'published':'funding-pending'},deposit:null}),resume:vi.fn(async()=>{published=true;return deposit;})};
 const identity={backedAssetPublication:async()=>backed,accountUsername:()=> 'artist'} as unknown as OpenIdentity,host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));expect(host.textContent).toContain('Confirming your asset.');await act(async()=>click(host,'Continue creation'));expect(host.textContent).toContain('Your asset is public.');expect(host.querySelector('a')?.getAttribute('href')).toBe('/artist/');expect(backed.resume).toHaveBeenCalledOnce();}finally{act(()=>root.unmount());}
});
async function title(host:HTMLElement){const input=host.querySelector<HTMLInputElement>('input[aria-label="Title"]')!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'Moment');input.dispatchEvent(new Event('input',{bubbles:true}));});}
const click=(host:HTMLElement,text:string)=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes(text))!.click();
async function select(host:HTMLElement,file:File){const input=host.querySelector('input[aria-label="Choose original"]')!;Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
it('keeps selection local, adapts to audio and carries the selected original only when the author seals',async()=>{
 const createAsset=vi.fn<OpenIdentity['createComposedAsset']>(async()=>({bytes:new Uint8Array([1]),filename:'moment.receiz',title:'Moment',digest:'a'.repeat(64),kind:'proof',status:'held-proof',pulse:'1'})),host=document.createElement('div'),root=createRoot(host),file=new File(['original audio'],'song.mp3',{type:'audio/mpeg'});
 const identity={listDeposits:async()=>[],createComposedAsset:createAsset} as unknown as OpenIdentity;
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  expect(host.textContent).toContain('Description');expect(host.textContent).toContain('Full text');
  expect(host.querySelector('input[type=file]')).not.toBeNull();
  expect(host.textContent).toContain('public on your profile and in Market');
  await title(host);await select(host,file);expect(createAsset).not.toHaveBeenCalled();expect(host.textContent).toContain('Music details');expect(host.textContent).toContain('song.mp3');
  await act(async()=>click(host,'Create asset'));expect(createAsset).toHaveBeenCalledOnce();expect(createAsset.mock.calls[0]).toHaveLength(2);expect(createAsset.mock.calls[0][1]).toMatchObject({files:[{file,role:'primary'}]});
  expect(host.textContent).toContain('Your asset is sealed.');
 }finally{act(()=>root.unmount());}
});
it('distinguishes retained original custody from confirmed public delivery and retries the same intent',async()=>{
 const deposit={bytes:new Uint8Array([1]),filename:'moment.receiz',title:'Moment',digest:'a'.repeat(64),kind:'proof' as const,status:'held-proof' as const,pulse:'1'};
 const createAsset=vi.fn<OpenIdentity['createComposedAsset']>().mockResolvedValueOnce({...deposit,publication:{status:'pending'}}).mockResolvedValueOnce({...deposit,publication:{status:'published',showcaseArtifactDigest:'b'.repeat(64)}});
 const host=document.createElement('div'),root=createRoot(host),identity={listDeposits:async()=>[],createComposedAsset:createAsset,retryAssetPublication:()=>createAsset.mock.calls.length?createAsset(...createAsset.mock.calls[0]):Promise.reject(Error('NO_SOURCE')),accountUsername:()=> 'owner'} as unknown as OpenIdentity;
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  await title(host);await act(async()=>click(host,'Create asset'));
  expect(host.textContent).toContain('Public delivery is pending');expect(host.textContent).not.toContain('Your asset is public.');
  await act(async()=>click(host,'Retry public delivery'));expect(createAsset.mock.calls[1]).toEqual(createAsset.mock.calls[0]);
  expect(host.textContent).toContain('Your asset is public.');expect(host.querySelector('a')?.getAttribute('href')).toBe('/owner/');expect(host.querySelector('a')?.hasAttribute('target')).toBe(false);
 }finally{act(()=>root.unmount());}
});
it('reopens pending source custody after refresh and resumes it without a new form submission',async()=>{
 const pending={bytes:new Uint8Array([1]),filename:'moment.receiz',title:'Retained moment',digest:'a'.repeat(64),kind:'proof' as const,status:'held-proof' as const,pulse:'1',publication:{status:'pending' as const}};
 const createAsset=vi.fn(),retryAssetPublication=vi.fn(async()=>({...pending,publication:{status:'published' as const}})),host=document.createElement('div'),root=createRoot(host),identity={listDeposits:async()=>[],createComposedAsset:createAsset,pendingAssetPublication:async()=>pending,retryAssetPublication} as unknown as OpenIdentity;
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  expect(host.textContent).toContain('Retained moment');expect(host.textContent).toContain('Public delivery is pending');
  await act(async()=>click(host,'Retry public delivery'));expect(retryAssetPublication).toHaveBeenCalledOnce();expect(createAsset).not.toHaveBeenCalled();expect(host.textContent).toContain('Your asset is public.');
 }finally{act(()=>root.unmount());}
});
it('retains the selected original and refuses a generic funding fallback if the backed publisher is unavailable',async()=>{
 const operations=vi.fn(),host=document.createElement('div'),root=createRoot(host),identity={listDeposits:async()=>[],operations} as unknown as OpenIdentity;
 try{
  await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));
  await select(host,new File(['evidence'],'evidence.txt',{type:'text/plain'}));
  act(()=>click(host,'Create with backing'));await act(async()=>click(host,'Review asset creation'));
  expect(operations).not.toHaveBeenCalled();expect(host.textContent).toContain('Verified transaction terms are unavailable');
  act(()=>click(host,'Public original'));expect(host.textContent).toContain('evidence.txt');
 }finally{act(()=>root.unmount());}
});

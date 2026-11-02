// @vitest-environment happy-dom
import {act,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CreateAsset} from '../src/features/assets/CreateAsset';
import type {OpenIdentity} from '../src/receiz/native-identity';
const capture=vi.hoisted(()=>({stopped:vi.fn(),props:null as null|{maxBytes:number;maxPhotoBytes?:number}}));
vi.mock('../src/features/assets/AssetCamera',()=>({AssetCamera:(props:{maxBytes:number;maxPhotoBytes?:number})=>{capture.props=props;useEffect(()=>()=>capture.stopped(),[]);return <div data-test-camera/>;}}));
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const roots:ReturnType<typeof createRoot>[]=[];
afterEach(()=>{for(const root of roots.splice(0))act(()=>root.unmount());document.body.replaceChildren();vi.restoreAllMocks();vi.unstubAllGlobals();capture.stopped.mockClear();capture.props=null;});
const change=async(host:HTMLElement,label:string,value:string)=>{const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;await act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});};
async function open(){const host=document.createElement('div');document.body.append(host);const root=createRoot(host);roots.push(root);const create=vi.fn<OpenIdentity['createComposedAsset']>(async()=>({bytes:new Uint8Array([1]),filename:'work.receiz',title:'A new original',digest:'a'.repeat(64),kind:'proof',status:'held-proof',pulse:'1'}));const identity={createComposedAsset:create,accountUsername:()=> 'artist',pendingAssetPublication:async()=>null} as unknown as OpenIdentity;await act(async()=>root.render(<CreateAsset identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>));return{host,create,render:(active:boolean)=>root.render(<CreateAsset active={active} identity={identity} onClose={()=>{}} onRefresh={()=>{}}/>)};}
it('opens the immersive local canvas without camera permission, network work or sealing',async()=>{
 const media=vi.fn();vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:media}});const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const{host,create}=await open();
 expect(host.querySelector('.asset-composer--studio[data-studio-mode="canvas"]')).not.toBeNull();expect(host.querySelector('button[aria-label="Open camera"]')).not.toBeNull();expect(host.querySelector('button[aria-label="Review original"]')?.textContent).toContain('Next');expect(host.querySelector('input[aria-label="Choose original"]')).not.toBeNull();
 expect(host.querySelector('[aria-label="Choose cover"]')).toBeNull(); expect(media).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(create).not.toHaveBeenCalled();
});
it('keeps the exact selected file and edits across canvas, review and back, sealing only on Create',async()=>{
 const{host,create}=await open();const file=new File(['photo'],'coast.jpg',{type:'image/jpeg'});const input=host.querySelector<HTMLInputElement>('[aria-label="Choose original"]')!;Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
 await change(host,'Title','A new original');await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());expect(host.querySelector('.asset-composer--studio')?.getAttribute('data-studio-mode')).toBe('review');expect(create).not.toHaveBeenCalled();
 await change(host,'Title','One continuous original');await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Edit original"]')!.click());expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')!.value).toBe('One continuous original');expect(create).not.toHaveBeenCalled();
 await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Create asset'))!.click());expect(create).toHaveBeenCalledOnce();expect(create.mock.calls[0][1].files[0].file).toBe(file);expect(create.mock.calls[0][1].title).toBe('One continuous original');
});
it('does not replace media or lose the draft when the gallery is cancelled',async()=>{
 const{host,create}=await open();await change(host,'Title','Still here');const input=host.querySelector<HTMLInputElement>('[aria-label="Choose original"]')!;Object.defineProperty(input,'files',{configurable:true,value:[]});await act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')!.value).toBe('Still here');expect(host.querySelector('.asset-composer--studio')).not.toBeNull();expect(create).not.toHaveBeenCalled();
});

it('keeps camera capture reachable after choosing an original and its cover',async()=>{
 const{host}=await open();for(const[label,file]of [['Choose original',new File(['song'],'song.mp3',{type:'audio/mpeg'})],['Choose cover',new File(['cover'],'cover.png',{type:'image/png'})]]as const){const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));}expect(host.querySelector('button[aria-label="Open camera"]')).not.toBeNull();
});
it('releases a mounted camera when the retained editor is suspended without discarding its draft',async()=>{
 const{host,render}=await open();await change(host,'Title','A retained draft');await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Open camera"]')!.click());expect(host.querySelector('[data-test-camera]')).not.toBeNull();await act(()=>render(false));expect(host.querySelector('[data-test-camera]')).toBeNull();expect(capture.stopped).toHaveBeenCalledOnce();await act(()=>render(true));expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')!.value).toBe('A retained draft');expect(host.querySelector('[data-test-camera]')).toBeNull();
});

it('opens the existing verified import only on request and retains the composer draft on return',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);roots.push(root);const status=vi.fn(async()=>null),received=vi.fn(async()=>({status})),pendingCards=vi.fn(),identity={pendingAssetPublication:async()=>null,receivedProof:received,pendingCardDeposits:pendingCards}as unknown as OpenIdentity;
 await act(async()=>root.render(<CreateAsset identity={identity} onRefresh={()=>{}} onClose={()=>{}}/>));await change(host,'Title','Keep my draft');expect(received).not.toHaveBeenCalled();await act(async()=>{host.querySelector<HTMLButtonElement>('[aria-label="Use an existing proof"]')!.click();await vi.dynamicImportSettled();});await act(async()=>{await vi.dynamicImportSettled();});expect(host.querySelector('[aria-label="Choose original proof object"]')).not.toBeNull();expect(status).toHaveBeenCalledOnce();expect(pendingCards).not.toHaveBeenCalled();await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Back to creating"]')!.click());expect(host.querySelector<HTMLInputElement>('[aria-label="Title"]')!.value).toBe('Keep my draft');
});


it.each([['audio/mpeg','song.mp3','audio'],['video/mp4','film.mp4','video']])('keeps %s playback available when artwork is selected',async(mime,filename,tag)=>{
 const{host,create}=await open();
 for(const[label,file]of [['Choose original',new File(['original'],filename,{type:mime})],['Choose cover',new File(['artwork'],'cover.png',{type:'image/png'})]]as const){const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
 const playback=host.querySelector(tag);expect(playback).not.toBeNull();expect(playback?.hasAttribute('controls')).toBe(true);if(tag==='video')expect(playback?.getAttribute('poster')).toBeTruthy();expect(create).not.toHaveBeenCalled();
});

it.each([['audio/mpeg','song.mp3','Music details','Primary artist','music','primaryArtist'],['application/epub+zip','book.epub','Book details','Primary author','book','primaryAuthor'],['application/pdf','book.pdf','Book details','Primary author','book','primaryAuthor']])('adapts the selected %s editor locally and retains its content-specific metadata',async(mime,filename,details,field,key,property)=>{
 const{host,create}=await open();const file=new File(['original content'],filename,{type:mime}),input=host.querySelector<HTMLInputElement>('[aria-label="Choose original"]')!;Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));await change(host,'Title','My original');await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());expect([...host.querySelectorAll('summary')].some(node=>node.textContent?.includes(details))).toBe(true);await change(host,field,'The author');await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Edit original"]')!.click());await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());expect(host.querySelector<HTMLInputElement>(`[aria-label="${field}"]`)!.value).toBe('The author');await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Create asset'))!.click());expect(create).toHaveBeenCalledOnce();expect(create.mock.calls[0][1].files[0].file).toBe(file);expect(create.mock.calls[0][1]).toMatchObject({[key]:{[property]:'The author'}});
});


it('uses the image itself as artwork without a separate cover field or a previous cover file',async()=>{
 const{host,create}=await open();
 for(const[label,file]of [['Choose original',new File(['song'],'song.mp3',{type:'audio/mpeg'})],['Choose cover',new File(['old cover'],'cover.png',{type:'image/png'})],['Choose original',new File(['photo'],'photo.jpg',{type:'image/jpeg'})]]as const){const input=host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;Object.defineProperty(input,'files',{configurable:true,value:[file]});await act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));}
 expect(host.querySelector('[aria-label="Choose cover"]')).toBeNull();expect(host.querySelector('img[alt="Selected original"]')).not.toBeNull();await change(host,'Title','My photo');await act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Review original"]')!.click());expect(host.querySelector('[aria-label="Choose cover"]')).toBeNull();await act(async()=>[...host.querySelectorAll('button')].find(button=>button.textContent?.includes('Create asset'))!.click());expect(create.mock.calls[0][1].files.map(entry=>entry.role)).toEqual(['primary']);
});

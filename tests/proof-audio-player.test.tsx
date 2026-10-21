// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
const open=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/proof-media',()=>({openProofMedia:open,retainedPublicMedia:()=>null}));
import {ProofMedia} from '../src/features/media/ProofMedia';
import {AssetObject} from '../src/features/media/AssetObject';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const source={kind:'held' as const,digest:'a'.repeat(64),filename:'song.receiz',bytes:new Uint8Array([1])};
const media={artifactDigest:source.digest,files:[{kind:'audio',filename:'Song.wav',mimeType:'audio/wav',bytes:new Uint8Array([1,2,3]),payloadDigest:'b'.repeat(64)}]};
afterEach(()=>{open.mockReset();vi.restoreAllMocks();});
async function setup(wrap=false){
 open.mockResolvedValue(media);vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:verified-song');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);const front=<ProofMedia source={source} title="Sapphire After Hours" artworkUrl="https://receiz.com/artwork/cover.jpg"/>;
 act(()=>root.render(wrap?<AssetObject front={front} renderBack={()=> <p>Proof material</p>}/>:front));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());
 const audio=host.querySelector('audio')!;
 const metadata=(duration=125)=>act(()=>{Object.defineProperty(audio,'duration',{configurable:true,value:duration});audio.dispatchEvent(new Event('loadedmetadata'));});
 const close=()=>{act(()=>root.unmount());host.remove();};return{host,audio,metadata,close};
}
it('shows real elapsed time and enables accessible seeking only after a finite duration is known',async()=>{
 const {host,audio,metadata,close}=await setup();
 try{expect(host.querySelector('[aria-label="Play audio"]')).not.toBeNull();const seek=host.querySelector<HTMLInputElement>('[aria-label="Seek audio"]')!;expect(seek.disabled).toBe(true);metadata();act(()=>{audio.currentTime=17;audio.dispatchEvent(new Event('timeupdate'));});expect(seek.disabled).toBe(false);expect(seek.max).toBe('125');expect(seek.value).toBe('17');expect(seek.getAttribute('aria-valuetext')).toBe('0:17 of 2:05');expect(host.querySelector('.proof-audio-timing')?.textContent).toContain('0:17');expect(host.textContent).toContain('Sapphire After Hours');
  metadata(Infinity);expect(seek.disabled).toBe(true);
 }finally{close();}
});
it('plays only after a user action and keeps seek, skip and mute bound to the existing native audio',async()=>{
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(async function(this:HTMLMediaElement){Object.defineProperty(this,'paused',{configurable:true,value:false});this.dispatchEvent(new Event('play'));});
 const pause=vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(function(this:HTMLMediaElement){Object.defineProperty(this,'paused',{configurable:true,value:true});this.dispatchEvent(new Event('pause'));});
 const {host,audio,metadata,close}=await setup();
 try{expect(play).not.toHaveBeenCalled();metadata();await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Play audio"]')!.click());expect(host.querySelector('[aria-label="Pause audio"]')).not.toBeNull();
  const seek=host.querySelector<HTMLInputElement>('[aria-label="Seek audio"]')!;act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(seek,'64');seek.dispatchEvent(new Event('input',{bubbles:true}));});expect(audio.currentTime).toBe(64);expect(audio.paused).toBe(false);
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Forward 15 seconds"]')!.click());expect(audio.currentTime).toBe(79);act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Back 15 seconds"]')!.click());expect(audio.currentTime).toBe(64);
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Mute audio"]')!.click());expect(audio.muted).toBe(true);expect(host.querySelector('[aria-label="Unmute audio"]')).not.toBeNull();await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Pause audio"]')!.click());expect(pause).toHaveBeenCalledOnce();expect(host.querySelector('[aria-label="Play audio"]')).not.toBeNull();
 }finally{close();}
});
it('keeps the same playing audio and position through full view and proof-side flips',async()=>{
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const {host,audio,metadata,close}=await setup(true);
 try{metadata();act(()=>{audio.currentTime=42;Object.defineProperty(audio,'paused',{configurable:true,value:false});audio.dispatchEvent(new Event('play'));audio.dispatchEvent(new Event('timeupdate'));});act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Open full media view"]')!.click());expect(host.querySelectorAll('audio')).toHaveLength(1);expect(host.querySelector('audio')).toBe(audio);expect(host.querySelector('dialog [aria-label="Pause audio"]')).not.toBeNull();expect(host.querySelector('dialog [aria-label="Seek audio"]')?.getAttribute('aria-valuetext')).toBe('0:42 of 2:05');
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show proof material"]')!.click());act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Show front"]')!.click());expect(host.querySelector('audio')).toBe(audio);expect(audio.currentTime).toBe(42);expect(audio.paused).toBe(false);expect(open).toHaveBeenCalledOnce();expect(host.querySelector('[aria-label="Pause audio"]')).not.toBeNull();
 }finally{close();}
});
it('offers the exact audio download when the native media element reports a playback error',async()=>{
 const {host,audio,close}=await setup();
 try{act(()=>audio.dispatchEvent(new Event('error')));expect(host.querySelector('[aria-label="Play audio"]')).toBeNull();expect(host.querySelector('.proof-audio-error a')?.getAttribute('href')).toBe('blob:verified-song');expect(host.querySelector('.proof-audio-error')?.textContent).toContain('Save audio');
 }finally{close();}
});

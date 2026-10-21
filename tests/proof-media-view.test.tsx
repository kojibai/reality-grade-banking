// @vitest-environment happy-dom
// Presentation fixtures only; canonical proof verification is tested separately.
import{act}from'react';import{createRoot}from'react-dom/client';import{afterEach,expect,it,vi}from'vitest';
const {open,readPublic}=vi.hoisted(()=>({open:vi.fn(),readPublic:vi.fn()}));vi.mock('../src/receiz/proof-media',()=>({openProofMedia:open,retainedPublicMedia:()=>null}));
vi.mock('../src/receiz/proof-reading',()=>({readPublicProofReading:readPublic,retainedPublicReading:()=>null}));
import{ProofMedia}from'../src/features/media/ProofMedia';
import{Sheet}from'../src/components/Sheet';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const source={kind:'held' as const,digest:'a'.repeat(64),filename:'source.receiz',bytes:new Uint8Array([1])};
const media={artifactDigest:source.digest,files:[{kind:'text',filename:'Essay.html',mimeType:'text/html',bytes:new TextEncoder().encode('<p>Bound text</p>'),payloadDigest:'b'.repeat(64),text:'Bound text'}]};
afterEach(()=>{open.mockReset();readPublic.mockReset();vi.restoreAllMocks();});
it('mounts native public range video immediately without downloading or verifying the complete movie first',async()=>{
 const publicSource={kind:'public' as const,url:'https://receiz.com/api/profile/originals/download?receizId=video&kind=original',digest:source.digest},stream={assetId:'video',url:'https://receiz.com/api/storage/object?bucket=receiz-profile-originals&path=originals%2Fartist%2Fmovie.mp4',mimeType:'video/mp4'};
 const host=document.createElement('div'),root=createRoot(host);try{
 await act(()=>root.render(<ProofMedia source={publicSource} title="A movie" publicVideo={stream} autoOpen/>));expect(host.querySelector('video')?.getAttribute('src')).toBe(stream.url);expect(host.querySelector('video')?.getAttribute('preload')).toBe('metadata');expect(host.querySelector('video')?.hasAttribute('playsinline')).toBe(true);expect(host.textContent).toContain('Public playback');expect(host.textContent).not.toContain('Original verified');expect(open).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('uses the carried asset title when an EPUB metadata title is a placeholder, without renaming its proof',async()=>{
 open.mockResolvedValue({...media,files:[{kind:'book',filename:'Unknown.epub',mimeType:'application/epub+zip',bytes:new Uint8Array([1]),payloadDigest:'book-fixture-title',chapters:[{title:'One',text:'A real chapter.'}],book:{title:'Unknown',author:null,images:[]}}]});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:book');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);try{await act(async()=>root.render(<ProofMedia source={source} title="The Actual Book" autoOpen/>));await act(()=>vi.dynamicImportSettled());expect(host.textContent).not.toContain('Unknown');expect(host.textContent).toContain('The Actual Book');expect(host.querySelector('a[download]')?.getAttribute('download')).toBe('The Actual Book.epub');expect(open).toHaveBeenCalledWith(source,expect.any(AbortSignal));}finally{act(()=>root.unmount());}
});
it('prepares carried text beside inline media without gating its opening and reuses an in-flight read when tapped',async()=>{
 const publicSource={kind:'public' as const,url:'https://receiz.com/api/proof-material/packages/'+'b'.repeat(64)+'/artifact',digest:source.digest,postUrl:'https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',hasLongForm:true};
 let finish!:(reading:unknown)=>void;readPublic.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));open.mockResolvedValue({...media,files:[{kind:'image',filename:'Original.png',mimeType:'image/png',bytes:new Uint8Array([1]),payloadDigest:'b'.repeat(64)}]});
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:verified-original');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);try{
 await act(async()=>root.render(<ProofMedia source={publicSource} title="Object" autoOpen/>));expect(host.querySelector('.proof-image-open img')?.getAttribute('src')).toBe('blob:verified-original');expect(readPublic).toHaveBeenCalledOnce();expect(host.querySelector('dialog')).toBeNull();
 act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());expect(readPublic).toHaveBeenCalledOnce();
 await act(async()=>finish({title:'Carried essay',text:'The prepared complete essay.',sha256:'e'.repeat(64),artifactDigest:'f'.repeat(64)}));expect(host.querySelector('dialog .proof-reading-text')?.textContent).toBe('The prepared complete essay.');
 act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());expect(host.querySelector('dialog')?.open).toBe(true);expect(readPublic).toHaveBeenCalledOnce();expect(open).toHaveBeenCalledOnce();
 }finally{act(()=>root.unmount());}
});
it('opens and zooms a legacy public image and reads its public carried text without trying the sealed-download sale',async()=>{
 const preview='https://receiz.com/artwork/public-original.png',publicSource={kind:'public' as const,url:'https://receiz.com/api/profile/originals/download?receizId=old-image&kind=original',digest:'d'.repeat(64),postUrl:'https://receiz.com/v/20260811_2153/35D1E00F/13593419?a=c237f28b&ms=1786499609033',hasLongForm:true};
 readPublic.mockRejectedValueOnce(Error('Background preparation did not finish.')).mockRejectedValueOnce(Error('This public text could not be opened yet.')).mockResolvedValue({title:'Carried public text',text:'The exact verified public text.',sha256:'e'.repeat(64),artifactDigest:'f'.repeat(64)});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:verified-text');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<ProofMedia source={publicSource} title="Legacy image" artworkUrl={preview} publicImageUrl={preview} autoOpen/>));
  expect(host.querySelector('.proof-image-open img')?.getAttribute('src')).toBe(preview);expect(host.textContent).not.toContain('Original verified');expect(host.querySelector('.proof-object-cover')).toBeNull();expect(open).not.toHaveBeenCalled();
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Open full image"]')!.click());expect(host.querySelector('dialog[open] img')?.getAttribute('src')).toBe(preview);
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!.click());expect(host.querySelector('dialog[open] img')?.getAttribute('style')).toContain('150%');expect(host.querySelector('dialog a[download]')).toBeNull();
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());
  expect(host.querySelector('.proof-media-error')?.textContent).toContain('public text could not be opened');await act(async()=>host.querySelector<HTMLButtonElement>('.proof-media-error button')!.click());
  expect(host.querySelector('dialog .proof-reading-text')?.textContent).toBe('The exact verified public text.');expect(readPublic).toHaveBeenLastCalledWith(publicSource.postUrl,publicSource.digest,expect.any(AbortSignal));expect(readPublic).toHaveBeenCalledTimes(3);expect(open).not.toHaveBeenCalled();expect(host.querySelector('.proof-media-error')).toBeNull();
 }finally{act(()=>root.unmount());}
});
it('shows the existing public image immediately, then opens the verified image without a receipt request',async()=>{
 const artwork='https://receiz.com/api/proof-material/packages/'+'c'.repeat(64)+'/artifact';
 let finish!:(value:unknown)=>void;open.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:verified-image');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<ProofMedia source={source} title="An image" artworkUrl={artwork} autoOpen/>));
  expect(host.querySelector('img')?.getAttribute('src')).toBe(artwork);expect(host.querySelector('img')?.crossOrigin).toBe('anonymous');expect(host.querySelector('img')?.getAttribute('loading')).toBe('eager');expect(host.textContent).not.toContain('Original verified');
  await act(async()=>finish({...media,files:[{kind:'image',filename:'Original.png',mimeType:'image/png',bytes:new Uint8Array([1]),payloadDigest:'b'.repeat(64)}]}));
  expect(host.querySelector('.proof-image-open img')?.getAttribute('src')).toBe('blob:verified-image');expect(host.textContent).toContain('Original verified');expect(open).toHaveBeenCalledOnce();expect(host.innerHTML).not.toContain('/api/receiz/download');
 }finally{act(()=>root.unmount());}
});
it('starts a standalone cover eagerly while original verification remains pending, without marking the cover verified',async()=>{
 const artwork='https://receiz.com/api/profile/originals/media?receizId=song&slot=audioCover';
 let finish!:(value:unknown)=>void;open.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:verified-song');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const play=vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue(undefined);
 const host=document.createElement('div'),root=createRoot(host);
 try{await act(async()=>root.render(<ProofMedia source={source} title="Album" artworkUrl={artwork} autoOpen/>));
  expect(host.querySelector('img')?.getAttribute('loading')).toBe('eager');expect(host.querySelector('img')?.getAttribute('fetchpriority')).toBe('high');
  expect(host.querySelector('img')?.src).toBe(artwork);expect(host.textContent).not.toContain('Original verified');expect(open).toHaveBeenCalledOnce();
  await act(async()=>finish({...media,files:[{kind:'audio',filename:'Song.mp3',mimeType:'audio/mpeg',bytes:new Uint8Array([1]),payloadDigest:'b'.repeat(64)}]}));
  expect(host.querySelector('.proof-audio-artwork img')?.getAttribute('src')).toBe(artwork);
  expect(host.querySelector('.proof-audio-artwork img')?.getAttribute('loading')).toBe('eager');
  expect(host.querySelector('[aria-label="Play audio"]')).not.toBeNull();expect(play).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('shows public album artwork before opening and keeps controls tied to the verified original audio',async()=>{
 const artwork='https://receiz.com/api/profile/originals/media?receizId=song&slot=audioCover';
 open.mockResolvedValue({...media,files:[{kind:'audio',filename:'Song.mp3',mimeType:'audio/mpeg',bytes:new Uint8Array([1,2,3]),payloadDigest:'b'.repeat(64)}]});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:verified-song');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofMedia source={source} title="Album" artworkUrl={artwork}/>));expect(host.querySelector('img')?.src).toBe(artwork);expect(open).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Original verified');
  await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());expect(host.querySelector('.proof-audio-artwork img')?.getAttribute('src')).toBe(artwork);expect(host.querySelector('audio')?.src).toBe('blob:verified-song');expect(host.querySelector('audio')?.controls).toBe(true);expect(host.querySelector('audio')?.autoplay).toBe(false);
 }finally{act(()=>root.unmount());}
});
it('falls back from broken artwork and never embeds an unsafe artwork URL',()=>{
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofMedia source={source} title="Album" artworkUrl="https://other.example/cover.jpg"/>));expect(host.querySelector('img')).toBeNull();
  act(()=>root.render(<ProofMedia source={source} title="Album" artworkUrl="https://receiz.com/artwork/cover.jpg"/>));expect(host.querySelector('img')).not.toBeNull();act(()=>host.querySelector('img')!.dispatchEvent(new Event('error')));expect(host.querySelector('img')).toBeNull();expect(host.textContent).toContain('Experience the original');
 }finally{act(()=>root.unmount());}
});
it('retains the verified audio position and artwork when moving into full view',async()=>{
 const artwork='https://receiz.com/artwork/cover.jpg';open.mockResolvedValue({...media,files:[{kind:'audio',filename:'Song.mp3',mimeType:'audio/mpeg',bytes:new Uint8Array([1,2,3]),payloadDigest:'b'.repeat(64)}]});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:verified-song');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofMedia source={source} title="Album" artworkUrl={artwork}/>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());const inline=host.querySelector('audio')!;inline.currentTime=42;act(()=>inline.dispatchEvent(new Event('timeupdate')));act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Open full media view"]')!.click());const expanded=host.querySelector<HTMLAudioElement>('audio')!;expect(expanded).toBe(inline);Object.defineProperty(expanded,'duration',{configurable:true,value:180});act(()=>expanded.dispatchEvent(new Event('loadedmetadata')));expect(expanded.currentTime).toBe(42);expect(host.querySelectorAll('audio')).toHaveLength(1);expect(host.querySelector('dialog .proof-audio-artwork img')?.getAttribute('src')).toBe(artwork);
 }finally{act(()=>root.unmount());}
});
it('retains every paragraph without amplifying text into unbounded DOM nodes',async()=>{
 const text='A\n\n'.repeat(5000)+'The end.';open.mockResolvedValue({...media,files:[{...media.files[0],text}]});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofMedia source={source} title="Long essay"/>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());expect(host.querySelector('.proof-reading-text')?.textContent).toBe(text);expect(host.querySelector('.proof-reading-paper')?.querySelectorAll('*')).toHaveLength(1);}finally{act(()=>root.unmount());}
});
it('opens complete media on demand, retains inert document URLs and releases them when closed',async()=>{
 open.mockResolvedValue(media);const url=vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only'),release=vi.spyOn(URL,'revokeObjectURL');
 const host=document.createElement('div'),root=createRoot(host);
 try{act(()=>root.render(<ProofMedia source={source} title="Essay"/>));expect(open).not.toHaveBeenCalled();expect(host.textContent).not.toContain('Original verified');
  await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());expect(host.textContent).toContain('Bound text');expect(host.textContent).toContain('Original verified');
  expect((url.mock.calls[0][0]as Blob).type).toBe('text/plain');expect(host.querySelector('iframe,script')).toBeNull();
 }finally{act(()=>root.unmount());}expect(release).toHaveBeenCalledWith('blob:test-only');
});
it('moves the single reader into its dialog and restores the inline view on close',async()=>{
 open.mockResolvedValue(media);vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<ProofMedia source={source} title="Essay"/>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());expect(host.querySelectorAll('.proof-reading-paper')).toHaveLength(1);expect(host.querySelector('dialog')?.open).toBe(true);
  act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());expect(host.querySelector('dialog')).toBeNull();expect(host.querySelectorAll('.proof-reading-paper')).toHaveLength(1);
 }finally{act(()=>root.unmount());host.remove();}
});
it('closes only the reader when Escape is pressed inside an asset sheet',async()=>{
 open.mockResolvedValue(media);vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const closeSheet=vi.fn(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<Sheet title="Public asset" onClose={closeSheet}><ProofMedia source={source} title="Essay"/></Sheet>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());
  await act(async()=>host.querySelector('.proof-media-dialog')!.dispatchEvent(new Event('cancel',{bubbles:true,cancelable:true})));expect(closeSheet).not.toHaveBeenCalled();expect(host.querySelector('.proof-media-dialog')).toBeNull();expect(host.querySelector<HTMLDialogElement>('.sheet')?.open).toBe(true);
 }finally{act(()=>root.unmount());host.remove();}
});
it('opens complete inert text from a compact preview with the reading control',async()=>{
 const text='First paragraph.\n\n'+('A complete carried paragraph.\n\n'.repeat(80))+'<script>kept as text</script>\n\nThe final paragraph.';
 open.mockResolvedValue({...media,files:[{...media.files[0],filename:'Complete essay.txt',mimeType:'text/plain',text}]});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try{await act(async()=>root.render(<ProofMedia source={source} title="Complete essay"/>));await act(async()=>host.querySelector<HTMLButtonElement>('.proof-object-cover')!.click());
  const read=host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]');expect(read).not.toBeNull();act(()=>read!.click());
  expect(host.querySelector('dialog')?.open).toBe(true);expect(host.querySelector('dialog .proof-reading-text')?.textContent).toBe(text);expect(host.querySelector('dialog script')).toBeNull();
  const paper=host.querySelector<HTMLElement>('dialog .proof-reading-paper')!;expect(paper.style.fontSize).toBe('17px');act(()=>host.querySelector<HTMLButtonElement>('[aria-label="Larger text"]')!.click());expect(paper.style.fontSize).toBe('19px');
 }finally{act(()=>root.unmount());host.remove();}
});
it('reads the separately verified carried essay and restores its small opener on close',async()=>{
 const text='A carried essay.\n\n'+('A full paragraph.\n\n'.repeat(80))+'The end.',reading={title:'A carried essay',text,sha256:'c'.repeat(64),artifactDigest:'d'.repeat(64)};
 open.mockResolvedValue({artifactDigest:source.digest,files:[{...media.files[0],kind:'image',mimeType:'image/png'}],readText:async()=>reading});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 vi.spyOn(HTMLDialogElement.prototype,'showModal').mockImplementation(function(this:HTMLDialogElement){this.open=true;});vi.spyOn(HTMLDialogElement.prototype,'close').mockImplementation(function(this:HTMLDialogElement){this.open=false;});vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host),publicSource={kind:'public' as const,url:'https://receiz.com/api/proof-material/packages/'+'b'.repeat(64)+'/artifact',digest:source.digest,postUrl:'https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',hasLongForm:true};
 try{await act(async()=>root.render(<ProofMedia source={publicSource} title="Object caption"/>));const read=host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!;expect(read).not.toBeNull();read.focus();await act(async()=>read.click());expect(host.querySelector('dialog .proof-reading-text')?.textContent).toBe(text);const paper=host.querySelector<HTMLElement>('dialog .proof-reading-paper')!;paper.scrollTop=120;act(()=>paper.dispatchEvent(new Event('scroll',{bubbles:true})));
  await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Close media"]')!.click());expect(host.querySelector('dialog')).toBeNull();expect(document.activeElement).toBe(read);await act(async()=>read.click());expect(host.querySelector<HTMLElement>('dialog .proof-reading-paper')?.scrollTop).toBe(120);expect(host.querySelector('.proof-carried-reading')?.textContent?.length).toBeLessThan(400);
 }finally{act(()=>root.unmount());host.remove();}
});
it('aborts and discards carried text when the selected post changes even with the same image',async()=>{
 let finish!:(value:unknown)=>void,signal:AbortSignal|undefined;
 open.mockResolvedValue({artifactDigest:source.digest,files:[{...media.files[0],kind:'image',mimeType:'image/png'}],readText:(value:AbortSignal)=>{signal=value;return new Promise(resolve=>{finish=resolve;});}});vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:test-only');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
 const host=document.createElement('div'),root=createRoot(host),publicSource={kind:'public' as const,url:'https://receiz.com/api/proof-material/packages/'+'b'.repeat(64)+'/artifact',digest:source.digest,postUrl:'https://receiz.com/v/20261012_1401/0C19C291/14611069?a=cd412215&ms=1791828092396',hasLongForm:true};
 try{await act(async()=>root.render(<ProofMedia source={publicSource} title="First post"/>));await act(async()=>host.querySelector<HTMLButtonElement>('[aria-label="Read full text"]')!.click());
  act(()=>root.render(<ProofMedia source={{...publicSource,postUrl:publicSource.postUrl.replace('cd412215','deadbeef')}} title="Second post"/>));expect(signal?.aborted).toBe(true);
  await act(async()=>finish({title:'Old essay',text:'Stale private-looking text must not appear.',sha256:'c'.repeat(64),artifactDigest:'d'.repeat(64)}));expect(host.querySelector('dialog')).toBeNull();expect(host.textContent).not.toContain('Stale private-looking');
 }finally{act(()=>root.unmount());}
});

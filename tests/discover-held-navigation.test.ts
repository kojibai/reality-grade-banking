// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {afterEach,expect,it,vi} from 'vitest';
const script=readFileSync('public/learn/discover.js','utf8').replace('export function init','function init').replace('import(page.entry)','importEntry(page.entry)');
afterEach(()=>{document.body.replaceChildren();vi.restoreAllMocks();});
function fixture(){
 history.replaceState({},'','/#market');document.body.innerHTML='<div id="root"><input value="Held wallet"/><nav data-bottom-bar>Held navigation</nav></div><script id="receiz-navigation" type="application/json"></script>';
 const catalog=(title:string)=>({complete:true,observedAt:'2026-11-05T19:00:00Z',items:[{id:title,title}]}),a={generation:'a'.repeat(64),catalog:catalog('Already held Original')},b={generation:'b'.repeat(64),catalog:catalog('New accepted Original')};let current=a;
 const marker=document.getElementById('receiz-navigation')!,page={runtime:'feed',entry:'/assets/feed-held.js',head:'<title>Feed</title><style data-public-page-style="feed">.feedy-page{color:navy}</style>',content:''},pages={'/feed/':page};
 const navigate=vi.fn(),ensure=vi.fn((_page:unknown)=>{const root=document.createElement('div');root.dataset.publicRuntime='feed';root.hidden=true;document.body.append(root);return root;}),mount=vi.fn((root:HTMLElement,held:any)=>{root.textContent='Feed the held collection';expect(held).toBe(current);}),importEntry=vi.fn(async()=>({mountHeldPublicDocument:mount})),fetcher=vi.fn(async()=>new Response(null,{status:503}));
 Object.assign(marker,{pages,navigate,ensurePublicRuntime:ensure,publicMarketDocument:()=>current});
 const install=new Function('document','location','fetch','URL','DOMParser','dispatchEvent','CustomEvent','importEntry',script+';return init;')(document,location,fetcher,URL,DOMParser,dispatchEvent,CustomEvent,importEntry),open=install(pages,navigate);
 return {a,b,page,pages,navigate,ensure,mount,importEntry,fetcher,open,marker,setCurrent:(next:typeof a)=>{current=next;}};
}
it('opens Feed from the exact held catalog without a saved document GET or HEAD',async()=>{
 const f=fixture(),bank=document.getElementById('root'),input=bank!.querySelector('input'),bar=bank!.querySelector('nav');await f.open(new URL('https://bankeiz.com/feed/'));
 expect(f.fetcher).not.toHaveBeenCalled();expect(f.importEntry).toHaveBeenCalledExactlyOnceWith(f.page.entry);expect(f.mount).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement),f.a,'/feed/');expect(f.navigate).toHaveBeenCalledExactlyOnceWith('/feed/');expect(document.getElementById('root')).toBe(bank);expect(bank!.querySelector('input')).toBe(input);expect(bank!.querySelector('nav')).toBe(bar);
});
it('uses the newest accepted family after code loading, without displaying a superseded family',async()=>{
 const f=fixture();let ready!:(value:unknown)=>void;f.importEntry.mockImplementation(()=>new Promise(resolve=>{ready=resolve;}) as any);const opening=f.open(new URL('https://bankeiz.com/feed/'));await Promise.resolve();f.setCurrent(f.b);ready({mountHeldPublicDocument:f.mount});await opening;
 expect(f.mount).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement),f.b,'/feed/');expect(f.fetcher).not.toHaveBeenCalled();expect(f.navigate).toHaveBeenCalledOnce();
});
it('does not download a duplicate Feed document or mount a hidden view on pointer intent',async()=>{
 const f=fixture(),link=document.createElement('a');link.href='/feed/';document.body.append(link);link.dispatchEvent(new Event('pointerover',{bubbles:true}));await Promise.resolve();expect(f.fetcher).not.toHaveBeenCalled();expect(f.importEntry).not.toHaveBeenCalled();expect(f.ensure).not.toHaveBeenCalled();
});
it('keeps the qualified document loader when there is no held complete catalog',async()=>{
 const f=fixture();Object.assign(f.marker,{publicMarketDocument:()=>null});await f.open(new URL('https://bankeiz.com/feed/'));expect(f.fetcher).toHaveBeenCalledExactlyOnceWith('/feed/',expect.objectContaining({credentials:'omit',cache:'no-store'}));expect(f.ensure).not.toHaveBeenCalled();expect(f.mount).not.toHaveBeenCalled();expect(f.navigate).not.toHaveBeenCalled();expect(document.getElementById('public-navigation-status')?.textContent).toContain('Try again');
});
it('does not bypass static code metadata requirements using an unrelated or incomplete catalog',async()=>{
 const f=fixture();f.page.head='';await f.open(new URL('https://bankeiz.com/feed/'));expect(f.fetcher).toHaveBeenCalledOnce();expect(f.importEntry).not.toHaveBeenCalled();expect(f.mount).not.toHaveBeenCalled();
});
it('preserves the accepted Bank family when a different feedy capture has a later display timestamp',async()=>{
 const f=fixture();Object.assign(f.marker,{publicFeedyDocument:()=>({...f.b,catalog:{...f.b.catalog,observedAt:'2026-11-06T19:00:00Z'}})});await f.open(new URL('https://bankeiz.com/feed/'));
 expect(f.mount).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement),f.a,'/feed/');expect(f.fetcher).not.toHaveBeenCalled();
});

it.each([['feed','/feed/'],['explore','/explore/'],['explore','/explore/images/']])('reuses held %s data for first navigation to %s without opening another document',async(runtime,path)=>{
 const f=fixture();Object.assign(f.a,{capitalization:{},history:{},format:{locale:'en-US',timeZone:'UTC'}});Object.assign(f.page,{runtime,entry:`/assets/${runtime}-held.js`});(f.pages as Record<string,unknown>)[path]=f.page;await f.open(new URL('https://bankeiz.com'+path));expect(f.fetcher).not.toHaveBeenCalled();expect(f.mount).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement),f.a,path);expect(f.navigate).toHaveBeenCalledExactlyOnceWith(path);
});
it('does not treat an Originals-only Feed catalog as an already-held complete Market family',async()=>{
 const f=fixture();Object.assign(f.page,{runtime:'explore',entry:'/assets/explore-held.js'});(f.pages as Record<string,unknown>)['/explore/']=f.page;await f.open(new URL('https://bankeiz.com/explore/'));expect(f.fetcher).toHaveBeenCalledOnce();expect(f.mount).not.toHaveBeenCalled();
});
it('uses the canonical retained Explorer root for a first category destination',async()=>{
 const f=fixture();Object.assign(f.a,{capitalization:{},history:{},format:{locale:'en-US',timeZone:'UTC'}});Object.assign(f.page,{runtime:'explore',entry:'/assets/explore-held.js'});const category={...f.page,head:'<title>Images</title>'};Object.assign(f.pages,{'/explore/':f.page,'/explore/images/':category});f.ensure.mockImplementation(page=>{expect(page).toBe(f.page);const root=document.createElement('div');root.dataset.publicRuntime='explore';document.body.append(root);return root;});await f.open(new URL('https://bankeiz.com/explore/images/'));expect(f.fetcher).not.toHaveBeenCalled();expect(f.ensure).toHaveBeenCalledExactlyOnceWith(f.page);expect(f.mount).toHaveBeenCalledExactlyOnceWith(expect.any(HTMLElement),f.a,'/explore/images/');
});

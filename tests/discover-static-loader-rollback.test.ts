// @vitest-environment node
import {readFileSync} from 'node:fs';
import {Window} from 'happy-dom';
import {afterEach,expect,it,vi} from 'vitest';
const script=readFileSync('public/learn/discover.js','utf8').replace('export function init','function init').replace('import(page.entry)','importEntry(page.entry)');
const windows:Window[]=[];
const descriptor={runtime:'discover',title:'Discover | Bankeiz',head:'<title>Discover | Bankeiz</title>',content:'<main><h1>Discover</h1><input value="Held search"></main><script id="public-discovery-seed" type="application/json">[]</script>',entry:'/assets/discover-static.js'};
function fixture(pages:Record<string,any>={},fetcher=vi.fn<typeof fetch>(async()=>Response.json(descriptor))){
 const window=new Window({url:'https://bankeiz.com/#market'});windows.push(window);const document=window.document;
 document.body.innerHTML='<div id="root"><input value="Held Bank"><nav>Held bar</nav></div><script id="receiz-navigation"></script><a href="/discover/#essays">Discover</a>';
 const location={href:'https://bankeiz.com/#market',assign:vi.fn()},navigate=vi.fn(),mount=vi.fn(),importEntry=vi.fn(async()=>({mountHeldPublicDocument:mount})),ensure=vi.fn();
 const marker=document.getElementById('receiz-navigation');Object.assign(marker!,{pages,navigate,ensurePublicRuntime:ensure,publicMarketDocument:()=>null});
 const install=new Function('document','location','fetch','URL','DOMParser','dispatchEvent','CustomEvent','importEntry',script+';return init;')(document,location,fetcher,URL,window.DOMParser,window.dispatchEvent.bind(window),window.CustomEvent,importEntry);
 return{document,window,location,pages,navigate,fetcher,ensure,mount,importEntry,open:install(pages,navigate)};
}
afterEach(()=>{for(const window of windows.splice(0)){window.happyDOM.abort();window.close();}});
it('loads the old static descriptor without a Bank family, Source request or prepared-document receipt',async()=>{
 const f=fixture(),bank=f.document.getElementById('root'),input=bank!.querySelector('input');await f.open(new URL('https://bankeiz.com/discover/#essays'));
 expect(f.fetcher).toHaveBeenCalledExactlyOnceWith('/discover/navigation.json',expect.objectContaining({credentials:'omit',redirect:'error',signal:expect.any(AbortSignal)}));
 expect(f.navigate).toHaveBeenCalledExactlyOnceWith('/discover/#essays');expect(f.pages['/discover/']).toEqual(descriptor);expect(f.location.assign).not.toHaveBeenCalled();expect(f.importEntry).not.toHaveBeenCalled();expect(f.ensure).not.toHaveBeenCalled();expect(f.document.getElementById('root')).toBe(bank);expect(bank!.querySelector('input')).toBe(input);
 const held=f.pages['/discover/'];await f.open(new URL('https://bankeiz.com/discover/'));expect(f.pages['/discover/']).toBe(held);expect(f.fetcher).toHaveBeenCalledOnce();
});
it('navigates the exact carried descriptor immediately without loading JSON, mounting hidden roots or consulting a Bank family',async()=>{
 const page={...descriptor},f=fixture({'/discover/':page});Object.assign(f.document.getElementById('receiz-navigation')!,{publicMarketDocument:()=>{throw Error('no family gate');}});
 const result=f.open(new URL('https://bankeiz.com/discover/'));expect(f.navigate).toHaveBeenCalledExactlyOnceWith('/discover/');await result;
 expect(f.pages['/discover/']).toBe(page);expect(f.fetcher).not.toHaveBeenCalled();expect(f.importEntry).not.toHaveBeenCalled();expect(f.ensure).not.toHaveBeenCalled();
});
it('warms one cached static intent on pointer/focus, then reuses it for a click without a hidden runtime import',async()=>{
 let resolve!:(r:Response)=>void;const f=fixture({},vi.fn(()=>new Promise<Response>(done=>{resolve=done;}))),link=f.document.querySelector('a')!;
 link.dispatchEvent(new f.window.Event('pointerover',{bubbles:true}));link.dispatchEvent(new f.window.Event('focusin',{bubbles:true}));
 const opening=f.open(new URL('https://bankeiz.com/discover/#essays'));expect(f.fetcher).toHaveBeenCalledOnce();expect(f.fetcher.mock.calls[0]?.[0]).toBe('/discover/navigation.json');expect(f.navigate).not.toHaveBeenCalled();expect(f.importEntry).not.toHaveBeenCalled();expect(f.ensure).not.toHaveBeenCalled();
 resolve(Response.json(descriptor));await opening;expect(f.navigate).toHaveBeenCalledExactlyOnceWith('/discover/#essays');
});
it.each([
 ['bad status',()=>new Response(null,{status:503})],
 ['overlength header',()=>Response.json(descriptor,{headers:{'content-length':'600001'}})],
 ['overlength text',()=>new Response(' '.repeat(600001))],
 ['wrong runtime',()=>Response.json({...descriptor,runtime:'feed'})],
 ['wrong entry',()=>Response.json({...descriptor,entry:'https://other.example/discover.js'})],
 ['missing seed',()=>Response.json({...descriptor,content:'<main>Incomplete</main>'})],
])('uses the original native navigation fallback for %s',async(_name,response)=>{
 const f=fixture({},vi.fn(async()=>response()));await f.open(new URL('https://bankeiz.com/discover/#essays'));
 expect(f.location.assign).toHaveBeenCalledExactlyOnceWith('https://bankeiz.com/discover/#essays');expect(f.navigate).not.toHaveBeenCalled();expect(f.ensure).not.toHaveBeenCalled();expect(f.document.getElementById('public-navigation-status')).toBeNull();
});

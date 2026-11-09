// @vitest-environment node
import {readFileSync} from 'node:fs';
import {Window,type HTMLAnchorElement,type HTMLDivElement} from 'happy-dom';
import {afterEach,expect,it,vi} from 'vitest';
const source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];
const windows:Window[]=[];
afterEach(()=>{for(const window of windows.splice(0)){window.happyDOM.abort();window.close();}});
function setup(from='https://bankeiz.com/#market',settled=true,module:Record<string,unknown>={}){
 const window=new Window({url:from,settings:{disableCSSFileLoading:true,disableIframePageLoading:true}});windows.push(window);window.scrollTo=()=>{};
 const {document}=window,load=vi.fn(async(_entry:string)=>module),fetcher=vi.fn();Object.assign(window,{__navigationImport:load,fetch:fetcher});
 const pages=Object.fromEntries(['discover','explore','feed'].map(runtime=>['/'+runtime+'/',{runtime,entry:'/'+runtime+'.js',title:runtime,head:'<title>'+runtime+'</title><link rel="canonical" href="https://bankeiz.com/'+runtime+'/">',content:'<main><h1>'+runtime+'</h1><a href="/">Return to wallet</a></main>'}]));
 document.head.innerHTML='<title>Bank</title><link rel="canonical" href="'+(settled?'https://bankeiz.com/':'https://bankeiz.com/discover/')+'">';
 document.body.innerHTML=settled?'<div id="root"><main class="main-panel"><h1>Held wallet</h1><input value="retained state"><a href="/asset/synthetic-original/">Open asset</a></main><nav class="bottom-nav">Held Bank navigation</nav></div>':'<div id="public-discover-root" data-public-runtime="discover">'+pages['/discover/'].content+'</div>';
 const marker=document.createElement('script');marker.id='receiz-navigation';marker.type='application/json';marker.textContent=JSON.stringify({pages,bank:{entry:'/private-bank.js',styles:['/bank.css'],css:{'/bank.css':'.bottom-nav{display:grid}.main-panel{animation:reveal .2s}html.public-navigation-instant .main-panel{animation:none}'},head:'<title>Bank</title>',content:'<main class="account-opening">Existing Bank opening</main>'}});document.body.append(marker);
 const registered=vi.spyOn(document,'addEventListener');window.eval(source.replaceAll('import(','window.__navigationImport('));
 const clickListeners=registered.mock.calls.filter(([type])=>type==='click').length;registered.mockRestore();
 const api=marker as unknown as {navigate(target:string):void;pages:Record<string,{runtime?:string;entry?:string;head?:string;content?:string}>;ensurePublicRuntime(page:Record<string,unknown>):HTMLDivElement|undefined};
 return{window,document,api,load,fetcher,clickListeners,root:document.querySelector<HTMLDivElement>('#root'),input:document.querySelector('input'),bottom:document.querySelector('.bottom-nav')};
}
it.each(['#market','#assets','#account/profile','?retained=1#market'])('returns from shared lazy Discover navigation to the same retained Bank %s URL and nodes',async suffix=>{
 const f=setup('https://bankeiz.com/'+suffix),doc=f.document;
 // The saved-document intent loader calls this SAME retained-router function,
 // bypassing the ordinary anchor handler. Only module loading is substituted.
 f.api.navigate('/discover/');await Promise.resolve();
 expect(f.window.location.pathname).toBe('/discover/');expect(f.root?.hidden).toBe(true);
 doc.querySelector<HTMLAnchorElement>('[data-public-runtime="discover"] a')!.click();await Promise.resolve();
 expect(f.window.location.href).toBe('https://bankeiz.com/'+suffix);expect(f.document).toBe(doc);
 expect(doc.getElementById('root')).toBe(f.root);expect(f.root?.hidden).toBe(false);expect(f.root?.hasAttribute('inert')).toBe(false);
 expect(f.root?.querySelector('input')).toBe(f.input);expect(f.input?.getAttribute('value')).toBe('retained state');expect(f.root?.querySelector('.bottom-nav')).toBe(f.bottom);expect(f.bottom?.isConnected).toBe(true);
 expect(f.window.getComputedStyle(f.root!.querySelector('.main-panel')!).animation).toBe('none');expect(f.load.mock.calls.map(([entry])=>entry)).toEqual(['/discover.js']);expect(f.fetcher).not.toHaveBeenCalled();
});
it('preserves the existing ordinary standalone asset return path and retained Bank navigation',async()=>{
 const f=setup('https://bankeiz.com/#assets');f.document.querySelector<HTMLAnchorElement>('#root a')!.click();await Promise.resolve();
 expect(f.window.location.pathname).toBe('/asset/synthetic-original/');expect(f.window.history.state).toMatchObject({assetReturnPath:'/#assets'});
 const root=f.document.querySelector('[data-public-runtime="explore"]')!,back=f.document.createElement('a');back.href='/';back.textContent='Wallet';root.append(back);back.click();await Promise.resolve();
 expect(f.window.location.hash).toBe('#assets');expect(f.document.getElementById('root')).toBe(f.root);expect(f.root?.querySelector('.bottom-nav')).toBe(f.bottom);expect(f.load.mock.calls.map(([entry])=>entry)).toEqual(['/explore.js']);expect(f.fetcher).not.toHaveBeenCalled();
});
it('keeps genuine cold public entry distinct and loads the existing Bank once on first return',async()=>{
 const f=setup('https://bankeiz.com/discover/',false);expect(f.root).toBeNull();
 f.document.querySelector<HTMLAnchorElement>('#public-discover-root a')!.click();await Promise.resolve();await Promise.resolve();
 expect(f.window.location.pathname).toBe('/');expect(f.load).toHaveBeenCalledExactlyOnceWith('/private-bank.js');expect(f.document.querySelector('.account-opening')?.textContent).toBe('Existing Bank opening');expect(f.fetcher).not.toHaveBeenCalled();
});

it('registers one hidden known public root without touching Bank or importing, then explicitly mounts it once through the retained runtime loader',async()=>{
 const mount=vi.fn(),f=setup('https://bankeiz.com/#assets',true,{mountPublicDocument:mount}),page=f.api.pages['/discover/'];
 expect(typeof f.api.ensurePublicRuntime).toBe('function');const root=f.api.ensurePublicRuntime(page)!;
 expect(root).not.toBe(f.root);expect(root.id).toBe('public-discover-root');expect(root.dataset.publicRuntime).toBe('discover');expect(root.hidden).toBe(true);expect(root.hasAttribute('inert')).toBe(true);
 expect(f.api.ensurePublicRuntime(page)).toBe(root);expect(f.document.querySelectorAll('[data-public-runtime="discover"]')).toHaveLength(1);expect(f.root?.hidden).toBe(false);expect(f.root?.querySelector('.bottom-nav')).toBe(f.bottom);expect(f.load).not.toHaveBeenCalled();expect(mount).not.toHaveBeenCalled();
 f.api.navigate('/discover/');await Promise.resolve();await Promise.resolve();expect(root.hidden).toBe(false);expect(mount).toHaveBeenCalledExactlyOnceWith(root);expect(f.load).toHaveBeenCalledExactlyOnceWith('/discover.js');
 root.querySelector('a')!.click();await Promise.resolve();f.api.navigate('/discover/');await Promise.resolve();expect(f.document.getElementById(root.id)).toBe(root);expect(f.load).toHaveBeenCalledOnce();expect(mount).toHaveBeenCalledOnce();expect(f.fetcher).not.toHaveBeenCalled();
});
it('refuses caller-created runtime descriptors rather than registering arbitrary markup or replacing Bank',()=>{
 const f=setup(),before=f.root!.innerHTML;
 expect(typeof f.api.ensurePublicRuntime).toBe('function');expect(f.api.ensurePublicRuntime({...f.api.pages['/discover/'],content:'<main>Caller markup</main>'})).toBeUndefined();expect(f.api.ensurePublicRuntime({runtime:'unknown',entry:'/unknown.js',content:'caller'})).toBeUndefined();
 expect(f.document.querySelector('[data-public-runtime]')).toBeNull();expect(f.document.getElementById('root')).toBe(f.root);expect(f.root!.innerHTML).toBe(before);expect(f.load).not.toHaveBeenCalled();expect(f.fetcher).not.toHaveBeenCalled();
});

it('uses one shared document click path and preserves ignored native-link intents without starting work',()=>{
 const f=setup();expect(f.clickListeners).toBe(1);
 for(const intent of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{href:'https://external.invalid/discover/'},{href:'/discover/?query=1'},{href:'/api/native'},{target:'_blank'},{download:'fixture'}]){
  const link=f.document.createElement('a');link.href='href'in intent?intent.href!:'/discover/';if('target'in intent)link.target=intent.target!;if('download'in intent)link.download=intent.download!;f.root!.append(link);
  let intercepted=true;f.document.addEventListener('click',event=>{intercepted=event.defaultPrevented;event.preventDefault();},{once:true});
  link.dispatchEvent(new f.window.MouseEvent('click',{bubbles:true,cancelable:true,...intent}));expect(intercepted).toBe(false);link.remove();
 }
 expect(f.window.location.hash).toBe('#market');expect(f.document.getElementById('root')).toBe(f.root);expect(f.load).not.toHaveBeenCalled();expect(f.fetcher).not.toHaveBeenCalled();
});

it('exposes hidden registration only for the three existing public catalog runtimes',()=>{const f=setup();for(const runtime of ['explore','feed','discover']){const root=f.api.ensurePublicRuntime(f.api.pages['/'+runtime+'/'])!;expect(root.dataset.publicRuntime).toBe(runtime);expect(root.hidden).toBe(true);expect(root.hasAttribute('inert')).toBe(true);}expect(f.document.getElementById('root')).toBe(f.root);expect(f.root?.hidden).toBe(false);expect(f.load).not.toHaveBeenCalled();expect(f.fetcher).not.toHaveBeenCalled();});

it('reveals the actual held profile after its one code startup, never the synthetic Profile frame',async()=>{
 const f=setup(),mount=vi.fn((root:HTMLDivElement)=>{root.innerHTML='<main><h1>Actual held profile</h1><img src="data:image/png;base64,held"></main>';});
 let ready!:(module:{mountPublicDocument:typeof mount})=>void;f.load.mockReturnValue(new Promise(resolve=>{ready=resolve;}));
 f.api.navigate('/new_account/');const root=f.document.querySelector<HTMLDivElement>('#public-explore-root')!;
 expect(root.hidden).toBe(true);expect(f.root?.hidden).toBe(false);expect(f.document.getElementById('root')).toBe(f.root);expect(f.load).toHaveBeenCalledExactlyOnceWith('/explore.js');
 ready({mountPublicDocument:mount});await vi.waitFor(()=>expect(root.hidden).toBe(false));
 expect(root.querySelector('h1')?.textContent).toBe('Actual held profile');expect(root.querySelector('.public-entry-placeholder')).toBeNull();expect(f.root?.hidden).toBe(true);expect(f.fetcher).not.toHaveBeenCalled();expect(mount).toHaveBeenCalledOnce();
});

it('keeps a later selected destination when an earlier profile module finishes',async()=>{
 const f=setup(),mount=vi.fn((root:HTMLDivElement)=>{root.innerHTML='<main>Held profile</main>';});let ready!:(module:{mountPublicDocument:typeof mount})=>void;
 f.load.mockReturnValue(new Promise(resolve=>{ready=resolve;}));f.api.navigate('/new_account/');f.api.navigate('/#assets');
 ready({mountPublicDocument:mount});await vi.waitFor(()=>expect(mount).toHaveBeenCalledOnce());await Promise.resolve();
 expect(f.window.location.href).toBe('https://bankeiz.com/#assets');expect(f.root?.hidden).toBe(false);expect(f.document.querySelector<HTMLDivElement>('#public-explore-root')?.hidden).toBe(true);expect(f.fetcher).not.toHaveBeenCalled();
});

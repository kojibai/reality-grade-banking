// @vitest-environment node
import {readFileSync} from 'node:fs';
import {Window,type HTMLStyleElement as TestStyleElement} from 'happy-dom';
import {afterEach,expect,it,vi} from 'vitest';
import {compactNavigation} from '../scripts/compact-navigation.mjs';
import {bankOwnedStyles} from '../scripts/public-bank-styles.mjs';

const windows:Window[]=[],router='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];
const allStyles=['/assets/bank.css','/assets/host.css','/assets/sheet.css','/assets/opening.css'];
const manifest={host:{name:'PublicAssetTradeHost',file:'assets/host.js',css:['assets/host.css'],imports:['sheet','opening'],dynamicImports:['privateLazy']},sheet:{file:'assets/sheet.js',css:['assets/sheet.css'],imports:['react']},opening:{file:'assets/opening.js',css:['assets/opening.css']},react:{file:'assets/react.js'},privateLazy:{file:'assets/private.js',css:['assets/private.css']}};
const css={'/assets/bank.css':'.console{display:grid}.bottom-nav{height:82px}', '/assets/host.css':readFileSync('src/components/form-controls.css','utf8')+readFileSync('src/features/deposit/deposit.css','utf8')+readFileSync('src/public-explorer/public-asset-trade.css','utf8'),'/assets/sheet.css':readFileSync('src/components/sheet-navigation.css','utf8'),'/assets/opening.css':'.inline-opening{display:flex}'};
const controls='<dialog open class="sheet"><div class="sheet-body"><fieldset class="native-operation-fields"><label class="form-field"><span>Amount</span><div class="amount-input large"><input value="100"></div></label><button class="primary-button">Review</button></fieldset></div></dialog>';
async function navigation(){
 const script=readFileSync('scripts/build-public-pages.mjs','utf8'),line=(name:string)=>script.split('\n').find(line=>line.startsWith('const '+name+' '))!;
 let privateBankStyles=allStyles;
 const declaration=line('privateBankStyles');
 if(declaration){const {bankOwnedStyles}=await import('../scripts/public-bank-styles.mjs');privateBankStyles=new Function('bankStyles','styleManifest','bankOwnedStyles',declaration+';return privateBankStyles;')(allStyles,manifest,bankOwnedStyles);}
 const pages={'/feed/':{runtime:'feed',entry:'/feed.js',title:'Feed',head:'<title>Feed</title><style data-public-page-style="feed">.feed-scroll{display:block}</style>',content:'<main class="feed-scroll">Retained Feed'+controls+'<a href="/">Return</a></main>'}};
 const text=new Function('compactNavigation','feedState','publicPages','publicRouteAliases','bankHead','bankEntry','bankStyles','privateBankStyles','bankCss','bankContent','exampleBanks',line('bundle')+';return bundle;')(compactNavigation,{profileNames:[]},pages,{},'<title>Bank</title>','/bank.js',allStyles,privateBankStyles,css,'<main class="console">Held Bank'+controls+'</main><nav class="bottom-nav">Bank navigation</nav>',{shared:''});
 return{pages,text,privateBankStyles};
}
async function setup(coldPublic=false){
 const data=await navigation(),window=new Window({url:coldPublic?'https://bankeiz.com/feed/':'https://bankeiz.com/#market',settings:{disableCSSFileLoading:true,disableIframePageLoading:true}});windows.push(window);window.scrollTo=()=>{};
 const document=window.document;document.head.innerHTML=coldPublic?data.pages['/feed/'].head:'<title>Bank</title>'+Object.entries(css).map(([url,text])=>`<style data-bank-stylesheet="${url}">${text}</style>`).join('');
 document.body.innerHTML=(coldPublic?'<div id="public-feed-root" data-public-runtime="feed">'+data.pages['/feed/'].content+'</div>':'<div id="root"><input value="Retained draft"><nav class="bottom-nav">Held nav</nav></div>')+data.text;
 const load=vi.fn(async()=>({mountPublicDocument:(root:HTMLElement)=>{if(root.dataset.publicRuntime==='feed'&&!root.firstChild)root.innerHTML=data.pages['/feed/'].content;}})),fetcher=vi.fn();Object.assign(window,{__navigationImport:load,fetch:fetcher});window.eval(router.replaceAll('import(','window.__navigationImport('));
 const api=document.getElementById('receiz-navigation') as unknown as{navigate(path:string):void};return{window,document,api,load,fetcher,...data};
}
afterEach(()=>{for(const window of windows.splice(0)){window.happyDOM.abort();window.close();}});

it('uses only the named Host static stylesheet closure, preserving private lazy resources and original ordering',()=>{
 expect(bankOwnedStyles([...allStyles,'/assets/private.css'],manifest)).toEqual(['/assets/bank.css','/assets/private.css']);
 expect(()=>bankOwnedStyles(allStyles,{...manifest,host:{...manifest.host,imports:['missing']}})).toThrow('PUBLIC_TRADE_STYLE_IMPORT_INVALID');
 expect(()=>bankOwnedStyles(allStyles,{...manifest,secondHost:manifest.host})).toThrow('PUBLIC_TRADE_STYLE_ENTRY_INVALID');
 expect(()=>bankOwnedStyles(allStyles,{...manifest,host:{...manifest.host,css:['../private.css']}})).toThrow('PUBLIC_TRADE_STYLESHEET_INVALID');
});

it('keeps the shared profile creator styles public while suspending unrelated Bank styles',()=>{
 const creator={name:'AssetCreationSheet',file:'assets/creator.js',css:['assets/creator.css'],imports:['sheet']};
 expect(bankOwnedStyles([...allStyles,'/assets/creator.css','/assets/private.css'],{...manifest,creator})).toEqual(['/assets/bank.css','/assets/private.css']);
});

it('keeps the already loaded Host closure enabled through the actual Bank→Feed router even when its module is cached',async()=>{
 const f=await setup(),bank=f.document.getElementById('root'),input=bank!.querySelector('input'),hostStyle=f.document.querySelector<TestStyleElement>('style[data-bank-stylesheet="/assets/host.css"]');
 f.api.navigate('/feed/');await Promise.resolve();
 expect(hostStyle?.media).not.toBe('not all');expect(f.document.querySelector<TestStyleElement>('style[data-bank-stylesheet="/assets/bank.css"]')?.media).toBe('not all');
 await Promise.resolve();const feed=f.document.getElementById('public-feed-root'),scroller=feed!.querySelector('.feed-scroll'),dialog=feed!.querySelector('dialog');expect(dialog?.hasAttribute('open')).toBe(true);
 f.window.dispatchEvent(new f.window.Event('visibilitychange'));expect(hostStyle?.media).not.toBe('not all');
 f.api.navigate('/');await Promise.resolve();f.api.navigate('/feed/');await Promise.resolve();
 expect(f.document.getElementById('root')).toBe(bank);expect(bank!.querySelector('input')).toBe(input);expect(feed!.querySelector('.feed-scroll')).toBe(scroller);expect(feed!.querySelector('dialog')).toBe(dialog);expect(hostStyle?.media).not.toBe('not all');expect(f.document.querySelectorAll('style[data-bank-stylesheet="/assets/host.css"]')).toHaveLength(1);expect(f.load.mock.calls).toHaveLength(1);expect(f.fetcher).not.toHaveBeenCalled();
});
it('still injects every required Bank stylesheet on the first return from a cold public entry, then retains public component styles',async()=>{
 const f=await setup(true);expect(f.document.querySelector('style[data-bank-stylesheet="/assets/host.css"]')).toBeNull();f.api.navigate('/');await Promise.resolve();
 const host=f.document.querySelector<TestStyleElement>('style[data-bank-stylesheet="/assets/host.css"]');expect(host?.textContent).toBe(css['/assets/host.css']);expect(host?.media).not.toBe('not all');f.api.navigate('/feed/');await Promise.resolve();expect(host?.media).not.toBe('not all');expect(f.document.querySelector<TestStyleElement>('style[data-bank-stylesheet="/assets/bank.css"]')?.media).toBe('not all');expect(f.fetcher).not.toHaveBeenCalled();
});

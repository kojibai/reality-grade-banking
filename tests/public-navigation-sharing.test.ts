// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {compactNavigation} from '../scripts/compact-navigation.mjs';

it('carries repeated page CSS once while preserving every exact head, content and alias',()=>{
 const style='<style data-public-page-style="shared">'+'.shared{color:navy}'.repeat(400)+'</style>';
 const pages=Object.fromEntries(Array.from({length:40},(_,i)=>['/guide-'+i+'/',{title:'Guide '+i,head:'<title>Guide '+i+'</title>'+style,content:'<main>Complete guide '+i+'</main>'}]));
 const original={pages,aliases:{'/guide/':'/guide-0/'},bank:{head:'<title>Account</title>',entry:'/bank.js',styles:[]}};
 const packed=compactNavigation(original),decoded=structuredClone(packed);
 expect(packed.styles).toEqual([style]);expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(original).length/5);
 for(const page of Object.values(decoded.pages) as {head:unknown}[])if(Array.isArray(page.head))page.head=page.head.map(part=>typeof part==='number'?decoded.styles[part]:part).join('');
 const {styles,...expanded}=decoded;expect(styles).toEqual([style]);expect(expanded).toEqual(original);expect(original.pages['/guide-0/'].head).toBe('<title>Guide 0</title>'+style);
});

it('carries repeated navigation markup once and reproduces every exact destination only when used',()=>{
 const repeated='<a class="shared-navigation-link" href="/learn/">Explore your value &amp; history</a>';
 const original={pages:Object.fromEntries(Array.from({length:40},(_,i)=>['/page-'+i+'/',{title:'Page '+i,head:'<title>'+i+'</title>',content:'<main>'+repeated.repeat(15)+'<p>Unique '+i+' — &lt;script&gt;</p></main>'}])),bank:{head:'',styles:[],entry:'/bank.js',content:repeated}};
 const packed=compactNavigation(original);
 expect(JSON.stringify(packed).length).toBeLessThan(JSON.stringify(original).length*.6);
 for(const [path,page]of Object.entries(packed.pages)){
  expect(Array.isArray(page.content)).toBe(true);
  const content=Array.isArray(page.content)?page.content.map(part=>typeof part==='number'?packed.styles[part]:part).join(''):page.content;
  expect(content).toBe(original.pages[path as keyof typeof original.pages].content);
 }
 expect(original.bank.content).toBe(repeated);
});

it('reuses carried styles across navigation without another request or replacing the account',()=>{
 document.body.innerHTML='<div id="root"><input value="retained"><a href="/learn/">Learn</a></div>';
 const root=document.getElementById('root'),input=root!.querySelector('input');
 const style='<style data-public-page-style="shared">.shared{color:navy}</style>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';
 data.textContent=JSON.stringify(compactNavigation({pages:{
  '/learn/':{head:'<title>Learn</title>'+style,content:'<main class="shared public-navigation-test-retained-layout"><h1>Learn</h1><a href="/learn/guide/">Guide</a></main>'},
  '/learn/guide/':{head:'<title>Guide</title>'+style,content:'<main class="shared public-navigation-test-retained-layout"><h1>Guide</h1><a href="/">Account</a></main>'}
 },bank:{head:'<title>Account</title>',styles:[],entry:'/unused.js'}}));document.body.append(data);
 history.replaceState({},'','/#account');const scroll=vi.spyOn(window,'scrollTo').mockImplementation(()=>{}),fetcher=vi.spyOn(globalThis,'fetch');
 try{
  const source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];
  new Function('window','document','location','history','scrollTo','Event','URL',source)(window,document,location,history,scroll,Event,URL);
  expect(data.isConnected).toBe(true);expect(data.textContent).toBe('');
  // Reusing a retained entry must neither parse the empty marker nor install
  // another router. Receipts also use this marker for document-free Back.
  expect(()=>new Function('window','document','location','history','scrollTo','Event','URL',source)(window,document,location,history,scroll,Event,URL)).not.toThrow();
  root!.querySelector('a')!.click();
  expect(document.title).toBe('Learn');expect(document.head.querySelector('[data-public-page-style="shared"]')?.textContent).toBe('.shared{color:navy}');
  document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();
  expect(document.title).toBe('Guide');expect(document.head.querySelector('[data-public-page-style="shared"]')?.textContent).toBe('.shared{color:navy}');
  document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();
  expect(root!.hidden).toBe(false);expect(root!.querySelector('input')).toBe(input);expect(input!.value).toBe('retained');expect(fetcher).not.toHaveBeenCalled();
 }finally{scroll.mockRestore();fetcher.mockRestore();}
});

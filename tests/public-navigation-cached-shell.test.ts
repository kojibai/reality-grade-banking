// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
it('renders a deep-linked guide from its cached Learn shell without fetching a replacement document',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){}}));
 vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 const request=vi.fn();vi.stubGlobal('fetch',request);
 history.replaceState({},'','/standards/');
 document.head.innerHTML='<title>Learn</title><link rel="canonical" href="https://bankeiz.com/learn/">';
 document.body.innerHTML='<div id="public-learn-root"><header class="learn-header">Bankeiz</header><main><h1>Learn shell</h1></main></div>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';
 data.textContent=JSON.stringify({pages:{'/standards/':{content:'<header class="learn-header">Bankeiz</header><main><h1>Proof-native economic standards</h1></main>',head:'<title>Standards</title><link rel="canonical" href="https://bankeiz.com/standards/">'}},bank:{head:'',styles:[],entry:'/unused.js'}});document.body.append(data);
 try{
  new Function(readFileSync('public/learn/learn.js','utf8'))();
  expect(document.querySelector('h1')?.textContent).toBe('Proof-native economic standards');
  expect(document.title).toBe('Standards');expect(location.pathname).toBe('/standards/');
  expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://bankeiz.com/standards/');
  expect(request).not.toHaveBeenCalled();
 }finally{vi.unstubAllGlobals();vi.restoreAllMocks();document.documentElement.className='';}
});

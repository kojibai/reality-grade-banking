// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
it('reveals the next preloaded marketing page synchronously without waiting for an observer',()=>{
 const observer=class{observe(){}unobserve(){}disconnect(){}};
 vi.stubGlobal('IntersectionObserver',observer);vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){}}));vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 document.body.innerHTML='<div id="root"><a href="/learn/">Learn</a></div>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';data.textContent=JSON.stringify({pages:{'/learn/':{content:'<header class="learn-header">Bankeiz</header><main><h1 class="reveal">Ready immediately</h1></main>',head:'<title>Learn</title>'}},bank:{styles:[],head:'<title>Bank</title>',entry:'/unused.js'}});document.body.append(data);history.replaceState({},'', '/');
 try{
  new Function(readFileSync('public/learn/learn.js','utf8'))();
  document.querySelector<HTMLAnchorElement>('#root a')!.click();
  expect(location.pathname).toBe('/learn/');expect(document.querySelector('h1')?.classList.contains('visible')).toBe(true);expect(document.documentElement.classList.contains('public-navigation-instant')).toBe(true);
 }finally{vi.unstubAllGlobals();vi.restoreAllMocks();document.documentElement.className='';}
});

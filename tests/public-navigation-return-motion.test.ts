// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {scopeLearnCss} from '../scripts/scope-learn-css.mjs';

it('returns to the retained bank panel at full opacity without restarting its entrance animation',()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){}}));vi.spyOn(window,'scrollTo').mockImplementation(()=>{});
 history.replaceState({},'','/');
 document.head.innerHTML='<title>Bank</title>';
 for(const [path,scope] of [['src/styles/app.css',false],['public/learn/learn.css',true]] as const){const style=document.createElement('style'),css=readFileSync(path,'utf8');style.textContent=scope?scopeLearnCss(css):css;document.head.append(style);}
 document.body.innerHTML='<div id="root"><main class="main-panel"><h1>Market</h1><input value="retained search"><a href="/learn/">Learn</a></main></div>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';data.textContent=JSON.stringify({pages:{'/learn/':{content:'<main><h1>Learn</h1><a href="/">Return</a></main>',head:'<title>Learn</title>'}},bank:{styles:[],head:'<title>Bank</title>',entry:'/unused.js'}});document.body.append(data);
 const main=document.querySelector('main')!,input=document.querySelector('input')!;
 try{
  new Function(readFileSync('public/learn/learn.js','utf8'))();
  document.querySelector<HTMLAnchorElement>('#root a')!.click();
  document.querySelector<HTMLAnchorElement>('#public-learn-root a')!.click();
  expect(document.getElementById('root')?.hidden).toBe(false);expect(document.querySelector('#root main')).toBe(main);expect(main.querySelector('input')).toBe(input);
  expect(getComputedStyle(main).animation).toBe('none');
 }finally{vi.unstubAllGlobals();vi.restoreAllMocks();document.documentElement.className='';}
});

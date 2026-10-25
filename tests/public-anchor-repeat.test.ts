// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {togetherContent} from '../scripts/together-page.mjs';

it('repeats an explicit conversation jump without replacing the conversation or adding history',()=>{
 history.replaceState({},'','/together/#conversation');
 document.head.innerHTML='<title>Together</title><link rel="canonical" href="https://bankeiz.com/together/">';
 const content=togetherContent();
 document.body.innerHTML='<div id="root" hidden><input value="retained account"></div><div id="public-learn-root">'+content+'</div>';
 const data=document.createElement('script');data.id='receiz-navigation';data.type='application/json';
 data.textContent=JSON.stringify({pages:{'/together/':{content,head:document.head.innerHTML}},bank:{head:'<title>Bank</title>',styles:[],entry:'/unused.js'}});document.body.append(data);
 const conversation=document.getElementById('conversation')!,draft=conversation.querySelector<HTMLTextAreaElement>('textarea')!,header=document.querySelector('.learn-header'),account=document.getElementById('root');
 draft.value='Keep this unsent question';
 const scroll=vi.spyOn(conversation,'scrollIntoView').mockImplementation(()=>{}),pageChange=vi.fn();
 window.addEventListener('receiz-learn:page',pageChange);
 const source='// All public guides'+readFileSync('public/learn/learn.js','utf8').split('// All public guides')[1];
 const historyLength=history.length;
 try{
  new Function(source)();
  const link=document.querySelector<HTMLAnchorElement>('.together-hero a[href="#conversation"]')!;
  for(let repeat=0;repeat<2;repeat++){
   const click=new MouseEvent('click',{bubbles:true,cancelable:true});link.dispatchEvent(click);
   expect(click.defaultPrevented).toBe(true);
   expect(scroll).toHaveBeenCalledTimes(repeat+1);
   expect(document.getElementById('conversation')).toBe(conversation);
   expect(conversation.querySelector('textarea')).toBe(draft);expect(draft.value).toBe('Keep this unsent question');
   expect(document.querySelector('.learn-header')).toBe(header);expect(document.getElementById('root')).toBe(account);
   expect(location.pathname+location.hash).toBe('/together/#conversation');expect(history.length).toBe(historyLength);
  }
  expect(pageChange).not.toHaveBeenCalled();
 }finally{window.removeEventListener('receiz-learn:page',pageChange);vi.restoreAllMocks();}
});

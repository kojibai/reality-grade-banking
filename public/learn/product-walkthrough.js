// Illustrative animation only. This module has no transport, account or payment API.
const mounted=new WeakSet(),running=new Set(),reading=new WeakMap();
function animate(example){
 const replies=[...example.querySelectorAll('[data-example-response]')].map(el=>({el,p:el.querySelector('p'),answer:el.dataset.exampleAnswer}));
 if(!replies.length||replies.some(reply=>!reply.p||!reply.answer))return()=>{};
 const follow=[...example.querySelectorAll('[data-example-followup]')];
 let timer=0,alive=true,visible=false,inView=false,interacted=reading.has(example),followLatest=!reading.has(example);
 const box=example.querySelector('.bank-conversation-scroll');
 const nearBottom=()=>!box||box.scrollHeight-box.clientHeight-box.scrollTop<=24;
 const input=()=>{interacted=true;followLatest=false;reading.set(example,box?.scrollTop??0);};
 const moved=()=>{if(interacted){followLatest=nearBottom();reading.set(example,box?.scrollTop??0);}};
 const keys=event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))input();};
 box?.addEventListener('wheel',input,{passive:true});box?.addEventListener('touchmove',input,{passive:true});box?.addEventListener('pointerdown',input,{passive:true});box?.addEventListener('keydown',keys);box?.addEventListener('scroll',moved,{passive:true});
 const scroll=()=>{if(box&&followLatest)box.scrollTop=box.scrollHeight;};
 const restore=()=>{clearTimeout(timer);for(const reply of replies){reply.p.textContent=reply.answer;reply.el.removeAttribute('data-example-playing');}follow.forEach(el=>{el.hidden=false;});};
 const stop=()=>{visible=false;restore();};
 const start=()=>{if(!alive||document.hidden||!example.isConnected||example.closest('[hidden]')||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  visible=true;if(interacted){restore();if(box)box.scrollTop=reading.get(example)??box.scrollTop;return;}followLatest=true;restore();follow.forEach(el=>{el.hidden=true;});if(box)box.scrollTop=0;
  const play=turn=>{if(!alive||!visible)return;const reply=replies[turn];if(turn)follow.forEach(el=>{el.hidden=false;});let index=0;
   reply.p.replaceChildren();reply.el.setAttribute('data-example-playing','');
   const dots=document.createElement('span');dots.className='bank-typing-dots';dots.innerHTML='<i></i><i></i><i></i>';reply.p.append(dots);scroll();
   const type=()=>{if(!alive||!visible)return;index=Math.min(reply.answer.length,index+5);reply.p.textContent=reply.answer.slice(0,index);scroll();if(index<reply.answer.length)timer=setTimeout(type,22);else{reply.el.removeAttribute('data-example-playing');timer=setTimeout(()=>{if(turn+1<replies.length)play(turn+1);else if(!interacted)timer=setTimeout(start,14000);},1000);}};
   timer=setTimeout(type,450);
  };play(0);
 };
 const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)start();else stop();},{threshold:.35});observer.observe(example);
 const visibility=()=>{if(document.hidden)stop();else if(inView)start();};document.addEventListener('visibilitychange',visibility);
 const motion=matchMedia('(prefers-reduced-motion:reduce)'),change=()=>{stop();if(inView&&!motion.matches)start();};motion.addEventListener('change',change);
 return()=>{alive=false;restore();observer.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',change);box?.removeEventListener('wheel',input);box?.removeEventListener('touchmove',input);box?.removeEventListener('pointerdown',input);box?.removeEventListener('keydown',keys);box?.removeEventListener('scroll',moved);};
}
export function init(){document.querySelectorAll('[data-product-walkthrough]').forEach(root=>{
 if(mounted.has(root))return;mounted.add(root);
 const choices=[...root.querySelectorAll('[data-product-choice]')];let release=()=>{};
 const motion=()=>{release();release=()=>{};root.querySelectorAll('[data-product-example="messages"]').forEach(example=>{if(!example.closest('[hidden]'))release=animate(example);});};
 const select=button=>{const key=button.dataset.productChoice;choices.forEach(el=>el.setAttribute('aria-pressed',String(el===button)));root.querySelectorAll('[data-product-panel],[data-product-caption]').forEach(el=>{el.hidden=(el.dataset.productPanel??el.dataset.productCaption)!==key;});motion();};
 const click=event=>{const button=event.target.closest('[data-product-choice]');if(button&&root.contains(button))select(button);};root.addEventListener('click',click);
 const keydown=event=>{const current=choices.indexOf(event.target);if(current<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?choices.length-1:(current+(event.key==='ArrowRight'?1:-1)+choices.length)%choices.length;choices[index].focus({preventScroll:true});select(choices[index]);};root.addEventListener('keydown',keydown);motion();
 const dispose=()=>{release();root.removeEventListener('click',click);root.removeEventListener('keydown',keydown);mounted.delete(root);running.delete(dispose);};running.add(dispose);
});}
addEventListener('receiz-learn:page',()=>{for(const dispose of [...running])dispose();init();});

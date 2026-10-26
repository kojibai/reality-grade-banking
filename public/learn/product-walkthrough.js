// Illustrative animation only. This module has no transport, account or payment API.
const mounted=new WeakSet(),running=new Set();
function animate(example){
 const response=example.querySelector('[data-example-response]'),p=response?.querySelector('p');if(!p)return()=>{};
 const answer=response.dataset.exampleAnswer,follow=[...example.querySelectorAll('[data-example-followup]')],full=p.textContent;
 let timer=0,observer,alive=true,visible=false,inView=false;
 const restore=()=>{clearTimeout(timer);p.textContent=full;response.removeAttribute('data-example-playing');follow.forEach(el=>{el.hidden=false;});};
 const stop=()=>{visible=false;restore();};
 const start=()=>{if(!alive||document.hidden||!example.isConnected||example.closest('[hidden]')||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  visible=true;clearTimeout(timer);let index=0;p.replaceChildren();response.setAttribute('data-example-playing','');follow.forEach(el=>{el.hidden=true;});
  const dots=document.createElement('span');dots.className='bank-typing-dots';dots.innerHTML='<i></i><i></i><i></i>';p.append(dots);
  const type=()=>{if(!alive||!visible)return;index=Math.min(answer.length,index+5);p.textContent=answer.slice(0,index);if(index<answer.length)timer=setTimeout(type,22);else{response.removeAttribute('data-example-playing');timer=setTimeout(()=>{follow.forEach(el=>{el.hidden=false;});const scroll=example.querySelector('.bank-conversation-scroll');if(scroll)scroll.scrollTo({top:scroll.scrollHeight,behavior:'smooth'});timer=setTimeout(()=>{const scroll=example.querySelector('.bank-conversation-scroll');if(scroll)scroll.scrollTop=0;start();},14000);},1200);}};
  timer=setTimeout(type,650);
 };
 observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)start();else stop();},{threshold:.35});observer.observe(example);
 const visibility=()=>{if(document.hidden)stop();else if(inView)start();};document.addEventListener('visibilitychange',visibility);
 const motion=matchMedia('(prefers-reduced-motion:reduce)'),change=()=>{restore();if(!motion.matches)start();};motion.addEventListener('change',change);
 return()=>{alive=false;restore();observer.disconnect();document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',change);};
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

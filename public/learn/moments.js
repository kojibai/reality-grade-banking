import{momentFrame,momentFrames,momentAmount}from'./moments-model.mjs';
// Presentation only. No account, monetary, network or identity actions.
const mounts=new Map();
function initExchange(){for(const [root,dispose]of mounts)if(!root.isConnected)dispose();for(const root of document.querySelectorAll('[data-moments-story]')){if(mounts.has(root))continue;let frame=0,timer,visible=false,manualUntil=0;const media=matchMedia('(prefers-reduced-motion: reduce)'),buttons=[...root.querySelectorAll('[data-moment-chapter]')];
const draw=announce=>{const value=momentFrame(frame);root.dataset.frame=String(frame);root.dataset.phase=String(value.phase);root.dataset.flow=value.flow??'';root.querySelector('[data-moment-title]').textContent=value.title;root.querySelector('[data-moment-detail]').textContent=value.detail;root.querySelectorAll('[data-moment-amount]').forEach((node,i)=>{node.textContent=value.fundsVisible?momentAmount(value.balances[i]):'Their own Original';});root.querySelectorAll('[data-moment-value-label]').forEach((node,i)=>{if(!node.dataset.sourceLabel)node.dataset.sourceLabel=node.textContent;node.textContent=value.fundsVisible?'Example accepted funds · USD reference':node.dataset.sourceLabel;});root.querySelectorAll('[data-moment-bar]').forEach((node,i)=>node.style.setProperty('--held',String(value.balances[i]/16000)));for(const [i,button]of buttons.entries())button.setAttribute('aria-pressed',String(value.phase===i));root.querySelector('[data-moment-position]').textContent=(frame+1)+' / '+momentFrames.length;if(announce)root.querySelector('[data-moment-feedback]').textContent=value.title+' '+value.detail;};
const schedule=()=>{clearTimeout(timer);const active=visible&&!document.hidden;root.dataset.active=String(active&&!media.matches);if(active&&!media.matches)timer=setTimeout(()=>{frame=(frame+1)%momentFrames.length;draw(false);schedule();},Math.max(4200,manualUntil-Date.now()));};
const select=button=>{frame=Number(button.dataset.momentChapter);manualUntil=Date.now()+9000;draw(true);schedule();};
const click=event=>{const step=event.target.closest('[data-moment-next],[data-moment-previous]');if(step&&root.contains(step)){frame=(frame+(step.hasAttribute('data-moment-next')?1:momentFrames.length-1))%momentFrames.length;manualUntil=Date.now()+9000;draw(true);schedule();return;}const button=event.target.closest('[data-moment-chapter]');if(button&&buttons.includes(button))select(button);};
const keys=event=>{const at=buttons.indexOf(event.target);if(at<0)return;const next=event.key==='ArrowRight'?(at+1)%buttons.length:event.key==='ArrowLeft'?(at+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:-1;if(next<0)return;event.preventDefault();select(buttons[next]);buttons[next].focus();};
const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.2;schedule();},{threshold:[0,.2]});observer?.observe(root);if(!observer)visible=true;
const dispose=()=>{clearTimeout(timer);observer?.disconnect();root.removeEventListener('click',click);root.removeEventListener('keydown',keys);document.removeEventListener('visibilitychange',schedule);media.removeEventListener?.('change',schedule);mounts.delete(root);root.dataset.active='false';};mounts.set(root,dispose);root.addEventListener('click',click);root.addEventListener('keydown',keys);document.addEventListener('visibilitychange',schedule);media.addEventListener?.('change',schedule);schedule();}}
addEventListener('receiz-learn:page',()=>{for(const [root,dispose]of mounts)if(!root.isConnected)dispose();});


import{causalFrame,causalFrames}from'./moments-model.mjs';
const causalMounts=new Map();
function initCausal(){
 for(const [root,dispose]of causalMounts)if(!root.isConnected)dispose();
 for(const root of document.querySelectorAll('[data-moments-causal]')){
  if(causalMounts.has(root))continue;
  let frame=0,timer,visible=false,manualUntil=0;
  const media=matchMedia('(prefers-reduced-motion: reduce)'),steps=[...root.querySelectorAll('[data-causal-step]')],amount=value=>value+' Φ';
  const draw=announce=>{
   const value=causalFrame(frame);root.dataset.frame=String(frame);
   root.querySelector('[data-causal-title]').textContent=value.title;
   root.querySelector('[data-causal-detail]').textContent=value.detail;
   root.querySelector('[data-causal-origin]').textContent=value.sourceCount?'Sealed Kai origin · unchanged':'Source captured';
   root.querySelector('[data-causal-source-count]').textContent=value.sourceCount?'1 Original · '+value.files+(value.files===1?' file':' files'):'0 Originals sealed';
   root.querySelector('[data-causal-source-label]').textContent=value.sourceCount?'Original A':'Captured source';
   root.querySelector('[data-causal-calculated]').textContent=frame>=2?amount(value.calculated):'Not evaluated';
   root.querySelector('[data-causal-used]').textContent=amount(value.used);
   root.querySelector('[data-causal-remaining]').textContent=amount(value.remaining);
   root.querySelector('[data-causal-admission]').textContent=value.admitted?'Accepted for this illustration':'Not admitted for spending';
   root.querySelector('[data-causal-history]').textContent=value.payments===0?'No accepted payments':value.payments===1?'1 accepted payment · 30 Φ used':'2 accepted payments · owner used 30 Φ';
   root.querySelectorAll('[data-causal-holder]').forEach((node,i)=>node.textContent=amount(value.balances[i]));
   root.querySelectorAll('[data-causal-bar]').forEach((node,i)=>node.style.setProperty('--mc-held',String(value.balances[i]/100)));
   root.querySelector('.mc-object-copy').setAttribute('aria-hidden',String(value.files<2));
   for(const [i,button]of steps.entries())button.setAttribute('aria-pressed',String(i===frame));
   root.querySelector('[data-causal-position]').textContent=(frame+1)+' / '+causalFrames.length;
   if(announce)root.querySelector('[data-causal-feedback]').textContent=value.title+' '+value.detail;
  };
  const schedule=()=>{clearTimeout(timer);const active=visible&&!document.hidden&&!media.matches;root.dataset.active=String(active);if(active)timer=setTimeout(()=>{frame=(frame+1)%causalFrames.length;draw(false);schedule();},Math.max(4200,manualUntil-Date.now()));};
  const select=value=>{frame=(value+causalFrames.length)%causalFrames.length;manualUntil=Date.now()+9000;draw(true);schedule();};
  const click=event=>{const button=event.target.closest('[data-causal-step],[data-causal-next],[data-causal-previous]');if(!button||!root.contains(button))return;select(button.hasAttribute('data-causal-step')?Number(button.dataset.causalStep):frame+(button.hasAttribute('data-causal-next')?1:-1));};
  const keys=event=>{const at=steps.indexOf(event.target);if(at<0)return;const next=event.key==='ArrowRight'?(at+1)%steps.length:event.key==='ArrowLeft'?(at+steps.length-1)%steps.length:event.key==='Home'?0:event.key==='End'?steps.length-1:-1;if(next<0)return;event.preventDefault();select(next);steps[next].focus();};
  const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&entries[0].intersectionRatio>=.2;schedule();},{threshold:[0,.2]});observer?.observe(root);
  const dispose=()=>{clearTimeout(timer);observer?.disconnect();root.removeEventListener('click',click);root.removeEventListener('keydown',keys);document.removeEventListener('visibilitychange',schedule);media.removeEventListener?.('change',schedule);causalMounts.delete(root);root.dataset.active='false';};
  causalMounts.set(root,dispose);root.addEventListener('click',click);root.addEventListener('keydown',keys);document.addEventListener('visibilitychange',schedule);media.addEventListener?.('change',schedule);draw(false);schedule();
 }
}
export function init(){initExchange();initCausal();}
addEventListener('receiz-learn:page',()=>{for(const [root,dispose]of causalMounts)if(!root.isConnected)dispose();});

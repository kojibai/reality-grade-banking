import {mountConversation} from './cooperative-twin.js';
// Selected public page only. The illustrations never execute financial actions.
const mounted=new WeakSet();let releaseProcess=()=>{};
const select=(root,choice,panel,value)=>{root.querySelectorAll(`[${choice}]`).forEach(button=>button.setAttribute('aria-pressed',String(button.getAttribute(choice)===value)));root.querySelectorAll(`[${panel}]`).forEach(section=>{section.hidden=section.getAttribute(panel)!==value;});};
function mountProcess(root){
 const process=root.querySelector('[data-process]');if(!process)return;
 const steps=[...process.querySelectorAll('[data-process-step]')],scene=process.querySelector('.coop-process-sticky'),header=document.querySelector('.learn-header'),compact=matchMedia('(max-width:650px)'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let frame=0,current=-1;
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 const update=()=>{
  frame=0;if(!process.isConnected)return;
  const bounds=process.getBoundingClientRect();if(bounds.bottom<0||bounds.top>innerHeight)return;
  // Read the complete layout first. Stage and claim position come from the same
  // scroll coordinate, never from competing observer visibility callbacks.
  const headerBottom=header?.getBoundingClientRect().bottom??109,sceneHeight=scene.getBoundingClientRect().height,rects=steps.map(step=>step.getBoundingClientRect());
  const focus=headerBottom+(compact.matches?sceneHeight+Math.max(40,(innerHeight-headerBottom-sceneHeight)*.2):innerHeight*.28);
  let stage=0;for(let i=0;i<rects.length;i++)if(rects[i].top<=focus)stage=i;
  const part=stage<3?clamp((focus-rects[stage].top)/Math.max(1,rects[stage+1].top-rects[stage].top),0,1):0,progress=stage+part;
  const points=[[0,0],[150,-65],[480,-55],[500,-85]],from=points[stage],to=points[Math.min(3,stage+1)];
  process.style.setProperty('--coop-progress',progress.toFixed(4));process.style.setProperty('--coop-progress-fill',progress/3*100+'%');
  process.style.setProperty('--coop-claim-x',from[0]+(to[0]-from[0])*part+'px');process.style.setProperty('--coop-claim-y',from[1]+(to[1]-from[1])*part+'px');process.style.setProperty('--coop-claim-opacity',clamp(progress*1.6,0,1));process.style.setProperty('--coop-proof-opacity',clamp(.25+progress*.75,.25,1));process.style.setProperty('--coop-receiver-opacity',clamp(.25+(progress-1)*.75,.25,1));process.style.setProperty('--coop-scene-height',sceneHeight+'px');
  if(stage!==current){current=stage;process.dataset.stage=String(stage);process.querySelector('[data-process-status]').textContent=steps[stage].dataset.status;process.querySelectorAll('[data-process-choice]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.processChoice)===stage)));}
 };
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
 process.querySelectorAll('[data-process-choice]').forEach(button=>button.addEventListener('click',()=>{
  const step=steps[Number(button.dataset.processChoice)],safeTop=(header?.getBoundingClientRect().bottom??109)+(compact.matches?scene.getBoundingClientRect().height+38:innerHeight*.28)-4;
  window.scrollTo({top:window.scrollY+step.getBoundingClientRect().top-safeTop,behavior:reduced.matches?'instant':'smooth'});
 }));
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});schedule();
 releaseProcess=()=>{removeEventListener('scroll',schedule);removeEventListener('resize',schedule);if(frame)cancelAnimationFrame(frame);};
}
export function init(){
 const root=document.querySelector('[data-coop]');if(!root||mounted.has(root))return;
 mounted.add(root);releaseProcess();mountProcess(root);
 root.addEventListener('click',event=>{const object=event.target.closest('[data-object-choice]'),network=event.target.closest('[data-network-choice]');if(object)select(root,'data-object-choice','data-object-panel',object.dataset.objectChoice);if(network)select(root,'data-network-choice','data-network-panel',network.dataset.networkChoice);});
 root.querySelectorAll('[data-coop-twin]').forEach(mountConversation);
}
addEventListener('receiz-learn:page',()=>{if(!document.querySelector('[data-coop]'))releaseProcess();});

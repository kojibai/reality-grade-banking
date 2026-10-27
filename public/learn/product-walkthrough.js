// Illustrative animation only. This module has no transport, account or payment API.
const mounted=new WeakSet(),running=new Set(),reading=new WeakMap();
function animate(example){
 if(example.querySelector('[data-agent-workflow]'))return animateWorkflow(example);
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

const workflowReading=new WeakMap();
function animateWorkflow(example){
 const flow=example.querySelector('[data-agent-workflow]'),box=flow.querySelector('[data-agent-workflow-scroll]');
 const turns=[...flow.querySelectorAll('[data-workflow-turn]')],steps=[...flow.querySelectorAll('[data-workflow-step]')],panes=[...flow.querySelectorAll('[data-workflow-pane]')];
 const replies=[...flow.querySelectorAll('[data-workflow-answer]')].map(el=>({el,p:el.querySelector('p'),answer:el.dataset.workflowAnswer}));
 const statuses=['One request. The next steps stay together.','Finding people who fit your offer.','Contacts saved with their business and conversation.','Confirmed. The appointment is already in your calendar.','Contact saved. Call booked. Payment received.'];
 const durations=[1800,3300,4300,4500,14500],timers=new Set();let alive=true,inView=false,manual=workflowReading.has(flow);
 const later=(fn,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);if(alive)fn();},ms);timers.add(timer);};
 const clear=()=>{timers.forEach(clearTimeout);timers.clear();};
 const restore=()=>{for(const reply of replies){reply.p.textContent=reply.answer;reply.el.removeAttribute('data-workflow-typing');}};
 const showPane=name=>{for(const pane of panes)pane.hidden=pane.dataset.workflowPane!==name;for(const button of flow.querySelectorAll('.bank-organizer-tools [data-workflow-open]'))button.setAttribute('aria-current',String(button.dataset.workflowOpen===name));};
 const scroll=()=>{if(box&&!manual)box.scrollTop=box.scrollHeight;};
 const phase=(value,typing=false)=>{
  flow.dataset.workflowPhase=String(value);turns.forEach((turn,index)=>{turn.hidden=index>value;});steps.forEach((button,index)=>{button.setAttribute('aria-pressed',String(index===value));button.toggleAttribute('data-done',index<value);});flow.querySelector('[data-workflow-status]').textContent=steps[value].dataset.workflowStatusText||statuses[value];
  showPane(steps[value].dataset.workflowPaneTarget||(value===2?'contacts':value===3?'calendar':'chat'));restore();
  if(typing){const reply=replies[value];reply.p.replaceChildren();reply.el.setAttribute('data-workflow-typing','');const dots=document.createElement('span');dots.className='bank-typing-dots';dots.innerHTML='<i></i><i></i><i></i>';reply.p.append(dots);let count=0;
   const type=()=>{count=Math.min(count+7,reply.answer.length);reply.p.textContent=reply.answer.slice(0,count);scroll();if(count<reply.answer.length)later(type,18);else reply.el.removeAttribute('data-workflow-typing');};later(type,180);
  }scroll();
 };
 const play=value=>{if(!alive||manual||document.hidden||!inView)return;phase(value,true);later(()=>play((value+1)%5),durations[value]);};
 const start=()=>{clear();if(!alive||manual||document.hidden||!inView||matchMedia('(prefers-reduced-motion:reduce)').matches)return;play(0);};
 const keep=()=>{manual=true;clear();restore();workflowReading.set(flow,true);};
 const input=()=>{if(!manual)keep();};
 const keys=event=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' ','Enter'].includes(event.key))input();};
 const inspect=event=>{if(event.target.closest('summary'))input();};
 const click=event=>{if(event.target.closest('summary'))input();const open=event.target.closest('[data-workflow-open]'),step=event.target.closest('[data-workflow-step]');if(!open&&!step)return;event.preventDefault();event.stopPropagation();
  if(step){const index=Number(step.dataset.workflowStep);if(index===0){manual=false;workflowReading.delete(flow);if(reduced.matches){manual=true;phase(0);workflowReading.set(flow,true);}else start();}else{keep();phase(index);if(box)box.scrollTop=box.scrollHeight;}}else{keep();const name=open.dataset.workflowOpen,required=name.startsWith('record')?4:name==='source'?2:['calendar','event'].includes(name)?3:name.startsWith('person')||name==='contacts'?2:0;if(Number(flow.dataset.workflowPhase)<required)phase(required);showPane(name);if(name==='chat'&&box)box.scrollTop=box.scrollHeight;}
 };
 flow.addEventListener('click',click);flow.addEventListener('pointerdown',inspect);flow.addEventListener('wheel',input,{passive:true});flow.addEventListener('touchmove',input,{passive:true});flow.addEventListener('keydown',keys);
 const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(inView)start();else{clear();restore();}},{threshold:.35});observer.observe(example);
 const visibility=()=>{if(document.hidden){clear();restore();}else start();};document.addEventListener('visibilitychange',visibility);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)'),change=()=>{clear();restore();if(reduced.matches){phase(4);showPane('chat');}else start();};reduced.addEventListener('change',change);
 return()=>{alive=false;clear();restore();observer.disconnect();flow.removeEventListener('click',click);flow.removeEventListener('pointerdown',inspect);flow.removeEventListener('wheel',input);flow.removeEventListener('touchmove',input);flow.removeEventListener('keydown',keys);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',change);};
}

let exampleSequence=0;
const exampleBanks=new WeakMap(),sharedExampleBanks=new WeakMap();
function exampleSource(root,name){let views=exampleBanks.get(root);if(!views){views=JSON.parse(root.querySelector('[data-example-views]')?.content.textContent||'{}');exampleBanks.set(root,views);}const view=views[name];if(typeof view!=='number')return view;
 let shared=sharedExampleBanks.get(document);if(!shared){shared=JSON.parse(document.querySelector('[data-shared-example-views]')?.content.textContent||'[]');sharedExampleBanks.set(document,shared);}return shared[view];}
function cloneExample(source){
 const holder=document.createElement('template');holder.innerHTML=source.html;
 const frame=holder.content.querySelector('.product-screen'),prefix='example-view-'+(++exampleSequence)+'-',ids=new Map();
 if(source.view)frame.dataset.exampleView=source.view;
 for(const node of frame.querySelectorAll('[id]')){ids.set(node.id,prefix+node.id);node.id=prefix+node.id;}
 for(const node of frame.querySelectorAll('*'))for(const name of ['aria-labelledby','aria-describedby','aria-controls','href','fill','filter','clip-path','mask','style']){let value=node.getAttribute(name);if(!value)continue;for(const [old,next]of ids){if(name.startsWith('aria-'))value=value.split(' ').map(id=>id===old?next:id).join(' ');else value=value.replaceAll('#'+old,'#'+next);}node.setAttribute(name,value);}
 return frame;
}
function exampleViews(root,select,refreshMotion){
 const timers=new Set(),moneyStages=new Map();
 const template=name=>exampleSource(root,name);
 const describe=(frame,name)=>{const source=template(name);if(!source)return;let caption=root.querySelector('.product-frame-caption');if(!caption){caption=root.querySelector('.product-example-feedback');if(!caption){caption=document.createElement('p');caption.className='product-example-feedback';root.append(caption);}}caption.textContent=source.copy||'Actual interface · Example data. No account changes or money moves.';};
 const show=(frame,name)=>{const current=frame?.querySelector('[data-daily-money]');if(current)moneyStages.set(current.dataset.dailyMoney,current.dataset.workflowPhase==='4'?'after':'before');const gallery=root.hasAttribute('data-daily-money-gallery'),story=gallery?root.querySelector('[data-product-choice][aria-pressed=true]')?.dataset.productChoice:root.dataset.productScenario;if(name==='messages'&&gallery)name=story||name;if(name==='account'&&story&&moneyStages.has(story)){const account=(gallery?story+':':'')+(moneyStages.get(story)==='after'?'account-after':'account');if(template(account))name=account;}const source=template(name);if(!source)return;const choice=root.querySelector(`[data-product-choice="${name}"]`),panel=root.querySelector(`[data-product-panel="${name}"]`);if(choice&&panel){select(choice);frame=panel.querySelector('.product-screen');}if(frame?.dataset.exampleView!==name){const next=cloneExample(source);frame.replaceWith(next);frame=next;}describe(frame,name);refreshMotion();};
 const click=event=>{const control=event.target.closest('[data-example-action]'),frame=control?.closest('.product-screen');if(!control||!frame||!root.contains(frame))return;event.preventDefault();event.stopPropagation();const action=control.dataset.exampleAction;
  if(action==='explain'){let notice=frame.querySelector('.product-local-feedback');if(!notice){notice=document.createElement('p');notice.className='product-example-feedback product-local-feedback';notice.setAttribute('role','status');(frame.querySelector('.sheet,[data-example-scroll]')||frame).append(notice);}notice.textContent=control.dataset.exampleFeedback==='Scan QR'?'Scan a payment QR to fill in its recipient and requested amount. This walkthrough uses an example request.':`${control.dataset.exampleFeedback||'This action'} · Explore the example here. Your real account stays separate.`;return;}
  if(action==='send-complete'){if(!frame.querySelector('[data-example-approve]')?.checked)return;control.disabled=true;control.textContent='Sending example payment…';frame.setAttribute('data-example-transition','');const timer=setTimeout(()=>{timers.delete(timer);if(frame.isConnected&&!frame.closest('[hidden]'))show(frame,'send-complete');},450);timers.add(timer);return;}
  show(frame,action);
 };
 const change=event=>{if(!event.target.matches('[data-example-approve]'))return;const frame=event.target.closest('.product-screen');for(const button of frame.querySelectorAll('[data-example-requires-approval]'))button.disabled=!event.target.checked;};
 const submit=event=>{if(event.target.closest('.product-screen'))event.preventDefault();};
 root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('submit',submit);
 return()=>{timers.forEach(clearTimeout);root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('submit',submit);};
}

export function init(){document.querySelectorAll('[data-product-walkthrough]').forEach(root=>{
 if(mounted.has(root))return;mounted.add(root);
 const choices=[...root.querySelectorAll('[data-product-choice]')];let release=()=>{};
 const motion=()=>{release();release=()=>{};root.querySelectorAll('[data-product-example="messages"]').forEach(example=>{if(!example.closest('[hidden]'))release=animate(example);});};
 const select=button=>{const key=button.dataset.productChoice;const source=exampleSource(root,key),panel=root.querySelector(`[data-product-panel="${key}"]`),frame=panel?.querySelector('.product-screen');if(source&&frame&&frame.dataset.exampleView!==key)frame.replaceWith(cloneExample(source));const caption=root.querySelector('.product-frame-caption');if(source&&caption)caption.textContent=source.copy;choices.forEach(el=>el.setAttribute('aria-pressed',String(el===button)));root.querySelectorAll('[data-product-panel],[data-product-caption]').forEach(el=>{el.hidden=(el.dataset.productPanel??el.dataset.productCaption)!==key;});motion();};
 const click=event=>{const button=event.target.closest('[data-product-choice]');if(button&&root.contains(button))select(button);};root.addEventListener('click',click);
 const keydown=event=>{const current=choices.indexOf(event.target);if(current<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=event.key==='Home'?0:event.key==='End'?choices.length-1:(current+(event.key==='ArrowRight'?1:-1)+choices.length)%choices.length;choices[index].focus({preventScroll:true});select(choices[index]);};root.addEventListener('keydown',keydown);motion();
 const releaseViews=exampleViews(root,select,motion);
 const dispose=()=>{releaseViews();release();root.removeEventListener('click',click);root.removeEventListener('keydown',keydown);mounted.delete(root);exampleBanks.delete(root);running.delete(dispose);};running.add(dispose);
});}
addEventListener('receiz-learn:page',()=>{for(const dispose of [...running])dispose();init();});

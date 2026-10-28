// Presentation only: carried source-rendered examples. No Identity, media or API.
const initialized=new WeakSet(),STEP_MS=4200,MANUAL_MS=8400;
const creation=['start-account','start-holdings','start-messages','start-calendar','start-event','start-join','room'];
const experience=['join','room','chat','twin','pay','paid','record','followup'];
export function init(){
 document.querySelectorAll('[data-meet-page]').forEach(page=>{
  if(initialized.has(page))return;initialized.add(page);
  const bank=page.querySelector('template[data-meeting-example-bank]');if(!bank)return;
  let views;try{views=JSON.parse(bank.content.textContent);}catch{return;}
  const positions=new WeakMap(),players=new Map();let drag=null,disposed=false;
  page.querySelectorAll('[data-meeting-walkthrough]').forEach(root=>{const sequence=root.dataset.meetingAutoplay==='create'?creation:experience;players.set(root,{sequence,index:Math.max(0,sequence.indexOf(root.dataset.meetingCurrent)),visible:false,timer:null,holdUntil:0});});
  const stop=player=>{if(player.timer!==null)clearTimeout(player.timer);player.timer=null;};
  const arm=(root,delay=STEP_MS)=>{const player=players.get(root);if(!player)return;stop(player);if(disposed||!player.visible||document.visibilityState==='hidden'||!page.isConnected)return;
   player.timer=setTimeout(()=>{player.timer=null;if(!player.visible||document.visibilityState==='hidden'||!page.isConnected)return;if(drag?.root===root||root.querySelector('.meet-demo-view')?.contains(document.activeElement)){arm(root);return;}if(player.holdUntil>Date.now()){arm(root,player.holdUntil-Date.now());return;}show(root,player.sequence[(player.index+1)%player.sequence.length]);arm(root);},delay);
  };
  const hold=root=>{const player=players.get(root);if(player){player.holdUntil=Date.now()+MANUAL_MS;arm(root,MANUAL_MS);}};
  const place=(root,tile,x,y)=>{const stage=root.querySelector('.meeting-stage');if(!stage||!tile)return;const bounds=stage.getBoundingClientRect(),box=tile.getBoundingClientRect(),position={x:Math.max(8,Math.min(bounds.width-box.width-8,x)),y:Math.max(8,Math.min(bounds.height-box.height-92,y))};if(tile.parentElement!==stage)stage.append(tile);Object.assign(tile.style,{position:'absolute',left:position.x+'px',top:position.y+'px',right:'auto',bottom:'auto'});positions.set(root,position);};
  const show=(root,key,manual=false)=>{
   if(!views[key])return;if(drag?.root===root)drag=null;const player=players.get(root),holder=document.createElement('template');holder.innerHTML=views[key];root.querySelector('.meet-demo-view').replaceChildren(holder.content);root.dataset.meetingCurrent=key;root.classList.add('meet-has-advanced');
   const story=root.closest('.meet-experience'),caption=root.dataset.meetingAutoplay==='create'?(key==='start-holdings'?'start-account':['start-join','room'].includes(key)?'start-event':key):key==='paid'?'pay':key==='chat'?'twin':key==='people'?'room':key;
   const buttons=[...root.querySelectorAll('[data-meeting-step]')];buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.meetingStep===caption)));
   if(story)story.querySelectorAll('[data-meeting-copy]').forEach(copy=>copy.hidden=copy.dataset.meetingCopy!==caption);
   const selected=buttons.find(button=>button.dataset.meetingStep===caption),label=root.querySelector('[data-meeting-current-label]');if(label&&selected)label.textContent=`${String(buttons.indexOf(selected)+1).padStart(2,'0')} / ${String(buttons.length).padStart(2,'0')} · ${selected.dataset.meetingLabel}`;
   if(player){const index=player.sequence.indexOf(key);if(index>=0)player.index=index;else{const alias=player.sequence.indexOf(caption);if(alias>=0)player.index=alias;}}
   const held=positions.get(root);if(held)place(root,root.querySelector('.meeting-feed.is-floating'),held.x,held.y);
   const scroll=root.querySelector('.meeting-conversation');if(scroll)scroll.scrollTop=scroll.scrollHeight;
   if(key==='start-holdings'){const panel=root.querySelector('.main-panel'),target=root.querySelector('.account-investment-total');if(panel&&target){const top=target.getBoundingClientRect().top-panel.getBoundingClientRect().top+panel.scrollTop-12;panel.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}
   if(manual)hold(root);
  };
  page.addEventListener('click',event=>{const step=event.target.closest('[data-meeting-step]');if(step){show(step.closest('[data-meeting-walkthrough]'),step.dataset.meetingStep,true);return;}const action=event.target.closest('[data-meeting-demo-action]');if(action){event.preventDefault();show(action.closest('[data-meeting-walkthrough]'),action.dataset.meetingDemoAction,true);}});
  page.addEventListener('pointerdown',event=>{const root=event.target.closest('[data-meeting-walkthrough]');if(root)hold(root);const tile=event.target.closest('.meeting-feed.is-floating');if(!tile||event.button!==0||event.target.closest('button:not(.meeting-camera-grip)'))return;const bounds=root.querySelector('.meeting-stage').getBoundingClientRect(),box=tile.getBoundingClientRect();event.preventDefault();place(root,tile,box.left-bounds.left,box.top-bounds.top);drag={id:event.pointerId,root,tile,x:event.clientX,y:event.clientY,left:box.left-bounds.left,top:box.top-bounds.top};tile.classList.add('is-dragging');tile.setPointerCapture?.(event.pointerId);});
  page.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId||!drag.tile.isConnected)return;event.preventDefault();place(drag.root,drag.tile,drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);});
  const drop=event=>{if(drag?.id!==event.pointerId)return;drag.tile.classList.remove('is-dragging');hold(drag.root);drag=null;};page.addEventListener('pointerup',drop);page.addEventListener('pointercancel',drop);page.addEventListener('lostpointercapture',drop);
  page.addEventListener('keydown',event=>{const grip=event.target.closest('[data-meeting-demo-drag]'),move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!grip||!move)return;event.preventDefault();const tile=grip.closest('.meeting-feed.is-floating'),root=grip.closest('[data-meeting-walkthrough]'),bounds=root.querySelector('.meeting-stage').getBoundingClientRect(),box=tile.getBoundingClientRect(),step=event.shiftKey?20:8;hold(root);place(root,tile,box.left-bounds.left+move[0]*step,box.top-bounds.top+move[1]*step);});
  const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(entry=>{const player=players.get(entry.target);if(!player)return;player.visible=entry.isIntersecting&&entry.intersectionRatio>=.3;entry.target.classList.toggle('meet-in-view',player.visible);arm(entry.target);}),{threshold:[0,.3]}):null;
  const resize='ResizeObserver'in window?new ResizeObserver(entries=>entries.forEach(entry=>{const held=positions.get(entry.target);if(held)place(entry.target,entry.target.querySelector('.meeting-feed.is-floating'),held.x,held.y);})):null;
  players.forEach((player,root)=>{if(observer)observer.observe(root);else{player.visible=true;root.classList.add('meet-in-view');arm(root);}resize?.observe(root);});
  const visibility=()=>players.forEach((_,root)=>arm(root));document.addEventListener('visibilitychange',visibility);
  const cleanup=()=>{if(!page.isConnected){disposed=true;players.forEach(stop);observer?.disconnect();resize?.disconnect();document.removeEventListener('visibilitychange',visibility);removeEventListener('receiz-learn:page',cleanup);initialized.delete(page);}};addEventListener('receiz-learn:page',cleanup);
 });
}

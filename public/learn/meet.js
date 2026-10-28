// Presentation only: carried source-rendered examples. No Identity, media or API.
const initialized=new WeakSet();
export function init(){
 document.querySelectorAll('[data-meet-page]').forEach(page=>{
  if(initialized.has(page))return;initialized.add(page);
  const bank=page.querySelector('template[data-meeting-example-bank]');if(!bank)return;
  let views;try{views=JSON.parse(bank.content.textContent);}catch{return;}
  const positions=new WeakMap();let drag=null;
  const place=(root,tile,x,y)=>{
   const stage=root.querySelector('.meeting-stage');if(!stage||!tile)return;
   const bounds=stage.getBoundingClientRect(),box=tile.getBoundingClientRect();
   const position={x:Math.max(8,Math.min(bounds.width-box.width-8,x)),y:Math.max(8,Math.min(bounds.height-box.height-92,y))};
   if(tile.parentElement!==stage)stage.append(tile);
   Object.assign(tile.style,{position:'absolute',left:position.x+'px',top:position.y+'px',right:'auto',bottom:'auto'});
   positions.set(root,position);
  };
  const show=(root,key)=>{
   if(!views[key])return;drag=null;
   const holder=document.createElement('template');holder.innerHTML=views[key];root.querySelector('.meet-demo-view').replaceChildren(holder.content);root.dataset.meetingCurrent=key;
   const story=root.closest('.meet-experience'),caption=key==='chat'?'twin':key==='people'?'room':key;
   if(story){story.querySelectorAll('[data-meeting-step]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.meetingStep===caption)));story.querySelectorAll('[data-meeting-copy]').forEach(copy=>copy.hidden=copy.dataset.meetingCopy!==caption);}
   const held=positions.get(root);if(held)place(root,root.querySelector('.meeting-feed.is-floating'),held.x,held.y);
   const scroll=root.querySelector('.meeting-conversation');if(scroll)scroll.scrollTop=scroll.scrollHeight;
  };
  page.addEventListener('click',event=>{
   const step=event.target.closest('[data-meeting-step]');if(step){show(step.closest('.meet-experience').querySelector('[data-meeting-walkthrough]'),step.dataset.meetingStep);return;}
   const action=event.target.closest('[data-meeting-demo-action]');if(action){event.preventDefault();show(action.closest('[data-meeting-walkthrough]'),action.dataset.meetingDemoAction);}
  });
  page.addEventListener('pointerdown',event=>{
   const tile=event.target.closest('.meeting-feed.is-floating');if(!tile||event.button!==0||event.target.closest('button:not(.meeting-camera-grip)'))return;
   const root=tile.closest('[data-meeting-walkthrough]'),bounds=root.querySelector('.meeting-stage').getBoundingClientRect(),box=tile.getBoundingClientRect();
   event.preventDefault();place(root,tile,box.left-bounds.left,box.top-bounds.top);
   drag={id:event.pointerId,root,tile,x:event.clientX,y:event.clientY,left:box.left-bounds.left,top:box.top-bounds.top};tile.classList.add('is-dragging');tile.setPointerCapture?.(event.pointerId);
  });
  page.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId||!drag.tile.isConnected)return;event.preventDefault();place(drag.root,drag.tile,drag.left+event.clientX-drag.x,drag.top+event.clientY-drag.y);});
  const drop=event=>{if(drag?.id!==event.pointerId)return;drag.tile.classList.remove('is-dragging');drag=null;};
  page.addEventListener('pointerup',drop);page.addEventListener('pointercancel',drop);page.addEventListener('lostpointercapture',drop);
  page.addEventListener('keydown',event=>{
   const grip=event.target.closest('[data-meeting-demo-drag]'),move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];if(!grip||!move)return;event.preventDefault();
   const tile=grip.closest('.meeting-feed.is-floating'),root=grip.closest('[data-meeting-walkthrough]'),bounds=root.querySelector('.meeting-stage').getBoundingClientRect(),box=tile.getBoundingClientRect(),step=event.shiftKey?20:8;
   place(root,tile,box.left-bounds.left+move[0]*step,box.top-bounds.top+move[1]*step);
  });
  const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('meet-in-view',entry.isIntersecting))):null;
  const resize='ResizeObserver'in window?new ResizeObserver(entries=>entries.forEach(entry=>{const held=positions.get(entry.target);if(held)place(entry.target,entry.target.querySelector('.meeting-feed.is-floating'),held.x,held.y);})):null;
  page.querySelectorAll('[data-meeting-walkthrough]').forEach(root=>{if(observer)observer.observe(root);else root.classList.add('meet-in-view');resize?.observe(root);});
  const cleanup=()=>{if(!page.isConnected){observer?.disconnect();resize?.disconnect();removeEventListener('receiz-learn:page',cleanup);}};addEventListener('receiz-learn:page',cleanup);
 });
}

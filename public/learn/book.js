// Page-only presentation: known HTML examples, no identity or network access.
const initialized=new WeakSet();
export function init(){
 for(const page of document.querySelectorAll('[data-booking-guide]')){
  if(initialized.has(page))continue;initialized.add(page);
  const bank=page.querySelector('template[data-booking-demo-bank]');if(!bank)continue;
  let views;const examples=()=>views??=JSON.parse(bank.content.textContent);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),players=new Map();let disposed=false;
  const stop=p=>{clearTimeout(p.timer);p.timer=null;};
  const syncButton=(root,p)=>{const button=root.querySelector('[data-booking-autoplay]');button.textContent=p.paused?'Play':'Pause';button.setAttribute('aria-label',(p.paused?'Play':'Pause')+' walkthrough');button.setAttribute('aria-pressed',String(p.paused));};
  const arm=(root,p)=>{stop(p);if(disposed||p.paused||!p.visible||reduced.matches||document.visibilityState==='hidden'||!page.isConnected)return;p.timer=setTimeout(()=>{if(root.contains(document.activeElement)){arm(root,p);return;}show(root,p.sequence[(p.sequence.indexOf(root.dataset.bookingCurrent)+1)%p.sequence.length]);arm(root,p);},5200);};
  const show=(root,key)=>{const source=examples()[key];if(!source)return;const holder=document.createElement('template');holder.innerHTML=source;root.querySelector('.book-guide-demo-view').replaceChildren(holder.content);root.dataset.bookingCurrent=key;root.classList.add('is-advancing');root.querySelectorAll('[data-booking-step]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bookingStep===key)));root.querySelectorAll('[data-booking-copy]').forEach(copy=>{copy.hidden=copy.dataset.bookingCopy!==key;});};
  page.querySelectorAll('[data-booking-walkthrough]').forEach(root=>{const p={sequence:root.dataset.bookingSequence.split(','),visible:false,paused:reduced.matches,timer:null};players.set(root,p);syncButton(root,p);});
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){const p=players.get(entry.target);p.visible=entry.isIntersecting;arm(entry.target,p);}},{threshold:.2}):null;
  players.forEach((p,root)=>{if(observer)observer.observe(root);else{p.visible=true;arm(root,p);}});
  const click=event=>{const button=event.target.closest('[data-booking-step],[data-booking-demo-action],[data-booking-autoplay]'),root=button?.closest('[data-booking-walkthrough]'),p=players.get(root);if(!p)return;
   if(button.hasAttribute('data-booking-autoplay')){p.paused=!p.paused;syncButton(root,p);arm(root,p);return;}
   const key=button.dataset.bookingStep??button.dataset.bookingDemoAction;if(!p.sequence.includes(key))return;
   event.preventDefault();p.paused=true;stop(p);show(root,key);syncButton(root,p);
  };
  const visibility=()=>players.forEach((p,root)=>arm(root,p));
  const motion=()=>{if(reduced.matches)players.forEach((p,root)=>{p.paused=true;syncButton(root,p);stop(p);});};
  const leave=()=>{if(page.isConnected)return;disposed=true;observer?.disconnect();players.forEach(stop);page.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);removeEventListener('receiz-learn:page',leave);reduced.removeEventListener?.('change',motion);};
  page.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);addEventListener('receiz-learn:page',leave);reduced.addEventListener?.('change',motion);
 }
}

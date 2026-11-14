// Presentation over complete held example HTML. No transport or identity work.
const initialized=new WeakSet();
export function init(){
 for(const page of document.querySelectorAll('[data-email-guide]')){
  if(initialized.has(page))continue;initialized.add(page);
  const bank=page.querySelector('template[data-email-demo-bank]'),root=page.querySelector('[data-email-walkthrough]');if(!bank||!root)continue;
  const views=JSON.parse(bank.content.textContent),sequence=['conversation','incoming','reply'],reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let timer=null,paused=reduced.matches,visible=false,disposed=false;
  const stop=()=>{clearTimeout(timer);timer=null;};
  const sync=()=>{const button=root.querySelector('[data-email-play]');button.textContent=paused?'Play':'Pause';button.setAttribute('aria-label',(paused?'Play':'Pause')+' email walkthrough');button.setAttribute('aria-pressed',String(paused));};
  const show=key=>{if(!Object.hasOwn(views,key))return;const holder=document.createElement('template');holder.innerHTML=views[key];root.querySelector('.email-demo-view').replaceChildren(holder.content);root.dataset.emailCurrent=key;root.classList.add('is-changing');root.querySelectorAll('[data-email-step]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.emailStep===key)));};
  const arm=()=>{stop();if(disposed||paused||!visible||document.visibilityState==='hidden'||!page.isConnected)return;timer=setTimeout(()=>{const active=document.activeElement;if(root.contains(active)&&!active.closest('[data-email-play]')){arm();return;}show(sequence[(sequence.indexOf(root.dataset.emailCurrent)+1)%sequence.length]);arm();},5200);};
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);arm();},{threshold:.2}):null;
  if(observer)observer.observe(root);else{visible=true;arm();}
  const click=event=>{const button=event.target.closest('[data-email-step],[data-email-demo-action],[data-email-play]');if(!button||!root.contains(button))return;event.preventDefault();if(button.hasAttribute('data-email-play')){paused=!paused;sync();arm();return;}paused=true;stop();show(button.dataset.emailStep??button.dataset.emailDemoAction);sync();};
  const motion=()=>{if(reduced.matches){paused=true;stop();sync();}};
  const leave=()=>{if(page.isConnected)return;disposed=true;stop();observer?.disconnect();page.removeEventListener('click',click);document.removeEventListener('visibilitychange',arm);removeEventListener('receiz-learn:page',leave);reduced.removeEventListener?.('change',motion);};
  page.addEventListener('click',click);document.addEventListener('visibilitychange',arm);addEventListener('receiz-learn:page',leave);reduced.addEventListener?.('change',motion);sync();
 }
}

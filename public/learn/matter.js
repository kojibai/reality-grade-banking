// An illustrative process only. Real admission remains in Receiz's verifier.
const initialized=new WeakSet();
export function init(){for(const page of document.querySelectorAll('[data-matter-page]')){
 if(initialized.has(page))continue;initialized.add(page);const root=page.querySelector('[data-matter-machine]');if(!root)continue;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),keys=['capture','seal','history','move','inspect'];let visible=false,paused=reduced.matches,timer=null,disposed=false;
 const button=root.querySelector('[data-matter-autoplay]'),stop=()=>{clearTimeout(timer);timer=null;};
 const state=()=>{button.textContent=paused?'Play':'Pause';button.setAttribute('aria-label',(paused?'Play':'Pause')+' illustration');button.setAttribute('aria-pressed',String(paused));};
 const show=key=>{if(!keys.includes(key))return;root.dataset.matterCurrent=key;root.querySelectorAll('[data-matter-panel]').forEach(panel=>{panel.hidden=panel.dataset.matterPanel!==key;});page.querySelectorAll('[data-matter-stage]').forEach(control=>control.setAttribute('aria-pressed',String(control.dataset.matterStage===key)));};
 const arm=()=>{stop();if(disposed||paused||!visible||reduced.matches||document.visibilityState==='hidden'||!page.isConnected)return;timer=setTimeout(()=>{if(root.contains(document.activeElement))return arm();show(keys[(keys.indexOf(root.dataset.matterCurrent)+1)%keys.length]);arm();},4800);};
 const click=event=>{const control=event.target.closest('[data-matter-stage],[data-matter-autoplay]');if(!control)return;if(control.hasAttribute('data-matter-autoplay'))paused=!paused;else{paused=true;show(control.dataset.matterStage);}state();arm();};
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{for(const entry of entries){visible=entry.isIntersecting;root.classList.toggle('in-view',visible);arm();}},{threshold:.2}):null;
 if(observer)observer.observe(root);else{visible=true;root.classList.add('in-view');arm();}
 const motion=()=>{if(reduced.matches){paused=true;state();stop();}},leave=()=>{if(page.isConnected)return;disposed=true;stop();observer?.disconnect();page.removeEventListener('click',click);document.removeEventListener('visibilitychange',arm);removeEventListener('receiz-learn:page',leave);reduced.removeEventListener?.('change',motion);};
 page.addEventListener('click',click);document.addEventListener('visibilitychange',arm);addEventListener('receiz-learn:page',leave);reduced.addEventListener?.('change',motion);state();
}}

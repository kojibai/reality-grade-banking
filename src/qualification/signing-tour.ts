/** Source-rendered illustrations only. No account, authenticator or proof API. */
const mounted=new Map<HTMLElement,()=>void>();
const keys=['account','assets-originals','assets-originals-approval','assets-originals-verifying','assets-originals-signed'];
const messages=['Choose Assets in the bottom navigation.','Choose the fingerprint beside this Original.','Your device presents its own approval prompt.','Bankeiz checks the approval against this exact Original.','The accepted signature stays with the same Original.'];
export function mountOriginalSigningTour(root:HTMLElement){
 const held=mounted.get(root);if(held)return held;
 const choices=[...root.querySelectorAll<HTMLButtonElement>('[data-product-choice]')],panels=[...root.querySelectorAll<HTMLElement>('[data-product-panel]')],captions=[...root.querySelectorAll<HTMLElement>('[data-product-caption]')];
 const originals=panels.map(panel=>panel.querySelector('.product-screen')?.cloneNode(true)),play=root.querySelector<HTMLButtonElement>('[data-signing-play]')!,previous=root.querySelector<HTMLButtonElement>('[data-signing-previous]')!,next=root.querySelector<HTMLButtonElement>('[data-signing-next]')!,replay=root.querySelector<HTMLButtonElement>('[data-signing-replay]')!,status=root.querySelector<HTMLElement>('[data-signing-status]')!,progress=root.querySelector<HTMLProgressElement>('[data-signing-progress]')!;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');let index=1,playing=false,started=false,timer:ReturnType<typeof setTimeout>|undefined,disposed=false,inView=true;
 const clear=()=>{if(timer!==undefined)clearTimeout(timer);timer=undefined;};
 const controls=()=>{play.textContent=playing?'Pause':'Play walkthrough';play.setAttribute('aria-pressed',String(playing));play.disabled=reduced.matches;play.title=reduced.matches?'Reduced motion is on. Choose a step.':'Play all five steps';previous.disabled=index===0;next.disabled=index===keys.length-1;};
 function show(value:number){
  index=Math.max(0,Math.min(keys.length-1,value));const key=keys[index];root.dataset.signingPhase=key;
  choices.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));panels.forEach((panel,i)=>{panel.hidden=i!==index;});captions.forEach(caption=>{caption.hidden=caption.dataset.productCaption!==key;});
  const frame=panels[index]?.querySelector<HTMLElement>('.product-screen');if(frame&&frame.dataset.exampleView!==key&&originals[index])frame.replaceWith(originals[index]!.cloneNode(true));
  status.textContent=messages[index];progress.value=index;controls();
 }
 function pause(){playing=false;clear();controls();}
 function advance(){if(!playing||disposed||document.hidden||!inView||reduced.matches){pause();return;}if(index===keys.length-1){pause();return;}timer=setTimeout(()=>{show(index+1);advance();},index===0?1800:2200);}
 function start(fromBeginning=false){if(reduced.matches||document.hidden||!inView)return;clear();if(fromBeginning||!started||index===keys.length-1)show(0);started=true;playing=true;controls();advance();}
 const click=(event:Event)=>{const target=event.target as Element,choice=target.closest<HTMLElement>('[data-product-choice]'),control=target.closest<HTMLElement>('[data-signing-play],[data-signing-previous],[data-signing-next],[data-signing-replay]'),action=target.closest<HTMLElement>('[data-example-action]')?.dataset.exampleAction,fingerprint=target.closest('[aria-label="Unlock value with PBI"]');
  let handled=true;if(choice){pause();show(keys.indexOf(choice.dataset.productChoice!));}else if(control===play){if(playing)pause();else start();}else if(control===previous){pause();show(index-1);}else if(control===next){pause();show(index+1);}else if(control===replay){pause();show(0);start(true);}else if(action==='assets-originals'){pause();show(1);}else if(action==='assets-originals-approval'||fingerprint){pause();show(2);}else if(action==='account'){pause();show(0);}else{pause();handled=false;}
  if(handled){event.preventDefault();event.stopImmediatePropagation();}
 };
 const keyboard=(event:KeyboardEvent)=>{const i=choices.indexOf(event.target as HTMLButtonElement);if(i<0||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();pause();const value=event.key==='Home'?0:event.key==='End'?keys.length-1:(i+(event.key==='ArrowRight'?1:-1)+keys.length)%keys.length;show(value);choices[value].focus({preventScroll:true});};
 const visibility=()=>{if(document.hidden)pause();},motion=()=>{if(reduced.matches)pause();controls();},observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{inView=entries[0]?.isIntersecting??false;if(!inView)pause();},{threshold:.15});
 root.addEventListener('click',click,true);root.addEventListener('keydown',keyboard,true);root.addEventListener('wheel',pause,{passive:true});root.addEventListener('touchmove',pause,{passive:true});document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motion);observer?.observe(root);replay.disabled=false;show(1);
 const dispose=()=>{if(disposed)return;disposed=true;pause();observer?.disconnect();root.removeEventListener('click',click,true);root.removeEventListener('keydown',keyboard,true);root.removeEventListener('wheel',pause);root.removeEventListener('touchmove',pause);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);mounted.delete(root);};mounted.set(root,dispose);return dispose;
}
export function initOriginalSigningTours(){for(const[root,dispose]of mounted)if(!root.isConnected||root.closest('[hidden]'))dispose();document.querySelectorAll<HTMLElement>('[data-originals-signing-tour]').forEach(root=>{if(!root.closest('[hidden]'))mountOriginalSigningTour(root);});}

// Page-only presentation. Already-rendered fictional screens; no account,
// storage, fetch, SDK, payment provider or financial original is used here.
const initialized=new WeakSet();
export function init(){
 for(const page of document.querySelectorAll('[data-pay-guide]')){
  if(initialized.has(page))continue;initialized.add(page);
  const root=page.querySelector('[data-pay-demo]'),bank=root?.querySelector('template[data-pay-views]');if(!bank)continue;
  const views=JSON.parse(bank.content.textContent),sequence=['amount','review','card','complete'],reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let amount='75.00',timer=null,visible=false,paused=reduced.matches,disposed=false;
  const captions={amount:['Start with the amount.','Type an amount or press Continue. You’re trying the actual Bankeiz screens with fictional example data.'],review:['Everything clear. Before you pay.','The recipient, amount and card contribution are shown together. Your approval belongs to this payment.'],card:['Your card covers what’s left.','The real secure card form stays inside checkout. This illustrated handoff accepts no payment information.'],complete:['All paid. And yours to keep.','The card funds your balance; your balance pays Maya. Keep your receipt and Identity Record, or open your account.']};
  const stop=()=>{clearTimeout(timer);timer=null;};
  const readAmount=()=>{const input=root.querySelector('[data-pay-amount]');if(!input)return true;const value=input.value.trim(),match=/^(0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/.exec(value);if(!match||Number(value)<=0||Number(value)>100000){input.setAttribute('aria-invalid','true');input.focus();tip('Try an example amount between $0.01 and $100,000.');return false;}amount=match[1]+'.'+(match[2]??'').padEnd(2,'0');return true;};
  const dollars=()=>Number(amount).toLocaleString('en-US',{style:'currency',currency:'USD'});
  const show=key=>{
   if(!views[key])return;const holder=document.createElement('template');holder.innerHTML=views[key];
   const walker=document.createTreeWalker(holder.content,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode()))node.textContent=node.textContent.replaceAll('$75.00',dollars());
   holder.content.querySelectorAll('[data-pay-amount]').forEach(input=>input.value=amount);
   const [whole,fraction]=amount.split('.'),cents=BigInt(whole)*100n+BigInt(fraction),charge=cents<50n?50n:cents,money=value=>(Number(value)/100).toLocaleString('en-US',{style:'currency',currency:'USD'});
   holder.content.querySelectorAll('[data-pay-card-amount]').forEach(node=>node.textContent=money(charge));
   if(charge>cents&&['review','card'].includes(key)){
    const parent=holder.content.querySelector('.checkout-review,.checkout-progress'),notice=document.createElement('p');notice.className='checkout-caption';notice.textContent='The card minimum applies. '+money(charge-cents)+' stays in your balance.';parent.insertBefore(notice,parent.querySelector('.primary-button'));
   }
   const panel=root.querySelector('.pay-demo-screen');panel.replaceChildren(holder.content);panel.scrollTop=0;root.dataset.payCurrent=key;root.classList.remove('is-advancing');
   // A separate frame restarts only this small view transition, never a page layout.
   requestAnimationFrame(()=>{if(!disposed&&page.isConnected)root.classList.add('is-advancing');});
   root.querySelectorAll('[data-pay-step]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.payStep===key)));
   root.querySelector('[data-pay-caption-title]').textContent=captions[key][0];root.querySelector('[data-pay-caption-body]').textContent=captions[key][1];root.querySelector('.pay-demo-tip').hidden=true;
  };
  const arm=()=>{stop();if(disposed||paused||!visible||reduced.matches||document.visibilityState==='hidden'||!page.isConnected)return;timer=setTimeout(()=>{if(root.querySelector('[data-pay-amount]')===document.activeElement){arm();return;}show(sequence[(sequence.indexOf(root.dataset.payCurrent)+1)%sequence.length]);arm();},5000);};
  function tip(text){const box=root.querySelector('.pay-demo-tip');box.replaceChildren(document.createTextNode(text));const close=document.createElement('button');close.type='button';close.dataset.payDismiss='';close.textContent='Got it';box.append(close);box.hidden=false;}
  const pause=()=>{paused=true;stop();};
  const click=event=>{
   if(!root.contains(event.target))return;pause();
   const button=event.target.closest('[data-pay-step],[data-pay-action],[data-pay-dismiss]');if(!button||!root.contains(button))return;
   if(button.hasAttribute('data-pay-dismiss')){root.querySelector('.pay-demo-tip').hidden=true;return;}
   event.preventDefault();const key=button.dataset.payStep??button.dataset.payAction;
   if(key==='note'){tip('In a real checkout, choose your original Note file. Its existing ownership and value are checked before payment. This walkthrough follows the card path.');return;}
   if(key==='balance'){root.querySelectorAll('[aria-pressed]').forEach(node=>{if(node.closest('.checkout-methods'))node.setAttribute('aria-pressed',String(node===button));});return;}
   if(key==='explain'){tip('This example saves no files and accesses no account. In your real checkout, these controls use your own payment and Identity Record.');return;}
   if(sequence.includes(key)&&readAmount())show(key);
  };
  const input=event=>{if(event.target.matches('[data-pay-amount]')){event.target.removeAttribute('aria-invalid');pause();}};
  const focus=()=>pause();
  const visibility=()=>arm(),motion=()=>{if(reduced.matches)pause();};
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;arm();},{threshold:.2}):null;
  const leave=()=>{if(page.isConnected)return;disposed=true;stop();observer?.disconnect();page.removeEventListener('click',click);page.removeEventListener('input',input);page.removeEventListener('focusin',focus);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener?.('change',motion);removeEventListener('receiz-learn:page',leave);};
  page.addEventListener('click',click);page.addEventListener('input',input);page.addEventListener('focusin',focus);document.addEventListener('visibilitychange',visibility);reduced.addEventListener?.('change',motion);addEventListener('receiz-learn:page',leave);
  if(observer)observer.observe(root);else{visible=true;arm();}
 }
}

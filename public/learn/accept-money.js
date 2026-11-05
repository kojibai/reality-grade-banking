import {comparisonSteps,chainState,economyState,economyPeople,emailSteps,formatMoney} from './accept-money-model.js';

let active=null;
const arrow='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';
const check='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const emailScreens=[
 `<span class="am-eyebrow">Send payment</span><h3>Pay your supplier.</h3><label>Recipient<input value="supplier@example.com" readonly aria-label="Example recipient email"></label><label>Amount<input value="$4,800" readonly aria-label="Example payment amount"></label><label>Purpose<input value="Invoice #1048" readonly aria-label="Example payment purpose"></label><button type="button" class="am-button" data-am-email-next>Send payment ${arrow}</button><small>Demonstration only · no money moves</small>`,
 `<span class="am-eyebrow">Email invitation · example</span><h3>You’ve received<br>a $4,800 payment.</h3><p>Restaurant sent you $4,800 for Invoice #1048. The payment is already recorded for you.</p><dl><div><dt>From</dt><dd>Restaurant</dd></div><div><dt>Invoice</dt><dd>#1048</dd></div><div><dt>To</dt><dd>supplier@example.com</dd></div></dl><button type="button" class="am-button" data-am-email-next>Review and accept payment ${arrow}</button><small>Bankeiz · Reality-Grade Banking<br>This invitation is a demonstration, not a claim link.</small>`,
 `<span class="am-eyebrow">Your payment is ready</span><h3>Your payment.<br>Ready to accept.</h3><ul class="am-receive-checks"><li>${check}<span>Review the sender, amount and reference.</span></li><li>${check}<span>Accept the payment already recorded for you.</span></li><li>${check}<span>Keep the payment and proof with your Identity Record.</span></li></ul><p>The payment was recorded before this invitation. Acceptance keeps that same payment and its proof together.</p><button type="button" class="am-button" data-am-email-next>Accept payment ${arrow}</button><small>No identity, signature or payment is created in this demonstration.</small>`,
 `<span class="am-eyebrow">Available in this demonstration</span><h3>Your payment is<br>ready to use.</h3><strong class="am-email-value">$4,800</strong><span class="am-status am-status-green">Recorded demonstration balance</span><label>Your supplier<input value="produce@example.com" readonly aria-label="Example onward recipient"></label><button type="button" class="am-button" data-am-email-restart>Pay someone ${arrow}</button><small>The next invitation continues the same receiving journey.<br>No live balance or spendable source is created.</small>`,
];
const networkCopy=[
 'Bankeiz implements the receiving requirements. The Original is the center of the architecture.',
 'An independent bank verifies the Original using its own conforming receiver and qualified custody.',
 'A merchant checkout can implement the receiving contract while preserving the source and exact ownership transition.',
 'A business payment application can receive and transfer supported value without adopting Bankeiz’s interface.',
 'An independent wallet must verify authority, current heads and the accepted transition before making value available.',
 'An institutional receiver must qualify its exact capability, rail, build and operating environment.',
];
const names={restaurant:'Restaurant',supplier:'Supplier',distributor:'Distributor',contractor:'Contractor'};
const fields=entries=>entries.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
function select(root,selector,index){root.querySelectorAll(selector).forEach((node,i)=>node.setAttribute('aria-pressed',String(i===index)));}
function lineage(root,group,step){root.querySelectorAll(`[data-am-lineage="${group}"] [data-am-lineage-node]`).forEach((node,i)=>{node.classList.toggle('is-current',i===step);node.classList.toggle('is-accepted',i<step);});}

export function init(){
 const root=document.querySelector('.am-page');
 if(!root||active?.root===root)return;
 active?.stop();
 let compareStep=0,chainStep=0,emailStep=0,economyStep=0,finalStep=0,timer=null,playing=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const text=(selector,value)=>{const node=root.querySelector(selector);if(node)node.textContent=value;};
 const stop=()=>{if(timer!==null)clearTimeout(timer);timer=null;playing=null;root.querySelectorAll('[data-am-play]').forEach(button=>{button.setAttribute('aria-pressed','false');button.innerHTML=`Play the story ${arrow}`;});};
 active={root,stop};
 const compare=step=>{compareStep=step;const info=comparisonSteps[step];select(root,'[data-am-compare-step]',step);root.querySelector('[data-am-comparison]').dataset.step=String(step);text('[data-am-provider-heading]',info.title);text('[data-am-native-heading]',info.title);text('[data-am-provider-copy]',info.provider);text('[data-am-native-copy]',info.native);text('[data-am-provider-status]',info.providerState);text('[data-am-native-status]',info.nativeState);text('[data-am-compare-note]',info.difference);};
 const chain=step=>{chainStep=step;const state=chainState(step),last=state.transitions.at(-1),recipient=last?.recipient??'restaurant';select(root,'[data-am-chain-step]',step);lineage(root,'chain',step);text('[data-am-chain-name]',names[recipient]);text('[data-am-chain-amount]',`${formatMoney(last?.amountCents??25000)} received · ${formatMoney(state.balances[recipient])} held`);root.querySelector('[data-am-chain-details]').innerHTML=fields([
  ['Source','Demonstration admission · $250 Reserve denomination'],
  ['Predecessor',last?.predecessor??'None · initial admission'],
  ['Recipient',`${names[recipient]} · independent receiving implementation`],
  ['Amount',formatMoney(last?.amountCents??25000)],
  ['Accepted state',last?`Demo transfer ${step} · next ownership state`:'Initial admitted demonstration state'],
  ['Verification result','Conservation and predecessor invariants satisfied. No live proof verified.'],
 ]);};
 const email=step=>{emailStep=step;select(root,'[data-am-email-step]',step);root.querySelector('[data-am-email-body]').innerHTML=emailScreens[step];text('[data-am-email-caption]',emailSteps[step].caption);};
 const economy=step=>{economyStep=step;const state=economyState(step),last=state.transitions.at(-1),next=economyState(Math.min(5,step+1)).transitions.at(-1),person=id=>economyPeople.find(p=>p.id===id)?.name??id;
  for(const [id,amount] of Object.entries(state.balances)){text(`[data-am-balance="${id}"]`,formatMoney(amount));root.querySelector(`[data-am-economy-person="${id}"]`).classList.toggle('is-current',id===(last?.recipient??'restaurant'));}
  lineage(root,'economy',step);
  text('[data-am-economy-step-label]',last?`${person(last.sender)} → ${person(last.recipient)}`:'Customer → Restaurant');
  text('[data-am-economy-amount]',`${formatMoney(last?.amountCents??10000)} ${last?'transferred':'received'}`);
  text('[data-am-economy-caption]',last?`${person(last.sender)} keeps ${formatMoney(state.balances[last.sender])}. ${person(last.recipient)} now holds ${formatMoney(state.balances[last.recipient])}. The original $100 remains counted once.`:'The initial $100 is held by the restaurant. Each step moves value; it never creates another credit.');
  text('[data-am-economy-position]',`Payment ${step} of 5`);
  root.querySelector('[data-am-economy-back]').disabled=step===0;
  const nextButton=root.querySelector('[data-am-economy-next]');nextButton.disabled=false;
  nextButton.innerHTML=step===5?`Replay the economy ${arrow}`:`Pay ${person(next.recipient).toLowerCase()} ${formatMoney(next.amountCents)} ${arrow}`;
  text('[data-am-economy-total]',formatMoney(Object.values(state.balances).reduce((a,b)=>a+b,0)));
  root.querySelector('[data-am-proof-fields]').innerHTML=fields([
   ['Source','Demo admission · Reserve denomination $100'],
   ['Authority',last?`${person(last.sender)} authorizes the exact demonstration transfer`:'Initial admitted state in this demonstration'],
   ['Predecessor',last?.predecessor??'None · initial admission'],
   ['Successor',last?.id??'No onward transfer yet'],
   ['Recipient',person(last?.recipient??'restaurant')],
   ['Accepted state',last?'Next ownership state in the deterministic model':'Initial state in the deterministic model'],
   ['Verification','Conservation and predecessor invariants satisfied. No live financial proof verified.'],
  ]);
 };
 const finale=step=>{finalStep=step;select(root,'[data-am-final-step]',step);const stage=root.querySelector('[data-am-final-network]');stage.dataset.step=String(step);stage.style.setProperty('--am-final-progress',String(step));root.querySelectorAll('[data-am-final-person]').forEach((node,i)=>node.classList.toggle('is-current',i===step));text('[data-am-final-caption]',['A customer initiates a legitimate payment. Follow the evidence through the next recipients.','The restaurant verifies and accepts $250. The Original and its evidence are retained.','The supplier receives $180 in another conforming implementation. The restaurant keeps $70.','The distributor receives $120. The supplier keeps $60. The source lineage remains connected.','The next recipient receives $70. Independent interfaces recede; the required proof continuity remains.'][step]);};
 const play=group=>{if(playing===group){stop();return;}stop();playing=group;const render=group==='final'?finale:compare;render(0);const button=root.querySelector(`[data-am-play="${group}"]`);button.setAttribute('aria-pressed','true');button.textContent='Pause story';const tick=()=>{if(!root.isConnected||document.hidden){stop();return;}const current=group==='final'?finalStep:compareStep,last=group==='final'?4:3;if(current===last){stop();return;}render(current+1);timer=setTimeout(tick,reduced.matches?4200:3200);};timer=setTimeout(tick,reduced.matches?4200:3200);};
 root.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||!root.contains(button)||button.disabled)return;
  if(button.hasAttribute('data-am-play')){play(button.dataset.amPlay);return;}
  if(button.hasAttribute('data-am-compare-step')){stop();compare(Number(button.dataset.amCompareStep));}
  if(button.hasAttribute('data-am-final-step')){stop();finale(Number(button.dataset.amFinalStep));}
  if(button.hasAttribute('data-am-chain-step'))chain(Number(button.dataset.amChainStep));
  if(button.hasAttribute('data-am-email-step'))email(Number(button.dataset.amEmailStep));
  if(button.hasAttribute('data-am-email-next')){email(Math.min(3,emailStep+1));root.querySelector('[data-am-email-body] button')?.focus({preventScroll:true});}
  if(button.hasAttribute('data-am-email-restart')){email(0);root.querySelector('[data-am-email-body] button')?.focus({preventScroll:true});}
  if(button.hasAttribute('data-am-network-node')){const index=Number(button.dataset.amNetworkNode);select(root,'[data-am-network-node]',index);text('[data-am-network-caption]',networkCopy[index]);}
  if(button.hasAttribute('data-am-economy-next'))economy(economyStep===5?0:economyStep+1);
  if(button.hasAttribute('data-am-economy-back'))economy(Math.max(0,economyStep-1));
  if(button.hasAttribute('data-am-view')){const proof=button.dataset.amView==='proof';root.querySelectorAll('[data-am-view]').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));root.querySelector('[data-am-proof-inspector]').hidden=!proof;}
 });
 const cleanup=()=>{if(!root.isConnected||!document.querySelector('.am-page')){stop();removeEventListener('receiz-learn:page',cleanup);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener?.('change',stop);}};
 const visibility=()=>{if(document.hidden)stop();};
 addEventListener('receiz-learn:page',cleanup);document.addEventListener('visibilitychange',visibility);reduced.addEventListener?.('change',stop);
 // Static first paint already contains useful initial views. Hydration updates
 // only local demonstration fields, never a profile, wallet or Source reader.
 chain(chainStep);economy(economyStep);
}

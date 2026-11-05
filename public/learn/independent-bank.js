import {independentState,independentOwners,formatMoney} from './independent-bank-model.js';
import {comparisonSteps} from './accept-money-model.js';
const mounted=new WeakMap();
const network=[
 'Bankeiz must establish source, current authority and the accepted transition. It does not approve every later transfer by another implementation.',
 'Your independent bank binds its own audience, receiver identity, current heads and qualified custody. Its interface and infrastructure are its own.',
 'A merchant wallet independently verifies the supported received Original. Another implementation’s balance display cannot authorize its credit.',
 'A supplier application uses the accepted current state for its next authorized transition and durably preserves the exact result.',
 'Another independent bank can receive supported value under the same applicable requirements. Qualification belongs to its exact capability and environment.',
];
const architecture=[
 'Receiz supplies canonical proof infrastructure and SDK primitives. Root binding, exact source and the declared capability remain necessary.',
 'The Original carries necessary evidence. Its authenticity is distinct from current custody and legitimate financial execution.',
 'Bankeiz is one implementation. Another receiver establishes its own ownership, custody, atomic transition and applicable qualification.',
];
const phi=value=>{const n=BigInt(value);return `${n/1000000n}.${String(n%1000000n).padStart(6,'0')} Φ`;};
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function init(){
 const root=document.querySelector('.ib-page');if(!root)return;
 const held=mounted.get(root);if(held)return;
 let step=0,timer=null,verification=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),text=(selector,value)=>{const el=root.querySelector(selector);if(el)el.textContent=value;};
 const choose=(selector,index)=>root.querySelectorAll(selector).forEach((node,i)=>node.setAttribute('aria-pressed',String(i===index)));
 const stop=()=>{if(timer!==null)clearTimeout(timer);timer=null;const button=root.querySelector('[data-ib-play]');button.setAttribute('aria-pressed','false');button.textContent='Play sequence →';};
 const render=next=>{
  step=next;const state=independentState(step),last=state.transitions.at(-1);
  for(const owner of independentOwners){text(`[data-ib-balance="${owner.id}"]`,formatMoney(state.balances[owner.id]));text(`[data-ib-phi="${owner.id}"]`,phi(state.positions[owner.id].phiMicro));text(`[data-ib-hero-balance="${owner.id}"]`,formatMoney(state.balances[owner.id]));}
  root.querySelector('[data-ib-stage]').dataset.ibStage=String(step);text('[data-ib-total]',formatMoney(state.totalCents));
  root.querySelector('[data-ib-send="first"]').disabled=step!==0;root.querySelector('[data-ib-send="second"]').disabled=step!==1;
  text('[data-ib-merchant-result]',step===2?'$250 received in this illustration':'Ready to receive');
  text('[data-ib-demo-status]',step===0?'Start with Bankeiz. Send $400 to the independent bank.':step===1?'$400 has moved in this illustration. The independent bank can now send $250 onward.':'Bankeiz $600 · Independent Bank $150 · Merchant Wallet $250. The same $1,000 is conserved.');
  const fields=[['Denomination','SETTLEMENT · exact Phi micro-units'],['Source lineage',state.lineage],['Illustrative transfer',last?`${last.senderOwnerId} → ${last.recipientOwnerId} · ${phi(last.amountPhiMicro)}`:'None · initial 10.000000 Φ position'],['Exact predecessor',last?`${last.senderPredecessor} / ${last.recipientPredecessor}`:'Symbolic initial demonstration heads'],['Successor',last?`${last.senderSuccessor} / ${last.recipientSuccessor}`:'No successor yet'],['Authority and custody','Required by the real receiving contract; not granted by this illustration.'],['Verification evidence','Deterministic conservation only. The separate Verify both control runs a genuine scoped reader.']];
  root.querySelector('[data-ib-proof-fields]').innerHTML=fields.map(([key,value])=>`<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('');
 };
 const play=()=>{const button=root.querySelector('[data-ib-play]');if(timer!==null){stop();return;}const tick=()=>{render((step+1)%3);timer=setTimeout(tick,2400);};button.setAttribute('aria-pressed','true');button.textContent='Pause sequence';timer=setTimeout(tick,reduced.matches?3200:1400);};
 const verify=async()=>{
  if(verification)return verification;
  const button=root.querySelector('[data-ib-verify]');button.disabled=true;text('[data-ib-verifier-status]','Opening the exact synthetic fixtures and running the genuine v129 source and delivery-authority reader…');
  verification=(async()=>{
   try{
    const url=new URL('/build-demo/v129/verify.mjs',location.origin).href;
    const module=await import(/* @vite-ignore */ url),result=await module.runIndependentVerification();
    if(result?.schema!=='bankeiz.synthetic-note-demo.result.v1'||result.scope!=='synthetic-source-and-delivery-authority'||!Array.isArray(result.results)||result.results.length!==2)throw Error('VERIFIER_RESULT_INVALID');
    const actual=result.results.find(item=>item.fixture==='authentic'),wrong=result.results.find(item=>item.fixture==='wrong-delivery-authority');
    if(actual?.synthetic!==true||actual.verified!==true||actual.amountUsdCents!=='200'||actual.carriedSourceVerified!==true||actual.deliveryAuthorityBound!==true||wrong?.synthetic!==true||wrong.verified!==false||wrong.error!=='BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH'||[actual,wrong].some(item=>item.currentSpendabilityChecked!==false||item.creditAuthorized!==false))throw Error('VERIFIER_RESULT_INVALID');
    text('[data-ib-verification="authentic"]','Carried source verified · expected delivery authority bound.');
    text('[data-ib-verification="imitation"]','Authority mismatch detected. Required delivery authority does not match the Original.');
    root.querySelector('[data-ib-verification="authentic"]').closest('article').dataset.result='pass';root.querySelector('[data-ib-verification="imitation"]').closest('article').dataset.result='refused';
    text('[data-ib-verifier-error]',wrong.error);root.querySelector('[data-ib-verifier-error]').hidden=false;text('[data-ib-verifier-status]','Real synthetic inspection complete. The substituted delivery authority was refused.');button.textContent='Verification complete';return result;
   }catch{verification=null;text('[data-ib-verifier-status]','Verification could not complete. No pass or refusal is asserted. Check the local assets and try again.');button.textContent='Retry verification';button.disabled=false;return null;}
  })();return verification;
 };
 root.addEventListener('click',event=>{
  const button=event.target.closest?.('button');if(!button||!root.contains(button))return;
  if(button.hasAttribute('data-ib-send')){stop();if(button.dataset.ibSend==='first'&&step===0)render(1);if(button.dataset.ibSend==='second'&&step===1)render(2);}
  if(button.hasAttribute('data-ib-hero-transfer')){stop();render(step===0?1:0);}
  if(button.hasAttribute('data-ib-reset')){stop();render(0);}
  if(button.hasAttribute('data-ib-play'))play();
  if(button.hasAttribute('data-ib-view')){const proof=button.dataset.ibView==='proof';root.querySelectorAll('[data-ib-view]').forEach(node=>node.setAttribute('aria-pressed',String(node===button)));root.querySelector('[data-ib-proof]').hidden=!proof;}
  if(button.hasAttribute('data-ib-compare')){const index=Number(button.dataset.ibCompare),info=comparisonSteps[index];if(info){choose('[data-ib-compare]',index);text('[data-ib-provider-title]',info.title);text('[data-ib-native-title]',info.title);text('[data-ib-provider-copy]',info.provider);text('[data-ib-native-copy]',info.native);text('[data-ib-comparison-note]',info.difference);}}
  if(button.hasAttribute('data-ib-dev-step')){const index=Number(button.dataset.ibDevStep);if(Number.isInteger(index)&&index>=0&&index<9){choose('[data-ib-dev-step]',index);text('[data-ib-dev-number]',`${String(index+1).padStart(2,'0')} / Receiver implementation`);text('[data-ib-dev-title]',button.dataset.ibTitle);text('[data-ib-dev-description]',button.dataset.ibDescription);root.querySelector('[data-ib-dev-link]').href='https://github.com/kojibai/reality-grade-banking/blob/main/'+button.dataset.ibContract;}}
  if(button.hasAttribute('data-ib-network')){const index=Number(button.dataset.ibNetwork);if(network[index]){choose('[data-ib-network]',index);text('[data-ib-network-caption]',network[index]);}}
  if(button.hasAttribute('data-ib-layer')){const index=Number(button.dataset.ibLayer);if(architecture[index]){choose('[data-ib-layer]',index);text('[data-ib-layer-description]',architecture[index]);}}
  if(button.hasAttribute('data-ib-focus-proof')){const focus=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(focus));root.querySelector('.ib-final-lineage').dataset.focusProof=String(focus);button.textContent=focus?'Show the applications →':'Focus on the Original →';}
  if(button.hasAttribute('data-ib-verify'))void verify();
  if(button.hasAttribute('data-ib-copy')){const el=root.querySelector(button.dataset.ibCopy==='sdk'?'[data-ib-sdk-code]':'[data-ib-commands]');void navigator.clipboard?.writeText(el.textContent).then(()=>text('[data-ib-copy-status]','Copied. Paste into your own implementation workspace.')).catch(()=>text('[data-ib-copy-status]','Select the code block to copy it.'));if(!navigator.clipboard)text('[data-ib-copy-status]','Select the code block to copy it.');}
 });
 const visibility=()=>{if(document.hidden||root.closest('[hidden]'))stop();};
 const release=()=>{stop();document.removeEventListener('visibilitychange',visibility);removeEventListener('receiz-learn:page',page);removeEventListener('receiz-bank:surface',page);reduced.removeEventListener?.('change',stop);mounted.delete(root);};
 const page=()=>{if(!root.isConnected)release();else if(root.closest('[hidden]'))stop();};
 document.addEventListener('visibilitychange',visibility);addEventListener('receiz-learn:page',page);addEventListener('receiz-bank:surface',page);reduced.addEventListener?.('change',stop);
 mounted.set(root,{stop});render(0);
}

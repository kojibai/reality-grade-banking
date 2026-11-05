import {circulationExample,exampleDollars} from './economy-model.mjs';
// Page-local presentation only. The source relationship is illustrative and immutable.
const mounted=new WeakSet();
export function init(){mountLearning();mountCircles();mountNumbers();for(const root of document.querySelectorAll('[data-economy-interfaces]')){
 if(mounted.has(root))continue;mounted.add(root);
 const tabs=[...root.querySelectorAll('[data-economy-interface]')],panels=[...root.querySelectorAll('[data-economy-interface-panel]')];
 const select=button=>{for(const tab of tabs){const active=tab===button;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}for(const panel of panels)panel.hidden=panel.dataset.economyInterfacePanel!==button.dataset.economyInterface;};
 root.addEventListener('click',event=>{const button=event.target.closest('[data-economy-interface]');if(button&&tabs.includes(button))select(button);});
 root.addEventListener('keydown',event=>{const at=tabs.indexOf(event.target);if(at<0)return;const next=event.key==='ArrowRight'||event.key==='ArrowDown'?(at+1)%tabs.length:event.key==='ArrowLeft'||event.key==='ArrowUp'?(at+tabs.length-1)%tabs.length:event.key==='Home'?0:event.key==='End'?tabs.length-1:-1;if(next<0)return;event.preventDefault();select(tabs[next]);tabs[next].focus();});
}}

function mountCircles(){for(const root of document.querySelectorAll('[data-economy-circle]')){if(mounted.has(root))continue;mounted.add(root);root.addEventListener('click',event=>{const button=event.target.closest('[data-economy-circle-choice]');if(!button||!root.contains(button))return;for(const choice of root.querySelectorAll('[data-economy-circle-choice]'))choice.setAttribute('aria-pressed',String(choice===button));for(const panel of root.querySelectorAll('[data-economy-circle-panel]'))panel.hidden=panel.dataset.economyCirclePanel!==button.dataset.economyCircleChoice;});}}

function mountNumbers(){for(const root of document.querySelectorAll('[data-economy-numbers]')){if(mounted.has(root))continue;mounted.add(root);let step=0;const input=root.querySelector('[data-economy-gallons-input]'),next=root.querySelector('[data-economy-next]');const update=()=>{const value=circulationExample(Number(input.value),step);root.querySelector('[data-economy-gallons]').textContent=String(value.gallons);root.querySelector('[data-economy-starting]').textContent=exampleDollars(value.billCents);root.querySelector('[data-economy-gross]').textContent=exampleDollars(value.grossPaymentsCents);root.querySelectorAll('[data-economy-bill]').forEach(node=>{node.textContent=exampleDollars(value.billCents);});root.querySelectorAll('[data-economy-number-payment]').forEach((node,i)=>{node.dataset.illustrated=String(i<step);node.querySelector('[data-economy-stage]').textContent=i<step?'Illustrated':i===step?'Next':'Later';});root.querySelectorAll('[data-economy-held]').forEach((node,i)=>{node.textContent=exampleDollars(value.balancesCents[i]);});root.querySelector('[data-economy-step]').textContent='Illustration · '+step+' of 4 payments';next.firstChild.textContent=step===4?'Start the example again ':step===0?'Follow the first payment ':'Follow the next payment ';root.querySelector('[data-economy-payoff]').textContent=step===4?exampleDollars(value.billCents)+' of starting value. '+exampleDollars(value.grossPaymentsCents)+' across four separate purchases. The value has circulated; no new value was created.':'The value is available. Follow where it could go next.';};input.addEventListener('input',()=>{step=0;update();});next.addEventListener('click',()=>{step=(step+1)%5;update();});update();}}

let learningMounted=false;
function mountLearning(){
 if(learningMounted)return;learningMounted=true;
// Guide enhancements operate only on carried public markup. They never read an
// identity, fetch account data or execute an illustrative financial action.
document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-learning-step]');if(!button)return;
 const region=button.closest('.learning-visual'),selected=button.dataset.learningStep;
 region.dataset.learningStage=selected;
 region.querySelectorAll('[data-learning-step]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
 region.querySelectorAll('[data-learning-panel]').forEach(item=>{item.hidden=item.dataset.learningPanel!==selected;});
});
document.addEventListener('input',event=>{
 if(!event.target.matches?.('[data-example-input]'))return;
 const region=event.target.closest('[data-learning-funding]'),amount=Number(event.target.value),reserve=Math.min(amount,60),settlement=amount-reserve;
 region.querySelector('[data-example-amount]').textContent=`$${amount}`;
 region.querySelector('[data-example-title]').textContent='Settlement Note';
 region.querySelector('[data-example-reserve]').textContent=`$${reserve}`;
 region.querySelector('[data-example-settlement]').textContent=`$${settlement}`;
});
}

import {Window} from 'happy-dom';
import {exampleAssets} from '../src/content/product-example-assets.mjs';
const routes={'Create asset':'created-asset','Sign':'signed-asset',Enter:'account','Remove ID from this device':'entry','Use existing account':'account','Continue with PBI':'account',Account:'account',Market:'market',Add:'deposit',Deposit:'deposit',Assets:'assets',Ledger:'ledger',Send:'send',Receive:'receive','Create note':'note-create','Deposit note':'note-deposit','Pay with a Note':'note-deposit','Send money':'send','Send ownership':'send-ownership','Review payment':'send-review','Edit details':'send','Send another payment':'send','Send payment':'send-complete','All send options':'send','All receive options':'receive','Back to payment':'send','All deposits':'deposit',Counter:'counter','Back to Receive':'receive','Send link':'receive','Checkout link':'receive-checkout','Payment button':'receive','Embedded checkout':'receive-embedded','Review note':'note-review','Edit amount':'note-create','Add money':'add-money','An asset':'deposit-asset','Settlement Note':'note-deposit','Create an asset':'create-asset','View assets':'assets','Your history':'ledger'};
/** Static illustration controls only. No event handlers, account APIs or financial sources survive SSR. */
export async function exampleNavigation(html,screen){
 const window=new Window({settings:{disableIframePageLoading:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true}}),doc=window.document;doc.body.innerHTML=html;
 const frame=doc.querySelector('.product-screen');frame.dataset.exampleView=screen;
 const allow=node=>{node.removeAttribute('inert');node.removeAttribute('aria-disabled');node.setAttribute('tabindex','0');};
 for(const button of frame.querySelectorAll('button')){
  const label=(button.getAttribute('aria-label')||button.querySelector('strong')?.textContent||button.textContent).replace(/\s+/g,' ').trim();
  let next=routes[label];
  if(label==='Close'||button.classList.contains('bank-home-mark'))next='account';
  if(label==='Account settings')next='identity';if(label==='Open your agent and messages')next='messages';
  if(label==='Create an asset instead')next='create-asset';if(label==='View all activity'||label==='View all')next=label==='View all activity'?'ledger':'assets';
  if(button.classList.contains('deposit-money-choice'))next='add-money';
  if(button.closest('.ledger-event')&&button.classList.contains('asset-row'))next='record';
  if(button.closest('.market-rows')&&button.classList.contains('asset-row'))next='asset-detail-'+(exampleAssets.find(asset=>asset.title===button.querySelector('strong')?.textContent)?.id||exampleAssets[0].id);
  if(label==='Your vaults'||label==='Open your vaults'||label==='Create vault')next='vault';
  const flow=button.closest('[data-agent-workflow]');
  if(flow){
   if(button.closest('[data-daily-money] .native-operation-review'))continue;
   if(button.classList.contains('organizer-person-row')){const person=[...flow.querySelectorAll('[data-workflow-pane^=person]')].find(pane=>pane.querySelector('.organizer-person-head h3')?.textContent===button.getAttribute('aria-label'));if(person)button.dataset.workflowOpen=person.dataset.workflowPane;}
   if(button.classList.contains('organizer-agenda-row'))button.dataset.workflowOpen='event';
   if(button.classList.contains('organizer-back'))button.dataset.workflowOpen=button.closest('[data-workflow-pane]')?.dataset.workflowPane==='event'?'calendar':'contacts';
   if(label==='Open conversation')button.dataset.workflowOpen='chat';
   if(button.hasAttribute('data-workflow-open')||button.hasAttribute('data-workflow-step')){allow(button);button.removeAttribute('disabled');continue;}
  }
  if(button.closest('.bank-messaging')&&!next)continue;
  allow(button);button.dataset.exampleAction=next||'explain';
  if(next==='send-complete'){button.dataset.exampleRequiresApproval='';button.setAttribute('disabled','');}
  else button.removeAttribute('disabled');
  if(!next)button.dataset.exampleFeedback=label;
 }
 for(const link of frame.querySelectorAll('a')){allow(link);if(link.closest('[data-agent-workflow]')&&link.getAttribute('aria-label')==='Open full receipt'){link.dataset.workflowOpen=link.closest('[data-workflow-pane]')?.dataset.workflowPane||'record';link.setAttribute('href','https://example.invalid/');link.removeAttribute('target');continue;}link.dataset.exampleAction=(link.closest('.ledger-event')||link.getAttribute('aria-label')==='Open full receipt')?'record':'explain';link.dataset.exampleFeedback=link.getAttribute('aria-label')||link.textContent.trim()||'Payment link';link.setAttribute('href','https://example.invalid/');link.removeAttribute('target');}
 for(const label of frame.querySelectorAll('label')){
  const checkbox=label.querySelector('input[type=checkbox]');
  if(screen==='send-review'&&checkbox){allow(label);allow(checkbox);checkbox.dataset.exampleApprove='';continue;}
  if(label.querySelector('input[type=file]')){allow(label);label.dataset.exampleAction='explain';label.dataset.exampleFeedback=label.getAttribute('title')||'Open the complete original to inspect its proof and ownership.';}
 }
 if(['receive','receive-checkout','receive-embedded'].includes(screen)){
  const tools=frame.querySelector('.payment-tools');if(screen==='receive-embedded'&&tools)tools.open=true;
 }
 // Trusted local display art for labeled examples; never Original bytes or ownership evidence.
 for(const row of frame.querySelectorAll('.market-rows .asset-row')){const asset=exampleAssets.find(asset=>asset.title===row.querySelector('strong')?.textContent),mark=row.querySelector('.asset-mark');if(!asset||!mark)continue;mark.classList.add('market-object-artwork');const image=doc.createElement('img');image.src=asset.image;image.alt='';image.loading='lazy';image.decoding='async';image.width=60;image.height=60;mark.replaceChildren(image);}
 const result=doc.body.innerHTML;await window.happyDOM.close();return result;
}

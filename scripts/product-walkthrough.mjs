import preview from '../src/content/product-ui.generated.json' with {type:'json'};
import {bankingStages} from '../src/content/banking-walkthrough.mjs';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const productPreviewCss=preview.css;
export function productScreen(name,id='preview'){
 const source=preview.screens[name];if(!source)throw Error('PRODUCT_SCREEN_REQUIRED');
 // Several real-component illustrations may share a page. SVG and ARIA IDs
 // remain unique to the illustration without changing the production reader.
 return source.replaceAll('example-'+name+'-',id+'-'+name+'-');
}
export function productWalkthrough({kind='banking',id='banking-tour'}={}){
 const stages=kind==='business'?[bankingStages[7],bankingStages[1],bankingStages[4],bankingStages[5]]:bankingStages;
 return `<section class="product-walkthrough" data-product-walkthrough="${id}" aria-label="${kind==='business'?'Business':'Banking'} product walkthrough"><div class="product-story"><p class="product-kicker">The actual interface</p><h2>${kind==='business'?'Your money questions.<br>Your next step, together.':'From your first step.<br>To the record you keep.'}</h2><p class="product-story-intro">${kind==='business'?'See what asking your agent looks like inside your account. Move from a money question to the account, a payment and its details.':'Follow the screens you will actually use. Choose a step and see how it fits into the whole experience.'}</p><div class="product-choices" role="group" aria-label="Choose a walkthrough step">${stages.map(([key,label],i)=>`<button type="button" data-product-choice="${key}" aria-pressed="${i===0}" aria-controls="${id}-${key}"><span>${String(i+1).padStart(2,'0')}</span>${label}</button>`).join('')}</div><div class="product-captions">${stages.map(([key,,title,body,payoff,href],i)=>`<article id="${id}-copy-${key}" data-product-caption="${key}"${i?' hidden':''}><h3>${title}</h3><p>${body}</p><strong>${payoff}</strong><a href="${href}">Explore this step <span aria-hidden="true">↗</span></a></article>`).join('')}</div><p class="product-example-note">Illustrated example · No account is opened and no money moves in this walkthrough.</p></div><div class="product-stage">${stages.map(([key],i)=>`<div id="${id}-${key}" data-product-panel="${key}"${i?' hidden':''}>${productScreen(key,id)}</div>`).join('')}<p class="product-frame-caption">${kind==='business'?'Example conversation · Animated replies are scripted for this demonstration.':'Actual production components · Example account and payment data.'}</p></div></section>`;
}
export function productMoment({screen='messages',id='money-example',title='See the money work, inside your account.',body='Ask about what is owed, what is due and the next useful step. Your agent works with the records and context available to it.',href='/action/',label='See Business in action'}={}){
 return `<section class="learn-shell product-moment" data-product-walkthrough="${id}"><div><p class="product-kicker">See the actual experience</p><h2>${title}</h2><p>${body}</p><a class="product-next" href="${href}">${label} <span aria-hidden="true">↗</span></a><small>Actual interface · Example data.${screen==='messages'?' Scripted demonstration.':''} No messages or payments are sent.</small></div><div>${productScreen(screen,id)}</div></section>`;
}

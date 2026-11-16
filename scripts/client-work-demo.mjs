import preview from '../src/content/client-work-demo.generated.json' with {type:'json'};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const clientWorkDemoCss=preview.css;
export function clientWorkDemo({scenarioId='web-design',intent='proposal',id='client-work',title='Try your next client conversation.',body='Choose a client brief. Open Workspace, edit a draft and preview the actual file.'}={}){
 if(!/^[a-z][a-z0-9-]*$/.test(id))throw Error('CLIENT_WORK_DEMO_ID_INVALID');
 const screen=preview.screens[scenarioId+':'+intent];if(!screen)throw Error('CLIENT_WORK_DEMO_SCENARIO_REQUIRED');
 const props={scenarioId,intent,idPrefix:id};
 return `<section class="client-work-example" aria-labelledby="${id}-heading"><div class="client-work-intro"><p class="product-kicker">Try the actual Messages interface</p><h2 id="${id}-heading">${title}</h2><p>${esc(body)}</p></div><div data-client-work-root data-client-work-props="${esc(JSON.stringify(props))}">${screen.replaceAll('client-work-example',id)}</div><noscript><p>The client brief is available above. Enable JavaScript to edit the local example and prepare its files, or <a href="/#account/messages">open your own Messages</a>.</p></noscript></section>`;
}

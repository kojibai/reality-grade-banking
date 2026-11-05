import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin=process.env.BANK_EXPLAINER_ORIGIN??'http://127.0.0.1:5194';
const output=process.env.BANK_EXPLAINER_OUTPUT??'output/playwright/accept-money';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BANK_BROWSER_EXECUTABLE??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:width<600?844:1000},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==origin||u.pathname.startsWith('/api/')){requests.push(u.pathname);return route.abort();}if(u.pathname==='/favicon.ico')return route.fulfill({status:204});return route.continue();});
  await page.goto(origin+'/accept/');await page.locator('[data-am-economy-caption]').filter({hasText:'Each step moves value'}).waitFor();
  assert.equal(await page.locator('h1').count(),1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document overflow at '+width);
  for(const i of [1,2,3,0]){await page.locator(`[data-am-compare-step="${i}"]`).click();assert.equal(await page.locator('[data-am-comparison]').getAttribute('data-step'),String(i));assert.equal(await page.locator(`[data-am-compare-step="${i}"]`).getAttribute('aria-pressed'),'true');}
  await page.locator('[data-am-chain-step="3"]').click();assert.match(await page.locator('[data-am-chain-amount]').textContent(),/\$70 received/);assert.match(await page.locator('[data-am-chain-details]').textContent(),/demo-transfer-2/);
  await page.locator('[data-am-email-next]').click();assert.match(await page.locator('[data-am-email-body] h3').textContent(),/4,800/);await page.locator('[data-am-email-next]').click();assert.match(await page.locator('[data-am-email-body]').textContent(),/Identity Record/);await page.locator('[data-am-email-next]').click();assert.match(await page.locator('[data-am-email-body]').textContent(),/Recorded demonstration balance/);await page.locator('[data-am-email-restart]').click();assert.equal(await page.getByLabel('Example recipient email').inputValue(),'supplier@example.com');
  await page.locator('[data-am-network-node="4"]').click();assert.match(await page.locator('[data-am-network-caption]').textContent(),/authority, current heads/);
  await page.getByRole('button',{name:'Proof view',exact:true}).click();assert.ok(await page.locator('[data-am-proof-inspector]').isVisible());
  for(let i=1;i<=5;i++){await page.locator('[data-am-economy-next]').click();assert.equal(await page.locator('[data-am-economy-position]').textContent(),`Payment ${i} of 5`);assert.equal(await page.locator('[data-am-economy-total]').textContent(),'$100');}
  assert.deepEqual(await page.locator('[data-am-balance]').allTextContents(),['$40','$20','$15','$10','$5','$10']);
  await page.locator('[data-am-economy-back]').click();assert.equal(await page.locator('[data-am-economy-position]').textContent(),'Payment 4 of 5');
  await page.locator('[data-am-economy-next]').press('Enter');assert.equal(await page.locator('[data-am-economy-position]').textContent(),'Payment 5 of 5');
  const anchors=await page.locator('main a[href^="#"]').evaluateAll(nodes=>nodes.map(a=>({href:a.getAttribute('href'),exists:!!document.getElementById(a.getAttribute('href').slice(1))})));assert.ok(anchors.every(a=>a.exists));
  assert.equal(await page.locator('.am-moving-original').evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  for(const label of ['Ownership','Temporal authority','Funding composition','Continuity','Verification']){const summary=page.locator('summary').filter({hasText:label}).first();await summary.click();assert.ok(await summary.evaluate(e=>e.parentElement.open));}
  await page.locator('[data-am-final-step="4"]').click();assert.match(await page.locator('[data-am-final-caption]').textContent(),/proof continuity remains/);
  await page.locator('.am-hero').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/hero-${width}.png`});
  if(width===390||width===1440){for(const [section,selector] of [['economy','#economy'],['email','#email-payments'],['network','[data-am-final-network]']]){await page.locator(selector).scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${section}-${width}.png`});}}
  assert.deepEqual(requests,[],'No account, service or external requests');assert.deepEqual(errors,[],'No browser errors');
  console.log(JSON.stringify({width,overflow:false,compare:4,email:4,economyTransfers:5,remaining:[40,20,15,10,5,10],accountRequests:0,reducedMotion:true,keyboard:true,errors:0}));await context.close();
 }
 const cold=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await cold.newPage();await page.goto(origin+'/accept/');assert.match(await page.locator('h1').textContent(),/ACCEPT THE MONEY/);assert.equal(await page.locator('.am-architecture').count(),2);assert.equal(await page.locator('[data-am-balance="restaurant"]').textContent(),'$100');await cold.close();
 const motion=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'}),play=await motion.newPage();await play.goto(origin+'/accept/');await play.locator('[data-am-play="compare"]').click();await play.waitForFunction(()=>document.querySelector('[data-am-comparison]').dataset.step==='1');await play.locator('[data-am-play="compare"]').click();assert.equal(await play.locator('[data-am-play="compare"]').getAttribute('aria-pressed'),'false');await motion.close();
 console.log('PASS cold HTML, all interactive journeys, arithmetic, keyboard, reduced motion and play/pause.');
}finally{await browser.close();}

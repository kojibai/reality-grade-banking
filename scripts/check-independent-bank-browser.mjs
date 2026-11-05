import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.BANK_BUILD_ORIGIN??'http://127.0.0.1:5208';
const output=process.env.BANK_BUILD_OUTPUT??'output/playwright/build-independent';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BANK_BROWSER_EXECUTABLE??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),report=[];
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:width<600?844:1000},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block'}),page=await context.newPage(),errors=[],unexpected=[],proofReads=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin||url.pathname.startsWith('/api/')){unexpected.push(url.pathname);return route.abort();}if(url.pathname.includes('/build-demo/'))proofReads.push(url.pathname);if(url.pathname==='/favicon.ico')return route.fulfill({status:204});return route.continue();});
  await page.goto(origin+'/build/');await page.locator('[data-ib-proof-fields]').filter({hasText:'Deterministic conservation only'}).waitFor({state:'attached'});
  assert.equal(await page.locator('main section').count(),13);assert.equal(await page.locator('h1').count(),1);assert.deepEqual(proofReads,[],'The verifier is not loaded without intent');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow at '+width);
  const hero=await page.locator('[data-ib-hero-bank]').evaluateAll(nodes=>nodes.map(node=>({text:node.textContent,top:node.getBoundingClientRect().top,bottom:node.getBoundingClientRect().bottom})));
  assert.equal(hero.length,2);assert.ok(hero.every(node=>node.top<844),'Both independent applications appear in the first mobile viewport');
  await page.screenshot({path:`${output}/hero-${width}.png`});
  assert.equal(await page.locator('[data-ib-send="second"]').isDisabled(),true);
  await page.locator('[data-ib-send="first"]').click();assert.deepEqual(await page.locator('[data-ib-balance]').allTextContents(),['$600','$400','$0']);
  assert.equal(await page.locator('[data-ib-send="first"]').isDisabled(),true);await page.locator('[data-ib-send="second"]').press('Enter');
  assert.deepEqual(await page.locator('[data-ib-balance]').allTextContents(),['$600','$150','$250']);assert.equal(await page.locator('[data-ib-total]').textContent(),'$1,000');assert.equal(await page.locator('[data-ib-send="second"]').isDisabled(),true);
  await page.getByRole('button',{name:'Proof view',exact:true}).click();assert.ok(await page.locator('[data-ib-proof]').isVisible());assert.match(await page.locator('[data-ib-proof-fields]').textContent(),/demo-head-B-1/);assert.deepEqual(await page.locator('[data-ib-phi]').allTextContents(),['6.000000 Φ','1.500000 Φ','2.500000 Φ']);
  for(let i=0;i<4;i++){await page.locator(`[data-ib-compare="${i}"]`).click();assert.equal(await page.locator('[data-ib-provider-title]').textContent(),await page.locator('[data-ib-native-title]').textContent());assert.equal(await page.locator(`[data-ib-compare="${i}"]`).getAttribute('aria-pressed'),'true');}
  for(let i=0;i<9;i++){await page.locator(`[data-ib-dev-step="${i}"]`).click();assert.equal(await page.locator(`[data-ib-dev-step="${i}"]`).getAttribute('aria-pressed'),'true');assert.match(await page.locator('[data-ib-dev-number]').textContent(),new RegExp(String(i+1).padStart(2,'0')));}
  await page.locator('[data-ib-copy="commands"]').click();await page.locator('[data-ib-copy-status]').filter({hasText:'Copied.'}).waitFor();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/npm run receiver:check/);
  await page.locator('[data-ib-copy="sdk"]').click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),await readFile('institution/examples/accept-money.ts','utf8'));
  for(let i=0;i<5;i++){await page.locator(`[data-ib-network="${i}"]`).click();assert.equal(await page.locator(`[data-ib-network="${i}"]`).getAttribute('aria-pressed'),'true');}
  for(let i=0;i<3;i++){await page.locator(`[data-ib-layer="${i}"]`).click();assert.equal(await page.locator(`[data-ib-layer="${i}"]`).getAttribute('aria-pressed'),'true');}
  const anchors=await page.locator('main a[href^="#"]').evaluateAll(nodes=>nodes.map(node=>({href:node.getAttribute('href'),exists:!!document.getElementById(node.getAttribute('href').slice(1))})));assert.ok(anchors.every(node=>node.exists));
  assert.equal(await page.locator('.ib-original').first().evaluate(node=>getComputedStyle(node).transitionDuration),'0s');
  if(width===390){
   assert.deepEqual(proofReads,[]);await page.locator('[data-ib-verify]').click();await page.locator('[data-ib-verification="authentic"]').filter({hasText:'Carried source verified'}).waitFor({timeout:60000});assert.match(await page.locator('[data-ib-verification="imitation"]').textContent(),/Authority mismatch detected/);await page.locator('.ib-verifier-scope summary').click();assert.match(await page.locator('[data-ib-verifier-error]').textContent(),/BANK_NOTE_DELIVERY_AUTHORITY_MISMATCH/);assert.match(await page.locator('.ib-verifier-scope').textContent(),/credit authorization are not checked/);assert.equal(await page.locator('[data-ib-verify]').textContent(),'Verification complete');assert.ok(await page.locator('[data-ib-verifier-error]').isVisible());await page.locator('.ib-verifier-scope summary').click();assert.equal(await page.locator('[data-ib-verify]').isDisabled(),true);assert.equal(proofReads.filter(path=>path.endsWith('.png.gz')).length,2);await page.locator('#verify-the-evidence').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/verified-${width}.png`});
  }
  if(width===390||width===1440){for(const [name,id]of[['demo','three-apps'],['developer','build-a-receiver'],['network','independent-network']]){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/${name}-${width}.png`});}}
  await page.locator('[data-ib-focus-proof]').click();assert.equal(await page.locator('.ib-final-lineage').getAttribute('data-focus-proof'),'true');assert.equal(await page.locator('.ib-final-lineage>span').first().evaluate(node=>getComputedStyle(node).opacity),'0.12');assert.equal(await page.locator('.ib-final-lineage>div').evaluate(node=>getComputedStyle(node).opacity),'1');
  await page.locator('[data-ib-reset]').click();assert.deepEqual(await page.locator('[data-ib-balance]').allTextContents(),['$1,000','$0','$0']);
  assert.deepEqual(unexpected,[],'No financial/account/external requests');assert.deepEqual(errors,[],'No browser errors');report.push({width,sections:13,conservedCents:100000,finalBalances:[60000,15000,25000],allControls:true,keyboard:true,reducedMotion:true,unexpectedRequests:unexpected,errors,proofReads});await context.close();
 }
 const cold=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await cold.newPage();await page.goto(origin+'/build/');assert.match(await page.locator('h1').textContent(),/BUILD YOUR OWN BANK/);assert.equal(await page.locator('[data-ib-hero-bank]').count(),2);assert.deepEqual(await page.locator('[data-ib-balance]').allTextContents(),['$1,000','$0','$0']);await cold.close();
 const motion=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'no-preference'}),active=await motion.newPage();await active.goto(origin+'/build/');await active.locator('[data-ib-proof-fields]').filter({hasText:'Deterministic conservation only'}).waitFor({state:'attached'});await active.locator('[data-ib-play]').click();await active.waitForFunction(()=>document.querySelector('[data-ib-stage]').dataset.ibStage==='1');await active.locator('[data-ib-play]').click();assert.equal(await active.locator('[data-ib-play]').getAttribute('aria-pressed'),'false');await motion.close();
 await writeFile(`${output}/report.json`,JSON.stringify({browser:'Playwright Chromium; Browser plugin not available',origin,report,coldHtml:true,playPause:true},null,2)+'\n');console.log(JSON.stringify({pass:true,viewports:report.map(row=>row.width),genuineVerifier:true,exactConservation:true,coldHtml:true,playPause:true}));
}finally{await browser.close();}

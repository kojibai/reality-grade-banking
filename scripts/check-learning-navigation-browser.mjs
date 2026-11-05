import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const origin=process.env.BANK_NAVIGATION_ORIGIN??'http://127.0.0.1:5208';
const output=process.env.BANK_NAVIGATION_OUTPUT??'output/playwright/learning-navigation';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BANK_BROWSER_EXECUTABLE??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),report=[];
const follow=async(page,path)=>{
 await page.locator(`main:visible a[href="${path}"]`).first().click();
 await page.waitForURL(url=>url.pathname+url.hash===path);
};
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width<600?844:1000},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],unexpected=[];
  let releaseModule;const moduleGate=new Promise(resolve=>{releaseModule=resolve;});
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==origin||url.pathname.startsWith('/api/')){unexpected.push(url.pathname);return route.abort();}if(url.pathname==='/favicon.ico')return route.fulfill({status:204});if(url.pathname==='/learn/guide-directory.js')await moduleGate;return route.continue();});
  // A synthetic retained host exercises public navigation without loading an
  // account, identity, media source, API or custody implementation.
  await context.addInitScript(()=>{
   const keep=()=>{if(!document.body)return;const root=document.createElement('div');root.id='root';root.hidden=true;const field=document.createElement('input');field.value='Retained synthetic work';root.append(field);document.body.append(root);window.navigationRetainedHost={root,field};return true;};
   if(!keep()){const observer=new MutationObserver(()=>{if(keep())observer.disconnect();});observer.observe(document,{childList:true,subtree:true});}
  });
  await page.goto(origin+'/learn/');
  await follow(page,'/learn/proof-objects/');await follow(page,'/learn/creating-an-asset/');await follow(page,'/learn/earn-from-originals/');
  const paymentDetails=page.locator('main:visible a[href="/learn/payments/"]').first().locator('xpath=ancestor::details').first();if(await paymentDetails.count()&&await paymentDetails.getAttribute('open')===null)await paymentDetails.locator('summary').first().click();
  await follow(page,'/learn/payments/');
  await follow(page,'/learn/guides/');await page.locator('[data-guide-search]:visible').waitFor();
  const input=page.getByRole('searchbox',{name:'Find a guide'});assert.equal(await input.isDisabled(),true);
  await page.evaluate(()=>document.fonts.ready);
  const geometry=()=>page.evaluate(()=>{const form=document.querySelector('[data-guide-search]'),group=document.querySelector('[data-guide-group]');return{height:form.getBoundingClientRect().height,top:group.getBoundingClientRect().top+scrollY};});
  const before=await geometry();releaseModule();await page.waitForFunction(()=>!document.querySelector('[data-guide-search] input').disabled);const after=await geometry();assert.deepEqual(after,before,'Enhancement reserves exactly the same form height and first-group position');
  await input.fill('how do I sign an Original');assert.ok(await page.locator('[data-guide-card][href="/learn/earn-from-originals/"]').isVisible());
  await input.fill('how do I get paid for originals');assert.ok(await page.locator('[data-guide-card][href="/learn/earn-from-originals/"]').isVisible());
  await input.fill('how can I send money by email');assert.ok(await page.locator('[data-guide-card][href="/accept/#email-payments"]').isVisible());
  await follow(page,'/accept/#email-payments');await follow(page,'/build/');await follow(page,'/accept/');
  assert.equal(await page.locator('#keep-moving .am-actions a[href="https://receiz.com/developers"]').count(),1,'The explicit final SDK choice remains');
  await page.goBack();await page.waitForURL(origin+'/build/');await page.goForward();await page.waitForURL(origin+'/accept/');
  await page.goto(origin+'/business/');await follow(page,'/fit/');await follow(page,'/business/for/ecommerce/');await follow(page,'/learn/get-paid/');await follow(page,'/pay/');await follow(page,'/guide/');
  await follow(page,'/learn/guides/');await page.locator('[data-guide-search]:visible').waitFor();
  await input.fill('proof impossiblexyz');assert.ok(await page.locator('[data-guide-empty]').isVisible());assert.equal(await page.locator('[data-guide-count]').textContent(),'0 guides');
  await page.getByRole('button',{name:'Clear search'}).focus();await page.keyboard.press('Enter');assert.equal(await input.inputValue(),'');assert.ok(await input.evaluate(node=>node===document.activeElement));
  const total=await page.locator('[data-guide-card]').count();assert.equal(await page.locator('[data-guide-card]:visible').count(),total);assert.ok(total>120);
  await input.fill('get paid');await follow(page,'/learn/get-paid/');await follow(page,'/pay/');
  await page.evaluate(()=>{const held=window.navigationRetainedHost;if(!held||!held.root.isConnected||held.root.querySelector('input')!==held.field||held.field.value!=='Retained synthetic work')throw Error('Retained host changed');});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No overflow at '+width);
  await page.goto(origin+'/learn/guides/');await page.locator('[data-guide-search]:visible').waitFor();await page.screenshot({path:`${output}/directory-${width}.png`,fullPage:false});
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[],'Reading navigation performs no account/API/external calls');
  report.push({width,guides:total,naturalQuestions:3,enhancementLayoutShift:0,mainOnlyJourneys:3,keyboardClear:true,retainedHost:true,errors:0,unexpectedRequests:0});await context.close();
 }
 const cold=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await cold.newPage();await page.goto(origin+'/learn/guides/');
 const cards=await page.locator('[data-guide-card]').count();assert.ok(cards>120);assert.equal(await page.locator('[data-guide-card]:visible').count(),cards);assert.equal(await page.locator('[data-guide-search]').isVisible(),false);assert.ok(await page.locator('[data-guide-card][href="/build/"]').isVisible());await cold.close();
 await writeFile(`${output}/report.json`,JSON.stringify({report,noJavaScript:{cards,allReadable:true}},null,2));console.log(JSON.stringify({report,noJavaScript:{cards,allReadable:true}}));
}finally{await browser.close();}

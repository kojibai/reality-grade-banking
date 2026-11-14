import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.EMAIL_GUIDE_ORIGIN??'http://127.0.0.1:4177',evidence=process.env.EMAIL_GUIDE_EVIDENCE??'/private/tmp/bankeiz-email-guide-evidence';
await mkdir(evidence,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
const check=(value,message)=>{if(!value)throw Error(message);};
try{
 for(const width of [1488,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:width===1488?1058:844},reducedMotion:'reduce',timezoneId:'UTC'}),page=await context.newPage(),api=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.route('**/api/**',route=>{api.push(route.request().url());return route.abort();});
  await page.goto(origin+'/email/');await page.getByRole('button',{name:'Play email walkthrough',exact:true}).waitFor();
  const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,headline:getComputedStyle(document.querySelector('.email-hero h1')).fontSize,address:getComputedStyle(document.querySelector('.email-address>p')).color}));check(!geometry.overflow,'Email overflow at '+width);check(geometry.address==='rgb(20, 40, 63)','Address lost concept ink color');
  await page.screenshot({path:`${evidence}/email-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Original',exact:true}).click();await page.locator('.email-demo .email-example-original').waitFor();check((await page.locator('.email-demo pre').innerText()).includes('From: Jamie'),'Original example unavailable');await page.getByRole('button',{name:'Back to conversation',exact:true}).click();
  await page.getByRole('button',{name:'Incoming email',exact:true}).click();check(await page.locator('[data-email-walkthrough]').getAttribute('data-email-current')==='incoming','Step control failed');await page.getByRole('button',{name:'Your reply',exact:true}).click();check(await page.locator('[data-email-walkthrough]').getAttribute('data-email-current')==='reply','Reply control failed');check(await page.locator('[data-email-play]').innerText()==='Play','Manual selection did not pause');
  await page.getByRole('button',{name:'Conversation',exact:true}).click();await page.locator('.email-faq summary').first().click();check((await page.locator('.email-faq details').first().innerText()).includes('18-character'),'Address FAQ incomplete');
  check(await page.locator('a[href="/book/"]').count()>0,'Missing booking link');check(api.length===0,'Email guide contacted API');check(errors.length===0,'Email errors: '+errors.join(';'));
  await page.goto(origin+'/book/');await page.locator('[data-booking-guide]').waitFor();check(await page.locator('.book-guide-hero .booking-card').evaluate(e=>{const button=[...e.querySelectorAll('button')].find(b=>b.textContent.trim()==='Continue');return !!button&&button.getBoundingClientRect().bottom<=e.getBoundingClientRect().bottom-8;}),'Booking Continue control clipped at '+width);check(await page.locator('a[href="/email/"]').count()>0,'Missing reciprocal email link');check(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),'Book overflow at '+width);await page.screenshot({path:`${evidence}/book-${width}.png`,fullPage:true});check(api.length===0,'Marketing booking contacted API');
  results.push({width,geometry,apiRequests:api.length,errors});await context.close();
 }
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:1488,height:1058}}),page=await context.newPage();await page.route('**/api/**',route=>route.abort());await page.goto(origin+'/email/');check(await page.getByRole('heading',{level:1}).innerText()==='Your username.\nYour email.','Static headline missing');check((await page.locator('.email-demo-view').innerText()).includes('Can we talk about the project?'),'Real first-frame email missing');check((await page.locator('main').innerText()).includes('Use your Receiz email today.'),'Static account-linking explanation missing');await page.screenshot({path:`${evidence}/email-no-javascript.png`,fullPage:true});await context.close();
 await writeFile(`${evidence}/results.json`,JSON.stringify({ok:true,method:'Playwright fallback after IAB unavailable',results,noJavascript:true},null,2)+'\n');console.log(JSON.stringify({ok:true,viewports:results.length,noJavascript:true,apiRequests:0,evidence}));
}finally{await browser.close();}

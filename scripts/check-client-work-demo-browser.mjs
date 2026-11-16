import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {PDFDocument} from 'pdf-lib';
import {unzipSync,strFromU8} from 'fflate';
import {clientWorkScenarios} from '../src/content/client-work-scenarios.mjs';

// Qualify the actual compiled anonymous entrance, with account APIs stalled.
const directory=resolve(process.env.BANK_CLIENT_WORK_DIST??'dist'),output=resolve(process.env.BANK_CLIENT_WORK_EVIDENCE??'test-results/client-work-demo');await mkdir(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.mjs':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.wasm':'application/wasm','.ttf':'font/ttf'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),file=resolve(directory,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(directory+'/')){res.writeHead(403).end();return;}const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404).end();}});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
const origin='http://127.0.0.1:'+server.address().port,results=[],routes=['/proposals/','/ai-documents/','/sign-agreements/','/client-communication/','/business/invoices/','/business/client-management/','/business/for/photographers/','/business/for/copywriters/','/business/for/virtual-assistants/'];let browser,passed=false;
try{
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 for(const width of [390,1280]){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900},serviceWorkers:'block'}),page=await context.newPage();
  for(const path of routes){const response=await page.goto(origin+path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,path);assert.ok(await page.locator('h1').isVisible());const demo=page.locator('[data-client-work-demo]');assert.equal(await demo.count(),1,path);assert.ok(await demo.locator('[data-example-message="brief"]').isVisible());assert.equal(await demo.locator('select option').count(),12);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow: '+path+' '+width);assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://bankeiz.com'+path);results.push({path,width,javaScript:false,visible:true});}
  await context.close();
 }
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block',acceptDownloads:true}),page=await context.newPage(),errors=[],api=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.route('**/api/**',route=>{api.push(route.request().url());return new Promise(()=>{});});
  let release;const held=new Promise(done=>{release=done;});await page.route('**/learn/client-work-demo.js',async route=>{await held;await route.continue();});
  await page.goto(origin+'/proposals/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{window.__heldExampleMessage=document.querySelector('[data-example-message="brief"]');});release();
  await page.waitForFunction(()=>Object.keys(document.querySelector('[data-client-work-demo]')??{}).some(key=>key.startsWith('__reactFiber$')));
  assert.equal(await page.evaluate(()=>window.__heldExampleMessage===document.querySelector('[data-example-message="brief"]')),true,'Hydration retains the held message DOM.');
  const demo=page.locator('[data-client-work-demo]');await demo.scrollIntoViewIfNeeded();await demo.screenshot({path:resolve(output,'messages-'+width+'.png')});
  for(const scenario of clientWorkScenarios){await demo.getByLabel('Choose your work').selectOption(scenario.id);assert.equal(await demo.locator('[data-example-message="brief"] p').textContent(),scenario.brief);}
  await demo.getByLabel('Choose your work').selectOption('web-design');await demo.getByRole('button',{name:'Open Workspace',exact:true}).first().click();
  await demo.screenshot({path:resolve(output,'workspace-'+width+'.png')});await demo.getByRole('button',{name:'Context',exact:true}).click();await demo.getByRole('textbox',{name:'Search this relationship'}).fill('review');assert.ok(await demo.locator('.bank-relationship-context-list button:visible').count()>0);await demo.getByRole('textbox',{name:'Search this relationship'}).fill('');
  await demo.getByRole('button',{name:'Twin',exact:true}).click();await demo.getByRole('button',{name:'Edit proposal draft',exact:true}).click();
  await demo.getByRole('textbox',{name:'Title',exact:true}).fill('Edited client website');await demo.getByRole('textbox',{name:'Item 1 price in USD',exact:true}).fill('1250.00');await demo.getByRole('button',{name:'Preview PDF',exact:true}).click();
  await demo.getByRole('link',{name:'Download draft PDF'}).waitFor();assert.ok((await demo.locator('.bank-proposal-preview').textContent()).includes('Edited client website'));
  const [pdfDownload]=await Promise.all([page.waitForEvent('download'),demo.getByRole('link',{name:'Download draft PDF'}).click()]);assert.equal(pdfDownload.suggestedFilename(),'Edited client website.pdf');const pdf=await PDFDocument.load(await readFile(await pdfDownload.path()));assert.ok(pdf.getPageCount()>0);
  await demo.locator('.proof-pdf-reader canvas').waitFor({state:'visible',timeout:30000});
  await page.screenshot({path:resolve(output,'proposal-'+width+'.png'),fullPage:false});
  await demo.getByRole('button',{name:'Edit details',exact:true}).click();await demo.getByRole('textbox',{name:'Title',exact:true}).fill('Revised client website');assert.equal(await demo.getByRole('link',{name:'Download draft PDF'}).count(),0);
  await demo.getByRole('button',{name:'Back to chat',exact:true}).click();await demo.getByRole('button',{name:'Draft proposal',exact:true}).click();assert.equal(await demo.getByRole('textbox',{name:'Title',exact:true}).inputValue(),'Revised client website');
  await demo.getByRole('button',{name:'Preview PDF',exact:true}).click();await demo.getByRole('button',{name:'Add to example conversation',exact:true}).click();await demo.locator('[data-example-message="local-1"]').waitFor({state:'visible'});
  await demo.getByRole('button',{name:'Open Workspace',exact:true}).first().click();await demo.getByRole('button',{name:'Work',exact:true}).click();await demo.getByRole('button',{name:'Document',exact:true}).click();
  await demo.getByRole('textbox',{name:'Document title',exact:true}).fill('Edited project handover');await demo.getByRole('combobox',{name:'File format',exact:true}).selectOption('docx');await demo.getByRole('button',{name:'Preview file',exact:true}).click();await demo.getByRole('link',{name:'Download editable copy'}).waitFor();
  const [officeDownload]=await Promise.all([page.waitForEvent('download'),demo.getByRole('link',{name:'Download editable copy'}).click()]);const zip=unzipSync(await readFile(await officeDownload.path()));assert.ok(strFromU8(zip['word/document.xml']).includes('Edited project handover'));assert.equal(zip['bankeiz/document.json'],undefined);
  await page.locator('a[href="/business/invoices/"]').first().click();await page.waitForFunction(()=>location.pathname==='/business/invoices/');await page.locator('[data-client-work-root] button').filter({hasText:'Draft invoice'}).waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.__heldExampleMessage.isConnected),false,'Retained public navigation disposes the old example.');
  assert.equal(await page.locator('dialog[open]').count(),0,'Embedded editors never open a modal or lock the page.');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);assert.deepEqual(api,[],'The example never starts account, AI or transaction APIs.');assert.deepEqual(errors,[],'No browser or hydration errors.');
  results.push({width,javaScript:true,scenarios:12,sameDOMHydration:true,editedPDF:true,pdfCanvas:true,editedWord:true,draftRetention:true,APIs:0,errors:0});await context.close();
 }
 passed=true;console.log(JSON.stringify({passed,checks:results}));
}finally{await writeFile(resolve(output,'results.json'),JSON.stringify({passed,results},null,2));await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));}

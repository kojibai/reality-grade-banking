import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import {clientWorkPages} from '../src/content/client-work-library.mjs';

// Inspect the actual compiled editorial documents, never the private account.
const directory=resolve(process.env.BANK_RESOURCE_DIRECTORY??'dist'),output=resolve('test-results/client-work-library');await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),file=resolve(directory,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(directory+'/')){res.writeHead(403).end();return;}
  const bytes=await readFile(file),type={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'}[extname(file)]??'application/octet-stream';res.writeHead(200,{'content-type':type});res.end(bytes);
 }catch{res.writeHead(404).end();}
});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
const origin='http://127.0.0.1:'+server.address().port,results=[];let browser,passed=false;
try{
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 for(const width of [390,1280]){
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:844},acceptDownloads:true,serviceWorkers:'block'}),page=await context.newPage(),api=[];
  await page.route('**/api/**',route=>{api.push(route.request().url());return new Promise(()=>{});});
  try{
   for(const resource of clientWorkPages){
    const response=await page.goto(origin+resource.path,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,resource.path);
    assert.equal(await page.locator('h1').textContent(),resource.title);assert.ok(await page.locator('h1').isVisible());
    assert.equal(await page.locator('script[src],iframe,form').count(),0);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No horizontal overflow: '+width+' '+resource.path);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://bankeiz.com'+resource.path);
    if(['/learn/resources/','/learn/templates/web-design-proposal/'].includes(resource.path))await page.screenshot({path:resolve(output,(resource.kind==='directory'?'library':'template')+'-'+width+'.png'),fullPage:true});
    results.push({path:resource.path,width,status:200,visibleWithoutJavaScript:true,APIRequests:0,overflow:false});
   }
   assert.deepEqual(api,[],'Editorial pages never open an account or request APIs.');
   await page.goto(origin+'/learn/templates/web-design-proposal/',{waitUntil:'domcontentloaded'});
   const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Download text file',exact:true}).click()]);
   assert.equal(download.suggestedFilename(),'web-design-proposal.txt');
   assert.deepEqual(await readFile(await download.path()),await readFile(resolve(directory,'learn/templates/web-design-proposal/template.txt')),'Actual browser download preserves complete bytes.');
  }finally{await context.close();}
 }
 passed=true;console.log(JSON.stringify({passed,pages:clientWorkPages.length,viewportChecks:results.length,javaScript:false,APIsStalled:true,actualTextDownload:true}));
}finally{
 await writeFile(resolve(output,'results.json'),JSON.stringify({passed,results},null,2));await browser?.close();server.closeAllConnections();await new Promise(done=>server.close(done));
}

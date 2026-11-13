import assert from 'node:assert/strict';
import {writeFile,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'vite';
import {chromium} from 'playwright';

// Record only the actual read-only browser suite for the exact current native
// verifier. This is reference evidence, never an institution credential.
const cache=await mkdtemp(join(tmpdir(),'bank-entrance-reference-'));
const server=await createServer({cacheDir:cache,server:{host:'127.0.0.1',port:0},optimizeDeps:{noDiscovery:true}});
let browser,report;
try{
 server.middlewares.use((request,response,next)=>{if(request.url!=='/__reference-check')return next();response.setHeader('content-type','text/html');response.end('<!doctype html><title>Read-only reference qualification</title>');});
 await server.listen();const origin=server.resolvedUrls.local[0].replace(/\/$/,'');
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 const page=await browser.newPage();await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.goto(origin+'/__reference-check');
 report=await page.evaluate(async()=>{const {runEntranceReferenceChecks}=await import('/src/conformance/reference.ts');return runEntranceReferenceChecks(()=>{},()=>{});});
 assert.equal(report.localChecksPassed,true,JSON.stringify(report.checks));assert.equal(report.checks.length,12);assert.equal(report.financialActionsPerformed,0);assert.equal(report.creditAuthorized,false);assert.equal(report.institutionConformance,'not-assessed');
}finally{await browser?.close();await server.close();await rm(cache,{recursive:true,force:true});}
 await writeFile('src/content/conformance-reference-status.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:true,checks:report.checks.length,verifierModuleSha256:report.verifierModuleSha256,financialActionsPerformed:0}));

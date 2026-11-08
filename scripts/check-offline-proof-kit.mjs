import assert from 'node:assert/strict';
import {readFile,mkdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {unzipSync} from 'fflate';

// Public canonical fixture, exact production exporter and extracted ZIP.
// No transaction, identity or resealing operation runs in this qualification.
const output=resolve('test-results/offline-proof-kit'),directory=await mkdtemp(join(tmpdir(),'bank-offline-proof-kit-')),NativeURL=globalThis.URL,originalFetch=globalThis.fetch,previousLocation=globalThis.location;
await mkdir(output,{recursive:true});
let vite,browser,passed=false;
const results=[];
try{
 await import(pathToFileURL(resolve('public/proof-verifier/v129/verifier.js')).href);
 const verifier=globalThis.ReceizOfflineVerifier,bytes=new Uint8Array(await readFile('public/proofs/sealed-essay.png')),report=await verifier.inspectArtifact(bytes,'existing-public-original.png');
 globalThis.location={origin:'https://bankeiz.com'};
 globalThis.URL=class extends NativeURL{constructor(input,base){super(input,base);if(this.pathname==='/proof-verifier/v129/verifier.js')return new NativeURL(pathToFileURL(resolve('public/proof-verifier/v129/verifier.js')));}};
 const reads=[];
 globalThis.fetch=async input=>{const name=String(input).match(/^\/proof-verifier\/v129\/([a-zA-Z0-9_.-]+)$/)?.[1];if(!name)throw Error('KIT_EXTERNAL_READ_FORBIDDEN');reads.push(name);return new Response(await readFile('public/proof-verifier/v129/'+name));};
 vite=await createServer({server:{middlewareMode:true},appType:'custom'});
 const inspections=await vite.ssrLoadModule('/src/receiz/proof-inspection.ts'),api=await vite.ssrLoadModule('/src/receiz/ledger-offline-proof.ts');
 inspections.retainProofInspection(report,bytes,'existing-public-original.png');
 const record={id:'proofs:offline-kit-qualification',sourceId:'offline-kit-qualification',source:'proofs',kind:'proof recorded',title:'Existing public proof · export qualification',detail:'',time:null,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:null,sourceUrl:null,evidence:{artifactDigest:report.artifactSha256},details:{},authority:'public-source-projection'};
 const archive=await api.downloadLedgerEvidence(record,report),files=unzipSync(archive);
 assert.deepEqual(files['original.receiz'],bytes);assert.ok(files['verify.html']);assert.ok(files['verification-material.json']);assert.ok(files['verifier.js.map']);
 for(const [name,value]of Object.entries(files))await writeFile(join(directory,name),value);
 await writeFile(join(output,'verification-kit.zip'),archive);
 await vite.close();vite=null;globalThis.URL=NativeURL;globalThis.fetch=originalFetch;if(previousLocation===undefined)delete globalThis.location;else globalThis.location=previousLocation;
 browser=await chromium.launch({headless:true,...(process.env.BANK_BROWSER_EXECUTABLE?{executablePath:process.env.BANK_BROWSER_EXECUTABLE}:{})});
 for(const width of [390,1100]){
  const context=await browser.newContext({offline:true,viewport:{width,height:900}}),page=await context.newPage(),requests=[],errors=[];
  try{
   page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});page.on('pageerror',error=>errors.push(error.message));
   await page.goto(pathToFileURL(join(directory,'verify.html')).href);
   await page.locator('#file').setInputFiles(join(directory,'original.receiz'));
   await page.waitForFunction(()=>document.getElementById('badge').textContent==='VERIFIED');
   const result=JSON.parse(await page.locator('#result').textContent());assert.equal(result.artifactSha256,report.artifactSha256);assert.deepEqual(result.verification,report.verification);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Verifier must fit the viewport');assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
   await page.screenshot({path:join(output,'offline-verifier-'+width+'.png'),fullPage:true});
   await page.locator('#digest').fill('a'.repeat(64));await page.locator('#inspect').click();await page.waitForFunction(()=>document.getElementById('badge').textContent==='NOT VERIFIED');assert.equal(await page.locator('#result').textContent(),'SELECTED_RECORD_DIGEST_MISMATCH');
   const changed=bytes.slice();changed[changed.length-1]^=1;await page.locator('#digest').fill('');await page.locator('#file').setInputFiles({name:'changed.receiz',mimeType:'application/octet-stream',buffer:Buffer.from(changed)});await page.waitForFunction(()=>document.getElementById('badge').textContent==='NOT VERIFIED');assert.match(await page.locator('#result').textContent(),/CANONICAL_VERIFICATION_FAILED/);
   assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);results.push({width,fileURL:true,networkDisabled:true,uploadStartsVerification:true,exactCanonicalResult:true,wrongDigestRefused:true,changedProofRefused:true});
  }finally{await context.close();}
 }
 passed=true;console.log(JSON.stringify({passed,kitIncludesExactOriginal:true,checkedResources:reads.length,results},null,2));
}finally{
 globalThis.URL=NativeURL;globalThis.fetch=originalFetch;if(previousLocation===undefined)delete globalThis.location;else globalThis.location=previousLocation;
 await vite?.close();await browser?.close();await rm(directory,{recursive:true,force:true});await writeFile(join(output,'results.json'),JSON.stringify({passed,results},null,2));
}

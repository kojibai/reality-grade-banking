import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {clientWorkPages} from '../src/content/client-work-library.mjs';
import {resourceDownload} from './client-work-library.mjs';
import {publicPages} from './public-page-metadata.mjs';

export async function checkClientWorkLibrary(directory='dist'){
 const sitemap=await readFile(resolve(directory,'sitemap.xml'),'utf8'),known=new Set(publicPages.map(page=>page.path));let largest=0;
 for(const page of clientWorkPages){
  const html=await readFile(resolve(directory,'.'+page.path,'index.html'),'utf8'),size=Buffer.byteLength(html);largest=Math.max(largest,size);
  assert.ok(size<=150000,`Resource HTML budget: ${page.path}`);assert.ok(html.includes(`rel="canonical" href="https://bankeiz.com${page.path}"`),`Canonical: ${page.path}`);
  assert.equal((html.match(/<h1>/g)??[]).length,1,`One visible page heading: ${page.path}`);assert.ok(html.includes('name="robots" content="index,follow,max-image-preview:large"'));
  assert.ok(!/receiz-navigation|public-market-seed|<script[^>]+src=|<iframe|<link[^>]+rel="stylesheet"/.test(html),`No application, API or stylesheet prerequisite: ${page.path}`);
  assert.ok(sitemap.includes(`<loc>https://bankeiz.com${page.path}</loc>`),`Sitemap: ${page.path}`);
  for(const path of page.related??[])assert.ok(known.has(path),`Related resource ${page.path} → ${path}`);
  if(page.template)assert.equal(await readFile(resolve(directory,'.'+page.path,'template.txt'),'utf8'),resourceDownload(page),`Download matches the complete authored template and example: ${page.path}`);
 }
 const result={pages:clientWorkPages.length,downloads:clientWorkPages.filter(page=>page.template).length,largestHtmlBytes:largest};console.log('Verified static client-work library: '+JSON.stringify(result));return result;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await checkClientWorkLibrary();

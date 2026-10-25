import {access,copyFile,mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {docsArticles,docsOrigin,docsEdition,docsPaths,articleText} from './content.mjs';
import {docsDocument} from './renderer.mjs';
import {docsMarkdown} from './markdown.mjs';
import {sdkSandboxExample,mcpCheckExample} from './examples.mjs';
const appRoot=fileURLToPath(new URL('.',import.meta.url));
export function validateDocs(){
 const slugs=new Set();
 for(const page of docsArticles){
  if(!/^[a-z][a-z0-9-]+$/.test(page.slug)||slugs.has(page.slug))throw Error('DOCS_SLUG_INVALID:'+page.slug);slugs.add(page.slug);
  if(!page.title||!page.summary||page.sections.length<5||!page.sources.length||articleText(page).length<1800)throw Error('DOCS_ARTICLE_INCOMPLETE:'+page.slug);
  for(const section of page.sections){if(!section.title||!section.blocks.length)throw Error('DOCS_SECTION_EMPTY:'+page.slug);for(const block of section.blocks){
   if(block.type==='table'&&(!block.caption||block.columns.length<2||block.rows.some(row=>row.length!==block.columns.length)))throw Error('DOCS_TABLE_INVALID:'+page.slug);
   if(['steps','flow'].includes(block.type)&&block.items.some(item=>item.length!==2||item.some(x=>typeof x!=='string'||!x)))throw Error('DOCS_STEPS_INVALID:'+page.slug);
  }}
  for(const [label,href] of page.sources)if(!label||!/^https:\/\/(?:github\.com\/kojibai\/reality-grade-banking\/blob\/|bankeiz\.com\/|docs\.receiz\.com\/|receiz\.com\/developers)/.test(href))throw Error('DOCS_SOURCE_INVALID:'+page.slug);
 }
 for(const page of docsArticles)for(const slug of page.related)if(!slugs.has(slug)||slug===page.slug)throw Error('DOCS_RELATED_UNKNOWN:'+page.slug+':'+slug);
 for(const path of docsPaths)for(const slug of path.slugs)if(!slugs.has(slug))throw Error('DOCS_PATH_UNKNOWN:'+slug);
}
export async function buildDocs({root=resolve(appRoot,'dist'),base='/'}={}){
 validateDocs();if(!/^\/(?:docs\/)?$/.test(base))throw Error('DOCS_BASE_INVALID');
 const output=resolve(root);await mkdir(output+'/assets',{recursive:true});await mkdir(output+'/examples',{recursive:true});
 for(const [source,target] of [['styles.css','docs.css'],['search.js','docs.js'],['public/icon.svg','icon.svg'],['public/docs-share.png','docs-share.png']])await copyFile(resolve(appRoot,source),output+'/assets/'+target);
 await writeFile(output+'/examples/sdk-sandbox.mjs',sdkSandboxExample);await writeFile(output+'/examples/mcp-check.mjs',mcpCheckExample);
 for(const page of [null,...docsArticles]){const folder=output+(page?'/'+page.slug:'');await mkdir(folder,{recursive:true});await writeFile(folder+'/index.html',docsDocument(page,{base}));await writeFile(folder+'/index.md',docsMarkdown(page));}
 await writeFile(output+'/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['',...docsArticles.map(p=>p.slug+'/')].map(path=>`<url><loc>${docsOrigin}/${path}</loc><lastmod>${docsEdition.reviewed}</lastmod></url>`).join('')}</urlset>`);
 await writeFile(output+'/robots.txt','User-agent: *\nAllow: /\nSitemap: '+docsOrigin+'/sitemap.xml\n');
 await writeFile(output+'/llms.txt','# Reality-grade banking\n\nThe standard of the proof-native economy. Receiz supplies reality-grade infrastructure through SDK, MCP and AI Skills.\n\n- [Complete operating manual]('+docsOrigin+'/llms-full.txt)\n- [Structured article source]('+docsOrigin+'/articles.json)\n\n'+docsArticles.map(p=>`- [${p.title}](${docsOrigin}/${p.slug}/): ${p.summary}`).join('\n')+'\n');
 await writeFile(output+'/llms-full.txt',[docsMarkdown(),...docsArticles.map(docsMarkdown)].join('\n\n---\n\n'));
 await writeFile(output+'/articles.json',JSON.stringify({schema:'bankeiz.documentation.v1',description:'Public documentation source; not proof or financial authority.',origin:docsOrigin,edition:docsEdition,articles:docsArticles},null,2)+'\n');
 for(const page of [null,...docsArticles]){
  const documentPath=(page?page.slug+'/':'')+'index.html',html=await readFile(output+'/'+documentPath,'utf8');
  if(html.includes('receiz-navigation')||html.includes('serviceWorker')||!html.includes('data-doc-search'))throw Error('DOCS_RUNTIME_BOUNDARY');
  for(const match of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   const ref=match[1].replace(/&amp;/g,'&');if(/^https:\/\//.test(ref))continue;
   const target=new URL(ref,'https://manual.invalid'+base+(page?page.slug+'/':''));if(target.origin!=='https://manual.invalid'||!target.pathname.startsWith(base))throw Error('DOCS_LINK_OUTSIDE:'+ref);
   let path=decodeURIComponent(target.pathname.slice(base.length));if(path.endsWith('/')||!path)path+='index.html';
   const resolved=resolve(output,path);if(relative(output,resolved).startsWith('..'))throw Error('DOCS_PATH_ESCAPE');await access(resolved);
   if(target.hash){const targetHtml=resolved.endsWith('.html')?await readFile(resolved,'utf8'):'';if(!targetHtml.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`))throw Error('DOCS_ANCHOR_MISSING:'+ref);}
  }
 }
 console.log(`Built ${docsArticles.length} source-linked operating-manual articles, Markdown, full-text index and runnable examples in ${root}; independent static runtime, canonical ${docsOrigin}.`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await buildDocs();

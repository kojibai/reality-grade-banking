import {Window} from 'happy-dom';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {READING_PAGE_SIZE,createReadingDocument,escapeReading,readingLink,readingLinks,readingParagraph,renderReadingDocument,publicCatalogReading,publicLedgerReading} from '../server/public-reading-document.ts';

const elements=new Set('main article section header footer nav h1 h2 h3 h4 h5 h6 p ul ol li dl dt dd pre code blockquote figure figcaption img details summary strong em b i small sup sub table thead tbody tr th td br hr a span div label'.split(' '));
const omit=new Set(['script','style','template','svg','canvas','iframe','form','input','textarea','select','noscript']);
const blocks=new Set('main article section header footer nav h1 h2 h3 h4 h5 h6 p ul ol li dl dt dd pre blockquote figure figcaption details summary table tr div br hr'.split(' '));
/** Build-only semantic projection. No scripts, styles, input values, inert
 * templates, event attributes or account runtimes enter a reading page. */
export function readingPageContent(content,canonical){
 const window=new Window({settings:{disableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,disableCSSFileLoading:true,disableIframePageLoading:true}});
 window.document.body.innerHTML=content;
 const link=raw=>{try{return raw?readingLink(new URL(raw,canonical).href):null;}catch{return null;}};
 const walk=node=>{
  if(node.nodeType===3)return{html:escapeReading(node.textContent??''),text:node.textContent??''};
  if(node.nodeType!==1)return{html:'',text:''};const tag=node.localName;
  if(omit.has(tag)||node.hasAttribute('hidden')||node.getAttribute('aria-hidden')==='true')return{html:'',text:''};
  const children=[...node.childNodes].map(walk),body=children.map(part=>part.html).join('');let text=children.map(part=>part.text).join(''),html=body;
  if(elements.has(tag)){
   const attrs=[];if(node.id)attrs.push(`id="${escapeReading(node.id)}"`);
   if(tag==='a'){const href=link(node.getAttribute('href'));if(href){attrs.push(`href="${escapeReading(href)}"`);text+=` (${href})`;}}
   if(tag==='img'){
    const src=link(node.getAttribute('src')),alt=node.getAttribute('alt')??'';
    if(!src)return{html:'',text:''};attrs.push(`src="${escapeReading(src)}"`,`alt="${escapeReading(alt)}"`,'loading="lazy"');text=`${alt} (${src})`;
   }
   html=`<${tag}${attrs.length?' '+attrs.join(' '):''}>${body}${['img','br','hr'].includes(tag)?'':`</${tag}>`}`;
  }
  return{html,text:blocks.has(tag)?'\n'+text+'\n':text};
 };
 const parts=[...window.document.body.childNodes].map(walk),result={html:parts.map(part=>part.html).join(''),text:parts.map(part=>part.text).join('').replace(/\n[\t ]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim()+'\n'};
 window.happyDOM.abort();return result;
}

export async function writePublicReadingPages({outdir,pages,catalog,ledger}){
 if(ledger.records.some(row=>row.authority!=='public-source-projection'))throw Error('READING_PUBLIC_SOURCE_REQUIRED');
 const paths=[],write=async(path,document)=>{
  if(!/^\/read\/[a-z0-9_/-]+\/$/.test(path))throw Error('READING_PATH_INVALID');
  await mkdir(join(outdir,path),{recursive:true});
  await Promise.all([writeFile(join(outdir,path,'index.html'),renderReadingDocument(document,'html')),writeFile(join(outdir,path,'index.txt'),renderReadingDocument(document,'text'))]);paths.push(path);
 };
 const guideLinks=[];
 for(const [path,page]of Object.entries(pages)){
  const canonical='https://bankeiz.com'+path,body=readingPageContent(page.content,canonical),reading='/read/pages'+path;
  await write(reading,createReadingDocument(page.title,page.description??'',canonical,[body,readingLinks('Public source directories',[{label:'All public Originals',href:'/read/catalog/'},{label:'Retained public Ledger',href:'/read/ledger/'}]) ]));
  guideLinks.push({label:page.title,href:reading});
 }
 for(let page=1;page<=Math.max(1,Math.ceil(catalog.items.length/READING_PAGE_SIZE));page++)await write('/read/catalog/'+(page===1?'':page+'/'),publicCatalogReading(catalog.items,catalog.observedAt,page));
 for(let page=1;page<=Math.max(1,Math.ceil(ledger.records.length/READING_PAGE_SIZE));page++)await write('/read/ledger/'+(page===1?'':page+'/'),publicLedgerReading(ledger.records,ledger.capturedAt,page));
 await write('/read/public/',createReadingDocument('Bankeiz public reading','Public text, source observations and evidence without running the account app.','https://bankeiz.com/',[
  readingParagraph('Open a named Original for its complete carried public text, price observation, valuation inputs, proof references and permitted material links. Private identities, accounts and receipts are not part of this directory.'),
  readingLinks('Public content',[{label:'Public Originals and owners',href:'/read/catalog/'},{label:'Public Ledger capture',href:'/read/ledger/'}]),readingLinks('Public pages',guideLinks),
 ]));
 await writeFile(join(outdir,'reading-sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>`<url><loc>https://bankeiz.com${escapeReading(path)}</loc></url>`).join('')+'</urlset>');
 return{pages:paths.length,assets:catalog.items.length,publicRecords:ledger.records.length};
}

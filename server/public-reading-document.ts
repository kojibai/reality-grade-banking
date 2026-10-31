import type {PublicMarketItem} from '../src/receiz/public-market';
import type {PublicProfile} from '../src/receiz/public-profile';
import type {PublicRecord} from '../src/receiz/public-network';
import {publicAssetManifest} from '../src/receiz/public-asset-manifest.js';

/** Inert public presentation only. This module never reads a source, evaluates
 * a price, verifies a proof, or imports the account runtime. */
export type ReadingFragment={html:string;text:string};
export type ReadingDocument={title:string;description:string;canonical:string;contentHtml:string;contentText:string};
export type PublicReadingAsset=PublicMarketItem&{readingPricing?:Record<string,string|number|boolean>;readingMedia?:Record<string,string|number|boolean>};
export const READING_PAGE_SIZE=50;
const origin='https://bankeiz.com';
export const escapeReading=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function readingLink(value:unknown):string|null{
 if(typeof value!=='string'||!value||value.length>8192||/[\x00-\x1f\x7f\\]/.test(value)||value.startsWith('//'))return null;
 try{const url=new URL(value,origin);return url.protocol==='https:'&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
export function readingParagraph(text:string):ReadingFragment{return{html:`<p>${escapeReading(text)}</p>`,text:text+'\n\n'};}
export function readingFields(title:string,fields:{label:string;value:unknown;href?:string|null}[]):ReadingFragment{
 const rows=fields.filter(field=>field.value!==null&&field.value!==undefined&&field.value!=='').map(field=>({...field,value:String(field.value),href:readingLink(field.href)}));
 if(!rows.length)return{html:'',text:''};
 return{html:`<section><h2>${escapeReading(title)}</h2><dl>${rows.map(row=>`<dt>${escapeReading(row.label)}</dt><dd>${row.href?`<a href="${escapeReading(row.href)}">${escapeReading(row.value)}</a>`:escapeReading(row.value)}</dd>`).join('')}</dl></section>`,text:title+'\n'+rows.map(row=>`${row.label}: ${row.value}${row.href&&row.href!==row.value?' — '+row.href:''}`).join('\n')+'\n\n'};
}
export function readingLinks(title:string,links:{label:string;href:string|null|undefined}[]):ReadingFragment{
 const rows=links.flatMap(link=>{const href=readingLink(link.href);return href?[{label:link.label,href}]:[];});
 return rows.length?{html:`<section><h2>${escapeReading(title)}</h2><ul>${rows.map(row=>`<li><a href="${escapeReading(row.href)}">${escapeReading(row.label)}</a></li>`).join('')}</ul></section>`,text:title+'\n'+rows.map(row=>`${row.label} — ${row.href}`).join('\n')+'\n\n'}:{html:'',text:''};
}
export function readingJson(title:string,value:unknown):ReadingFragment{
 if(value===undefined||value===null)return{html:'',text:''};const text=JSON.stringify(value,null,2);
 return{html:`<section><h2>${escapeReading(title)}</h2><pre>${escapeReading(text)}</pre></section>`,text:title+'\n'+text+'\n\n'};
}
export function createReadingDocument(title:string,description:string,canonical:string,parts:ReadingFragment[]):ReadingDocument{
 return{title,description,canonical,contentHtml:parts.map(part=>part.html).join(''),contentText:parts.map(part=>part.text).join('')};
}
export function renderReadingDocument(document:ReadingDocument,format:'html'|'text'){
 if(format==='text')return `${document.title}\n${document.canonical}\n\n${document.description}\n\n${document.contentText}`;
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeReading(document.title)} | Bankeiz</title><meta name="description" content="${escapeReading(document.description)}"><link rel="canonical" href="${escapeReading(document.canonical)}"><meta name="robots" content="index,follow,max-image-preview:large"></head><body><header><a href="/read/public/">Bankeiz public reading</a> · <a href="${escapeReading(document.canonical)}">Open in Bankeiz</a></header><main><h1>${escapeReading(document.title)}</h1><p>${escapeReading(document.description)}</p>${document.contentHtml}</main></body></html>`;
}
const assetPath=(id:string)=>'/asset/'+encodeURIComponent(id)+'/';
const assetReadPath=(id:string)=>'/read/assets/'+encodeURIComponent(id)+'/';
// Preserve Bankeiz's established reserved-handle routing in the public view.
import {profilePagePath} from '../src/receiz/public-profile.js';
function pageRows<T>(rows:T[],page:number){const pages=Math.max(1,Math.ceil(rows.length/READING_PAGE_SIZE));if(!Number.isSafeInteger(page)||page<1||page>pages)throw Error('READING_PAGE_NOT_FOUND');return{rows:rows.slice((page-1)*READING_PAGE_SIZE,page*READING_PAGE_SIZE),pages};}
const pagination=(path:string,page:number,pages:number,query=true)=>{
 const target=(number:number)=>query?path+'?page='+number:number===1?path:path+number+'/';
 return readingLinks('More public records',[...(page>1?[{label:'Previous page',href:target(page-1)}]:[]),...(page<pages?[{label:'Next page',href:target(page+1)}]:[])]);
};

export function publicAssetReading(item:PublicReadingAsset):ReadingDocument{
 const manifest=item.proofManifest??(item.proofManifestSource?publicAssetManifest(item.proofManifestSource,{pulse:item.pulse,verifyUrl:item.verifyUrl}):[]);
 const known=manifest.filter(row=>!/^(?:Unavailable|Not attached|pending)$/i.test(row.value)&&!row.value.includes('pending/')&&!row.value.includes('/pending')&&(row.label!=='Circuit'||!!item.proofManifestSource?.proof.circuit));
 const parts=[readingParagraph(item.summary),readingFields('Public Original',[
  {label:'Asset ID',value:item.id},{label:'Native asset ID',value:item.assetId},{label:'Owner',value:item.ownerUsername?'@'+item.ownerUsername:item.ownerDisplayName,href:item.ownerUsername?profilePagePath(item.ownerUsername):item.ownerProfileUrl},
  {label:'Original Kai pulse',value:item.pulse},{label:'Sealed at',value:item.sealedAt},{label:'Observed USD value',value:item.priceUsd},{label:'Observed change percent',value:item.changePct},{label:'Original digest',value:item.originalDigest},
 ]),readingParagraph('Values are observations carried by the public source, not execution terms. Original evidence and material access keep their existing rules.')];
 if(item.carriedText)parts.push({html:`<section><h2>${escapeReading(item.carriedText.title??'Complete public text')}</h2><pre>${escapeReading(item.carriedText.text)}</pre></section>`,text:(item.carriedText.title??'Complete public text')+'\n'+item.carriedText.text+'\n\n'},readingFields('Carried text evidence',[{label:'Text SHA-256',value:item.carriedText.sha256Hex}]));
 parts.push(readingFields('Public proof manifest',known),readingJson('Carried public pricing',item.readingPricing),readingJson('Carried valuation inputs',item.livePulseSeed??item.sportsValuation),readingJson('Carried chart observations',item.chart.length?item.chart:undefined),readingJson('Public share inventory',item.shareInventory),readingJson('Native collectible presentation',item.collectiblePresentation),readingJson('Public native asset binding',item.nativeAsset),readingJson('Carried material details',item.readingMedia),readingFields('Public book evidence',[{label:'Book payload SHA-256',value:item.book?.payloadDigest}]),...copyReading(item),readingLinks('Public materials and source',[
  {label:'Original public source',href:item.sourceUrl},{label:'Verification reference',href:item.verifyUrl},{label:'Public artwork',href:item.artworkUrl},{label:'Public document reader',href:item.documentUrl},{label:'Public book preview',href:item.book?.url},{label:'Public reading source',href:item.readingUrl},{label:'Original download endpoint (existing access rules apply)',href:item.originalUrl},
  ...(item.playback?[{label:'Public media stream',href:item.playback.url}]:[]),
 ]));
 return createReadingDocument(item.title,item.summary,origin+assetPath(item.id),parts);
}
const copyOwnerLinks=(item:PublicMarketItem)=>[...new Set((item.sealedCopies??[]).map(copy=>copy.ownerUsername).filter((name):name is string=>!!name))].map(name=>({label:'@'+name,href:'/read/profiles/'+name+'/'}));
function copyReading(item:PublicMarketItem):ReadingFragment[]{
 return(item.sealedCopies??[]).flatMap(copy=>[readingFields('Public collectible copy',[{label:'Collectible ID',value:copy.collectibleId},{label:'Claim SHA-256',value:copy.claimHash},{label:'Sealed at',value:copy.sealedAt},{label:'Public owner',value:copy.ownerUsername?'@'+copy.ownerUsername:copy.ownerDisplayName,href:copy.ownerUsername?'/read/profiles/'+copy.ownerUsername+'/':copy.ownerProfileUrl}])]);
}
export function publicProfileReading(profile:PublicProfile,page=1):ReadingDocument{
 const selected=pageRows(profile.items.filter(item=>item.hasPbiSignature===true),page),path='/read/profiles/'+profile.username+'/';
 return createReadingDocument(profile.displayName,profile.bio??'Public Originals and profile.',origin+profilePagePath(profile.username),[
  readingFields('Public profile',[{label:'Receiz ID',value:profile.username},{label:'Location',value:profile.location},{label:'Created',value:profile.createdAt},{label:'Profile PBI receipt',value:profile.pbiReceiptHash}]),
  readingFields('Carried public statistics',Object.entries(profile.stats).map(([label,value])=>({label,value}))),
  readingLinks('Public profile links',[...profile.links.map(link=>({label:link.label,href:link.url})),...profile.socialLinks.map(link=>({label:link.label,href:link.url})),{label:'Website',href:profile.websiteUrl}]),
  ...selected.rows.map(item=>[readingLinks(item.title,[{label:'Read the public Original',href:assetReadPath(item.id)},{label:'Open in Bankeiz',href:assetPath(item.id)}]),readingFields('Carried Original observation',[{label:'Observed USD value',value:item.priceUsd},{label:'Original Kai pulse',value:item.pulse}])]).flat(),pagination(path,page,selected.pages),
 ]);
}
export function publicCatalogReading(items:PublicMarketItem[],observedAt:string|null,page=1):ReadingDocument{
 const selected=pageRows(items,page);
 return createReadingDocument('Public Originals — page '+page,'Public catalog observations. Open a named Original for its current public source and complete carried content.',origin+'/discover/',[
  readingFields('Catalog observation',[{label:'Observed at',value:observedAt},{label:'Public assets',value:items.length}]),
  ...selected.rows.map(item=>[readingLinks(item.title,[{label:'Read the public Original',href:assetReadPath(item.id)},{label:'Open in Bankeiz',href:assetPath(item.id)},{label:item.ownerUsername?'@'+item.ownerUsername:'Public owner',href:item.ownerUsername?'/read/profiles/'+item.ownerUsername+'/':null},...copyOwnerLinks(item)]),readingParagraph(item.summary),readingFields('Carried observation',[{label:'Observed USD value',value:item.priceUsd},{label:'Original Kai pulse',value:item.pulse},{label:'Original digest',value:item.originalDigest}])]).flat(),pagination('/read/catalog/',page,selected.pages,false),
 ]);
}
export function publicLedgerReading(records:PublicRecord[],capturedAt:string|null,page=1):ReadingDocument{
 const selected=pageRows(records,page);if(selected.rows.some(row=>row.authority!=='public-source-projection'))throw Error('READING_PUBLIC_SOURCE_REQUIRED');
 return createReadingDocument('Public Ledger — page '+page,'Retained public source observations. Recorded amounts and event coordinates retain their original basis.',origin+'/ledger/',[
  readingFields('Retained public capture',[{label:'Captured at',value:capturedAt},{label:'Records',value:records.length}]),
  ...selected.rows.map(row=>[readingFields(row.title,[{label:'Record ID',value:row.id},{label:'Kind',value:row.kind},{label:'Description',value:row.detail},{label:'Recorded USD cents',value:row.amountUsdCents},{label:'Original Kai pulse',value:row.pulse},{label:'Original Kai micro-pulse',value:row.kaiUpulse},{label:'Recorded time',value:row.time}]),readingJson('Carried public evidence',{evidence:row.evidence,valueOperands:row.valueOperands,details:row.details}),readingLinks('Record source',[{label:'Public source',href:row.sourceUrl},{label:'View in Ledger',href:'/ledger/#record='+encodeURIComponent(row.id)},{label:'Read related Original',href:row.valueOperands?.marketItemId?assetReadPath(row.valueOperands.marketItemId):null}])]).flat(),pagination('/read/ledger/',page,selected.pages,false),
 ]);
}

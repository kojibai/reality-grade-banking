import {publicProfileReservedNames} from '../src/receiz/public-profile.js';

const navigation=/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/;
const destinations=['/explore/','/feed/','/discover/','/standards/','/legal/','/learn/account-access/'];
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

/** Reuse the existing lean public-navigation contract. Profile workspaces,
 * footer and identity destinations keep their exact carried bytes; other
 * guides remain ordinary links to their existing complete documents. */
export function profileNavigationHtml(html:string):string {
 const match=navigation.exec(html);if(!match)return html;
 try{
  const source:unknown=JSON.parse(match[1]);
  if(!object(source)||!object(source.pages)||!object(source.bank)||!object(source.pages['/explore/']))return html;
  const pages=source.pages,bank=source.bank,blocks=Array.isArray(source.styles)?source.styles:[],styles:unknown[]=[],indices=new Map<number,number>();
  const compact=(entry:Record<string,unknown>)=>Object.fromEntries(Object.entries(entry).map(([key,value])=>[key,key==='styles'||!Array.isArray(value)?value:value.map(part=>{
   if(typeof part!=='number')return part;
   if(!Number.isSafeInteger(part)||part<0||typeof blocks[part]!=='string')throw Error('PROFILE_NAVIGATION_INVALID');
   let index=indices.get(part);if(index===undefined){index=styles.length;indices.set(part,index);styles.push(blocks[part]);}return index;
  })]));
  const selected=Object.fromEntries(destinations.filter(path=>object(pages[path])).map(path=>[path,compact(pages[path] as Record<string,unknown>)]));
  const selectedBank={...compact(bank),...(object(bank.css)?{css:compact(bank.css)}:{})};
  // A future linked destination with examples must keep its referenced table.
  // Do not remove another surface's content merely to meet a delivery budget.
  if(JSON.stringify([selected,selectedBank,styles]).includes('data-example-views'))return html;
  const routes=[...Object.keys(pages),...Object.keys(object(source.aliases)?source.aliases:{})];
  const reserved=[...new Set([...publicProfileReservedNames,...(Array.isArray(source.reserved)?source.reserved.filter((name):name is string=>typeof name==='string'):[]),...routes.flatMap(path=>/^\/([a-z0-9_]{3,24})\/$/.exec(path)?.[1]??[])])];
  const body=JSON.stringify({...source,pages:selected,bank:selectedBank,reserved,styles}).replaceAll('<','\\u003c');
  return html.replace(navigation,()=>`<script id="receiz-navigation" type="application/json">${body}</script>`)
   .replace(/<template data-shared-example-views>[^<]*<\/template>/g,'');
 }catch{return html;}
}

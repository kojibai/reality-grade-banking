import {decodeNavigationEnvelope,encodeNavigationEnvelope} from '../scripts/navigation-envelope.mjs';
import {createHash} from 'node:crypto';
import {publicProfileReservedNames} from '../src/receiz/public-profile.js';

const navigation=/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/;
const destinations=['/explore/','/feed/','/discover/','/vote/','/standards/','/legal/','/learn/account-access/'];
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);

/** Reuse the existing lean public-navigation contract. Profile workspaces,
 * footer and identity destinations keep their exact carried bytes. Other
 * known destinations retain metadata for the same lazy public router. */
export function profileNavigationHtml(
 html:string, extraDestinations:readonly string[]=[],
 alignPages?:(pages:Record<string, Record<string,unknown>>)=>void,
):string {
 const match=navigation.exec(html);
 if(!match)return html;
 try {
  const envelope=JSON.parse(match[1]);
  const opened=decodeNavigationEnvelope(envelope);
  const compacted=compactProfileNavigation(opened.navigation,opened.shared,html,extraDestinations);
  const selected=compacted??opened.navigation;
  if(!compacted&&(!alignPages||!object(selected?.pages)))return html;
  alignPages?.(selected.pages);
  const shared=compacted?'':opened.shared;
  const body=JSON.stringify(envelope.format==='bank.presentation-envelope.v1'?encodeNavigationEnvelope(selected,shared):selected).replaceAll('<','\\u003c');
  const result=html.replace(navigation,()=>`<script id="receiz-navigation" type="application/json">${body}</script>`);
  return compacted?result.replace(/<template data-shared-example-views>[^<]*<\/template>/g,''):result;
 } catch(error) {
  if(alignPages)throw error;
  return html;
 }
}

function compactProfileNavigation(source:unknown,sharedMarkup:string,html:string,extraDestinations:readonly string[]) {
 if(!object(source)||!object(source.pages)||!object(source.bank)||!object(source.pages['/explore/']))return null;
 try {
  const pages=source.pages,bank=source.bank,blocks=Array.isArray(source.styles)?source.styles:[],styles:unknown[]=[],indices=new Map<number,number>();
  const compact=(entry:Record<string,unknown>)=>Object.fromEntries(Object.entries(entry).map(([key,value])=>[key,key==='styles'||!Array.isArray(value)?value:value.map(part=>{
   if(typeof part!=='number')return part;
   if(!Number.isSafeInteger(part)||part<0||typeof blocks[part]!=='string')throw Error('PROFILE_NAVIGATION_INVALID');
   let index=indices.get(part);if(index===undefined){index=styles.length;indices.set(part,index);styles.push(blocks[part]);}return index;
  })]));
  const carried=new Set([...destinations,...extraDestinations]),shared=sharedMarkup||html.match(/<template data-shared-example-views>[^<]*<\/template>/)?.[0],hash=(value:string)=>createHash('sha256').update(value).digest('hex');
  const lightweight=(entry:Record<string,unknown>)=>{const body=Array.isArray(entry.content)?entry.content.map(part=>typeof part==='number'?blocks[part]:part).join(''):entry.content,head=Array.isArray(entry.head)?entry.head.map(part=>typeof part==='number'?blocks[part]:part).join(''):entry.head;return {...entry,...(!entry.runtime?{title:undefined}:{}),...(typeof head==='string'&&head&&!['explore','ledger','feed','discover'].includes(String(entry.runtime))?{head:'',...(!entry.runtime?{headSha256:hash(head),headLength:head.length}:{})}:{}),content:'',...(!entry.runtime&&typeof body==='string'&&body?{contentSha256:hash(body),...(body.includes('data-example-views')&&shared?{sharedExampleSha256:hash(shared)}:{})}:{})};};
  const selected=Object.fromEntries(Object.entries(pages).filter(([,entry])=>object(entry)).map(([path,entry])=>[path,compact(carried.has(path)?entry as Record<string,unknown>:lightweight(entry as Record<string,unknown>))]));
  const selectedBank={...compact(bank),...(object(bank.css)?{css:compact(bank.css)}:{})};
  // A future linked destination with examples must keep its referenced table.
  // Do not remove another surface's content merely to meet a delivery budget.
  if(JSON.stringify([selected,selectedBank,styles]).includes('data-example-views'))return null;
  const routes=[...Object.keys(pages),...Object.keys(object(source.aliases)?source.aliases:{})];
  const reserved=[...new Set([...publicProfileReservedNames,...(Array.isArray(source.reserved)?source.reserved.filter((name):name is string=>typeof name==='string'):[]),...routes.flatMap(path=>/^\/([a-z0-9_]{3,24})\/$/.exec(path)?.[1]??[])])];
  return {...source,pages:selected,bank:selectedBank,reserved,styles};
 }catch{return null;}
}

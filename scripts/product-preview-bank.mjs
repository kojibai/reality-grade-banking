import {compactNavigation} from './compact-navigation.mjs';
/** Source-rendered display destinations, interned beneath the existing carried
 * navigation. This changes neither the settled first screen nor routing. */
const escapeText=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;');
const decodeText=value=>value.replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
export function packExampleBanks(pages){
 const shared=[],indices=new Map();
 const content=html=>html.replace(/<template data-example-views>([^<]*)<\/template>/g,(_,encoded)=>{
  const views=JSON.parse(decodeText(encoded)),references={};
  for(const [name,view]of Object.entries(views)){
   const key=JSON.stringify(view);let index=indices.get(key);
   if(index===undefined){index=shared.length;indices.set(key,index);shared.push(view);}
   references[name]=index;
  }
  return `<template data-example-views>${escapeText(JSON.stringify(references))}</template>`;
 });
 const packedPages=Object.fromEntries(Object.entries(pages).map(([path,page])=>[path,{...page,content:content(page.content)}]));
 // Reuse the carried navigation's exact-span table for repeated markup inside
 // distinct examples. CSS and first frames stay byte-for-byte intact; only a
 // selected destination joins its existing HTML spans in the page runtime.
 const spans=compactNavigation({pages:Object.fromEntries(shared.map((view,index)=>[index,{head:'',content:view.html}])),bank:{head:'',content:''}}),offset=shared.length;
 const bank=shared.map((view,index)=>{const html=spans.pages[index].content;return Array.isArray(html)?{...view,html:html.map(part=>typeof part==='number'?offset+part:part)}:view;});
 bank.push(...spans.styles);
 return {pages:packedPages,shared:bank.length?`<template data-shared-example-views>${escapeText(JSON.stringify(bank))}</template>`:''};
}

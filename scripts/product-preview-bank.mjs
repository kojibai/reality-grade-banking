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
 return {pages:Object.fromEntries(Object.entries(pages).map(([path,page])=>[path,{...page,content:content(page.content)}])),shared:shared.length?`<template data-shared-example-views>${escapeText(JSON.stringify(shared))}</template>`:''};
}

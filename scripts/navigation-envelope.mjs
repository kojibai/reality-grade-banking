import {constants,gzipSync} from 'node:zlib';
import {navigationArrays,sharedExampleMarkup} from '../src/presentation/navigation-envelope.mjs';
export {decodeNavigationEnvelope,sharedExampleMarkup} from '../src/presentation/navigation-envelope.mjs';
const decodeText=value=>value.replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
/** Lossless grammar over presentation references, beneath existing source and
 * custody. Literal strings and unknown fields are never normalized or dropped. */
function packNavigationReferences(input,examples,referenceCost){
 const navigation=structuredClone(input),sharedExamples=structuredClone(examples);
 const arrays=navigationArrays(navigation,sharedExamples),flatTokens=arrays.reduce((sum,row)=>sum+row.length,0),dictionary=[],known=new Map(),key=(a,b)=>JSON.stringify([a,b]);
 for(const row of arrays)if(!row.every(part=>typeof part==='string'||Number.isSafeInteger(part)&&part>=0))throw Error('NAVIGATION_REFERENCE_INVALID');
 for(let pass=0;pass<14;pass++){
  const counts=new Map();for(const row of arrays)for(let i=0;i+1<row.length;i++){const pair=key(row[i],row[i+1]);counts.set(pair,(counts.get(pair)??0)+1);}
  const candidates=new Set([...counts].filter(([pair,count])=>count>=16&&pair.length*count>pair.length+20+count*referenceCost).map(([pair])=>pair));let changed=0;
  for(const row of arrays){const next=[];for(let i=0;i<row.length;){const pair=i+1<row.length?key(row[i],row[i+1]):'';if(candidates.has(pair)){let id=known.get(pair);if(id===undefined){id=-dictionary.length-1;dictionary.push([row[i],row[i+1]]);known.set(pair,id);}next.push(id);i+=2;changed++;}else next.push(row[i++]);}row.length=0;for(const part of next)row.push(part);}
  if(!changed)break;
 }

 return Buffer.from(JSON.stringify({navigation,sharedExamples,dictionary,flatTokens}));
}
export function encodeNavigationEnvelope(input,shared='',{preferSmaller=false}={}){
 const match=shared.match(/^<template data-shared-example-views>([^<]*)<\/template>$/),examples=shared?JSON.parse(decodeText(match?.[1]??'null')):null;
 if(shared&&(!match||sharedExampleMarkup(examples)!==shared))throw Error('NAVIGATION_SHARED_TEMPLATE_INVALID');
 const original=packNavigationReferences(input,examples,7),gzip={level:9,memLevel:5};
 let bytes=original,compressed=gzipSync(original,gzip);
 if(preferSmaller){
  // Small references can compress better as literals. Try a higher reference
  // cost for static documents and keep whichever exact encoding is smallest.
  const selective=packNavigationReferences(input,examples,10);
  const filtered=gzipSync(original,{level:9,memLevel:6,strategy:constants.Z_FILTERED});
  const selectiveCompressed=gzipSync(selective,gzip);
  if(filtered.length<compressed.length)compressed=filtered;
  if(selectiveCompressed.length<compressed.length){bytes=selective;compressed=selectiveCompressed;}
 }
 return {format:'bank.presentation-envelope.v1',decodedBytes:bytes.length,data:compressed.toString('base64url')};
}
export function navigationScript(navigation,shared='',options){return `<script id="receiz-navigation" type="application/json">${JSON.stringify(encodeNavigationEnvelope(navigation,shared,options))}</script>`;}

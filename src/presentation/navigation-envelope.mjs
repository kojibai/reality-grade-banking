import {gunzipSync} from 'fflate';
const FORMAT='bank.presentation-envelope.v1',MAX_BYTES=64*1024*1024,MAX_TOKENS=8*1024*1024;
export const sharedExampleMarkup=values=>values===null?'':`<template data-shared-example-views>${JSON.stringify(values).replaceAll('&','&amp;').replaceAll('<','&lt;')}</template>`;
export function navigationArrays(navigation,examples){const rows=[];for(const page of [...Object.values(navigation.pages??{}),navigation.bank??{}])for(const key of ['head','content'])if(Array.isArray(page?.[key]))rows.push(page[key]);for(const value of Object.values(navigation.bank?.css??{}))if(Array.isArray(value))rows.push(value);for(const example of examples??[])if(Array.isArray(example?.html))rows.push(example.html);return rows;}
/** Presentation transport only. All literal bytes and the existing lazy reader
 * survive. This envelope never verifies or authorizes a sealed proof object. */
export function decodeNavigationEnvelope(input){
 const value=typeof input==='string'?JSON.parse(input):input;if(value?.format!==FORMAT)return {navigation:value,shared:''};
 const fail=()=>{throw Error('NAVIGATION_ENVELOPE_INVALID');};
 if(!Number.isSafeInteger(value.decodedBytes)||value.decodedBytes<1||value.decodedBytes>MAX_BYTES||typeof value.data!=='string'||!value.data||value.data.length>MAX_BYTES||!/^[A-Za-z0-9_-]+$/.test(value.data))return fail();
 const binary=atob(value.data.replaceAll('-','+').replaceAll('_','/')),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 if(bytes.length<18||bytes[0]!==31||bytes[1]!==139||new DataView(bytes.buffer).getUint32(bytes.length-4,true)!==value.decodedBytes)return fail();
 const decoded=gunzipSync(bytes,{out:new Uint8Array(value.decodedBytes)});if(decoded.length!==value.decodedBytes)return fail();
 const packet=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decoded)),{navigation,sharedExamples,dictionary,flatTokens}=packet;
 if(!navigation||typeof navigation!=='object'||Array.isArray(navigation)||!Array.isArray(dictionary)||dictionary.length>65536||!Number.isSafeInteger(flatTokens)||flatTokens<0||flatTokens>MAX_TOKENS||sharedExamples!==null&&!Array.isArray(sharedExamples))return fail();
 const token=(part,index)=>typeof part==='string'||Number.isSafeInteger(part)&&(part>=0||-part-1<index&&part<0);
 for(let i=0;i<dictionary.length;i++)if(!Array.isArray(dictionary[i])||dictionary[i].length!==2||!dictionary[i].every(part=>token(part,i)))return fail();
 let total=0;
 for(const row of navigationArrays(navigation,sharedExamples)){const restored=[],stack=[...row].reverse();while(stack.length){const part=stack.pop();if(!token(part,dictionary.length))return fail();if(typeof part==='number'&&part<0){const pair=dictionary[-part-1];stack.push(pair[1],pair[0]);}else{if(++total>flatTokens)return fail();restored.push(part);}}row.length=0;for(const part of restored)row.push(part);}
 if(total!==flatTokens)return fail();return {navigation,shared:sharedExampleMarkup(sharedExamples)};
}

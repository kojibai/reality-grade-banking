import {setupRecord} from '../../src/receiz/business-setup.js';
import {dnsName,inDnsZone,type DnsConnectionOwner,type DnsExistingRecord} from './engine.js';
export type DnsHttpRequest=(url:string,init:{method:'GET'|'POST'|'PUT';headers?:Record<string,string>;body?:string;redirect:'error';credentials:'omit'})=>Promise<Response>;
export type DnsHttpOwner=DnsConnectionOwner&{request:DnsHttpRequest};
export function dnsResultInvalid():never{throw Error('DNS_PROVIDER_RESULT_UNCONFIRMED');}
export function dnsObject(value:unknown){const row=setupRecord(value);if(!row)dnsResultInvalid();return row;}
export function dnsArray(value:unknown){if(!Array.isArray(value)||value.length>10000)dnsResultInvalid();return value;}
export function dnsIdentifier(value:unknown):string{if(typeof value==='number'&&Number.isSafeInteger(value)&&value>0)return String(value);if(typeof value==='string'&&value.length>0&&value.length<=2048)return value;return dnsResultInvalid();}
export function relativeDnsName(name:string,zone:string){if(!inDnsZone(name,zone))dnsResultInvalid();return name===zone?'':name.slice(0,-zone.length-1);}
export function absoluteDnsName(raw:unknown,zone:string,names:'relative'|'absolute'){
 if(typeof raw!=='string'||raw.length>254||/[\s/\\?#]/.test(raw)||raw.includes('..'))dnsResultInvalid();
 if(names==='relative'){
  if(raw.endsWith('.'))dnsResultInvalid();const name=raw.toLowerCase();return !name||name==='@'?zone:name+'.'+zone;
 }
 const name=dnsName(raw);if(!name||!inDnsZone(name,zone))dnsResultInvalid();return name;
}
export function providerRecord(raw:unknown,zone:string,fields:{value:string;id:string;names:'relative'|'absolute'}):DnsExistingRecord{
 const row=dnsObject(raw);if(typeof row.type!=='string'||!row.type||typeof row[fields.value]!=='string')dnsResultInvalid();
 return{type:row.type,name:absoluteDnsName(row.name,zone,fields.names),value:row[fields.value] as string,reference:dnsIdentifier(row[fields.id]),...(row.disabled===true||row.proxied===true?{blocked:true}:{})};
}
export async function dnsJson(input:DnsHttpOwner,url:string,method:'GET'|'POST'|'PUT'='GET',body?:unknown,headers?:Record<string,string>){
 input.assertOpen();const response=await input.request(url,{method,redirect:'error',credentials:'omit',headers:{accept:'application/json',...(body!==undefined?{'content-type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});input.assertOpen();
 if(!response.ok||response.redirected||!response.body)dnsResultInvalid();
 const reader=response.body.getReader();let count=0;const chunks:Uint8Array[]=[];
 try{for(;;){input.assertOpen();const part=await reader.read();input.assertOpen();if(part.done)break;count+=part.value.byteLength;if(count>2*1024*1024)dnsResultInvalid();chunks.push(part.value);}const bytes=new Uint8Array(count);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return dnsObject(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
export function nextDnsUrl(value:unknown,origin:string,path:string){
 if(typeof value!=='string'||value.length>4096)dnsResultInvalid();const url=new URL(value);if(url.origin!==origin||url.pathname!==path||url.username||url.password||url.hash)dnsResultInvalid();return url;
}
/** DNS presentation syntax beneath the provider record, never proof authority. */
export function splitDnsTxt(value:string){
 const chunks:string[]=[];let part='',bytes=0;
 for(const char of value){const size=new TextEncoder().encode(char).length;if(bytes+size>255){chunks.push(part);part='';bytes=0;}part+=char;bytes+=size;}chunks.push(part);
 return chunks;
}
export function encodeDnsTxt(value:string){
 return splitDnsTxt(value).map(chunk=>'"'+chunk.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"').join(' ');
}
export function decodeDnsTxt(value:unknown){
 if(typeof value!=='string'||value.length>8192)dnsResultInvalid();
 const bytes:number[]=[];let index=0,segments=0;
 while(index<value.length){while(/\s/.test(value[index]??'')&&index<value.length)index++;if(index===value.length)break;if(value[index++]!=='"')dnsResultInvalid();segments++;let closed=false;
  while(index<value.length){const char=value[index++];if(char==='"'){closed=true;break;}if(char==='\\'){if(index>=value.length)dnsResultInvalid();const digits=value.slice(index,index+3);if(/^\d{3}$/.test(digits)){const byte=Number(digits);if(byte>255)dnsResultInvalid();bytes.push(byte);index+=3;}else bytes.push(...new TextEncoder().encode(value[index++]));}else{const point=value.codePointAt(index-1)!;const full=String.fromCodePoint(point);if(full.length===2)index++;bytes.push(...new TextEncoder().encode(full));}}
  if(!closed)dnsResultInvalid();
 }
 if(!segments)dnsResultInvalid();return new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(bytes));
}

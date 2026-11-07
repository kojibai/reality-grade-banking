export const RECEIVING_MESSAGE='I’m ready to pay you. Here’s how to receive the money and use it for your next payment, with its proof and ownership intact.';

/** Reviewed presentation only: this invitation is not payment or receiving authority. */
export type ReceivingInvitation={schema:'bankeiz.receiving-invitation.v1';message:string;senderName?:string;senderUsername?:string;recipientName?:string;institution?:{id?:string;name:string};amountUsdCents?:string;purpose?:string};
const origin='https://bankeiz.com',prefix=origin+'/invitation/#invite=',maxLink=12*1024;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
function invalid():never{throw Error('RECEIVING_INVITATION_INVALID');}
function object(value:unknown,fields:readonly string[]):asserts value is Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))invalid();
 for(const key of Reflect.ownKeys(value)){if(typeof key!=='string'||!fields.includes(key))invalid();const descriptor=Object.getOwnPropertyDescriptor(value,key)!;if(descriptor.get||descriptor.set||!descriptor.enumerable)invalid();}
}
function text(value:unknown,max:number,empty=false):value is string{
 return typeof value==='string'&&(empty||value.trim().length>0)&&value.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)&&decoder.decode(encoder.encode(value))===value;
}
function institution(value:unknown):{id?:string;name:string}{
 object(value,['id','name']);if(!text(value.name,200)||value.id!==undefined&&(typeof value.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(value.id)))invalid();
 return{...(value.id!==undefined?{id:value.id}:{}),name:value.name};
}
// Public profile aliases use these exact canonical handles; no account lookup or normalization.
export function readReceivingInvitationObject(value:unknown):ReceivingInvitation{
 object(value,['schema','message','senderName','senderUsername','recipientName','institution','amountUsdCents','purpose']);
 if(value.schema!=='bankeiz.receiving-invitation.v1'||!text(value.message,4000)||value.senderName!==undefined&&!text(value.senderName,120)||value.recipientName!==undefined&&!text(value.recipientName,200)||value.senderUsername!==undefined&&(typeof value.senderUsername!=='string'||!/^[a-z0-9_]{3,24}$/.test(value.senderUsername))||value.purpose!==undefined&&!text(value.purpose,500,true)||value.amountUsdCents!==undefined&&(typeof value.amountUsdCents!=='string'||!/^[1-9]\d{0,17}$/.test(value.amountUsdCents)))invalid();
 return{schema:'bankeiz.receiving-invitation.v1',message:value.message,...(value.senderName!==undefined?{senderName:value.senderName as string}:{}),...(value.senderUsername!==undefined?{senderUsername:value.senderUsername as string}:{}),...(value.recipientName!==undefined?{recipientName:value.recipientName as string}:{}),...(value.institution!==undefined?{institution:institution(value.institution)}:{}),...(value.amountUsdCents!==undefined?{amountUsdCents:value.amountUsdCents as string}:{}),...(value.purpose!==undefined?{purpose:value.purpose as string}:{})};
}
function encode(bytes:Uint8Array):string{return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}

export function receivingInvitationUrl(input:ReceivingInvitation):string{
 const value=readReceivingInvitationObject(input),bytes=encoder.encode(JSON.stringify(value));
 // Check before base64 expansion as well as the complete fixed-destination link.
 if(bytes.byteLength>maxLink*3/4)invalid();const url=prefix+encode(bytes);if(url.length>maxLink)invalid();return url;
}
export function readReceivingInvitation(hash:string):ReceivingInvitation|null{
 try{
  // Retain the legacy receiving-page fragment bound, including old maximum-sized links.
  if(typeof hash!=='string'||!hash.startsWith('#invite=')||origin.length+'/receiving/'.length+hash.length>maxLink)return null;
  const encoded=hash.slice(8);if(!encoded||!/^[A-Za-z0-9_-]+$/.test(encoded))return null;
  const bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),character=>character.charCodeAt(0));
  if(encode(bytes)!==encoded)return null;return readReceivingInvitationObject(JSON.parse(decoder.decode(bytes)));
 }catch{return null;}
}

export function institutionRequest(name:string,id?:string):string{
 const selected=institution({name,...(id!==undefined?{id}:{})});
 return `Please bring Reality-Grade Banking to ${selected.name}. I want to receive money with its original proof and ownership intact, and use it for my next payment.\n\nThe receiving standard: ${origin}/standards/\nInstitution receiving kit: https://github.com/kojibai/reality-grade-banking/blob/main/institution/README.md\nPrepare and inspect conformance evidence: ${origin}/conformance/#assess\nPublished institution evidence: ${origin}/registry/${selected.id?'#'+encodeURIComponent(selected.id):''}`;
}

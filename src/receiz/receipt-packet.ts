import {deflateSync,inflateSync} from 'fflate';
import type {LedgerReceipt} from './ledger-receipts';

// Versioned, positional transport of the existing shareable receipt. No fields
// are removed and no private in-app context is added by compacting a link.
const fields=['id','kind','title','source','authority','detail','amountUsdCents','pulse','kaiUpulse','time','sender','recipient','sourceUrl','evidence','value','details','valueOperands','valuation','contextOmitted'] as const;
const MAX_BYTES=24000,MAX_EXPANDED_BYTES=512*1024;
function bytesFromBase64(value:string){
 if(!value||value.length>32000||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('RECEIPT_INVALID');
 return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
}
export function encodeReceiptPacket(receipt:LedgerReceipt):string{
 const bytes=new TextEncoder().encode(JSON.stringify(fields.map(field=>receipt[field])));
 if(bytes.length>MAX_EXPANDED_BYTES)throw Error('RECEIPT_TOO_LARGE');
 const version=bytes.length>MAX_BYTES?2:1,header=version===2?4:3;
 const compressed=deflateSync(bytes,{level:version===2?6:9}),packet=new Uint8Array(compressed.length+header);
 packet[0]=version;
 if(version===2){packet[1]=bytes.length>>>16;packet[2]=(bytes.length>>>8)&255;packet[3]=bytes.length&255;}
 else{packet[1]=bytes.length>>>8;packet[2]=bytes.length&255;}
 packet.set(compressed,header);
 let raw='';for(const byte of packet)raw+=String.fromCharCode(byte);
 const encoded=btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(encoded.length>32000)throw Error('RECEIPT_TOO_LARGE');return encoded;
}
export function decodeReceiptPacket(encoded:string):unknown{
 const packet=bytesFromBase64(encoded),version=packet[0],header=version===2?4:3,length=version===2?(packet[1]<<16)|(packet[2]<<8)|packet[3]:(packet[1]<<8)|packet[2];
 if(![1,2].includes(version)||!length||length>(version===2?MAX_EXPANDED_BYTES:MAX_BYTES)||packet.length<header+2)throw Error('RECEIPT_INVALID');
 // Fixed-size output prevents compressed packets from allocating unbounded
 // memory. One extra byte also detects truncated or understated lengths.
 const bytes=inflateSync(packet.subarray(header),{out:new Uint8Array(length+1)});
 if(bytes.length!==length)throw Error('RECEIPT_INVALID');
 const values:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!Array.isArray(values)||values.length!==fields.length)throw Error('RECEIPT_INVALID');
 return {schema:'bankeiz.ledger-receipt.v1',...Object.fromEntries(fields.map((field,i)=>[field,values[i]]))};
}

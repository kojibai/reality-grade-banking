import {deflateSync,inflateSync,zipSync,unzipSync} from 'fflate';
import {ReceizProtocolLimitError} from '../verificationLimits.js';
import {authoredFileCarrier as native,appendReceizTrailer,parseReceizTrailer} from './canonicalImplementation.js';
import {base64UrlDecode,base64UrlEncode,isRecord,jcsCanonicalize} from './crypto.js';

const KIND='receiz.carried-file-authorship.v1';
const PNG_KEY='receiz.source_authorship';
const SVG_ATTR='data-receiz-source-authorship';
const SVG_TAG=new RegExp(`\\n?<metadata id="receiz-source-authorship" ${SVG_ATTR}="([A-Za-z0-9_:\\-]+)"/>`,'g');
const MAX_METADATA=64*1024*1024;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{ignoreBOM:true});
const concat=(a:Uint8Array,b:Uint8Array)=>{const bytes=new Uint8Array(a.length+b.length);bytes.set(a);bytes.set(b,a.length);return bytes;};
function capacity():never{throw new ReceizProtocolLimitError('VERIFICATION_RESOURCE_UNAVAILABLE','verification-runtime');}
function encode(value:unknown){const bytes=encoder.encode(jcsCanonicalize(value));if(bytes.length>MAX_METADATA)capacity();return 'a1:'+bytes.length+':'+base64UrlEncode(deflateSync(bytes));}
function decode(value:string):Record<string,unknown>|null{
 if(!value.startsWith('a1:'))return null;
 const match=/^a1:([1-9][0-9]*):([A-Za-z0-9_-]+)$/.exec(value);if(!match)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
 const size=Number(match[1]);if(!Number.isSafeInteger(size)||size>MAX_METADATA)capacity();
 const bytes=inflateSync(base64UrlDecode(match[2]!),{out:new Uint8Array(size+1)});
 if(bytes.length!==size)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
 const object:unknown=JSON.parse(decoder.decode(bytes));if(!isRecord(object)||object.kind!==KIND)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');return object;
}
const ZIP_COMMENT='RECEIZ-AUTHORSHIP-v1:';
const ZIP_ENTRY='META-INF/receiz-source-authorship.txt';
function zipEnd(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 for(let at=bytes.length-22;at>=Math.max(0,bytes.length-65557);at--){if(view.getUint32(at,true)===0x06054b50&&at+22+view.getUint16(at+20,true)===bytes.length)return at;}return -1;
}
function appendZip(original:Uint8Array,body:Record<string,unknown>){
 // A new ZIP directory points to the unchanged existing entries and one new
 // metadata entry. The complete original (including its seal) stays a prefix.
 let basis=original,end=zipEnd(basis);if(end<0){const trailer=parseReceizTrailer(original);if(trailer.parseError||!trailer.bundle)throw Error('FILE_AUTHORSHIP_ZIP_INVALID');basis=trailer.basisBytes;end=zipEnd(basis);}if(end<0)throw Error('FILE_AUTHORSHIP_ZIP_INVALID');
 const view=new DataView(basis.buffer,basis.byteOffset,basis.byteLength),count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
 if(count>=65534||size===0xffffffff||offset===0xffffffff||original.length>0xffffffff)capacity();
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||view.getUint16(end+8,true)!==count||offset+size>end)throw Error('FILE_AUTHORSHIP_ZIP_INVALID');
 const extra=zipSync({[ZIP_ENTRY]:[encoder.encode(encode(body)),{level:0,mtime:new Date(1980,0,1)}]}),extraEnd=zipEnd(extra),ev=new DataView(extra.buffer),localSize=ev.getUint32(extraEnd+16,true),cdSize=ev.getUint32(extraEnd+12,true);
 const cd=extra.slice(localSize,localSize+cdSize);new DataView(cd.buffer).setUint32(42,original.length,true);
 const comment=encoder.encode(ZIP_COMMENT+original.length),tail=new Uint8Array(22+comment.length),tv=new DataView(tail.buffer);
 tv.setUint32(0,0x06054b50,true);tv.setUint16(8,count+1,true);tv.setUint16(10,count+1,true);tv.setUint32(12,size+cdSize,true);tv.setUint32(16,original.length+localSize,true);tv.setUint16(20,comment.length,true);tail.set(comment,22);
 return concat(concat(concat(concat(original,extra.subarray(0,localSize)),original.subarray(offset,offset+size)),cd),tail);
}
function openZip(bytes:Uint8Array){
 const end=zipEnd(bytes);if(end<0)return null;
 const comment=decoder.decode(bytes.subarray(end+22));if(!comment.startsWith(ZIP_COMMENT))return null;
 const length=Number(comment.slice(ZIP_COMMENT.length));if(!Number.isSafeInteger(length)||length<1||length>=end)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
 const entries=unzipSync(bytes,{filter:entry=>{if(entry.name!==ZIP_ENTRY)return false;if(entry.originalSize>MAX_METADATA)capacity();return true;}}),encoded=entries[ZIP_ENTRY];
 if(!encoded)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');const body=decode(decoder.decode(encoded));if(!body)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');return {original:bytes.subarray(0,length),body};
}
function svgTag(encoded:string){return `\n<metadata id="receiz-source-authorship" ${SVG_ATTR}="${encoded}"/>`;}
function appendSvg(bytes:Uint8Array,encoded:string){const text=decoder.decode(bytes),end=/<\/svg\s*>/i.exec(text);if(!end)throw Error('FILE_AUTHORSHIP_SVG_INVALID');return encoder.encode(text.slice(0,end.index)+svgTag(encoded)+text.slice(end.index));}
function jsonTail(encoded:string){const wrapped='j0:'+JSON.stringify({kind:'receiz.carried-file-authorship.transport.v1',encoded});return native.embedReceizProofBundleIntoJson({jsonBytes:encoder.encode('null'),encodedBundle:wrapped}).jsonBytes.subarray(4);}

/** Existing native metadata channels preserve the usable file format. The
 * previous carrier, when present, is retained verbatim inside the new one. */
export function carryAuthoredFile(original:Uint8Array,body:Record<string,unknown>):Uint8Array{
 if(original.length===base64UrlDecode(String(body.sourceBase64Url)).length
  &&base64UrlEncode(original)===body.sourceBase64Url)return encoder.encode(jcsCanonicalize({...body,originalIsSource:true}));
 if(original[0]===0x50&&original[1]===0x4b)return appendZip(original,body);
 const format=native.detectDocumentFormat(original,{});
 if(format==='png'){
  const previous=native.readPngTextChunks(original).filter(row=>row.keyword===PNG_KEY);
  if(previous.length>1)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  const base=native.stripPngTextChunksByKeyword(original,PNG_KEY).pngBytes;
  return native.insertPngTextChunks(base,[{keyword:PNG_KEY,text:encode({...body,...(previous.length?{previousCarrier:previous[0]!.text}:{})})}]);
 }
 if(format==='pdf')return native.embedReceizProofBundleIntoPdf({pdfBytes:original,encodedBundle:encode(body)});
 if(format==='svg'){
  const text=decoder.decode(original),matches=[...text.matchAll(SVG_TAG)];
  if(matches.length>1)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  const base=encoder.encode(text.replace(SVG_TAG,''));
  return appendSvg(base,encode({...body,...(matches.length?{previousCarrier:matches[0]![1]}:{})}));
 }
 if(format==='json')return concat(original,jsonTail(encode(body)));
 if(format==='heic'){
  const prior=native.parseReceizHeicProof(original);if(prior.parseError)throw Error(prior.parseError);
  return native.appendReceizHeicProof({basisBytes:prior.basisBytes,bundle:{...body,
   ...(prior.proofCount?{previousCarrier:base64UrlEncode(original.subarray(prior.basisBytes.length))}:{})}});
 }
 return appendReceizTrailer({basisBytes:original,bundle:{kind:'receiz.carried-file-authorship.transport.v1',encoded:encode(body)}});
}

export function openAuthoredFileCarrier(bytes:Uint8Array):{original:Uint8Array;body:Record<string,unknown>}|null{
 if(bytes[0]===0x50&&bytes[1]===0x4b)return openZip(bytes);
 const format=native.detectDocumentFormat(bytes,{});
 if(format==='png'){
  const rows=native.readPngTextChunks(bytes).filter(row=>row.keyword===PNG_KEY);
  if(!rows.length)return null;if(rows.length!==1)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  const body=decode(rows[0]!.text);if(!body)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  let original=native.stripPngTextChunksByKeyword(bytes,PNG_KEY).pngBytes;
  if(body.previousCarrier!==undefined){if(typeof body.previousCarrier!=='string')throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');original=native.insertPngTextChunks(original,[{keyword:PNG_KEY,text:body.previousCarrier}]);}
  return {original,body};
 }
 if(format==='pdf'){
  const encoded=native.extractReceizProofBundlesFromPdf(bytes).at(-1);if(!encoded)return null;
  const body=decode(encoded);if(!body)return null;
  const text=new TextDecoder('latin1').decode(bytes),at=text.lastIndexOf(native.PDF_RECEIZ_UPDATE_MARKER);
  if(at<1||text[at-1]!=='\n')throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  return {original:bytes.subarray(0,at-1),body};
 }
 if(format==='svg'){
  const text=decoder.decode(bytes),matches=[...text.matchAll(SVG_TAG)];if(!matches.length)return null;
  if(matches.length!==1)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');const body=decode(matches[0]![1]!);if(!body)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  let original=encoder.encode(text.replace(SVG_TAG,''));if(body.previousCarrier!==undefined){if(typeof body.previousCarrier!=='string')throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');original=appendSvg(original,body.previousCarrier);}
  return {original,body};
 }
 if(format==='json'){
  const text=decoder.decode(bytes);
  if(text.startsWith('{"kind":"'+KIND+'"')){
   const body:unknown=JSON.parse(text);if(isRecord(body)&&body.kind===KIND&&body.originalIsSource===true&&typeof body.sourceBase64Url==='string')return {original:base64UrlDecode(body.sourceBase64Url),body};
  }
  const parsed=native.stripReceizJsonProof(bytes),wrapped=parsed.encodedBundles[0];if(!wrapped?.startsWith('j0:{"kind":"receiz.carried-file-authorship.transport.v1"'))return null;
  const packet:unknown=JSON.parse(wrapped.slice(3));if(!isRecord(packet)||typeof packet.encoded!=='string')throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  const encoded=packet.encoded,body=decode(encoded);if(!body)return null;
  const tail=jsonTail(encoded),original=bytes.subarray(0,bytes.length-tail.length);
  if(tail.length>=bytes.length||tail.some((byte,index)=>byte!==bytes[original.length+index]))throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  return {original,body};
 }
 if(format==='heic'){
  const parsed=native.parseReceizHeicProof(bytes),body=parsed.bundle;
  if(!isRecord(body)||body.kind!==KIND)return null;if(parsed.parseError)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
  let original=parsed.basisBytes;if(body.previousCarrier!==undefined){if(typeof body.previousCarrier!=='string')throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');original=concat(original,base64UrlDecode(body.previousCarrier));}return {original,body};
 }
 const parsed=parseReceizTrailer(bytes),body=parsed.bundle;
 if(!isRecord(body)||body.kind!=='receiz.carried-file-authorship.transport.v1')return null;if(parsed.parseError||typeof body.encoded!=='string')throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');
 const decoded=decode(body.encoded);if(!decoded)throw Error('FILE_AUTHORSHIP_CARRIER_INVALID');return {original:parsed.basisBytes,body:decoded};
}

import {readComposerAssetContent,type ComposerAssetContent} from "../composerPreparation";
import {rejectImportedSourceRecoveryBytes} from "./importedSourcePrivacy";
import {sha256} from "@noble/hashes/sha2.js";
import {bytesToHex} from "@noble/hashes/utils.js";
export type BankAssetContent=Readonly<{title:string;description:string;text:string;composer?:ComposerAssetContent;files:readonly Readonly<{filename:string;mimeType:string;sha256:string;bytes:Uint8Array}>[]}>;
/** Called only beneath canonical enclosing-source verification. Embedded hashes
 * check extraction; they never admit a source or manufacture ownership. */
export async function readBankAssetContent(payload:Blob,ownerReceizId:string|null):Promise<BankAssetContent|null>{
 if(payload.type!=="application/json"||payload.size>10*1024*1024)return null;
 let value;try{value=JSON.parse(await payload.text());}catch{return null;}
 if(value?.schema==="receiz.bank.asset-content.v2"){
  const composer=readComposerAssetContent(value,ownerReceizId);
  return Object.freeze({title:composer.title,description:composer.description,text:composer.longForm,files:Object.freeze([]),composer});
 }
 if(value?.schema!=="receiz.bank.asset-definition.v1")return null;
 const fail=():never=>{throw new TypeError("BANK_ASSET_SOURCE_CONTENT_INVALID");};
 const definition=value.definition;
 if(!definition||typeof definition.name!=="string"||!definition.name||definition.name.length>80||typeof definition.description!=="string"||definition.description.length>2000||typeof definition.symbol!=="string"||! /^[A-Z][A-Z0-9]{1,7}$/.test(definition.symbol)||typeof definition.units!=="string"||! /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,6})?$/.test(definition.units)||value.issuerReceizId!==ownerReceizId||value.createsSpendableValue!==false||value.backingCommitted!==false)fail();
 const moment=value.moment;
 if(moment!==undefined&&(!moment||moment.schema!=="receiz.bank.moment-content.v1"||typeof moment.title!=="string"||moment.title.length>160||typeof moment.text!=="string"||moment.text.length>100000||!Array.isArray(moment.files)||moment.files.length>8))fail();
 if(value.linkedSource){const linked=value.linkedSource;if(typeof linked.exactArtifactB64u!=="string"||! /^[A-Za-z0-9_-]+$/.test(linked.exactArtifactB64u)||typeof linked.digest!=="string")fail();const decoded=atob(linked.exactArtifactB64u.replace(/-/g,"+").replace(/_/g,"/")),bytes=Uint8Array.from(decoded,c=>c.charCodeAt(0));if(bytesToHex(sha256(bytes))!==linked.digest||definition.linkedProofDigest!==linked.digest)fail();await rejectImportedSourceRecoveryBytes(bytes);}
 const files=[];let total=0;
 for(const file of moment?.files??[]){
  if(!file||typeof file.filename!=="string"||!file.filename||file.filename.length>240||/[\x00-\x1f\x7f/\\]/.test(file.filename)||typeof file.mimeType!=="string"||file.mimeType.length>120||! /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(file.mimeType)||!Number.isSafeInteger(file.size)||file.size<=0||typeof file.sha256!=="string"||! /^[a-f0-9]{64}$/.test(file.sha256)||typeof file.bytesB64u!=="string"||file.bytesB64u.length!==Math.ceil(file.size*4/3)||! /^[A-Za-z0-9_-]+$/.test(file.bytesB64u))fail();
  total+=file.size;if(total>6*1024*1024)fail();
  const binary=atob(file.bytesB64u.replace(/-/g,"+").replace(/_/g,"/")),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
  if(bytes.length!==file.size||bytesToHex(sha256(bytes))!==file.sha256)fail();
  await rejectImportedSourceRecoveryBytes(bytes);
  files.push(Object.freeze({filename:file.filename,mimeType:file.mimeType,sha256:file.sha256,bytes}));
 }
 return Object.freeze({title:moment?.title||definition.name,description:definition.description,text:moment?.text??"",files:Object.freeze(files)});
}

import {publicAccountDisplayName} from './account-name.js';
/** Public display coordinates only. Account birth is carried by the account;
 * a conversation, appointment or file export date must never replace it. */
export type AccountPresentation={userId?:string;username?:string|null;displayName?:string|null;createdAt?:string;creationKaiMicroPulse?:string;creationKaiSource?:string;displayNameSource?:'custom'|'username'|'creation-pulse';authorshipVerified?:boolean;authorshipPbiReceiptHash?:string;authorshipPbiSignedAt?:string;authorshipPbiSignedKaiMicroPulse?:string};
export function accountCreationPresentation(value:Readonly<Record<string,unknown>>):Partial<AccountPresentation>{
 const out:Partial<AccountPresentation>={};
 if(typeof value.createdAt==='string'&&value.createdAt.length<=64&&Number.isFinite(Date.parse(value.createdAt)))out.createdAt=value.createdAt;
 if(typeof value.creationKaiMicroPulse==='string'&&/^[1-9][0-9]{0,29}$/.test(value.creationKaiMicroPulse))out.creationKaiMicroPulse=value.creationKaiMicroPulse;
 if(value.creationKaiSource==='sealed-receiz-identity'||value.creationKaiSource==='legacy-profile-genesis-recovery')out.creationKaiSource=value.creationKaiSource;
 if(['custom','username','creation-pulse'].includes(String(value.displayNameSource)))out.displayNameSource=value.displayNameSource as AccountPresentation['displayNameSource'];
 if(value.authorshipVerified===true&&typeof value.authorshipPbiReceiptHash==='string'&&/^[a-f0-9]{64}$/i.test(value.authorshipPbiReceiptHash)){
  out.authorshipVerified=true;out.authorshipPbiReceiptHash=value.authorshipPbiReceiptHash;
  if(typeof value.authorshipPbiSignedAt==='string'&&value.authorshipPbiSignedAt.length<=64&&Number.isFinite(Date.parse(value.authorshipPbiSignedAt)))out.authorshipPbiSignedAt=value.authorshipPbiSignedAt;
  if(typeof value.authorshipPbiSignedKaiMicroPulse==='string'&&/^[1-9][0-9]{0,29}$/.test(value.authorshipPbiSignedKaiMicroPulse))out.authorshipPbiSignedKaiMicroPulse=value.authorshipPbiSignedKaiMicroPulse;
 }
 return out;
}
export function accountPersonName(value:AccountPresentation):string{
 return publicAccountDisplayName(value as Readonly<Record<string,unknown>>,value.username??'');
}

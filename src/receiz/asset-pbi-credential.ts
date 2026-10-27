import type {PbiCredential} from './pbi-account-inline';
const held=new Map<string,PbiCredential>(),prefix='bankeiz-held-pbi-credential:';
const scope=(keyId:string,accountUid:string)=>`${keyId}:${accountUid}`;
/** Public authenticator mechanics only; the actual assertion and exact source
 * are verified by the existing SDK PBI verifier at publication. No requests. */
export function rememberAssetPbiCredential(keyId:string,accountUid:string,credential:PbiCredential){
 const id=scope(keyId,accountUid),value={credIdB64Url:credential.credIdB64Url,pubKeyPem:credential.pubKeyPem};held.set(id,value);
 try{localStorage.setItem(prefix+id,JSON.stringify(value));}catch{/* Optional public-key retention never changes identity custody. */}
}
export function readAssetPbiCredential(keyId:string,accountUid:string):PbiCredential|null{
 const id=scope(keyId,accountUid),known=held.get(id);if(known)return known;
 try{const value=JSON.parse(localStorage.getItem(prefix+id)??'null');if(typeof value?.credIdB64Url!=='string'||!/^[A-Za-z0-9_-]+$/.test(value.credIdB64Url)||typeof value.pubKeyPem!=='string'||!value.pubKeyPem.includes('BEGIN PUBLIC KEY'))return null;return value;}catch{return null;}
}

import {startPublicDocumentRuntime} from '../core/public-document-entry';
/** The complete carried profile precedes navigation's opening element. Its
 * presence means the parser has closed the profile JSON; its trailing payload
 * need not finish before the existing profile can become interactive. */
export function startProfileDocumentRuntime(start:()=>void,doc:Document=document):()=>void{
 return startPublicDocumentRuntime('explore',start,doc,()=>{
  const seed=doc.getElementById('public-profile-seed')??doc.getElementById('public-profile-error');
  return seed?.nextElementSibling?.id==='receiz-navigation';
 });
}

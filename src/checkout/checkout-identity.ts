import type {OpenIdentity} from '../receiz/native-identity';
interface IdentityEntry {restore():Promise<OpenIdentity|null>;create(consent:boolean):Promise<OpenIdentity>;importIdentity(file:File,phrase:string,consent:boolean):Promise<OpenIdentity>;}
export function createCheckoutIdentitySession(deps:IdentityEntry){
 let current:OpenIdentity|null=null,opening:Promise<OpenIdentity>|null=null,closed=false;
 const assertOpen=()=>{if(closed)throw Error('Checkout identity session is closed.');};
 const adopt=(next:OpenIdentity)=>{if(closed){next.dispose();assertOpen();}const previous=current;current=next;if(previous&&previous!==next)previous.dispose();return next;};
 const open=():Promise<OpenIdentity>=>{
  try{assertOpen();}catch(error){return Promise.reject(error);}
  if(current)return Promise.resolve(current);if(opening)return opening;
  const attempt=(async()=>{const restored=await deps.restore();if(closed){restored?.dispose();assertOpen();}return adopt(restored??await deps.create(true));})();
  opening=attempt;void attempt.finally(()=>{if(opening===attempt)opening=null;}).catch(()=>{});return attempt;
 };
 let importing:Promise<OpenIdentity>|null=null;
 return{open,async import(file:File,phrase:string){assertOpen();if(importing)return importing;const attempt=(async()=>{if(opening)await opening.catch(()=>{});assertOpen();return adopt(await deps.importIdentity(file,phrase,true));})();importing=attempt;try{return await attempt;}finally{if(importing===attempt)importing=null;}},close(){if(closed)return;closed=true;current?.dispose();current=null;}};
}
export async function checkoutIdentitySession(){
 const native=await import('../receiz/native-identity');
 return createCheckoutIdentitySession({restore:native.restoreNativeIdentity,create:native.createNativeIdentity,importIdentity:native.importNativeIdentity});
}

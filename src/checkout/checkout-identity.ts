import type {OpenIdentity} from '../receiz/native-identity';
export interface CheckoutIdentitySession {
 open():Promise<OpenIdentity>;
 import(file:File,phrase:string):Promise<OpenIdentity>;
 close():void;
}
interface IdentityEntry {
 restore():Promise<OpenIdentity|null>;
 create(consent:boolean):Promise<OpenIdentity>;
 importIdentity(file:File,phrase:string,consent:boolean):Promise<OpenIdentity>;
 recover?():Promise<OpenIdentity>;
}
export function createCheckoutIdentitySession(deps:IdentityEntry){
 let current:OpenIdentity|null=null,opening:Promise<OpenIdentity>|null=null,selection:Promise<OpenIdentity>|null=null,closed=false;
 const assertOpen=()=>{if(closed)throw Error('Checkout identity session is closed.');};
 const adopt=(next:OpenIdentity)=>{if(closed){next.dispose();assertOpen();}const previous=current;current=next;if(previous&&previous!==next)previous.dispose();return next;};
 const open=():Promise<OpenIdentity>=>{
  try{assertOpen();}catch(error){return Promise.reject(error);}
  // An explicit Identity Record/PBI selection owns entry until it resolves.
  if(selection)return selection;
  if(current)return Promise.resolve(current);if(opening)return opening;
  const attempt=(async()=>{const restored=await deps.restore();if(closed){restored?.dispose();assertOpen();}return adopt(restored??await deps.create(true));})();
  opening=attempt;void attempt.finally(()=>{if(opening===attempt)opening=null;}).catch(()=>{});return attempt;
 };
 const select=(read:()=>Promise<OpenIdentity>):Promise<OpenIdentity>=>{
  try{assertOpen();}catch(error){return Promise.reject(error);}
  if(selection)return selection;
  const attempt=(async()=>{if(opening)await opening.catch(()=>{});assertOpen();return adopt(await read());})();
  selection=attempt;void attempt.finally(()=>{if(selection===attempt)selection=null;}).catch(()=>{});return attempt;
 };
 return{open,import:(file:File,phrase:string)=>select(()=>deps.importIdentity(file,phrase,true)),
  recoverPbi:()=>select(()=>{if(!deps.recover)throw Error('PBI recovery is unavailable here.');return deps.recover();}),
  close(){if(closed)return;closed=true;current?.dispose();current=null;}};
}
export async function checkoutIdentitySession(){
 const native=await import('../receiz/native-identity');
 return createCheckoutIdentitySession({restore:native.restoreNativeIdentity,create:native.createNativeIdentity,importIdentity:native.importNativeIdentity,
  recover:async()=> (await import('../receiz/pbi-account')).openPbiAccount(true)});
}

/** Small, inert entry adapter. No SDK, storage or PBI work runs on import. */
const CANONICAL_ORIGIN='https://receiz.com';
export interface PbiAccountDevice {keyId:string;alg:string;publicKeyRawB64u:string;localUid:string}
export interface PbiAccountBindRequest extends PbiAccountDevice {challengeB64Url:string;signatureB64Url:string;next:string}
export function reservePbiAccountPopup():Window {
 const popup=window.open('about:blank',`receiz-account-pbi-${crypto.randomUUID()}`,'popup=yes,width=460,height=760,resizable=yes,scrollbars=yes');
 if(!popup)throw Error('PBI_POPUP_BLOCKED');return popup;
}
export async function runPbiAccountBridge(popup:Window,device:PbiAccountDevice,sign:(accountUid:string)=>Promise<{challengeB64Url:string;signatureB64Url:string}>):Promise<{accountUid:string;sourceB64u:string;request:PbiAccountBindRequest}>{
 const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
 const url=new URL('/auth/bridge/account-pbi',CANONICAL_ORIGIN);
 url.searchParams.set('targetOrigin',location.origin);url.searchParams.set('state',state);
 for(const [name,value] of Object.entries(device))url.searchParams.set(name,value);
 return await new Promise((resolve,reject)=>{
  let settled=false,signing=false,accountUid:string|null=null,request:PbiAccountBindRequest|null=null;
  const finish=(error?:Error,value?:{accountUid:string;sourceB64u:string;request:PbiAccountBindRequest})=>{
   if(settled)return;settled=true;clearInterval(closed);clearTimeout(timeout);window.removeEventListener('message',receive);try{popup.close();}catch{/* Already closed. */}if(error)reject(error);else resolve(value!);
  };
  const receive=(event:MessageEvent)=>{
   if(event.origin!==CANONICAL_ORIGIN||event.source!==popup)return;
   const data=event.data;if(!data||data.source!=='receiz-account-pbi-bridge'||data.state!==state)return;
   if(data.kind==='error'){finish(Error(typeof data.error==='string'?data.error:'PBI_ACCOUNT_FAILED'));return;}
   if(data.kind==='recovered'&&!signing&&!request){
    if(typeof data.accountUid!=='string'||!data.accountUid||data.accountUid.length>160){finish(Error('PBI_ACCOUNT_RESPONSE_INVALID'));return;}
    signing=true;accountUid=data.accountUid;
    void sign(data.accountUid).then(proof=>{
     if(settled)return;request={...device,...proof,next:'/account'};
     popup.postMessage({source:'bankeiz-account-pbi',kind:'bind',state,...request},CANONICAL_ORIGIN);
    }).catch(error=>finish(error instanceof Error?error:Error('PBI_ACCOUNT_SIGN_FAILED')));
   }else if(data.kind==='bound'&&request&&accountUid){
    if(data.ok!==true||typeof data.sourceB64u!=='string'||!data.sourceB64u||data.sourceB64u.length>8*1024*1024){finish(Error('PBI_ACCOUNT_SOURCE_REQUIRED'));return;}
    finish(undefined,{accountUid,sourceB64u:data.sourceB64u,request});
   }
  };
  window.addEventListener('message',receive);
  const closed=setInterval(()=>{if(popup.closed)finish(Error('passkey_cancelled'));},250);
  const timeout=setTimeout(()=>finish(Error('PBI_ACCOUNT_TIMEOUT')),5*60_000);
  try{popup.location.replace(url.href);}catch{finish(Error('PBI_POPUP_UNAVAILABLE'));}
 });
}

/** Explicit connection uses the already active account. It never asks the
 * canonical account chooser to select a different identity. */
export async function runPbiAccountConnection(popup:Window,device:PbiAccountDevice,accountUid:string,sign:()=>Promise<{challengeB64Url:string;signatureB64Url:string}>):Promise<{accountUid:string;credentialId:string;sourceB64u:string}>{
 const state=Array.from(crypto.getRandomValues(new Uint8Array(32)),byte=>byte.toString(16).padStart(2,'0')).join('');
 const url=new URL('/auth/bridge/account-pbi',CANONICAL_ORIGIN);url.searchParams.set('targetOrigin',location.origin);url.searchParams.set('state',state);url.searchParams.set('mode','connect');url.searchParams.set('accountUid',accountUid);
 for(const [name,value] of Object.entries(device))url.searchParams.set(name,value);
 return await new Promise((resolve,reject)=>{
  let settled=false,signing=false;
  const finish=(error?:Error,value?:{accountUid:string;credentialId:string;sourceB64u:string})=>{if(settled)return;settled=true;clearInterval(closed);clearTimeout(timeout);window.removeEventListener('message',receive);try{popup.close();}catch{/* Closed. */}if(error)reject(error);else resolve(value!);};
  const receive=(event:MessageEvent)=>{
   if(event.origin!==CANONICAL_ORIGIN||event.source!==popup)return;const data=event.data;
   if(!data||data.source!=='receiz-account-pbi-bridge'||data.state!==state)return;
   if(data.kind==='error'){finish(Error(typeof data.error==='string'?data.error:'PBI_ACCOUNT_FAILED'));return;}
   if(data.kind==='authenticate'&&!signing){
    if(data.accountUid!==accountUid){finish(Error('PBI_ACCOUNT_MISMATCH'));return;}signing=true;
    void sign().then(proof=>{if(!settled)popup.postMessage({source:'bankeiz-account-pbi',kind:'authenticate',state,...device,targetUid:accountUid,...proof,next:'/account'},CANONICAL_ORIGIN);}).catch(error=>finish(error instanceof Error?error:Error('PBI_ACCOUNT_SIGN_FAILED')));
   }else if(data.kind==='connected'&&signing){
    if(data.ok!==true||data.accountUid!==accountUid||typeof data.credentialId!=='string'||!/^[A-Za-z0-9_-]+$/.test(data.credentialId)||typeof data.sourceB64u!=='string'||!data.sourceB64u||data.sourceB64u.length>8*1024*1024){finish(Error('PBI_ACCOUNT_SOURCE_REQUIRED'));return;}
    finish(undefined,{accountUid,credentialId:data.credentialId,sourceB64u:data.sourceB64u});
   }
  };
  window.addEventListener('message',receive);const closed=setInterval(()=>{if(popup.closed)finish(Error('passkey_cancelled'));},250),timeout=setTimeout(()=>finish(Error('PBI_ACCOUNT_TIMEOUT')),5*60_000);
  try{popup.location.replace(url.href);}catch{finish(Error('PBI_POPUP_UNAVAILABLE'));}
 });
}

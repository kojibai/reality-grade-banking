import {profileAvatarUrl} from './profile-avatar';
import {profileUsername} from './public-profile';
export type TwinAgent={version:number;agentId:string;ownerUserId:string;displayName:string;systemPersona:string;memoryScope:string;capabilities:string[];policy:Record<string,unknown>;updatedAt:string};
export type TwinPortrait={ownerUserId?:string;avatarId:string;avatarImageUrl:string;visualStyle?:string;sourceImageUrl?:string|null};
export type TwinSettings={profile:{userId:string;username:string;displayName?:string};agent:TwinAgent|null;avatar:TwinPortrait|null};
export const twinEmbedCode=(settings:TwinSettings)=>`<script src="https://receiz.com/receiz-twin-embed.js" data-username="${settings.profile.username}" async></script>`;
export type TwinWorkspaceRequest={action:'inspect'|'save'|'portrait'|'work'|'task';patch?:Record<string,unknown>;style?:string;prompt?:string;operation?:{id:string;quoteExpiresAt:string}};
export type TwinWork={tasks:Record<string,unknown>[];campaigns:Record<string,unknown>[];attribution?:Record<string,unknown>};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
/** Same owner, same native Twin. No reads until requested, no second settings
 * store, and no mutation retry with a replacement operation identifier. */
export function createTwinWorkspace(input:{accountUid:string;assertOpen():void;onContacts?(owner:string,contacts:unknown[]):Promise<void>;request(input:TwinWorkspaceRequest,file?:File):Promise<unknown>}){
 let settings:Promise<TwinSettings>|undefined,work:Promise<TwinWork>|undefined;
 let heldSettings:TwinSettings|null=null,heldWork:TwinWork|null=null;
 const contactVersions=new Map<string,string>();let workReading=false;
 let pending:{request:TwinWorkspaceRequest;file?:File}|undefined;
 function owner(value:unknown):TwinAgent|null{if(value===null)return null;if(!record(value)||value.ownerUserId!==input.accountUid||typeof value.agentId!=='string'||typeof value.displayName!=='string'||typeof value.systemPersona!=='string'||!Array.isArray(value.capabilities)||!record(value.policy))throw Error('TWIN_WORKSPACE_OWNER_MISMATCH');return value as TwinAgent;}
 function portrait(value:unknown):TwinPortrait|null{if(value===null)return null;if(!record(value)||value.ownerUserId!==input.accountUid||typeof value.avatarId!=='string'||typeof value.avatarImageUrl!=='string')throw Error('TWIN_WORKSPACE_OWNER_MISMATCH');const avatarImageUrl=profileAvatarUrl(value.avatarImageUrl);if(!avatarImageUrl)throw Error('TWIN_IMAGE_URL_INVALID');return{...value,avatarImageUrl,sourceImageUrl:profileAvatarUrl(value.sourceImageUrl)} as TwinPortrait;}
 async function read(request:TwinWorkspaceRequest,file?:File){input.assertOpen();const result=await input.request(request,file);input.assertOpen();if(!record(result)||result.ok!==true)throw Error(record(result)&&typeof result.error==='string'?result.error:'TWIN_RESULT_UNCONFIRMED');return result;}
 const load=()=>{input.assertOpen();return settings??=read({action:'inspect'}).then(result=>{const p=result.profile;if(!record(p)||p.userId!==input.accountUid||!profileUsername(p.username))throw Error('TWIN_WORKSPACE_OWNER_MISMATCH');heldSettings={profile:p as TwinSettings['profile'],agent:owner(result.agent),avatar:portrait(result.avatar)};return heldSettings;}).catch(error=>{settings=undefined;throw error;});};
 async function apply(){if(!pending)throw Error('TWIN_CHANGE_MISSING');const held=pending;const result=await read(held.request,held.file),current=await load();input.assertOpen();
  if(held.request.action==='save')settings=Promise.resolve(heldSettings={...current,agent:owner(result.agent)});
  else if(held.request.action==='portrait')settings=Promise.resolve(heldSettings={...current,avatar:portrait(result.avatar)});
  else if(held.request.action==='task'){work=undefined;}
  pending=undefined;return result;
 }
 async function change(request:TwinWorkspaceRequest,file?:File){input.assertOpen();if(pending)throw Error('TWIN_CHANGE_PENDING');await load();input.assertOpen();pending={request:{...request,operation:{id:crypto.randomUUID(),quoteExpiresAt:new Date(Date.now()+15*60_000).toISOString()}},...(file?{file}:{})};return apply();}
 async function loadWork(refresh=false){input.assertOpen();if(refresh&&!workReading)work=undefined;if(!work){workReading=true;work=read({action:'work'}).then(async result=>{
    if(!Array.isArray(result.tasks)||!Array.isArray(result.campaigns))throw Error('TWIN_WORK_UNAVAILABLE');
    for(const task of result.tasks){if(!record(task)||typeof task.id!=='string'||typeof task.contactsSyncedAt!=='string'||!Array.isArray(task.contactUpdates)||contactVersions.get(task.id)===task.contactsSyncedAt)continue;await input.onContacts?.(input.accountUid,task.contactUpdates);input.assertOpen();contactVersions.set(task.id,task.contactsSyncedAt);}
    heldWork={tasks:result.tasks,campaigns:result.campaigns,...(record(result.attribution)?{attribution:result.attribution}:{})} as TwinWork;return heldWork;
   }).catch(error=>{work=undefined;throw error;}).finally(()=>{workReading=false;});}return work;}
 const listeners=new Set<{next(value:TwinWork):void;error(cause:unknown):void;version?:string}>();let timer:ReturnType<typeof setTimeout>|undefined,reading=false,queuedRefresh=false;
 const visible=()=>typeof document==='undefined'||document.visibilityState!=='hidden';
 async function tick(refresh=false){
  if(reading){if(refresh)queuedRefresh=true;return;}if(!listeners.size||!visible())return;reading=true;clearTimeout(timer);
  try{const value=await loadWork(refresh),version=JSON.stringify([value.tasks.map(row=>[row.id,row.updatedAt,row.status,row.contactsSyncedAt]),value.campaigns.map(row=>[row.id,row.updatedAt,row.latestRunAt])]);for(const listener of listeners)if(listener.version!==version){listener.version=version;listener.next(value);}if(listeners.size&&value.tasks.some(row=>['planning','running'].includes(String(row.status))))timer=setTimeout(()=>void tick(true),4000);}
  catch(cause){for(const listener of listeners)listener.error(cause);}finally{reading=false;if(queuedRefresh){queuedRefresh=false;void tick(true);}}
 }
 const resume=()=>{clearTimeout(timer);if(visible())void tick(true);};
 return{
  accountUid:input.accountUid,
  knownSettings(){try{input.assertOpen();return heldSettings;}catch{return null;}},
  knownWork(){try{input.assertOpen();return heldWork;}catch{return null;}},
  settings:load,
  embed(){input.assertOpen();return load().then(twinEmbedCode);},
  save(patch:Record<string,unknown>){return change({action:'save',patch});},
  portrait(file:File,style:string,prompt:string){if(!file.type.startsWith('image/')||!file.size||file.size>3_500_000)return Promise.reject(Error('TWIN_IMAGE_INVALID'));return change({action:'portrait',style,prompt},file);},
  retry(){input.assertOpen();if(pending?.request.action!=='portrait')return Promise.reject(Error('TWIN_INSPECT_CURRENT_REQUIRED'));return apply();},
  pendingKind:()=>pending?.request.action,
  async refresh(){input.assertOpen();settings=undefined;const view=await load();if(pending?.request.action==='save')pending=undefined;return view;},
  hasPending:()=>!!pending,
  work:loadWork,
  refreshWork:()=>tick(true),
  watchWork(next:(value:TwinWork)=>void,error:(cause:unknown)=>void=()=>{}){
   input.assertOpen();const listener={next,error};listeners.add(listener);if(listeners.size===1&&typeof document!=='undefined')document.addEventListener('visibilitychange',resume);void tick();
   return()=>{listeners.delete(listener);if(!listeners.size){clearTimeout(timer);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',resume);}};
  },
  task(prompt:string){if(!prompt.trim()||prompt.length>8000)return Promise.reject(Error('TWIN_TASK_INVALID'));return read({action:'task',prompt,operation:{id:crypto.randomUUID(),quoteExpiresAt:new Date(Date.now()+15*60_000).toISOString()}}).then(result=>{work=undefined;void tick(true);return result;});},
 };
}
export type TwinWorkspace=ReturnType<typeof createTwinWorkspace>;

import {businessSetupTools,parseBusinessSetupCall,type BusinessOperation,type createBusinessSetupTools} from './business-setup';
import type {createBusinessProfileTools} from './business-profile-tools';
import {BusinessDnsConnectionRequired,type createBusinessDnsTools,type BusinessDnsView} from './business-dns-tools';
import type {ProfilePatch} from './profile-edit';
import type {AssetComposerDraft} from './asset-composer';
export type BusinessChatReceipt={id:string;tool:string;status:'accepted'|'refused'|'unknown'|'needs-file'|'manual'|'waiting'|'connect';title:string;summary:string;details?:string;domain?:BusinessDnsView;connect?:{label:string;href:string}};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exact=(value:Record<string,unknown>,keys:string[])=>{if(Object.keys(value).some(key=>!keys.includes(key)))throw Error('BUSINESS_CHAT_INPUT_INVALID');};
/** Private same-owner execution. Files and enclosing Originals never enter tool
 * JSON. A repeated accepted native response reuses its actual result; unknown
 * effects are not automatically retried. The UI supplies explicit owner turns. */
export function createBusinessChat(input:{accountUid:string;profile():Promise<ReturnType<typeof createBusinessProfileTools>>;setup():Promise<ReturnType<typeof createBusinessSetupTools>>;dns(provider?:string,expectedHostname?:string):Promise<ReturnType<typeof createBusinessDnsTools>>;retainOriginal?(file:File):Promise<void>;assertOpen():void}){
 let files:File[]=[],original:File|undefined,sealedSelection:File[]=[];
 const pendingHostnames=new Map<string,string>();
 const actionResults=new Map<string,Promise<BusinessChatReceipt>>();
 const retained=new Map<string,{fingerprint:string;result:Promise<BusinessChatReceipt[]>;run:()=>Promise<BusinessChatReceipt[]>}>();
 async function perform(id:string,action:{tool:string;args:Record<string,unknown>},selected:File[]):Promise<BusinessChatReceipt>{
  input.assertOpen();const {tool,args}=action;
  const receipt=(status:BusinessChatReceipt['status'],title:string,summary:string,extra:Partial<BusinessChatReceipt>={}):BusinessChatReceipt=>({id,tool,status,title,summary,...extra});
  let started=false;
  try{
   if(!record(args))throw Error('BUSINESS_CHAT_INPUT_INVALID');
   if(businessSetupTools.some(row=>row.name===tool)){
    const operation:BusinessOperation|undefined=['business_configure_agent','business_create_work'].includes(tool)?{id,quoteExpiresAt:new Date(Date.now()+5*60*1000).toISOString()}:undefined;
    const call=parseBusinessSetupCall({tool,args,...(operation?{operation}:{})}),setup=await input.setup();input.assertOpen();started=true;
    const result=await setup.execute(call.tool,call.args,call.operation);input.assertOpen();
    return receipt(result.outcome,result.outcome==='accepted'?'Setup updated':result.outcome==='refused'?'Setup needs attention':'Result not confirmed',result.outcome==='accepted'?'The native service confirmed this result.':result.error??'Ask me to check the current state before making another change.',{details:JSON.stringify(result).slice(0,16000)});
   }
   if(tool==='business_update_profile'){
    exact(args,['patch']);if(!record(args.patch))throw Error('BUSINESS_CHAT_INPUT_INVALID');const profile=await input.profile();input.assertOpen();started=true;const result=await profile.updateProfile(args.patch as ProfilePatch);input.assertOpen();return receipt('accepted','Profile saved',`Your changes are saved on ${result.profilePath}.`);
   }
   if(tool==='business_check_username'){
    exact(args,['username']);if(typeof args.username!=='string')throw Error('BUSINESS_CHAT_INPUT_INVALID');const profile=await input.profile();input.assertOpen();started=true;const result=await profile.checkUsername(args.username);input.assertOpen();return receipt('accepted','Username checked',result.available?`${args.username} is available.`:`${args.username} is not available.`,{details:JSON.stringify(result)});
   }
   if(tool==='business_set_profile_image'){
    exact(args,['kind']);if(args.kind!=='avatar'&&args.kind!=='banner')throw Error('BUSINESS_CHAT_INPUT_INVALID');if(selected.length!==1)return receipt('needs-file','Choose your image','Attach the image here and tell me to use it.');const profile=await input.profile();input.assertOpen();started=true;await profile.setProfileImage(selected[0],args.kind);input.assertOpen();return receipt('accepted','Image saved',args.kind==='avatar'?'Your profile picture is updated.':'Your cover image is updated.');
   }
   if(tool==='business_seal_object'){
    exact(args,['title','description','longForm','kind']);if(!['title','description','longForm','kind'].every(key=>typeof args[key]==='string'))throw Error('BUSINESS_CHAT_INPUT_INVALID');
    if(args.kind!=='moment'&&!selected.length)return receipt('needs-file','Choose the original','Attach the work here so I can seal its exact bytes.');
    const draft={title:args.title as string,description:args.description as string,longForm:args.longForm as string,kind:args.kind as AssetComposerDraft['kind'],files:selected.map((file,index)=>({id:'selected-'+index,role:index===0&&args.kind!=='moment'?'primary':'attachment',file,...(index===0&&args.kind!=='moment'?{}:{attachmentRole:'source'})}))} as AssetComposerDraft;
    original=undefined;sealedSelection=[];const profile=await input.profile();input.assertOpen();started=true;const result=await profile.sealObject(draft);input.assertOpen();original=result.original;sealedSelection=[...selected];await input.retainOriginal?.(original);input.assertOpen();return receipt('accepted','Original sealed','Your verified proof object is held privately. Publishing is a separate action.',{details:JSON.stringify(result.view)});
   }
   if(tool==='business_publish_object'){
    exact(args,[]);const changedSelection=selected.length>0&&(!original||selected.length!==sealedSelection.length||selected.some((file,index)=>file!==sealedSelection[index])),source=changedSelection?(selected.length===1?selected[0]:undefined):original;if(!source)return receipt('needs-file','Choose the sealed Original','Seal the work in this conversation first, or attach its verified Original and ask me to publish it.');const profile=await input.profile();input.assertOpen();started=true;const result=await profile.publishObject(source);input.assertOpen();return receipt(result.status==='published'?'accepted':result.status==='rejected'?'refused':'unknown',result.status==='published'?'Published':'Publication needs checking',result.status==='published'?'The native Showcase confirmed publication of your verified Original.':'Publication is not confirmed. The Original remains held; I have not retried.',{details:JSON.stringify(result)});
   }
   if(['business_dns_instructions','business_dns_configure','business_dns_check'].includes(tool)){
    exact(args,tool==='business_dns_instructions'?['provider']:tool==='business_dns_configure'?['mode','provider']:[]);
    if(args.provider!==undefined&&typeof args.provider!=='string')throw Error('BUSINESS_CHAT_INPUT_INVALID');if(tool==='business_dns_configure'&&!['automatic','manual'].includes(String(args.mode)))throw Error('BUSINESS_CHAT_INPUT_INVALID');const dns=await input.dns(args.provider as string|undefined,pendingHostnames.get(id));input.assertOpen();started=true;
    const view=tool==='business_dns_check'?await dns.check():tool==='business_dns_configure'?await dns.configure(args.mode as 'automatic'|'manual'):await dns.instructions(args.provider as string|undefined);input.assertOpen();
    const status=view.status==='domain_changed'?'refused':view.status==='live'?'accepted':view.status==='unknown'?'unknown':view.status==='manual'?'manual':'waiting';
    return receipt(status,view.status==='live'?'Domain is live':view.status==='manual'?'Connect your domain':'Domain status',view.summary,{domain:view});
   }
   return receipt('refused','Action unavailable','This is not a supported native Business action.');
  }catch(cause){input.assertOpen();if(cause instanceof BusinessDnsConnectionRequired){if(cause.hostname)pendingHostnames.set(id,cause.hostname);return receipt('connect','Connect your provider','Approve provider access, then I can continue here.',{connect:cause.action});}return receipt(started?'unknown':'refused',started?'Result not confirmed':'Action needs attention',started?'I have not retried this change. Ask me to check its current state first.':cause instanceof Error?cause.message:'This request could not be started.');}
 }
 return Object.freeze({
  async resume(requestId:string){input.assertOpen();const known=retained.get(requestId);if(!known)throw Error('BUSINESS_CHAT_REQUEST_UNKNOWN');const waiting=known.result,previous=await waiting;input.assertOpen();if(known.result!==waiting)return known.result;if(!previous.some(row=>row.status==='connect'))return previous;for(const row of previous)if(row.status==='connect')actionResults.delete(row.id);known.result=known.run();return known.result;},
  selectFiles(selected:readonly File[]){input.assertOpen();if(selected.length>20||selected.some(file=>!(file instanceof File)||file.size>64*1024*1024))throw Error('BUSINESS_CHAT_FILE_INVALID');files=[...selected];},
  async execute(requestId:string,actions:readonly{tool:string;args:Record<string,unknown>}[]){input.assertOpen();if(!/^[A-Za-z0-9:_-]{8,100}$/.test(requestId)||actions.length>4)throw Error('BUSINESS_CHAT_REQUEST_INVALID');const fingerprint=JSON.stringify(actions),known=retained.get(requestId);if(known){if(known.fingerprint!==fingerprint)throw Error('BUSINESS_CHAT_REQUEST_CHANGED');return known.result;}const selected=[...files];
   const run=async()=>{const receipts:BusinessChatReceipt[]=[];for(const [index,action]of actions.entries()){const id=requestId+':'+index;let result=actionResults.get(id);if(!result){result=perform(id,action,selected);actionResults.set(id,result);}const receipt=await result;receipts.push(receipt);if(receipt.status!=='accepted')break;}return receipts;};const result=run();retained.set(requestId,{fingerprint,result,run});return result;
  },
 });
}

export type BusinessChat=ReturnType<typeof createBusinessChat>;

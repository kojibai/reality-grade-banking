import type {NativeReceizTools,ReceizToolResult} from './native-receiz-tools';
import type {NativeOrganizer} from './native-organizer';
import {businessSetupTools,parseBusinessSetupCall,type BusinessOperation,type createBusinessSetupTools} from './business-setup';
import type {createBusinessProfileTools} from './business-profile-tools';
import {BusinessDnsConnectionRequired,changedBusinessDomain,type createBusinessDnsTools,type BusinessDnsView} from './business-dns-tools';
import type {ProfilePatch} from './profile-edit';
import type {AssetComposerDraft} from './asset-composer';
export type BusinessChatReceipt={id:string;tool:string;workTaskId?:string;workTerminal?:boolean;status:'accepted'|'refused'|'unknown'|'needs-file'|'manual'|'waiting'|'connect'|'review';title:string;summary:string;details?:string;reviewTool?:{name:string;argumentsJson:string};inspectTool?:boolean;domain?:BusinessDnsView;domainChecking?:boolean;connect?:{label:string;href:string}};
export type BusinessChatProgress={onProgress?:(tool:string)=>void};

const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const exact=(value:Record<string,unknown>,keys:string[])=>{if(Object.keys(value).some(key=>!keys.includes(key)))throw Error('BUSINESS_CHAT_INPUT_INVALID');};
/** Private same-owner execution. Files and enclosing Originals never enter tool
 * JSON. A repeated accepted native response reuses its actual result; unknown
 * effects are not automatically retried. The UI supplies explicit owner turns. */
export function createBusinessChat(input:{accountUid:string;twinWorkspace?():Promise<import('./twin-workspace').TwinWorkspace>;organizer?():Promise<NativeOrganizer>;receizTools?():Promise<NativeReceizTools>;username?():string|undefined;profile():Promise<ReturnType<typeof createBusinessProfileTools>>;setup():Promise<ReturnType<typeof createBusinessSetupTools>>;dns(provider?:string,expectedHostname?:string):Promise<ReturnType<typeof createBusinessDnsTools>>;retainOriginal?(file:File):Promise<void>;assertOpen():void}){
 let files:File[]=[],original:File|undefined,sealedSelection:File[]=[];
 const pendingHostnames=new Map<string,string>();
 const actionResults=new Map<string,Promise<BusinessChatReceipt>>();
 const retained=new Map<string,{fingerprint:string;result:Promise<BusinessChatReceipt[]>;run:(options?:BusinessChatProgress)=>Promise<BusinessChatReceipt[]>}>();
 const receizReceipt=(id:string,result:ReceizToolResult,args?:Record<string,unknown>):BusinessChatReceipt=>({id,tool:'business_receiz_call',status:result.status==='pending'?'waiting':result.status==='review'?'review':result.status,
  title:result.status==='review'?'Review Receiz action':result.status==='pending'?'Receiz action is pending':result.status==='unknown'?'Result not confirmed':'Receiz result',
  summary:result.status==='review'?'Run this chosen action through your existing Receiz tools. Its native checks and consent still apply.':result.status==='pending'?'Check this same attempt for its result. It has not been repeated.':result.status==='unknown'?'The result is not confirmed. This action has not been repeated.':'Receiz returned the native result shown below.',
  ...(result.status==='review'&&args?{reviewTool:{name:result.tool,argumentsJson:JSON.stringify(args,null,2)}}:{}),...(result.status==='pending'?{inspectTool:true}:{}),...(result.result?{details:JSON.stringify(result.result).slice(0,16000)}:{})});
 async function perform(id:string,action:{tool:string;args:Record<string,unknown>},selected:File[]):Promise<BusinessChatReceipt>{
  input.assertOpen();const {tool,args}=action;
  const receipt=(status:BusinessChatReceipt['status'],title:string,summary:string,extra:Partial<BusinessChatReceipt>={}):BusinessChatReceipt=>({id,tool,status,title,summary,...extra});
  let started=false;
  try{
   if(!record(args))throw Error('BUSINESS_CHAT_INPUT_INVALID');
   if(tool==='business_start_task'||tool==='business_inspect_work'){
    exact(args,tool==='business_start_task'?['prompt']:[]);if(!input.twinWorkspace)throw Error('TWIN_WORK_UNAVAILABLE');
    if(tool==='business_start_task'&&(typeof args.prompt!=='string'||!args.prompt.trim()||args.prompt.length>8000))throw Error('BUSINESS_CHAT_INPUT_INVALID');
    const api=await input.twinWorkspace();input.assertOpen();started=tool==='business_start_task';
    const result=tool==='business_start_task'?await api.task(args.prompt as string):await api.work(true);input.assertOpen();
    return receipt('accepted',started?'Your work has started':'Your agent’s work',started?'The existing task is underway. Keep chatting; open Work in your Twin to see its actual progress.':'The latest native tasks and campaign results are shown.',{details:JSON.stringify(result).slice(0,16000),...(started&&record(result)&&'task' in result&&record(result.task)&&typeof result.task.id==='string'?{workTaskId:result.task.id}:{})});
   }
   if(tool==='business_receiz_call'){
    exact(args,['name','arguments']);if(typeof args.name!=='string'||!record(args.arguments)||!input.receizTools)throw Error('RECEIZ_TOOL_UNAVAILABLE');const tools=await input.receizTools();input.assertOpen();
    const result=await tools.execute(id,args.name,args.arguments);return receizReceipt(id,result,args.arguments);
   }
   if(/^business_(?:find_contacts|save_contact|read_calendar|create_appointment|update_appointment|cancel_appointment|booking_link|read_availability|update_availability)$/.test(tool)){
    if(!input.organizer)throw Error('ORGANIZER_UNAVAILABLE');const {executeOrganizerTwinAction}=await import('./organizer-twin'),api=await input.organizer();input.assertOpen();if(api.accountUid!==input.accountUid)throw Error('ORGANIZER_OWNER_MISMATCH');
    // Argument errors are refused before dispatch. An uncertain write is kept
    // by the shared request journal and is never automatically replayed.
    try{const result=await executeOrganizerTwinAction(api,tool,args,input.username?.());input.assertOpen();return receipt('accepted','Organizer updated','The result is available in your Contacts and Calendar.',{details:JSON.stringify(result).slice(0,16000)});}catch(cause){if(cause instanceof Error&&cause.message==='ORGANIZER_WRITE_UNCONFIRMED')started=true;throw cause;}
   }
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
    return receipt(status,view.status==='live'?'Domain is live':view.status==='domain_changed'?'Domain changed':view.status==='manual'?'Connect your domain':view.providerResult?.status==='applied'?'DNS saved · checking your domain':'Domain status',view.providerResult?.status==='applied'&&status==='waiting'?'Your DNS records are saved. Keep using your profile and chatting here while I check your domain in the background.':view.summary,{domain:view});
   }
   return receipt('refused','Action unavailable','This is not a supported native Business action.');
  }catch(cause){input.assertOpen();if(cause instanceof BusinessDnsConnectionRequired){if(cause.hostname)pendingHostnames.set(id,cause.hostname);return receipt('connect','Connect your provider','Approve provider access, then I can continue here.',{connect:cause.action});}return receipt(started?'unknown':'refused',started?'Result not confirmed':'Action needs attention',started?'I have not retried this change. Ask me to check its current state first.':cause instanceof Error?cause.message:'This request could not be started.');}
 }
 return Object.freeze({
  async resolveReceizAction(requestId:string,id:string,action:'approve'|'inspect'){
   input.assertOpen();const known=retained.get(requestId);if(!known||!input.receizTools)throw Error('RECEIZ_TOOL_REQUEST_UNKNOWN');const prior=await known.result,row=prior.find(row=>row.id===id);if(!row||row.tool!=='business_receiz_call'||(action==='approve'?row.status!=='review':!row.inspectTool))return prior;
   const tools=await input.receizTools();input.assertOpen();const result=action==='approve'?await tools.approve(id):await tools.inspect(id);input.assertOpen();actionResults.set(id,Promise.resolve(receizReceipt(id,result)));known.result=known.run();return known.result;
  },
  async monitorWork(requestId:string,options:{signal:AbortSignal;onUpdate(receipts:BusinessChatReceipt[]):void}){
   input.assertOpen();const known=retained.get(requestId);if(!known||!input.twinWorkspace||options.signal.aborted)return;let receipts=await known.result;
   if(!receipts.some(row=>row.workTaskId&&!row.workTerminal))return;const api=await input.twinWorkspace();input.assertOpen();if(options.signal.aborted)return;
   await new Promise<void>(resolve=>{let stop=()=>{},ended=false;const done=()=>{if(ended)return;ended=true;stop();options.signal.removeEventListener('abort',done);resolve();};
    const publish=(tasks:Record<string,unknown>[]|null,attribution?:Record<string,unknown>)=>{
     if(ended||options.signal.aborted)return;try{input.assertOpen();}catch{done();return;}
     const byId=new Map(tasks?.map(task=>[task.id,task])??[]);
     receipts=receipts.map(row=>{
      if(!row.workTaskId||row.workTerminal)return row;const task=byId.get(row.workTaskId);
      const next:BusinessChatReceipt=task?{...row,title:task.status==='completed'?'Your work is complete':task.status==='blocked'?'Your work needs a next step':task.status==='failed'?'Your work needs attention':'Your agent is working',summary:typeof task.summary==='string'?task.summary:row.summary,details:JSON.stringify({task,attribution}).slice(0,16000),workTerminal:!['planning','running'].includes(String(task.status))}:{...row,title:'Work progress is unavailable',summary:'This task is not in the current work view. Your saved contacts and campaigns remain available. The task has not been repeated.',workTerminal:true};
      actionResults.set(row.id,Promise.resolve(next));return next;
     });known.result=Promise.resolve(receipts);options.onUpdate(receipts);if(!receipts.some(row=>row.workTaskId&&!row.workTerminal))done();
    };
    options.signal.addEventListener('abort',done,{once:true});stop=api.watchWork(value=>publish(value.tasks,value.attribution),()=>publish(null));if(ended)stop();
   });
  },
  async monitorDomain(requestId:string,options:{signal:AbortSignal;onUpdate(receipts:BusinessChatReceipt[]):void}){
   input.assertOpen();const known=retained.get(requestId);if(!known)return;let receipts=await known.result;const receipt=receipts.find(row=>row.status==='waiting'&&row.domain?.providerResult?.status==='applied');if(!receipt?.domain||options.signal.aborted)return;
   const expected=receipt.domain.hostname,dns=await input.dns(receipt.domain.provider,expected),{monitorBusinessDomain}=await import('./business-domain-monitor');input.assertOpen();
   receipts=receipts.map(row=>row.id===receipt.id?{...row,domainChecking:true}:row);options.onUpdate(receipts);
   try{await monitorBusinessDomain({hostname:expected,signal:options.signal,inspect:()=>dns.inspect(),check:()=>dns.check(),onUpdate:view=>{
    input.assertOpen();if(options.signal.aborted)return;const changed=view.status==='domain_changed',ready=view.status==='live',status=changed?'refused':ready?'accepted':'waiting';
    receipts=receipts.map(row=>row.id===receipt.id?{...row,status,title:ready?'Domain is live':changed?'Domain changed':'DNS saved · checking your domain',summary:ready?'Your domain is verified and ready to use.':changed?changedBusinessDomain(receipt.domain!,view.hostname).summary:'Your DNS records are saved. Keep using your profile and chatting here while I check your domain in the background.',domain:changed?changedBusinessDomain(receipt.domain!,view.hostname):{...view,provider:receipt.domain?.provider,providerResult:receipt.domain?.providerResult}}:row);known.result=Promise.resolve(receipts);options.onUpdate(receipts);
   }});}finally{if(!options.signal.aborted){receipts=receipts.map(row=>row.id===receipt.id?{...row,domainChecking:false,...(row.status==='waiting'?{title:'DNS saved · waiting for delivery',summary:'Your records are saved. Delivery is not confirmed yet; ask me to check again when you’re ready.'}:{})}:row);known.result=Promise.resolve(receipts);options.onUpdate(receipts);}}
  },
  async resume(requestId:string,options?:BusinessChatProgress){input.assertOpen();const known=retained.get(requestId);if(!known)throw Error('BUSINESS_CHAT_REQUEST_UNKNOWN');const waiting=known.result,previous=await waiting;input.assertOpen();if(known.result!==waiting)return known.result;if(!previous.some(row=>row.status==='connect'))return previous;for(const row of previous)if(row.status==='connect')actionResults.delete(row.id);known.result=known.run(options);return known.result;},
  selectFiles(selected:readonly File[]){input.assertOpen();if(selected.length>20||selected.some(file=>!(file instanceof File)||file.size>64*1024*1024))throw Error('BUSINESS_CHAT_FILE_INVALID');files=[...selected];},
  async execute(requestId:string,actions:readonly{tool:string;args:Record<string,unknown>}[],options?:BusinessChatProgress){input.assertOpen();if(!/^[A-Za-z0-9:_-]{8,100}$/.test(requestId)||actions.length>4)throw Error('BUSINESS_CHAT_REQUEST_INVALID');const fingerprint=JSON.stringify(actions),known=retained.get(requestId);if(known){if(known.fingerprint!==fingerprint)throw Error('BUSINESS_CHAT_REQUEST_CHANGED');return known.result;}const selected=[...files];
   const run=async(progress?:BusinessChatProgress)=>{const receipts:BusinessChatReceipt[]=[];for(const [index,action]of actions.entries()){const id=requestId+':'+index;let result=actionResults.get(id);if(!result){progress?.onProgress?.(action.tool);result=perform(id,action,selected);actionResults.set(id,result);}const receipt=await result;receipts.push(receipt);if(receipt.status!=='accepted')break;}return receipts;};const result=run(options);retained.set(requestId,{fingerprint,result,run});return result;
  },
 });
}

export type BusinessChat=ReturnType<typeof createBusinessChat>;

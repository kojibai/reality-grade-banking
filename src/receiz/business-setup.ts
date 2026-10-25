/** Dormant tools for later chat integration. These descriptors are not grants:
 * the trusted caller must compose actual owner consent and native operation
 * retention before invoking them. Credentials never enter model arguments. */
export const businessCapabilities=['greet','converse','host-space','sell','negotiate','invest','coordinate','publish','settle','delegate'] as const;
export const businessCreationModes=['code','image','video','music','document','campaign','product','course'] as const;
const packs=['draft','assetSpec','launchPlan','proof','offer'] as const;
const routingKeys=['allowBusinessIntake','allowBusinessRouting','allowTeamHandoff','allowScheduling','allowPaymentRouting'] as const;
const offerLimits={offerName:120,offerSummary:320,idealCustomerProfile:320,proofPoints:320,primaryCallToAction:180};
const string=(maxLength:number)=>({type:'string',minLength:1,maxLength});
const object=(properties:Record<string,unknown>={},required:string[]=[])=>({type:'object',properties,required,additionalProperties:false});
const offerSchema=object(Object.fromEntries(Object.entries(offerLimits).map(([key,maxLength])=>[key,{type:'string',maxLength}])));
const routingSchema=object(Object.fromEntries(routingKeys.map(key=>[key,{type:'boolean'}])));
const descriptions=[
 {name:'business_inspect_agent',effect:'read',description:'Read the existing owner agent and its current business setup before proposing a change.',parameters:object()},
 {name:'business_configure_agent',effect:'configuration',description:'Apply the owner-approved changes to their existing agent, offer or client routing while preserving unrelated settings.',parameters:object({displayName:string(120),systemPersona:string(2400),memoryScope:{type:'string',enum:['none','session','relationship','venture']},capabilities:{type:'array',items:{type:'string',enum:businessCapabilities},minItems:1,maxItems:10,uniqueItems:true},offer:offerSchema,routing:routingSchema})},
 {name:'business_inspect_domain',effect:'read',description:'Read the actual saved domain and its native DNS, verification and live-route status.',parameters:object()},
 {name:'business_connect_domain',effect:'configuration',description:'Save the exact domain the owner asks to connect. Return its actual provider/DNS steps; do not claim it is live merely because it was saved.',parameters:object({hostname:string(253)},['hostname'])},
 {name:'business_check_domain',effect:'configuration',description:'Ask the native provider to check the currently saved domain. Keep waiting, warning and live states distinct.',parameters:object()},
 {name:'business_inspect_creation',effect:'read',description:'Read the existing creation workspace and its actual runs, outputs and asset states for the work the owner wants to continue.',parameters:object()},
 {name:'business_create_work',effect:'metered',description:'Start the creation work the owner explicitly requests using the native creator run and its retained usage operation. Text acceptance does not confirm a rendered asset.',parameters:object({mode:{type:'string',enum:businessCreationModes},prompt:string(2400),brandName:string(280),brandVoice:string(360),audience:string(420),offer:string(420),outputPacks:{type:'array',items:{type:'string',enum:packs},minItems:1,maxItems:5,uniqueItems:true}},['mode','prompt'])},
] as const;
export type BusinessToolName=typeof descriptions[number]['name'];
export type BusinessOperation=Readonly<{id:string;quoteExpiresAt:string}>;
export type BusinessSetupCall=Readonly<{tool:BusinessToolName;args:Record<string,unknown>;operation?:BusinessOperation}>;
export type BusinessSetupInvocation=BusinessSetupCall&Readonly<{accountUid:string}>;
export type BusinessSetupResult={accountUid:string;tool:BusinessToolName;outcome:'accepted'|'refused'|'unknown';data?:Record<string,unknown>;error?:string;operationId?:string;operationStatus?:string;newActionRequired?:boolean};
function freeze<T>(value:T):T{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
export const businessSetupTools=freeze(descriptions.map(tool=>({...tool,requiresOwnerApproval:tool.effect!=='read'})));
export function setupRecord(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)&&(Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null)?value as Record<string,unknown>:null;}
function invalid():never{throw Error('BUSINESS_SETUP_INPUT_INVALID');}
function exact(value:unknown,keys:readonly string[]){const row=setupRecord(value);if(!row||Object.keys(row).some(key=>!keys.includes(key)))invalid();return row;}
function text(value:unknown,max:number,empty=false){return typeof value==='string'&&value.length<=max&&(empty||!!value.trim());}
function strings(value:unknown,allowed:readonly string[],max:number){return Array.isArray(value)&&value.length>0&&value.length<=max&&new Set(value).size===value.length&&value.every(v=>typeof v==='string'&&allowed.includes(v));}
function hostname(value:unknown){return typeof value==='string'&&value.length<=253&&value===value.trim()&&value===value.toLowerCase()&&value.includes('.')&&!value.endsWith('.')&&value.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));}
export function parseBusinessSetupCall(input:unknown):BusinessSetupCall{
 const row=exact(input,['tool','args','operation']);
 const tool=businessSetupTools.find(t=>t.name===row.tool);if(!tool)invalid();
 let args:Record<string,unknown>;
 switch(tool.name){
  case 'business_configure_agent':{
   args=exact(row.args,['displayName','systemPersona','memoryScope','capabilities','offer','routing']);if(!Object.keys(args).length)invalid();
   if(args.displayName!==undefined&&!text(args.displayName,120)||args.systemPersona!==undefined&&!text(args.systemPersona,2400)||args.memoryScope!==undefined&&(typeof args.memoryScope!=='string'||!['none','session','relationship','venture'].includes(args.memoryScope))||args.capabilities!==undefined&&!strings(args.capabilities,businessCapabilities,10))invalid();
   if(args.offer!==undefined){const offer=exact(args.offer,Object.keys(offerLimits));if(!Object.keys(offer).length||Object.entries(offer).some(([key,value])=>!text(value,offerLimits[key as keyof typeof offerLimits],true)))invalid();}
   if(args.routing!==undefined){const routing=exact(args.routing,routingKeys);if(!Object.keys(routing).length||Object.values(routing).some(value=>typeof value!=='boolean'))invalid();}break;
  }
  case 'business_connect_domain':args=exact(row.args,['hostname']);if(!hostname(args.hostname))invalid();break;
  case 'business_create_work':{
   args=exact(row.args,['mode','prompt','brandName','brandVoice','audience','offer','outputPacks']);
   if(!businessCreationModes.includes(args.mode as typeof businessCreationModes[number])||!text(args.prompt,2400)||args.outputPacks!==undefined&&!strings(args.outputPacks,packs,5))invalid();
   for(const [key,max] of Object.entries({brandName:280,brandVoice:360,audience:420,offer:420}))if(args[key]!==undefined&&!text(args[key],max))invalid();break;
  }
  default:args=exact(row.args,[]);
 }
 const needsOperation=tool.name==='business_configure_agent'||tool.name==='business_create_work';
 let operation:BusinessOperation|undefined;
 if(needsOperation){const op=exact(row.operation,['id','quoteExpiresAt']);if(!text(op.id,160)||String(op.id).trim().length<8||!text(op.quoteExpiresAt,40)||!Number.isFinite(Date.parse(String(op.quoteExpiresAt))))invalid();if(tool.name==='business_create_work'&&!/^[A-Za-z0-9][A-Za-z0-9:_-]{7,79}$/.test(String(op.id)))invalid();operation={id:op.id as string,quoteExpiresAt:op.quoteExpiresAt as string};}
 else if(row.operation!==undefined)invalid();
 return structuredClone({tool:tool.name,args,...(operation?{operation}:{})});
}
export function createBusinessSetupTools(input:{accountUid:string;invoke(call:BusinessSetupInvocation):Promise<BusinessSetupResult>;assertOpen():void}){
 if(!input.accountUid)invalid();
 return Object.freeze({async execute(tool:BusinessToolName,args:unknown,operation?:BusinessOperation){
  input.assertOpen();const call=parseBusinessSetupCall({tool,args,...(operation?{operation}:{})});
  let result:BusinessSetupResult;
  try{result=await input.invoke({...call,accountUid:input.accountUid});}
  catch{input.assertOpen();return{accountUid:input.accountUid,tool,outcome:'unknown' as const,error:'Native result is not confirmed.',...(operation?{operationId:operation.id}:{})};}
  input.assertOpen();
  if(result.accountUid!==input.accountUid)throw Error('BUSINESS_SETUP_OWNER_MISMATCH');
  if(result.tool!==tool||!['accepted','refused','unknown'].includes(result.outcome)||call.operation&&result.operationId!==call.operation.id||result.outcome==='accepted'&&!setupRecord(result.data))throw Error('BUSINESS_SETUP_RESULT_INVALID');
  return structuredClone(result);
 }});
}

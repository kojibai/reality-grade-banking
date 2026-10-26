export type ReceizToolDescriptor={name:string;description:string;inputSchema:Record<string,unknown>;annotations?:{readOnlyHint?:boolean;destructiveHint?:boolean}};
export type ReceizToolResult={status:'accepted'|'refused'|'review'|'pending'|'unknown';tool:string;result?:unknown;attemptId?:string};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
/** One owner transport and exact retained attempts. The existing MCP runtime
 * performs execution, proof admission and tool-specific confirmation. */
export function createNativeReceizTools({request,assertOpen}:{request:(path:string,init?:RequestInit)=>Promise<Response>;assertOpen():void}){
 let catalog:Promise<ReceizToolDescriptor[]>|undefined;
 const attempts=new Map<string,{name:string;args:Record<string,unknown>;fingerprint:string;result:Promise<ReceizToolResult>;approved:boolean}>();
 async function rpc(id:string,method:string,params?:unknown){assertOpen();const response=await request('/api/mcp/account',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,...(params===undefined?{}:{params})})});assertOpen();const raw:unknown=await response.json();if(!response.ok||!record(raw)||raw.jsonrpc!=='2.0'||raw.id!==id)throw Error('RECEIZ_TOOL_RESPONSE_UNCONFIRMED');return raw;}
 const tools=()=>{assertOpen();return catalog??=rpc(crypto.randomUUID(),'tools/list').then(raw=>{const result=record(raw.result)?raw.result:null;if(!Array.isArray(result?.tools)||result.tools.length>1000)throw Error('RECEIZ_TOOL_CATALOG_UNAVAILABLE');return result.tools.map((v:unknown)=>{if(!record(v)||typeof v.name!=='string'||!/^receiz_[a-z0-9_]+$/.test(v.name)||typeof v.description!=='string'||!record(v.inputSchema))throw Error('RECEIZ_TOOL_CATALOG_INVALID');return v as ReceizToolDescriptor;});}).catch(cause=>{catalog=undefined;throw cause;});};
 function outcome(tool:string,raw:Record<string,unknown>):ReceizToolResult{const error=record(raw.error)?raw.error:null,data=record(error?.data)?error.data:null;
  if(typeof data?.attemptId==='string'&&/^[A-Za-z0-9_-]{1,160}$/.test(data.attemptId))return{status:'pending',tool,attemptId:data.attemptId};
  if(error)return{status:'refused',tool,result:{message:typeof error.message==='string'?error.message:'Execution was refused.'}};
  if(!record(raw.result))return{status:'unknown',tool};
  // Tool private component metadata and binary content stay in the held
  // transport. Only the tool's declared public result enters chat context.
  const result=raw.result;return{status:result.isError===true?'refused':'accepted',tool,result:{...(record(result.structuredContent)?{structuredContent:result.structuredContent}:{}),...(Array.isArray(result.content)?{content:result.content.filter((v:unknown)=>record(v)&&v.type==='text')}:{} )}};
 }
 async function run(id:string,held:NonNullable<ReturnType<typeof attempts.get>>){try{return outcome(held.name,await rpc(id,'tools/call',{name:held.name,arguments:held.args}));}catch{assertOpen();return{status:'unknown' as const,tool:held.name};}}
 return{catalog:tools,
  async execute(id:string,name:string,args:Record<string,unknown>):Promise<ReceizToolResult>{assertOpen();if(!/^[A-Za-z0-9:_-]{8,160}$/.test(id)||!record(args)||JSON.stringify(args).length>24000)throw Error('RECEIZ_TOOL_ARGUMENT_INVALID');const fingerprint=JSON.stringify({name,args}),prior=attempts.get(id);if(prior){if(prior.fingerprint!==fingerprint)throw Error('RECEIZ_TOOL_REQUEST_CHANGED');return prior.result;}
   const descriptor=(await tools()).find(tool=>tool.name===name);if(!descriptor)throw Error('RECEIZ_TOOL_UNAVAILABLE');assertOpen();const held={name,args:structuredClone(args),fingerprint,approved:false,result:Promise.resolve<ReceizToolResult>({status:'review',tool:name})};attempts.set(id,held);
   // Read-only tools execute on the requested turn. Chosen mutations use a
   // direct human action over these privately held exact arguments.
   if(descriptor.annotations?.readOnlyHint===true&&descriptor.annotations.destructiveHint!==true){held.approved=true;held.result=run(id,held);}return held.result;
  },
  async approve(id:string){assertOpen();const held=attempts.get(id);if(!held)throw Error('RECEIZ_TOOL_REQUEST_UNKNOWN');if(!held.approved){held.approved=true;held.result=run(id,held);}return held.result;},
  async inspect(id:string){assertOpen();const held=attempts.get(id);if(!held)throw Error('RECEIZ_TOOL_REQUEST_UNKNOWN');const previous=await held.result;if(previous.status!=='pending'||!previous.attemptId)return previous;
   try{const response=await request('/api/mcp/device/attempt/'+previous.attemptId,{method:'GET'});assertOpen();if(response.status===202)return previous;const raw:unknown=await response.json();if(!response.ok||!record(raw)||raw.jsonrpc!=='2.0')return previous;const result=outcome(held.name,raw);held.result=Promise.resolve(result);return result;}catch{assertOpen();return previous;}
  },
 };
}
export type NativeReceizTools=ReturnType<typeof createNativeReceizTools>;

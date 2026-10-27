import {readJson,freshCookie,continuationProof} from './business-setup.js';
const origin='https://receiz.com',uuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const failure=(error:string,status=503)=>Response.json({ok:false,error},{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
/** Named operations only, using the existing Identity Seal continuation and
 * native owner routes. No private owner or transport is chosen by model args. */
export async function relayTwinWorkspace(request:Request):Promise<Response>{
 const url=new URL(request.url);
 if(request.method!=='POST'||url.search||request.headers.get('origin')!==url.origin||request.headers.has('cookie')||request.headers.has('authorization'))return failure('twin_workspace_request_refused',403);
 try{
  let input:Record<string,unknown>,file:File|undefined;
  if(request.headers.get('content-type')?.startsWith('multipart/form-data')){
   const reader=request.body?.getReader();if(!reader)return failure('twin_workspace_input_invalid',400);const chunks:Uint8Array[]=[];let size=0;
   try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4*1024*1024)return failure('twin_image_capacity',413);chunks.push(part.value);}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   const body=new Uint8Array(size);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
   const form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')!},body}).formData();
   if([...form.keys()].some(key=>!['input','image'].includes(key))||form.getAll('input').length!==1||form.getAll('image').length!==1)return failure('twin_workspace_input_invalid',400);
   input=JSON.parse(String(form.get('input')));const image=form.get('image');if(!(image instanceof File)||!image.type.startsWith('image/')||!image.size||image.size>3_500_000)return failure('twin_image_invalid',400);file=image;
  }else{if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return failure('twin_workspace_input_invalid',400);input=await readJson(request,64*1024);}
  if(!record(input)||Object.keys(input).some(key=>!['accountUid','continuation','action','patch','style','prompt','operation'].includes(key))||typeof input.accountUid!=='string'||!uuid.test(input.accountUid)||!['inspect','save','portrait','mind','work','task'].includes(String(input.action)))return failure('twin_workspace_input_invalid',400);
  const action=String(input.action),write=['save','portrait','task'].includes(action),op=input.operation;
  if(write&&(!record(op)||Object.keys(op).some(key=>!['id','quoteExpiresAt'].includes(key))||typeof op.id!=='string'||!/^[A-Za-z0-9:_-]{8,100}$/.test(op.id)||typeof op.quoteExpiresAt!=='string'||!Number.isFinite(Date.parse(op.quoteExpiresAt))))return failure('twin_workspace_operation_required',400);
  if(action==='save'&&!record(input.patch)||action==='portrait'&&(!file||!['photoreal','illustrated','stylized-3d','sigil-born'].includes(String(input.style))||typeof input.prompt!=='string'||input.prompt.length>2400)||action==='task'&&(typeof input.prompt!=='string'||!input.prompt.trim()||input.prompt.length>8000))return failure('twin_workspace_input_invalid',400);
  if(!write&&(input.patch!==undefined||input.prompt!==undefined||input.style!==undefined||input.operation!==undefined||file))return failure('twin_workspace_input_invalid',400);
  const proof=continuationProof(input.continuation),signal=AbortSignal.any([request.signal,AbortSignal.timeout(action==='portrait'?120_000:60_000)]),base={credentials:'omit' as const,redirect:'error' as const,signal};
  const continued=await fetch(origin+'/api/auth/receiz-id/continue',{...base,method:'POST',headers:{'content-type':'application/json'},body:proof});const admitted=await readJson(continued,4*1024*1024);
  if(!continued.ok||admitted.ok!==true||!record(admitted.session)||admitted.session.uid!==input.accountUid)return failure('twin_workspace_owner_mismatch',403);const cookie=freshCookie(continued.headers);if(!cookie)return failure('twin_workspace_session_unavailable',403);
  const native=async(path:string,method='GET',body?:BodyInit)=>{const response=await fetch(origin+path,{...base,method,headers:{accept:'application/json',cookie,...(typeof body==='string'?{'content-type':'application/json'}:{})},...(body?{body}:{})});const result=await readJson(response,16*1024*1024);if(!response.ok||result.ok!==true)throw Error(typeof result.error==='string'?result.error:'twin_result_unconfirmed');return result;};
  let result:Record<string,unknown>;
  if(action==='inspect')result=await native('/api/world/agent');
  else if(action==='save')result=await native('/api/world/agent','PATCH',JSON.stringify({configurationPatch:input.patch,clientOperationId:(op as Record<string,unknown>).id,quoteExpiresAt:(op as Record<string,unknown>).quoteExpiresAt}));
  else if(action==='portrait'){const form=new FormData();form.set('image',file!);form.set('style',String(input.style));form.set('prompt',String(input.prompt));form.set('clientOperationId',String((op as Record<string,unknown>).id));form.set('quoteExpiresAt',String((op as Record<string,unknown>).quoteExpiresAt));result=await native('/api/world/avatar/generate','POST',form);}
  else if(action==='mind')result=await native('/api/world/twin-mind');
  else if(action==='work'){const [tasks,campaigns]=await Promise.all([native('/api/world/concierge/tasks'),native('/api/world/campaigns?includeAttribution=1')]);result={ok:true,tasks:tasks.tasks,campaigns:campaigns.campaigns,attribution:campaigns.attribution};}
  else result=await native('/api/world/concierge/tasks','POST',JSON.stringify({action:'start',message:input.prompt,clientOperationId:(op as Record<string,unknown>).id}));
  return Response.json(result,{headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
 }catch(error){const code=error instanceof Error&&/^[a-zA-Z0-9_:-]{1,160}$/.test(error.message)?error.message:'twin_result_unconfirmed';return failure(code);}
}

import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {relayBusinessSetup} from '../server/business-setup';
const uid='11111111-1111-4111-8111-111111111111',cookie='receiz_session='+('signed-session.'.repeat(4));
const continuation=' { "keyId":"fixture-key", "signatureB64Url":"fixture-proof-not-live" } ';
const operation={id:'business-operation-001',quoteExpiresAt:'2026-10-25T22:00:00.000Z'};
const quote={operationKind:'creator.run.campaign',catalogVersion:'ai-usage.v1',directCostUsdMicros:'60000',credits:30,provider:null,model:null,usageUnits:null,expiresAt:operation.quoteExpiresAt};
const usage={status:'settled',settledCredits:'30',releasedCredits:'0',grantRemaining:'7470',purchasedRemaining:'0'};
const agent={version:1,avatarId:null,permissionsVersion:'world-agent-policy-v1',agentId:'agent-original',ownerUserId:uid,displayName:'Studio',systemPersona:'Our approved method.',memoryScope:'relationship',capabilities:['greet','converse'],updatedAt:'2026-10-25T16:00:00Z',policy:{allowTeamHandoff:false,allowAutonomousCommerce:false,requireOwnerForHighRisk:true,preferredVoiceName:'Existing voice',commercialOffer:{offerName:'Original offer',offerSummary:'Original summary',proofPoints:'Original evidence'},futurePolicy:{preserve:true}}};
function request(tool:string,args:Record<string,unknown>={},op:unknown=undefined){return new Request('https://bankeiz.com/api/bank/native/business-setup',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json'},body:JSON.stringify({accountUid:uid,continuation,tool,args,...(op?{operation:op}:{})})});}
function host(reply:(path:string,init:RequestInit)=>Response|Promise<Response>,session:Record<string,unknown>={uid,plan:'business'}){
 const fetcher=vi.fn<typeof fetch>(async(url,init={})=>{
  expect(init.credentials).toBe('omit');expect(init.redirect).toBe('error');const headers=new Headers(init.headers);expect(headers.has('authorization')).toBe(false);
  const path=new URL(String(url)).pathname;expect(new URL(String(url)).origin).toBe('https://receiz.com');
  if(path==='/api/auth/receiz-id/continue'){expect(init.body).toBe(continuation);expect(headers.has('cookie')).toBe(false);return Response.json({ok:true,session},{headers:{'set-cookie':cookie+'; HttpOnly; Secure; Path=/'}});}
  expect(headers.get('cookie')).toBe(cookie);return reply(path,init);
 });vi.stubGlobal('fetch',fetcher);return fetcher;
}
afterEach(()=>vi.unstubAllGlobals());
it('reuses only fresh same-account proof admission for native setup and never returns a cookie or continuation',async()=>{
 const fetcher=host(path=>{expect(path).toBe('/api/world/agent');return Response.json({ok:true,agent,avatar:{privateIgnored:'unused'}});});
 const response=await relayBusinessSetup(request('business_inspect_agent')),raw=await response.text();expect(response.status).toBe(200);expect(response.headers.get('set-cookie')).toBeNull();expect(response.headers.get('cache-control')).toBe('no-store');expect(raw).not.toMatch(/signed-session|fixture-proof|privateIgnored/);expect(JSON.parse(raw)).toMatchObject({accountUid:uid,tool:'business_inspect_agent',outcome:'accepted',data:{agent:{agentId:agent.agentId,ownerUserId:uid}}});expect(fetcher).toHaveBeenCalledTimes(2);
});
it.each([{uid:'22222222-2222-4222-8222-222222222222',plan:'business'},{uid,plan:'free'},{uid,plan:'premium'}])('refuses an unbound owner or insufficient actual plan before configuration: %j',async session=>{
 const fetcher=host(()=>{throw Error('Must not reach setup');},session);const result=await(await relayBusinessSetup(request('business_connect_domain',{hostname:'studio.example.com'}))).json();expect(result.outcome).toBe('refused');expect(fetcher).toHaveBeenCalledOnce();
});
it('refuses ambient credentials, cross-origin, arbitrary fields and invalid actions before any native request',async()=>{
 const fetcher=vi.fn<typeof fetch>();vi.stubGlobal('fetch',fetcher);const foreign=request('business_inspect_agent');foreign.headers.set('origin','https://foreign.example');const ambient=request('business_inspect_agent');ambient.headers.set('cookie','secret');
 const invalid=new Request('https://bankeiz.com/api/bank/native/business-setup',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json'},body:JSON.stringify({accountUid:uid,continuation,tool:'business_inspect_agent',args:{},path:'/api/account/business'})});
 for(const req of [foreign,ambient,invalid,request('business_inspect_agent',{ownerUserId:'other'}),request('business_connect_domain',{hostname:''}),request('business_delete_all')])expect((await relayBusinessSetup(req)).status).toBeGreaterThanOrEqual(400);
 expect(fetcher).not.toHaveBeenCalled();
});
it('sends only selected changes to the native atomic patch without replaying a previously read policy',async()=>{
 const args={displayName:'New studio',offer:{offerSummary:'New useful offer.'},routing:{allowTeamHandoff:true}};
 const fetcher=host((path,init)=>{
  expect(path).toBe('/api/world/agent');expect(init.method).toBe('PATCH');
  expect(JSON.parse(String(init.body))).toEqual({configurationPatch:args,clientOperationId:operation.id,quoteExpiresAt:operation.quoteExpiresAt});
  return Response.json({ok:true,agent:{...agent,displayName:'New studio',policy:{...agent.policy,allowTeamHandoff:false,commercialOffer:{...agent.policy.commercialOffer,offerSummary:'New useful offer.'}}}});
 });const result=await(await relayBusinessSetup(request('business_configure_agent',args,operation))).json();expect(result).toMatchObject({outcome:'accepted',operationId:operation.id,data:{agent:{agentId:agent.agentId,displayName:'New studio'}}});expect(fetcher).toHaveBeenCalledTimes(2);
});
it('refuses a foreign existing agent before PATCH',async()=>{
 const fetcher=host(()=>Response.json({ok:true,agent:{...agent,ownerUserId:'other'}}));const result=await(await relayBusinessSetup(request('business_inspect_agent'))).json();expect(result.outcome).toBe('refused');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('retains native DNS phases and warnings rather than treating a saved hostname as live',async()=>{
 const setup={phase:'pending_dns',verified:false,attached:true,liveUrl:null,summary:'Waiting for DNS',recommendedRecords:[{type:'CNAME',name:'studio',value:'native-target.example',purpose:'routing'}],warning:'Previous hostname needs detaching'};
 const fetcher=host((path,init)=>{expect(path).toBe('/api/account/custom-domain');expect(init.method).toBe('POST');expect(JSON.parse(String(init.body))).toEqual({hostname:'studio.example.com',action:'save'});return Response.json({ok:true,domain:{hostname:'studio.example.com',updatedAt:null},setup});});
 const result=await(await relayBusinessSetup(request('business_connect_domain',{hostname:'studio.example.com'}))).json();expect(result).toMatchObject({outcome:'accepted',data:{setup,domain:{hostname:'studio.example.com'}}});expect(fetcher).toHaveBeenCalledTimes(2);
});
it('checks the actually saved current domain and refuses a missing one before provider verification',async()=>{
 for(const configured of [false,true]){const fetcher=host((path,init)=>{expect(path).toBe('/api/account/custom-domain');if(init.method==='GET')return Response.json({ok:true,domain:configured?{hostname:'saved.example.com'}:null,setup:null});expect(JSON.parse(String(init.body))).toEqual({hostname:'saved.example.com',action:'verify'});return Response.json({ok:true,domain:{hostname:'saved.example.com'},setup:{phase:'live',verified:true,liveUrl:'https://saved.example.com'}});});const result=await(await relayBusinessSetup(request('business_check_domain'))).json();expect(result.outcome).toBe(configured?'accepted':'refused');expect(fetcher).toHaveBeenCalledTimes(configured?3:2);}
});
it('uses the actual metered creator request ID and output without claiming binary assets were rendered',async()=>{
 const fetcher=host((path,init)=>{expect(path).toBe('/api/developers/creator/run');expect(JSON.parse(String(init.body))).toEqual({mode:'campaign',prompt:'Prepare a campaign draft.',requestId:operation.id,quoteExpiresAt:operation.quoteExpiresAt});return Response.json({ok:true,requestId:operation.id,runId:'native-run',mode:'campaign',text:'Actual native draft',source:'upstream',quote,usage});});
 const result=await(await relayBusinessSetup(request('business_create_work',{mode:'campaign',prompt:'Prepare a campaign draft.'},operation))).json();expect(result).toMatchObject({outcome:'accepted',operationId:operation.id,data:{runId:'native-run',text:'Actual native draft',usage:{status:'settled'}}});expect(result.data).not.toHaveProperty('assetsCompleted');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('retains exact native workspace output proof material and asset states',async()=>{
 const proofManifest={originalDigest:'a'.repeat(64),source:{format:'native-source'}};host(()=>Response.json({ok:true,signedIn:true,project:{id:'project'},latestRun:{id:'run'},outputs:[{id:'output',body:'Actual draft',proofManifest}],assets:[{id:'asset',status:'queued'}],privateIgnored:'never expose'}));
 const result=await(await relayBusinessSetup(request('business_inspect_creation'))).json();expect(result).toMatchObject({outcome:'accepted',data:{outputs:[{proofManifest}],assets:[{status:'queued'}]}});expect(result.data).not.toHaveProperty('privateIgnored');
});
it.each(['lost','malformed','wrong-request'])('keeps a possible creator write unknown without retries: %s',async mode=>{
 const fetcher=host(()=>{if(mode==='lost')throw Error('connection lost');if(mode==='malformed')return new Response('invalid');return Response.json({ok:true,requestId:'other',runId:'run',mode:'document',text:'No',source:'upstream'});});
 const result=await(await relayBusinessSetup(request('business_create_work',{mode:'document',prompt:'Draft my proposal.'},operation))).json();expect(result).toMatchObject({outcome:'unknown',operationId:operation.id});expect(result).not.toHaveProperty('data');expect(fetcher).toHaveBeenCalledTimes(2);
});
it.each([['usage_insufficient_credits',undefined,'refused'],['owned_twin_action_pending','held','unknown'],['owned_twin_action_released','released','refused'],['provider_internal_error',undefined,'unknown']])('retains actual native refusal/held semantics: %s',async(error,operationStatus,outcome)=>{
 const fetcher=host(()=>Response.json({ok:false,error,operationStatus},{status:503}));const result=await(await relayBusinessSetup(request('business_create_work',{mode:'document',prompt:'A draft'},operation))).json();expect(result.outcome).toBe(outcome);expect(fetcher).toHaveBeenCalledTimes(2);
});
it('mounts only fixed owner setup routes and keeps optional execution out of account entry first paint',()=>{
 const api=readFileSync(new URL('../server/bank-api.ts',import.meta.url),'utf8'),transport=readFileSync(new URL('../server/native-account.ts',import.meta.url),'utf8'),identity=readFileSync(new URL('../src/receiz/native-identity.ts',import.meta.url),'utf8'),messages=readFileSync(new URL('../src/features/messages/MessagesPanel.tsx',import.meta.url),'utf8');
 expect(api).toContain("url.pathname==='/api/bank/business/setup'");expect(transport).toContain("'/api/bank/business/setup'");expect(identity).toContain("import('./business-chat')");expect(identity).not.toMatch(/^import .*from ['"]\.\/business-chat['"]/m);expect(messages).toContain('identity.businessSetup');
 for(const path of ['src/features/identity/AccountOpening.tsx','src/receiz/device-identity-entry.ts'])expect(readFileSync(new URL('../'+path,import.meta.url),'utf8')).not.toMatch(/business-setup|business-chat/);
});

it('supports explicit domain inspection without invoking provider verification',async()=>{
 const fetcher=host((path,init)=>{expect(path).toBe('/api/account/custom-domain');expect(init.method).toBe('GET');return Response.json({ok:true,domain:null,setup:null});});expect(await(await relayBusinessSetup(request('business_inspect_domain'))).json()).toMatchObject({outcome:'accepted',data:{domain:null,setup:null}});expect(fetcher).toHaveBeenCalledTimes(2);
});
it('requires exactly one fresh HttpOnly session and rejects proof envelopes with invented authority fields',async()=>{
 for(const value of ['',cookie+'; Secure',cookie+'; HttpOnly, '+cookie+'; HttpOnly']){
  const fetcher=vi.fn<typeof fetch>(async()=>Response.json({ok:true,session:{uid,plan:'business'}},{headers:value?{'set-cookie':value}:{}}));vi.stubGlobal('fetch',fetcher);
  const result=await(await relayBusinessSetup(request('business_inspect_agent'))).json();expect(result.outcome).toBe('refused');expect(fetcher).toHaveBeenCalledOnce();
 }
 const fetcher=vi.fn<typeof fetch>();vi.stubGlobal('fetch',fetcher);
 const req=new Request('https://bankeiz.com/api/bank/native/business-setup',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json'},body:JSON.stringify({accountUid:uid,continuation:JSON.stringify({keyId:'key',signatureB64Url:'fixture',issuer:'invented'}),tool:'business_inspect_agent',args:{}})});
 expect((await relayBusinessSetup(req)).status).toBeGreaterThanOrEqual(400);expect(fetcher).not.toHaveBeenCalled();
});
it('keeps malformed or foreign post-write agent results unknown and preserves the exact operation reference',async()=>{
 const fetcher=host((_path,init)=>init.method==='GET'?Response.json({ok:true,agent}):Response.json({ok:true,agent:{...agent,ownerUserId:'other'}}));
 const result=await(await relayBusinessSetup(request('business_configure_agent',{displayName:'New studio'},operation))).json();expect(result).toMatchObject({outcome:'unknown',operationId:operation.id});expect(result).not.toHaveProperty('data');expect(fetcher).toHaveBeenCalledTimes(2);
});
it('reports the native effective policy when a higher-tier setting is clamped instead of reporting the requested flag as enabled',async()=>{
 host((_path,init)=>Response.json({ok:true,agent:init.method==='GET'?agent:{...agent,policy:{...agent.policy,allowTeamHandoff:false}}}));
 const result=await(await relayBusinessSetup(request('business_configure_agent',{routing:{allowTeamHandoff:true}},operation))).json();expect(result.data.agent.policy.allowTeamHandoff).toBe(false);expect(result.data.agent.policy.requireOwnerForHighRisk).toBe(true);
});
it('keeps an explicit held native operation unknown even when the attached error is normally a pre-execution refusal',async()=>{
 host(()=>Response.json({ok:false,error:'usage_insufficient_credits',operationStatus:'held'},{status:409}));
 const result=await(await relayBusinessSetup(request('business_create_work',{mode:'document',prompt:'A draft'},operation))).json();expect(result.outcome).toBe('unknown');
});

it.each(['held','released'])('preserves native recovery status rather than reducing it to an error string: %s',async operationStatus=>{
 host(()=>Response.json({ok:false,error:'world_agent_update_failed',operationStatus},{status:503}));
 const result=await(await relayBusinessSetup(request('business_create_work',{mode:'document',prompt:'A draft'},operation))).json();expect(result.operationStatus).toBe(operationStatus);
});
it('preserves the native new-action-required flag without retrying an indeterminate provider request',async()=>{
 const fetcher=host(()=>Response.json({ok:false,error:'provider_outcome_indeterminate',newActionRequired:true},{status:409}));
 const result=await(await relayBusinessSetup(request('business_create_work',{mode:'document',prompt:'A draft'},operation))).json();expect(result).toMatchObject({outcome:'unknown',newActionRequired:true,operationId:operation.id});expect(fetcher).toHaveBeenCalledTimes(2);
});
it.each(['no-usage','bad-source','bad-quote'])('keeps a structurally incomplete creator acknowledgement unknown: %s',async mode=>{
 const data:Record<string,unknown>={ok:true,requestId:operation.id,runId:'run',mode:'campaign',text:'A draft',source:'upstream',quote,usage};
 if(mode==='no-usage')delete data.usage;if(mode==='bad-source')data.source=['upstream'];if(mode==='bad-quote')data.quote={};
 host(()=>Response.json(data));const result=await(await relayBusinessSetup(request('business_create_work',{mode:'campaign',prompt:'A draft'},operation))).json();expect(result.outcome).toBe('unknown');expect(result).not.toHaveProperty('data');
});
it('refuses an incomplete native agent read rather than presenting a ready configuration',async()=>{
 host(()=>Response.json({ok:true,agent:{agentId:agent.agentId,ownerUserId:uid}}));const result=await(await relayBusinessSetup(request('business_inspect_agent'))).json();expect(result.outcome).toBe('refused');expect(result).not.toHaveProperty('data');
});

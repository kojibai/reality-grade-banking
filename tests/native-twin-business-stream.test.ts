import {expect,it} from 'vitest';
import {createNativeTwin} from '../src/receiz/native-twin';
const q={message:'Set my bio',requestId:'operation-0001',quoteExpiresAt:new Date().toISOString()};
const result=(username='owner')=>({ok:true,requestId:q.requestId,world:{username},businessSetupSupported:true,businessActions:[{tool:'business_update_profile',args:{patch:{bio:'My work'}}}],reply:{message:'I will save that.',source:'upstream',actions:[],memory:[]}});
it('streams actual interpretation then returns only bounded same-owner tool proposals',async()=>{
 const deltas:string[]=[];const twin=createNativeTwin({accountUid:'owner-id',username:'owner',assertOpen(){},request:async(_path,init)=>{expect(JSON.parse(String(init?.body))).toMatchObject({stream:true,businessSetup:true});return new Response(`event: ready\ndata: {}\n\nevent: delta\ndata: {"text":"I will"}\n\nevent: result\ndata: ${JSON.stringify(result())}\n\n`,{headers:{'content-type':'text/event-stream'}});}});
 const reply=await twin.ask({...q,businessSetup:true,onDelta:text=>deltas.push(text)});expect(deltas).toEqual(['I will']);expect(reply.businessActions).toEqual(result().businessActions);
});
it('resolves renamed presentation per ask without recreating the identity',async()=>{let name='owner';const twin=createNativeTwin({accountUid:'owner-id',username:()=>name,assertOpen(){},request:async path=>{expect(path).toContain('/'+name+'/');return Response.json(result(name));}});await twin.ask(q);name='renamed';await twin.ask(q);});
it('does not silently claim Business support from an older counterpart',async()=>{const twin=createNativeTwin({accountUid:'owner-id',username:'owner',assertOpen(){},request:async()=>Response.json({...result(),businessSetupSupported:undefined})});await expect(twin.ask({...q,businessSetup:true})).rejects.toThrow('BANK_TWIN_BUSINESS_UNAVAILABLE');});

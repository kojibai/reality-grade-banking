import {expect,it} from 'vitest';
import {handleCooperativeConversation} from '../server/cooperative-conversation.mjs';
const operation={clientOperationId:'test-cooperative-operation',quoteExpiresAt:new Date(Date.now()+600000).toISOString()};
const request=(data:unknown,headers:Record<string,string>={})=>new Request('https://bankeiz.com/api/cooperatives',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://bankeiz.com',Cookie:'receiz_world_visitor=guest_existing_123456',...headers},body:JSON.stringify(data)});
it('binds the visitor conversation to bjklock and preserves the original native operation and response',async()=>{
 let sent:Record<string,unknown>={},target='',cookie='';
 const native={ok:true,world:{username:'bjklock',memories:[]},reply:{message:'Tell me where payment holds up your next delivery.',memoryScope:'relationship',bookingSlots:[],bookingConfirmation:null}};
 const response=await handleCooperativeConversation(request({action:'message',message:'We have stock waiting.',consent:true,...operation,replyToOperationId:'accepted-parent-operation',username:'another',visitorKey:'substitute',threadKey:'substitute'}),{fetch:async(url,init)=>{target=String(url);sent=JSON.parse(String(init?.body));cookie=new Headers(init?.headers).get('cookie')??'';return Response.json(native);}});
 expect(response.status).toBe(200);expect(await response.json()).toEqual(native);expect(target).toBe('https://receiz.com/api/world/profile/bjklock');
 expect(sent.replyToOperationId).toBe('accepted-parent-operation');expect(sent.message).toBe('We have stock waiting.');expect(sent.clientOperationId).toBe('test-cooperative-operation');expect(sent.quoteExpiresAt).toBe(operation.quoteExpiresAt);
 expect(sent.visitorKey).toBe('guest_existing_123456');expect(sent.threadKey).not.toBe('substitute');expect(cookie).toBe('receiz_world_visitor=guest_existing_123456');
});
it('uses the existing booking action with the same visitor and returns success only with a real calendar confirmation',async()=>{
 const body={action:'book',consent:true,confirmed:true,slotStartAt:'2026-11-02T14:00:00.000Z',name:'Alex',email:'alex@example.org',notes:'Cooperative inquiry',timezone:'America/New_York',questions:[]};
 let sent:Record<string,unknown>={};
 const response=await handleCooperativeConversation(request(body),{fetch:async(_url,init)=>{sent=JSON.parse(String(init?.body));return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Confirmed',bookingConfirmation:{eventId:'calendar-original',startAt:body.slotStartAt,endAt:'2026-11-02T14:30:00.000Z',attendeeName:'Alex',attendeeEmail:'alex@example.org'}}});}});
 expect(response.status).toBe(200);expect((await response.json()).reply.bookingConfirmation.eventId).toBe('calendar-original');expect(sent.action).toBe('book');expect(sent.slotStartAt).toBe(body.slotStartAt);
 const missing=await handleCooperativeConversation(request(body),{fetch:async()=>Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Booked'}})});expect(missing.status).toBe(502);expect((await missing.json()).ok).toBe(false);
});
it('refuses unconsented, cross-origin, oversized, substituted-owner and unconfirmed booking operations',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return Response.json({});};
 for(const [body,headers,status]of [[{action:'message',message:'Hello',...operation},{},400],[{action:'book',consent:true,confirmed:false},{},400],[{action:'message',message:'x'.repeat(20000),consent:true,...operation},{},413],[{action:'message',message:'Hello',consent:true,...operation},{Origin:'https://attacker.example'},403],[{action:'delete',consent:true},{},400]] as const){
  expect((await handleCooperativeConversation(request(body,headers),{fetch:fetcher})).status).toBe(status);
 }
 expect(calls).toBe(0);
 const mismatch=await handleCooperativeConversation(request({action:'message',message:'Hello',consent:true,...operation}),{fetch:async()=>Response.json({ok:true,world:{username:'someone-else'},reply:{message:'Wrong owner'}})});expect(mismatch.status).toBe(502);
});
it('returns explicit native refusal and uncertainty without inventing acceptance or retrying writes',async()=>{
 let calls=0;const data={action:'message',message:'Hello',consent:true,...operation};
 const refused=await handleCooperativeConversation(request(data),{fetch:async()=>{calls++;return Response.json({ok:false,error:'owned_twin_action_pending',operationStatus:'held'},{status:409});}});
 expect(refused.status).toBe(409);expect(await refused.json()).toMatchObject({ok:false,error:'owned_twin_action_pending',operationStatus:'held'});expect(calls).toBe(1);
 const lost=await handleCooperativeConversation(request(data),{fetch:async()=>{calls++;throw Error('secret upstream detail');}});expect(lost.status).toBe(502);expect(await lost.json()).toEqual({ok:false,error:'RECEIZ_RESULT_UNCONFIRMED'});expect(calls).toBe(2);
});

it('establishes existing native guest continuity before any write and keeps retries on that guest and thread',async()=>{
 const writes:Record<string,unknown>[]=[];const fetcher:typeof fetch=async(_url,init)=>{if(init?.method==='POST')writes.push(JSON.parse(String(init.body)));return Response.json(init?.method==='POST'?{ok:true,world:{username:'bjklock'},reply:{message:'Native reply'}}:{ok:true,world:{username:'bjklock'}});};
 const body={action:'message',message:'First inquiry',consent:true,...operation};
 const noCookie=await handleCooperativeConversation(request(body,{Cookie:''}),{fetch:fetcher});expect(noCookie.status).toBe(409);expect(writes).toHaveLength(0);
 const ready=await handleCooperativeConversation(new Request('https://bankeiz.com/api/cooperatives'),{fetch:fetcher});const cookie=ready.headers.get('set-cookie')!.split(';')[0];
 await handleCooperativeConversation(request(body,{Cookie:cookie}),{fetch:fetcher});await handleCooperativeConversation(request(body,{Cookie:cookie}),{fetch:fetcher});expect(writes).toHaveLength(2);expect(writes[0].visitorKey).toBe(writes[1].visitorKey);expect(writes[0].threadKey).toBe(writes[1].threadKey);
});

it.each(['/agents','/agents/','/agent','/agent/','/your-twin','/in-action','/your-twin/','/in-action/','/together/','/together/creators/','/together/independent-work/','/together/businesses/','/together/communities/','/together/how-it-works/','/together/connect/','/cooperate/'])('preserves the admitted public inquiry context for %s under the same guest and native Twin',async pagePath=>{
 let payload:Record<string,unknown>={};await handleCooperativeConversation(request({action:'message',message:'My situation',consent:true,...operation,pagePath}),{fetch:async(_url,init)=>{payload=JSON.parse(String(init?.body));return Response.json({ok:true,world:{username:'bjklock'},reply:{message:'Native reply'}});}});expect(payload.clientContext).toMatchObject({pagePath:({'/agents':'/agent/','/agents/':'/agent/','/agent':'/agent/','/cooperate/':'/coops/','/your-twin':'/your-twin/','/in-action':'/in-action/'} as Record<string,string>)[pagePath]??pagePath});expect(payload.threadKey).toMatch(/^cooperatives:/);expect(payload.visitorKey).toBe('guest_existing_123456');
});

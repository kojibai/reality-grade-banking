import {expect,it} from 'vitest';
import {handleCooperativeConversation} from '../server/cooperative-conversation.mjs';
const encoder=new TextEncoder(),frame=(value:unknown)=>encoder.encode('data: '+JSON.stringify(value)+'\n\n');
const body={action:'message',message:'What can we build together?',consent:true,clientOperationId:'stream-operation-123',quoteExpiresAt:new Date(Date.now()+600000).toISOString(),pagePath:'/your-twin/'};
const request=()=>new Request('https://bankeiz.com/api/cooperatives',{method:'POST',headers:{Origin:'https://bankeiz.com','Content-Type':'application/json',Accept:'text/event-stream',Cookie:'receiz_world_visitor=guest_existing_123456'},body:JSON.stringify(body)});
it('streams the existing owned Twin before completion, preserving the operation, identity, native brain receipt and actions',async()=>{
 let stream!:ReadableStreamDefaultController<Uint8Array>,target='',sent:any;
 const upstream=new ReadableStream<Uint8Array>({start(c){stream=c;}});
 const response=await handleCooperativeConversation(request(),{fetch:async(url,init)=>{target=String(url);sent=JSON.parse(String(init?.body));return new Response(upstream,{headers:{'Content-Type':'text/event-stream'}});}});
 expect(target).toBe('https://receiz.com/api/world/profile/bjklock/stream');expect(sent.deliveryMode).toBe('text');expect(sent.clientOperationId).toBe(body.clientOperationId);expect(sent.clientAssistantMessageId).toBe(body.clientOperationId);expect(sent.quoteExpiresAt).toBe(body.quoteExpiresAt);expect(sent.clientContext.pagePath).toBe('/your-twin/');expect(response.headers.get('content-type')).toContain('text/event-stream');
 const reader=response.body!.getReader();stream.enqueue(frame({type:'reply_start',messageId:body.clientOperationId}));expect(new TextDecoder().decode((await reader.read()).value)).toContain('reply_start');
 stream.enqueue(frame({type:'reply_delta',messageId:body.clientOperationId,delta:'Here’s the first thought.'}));expect(new TextDecoder().decode((await reader.read()).value)).toContain('first thought');
 const reply={message:'Here’s the first thought.',source:'upstream',proof:{sourcePrimitive:'receiz.subject.proof_brain.v1',subjectId:'native-subject',subjectHead:'native-head'},actions:[{kind:'schedule',label:'See times',href:'/calendar/bjklock'}]};
 stream.enqueue(frame({type:'reply_done',world:{username:'bjklock'},reply}));stream.enqueue(frame({type:'done'}));stream.close();let tail='';for(;;){const next=await reader.read();if(next.done)break;tail+=new TextDecoder().decode(next.value);}expect(tail).toContain(JSON.stringify(reply));
});
it.each(['wrong-owner','wrong-message','truncated'])('never admits %s as an accepted native reply and never resubmits the write',async failure=>{
 let calls=0;const response=await handleCooperativeConversation(request(),{fetch:async()=>{calls++;return new Response(new ReadableStream({start(c){c.enqueue(frame(failure==='wrong-message'?{type:'reply_delta',messageId:'substitute',delta:'Wrong reply'}:failure==='wrong-owner'?{type:'reply_done',world:{username:'substitute'},reply:{message:'Wrong owner'}}:{type:'reply_start',messageId:body.clientOperationId}));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});}});
 const result=await response.text();expect(result).toContain('"type":"error"');expect(result).not.toContain('Wrong owner');expect(result).not.toContain('Wrong reply');expect(calls).toBe(1);
});

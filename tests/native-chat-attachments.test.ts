import {afterEach,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import bankApi from '../api/index';
import {nativeRequestPath} from '../server/native-account';
import {createNativeMessaging,type ChatConversation,type ChatMessage} from '../src/receiz/native-messaging';
import {projectMessagingDisplay,readMessagingDisplay} from '../src/receiz/messaging-retention';

afterEach(()=>vi.unstubAllGlobals());
const conversationId='11111111-1111-4111-8111-111111111111',otherConversation='33333333-3333-4333-8333-333333333333',messageId='44444444-4444-4444-8444-444444444444',userId='22222222-2222-4222-8222-222222222222';
const origin='https://bank.example',uploadPath='/api/receiz/attachments/upload',downloadPath=`/api/chat/messages/${messageId}/attachment`;
const bytes=new TextEncoder().encode('%PDF-1.7\nsealed test artifact\n');
const sha=createHash('sha256').update(bytes).digest('hex');
const upload={ok:true,bucket:'receiz-chat-attachments',path:'sealed/chat/20261115000000_proposal.pdf',uploadToken:'private_claim.private_signature',sha256Hex:sha,mime:'application/pdf',name:'proposal.pdf',size:bytes.length,kind:'pdf',verifyPath:'/v/20261115_0000/ABC12345/123?a=1234abcd&ms=1794690000000',verifyUrl:'https://receiz.com/v/20261115_0000/ABC12345/123?a=1234abcd&ms=1794690000000',code:'ABC12345',pulse:'123',ts:'2026-11-15T00:00:00Z',slug:'20261115_0000',anchorId:'1234abcd',anchorMs:'1794690000000',sourceSha256Hex:sha,sourceMime:'application/pdf'};
const summary:ChatConversation={id:conversationId,kind:'dm',title:'Recipient',members:[],aiAgents:[],defaultAiId:null,unreadCount:0,previewMessage:null,createdAt:'2026-11-15T00:00:00Z',updatedAt:'2026-11-15T00:00:00Z',lastMessageAt:null};
const attachmentRow={kind:'chat_attachment',attachmentId:'att_test',mediaKind:'file',name:upload.name,url:null,bucket:upload.bucket,path:upload.path,mime:upload.mime,size:upload.size,sha256Hex:sha,verifyPath:upload.verifyPath,verifyUrl:upload.verifyUrl,code:upload.code,pulse:upload.pulse,ts:upload.ts,anchorId:upload.anchorId,anchorMs:upload.anchorMs,caption:null,autoBody:true,createdAt:'2026-11-15T00:00:00Z'};
const row:ChatMessage={id:messageId,conversationId,senderUserId:userId,senderKind:'user',senderAiId:null,senderDisplay:null,body:'Sent a file: proposal.pdf',createdAt:'2026-11-15T00:00:00Z',receizedAt:'2026-11-15T00:00:00Z',receipt:{digest:'a'.repeat(64)},sealedOriginalAvailable:true,sealedOriginal:{primitive:'receiz.chat.message.original.v1',messageId,conversationId,walletTransfer:attachmentRow},walletTransfer:attachmentRow};
const json=(value:unknown,status=200)=>Response.json(value,{status});
const file=()=>new File([bytes],upload.name,{type:upload.mime});
const retained=()=>({schema:'bankeiz.messaging-display.v1' as const,accountUid:userId,inbox:[summary],pages:[{conversation:summary,messages:[row],hasMore:false,nextCursor:null}]});

it('admits only the exact native chat upload and member attachment download paths',()=>{
 for(const [path,method]of [[uploadPath,'POST'],[downloadPath,'GET'],[downloadPath+'?inline=1','GET']])expect(nativeRequestPath('/api/bank/native'+path,method),path).toBe(path);
 for(const [path,method]of [[uploadPath,'GET'],[uploadPath+'?mode=chat','POST'],[uploadPath+'/','POST'],[downloadPath,'POST'],[downloadPath+'?inline=0','GET'],[downloadPath+'?inline=1&inline=1','GET'],[downloadPath+'?inline=%31','GET'],[downloadPath+'?%69nline=1','GET'],[downloadPath+'?url=https://evil.example','GET'],['/api/receiz/attachments/preview','GET'],['/api/chat/messages/not-a-uuid/attachment','GET']])expect(nativeRequestPath('/api/bank/native'+path,method),path).toBeNull();
});

it('forwards multipart bytes above four MiB through the actual Bank proxy with only the bearer',async()=>{
 const body=new FormData();body.set('file',new File([new Uint8Array(5*1024*1024)],'large.pdf',{type:'application/pdf'}));body.set('mode','chat');body.set('conversationId',conversationId);
 let received:FormData|undefined;
 const upstream=vi.fn<typeof fetch>(async(url,init)=>{expect(String(url)).toBe('https://receiz.com'+uploadPath);const headers=new Headers(init?.headers);expect(headers.get('authorization')).toBe('Bearer synthetic-chat');expect(headers.has('cookie')).toBe(false);expect(init?.credentials).toBe('omit');expect(init?.redirect).toBe('error');received=await new Request(String(url),{method:'POST',headers,body:init?.body}).formData();return json(upload);});vi.stubGlobal('fetch',upstream);
 const response=await bankApi.fetch(new Request(origin+'/api/bank/native'+uploadPath,{method:'POST',headers:{Origin:origin,Authorization:'Bearer synthetic-chat',Cookie:'must-not-forward'},body}));
 expect(response.status).toBe(200);expect((await response.json()).uploadToken).toBe(upload.uploadToken);expect(received?.get('mode')).toBe('chat');expect(received?.get('conversationId')).toBe(conversationId);expect((received?.get('file') as File).size).toBe(5*1024*1024);expect(upstream).toHaveBeenCalledOnce();
});

it('preserves exact binary download bytes and disposition through the actual Bank proxy',async()=>{
 const upstream=vi.fn<typeof fetch>(async()=>new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="proposal.pdf"','set-cookie':'must-not-return'}}));vi.stubGlobal('fetch',upstream);
 const response=await bankApi.fetch(new Request(origin+'/api/bank/native'+downloadPath,{headers:{Origin:origin,Authorization:'Bearer synthetic-chat'}}));
 expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('application/pdf');expect(response.headers.get('content-disposition')).toBe('attachment; filename="proposal.pdf"');expect(response.headers.has('set-cookie')).toBe(false);expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
});

it('refuses oversized multipart input and oversized binary output before exposing them',async()=>{
 const upstream=vi.fn<typeof fetch>(async()=>new Response(new Uint8Array(25*1024*1024+1),{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="proposal.pdf"'}}));vi.stubGlobal('fetch',upstream);
 // A single encoded body avoids undici's FormData encoder continuing after
 // cancellation; the Bank proxy still reads and enforces its actual byte cap.
 const oversized=new Uint8Array(26*1024*1024);
 expect((await bankApi.fetch(new Request(origin+'/api/bank/native'+uploadPath,{method:'POST',headers:{Origin:origin,'Content-Type':'multipart/form-data; boundary=bounded-test'},body:oversized}))).status).toBe(503);expect(upstream).not.toHaveBeenCalled();
 expect((await bankApi.fetch(new Request(origin+'/api/bank/native'+downloadPath))).status).toBe(503);expect(upstream).toHaveBeenCalledOnce();
});

it('uploads the native chat multipart contract and keeps its private token out of returned metadata',async()=>{
 const signal=new AbortController().signal;let body:FormData|undefined;
 const request=vi.fn(async(path:string,init?:RequestInit)=>{expect(path).toBe(uploadPath);expect(init?.method).toBe('POST');expect(init?.signal).toBe(signal);expect(new Headers(init?.headers).has('content-type')).toBe(false);body=init?.body as FormData;return json(upload);});const api=createNativeMessaging({accountUid:userId,request});
 const result=await api.uploadAttachment(conversationId,file(),signal);
 expect([...body!.keys()]).toEqual(['file','mode','conversationId']);expect(body!.get('mode')).toBe('chat');expect(body!.get('conversationId')).toBe(conversationId);expect(await (body!.get('file') as File).text()).toBe(new TextDecoder().decode(bytes));
 expect(result).toMatchObject({conversationId,name:'proposal.pdf',mediaKind:'file',mime:'application/pdf',sha256Hex:sha,verifyPath:upload.verifyPath});expect(JSON.stringify(result)).not.toContain(upload.uploadToken);expect(api.knownMessages(conversationId)).toBeNull();
});

it('rejects invalid files and malformed upload metadata without creating a chat message',async()=>{
 const request=vi.fn(async()=>json(upload));const api=createNativeMessaging({accountUid:userId,request});
 for(const invalid of[new File([],'empty.pdf',{type:'application/pdf'}),new File([bytes],'../bad.pdf',{type:'application/pdf'}),new File([bytes],'bad.pdf',{type:'invalid'}),new File([new Uint8Array(25*1024*1024+1)],'large.pdf',{type:'application/pdf'})])await expect(api.uploadAttachment(conversationId,invalid)).rejects.toMatchObject({code:'CHAT_ATTACHMENT_INVALID'});
 expect(request).not.toHaveBeenCalled();
 for(const patch of[{uploadToken:''},{bucket:'other'},{path:'sealed/chat/../other.pdf'},{sha256Hex:'bad'},{verifyPath:'https://evil.example'},{verifyUrl:'https://evil.example/v/20261115_0000/ABC12345/123'},{size:25*1024*1024+1},{sourceSha256Hex:'b'.repeat(64)}]){request.mockImplementation(async()=>json({...upload,...patch}));await expect(api.uploadAttachment(conversationId,file())).rejects.toMatchObject({code:'CHAT_ATTACHMENT_UPLOAD_OUTCOME_UNKNOWN',ambiguous:true});}
 expect(api.knownMessages(conversationId)).toBeNull();
});

it('sends a conversation-bound attachment with its exact token through the non-stream endpoint',async()=>{
 const sent:unknown[]=[];const request=vi.fn(async(path:string,init?:RequestInit)=>{if(path===uploadPath)return json(upload);sent.push({path,payload:JSON.parse(String(init?.body))});return json({ok:true,message:row});});const changed=vi.fn();const api=createNativeMessaging({accountUid:userId,request,onChange:changed});const attachment=await api.uploadAttachment(conversationId,file());
 await expect(api.send(otherConversation,'',{attachment})).rejects.toMatchObject({code:'CHAT_ATTACHMENT_INVALID'});expect(sent).toEqual([]);
 const accepted=await api.send(conversationId,'',{attachment,stream:true});
 expect(sent).toEqual([{path:`/api/chat/conversations/${conversationId}/messages`,payload:{attachment:{mediaKind:'file',name:upload.name,uploadToken:upload.uploadToken,bucket:upload.bucket,path:upload.path,mime:upload.mime,size:upload.size,sha256Hex:sha,verifyPath:upload.verifyPath,verifyUrl:upload.verifyUrl,code:upload.code,pulse:upload.pulse,ts:upload.ts,anchorId:upload.anchorId,anchorMs:upload.anchorMs}}}]);
 expect(accepted?.walletTransfer).toEqual(attachmentRow);expect(accepted?.sealedOriginal).toEqual(row.sealedOriginal);expect(JSON.stringify(changed.mock.calls)).not.toContain(upload.uploadToken);
});

it('refuses forged attachment options and keeps lost uploads or sends ambiguous without retries',async()=>{
 const request=vi.fn<(path:string,init?:RequestInit)=>Promise<Response>>(async()=>{throw Error('connection lost');});const api=createNativeMessaging({accountUid:userId,request});
 await expect(api.uploadAttachment(conversationId,file())).rejects.toMatchObject({code:'CHAT_ATTACHMENT_UPLOAD_OUTCOME_UNKNOWN',ambiguous:true});expect(request).toHaveBeenCalledOnce();
 request.mockImplementation(async()=>json(upload));const attachment=await api.uploadAttachment(conversationId,file());
 await expect(api.send(conversationId,'caption',{attachment:{...attachment}})).rejects.toMatchObject({code:'CHAT_ATTACHMENT_INVALID'});
 request.mockImplementation(async()=>{throw Error('connection lost');});await expect(api.send(conversationId,'caption',{attachment})).rejects.toMatchObject({code:'CHAT_SEND_OUTCOME_UNKNOWN',ambiguous:true});expect(request).toHaveBeenCalledTimes(3);
});

it('downloads only the exact held member message and verifies byte count and hash before returning a File',async()=>{
 const request=vi.fn(async(_path:string,_init?:RequestInit)=>new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="proposal.pdf"'}}));const api=createNativeMessaging({accountUid:userId,request});
 await api.messages(conversationId).catch(()=>{});request.mockImplementation(async()=>json({ok:true,conversation:summary,messages:[row],hasMore:false,nextCursor:null}));await api.messages(conversationId);request.mockImplementation(async()=>new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="proposal.pdf"'}}));request.mockClear();
 await expect(api.attachment(otherConversation,messageId)).rejects.toMatchObject({code:'CHAT_ATTACHMENT_UNAVAILABLE'});expect(request).not.toHaveBeenCalled();
 const result=await api.attachment(conversationId,messageId);expect(result).toBeInstanceOf(File);expect(result.name).toBe('proposal.pdf');expect(result.type).toBe('application/pdf');expect(new Uint8Array(await result.arrayBuffer())).toEqual(bytes);expect(request.mock.calls[0][0]).toBe(downloadPath);
 for(const body of[new Uint8Array(bytes.length),new Uint8Array(bytes.length+1),new Uint8Array()]){request.mockImplementation(async()=>new Response(body,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="proposal.pdf"'}}));await expect(api.attachment(conversationId,messageId)).rejects.toMatchObject({code:'CHAT_ATTACHMENT_UNAVAILABLE'});}
});

it('retains safe attachment metadata for cold reopen without tokens, artifact bytes or replacement history',async()=>{
 const original={...row,walletTransfer:{...attachmentRow,uploadToken:upload.uploadToken,artifactBytes:[1,2,3],untrusted:'discard'}};
 const source=retained();source.pages[0].messages=[original];source.inbox[0]={...summary,previewMessage:original};
 const projected=projectMessagingDisplay(source),cold=readMessagingDisplay(JSON.parse(JSON.stringify(projected)),userId)!;
 expect(cold.pages[0].messages[0].walletTransfer).toEqual(attachmentRow);expect(cold.inbox[0].previewMessage?.walletTransfer).toEqual(attachmentRow);expect(cold.pages[0].messages[0].sealedOriginalAvailable).toBe(false);expect(JSON.stringify(cold)).not.toContain(upload.uploadToken);expect(JSON.stringify(cold)).not.toContain('artifactBytes');
 const request=vi.fn(async()=>new Response(bytes,{headers:{'content-type':'application/pdf','content-disposition':'attachment; filename="proposal.pdf"'}}));const api=createNativeMessaging({accountUid:userId,request,retained:cold});expect(api.knownMessages(conversationId)?.messages.map(row=>row.id)).toEqual([messageId]);expect(request).not.toHaveBeenCalled();expect((await api.attachment(conversationId,messageId)).size).toBe(bytes.length);
});

it('keeps older attachment messages readable when their display metadata is incomplete',async()=>{
 const legacy={...row,walletTransfer:{kind:'chat_attachment',name:'older.pdf',mime:'application/pdf'}};
 const api=createNativeMessaging({accountUid:userId,request:async()=>json({ok:true,conversation:summary,messages:[legacy],hasMore:false,nextCursor:null})});
 const page=await api.messages(conversationId);expect(page.messages[0].body).toBe(row.body);expect(page.messages[0].sealedOriginal).toEqual(row.sealedOriginal);expect(page.messages[0].walletTransfer).toBeNull();
});

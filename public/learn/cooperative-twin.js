// A presentation of the existing @bjklock public Twin and calendar contracts.
// Guest continuity is not owner authority or a newly issued Receiz identity.
const mounted=new WeakSet(),views=new Set(),PENDING='bankeiz:cooperative-twin:pending:v1';
let restored;try{restored=JSON.parse(sessionStorage.getItem(PENDING)??'null');}catch{}
const state={messages:[],pending:restored&&['message','book'].includes(restored.action)?restored:null,busy:false,consent:false,slots:[],questions:[],selected:null,booking:null,notice:restored?.action==='message'?'Your exact message is retained. Retry the same request to recover the reply.':restored?.action==='book'?'Calendar confirmation is still unknown. Your exact request is retained; do not make another booking until its outcome is resolved.':'',retry:restored?.action==='message',ready:false,bookingOpen:false,active:null,day:'',draft:restored?.action==='message'?restored.message:''};
if(state.pending?.action==='book')state.selected={startAt:state.pending.slotStartAt};
const zone=()=>Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';
const dayKey=slot=>new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:zone()}).format(new Date(slot.startAt));
const dayLabel=slot=>new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric',timeZone:zone()}).format(new Date(slot.startAt));
const label=slot=>new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:zone(),timeZoneName:'short'}).format(new Date(slot.startAt));
const hold=payload=>{state.pending=payload;try{if(payload)sessionStorage.setItem(PENDING,JSON.stringify(payload));else sessionStorage.removeItem(PENDING);}catch{}};
const publish=()=>{for(const view of views){if(!view.root.isConnected){views.delete(view);continue;}view.render();}};
function append(role,body,id){if(typeof body!=='string'||!body.trim()||state.messages.some(row=>row.id===id))return;state.messages.push({role,body,id,key:id});}
function messageNode(row){const item=document.createElement('div');item.className='coop-twin-message '+(row.role==='user'?'coop-twin-own':'coop-twin-reply');const who=document.createElement('span'),body=document.createElement('p');who.textContent=row.role==='user'?'You':'BJ Klock’s AI representative';body.textContent=row.body;item.append(who,body);return item;}
const friendly=error=>error==='rate_limited'||error==='public_twin_guest_allowance_exhausted'?'This conversation has reached its current reply limit. Your request is retained; try the same request again later.':error==='calendar_booking_slot_unavailable'?'That time is no longer available. Choose another current time.':error==='world_agent_booking_disabled'||error==='world_profile_booking_unavailable'?'Booking is not enabled on the current native path. Keep the conversation here; no appointment has been claimed.':'Receiz has not confirmed the result yet. Your original request is retained.';
let preparing;
async function continuity(){
 if(state.ready)return;if(preparing)return preparing;
 preparing=(async()=>{const response=await fetch('/api/cooperatives',{credentials:'same-origin',headers:{Accept:'application/json'},signal:AbortSignal.timeout(45000)}),data=await response.json();
 if(!response.ok||data.ok!==true||data.world?.username!=='bjklock')throw Error('CONTINUITY_UNCONFIRMED');
 state.ready=true;})();
 try{await preparing;}finally{preparing=null;}
}
function nativeMemory(memory,payload,reply){
 const rows=(Array.isArray(memory)?memory:[]).filter(row=>row&&typeof row.id==='string'&&['user','assistant'].includes(row.role)&&typeof row.body==='string'&&row.body.trim());
 if(!rows.length)return rows;
 const userKey='local:'+payload.clientOperationId,replyKey=payload.clientOperationId;
 const userIndex=rows.findLastIndex(row=>row.role==='user'&&row.body===payload.message),replyIndex=rows.findLastIndex(row=>row.role==='assistant'&&row.body===reply.message);
 const previous=new Map(state.messages.map(row=>[row.id,row]));
 const native=rows.map((row,index)=>({...previous.get(row.id),...row,key:previous.get(row.id)?.key??(payload.action==='message'&&index===userIndex?userKey:payload.action==='message'&&index===replyIndex?replyKey:row.id),status:'accepted'}));
 const keys=new Set(native.map(row=>row.key)),retained=state.messages.filter(row=>!keys.has(row.key)&&!rows.some(native=>native.id===row.id));
 state.messages=[...retained.filter(row=>row.status==='accepted'),...native,...retained.filter(row=>row.status!=='accepted')];
 return rows;
}
async function readReply(response,payload){
 if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream'))return response.json();
 if(!response.body)throw Error('EMPTY_STREAM');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',result=null;
 const consume=frame=>{
  const data=frame.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)return;
  const event=JSON.parse(data);
  if(event.type==='error')throw Object.assign(Error('NATIVE_REFUSAL'),{native:event});
  if(['reply_start','reply_delta','reply_preview'].includes(event.type)&&event.messageId!==payload.clientOperationId)throw Error('SOURCE_MISMATCH');
  if(event.type==='reply_delta'){
   if(result||typeof event.delta!=='string')throw Error('INVALID_STREAM');
   const row=state.messages.find(row=>row.key===payload.clientOperationId);row.body+=event.delta;row.status='streaming';publish();
  }else if(event.type==='reply_done'){
   if(result||event.world?.username!=='bjklock'||typeof event.reply?.message!=='string'||event.assistantMessage?.id&&event.assistantMessage.id!==payload.clientOperationId)throw Error('SOURCE_MISMATCH');
   result={...event,ok:true};
  }
 };
 try{for(;;){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let match;while((match=/\r?\n\r?\n/.exec(buffer))){consume(buffer.slice(0,match.index));buffer=buffer.slice(match.index+match[0].length);if(result)return result;}if(buffer.length>2000000)throw Error('INVALID_STREAM');}buffer+=decoder.decode();if(buffer.trim())consume(buffer);if(!result)throw Error('UNCONFIRMED_STREAM');return result;}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
function refused(payload,result){
 state.notice=friendly(result.error);
 if(payload.action==='message'&&(['accepted','released','indeterminate','quote_expired'].includes(result.operationStatus)||result.error==='owned_twin_action_already_processed')){
  hold(null);if(!state.draft)state.draft=payload.message;state.notice=result.error==='owned_twin_action_already_processed'?'Receiz already processed the original request. The reply was not recovered here. You can continue this same conversation.':state.notice+' You can continue with a new message.';
 }else if(payload.action==='book'&&['calendar_booking_slot_unavailable','world_agent_booking_disabled','world_profile_booking_unavailable','rate_limited','GUEST_CONTINUITY_REQUIRED','ORIGIN_REFUSED','BOOKING_REVIEW_REQUIRED','BOOKING_QUESTIONS_REQUIRED'].includes(result.error)){
  hold(null);if(result.error==='rate_limited')state.notice='Receiz declined this booking before execution because of its current request limit. Your details are retained; try confirming this same time later.';
 }else state.retry=payload.action==='message';
 if(result.error==='GUEST_CONTINUITY_REQUIRED'){state.ready=false;state.notice='Your conversation continuity needs cookies enabled before sending. Your request is retained.';}
}
async function send(payload){
 if(state.busy)return;
 state.consent=payload.consent===true;state.busy=true;state.retry=false;hold(payload);
 if(payload.action==='message'){
  append('user',payload.message,'local:'+payload.clientOperationId);
  const own=state.messages.find(row=>row.key==='local:'+payload.clientOperationId);if(own&&own.status!=='accepted')own.status='submitted';
  let row=state.messages.find(row=>row.key===payload.clientOperationId);
  if(!row){row={id:payload.clientOperationId,key:payload.clientOperationId,role:'assistant'};state.messages.push(row);}
  row.body='';row.status='pending';state.active=payload.clientOperationId;
  if(state.draft.trim()===payload.message)state.draft='';state.notice='';
 }else state.notice='Confirming this time with Receiz…';
 publish();
 try{
  await continuity();
  const response=await fetch('/api/cooperatives',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:payload.action==='message'?'text/event-stream':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(120000)});
  const result=await readReply(response,payload);
  if(!response.ok||result.ok!==true){refused(payload,result);return;}
  if(result.world?.username!=='bjklock'||typeof result.reply?.message!=='string')throw Error('SOURCE_MISMATCH');
  if(payload.action==='book'){
   const confirmation=result.reply.bookingConfirmation;if(!confirmation?.eventId||confirmation.startAt!==payload.slotStartAt||confirmation.attendeeEmail?.toLowerCase()!==payload.email.toLowerCase())throw Error('UNCONFIRMED');state.booking=confirmation;
  }
  const memory=nativeMemory(result.reply.memory,payload,result.reply);
  if(payload.action==='message'){
   const row=state.messages.find(row=>row.key===payload.clientOperationId);if(row){row.body=result.reply.message;row.status='accepted';row.source=result.reply.source;row.proof=result.reply.proof;row.actions=result.reply.actions;}
   const user=state.messages.find(row=>row.key==='local:'+payload.clientOperationId);if(user)user.status='accepted';
  }else if(!memory.some(row=>row.role==='assistant'&&row.body===result.reply.message))append('assistant',result.reply.message,'local:book:'+crypto.randomUUID());
  if(result.reply.bookingSlots?.length){state.slots=result.reply.bookingSlots;state.questions=result.world.booking?.customQuestions??state.questions;}
  hold(null);state.notice=result.reply.source==='fallback'?'The Twin’s full reasoning was unavailable for this reply. You can continue here.':state.booking?'Your time is confirmed in BJ Klock’s Receiz calendar. This conversation stays linked to the booking.':'';
 }catch(error){
  if(error.native)refused(payload,error.native);
  else{state.notice=payload.action==='book'?'Calendar confirmation is still unknown. The exact request is retained. Do not make another booking while its outcome is unresolved.':'The connection interrupted before Receiz confirmed the reply. Your exact message is retained; retrying recovers the same Receiz operation.';state.retry=payload.action==='message';}
 }finally{
  const row=state.messages.find(row=>row.key===state.active);if(row&&row.status!=='accepted')row.status='interrupted';
  state.active=null;state.busy=false;publish();
 }
}
export function mountConversation(root){
 if(!root||mounted.has(root))return;mounted.add(root);
 const composer=root.querySelector('[data-twin-composer]'),draft=composer.elements.message,consent=composer.elements.consent,submit=composer.querySelector('button[type=submit]'),retry=root.querySelector('[data-twin-retry]'),status=root.querySelector('[data-twin-status]'),log=root.querySelector('[data-twin-messages]'),book=root.querySelector('[data-twin-book-form]'),slots=root.querySelector('[data-twin-slots]'),times=root.querySelector('[data-twin-times]'),questionHost=root.querySelector('[data-twin-questions]');
 book.elements.timezone.value=zone();if(state.pending?.action==='book'){for(const name of ['name','email','timezone'])book.elements.namedItem(name).value=state.pending[name]??'';}let renderedSlots='',renderedQuestions='';const nodes=new Map();
 const render=()=>{
  const following=log.scrollHeight-log.scrollTop-log.clientHeight<80;
  if(state.messages.length){
   log.querySelector('.coop-twin-intro')?.remove();
   const keys=new Set();let cursor=log.firstChild;
   for(const row of state.messages){
    if(!row.body&&row.status==='interrupted')continue;keys.add(row.key);let node=nodes.get(row.key);if(!node){node=messageNode(row);nodes.set(row.key,node);}
    if(cursor!==node)log.insertBefore(node,cursor);cursor=node.nextSibling;
    node.dataset.twinState=row.status??'accepted';if(row.source)node.dataset.twinSource=row.source;
    const body=node.querySelector('p');if(body.textContent!==row.body)body.textContent=row.body;
    let typing=node.querySelector('[data-twin-typing]');
    if(row.status==='pending'&&!row.body&&!typing){typing=document.createElement('div');typing.className='coop-twin-typing';typing.dataset.twinTyping='';typing.setAttribute('aria-label','BJ’s Twin is replying');for(let i=0;i<3;i++)typing.append(document.createElement('i'));node.append(typing);}
    else if(row.status!=='pending'||row.body)typing?.remove();
    if(row.status==='accepted'&&!node.querySelector('.coop-twin-actions')&&row.actions?.length){
     const actions=document.createElement('div');actions.className='coop-twin-actions';
     for(const action of row.actions){
      if(typeof action.href!=='string'||typeof action.label!=='string')continue;let url;try{url=new URL(action.href,'https://receiz.com');}catch{continue;}
      if(url.origin!=='https://receiz.com'||url.username||url.password)continue;
      if(action.kind==='schedule'&&url.pathname==='/calendar/bjklock'){const button=document.createElement('button');button.type='button';button.className='coop-text-button';button.textContent=action.label;button.addEventListener('click',()=>times.click());actions.append(button);}
      else{const link=document.createElement('a');link.className='coop-text-button';link.href=url.href;link.textContent=action.label;actions.append(link);}
     }node.append(actions);
    }
   }
   for(const [key,node]of nodes)if(!keys.has(key)){node.remove();nodes.delete(key);}
   if(following)log.scrollTop=log.scrollHeight;
  }
  log.setAttribute('aria-busy',String(Boolean(state.active)));
  const started=state.messages.length>0||state.pending?.action==='message';root.querySelector('.coop-twin-suggestions').hidden=started;
  root.querySelector('.coop-conversation-progress').hidden=!state.bookingOpen&&!state.booking;
  if(started){composer.querySelector('label[for="cooperative-message"]').textContent='Message BJ';draft.placeholder='Ask anything…';draft.rows=2;}

  status.textContent=state.notice;submit.disabled=state.busy||Boolean(state.pending);submit.textContent=state.busy?'Continuing…':state.messages.length?'Send':'Start the conversation';retry.hidden=!state.retry;retry.disabled=state.busy;
  if(draft.value!==state.draft)draft.value=state.draft;consent.checked=state.consent||Boolean(state.pending?.consent);
  const validSlots=state.slots.filter(slot=>slot?.startAt&&Number.isFinite(Date.parse(slot.startAt))),days=[...new Map(validSlots.map(slot=>[dayKey(slot),slot])).entries()];
  if(!days.some(([day])=>day===state.day))state.day=days[0]?.[0]??'';
  const slotKey=JSON.stringify([state.slots,state.day]);if(slotKey!==renderedSlots){
   renderedSlots=slotKey;slots.replaceChildren();
   if(days.length){const day=document.createElement('label'),select=document.createElement('select');day.textContent='Meeting day · '+zone();select.setAttribute('aria-label','Meeting day');select.dataset.twinDay='';for(const [key,slot]of days){const option=document.createElement('option');option.value=key;option.textContent=dayLabel(slot);select.append(option);}select.value=state.day;select.addEventListener('change',()=>{state.day=select.value;publish();});day.append(select);slots.append(day);}
   for(const slot of validSlots.filter(slot=>dayKey(slot)===state.day)){const button=document.createElement('button');button.type='button';button.dataset.twinSlot=slot.startAt;button.textContent=label(slot);button.setAttribute('aria-pressed',String(state.selected?.startAt===slot.startAt));button.addEventListener('click',()=>{if(state.busy||state.pending?.action==='book'||state.booking)return;state.selected=slot;publish();});slots.append(button);}
  }
  const daySelect=slots.querySelector('select');if(daySelect)daySelect.disabled=state.busy||Boolean(state.booking)||state.pending?.action==='book';
  slots.querySelectorAll('[data-twin-slot]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.twinSlot===state.selected?.startAt));button.disabled=state.busy||Boolean(state.booking)||state.pending?.action==='book';});
  const qkey=JSON.stringify(state.questions);if(qkey!==renderedQuestions){renderedQuestions=qkey;questionHost.replaceChildren();for(const q of state.questions){const label=document.createElement('label'),input=document.createElement('input');label.textContent=q.label;input.name='question-'+q.id;input.maxLength=300;input.required=q.required===true;label.append(input);questionHost.append(label);}}
  root.querySelector('[data-twin-booking]').hidden=(!state.bookingOpen&&state.pending?.action!=='book')||Boolean(state.booking);
  if(state.pending?.action==='book')root.querySelector('[data-twin-booking]').hidden=false;
  book.hidden=!state.selected||Boolean(state.booking);book.querySelector('button[type=submit]').disabled=state.busy||Boolean(state.pending)||Boolean(state.booking);
  root.querySelector('[data-twin-selected]').textContent=state.selected?'Your selected time: '+label(state.selected):'';
  const confirmation=root.querySelector('[data-twin-confirmation]');confirmation.hidden=!state.booking;
  if(state.booking){const title=document.createElement('h4'),when=document.createElement('p'),detail=document.createElement('p');title.textContent='We have a time.';when.textContent=label(state.booking);detail.textContent='Confirmed with BJ Klock · Receiz calendar record '+state.booking.eventId;confirmation.replaceChildren(title,when,detail);}
  times.disabled=state.busy||Boolean(state.pending?.action==='book')||Boolean(state.booking);
  const stage=state.booking?3:state.slots.length?2:state.messages.length?1:0;root.querySelectorAll('[data-twin-progress]').forEach(node=>{if(Number(node.dataset.twinProgress)===stage)node.setAttribute('aria-current','step');else node.removeAttribute('aria-current');});
 };
 views.add({root,render});render();
 root.querySelectorAll('[data-twin-prompt]').forEach(button=>button.addEventListener('click',()=>{state.draft=draft.value=button.dataset.twinPrompt;draft.focus();}));
 consent.addEventListener('change',()=>{state.consent=consent.checked;if(state.consent)void continuity().catch(()=>{});});
 draft.addEventListener('input',()=>{state.draft=draft.value;});
 draft.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!state.busy&&!state.pending)composer.requestSubmit();}});
 composer.addEventListener('submit',event=>{
  event.preventDefault();if(state.busy||state.pending||!composer.reportValidity())return;state.consent=consent.checked;
  const message=draft.value.trim();if(!message)return;state.draft=draft.value;
  void send({action:'message',message,consent:true,clientOperationId:crypto.randomUUID(),quoteExpiresAt:new Date(Date.now()+10*60000).toISOString(),pagePath:location.pathname,locale:navigator.language,timezone:zone()});
 });
 retry.addEventListener('click',()=>{if(state.pending?.action==='message')void send(state.pending);});
 times.addEventListener('click',async()=>{
  if(state.busy||state.pending?.action==='book'||state.booking)return;if(!consent.checked&&!state.consent){consent.reportValidity();consent.focus();status.textContent='Agree to share this conversation before checking times.';return;}
  state.consent=true;state.bookingOpen=true;state.busy=true;state.notice='Checking current availability…';publish();
  try{await continuity();const response=await fetch('/api/cooperatives?availability=1',{credentials:'same-origin',headers:{Accept:'application/json'},signal:AbortSignal.timeout(45000)}),result=await response.json();if(!response.ok||result.ok!==true||result.world?.username!=='bjklock'||!Array.isArray(result.availability?.slots))throw Error('AVAILABILITY');state.ready=true;state.slots=result.availability.slots;state.questions=result.availability.customQuestions??[];state.notice=state.slots.length?'Choose a time below. Nothing is booked yet.':'No times are currently available. You can keep the conversation here.';}catch{state.notice='Current availability could not be confirmed. Keep the conversation here and check again when ready.';}finally{state.busy=false;publish();}
 });
 book.addEventListener('submit',event=>{
  event.preventDefault();if(state.busy||state.pending||state.booking||!state.selected||!book.reportValidity())return;
  const fields=book.elements,notes=[(location.pathname.startsWith('/together/')?'Together · Proof-native economy inquiry from ':/^\/(?:your-twin|in-action)\/?$/.test(location.pathname)?'Business · Your Twin inquiry from ':'Cooperative economy inquiry from ')+location.pathname,'The original conversation remains linked by its native visitor and thread.',fields.notes.value].filter(Boolean).join('\n').slice(0,900);
  void send({action:'book',consent:true,confirmed:true,slotStartAt:state.selected.startAt,name:fields.name.value.trim(),email:fields.email.value.trim(),timezone:fields.timezone.value.trim(),notes,questions:state.questions.map(q=>({id:q.id,label:q.label,required:q.required===true,answer:fields.namedItem('question-'+q.id)?.value??''}))});
 });
}

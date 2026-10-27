import {parseMoneyAction,type MoneyAction} from './money-tools';
import {isOwnerTwinThreadKey,parseTwinConversationList,parseTwinConversationPage} from './twin-conversations';
export type TwinOwnerContext = Readonly<{
  schema: 'receiz.owner-twin.context.v1';
  ownerUid: string;
  disclosure: 'owner-approved-for-this-request';
  records: ReadonlyArray<Readonly<{ id: string; title: string; text: string }>>;
}>;
export type NativeTwinRequest = (path: string, init?: RequestInit) => Promise<Response>;
export type NativeTwinAsk = { message: string; requestId: string; quoteExpiresAt: string; threadKey?: string; context?: TwinOwnerContext; moneyContext?:{schema:'bank.money-tool-results.v1';ownerUid:string;results:string}; signal?: AbortSignal; businessSetup?:boolean; organizerTools?:boolean;worldTools?:boolean; receizTools?:boolean; moneyTools?:boolean; onDelta?:(text:string)=>void };
export type NativeTwinSourceReference = { coordinate: string; sourceDigest: string; excerptDigest: string; authority: string };
export type NativeTwinMemory = { id: string; persistedId?: string; transportId?: string; role: 'user' | 'assistant'; body: string; createdAt: string; scope: 'session' | 'relationship' | 'venture'; channel: 'profile' | 'world' | 'chat' };
export type NativeTwinReply = {
  requestId: string;
  message: string;
  authority: 'generated-interpretation';
  source: 'upstream' | 'fallback' | 'local';
  memoryScope: string;
  memory: NativeTwinMemory[];
  sourceReferences: NativeTwinSourceReference[];
  sharedContext: { id: string; title: string; authority: 'owner-supplied-context' }[];
  businessActions?:{tool:string;args:Record<string,unknown>}[];
  moneyActions?:MoneyAction[];
  actionHandoffs: { kind: string; label: string; href: string; authority: 'proposal-only'; admitted: false }[];
};
export type NativeTwin = ReturnType<typeof createNativeTwin>;
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const bounded = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
function fail(code: string): never { throw Error(`BANK_TWIN_${code}`); }
const validUsername = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9_]{3,24}$/.test(value);
async function twinJson(response: Response, onDelta?: (text:string)=>void, maxText=24000) {
  if(response.ok && response.headers.get('content-type')?.includes('text/event-stream'))return twinStream(response,onDelta,maxText);
  if (!response.body) return null;
  const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0, raw = '';
  try {
    for (;;) {
      const part = await reader.read(); if (part.done) break;
      size += part.value.byteLength; if (size > 4 * 1024 * 1024) fail('RESPONSE_TOO_LARGE');
      raw += decoder.decode(part.value, { stream: true });
    }
    return record(JSON.parse(raw + decoder.decode()));
  } catch (cause) {
    await reader.cancel().catch(() => {});
    if (cause instanceof Error && cause.message === 'BANK_TWIN_RESPONSE_TOO_LARGE') throw cause;
    return null;
  } finally { reader.releaseLock(); }
}

async function twinStream(response:Response,onDelta?:(text:string)=>void,maxText=24000){
 if(!response.body)fail('STREAM_UNCONFIRMED');
 const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let pending='',size=0,deltaSize=0,result:Record<string,unknown>|null=null;
 try{
  for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>4*1024*1024)fail('RESPONSE_TOO_LARGE');pending=(pending+decoder.decode(part.value,{stream:true})).replace(/\r\n/g,'\n');
   let end:number;while((end=pending.indexOf('\n\n'))>=0){const block=pending.slice(0,end);pending=pending.slice(end+2);const event=block.split('\n').find(line=>line.startsWith('event:'))?.slice(6).trim(),raw=block.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!raw)continue;
    const data=record(JSON.parse(raw));if(!data)fail('STREAM_INVALID');if(result)fail('STREAM_INVALID');
    if(event==='delta'){if(typeof data.text!=='string'||(deltaSize+=data.text.length)>maxText)fail('STREAM_INVALID');onDelta?.(data.text);}
    else if(event==='result')result=data;
    else if(event==='error')throw Error(typeof data.error==='string'?data.error:'BANK_TWIN_STREAM_UNCONFIRMED');
   }
  }
  if(!result||pending.trim()||decoder.decode())fail('STREAM_UNCONFIRMED');return result;
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}

/** Local prerequisites only. Provider, deployment, entitlement and credits are
 * checked by Receiz on the explicit metered request, never invented here. */
export function ownerTwinReadiness(username: string | null | undefined) {
  return { status: validUsername(username) ? 'configured' as const : 'profile-required' as const, requires: ['receiz:twin.execute', 'business', 'usage-credits'] as const, runtime: 'existing-owner-twin' as const, availability: 'unchecked' as const };
}
function ownerContext(value: TwinOwnerContext | undefined, accountUid: string): TwinOwnerContext | undefined {
  if (value === undefined) return undefined;
  const input = record(value);
  if (!input || Object.keys(input).sort().join(',') !== 'disclosure,ownerUid,records,schema' || input.schema !== 'receiz.owner-twin.context.v1' || input.disclosure !== 'owner-approved-for-this-request' || !Array.isArray(input.records) || input.records.length < 1 || input.records.length > 12) fail('CONTEXT_INVALID');
  if (input.ownerUid !== accountUid) fail('CONTEXT_OWNER_MISMATCH');
  const ids = new Set<string>(); let total = 0;
  for (const item of input.records) {
    const row = record(item);
    if (!row || Object.keys(row).sort().join(',') !== 'id,text,title' || !bounded(row.id, 160) || !bounded(row.title, 160) || !bounded(row.text, 2400) || ids.has(row.id)) fail('CONTEXT_INVALID');
    ids.add(row.id); total += row.id.length + row.title.length + row.text.length;
    if (total > 16000) fail('CONTEXT_INVALID');
  }
  return structuredClone(value);
}

/** Reuses the owner's existing Receiz Twin runtime and metering. It never calls
 * another AI, reads private Mind, executes proposed actions, or retries a send. */
export function createNativeTwin(input: { accountUid: string; username: string | null | undefined | (()=>string|null|undefined); request: NativeTwinRequest; assertOpen(): void }) {
  const currentUsername=()=>typeof input.username==='function'?input.username():input.username;
  return Object.freeze({
    readiness: () => ownerTwinReadiness(currentUsername()),
    conversations:{
      async list(cursor?:string,signal?:AbortSignal){input.assertOpen();const username=currentUsername();if(!validUsername(username))fail('PROFILE_REQUIRED');if(cursor!==undefined&&!/^[A-Za-z0-9_-]{1,2048}$/.test(cursor))fail('CONVERSATION_INVALID');const response=await input.request(`/api/developers/twin/${username}/conversations${cursor?'?cursor='+encodeURIComponent(cursor):''}`,{method:'GET',signal});input.assertOpen();return parseTwinConversationList(await twinJson(response),input.accountUid);},
      async read(threadKey:string,cursor?:string,signal?:AbortSignal){input.assertOpen();const username=currentUsername();if(!validUsername(username))fail('PROFILE_REQUIRED');if(!isOwnerTwinThreadKey(threadKey,input.accountUid)||cursor!==undefined&&!/^[A-Za-z0-9_-]{1,2048}$/.test(cursor))fail('CONVERSATION_INVALID');const query=new URLSearchParams({threadKey,...(cursor?{cursor}:{})});const response=await input.request(`/api/developers/twin/${username}/conversations?${query}`,{method:'GET',signal});input.assertOpen();return parseTwinConversationPage(await twinJson(response),input.accountUid,threadKey);},
    },
    moneyJournal:{
      async claim(review:{id:string;recipientUserId:string;body:string}){input.assertOpen();const username=currentUsername();if(!validUsername(username))fail('PROFILE_REQUIRED');const response=await input.request(`/api/developers/twin/${username}/money`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({schema:'bank.money-delivery-claim.v1',ownerUid:input.accountUid,reviewId:review.id,recipientUserId:review.recipientUserId,body:review.body})}),raw=await twinJson(response);input.assertOpen();if(response.status===409&&raw?.error==='owned_money_delivery_claimed')return false;if(!response.ok||raw?.ok!==true||raw.ownerUid!==input.accountUid||raw.reviewId!==review.id||raw.claimed!==true)fail('MONEY_DELIVERY_UNCONFIRMED');return true;},
      async read(cursor?:string):Promise<import('./money-continuity').MoneyJournalPage>{
        input.assertOpen();const username=currentUsername();if(!validUsername(username)||cursor!==undefined&&(typeof cursor!=='string'||cursor.length>500||!/^[A-Za-z0-9_-]+$/.test(cursor)))fail('MONEY_JOURNAL_INVALID');
        const response=await input.request(`/api/developers/twin/${username}/money${cursor?'?cursor='+encodeURIComponent(cursor):''}`),raw=await twinJson(response);input.assertOpen();
        if(!response.ok||raw?.ok!==true)fail('MONEY_JOURNAL_UNAVAILABLE');if(raw.ownerUid!==input.accountUid)fail('MONEY_JOURNAL_OWNER_MISMATCH');
        if(!Array.isArray(raw.events)||raw.events.length>20||typeof raw.hasMore!=='boolean'||![raw.nextCursor,raw.resumeCursor].every(v=>v===null||typeof v==='string'&&v.length<=500))fail('MONEY_JOURNAL_INVALID');
        const {readMoneyJournalEvent}=await import('./money-continuity');return{events:raw.events.map(value=>readMoneyJournalEvent(value,input.accountUid)),hasMore:raw.hasMore,nextCursor:raw.nextCursor as string|null,resumeCursor:raw.resumeCursor as string|null};
      },
      async append(event:import('./money-continuity').MoneyJournalEvent){
        input.assertOpen();const username=currentUsername();if(!validUsername(username))fail('PROFILE_REQUIRED');const {readMoneyJournalEvent}=await import('./money-continuity');readMoneyJournalEvent(event,input.accountUid);
        const response=await input.request(`/api/developers/twin/${username}/money`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)}),raw=await twinJson(response);input.assertOpen();if(!response.ok||raw?.ok!==true)fail('MONEY_JOURNAL_UNCONFIRMED');if(raw.ownerUid!==input.accountUid||raw.operationId!==event.operationId)fail('MONEY_JOURNAL_OWNER_MISMATCH');
      },
    },

    async ask(question: NativeTwinAsk): Promise<NativeTwinReply> {
      input.assertOpen();
      const username=currentUsername();
      if (!input.accountUid || !validUsername(username)) fail('PROFILE_REQUIRED');
      if (!bounded(question.message, 1200) || !bounded(question.requestId, 160) || question.requestId.trim().length < 8 || !Number.isFinite(Date.parse(question.quoteExpiresAt)) || question.threadKey !== undefined && !bounded(question.threadKey, 160)) fail('QUESTION_INVALID');
      const context = ownerContext(question.context, input.accountUid);
      const moneyContext=question.moneyContext;
      if(moneyContext&&(moneyContext.ownerUid!==input.accountUid||moneyContext.schema!=='bank.money-tool-results.v1'||typeof moneyContext.results!=='string'||moneyContext.results.length>32000))fail('MONEY_CONTEXT_INVALID');
      const body = { message: question.message, requestId: question.requestId, quoteExpiresAt: question.quoteExpiresAt, ...(question.threadKey === undefined ? {} : { threadKey: question.threadKey }), ...(context ? { ownerContext: context } : {}), ...(moneyContext?{moneyContext}:{}), allowBrowserVoiceFallback: false, ...(question.businessSetup?{businessSetup:true}:{}), ...(question.organizerTools?{organizerTools:true}:{}), ...(question.worldTools?{worldTools:true}:{}), ...(question.receizTools?{receizTools:true}:{}), ...(question.moneyTools?{moneyTools:true}:{}), ...(question.onDelta?{stream:true}:{}) };
      const response = await input.request(`/api/developers/twin/${username}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), ...(question.signal ? { signal: question.signal } : {}) });
      input.assertOpen();
      const raw = await twinJson(response,question.onDelta,question.moneyTools?64000:24000);
      if (!response.ok || raw?.ok !== true) throw Error(typeof raw?.error === 'string' ? raw.error : 'BANK_TWIN_REQUEST_FAILED');
      if (raw.requestId !== question.requestId || record(raw.world)?.username !== username) fail('RESPONSE_OWNER_MISMATCH');
      if(question.businessSetup && raw.businessSetupSupported!==true)fail('BUSINESS_UNAVAILABLE');
      if(question.moneyTools && raw.moneyToolsSupported!==true)fail('MONEY_UNAVAILABLE');
      let moneyActions:MoneyAction[]|undefined;
      if(raw.moneyToolsSupported===true){if(!Array.isArray(raw.moneyActions)||raw.moneyActions.length>4)fail('MONEY_ACTION_INVALID');moneyActions=raw.moneyActions.map(parseMoneyAction);}
      let businessActions:NativeTwinReply['businessActions'];
      if(raw.businessSetupSupported===true){
       if(!Array.isArray(raw.businessActions)||raw.businessActions.length>4)fail('BUSINESS_INVALID');
       businessActions=raw.businessActions.map(value=>{const row=record(value);if(!row||Object.keys(row).sort().join(',')!=='args,tool'||typeof row.tool!=='string'||!/^business_[a-z_]{1,40}$/.test(row.tool)||!record(row.args)||JSON.stringify(row.args).length>24000)fail('BUSINESS_INVALID');return{tool:row.tool,args:row.args as Record<string,unknown>};});
      }
      const reply = record(raw.reply), cognition = record(reply?.cognition), frame = record(cognition?.frame), owner = record(frame?.owner);
      if (owner && (owner.ownerUserId !== input.accountUid || owner.username !== username)) fail('RESPONSE_OWNER_MISMATCH');
      if (!reply || !bounded(reply.message, question.moneyTools?64000:24000) || !['upstream', 'fallback', 'local'].includes(String(reply.source)) || !Array.isArray(reply.actions) || reply.actions.length > 20) fail('RESPONSE_INVALID');
      if (!Array.isArray(reply.memory) || reply.memory.length > 32) fail('MEMORY_INVALID');
      const memoryIds = new Set<string>();
      const memory = reply.memory.map(value => {
        const row = record(value);
        if (!row || !bounded(row.id, 256) || memoryIds.has(row.id) || !['user', 'assistant'].includes(String(row.role)) || !bounded(row.body, question.moneyTools?64000:24000) || typeof row.createdAt !== 'string' || row.createdAt.length > 40 || !Number.isFinite(Date.parse(row.createdAt)) || !['session', 'relationship', 'venture'].includes(String(row.scope)) || !['profile', 'world', 'chat'].includes(String(row.channel)) || row.persistedId !== undefined && !bounded(row.persistedId, 256) || row.transportId !== undefined && !bounded(row.transportId, 256)) fail('MEMORY_INVALID');
        memoryIds.add(row.id);
        return { id: row.id, ...(typeof row.persistedId === 'string' ? { persistedId: row.persistedId } : {}), ...(typeof row.transportId === 'string' ? { transportId: row.transportId } : {}), role: row.role as NativeTwinMemory['role'], body: row.body, createdAt: row.createdAt, scope: row.scope as NativeTwinMemory['scope'], channel: row.channel as NativeTwinMemory['channel'] };
      });
      const actionHandoffs = reply.actions.map(value => {
        const action = record(value); if (!action || !bounded(action.kind, 80) || !bounded(action.label, 240) || !bounded(action.href, 2048)) fail('ACTION_INVALID');
        let url: URL; try { url = new URL(action.href, 'https://receiz.com'); } catch { fail('ACTION_INVALID'); }
        if (url.origin !== 'https://receiz.com' || url.username || url.password || url.hash || !url.pathname.startsWith('/')) fail('ACTION_INVALID');
        return { kind: action.kind, label: action.label, href: url.href, authority: 'proposal-only' as const, admitted: false as const };
      });
      const sourceReferences: NativeTwinSourceReference[] = [];
      if (frame) {
        if (!owner || !Array.isArray(frame.sources) || frame.sources.length > 96 || record(frame.policy)?.consequentialOutput !== 'proposal-only') fail('RESPONSE_INVALID');
        for (const item of frame.sources) {
          const source = record(item);
          if (!source || !bounded(source.coordinate, 4096) || !bounded(source.authority, 80) || typeof source.sourceDigest !== 'string' || !/^[a-f0-9]{64}$/.test(source.sourceDigest) || typeof source.excerptDigest !== 'string' || !/^[a-f0-9]{64}$/.test(source.excerptDigest)) fail('RESPONSE_INVALID');
          sourceReferences.push({ coordinate: source.coordinate, sourceDigest: source.sourceDigest, excerptDigest: source.excerptDigest, authority: source.authority });
        }
      }
      input.assertOpen();
      return { ...(moneyActions?{moneyActions}:{}), ...(businessActions?{businessActions}:{}), requestId: question.requestId, message: reply.message, authority: 'generated-interpretation', source: reply.source as NativeTwinReply['source'], memoryScope: typeof reply.memoryScope === 'string' ? reply.memoryScope : 'none', memory, sourceReferences, sharedContext: context?.records.map(({ id, title }) => ({ id, title, authority: 'owner-supplied-context' as const })) ?? [], actionHandoffs };
    },
  });
}

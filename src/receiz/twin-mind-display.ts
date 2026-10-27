import type {PublicRecord} from './public-network';
import type {OpenIdentity} from './native-identity';
import type {MindNode,MindEdge,TwinMindGraph} from './twin-mind-graph';
import {peekPrivateHistory} from './private-history-restore';
import {calendarEventTitle,calendarEventNote} from './calendar-labels';
import {isOwnerTwinThreadKey} from './twin-conversations';
export type HeldMindConversation={threadKey:string;entries:readonly {id:string;role:string;body:string;createdAt:string;persistedId?:string;label?:string;record?:Record<string,unknown>}[]};
export type HeldMindLedger={accountUid:string;records:readonly PublicRecord[]};
export type HeldTwinMind={schema:'bankeiz.twin-mind-display.v1';owner:Record<string,unknown>;graph:TwinMindGraph};
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(...values:unknown[])=>values.find((v):v is string=>typeof v==='string'&&!!v.trim())??'';
const rows=(v:unknown):Record<string,unknown>[]=>Array.isArray(v)?v.filter(v=>v&&typeof v==='object'&&!Array.isArray(v)):[];
const uint=(v:unknown)=>typeof v==='string'&&/^(0|[1-9][0-9]{0,29})$/.test(v)?v:typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?String(v):undefined;
function pulse(row:Record<string,unknown>){
 const metadata=object(row.metadata),bundle=object(row.proof_bundle),upulse=uint(row.kaiUpulse??row.kaiUPulse??row.kai_upulse??metadata.kaiUpulse??metadata.kaiUPulse);
 return upulse?(BigInt(upulse)/1000000n).toString():uint(row.kaiPulse??row.kai_pulse??row.pulse??metadata.pulse??metadata.kaiPulse??bundle.kaiPulseEternal);
}
const time=(row:Record<string,unknown>)=>{const at=Date.parse(text(row.time,row.createdAt,row.created_at,row.startAt,row.occurredAt,row.executedAt,row.openedAt));return Number.isFinite(at)?at:null;};
const carriedPaths=[
 ['proof','profileView.originals'],['proof','originalsManifest.originals'],['proof','originals'],['proof','showcase.originals'],
 ['note','wallet.notes'],['note','walletNotes'],
 ['calendar','calendar.events'],['calendar','calendarEvents'],['contact','contactsProjection.contacts'],['contact','contacts'],['contact','contacts.contacts'],['contact','contacts.projection.contacts'],
 ['investment','market.sharePositions'],['trade','market.shareTradeHistory'],['activity','world.receipts'],['activity','proofHistory.entries'],
 ['sports','sports.vaultCards'],['sports','sports.entries'],['sports','sports.cardAppends'],['sports','sports.eventProofs'],
 ['signal','signalVault.cards'],['signal','signalVault.arts'],['signal','signalVault.appends'],
 ['investment','market.creatorReserves'],['investment','market.predictionPositions'],['investment','market.settledPredictionPositions'],
] as const;
/** Index the sources this exact open account already holds. This is a display,
 * never a new Mind export, proof admission, value calculation or storage copy.
 * Original payloads stay by reference; neither dates nor proximity create Kai. */
export function readHeldTwinMind(identity:OpenIdentity,uid:string,conversations:readonly HeldMindConversation[]=[],heldLedger?:HeldMindLedger):HeldTwinMind{
 const projection=identity.localHistory,state=object(projection?.verifiedState);
 const carried=projection?.portableStateVerified===true&&projection.authority==='verified-identity-portable-state'&&projection.keyId===identity.binding?.keyId&&projection.owner?.uid===identity.binding?.identityOwnerReceizId&&state.schema==='receiz.account.state.v3'&&object(state.account).userId===uid?state:{};
 const profile=identity.knownProfile?.(),owner=profile?.userId===uid?profile:{displayName:'',userId:uid,username:identity.accountUsername?.()??identity.username??''};
 const root:MindNode={id:'identity',kind:'identity',label:text(owner.displayName,owner.username)||'Your Twin',body:'Your available account sources and saved conversations.',at:null,record:owner};
 const sources:MindNode[]=[],memory:MindNode[]=[],edges:MindEdge[]=[],seen=new Set<string>(),references=new Set<string>();
 function add(domain:string,row:Record<string,unknown>,id:string,label?:string,body?:string,href?:string){
  const key=domain+':'+id;if(seen.has(key))return;seen.add(key);const originalPulse=pulse(row);
  const node:MindNode={id:key,kind:'source',label:label||text(row.title,row.fullName,row.summary,row.kind,row.actionKind)||'Account record',body:body??text(row.summary,row.note,row.notes,row.detail,row.description),at:time(row),...(originalPulse?{pulse:originalPulse}:{}),record:row,sourceKind:domain,...(href?{href}:{})};
  sources.push(node);edges.push({from:root.id,to:node.id,kind:'membership'});
 }
 // Live retained records supersede their older carried presentation by exact
 // identity only. Equal labels, amounts or times never identify a source.
 const ledger=heldLedger?.accountUid===uid?heldLedger:peekPrivateHistory(identity,uid);
 for(const row of ledger?.records??[]){
  for(const [kind,id] of [['entry',row.evidence.entryHash],['transfer',row.evidence.transferId]] as const)if(id)references.add(kind+':'+id);
  add(row.source==='wallet'?'wallet':'activity',row as unknown as Record<string,unknown>,row.sourceId,row.title,row.detail,'/#ledger');
 }
 const organizer=identity.knownOrganizerDisplay?.();
 if(organizer?.accountUid===uid){
  for(const row of organizer.events??[]){if(row.ownerUserId!==uid)continue;const m=row.metadata;
   if(row.source==='system'&&(m.entryHash&&references.has('entry:'+m.entryHash)||m.transferId&&references.has('transfer:'+m.transferId)))continue;
   add('calendar',row as unknown as Record<string,unknown>,row.id,calendarEventTitle(row,uid),calendarEventNote(row));
  }
  for(const row of organizer.contacts??[])add('contact',row,row.id,row.fullName,text(row.notes,row.profileSummary));
 }
 const portfolio=identity.knownMarketPortfolio?.();
 if(portfolio?.accountUid===uid){
  for(const row of portfolio.positions)add('investment',row as unknown as Record<string,unknown>,row.id,row.title,row.summary);
  for(const row of portfolio.trades)add('trade',row as unknown as Record<string,unknown>,row.id,(row.side==='buy'?'Asset Purchase':'Asset Sale')+' · '+row.title);
 }
 for(const [domain,path] of carriedPaths){
  const values=path.split('.').reduce<unknown>((value,key)=>object(value)[key],carried);
  for(const [index,row] of rows(values).entries()){
   const id=text(row.id,row.entryId,row.entryHash)||path+':'+index;
   if(domain==='calendar'&&row.ownerUserId!==uid)continue;
   if(domain==='proof')add(domain,row,id,undefined,undefined,owner.username?'/asset/'+encodeURIComponent('profile:'+owner.username+':'+id)+'/':undefined);
   else add(domain,row,id);
  }
 }
 const retained=identity.knownMessagingDisplay?.();
 const groups:HeldMindConversation[]=[...conversations.filter(group=>isOwnerTwinThreadKey(group.threadKey,uid))];
 if(retained?.accountUid===uid)for(const page of retained.pages)groups.push({threadKey:'messages:'+page.conversation.id,entries:page.messages.map(row=>({id:row.id,role:row.senderKind==='ai'?'assistant':'user',body:row.body,createdAt:row.createdAt,label:row.senderDisplay||row.senderAiId||(row.senderUserId===uid?'You':'Participant'),record:row as unknown as Record<string,unknown>}))});
 const native=rows(object(carried.world).twinMemory),nativeGroups=new Map<string,Record<string,unknown>[]>();
 for(const [index,row] of native.entries()){if(typeof row.id!=='string'||typeof row.body!=='string')continue;const scoped=typeof row.scope==='string'&&[row.visitorKey,row.ventureId].some(value=>typeof value==='string'&&!!value);const key=scoped?JSON.stringify([row.scope??null,row.channel??null,row.visitorKey??null,row.ventureId??null,row.districtSlug??null]):'unscoped:'+index;const entries=nativeGroups.get(key)??[];entries.push(row);nativeGroups.set(key,entries);}
 for(const [key,entries] of nativeGroups)groups.push({threadKey:'carried:'+key,entries:entries as unknown as HeldMindConversation['entries']});
 for(const group of groups){let previous:string|undefined;
  for(const row of group.entries){if(!['user','assistant'].includes(row.role))continue;const id='conversation:'+group.threadKey+':'+(row.persistedId??row.id);if(seen.has(id))continue;seen.add(id);
   const source=row.record??row as unknown as Record<string,unknown>,originalPulse=pulse(source);
   const node:MindNode={id,kind:row.role==='assistant'?'assistant':'user',label:row.label??(row.role==='assistant'?'Your Twin':'Message'),body:row.body,at:time(source),...(originalPulse?{pulse:originalPulse}:{}),record:source};
   memory.push(node);edges.push({from:previous??root.id,to:id,kind:previous?'conversation':'membership'});previous=id;
  }
 }
 return{schema:'bankeiz.twin-mind-display.v1',owner,graph:{nodes:[root,...sources,...memory],sources,memory,edges}};
}

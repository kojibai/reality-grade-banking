import {parsePublicNetworkPage,type PublicRecord,type PublicSource} from './public-network';

export type AccountHistoryFlow='in'|'out'|'self';
const object=(value:unknown):Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const id=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=128?value:undefined;
/** Display perspective only, beneath an already bound private account read or
 * admitted portable state. Names and client clocks never determine direction. */
function accountFlow(raw:unknown,accountUid:string):AccountHistoryFlow|null|undefined{
 const row=object(raw),kind=String(row.actionKind??row.kind??row.entry_kind??''),payload=object(row.payload);
 if(row.user_id!==undefined&&row.user_id!==accountUid)return null;
 const transfer=/transfer|owner.*changed/.test(kind);
 const actor=id(object(row.actor).userId??row.actorUserId??row.actor_user_id);
 if(!transfer&&actor&&actor!==accountUid)return null;
 const sender=id(object(row.sender).userId??row.sender_user_id??object(row.fromActor).userId??payload.senderUserId??(transfer?(row.actorUserId??row.actor_user_id):undefined));
 const recipient=id(object(row.recipient).userId??row.recipient_user_id??object(row.toActor).userId??payload.recipientUserId??(transfer?(row.subjectUserId??row.subject_user_id):undefined));
 const participant=sender===accountUid&&recipient===accountUid?'self':sender===accountUid?'out':recipient===accountUid?'in':undefined;
 const declared=row.direction==='credit'?'in':row.direction==='debit'?'out':undefined;
 if(participant&&declared&&participant!==declared)return null;
 if(sender&&recipient&&!participant)return null;
 if(participant)return participant;
 if(declared)return declared;
 if(kind==='reserve_credit'||kind==='note_claim'||kind==='chat_transfer_receive')return 'in';
 if(kind==='note_mint'||kind==='chat_transfer_send')return 'out';
}
export function projectAccountHistoryRecords(source:Exclude<PublicSource,'proofs'|'graph'>,rows:unknown[],accountUid:string):PublicRecord[]{
 const flows=new Map(rows.map(raw=>[object(raw).id,accountFlow(raw,accountUid)]));
 return parsePublicNetworkPage(source,{ok:true,rows}).records.map(record=>{
  const flow=flows.get(record.sourceId);
  return {...record,authority:'account-source-projection',...(flow===null?{accountFlowConflict:true as const}:flow?{accountFlow:flow}:{})};
 });
}

import {AccountProfileLink} from '../../components/AccountProfileLink';
import {ProfileAvatar} from '../../components/ProfileAvatar';
import type {ChatPerson} from '../../receiz/native-messaging';

/** A world Twin's sender ID carries its owner. Reuse that conversation member;
 * no username guessing, new directory read or human-authorship claim. */
export function chatReplyPerson(userId:string,agentId:string|null|undefined,members:ChatPerson[]):ChatPerson|null{
 const owner=/^world:([\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})$/i.exec(agentId??'')?.[1];
 return members.find(person=>person.kind==='user'&&person.userId===(owner??userId))
  ??members.find(person=>person.kind==='ai'&&!!agentId&&person.aiAgentId===agentId)??null;
}
export function ReplyIdentity({name,person,avatarUrl}:{name:string;person?:ChatPerson|null;avatarUrl?:string|null}){
 return <AccountProfileLink username={person?.kind==='user'?person.username:null} className="bank-message-sender" label={'View '+name+' profile'}><ProfileAvatar src={avatarUrl??person?.avatarUrl} name={name} eager/><span>{name}</span></AccountProfileLink>;
}

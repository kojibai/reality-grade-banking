import {accountPersonName} from '../../receiz/account-presentation';
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
export function ReplyIdentity({name,person,avatarUrl,human=false}:{name:string;human?:boolean;person?:ChatPerson|null;avatarUrl?:string|null}){
 const label=human&&person?.kind==='user'?accountPersonName(person):name;
 return <AccountProfileLink username={person?.kind==='user'?person.username:null} className="bank-message-sender" label={'View '+label+' profile'}><ProfileAvatar account={person} src={avatarUrl??person?.avatarUrl} name={label} eager/><span>{label}</span></AccountProfileLink>;
}

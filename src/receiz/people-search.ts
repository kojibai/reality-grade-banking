/** The existing Receiz directory's bounded query grammar. Display names and
 * usernames share one search endpoint; these are selectors, never authority. */
export function peopleSearchQuery(raw:string):string {
 return raw.replace(/^@+/, '').replace(/[^a-z0-9_.\-\s]/gi,'').replace(/\s+/g,' ').trim().slice(0,40).toLowerCase();
}
export function isPeopleSearchQuery(value:string|null):boolean {
 return !!value&&value===peopleSearchQuery(value);
}
import type {ChatConversation,ChatPerson} from './native-messaging';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function selectablePerson(person:ChatPerson,owner:string):boolean {
 return person.kind==='user'&&person.userId!==owner&&uuid.test(person.userId)&&!!person.username&&/^[a-z0-9_]{3,24}$/.test(person.username);
}
/** Reuse the held inbox. No contact database, history reads or directory calls. */
export function conversationPeople(rows:ReadonlyArray<ChatConversation>,owner:string):ChatPerson[] {
 const people=new Map<string,ChatPerson>();
 for(const row of [...rows].sort((a,b)=>(b.lastMessageAt??b.updatedAt).localeCompare(a.lastMessageAt??a.updatedAt)))
  for(const person of row.members)if(selectablePerson(person,owner)&&!people.has(person.userId))people.set(person.userId,person);
 return [...people.values()];
}
export function peopleSuggestions(contacts:ChatPerson[],directory:ChatPerson[],query:string,owner:string):ChatPerson[] {
 const q=peopleSearchQuery(query),people=new Map<string,ChatPerson>();
 for(const person of contacts)if(!q||peopleSearchQuery((person.displayName??'')+' '+person.username).includes(q))people.set(person.userId,person);
 // The existing directory already matched the query. Prefer its current handle.
 for(const person of directory)if(selectablePerson(person,owner))people.set(person.userId,person);
 return [...people.values()].slice(0,8);
}

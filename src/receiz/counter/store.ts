import {loadCounterRegisterWork,saveCounterRegisterWork,loadOfflineNoteBlob,saveOfflineNoteBlob} from '../identity-vault';
import type {CounterRegisterState} from './controller';
type Collection='items'|'sales'|'drafts';
/** Hot cart writes carry only pointers to unchanged, immutable collections. */
export function counterRegisterStore(binding:{artifactSha256:string}){
 let raw:unknown=null,lastState:CounterRegisterState|null=null;const sources=new Map<Collection,{value:unknown;digest:string}>();
 return{
  async read(){raw=await loadCounterRegisterWork(binding);if(raw==null)return null;const value=raw as Omit<CounterRegisterState,Collection>&{collections:Record<Collection,string>};if(!value.collections)throw Error('Saved Counter source is unavailable.');const values=await Promise.all((['items','sales','drafts']as const).map(async key=>{const digest=value.collections[key];if(!/^[a-f0-9]{64}$/.test(digest))throw Error('Saved Counter source is unavailable.');const bytes=await loadOfflineNoteBlob(binding,digest),data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));sources.set(key,{value:data,digest});return[key,data]as const;}));const {collections:_,...work}=value;return lastState={...work,...Object.fromEntries(values)} as CounterRegisterState;},
  async write(next:CounterRegisterState,expected:unknown){if(expected!==lastState)throw Error('Your Counter changed in another view. Reopen it before saving.');const collections={}as Record<Collection,string>;for(const key of ['items','sales','drafts']as const){let held=sources.get(key);if(!held||next[key]!==held.value){held={value:next[key],digest:await saveOfflineNoteBlob(binding,new TextEncoder().encode(JSON.stringify(next[key])))};sources.set(key,held);}collections[key]=held.digest;}const {items:_,sales:__,drafts:___,...work}=next,value={...work,collections};await saveCounterRegisterWork(binding,value,raw);raw=value;lastState=next;},
 };
}

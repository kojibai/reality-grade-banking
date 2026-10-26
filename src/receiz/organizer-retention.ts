import {readOrganizerDisplay,type OrganizerDisplay} from './organizer-types';
const MAX_BYTES=2*1024*1024;
/** Display retention only. Actual reads/writes stay in the admitted owner
 * service. Storage is the existing encrypted identity vault, never a new DB. */
export async function openOrganizerRetention({accountUid,load,save,isOpen}:{accountUid:string;load():Promise<unknown>;save(value:OrganizerDisplay,expected:unknown):Promise<void>;isOpen():boolean}){
 let previous:unknown=null;try{previous=await load();}catch{/* Optional display does not block the account. */}
 let known=readOrganizerDisplay(previous,accountUid),serialized=JSON.stringify(known),pending:OrganizerDisplay|null=null,writing:Promise<void>|null=null,available=true;
 async function flush():Promise<void>{if(writing)return writing;const attempt=(async()=>{while(pending&&isOpen()){const next=pending;pending=null;if(next.accountUid!==accountUid)continue;known=next;if(!available)continue;const raw=JSON.stringify(next);if(raw===serialized||new TextEncoder().encode(raw).byteLength>MAX_BYTES)continue;try{await save(next,previous);previous=next;serialized=raw;}catch{available=false;}}if(!isOpen())pending=null;})();writing=attempt;try{await attempt;}finally{if(writing===attempt)writing=null;}}
 return{known:()=>isOpen()?known:null,capture(value:OrganizerDisplay){if(!isOpen()||value.accountUid!==accountUid)return;pending=value;queueMicrotask(()=>{void flush();});},flush};
}

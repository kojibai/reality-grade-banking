export type NoteStage='saved-notes'|'prepared-notes'|'saved-note-identity'|'offline-note-checkpoint'|'prepared-note-checkpoint'|'received-note-checkpoint'|'note-image'|'note-image-export'|'identity-transport'|'device-signer'|'note-quote'|'note-issue';
const failures=new WeakMap<object,{stage:NoteStage;errorName:string}>();
/** Public stage/name only; keep the original exception and private payload intact. */
export async function atNoteStage<T>(stage:NoteStage,operation:()=>Promise<T>):Promise<T>{
 try{return await operation();}catch(cause){if(cause&&typeof cause==='object'&&!failures.has(cause)){const name=(cause as {name?:unknown}).name;failures.set(cause,{stage,errorName:typeof name==='string'&&['Error','OperationError','DataError','InvalidStateError','NotSupportedError','NotAllowedError','AbortError','QuotaExceededError','SyntaxError'].includes(name)?name:'Error'});}throw cause;}
}
export function noteFailureStage(cause:unknown){return cause&&typeof cause==='object'?failures.get(cause)??null:null;}

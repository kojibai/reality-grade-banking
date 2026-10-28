import {useEffect,useRef,useState} from 'react';
import {Fingerprint,X} from 'lucide-react';
import {IdentityRecordIcon} from '../../components/IdentityRecordIcon';
import {inspectIdentityLock} from '../../receiz/identity-lock';
import type {OpenIdentity} from '../../receiz/native-identity';
import type {MeetingSession} from '../../receiz/meeting-session';

export type MeetingIdentityEntry=Pick<MeetingSession,'importIdentity'|'recoverPbi'>;
export function MeetingIdentity({service,disabled,onBusy,onError,onReady}:{service:MeetingIdentityEntry;disabled:boolean;onBusy:(value:boolean)=>void;onError:(value:string)=>void;onReady?:(identity:OpenIdentity)=>Promise<void>}){
 const picker=useRef<HTMLInputElement>(null),alive=useRef(true),running=useRef(false);
 const [working,setWorking]=useState(false),[record,setRecord]=useState<File|null>(null),[phrase,setPhrase]=useState('');
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const mark=(value:boolean)=>{if(alive.current){setWorking(value);onBusy(value);}};
 async function useRecord(file:File,unlock:string){const next=await service.importIdentity(file,unlock);if(alive.current){setRecord(null);setPhrase('');await onReady?.(next);}}
 async function run(action:()=>Promise<void>){if(running.current||disabled)return;running.current=true;mark(true);onError('');try{await action();}catch(cause){if(alive.current)onError(cause instanceof Error&&cause.message==='passkey_cancelled'?'PBI was cancelled. Your account is unchanged.':'Your identity could not be opened. Keep your original record and try again.');}finally{running.current=false;mark(false);}}
 async function choose(file?:File){if(!file)return;await run(async()=>{const lock=await inspectIdentityLock(file);if(!alive.current)return;if(lock.needsPhrase){setRecord(file);setPhrase('');}else await useRecord(file,'');});}
 // A selected locked record is an explicit entry choice. Join waits for unlock
 // or cancellation rather than creating a different account underneath it.
 useEffect(()=>{onBusy(working||Boolean(record));},[working,record,onBusy]);
 return <><div className="meeting-identity-actions" aria-label="Use your existing identity">
  <button type="button" aria-label="Use Identity Record" title="Use Identity Record" disabled={disabled||working||Boolean(record)} onClick={()=>picker.current?.click()}><IdentityRecordIcon size={21}/></button>
  <button type="button" aria-label="Use PBI" title="Use PBI" disabled={disabled||working||Boolean(record)} onClick={()=>void run(async()=>{const next=await service.recoverPbi();if(alive.current)await onReady?.(next);})}><Fingerprint size={23} strokeWidth={1.6}/></button>
  <input ref={picker} hidden type="file" accept=".png,.pdf,.receiz,.receizkey,.json,application/octet-stream" aria-label="Choose Identity Record" onChange={event=>{const file=event.target.files?.[0];event.target.value='';void choose(file);}}/>
 </div>{record&&<form className="meeting-identity-unlock" onSubmit={event=>{event.preventDefault();if(phrase)void run(()=>useRecord(record,phrase));}}>
  <input type="password" aria-label="Unlock your Identity Record" placeholder="Unlock phrase" autoComplete="off" value={phrase} disabled={working} onChange={event=>setPhrase(event.target.value)}/>
  <button type="submit" disabled={working||!phrase}>Unlock</button><button type="button" aria-label="Cancel Identity Record selection" disabled={working} onClick={()=>{setRecord(null);setPhrase('');onBusy(false);}}><X size={15}/></button>
 </form>}</>;
}

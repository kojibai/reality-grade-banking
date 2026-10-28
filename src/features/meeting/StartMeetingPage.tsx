import {useEffect,useState} from 'react';
import {Video,ArrowUpRight} from 'lucide-react';
export function StartMeetingPage({start,navigate}:{start:()=>Promise<string>;navigate:(path:string)=>void}){
 const [error,setError]=useState(''),[busy,setBusy]=useState(true),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let live=true;setBusy(true);setError('');void start().then(path=>{if(live)navigate(path);}).catch(()=>{if(live){setError('Your meeting could not be confirmed. Try again to continue the same request.');setBusy(false);}});return()=>{live=false;};},[start,navigate,attempt]);
 return <main className="meeting-lobby"><div className="meeting-lobby-orbit" aria-hidden="true"><span/><span/><span/><Video size={42}/></div><section><p className="meeting-eyebrow">A little time. Together.</p><h1>Your meeting.</h1>{busy?<span className="meeting-working" role="status" aria-label="Preparing your meeting"><i/><i/><i/></span>:<><p className="meeting-error" role="alert">{error}</p><button className="meeting-join" onClick={()=>setAttempt(n=>n+1)}>Try again<ArrowUpRight size={19}/></button><a className="meeting-lobby-audio" href="/">Your account</a></>}</section></main>;
}

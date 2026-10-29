import {useEffect,useRef} from 'react';
import {Video,ArrowUpRight,FileCheck,CalendarDays,MessageCircle,Check} from 'lucide-react';
import {IdentityRecordIcon} from '../../components/IdentityRecordIcon';
/** Presentation of the completed departure. Existing capture and Identity remain
 * held by MeetingRoom; only explicit actions export their exact proof files. */
export function MeetingCloseout({title,left,busy,saved,identitySaved,needsPhrase,error,obscured,onSession,onIdentity,onNext,onConversation,onRejoin}:{title:string;left:boolean;busy:boolean;saved:boolean;identitySaved:boolean;needsPhrase:boolean;error:string;obscured:boolean;onSession():void;onIdentity():void;onNext():void;onConversation():void;onRejoin?:()=>void}){
 const heading=useRef<HTMLHeadingElement>(null);useEffect(()=>{if(!obscured)heading.current?.focus({preventScroll:true});},[obscured]);
 return <div className="meeting-lobby meeting-closeout" aria-label="Meeting complete" hidden={obscured}>
  <a className="meeting-wordmark" href="/" aria-label="Bankeiz home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m3 8 9-5 9 5H3m2 3v8m5-8v8m4-8v8m5-8v8M2 22h20M3 19h18"/></svg></a>
  <div className="meeting-lobby-orbit" aria-hidden="true"><span/><span/><span/><Check size={38}/></div>
  <section><p className="meeting-eyebrow">A little time. Yours to keep.</p><h1 ref={heading} tabIndex={-1}>{left?'You’ve left.':'Meeting ended.'}</h1><p className="meeting-lobby-host">{title}</p>
   <a className="meeting-join" href="/meet/start/"><Video size={20}/>New meeting<ArrowUpRight size={19}/></a>
   <div className="meeting-closeout-saves"><button type="button" aria-label="Save session" disabled={busy} onClick={onSession}><FileCheck size={20}/><span>{busy?'Preparing session…':saved?'Session saved':'Save session'}</span></button><button type="button" aria-label="Save Identity Record" onClick={onIdentity}><IdentityRecordIcon action="save" size={20}/><span>{identitySaved?'Identity Record saved':'Save Identity Record'}</span></button></div>
   <p className="meeting-consent">Your session and Identity Record are separate proof files.{needsPhrase?' Keep your private unlock phrase separately.':' Your Identity Record brings you back to your account.'}</p>
   {error&&<p className="meeting-error" role="alert">{error}</p>}
   <div className="meeting-closeout-next"><button type="button" onClick={onNext}><CalendarDays size={15}/>Find the next step</button><button type="button" onClick={onConversation}><MessageCircle size={15}/>Review conversation</button>{onRejoin&&<button type="button" onClick={onRejoin}><Video size={15}/>Rejoin meeting</button>}</div>
   <a className="meeting-closeout-account" href="/">Return to your account<ArrowUpRight size={13}/></a>
  </section><footer>Reality-grade banking<span>Bankeiz</span></footer>
 </div>;
}

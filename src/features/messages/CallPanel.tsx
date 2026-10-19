import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {ChevronLeft,Mic,MicOff,Phone,PhoneOff,Video,VideoOff} from 'lucide-react';
import {createNativeCallController,type NativeCallIdentity,type NativeCallSnapshot} from '../../receiz/native-calls';
import './calls.css';

export interface CallPanelProps {
  identity:NativeCallIdentity;conversationId:string;conversationTitle:string;userId:string;
  initialCallId?:string;initialVideo?:boolean;onClose():void;
}
function statusText(state:NativeCallSnapshot){
  switch(state.phase){
    case 'idle':case 'loading':return 'Checking calls…';
    case 'joining':return 'Joining call…';
    case 'waiting':return 'Waiting for another participant';
    case 'connecting':return 'Connecting media…';
    case 'connected':return 'Connected';
    case 'reconnecting':return 'Media disconnected · reconnecting';
    case 'leaving':return 'Leaving call…';
    case 'ending':return 'Ending call…';
    case 'left':return 'You left the call';
    case 'ended':return 'Call ended';
    default:return state.call?.status==='active'?'Call in progress':'Ready when you are';
  }
}
function CallMedia({stream,local,label}:{stream:MediaStream;local?:boolean;label:string}){
  const ref=useRef<HTMLVideoElement>(null),[blocked,setBlocked]=useState(false);
  useEffect(()=>{
    const element=ref.current;if(!element)return;element.srcObject=stream;
    // Media received through the actual RTC/SFU track callback is the only source.
    const playing=element.play();if(playing)void playing.catch(()=>setBlocked(true));
    return()=>{element.pause();element.srcObject=null;};
  },[stream]);
  const play=()=>{const playing=ref.current?.play();if(playing)void playing.then(()=>setBlocked(false)).catch(()=>setBlocked(true));};
  return <div className={`bank-call-media${local?' bank-call-media-local':''}`}>
    <video ref={ref} autoPlay playsInline muted={!!local} aria-label={label}/>
    <span>{label}</span>{blocked&&!local&&<button type="button" onClick={play}>Play call audio</button>}
  </div>;
}
export function CallPanel({identity,conversationId,conversationTitle,userId,initialCallId,initialVideo=false,onClose}:CallPanelProps){
  const [controller,setController]=useState(()=>createNativeCallController({identity,conversationId,userId,initialCallId}));
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const [video,setVideo]=useState(initialVideo);
  useEffect(()=>{
    // Each effect owns its transport lifetime, including React StrictMode replay.
    const controller=createNativeCallController({identity,conversationId,userId,initialCallId});
    setController(controller);
    void controller.refresh();
    const timer=window.setInterval(()=>{if(document.visibilityState!=='hidden')void controller.refresh();},2800);
    const hide=()=>{if(document.visibilityState==='hidden')void controller.leave();};
    const pagehide=()=>{void controller.leave();};
    document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',pagehide);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',pagehide);void controller.close();};
  },[identity,conversationId,userId,initialCallId]);
  const close=()=>{void controller.close();onClose();};
  const busy=state.phase==='loading'||state.phase==='joining'||state.phase==='leaving'||state.phase==='ending';
  const active=state.call?.status==='active',participants=state.call?.participants.filter(p=>p.leftAt===null)??[];
  const title=conversationTitle||'Conversation',initials=title.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  return <section className="bank-call" aria-label={`Call with ${title}`}>
    <div className="bank-call-back"><button type="button" aria-label="Return to conversation" onClick={close}><ChevronLeft size={17}/>Messages</button><span>{state.joined?(state.videoEnabled?'Video call':'Voice call'):(video?'Video call':'Voice call')}</span></div>
    <div className="bank-call-main">
      <span className="bank-call-status" role="status">{statusText(state)}</span>
      {state.localStream||state.remoteStreams.length?<div className="bank-call-streams">
        {state.localStream&&<CallMedia stream={state.localStream} local label="You"/>}
        {state.remoteStreams.map(remote=><CallMedia key={remote.userId} stream={remote.stream} label={participants.find(p=>p.userId===remote.userId)?.displayName||'Participant'}/>)}
      </div>:<div className="bank-call-person" aria-hidden="true">{initials}</div>}
      <h3>{title}</h3>
      {active&&<p className="bank-call-members">{participants.length} joined{state.call?.locked?' · Locked':''}</p>}
      {state.error&&<p className="bank-call-error" role="alert">{state.error}</p>}
      {!state.joined&&<p className="bank-call-hint">Your microphone{video?' and camera':''} will turn on when you {active?'join':'start'}.</p>}
      {state.joined&&state.iceSource==='fallback'&&<p className="bank-call-hint">Direct connectivity only. A media connection has to complete before the call is connected.</p>}
      {!state.joined&&<button type="button" className="bank-call-start" aria-label={active?'Join call':'Start call'} disabled={busy} onClick={()=>void controller.join(video?'video':'voice')}><Phone size={17}/>{busy?'Please wait…':active?'Join call':'Start call'}</button>}
      <div className="bank-call-controls">
        {state.joined&&<button type="button" aria-label={state.micEnabled?'Mute microphone':'Unmute microphone'} aria-pressed={state.micEnabled} onClick={()=>void controller.setMicrophoneEnabled(!state.micEnabled)}>{state.micEnabled?<Mic size={21}/>:<MicOff size={21}/>}</button>}
        <button type="button" aria-label={state.joined?(state.videoEnabled?'Disable camera':'Enable camera'):(video?'Use voice only':'Use video')} aria-pressed={state.joined?state.videoEnabled:video} disabled={busy} onClick={()=>state.joined?void controller.setCameraEnabled(!state.videoEnabled):setVideo(value=>!value)}>{(state.joined?state.videoEnabled:video)?<Video size={22}/>:<VideoOff size={22}/>}</button>
        {state.joined&&<button type="button" className="bank-call-leave" aria-label="Leave call" onClick={()=>void controller.leave()}><PhoneOff size={22}/></button>}
      </div>
      {state.joined&&state.call?.viewerPermissions?.canEndCall===true&&<button type="button" className="bank-call-end" onClick={()=>void controller.end()}>End call for everyone</button>}
      {!!participants.length&&<ul className="bank-call-participants" aria-label="Joined call participants">{participants.map(p=><li key={p.id??p.userId}>{p.userId===userId?'You':p.displayName}{p.participantKind==='ai'?' · AI':''}{p.mutedByModerator?' · Muted by moderator':''}</li>)}</ul>}
    </div>
  </section>;
}

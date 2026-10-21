import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type PointerEvent as ReactPointerEvent} from 'react';
import {ChevronLeft,GripHorizontal,Maximize2,Mic,MicOff,Phone,PhoneOff,Video,VideoOff,X} from 'lucide-react';
import {createNativeCallController,type NativeCallIdentity,type NativeCallSnapshot} from '../../receiz/native-calls';
import {clampCallPosition} from './CallPortal';
import './calls.css';

export interface CallPanelProps {
  identity:NativeCallIdentity;conversationId:string;conversationTitle:string;userId:string;
  initialCallId?:string;initialVideo?:boolean;onClose():void;
  minimized?:boolean;onMinimize?():void;onRestore?():void;onLiveChange?(live:boolean):void;
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
function CallMedia({stream,local,label,primary,presented=true}:{stream:MediaStream;local?:boolean;label:string;primary?:boolean;presented?:boolean}){
  const ref=useRef<HTMLVideoElement>(null),[blocked,setBlocked]=useState(false);
  useEffect(()=>{
    const element=ref.current;if(!element)return;element.srcObject=stream;
    // Media received through the actual RTC/SFU track callback is the only source.
    const playing=element.play();if(playing)void playing.catch(()=>setBlocked(true));
    return()=>{element.pause();element.srcObject=null;};
  },[stream]);
  const play=()=>{const playing=ref.current?.play();if(playing)void playing.then(()=>setBlocked(false)).catch(()=>setBlocked(true));};
  return <div className={`bank-call-media${local?' bank-call-media-local':''}${primary?' bank-call-media-primary':''}`} aria-hidden={!presented||undefined} inert={!presented}>
    <video ref={ref} autoPlay playsInline muted={!!local} aria-label={label}/>
    <span>{label}</span>{blocked&&!local&&<button type="button" onClick={play}>Play call audio</button>}
  </div>;
}
export function CallPanel({identity,conversationId,conversationTitle,userId,initialCallId,initialVideo=false,onClose,minimized=false,onMinimize,onRestore,onLiveChange}:CallPanelProps){
  const [controller,setController]=useState(()=>createNativeCallController({identity,conversationId,userId,initialCallId}));
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot,controller.getSnapshot);
  const [video,setVideo]=useState(initialVideo);
  useEffect(()=>{
    // Each effect owns its transport lifetime, including React StrictMode replay.
    const controller=createNativeCallController({identity,conversationId,userId,initialCallId});
    setController(controller);
    void controller.refresh();
    const timer=window.setInterval(()=>{if(document.visibilityState!=='hidden')void controller.refresh();},2800);
    const visible=()=>{if(document.visibilityState!=='hidden')void controller.refresh();};
    const pagehide=()=>{void controller.leave();};
    document.addEventListener('visibilitychange',visible);window.addEventListener('pagehide',pagehide);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);window.removeEventListener('pagehide',pagehide);void controller.close();};
  },[identity,conversationId,userId,initialCallId]);
  const live=state.joined||state.phase==='joining';
  useEffect(()=>{onLiveChange?.(live);},[live,onLiveChange]);
  const focusControl=(label:string)=>queueMicrotask(()=>dock.current?.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)?.focus({preventScroll:true}));
  const close=()=>{if(live&&onMinimize){onMinimize();focusControl('Return to call');}else{void controller.close();onClose();}};
  const restore=()=>{onRestore?.();focusControl('Return to conversation');};
  const dock=useRef<HTMLElement>(null),drag=useRef<{id:number;x:number;y:number;left:number;top:number}|null>(null);
  const [position,setPosition]=useState<{x:number;y:number}|null>(null);
  const viewport=()=>{const style=dock.current?getComputedStyle(dock.current):null,inset=(edge:string)=>Number.parseFloat(style?.getPropertyValue('--call-safe-'+edge)??'')||0;return{width:window.visualViewport?.width??window.innerWidth,height:window.visualViewport?.height??window.innerHeight,left:window.visualViewport?.offsetLeft??0,top:window.visualViewport?.offsetTop??0,insets:{left:inset('left'),right:inset('right'),top:inset('top'),bottom:inset('bottom')}};};
  const bounded=(next:{x:number;y:number})=>clampCallPosition(next,dock.current?.getBoundingClientRect()??{width:240,height:230},viewport());
  useLayoutEffect(()=>{
    if(!minimized)return;
    const clamp=()=>{dock.current?.style.setProperty('--call-viewport-height',`${viewport().height}px`);setPosition(prior=>{const rect=dock.current?.getBoundingClientRect();if(!rect?.width||!rect.height)return prior;const next=bounded(prior??{x:rect.left,y:rect.top});return prior?.x===next.x&&prior?.y===next.y?prior:next;});};
    clamp();
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(clamp);if(dock.current)observer?.observe(dock.current);
    window.addEventListener('resize',clamp);window.visualViewport?.addEventListener('resize',clamp);window.visualViewport?.addEventListener('scroll',clamp);
    return()=>{observer?.disconnect();window.removeEventListener('resize',clamp);window.visualViewport?.removeEventListener('resize',clamp);window.visualViewport?.removeEventListener('scroll',clamp);};
  },[minimized]);
  const beginDrag=(event:ReactPointerEvent<HTMLButtonElement>)=>{
    if(event.button!==0||!dock.current)return;const rect=dock.current.getBoundingClientRect();
    drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:rect.left,top:rect.top};
    event.currentTarget.setPointerCapture?.(event.pointerId);event.preventDefault();
  };
  const moveDrag=(event:ReactPointerEvent<HTMLButtonElement>)=>{const prior=drag.current;if(prior?.id===event.pointerId)setPosition(bounded({x:prior.left+event.clientX-prior.x,y:prior.top+event.clientY-prior.y}));};
  const endDrag=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(drag.current?.id!==event.pointerId)return;drag.current=null;if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);};
  const busy=state.phase==='loading'||state.phase==='joining'||state.phase==='leaving'||state.phase==='ending';
  const active=state.call?.status==='active',participants=state.call?.participants.filter(p=>p.leftAt===null)??[];
  const title=conversationTitle||'Conversation',initials=title.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
  const hasVideo=(stream:MediaStream|null)=>stream?.getVideoTracks().some(track=>track.enabled&&track.readyState==='live')??false;
  const remoteVideo=state.remoteStreams.find(remote=>hasVideo(remote.stream)),preview=remoteVideo?.userId??(hasVideo(state.localStream)?'local':state.remoteStreams[0]?.userId??'local');
  const previewHasVideo=preview==='local'?hasVideo(state.localStream):hasVideo(state.remoteStreams.find(remote=>remote.userId===preview)?.stream??null);
  return <section ref={dock} className={`bank-call${minimized?' bank-call-minimized':''}`} data-video={previewHasVideo} style={minimized&&position?{left:position.x,top:position.y,right:'auto',bottom:'auto'}:undefined} aria-label={`Call with ${title}`}>
    <div className="bank-call-dock-bar" hidden={!minimized}><button type="button" className="bank-call-drag" aria-label="Move call window" title="Drag or use arrow keys to move" onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={event=>{const directions:Record<string,[number,number]>={ArrowLeft:[-20,0],ArrowRight:[20,0],ArrowUp:[0,-20],ArrowDown:[0,20]},direction=directions[event.key];if(!direction||!dock.current)return;event.preventDefault();const rect=dock.current.getBoundingClientRect();setPosition(bounded({x:rect.left+direction[0],y:rect.top+direction[1]}));}}><GripHorizontal size={15}/><span>{title}</span></button><button type="button" aria-label="Return to call" title="Return to call" onClick={restore}><Maximize2 size={15}/></button>{!live&&<button type="button" aria-label="Close call controls" onClick={close}><X size={15}/></button>}</div>
    <div className="bank-call-back"><button type="button" aria-label="Return to conversation" onClick={close}><ChevronLeft size={17}/>Messages</button><span>{state.joined?(state.videoEnabled?'Video call':'Voice call'):(video?'Video call':'Voice call')}</span></div>
    <div className="bank-call-main">
      <span className="bank-call-status" role="status">{statusText(state)}</span>
      {(state.localStream||state.remoteStreams.length>0)&&<div className="bank-call-mini-avatar" aria-hidden="true">{initials}</div>}
      {state.localStream||state.remoteStreams.length?<div className="bank-call-streams">
        {state.localStream&&<CallMedia stream={state.localStream} local primary={preview==='local'} presented={!minimized||preview==='local'&&previewHasVideo} label="You"/>}
        {state.remoteStreams.map(remote=><CallMedia key={remote.userId} stream={remote.stream} primary={remote.userId===preview} presented={!minimized||remote.userId===preview&&previewHasVideo} label={participants.find(p=>p.userId===remote.userId)?.displayName||'Participant'}/>)}
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
        {live&&<button type="button" className="bank-call-leave" aria-label={state.joined?'Leave call':'Cancel joining call'} onClick={()=>void controller.leave()}><PhoneOff size={22}/></button>}
      </div>
      {state.joined&&state.call?.viewerPermissions?.canEndCall===true&&<button type="button" className="bank-call-end" onClick={()=>void controller.end()}>End call for everyone</button>}
      {!!participants.length&&<ul className="bank-call-participants" aria-label="Joined call participants">{participants.map(p=><li key={p.id??p.userId}>{p.userId===userId?'You':p.displayName}{p.participantKind==='ai'?' · AI':''}{p.mutedByModerator?' · Muted by moderator':''}</li>)}</ul>}
    </div>
  </section>;
}

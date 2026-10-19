import {loadReceizSfuClient, type NativeSfuClient, type NativeSfuRoom} from './native-calls-sfu';

/** Projections of Receiz app/lib/chat/types.ts. Membership and permission remain
 * host-owned; this adapter has no session, provider or participant authority. */
export interface NativeCallParticipant {
  id:string; callId:string; userId:string|null; participantKind:'user'|'ai'; aiAgentId:string|null;
  displayName:string; role:'host'|'cohost'|'member'|'ai'; joinedAt:string; leftAt:string|null;
  connectionState:'connected'|'reconnecting'|'disconnected';
  mediaState:{audioEnabled?:boolean; videoEnabled?:boolean; screenShareEnabled?:boolean; handRaised?:boolean; speaking?:boolean};
  mutedByModerator:boolean; metadata:Record<string,unknown>;
}
export interface NativeCallSummary {
  id:string; conversationId:string; mode:'voice'|'video'; topology:'mesh'|'sfu'; title:string|null;
  status:'active'|'ended'|'archived'; startedBy:string|null; startedAt:string; endedAt:string|null;
  locked:boolean; participants:NativeCallParticipant[]; activeParticipantCount:number;
  viewerPermissions:{canEndCall:boolean};
}
interface CallSignal {
  id:string; callId:string; conversationId:string; senderUserId:string; targetUserId:string|null;
  signalType:'offer'|'answer'|'ice'|'renegotiate'|'control'; payload:Record<string,unknown>;
  createdAt:string; expiresAt:string|null;
}
export type NativeCallPhase='idle'|'loading'|'ready'|'joining'|'waiting'|'connecting'|'connected'|'reconnecting'|'leaving'|'ending'|'left'|'ended'|'error';
export interface NativeCallSnapshot {
  phase:NativeCallPhase; call:NativeCallSummary|null; calls:NativeCallSummary[]; joined:boolean;
  error:string|null; localStream:MediaStream|null; remoteStreams:{userId:string;stream:MediaStream}[];
  micEnabled:boolean; videoEnabled:boolean; iceSource:string|null;
}
export interface NativeCallIdentity {heldFetch(input:string,init?:RequestInit):Promise<Response>;forController?():NativeCallIdentity}
export interface NativeCallRuntime {
  getUserMedia(constraints:MediaStreamConstraints):Promise<MediaStream>;
  createPeer(configuration:RTCConfiguration):RTCPeerConnection;
  createStream():MediaStream;
  loadSfu():Promise<NativeSfuClient>;
}
export interface NativeCallOptions {identity:NativeCallIdentity; conversationId:string; userId:string; initialCallId?:string; runtime?:NativeCallRuntime}
const browserRuntime:NativeCallRuntime={
  getUserMedia:constraints=>{
    if(!globalThis.navigator?.mediaDevices?.getUserMedia)throw Error('media_unavailable');
    return navigator.mediaDevices.getUserMedia(constraints);
  },
  createPeer:configuration=>new RTCPeerConnection(configuration),
  createStream:()=>new MediaStream(),loadSfu:loadReceizSfuClient,
};
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
function errorText(error:unknown):string {
  const code=error instanceof Error?error.message:String(error);
  if(error instanceof Error&&['NotAllowedError','SecurityError'].includes(error.name))return 'Microphone or camera permission was denied. Allow access to join the call.';
  if(error instanceof Error&&error.name==='NotFoundError')return 'The requested microphone or camera is unavailable.';
  if(code==='media_unavailable')return 'Calling needs microphone access in a supported secure browser.';
  if(code==='chat_call_sfu_unavailable')return 'The Receiz call media service is unavailable or its client could not be loaded. Check that the provider is configured and retry.';
  if(code==='chat_call_forbidden'||code==='chat_call_not_joined')return `Receiz refused call access (${code}).`;
  if(code==='chat_call_locked')return 'This call is locked.';
  if(code==='insufficient_scope')return 'Receiz has not granted call access (insufficient_scope). Reconnect messages to review access.';
  return code||'The call could not continue.';
}
function readCall(value:unknown,conversationId:string):NativeCallSummary {
  if(!object(value)||typeof value.id!=='string'||value.conversationId!==conversationId||!['voice','video'].includes(String(value.mode))||!['mesh','sfu'].includes(String(value.topology))||!['active','ended','archived'].includes(String(value.status))||!Array.isArray(value.participants))throw Error('Receiz returned an invalid call.');
  return value as unknown as NativeCallSummary;
}
const stopStream=(stream:MediaStream|null)=>stream?.getTracks().forEach(track=>track.stop());

export function createNativeCallController(options:NativeCallOptions) {
  const {conversationId,userId}=options,identity=options.identity.forController?.()??options.identity,runtime=options.runtime??browserRuntime;
  const base=`/api/chat/conversations/${encodeURIComponent(conversationId)}/calls`;
  let state:NativeCallSnapshot={phase:'idle',call:null,calls:[],joined:false,error:null,localStream:null,remoteStreams:[],micEnabled:false,videoEnabled:false,iceSource:null};
  const listeners=new Set<()=>void>(),peers=new Map<string,RTCPeerConnection>(),remote=new Map<string,MediaStream>(),iceQueue=new Map<string,RTCIceCandidateInit[]>(),seen=new Set<string>(),pendingNegotiation=new Set<string>();
  const lifetime=new AbortController();
  let generation=0,closed=false,joining=false,leaving=false,cameraChanging=false,refreshing=false,membershipCallId:string|null=null,signalSince:string|null=null;
  let room:NativeSfuRoom|null=null,roomConnected=false,rtcConfiguration:RTCConfiguration={iceServers:[]};
  function update(patch:Partial<NativeCallSnapshot>){state={...state,...patch};listeners.forEach(listener=>listener());}
  function current(epoch:number){return !closed&&generation===epoch;}
  async function request(path:string,method='GET',body?:unknown,signal:AbortSignal|null=lifetime.signal):Promise<Record<string,unknown>>{
    const response=await identity.heldFetch(path,{method,signal,cache:'no-store',...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
    const payload:unknown=await response.json();
    if(!response.ok||!object(payload)||payload.ok===false)throw Error(object(payload)&&typeof payload.error==='string'?payload.error:`Call request failed (${response.status}).`);
    return payload;
  }
  function path(id:string){return `${base}/${encodeURIComponent(id)}`;}
  function mediaState(){return {audioEnabled:state.localStream?.getAudioTracks().some(track=>track.enabled&&track.readyState==='live')??false,videoEnabled:state.localStream?.getVideoTracks().some(track=>track.enabled&&track.readyState==='live')??false,screenShareEnabled:false};}
  function remoteChanged(){update({remoteStreams:[...remote].map(([remoteUserId,stream])=>({userId:remoteUserId,stream}))});}
  function dropPeer(remoteUserId:string){const peer=peers.get(remoteUserId);peers.delete(remoteUserId);if(peer){peer.onicecandidate=null;peer.ontrack=null;peer.onconnectionstatechange=null;peer.close();}iceQueue.delete(remoteUserId);pendingNegotiation.delete(remoteUserId);const stream=remote.get(remoteUserId);stopStream(stream??null);remote.delete(remoteUserId);}
  function cleanup(){
    for(const id of peers.keys())dropPeer(id);
    const prior=room;room=null;roomConnected=false;
    if(prior){try{void Promise.resolve(prior.disconnect()).catch(()=>{});}catch{/* Local tracks still close below. */}}
    for(const stream of remote.values())stopStream(stream);remote.clear();iceQueue.clear();seen.clear();pendingNegotiation.clear();signalSince=null;
    stopStream(state.localStream);update({joined:false,localStream:null,remoteStreams:[],micEnabled:false,videoEnabled:false});
  }
  async function leaveMembership(){const id=membershipCallId;membershipCallId=null;if(!id)return null;const payload=await request(`${path(id)}/participants`,'DELETE',undefined,null);return readCall(payload.call,conversationId);}
  async function reportConnection(){
    if(!state.joined||!state.call)return;
    const states=[...peers.values()].map(peer=>peer.connectionState);
    const phase:NativeCallPhase=state.call.topology==='sfu'?(roomConnected?'connected':'reconnecting'):states.length===0?'waiting':states.every(value=>value==='connected')?'connected':states.some(value=>['failed','disconnected','closed'].includes(value))?'reconnecting':'connecting';
    update({phase});
    try{await request(`${path(state.call.id)}/participants`,'POST',{action:'update',connectionState:phase==='connected'?'connected':phase==='waiting'?'disconnected':'reconnecting',mediaState:mediaState()});}catch(error){if(state.joined&&!closed)update({error:errorText(error)});}
  }
  function addRemoteTrack(remoteUserId:string,track:MediaStreamTrack){
    if(!state.joined||closed)return;
    let stream=remote.get(remoteUserId);if(!stream){stream=runtime.createStream();remote.set(remoteUserId,stream);}
    if(!stream.getTracks().some(existing=>existing.id===track.id))stream.addTrack(track);
    track.addEventListener('ended',()=>{stream?.removeTrack(track);if(!stream?.getTracks().length)remote.delete(remoteUserId);remoteChanged();},{once:true});remoteChanged();
  }
  async function sendSignal(targetUserId:string,signalType:string,payload:Record<string,unknown>){
    if(!state.joined||closed||!state.call)return;
    await request(`${path(state.call.id)}/signals`,'POST',{targetUserId,signalType,payload});
  }
  function ensurePeer(remoteUserId:string){
    const existing=peers.get(remoteUserId);if(existing)return existing;
    const peer=runtime.createPeer(rtcConfiguration),epoch=generation;
    peers.set(remoteUserId,peer);
    for(const track of state.localStream?.getTracks()??[])peer.addTrack(track,state.localStream!);
    peer.onicecandidate=event=>{if(event.candidate&&current(epoch))void sendSignal(remoteUserId,'ice',{candidate:event.candidate.toJSON()}).catch(error=>{if(current(epoch))update({error:errorText(error)});});};
    peer.ontrack=event=>{if(!current(epoch))return;for(const track of event.streams.flatMap(stream=>stream.getTracks()))addRemoteTrack(remoteUserId,track);addRemoteTrack(remoteUserId,event.track);};
    peer.onconnectionstatechange=()=>{if(current(epoch)&&state.joined)void reportConnection();};
    return peer;
  }
  async function offer(remoteUserId:string,peer:RTCPeerConnection){
    const epoch=generation;if(peer.signalingState!=='stable')return;
    const description=await peer.createOffer();if(!current(epoch)||!state.joined)return;
    await peer.setLocalDescription(description);if(current(epoch))await sendSignal(remoteUserId,'offer',{sdp:peer.localDescription});
  }
  async function syncMesh(){
    const call=state.call;if(!state.joined||!call||call.topology!=='mesh')return;
    const users=new Set(call.participants.filter(p=>p.participantKind==='user'&&p.userId&&p.userId!==userId&&p.leftAt===null).map(p=>p.userId!));
    for(const id of peers.keys())if(!users.has(id))dropPeer(id);
    for(const id of users){if(peers.has(id))continue;const peer=ensurePeer(id);if(userId.localeCompare(id)<0)await offer(id,peer);}
    remoteChanged();
    // Membership means joined. Only actual RTC state establishes connectivity.
    const states=[...peers.values()].map(peer=>peer.connectionState);
    update({phase:states.length===0?'waiting':states.every(value=>value==='connected')?'connected':states.some(value=>['failed','disconnected'].includes(value))?'reconnecting':'connecting'});
  }
  async function handleSignal(signal:CallSignal){
    const call=state.call;if(!call||!state.joined||seen.has(signal.id))return;
    if(signal.callId!==call.id||signal.conversationId!==conversationId||signal.senderUserId===userId||(signal.targetUserId!==null&&signal.targetUserId!==userId)||(signal.expiresAt!==null&&(!Number.isFinite(Date.parse(signal.expiresAt))||Date.parse(signal.expiresAt)<=Date.now()))||!call.participants.some(p=>p.userId===signal.senderUserId&&p.participantKind==='user'&&p.leftAt===null))return;
    const epoch=generation,peer=ensurePeer(signal.senderUserId);
    if(signal.signalType==='ice'){
      const candidate=signal.payload.candidate;if(!object(candidate))return;
      if(peer.remoteDescription)await peer.addIceCandidate(candidate as RTCIceCandidateInit);
      else{const queue=iceQueue.get(signal.senderUserId)??[];if(queue.length>=256)throw Error('Too many pending call candidates. Leave and rejoin.');queue.push(candidate as RTCIceCandidateInit);iceQueue.set(signal.senderUserId,queue);}
    }else if(signal.signalType==='offer'||signal.signalType==='answer'){
      const sdp=signal.payload.sdp;if(!object(sdp)||sdp.type!==signal.signalType||typeof sdp.sdp!=='string')return;
      if(signal.signalType==='offer'&&peer.signalingState!=='stable'){
        if(userId.localeCompare(signal.senderUserId)<0)return;
        await peer.setLocalDescription({type:'rollback'});
      }
      if(signal.signalType==='answer'&&peer.signalingState!=='have-local-offer')return;
      await peer.setRemoteDescription(sdp as unknown as RTCSessionDescriptionInit);
      if(!current(epoch)||!state.joined)return;
      for(const candidate of iceQueue.get(signal.senderUserId)??[])await peer.addIceCandidate(candidate);
      iceQueue.delete(signal.senderUserId);
      if(signal.signalType==='offer'){
        const answer=await peer.createAnswer();if(!current(epoch)||!state.joined)return;
        await peer.setLocalDescription(answer);if(current(epoch))await sendSignal(signal.senderUserId,'answer',{sdp:peer.localDescription});
      }
    if(current(epoch)&&pendingNegotiation.delete(signal.senderUserId)&&peer.signalingState==='stable')await offer(signal.senderUserId,peer);
    }else if(signal.signalType==='renegotiate'&&userId.localeCompare(signal.senderUserId)<0)await offer(signal.senderUserId,peer);
    seen.add(signal.id);if(seen.size>4000)seen.delete(seen.values().next().value!);
  }
  async function pollSignals(){
    const call=state.call;if(!state.joined||!call||call.topology!=='mesh')return;
    const epoch=generation,query=new URLSearchParams({limit:'600'});
    if(signalSince)query.set('since',signalSince);
    const payload=await request(`${path(call.id)}/signals?${query}`);
    if(!current(epoch)||!state.joined)return;
    if(!Array.isArray(payload.signals))throw Error('Receiz returned invalid call signals.');
    for(const value of payload.signals){
      if(!object(value)||typeof value.id!=='string'||!object(value.payload))continue;
      await handleSignal(value as unknown as CallSignal);
      if(!current(epoch)||!state.joined)return;
    }
    // Retain a one-millisecond overlap: host pagination uses strict timestamp >.
    // IDs deduplicate the boundary rather than dropping equal-time signals.
    if(typeof payload.lastSignalAt==='string'&&Number.isFinite(Date.parse(payload.lastSignalAt)))signalSince=new Date(Date.parse(payload.lastSignalAt)-1).toISOString();
    if(payload.signals.length===600)throw Error('Call signaling is busy. Leave and rejoin to resynchronize.');
  }
  function acceptCall(call:NativeCallSummary){
    update({call,calls:[call,...state.calls.filter(row=>row.id!==call.id)]});
    if(state.joined&&call.status!=='active'){generation++;cleanup();membershipCallId=null;update({phase:'ended'});return;}
    const own=call.participants.find(p=>p.userId===userId&&p.participantKind==='user'&&p.leftAt===null);
    // The join response carries moderation before local joined state is set.
    // Apply it before any mesh sender or SFU publication receives this source.
    if(own?.mutedByModerator){state.localStream?.getAudioTracks().forEach(track=>{track.enabled=false;});update({micEnabled:false});}
    if(state.joined&&!own){generation++;cleanup();membershipCallId=null;update({phase:'error',error:'Your call membership ended. Join again to continue.'});}

  }
  async function refresh(){
    if(closed||refreshing||leaving)return;refreshing=true;const epoch=generation;
    if(state.phase==='idle')update({phase:'loading'});
    try{
      if(state.joined&&state.call){const result=await request(path(state.call.id));if(!current(epoch))return;acceptCall(readCall(result.call,conversationId));if(state.joined){await syncMesh();await pollSignals();}}
      else{
        const result=options.initialCallId?await request(path(options.initialCallId)):await request(base);
        if(!current(epoch))return;
        const calls=Array.isArray(result.calls)?result.calls.map(row=>readCall(row,conversationId)):[];
        const selected=options.initialCallId?result.call:result.activeCall;
        const call=selected?readCall(selected,conversationId):null;update({calls,call,phase:call&&call.status!=='active'?'ended':'ready',error:null});
      }
    }catch(error){if(current(epoch))update({error:errorText(error),...(!state.joined?{phase:'error' as const}:{})});}
    finally{refreshing=false;}
  }
  async function connectSfu(call:NativeCallSummary,stream:MediaStream,epoch:number){
    const payload=await request(`${path(call.id)}/sfu/session`);if(!current(epoch))return;
    const session=payload.session;if(!object(session)||session.provider!=='livekit'||typeof session.url!=='string'||typeof session.token!=='string'||session.identity!==userId)throw Error('chat_call_sfu_unavailable');
    const client=await runtime.loadSfu();if(!current(epoch))return;
    const next=new client.Room({adaptiveStream:true,dynacast:true});room=next;
    const listen=(name:string,callback:(...args:unknown[])=>void)=>next.on(client.RoomEvent?.[name]??name[0].toLowerCase()+name.slice(1),(...args)=>{if(current(epoch)&&state.joined&&room===next)callback(...args);});
    listen('TrackSubscribed',(track,_publication,participant)=>{
      if(!object(track)||!object(participant)||typeof participant.identity!=='string'||participant.identity===userId)return;
      if(track.mediaStreamTrack)addRemoteTrack(participant.identity,track.mediaStreamTrack as MediaStreamTrack);
    });
    listen('TrackUnsubscribed',(track,_publication,participant)=>{
      if(!object(track)||!object(participant)||typeof participant.identity!=='string')return;
      const stream=remote.get(participant.identity);if(track.mediaStreamTrack)stream?.removeTrack(track.mediaStreamTrack as MediaStreamTrack);if(!stream?.getTracks().length)remote.delete(participant.identity);remoteChanged();
    });
    listen('ParticipantDisconnected',participant=>{if(object(participant)&&typeof participant.identity==='string'){stopStream(remote.get(participant.identity)??null);remote.delete(participant.identity);remoteChanged();}});
    listen('Reconnecting',()=>{roomConnected=false;void reportConnection();});
    listen('Reconnected',()=>{roomConnected=true;void reportConnection();});
    listen('Disconnected',()=>{roomConnected=false;update({phase:'reconnecting',error:'The call media service disconnected. Leave and rejoin to reconnect.'});void reportConnection();});
    await next.connect(session.url,session.token);
    if(!current(epoch)){await next.disconnect();return;}
    for(const track of stream.getTracks()){
      const source=track.kind==='audio'?client.Track?.Source?.Microphone:client.Track?.Source?.Camera;
      await next.localParticipant.publishTrack(track,source?{source}:undefined);
      if(!current(epoch)){await next.disconnect();return;}
    }
    roomConnected=true;await reportConnection();
  }
  async function join(mode:'voice'|'video'){
    if(closed||joining||leaving||state.joined)return;joining=true;const epoch=++generation;update({phase:'joining',error:null});
    let stream:MediaStream|null=null,pendingJoinCallId:string|null=null;
    try{
      stream=await runtime.getUserMedia({audio:true,video:mode==='video'});
      if(!current(epoch)){stopStream(stream);return;}
      update({localStream:stream,micEnabled:stream.getAudioTracks().some(t=>t.enabled),videoEnabled:stream.getVideoTracks().some(t=>t.enabled)});
      let call=state.call?.status==='active'?state.call:null;
      if(!call){
        const result=await request(base,'POST',{mode},null);call=readCall(result.call,conversationId);
        // Receiz creates the host participant with the call itself. A late
        // creation acknowledgement must leave that membership as well.
        if(!current(epoch)){await request(`${path(call.id)}/participants`,'DELETE',undefined,null);return;}
        membershipCallId=call.id;acceptCall(call);
      }
      // Record pending join as well: an aborted response can still have joined on host.
      membershipCallId=call.id;
      const joiningCallId=call.id;pendingJoinCallId=joiningCallId;
      const result=await request(`${path(joiningCallId)}/participants`,'POST',{action:'join',mediaState:mediaState()},null);
      if(!current(epoch))return;
      call=readCall(result.call,conversationId);acceptCall(call);
      if(call.status!=='active')throw Error('chat_call_not_active');
      update({joined:true,phase:'connecting'});
      if(call.topology==='sfu')await connectSfu(call,stream,epoch);
      else{
        const ice=await request('/api/chat/calls/ice');if(!current(epoch))return;
        if(!Array.isArray(ice.iceServers)||!ice.iceServers.length)throw Error('Receiz returned no call connectivity configuration.');
        rtcConfiguration={iceServers:ice.iceServers as RTCIceServer[]};update({iceSource:typeof ice.source==='string'?ice.source:null});
        await syncMesh();await pollSignals();
      }
    }catch(error){
      if(current(epoch)){
        cleanup();try{await leaveMembership();}catch{/* Error below retains the original join failure. */}
        if(current(epoch))update({phase:'error',error:errorText(error)});
      }else stopStream(stream);
    }finally{
      // A host join can land after close's first DELETE even when its response
      // rejects or returns 503. Settle that exact attempted membership again on
      // every stale completion; never resend the join or infer another call ID.
      if(pendingJoinCallId&&!current(epoch)){
        try{await request(`${path(pendingJoinCallId)}/participants`,'DELETE',undefined,null);}
        catch(error){update({error:`Media stopped. Receiz could not confirm leaving: ${errorText(error)}`});}
      }
      joining=false;
    }
  }
  async function leave(){
    if(leaving||closed)return;leaving=true;const epoch=++generation;
    cleanup();update({phase:'leaving',error:null});
    try{const call=await leaveMembership();if(current(epoch))update({...(call?{call}:{}),phase:call?.status==='ended'?'ended':'left'});}
    catch(error){if(current(epoch))update({phase:'left',error:`Media stopped. Receiz could not confirm leaving: ${errorText(error)}`});}
    finally{leaving=false;}
  }
  async function close(){
    if(closed)return;closed=true;generation++;cleanup();update({phase:'left'});lifetime.abort();
    // Cleanup uses its own request, because the in-flight read/join is aborted.
    try{await leaveMembership();}catch(error){update({error:`Media stopped. Receiz could not confirm leaving: ${errorText(error)}`});}
  }
  async function end(){
    if(closed||leaving||!state.call||state.call.viewerPermissions?.canEndCall!==true)return;
    const id=state.call.id,epoch=++generation;leaving=true;cleanup();update({phase:'ending',error:null});
    try{
      const payload=await request(path(id),'PATCH',{action:'end'},null);if(!current(epoch))return;
      const call=readCall(payload.call,conversationId);if(call.status==='active')throw Error('Receiz has not confirmed that the call ended.');
      acceptCall(call);membershipCallId=null;update({phase:'ended',error:null});
    }catch(error){
      try{await leaveMembership();}catch{/* Keep original end error. */}
      if(current(epoch))update({phase:'error',error:`Media stopped. Receiz could not confirm ending: ${errorText(error)}`});
    }finally{leaving=false;}
  }
  async function setMicrophoneEnabled(enabled:boolean){
    if(!state.joined||!state.call)return;
    if(enabled&&state.call.participants.some(p=>p.userId===userId&&p.leftAt===null&&p.mutedByModerator)){update({error:'The call moderator has muted your microphone.'});return;}
    state.localStream?.getAudioTracks().forEach(track=>{track.enabled=enabled;});update({micEnabled:enabled});await reportConnection();
  }
  async function setCameraEnabled(enabled:boolean){
    if(!state.joined||!state.localStream||!state.call||cameraChanging)return;
    const stream=state.localStream,call=state.call,epoch=generation;
    let tracks=stream.getVideoTracks().filter(track=>track.readyState==='live');
    const acquired:MediaStreamTrack[]=[];
    cameraChanging=true;
    try{
      if(enabled&&!tracks.length){
        // This method is called only by the explicit camera control.
        const fresh=await runtime.getUserMedia({audio:false,video:true});
        if(!current(epoch)||!state.joined){stopStream(fresh);return;}
        tracks=fresh.getVideoTracks();acquired.push(...tracks);
        for(const track of fresh.getTracks())if(track.kind!=='video')track.stop();
        if(!tracks.length)throw Error('The requested camera is unavailable.');
        for(const track of tracks){
          stream.addTrack(track);
          if(call.topology==='sfu'){
            if(!room)throw Error('chat_call_sfu_unavailable');
            await room.localParticipant.publishTrack(track);
          }else{
            for(const peer of peers.values())peer.addTrack(track,stream);
          }
        }
        if(!current(epoch)||!state.joined){stopStream(fresh);return;}
        if(call.topology==='mesh'){
          for(const [id,peer] of peers){
            if(peer.signalingState==='stable')await offer(id,peer);
            else pendingNegotiation.add(id);
          }
        }
      }
      if(!current(epoch)||!state.joined)return;
      tracks.forEach(track=>{track.enabled=enabled;});update({videoEnabled:enabled,error:null});await reportConnection();
    }catch(error){
      for(const track of acquired){
        track.stop();stream.removeTrack(track);
        for(const peer of peers.values())for(const sender of peer.getSenders())if(sender.track===track)peer.removeTrack(sender);
        try{void room?.localParticipant.unpublishTrack?.(track,false).catch(()=>{});}catch{/* The stopped source remains private. */}
      }
      if(current(epoch))update({videoEnabled:mediaState().videoEnabled,error:errorText(error)});
    }finally{cameraChanging=false;}
  }
  return {getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},refresh,join,leave,close,end,setMicrophoneEnabled,setCameraEnabled};
}
export type NativeCallController=ReturnType<typeof createNativeCallController>;

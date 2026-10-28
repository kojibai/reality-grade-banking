import{createMeetingEndRecord}from'./meeting-end-record';
import { MeetingVoice } from './MeetingVoice';
import { exitMeeting } from './meeting-exit';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react';
import { Mic, MicOff, Video, VideoOff, MessageCircle, Sparkles, Users, FileCheck, PhoneOff, X, ArrowUp, Copy, Check, Maximize, EyeOff, PinOff, Download, CalendarDays, Disc, MonitorUp } from 'lucide-react';
import type { JoinedMeeting } from '../../receiz/meeting-session';
import type { NativeTwinAsk } from '../../receiz/native-twin';
import type { ChatPage } from '../../receiz/native-messaging';
import { createMeetingCapture, type MeetingCapture } from '../../receiz/meeting-capture';
import { CameraTile, MeetingAudio, type Feed } from './MeetingMedia';
import { useSpeaker } from './useSpeaker';
import { startMeetingRecording } from './recording';
import { useMeetingCaptions } from './captions';
interface TwinTurn {
    id: string;
    question: string;
    message: string;
    working: boolean;
    private: boolean;
    error?: string;
    receipts?: {
        title: string;
        summary: string;
    }[];
}
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Please try again.';
export function MeetingRoom({ room, path, onRejoin }: {
    room: JoinedMeeting;
    path: string;
    onRejoin(video: boolean): void;
}) {
    const state = useSyncExternalStore(room.controller.subscribe, room.controller.getSnapshot, room.controller.getSnapshot), [panel, setPanel] = useState<'chat' | 'twin' | 'people' | 'record' | null>(null), [clear, setClear] = useState(false), [pin, setPin] = useState<string | null>(null), [chat, setChat] = useState<ChatPage | null>(() => room.messaging.knownMessages(room.conversationId)), [draft, setDraft] = useState(''), [sending, setSending] = useState(false), [error, setError] = useState(''), [copied, setCopied] = useState(false), [turns, setTurns] = useState<TwinTurn[]>([]), [twinDraft, setTwinDraft] = useState(''), [working, setWorking] = useState(false), [privateTwin, setPrivateTwin] = useState(false), [recording, setRecording] = useState(false), [recordBusy, setRecordBusy] = useState(false), [sealBusy, setSealBusy] = useState(false), [proof, setProof] = useState<File | null>(null), [savedCapture, setSavedCapture] = useState(false),[storedProof,setStoredProof]=useState(false);
    const captureReady=useRef<Promise<MeetingCapture>|null>(null),captureFinalizing=useRef<Promise<void>|null>(null),sealTask=useRef<Promise<void>|null>(null),endRecorder=useRef<ReturnType<typeof createMeetingEndRecord>|null>(null),initialCallStatus=useRef(state.call?.status),finalRecordCall=useRef<string|null>(null);
    const joinedAt = useRef(Date.now()), twinAudio = useRef<MediaStream | null>(null);
    const recordingRef = useRef<Awaited<ReturnType<typeof startMeetingRecording>> | null>(null), capture = useRef<MeetingCapture | null>(null), feedsRef = useRef<Feed[]>([]), turnsRef = useRef<TwinTurn[]>([]), alive = useRef(true), chatEnd = useRef<HTMLDivElement>(null), twinEnd = useRef<HTMLDivElement>(null), root = useRef<HTMLElement>(null), lastFrameEvents = useRef<{
        at: string;
        state: string;
    }[]>([]), recordAck = useRef(0), recordRun = useRef(''), recordLock = useRef(false), sealLock = useRef(false), sendLock = useRef(false), twinLock = useRef(false);
    turnsRef.current = turns;
    function getCapture():Promise<MeetingCapture>{if(capture.current)return Promise.resolve(capture.current);if(captureReady.current)return captureReady.current;const task=(async()=>{if(!room.identity.meetingArchive)throw Error('Meeting record custody is unavailable.');const source=createMeetingCapture(room.conversationId,await room.identity.meetingArchive());await source.read();capture.current=source;return source;})();captureReady.current=task;void task.catch(()=>{if(captureReady.current===task)captureReady.current=null;});return task;}

    useEffect(()=>{const sync=()=>{const viewport=window.visualViewport;if(root.current){root.current.style.height=(viewport?.height??window.innerHeight)+'px';root.current.style.top=(viewport?.offsetTop??0)+'px';root.current.style.bottom='auto';}};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setPanel(null);setClear(false);}};sync();window.addEventListener('resize',sync);window.visualViewport?.addEventListener('resize',sync);window.visualViewport?.addEventListener('scroll',sync);window.addEventListener('keydown',escape);return()=>{window.removeEventListener('resize',sync);window.visualViewport?.removeEventListener('resize',sync);window.visualViewport?.removeEventListener('scroll',sync);window.removeEventListener('keydown',escape);};},[]);
    const feeds = useMemo<Feed[]>(() => { const current = state.call?.participants.filter(p => !p.leftAt && p.userId !== room.viewerId) ?? []; return [{ id: room.viewerId, name: state.call?.participants.find(p=>p.userId===room.viewerId&&!p.leftAt)?.displayName??(room.isHost ? room.meeting.host.displayName : 'You'), stream: state.localStream, self: true, muted: !state.micEnabled }, ...current.map(p => ({ id: p.userId!, name: p.displayName, stream: state.remoteStreams.find(s => s.userId === p.userId)?.stream ?? null, muted: p.mediaState.audioEnabled === false }))]; }, [state.localStream, state.remoteStreams, state.call?.participants, state.micEnabled, room]);
    feedsRef.current = feeds;
    const audioFeeds = useMemo(() => feeds.filter((f): f is Feed & {
        stream: MediaStream;
    } => !!f.stream).map(f => ({ id: f.id, stream: f.stream })), [feeds]), speaker = useSpeaker(audioFeeds, state.joined && feeds.length > 2 && state.call?.topology==='mesh'), main = pin && feeds.some(f => f.id === pin) ? pin : feeds.length > 2 && (state.activeSpeakerId??speaker) ? (state.activeSpeakerId??speaker) : feeds.find(f => !f.self)?.id ?? room.viewerId, stage = feeds.find(f => f.id === main) ?? feeds[0], floating = feeds.filter(f => f.id !== stage.id), ended = state.call?.status !== 'active';
    useEffect(() => { void room.calendarSaved?.catch(() => { if (alive.current)
        setError('You’re in the meeting. Your calendar copy could not be confirmed yet; the invitation link is still here.'); }); }, [room]);
    const recordingActive = recording || state.call?.meetingRecording?.active === true;
    useMeetingCaptions({ enabled: state.joined && recordingActive, microphone: state.micEnabled, callId: state.call?.id ?? '', conversationId: room.conversationId, request: room.messaging.callTransport.heldFetch, onFailure: message => { if (alive.current)
            setError(message); } });
    useEffect(() => { alive.current = true; let reading = false,first=true,refreshAgain=false; const refresh = async () => {if(!alive.current||document.hidden)return;if(reading){refreshAgain=true;return;} reading = true; try {
        const current=room.controller.getSnapshot(),refreshCall=current.joined||!first&&!['joining','ending','leaving'].includes(current.phase);first=false;await Promise.all([refreshCall?room.controller.refresh():Promise.resolve(), room.messaging.messages(room.conversationId).then(page => { if (alive.current)
                setChat(page); })]);
    }
    catch (cause) {
        if (alive.current)
            setError(errorText(cause));
    }
    finally {
        reading = false;if(refreshAgain){refreshAgain=false;void refresh();}
    } }; void refresh(); const unsubscribeActivity=room.controller.subscribeActivity(()=>void refresh());const timer = setInterval(() => void refresh(), 3000); const visible = () => { if (document.hidden && recordingRef.current)
        void stopRecording().catch(cause => { if (alive.current)
            setError(errorText(cause)); }); lastFrameEvents.current.push({ at: new Date().toISOString(), state: document.visibilityState }); if (!document.hidden)
        void refresh(); }; document.addEventListener('visibilitychange', visible); return () => { alive.current = false; clearInterval(timer);unsubscribeActivity(); document.removeEventListener('visibilitychange', visible); void recordingRef.current?.stop().catch(() => { }); void room.controller.close(); }; }, [room]);
    useEffect(() => { if (panel === 'chat')
        chatEnd.current?.scrollIntoView({ block: 'nearest' }); }, [chat?.messages.length, panel]);
    useEffect(() => { if (panel === 'twin')
        twinEnd.current?.scrollIntoView({ block: 'nearest' }); }, [turns, panel]);
    useEffect(()=>{let live=true;void getCapture().then(source=>{if(live){setSavedCapture(!!source.known()?.runs.some(run=>run.chunks.length));setStoredProof(!!source.known()?.proofs?.length);}}).catch(()=>{});return()=>{live=false;};},[room]);
    const announceRecording = async (active: boolean) => { const response = await room.messaging.callTransport.heldFetch(path + '/recording', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callId: state.call?.id, runId: recordRun.current, active }) }); if (!response.ok)
        throw Error('The room could not confirm recording status.'); if (active)
        recordAck.current = Date.now(); };
    const stopRecording=():Promise<void>=>{if(captureFinalizing.current)return captureFinalizing.current;const current=recordingRef.current;if(!current)return Promise.resolve();recordingRef.current=null;setRecording(false);setRecordBusy(true);const task=(async()=>{try{await current.stop();if(alive.current)setSavedCapture(true);}finally{await announceRecording(false);}})().finally(()=>{if(captureFinalizing.current===task)captureFinalizing.current=null;if(alive.current)setRecordBusy(false);});captureFinalizing.current=task;return task;};
    useEffect(() => { if (!recording)
        return; const timer = setInterval(() => { void announceRecording(true).catch(cause => { void stopRecording().catch(() => { }); if (alive.current)
        setError(errorText(cause)); }); }, 15000); const watchdog = setInterval(() => { if (Date.now() - recordAck.current > 30000)
        void stopRecording().catch(cause => { if (alive.current)
            setError(errorText(cause)); }); }, 1000); return () => { clearInterval(timer); clearInterval(watchdog); }; }, [recording, state.call?.id]);
    useEffect(() => { if (ended && recordingRef.current)
        void stopRecording().catch(cause => { if (alive.current)
            setError(errorText(cause)); }); }, [ended]);
    const toggleRecord = async () => { if (recordLock.current)
        return; recordLock.current = true; setRecordBusy(true); setError(''); try {
        if (recordingRef.current)
            await stopRecording();
        else {
            capture.current=await getCapture();
            recordingRef.current = await startMeetingRecording({ capture: capture.current, feeds: () => feedsRef.current.filter((f): f is Feed & {
                    stream: MediaStream;
                } => !!f.stream).map(f => ({ id: f.id, name: f.name, stream: f.stream })).concat(twinAudio.current ? [{ id: 'meeting-twin-audio', name: room.meeting.host.displayName + '’s Twin', stream: twinAudio.current }] : []), onFailure: cause => { void stopRecording().catch(() => { }); if (alive.current)
                    setError(errorText(cause)); } });
            recordRun.current = capture.current.known()!.runs.at(-1)!.id;
            try {
                await announceRecording(true);
            }
            catch (cause) {
                await recordingRef.current.stop();
                recordingRef.current = null;
                throw cause;
            }
            setRecording(true);
            setSavedCapture(true);
        }
    }
    catch (cause) {
        setError(errorText(cause));
    }
    finally {
        recordLock.current = false;
        setRecordBusy(false);
    } };
    const send = async (event: FormEvent) => { event.preventDefault(); const body = draft.trim(); if (!body || sendLock.current)
        return; sendLock.current = true; setSending(true); setError(''); try {
        await room.messaging.send(room.conversationId, body);room.controller.notifyActivity();
        setDraft('');
        setChat(room.messaging.knownMessages(room.conversationId));
    }
    catch (cause) {
        setError(errorText(cause));
    }
    finally {
        sendLock.current = false;
        setSending(false);
    } };
    const ask = async (question: string, privateOnly = privateTwin) => {
        if (!question.trim() || twinLock.current)
            return;
        twinLock.current = true;
        setWorking(true);
        setTwinDraft('');
        setPanel('twin');
        setPrivateTwin(room.isHost && privateOnly);
        const id = crypto.randomUUID();
        let deltaText = '';
        setTurns(rows => [...rows, { id, question, message: '', working: true, private: room.isHost && privateOnly }]);
        const patch = (value: Partial<TwinTurn>) => { if (alive.current)
            setTurns(rows => rows.map(row => row.id === id ? { ...row, ...value } : row)); };
        try {
            if (room.isHost && privateOnly) {
                const coordinate = path.split('/'), input: NativeTwinAsk = { message: question, requestId: id, quoteExpiresAt: new Date(Date.now() + 300000).toISOString(), threadKey: `api:${room.viewerId}:${room.conversationId}`, meeting: { eventId: room.conversationId, key: coordinate.at(-1)! }, businessSetup: true, organizerTools: true, onDelta: delta => patch({ message: deltaText += delta }) };
                const reply = await room.messaging.twin.ask(input);
                patch({ message: reply.message });
                if (reply.businessActions?.length) {
                    const [{ createOwnerToolConversation }, { executeOrganizerTwinAction }, api] = await Promise.all([import('../../receiz/owner-tool-conversation'), import('../../receiz/organizer-twin'), room.identity.organizer!()]);
                    const task = createOwnerToolConversation({ accountUid: room.viewerId, question: input, ask: next => room.messaging.twin.ask(next), assertOpen: () => { if (!alive.current)
                            throw Error('MEETING_CLOSED'); }, onReply: next => patch({ message: next.message }), onReceipts: receipts => patch({ receipts }), execute: async (operation, actions) => { const receipts = []; for (const action of actions) {
                            if (!/^business_(?:find_contacts|save_contact|read_calendar|create_appointment|update_appointment|cancel_appointment|booking_link|read_availability|update_availability)$/.test(action.tool))
                                throw Error('This action needs your main account.');
                            const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(operation))), hex = [...bytes].slice(0, 16).map(v => v.toString(16).padStart(2, '0')).join(''), requestId = hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-4' + hex.slice(13, 16) + '-a' + hex.slice(17, 20) + '-' + hex.slice(20, 32);
                            const scoped = { ...api, saveEvent: (input: Parameters<typeof api.saveEvent>[0], eventId?: string, expected?: Parameters<typeof api.saveEvent>[2]) => api.saveEvent({ ...input, ...(!eventId ? { meeting: true, meetingRequestId: requestId, attendees: input.attendees?.length ? input.attendees : room.attendees, note: [input.note, `Follow-up to ${room.meeting.title}. ${room.meeting.url}`].filter(Boolean).join('\n'), metadata: { ...input.metadata, followUpOf: room.conversationId } } : {}) }, eventId, expected) };
                            const result = await executeOrganizerTwinAction(scoped, action.tool, action.args, room.meeting.host.username), eventId = typeof result === 'object' && result && 'event' in result ? (result.event as {
                                id: string;
                            }).id : null, invitation = eventId ? api.invitationResult(eventId) : null;
                            receipts.push({ id: operation, tool: action.tool, status: 'accepted' as const, title: action.tool === 'business_create_appointment' ? 'Follow-up scheduled' : action.tool === 'business_save_contact' ? 'Contact saved' : /update|cancel/.test(action.tool) ? 'Calendar updated' : 'Records checked', summary: /create|save|update|cancel/.test(action.tool) ? 'Saved to your existing account.' : 'From your current records.', details: JSON.stringify({ result, invitation }) });
                        } return receipts; } });
                    await task.start(reply);
                }
            }
            else {
                await room.messaging.send(room.conversationId, question);room.controller.notifyActivity();
                setChat(room.messaging.knownMessages(room.conversationId));
                const response = await room.messaging.callTransport.heldFetch(path + '/twin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: question, requestId: id, quoteExpiresAt: new Date(Date.now() + 300000).toISOString(), clientAssistantMessageId: crypto.randomUUID(), clientUserMessageId: crypto.randomUUID(), deliveryMode: 'embodied', allowBrowserVoiceFallback: false,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone }) });
                await readGuestReply(response, delta => patch({ message: deltaText += delta }), message => patch({ message }));room.controller.notifyActivity();setChat(await room.messaging.messages(room.conversationId));
            }
        }
        catch (cause) {
            patch({ error: errorText(cause) });
        }
        finally {
            patch({ working: false });
            twinLock.current = false;
            setWorking(false);
        }
    };
    const runSeal = async (autoDownload = true) => { if (sealLock.current)
        return; sealLock.current = true; setSealBusy(true); setError(''); try {
        if (recordingRef.current)
            await stopRecording().catch(()=>{});
        await captureFinalizing.current?.catch(()=>{});
        if (!capture.current) {
            if (!room.identity.meetingArchive)
                throw Error('Meeting record custody is unavailable.');
            capture.current = await getCapture();
        }
        const response = await room.messaging.callTransport.heldFetch(path + '/evidence'), source = await response.json();
        if (!response.ok || !source.ok)
            throw Error('Meeting evidence could not be collected. Captured media is retained.');
        const file = await capture.current.seal({ ...source, deviceVisibility: lastFrameEvents.current }, turnsRef.current.filter(row => !row.private).map(row => ({ ...row, authority: 'generated-interpretation' })));
        setProof(file);setStoredProof(true);if(['ended','archived'].includes(source.artifact?.call?.status))finalRecordCall.current=state.call?.id??null;
        if (autoDownload)
            download(file);
    }
    catch (cause) {
        setError(errorText(cause));
    }
    finally {
        sealLock.current = false;
        setSealBusy(false);
    } };
    const seal=(autoDownload=true)=>{if(sealTask.current)return sealTask.current;const task=runSeal(autoDownload).finally(()=>{if(sealTask.current===task)sealTask.current=null;});sealTask.current=task;return task;};
    if(!endRecorder.current)endRecorder.current=createMeetingEndRecord({prepare:async()=>{await stopRecording().catch(()=>{});await getCapture();await sealTask.current;},hasFinalRecord:()=>finalRecordCall.current===room.controller.getSnapshot().call?.id||(initialCallStatus.current!=='active'&&!!capture.current?.known()?.proofs?.some(proof=>!!proof.call&&proof.call.id===room.controller.getSnapshot().call?.id&&['ended','archived'].includes(proof.call.status))),record:()=>seal(false)});
    useEffect(()=>{const job=endRecorder.current?.(state.call);void job?.catch(cause=>{if(alive.current)setError(errorText(cause));});},[state.call?.id,state.call?.status]);
    const finish = async (end: boolean) => { setError(''); const failures = await exitMeeting({ stopCapture: async () => { if (recordingRef.current)
            await stopRecording(); }, depart: () => end ? room.controller.end() : room.controller.leave() }); if (failures.length)
        setError('Camera and microphone stopped. ' + failures.map(errorText).join(' '));
    setPanel('twin'); if (room.isHost)
        void ask('Help us wrap up this meeting. Read the meeting context, summarize decisions and unfinished questions, and ask whether and when a follow-up would help. Do not schedule anything until I agree to the time and people.', true); };
    const copy = async () => { try {
        await navigator.clipboard.writeText(room.meeting.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
    }
    catch {
        setError('Copy this meeting link from your browser address bar.');
    } };
    return <main className={`meeting-room ${clear ? 'is-clear' : ''}`} ref={root} aria-label={room.meeting.title}>
  <div className="meeting-stage">{stage && <CameraTile key={stage.id} feed={stage} stage onStage={() => setPin(stage.id)} index={0}/>}<div className="meeting-floating-cameras">{floating.map((feed, index) => <CameraTile key={feed.id} feed={feed} stage={false} onStage={() => setPin(feed.id)} index={index}/>)}</div></div>
  <MeetingVoice messages={chat?.messages ?? []} since={joinedAt.current} onAudio={stream => { twinAudio.current = stream; }}/>{state.remoteStreams.map(feed => <MeetingAudio key={feed.userId} stream={feed.stream}/>)}
  <header className="meeting-top"><a href="/" className="meeting-logo" aria-label="Bankeiz home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m3 8 9-5 9 5H3m2 3v8m5-8v8m4-8v8m5-8v8M2 22h20"/></svg></a><div><h1>{room.meeting.title}</h1><p><span className={`meeting-status-dot ${state.phase === 'connected' ? 'is-connected' : ''}`}/>{state.phase === 'waiting' ? 'Waiting for others' : state.phase === 'connected' ? 'Together' : state.phase === 'joining' ? 'Connecting your camera' : ended ? 'Meeting ended' : state.phase === 'left' ? 'You left the meeting' : state.phase === 'ready' ? 'Ready to join' : state.phase === 'error' ? 'Connection needs attention' : 'Connecting'}{recordingActive && <span className="meeting-recording-indicator"><i />{!recording && Date.parse(state.call?.meetingRecording?.expiresAt ?? '') < Date.now() ? 'Recording status reconnecting' : 'Recording'}</span>}</p></div><button title="Copy meeting link" aria-label="Copy meeting link" onClick={() => void copy()}>{copied ? <Check size={18}/> : <Copy size={18}/>}</button></header>
  {pin && <button className="meeting-follow-speaker" onClick={() => setPin(null)}><PinOff size={13}/>Follow speaker</button>}
  {(error || state.error) && <div className="meeting-notice" role="alert"><span>{error || state.error}</span><button aria-label="Dismiss notice" onClick={() => setError('')}><X size={15}/></button></div>}
  {(!state.joined && !['joining', 'connecting', 'ending', 'leaving'].includes(state.phase)) && <div className="meeting-rejoin">{ended ? <><h2>Your conversation stays with you.</h2><p>Review the chat, keep your record, or plan the next step.</p></> : <><h2>Come back when you’re ready.</h2><button className="meeting-join" onClick={() => onRejoin(true)}><Video size={18}/>Rejoin meeting</button><button className="meeting-lobby-audio" onClick={()=>onRejoin(false)}><Mic size={15}/>Join with audio</button></>}</div>}
  {panel && <section className="meeting-overlay" aria-label={panel === 'twin' ? 'Meeting Twin' : panel === 'chat' ? 'Meeting chat' : panel === 'people' ? 'People' : 'Meeting record'}><div className="meeting-overlay-tabs">{([['chat', 'Chat', MessageCircle], ['twin', 'Twin', Sparkles], ['people', 'People', Users], ['record', 'Record', FileCheck]] as const).map(([id, label, Icon]) => <button key={id} className={panel === id ? 'active' : ''} onClick={() => setPanel(id)}><Icon size={14}/>{label}</button>)}<button aria-label="Close panel" className="meeting-close-overlay" onClick={() => setPanel(null)}><X size={18}/></button></div>
   {panel === 'chat' ? <><div className="meeting-conversation">{chat?.hasMore && <button className="meeting-load-older" onClick={() => void room.messaging.messages(room.conversationId, chat.nextCursor ?? undefined).then(setChat).catch(cause => setError(errorText(cause)))}>Earlier messages</button>}{!chat?.messages.length && <div className="meeting-empty"><MessageCircle size={24}/><h3>Keep it in the conversation.</h3><p>Messages stay with this meeting.</p></div>}{chat?.messages.map(message => <article className={`meeting-bubble ${message.senderUserId === room.viewerId ? 'is-you' : ''}`} key={message.id}><small>{message.walletTransfer?.kind === 'bankeiz.meeting.twin' ? String(message.walletTransfer.displayName) : message.senderUserId === room.viewerId ? 'You' : message.senderDisplay || chat.conversation.members.find(p => p.userId === message.senderUserId)?.displayName || 'Participant'} · {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small><p>{message.body}</p></article>)}<div ref={chatEnd}/></div><form className="meeting-composer" onSubmit={send}><textarea aria-label="Message everyone" placeholder="Message everyone…" value={draft} onChange={event => setDraft(event.target.value)} rows={1} maxLength={16000} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
        } }}/><button disabled={sending || !draft.trim()} aria-label="Send message">{sending ? <span className="meeting-working"><i /><i /><i /></span> : <ArrowUp size={20}/>}</button></form></> : panel === 'twin' ? <><div className="meeting-conversation"><div className="meeting-twin-intro"><Sparkles size={23}/><h3>{room.meeting.host.displayName}’s Twin.</h3><p>{room.isHost && privateTwin ? 'Your private context, decisions and next steps.' : 'The real Twin, here with everyone in the meeting.'}</p><small>{room.isHost && privateTwin ? 'Private to you · kept out of the shared meeting record' : 'Everyone here can see and hear these replies.'}</small>{room.isHost && <button className="meeting-twin-mode" type="button" onClick={() => setPrivateTwin(v => !v)}>{privateTwin ? 'Bring the Twin into the room' : 'Use my private context'}</button>}</div>{turns.map(turn => <div key={turn.id}><article className="meeting-bubble is-you"><p>{turn.question}</p></article><article className="meeting-bubble is-twin"><small><Sparkles size={11}/>{turn.private ? 'Twin · Private' : 'Twin · Shared with the meeting'}</small>{turn.message ? <p>{turn.message}</p> : turn.working ? <span className="meeting-working"><i /><i /><i /></span> : null}{turn.receipts?.map((receipt, index) => <div key={index} className="meeting-action-receipt"><Check size={14}/><span><strong>{receipt.title}</strong><small>{receipt.summary}</small></span></div>)}{turn.error && <p className="meeting-inline-error">{turn.error}</p>}</article></div>)}<div ref={twinEnd}/></div><form className="meeting-composer" onSubmit={event => { event.preventDefault(); void ask(twinDraft); }}><textarea aria-label="Ask the Twin" placeholder="Ask the Twin…" value={twinDraft} onChange={event => setTwinDraft(event.target.value)} rows={1} maxLength={1200}/><button disabled={working || !twinDraft.trim()} aria-label="Send to Twin">{working ? <span className="meeting-working"><i /><i /><i /></span> : <ArrowUp size={20}/>}</button></form></> : panel === 'people' ? <div className="meeting-panel-content"><h2>Here, together.</h2>{feeds.map(feed => <button className="meeting-person" key={feed.id} onClick={() => { setPin(feed.id); setPanel(null); }}><span className="meeting-person-avatar">{feed.name[0]}</span><span><strong>{feed.name}</strong><small>{feed.self ? 'You' : feed.stream ? 'Media connected' : 'Connecting media'}</small></span>{feed.muted && <MicOff size={15}/>}</button>)}<button className="meeting-panel-action" onClick={() => void copy()}>{copied ? <Check size={16}/> : <Copy size={16}/>}Invite with this link</button><p className="meeting-fine">Anyone you share this invitation with can join this meeting with their own identity.</p></div> : <div className="meeting-panel-content"><FileCheck className="meeting-record-glyph" size={40}/><p className="meeting-eyebrow">Keep what happened.</p><h2>Your meeting.<br />Its own proof.</h2><p>{savedCapture ? 'Captured audio and video, messages and the meeting’s history. Sealed together under your identity.' : 'Keep the conversation and its history as your own proof object.'}</p>{room.isHost && room.meeting.recording && <button className={`meeting-panel-action ${recording ? 'is-recording' : ''}`} disabled={recordBusy || !state.joined} onClick={() => void toggleRecord()}><Disc size={18}/>{recordBusy ? 'Preparing recording…' : recording ? 'Stop recording' : 'Start recording'}</button>}{<button className="meeting-panel-action is-primary" disabled={sealBusy || recordBusy} onClick={() => void seal()}><FileCheck size={18}/>{sealBusy ? 'Sealing your meeting…' : savedCapture ? 'Seal & download meeting' : 'Seal meeting history'}</button>}{(proof||storedProof) && <button className="meeting-panel-action" onClick={() => {if(proof)download(proof);else void capture.current?.latestProof().then(file=>{if(file)download(file);}).catch(cause=>setError(errorText(cause)));}}><Download size={17}/>Download your proof object</button>}<p className="meeting-fine">{recording ? 'Recording is active. Keep this tab open.' : 'Recording starts only when the host chooses it.'} Captured files stay encrypted on the recording device. Generated notes are marked separately.</p>{room.isHost && <button className="meeting-panel-action" disabled={working} onClick={() => void ask('Read the meeting context. What did we agree on, what still needs an answer, and should we plan a follow-up? Ask me for the time if it would help; do not book anything until I agree.')}><CalendarDays size={17}/>Find the next step</button>}</div>}
  </section>}
  {!clear && <nav className="meeting-controls" aria-label="Meeting controls"><button disabled={!state.joined} className={!state.micEnabled ? 'is-off' : ''} onClick={() => void room.controller.setMicrophoneEnabled(!state.micEnabled)} aria-label={state.micEnabled ? 'Mute microphone' : 'Unmute microphone'}>{state.micEnabled ? <Mic /> : <MicOff />}<small>Mic</small></button><button disabled={!state.joined || state.screenSharing} className={!state.videoEnabled ? 'is-off' : ''} onClick={() => void room.controller.setCameraEnabled(!state.videoEnabled)} aria-label={state.videoEnabled ? 'Turn camera off' : 'Turn camera on'}>{state.videoEnabled ? <Video /> : <VideoOff />}<small>{state.screenSharing ? 'Sharing' : 'Camera'}</small></button><span className="meeting-control-divider"/><button className={panel === 'chat' ? 'active' : ''} onClick={() => setPanel(panel === 'chat' ? null : 'chat')}><MessageCircle /><small>Chat</small></button>{room.meeting.twin && <button className={panel === 'twin' ? 'active' : ''} onClick={() => setPanel(panel === 'twin' ? null : 'twin')}><Sparkles /><small>Twin</small></button>}<button className="meeting-desktop-control" onClick={() => setPanel(panel === 'people' ? null : 'people')}><Users /><small>People</small></button><button className="meeting-desktop-control" onClick={() => setPanel(panel === 'record' ? null : 'record')}><FileCheck /><small>Record</small></button><button className="meeting-desktop-control" disabled={!state.joined || state.call?.viewerPermissions.canShareScreen===false || !navigator.mediaDevices?.getDisplayMedia} onClick={() => { if (state.screenSharing)
        void room.controller.setScreenShare(null).catch(cause => setError(errorText(cause)));
    else
        void navigator.mediaDevices.getDisplayMedia({ video: true, audio: false }).then(stream => room.controller.setScreenShare(stream)).catch(cause => setError(errorText(cause))); }}><MonitorUp /><small>{state.screenSharing ? 'Stop share' : 'Share'}</small></button><button className="meeting-desktop-control" onClick={() => void root.current?.requestFullscreen?.().catch(() => { })}><Maximize /><small>Full view</small></button><button className="meeting-desktop-control" onClick={() => setClear(true)}><EyeOff /><small>Clear</small></button><button className="meeting-leave" onClick={() => void finish(room.isHost)}><PhoneOff /><small>{room.isHost ? 'End' : 'Leave'}</small></button></nav>}
  {clear && <button className="meeting-show-controls" onClick={() => setClear(false)}><Maximize size={17}/>Show controls</button>}{!panel&&<button className="meeting-mobile-record" aria-label="Meeting record and people" onClick={() => setPanel(panel ? null : 'record')}><FileCheck size={19}/></button>}
 </main>;
}
function download(file: File) { const url = URL.createObjectURL(file), link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
async function readGuestReply(response: Response, onDelta: (delta: string) => void, onReply: (message: string) => void) { if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    throw Error(data?.error || 'The Twin could not reply.');
} const reader = response.body.getReader(), decoder = new TextDecoder(); let pending = '', accepted = false; try {
    for (;;) {
        const part = await reader.read();
        if (part.done)
            break;
        pending = (pending + decoder.decode(part.value, { stream: true })).replace(/\r\n/g, '\n');
        let end;
        while ((end = pending.indexOf('\n\n')) >= 0) {
            const block = pending.slice(0, end);
            pending = pending.slice(end + 2);
            const raw = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n');
            if (!raw)
                continue;
            const data = JSON.parse(raw);
            if (data.type === 'reply_delta')
                onDelta(data.delta);
            if (data.type === 'reply_done') {
                if (typeof data.reply?.message !== 'string')
                    throw Error('The Twin reply was not confirmed.');
                onReply(data.reply.message);
                accepted = true;
            }
            if (data.type === 'error')
                throw Error(data.error || 'The Twin could not reply.');
        }
    }
    if (!accepted)
        throw Error('The Twin reply was not confirmed. You can keep talking.');
}
finally {
    reader.releaseLock();
} }

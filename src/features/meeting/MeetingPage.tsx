import {lazy,Suspense} from 'react';
import {MeetingPaymentRequired} from '../../receiz/meeting-session';
import {InlineOpening} from '../../components/InlineOpening';
import {formatMoney} from '../../core/money';
const Payment=lazy(()=>import('../../checkout/HostedCheckout').then(module=>({default:module.HostedCheckout})));
import {MeetingIdentity} from './MeetingIdentity';
import { useEffect, useState, useRef } from 'react';
import { Video, ArrowUpRight, ShieldCheck, Mic } from 'lucide-react';
import type { MeetingSession, MeetingView, JoinedMeeting } from '../../receiz/meeting-session';
import { MeetingRoom } from './MeetingRoom';
export function MeetingPage({ service, autoJoin=false }: {
    service: MeetingSession; autoJoin?:boolean;
}) {
    const [payment,setPayment]=useState<ReturnType<MeetingSession['paymentCheckout']>|null>(null);
    const [meeting, setMeeting] = useState<MeetingView | null>(service.known), [joined, setJoined] = useState<JoinedMeeting | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [identityBusy,setIdentityBusy]=useState(false),[identityRevision,setIdentityRevision]=useState(0);
    useEffect(() => { let live = true; void service.read().then(value => { if (live)
        setMeeting(value); }).catch(() => { if (live)
        setError('This invitation could not be opened. Check the link with your host.'); }); return () => { live = false; }; }, [service]);
    const join = async (video: boolean, acceptedIdentity=false) => { if (busy || identityBusy&&!acceptedIdentity)
        return; setBusy(true); setError(''); try {
        const next = await service.join();
        setJoined(next);
        if (next.controller.getSnapshot().call?.status === 'active')
            await next.controller.join(video ? 'video' : 'voice');
    }
    catch (cause) {
        if(cause instanceof MeetingPaymentRequired){setPayment(service.paymentCheckout());return;}
        setError(cause instanceof Error ? cause.message==='MEETING_PAYMENT_MISMATCH'?'Refresh this invitation to review its current payment details.':cause.message : 'The meeting could not be joined. Please try again.');
    }
    finally {
        setBusy(false);
    } };
    const recovered=async()=>{setIdentityBusy(false);setJoined(null);setIdentityRevision(value=>value+1);await join(true,true);};
    const enterRef=useRef(join);enterRef.current=join;
    useEffect(()=>{if(autoJoin)void enterRef.current(true,true);},[autoJoin,service]);
    if(payment&&!joined)return <><Suspense fallback={<main className="meeting-lobby"><InlineOpening label="Preparing appointment payment"/></main>}><Payment {...payment} onPaid={()=>void join(true)}/></Suspense>{error&&<div className="meeting-payment-return"><p role="alert">{error}</p><button className="meeting-join" disabled={busy} onClick={()=>void join(true)}>Join meeting</button></div>}</>;
    if (joined)
        return <MeetingRoom key={joined.viewerId+':'+identityRevision} room={joined} entry={service} onIdentityReady={recovered} path={service.path} onRejoin={video => void join(video)}/>;
    return <main className="meeting-lobby"><a className="meeting-wordmark" href="/" aria-label="Bankeiz home"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m3 8 9-5 9 5H3m2 3v8m5-8v8m4-8v8m5-8v8M2 22h20M3 19h18"/></svg></a><div className="meeting-lobby-orbit" aria-hidden="true"><span /><span /><span /><Video size={42}/></div><section><p className="meeting-eyebrow">A little time. Together.</p><h1>{meeting?.title ?? 'Your meeting.'}</h1>{meeting && <><p className="meeting-lobby-host">With {meeting.host.displayName}</p><p className="meeting-lobby-time">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(meeting.startAt))}</p>{meeting.priceUsdCents&&<p className="meeting-lobby-time">{formatMoney(meeting.priceUsdCents)} · Per guest</p>}</>}<button className="meeting-join" disabled={!meeting || busy || identityBusy} onClick={() => void join(true)}>{busy ? <span className="meeting-working" aria-label="Preparing your meeting"><i /><i /><i /></span> : <><Video size={20}/>Join meeting<ArrowUpRight size={19}/></>}</button><button className="meeting-lobby-audio" disabled={!meeting || busy || identityBusy} onClick={() => void join(false)}><Mic size={15}/>Join with audio</button><MeetingIdentity service={service} disabled={busy} onBusy={setIdentityBusy} onError={setError} onReady={recovered}/>{error && <p className="meeting-error" role="alert">{error}</p>}<p className="meeting-privacy"><ShieldCheck size={14}/><span>Your own identity. Your conversation.<br />{meeting?.recording ? 'The host can record. The Twin can use shared meeting context.' : ''}</span></p><small className="meeting-consent">Joining uses your Receiz ID or creates one on this device, and adds the meeting to your calendar. Camera and microphone access are yours to allow.</small></section><footer>Reality-grade banking<span>Bankeiz</span></footer></main>;
}

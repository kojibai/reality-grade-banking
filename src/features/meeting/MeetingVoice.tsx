import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { ChatMessage } from '../../receiz/native-messaging';
/** Plays the actual accepted Twin performance on every joined device. The
 * recording device receives this same audio stream, not synthesized captions. */
export function MeetingVoice({ messages, since, onAudio }: {
    messages: ChatMessage[];
    since: number;
    onAudio(stream: MediaStream | null): void;
}) {
    const audio = useRef<HTMLAudioElement>(null), played = useRef(new Set<string>()), queue = useRef<{
        id: string;
        src: string;
    }[]>([]), playing = useRef(false), advance = useRef<() => void>(() => { }), [blocked, setBlocked] = useState(false), context = useRef<AudioContext | null>(null), callback = useRef(onAudio);
    callback.current = onAudio;
    useEffect(() => { const element = audio.current!; let disposed=false, attempt=0; let source: MediaElementAudioSourceNode | null = null, destination: MediaStreamAudioDestinationNode | null = null; const ensure = async () => { if (!context.current) {
        const ctx = new AudioContext();
        context.current = ctx;
        source = ctx.createMediaElementSource(element);
        destination = ctx.createMediaStreamDestination();
        source.connect(ctx.destination);
        source.connect(destination);
        callback.current(destination.stream);
    } await resumeMeetingVoice(context.current,()=>setBlocked(true)); }; advance.current = () => { if (playing.current || !queue.current.length)
        return; const item = queue.current[0]; playing.current = true; element.src = item.src; const current=++attempt; void ensure().then(async()=>{if(disposed||current!==attempt)return;await element.play();if(!disposed&&current===attempt)setBlocked(false);}).catch(() => { if(!disposed&&current===attempt){setBlocked(true); playing.current = false;} }); }; const done = () => { queue.current.shift(); playing.current = false; advance.current(); }; element.addEventListener('ended', done); element.addEventListener('error', done); return () => { disposed=true;attempt++;element.pause(); element.removeAttribute('src'); element.removeEventListener('ended', done); element.removeEventListener('error', done); callback.current(null); source?.disconnect(); destination?.disconnect(); void context.current?.close(); context.current = null; }; }, []);
    useEffect(() => { for (const message of messages) {
        if (Date.parse(message.createdAt) < since || played.current.has(message.id) || message.walletTransfer?.kind !== 'bankeiz.meeting.twin')
            continue;
        played.current.add(message.id);
        const asset = message.walletTransfer.audioAsset as {
            dataUrl?: unknown;
            url?: unknown;
        } | null;
        let src = typeof asset?.dataUrl === 'string' && /^data:audio\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(asset.dataUrl) ? asset.dataUrl : typeof asset?.url === 'string' && /^https:\/\//.test(asset.url) ? asset.url : null;
        if (src)
            queue.current.push({ id: message.id, src });
    } advance.current(); }, [messages, since]);
    return <><audio ref={audio} crossOrigin="anonymous" playsInline/>{blocked && <button className="meeting-audio-unlock" onClick={() => { playing.current = false; advance.current(); }}><Volume2 size={16}/>Hear the Twin</button>}</>;
}

export async function resumeMeetingVoice(context:Pick<AudioContext,'resume'|'state'>,onBlocked:()=>void=()=>{}){if(context.state!=='running')onBlocked();await context.resume();if(context.state!=='running')throw Error('Meeting voice needs a tap to enable audio.');}

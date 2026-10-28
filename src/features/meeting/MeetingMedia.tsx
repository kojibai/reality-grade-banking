import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Expand, Grip, MicOff } from 'lucide-react';
export function MeetingVideo({ stream, self = false }: {
    stream: MediaStream;
    self?: boolean;
}) { const ref = useRef<HTMLVideoElement>(null); useEffect(() => { const video = ref.current; if (!video)
    return; video.srcObject = stream; void video.play().catch(() => { }); return () => { video.srcObject = null; }; }, [stream]); return <video ref={ref} autoPlay playsInline muted className={self ? 'meeting-mirror' : ''}/>; }
export function MeetingAudio({ stream }: {
    stream: MediaStream;
}) { const ref = useRef<HTMLAudioElement>(null), [blocked, setBlocked] = useState(false); useEffect(() => { const audio = ref.current; if (!audio)
    return; audio.srcObject = stream; void audio.play().catch(() => setBlocked(true)); return () => { audio.srcObject = null; }; }, [stream]); return <><audio ref={ref} autoPlay/>{blocked && <button className="meeting-audio-unlock" onClick={() => void ref.current?.play().then(() => setBlocked(false))}>Enable meeting audio</button>}</>; }
export interface Feed {
    id: string;
    name: string;
    stream: MediaStream | null;
    self?: boolean;
    muted?: boolean;
}
export function CameraTile({ feed, stage, onStage, index }: {
    feed: Feed;
    stage: boolean;
    onStage(): void;
    index: number;
}) {
    const ref = useRef<HTMLDivElement>(null), [position, setPosition] = useState<{
        x: number;
        y: number;
    } | null>(null), [dragging, setDragging] = useState(false), drag = useRef<{
        id: number;
        x: number;
        y: number;
        left: number;
        top: number;
        moved: boolean;
    } | null>(null);
    useEffect(() => { const clamp = () => { const room = ref.current?.closest('.meeting-room')?.getBoundingClientRect(), tile = ref.current?.getBoundingClientRect(); if (!room || !tile)
        return; setPosition(value => value ? { x: Math.max(8, Math.min(room.width - tile.width - 8, value.x)), y: Math.max(8, Math.min(room.height - tile.height - 96, value.y)) } : null); }; const observer = new ResizeObserver(clamp); const room = ref.current?.closest('.meeting-room'); if (room)
        observer.observe(room); return () => observer.disconnect(); }, []);
    const move = (event: React.PointerEvent<HTMLButtonElement>) => { const start = drag.current; if (!start || start.id !== event.pointerId || !ref.current)
        return; const box = ref.current.closest('.meeting-room')!.getBoundingClientRect(), rect = ref.current.getBoundingClientRect(), x = Math.max(8, Math.min(box.width - rect.width - 8, start.left + event.clientX - start.x)), y = Math.max(8, Math.min(box.height - rect.height - 96, start.top + event.clientY - start.y)); start.moved = true; setPosition({ x, y }); };
    return <div ref={ref} className={`meeting-feed ${stage ? 'is-stage' : 'is-floating'} ${dragging ? 'is-dragging' : ''}`} style={!stage ? ({ ...position ? { position: 'fixed', left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : { position: 'relative', right: 'auto', top: 'auto', order: index } } as CSSProperties) : undefined}>
  {feed.stream ? <MeetingVideo stream={feed.stream} self={feed.self}/> : <div className="meeting-camera-off"><span>{feed.name.split(' ').map(v => v[0]).join('').slice(0, 2)}</span></div>}
  {!stage && <><button className="meeting-camera-grip" aria-label={`Move ${feed.name} camera`} onPointerDown={event => { const rect = ref.current!.getBoundingClientRect(), box = ref.current!.closest('.meeting-room')!.getBoundingClientRect(); drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left - box.left, top: rect.top - box.top, moved: false }; event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); }} onPointerMove={move} onPointerUp={() => { drag.current = null; setDragging(false); }} onPointerCancel={() => { drag.current = null; setDragging(false); }}><Grip size={18}/></button><button className="meeting-camera-expand" aria-label={`Put ${feed.name} on stage`} onClick={onStage}><Expand size={15}/></button></>}
  <div className="meeting-feed-name">{feed.muted && <MicOff size={12}/>}<span>{feed.name}</span>{feed.self && feed.name!=='You' && <small>You</small>}</div>
 </div>;
}

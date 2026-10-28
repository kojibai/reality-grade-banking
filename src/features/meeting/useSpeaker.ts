import { useEffect, useState } from 'react';
/** Actual audio energy selects the stage. A membership record is never a
 * speaking signal. One bounded analyser loop lives only while room media does. */
export function useSpeaker(feeds: {
    id: string;
    stream: MediaStream;
}[], enabled: boolean) { const [id, setId] = useState<string | null>(null), signature = feeds.map(feed => feed.id + ':' + feed.stream.getAudioTracks().map(track => track.id).join(',')).join('|'); useEffect(() => { if (!enabled || !feeds.length || typeof AudioContext === 'undefined')
    return; const audio = new AudioContext(), nodes = feeds.filter(feed => feed.stream.getAudioTracks().length).map(feed => { const source = audio.createMediaStreamSource(feed.stream), analyser = audio.createAnalyser(); analyser.fftSize = 256; source.connect(analyser); return { id: feed.id, source, analyser, bytes: new Uint8Array(256) }; }); void audio.resume().catch(() => { }); let last = '', lastAt = 0; const timer = setInterval(() => { if (document.hidden)
    return; let strongest = 0.025, speaker = ''; for (const node of nodes) {
    node.analyser.getByteTimeDomainData(node.bytes);
    const rms = Math.sqrt(node.bytes.reduce((sum, v) => sum + ((v - 128) / 128) ** 2, 0) / node.bytes.length);
    if (rms > strongest) {
        strongest = rms;
        speaker = node.id;
    }
} if (speaker && speaker !== last && Date.now() - lastAt > 850) {
    last = speaker;
    lastAt = Date.now();
    setId(speaker);
} }, 180); return () => { clearInterval(timer); for (const node of nodes) {
    node.source.disconnect();
    node.analyser.disconnect();
} void audio.close(); }; }, [signature, enabled]); return id; }

import type { MeetingCapture } from '../../receiz/meeting-capture';
export interface RecordingFeed {
    id: string;
    name: string;
    stream: MediaStream;
}
/** Actual received/local tracks are source. Generated captions or notes never
 * stand in for captured media. Preparation and exit own every resource. */
export async function startMeetingRecording(input: {
    capture: MeetingCapture;
    feeds(): RecordingFeed[];
    onFailure(error: unknown): void;
}) {
    if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream)
        throw Error('Recording is unavailable in this browser. Your chat and meeting history remain available.');
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    if (!context)
        throw Error('Recording canvas is unavailable.');
    const audio = new AudioContext(), destination = audio.createMediaStreamDestination(), videos = new Map<string, HTMLVideoElement>(), nodes = new Map<string, {
        trackId: string;
        node: MediaStreamAudioSourceNode;
    }>();
    let output: MediaStream | null = null, timer: ReturnType<typeof setTimeout> | undefined, stopped = false, stopTask: Promise<void> | null = null;
    const cleanup = async () => { stopped = true; if (timer)
        clearTimeout(timer); output?.getTracks().forEach(track => track.stop()); for (const source of nodes.values())
        source.node.disconnect(); for (const video of videos.values()) {
        video.pause();
        video.srcObject = null;
    } await audio.close(); };
    let recorder: MediaRecorder;
    try {
        await audio.resume();if(audio.state!=='running')throw Error('Tap Record again to enable recording audio.');
        output = canvas.captureStream(15);
        destination.stream.getAudioTracks().forEach(track => output!.addTrack(track));
        const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(value => MediaRecorder.isTypeSupported(value));
        if (!mimeType)
            throw Error('This browser does not support meeting recording.');
        await input.capture.begin(mimeType);
        recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: 1400000, audioBitsPerSecond: 96000 });
    }
    catch (error) {
        await cleanup();
        await input.capture.finish().catch(() => { });
        throw error;
    }
    function draw() {
        if (stopped)
            return;
        try {
            const feeds = input.feeds(), ids = new Set(feeds.map(v => v.id));
            for (const [id, video] of videos)
                if (!ids.has(id)) {
                    video.pause();
                    video.srcObject = null;
                    videos.delete(id);
                    nodes.get(id)?.node.disconnect();
                    nodes.delete(id);
                }
            context!.fillStyle = '#0b1729';
            context!.fillRect(0, 0, 1280, 720);
            const columns = Math.max(1, Math.ceil(Math.sqrt(feeds.length))), rows = Math.max(1, Math.ceil(feeds.length / columns)), width = 1280 / columns, height = 720 / rows;
            feeds.forEach((feed, index) => { let video = videos.get(feed.id); if (!video) {
                video = document.createElement('video');
                video.muted = true;
                video.playsInline = true;
                video.autoplay = true;
                video.srcObject = feed.stream;
                videos.set(feed.id, video);
                void video.play().catch(() => { });
            }
            else if (video.srcObject !== feed.stream) {
                video.srcObject = feed.stream;
                void video.play().catch(() => { });
            } const track = feed.stream.getAudioTracks().find(track => track.readyState === 'live'), held = nodes.get(feed.id); if (held?.trackId !== track?.id) {
                held?.node.disconnect();
                nodes.delete(feed.id);
                if (track) {
                    const node = audio.createMediaStreamSource(new MediaStream([track]));
                    node.connect(destination);
                    nodes.set(feed.id, { trackId: track.id, node });
                }
            } const x = index % columns * width, y = Math.floor(index / columns) * height; if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
                const ratio = Math.max(width / video.videoWidth, height / video.videoHeight), w = video.videoWidth * ratio, h = video.videoHeight * ratio;
                context!.save();
                context!.beginPath();
                context!.rect(x, y, width, height);
                context!.clip();
                context!.drawImage(video, x + (width - w) / 2, y + (height - h) / 2, w, h);
                context!.restore();
            } context!.fillStyle = 'rgba(0,0,0,.55)'; context!.fillRect(x, y + height - 40, width, 40); context!.fillStyle = '#fff'; context!.font = '17px system-ui'; context!.fillText(feed.name, x + 16, y + height - 14, width - 32); });
            timer = setTimeout(draw, 1000 / 15);
        }
        catch (error) {
            input.onFailure(error);
        }
    }
    recorder.addEventListener('dataavailable', event => { if (event.data.size)
        void input.capture.append(event.data).catch(input.onFailure); });
    const done = new Promise<void>((resolve, reject) => { recorder.addEventListener('stop', () => resolve(), { once: true }); recorder.addEventListener('error', event => { input.onFailure(event); reject(Error('Recording stopped unexpectedly. Captured material is retained.')); }, { once: true }); });
    const stop = () => stopTask ??= (async () => { stopped = true; if (timer)
        clearTimeout(timer); if (recorder.state !== 'inactive')
        recorder.stop(); try {
        await done;
        await input.capture.finish();
    }
    finally {
        await cleanup();
    } })();
    try {
        draw();
        recorder.start(5000);
    }
    catch (error) {
        await cleanup();
        await input.capture.finish().catch(() => { });
        throw error;
    }
    return { stop };
}

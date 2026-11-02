import {useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {AssetCamera} from '../../src/features/assets/AssetCamera';
import {Sheet} from '../../src/components/Sheet';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
import '../../src/features/assets/asset-creation-studio.css';

type CameraFixture = {
  enabled: boolean; requests: number; stops: number; frames: number;
  mounts: number; unmounts: number; closes: number; liveAtClose: number;
  streams: MediaStream[]; files: File[]; frameLoops: Set<number>;
  supported: {captureStream: boolean; recorder: boolean; mimes: string[]};
};
declare global { interface Window { assetCameraFixture: CameraFixture } }
const qa: CameraFixture = window.assetCameraFixture = {
  enabled: false, requests: 0, stops: 0, frames: 0, mounts: 0, unmounts: 0,
  closes: 0, liveAtClose: 0, streams: [], files: [], frameLoops: new Set(),
  supported: {
    captureStream: typeof HTMLCanvasElement.prototype.captureStream === 'function',
    recorder: typeof MediaRecorder !== 'undefined',
    mimes: typeof MediaRecorder === 'undefined' ? [] : ['video/mp4', 'video/webm'].filter(type => MediaRecorder.isTypeSupported(type)),
  },
};

// This fixture never retains or invokes the real getUserMedia implementation.
// An explicit fixture button is required before even synthetic frames start.
Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {
  getUserMedia: async (constraints: MediaStreamConstraints) => {
    if (!qa.enabled) throw Error('synthetic_camera_not_enabled');
    qa.requests++;
    if (!constraints.video) throw new DOMException('This fixture has no microphone.', 'NotAllowedError');
    if (!qa.supported.captureStream) throw Error('synthetic_capture_stream_unsupported');
    const canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 360;
    const context = canvas.getContext('2d')!;
    const draw = () => {
      qa.frames++;
      context.fillStyle = '#dae2ee'; context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#244dcb'; context.fillRect(qa.frames % 560, 100, 80, 80);
      context.fillStyle = '#172b45'; context.font = '20px sans-serif';
      context.fillText('Synthetic camera · no device access', 30, 310);
    };
    draw();
    const stream = canvas.captureStream(12);
    const loop = window.setInterval(draw, 80);
    qa.frameLoops.add(loop);
    for (const track of stream.getTracks()) {
      const nativeStop = track.stop.bind(track);
      track.stop = () => {
        if (track.readyState !== 'ended') { qa.stops++; nativeStop(); }
        window.clearInterval(loop); qa.frameLoops.delete(loop);
      };
    }
    qa.streams.push(stream);
    return stream;
  },
}});
Object.defineProperty(navigator, 'permissions', {configurable: true, value: {
  query: async () => ({state: 'prompt'}),
}});

function CameraMount({onCapture, onClose}: {onCapture(file: File): void; onClose(): void}) {
  useEffect(() => { qa.mounts++; return () => { qa.unmounts++; }; }, []);
  return <AssetCamera onCapture={onCapture} onClose={onClose} maxBytes={4 * 1024 * 1024} />;
}
function Fixture() {
  const [mounted, setMounted] = useState(false);
  return mounted ? <Sheet title="New original" className="sheet--asset-studio" onClose={() => setMounted(false)}>
    <div className="asset-creation asset-creation--studio"><div className="asset-canvas">
      <CameraMount onCapture={file => { qa.files.push(file); setMounted(false); }} onClose={() => {
        qa.closes++;
        qa.liveAtClose += qa.streams.flatMap(stream => stream.getTracks()).filter(track => track.readyState === 'live').length;
        setMounted(false);
      }} />
    </div></div>
  </Sheet> : <main style={{padding: 24}}>
    <h1>Synthetic camera qualification</h1>
    <p>Canvas frames and the browser’s real media encoder. No camera, microphone, identity or service connection.</p>
    <button type="button" onClick={() => { qa.enabled = true; setMounted(true); }}>Enable synthetic camera</button>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);

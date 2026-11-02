import {useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent} from 'react';
import {ArrowLeft, Camera, Mic, MicOff, SwitchCamera, Video} from 'lucide-react';

type AssetCameraProps = {onCapture(file: File): void; onClose(): void; maxBytes: number};
type Phase = 'opening' | 'ready' | 'recording' | 'processing' | 'fallback';
type Facing = 'environment' | 'user';
type Recording = {
  recorder: MediaRecorder;
  chunks: Blob[];
  bytes: number;
  canceled: boolean;
  complete: boolean;
  generation: number;
  limit?: ReturnType<typeof setTimeout>;
  clock?: ReturnType<typeof setInterval>;
};

const stopTracks = (stream: MediaStream | null) => stream?.getTracks().forEach(track => track.stop());
function recordingMime() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return null;
  return ['video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** Mounted only after the author chooses Camera; all captured bytes stay local. */
export function AssetCamera(props: AssetCameraProps) {
  const callbacks = useRef(props);
  callbacks.current = props;
  const video = useRef<HTMLVideoElement>(null);
  const nativePhoto = useRef<HTMLInputElement>(null);
  const nativeVideo = useRef<HTMLInputElement>(null);
  const nativePending = useRef(false);
  const stream = useRef<MediaStream | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const recording = useRef<Recording | null>(null);
  const generation = useRef(0);
  const microphoneRequest = useRef(0);
  const mounted = useRef(false);
  const closed = useRef(false);
  const phaseRef = useRef<Phase>('opening');
  const gesture = useRef<{pointer: number; held: boolean; timer: ReturnType<typeof setTimeout>} | null>(null);
  const [phase, setPhase] = useState<Phase>('opening');
  const [facing, setFacing] = useState<Facing>('environment');
  const [error, setError] = useState('');
  const [sound, setSound] = useState(false);
  const [recordingSound, setRecordingSound] = useState(false);
  const [microphoneBusy, setMicrophoneBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mime = recordingMime();
  const live = () => mounted.current && !closed.current;
  const current = (ticket: number) => live() && generation.current === ticket;
  const changePhase = (next: Phase) => { phaseRef.current = next; setPhase(next); };

  function clearGesture() {
    if (gesture.current) clearTimeout(gesture.current.timer);
    gesture.current = null;
  }
  function clearRecordingTimers(session: Recording) {
    clearTimeout(session.limit);
    clearInterval(session.clock);
  }
  function dispose() {
    generation.current++;
    microphoneRequest.current++;
    clearGesture();
    const session = recording.current;
    recording.current = null;
    if (session) {
      session.canceled = true;
      clearRecordingTimers(session);
      if (session.recorder.state !== 'inactive') {
        try { session.recorder.stop(); } catch { /* The device may have already stopped. */ }
      }
    }
    stopTracks(stream.current);
    stopTracks(microphone.current);
    stream.current = null;
    microphone.current = null;
    if (video.current) video.current.srcObject = null;
  }
  function close() {
    if (!live()) return;
    closed.current = true;
    nativePending.current = false;
    dispose();
    callbacks.current.onClose();
  }
  function deliver(file: File) {
    if (!live()) return;
    if (!file.size || file.size > callbacks.current.maxBytes) {
      setError(file.size ? 'This capture exceeds the file size limit. Try a shorter video or another photo.' : 'The camera returned an empty capture. Try again.');
      changePhase(stream.current ? 'ready' : 'fallback');
      return;
    }
    closed.current = true;
    dispose();
    callbacks.current.onCapture(file);
  }
  function openNative(kind: 'photo' | 'video') {
    if (!live()) return;
    // Native capture can background this document. Release browser hardware but
    // retain the input until its chosen file returns to this mounted camera.
    nativePending.current = true;
    dispose();
    setSound(false);
    setMicrophoneBusy(false);
    changePhase('fallback');
    (kind === 'photo' ? nativePhoto : nativeVideo).current?.click();
  }

  async function enableMicrophone(ticket = generation.current) {
    if (!current(ticket) || microphone.current || !navigator.mediaDevices?.getUserMedia) return;
    const request = ++microphoneRequest.current;
    setMicrophoneBusy(true);
    try {
      const audio = await navigator.mediaDevices.getUserMedia({audio: true, video: false});
      if (!current(ticket) || request !== microphoneRequest.current) { stopTracks(audio); return; }
      microphone.current = audio;
      setSound(audio.getAudioTracks().length > 0);
      setError('');
    } catch {
      if (current(ticket) && request === microphoneRequest.current) {
        setSound(false);
        setError('Microphone unavailable. You can still record video without sound.');
      }
    } finally {
      if (current(ticket) && request === microphoneRequest.current) setMicrophoneBusy(false);
    }
  }

  async function openCamera(nextFacing: Facing) {
    dispose();
    const ticket = generation.current;
    setFacing(nextFacing);
    setSound(false);
    setMicrophoneBusy(false);
    setError('');
    changePhase('opening');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Live camera is unavailable here. Use your device camera below.');
      changePhase('fallback');
      return;
    }
    try {
      const camera = await navigator.mediaDevices.getUserMedia({audio: false, video: {facingMode: {ideal: nextFacing}}});
      if (!current(ticket)) { stopTracks(camera); return; }
      stream.current = camera;
      if (!video.current) { stopTracks(camera); stream.current = null; return; }
      video.current.srcObject = camera;
      await video.current.play();
      if (!current(ticket)) return;
      changePhase('ready');
      // Reuse an existing grant without interrupting the shutter with a permission prompt.
      if (navigator.permissions?.query) {
        void navigator.permissions.query({name: 'microphone' as PermissionName}).then(permission => {
          if (permission.state === 'granted' && current(ticket)) void enableMicrophone(ticket);
        }).catch(() => { /* Some browsers do not expose microphone permission state. */ });
      }
    } catch (cause) {
      if (!current(ticket)) return;
      stopTracks(stream.current);
      stream.current = null;
      if (video.current) video.current.srcObject = null;
      const denied = cause instanceof DOMException && (cause.name === 'NotAllowedError' || cause.name === 'SecurityError');
      setError(denied ? 'Camera permission was not granted. Use your device camera below, or allow camera access in browser settings.' : 'This camera could not open. Use your device camera below.');
      changePhase('fallback');
    }
  }

  function photo() {
    if (!live() || phaseRef.current !== 'ready' || !stream.current || !video.current) return;
    const source = video.current;
    if (!source.videoWidth || !source.videoHeight) { setError('The camera is still getting ready. Try again in a moment.'); return; }
    const ticket = generation.current;
    changePhase('processing');
    setError('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = source.videoWidth;
      canvas.height = source.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw Error('capture_context_unavailable');
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (!current(ticket)) return;
        if (blob) deliver(new File([blob], `photo-${Date.now()}.jpg`, {type: 'image/jpeg'}));
        else { setError('This photo could not be captured. Try again.'); changePhase('ready'); }
      }, 'image/jpeg', .92);
    } catch {
      if (current(ticket)) { setError('This photo could not be captured. Try again.'); changePhase('ready'); }
    }
  }

  function stopRecording(save: boolean) {
    const session = recording.current;
    if (!session) return;
    session.canceled ||= !save;
    clearRecordingTimers(session);
    if (current(session.generation)) changePhase(save ? 'processing' : 'ready');
    if (session.recorder.state !== 'inactive') {
      try { session.recorder.stop(); } catch {
        session.canceled = true;
        recording.current = null;
        if (current(session.generation)) { setError('This video could not be captured. Try again.'); changePhase('ready'); }
      }
    }
  }

  function startRecording() {
    if (!live() || phaseRef.current !== 'ready' || !stream.current) return;
    if (!mime) { openNative('video'); return; }
    try {
      const output = new MediaStream([...stream.current.getVideoTracks(), ...(microphone.current?.getAudioTracks() ?? [])]);
      const recorder = new MediaRecorder(output, {mimeType: mime, videoBitsPerSecond: 4_000_000, audioBitsPerSecond: 128_000});
      const session: Recording = {recorder, chunks: [], bytes: 0, canceled: false, complete: false, generation: generation.current};
      recording.current = session;
      recorder.ondataavailable = event => {
        if (session.canceled || !current(session.generation) || !event.data.size) return;
        session.bytes += event.data.size;
        if (session.bytes > callbacks.current.maxBytes) {
          setError('This video exceeds the file size limit. Try a shorter recording.');
          stopRecording(false);
          return;
        }
        session.chunks.push(event.data);
      };
      recorder.onerror = () => {
        if (!current(session.generation)) return;
        setError('Video recording stopped unexpectedly. Try again.');
        stopRecording(false);
      };
      recorder.onstop = () => {
        if (session.complete) return;
        session.complete = true;
        clearRecordingTimers(session);
        if (recording.current === session) recording.current = null;
        if (!current(session.generation)) return;
        if (session.canceled) { changePhase('ready'); return; }
        const type = recorder.mimeType || mime;
        const blob = new Blob(session.chunks, {type});
        deliver(new File([blob], `video-${Date.now()}.${type.startsWith('video/mp4') ? 'mp4' : 'webm'}`, {type}));
      };
      setError('');
      setSeconds(0);
      setRecordingSound(output.getAudioTracks().length > 0);
      recorder.start(250);
      changePhase('recording');
      const started = Date.now();
      session.clock = setInterval(() => { if (current(session.generation)) setSeconds(Math.min(60, Math.floor((Date.now() - started) / 1000))); }, 250);
      session.limit = setTimeout(() => { clearGesture(); stopRecording(true); }, 60_000);
    } catch {
      recording.current = null;
      setError('Live video recording is unavailable. Use your device camera to record a video.');
      changePhase('ready');
      openNative('video');
    }
  }

  function pointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || event.button !== 0 || !live() || phaseRef.current !== 'ready') return;
    event.preventDefault();
    clearGesture();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Older WebViews may not expose pointer capture. */ }
    const pending = {pointer: event.pointerId, held: false, timer: setTimeout(() => {
      if (gesture.current !== pending || !live()) return;
      pending.held = true;
      startRecording();
    }, 350)};
    gesture.current = pending;
  }
  function pointerEnd(event: ReactPointerEvent<HTMLButtonElement>, canceled: boolean) {
    const pending = gesture.current;
    if (!pending || pending.pointer !== event.pointerId) return;
    clearGesture();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pending.held) stopRecording(!canceled);
    else if (!canceled) photo();
  }
  function nativeCapture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    nativePending.current = false;
    if (file) deliver(file);
  }

  useEffect(() => {
    mounted.current = true;
    closed.current = false;
    void openCamera('environment');
    const hide = () => {
      if (document.visibilityState !== 'hidden') return;
      if (nativePending.current) dispose();
      else close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } };
    document.addEventListener('visibilitychange', hide);
    document.addEventListener('keydown', escape);
    const photoInput = nativePhoto.current, videoInput = nativeVideo.current;
    const cancelNative = () => { nativePending.current = false; };
    photoInput?.addEventListener('cancel', cancelNative);
    videoInput?.addEventListener('cancel', cancelNative);
    return () => {
      mounted.current = false;
      dispose();
      document.removeEventListener('visibilitychange', hide);
      document.removeEventListener('keydown', escape);
      photoInput?.removeEventListener('cancel', cancelNative);
      videoInput?.removeEventListener('cancel', cancelNative);
    };
  }, []);

  const busy = phase === 'recording' || phase === 'processing';
  return <section className="asset-camera" data-state={phase} aria-label="Camera">
    <video ref={video} className="asset-camera__video" data-facing={facing} aria-label="Camera preview" autoPlay playsInline muted hidden={phase === 'fallback'} />
    <div className="asset-camera__topbar">
      <button type="button" className="asset-camera__close" aria-label="Close camera" onClick={close}><ArrowLeft aria-hidden="true" /><span>Back to editor</span></button>
      {phase === 'recording' ? <time className="asset-camera__clock" aria-label="Recording duration">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</time> : null}
      {phase !== 'fallback' ? <button type="button" className="asset-camera__microphone" aria-label={sound ? 'Disable microphone' : 'Enable microphone'} aria-pressed={sound} disabled={busy || microphoneBusy || phase !== 'ready'} onClick={() => {
        if (microphone.current) { microphoneRequest.current++; stopTracks(microphone.current); microphone.current = null; setSound(false); }
        else void enableMicrophone();
      }}>{sound ? <Mic aria-hidden="true" /> : <MicOff aria-hidden="true" />}</button> : null}
    </div>
    <div className="asset-camera__footer">
      <div className="asset-camera__status" role="status" aria-live="polite">
        {phase === 'opening' ? 'Opening camera…' : phase === 'processing' ? 'Preparing capture…' : phase === 'recording' ? (recordingSound ? 'Recording with sound' : 'Recording without sound') : phase === 'ready' ? 'Tap for photo · Hold for video' : 'Use your device camera'}
      </div>
      {error ? <p className="asset-camera__error" role="alert">{error}</p> : null}
      {phase === 'fallback' ? <div className="asset-camera__fallback">
        <button type="button" aria-label="Take a photo" onClick={() => openNative('photo')}><Camera aria-hidden="true" />Take a photo</button>
        <button type="button" aria-label="Record a video" onClick={() => openNative('video')}><Video aria-hidden="true" />Record a video</button>
      </div> : <div className="asset-camera__controls">
        <span className="asset-camera__control-spacer" aria-hidden="true" />
        <button type="button" className="asset-camera__shutter" data-recording={phase === 'recording'} aria-label="Capture photo or hold for video" disabled={phase !== 'ready' && phase !== 'recording'} onPointerDown={pointerDown} onPointerUp={event => pointerEnd(event, false)} onPointerCancel={event => pointerEnd(event, true)} onLostPointerCapture={event => pointerEnd(event, true)} onContextMenu={event => event.preventDefault()} onClick={event => { if (event.detail === 0) photo(); }} onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!event.repeat) photo(); }
        }} onKeyUp={event => { if (event.key === ' ') event.preventDefault(); }}><span aria-hidden="true" /></button>
        <button type="button" className="asset-camera__flip" aria-label="Flip camera" disabled={phase !== 'ready'} onClick={() => void openCamera(facing === 'environment' ? 'user' : 'environment')}><SwitchCamera aria-hidden="true" /></button>
      </div>}
      {!mime && phase !== 'fallback' ? <button type="button" className="asset-camera__native-video" aria-label="Record a video" disabled={busy} onClick={() => openNative('video')}>Record a video with device camera</button> : null}
      {phase === 'ready' ? <p className="asset-camera__hint">{microphoneBusy ? 'Allow microphone access to add sound.' : sound ? 'Microphone on · Video up to 1 minute' : 'Enable microphone for sound · Video up to 1 minute'}</p> : null}
    </div>
    <input ref={nativePhoto} type="file" hidden accept="image/*" capture={facing} aria-label="Take a photo with device camera" onChange={nativeCapture} />
    <input ref={nativeVideo} type="file" hidden accept="video/*" capture={facing} aria-label="Record a video with device camera" onChange={nativeCapture} />
  </section>;
}

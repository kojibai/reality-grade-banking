// @vitest-environment happy-dom
import {act, type ComponentProps} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {AssetCamera} from '../src/features/assets/AssetCamera';

Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});

class Track extends EventTarget {
  readonly kind: 'video' | 'audio';
  readyState = 'live';
  enabled = true;
  stop = vi.fn(() => { this.readyState = 'ended'; });
  constructor(kind: 'video' | 'audio') { super(); this.kind = kind; }
}
class Stream {
  constructor(readonly tracks: Track[] = [new Track('video')]) {}
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter(track => track.kind === 'video'); }
  getAudioTracks() { return this.tracks.filter(track => track.kind === 'audio'); }
}
class Recorder {
  static instances: Recorder[] = [];
  static isTypeSupported = vi.fn((type: string) => type === 'video/mp4');
  state = 'inactive';
  readonly mimeType: string;
  ondataavailable: ((event: {data: Blob}) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly stream: Stream, options: MediaRecorderOptions = {}) {
    this.mimeType = options.mimeType ?? 'video/webm';
    Recorder.instances.push(this);
  }
  start() { this.state = 'recording'; }
  chunk(data: string) { this.ondataavailable?.({data: new Blob([data], {type: this.mimeType})}); }
  stop() {
    if (this.state === 'inactive') return;
    this.state = 'inactive';
    this.chunk('valid-video-fixture');
    this.onstop?.();
  }
}

let host: HTMLDivElement;
let root: Root | null;
let preview: Stream;
let acquire: ReturnType<typeof vi.fn>;
let canvasBlob: ((callback: BlobCallback) => void);

beforeEach(() => {
  vi.useFakeTimers();
  Recorder.instances = [];
  Recorder.isTypeSupported.mockImplementation(type => type === 'video/mp4');
  preview = new Stream();
  acquire = vi.fn(async (constraints: MediaStreamConstraints) => constraints.video ? preview : new Stream([new Track('audio')]));
  vi.stubGlobal('navigator', {mediaDevices: {getUserMedia: acquire}});
  vi.stubGlobal('MediaStream', Stream);
  vi.stubGlobal('MediaRecorder', Recorder);
  const sources = new WeakMap<HTMLMediaElement, MediaProvider | null>();
  vi.spyOn(HTMLMediaElement.prototype, 'srcObject', 'get').mockImplementation(function(this: HTMLMediaElement) { return sources.get(this) ?? null; });
  vi.spyOn(HTMLMediaElement.prototype, 'srcObject', 'set').mockImplementation(function(this: HTMLMediaElement, source: MediaProvider | null) { sources.set(this, source); });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({drawImage: vi.fn()} as unknown as CanvasRenderingContext2D);
  canvasBlob = callback => callback(new Blob(['valid-jpeg-fixture'], {type: 'image/jpeg'}));
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => canvasBlob(callback));
  Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'});
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  if (root) act(() => root?.unmount());
  host.remove();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function render(overrides: Partial<Pick<ComponentProps<typeof AssetCamera>, 'maxBytes'>> = {}) {
  const props = {onCapture: vi.fn<(file: File) => void>(), onClose: vi.fn(), maxBytes: 1024 * 1024, ...overrides};
  await act(async () => root!.render(<AssetCamera {...props} />));
  const video = host.querySelector('video');
  if (video) Object.defineProperties(video, {videoWidth: {configurable: true, value: 640}, videoHeight: {configurable: true, value: 480}});
  return props;
}
function button(label: string) {
  const found = host.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  if (!found) throw Error(`Missing button: ${label}`);
  return found;
}
const shutter = () => button('Capture photo or hold for video');
async function pointer(type: string) {
  await act(async () => shutter().dispatchEvent(new PointerEvent(type, {pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, bubbles: true, cancelable: true})));
}
async function hold() { await pointer('pointerdown'); await act(async () => vi.advanceTimersByTime(400)); }

describe('AssetCamera local capture', () => {
  it('opens only the mounted camera, previews inline, and returns one JPEG for a tap', async () => {
    expect(acquire).not.toHaveBeenCalled();
    const {onCapture} = await render();
    expect(acquire).toHaveBeenCalledExactlyOnceWith({audio: false, video: {facingMode: {ideal: 'environment'}}});
    const video = host.querySelector('video')!;
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.srcObject).toBe(preview);
    await pointer('pointerdown'); await pointer('pointerup');
    const file = onCapture.mock.calls[0]?.[0];
    expect(file).toBeInstanceOf(File);
    expect(file).toMatchObject({type: 'image/jpeg', size: 18});
    expect(file.name).toMatch(/\.jpg$/);
    expect(onCapture).toHaveBeenCalledOnce();
    expect(Recorder.instances).toHaveLength(0);
    expect(preview.getTracks()[0].readyState).toBe('ended');
  });

  it('captures a photo with Enter and ignores repeated keydown', async () => {
    const {onCapture} = await render();
    await act(async () => {
      shutter().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true, cancelable: true}));
      shutter().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', repeat: true, bubbles: true, cancelable: true}));
    });
    expect(onCapture).toHaveBeenCalledOnce();
    expect(onCapture.mock.calls[0][0].type).toBe('image/jpeg');
  });

  it('records supported MP4 on hold and emits it only when the pointer releases', async () => {
    const {onCapture} = await render();
    await hold();
    expect(Recorder.instances[0]?.state).toBe('recording');
    expect(host.querySelector('time[aria-label="Recording duration"]')?.textContent).toBe('0:00');
    await act(async () => vi.advanceTimersByTime(1000));
    expect(host.querySelector('time')?.textContent).toBe('0:01');
    expect(onCapture).not.toHaveBeenCalled();
    await pointer('pointerup');
    expect(onCapture).toHaveBeenCalledOnce();
    expect(onCapture.mock.calls[0][0]).toMatchObject({type: 'video/mp4', name: expect.stringMatching(/\.mp4$/)});
    expect(vi.getTimerCount()).toBe(0);
  });

  it('selects WebM when MP4 is unsupported', async () => {
    Recorder.isTypeSupported.mockImplementation(type => type === 'video/webm');
    const {onCapture} = await render();
    await hold(); await pointer('pointerup');
    expect(onCapture.mock.calls[0][0]).toMatchObject({type: 'video/webm', name: expect.stringMatching(/\.webm$/)});
  });

  it('does not request microphone permission for a photo, but includes explicitly enabled audio in a video', async () => {
    const microphone = new Stream([new Track('audio')]);
    acquire.mockImplementation(async (constraints: MediaStreamConstraints) => constraints.video ? preview : microphone);
    const {onCapture} = await render();
    expect(acquire.mock.calls).toHaveLength(1);
    await act(async () => button('Enable microphone').click());
    await hold();
    expect(Recorder.instances[0].stream.getAudioTracks()).toHaveLength(1);
    await pointer('pointerup');
    expect(onCapture).toHaveBeenCalledOnce();
    expect(microphone.getTracks()[0].readyState).toBe('ended');
  });

  it('keeps video usable after microphone denial and labels the silent recording', async () => {
    acquire.mockImplementation(async (constraints: MediaStreamConstraints) => {
      if (constraints.audio) throw new DOMException('Denied', 'NotAllowedError');
      return preview;
    });
    const {onCapture} = await render();
    await act(async () => button('Enable microphone').click());
    expect(host.textContent).toContain('without sound');
    await hold(); await pointer('pointerup');
    expect(onCapture.mock.calls[0][0].type).toBe('video/mp4');
  });

  it('stops the old camera before flipping and stops the new camera on close', async () => {
    const second = new Stream();
    acquire.mockResolvedValueOnce(preview).mockResolvedValueOnce(second);
    const {onCapture, onClose} = await render();
    await act(async () => button('Flip camera').click());
    expect(preview.getTracks()[0].readyState).toBe('ended');
    expect(acquire.mock.calls[1][0]).toMatchObject({video: {facingMode: {ideal: 'user'}}});
    expect(host.querySelector('video')?.srcObject).toBe(second);
    await act(async () => button('Close camera').click());
    expect(second.getTracks()[0].readyState).toBe('ended');
    expect(onClose).toHaveBeenCalledOnce();
    expect(onCapture).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('discards a canceled hold and allows a later capture', async () => {
    const {onCapture} = await render();
    await hold(); await pointer('pointercancel');
    expect(onCapture).not.toHaveBeenCalled();
    expect(Recorder.instances[0].state).toBe('inactive');
    expect(vi.getTimerCount()).toBe(0);
    await pointer('pointerdown'); await pointer('pointerup');
    expect(onCapture.mock.calls[0][0].type).toBe('image/jpeg');
  });

  it('finishes video at one minute without leaving recording timers active', async () => {
    const {onCapture} = await render();
    await hold();
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(onCapture).toHaveBeenCalledOnce();
    expect(onCapture.mock.calls[0][0].type).toBe('video/mp4');
    expect(vi.getTimerCount()).toBe(0);
    expect(preview.getTracks()[0].readyState).toBe('ended');
  });

  it('rejects an oversized video while recording and clears all timers', async () => {
    const {onCapture} = await render({maxBytes: 5});
    await hold();
    await act(async () => Recorder.instances[0].chunk('too many bytes'));
    expect(onCapture).not.toHaveBeenCalled();
    expect(Recorder.instances[0].state).toBe('inactive');
    expect(host.querySelector('[role=alert]')?.textContent).toMatch(/size|large|limit/i);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects an oversized photo and keeps the camera available for another try', async () => {
    const {onCapture} = await render({maxBytes: 5});
    await act(async () => shutter().click());
    expect(onCapture).not.toHaveBeenCalled();
    expect(host.querySelector('[role=alert]')?.textContent).toMatch(/size|large|limit/i);
    expect(shutter().disabled).toBe(false);
  });

  it('stops and discards active recording when the page becomes hidden', async () => {
    const {onCapture, onClose} = await render();
    await hold();
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(Recorder.instances[0].state).toBe('inactive');
    expect(onCapture).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
    expect(preview.getTracks()[0].readyState).toBe('ended');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops a late camera permission result after unmount', async () => {
    let resolve!: (stream: Stream) => void;
    acquire.mockReturnValue(new Promise<Stream>(done => { resolve = done; }));
    const {onCapture} = await render();
    act(() => root!.unmount()); root = null;
    await act(async () => resolve(preview));
    expect(preview.getTracks()[0].readyState).toBe('ended');
    expect(onCapture).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('discards a late photo callback after close', async () => {
    let resolve!: BlobCallback;
    canvasBlob = callback => { resolve = callback; };
    const {onCapture, onClose} = await render();
    await act(async () => shutter().click());
    await act(async () => button('Close camera').click());
    await act(async () => resolve(new Blob(['jpeg'], {type: 'image/jpeg'})));
    expect(onCapture).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('never starts recording after the hold was released while camera permission was pending', async () => {
    let resolve!: (stream: Stream) => void;
    acquire.mockReturnValue(new Promise<Stream>(done => { resolve = done; }));
    const {onCapture} = await render();
    await hold(); await pointer('pointerup');
    await act(async () => resolve(preview));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(Recorder.instances).toHaveLength(0);
    expect(onCapture).not.toHaveBeenCalled();
  });

  it.each(['denied', 'unsupported'])('offers native photo and video capture for %s camera access', async mode => {
    if (mode === 'denied') acquire.mockRejectedValue(new DOMException('Denied', 'NotAllowedError'));
    else vi.stubGlobal('navigator', {});
    const {onCapture} = await render();
    const photo = host.querySelector<HTMLInputElement>('input[type=file][accept="image/*"]')!;
    const video = host.querySelector<HTMLInputElement>('input[type=file][accept="video/*"]')!;
    expect(photo?.getAttribute('capture')).toBe('environment');
    expect(video?.getAttribute('capture')).toBe('environment');
    expect(button('Take a photo').disabled).toBe(false);
    expect(button('Record a video').disabled).toBe(false);
    const file = new File(['native camera'], 'native.jpg', {type: 'image/jpeg'});
    Object.defineProperty(photo, 'files', {value: [file]});
    await act(async () => photo.dispatchEvent(new Event('change', {bubbles: true})));
    expect(onCapture).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('uses native video capture when MediaRecorder is unavailable without disabling photos', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const {onCapture} = await render();
    expect(button('Record a video').disabled).toBe(false);
    expect(shutter().disabled).toBe(false);
    await act(async () => shutter().click());
    expect(onCapture.mock.calls[0][0].type).toBe('image/jpeg');
  });

  it('releases the live camera for native video capture and accepts its file after the page was hidden', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const {onCapture, onClose} = await render();
    await act(async () => button('Record a video').click());
    expect(preview.getTracks()[0].readyState).toBe('ended');
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'hidden'});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onClose).not.toHaveBeenCalled();
    const input = host.querySelector<HTMLInputElement>('input[accept="video/*"]')!;
    const file = new File(['native-video'], 'native.mp4', {type: 'video/mp4'});
    Object.defineProperty(input, 'files', {value: [file]});
    await act(async () => input.dispatchEvent(new Event('change', {bubbles: true})));
    expect(onCapture).toHaveBeenCalledExactlyOnceWith(file);
  });

  it('stops late microphone permission after close and never starts an unwanted recording', async () => {
    let resolve!: (stream: Stream) => void;
    const audio = new Stream([new Track('audio')]);
    acquire.mockImplementation((constraints: MediaStreamConstraints) => constraints.video ? Promise.resolve(preview) : new Promise<Stream>(done => { resolve = done; }));
    const {onCapture} = await render();
    await act(async () => button('Enable microphone').click());
    await act(async () => button('Close camera').click());
    await act(async () => resolve(audio));
    expect(audio.getTracks()[0].readyState).toBe('ended');
    expect(Recorder.instances).toHaveLength(0);
    expect(onCapture).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reuses a previously granted microphone without prompting on a photo-only camera mount', async () => {
    const audio = new Stream([new Track('audio')]);
    acquire.mockImplementation(async (constraints: MediaStreamConstraints) => constraints.video ? preview : audio);
    vi.stubGlobal('navigator', {mediaDevices: {getUserMedia: acquire}, permissions: {query: async () => ({state: 'granted'})}});
    await render();
    await hold();
    expect(Recorder.instances[0].stream.getAudioTracks()).toHaveLength(1);
    await pointer('pointercancel');
  });

  it('keeps an already recording silent video labeled honestly when a microphone grant arrives late', async () => {
    let resolve!: (stream: Stream) => void;
    acquire.mockImplementation((constraints: MediaStreamConstraints) => constraints.video ? Promise.resolve(preview) : new Promise<Stream>(done => { resolve = done; }));
    await render();
    await act(async () => button('Enable microphone').click());
    await hold();
    await act(async () => resolve(new Stream([new Track('audio')])));
    expect(Recorder.instances).toHaveLength(1);
    expect(Recorder.instances[0].stream.getAudioTracks()).toHaveLength(0);
    expect(host.querySelector('[role=status]')?.textContent).toBe('Recording without sound');
    await pointer('pointercancel');
  });
});

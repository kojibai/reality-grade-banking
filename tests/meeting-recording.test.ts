// @vitest-environment happy-dom
import { it, expect, vi, afterEach } from 'vitest';
import { startMeetingRecording } from '../src/features/meeting/recording';
afterEach(() => vi.unstubAllGlobals());
it('releases every prepared capture resource if durable capture cannot begin', async () => { const stop = vi.fn(), close = vi.fn(async () => { }), stream = { getTracks: () => [{ stop }], addTrack: vi.fn() }; vi.stubGlobal('AudioContext', class {
    state='running';resume = async () => { };
    close = close;
    createMediaStreamDestination = () => ({ stream: { getAudioTracks: () => [] } });
}); vi.stubGlobal('MediaRecorder', class {
    static isTypeSupported() { return true; }
}); vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({} as never); HTMLCanvasElement.prototype.captureStream = () => stream as never; const capture = { begin: async () => { throw Error('storage unavailable'); }, finish: async () => { } }; await expect(startMeetingRecording({ capture: capture as never, feeds: () => [], onFailure() { } })).rejects.toThrow('storage unavailable'); expect(stop).toHaveBeenCalledTimes(1); expect(close).toHaveBeenCalledTimes(1); });

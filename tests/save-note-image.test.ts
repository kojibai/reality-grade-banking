// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { shareNoteImage } from '../src/features/notes/save-note-image';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('hands the native share sheet the untouched original PNG bytes', async () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const share = vi.fn(async (data: ShareData) => { expect(data.files?.[0].type).toBe('image/png'); expect([...new Uint8Array(await data.files![0].arrayBuffer())]).toEqual([...bytes]); });
  vi.stubGlobal('navigator', { canShare: () => true, share });
  expect(await shareNoteImage(bytes, 'reserve-note.png')).toBe('shared'); expect(share).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
it('leaves the original download available when file sharing is unavailable', async () => {
  vi.stubGlobal('navigator', { canShare: () => false, share: vi.fn() });
  expect(await shareNoteImage(new Uint8Array([1]), 'note.png')).toBe('download'); expect(navigator.share).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
it('treats share cancellation as cancellation instead of downloading unexpectedly', async () => {
  vi.stubGlobal('navigator', { canShare: () => true, share: async () => { throw new DOMException('Cancelled', 'AbortError'); } });
  expect(await shareNoteImage(new Uint8Array([1]), 'note.png')).toBe('cancelled');
  vi.unstubAllGlobals();
});

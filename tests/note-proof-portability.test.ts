import { expect, it, vi } from 'vitest';
import { readRetainedNoteProofs } from '../src/receiz/note-proof-portability';

it('backs up exact received note images without resuming custody', async () => {
  const incoming = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const restore = vi.fn(async () => incoming);
  const sources = await readRetainedNoteProofs({ keyId: 'test-key', restore, read: async () => ({
    schema: 'receiz.bank.offline-notes-device.v1', keyId: 'test-key', notes: {},
    deposits: { received: { imageRef: 'exact-incoming-image' } },
  }) });
  expect(sources).toEqual([{ kind: 'note-image', filename: 'note-received.png', bytes: incoming }]);
  expect(restore).toHaveBeenCalledExactlyOnceWith('exact-incoming-image');
});
it('reads one exact image when it is retained in both note and deposit bookkeeping', async () => {
  const restore = vi.fn(async () => new Uint8Array([1, 2, 3]));
  const sources = await readRetainedNoteProofs({ keyId: 'test-key', restore, read: async () => ({
    schema: 'receiz.bank.offline-notes-device.v1', keyId: 'test-key', notes: { held: { imageRef: 'same-image' } },
    deposits: { received: { imageRef: 'same-image' } },
  }) });
  expect(sources).toHaveLength(1); expect(restore).toHaveBeenCalledOnce();
});

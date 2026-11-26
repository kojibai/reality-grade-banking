import { expect, test, vi } from 'vitest';
import { openBrowserWalletArchive } from '../src/receiz/browser-wallet-archive';

function files() {
  const committed = new Map<string, Uint8Array<ArrayBuffer>>();
  let failClose = false;
  let directoryExists = false;
  const remove = () => new DOMException('Missing', 'NotFoundError');
  const directory = {
    async getFileHandle(key: string, options?: FileSystemGetFileOptions) {
      if (!committed.has(key)) {
        if (!options?.create) throw remove();
        committed.set(key, new Uint8Array());
      }
      return {
        async getFile() { return new Blob([committed.get(key)!]); },
        async createWritable() {
          let pending: Uint8Array<ArrayBuffer> | undefined;
          return {
            async write(bytes: Uint8Array) { pending = bytes.slice(); },
            async close() {
              if (failClose) throw Error('write interrupted');
              committed.set(key, pending!);
            },
            async abort() {},
          };
        },
      };
    },
  };
  const root = {
    async getDirectoryHandle(_name: string, options?: FileSystemGetDirectoryOptions) {
      if (!directoryExists) {
        if (!options?.create) throw remove();
        directoryExists = true;
      }
      return directory;
    },
  };
  const locks = { request: vi.fn(async (_key: string, work: () => Promise<unknown>) => work()) } as unknown as LockManager;
  const open = () => openBrowserWalletArchive(
    { getDirectory: async () => root as unknown as FileSystemDirectoryHandle },
    locks,
    async file => new Uint8Array(await (await file.getFile()).arrayBuffer()),
  );
  return { open, locks, exists: () => directoryExists, interrupt() { failClose = true; } };
}

test('reopens exact Wallet bytes in a new browser archive and refuses stale or interrupted updates', async () => {
  const { open, locks, exists, interrupt } = files();
  const key = '1'.repeat(64), debit = Uint8Array.of(1, 2, 3);
  const archive = await open();
  await expect(archive.read(key)).resolves.toBeNull();
  expect(exists()).toBe(false);
  await expect(archive.write(key, null, debit)).resolves.toBe(true);
  expect(locks.request).toHaveBeenCalledTimes(2);
  expect(exists()).toBe(true);

  const restored = await open();
  await expect(restored.read(key)).resolves.toEqual(debit);
  await expect(restored.write(key, null, Uint8Array.of(9))).resolves.toBe(false);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', debit));
  const digest = Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
  interrupt();
  await expect(restored.write(key, digest, Uint8Array.of(9))).rejects.toThrow('write interrupted');
  await expect(restored.read(key)).resolves.toEqual(debit);
});

test('rejects non-digest archive filenames', async () => {
  const archive = await files().open();
  await expect(archive.read('../other')).rejects.toThrow('BANK_WALLET_DEVICE_ARCHIVE_INVALID');
});

type ReadRequest = { id: number; file: FileSystemFileHandle };

self.addEventListener('message', async ({ data: { id, file } }: MessageEvent<ReadRequest>) => {
  try {
    // Read via the file-system API. WebKit's Blob loader can fail when offline.
    const handle = await (file as FileSystemFileHandle & {
      createSyncAccessHandle(): Promise<{
        getSize(): number;
        read(target: Uint8Array): number;
        close(): void;
      }>;
    }).createSyncAccessHandle();
    let bytes: Uint8Array<ArrayBuffer>;
    try {
      bytes = new Uint8Array(handle.getSize());
      if (bytes.length && handle.read(bytes) !== bytes.length) throw Error('BANK_WALLET_DEVICE_ARCHIVE_INVALID');
    } finally {
      handle.close();
    }
    self.postMessage({ id, bytes }, { transfer: [bytes.buffer] });
  } catch {
    self.postMessage({ id });
  }
});
export {};

import type { DeviceWalletArchive } from './device-wallet-recovery';

const directoryName = 'bankeiz-wallet-recovery-v1';
const unavailable = 'BANK_WALLET_DEVICE_ARCHIVE_READ_FAILED';

export function createBrowserWalletArchiveReader(signal: AbortSignal) {
  let worker: Worker | undefined;
  let sequence = 0;
  const requests = new Map<number, {
    resolve: (bytes: Uint8Array<ArrayBuffer>) => void;
    reject: (error: Error) => void;
  }>();
  function close() {
    worker?.terminate();
    worker = undefined;
    for (const { reject } of requests.values()) reject(Error(unavailable));
    requests.clear();
  }
  signal.addEventListener('abort', close, { once: true });

  return function readFile(file: FileSystemFileHandle): Promise<Uint8Array<ArrayBuffer>> {
    signal.throwIfAborted();
    if (!worker) {
      worker = new Worker(new URL('./browser-wallet-archive-worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = ({ data }: MessageEvent<{ id: number; bytes?: Uint8Array<ArrayBuffer> }>) => {
        const request = requests.get(data.id);
        if (!request) return;
        requests.delete(data.id);
        if (data.bytes) request.resolve(data.bytes);
        else request.reject(Error(unavailable));
      };
      worker.onerror = close;
      worker.onmessageerror = close;
    }
    const reader = worker;
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      requests.set(id, { resolve, reject });
      try {
        reader.postMessage({ id, file });
      } catch (error) {
        requests.delete(id);
        reject(error);
      }
    });
  };
}

export async function hasBrowserWalletArchive(storage: Pick<StorageManager, 'getDirectory'>): Promise<boolean> {
  const root = await storage.getDirectory();
  try {
    await root.getDirectoryHandle(directoryName);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return false;
    throw error;
  }
}

export async function openBrowserWalletArchive(
  storage: Pick<StorageManager, 'getDirectory'>,
  locks: LockManager,
  readFile: ReturnType<typeof createBrowserWalletArchiveReader>,
): Promise<DeviceWalletArchive> {
  const root = await storage.getDirectory();

  async function file(key: string, create = false) {
    if (!/^[a-f0-9]{64}$/.test(key)) throw Error('BANK_WALLET_DEVICE_ARCHIVE_INVALID');
    const directory = await root.getDirectoryHandle(directoryName, { create });
    return directory.getFileHandle(key, { create });
  }

  async function readLockedFile(key: string) {
    try {
      const bytes = await readFile(await file(key));
      // Creating a file handle can leave an empty file if the write is interrupted.
      return bytes.length ? bytes : null;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotFoundError') return null;
      throw error;
    }
  }

  const locked = async <T>(key: string, work: () => Promise<T>): Promise<T> =>
    await locks.request(`${directoryName}:${key}`, work);

  return {
    read: key => locked(key, () => readLockedFile(key)),
    async write(key, previousDigest, bytes) {
      return locked(key, async () => {
        const held = await readLockedFile(key);
        const digest = held && new Uint8Array(await crypto.subtle.digest('SHA-256', held));
        const hex = digest && Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
        if (hex !== previousDigest) return false;
        const writer = await (await file(key, true)).createWritable();
        try {
          await writer.write(bytes.slice());
          await writer.close();
        } catch (error) {
          await writer.abort().catch(() => {});
          throw error;
        }
        return true;
      });
    },
  };
}

export interface NfcRecord { recordType: string; data: DataView; encoding?: string; }
export interface BankNfcReader {
  write(message: { records: { recordType: 'url'; data: string }[] }, options?: { signal: AbortSignal }): Promise<void>;
  scan?(options: { signal: AbortSignal }): Promise<void>;
  addEventListener?(type: 'reading' | 'readingerror', handler: (event: { message?: { records: NfcRecord[] } }) => void, options?: { once: boolean }): void;
}
export type BankNfcConstructor = new () => BankNfcReader;
export function nfcUrl(records: NfcRecord[]): string | null {
  const record = records.find(record => record.recordType === 'url');
  if (!record?.data || record.data.byteLength > 2048) return null;
  try { return new TextDecoder(record.encoding ?? 'utf-8', { fatal: true }).decode(record.data); } catch { return null; }
}
export async function verifyPaymentTag(Reader: BankNfcConstructor, link: string, signal: AbortSignal): Promise<void> {
  const reader = new Reader();
  if (!reader.scan || !reader.addEventListener) throw new Error('Tag verification is unavailable on this browser. Test the tag with another phone.');
  await new Promise<void>((resolve, reject) => {
    const abort = () => reject(new DOMException('NFC check cancelled', 'AbortError'));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    const finish = (error?: Error) => { signal.removeEventListener('abort', abort); if (error) reject(error); else resolve(); };
    reader.addEventListener!('reading', event => finish(nfcUrl(event.message?.records ?? []) === link ? undefined : new Error('This tag has a different payment link. Rewrite it or use the matching account.')), { once: true });
    reader.addEventListener!('readingerror', () => finish(new Error('The tag could not be read. Hold it closer and try again.')), { once: true });
    void reader.scan!({ signal }).catch(error => finish(error));
  });
}

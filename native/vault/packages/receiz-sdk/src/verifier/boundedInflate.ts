import { Inflate } from 'fflate';
import { ReceizProtocolLimitError } from '../verificationLimits.js';

/** One streaming inflation. A bounded input window prevents a highly compressed
 * stream from doing unbounded expansion before the output callback can stop it.
 * This is a runtime budget; it never changes the validity of retained bytes. */
export function inflateReceizBounded(input: Uint8Array, maxOutputBytes: number, maxInputBytes: number): Uint8Array {
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 0 || !Number.isSafeInteger(maxInputBytes)
    || maxInputBytes < 0 || input.byteLength > maxInputBytes) {
    throw new ReceizProtocolLimitError('VERIFICATION_RESOURCE_UNAVAILABLE', 'verification-runtime');
  }
  const chunks: Uint8Array[] = [];
  let length = 0;
  const inflater = new Inflate((chunk) => {
    if (chunk.byteLength > maxOutputBytes - length) {
      throw new ReceizProtocolLimitError('VERIFICATION_RESOURCE_UNAVAILABLE', 'verification-runtime');
    }
    if (chunk.byteLength) { chunks.push(chunk); length += chunk.byteLength; }
  });
  const windowBytes = 256;
  if (!input.byteLength) inflater.push(input, true);
  for (let offset = 0; offset < input.byteLength; offset += windowBytes) {
    inflater.push(input.subarray(offset, offset + windowBytes), offset + windowBytes >= input.byteLength);
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return output;
}

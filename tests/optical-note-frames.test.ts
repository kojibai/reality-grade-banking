import { expect, it } from 'vitest';
import { createOpticalNoteFrames, readOpticalNoteFrames } from '../src/receiz/optical-note-frames';
import { opticalNoteQr } from '../src/receiz/payment-qr';
import decode from '../src/vendor/jsqr/index.js';

const bytes = (length: number) => Uint8Array.from({ length }, (_, index) => index % 251);

it('reopens an exact payment after out-of-order frames and retransmissions', async () => {
  const request = await createOpticalNoteFrames('request', bytes(3303));
  const original = bytes(90579);
  const payment = await createOpticalNoteFrames('payment', original, request.session);
  const receiver = readOpticalNoteFrames('payment', request.session);
  expect(receiver.push(payment.frame(1))).toBeNull();
  expect(receiver.push(payment.frame(1))).toBeNull();
  expect(receiver.received).toBe(1);
  for (let i = payment.count - 1; i > 1; i--) expect(receiver.push(payment.frame(i))).toBeNull();
  await expect(receiver.push(payment.frame(0))).resolves.toEqual({ bytes: original, session: request.session });
});

it('refuses foreign sessions, conflicting repeated frames, and a changed complete payload', async () => {
  const request = await createOpticalNoteFrames('request', bytes(30));
  const other = await createOpticalNoteFrames('request', bytes(31));
  const payment = await createOpticalNoteFrames('payment', bytes(1000), request.session);
  expect(() => readOpticalNoteFrames('payment', other.session).push(payment.frame(0))).toThrow('BANK_OPTICAL_FRAME_MISMATCH');
  const receiver = readOpticalNoteFrames('payment', request.session);
  const changed = payment.frame(1);
  changed[changed.length - 1] ^= 1;
  expect(receiver.push(changed)).toBeNull();
  expect(() => receiver.push(payment.frame(1))).toThrow('BANK_OPTICAL_FRAME_MISMATCH');
  await expect(receiver.push(payment.frame(0))).rejects.toThrow('BANK_OPTICAL_PROOF_MISMATCH');
});

it('round-trips a full binary frame through Bankeiz’s camera decoder', async () => {
  const original = bytes(3303);
  const request = await createOpticalNoteFrames('request', original);
  const receiver = readOpticalNoteFrames('request');
  let complete: ReturnType<typeof receiver.push> = null;
  for (let i = 0; i < request.count; i++) {
    const frame = request.frame(i), matrix = opticalNoteQr(frame), width = (matrix.length + 8) * 4;
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
    matrix.forEach((row, y) => row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
        const offset = ((y * 4 + 16 + dy) * width + x * 4 + 16 + dx) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
      }
    }));
    const code = decode(pixels, width, width, { inversionAttempts: 'dontInvert' });
    expect(code).toBeTruthy();
    const scanned = Uint8Array.from(code!.binaryData);
    expect(scanned).toEqual(frame);
    complete = receiver.push(scanned);
  }
  await expect(complete).resolves.toEqual({ bytes: original, session: request.session });
});

it('carries Wallet Originals through the same binary QR while separating Note frames', async () => {
  const original = bytes(3303);
  const frames = await createOpticalNoteFrames('wallet', original);
  expect(() => readOpticalNoteFrames('request').push(frames.frame(0))).toThrow('BANK_OPTICAL_FRAME_MISMATCH');
  const receiver = readOpticalNoteFrames('wallet');
  for (let index = 0; index < frames.count - 1; index++) expect(receiver.push(frames.frame(index))).toBeNull();
  await expect(receiver.push(frames.frame(frames.count - 1))).resolves.toEqual({ bytes: original, session: frames.session });
});

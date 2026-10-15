import { inflateSync } from 'node:zlib';
import { expect, it } from 'vitest';
import { encodeNotePng } from '../src/receiz/note-png';

it('exports an indexed carrier with exact test colors, dimensions, 600 DPI and valid PNG chunks', async () => {
  const rgba = new Uint8ClampedArray([12, 34, 56, 255, 240, 235, 220, 255, 12, 34, 56, 255, 240, 235, 220, 255]);
  const bytes = await encodeNotePng(rgba, 2, 2);
  expect([...bytes.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = new Map<string, Uint8Array>(); let offset = 8;
  while (offset < bytes.length) {
    const view = new DataView(bytes.buffer, bytes.byteOffset + offset), length = view.getUint32(0);
    const type = new TextDecoder().decode(bytes.slice(offset + 4, offset + 8));
    const chunk = bytes.slice(offset + 4, offset + 8 + length);
    let crc = 0xffffffff;
    for (const byte of chunk) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
    expect(view.getUint32(8 + length)).toBe((crc ^ 0xffffffff) >>> 0);
    chunks.set(type, bytes.slice(offset + 8, offset + 8 + length)); offset += length + 12;
  }
  const header = new DataView(chunks.get('IHDR')!.buffer);
  expect(header.getUint32(0)).toBe(2); expect(header.getUint32(4)).toBe(2);
  const density = new DataView(chunks.get('pHYs')!.buffer);
  expect(density.getUint32(0)).toBe(23622); expect(density.getUint32(4)).toBe(23622); expect(density.getUint8(8)).toBe(1);
  const pixels = inflateSync(chunks.get('IDAT')!), palette = chunks.get('PLTE')!;
  const prior = [0, 0];
  for (let y = 0; y < 2; y++) { const filter = pixels[y * 3]; expect([0, 1, 2]).toContain(filter); let left = 0; for (let x = 0; x < 2; x++) {
    const pixel = (pixels[y * 3 + x + 1] + (filter === 1 ? left : filter === 2 ? prior[x] : 0)) & 255; prior[x] = pixel; left = pixel;
    const index = pixel * 3;
    expect([...palette.slice(index, index + 3)]).toEqual([...rgba.slice((y * 2 + x) * 4, (y * 2 + x) * 4 + 3)]);
  } }
  expect(chunks.has('IEND')).toBe(true);
  expect(new TextDecoder().decode(bytes)).not.toContain('receiz.bank.offline-note');
});

it('rejects invalid or unbounded pixel buffers before allocating encoding work', async () => {
  await expect(encodeNotePng(new Uint8ClampedArray(4), 0, 1)).rejects.toThrow();
  await expect(encodeNotePng(new Uint8ClampedArray(4), 3240, 1944)).rejects.toThrow();
});

it('bounds the palette and preserves a varied engraving color field through filtered PNG decoding', async () => {
  const width = 32, height = 16, rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rgba.set([x * 8, y * 16, (x + y) % 16 * 16, 255], (y * width + x) * 4);
  const bytes = await encodeNotePng(rgba, width, height);
  const chunks = new Map<string, Uint8Array>();
  for (let offset = 8; offset < bytes.length;) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset).getUint32(0);
    chunks.set(new TextDecoder().decode(bytes.slice(offset + 4, offset + 8)), bytes.slice(offset + 8, offset + 8 + length)); offset += length + 12;
  }
  const palette = chunks.get('PLTE')!, pixels = inflateSync(chunks.get('IDAT')!), previous = new Uint8Array(width);
  expect(palette.length).toBe(192 * 3);
  let error = 0;
  for (let y = 0; y < height; y++) {
    const filter = pixels[y * (width + 1)]; expect([0, 1, 2]).toContain(filter); let left = 0;
    for (let x = 0; x < width; x++) {
      const index = (pixels[y * (width + 1) + x + 1] + (filter === 1 ? left : filter === 2 ? previous[x] : 0)) & 255;
      expect(index).toBeLessThan(192); previous[x] = index; left = index;
      for (let channel = 0; channel < 3; channel++) error += Math.abs(palette[index * 3 + channel] - rgba[(y * width + x) * 4 + channel]);
    }
  }
  expect(error / (width * height * 3)).toBeLessThan(12);
});

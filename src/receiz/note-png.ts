/** Compact 600-DPI PNG export. Indexed ink keeps the high-resolution carrier
 * inside v129's 8 MB envelope, leaving room for its exact embedded proof bytes.
 * Palette selection changes only presentation colors, never any proof source. */
export async function encodeNotePng(rgba: Uint8ClampedArray, width: number, height: number): Promise<Uint8Array> {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width > 3240 || height > 1944 || rgba.length !== width * height * 4) throw Error('BANK_NOTE_IMAGE_DIMENSIONS_INVALID');
  const counts = new Uint32Array(32768), red = new Uint32Array(32768), green = new Uint32Array(32768), blue = new Uint32Array(32768);
  const keyAt = (i: number) => ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
  for (let i = 0; i < rgba.length; i += 4) { const key = keyAt(i); counts[key]++; red[key] += rgba[i]; green[key] += rgba[i + 1]; blue[key] += rgba[i + 2]; }
  const channels = [red, green, blue], bins = [...counts.keys()].filter(key => counts[key] > 0);
  function box(keys: number[]) {
    const ranges = channels.map(channel => { const values = keys.map(key => channel[key] / counts[key]); return Math.max(...values) - Math.min(...values); });
    const axis = ranges.indexOf(Math.max(...ranges)), count = keys.reduce((sum, key) => sum + counts[key], 0);
    return { keys, axis, count, score: keys.length > 1 ? ranges[axis] ** 2 * Math.sqrt(count) : 0 };
  }
  const boxes = [box(bins)];
  while (boxes.length < 192) {
    let selected = 0; for (let i = 1; i < boxes.length; i++) if (boxes[i].score > boxes[selected].score) selected = i;
    const current = boxes[selected]; if (!current.score) break;
    const channel = channels[current.axis]; current.keys.sort((a, b) => channel[a] / counts[a] - channel[b] / counts[b]);
    let cut = 0, total = 0; while (cut < current.keys.length - 1 && total < current.count / 2) total += counts[current.keys[cut++]];
    cut = Math.max(1, cut);
    boxes.splice(selected, 1, box(current.keys.slice(0, cut)), box(current.keys.slice(cut)));
  }
  const palette = new Uint8Array(boxes.length * 3), colors = boxes.map((current, i) => channels.map((channel, c) => {
    const value = Math.round(current.keys.reduce((sum, key) => sum + channel[key], 0) / current.count); palette[i * 3 + c] = value; return value;
  }));
  const lookup = new Uint8Array(32768);
  for (const key of bins) {
    const r = red[key] / counts[key], g = green[key] / counts[key], b = blue[key] / counts[key]; let closest = 0, distance = Infinity;
    for (let i = 0; i < colors.length; i++) { const color = colors[i], next = 3 * (r - color[0]) ** 2 + 4 * (g - color[1]) ** 2 + 2 * (b - color[2]) ** 2; if (next < distance) { closest = i; distance = next; } }
    lookup[key] = closest;
  }
  const scanlines = new Uint8Array((width + 1) * height), previous = new Uint8Array(width), current = new Uint8Array(width), candidates = [new Uint8Array(width), new Uint8Array(width), new Uint8Array(width)];
  for (let y = 0; y < height; y++) {
    const scores = [0, 0, 0];
    for (let x = 0; x < width; x++) {
      const value = lookup[keyAt((y * width + x) * 4)]; current[x] = value;
      const values = [value, (value - (x ? current[x - 1] : 0)) & 255, (value - previous[x]) & 255];
      for (let filter = 0; filter < 3; filter++) { candidates[filter][x] = values[filter]; scores[filter] += Math.min(values[filter], 256 - values[filter]); }
    }
    const filter = scores.indexOf(Math.min(...scores)), offset = y * (width + 1);
    scanlines[offset] = filter; scanlines.set(candidates[filter], offset + 1); previous.set(current);
  }
  const stream = new Blob([scanlines]).stream().pipeThrough(new CompressionStream('deflate'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let value = i; for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); crcTable[i] = value; }
  function chunk(type: string, data: Uint8Array) {
    const out = new Uint8Array(data.length + 12), view = new DataView(out.buffer); view.setUint32(0, data.length);
    out.set(new TextEncoder().encode(type), 4); out.set(data, 8); let crc = 0xffffffff;
    for (const byte of out.subarray(4, out.length - 4)) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    view.setUint32(out.length - 4, (crc ^ 0xffffffff) >>> 0); return out;
  }
  const header = new Uint8Array(13), headerView = new DataView(header.buffer); headerView.setUint32(0, width); headerView.setUint32(4, height); header[8] = 8; header[9] = 3;
  const density = new Uint8Array(9), densityView = new DataView(density.buffer); densityView.setUint32(0, 23622); densityView.setUint32(4, 23622); density[8] = 1;
  const chunks = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('pHYs', density), chunk('PLTE', palette), chunk('IDAT', compressed), chunk('IEND', new Uint8Array())];
  const result = new Uint8Array(chunks.reduce((sum, current) => sum + current.length, 0)); let offset = 0;
  for (const current of chunks) { result.set(current, offset); offset += current.length; }
  return result;
}

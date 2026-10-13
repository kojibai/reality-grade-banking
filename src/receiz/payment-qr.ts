// QR Model 2, version 9, byte mode, correction L, mask 0. Public request
// locators only. Fixed capacity keeps the implementation and resource use bounded.
export function paymentQr(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text); if (!bytes.length || bytes.length > 230) throw new Error('Payment link exceeds QR capacity.');
  const bits: number[] = [], append = (value: number, count: number) => { for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1); };
  append(4, 4); append(bytes.length, 8); bytes.forEach(byte => append(byte, 8)); append(0, Math.min(4, 1856 - bits.length)); while (bits.length % 8) bits.push(0);
  const data: number[] = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((value, bit) => value * 2 + bit, 0));
  for (let pad = 0; data.length < 232; pad++) data.push(pad % 2 ? 0x11 : 0xec);
  const multiply = (a: number, b: number) => { let result = 0; for (let i = 7; i >= 0; i--) { result = (result << 1) ^ ((result >>> 7) * 0x11d); result ^= ((b >>> i) & 1) * a; } return result; };
  const divisor = Array<number>(30).fill(0); divisor[29] = 1; let root = 1;
  for (let i = 0; i < 30; i++) { for (let j = 0; j < divisor.length; j++) { divisor[j] = multiply(divisor[j], root); if (j + 1 < divisor.length) divisor[j] ^= divisor[j + 1]; } root = multiply(root, 2); }
  const ecc = (block: number[]) => { const remainder = Array<number>(30).fill(0); for (const byte of block) { const factor = byte ^ remainder.shift()!; remainder.push(0); divisor.forEach((coefficient, i) => { remainder[i] ^= multiply(coefficient, factor); }); } return remainder; };
  const blocks = [data.slice(0, 116), data.slice(116)], corrections = blocks.map(ecc), words: number[] = [];
  for (let i = 0; i < 116; i++) blocks.forEach(block => words.push(block[i])); for (let i = 0; i < 30; i++) corrections.forEach(block => words.push(block[i]));
  const size = 53, matrix = Array.from({ length: size }, () => Array<boolean>(size).fill(false)), reserved = matrix.map(row => row.map(() => false));
  const set = (x: number, y: number, dark: boolean) => { if (x >= 0 && y >= 0 && x < size && y < size) { matrix[y][x] = dark; reserved[y][x] = true; } };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx: number, cy: number) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const distance = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, distance !== 2 && distance !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const positions = [6, 26, 46]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (i === 0 && j === 0 || i === 0 && j === 2 || i === 2 && j === 0) continue; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(positions[i] + dx, positions[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
  let remainder = 8; for (let i = 0; i < 10; i++) remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537); const format = ((8 << 10) | remainder) ^ 0x5412;
  const formatBit = (i: number) => ((format >>> i) & 1) !== 0;
  for (let i = 0; i <= 5; i++) set(8, i, formatBit(i)); set(8, 7, formatBit(6)); set(8, 8, formatBit(7)); set(7, 8, formatBit(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, formatBit(i));
  for (let i = 0; i < 8; i++) set(size - 1 - i, 8, formatBit(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, formatBit(i)); set(8, size - 8, true);
  remainder = 9; for (let i = 0; i < 12; i++) remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1f25); const version = (9 << 12) | remainder;
  for (let i = 0; i < 18; i++) { const x = size - 11 + i % 3, y = Math.floor(i / 3), bit = ((version >>> i) & 1) !== 0; set(x, y, bit); set(y, x, bit); }
  let index = 0; for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let vertical = 0; vertical < size; vertical++) { const y = ((right + 1) & 2) === 0 ? size - 1 - vertical : vertical; for (let j = 0; j < 2; j++) { const x = right - j; if (reserved[y][x]) continue; const dark = index < words.length * 8 && ((words[index >>> 3] >>> (7 - (index & 7))) & 1) !== 0; matrix[y][x] = dark !== ((x + y) % 2 === 0); index++; } } }
  return matrix;
}
export function paymentQrPath(matrix: boolean[][]): string { return matrix.flatMap((row, y) => row.flatMap((dark, x) => dark ? [`M${x + 4},${y + 4}h1v1h-1z`] : [])).join(''); }

/** Carrier presentation only: denominations and pictures never authorize value. */
export type NoteRail = 'reserve' | 'settlement' | 'composite';
export const noteTitle=(rail:NoteRail='reserve')=>rail==='composite'?'Settlement Reserve Note':rail==='settlement'?'Settlement Note':'Reserve Note';
export const noteAccountLabel=(rail:NoteRail='reserve')=>rail==='composite'?'Settlement + Reserve':rail==='settlement'?'Settlement':'Reserve';
export const NOTE_FONT = 'Reserve Note Serif';
export const NOTE_PAPER = '/notes/banknote-engraving.webp';
export const NOTE_DIGITS = '/notes/denomination-engraving.png';
export const NOTE_MASTHEAD = '/notes/reserve-note-masthead.png';
export const NOTE_SETTLEMENT_MASTHEAD = '/notes/settlement-note-masthead.png';
export const NOTE_COMPOSITE_MASTHEAD = '/notes/settlement-reserve-note-masthead.png';
export const NOTE_FONT_URL = '/notes/fonts/Cinzel.ttf';
type Crop = readonly [number, number, number, number];
export interface NoteImagePrint { asset: string; crop: Crop; x: number; y: number; width: number; height: number; }
export interface NoteTextPrint { value: string; x: number; y: number; size: number; tracking: number; width: number; maxWidth: number; corner?: boolean; }
// Exact alpha bounds of the generated intaglio glyphs. Decimal marks retain
// their own optical size instead of being enlarged to the numeral cap height.
const glyphs: Record<string, Crop> = {
  '0': [49, 38, 254, 303], '1': [372, 38, 182, 301], '2': [645, 37, 237, 301],
  '3': [951, 35, 241, 306], '4': [1243, 36, 244, 301], '5': [53, 368, 239, 303],
  '6': [347, 368, 250, 305], '7': [654, 373, 229, 297], '8': [940, 366, 257, 306],
  '9': [1258, 367, 250, 305], '$': [58, 693, 227, 285], '.': [420, 826, 130, 119], ',': [720, 796, 124, 176],
};
const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
function words(n: number): string {
  if (n >= 1000000) return `${words(Math.floor(n / 1000000))} MILLION${n % 1000000 ? ` ${words(n % 1000000)}` : ''}`;
  if (n >= 1000) return `${words(Math.floor(n / 1000))} THOUSAND${n % 1000 ? ` ${words(n % 1000)}` : ''}`;
  if (n >= 100) return `${ones[Math.floor(n / 100)]} HUNDRED${n % 100 ? ` ${words(n % 100)}` : ''}`;
  return n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? `-${ones[n % 10]}` : ''}`;
}
export function notePreviewCents(input: string): string | null {
  const match = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return null;
  const cents = BigInt(match[1]) * 100n + BigInt((match[2] ?? '').padEnd(2, '0'));
  return cents > 0n && cents <= 100000000n ? cents.toString() : null;
}
export function noteDenomination(input: string) {
  if (!/^[1-9]\d*$/.test(input) || BigInt(input) > 100000000n) throw Error('BANK_NOTE_AMOUNT_INVALID');
  const cents = BigInt(input), whole = Number(cents / 100n), fraction = Number(cents % 100n);
  const numeric = `${whole.toLocaleString('en-US')}${fraction ? `.${fraction.toString().padStart(2, '0')}` : ''}`;
  const dollars = whole ? `${words(whole)} ${whole === 1 ? 'DOLLAR' : 'DOLLARS'}` : '';
  const change = fraction ? `${words(fraction)} ${fraction === 1 ? 'CENT' : 'CENTS'}` : '';
  return { display: `$${numeric}`, numeric, words: `${dollars}${dollars && change ? ' AND ' : ''}${change}` };
}
function denomination(value: string, x: number, y: number, width: number, height: number, main = false) {
  const scaleOf = (char: string) => char === '$' ? 0.48 : char === '.' ? 0.10 : char === ',' ? 0.17 : 1;
  const gap = height * (main ? 0.035 : 0.005);
  const natural = [...value].map(char => { const crop = glyphs[char], h = height * scaleOf(char); return { char, crop, height: h, width: h * crop[2] / crop[3] }; });
  const naturalWidth = natural.reduce((sum, item) => sum + item.width, 0) + (natural.length - 1) * gap;
  const scale = Math.min(1, width / naturalWidth), images: NoteImagePrint[] = [];
  let cursor = x + (width - naturalWidth * scale) / 2;
  for (const item of natural) {
    const h = item.height * scale, w = item.width * scale;
    const start = y + (height - height * scale) / 2;
    const top = item.char === '$' && main ? start + 7 * scale : item.char === '.' || item.char === ',' ? start + height * scale - h : start;
    images.push({ asset: NOTE_DIGITS, crop: item.crop, x: cursor, y: top, width: w, height: h });
    cursor += w + gap * scale;
  }
  return { value, x, y, width, height, images };
}
// Print-line width is fixed in both SVG and Canvas, so font loading cannot
// change the note's composition or make long denominations cross its thread.
function printText(value: string, y: number, size: number, tracking: number, maxWidth = 335): NoteTextPrint {
  const measured = value.length * size * 0.66 + Math.max(0, value.length - 1) * tracking;
  const scale = Math.min(1, maxWidth / measured);
  const width = Math.min(maxWidth, measured);
  return { value, x: 258 - width / 2, y, size: size * scale, tracking: tracking * scale, width, maxWidth };
}
export function reserveNoteDesign(cents: string, noteId: string, rail: NoteRail = 'reserve') {
  if (rail !== 'reserve' && rail !== 'settlement' && rail !== 'composite') throw Error('BANK_NOTE_RAIL_INVALID');
  const denominationValue = noteDenomination(cents), title = noteTitle(rail).toUpperCase();
  const serialHex = noteId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padEnd(16, '0');
  const serial = `${rail === 'composite' ? 'SR' : rail === 'settlement' ? 'SN' : 'RN'} ${serialHex.slice(0, 8)} ${serialHex.slice(8, 16)}`;
  const denominations = [denomination(denominationValue.display, 87, 164, 342, 121, true), ...[[23, 34], [744, 34], [23, 410], [744, 410]].map(([x, y]) => ({ value: denominationValue.numeric, x, y, width: 43, height: 27, images: [] as NoteImagePrint[] }))];
  const wordLines = denominationValue.words.includes(' AND ') ? denominationValue.words.split(' AND ').map((line, i) => i ? `AND ${line}` : line) : [denominationValue.words];
  const texts = wordLines.map((line, i) => printText(line, wordLines.length === 1 ? 304 : 297 + i * 14, 13.2, 2.7));
  texts.push(printText(rail!=='reserve'?'VALUE AT CREATION · USD':'DENOMINATED IN USD', 332, 10.5, 2.2), printText(`REDEEMABLE INTO ${rail==='composite'?'SETTLEMENT + RESERVE':rail.toUpperCase()}`, 346, 7.4, 2.1), printText(serial, 375, 14.2, 1.4), printText('TRANSFER BY VERIFIED CUSTODY', 394, 5.7, 1.6));
  for (const corner of denominations.slice(1)) {
    const width = Math.min(43, corner.value.length * 19), size = 36 * Math.min(1, 3 / corner.value.length);
    texts.push({ value: corner.value, x: corner.x + (43 - width) / 2, y: corner.y + 13.5 + size * 0.35, size, tracking: -size / 45, width, maxWidth: 43, corner: true });
  }
  const masthead = rail === 'composite' ? NOTE_COMPOSITE_MASTHEAD : rail === 'settlement' ? NOTE_SETTLEMENT_MASTHEAD : NOTE_MASTHEAD;
  const images: NoteImagePrint[] = [{ asset: masthead, crop: rail === 'composite' ? [38, 180, 2075, 386] : rail === 'settlement' ? [45, 180, 2034, 386] : [90, 180, 1975, 386], x: 92, y: 88, width: 340, height: 65 }, ...denominations.flatMap(amount => amount.images), { asset: NOTE_MASTHEAD, crop: [224, 420, 1710, 82], x: 139, y: 312, width: 238, height: 10 }, { asset: NOTE_MASTHEAD, crop: [224, 420, 1710, 82], x: 174, y: 381, width: 168, height: 8 }];
  return { title, subtitle: rail === 'composite' ? 'PROOF-BACKED NATIVE VALUE' : rail === 'settlement' ? 'PROOF-NATIVE VALUE' : 'PROOF-BACKED VALUE', serial, denomination: denominationValue, denominations, images, texts };
}

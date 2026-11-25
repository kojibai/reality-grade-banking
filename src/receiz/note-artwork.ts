import { NOTE_ARTWORK_PANEL, NOTE_FONT, NOTE_FONT_URL, NOTE_PAPER, reserveNoteDesign, type NoteRail, type NoteTextPrint } from './note-design';

export const NOTE_ARTWORK_TYPES = 'image/png,image/jpeg,image/webp';
export function validateNoteArtworkFile(file: Blob): void {
  if (!file.size || file.size > 8 * 1024 * 1024 || !NOTE_ARTWORK_TYPES.split(',').includes(file.type)) {
    throw Error('BANK_NOTE_ARTWORK_INVALID');
  }
}

async function readArtwork(file: Blob): Promise<HTMLImageElement> {
  validateNoteArtworkFile(file);
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const matches = (offset: number, bytes: number[]) => bytes.every((byte, index) => header[offset + index] === byte);
  const supported = file.type === 'image/png' ? matches(0, [137, 80, 78, 71, 13, 10, 26, 10])
    : file.type === 'image/jpeg' ? matches(0, [255, 216, 255])
    : matches(0, [82, 73, 70, 70]) && matches(8, [87, 69, 66, 80]);
  if (!supported) throw Error('BANK_NOTE_ARTWORK_INVALID');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) {
      throw Error('BANK_NOTE_ARTWORK_INVALID');
    }
    return image;
  } catch {
    throw Error('BANK_NOTE_ARTWORK_INVALID');
  } finally {
    URL.revokeObjectURL(url);
  }
}

const imageLoads = new Map<string, Promise<HTMLImageElement>>();
let fontLoad: Promise<void> | undefined;
async function loadAssets(urls: string[]) {
    const [images] = await Promise.all([Promise.all(urls.map(async url => {
      let pending = imageLoads.get(url);
      if (!pending) { pending = (async () => { const image = new Image(); image.src = url; await image.decode(); return image; })().catch(error => { imageLoads.delete(url); throw error; }); imageLoads.set(url, pending); }
      return [url, await pending] as const;
    })), fontLoad ??= (async () => {
      const face = new FontFace(NOTE_FONT, `url("${NOTE_FONT_URL}")`, { weight: '400 900' });
      document.fonts.add(await face.load());
    })().catch(error => { fontLoad = undefined; throw error; })]);
    return { images: new Map(images) };
}
function drawText(ctx: CanvasRenderingContext2D, text: NoteTextPrint) {
  ctx.save(); ctx.font = `700 ${text.size}px "${NOTE_FONT}"`; ctx.fontKerning = 'none';
  const characters = [...text.value], widths = characters.map(char => ctx.measureText(char).width);
  const natural = widths.reduce((sum, width) => sum + width, 0) + (characters.length - 1) * text.tracking;
  ctx.translate(text.x, text.y); ctx.scale(text.width / natural, 1);
  let x = 0;
  if (text.corner) { ctx.strokeStyle = '#f4eedb'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; }
  for (let i = 0; i < characters.length; i++) { if (text.corner) ctx.strokeText(characters[i], x, 0); ctx.fillText(characters[i], x, 0); x += widths[i] + text.tracking; }
  ctx.restore();
}
/** Same presentation for preview, issuance and transfer. Proof embedding remains
 * exclusively in the v129 note runtime, after verification of funded custody. */
export async function bankNoteArtwork(cents: string, noteId: string, compact = false, rail: NoteRail = 'reserve', customArtwork?: Blob): Promise<Uint8Array> {
  const design = reserveNoteDesign(cents, noteId, rail);
  const [{ images }, custom] = await Promise.all([
    loadAssets([...new Set([NOTE_PAPER, ...design.images.map(image => image.asset)])]),
    customArtwork ? readArtwork(customArtwork) : undefined,
  ]);
  const canvas = document.createElement('canvas');
  // A bounded indexed face leaves room for the complete connected funding and delivery proof.
  canvas.width = compact ? 360 : custom ? 1620 : 3240;
  canvas.height = compact ? 216 : custom ? 972 : 1944;
  const scale = canvas.width / 810;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('The note image could not be prepared.');
  ctx.scale(scale, scale); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(images.get(NOTE_PAPER)!, 0, 0, 810, 486);
  for (const image of design.images) ctx.drawImage(images.get(image.asset)!, ...image.crop, image.x, image.y, image.width, image.height);
  if (custom) {
    const { x, y, width, height } = NOTE_ARTWORK_PANEL;
    const ratio = Math.min(width / custom.naturalWidth, height / custom.naturalHeight);
    const imageWidth = custom.naturalWidth * ratio, imageHeight = custom.naturalHeight * ratio;
    ctx.drawImage(custom, x + (width - imageWidth) / 2, y + (height - imageHeight) / 2, imageWidth, imageHeight);
  }
  ctx.fillStyle = '#152e43';
  design.texts.forEach(text => drawText(ctx, text));
  if (!compact) {
    const { encodeNotePng } = await import('./note-png');
    return encodeNotePng(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The note image could not be saved.')), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

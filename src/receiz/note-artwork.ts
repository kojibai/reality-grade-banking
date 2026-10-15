import { NOTE_FONT, NOTE_FONT_URL, NOTE_PAPER, reserveNoteDesign, type NoteRail, type NoteTextPrint } from './note-design';

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
export async function bankNoteArtwork(cents: string, noteId: string, compact = false, rail: NoteRail = 'reserve'): Promise<Uint8Array> {
  const design = reserveNoteDesign(cents, noteId, rail), { images } = await loadAssets([...new Set([NOTE_PAPER, ...design.images.map(image => image.asset)])]);
  const canvas = document.createElement('canvas'); canvas.width = compact ? 360 : 3240; canvas.height = compact ? 216 : 1944;
  const scale = canvas.width / 810;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('The note image could not be prepared.');
  ctx.scale(scale, scale); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(images.get(NOTE_PAPER)!, 0, 0, 810, 486);
  for (const image of design.images) ctx.drawImage(images.get(image.asset)!, ...image.crop, image.x, image.y, image.width, image.height);
  ctx.fillStyle = '#152e43';
  design.texts.forEach(text => drawText(ctx, text));
  if (!compact) {
    const { encodeNotePng } = await import('./note-png');
    return encodeNotePng(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
  }
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('The note image could not be saved.')), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

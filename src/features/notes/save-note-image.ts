/** Native sharing receives the untouched carrier bytes, including its proof.
 * Keep Download original PNG available when a photo app re-encodes an image. */
export async function shareNoteImage(bytes: Uint8Array, filename: string,title='Note'): Promise<'shared' | 'cancelled' | 'download'> {
  const file = new File([new Uint8Array(bytes)], filename, { type: 'image/png' });
  try {
    if (!navigator.canShare?.({ files: [file] }) || !navigator.share) return 'download';
    await navigator.share({ files: [file], title }); return 'shared';
  }
  catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
    return 'download';
  }
}

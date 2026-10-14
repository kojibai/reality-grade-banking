type Source = HTMLVideoElement | HTMLImageElement | ImageBitmap;
type Decoder = { detect: (source: Source) => Promise<{ rawValue: string }[]> };
export async function decodePaymentPixels(pixels: Uint8ClampedArray, width: number, height: number): Promise<string | null> {
  if (!width || !height || width * height > 1_000_000 || pixels.length !== width * height * 4) return null;
  const { default: decode } = await import('../vendor/jsqr/index.js');
  return decode(pixels, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}
export function paymentDecoder(): Decoder {
  const Native = (window as unknown as { BarcodeDetector?: new (input: { formats: string[] }) => Decoder }).BarcodeDetector;
  try { if (Native) return new Native({ formats: ['qr_code'] }); } catch { /* Some engines expose it without QR support. */ }
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This device could not open the QR reader. Paste the payment link below.');
  return { async detect(source) {
    const width = 'videoWidth' in source ? source.videoWidth : 'naturalWidth' in source ? source.naturalWidth : source.width;
    const height = 'videoHeight' in source ? source.videoHeight : 'naturalHeight' in source ? source.naturalHeight : source.height;
    if (!width || !height) return [];
    const scale = Math.min(1, 720 / Math.max(width, height)); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const value = await decodePaymentPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
    return value ? [{ rawValue: value }] : [];
  } };
}
export async function openQrImage(file: File): Promise<{ source: Source; close: () => void }> {
  if (typeof createImageBitmap === 'function') { const bitmap = await createImageBitmap(file); return { source: bitmap, close: () => bitmap.close() }; }
  const url = URL.createObjectURL(file), image = new Image();
  try { await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The QR image could not be opened.')); image.src = url; }); return { source: image, close: () => URL.revokeObjectURL(url) }; }
  catch (error) { URL.revokeObjectURL(url); throw error; }
}

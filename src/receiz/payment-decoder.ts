import { readNearbyPaymentLink } from './wallet-nearby-link';

type Source = HTMLVideoElement | HTMLImageElement | ImageBitmap;
type Decoder = { detect: (source: Source) => Promise<{ rawValue: string; bytes?:Uint8Array }[]> };
export async function decodePaymentPixels(pixels: Uint8ClampedArray, width: number, height: number): Promise<string | null> {
  if (!width || !height || width * height > 1_000_000 || pixels.length !== width * height * 4) return null;
  const { default: decode } = await import('../vendor/jsqr/index.js');
  return decode(pixels, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}
export function paymentDecoder(binary=false): Decoder {
  const Native = (window as unknown as { BarcodeDetector?: new (input: { formats: string[] }) => Decoder }).BarcodeDetector;
  let native: Decoder | undefined;
  try { if (Native) native = new Native({ formats: ['qr_code'] }); } catch { /* Some engines expose it without QR support. */ }
  if (native && !binary) return native;
  const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('This device could not open the QR reader. Paste the payment link below.');
  return { async detect(source) {
    if (binary && native) {
      try {
        const code = (await native.detect(source)).find(({ rawValue }) => readNearbyPaymentLink(rawValue));
        if (code) return [{ rawValue: code.rawValue, bytes: new TextEncoder().encode(code.rawValue) }];
      } catch { /* The exact byte decoder also accepts existing optical frames. */ }
    }
    const width = 'videoWidth' in source ? source.videoWidth : 'naturalWidth' in source ? source.naturalWidth : source.width;
    const height = 'videoHeight' in source ? source.videoHeight : 'naturalHeight' in source ? source.naturalHeight : source.height;
    if (!width || !height) return [];
    const imagePixels = (limit: number) => {
      const scale = Math.min(1, limit / Math.max(width, height));
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      return context.getImageData(0,0,canvas.width,canvas.height).data;
    };
    const pixels = imagePixels(binary && 'videoWidth' in source ? 1280 : 720);
    if(binary){
      const {default:decode}=await import('../vendor/jsqr/index.js');
      const options = { inversionAttempts: 'attemptBoth' as const };
      let code = decode(pixels, canvas.width, canvas.height, options);
      if (!code && !('videoWidth' in source) && Math.max(width, height) > 720) {
        // A code inside a full photo can lose individual modules at 720 px.
        const detail = imagePixels(1600);
        code = decode(detail, canvas.width, canvas.height, options);
        if (!code && Math.max(width, height) > 1600) {
          const full = imagePixels(2048);
          code = decode(full, canvas.width, canvas.height, options);
        }
      }
      return code?[{rawValue:code.data,bytes:Uint8Array.from(code.binaryData)}]:[];
    }
    const value = await decodePaymentPixels(pixels,canvas.width,canvas.height);
    return value ? [{ rawValue: value }] : [];
  } };
}
export async function openQrImage(file: File): Promise<{ source: Source; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, close: () => bitmap.close() };
    } catch { /* Some photo formats are available only through the image element. */ }
  }
  const url = URL.createObjectURL(file), image = new Image();
  try { await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The QR image could not be opened.')); image.src = url; }); return { source: image, close: () => URL.revokeObjectURL(url) }; }
  catch (error) { URL.revokeObjectURL(url); throw error; }
}

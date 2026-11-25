import { useEffect, useRef } from 'react';
import { opticalNoteQr, walletPaymentLinkQr } from '../../receiz/payment-qr';
import { createOpticalNoteFrames } from '../../receiz/optical-note-frames';
import { encodeNearbyWalletPayment, type NearbyWalletPayment } from '../../receiz/wallet-nearby-consent';
import { nearbyPaymentLink } from '../../receiz/wallet-nearby-link';

export type OpticalFrames = Awaited<ReturnType<typeof createOpticalNoteFrames>>;

export type NearbyPaymentCode = OpticalFrames | string;

export async function createNearbyPaymentCode(payment: NearbyWalletPayment): Promise<NearbyPaymentCode> {
  const bytes = encodeNearbyWalletPayment(payment);
  return nearbyPaymentLink(bytes) ?? createOpticalNoteFrames('wallet', bytes);
}

export function WalletPaymentCode({ frames, label, onError }: { frames: NearbyPaymentCode; label: string; onError(cause: unknown): void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;
  useEffect(() => {
    const target = canvas.current!, context = target.getContext('2d');
    if (!context) { errorHandler.current(Error('BANK_OPTICAL_DISPLAY_UNAVAILABLE')); return; }
    const scale = 4, quiet = 4;
    let index = 0;
    const count = typeof frames === 'string' ? 1 : frames.count;
    const paint = () => {
      const matrix = typeof frames === 'string' ? walletPaymentLinkQr(frames) : opticalNoteQr(frames.frame(index));
      const size = (matrix.length + quiet * 2) * scale;
      if (target.width !== size) target.width = target.height = size;
      context.fillStyle = '#fff'; context.fillRect(0, 0, size, size);
      context.fillStyle = '#000';
      matrix.forEach((row, y) => row.forEach((dark, x) => {
        if (dark) context.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }));
      target.dataset.frame = String(index);
      index = (index + 1) % count;
    };
    paint();
    if (count === 1) return;
    const timer = setInterval(paint, 240);
    return () => clearInterval(timer);
  }, [frames]);
  return <canvas ref={canvas} role="img" aria-label={label} style={{ width: 'min(100%, 420px)', height: 'auto', imageRendering: 'pixelated' }} />;
}

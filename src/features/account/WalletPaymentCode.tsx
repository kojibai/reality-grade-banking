import { useEffect, useRef } from 'react';
import { opticalNoteQr } from '../../receiz/payment-qr';
import { type createOpticalNoteFrames } from '../../receiz/optical-note-frames';

export type OpticalFrames = Awaited<ReturnType<typeof createOpticalNoteFrames>>;

export function WalletPaymentCode({ frames, label, onError }: { frames: OpticalFrames; label: string; onError(cause: unknown): void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const errorHandler = useRef(onError);
  errorHandler.current = onError;
  useEffect(() => {
    const target = canvas.current!, context = target.getContext('2d');
    if (!context) { errorHandler.current(Error('BANK_OPTICAL_DISPLAY_UNAVAILABLE')); return; }
    const scale = 4, quiet = 4;
    let index = 0;
    const paint = () => {
      const matrix = opticalNoteQr(frames.frame(index));
      const size = (matrix.length + quiet * 2) * scale;
      if (target.width !== size) target.width = target.height = size;
      context.fillStyle = '#fff'; context.fillRect(0, 0, size, size);
      context.fillStyle = '#000';
      matrix.forEach((row, y) => row.forEach((dark, x) => {
        if (dark) context.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
      }));
      target.dataset.frame = String(index);
      index = (index + 1) % frames.count;
    };
    paint();
    if (frames.count === 1) return;
    const timer = setInterval(paint, 240);
    return () => clearInterval(timer);
  }, [frames]);
  return <canvas ref={canvas} role="img" aria-label={label} style={{ width: 'min(100%, 420px)', height: 'auto', imageRendering: 'pixelated' }} />;
}

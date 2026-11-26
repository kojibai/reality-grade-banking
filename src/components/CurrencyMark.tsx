import type { ReactNode } from 'react';
import './currency-mark.css';

export function CurrencyMark({ symbol, artwork, preview, placeholder, eager = true, onArtworkError }: {
  symbol: string;
  artwork?: string | null;
  preview?: boolean;
  placeholder?: ReactNode;
  eager?: boolean;
  onArtworkError?: () => void;
}) {
  return <span className={preview ? 'currency-mark currency-preview-coin' : 'asset-mark currency-mark'}
    aria-hidden={preview && artwork ? undefined : true}>
    {artwork
      ? <img src={artwork} alt={preview ? 'Selected currency artwork' : ''} loading={eager ? 'eager' : 'lazy'}
        decoding="async" referrerPolicy="no-referrer"
        crossOrigin={artwork.includes('/api/proof-material/packages/') ? 'anonymous' : undefined} onError={onArtworkError} />
      : <span>{(preview ? symbol : symbol.slice(0, 3)) || placeholder}</span>}
  </span>;
}

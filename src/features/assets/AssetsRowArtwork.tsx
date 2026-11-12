import { useEffect, useRef, useState } from 'react';
import type { PublicMarketItem } from '../../receiz/public-market';
import { PublicObjectArtwork } from '../market/PublicObjectRow';

const visibility = new WeakMap<Element, (near: boolean) => void>();
let observer: IntersectionObserver | undefined;

function observeArtwork(element: Element, update: (near: boolean) => void) {
  observer ??= new IntersectionObserver(entries => {
    for (const entry of entries) {
      // A hidden tab reports zero geometry. Keep its last visible artwork for return.
      if (entry.boundingClientRect.width > 0) visibility.get(entry.target)?.(entry.isIntersecting);
    }
  }, { rootMargin: '600px 0px' });
  visibility.set(element, update);
  observer.observe(element);
  return () => {
    observer?.unobserve(element);
    visibility.delete(element);
  };
}

/** Keep the row and its controls in place while releasing distant media. */
export function AssetsRowArtwork({ item, initiallyNear }: { item: PublicMarketItem; initiallyNear: boolean }) {
  const frame = useRef<HTMLSpanElement>(null);
  const canObserve = typeof IntersectionObserver === 'function';
  const [near, setNear] = useState(initiallyNear);
  useEffect(() => {
    if (canObserve && frame.current) return observeArtwork(frame.current, setNear);
  }, [canObserve]);

  if (!canObserve) return <PublicObjectArtwork item={item} artworkUrl={item.artworkUrl} />;

  return <span ref={frame} className="asset-mark proof" aria-hidden="true">
    {near && <PublicObjectArtwork item={item} artworkUrl={item.artworkUrl} />}
  </span>;
}

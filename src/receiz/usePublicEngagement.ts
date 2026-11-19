import {createContext, useEffect, useMemo, type RefObject} from 'react';
import {observePublicEngagement, observePublicPlayback, publicOriginalEngagement, trackPublicEngagement, type EngagementSubject} from './public-engagement';
import type {PublicMarketItem} from './public-market';

export const OriginalEngagementContext = createContext<{subject: EngagementSubject; source: string} | null>(null);

export function useOriginalEngagement(item: PublicMarketItem | null | undefined, active: boolean, source: string, root: RefObject<HTMLElement | null>) {
  const subject = active ? publicOriginalEngagement(item) : undefined;
  const username = subject?.username, receizId = subject?.receizId, mediaKind = subject?.mediaKind;
  useEffect(() => {
    const element = root.current;
    if (!username || !receizId || !element?.isConnected) return;
    const subject = {username, receizId, mediaKind};
    const stop = observePublicEngagement(subject, source);
    const players = new Map<HTMLMediaElement, () => void>();
    const play = (event: Event) => {
      const media = event.target;
      if (!(media instanceof HTMLMediaElement) || players.has(media)) return;
      for (const [previous, release] of players) {
        if (!element.contains(previous)) { release(); players.delete(previous); }
      }
      const release = observePublicPlayback(media, subject, source);
      if (release) players.set(media, release);
    };
    const download = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest('a[download]')) trackPublicEngagement(subject, 'original_download_click', source);
    };
    element.addEventListener('playing', play, true);
    element.addEventListener('click', download, true);
    return () => {
      element.removeEventListener('playing', play, true);
      element.removeEventListener('click', download, true);
      for (const release of players.values()) release();
      stop?.();
    };
  }, [username, receizId, mediaKind, source, root]);
  return useMemo(() => username && receizId ? {subject: {username, receizId, mediaKind}, source} : null, [username, receizId, mediaKind, source]);
}

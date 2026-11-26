// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import {observeDiscoverVenueAudience} from '../src/public-discover/spotlight-traffic';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('posts one write-only signal after a full in-view interval in the foreground', () => {
  vi.useFakeTimers();
  const send = vi.fn(async () => new Response(null, {status: 204}));
  vi.stubGlobal('fetch', send);
  let update!: IntersectionObserverCallback;
  const observer = {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(), takeRecords: () => []};
  vi.stubGlobal('IntersectionObserver', vi.fn(function(callback) { update = callback; return observer; }));
  const card = document.body.appendChild(document.createElement('button'));
  const secondCard = document.body.appendChild(document.createElement('button'));
  const stop = observeDiscoverVenueAudience(card);
  const stopSecond = observeDiscoverVenueAudience(secondCard);
  const show = (target: Element, intersectionRatio: number) => update([
    {target, isIntersecting: intersectionRatio > 0, intersectionRatio} as IntersectionObserverEntry,
  ], observer as unknown as IntersectionObserver);
  expect(send).not.toHaveBeenCalled();
  show(card, .49);
  vi.advanceTimersByTime(1_100);
  expect(send).not.toHaveBeenCalled();
  show(card, .50);
  vi.advanceTimersByTime(999);
  show(card, 0);
  vi.advanceTimersByTime(1_100);
  expect(send).not.toHaveBeenCalled();
  show(secondCard, .85);
  vi.advanceTimersByTime(1_000);
  expect(send).toHaveBeenCalledExactlyOnceWith('/api/bank/spotlight/in-view', {
    method: 'POST', mode: 'same-origin', credentials: 'omit', keepalive: true, referrerPolicy: 'same-origin',
  });
  show(card, 1);
  vi.advanceTimersByTime(1_100);
  expect(send).toHaveBeenCalledTimes(1);
  stop?.();
  stopSecond?.();
  card.remove();
  secondCard.remove();
});

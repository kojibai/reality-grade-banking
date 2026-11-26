// @vitest-environment happy-dom
import {afterEach, expect, it, vi} from 'vitest';
import {observeOriginalImpression} from '../src/receiz/public-engagement';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('uses the existing single Original impression request for a foreground Spotlight sample', () => {
  vi.useFakeTimers();
  const send = vi.fn<typeof fetch>(async () => new Response(null, {status: 204}));
  vi.stubGlobal('fetch', send);
  let update!: IntersectionObserverCallback;
  const observer = {observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(), takeRecords: () => []};
  const createObserver = vi.fn(function(callback) { update = callback; return observer; });
  vi.stubGlobal('IntersectionObserver', createObserver);
  const card = document.body.appendChild(document.createElement('button'));
  const secondCard = document.body.appendChild(document.createElement('button'));
  const stop = observeOriginalImpression(card, {username:'one_card', receizId:'original-one'}, 'bankeiz_discover', true);
  const stopSecond = observeOriginalImpression(secondCard, {username:'next_card', receizId:'original-two'}, 'bankeiz_discover', true);
  const show = (target: Element, intersectionRatio: number) => update([
    {target, isIntersecting: intersectionRatio > 0, intersectionRatio} as IntersectionObserverEntry,
  ], observer as unknown as IntersectionObserver);
  expect(createObserver).toHaveBeenCalledTimes(1);
  expect(send).not.toHaveBeenCalled();
  show(card, .47);
  vi.advanceTimersByTime(1_100);
  expect(send).not.toHaveBeenCalled();
  show(card, .50);
  vi.advanceTimersByTime(999);
  show(card, 0);
  vi.advanceTimersByTime(1);
  expect(send).toHaveBeenCalledTimes(1);
  expect(JSON.parse(send.mock.calls[0]![1]!.body as string).meta.spotlightVenueInView).toBeUndefined();
  send.mockClear();
  show(secondCard, .85);
  vi.advanceTimersByTime(1_001);
  expect(send).toHaveBeenCalledExactlyOnceWith('https://receiz.com/api/profile/analytics/track', expect.objectContaining({
    method: 'POST', mode: 'no-cors', credentials: 'omit', keepalive: true, referrerPolicy: 'origin',
  }));
  expect(JSON.parse(send.mock.calls[0]![1]!.body as string)).toMatchObject({source:'bankeiz_discover',
    event:'original_impression', receizId:'original-two', meta:{spotlightVenueInView:true}});
  show(card, 1);
  vi.advanceTimersByTime(1_100);
  expect(send).toHaveBeenCalledTimes(1);
  stop?.();
  stopSecond?.();
  card.remove();
  secondCard.remove();
});

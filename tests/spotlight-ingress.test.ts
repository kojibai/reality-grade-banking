import {expect, it, vi} from 'vitest';
import {relayDiscoverVenueAudience} from '../server/spotlight-traffic';

it('relays one bounded, opaque venue sample only from Bankeiz Discover', async () => {
  const clock = 1_798_000_000_000;
  const key = 'collector-fixture-secret-with-32-bytes';
  const request = vi.fn<typeof fetch>(async () => new Response(null, {status: 204}));
  const relay = relayDiscoverVenueAudience({key, platformTrusted: true, now: () => clock, request});
  const headers = {origin: 'https://bankeiz.com', referer: 'https://bankeiz.com/discover/',
    'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'same-origin', 'sec-fetch-dest': 'empty',
    'x-vercel-forwarded-for': '203.0.113.11'};
  const url = 'https://bankeiz.com/api/bank/spotlight/in-view';
  expect((await relay(new Request(url, {method: 'POST', headers: {...headers, referer:'https://bankeiz.com/explore/'}}))).status).toBe(403);
  expect((await relay(new Request(url, {method: 'POST', headers: {...headers, 'sec-gpc': '1'}}))).status).toBe(403);
  expect((await relay(new Request(url, {method: 'POST', headers, body: 'fake supplied counts'}))).status).toBe(403);
  expect(request).not.toHaveBeenCalled();
  expect((await relay(new Request(url, {method: 'POST', headers}))).status).toBe(204);
  expect(request).toHaveBeenCalledTimes(1);
  const [target, init] = request.mock.calls[0]!;
  expect(target).toBe('https://receiz.com/api/internal/spotlight/traffic');
  expect(init?.body).not.toContain(headers['x-vercel-forwarded-for']);
  expect(init?.body).not.toContain(key);
  expect(JSON.parse(String(init?.body))).toEqual({
    venue: 'bankeiz-discover', sampledAtMs: clock, viewer: expect.stringMatching(/^[a-f0-9]{64}$/u),
  });
  expect(new Headers(init?.headers).get('x-receiz-spotlight-mac')).toMatch(/^[a-f0-9]{64}$/u);
});

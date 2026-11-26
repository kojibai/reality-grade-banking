import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';

export const discoverVenueAudiencePath = '/api/bank/spotlight/in-view';
const origin = 'https://bankeiz.com';
const collector = 'https://receiz.com/api/internal/spotlight/traffic';
const venue = 'bankeiz-discover';

function networkPrefix(address: string) {
  const family = isIP(address);
  if (family === 4) return address;
  if (family !== 6 || address.includes('%')) return null;
  const ip = new URL('http://[' + address + ']').hostname.slice(1, -1);
  const [leading, trailing] = ip.split('::');
  const first = leading ? leading.split(':') : [];
  const last = trailing ? trailing.split(':') : [];
  const groups = trailing === undefined ? first : [...first, ...Array<string>(8 - first.length - last.length).fill('0'), ...last];
  if (groups.slice(0, 6).join(':') === '0:0:0:0:0:ffff') {
    const mapped = groups.slice(6).map(group => Number.parseInt(group, 16));
    return mapped.flatMap(value => [value >>> 8, value & 255]).join('.');
  }
  return groups.slice(0, 4).join(':') + '::/64';
}

const noStore = (status: number) => new Response(null, {status, headers: {'cache-control': 'no-store'}});

export function relayDiscoverVenueAudience(input: Readonly<{
  key?: string;
  platformTrusted: boolean;
  now?: () => number;
  request?: typeof fetch;
}>) {
  return async (request: Request) => {
    if (request.method !== 'POST') return noStore(405);
    const url = new URL(request.url);
    const referrer = URL.parse(request.headers.get('referer') ?? '');
    if (url.origin !== origin || url.pathname !== discoverVenueAudiencePath || url.search
      || request.headers.get('origin') !== origin || referrer?.origin !== origin
      || (referrer.pathname !== '/discover' && referrer.pathname !== '/discover/' && referrer.pathname !== '/discover/index.html')
      || request.headers.get('sec-fetch-site') !== 'same-origin'
      || request.headers.get('sec-fetch-mode') !== 'same-origin'
      || request.headers.get('sec-fetch-dest') !== 'empty'
      || request.headers.get('sec-gpc') === '1' || request.headers.get('dnt') === '1'
      || request.body !== null) return noStore(403);
    const key = input.key;
    if (!input.platformTrusted || !key || Buffer.byteLength(key) < 32) return noStore(503);
    // Vercel sets this header from its own ingress. Browser forwarded hints
    // and caller-supplied counters/asset identifiers never enter the envelope.
    const prefix = networkPrefix(request.headers.get('x-vercel-forwarded-for') ?? '');
    if (!prefix) return noStore(403);
    const viewer = createHmac('sha256', key).update('bankeiz.discover.network.v1\n' + prefix).digest('hex');
    const body = JSON.stringify({venue, sampledAtMs: (input.now ?? Date.now)(), viewer});
    const mac = createHmac('sha256', key).update('receiz.spotlight.traffic.v1\n' + body).digest('hex');
    try {
      const response = await (input.request ?? fetch)(collector, {
        method: 'POST', cache: 'no-store', redirect: 'error', credentials: 'omit',
        headers: {'content-type': 'application/json', 'x-receiz-spotlight-mac': mac},
        body, signal: AbortSignal.timeout(3_000),
      });
      await response.body?.cancel().catch(() => {});
      return noStore(response.status === 204 ? 204 : 503);
    } catch {
      return noStore(503);
    }
  };
}

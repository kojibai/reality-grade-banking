import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
function dispatch(request: Request): Promise<Response> | undefined {
  const handlers: Record<string, (event: { request: Request; respondWith: (response: Promise<Response>) => void }) => void> = {};
  let result: Promise<Response> | undefined;
  const source = readFileSync('src/pwa/sw.template.js', 'utf8').replace('__CACHE_VERSION__', 'test').replace('__SHELL_ASSETS__', JSON.stringify(['/index.html', '/assets/app.js']));
  const cache = { match: async (_request: unknown, options?: { ignoreVary?: boolean }) => options?.ignoreVary ? new Response('export const bank = true;', { headers: { 'content-type': 'application/javascript', vary: 'Origin' } }) : undefined };
  runInNewContext(source, { self: { location: { origin: 'http://localhost' }, addEventListener: (name: string, handler: typeof handlers[string]) => { handlers[name] = handler; } }, URL, Response, caches: cache, fetch: async () => { throw new Error('Offline'); } });
  handlers.fetch({ request, respondWith: response => { result = response; } });
  return result;
}
it('restores immutable app scripts offline despite Vary Origin on cached responses', async () => { const response = await dispatch(new Request('http://localhost/assets/app.js', { headers: { Origin: 'http://localhost' } })); expect(await response?.text()).toBe('export const bank = true;'); });
it('never responds from the app cache for financial API calls', () => expect(dispatch(new Request('http://localhost/api/wallet/me'))).toBeUndefined());

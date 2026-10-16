import type { IncomingMessage, ServerResponse } from 'node:http';
import { expect, it, vi } from 'vitest';
import { accountProofPublicPlugin } from '../server/account-proof-public';

it.each(['configureServer', 'configurePreviewServer'] as const)('serves the reader for direct proof links in %s', async hookName => {
  const handlers: Array<(req: IncomingMessage, res: ServerResponse, next: () => void) => void> = [];
  const hook = accountProofPublicPlugin()[hookName];
  if (typeof hook !== 'function') throw Error('Expected server hook');
  hook.call({} as never, { middlewares: { use(handler: typeof handlers[number]) { handlers.push(handler); } } } as never);
  for (const suffix of ['', '/']) {
    const req = { method: 'GET', url: `/verify/${'a'.repeat(64)}${suffix}?source=qr` } as IncomingMessage;
    const next = vi.fn();
    for (const handler of handlers) await handler(req, {} as ServerResponse, next);
    expect(req.url).toBe('/verify/index.html?source=qr');
    expect(next).toHaveBeenCalled();
  }
  for (const path of ['/verify/', '/verify/not-a-proof/', '/verify/' + 'a'.repeat(64) + '/private']) {
    const req = { method: 'GET', url: path } as IncomingMessage;
    for (const handler of handlers) await handler(req, {} as ServerResponse, () => {});
    expect(req.url).toBe(path);
  }
});

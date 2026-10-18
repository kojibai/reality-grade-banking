// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { useLedgerValueSource } from '../src/features/ledger/useLedgerValueSource';
vi.mock('../src/receiz/client',()=>({loadReceiz:async()=>({receizKaiNow:()=>({pulse:14647307})})}));
const input = JSON.parse(readFileSync('public/receiz-public-capitalization.json', 'utf8'));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | null = null;
afterEach(() => { if (root) act(() => root!.unmount()); root = null; document.body.replaceChildren(); vi.unstubAllGlobals(); });
function Probe({ active }: { active: boolean }) { const index = useLedgerValueSource(active); return <output>{index?.evaluationPulse ?? 'No valuation source'}</output>; }
it('reads only the shared public projection and keeps it when the live source is unavailable', async () => {
  const requests: { path: string; credentials: RequestCredentials | undefined }[] = [];
  vi.stubGlobal('fetch', async (path: string, options: RequestInit) => { requests.push({ path, credentials: options.credentials }); return path === '/receiz-public-capitalization.json' ? Response.json(input) : new Response(null, { status: 503 }); });
  const host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => { root!.render(<Probe active={false}/>); });
  expect(requests).toEqual([]);
  await act(async () => { root!.render(<Probe active={true}/>); });
  expect(host.textContent).toBe('14647307');
  expect(requests).toEqual([{ path: '/receiz-public-capitalization.json', credentials: 'omit' }, { path: '/api/bank/public-market/capitalization', credentials: 'omit' }]);
});

// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { PublicAssetDetail } from '../src/features/market/PublicAssetDetail';
import { parsePublicMarket } from '../src/receiz/public-market';
const verify = vi.hoisted(() => vi.fn());
vi.mock('../src/receiz/public-original', () => ({ verifyPublicOriginalBytes: verify }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
it('discards verification completion after the selected source digest changes', async () => {
  const item = parsePublicMarket({ ok: true, transport: { publicMembership: {}, publicOriginals: [{ id: 'a', receizId: 'a', title: 'A', profileOriginal: { media: { originalDownloadSrc: '/api/profile/originals/download?receizId=a&kind=original', originalDownloadSha256Hex: 'a'.repeat(64) } } }] } }).items[0];
  let finish!: (value: unknown) => void; verify.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2]))));
  const host = document.createElement('div'), root = createRoot(host);
  try {
    act(() => root.render(<PublicAssetDetail item={item} />));
    await act(async () => { [...host.querySelectorAll('button')].find(button => button.textContent?.includes('Verify original here'))!.click(); });
    act(() => root.render(<PublicAssetDetail item={{ ...item, originalDigest: 'b'.repeat(64) }} />));
    await act(async () => { finish({ digest: 'a'.repeat(64) }); });
    expect(host.textContent).not.toContain('Original verified with Receiz v129');
  } finally { act(() => root.unmount()); vi.unstubAllGlobals(); }
});

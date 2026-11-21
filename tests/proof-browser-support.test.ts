import { afterEach, expect, it, vi } from 'vitest';
import { atIdentityCreationStage } from '../src/receiz/identity-creation-stage';
import { isUnsupportedProofBrowser, proofBrowserUpdateNotice } from '../src/receiz/proof-browser-support';

afterEach(() => vi.restoreAllMocks());

it('shows the browser-update notice when the signer and the Ed25519 capability check both fail', async () => {
  const unsupported = new DOMException('unsupported', 'NotSupportedError');
  const generate = vi.spyOn(crypto.subtle, 'generateKey').mockRejectedValue(unsupported);
  await expect(atIdentityCreationStage('device-signer', async () => { throw unsupported; })).rejects.toThrow(proofBrowserUpdateNotice);
  expect(generate).toHaveBeenCalledOnce();
});

it('preserves the original diagnostic if Ed25519 works and skips probes for other errors', async () => {
  const generate = vi.spyOn(crypto.subtle, 'generateKey');
  expect(await isUnsupportedProofBrowser(new DOMException('storage failed', 'QuotaExceededError'))).toBe(false);
  expect(generate).not.toHaveBeenCalled();
  await expect(atIdentityCreationStage('device-signer', async () => {
    throw new DOMException('another unsupported operation', 'NotSupportedError');
  })).rejects.toThrow('Stage: device-signer · NotSupportedError');
  expect(generate).toHaveBeenCalledOnce();
});

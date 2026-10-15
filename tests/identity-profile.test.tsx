// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it } from 'vitest';
import { LiveActions } from '../src/features/account/LiveActions';
import type { OpenIdentity } from '../src/receiz/native-identity';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each([
  { username: 'receiz_public_name', current: 'confirmed_profile', expected: 'confirmed_profile' },
  { username: 'receiz_public_name', current: null, expected: 'receiz_public_name' },
  { username: null, current: null, expected: 'receiz_device_original_owner' },
])('shows the assigned public identity without rewriting its signed ownership coordinate: $expected', ({ username, current, expected }) => {
  const host = document.createElement('div'), root = createRoot(host);
  const identity = {
    username, accountUsername: () => current,
    binding: { identityOwnerReceizId: 'receiz_device_original_owner' },
    needsPhrase: false,
  } as unknown as OpenIdentity;
  try {
    act(() => root.render(<LiveActions action={{ kind: 'profile' }} identity={identity} wallet={null} active={false} onClose={() => {}} onForget={async () => {}} onRefresh={() => {}} />));
    expect(host.querySelector('code')?.textContent).toBe(expected);
    expect(host.textContent).toContain('receiz_device_original_owner');
    expect(identity.binding.identityOwnerReceizId).toBe('receiz_device_original_owner');
  } finally { act(() => root.unmount()); }
});

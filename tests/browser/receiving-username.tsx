import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LiveReceive } from '../../src/features/account/LivePayments';
import type { OpenIdentity } from '../../src/receiz/native-identity';
import '../../src/styles/features.css';

let resolveUsername: (username: string) => void;
const prepared = new Promise<string>(resolve => { resolveUsername = resolve; });
const identity = {
  username: 'receiz_123456789012345678',
  accountUsername: () => null,
  prepareReceivingUsername: () => prepared,
} as unknown as OpenIdentity;
function Fixture() {
  const [ready, setReady] = useState(false);
  return <main style={{ maxWidth: 440, margin: '24px auto', padding: 20, fontFamily: 'system-ui' }}>
    <p>Local synthetic new-account check. No account, payment, or network identity operation.</p>
    <button disabled={ready} onClick={() => { resolveUsername('receiz_123456789012345_2'); setReady(true); }}>Confirm canonical public username</button>
    <LiveReceive identity={identity} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Fixture />);

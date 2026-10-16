import { createRoot } from 'react-dom/client';
import { IdentityProfile } from '../../src/features/account/IdentityProfile';
import type { OpenIdentity } from '../../src/receiz/native-identity';
import { LiveActions } from '../../src/features/account/LiveActions';
import type { SharedWallet } from '../../src/receiz/shared-wallet';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
const summary = { kind: 'execution-recovery' as const, digest: 'b'.repeat(64), filename: 'example.receiz-recovery.json', title: 'Transaction recovery', size: 450, operationId: 'example-attempt', participantCount: 2 };
let imported = false;
const library = {
  inspect: async () => ({ items: [summary], totalBytes: 450 }),
  retain: async () => { imported = true; return { added: 1, alreadyHeld: 0 }; },
  list: async () => imported ? [summary] : [],
  exportBackup: async () => ({ bytes: new TextEncoder().encode('interface fixture only'), filename: 'test-only-proofs.json' }),
  exportProof: async () => ({ bytes: new TextEncoder().encode('interface fixture only'), filename: summary.filename }),
};
const identity = { username: 'example', binding: { artifactOwnerReceizId: 'example.receiz.id', identityOwnerReceizId: 'example-local' }, needsPhrase: false, proofLibrary: async () => library, backup: () => ({ bytes: new Uint8Array([1]), filename: 'example-only', phrase: '' }) } as unknown as OpenIdentity;
const wallet = { settlementUsdCents: '0', reserveUsdCents: '0', totalUsdCents: '0', pulse: '14665085', kaiUpulse: '14665085361185' } as unknown as SharedWallet;
const params = new URLSearchParams(location.search);
createRoot(document.getElementById('root')!).render(params.has('balance')
  ? <>{params.has('narrow') && <style>{'.sheet { width: min(368px, calc(100% - 22px)); }'}</style>}<LiveActions action={{ kind: 'balance' }} identity={identity} wallet={wallet} onForget={async () => {}} onRefresh={() => {}} onClose={() => {}} /></>
  : <main style={{ maxWidth: 460, margin: '0 auto', padding: 24 }}><p className="body-copy small-copy">Interface fixture · no account or money connected</p><IdentityProfile identity={identity} onForget={async () => {}} onRefresh={() => {}} /></main>);

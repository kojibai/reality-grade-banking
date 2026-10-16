import type { BankExecutionStore } from './bank-execution';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID } from './config';

// Restoring accepted originals is custody bookkeeping, not financial effect
// qualification. The original recovery remains retained after restoration.
export function createBankCommittedSourceRestoration(input: {
  store: BankExecutionStore; ownerReceizId: string; assertOpen(): void;
  openSubject(file: File): Promise<{ subjectId: string }>;
  saveSource(bytes: Uint8Array, filename: string, digest: string, role?: 'account-coordination'): Promise<void>;
}) {
  return async () => {
    input.assertOpen(); const checkpoint = await input.store.load(); input.assertOpen();
    if (checkpoint?.state !== 'committed' || !checkpoint.recovery || checkpoint.sourcesRestored) return;
    if (!checkpoint.accountSubjectId) throw Error('BANK_EXECUTION_ACCOUNT_SOURCE_REQUIRED');
    const sdk = await loadReceiz();
    const recovered = await sdk.recoverReceizPortableExecutionTransitionSetV124(checkpoint.recovery, { audience: BANK_APPLICATION_ID });
    for (const transition of recovered.transitions) {
      if (transition.artifact.continuity.ownerReceizId !== input.ownerReceizId) continue;
      const transported = await sdk.transportReceizSealedArtifactV124(transition.artifact), exact = sdk.receizBase64UrlDecode(transported.exactBytesB64u);
      let role: 'account-coordination' | undefined;
      try {
        const subject = await input.openSubject(new File([new Uint8Array(exact)], transported.filename));
        if (subject.subjectId === checkpoint.accountSubjectId) role = 'account-coordination';
      } catch { /* Non-account assets remain original assets. */ }
      input.assertOpen(); await input.saveSource(exact, transported.filename, transported.artifactSha256, role);
    }
    input.assertOpen();
    const current = await input.store.load();
    if (!current || current.state !== 'committed' || current.operationId !== checkpoint.operationId || current.accountSubjectId !== checkpoint.accountSubjectId || sdk.canonicalizeReceizConstitution(current.recovery) !== sdk.canonicalizeReceizConstitution(checkpoint.recovery)) throw Error('BANK_EXECUTION_CHECKPOINT_CHANGED');
    // A later transaction must not revalidate expired execution capabilities
    // solely to restore originals that are already held successfully.
    await input.store.replace({ ...current, sourcesRestored: true });
  };
}

import type { ReceizClient, ReceizAuthoritySessionV124, ReceizProofAuthorityChallengeV123 } from '@receiz/sdk';
import { BANK_APPLICATION_ID, BANK_PREVIOUS_NATIVE_APPLICATION_ID } from './config';
import { heldBankSubjectSource, type BankSubjectSource } from './bank-native-source';
import { loadReceiz } from './client';
import { BankConnectionError } from './bank-connection-error';

export interface BankSessionIntent {
  schema: 'bank.native-session-intent.v1';
  applicationId?: string;
  sourceDigest: string;
  actorSubjectId: string;
  identityDigest: string;
  operation: 'open' | 'refresh';
  // Older stored intents have a challenge and no phase. Treat them as
  // possibly submitted, never as permission to replace an unknown request.
  phase?: 'publication-pending' | 'session-pending';
  challenge?: ReceizProofAuthorityChallengeV123;
  rails: readonly ('reserve' | 'settlement')[];
  namespaces: readonly string[];
  state: 'pending' | 'active' | 'zero-write';
  session?: ReceizAuthoritySessionV124;
}
export interface BankSessionStore {
  load(): Promise<BankSessionIntent | null>;
  save(value: BankSessionIntent, expected: BankSessionIntent | null): Promise<void>;
}

// The host holds identity bytes/challenges privately. A persisted session is
// recovery input only; a new runtime must obtain a fresh SDK-admitted response.
export function createBankNativeSession(input: {
  client: Pick<ReceizClient, 'sources' | 'runtime'>;
  identityBytes: Uint8Array;
  store: BankSessionStore;
  signFreshChallenge(): Promise<ReceizProofAuthorityChallengeV123>;
  signal: AbortSignal;
}) {
  let running = false;
  let heldSession: ReceizAuthoritySessionV124 | null = null;
  const identityBytes = new Uint8Array(input.identityBytes);
  const assertOpen = () => { if (input.signal.aborted) throw new Error('BANK_SESSION_IDENTITY_CLOSED'); };

  async function connect(source: BankSubjectSource, rails: readonly ('reserve' | 'settlement')[] = [], namespaces: readonly string[] = []) {
    if (running) throw new Error('BANK_SESSION_IN_PROGRESS');
    assertOpen();
    // WeakMap custody rejects copied source coordinates before publication.
    const artifact = heldBankSubjectSource(source);
    if (new Set(rails).size !== rails.length || rails.some(rail => !['reserve', 'settlement'].includes(rail)) || new Set(namespaces).size !== namespaces.length || namespaces.some(namespace => !source.namespaces.includes(namespace))) throw new Error('BANK_SESSION_SCOPE_MISMATCH');
    running = true;
    try {
      const sdk = await loadReceiz();
      const identityDigest = await sdk.sha256ReceizBytes(identityBytes);
      const intentApplicationId = (intent: BankSessionIntent) => intent.applicationId ?? intent.challenge?.audience ?? intent.session?.applicationId ?? BANK_PREVIOUS_NATIVE_APPLICATION_ID;
      const sameRequest = (intent: BankSessionIntent) => intentApplicationId(intent) === BANK_APPLICATION_ID && intent.schema === 'bank.native-session-intent.v1' && intent.sourceDigest === source.artifactDigest && intent.actorSubjectId === source.subjectId && intent.identityDigest === identityDigest && JSON.stringify(intent.rails) === JSON.stringify(rails) && JSON.stringify(intent.namespaces) === JSON.stringify(namespaces);
      let intent = await input.store.load();
      assertOpen();
      if (intent?.state === 'pending' && intentApplicationId(intent) !== BANK_APPLICATION_ID) throw new Error('BANK_SESSION_PENDING_APPLICATION_CHANGED');
      if (intent?.state === 'pending' && !sameRequest(intent)) throw new Error('BANK_SESSION_PENDING_SOURCE_CHANGED');
      if (intent?.state === 'active' && sameRequest(intent) && heldSession && heldSession.sessionBindingDigest === intent.session?.sessionBindingDigest && sdk.receizKaiNow().uPulse < heldSession.expiresAtKaiUPulse) return heldSession;
      if (!intent || intent.state !== 'pending') {
        const prior = intent;
        // A known successful session can expire normally. SDK refresh rejects
        // an expired predecessor, so start a new open in that terminal case.
        // Already pending requests above retain their exact unknown outcome.
        const previousSession = prior?.state === 'active' && sameRequest(prior) && prior.session && sdk.receizKaiNow().uPulse < prior.session.expiresAtKaiUPulse ? prior.session : undefined;
        intent = { schema: 'bank.native-session-intent.v1', applicationId: BANK_APPLICATION_ID, sourceDigest: source.artifactDigest, actorSubjectId: source.subjectId, identityDigest, operation: previousSession ? 'refresh' : 'open', phase: 'publication-pending', rails: [...rails], namespaces: [...namespaces], state: 'pending', ...(previousSession ? { session: previousSession } : {}) };
        // Persist the exact source intent before publication. A session
        // challenge is not created while publication remains unavailable.
        await input.store.save(intent, prior);
      }
      assertOpen();
      try {
        try { await input.client.sources.publishSealedSourceV124({ applicationId: BANK_APPLICATION_ID, authoritySessionHandle: null, sourceArtifact: artifact }); }
        catch (error) { throw new BankConnectionError('source-publication', error); }
        assertOpen();
        if (intent.phase === 'publication-pending') {
          const prior = intent;
          const challenge = await input.signFreshChallenge();
          assertOpen();
          const refreshStillCurrent = prior.operation === 'refresh' && prior.session && sdk.receizKaiNow().uPulse < prior.session.expiresAtKaiUPulse;
          intent = { ...prior, phase: 'session-pending', challenge, operation: refreshStillCurrent ? 'refresh' : 'open' };
          if (!refreshStillCurrent) delete intent.session;
          // Persist before the session call. From here, even a lost reply
          // retains this exact challenge rather than generating another.
          await input.store.save(intent, prior);
        }
        assertOpen();
        if (!intent.challenge) throw new Error('BANK_SESSION_CHALLENGE_REQUIRED');
        const common = { applicationId: BANK_APPLICATION_ID, proofArtifact: identityBytes, signedChallenge: intent.challenge, requestedRails: intent.rails, requiredNamespaces: intent.namespaces, audience: BANK_APPLICATION_ID };
        const session = intent.operation === 'refresh' && intent.session
          ? await input.client.runtime.refreshAuthoritySessionV124({ ...common, authoritySessionHandle: intent.session.authoritySessionHandle, persistedSession: intent.session })
          : await input.client.runtime.openAuthoritySessionV124({ ...common, actorSubjectId: source.subjectId, subjectSourceArtifact: artifact });
        assertOpen();
        if (session.applicationId !== BANK_APPLICATION_ID || session.audience !== BANK_APPLICATION_ID || session.actorSubjectId !== source.subjectId || session.subjectSourceArtifactSha256 !== source.artifactDigest || session.identityArtifactSha256 !== identityDigest) throw new Error('BANK_SESSION_RESPONSE_MISMATCH');
        await input.store.save({ ...intent, state: 'active', session }, intent);
        assertOpen(); heldSession = session;
        return session;
      } catch (error) {
        // Only the SDK's authenticated zero-write class establishes no writes.
        // HTTP errors, parsing failures and timeouts keep the original intent.
        if (error instanceof sdk.ReceizRuntimeZeroWriteErrorV124) await input.store.save({ ...intent, state: 'zero-write' }, intent);
        throw error instanceof BankConnectionError ? error : new BankConnectionError('authority-session', error);
      }
    } finally { running = false; }
  }
  return Object.freeze({ connect });
}

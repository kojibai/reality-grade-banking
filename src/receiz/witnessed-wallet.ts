import { createLocalFinancialSession, loadLocalFinancialRuntime } from './local-financial';
import type {
  FinancialExecutorOptions, LocalFinancialRuntime, WitnessedWalletPaymentApproval, WitnessedWalletReleaseApproval,
} from './local-financial-runtime';
import { createOpticalNoteFrames } from './optical-note-frames';
import { openWalletWitnessCustody, walletWitnessKeyOnDevice } from './wallet-witness-custody';

const schema = 'bankeiz.wallet-witness.v1';
const keyPattern = /^[A-Za-z0-9_-]{43}$/u;
type Recipient = Readonly<{
  account: { payload: { applicationId: string; accountUserId: string; ownerReceizId: string; keyId: string; issuedAtKaiUPulse: string }; signature: unknown };
  identity: { keyId: string; alg: string; publicKeyRawB64u: string };
}>;
type Lot = Readonly<{ ref: string; kind: 'funded' | 'received'; allocationId: string }>;
type Pending = Readonly<{ lot: Lot } & (
  { kind: 'payment'; approval: WitnessedWalletPaymentApproval }
  | { kind: 'release'; approval: WitnessedWalletReleaseApproval; releaseRef?: string }
)>;
type Setup = Readonly<{
  witness: string; recipient: Recipient; lots: readonly Lot[]; returned?: readonly string[]; pending?: Pending;
  funding?: Readonly<{ opening: { funding: Record<string, unknown>; ownerConsent?: unknown; program?: { custodian?: { publicKeyRawB64u?: string }; walletRecipientMode?: string } } }>;
}>;
type Opening = Readonly<{ kind: Lot['kind']; original: string; accountUid: string; ownerKeyId: string }>;
type Packet = Readonly<{ schema: typeof schema; app: string; witness: string } & (
  { kind: 'pair' }
  | { kind: 'recipient'; recipient: Recipient }
  | { kind: 'payment'; opening: Opening; approval: WitnessedWalletPaymentApproval }
  | { kind: 'release'; opening: Opening; approval: WitnessedWalletReleaseApproval }
  | { kind: 'released'; original: string }
)>;
type Options = Readonly<{
  applicationId: string; accountUid: string; ownerReceizId: string; identity: Recipient['identity'];
  identityArtifact: { artifactSha256: string; exactBytesB64u: string };
  originals: FinancialExecutorOptions['originals'];
  read(): Promise<Setup | null>;
  save(next: Setup, prior: Setup | null): Promise<void>;
  lock<T>(work: () => Promise<T>): Promise<T>;
  request(body: unknown, write: boolean): Promise<unknown>;
  publishPeerRelease(body: unknown): Promise<unknown>;
  assertOpen(): void;
  online(): boolean;
  signOwner: FinancialExecutorOptions['signOwner'];
  encode(bytes: Uint8Array): string;
  decode(base64: string): Uint8Array;
  digest(bytes: Uint8Array): Promise<string>;
  canonical(value: unknown): string;
  runtime?: LocalFinancialRuntime;
  openWitness?: typeof openWalletWitnessCustody;
}>;

function invalid(): never { throw Error('BANK_WITNESS_QR_INVALID'); }

export function createWitnessedWallet(input: Options) {
  const runtime = () => input.runtime ? Promise.resolve(input.runtime) : loadLocalFinancialRuntime();
  const frames = (bytes: Uint8Array) => createOpticalNoteFrames('wallet', bytes);
  const packetFrames = (value: Packet) => frames(new TextEncoder().encode(JSON.stringify(value)));
  const envelope = (witness: string) => ({ schema, app: input.applicationId, witness } as const);
  const witness = async () => (input.openWitness ?? openWalletWitnessCustody)(input.applicationId, await runtime(), input.encode);
  async function read() {
    input.assertOpen();
    return input.read();
  }
  async function paired() {
    const setup = await read();
    if (!setup) throw Error('BANK_WALLET_WITNESS_PAIRING_REQUIRED');
    return setup;
  }
  function packet(bytes: Uint8Array, expected?: string): Packet {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Packet;
    if (value?.schema !== schema || value.app !== input.applicationId || !keyPattern.test(value.witness)
      || expected !== undefined && value.witness !== expected) invalid();
    return value;
  }
  function recipient(value: Recipient) {
    const payload = value?.account?.payload, identity = value?.identity;
    if (!payload || payload.applicationId !== input.applicationId || !identity || payload.keyId !== identity.keyId
      || !/^[a-f0-9]{64}$/u.test(identity.keyId) || !/^[1-9][0-9]{0,18}$/u.test(payload.issuedAtKaiUPulse)
      || !/^[-a-z0-9_]+\.receiz\.id$/u.test(payload.ownerReceizId)) invalid();
    return payload;
  }
  async function exact(ref: string) {
    const bytes = await input.originals.read(ref);
    if (!bytes || await input.digest(bytes) !== ref) throw Error('BANK_LOCAL_FINANCIAL_ORIGINAL_REQUIRED');
    return bytes;
  }
  async function retain(bytes: Uint8Array) {
    const ref = await input.digest(bytes);
    await input.originals.retain(ref, bytes);
    await exact(ref);
    return ref;
  }
  async function withLot<T>(setup: Setup, lot: Pick<Lot, 'ref' | 'kind'>, work: (session: Awaited<ReturnType<typeof createLocalFinancialSession>>) => Promise<T>, incoming?: Uint8Array) {
    const bytes = incoming ?? await exact(lot.ref);
    const session = await createLocalFinancialSession({
      ...(lot.kind === 'funded' ? { sourceBytes: bytes } : { receivedWallet: { proofBytes: bytes, ownerKeyId: input.identity.keyId } }),
      applicationId: input.applicationId, accountUid: input.accountUid, ownerReceizId: input.ownerReceizId,
      designatedWitnessPublicKey: setup.witness, originals: input.originals, runtime: await runtime(),
      signOwner: input.signOwner, async signRecord() { throw Error('BANK_WALLET_WITNESS_PAIRING_REQUIRED'); },
      assertOpen: input.assertOpen, online: input.online, deferPublication: true,
      async publish() { throw Error('BANK_WALLET_PEER_RELEASE_REQUIRED'); },
    });
    try { return await work(session); }
    finally { session.dispose(); }
  }
  async function outgoing(setup: Setup, pending: Pending) {
    const opening = {
      kind: pending.lot.kind, original: input.encode(await exact(pending.lot.ref)),
      accountUid: input.accountUid, ownerKeyId: input.identity.keyId,
    };
    const head = envelope(setup.witness);
    return pending.kind === 'payment'
      ? packetFrames({ ...head, kind: 'payment', opening, approval: pending.approval })
      : packetFrames({ ...head, kind: 'release', opening, approval: pending.approval });
  }
  return Object.freeze({
    async summary() {
      const setup = await read();
      if (!setup) return { paired: false, lots: [], availableUsdCents: '0', pending: null, canFund: false };
      const lots = await Promise.all(setup.lots.map(lot => withLot(setup, lot, async session => ({
        ref: lot.ref, amount: (await session.wallet()).availableUsdCents,
      }))));
      return {
        paired: true, lots, availableUsdCents: lots.reduce((sum, lot) => sum + BigInt(lot.amount), 0n).toString(),
        pending: setup.pending ? setup.pending.kind === 'release' && setup.pending.releaseRef ? 'return' as const : setup.pending.kind : null,
        canFund: !setup.lots.some(lot => lot.kind === 'funded'),
      };
    },
    async pairingCode() {
      input.assertOpen();
      return packetFrames({ ...envelope((await witness()).publicKey), kind: 'pair' });
    },
    async pair(bytes: Uint8Array) {
      const value = packet(bytes);
      if (value.kind !== 'pair' || value.witness === input.identity.publicKeyRawB64u) invalid();
      return input.lock(async () => {
        const current = await read();
        if (value.witness === await walletWitnessKeyOnDevice(input.applicationId)) throw Error('BANK_WITNESS_SEPARATE_DEVICE_REQUIRED');
        if (current?.witness === value.witness) return;
        if (current?.lots.length || current?.pending || current?.funding) throw Error('BANK_WITNESS_ALREADY_PAIRED');
        if (!input.online()) throw Error('BANK_WITNESS_SETUP_CONNECTION');
        const account = await input.request({ operation: 'witness-recipient' }, false) as Recipient['account'];
        const binding = { account, identity: input.identity };
        const payload = recipient(binding);
        if (payload.accountUserId !== input.accountUid || payload.ownerReceizId !== input.ownerReceizId) invalid();
        await input.save({ witness: value.witness, recipient: binding, lots: [] }, current);
      });
    },
    async prepareBalance() {
      return input.lock(async () => {
        let setup = await paired();
        if (!input.online()) throw Error('BANK_WITNESS_SETUP_CONNECTION');
        if (setup.lots.some(lot => lot.kind === 'funded')) return;
        let funding = setup.funding;
        if (!funding) {
          const response = await input.request({
            operation: 'prepare', balance: 'all', walletRecipientMode: 'designated-witness', identity: input.identity,
            identityArtifact: input.identityArtifact, custodian: { kind: 'existing-sdk-record-signer', publicKeyRawB64u: setup.witness },
          }, true) as Setup['funding'];
          const opening = response?.opening;
          if (!response || !opening || opening.funding.accountUserId !== input.accountUid
            || opening.funding.receizKeyId !== input.identity.keyId || opening.funding.ownerReceizId !== input.ownerReceizId
            || opening.program?.walletRecipientMode !== 'designated-witness' || opening.program.custodian?.publicKeyRawB64u !== setup.witness) invalid();
          funding = { ...response, opening: { ...opening,
            ownerConsent: await input.signOwner('receiz.account-execution-consent.v1\0' + input.canonical(opening.funding)),
          } };
          const next = { ...setup, funding };
          await input.save(next, setup);
          setup = next;
        }
        const result = await input.request({ operation: 'allocate', request: funding }, true) as { artifactSha256: string; artifactBytesB64u: string };
        const bytes = input.decode(result.artifactBytesB64u);
        if (await input.digest(bytes) !== result.artifactSha256) invalid();
        const candidate = { ref: result.artifactSha256, kind: 'funded' } as const;
        const allocationId = await withLot(setup, candidate, async session => session.sourceReference().allocationId, bytes);
        if (setup.returned?.includes(allocationId)) invalid();
        const lot: Lot = { ...candidate, allocationId, ref: await retain(bytes) };
        const { funding: _, ...retained } = setup;
        await input.save({ ...retained, lots: [...retained.lots, lot] }, setup);
      });
    },
    async receivingCode() {
      const setup = await paired();
      return packetFrames({ ...envelope(setup.witness), kind: 'recipient', recipient: setup.recipient });
    },
    async readRecipient(bytes: Uint8Array) {
      const setup = await paired(), value = packet(bytes, setup.witness);
      if (value.kind !== 'recipient' || recipient(value.recipient).accountUserId === input.accountUid) invalid();
      return value.recipient;
    },
    async approvePayment(lotRef: string, receiver: Recipient, amountUsdCents: string) {
      return input.lock(async () => {
        const setup = await paired();
        if (setup.pending) throw Error('BANK_WITNESS_PAYMENT_PENDING');
        const lot = setup.lots.find(item => item.ref === lotRef);
        if (!lot) invalid();
        const { accountUserId } = recipient(receiver);
        const operationId = crypto.randomUUID();
        const approval = await withLot(setup, lot, session => session.prepareWitnessedWalletPayment({
          operationId, action: { kind: 'send', nearby: true, amountUsdCents,
            recipientUserId: accountUserId, conversationId: operationId, scannedRecipient: receiver },
        }));
        const pending = { kind: 'payment', lot, approval } as const;
        const qr = await outgoing(setup, pending);
        await input.save({ ...setup, pending }, setup);
        return qr;
      });
    },
    async approveRelease(lotRef: string) {
      return input.lock(async () => {
        const setup = await paired();
        if (setup.pending) throw Error('BANK_WITNESS_PAYMENT_PENDING');
        const lot = setup.lots.find(item => item.ref === lotRef);
        if (!lot) invalid();
        const approval = await withLot(setup, lot, session => session.prepareWitnessedWalletRelease());
        const pending = { kind: 'release', lot, approval } as const;
        const qr = await outgoing(setup, pending);
        await input.save({ ...setup, pending }, setup);
        return qr;
      });
    },
    async outgoingCode() {
      const setup = await paired();
      return setup.pending && outgoing(setup, setup.pending);
    },
    async witnessApproval(bytes: Uint8Array) {
      input.assertOpen();
      const value = packet(bytes);
      if (value.kind !== 'payment' && value.kind !== 'release') invalid();
      const host = await witness(), active = await runtime();
      if (host.publicKey !== value.witness) invalid();
      await host.assertRetained();
      const opening = value.opening, original = input.decode(opening.original);
      const source = opening.kind === 'funded' ? await active.admitReceizAccountFinancialSource(original)
        : await active.receiveReceizAccountFinancialWalletProof({
          ...active.readReceizAccountFinancialWalletProof(original), accountUserId: opening.accountUid, ownerKeyId: opening.ownerKeyId,
        }, { originals: host.originals, designatedWitnessPublicKey: host.publicKey });
      if (active.financialSourceDesignatedWitness?.(source) !== host.publicKey
        || active.financialSourceApplicationId(source) !== input.applicationId
        || source.accountUserId !== opening.accountUid) invalid();
      const executor = await active.createReceizAccountFinancialExecutor({
        source, store: host.store, originals: host.originals, signRecord: host.signRecord,
        async signOwner() { throw Error('BANK_WITNESS_OWNER_APPROVAL_REQUIRED'); },
      });
      if (value.kind === 'release') {
        if (!executor.executeWitnessedWalletRelease) invalid();
        const release = await executor.executeWitnessedWalletRelease(value.approval.request, value.approval.ownerApproval);
        return packetFrames({ ...envelope(host.publicKey), kind: 'released', original: input.encode(active.exportReceizAccountFinancialRelease(release)) });
      }
      if (!executor.executeWitnessedWalletPayment) invalid();
      const committed = await executor.executeWitnessedWalletPayment(value.approval.request, value.approval.ownerApproval);
      if (committed.status !== 'committed') throw Error('BANK_WITNESS_PAYMENT_PENDING');
      return frames(active.exportReceizAccountFinancialWalletProof(source, committed));
    },
    async acceptResult(bytes: Uint8Array) {
      return input.lock(async () => {
        const setup = await paired(), pending = setup.pending;
        if (!pending) invalid();
        if (pending.kind === 'payment') {
          await withLot(setup, pending.lot, session => session.acceptWitnessedWalletPayment(pending.approval, bytes));
          const { pending: _, ...resolved } = setup;
          await input.save(resolved, setup);
          return 'payment' as const;
        }
        const result = packet(bytes, setup.witness);
        if (result.kind !== 'released') invalid();
        const release = input.decode(result.original);
        await withLot(setup, pending.lot, session => session.verifyWitnessedWalletRelease(pending.approval, release));
        await input.save({ ...setup, pending: { ...pending, releaseRef: await retain(release) } }, setup);
        return 'release' as const;
      });
    },
    async receive(bytes: Uint8Array) {
      return input.lock(async () => {
        const setup = await paired(), candidate = { ref: await input.digest(bytes), kind: 'received' } as const;
        const received = await withLot(setup, candidate, async session => ({
          allocationId: session.sourceReference().allocationId, amount: (await session.wallet()).availableUsdCents,
        }), bytes);
        if (setup.returned?.includes(received.allocationId)
          || setup.lots.some(item => item.allocationId === received.allocationId)) return { alreadyRecorded: true } as const;
        const lot = { ...candidate, allocationId: received.allocationId, ref: await retain(bytes) };
        await input.save({ ...setup, lots: [...setup.lots, lot] }, setup);
        return { alreadyRecorded: false, amount: received.amount } as const;
      });
    },
    async returnOnline() {
      return input.lock(async () => {
        if (!input.online()) throw Error('BANK_WITNESS_SETUP_CONNECTION');
        const setup = await paired(), pending = setup.pending;
        if (pending?.kind !== 'release' || !pending.releaseRef) invalid();
        const release = await exact(pending.releaseRef);
        const { release: admitted, financialOriginals, allocationId } = await withLot(setup, pending.lot, async session => ({
          ...await session.verifyWitnessedWalletRelease(pending.approval, release), allocationId: session.sourceReference().allocationId,
        }));
        const financialOriginalsB64u = financialOriginals?.map(input.encode) ?? [];
        const response = pending.lot.kind === 'funded'
          ? await input.request({ operation: 'release', allocationId,
            payload: { artifactBytesB64u: input.encode(release), financialOriginalsB64u } }, true) as { status: string; artifactSha256: string }
          : await input.publishPeerRelease({ walletProofB64u: input.encode(await exact(pending.lot.ref)),
            releaseOriginalB64u: input.encode(release), financialOriginalsB64u }) as { schema: string; releaseArtifactSha256: string };
        if (!response || !('status' in response ? response.status === 'released' && response.artifactSha256 === admitted.artifactSha256
          : response.schema === 'receiz.bank.wallet-peer-release-ack.v1' && response.releaseArtifactSha256 === admitted.artifactSha256)) invalid();
        const { pending: _, ...settled } = setup;
        await input.save({ ...settled, returned: [...(settled.returned ?? []), allocationId],
          lots: settled.lots.filter(lot => lot.allocationId !== allocationId) }, setup);
      });
    },
  });
}

export type WitnessedWallet = ReturnType<typeof createWitnessedWallet>;
export type WitnessedWalletRecipient = Awaited<ReturnType<WitnessedWallet['readRecipient']>>;

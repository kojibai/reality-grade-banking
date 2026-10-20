import { momentFromUTC } from '../../../utils/kai_pulse';
import { canonicalizeReceizConstitution as canonical } from '../../../../packages/receiz-sdk/src/constitution';
import { digestReceizAuthority } from '../../../../packages/receiz-sdk/src/authorityEncoding';
import { parseReceizIdentityArtifactText, signReceizIdentityLoginProof, receizBase64UrlEncode as enc, receizBase64UrlDecode as dec, verifyReceizIdentityPublicKeyProjectionSignature, type ReceizKeyFileV1, type ReceizIdentityKeyAlgorithm } from '../../../../packages/receiz-sdk/src/identity';
import { readVerifiedReceizDocumentBytesCanonical } from '../../../../packages/receiz-sdk/src/verifier/canonical';
import { receizCurrentPinnedSignatureV4Roots } from '../../../../packages/receiz-sdk/src/verifier/roots';
import type { ReceizSignatureV4RootPublicKey } from '../../../../packages/receiz-sdk/src/verifier/signatureV4';
import { sha256Hex } from '../../../utils/sha256';
import { verifyBankNoteAccountReceivingRequest } from './accountReceiving';
import { BANK_RESERVE_ALLOCATION_SIGN_CONTEXT, type BankAllocationRootSignature } from './allocation';
export const BANK_CONNECTED_NOTE_PROFILE = 'connected-account-v1' as const;
export type BankConnectedNoteOptions = Readonly<{
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>;
export type BankConnectedNoteKey = Readonly<{
    keyId: string;
    algorithm: ReceizIdentityKeyAlgorithm;
    publicKeyRawB64u: string;
}>;
export type BankConnectedNoteIssueBasis = Readonly<{
    schema: 'receiz.bank.connected-note.issue.v1';
    profile: typeof BANK_CONNECTED_NOTE_PROFILE;
    accountUserId: string;
    issuer: BankConnectedNoteKey;
    noteAuthority: BankConnectedNoteKey;
    noteId: string;
    clientNonce: string;
    rail: 'reserve' | 'settlement';
    amountUsdCents: string;
    amountPhiMicro: string | null;
    usdPerPhiMicrocents: string;
    quotePulse: string;
    expectedReserveBeforeUsdCents: string;
    expectedWalletBeforePhiMicro: string;
    issuedAtMs: number;
    expiresAtMs: number;
}>;
export type BankConnectedNoteIssue = BankConnectedNoteIssueBasis & Readonly<{
    operationId: string;
    signatureB64Url: string;
}>;
export type BankConnectedNoteCancellation = Readonly<{
    schema: 'receiz.bank.connected-note.cancel.v1';
    authorization: BankConnectedNoteIssue;
    cancelDigest: string;
    signatureB64Url: string;
}>;
export type BankConnectedNoteFunding = Readonly<{
    schema: 'receiz.bank.connected-note.funding.v1';
    profile: typeof BANK_CONNECTED_NOTE_PROFILE;
    operationId: string;
    noteId: string;
    accountUserId: string;
    issuer: BankConnectedNoteKey;
    noteAuthority: BankConnectedNoteKey;
    rail: 'reserve' | 'settlement';
    amountPhiMicro: string;
    amountUsdCents: string;
    usdPerPhiMicrocents: string;
    fundedAtKai: string;
    debitLedgerId: string;
    privateAccountSnapshotSha256: string;
}>;
type HandoverIntent = Readonly<{
    schema: 'receiz.bank.connected-note.handover.v1';
    noteId: string;
    fundingArtifactSha256: string;
    receivingRequestDigest: string;
    receiverUserId: string;
    receiverKeyId: string;
    nonce: string;
    kai: string;
}>;
type Handover = Readonly<{
    schema: 'receiz.bank.connected-note.handover-source.v1';
    fundingSource: string;
    receivingRequest: string;
    intent: HandoverIntent;
    handoverDigest: string;
    signatureB64Url: string;
}>;
export type BankConnectedNoteClaim = Readonly<{
    schema: 'receiz.bank.connected-note.claim.v1';
    noteId: string;
    sourceSha256: string;
    handoverDigest: string;
    receiverUserId: string;
    receiver: BankConnectedNoteKey;
    nonce: string;
    claimDigest: string;
    signatureB64Url: string;
}>;
export type BankConnectedNoteCredit = Readonly<{
    schema: 'receiz.bank.connected-note.credit.v1';
    profile: typeof BANK_CONNECTED_NOTE_PROFILE;
    noteId: string;
    operationId: string;
    redemptionDigest: string;
    receiverUserId: string;
    receiverKeyId: string;
    rail: 'reserve' | 'settlement';
    amountPhiMicro: string;
    amountUsdCents: string;
    acceptedAtKai: string;
    creditLedgerId: string;
    terminalSourceSha256: string;
    privateAccountSnapshotSha256: string;
}>;
export type BankConnectedNoteCancellationProof = Readonly<{
    schema: 'receiz.bank.connected-note.cancellation.v1';
    profile: typeof BANK_CONNECTED_NOTE_PROFILE;
    operationId: string;
    noteId: string;
    accountUserId: string;
    issuerKeyId: string;
    rail: 'reserve' | 'settlement';
    amountPhiMicro: string;
    amountUsdCents: string;
    cancelledAtKai: string;
    cancellationMarkerId: string;
    privateAccountSnapshotSha256: string;
}>;
export type BankConnectedNoteOpening = Readonly<{
    schema: 'receiz.bank.connected-note.private-account.v1';
    operationId: string;
    noteId: string;
    accountUserId: string;
    keyId: string;
    rail: 'reserve' | 'settlement';
    direction: 'debit' | 'credit' | 'cancel';
    amountPhiMicro: string;
    amountUsdCents: string;
    reserveBeforeUsdCents: string;
    reserveAfterUsdCents: string;
    walletBeforePhiMicro: string;
    walletAfterPhiMicro: string;
}>;
function fail(code = 'SOURCE_REQUIRED'): never { throw Error(`BANK_CONNECTED_NOTE_${code}`); }
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/iu.test(v);
const uint = (v: unknown, positive = false): v is string => typeof v === 'string' && /^(0|[1-9][0-9]{0,18})$/u.test(v) && BigInt(v) <= (1n << 63n) - 1n && (!positive || BigInt(v) > 0n);
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: unknown, keys: readonly string[]) => record(v) && Object.keys(v).sort().join('|') === [...keys].sort().join('|');
const keyFields = ['keyId', 'algorithm', 'publicKeyRawB64u'];
async function checkKey(v: unknown) {
    if (!exact(v, keyFields))
        fail('KEY_INVALID');
    const k = v as BankConnectedNoteKey;
    if (!hash(k.keyId) || !['Ed25519', 'P-256'].includes(k.algorithm) || typeof k.publicKeyRawB64u !== 'string' || !/^[A-Za-z0-9_-]{43,180}$/u.test(k.publicKeyRawB64u) || await sha256Hex(dec(k.publicKeyRawB64u)) !== k.keyId)
        fail('KEY_INVALID');
}
const publicKey = (identity: ReceizKeyFileV1): BankConnectedNoteKey => ({ keyId: identity.keyId, algorithm: identity.alg, publicKeyRawB64u: identity.crypto.publicKeyRawB64u });
const challenge = (domain: string, digest: string) => enc(new TextEncoder().encode(`${domain}:${digest}`));
async function sign(identity: ReceizKeyFileV1, passphrase: string | undefined, domain: string, digest: string) { return (await signReceizIdentityLoginProof({ keyFile: identity, passphrase, challengeB64Url: challenge(domain, digest) })).signatureB64Url; }
async function verify(key: BankConnectedNoteKey, domain: string, digest: string, signatureB64Url: string) {
    await checkKey(key);
    if (!hash(digest) || typeof signatureB64Url !== 'string' || !await verifyReceizIdentityPublicKeyProjectionSignature({ keyId: key.keyId, alg: key.algorithm, publicKeyRawB64u: key.publicKeyRawB64u, challengeB64Url: challenge(domain, digest), signatureB64Url }))
        fail('SIGNATURE_REQUIRED');
}
const issueFields = ['schema', 'profile', 'accountUserId', 'issuer', 'noteAuthority', 'noteId', 'clientNonce', 'rail', 'amountUsdCents', 'amountPhiMicro', 'usdPerPhiMicrocents', 'quotePulse', 'expectedReserveBeforeUsdCents', 'expectedWalletBeforePhiMicro', 'issuedAtMs', 'expiresAtMs'];
export async function verifyBankConnectedNoteIssue(value: unknown, options: Readonly<{
    nowMs?: number;
}> = {}): Promise<BankConnectedNoteIssue> {
    if (!exact(value, [...issueFields, 'operationId', 'signatureB64Url']))
        fail('AUTHORIZATION_INVALID');
    const v = value as BankConnectedNoteIssue, { operationId, signatureB64Url, ...b } = v;
    await checkKey(b.issuer);
    await checkKey(b.noteAuthority);
    if (b.schema !== 'receiz.bank.connected-note.issue.v1' || b.profile !== BANK_CONNECTED_NOTE_PROFILE || !uuid(b.accountUserId) || !uuid(b.noteId) || !uuid(b.clientNonce) || !['reserve', 'settlement'].includes(b.rail) || !uint(b.amountUsdCents, true) || BigInt(b.amountUsdCents) > 100000000n || !uint(b.usdPerPhiMicrocents, true) || !uint(b.quotePulse) || b.quotePulse !== String(Math.floor(momentFromUTC(new Date(b.issuedAtMs)).pulse)) || !uint(b.expectedReserveBeforeUsdCents) || !uint(b.expectedWalletBeforePhiMicro) || b.issuer.keyId === b.noteAuthority.keyId || b.rail === 'reserve' && b.amountPhiMicro !== null || b.rail === 'settlement' && !uint(b.amountPhiMicro, true) || !Number.isSafeInteger(b.issuedAtMs) || !Number.isSafeInteger(b.expiresAtMs) || b.expiresAtMs - b.issuedAtMs !== 300000 || b.issuedAtMs <= 0)
        fail('AUTHORIZATION_INVALID');
    if (options.nowMs !== undefined && (options.nowMs < b.issuedAtMs - 30000 || options.nowMs > b.expiresAtMs))
        fail('AUTHORIZATION_EXPIRED');
    if (await digestReceizAuthority('identity', b.schema, b) !== operationId)
        fail('AUTHORIZATION_INVALID');
    await verify(b.issuer, b.schema, operationId, signatureB64Url);
    return Object.freeze(structuredClone(v));
}
export async function createBankConnectedNoteIssue(input: Readonly<{
    identity: ReceizKeyFileV1;
    passphrase?: string;
    accountUserId: string;
    noteIdentity: ReceizKeyFileV1;
    rail: 'reserve' | 'settlement';
    amountUsdCents: string;
    amountPhiMicro?: string;
    usdPerPhiMicrocents: string;
    quotePulse?: string;
    expectedReserveBeforeUsdCents: string;
    expectedWalletBeforePhiMicro: string;
    clientNonce?: string;
    noteId?: string;
    nowMs?: number;
}>): Promise<BankConnectedNoteIssue> {
    const identity = parseReceizIdentityArtifactText(JSON.stringify(input.identity)), note = parseReceizIdentityArtifactText(JSON.stringify(input.noteIdentity)), now = input.nowMs ?? Date.now();
    const basis: BankConnectedNoteIssueBasis = { schema: 'receiz.bank.connected-note.issue.v1', profile: BANK_CONNECTED_NOTE_PROFILE, accountUserId: input.accountUserId, issuer: publicKey(identity), noteAuthority: publicKey(note), noteId: input.noteId ?? crypto.randomUUID(), clientNonce: input.clientNonce ?? crypto.randomUUID(), rail: input.rail, amountUsdCents: input.amountUsdCents, amountPhiMicro: input.rail === 'settlement' ? input.amountPhiMicro ?? fail('EXACT_PHI_REQUIRED') : null, usdPerPhiMicrocents: input.usdPerPhiMicrocents, quotePulse: input.quotePulse ?? String(Math.floor(momentFromUTC(new Date(now)).pulse)), expectedReserveBeforeUsdCents: input.expectedReserveBeforeUsdCents, expectedWalletBeforePhiMicro: input.expectedWalletBeforePhiMicro, issuedAtMs: now, expiresAtMs: now + 300000 };
    const operationId = await digestReceizAuthority('identity', basis.schema, basis);
    return verifyBankConnectedNoteIssue({ ...basis, operationId, signatureB64Url: await sign(identity, input.passphrase, basis.schema, operationId) });
}
export async function createBankConnectedNoteCancellation(input: Readonly<{
    authorization: BankConnectedNoteIssue;
    identity: ReceizKeyFileV1;
    passphrase?: string;
}>): Promise<BankConnectedNoteCancellation> {
    const authorization = await verifyBankConnectedNoteIssue(input.authorization);
    if (input.identity.keyId !== authorization.issuer.keyId)
        fail('IDENTITY_BINDING_REQUIRED');
    const basis = { schema: 'receiz.bank.connected-note.cancel.v1' as const, authorization }, cancelDigest = await digestReceizAuthority('identity', basis.schema, basis);
    return { ...basis, cancelDigest, signatureB64Url: await sign(input.identity, input.passphrase, basis.schema, cancelDigest) };
}
export async function verifyBankConnectedNoteCancellationAuthorization(value: unknown) {
    if (!exact(value, ['schema', 'authorization', 'cancelDigest', 'signatureB64Url']))
        fail('AUTHORIZATION_INVALID');
    const v = value as BankConnectedNoteCancellation;
    await verifyBankConnectedNoteIssue(v.authorization);
    const { cancelDigest, signatureB64Url, ...basis } = v;
    if (v.schema !== 'receiz.bank.connected-note.cancel.v1' || await digestReceizAuthority('identity', v.schema, basis) !== cancelDigest)
        fail('AUTHORIZATION_INVALID');
    await verify(v.authorization.issuer, v.schema, cancelDigest, signatureB64Url);
    return v;
}
export function bankConnectedNoteFinancialSigningBytes(value: BankConnectedNoteFunding | BankConnectedNoteCredit | BankConnectedNoteCancellationProof) { return new TextEncoder().encode(`${BANK_RESERVE_ALLOCATION_SIGN_CONTEXT}\0${canonical(value)}`); }
async function financial(value: unknown, signature: unknown, roots: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>) {
    if (!record(value) || !['receiz.bank.connected-note.funding.v1', 'receiz.bank.connected-note.credit.v1', 'receiz.bank.connected-note.cancellation.v1'].includes(String(value.schema)) || value.profile !== BANK_CONNECTED_NOTE_PROFILE || !uuid(value.noteId) || !hash(value.operationId) || !['reserve', 'settlement'].includes(String(value.rail)) || !uint(value.amountPhiMicro, value.schema !== 'receiz.bank.connected-note.cancellation.v1') || !uint(value.amountUsdCents, value.schema !== 'receiz.bank.connected-note.cancellation.v1') || !hash(value.privateAccountSnapshotSha256))
        fail();
    const funding = value.schema === 'receiz.bank.connected-note.funding.v1';
    if (funding) {
        if (!exact(value, ['schema', 'profile', 'operationId', 'noteId', 'accountUserId', 'issuer', 'noteAuthority', 'rail', 'amountPhiMicro', 'amountUsdCents', 'usdPerPhiMicrocents', 'fundedAtKai', 'debitLedgerId', 'privateAccountSnapshotSha256']) || !uuid(value.accountUserId) || !uuid(value.debitLedgerId) || !uint(value.usdPerPhiMicrocents, true) || !uint(value.fundedAtKai) || ((BigInt(value.amountPhiMicro as string) * BigInt(value.usdPerPhiMicrocents as string) + 500000000000n) / 1000000000000n) !== BigInt(value.amountUsdCents as string))
            fail();
        await checkKey(value.issuer);
        await checkKey(value.noteAuthority);
        if ((value.issuer as BankConnectedNoteKey).keyId === (value.noteAuthority as BankConnectedNoteKey).keyId)
            fail();
    }
    else if (value.schema === 'receiz.bank.connected-note.cancellation.v1') {
        if (!exact(value, ['schema', 'profile', 'operationId', 'noteId', 'accountUserId', 'issuerKeyId', 'rail', 'amountPhiMicro', 'amountUsdCents', 'cancelledAtKai', 'cancellationMarkerId', 'privateAccountSnapshotSha256']) || !uuid(value.accountUserId) || !hash(value.issuerKeyId) || !uint(value.cancelledAtKai) || !uuid(value.cancellationMarkerId))
            fail();
    }
    else if (!exact(value, ['schema', 'profile', 'noteId', 'operationId', 'redemptionDigest', 'receiverUserId', 'receiverKeyId', 'rail', 'amountPhiMicro', 'amountUsdCents', 'acceptedAtKai', 'creditLedgerId', 'terminalSourceSha256', 'privateAccountSnapshotSha256']) || !uuid(value.receiverUserId) || !hash(value.receiverKeyId) || !hash(value.redemptionDigest) || !hash(value.terminalSourceSha256) || !uuid(value.creditLedgerId) || !uint(value.acceptedAtKai))
        fail();
    if (!exact(signature, ['kid', 'alg', 'sig', 'signedAtMs']))
        fail('FINANCIAL_SIGNATURE_REQUIRED');
    const s = signature as BankAllocationRootSignature, root = roots.get(s.kid), pulse = BigInt(String(funding ? value.fundedAtKai : value.schema === 'receiz.bank.connected-note.cancellation.v1' ? value.cancelledAtKai : value.acceptedAtKai));
    if (!root || root.alg !== 'Ed25519' || s.alg !== 'Ed25519' || !Number.isSafeInteger(s.signedAtMs) || s.signedAtMs <= 0 || (root.status !== 'active' && root.status !== 'retired') || root.status === 'retired' && !root.retiredAtPulse || root.activeFromPulse && pulse < BigInt(root.activeFromPulse) || root.retiredAtPulse && pulse > BigInt(root.retiredAtPulse))
        fail('FINANCIAL_SIGNATURE_REQUIRED');
    try {
        const k = await crypto.subtle.importKey('raw', dec(root.publicKeyRawB64u).slice().buffer, 'Ed25519', false, ['verify']);
        if (!await crypto.subtle.verify('Ed25519', k, dec(s.sig).slice().buffer, bankConnectedNoteFinancialSigningBytes(value as BankConnectedNoteFunding | BankConnectedNoteCredit | BankConnectedNoteCancellationProof).slice().buffer))
            fail('FINANCIAL_SIGNATURE_REQUIRED');
    }
    catch {
        fail('FINANCIAL_SIGNATURE_REQUIRED');
    }
}
const receiptBytes = (source: Uint8Array, privateAccountOpening: Uint8Array) => new TextEncoder().encode(canonical({ schema: 'receiz.bank.connected-note.receipt.v1', source: enc(source), privateAccountOpening: enc(privateAccountOpening) }));
async function openFinancial(bytes: Uint8Array, options: BankConnectedNoteOptions) {
    if (!bytes.length || bytes.length > 16 * 1024 * 1024)
        fail();
    const opened = await readVerifiedReceizDocumentBytesCanonical({ fileBytes: bytes, filename: 'connected-note.receizbundle', mime: 'application/vnd.receiz.bundle+json', signatureV4RootPublicKeys: options.roots ?? receizCurrentPinnedSignatureV4Roots() });
    if (!opened.ok || !opened.verification.integrity.ok || opened.payloadMimeType !== 'application/json')
        fail();
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(opened.payloadBytes), body: unknown = JSON.parse(raw);
    if (raw !== canonical(body) || !record(body))
        fail();
    const kind = Object.hasOwn(body, 'funding') ? 'funding' : Object.hasOwn(body, 'credit') ? 'credit' : 'cancellation', fields = kind === 'funding' ? ['schema', 'funding', 'fundingSignature'] : kind === 'credit' ? ['schema', 'credit', 'creditSignature', 'terminalSource', 'claim'] : ['schema', 'cancellation', 'cancellationSignature'];
    if (!exact(body, fields) || body.schema !== `receiz.bank.connected-note.${kind}-source.v1`)
        fail();
    if (!record(body[kind]) || (body[kind] as Record<string, unknown>).schema !== `receiz.bank.connected-note.${kind === 'cancellation' ? 'cancellation' : kind}.v1`)
        fail();
    await financial(body[kind], body[kind + 'Signature'], options.roots ?? receizCurrentPinnedSignatureV4Roots());
    return body;
}
export async function isBankConnectedNoteSource(bytes: Uint8Array): Promise<boolean> {
    try {
        const v = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        if (v?.schema === 'receiz.bank.connected-note.handover-source.v1')
            return true;
        const opened = await readVerifiedReceizDocumentBytesCanonical({ fileBytes: bytes, filename: 'connected-note.receizbundle', mime: 'application/vnd.receiz.bundle+json' });
        if (!opened.ok)
            return false;
        const body = JSON.parse(new TextDecoder().decode(opened.payloadBytes));
        return ['receiz.bank.connected-note.funding-source.v1', 'receiz.bank.connected-note.credit-source.v1'].includes(body?.schema);
    }
    catch {
        return false;
    }
}
async function readBankConnectedNoteSourceUncached(input: Uint8Array, options: BankConnectedNoteOptions = {}) {
    const bytes = Uint8Array.from(input);
    if (!bytes.length || bytes.length > 16 * 1024 * 1024)
        fail();
    let raw: unknown;
    try {
        raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    }
    catch {
        fail();
    }
    let fundingBytes: Uint8Array = bytes;
    let handover: Handover | undefined;
    if (record(raw) && raw.schema === 'receiz.bank.connected-note.handover-source.v1') {
        if (!exact(raw, ['schema', 'fundingSource', 'receivingRequest', 'intent', 'handoverDigest', 'signatureB64Url']) || new TextDecoder().decode(bytes) !== canonical(raw) || typeof raw.fundingSource !== 'string' || typeof raw.receivingRequest !== 'string')
            fail();
        handover = raw as Handover;
        fundingBytes = dec(handover.fundingSource);
        if (enc(fundingBytes) !== handover.fundingSource)
            fail();
    }
    const body = await openFinancial(fundingBytes, options);
    if (!body.funding)
        fail();
    const funding = body.funding as BankConnectedNoteFunding, fundingArtifactSha256 = await sha256Hex(fundingBytes);
    if (handover) {
        const i = handover.intent, request = await verifyBankNoteAccountReceivingRequest(dec(handover.receivingRequest));
        if (!exact(i, ['schema', 'noteId', 'fundingArtifactSha256', 'receivingRequestDigest', 'receiverUserId', 'receiverKeyId', 'nonce', 'kai']) || i.schema !== 'receiz.bank.connected-note.handover.v1' || i.noteId !== funding.noteId || i.fundingArtifactSha256 !== fundingArtifactSha256 || i.receivingRequestDigest !== request.requestDigest || i.receiverUserId !== request.receiverUserId || i.receiverKeyId !== request.receiverKeyId || !uuid(i.nonce) || !uint(i.kai) || await digestReceizAuthority('identity', i.schema, i) !== handover.handoverDigest)
            fail('HANDOVER_INVALID');
        await verify(funding.noteAuthority, i.schema, handover.handoverDigest, handover.signatureB64Url);
    }
    return Object.freeze({ kind: handover ? 'handover' as const : 'funding' as const, noteId: funding.noteId, rail: funding.rail, amountPhiMicro: funding.amountPhiMicro, amountUsdCents: funding.amountUsdCents, ...(handover ? { receiverUserId: handover.intent.receiverUserId, receiverKeyId: handover.intent.receiverKeyId, redemptionDigest: handover.handoverDigest } : {}), terminalArtifactSha256: await sha256Hex(bytes), terminalSourceBytes: bytes, fundingArtifactSha256, fundingSourceBytes: fundingBytes, funding, handover, exclusiveConsumption: 'connection-required' as const });
}
export async function createBankConnectedNoteHandover(input: Readonly<{
    fundingSourceBytes: Uint8Array;
    receivingRequestBytes: Uint8Array;
    noteIdentity: ReceizKeyFileV1;
    passphrase?: string;
    kai: string;
    nonce?: string;
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<Uint8Array> {
    const source = await readBankConnectedNoteSource(input.fundingSourceBytes, input);
    if (source.kind !== 'funding' || source.funding.noteAuthority.keyId !== input.noteIdentity.keyId)
        fail('NOTE_AUTHORITY_REQUIRED');
    const request = await verifyBankNoteAccountReceivingRequest(input.receivingRequestBytes), intent: HandoverIntent = { schema: 'receiz.bank.connected-note.handover.v1', noteId: source.noteId, fundingArtifactSha256: source.fundingArtifactSha256, receivingRequestDigest: request.requestDigest, receiverUserId: request.receiverUserId, receiverKeyId: request.receiverKeyId, nonce: input.nonce ?? crypto.randomUUID(), kai: input.kai }, handoverDigest = await digestReceizAuthority('identity', intent.schema, intent);
    const result = new TextEncoder().encode(canonical({ schema: 'receiz.bank.connected-note.handover-source.v1', fundingSource: enc(source.fundingSourceBytes), receivingRequest: enc(input.receivingRequestBytes), intent, handoverDigest, signatureB64Url: await sign(input.noteIdentity, input.passphrase, intent.schema, handoverDigest) }));
    await readBankConnectedNoteSource(result, input);
    return result;
}
export async function verifyBankConnectedNoteClaim(value: unknown) {
    if (!exact(value, ['schema', 'noteId', 'sourceSha256', 'handoverDigest', 'receiverUserId', 'receiver', 'nonce', 'claimDigest', 'signatureB64Url']))
        fail('CLAIM_INVALID');
    const v = value as BankConnectedNoteClaim, { claimDigest, signatureB64Url, ...basis } = v;
    if (v.schema !== 'receiz.bank.connected-note.claim.v1' || !uuid(v.noteId) || !uuid(v.receiverUserId) || !uuid(v.nonce) || !hash(v.sourceSha256) || !hash(v.handoverDigest) || await digestReceizAuthority('identity', v.schema, basis) !== claimDigest)
        fail('CLAIM_INVALID');
    await verify(v.receiver, v.schema, claimDigest, signatureB64Url);
    return v;
}
export async function createBankConnectedNoteClaim(input: Readonly<{
    sourceBytes: Uint8Array;
    identity: ReceizKeyFileV1;
    passphrase?: string;
    accountUserId: string;
    nonce?: string;
    nowMs?: number;
    roots?: ReadonlyMap<string, ReceizSignatureV4RootPublicKey>;
}>): Promise<BankConnectedNoteClaim> {
    const source = await readBankConnectedNoteSource(input.sourceBytes, input);
    if (source.kind !== 'handover' || source.receiverUserId !== input.accountUserId || source.receiverKeyId !== input.identity.keyId)
        fail('IDENTITY_BINDING_REQUIRED');
    const basis = { schema: 'receiz.bank.connected-note.claim.v1' as const, noteId: source.noteId, sourceSha256: source.terminalArtifactSha256, handoverDigest: source.redemptionDigest!, receiverUserId: input.accountUserId, receiver: publicKey(input.identity), nonce: input.nonce ?? crypto.randomUUID() }, claimDigest = await digestReceizAuthority('identity', basis.schema, basis);
    return verifyBankConnectedNoteClaim({ ...basis, claimDigest, signatureB64Url: await sign(input.identity, input.passphrase, basis.schema, claimDigest) });
}
export function bankConnectedNoteOpeningBytes(opening: BankConnectedNoteOpening) { return new TextEncoder().encode(canonical(opening)); }
async function opening(bytes: Uint8Array, f: BankConnectedNoteFunding | BankConnectedNoteCredit | BankConnectedNoteCancellationProof) {
    if (!bytes.length || bytes.length > 16384 || await sha256Hex(bytes) !== f.privateAccountSnapshotSha256)
        fail('ACCOUNT_OPENING_REQUIRED');
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(bytes), v = JSON.parse(raw) as BankConnectedNoteOpening, isFunding = f.schema === 'receiz.bank.connected-note.funding.v1', isCancel = f.schema === 'receiz.bank.connected-note.cancellation.v1';
    if (raw !== canonical(v) || !exact(v, ['schema', 'operationId', 'noteId', 'accountUserId', 'keyId', 'rail', 'direction', 'amountPhiMicro', 'amountUsdCents', 'reserveBeforeUsdCents', 'reserveAfterUsdCents', 'walletBeforePhiMicro', 'walletAfterPhiMicro']) || v.schema !== 'receiz.bank.connected-note.private-account.v1' || v.operationId !== f.operationId || v.noteId !== f.noteId || v.accountUserId !== (isFunding || isCancel ? f.accountUserId : f.receiverUserId) || v.keyId !== (isFunding ? f.issuer.keyId : isCancel ? f.issuerKeyId : f.receiverKeyId) || v.rail !== f.rail || v.direction !== (isFunding ? 'debit' : isCancel ? 'cancel' : 'credit') || v.amountPhiMicro !== f.amountPhiMicro || v.amountUsdCents !== f.amountUsdCents || ![v.reserveBeforeUsdCents, v.reserveAfterUsdCents, v.walletBeforePhiMicro, v.walletAfterPhiMicro].every(v => uint(v)))
        fail('ACCOUNT_OPENING_REQUIRED');
    const direction = isFunding ? -1n : 1n;
    if (BigInt(v.walletAfterPhiMicro) - BigInt(v.walletBeforePhiMicro) !== direction * BigInt(f.amountPhiMicro) || BigInt(v.reserveAfterUsdCents) - BigInt(v.reserveBeforeUsdCents) !== direction * (f.rail === 'reserve' ? BigInt(f.amountUsdCents) : 0n))
        fail('ACCOUNT_OPENING_REQUIRED');
    return { reserveUsdCents: v.reserveAfterUsdCents, balancePhiMicro: v.walletAfterPhiMicro };
}
export async function verifyBankConnectedNoteFunding(source: Uint8Array, privateAccountOpening: Uint8Array, options: BankConnectedNoteOptions = {}) {
    const read = await readBankConnectedNoteSource(source, options);
    if (read.kind !== 'funding')
        fail();
    return { ...read, accountAfter: await opening(privateAccountOpening, read.funding), proofBytes: Uint8Array.from(source) };
}
export async function verifyBankConnectedNoteCredit(source: Uint8Array, privateAccountOpening: Uint8Array, options: BankConnectedNoteOptions = {}) {
    options = { roots: structuredClone(options.roots ?? receizCurrentPinnedSignatureV4Roots()) };
    const body = await openFinancial(source, options);
    if (!body.credit || typeof body.terminalSource !== 'string')
        fail();
    const credit = body.credit as BankConnectedNoteCredit, terminal = await readBankConnectedNoteSource(dec(body.terminalSource), options), claim = await verifyBankConnectedNoteClaim(body.claim);
    if (terminal.kind !== 'handover' || terminal.terminalArtifactSha256 !== credit.terminalSourceSha256 || claim.sourceSha256 !== credit.terminalSourceSha256 || claim.claimDigest !== credit.redemptionDigest || claim.noteId !== credit.noteId || claim.receiverUserId !== credit.receiverUserId || claim.receiver.keyId !== credit.receiverKeyId || terminal.receiverUserId !== credit.receiverUserId || terminal.receiverKeyId !== credit.receiverKeyId || terminal.noteId !== credit.noteId || terminal.funding.operationId !== credit.operationId || terminal.rail !== credit.rail || terminal.amountPhiMicro !== credit.amountPhiMicro || terminal.amountUsdCents !== credit.amountUsdCents || claim.handoverDigest !== terminal.redemptionDigest)
        fail();
    return { ...terminal, redemptionDigest: credit.redemptionDigest, credit, accountAfter: await opening(privateAccountOpening, credit), proofBytes: receiptBytes(source, privateAccountOpening) };
}
export async function verifyBankConnectedNoteCancellation(source: Uint8Array, privateAccountOpening: Uint8Array, options: BankConnectedNoteOptions = {}) {
    options = { roots: structuredClone(options.roots ?? receizCurrentPinnedSignatureV4Roots()) };
    const body = await openFinancial(source, options);
    if (!body.cancellation)
        fail();
    const cancellation = body.cancellation as BankConnectedNoteCancellationProof;
    return { cancellation, noteId: cancellation.noteId, operationId: cancellation.operationId, accountAfter: await opening(privateAccountOpening, cancellation), proofBytes: receiptBytes(source, privateAccountOpening) };
}
export async function verifyBankConnectedNoteReceipt(input: Uint8Array, options: BankConnectedNoteOptions = {}) {
    if (!input.length || input.length > 24 * 1024 * 1024)
        fail();
    const raw = new TextDecoder('utf-8', { fatal: true }).decode(input), v = JSON.parse(raw);
    if (raw !== canonical(v) || !exact(v, ['schema', 'source', 'privateAccountOpening']) || v.schema !== 'receiz.bank.connected-note.receipt.v1' || typeof v.source !== 'string' || typeof v.privateAccountOpening !== 'string')
        fail();
    const source = dec(v.source), cash = dec(v.privateAccountOpening);
    if (enc(source) !== v.source || enc(cash) !== v.privateAccountOpening)
        fail();
    const body = await openFinancial(source, options);
    if (body.credit)
        return { ...await verifyBankConnectedNoteCredit(source, cash, options), kind: 'credit' as const };
    if (body.cancellation)
        return { ...await verifyBankConnectedNoteCancellation(source, cash, options), kind: 'cancellation' as const };
    fail();
}
export async function exportBankConnectedNoteReceipt(source: Uint8Array, privateAccountOpening: Uint8Array, options: BankConnectedNoteOptions = {}) { const bytes = receiptBytes(source, privateAccountOpening); await verifyBankConnectedNoteReceipt(bytes, options); return bytes; }
const sourceAdmissions = new Map<string, Promise<Awaited<ReturnType<typeof readBankConnectedNoteSourceUncached>>>>();
/** Admission reuse is scoped to exact complete source bytes and a detached root
 * policy. Cached buffers and objects are never exposed to a caller. */
export async function readBankConnectedNoteSource(input: Uint8Array, options: BankConnectedNoteOptions = {}) {
    const bytes = Uint8Array.from(input);
    if (!bytes.length || bytes.length > 16 * 1024 * 1024)
        fail();
    const roots = structuredClone(options.roots ?? receizCurrentPinnedSignatureV4Roots()), policy = canonical([...roots.entries()].sort(([a], [b]) => a.localeCompare(b))), key = await sha256Hex(bytes) + ':' + policy;
    let held = sourceAdmissions.get(key);
    if (!held) {
        held = readBankConnectedNoteSourceUncached(bytes, { roots });
        sourceAdmissions.set(key, held);
        while (sourceAdmissions.size > 8)
            sourceAdmissions.delete(sourceAdmissions.keys().next().value!);
        held.catch(() => { if (sourceAdmissions.get(key) === held)
            sourceAdmissions.delete(key); });
    }
    return structuredClone(await held);
}

import { describe, expect, it, vi } from 'vitest';
import { createNativeTwin, ownerTwinReadiness, type NativeTwinRequest } from '../src/receiz/native-twin';

const uid = 'account-owner';
const question = { message: 'What changed?', requestId: 'operation-0001', quoteExpiresAt: '2026-10-19T13:05:00.000Z', threadKey: 'bankeiz-thread-1' };
const context = { schema: 'receiz.owner-twin.context.v1' as const, ownerUid: uid, disclosure: 'owner-approved-for-this-request' as const, records: [{ id: 'wallet-row-1', title: 'Transfer', text: 'Owner-selected account history.' }] };
const response = (source = 'upstream') => ({ ok: true, requestId: question.requestId, world: { username: 'owner' }, reply: { message: 'An interpretation.', source, memoryScope: 'relationship', actions: [{ kind: 'pay', label: 'Review payment', href: '/wallet/pay/owner' }], memory: [{ id: 'memory-1', role: 'assistant', body: 'A prior interpretation.', createdAt: '2026-10-19T12:00:00.000Z', scope: 'relationship', channel: 'profile', persistedId: 'stored-memory-1' }], cognition: { frame: { owner: { ownerUserId: uid, username: 'owner' }, sources: [{ coordinate: 'world-memory:1', sourceDigest: 'a'.repeat(64), excerptDigest: 'b'.repeat(64), authority: 'authenticated-memory-snapshot' }], policy: { consequentialOutput: 'proposal-only' } }, proposal: { proposedActions: [] } } } });

describe('existing owner Twin adapter', () => {
  it('preserves actual existing Twin conversation memory identities after the owner asks', async () => {
    const payload = response();
    const twin = createNativeTwin({ accountUid: uid, username: 'owner', request: async () => Response.json(payload), assertOpen() {} });
    const reply = await twin.ask(question);
    expect(reply.memory).toEqual(payload.reply.memory);
    expect(reply.memory).not.toBe(payload.reply.memory);
  });
  it('refuses malformed or unbounded historical memory without fabricating history', async () => {
    for (const change of [(payload: ReturnType<typeof response>) => { payload.reply.memory[0].role = 'system'; }, (payload: ReturnType<typeof response>) => { payload.reply.memory = Array.from({ length: 33 }, (_, i) => ({ ...payload.reply.memory[0], id: String(i) })); }]) {
      const payload = response(); change(payload);
      const twin = createNativeTwin({ accountUid: uid, username: 'owner', request: async () => Response.json(payload), assertOpen() {} });
      await expect(twin.ask(question)).rejects.toThrow('BANK_TWIN_MEMORY_INVALID');
    }
  });
  it('bounds the existing rich Twin response before parsing unrelated world media', async () => {
    const payload = { ...response(), unrelatedMedia: 'x'.repeat(4 * 1024 * 1024) };
    const twin = createNativeTwin({ accountUid: uid, username: 'owner', request: async () => Response.json(payload), assertOpen() {} });
    await expect(twin.ask(question)).rejects.toThrow('BANK_TWIN_RESPONSE_TOO_LARGE');
  });
  it('keeps profile readiness available without blocking the other messaging features', async () => {
    const request = vi.fn(async () => Response.json(response()));
    const twin = createNativeTwin({ accountUid: uid, username: null, request, assertOpen() {} });
    expect(twin.readiness().status).toBe('profile-required');
    await expect(twin.ask(question)).rejects.toThrow('BANK_TWIN_PROFILE_REQUIRED');
    expect(request).not.toHaveBeenCalled();
  });
  it('forwards the explicit owner ask cancellation signal without automatically retrying', async () => {
    const request = vi.fn<NativeTwinRequest>(async () => Response.json(response())), abort = new AbortController();
    const twin = createNativeTwin({ accountUid: uid, username: 'owner', request, assertOpen() {} });
    await twin.ask({ ...question, signal: abort.signal });
    expect(request.mock.calls[0]?.[1]?.signal).toBe(abort.signal);
  });
  it('calls only the owner route and preserves explicitly shared context separately from the question', async () => {
    const request = vi.fn(async () => Response.json(response()));
    const twin = createNativeTwin({ accountUid: uid, username: 'owner', request, assertOpen() {} });
    const reply = await twin.ask({ ...question, context });
    expect(request).toHaveBeenCalledWith('/api/developers/twin/owner/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...question, ownerContext: context, allowBrowserVoiceFallback: false }) });
    expect(reply.authority).toBe('generated-interpretation');
    expect(reply.sourceReferences[0].authority).toBe('authenticated-memory-snapshot');
    expect(reply.sharedContext).toEqual([{ id: 'wallet-row-1', title: 'Transfer', authority: 'owner-supplied-context' }]);
    expect(reply.actionHandoffs).toEqual([{ kind: 'pay', label: 'Review payment', href: 'https://receiz.com/wallet/pay/owner', authority: 'proposal-only', admitted: false }]);
  });
  it('labels deterministic fallback honestly and never claims an action was executed', async () => {
    const twin = createNativeTwin({ accountUid: uid, username: 'owner', request: async () => Response.json(response('fallback')), assertOpen() {} });
    const reply = await twin.ask(question);
    expect(reply.source).toBe('fallback');
    expect(reply.actionHandoffs.every(action => action.authority === 'proposal-only' && !action.admitted)).toBe(true);
  });
  it('refuses cross-owner context and response ownership before exposing account data', async () => {
    const request = vi.fn(async () => Response.json(response()));
    const twin = createNativeTwin({ accountUid: uid, username: 'owner', request, assertOpen() {} });
    await expect(twin.ask({ ...question, context: { ...context, ownerUid: 'other' } })).rejects.toThrow('BANK_TWIN_CONTEXT_OWNER_MISMATCH');
    expect(request).not.toHaveBeenCalled();
    const foreign = response(); foreign.reply.cognition.frame.owner.ownerUserId = 'other';
    await expect(createNativeTwin({ accountUid: uid, username: 'owner', request: async () => Response.json(foreign), assertOpen() {} }).ask(question)).rejects.toThrow('BANK_TWIN_RESPONSE_OWNER_MISMATCH');
  });
  it('refuses silently clipped questions, oversized shared records, and unsafe action links', async () => {
    const request = vi.fn(async () => Response.json(response()));
    const twin = createNativeTwin({ accountUid: uid, username: 'owner', request, assertOpen() {} });
    await expect(twin.ask({ ...question, message: 'x'.repeat(1201) })).rejects.toThrow('BANK_TWIN_QUESTION_INVALID');
    await expect(twin.ask({ ...question, context: { ...context, records: [{ id: '1', title: 'row', text: 'x'.repeat(2401) }] } })).rejects.toThrow('BANK_TWIN_CONTEXT_INVALID');
    expect(request).not.toHaveBeenCalled();
    const unsafe = response(); unsafe.reply.actions[0].href = 'javascript:alert(1)';
    await expect(createNativeTwin({ accountUid: uid, username: 'owner', request: async () => Response.json(unsafe), assertOpen() {} }).ask(question)).rejects.toThrow('BANK_TWIN_ACTION_INVALID');
  });
  it('does not retry an ambiguous metered request or invent an available runtime', async () => {
    const request = vi.fn(async () => { throw Error('Connection ended'); });
    const twin = createNativeTwin({ accountUid: uid, username: 'owner', request, assertOpen() {} });
    await expect(twin.ask(question)).rejects.toThrow('Connection ended');
    expect(request).toHaveBeenCalledTimes(1);
    expect(ownerTwinReadiness(null)).toEqual({ status: 'profile-required', requires: ['receiz:twin.execute', 'business', 'usage-credits'], runtime: 'existing-owner-twin', availability: 'unchecked' });
    expect(ownerTwinReadiness('owner').availability).toBe('unchecked');
  });
});

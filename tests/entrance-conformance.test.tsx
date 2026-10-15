// @vitest-environment happy-dom
import { StrictMode, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import manifest from 'virtual:receiz-receiver-build';
import profile from '../institution/receiver-profile.json';
import type { CheckId, CheckResult, ReferenceReport } from '../src/conformance/reference';
import { Entrance } from '../src/features/identity/Entrance';

const reference = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('../src/receiz/identity-lock', () => ({ inspectIdentityLock: vi.fn() }));
vi.mock('../src/conformance/reference', () => ({
  runBrowserChecks: reference.run,
  checks: [
    { id: 'release', name: 'Pinned release & registry' },
    { id: 'integrity', name: 'Verifier build integrity' },
    { id: 'source', name: 'Carried note required' },
    { id: 'custody', name: 'Opaque custody handles' },
    { id: 'transport', name: 'Bounded transport' },
    { id: 'temporal', name: 'KaiSigil temporal authority' },
    { id: 'edges', name: 'Sender & receiver inspection' },
  ],
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const checkIds: CheckId[] = ['release', 'integrity', 'source', 'custody', 'transport', 'temporal', 'edges'];
const completedCheck = (id: CheckId): CheckResult => ({ id, passed: true, durationMs: 1, evidence: {} });
function report(overrides: Partial<ReferenceReport> = {}): ReferenceReport {
  return {
    schema: 'receiz.bank.browser-reference-checks.v1',
    receizVersion: profile.receizVersion,
    registryDigest: profile.registryDigest,
    verifierModuleSha256: manifest.moduleSha256,
    startedAt: '2026-10-15T12:00:00.000Z',
    completedAt: '2026-10-15T12:00:01.000Z',
    checks: checkIds.map(completedCheck),
    localChecksPassed: true,
    institutionConformance: 'not-assessed',
    creditAuthorized: false,
    financialActionsPerformed: 0,
    timestampsAreAuthority: false,
    ...overrides,
  };
}

let roots: Root[], hosts: HTMLElement[], frames: Map<number, FrameRequestCallback>, idle: Map<number, IdleRequestCallback>, nextId: number;
beforeEach(() => {
  localStorage.clear();
  roots = []; hosts = []; frames = new Map(); idle = new Map(); nextId = 0;
  reference.run.mockReset().mockResolvedValue(report());
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++nextId, callback); return nextId; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id); });
  vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => { idle.set(++nextId, callback); return nextId; });
  vi.stubGlobal('cancelIdleCallback', (id: number) => { idle.delete(id); });
});
afterEach(() => {
  act(() => roots.forEach(root => root.unmount()));
  hosts.forEach(host => host.remove());
  vi.unstubAllGlobals();
});

function renderEntrance(strict = false) {
  const host = document.createElement('div'), root = createRoot(host);
  document.body.append(host); hosts.push(host); roots.push(root);
  const entrance = <Entrance opening={false} busy={false} error={null} onCreate={vi.fn()} onImport={vi.fn()} />;
  act(() => root.render(strict ? <StrictMode>{entrance}</StrictMode> : entrance));
  return { host, root, trigger: () => host.querySelector<HTMLButtonElement>('button[aria-controls]')! };
}
async function runScheduledChecks() {
  await act(async () => {
    for (const [id, callback] of frames) { frames.delete(id); callback(performance.now()); }
    for (const [id, callback] of idle) { idle.delete(id); callback({ didTimeout: false, timeRemaining: () => 50 }); }
  });
}
async function click(button: HTMLButtonElement) { await act(async () => button.click()); }

it('paints the recorded pinned pass before scheduling current checks without opening the panel', async () => {
  const { host, trigger } = renderEntrance();
  expect(reference.run).not.toHaveBeenCalled();
  expect(trigger()).not.toBeNull();
  expect(trigger().dataset.state).toBe('passed');
  expect(trigger().getAttribute('aria-expanded')).toBe('false');
  expect(host.querySelector('[role=dialog]')).toBeNull();
  expect(trigger().querySelector('svg')?.getAttribute('width')).toBe('19');

  await runScheduledChecks();

  expect(reference.run).toHaveBeenCalledTimes(1);
  expect(trigger().dataset.state).toBe('passed');
  expect(trigger().getAttribute('aria-expanded')).toBe('false');
  expect(host.querySelector('[role=dialog]')).toBeNull();
  await click(trigger());
  const popup = host.querySelector('[role=dialog]')!;
  expect(popup.id).toBe(trigger().getAttribute('aria-controls'));
  expect(trigger().getAttribute('aria-expanded')).toBe('true');
  expect(popup.textContent).toContain('7 of 7 passed');
  expect(popup.textContent).toContain('No private data');
  expect(popup.querySelector('a')?.getAttribute('href')).toBe('/conformance/');
});

it('keeps the last completed result visible through background progress', async () => {
  let finish!: (value: ReferenceReport) => void;
  let onResult!: (value: CheckResult) => void;
  reference.run.mockImplementation((onStart: (id: CheckId) => void, result: typeof onResult) => {
    onResult = result; onStart('release');
    return new Promise(resolve => { finish = resolve; });
  });
  const { host, trigger } = renderEntrance();
  await runScheduledChecks();
  expect(trigger().dataset.state).toBe('passed');
  await click(trigger());
  expect(host.textContent).toContain('Pinned release & registry');
  act(() => onResult(completedCheck('release')));
  expect(host.textContent).toContain('1 of 7 complete');
  expect(trigger().dataset.state).toBe('passed');
  await click(trigger());
  await click(trigger());
  expect(reference.run).toHaveBeenCalledTimes(1);
  await act(async () => finish(report()));
  expect(trigger().dataset.state).toBe('passed');
  await click(trigger());
  await click(trigger());
  expect(reference.run).toHaveBeenCalledTimes(1);
});

it.each([
  ['one failed check', () => report({ checks: checkIds.map(id => ({ ...completedCheck(id), passed: id !== 'integrity', ...(id === 'integrity' ? { error: 'VERIFIER_BUILD_DIGEST_MISMATCH' } : {}) })) })],
  ['an incomplete result', () => report({ checks: [] })],
  ['a duplicate check', () => report({ checks: checkIds.map(() => completedCheck('release')) })],
  ['a false summary', () => report({ localChecksPassed: false })],
  ['a different release', () => report({ receizVersion: '128.0.0' })],
  ['a different registry', () => report({ registryDigest: '0'.repeat(64) })],
  ['a different verifier build', () => report({ verifierModuleSha256: '0'.repeat(64) })],
  ['credit authority', () => report({ creditAuthorized: true } as unknown as Partial<ReferenceReport>)],
  ['financial activity', () => report({ financialActionsPerformed: 1 } as unknown as Partial<ReferenceReport>)],
  ['institution certification', () => report({ institutionConformance: 'qualified' } as unknown as Partial<ReferenceReport>)],
])('refuses green for %s', async (_reason, makeReport) => {
  reference.run.mockResolvedValue(makeReport());
  const { host, trigger } = renderEntrance();
  await runScheduledChecks();
  expect(trigger().dataset.state).toBe('refused');
  await click(trigger());
  expect(host.textContent).toContain('Did not qualify');
});

it('replaces the last pass on verifier errors and retains the error across fresh entrance mounts', async () => {
  const { host, trigger } = renderEntrance();
  await runScheduledChecks();
  await click(trigger());
  let reject!: (error: Error) => void;
  reference.run.mockImplementationOnce(() => new Promise((_, no) => { reject = no; }));
  await click([...host.querySelectorAll('button')].find(button => button.textContent === 'Recheck')!);
  expect(trigger().dataset.state).toBe('passed');
  await act(async () => reject(Error('VERIFIER_RESOURCE_UNAVAILABLE')));
  expect(trigger().dataset.state).toBe('error');
  expect(host.textContent).toContain('Checks unavailable');
  expect(host.textContent).toContain('VERIFIER_RESOURCE_UNAVAILABLE');
  const next = renderEntrance();
  expect(next.trigger().dataset.state).toBe('error');
  expect(next.host.querySelector('[role=dialog]')).toBeNull();
  await click([...host.querySelectorAll('button')].find(button => button.textContent === 'Try again')!);
  expect(trigger().dataset.state).toBe('passed');
});

it('closes on Escape and close-button activation, restoring focus only from inside the popup', async () => {
  const { host, trigger } = renderEntrance();
  await click(trigger());
  const close = host.querySelector<HTMLButtonElement>('button[aria-label="Close conformance status"]')!;
  expect(document.activeElement).toBe(close);
  act(() => close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
  expect(host.querySelector('[role=dialog]')).toBeNull();
  expect(document.activeElement).toBe(trigger());
  await click(trigger());
  await click(host.querySelector<HTMLButtonElement>('button[aria-label="Close conformance status"]')!);
  expect(document.activeElement).toBe(trigger());
  await click(trigger());
  const outside = host.querySelector<HTMLButtonElement>('.primary-button')!;
  act(() => { outside.focus(); outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  expect(host.querySelector('[role=dialog]')).toBeNull();
  expect(document.activeElement).toBe(outside);
});

it('schedules one automatic check in StrictMode and cancels work when unmounted before idle', async () => {
  const first = renderEntrance(true);
  await runScheduledChecks();
  expect(reference.run).toHaveBeenCalledTimes(1);
  expect(first.trigger().dataset.state).toBe('passed');
  const second = renderEntrance(true);
  expect(second.trigger().dataset.state).toBe('passed');
  act(() => second.root.unmount()); roots = roots.filter(root => root !== second.root);
  await runScheduledChecks();
  expect(reference.run).toHaveBeenCalledTimes(1);
});

it('paints a saved failure on the next visit and changes it only when a fresh run completes', async () => {
  reference.run.mockResolvedValueOnce(report({ checks: checkIds.map(id => ({ ...completedCheck(id), passed: id !== 'integrity', ...(id === 'integrity' ? { error: 'VERIFIER_BUILD_DIGEST_MISMATCH' } : {}) })), localChecksPassed: false }));
  const first = renderEntrance();
  await runScheduledChecks();
  expect(first.trigger().dataset.state).toBe('refused');
  act(() => first.root.unmount()); roots = roots.filter(root => root !== first.root);
  const next = renderEntrance();
  expect(next.trigger().dataset.state).toBe('refused');
  expect(next.host.querySelector('[role=dialog]')).toBeNull();
  await runScheduledChecks();
  expect(next.trigger().dataset.state).toBe('passed');
});

it('discards a saved result bound to another verifier build', async () => {
  reference.run.mockRejectedValueOnce(Error('VERIFIER_RESOURCE_UNAVAILABLE'));
  renderEntrance(); await runScheduledChecks();
  const key = localStorage.key(0)!;
  expect(key).toBeTruthy();
  localStorage.setItem(key, localStorage.getItem(key)!.replace(manifest.moduleSha256, '0'.repeat(64)));
  const next = renderEntrance();
  expect(next.trigger().dataset.state).toBe('passed');
});

it('can paint the recorded result when device storage is unavailable', () => {
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('Storage unavailable'); });
  try { expect(renderEntrance().trigger().dataset.state).toBe('passed'); }
  finally { read.mockRestore(); }
});

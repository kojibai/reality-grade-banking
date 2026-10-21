// @vitest-environment happy-dom
import { act, type ComponentProps } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Entrance } from '../src/features/identity/Entrance';

const inspect = vi.hoisted(() => vi.fn());
vi.mock('../src/receiz/identity-lock', () => ({ inspectIdentityLock: inspect }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root, host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  // Leave the unrelated conformance verifier idle, as on the first entrance paint.
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  inspect.mockReset();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function render(overrides: Partial<ComponentProps<typeof Entrance>> = {}) {
  const props = { opening: false, busy: false, error: null, onCreate: vi.fn().mockResolvedValue(undefined), onImport: vi.fn().mockResolvedValue(undefined), ...overrides };
  act(() => root.render(<Entrance {...props} />));
  return props;
}
function button(label: string) {
  return [...host.querySelectorAll('button')].find(candidate => candidate.textContent?.trim() === label)!;
}

it('reports completed entry checkpoints without presenting time or byte percentages', () => {
  render({ opening: true, busy: true });
  const status = host.querySelector('[role=status]')!;
  expect(status.getAttribute('aria-live')).toBe('polite');
  expect(status.getAttribute('aria-atomic')).toBe('true');
  expect(status.textContent).toContain('Opening your account');
  expect(status.textContent).toContain('Preparing your identity');
  expect(host.querySelector('.account-opening svg[aria-hidden=true]')).not.toBeNull();
  const progress = host.querySelector('[role=progressbar]')!;
  expect(progress.getAttribute('aria-label')).toBe('Account opening checkpoints');
  expect(progress.getAttribute('aria-valuemin')).toBe('0');
  expect(progress.getAttribute('aria-valuemax')).toBe('2');
  expect(progress.getAttribute('aria-valuenow')).toBe('0');
  expect(progress.getAttribute('aria-valuetext')).toContain('Preparing and verifying your identity');
  expect(status.textContent).not.toMatch(/\d+%|verified|complete|ready to use/i);

  render({ opening: true, busy: true, openingStage: 'history' });
  expect(host.querySelectorAll('[role=status]')).toHaveLength(1);
  expect(host.querySelector('[role=status]')?.textContent).toContain('Loading your account history');
  expect(host.querySelector('[role=status]')?.textContent).not.toContain('Preparing your identity');
  expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('1');
  expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuetext')).toContain('Identity preparation finished');
  expect(host.querySelector('.account-opening-progress')?.getAttribute('aria-valuenow')).toBe('1');
});

it('marks both checkpoints complete only when the supplied account stage is ready', () => {
  render({ opening: true, busy: true, openingStage: 'ready' });
  expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('2');
  expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuetext')).toContain('Your account view is ready');
  render();
  expect(host.querySelector('[role=progressbar]')).toBeNull();
});

it('uses the opening state for busy entry and releases the controls immediately after an error', () => {
  render({ busy: true });
  expect(host.querySelector('.account-opening [role=status]')).not.toBeNull();
  expect(button('Enter').disabled).toBe(true);
  expect(button('Use existing account').disabled).toBe(true);

  const { onCreate } = render({ error: 'Your identity could not be opened. Try again.' });
  expect(host.querySelector('[role=status]')).toBeNull();
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Try again');
  expect(button('Enter').disabled).toBe(false);
  expect(button('Use existing account').disabled).toBe(false);
  act(() => button('Enter').click());
  expect(onCreate).toHaveBeenCalledExactlyOnceWith(true);
});

it('describes file inspection truthfully and switches directly to the legacy phrase form', async () => {
  let finish!: (value: { needsPhrase: boolean }) => void;
  inspect.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const { onCreate, onImport } = render();
  const input = host.querySelector('input[type=file]')!;
  Object.defineProperty(input, 'files', { value: [new File(['fixture'], 'legacy.receiz')] });
  act(() => input.dispatchEvent(new Event('change', { bubbles: true })));

  expect(host.querySelectorAll('[role=status]')).toHaveLength(1);
  expect(host.querySelector('.account-opening [role=status]')?.textContent).toContain('Reading your Identity Seal');
  expect(host.querySelector('[role=status]')?.textContent).not.toMatch(/verified|complete|account history/i);
  expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('0');
  expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuetext')).toContain('Reading the Identity Seal');
  expect(button('Enter').disabled).toBe(true);
  expect(button('Use existing account').disabled).toBe(true);
  act(() => button('Enter').click());
  expect(onCreate).not.toHaveBeenCalled();

  await act(async () => finish({ needsPhrase: true }));
  expect(host.querySelector('[role=status]')).toBeNull();
  expect(host.querySelector('input[type=password]')).not.toBeNull();
  expect(button('Unlock account').disabled).toBe(true);
  expect(button('Enter').disabled).toBe(false);
  expect(onImport).not.toHaveBeenCalled();
});

it('removes the opening surface as soon as entry returns to the landing state', () => {
  render({ opening: true, busy: true, openingStage: 'history' });
  expect(host.querySelector('.account-opening')).not.toBeNull();
  render();
  expect(host.querySelector('.account-opening')).toBeNull();
  expect(host.querySelector('h1')?.textContent?.trim()).toBeTruthy();
  expect(host.querySelector('.page-subtitle')?.textContent?.trim()).toBeTruthy();
  expect(host.querySelector('.entrance-conformance-trigger')).not.toBeNull();
  expect(button('Enter').disabled).toBe(false);
});

it('keeps the entrance artwork visible during cold restore and removes it immediately when restoration finishes', () => {
  render({ busy: true, openingStage: 'history' });
  expect(host.querySelector('.account-opening-screen')).not.toBeNull();
  expect(host.querySelector('.identity-entrance')?.hasAttribute('hidden')).toBe(true);
  expect(host.querySelector('.account-opening-portal')).not.toBeNull();
  expect(host.querySelector('.account-opening-brand, .account-opening-footnote')).toBeNull();
  expect(host.querySelector('.account-opening-status')?.classList.contains('sr-only')).toBe(true);
  render({ opening: true, openingStage: 'history' });
  expect(host.querySelector('.account-opening-screen[data-entry=resume] svg')).not.toBeNull();
  expect(host.querySelector('[role=status]')?.textContent).toContain('Restoring your saved account');
  expect(host.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')).toBe('1');
  expect(host.querySelector('.identity-entrance')?.hasAttribute('hidden')).toBe(true);
  render();
  expect(host.querySelector('.account-opening-screen')).toBeNull();
  expect(host.querySelector('.identity-entrance')?.hasAttribute('hidden')).toBe(false);
});

// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { Entrance } from '../src/features/identity/Entrance';
const inspect = vi.hoisted(() => vi.fn());
vi.mock('../src/receiz/identity-lock', () => ({ inspectIdentityLock: inspect }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => { inspect.mockReset(); });
it('opens an uploaded no-phrase ID immediately after inspection', async () => {
  inspect.mockResolvedValue({ needsPhrase: false });
  const host = document.createElement('div'), root = createRoot(host), onImport = vi.fn().mockResolvedValue(undefined), file = new File(['fixture'], 'id.receiz');
  try {
    act(() => root.render(<Entrance opening={false} busy={false} error={null} onCreate={vi.fn()} onImport={onImport} />));
    const input = host.querySelector('input[type=file]')!;
    Object.defineProperty(input, 'files', { value: [file] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(onImport).toHaveBeenCalledExactlyOnceWith(file, '', true);
    expect(host.textContent).not.toContain('Open my existing account');
  } finally { act(() => root.unmount()); }
});
it('waits for a legacy phrase, and never imports an unreadable file', async () => {
  inspect.mockResolvedValue({ needsPhrase: true });
  const host = document.createElement('div'), root = createRoot(host), onImport = vi.fn(), file = new File(['fixture'], 'legacy.receiz');
  try {
    act(() => root.render(<Entrance opening={false} busy={false} error={null} onCreate={vi.fn()} onImport={onImport} />));
    const input = host.querySelector('input[type=file]')!; Object.defineProperty(input, 'files', { value: [file], configurable: true });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(onImport).not.toHaveBeenCalled(); expect(host.querySelector('input[type=password]')).not.toBeNull();
    inspect.mockRejectedValue(new Error('bad')); Object.defineProperty(input, 'files', { value: [new File(['bad'], 'bad.receiz')] });
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(onImport).not.toHaveBeenCalled(); expect(host.textContent).toContain('could not be read');
  } finally { act(() => root.unmount()); }
});
it('keeps Enter disabled while an upload inspection is still pending', async () => {
  let finish!: (value: { needsPhrase: boolean }) => void;
  inspect.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const host = document.createElement('div'), root = createRoot(host), onCreate = vi.fn(), onImport = vi.fn().mockResolvedValue(undefined);
  try {
    act(() => root.render(<Entrance opening={false} busy={false} error={null} onCreate={onCreate} onImport={onImport} />));
    const input = host.querySelector('input[type=file]')!; Object.defineProperty(input, 'files', { value: [new File(['fixture'], 'id.receiz')] });
    act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
    const enter = [...host.querySelectorAll('button')].find(button => button.textContent?.startsWith('Enter'))!;
    expect(enter.disabled).toBe(true); act(() => enter.click()); expect(onCreate).not.toHaveBeenCalled();
    await act(async () => finish({ needsPhrase: false })); expect(onImport).toHaveBeenCalledTimes(1);
  } finally { act(() => root.unmount()); }
});

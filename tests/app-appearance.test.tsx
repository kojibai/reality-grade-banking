// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,test} from 'vitest';
import {AppearanceSettings} from '../src/features/account/AppearanceSettings';
import {APP_APPEARANCE_KEY, installAppAppearance} from '../src/core/app-appearance.mjs';

test('Identity appearance follows System, remembers overrides, and clears them when System is chosen',async()=>{
 const root=document.documentElement;
 const host=document.createElement('div');
 const view=createRoot(host);
 const meta=document.createElement('meta');
 meta.name='theme-color';
 document.head.append(meta);
 document.body.append(host);
 localStorage.removeItem(APP_APPEARANCE_KEY);
 installAppAppearance(window);
 try{
  await act(async()=>view.render(<AppearanceSettings/>));
  expect(host.querySelector('summary')?.textContent).toContain('System');
  const select=async(label:string)=>{
   const button=[...host.querySelectorAll('button')].find(button=>button.textContent===label)!;
   expect(button).toBeDefined();
   await act(async()=>button.click());
   expect(button.getAttribute('aria-pressed')).toBe('true');
  };
  await select('Dark');
  expect(root.dataset.bankAppearance).toBe('dark');
  expect(localStorage.getItem(APP_APPEARANCE_KEY)).toBe('dark');
  expect(meta.content).toBe('#131e2c');
  delete root.dataset.bankAppearance;
  installAppAppearance(window);
  expect(root.dataset.bankAppearance).toBe('dark');
  await select('Light');
  expect(root.dataset.bankAppearance).toBe('light');
  await select('System');
  expect(root.hasAttribute('data-bank-appearance')).toBe(false);
  expect(localStorage.getItem(APP_APPEARANCE_KEY)).toBeNull();
 }finally{
  await act(async()=>view.unmount());
  host.remove();
  meta.remove();
  localStorage.removeItem(APP_APPEARANCE_KEY);
  window.dispatchEvent(new StorageEvent('storage',{key:APP_APPEARANCE_KEY}));
 }
});

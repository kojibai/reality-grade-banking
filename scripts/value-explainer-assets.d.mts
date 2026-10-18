import type { Plugin } from 'vite';
export type ValueExplainerAssets = Readonly<{
  js: string;
  css: string;
  modules: readonly Readonly<{ filename: string; bytes: Uint8Array }>[];
  jsUrl: string;
  cssUrl: string;
}>;
export function buildValueExplainerAssets(): Promise<ValueExplainerAssets>;
export function writeValueExplainerAssets(directory?: string): Promise<ValueExplainerAssets>;
export function valueExplainerDevPlugin(): Plugin;

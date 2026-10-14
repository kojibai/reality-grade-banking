import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';
import { transpileModule, ModuleKind } from 'typescript';
import { expect, it } from 'vitest';
// Exact helper snapshots from the current read-only v129 host. These checks
// reproduce serialization mechanics and do not admit a live capability report.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/native-qualification-heads-v129.json', import.meta.url), 'utf8'));
function hostHelpers() {
  const module = { exports: {} as { exactHeads: (value: unknown, code: string, allowEmpty?: boolean) => Record<string, string>; sortedHeads: (value: Record<string, string>) => Record<string, string> } };
  const support = `function fail(code) { throw new TypeError(code); } function record(value,code) { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(code); return value; } function token(value,code) { if (typeof value !== 'string' || !/^[a-z0-9._:-]+$/.test(value)) fail(code); return value; } function digest(value,code) { if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) fail(code); return value; } function freeze(value) { return Object.freeze(value); }`;
  const code = transpileModule(`${support}\n${fixture.exactHeadsTypeScript}\n${fixture.sortedHeadsTypeScript}\nmodule.exports = { exactHeads, sortedHeads };`, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
  runInNewContext(code, { module, require: createRequire(import.meta.url), Object, TypeError }); return module.exports;
}
it('reproduces the host rejecting its own source-publication insertion order, then accepts the same heads after its existing sorter', () => {
  const { exactHeads, sortedHeads } = hostHelpers();
  const heads = Object.fromEntries(fixture.sourcePublicationAssignmentOrder.map((name: string, index: number) => [name, String(index + 1).repeat(64)]));
  expect(() => exactHeads(heads, 'V124_RUNTIME_QUALIFICATION_HEADS_INVALID', true)).toThrow('V124_RUNTIME_QUALIFICATION_HEADS_INVALID');
  const sorted = sortedHeads(heads);
  expect(Object.keys(sorted)).toEqual(['reducer', 'registry', 'runtime', 'source-publication']);
  expect(exactHeads(sorted, 'V124_RUNTIME_QUALIFICATION_HEADS_INVALID', true)).toEqual(heads);
});
it('the proposed sorter preserves empty/unavailable heads and the existing digest rejection', () => {
  const { exactHeads, sortedHeads } = hostHelpers();
  expect(exactHeads(sortedHeads({}), 'INVALID', true)).toEqual({});
  expect(() => exactHeads(sortedHeads({ registry: 'not-a-head' }), 'INVALID', true)).toThrow('INVALID');
});

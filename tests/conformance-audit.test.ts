import { existsSync, readFileSync } from 'node:fs';
import { expect, it, vi, afterEach } from 'vitest';
import profile from '../institution/receiver-profile.json';
import { loadNativeVerifier } from '../src/conformance/reference';

afterEach(() => vi.unstubAllGlobals());
it('includes same-origin preview authentication while rejecting unpinned verifier bytes', async () => {
  vi.stubGlobal('location', { origin: 'https://protected.example' });
  const fetcher = vi.fn(async (_url:unknown,_options?:RequestInit) => new Response('protected preview login, not a verifier'));
  vi.stubGlobal('fetch', fetcher);
  await expect(loadNativeVerifier()).rejects.toThrow('VERIFIER_BUILD_MISMATCH');
  expect(fetcher.mock.calls[0]?.[1]).toEqual({ credentials: 'same-origin' });
});

it('maps every receiving requirement and Note law to source, implementation, tests and live evidence', () => {
  const path = new URL('../src/conformance/coverage.json', import.meta.url);
  expect(existsSync(path), 'machine-readable coverage registry must exist').toBe(true);
  const coverage = JSON.parse(readFileSync(path, 'utf8'));
  expect(coverage.requirements.map((r: {id:string}) => r.id)).toEqual(profile.requiredEvidence);
  expect(coverage.noteLaws.map((r: {id:string}) => r.id)).toEqual(Array.from({length:14}, (_, i) => `NOTE-${String(i+1).padStart(2,'0')}`));
  expect(coverage.rails.map((r: {id:string}) => r.id)).toEqual(['reserve','settlement','composite']);
  for (const row of [...coverage.requirements, ...coverage.noteLaws, ...coverage.capabilities]) {
    expect(row.normative.length, row.id).toBeGreaterThan(0);
    expect(row.implementation.length, row.id).toBeGreaterThan(0);
    expect(row.tests.length, row.id).toBeGreaterThan(0);
    expect(row.requiredEvidence.length, row.id).toBeGreaterThan(0);
    for(const path of [...row.normative,...row.implementation,...row.tests]) expect(existsSync(new URL(`../${path.split('#')[0]}`, import.meta.url)), `${row.id}: ${path}`).toBe(true);
  }
});

it('executes genuine SDK math, state, ownership, asset authority and recovery vectors without network', async () => {
  const path = new URL('../src/conformance/suites.ts', import.meta.url);
  expect(existsSync(path), 'executable public-contract suites must exist').toBe(true);
  const fetcher = vi.fn(() => { throw Error('NETWORK_FORBIDDEN'); });
  vi.stubGlobal('fetch', fetcher);
  const { runInstitutionSuites } = await import('../src/conformance/suites');
  const reports = await runInstitutionSuites();
  expect(reports.map(report => report.id)).toEqual(['money','recovery','atomic','ownership','assets']);
  for(const report of reports) {
    expect(report.passed, JSON.stringify(report)).toBe(true);
    expect(report.checks.length).toBeGreaterThan(1);
    for(const check of report.checks) {
      expect(check.expected).toBeTruthy();
      expect(check.observed).toBeDefined();
      expect(check.passed).toBe(true);
    }
    expect(report.financialAuthority).toBe(false);
  }
  expect(fetcher).not.toHaveBeenCalled();
});

import { afterEach, expect, it, vi } from 'vitest';
import { buildKaiKlockResponseFromPulseSync, epochMsFromPulse, microPulsesSinceGenesis } from '../native/receiz/app/utils/kai_pulse';
import { projectKaiLocalTimeReference, projectKaiSunrise } from '../src/components/kai-klok-sunrise';
import { projectCanonicalKaiFace } from '../src/components/kai-klok-face';
const pulseFromUTC = (iso: string) => Number(microPulsesSinceGenesis(new Date(iso)) / 1_000_000n);
afterEach(() => vi.unstubAllEnvs());

it('anchors automatic Local to device civil midnight without claiming a location sunrise', () => {
  vi.stubEnv('TZ', 'America/New_York');
  expect(projectKaiLocalTimeReference(pulseFromUTC('2026-10-19T15:00:00Z'))).toEqual({ reference: 'local-time', anchorIso: '2026-10-19T04:00:00.000Z' });
  vi.stubEnv('TZ', 'Asia/Kolkata');
  expect(projectKaiLocalTimeReference(pulseFromUTC('2026-10-19T01:00:00Z'))).toEqual({ reference: 'local-time', anchorIso: '2026-10-18T18:30:00.000Z' });
});

it('uses the offset at local midnight across daylight-saving changes', () => {
  vi.stubEnv('TZ', 'America/New_York');
  expect(projectKaiLocalTimeReference(pulseFromUTC('2026-03-08T15:00:00Z')).anchorIso).toBe('2026-03-08T05:00:00.000Z');
  expect(projectKaiLocalTimeReference(pulseFromUTC('2026-11-01T15:00:00Z')).anchorIso).toBe('2026-11-01T04:00:00.000Z');
});

it('changes only the reference hand when moving from Local time to location sunrise', () => {
  vi.stubEnv('TZ', 'America/New_York');
  const pulse = pulseFromUTC('2026-10-19T15:00:00Z');
  const local = projectCanonicalKaiFace(pulse, projectKaiLocalTimeReference(pulse).anchorIso);
  const solar = projectCanonicalKaiFace(pulse, projectKaiSunrise(pulse, { latitude: 40.7128, longitude: -74.006 }).anchorIso);
  expect(local.rotationOverride).not.toBe(solar.rotationOverride);
  for (const key of ['kaiPulseEternal', 'eternalBeatIndex', 'eternalStepIndex', 'dayLabel', 'monthLabel', 'monthDay', 'harmonicDayPercent'] as const) expect(local[key]).toBe(solar[key]);
});

it('retains the native Greenwich anchor until a location is chosen', () => {
  const pulse = 14_717_707;
  const anchor = projectKaiSunrise(pulse);
  expect(anchor).toEqual({ reference: 'greenwich', anchorIso: buildKaiKlockResponseFromPulseSync(BigInt(pulse)).solar_day_start_iso });
  expect(projectKaiSunrise(pulse, { latitude: 51.4769, longitude: 0 }).anchorIso).toBe(anchor.anchorIso);
});

it('uses the location sunrise preceding the same native instant across opposite longitudes', () => {
  const pulse = pulseFromUTC('2026-10-19T06:00:00Z');
  const east = projectKaiSunrise(pulse, { latitude: 35.6762, longitude: 139.6503 });
  const west = projectKaiSunrise(pulse, { latitude: 40.7128, longitude: -74.006 });
  const instant = Number(epochMsFromPulse(BigInt(pulse)));
  expect(east.reference).toBe('local'); expect(west.reference).toBe('local');
  expect(east.anchorIso).not.toBe(west.anchorIso);
  for (const anchor of [east, west]) {
    expect(Date.parse(anchor.anchorIso)).toBeLessThanOrEqual(instant);
    expect(instant - Date.parse(anchor.anchorIso)).toBeLessThan(86_400_000);
  }
  expect(east.anchorIso.slice(0, 10)).toBe('2026-10-18');
  expect(west.anchorIso.slice(0, 10)).toBe('2026-10-18');
});

it('changes only the solar reference, leaving native eternal indices, calendar and pulse intact', () => {
  const pulse = 14_717_707, local = projectKaiSunrise(pulse, { latitude: 40.7128, longitude: -74.006 });
  const baseline = projectCanonicalKaiFace(pulse), chosen = projectCanonicalKaiFace(pulse, local.anchorIso);
  expect(chosen.canonical.solarAnchorIso).toBe(local.anchorIso);
  expect(chosen.rotationOverride).not.toBe(baseline.rotationOverride);
  for (const key of ['kaiPulseEternal', 'eternalBeatIndex', 'eternalStepIndex', 'dayLabel', 'monthLabel', 'monthDay', 'harmonicDayPercent', 'microCyclePercent'] as const) expect(chosen[key]).toBe(baseline[key]);
  expect(chosen.canonical.eternalBeatFraction).toBe(baseline.canonical.eternalBeatFraction);
  expect(chosen.canonical.eternalStepFraction).toBe(baseline.canonical.eternalStepFraction);
});

it('identifies unavailable polar sunrise and invalid locations without fabricating a local anchor', () => {
  const summer = pulseFromUTC('2026-06-21T12:00:00Z');
  expect(projectKaiSunrise(summer, { latitude: 89, longitude: 0 })).toMatchObject({ reference: 'greenwich', unavailable: true });
  expect(projectKaiSunrise(summer, { latitude: 95, longitude: 0 })).toMatchObject({ reference: 'greenwich', unavailable: true });
});

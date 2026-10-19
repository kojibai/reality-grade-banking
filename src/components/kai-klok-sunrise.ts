import { buildKaiKlockResponseFromPulseSync, epochMsFromPulse } from '../../native/receiz/app/utils/kai_pulse';

export interface KaiSunriseLocation { latitude: number; longitude: number }
export interface KaiSunriseReference { reference: 'local-time' | 'local' | 'greenwich'; anchorIso: string; unavailable?: boolean }

/** Civil midnight in the device timezone, including that date's DST offset.
 * This is an automatic local-time reference, never a claim about sunrise. */
export function projectKaiLocalTimeReference(pulse: number): KaiSunriseReference {
  const instant = new Date(Number(epochMsFromPulse(BigInt(pulse))));
  const midnight = new Date(instant.getFullYear(), instant.getMonth(), instant.getDate());
  return Number.isFinite(midnight.getTime())
    ? { reference: 'local-time', anchorIso: midnight.toISOString() }
    : projectKaiSunrise(pulse);
}

// Pure astronomical projection carried from native/receiz/app/utils/kai_pulse.ts
// (sunriseJulianForDate and its helpers), also present in the canonical /klok SDK.
// The source already accepts latitude/longitude; its Greenwich-only wrapper is
// private. No Kai epoch, pulse conversion, or state progression is defined here.
const DEG2RAD = Math.PI / 180;
const RAD2DAY = 1 / (2 * Math.PI);
const JULIAN_UNIX_EPOCH = 2440587.5;
function toJulianDay(msUTC: number): number { return msUTC / 86400000 + JULIAN_UNIX_EPOCH; }
function fromJulianDay(J: number): number { return (J - JULIAN_UNIX_EPOCH) * 86400000; }
function normalizeAngleDeg(a: number): number { const x = a % 360; return x < 0 ? x + 360 : x; }
function julianNoonApprox(J: number, lonDeg: number): number {
  const Lw = -lonDeg * DEG2RAD;
  const n = Math.round(J - 2451545.0009 - Lw * RAD2DAY);
  return 2451545.0009 + Lw * RAD2DAY + n;
}
function sunriseJulianForDate(y: number, m: number, d: number, latDeg: number, lonDeg: number): number | undefined {
  const J0 = toJulianDay(Date.UTC(y, m - 1, d));
  const Jnoon = julianNoonApprox(J0, lonDeg);
  const Mdeg = 357.5291 + 0.98560028 * (Jnoon - 2451545);
  const Mrad = Mdeg * DEG2RAD;
  const C = 1.9148 * Math.sin(Mrad) + 0.0200 * Math.sin(2 * Mrad) + 0.0003 * Math.sin(3 * Mrad);
  const lambda = normalizeAngleDeg(Mdeg + C + 180 + 102.9372) * DEG2RAD;
  const Jtransit = Jnoon + 0.0053 * Math.sin(Mrad) - 0.0069 * Math.sin(2 * lambda);
  const epsilon = 23.4397 * DEG2RAD;
  const delta = Math.asin(Math.sin(lambda) * Math.sin(epsilon));
  const phi = latDeg * DEG2RAD;
  const h0 = -0.833 * DEG2RAD;
  const cos_omega0 = (Math.sin(h0) - Math.sin(phi) * Math.sin(delta)) / (Math.cos(phi) * Math.cos(delta));
  // Source clamps this for Greenwich. At polar locations, reject a non-event
  // explicitly instead of representing the clamp as a real local sunrise.
  if (!Number.isFinite(cos_omega0) || cos_omega0 < -1 || cos_omega0 > 1) return;
  const omega0 = Math.acos(cos_omega0);
  return Jtransit - omega0 * RAD2DAY;
}

/** Last computed local sunrise at the same native Kai instant; no timezone guess. */
export function projectKaiSunrise(pulse: number, location?: KaiSunriseLocation): KaiSunriseReference {
  const fallback = (): KaiSunriseReference => ({ reference: 'greenwich', anchorIso: buildKaiKlockResponseFromPulseSync(BigInt(pulse)).solar_day_start_iso, ...(location ? { unavailable: true } : {}) });
  if (!location) return fallback();
  const { latitude, longitude } = location;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return fallback();
  const instant = Number(epochMsFromPulse(BigInt(pulse))), date = new Date(instant);
  let last = -Infinity;
  // Longitude can place a sunrise on an adjacent UTC date. Select by absolute
  // instant, never by a timezone offset or the device's civil date alone.
  for (let offset = -2; offset <= 2; offset++) {
    const J = sunriseJulianForDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate() + offset, latitude, longitude);
    if (J === undefined) continue;
    const candidate = Math.round(fromJulianDay(J));
    if (candidate <= instant && candidate > last) last = candidate;
  }
  if (!Number.isFinite(last) || instant - last > 30 * 60 * 60 * 1000) return fallback();
  return { reference: 'local', anchorIso: new Date(last).toISOString() };
}

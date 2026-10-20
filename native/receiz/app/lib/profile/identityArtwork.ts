import {
  PULSES_STEP,
  buildKaiKlockResponseFromPulseSync,
  latticeFromMicroPulses,
  momentFromPulse,
  normalizePercentIntoStep,
  toDisplayBeatStep,
} from "@/app/utils/kai_pulse";
import {
  CENTER,
  CHAKRAS,
  PHI,
  SPACE,
  TEAL,
  hsl,
  lissajousPath,
  polygonPath,
  stabilizeSvgFloat,
  stabilizeSvgNumber,
} from "@/app/components/KaiSigil/constants";
import type { ChakraDayKey } from "@/app/components/KaiSigil/types";
import type { ProfileUsernameAppend } from "@/app/lib/profile/profileUsernameAppend";

export type ProfileIdentityArtworkVariant = "base" | "signed";

export type ProfileIdentityArtworkSvgSet = {
  avatarSvg: string;
  bannerSvg: string;
  creationAvatarSvg: string;
  creationBannerSvg: string;
  seedHash: string;
  baseSeedHash: string;
  pulse: string;
  chakraDay: ChakraDayKey;
};

export type ProfileIdentityArtworkDataUrls = {
  avatarUrl: string;
  bannerUrl: string;
  seedHash: string;
  baseSeedHash: string;
  pulse: string;
};

export type ProfileSealArtifactKind = "avatar" | "header";

export type ProfileSealArtifact = {
  kind: ProfileSealArtifactKind;
  title: string;
  claim: string;
  claimSha256Hex: string;
  filename: string;
  mime: "image/svg+xml";
  svg: string;
  dataUrl: string;
  sha256Hex: string;
  size: number;
  seedHash: string;
  baseSeedHash: string;
  pulse: string;
  chakraDay: ChakraDayKey;
};

const HEX64_RE = /^[0-9a-f]{64}$/;

function normalizeHex64(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return HEX64_RE.test(raw) ? raw : null;
}

function positiveKaiMicroPulse(value: unknown): bigint | null {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!/^\d+$/u.test(normalized)) return null;
  const microPulse = BigInt(normalized);
  return microPulse > 0n ? microPulse : null;
}

function sha256Hex(value: string): string {
  function rotr(n: number, x: number) {
    return (x >>> n) | (x << (32 - n));
  }
  function ch(x: number, y: number, z: number) {
    return (x & y) ^ (~x & z);
  }
  function maj(x: number, y: number, z: number) {
    return (x & y) ^ (x & z) ^ (y & z);
  }
  function s0(x: number) {
    return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3);
  }
  function s1(x: number) {
    return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10);
  }
  function S0(x: number) {
    return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x);
  }
  function S1(x: number) {
    return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x);
  }

  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const enc = new TextEncoder().encode(value);
  const inputLength = enc.length;
  const withOne = inputLength + 1;
  const padLength = withOne % 64 <= 56 ? 56 - (withOne % 64) : 56 + 64 - (withOne % 64);
  const total = withOne + padLength + 8;
  const bytes = new Uint8Array(total);
  bytes.set(enc);
  bytes[inputLength] = 0x80;
  const bitLength = inputLength * 8;
  for (let i = 0; i < 8; i += 1) bytes[total - 1 - i] = Math.floor(bitLength / 2 ** (i * 8)) & 0xff;

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t += 1) {
      const j = i + t * 4;
      w[t] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    }
    for (let t = 16; t < 64; t += 1) w[t] = (s1(w[t - 2]) + w[t - 7] + s0(w[t - 15]) + w[t - 16]) >>> 0;

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (let t = 0; t < 64; t += 1) {
      const t1 = (h + S1(e) + ch(e, f, g) + K[t] + w[t]) >>> 0;
      const t2 = (S0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  const hx = (x: number) => x.toString(16).padStart(8, "0");
  return hx(h0) + hx(h1) + hx(h2) + hx(h3) + hx(h4) + hx(h5) + hx(h6) + hx(h7);
}

function clampHue(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = clampHue(hue) / 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const hueToRgb = (p: number, q: number, tRaw: number) => {
    let t = tRaw;
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return `#${[hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)]
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function byteAt(seedHash: string, index: number): number {
  const offset = (index * 2) % seedHash.length;
  const parsed = Number.parseInt(seedHash.slice(offset, offset + 2), 16);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uint32At(seedHash: string, index: number): number {
  const offset = (index * 8) % seedHash.length;
  const parsed = Number.parseInt(seedHash.slice(offset, offset + 8), 16);
  return Number.isFinite(parsed) ? parsed >>> 0 : 0;
}

function hashToUint32(value: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | state)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deriveKaiSigilAnimationTiming(seed: number): { durMs: number; offMs: number } {
  const next = mulberry32(seed);
  const durMs = 5000 + Math.floor(next() * 800) + Math.floor((seed % 436) / 2);
  const offMs = Math.floor(next() * durMs);
  return { durMs, offMs };
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayReceizId(value: string): string {
  const clean = value
    .trim()
    .replace(/^receiz_device_/i, "")
    .replace(/^receiz_/i, "")
    .replace(/@(id|local|passkey)\.receiz\.local$/i, "");
  if (!clean) return "UNKNOWN";
  if (clean.length <= 36) return clean;
  return `${clean.slice(0, 20)}...${clean.slice(-10)}`;
}

function hashBands(seedHash: string): string {
  return [0, 8, 16, 24].map((offset) => seedHash.slice(offset, offset + 8).toUpperCase()).join(" ");
}

function kaiLatticeTriplet(state: StaticKaiSigilState): string {
  const { beat1, step1 } = toDisplayBeatStep(state.beat, state.stepIndex);
  const pulseInStep = Math.max(1, Math.min(PULSES_STEP, Math.floor(state.visualClamped * PULSES_STEP) + 1));
  return `${String(beat1).padStart(2, "0")}:${String(step1).padStart(2, "0")}:${String(pulseInStep).padStart(2, "0")}`;
}

const CHAKRA_KAI_COLORS: Record<ChakraDayKey, string> = {
  Root: "#ff0024",
  Sacral: "#ff6f00",
  "Solar Plexus": "#ffd600",
  Heart: "#00c853",
  Throat: "#5ecbff",
  "Third Eye": "#6e8cff",
  Crown: "#c186ff",
};

const ARK_COMPLETION_HUES = [351, 26, 51, 143, 200, 276] as const;

function chakraKaiColor(chakraDay: ChakraDayKey): string {
  return CHAKRA_KAI_COLORS[chakraDay] ?? TEAL;
}

function kaiArkIndex(label: string): number {
  const normalized = label.trim().toLowerCase();
  if (/(ignition|ignite)/.test(normalized)) return 0;
  if (/(integration|integrate)/.test(normalized)) return 1;
  if (/(harmonization|harmonize|harmony)/.test(normalized)) return 2;
  if (/(reflection|reflektion|reflect|reflekt)/.test(normalized)) return 3;
  if (/(purification|purifikation|purify)/.test(normalized)) return 4;
  if (/dream/.test(normalized)) return 5;
  return 4;
}

function kaiArkHue(label: string): number {
  return ARK_COMPLETION_HUES[kaiArkIndex(label)] ?? 172;
}

function kaiArkLightness(label: string): number {
  if (kaiArkIndex(label) === 5) return 76;
  return kaiArkIndex(label) === 4 ? 70 : 62;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function arkCompletionHue(label: string, progress: number): number {
  const index = kaiArkIndex(label);
  const start = ARK_COMPLETION_HUES[index] ?? kaiArkHue(label);
  const end = ARK_COMPLETION_HUES[Math.min(index + 1, ARK_COMPLETION_HUES.length - 1)] ?? start;
  return clampHue(start + ((end - start + 360) % 360) * clampUnit(progress));
}

function arkProgressColor(label: string, state: StaticKaiSigilState): string {
  const beatInArk = ((state.beat % 6) + 6) % 6;
  return hslToHex(arkCompletionHue(label, (beatInArk + (state.stepIndex + 1) / 44) / 6), 98, kaiArkLightness(label));
}

function proofMomentColor(seedHash: string, state: StaticKaiSigilState): string {
  const hue = clampHue(state.hue + state.visualClamped * 36 + (byteAt(seedHash, 7) % 30) - 15);
  const light = 56 + (byteAt(seedHash, 31) % 9);
  return hslToHex(hue, 92, light);
}

function signedTrustBlue(seedHash: string, state: StaticKaiSigilState): string {
  const blueHue = clampHue(202 + state.visualClamped * 22 + (state.beat % 6) * 3 + ((byteAt(seedHash, 23) % 9) - 4));
  const light = 60 + (state.stepIndex % 8);
  return hslToHex(blueHue, 94, light);
}

function normalizeOptionalIso(value: string | null | undefined): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function displayChakraArcLabel(label: string): string {
  const raw = label.trim();
  const withoutArk = raw.replace(/\s+Ark$/i, "").trim();
  return withoutArk || raw || "Harmonization";
}

function utf8Size(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function bytesToBase64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    const third = bytes[index + 2] ?? 0;
    output += alphabet[first >> 2];
    output += alphabet[((first & 0x03) << 4) | ((second ?? 0) >> 4)];
    output += index + 1 < bytes.length ? alphabet[((second & 0x0f) << 2) | ((third ?? 0) >> 6)] : "=";
    output += index + 2 < bytes.length ? alphabet[third & 0x3f] : "=";
  }
  return output;
}

function artifactSlug(value: string): string {
  const clean = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return clean || "seal";
}

type SeedMaterial = {
  baseSeedHash: string;
  seedHash: string;
  pbiReceiptHash: string | null;
  pbiSignedAtIso: string | null;
  pbiSignedPulse: string | null;
  pbiSignedChakraDay: ChakraDayKey | null;
  pbiSignedChakraArc: string | null;
  pulse: string;
  chakraDay: ChakraDayKey;
  chakraArc: string;
  weekday: string;
  beat: number;
  stepIndex: number;
  compressedMoment: string;
  genesisReceizId: string;
  receizId: string;
  createdAtIso: string;
  usernameAppend: ProfileUsernameAppend | null;
};

function seedMaterial(args: {
  userId: string;
  createdAt: string;
  creationKaiMicroPulse: string;
  receizId?: string | null;
  genesisReceizId?: string | null;
  receizIdentityKeyId?: string | null;
  pbiReceiptHash?: string | null;
  pbiSignedAt?: string | null;
  pbiSignedKaiMicroPulse?: string | null;
  usernameAppend?: ProfileUsernameAppend | null;
}): SeedMaterial {
  const createdAtIso = new Date(args.createdAt).toISOString();
  const creationKaiMicroPulse = positiveKaiMicroPulse(args.creationKaiMicroPulse);
  if (!creationKaiMicroPulse) {
    throw new Error("profile_identity_creation_coordinate_invalid");
  }
  const creationKaiPulse = creationKaiMicroPulse / 1_000_000n;
  const kai = buildKaiKlockResponseFromPulseSync(creationKaiPulse);
  const kaiMoment = momentFromPulse(creationKaiPulse);
  const pulse = String(kaiMoment.pulse);
  const chakraDay = Object.prototype.hasOwnProperty.call(CHAKRAS, kaiMoment.chakraDay)
    ? (kaiMoment.chakraDay as ChakraDayKey)
    : "Throat";
  const chakraArc =
    typeof kai.chakraArc === "string" && kai.chakraArc.trim()
      ? kai.chakraArc.trim()
      : typeof kai.eternalChakraArc === "string" && kai.eternalChakraArc.trim()
        ? kai.eternalChakraArc.trim()
        : "Harmonization Ark";
  const genesisReceizId = (args.genesisReceizId ?? args.receizId ?? args.userId).trim();
  const baseMaterial = JSON.stringify({
    v: 2,
    scope: "receiz.profile.identity-art",
    receizId: genesisReceizId.toLowerCase(),
    userId: args.userId.trim().toLowerCase(),
    receizIdentityKeyId: normalizeHex64(args.receizIdentityKeyId) ?? null,
    createdAt: createdAtIso,
    pulse,
    chakraDay,
  });
  const baseSeedHash = sha256Hex(baseMaterial);
  const usernameAppend =
    args.usernameAppend?.originBaseSeedHash === baseSeedHash
      ? args.usernameAppend
      : null;
  const receizId = (usernameAppend?.normalizedUsername ?? genesisReceizId).trim();
  const pbiReceiptHash = normalizeHex64(args.pbiReceiptHash);
  const pbiSignedAtIso = pbiReceiptHash ? normalizeOptionalIso(args.pbiSignedAt) : null;
  // Current attestations carry the accepted signing append coordinate. Legacy
  // signed identity art reuses its already-carried creation coordinate; no
  // Chronos field is converted into Kai.
  const pbiSignedKaiMicroPulse = pbiReceiptHash
    ? positiveKaiMicroPulse(args.pbiSignedKaiMicroPulse) ?? creationKaiMicroPulse
    : null;
  const pbiSignedKaiPulse = pbiSignedKaiMicroPulse ? pbiSignedKaiMicroPulse / 1_000_000n : null;
  const pbiSignedKai = pbiSignedKaiPulse !== null ? buildKaiKlockResponseFromPulseSync(pbiSignedKaiPulse) : null;
  const pbiSignedKaiMoment = pbiSignedKaiPulse !== null ? momentFromPulse(pbiSignedKaiPulse) : null;
  const pbiSignedPulse = pbiSignedKaiMoment ? String(pbiSignedKaiMoment.pulse) : null;
  const pbiSignedChakraDay =
    pbiSignedKaiMoment && Object.prototype.hasOwnProperty.call(CHAKRAS, pbiSignedKaiMoment.chakraDay)
      ? (pbiSignedKaiMoment.chakraDay as ChakraDayKey)
      : null;
  const pbiSignedChakraArc =
    pbiSignedKai && typeof pbiSignedKai.chakraArc === "string" && pbiSignedKai.chakraArc.trim()
      ? pbiSignedKai.chakraArc.trim()
      : pbiSignedKai && typeof pbiSignedKai.eternalChakraArc === "string" && pbiSignedKai.eternalChakraArc.trim()
        ? pbiSignedKai.eternalChakraArc.trim()
        : null;
  const seedHash = pbiReceiptHash ? sha256Hex(`${baseSeedHash}:pbi:${pbiReceiptHash}`) : baseSeedHash;
  return {
    baseSeedHash,
    seedHash,
    pbiReceiptHash,
    pbiSignedAtIso,
    pbiSignedPulse,
    pbiSignedChakraDay,
    pbiSignedChakraArc,
    pulse,
    chakraDay,
    chakraArc,
    weekday: kaiMoment.weekday,
    beat: kaiMoment.beat,
    stepIndex: kaiMoment.stepIndex,
    compressedMoment: typeof kai.compressed_summary === "string" ? kai.compressed_summary : pulse,
    genesisReceizId,
    receizId,
    createdAtIso,
    usernameAppend,
  };
}

type StaticKaiSigilState = {
  pulseNumber: number;
  beat: number;
  stepIndex: number;
  visualClamped: number;
  chakraDay: ChakraDayKey;
  sides: number;
  hue: number;
  seed: number;
  baseColor: string;
  kaiPhaseColor: string;
  phaseColor: string;
  corePath: string;
  auraPath: string;
  rotation: number;
};

function buildStaticKaiSigilState(seed: SeedMaterial): StaticKaiSigilState {
  const pulseNumber = Number.parseInt(seed.pulse, 10);
  const safePulse = Number.isFinite(pulseNumber) ? Math.trunc(pulseNumber) : 0;
  const lattice = latticeFromMicroPulses(BigInt(safePulse) * 1_000_000n);
  const beat = lattice.beat;
  const stepIndex = lattice.stepIndex;
  const visualClamped = normalizePercentIntoStep(lattice.percentIntoStep);
  const { sides, hue } = CHAKRAS[seed.chakraDay];
  const a = (safePulse % 7) + 1;
  const b = (beat % 5) + 2;
  const delta = visualClamped * 2 * Math.PI;
  const rotation = (PHI ** 2 * Math.PI * (safePulse % 97)) % (2 * Math.PI);
  const light = 50 + 15 * Math.sin(visualClamped * 2 * Math.PI);
  const phaseShift = (Number.parseInt(seed.baseSeedHash.slice(-2), 16) % 12) * 2.5;
  const kaiPhaseColor = hsl(hue, 100, light);
  return {
    pulseNumber: safePulse,
    beat,
    stepIndex,
    visualClamped,
    chakraDay: seed.chakraDay,
    sides,
    hue,
    seed: hashToUint32(`${safePulse}|${beat}|${stepIndex}|${seed.chakraDay}`),
    baseColor: hsl((hue + 360 * 0.03 * visualClamped) % 360, 100, light),
    kaiPhaseColor,
    phaseColor: hsl(clampHue(hue + phaseShift), 100, light),
    corePath: polygonPath(sides, rotation),
    auraPath: lissajousPath(a, b, delta),
    rotation,
  };
}

function buildPbiSignedMomentState(seed: SeedMaterial, fallback: StaticKaiSigilState): StaticKaiSigilState {
  if (!seed.pbiReceiptHash || !seed.pbiSignedPulse || !seed.pbiSignedChakraDay) return fallback;
  return buildStaticKaiSigilState({
    ...seed,
    pulse: seed.pbiSignedPulse,
    chakraDay: seed.pbiSignedChakraDay,
    chakraArc: seed.pbiSignedChakraArc ?? seed.chakraArc,
  });
}

function renderDots(state: StaticKaiSigilState, dotR = 16): string {
  const dots: string[] = [];
  for (let i = 0; i < state.sides; i += 1) {
    const theta = (i / state.sides) * 2 * Math.PI + state.rotation;
    const r = SPACE * 0.38;
    dots.push(
      `<circle cx="${stabilizeSvgNumber(CENTER + r * Math.cos(theta))}" cy="${stabilizeSvgNumber(
        CENTER + r * Math.sin(theta),
      )}" r="${stabilizeSvgNumber(dotR)}" fill="${state.baseColor}" aria-hidden="true" pointer-events="none"/>`,
    );
  }
  return dots.join("");
}

function renderReceizBits(seedHash: string, signed: boolean, signedColor: string = TEAL): string {
  const bits: string[] = [];
  const fill = signed ? signedColor : TEAL;
  for (let i = 0; i < 42; i += 1) {
    const angle = (Math.PI * 2 * i) / 42 + (byteAt(seedHash, i + 4) / 255) * 0.08;
    const radius = 438 + ((byteAt(seedHash, i + 15) % 38) - 19);
    const length = 12 + (byteAt(seedHash, i + 29) % 30);
    const strokeWidth = byteAt(seedHash, i + 45) & 1 ? 4.2 : 2.2;
    bits.push(
      `<line x1="${stabilizeSvgNumber(CENTER + Math.cos(angle) * radius)}" y1="${stabilizeSvgNumber(
        CENTER + Math.sin(angle) * radius,
      )}" x2="${stabilizeSvgNumber(CENTER + Math.cos(angle) * (radius + length))}" y2="${stabilizeSvgNumber(
        CENTER + Math.sin(angle) * (radius + length),
      )}" stroke="${fill}" stroke-width="${stabilizeSvgNumber(strokeWidth)}" opacity="${signed ? "0.68" : "0.42"}" stroke-linecap="round"/>`,
    );
  }
  return bits.join("");
}

function polygonPoints(cx: number, cy: number, radius: number, sides: number, rotation: number): string {
  const count = Math.max(3, Math.trunc(sides));
  return Array.from({ length: count }, (_, i) => {
    const angle = rotation + (Math.PI * 2 * i) / count;
    return `${stabilizeSvgNumber(cx + Math.cos(angle) * radius)},${stabilizeSvgNumber(cy + Math.sin(angle) * radius)}`;
  }).join(" ");
}

function renderSignedWitnessGeometry(args: { uid: string; seed: SeedMaterial; state: StaticKaiSigilState }): string {
  const pbiHash = args.seed.pbiReceiptHash ?? args.seed.seedHash;
  const trustBlue = signedTrustBlue(pbiHash, args.state);
  const phiHue = clampHue(args.state.hue + byteAt(pbiHash, 5) + 360 / PHI);
  const phiColor = hslToHex(phiHue, 92, 64);
  const witnessColor = hslToHex(clampHue(phiHue + 137.5), 86, 58);
  const braidColor = hslToHex(clampHue(phiHue - 94), 84, 62);
  const ringRadius = 394 + (byteAt(pbiHash, 11) % 42);
  const innerRadius = ringRadius / PHI;
  const outerSides = 9 + (byteAt(pbiHash, 13) % 8);
  const innerSides = 5 + (byteAt(pbiHash, 17) % 7);
  const outerRotation = (byteAt(pbiHash, 23) / 255) * Math.PI * 2;
  const innerRotation = outerRotation / PHI + (byteAt(pbiHash, 25) / 255) * 0.4;
  const nodeCount = 8 + (byteAt(pbiHash, 19) % 8);
  const nodes = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / nodeCount + (byteAt(pbiHash, i + 27) / 255) * 0.18;
    const radial = innerRadius + ((byteAt(pbiHash, i + 45) % 56) - 28);
    const radius = 6 + (byteAt(pbiHash, i + 63) % 34) / 4;
    const fill = i % 3 === 0 ? trustBlue : i % 2 === 0 ? phiColor : witnessColor;
    const sides = 3 + (byteAt(pbiHash, i + 71) % 5);
    return `<polygon points="${polygonPoints(
      CENTER + Math.cos(angle) * radial,
      CENTER + Math.sin(angle) * radial,
      radius,
      sides,
      angle / PHI,
    )}" fill="${fill}" opacity="0.72" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1.2"/>`;
  }).join("");
  const spokes = Array.from({ length: nodeCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / nodeCount + (byteAt(pbiHash, i + 81) / 255) * 0.12;
    const r1 = innerRadius / PHI;
    const r2 = ringRadius;
    const stroke = i % 2 === 0 ? phiColor : braidColor;
    return `<line x1="${stabilizeSvgNumber(CENTER + Math.cos(angle) * r1)}" y1="${stabilizeSvgNumber(
      CENTER + Math.sin(angle) * r1,
    )}" x2="${stabilizeSvgNumber(CENTER + Math.cos(angle) * r2)}" y2="${stabilizeSvgNumber(
      CENTER + Math.sin(angle) * r2,
    )}" stroke="${stroke}" stroke-width="${stabilizeSvgNumber(2.4 + (i % 4) * 0.8)}" opacity="0.34" stroke-linecap="round"/>`;
  }).join("");
  const braid = Array.from({ length: 5 }, (_, i) => {
    const radius = innerRadius * (0.56 + i * 0.09);
    const dashA = 12 + (byteAt(pbiHash, i + 103) % 32);
    const dashB = 18 + (byteAt(pbiHash, i + 119) % 38);
    const rotate = (byteAt(pbiHash, i + 135) / 255) * 180;
    const stroke = i % 2 === 0 ? trustBlue : i % 3 === 0 ? witnessColor : braidColor;
    return `<polygon points="${polygonPoints(CENTER, CENTER, radius * (1 + i * 0.018), outerSides + i, (rotate * Math.PI) / 180)}" fill="none" stroke="${stroke}" stroke-width="${stabilizeSvgNumber(2.2 + i * 0.42)}" opacity="${i === 0 ? "0.52" : "0.38"}" stroke-dasharray="${dashA} ${dashB}" stroke-linejoin="round"/>`;
  }).join("");
  const chords = Array.from({ length: outerSides }, (_, i) => {
    const a = outerRotation + (Math.PI * 2 * i) / outerSides;
    const b = outerRotation + (Math.PI * 2 * ((i + 3 + (byteAt(pbiHash, i + 151) % 4)) % outerSides)) / outerSides;
    const stroke = i % 3 === 0 ? trustBlue : i % 2 === 0 ? witnessColor : braidColor;
    return `<path d="M${stabilizeSvgNumber(CENTER + Math.cos(a) * innerRadius)} ${stabilizeSvgNumber(CENTER + Math.sin(a) * innerRadius)} L${stabilizeSvgNumber(
      CENTER + Math.cos(b) * ringRadius,
    )} ${stabilizeSvgNumber(CENTER + Math.sin(b) * ringRadius)}" fill="none" stroke="${stroke}" stroke-width="${stabilizeSvgNumber(1.6 + (i % 4) * 0.5)}" opacity="0.3" stroke-linecap="round"/>`;
  }).join("");
  return `<g id="${args.uid}-signed-witness-geometry" data-stage="signed" pointer-events="none">
    <polygon points="${polygonPoints(CENTER, CENTER, ringRadius, outerSides, outerRotation)}" fill="none" stroke="${trustBlue}" stroke-width="11" opacity="0.66" stroke-linejoin="round"/>
    <polygon points="${polygonPoints(CENTER, CENTER, innerRadius, innerSides, innerRotation)}" fill="none" stroke="${phiColor}" stroke-width="4" opacity="0.5" stroke-dasharray="10 16" stroke-linejoin="round"/>
    ${spokes}
    ${chords}
    ${braid}
    ${nodes}
  </g>`;
}

function renderBannerSignedGeometry(seed: SeedMaterial, state: StaticKaiSigilState): string {
  const pbiHash = seed.pbiReceiptHash ?? seed.seedHash;
  const trustBlue = signedTrustBlue(pbiHash, state);
  const phiHue = clampHue(state.hue + byteAt(pbiHash, 7) + 360 / PHI);
  const phiColor = hslToHex(phiHue, 88, 62);
  const witnessColor = hslToHex(clampHue(phiHue + 137.5), 84, 58);
  const x = 616;
  const y = 428;
  const width = 610;
  const rails = Array.from({ length: 9 }, (_, i) => {
    const railWidth = 78 + (byteAt(pbiHash, i + 21) % 138);
    const railX = x + 12 + (i * width) / 11;
    const railY = y + 16 + (i % 3) * 9;
    const fill = i % 3 === 0 ? trustBlue : i % 2 === 0 ? phiColor : witnessColor;
    return `<rect x="${stabilizeSvgNumber(railX)}" y="${stabilizeSvgNumber(railY)}" width="${stabilizeSvgNumber(
      railWidth / PHI,
    )}" height="${stabilizeSvgNumber(4 + (byteAt(pbiHash, i + 45) % 4))}" rx="3" fill="${fill}" opacity="${i % 3 === 0 ? "0.7" : "0.42"}"/>`;
  }).join("");
  const facets = Array.from({ length: 8 }, (_, i) => {
    const cx = x + 28 + (byteAt(pbiHash, i + 73) % 560);
    const cy = y + 12 + (byteAt(pbiHash, i + 101) % 62);
    const radius = 5 + (byteAt(pbiHash, i + 129) % 38) / 5;
    const fill = i % 2 === 0 ? trustBlue : phiColor;
    const sides = 3 + (byteAt(pbiHash, i + 155) % 5);
    return `<polygon points="${polygonPoints(cx, cy, radius, sides, (byteAt(pbiHash, i + 171) / 255) * Math.PI * 2)}" fill="${fill}" opacity="0.62" stroke="#ffffff" stroke-opacity="0.16" stroke-width="0.9"/>`;
  }).join("");
  const hashMesh = Array.from({ length: 7 }, (_, i) => {
    const ax = x + 24 + (byteAt(pbiHash, i + 187) % 180) + i * 52;
    const ay = y + 14 + (byteAt(pbiHash, i + 199) % 54);
    const bx = x + 70 + (byteAt(pbiHash, i + 211) % 178) + i * 50;
    const by = y + 18 + (byteAt(pbiHash, i + 223) % 52);
    const cx = x + 36 + (byteAt(pbiHash, i + 235) % 190) + i * 47;
    const cy = y + 20 + (byteAt(pbiHash, i + 247) % 50);
    const stroke = i % 3 === 0 ? trustBlue : i % 2 === 0 ? phiColor : witnessColor;
    return `<path d="M${stabilizeSvgNumber(ax)} ${stabilizeSvgNumber(ay)} L${stabilizeSvgNumber(bx)} ${stabilizeSvgNumber(by)} L${stabilizeSvgNumber(cx)} ${stabilizeSvgNumber(cy)}" fill="none" stroke="${stroke}" stroke-width="${stabilizeSvgNumber(1.4 + (i % 3) * 0.5)}" opacity="0.34" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
  return `<g data-stage="signed-banner-geometry" pointer-events="none">
    <path d="M${x} ${y + 68} L${x + 94} ${y + 22} L${x + 208} ${y + 76} L${x + 318} ${y + 28} L${x + 456} ${y + 70} L${x + width} ${y + 34}" fill="none" stroke="${witnessColor}" stroke-width="2.6" opacity="0.36" stroke-linecap="round" stroke-linejoin="round"/>
    ${hashMesh}
    ${rails}
    ${facets}
  </g>`;
}

function renderReceizIdSealLayer(args: {
  idHash: string;
  seedHash: string;
  state: StaticKaiSigilState;
  signed: boolean;
  uid: string;
}): string {
  const { idHash, seedHash, state } = args;
  const trustBlue = signedTrustBlue(seedHash, state);
  const baseHue = clampHue(state.hue + (byteAt(idHash, 3) % 96) - 48);
  const idColor = hslToHex(baseHue, 88, args.signed ? 63 : 56);
  const secondaryColor = hslToHex(clampHue(baseHue + 126 + (byteAt(idHash, 11) % 42)), 78, args.signed ? 66 : 52);
  const tertiaryColor = hslToHex(clampHue(baseHue - 86 - (byteAt(idHash, 19) % 34)), 82, args.signed ? 62 : 48);
  const signedStroke = args.signed ? trustBlue : idColor;

  const perimeterRails = Array.from({ length: 14 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 14 + (byteAt(idHash, i + 16) / 255) * 0.05;
    const radial = 426 + (byteAt(idHash, i + 9) % 58);
    const tangent = angle + Math.PI / 2;
    const length = 24 + (byteAt(idHash, i + 25) % 54);
    const cx = CENTER + Math.cos(angle) * radial;
    const cy = CENTER + Math.sin(angle) * radial;
    const x1 = cx - Math.cos(tangent) * length;
    const y1 = cy - Math.sin(tangent) * length;
    const x2 = cx + Math.cos(tangent) * length;
    const y2 = cy + Math.sin(tangent) * length;
    const stroke = i % 3 === 0 ? signedStroke : i % 2 === 0 ? secondaryColor : tertiaryColor;
    return `<line x1="${stabilizeSvgNumber(x1)}" y1="${stabilizeSvgNumber(y1)}" x2="${stabilizeSvgNumber(x2)}" y2="${stabilizeSvgNumber(y2)}" stroke="${stroke}" stroke-width="${stabilizeSvgNumber(2.2 + (i % 3) * 0.65)}" opacity="${args.signed && i % 3 === 0 ? "0.5" : "0.3"}" stroke-linecap="round"/>`;
  }).join("");

  const shards = Array.from({ length: 18 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 18 + (byteAt(idHash, i + 41) / 255) * 0.16;
    const radial = 412 + (byteAt(idHash, i + 61) % 76);
    const x = CENTER + Math.cos(angle) * radial;
    const y = CENTER + Math.sin(angle) * radial;
    const sides = 3 + (byteAt(idHash, i + 79) % 4);
    const radius = 4 + (byteAt(idHash, i + 97) % 16);
    const rotation = (byteAt(idHash, i + 115) / 255) * Math.PI * 2;
    const points = Array.from({ length: sides }, (_, j) => {
      const theta = rotation + (j / sides) * Math.PI * 2;
      return `${stabilizeSvgNumber(x + Math.cos(theta) * radius)},${stabilizeSvgNumber(
        y + Math.sin(theta) * radius,
      )}`;
    }).join(" ");
    const fill = i % 4 === 0 ? signedStroke : i % 3 === 0 ? secondaryColor : tertiaryColor;
    return `<polygon points="${points}" fill="${fill}" opacity="${args.signed ? "0.18" : "0.13"}" stroke="${fill}" stroke-width="1.4" stroke-opacity="${args.signed ? "0.42" : "0.32"}"/>`;
  }).join("");

  const beadCount = 32;
  const beads = Array.from({ length: beadCount }, (_, i) => {
    const angle = (Math.PI * 2 * i) / beadCount;
    const radial = 404 + ((byteAt(seedHash, i + 121) % 74) - 24);
    const radius = 3.8 + (byteAt(idHash, i + 139) % 44) / 10;
    const fill = i % 5 === 0 && args.signed ? trustBlue : i % 2 === 0 ? idColor : secondaryColor;
    return `<circle cx="${stabilizeSvgNumber(CENTER + Math.cos(angle) * radial)}" cy="${stabilizeSvgNumber(
      CENTER + Math.sin(angle) * radial,
    )}" r="${stabilizeSvgNumber(radius)}" fill="${fill}" opacity="${args.signed ? "0.62" : "0.42"}"/>`;
  }).join("");

  const perimeterArcs = Array.from({ length: 8 }, (_, i) => {
    const start = (Math.PI * 2 * i) / 8 + (byteAt(idHash, i + 177) / 255) * 0.14;
    const end = start + 0.24 + (byteAt(idHash, i + 188) % 42) / 255;
    const radius = 426 + (byteAt(idHash, i + 199) % 54);
    const controlRadius = radius + 22 + (byteAt(idHash, i + 210) % 28);
    const x1 = CENTER + Math.cos(start) * radius;
    const y1 = CENTER + Math.sin(start) * radius;
    const x2 = CENTER + Math.cos(end) * radius;
    const y2 = CENTER + Math.sin(end) * radius;
    const controlAngle = (start + end) / 2;
    const mx = CENTER + Math.cos(controlAngle) * controlRadius;
    const my = CENTER + Math.sin(controlAngle) * controlRadius;
    return `<path d="M${stabilizeSvgNumber(x1)} ${stabilizeSvgNumber(y1)} Q${stabilizeSvgNumber(mx)} ${stabilizeSvgNumber(my)} ${stabilizeSvgNumber(x2)} ${stabilizeSvgNumber(y2)}" fill="none" stroke="${i % 2 === 0 ? idColor : secondaryColor}" stroke-width="${stabilizeSvgNumber(2.1 + (i % 4) * 0.55)}" opacity="${args.signed ? "0.42" : "0.28"}" stroke-linecap="round"/>`;
  }).join("");

  return `<g id="${args.uid}-receiz-id-seal-art" data-layer="receiz-id-art" pointer-events="none">
    ${perimeterArcs}
    ${perimeterRails}
    ${shards}
    ${beads}
  </g>`;
}

function ringText(args: {
  id: string;
  radius: number;
  text: string;
  fill: string;
  fontSize: number;
  opacity: number;
}): string {
  const path = `M ${CENTER} ${CENTER - args.radius} a ${args.radius} ${args.radius} 0 1 1 0 ${args.radius * 2} a ${args.radius} ${args.radius} 0 1 1 0 -${args.radius * 2}`;
  return `<path id="${args.id}" d="${path}" fill="none"/>
    <text font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="${args.fontSize}" letter-spacing="1.2" fill="${args.fill}" opacity="${args.opacity}" text-anchor="middle" dominant-baseline="middle" paint-order="stroke" stroke="#001014" stroke-width="${Math.max(0.7, args.fontSize * 0.08)}" stroke-opacity="0.55">
      <textPath href="#${args.id}" startOffset="50%">${escapeText(args.text)}</textPath>
    </text>`;
}

function staticKaiSigilSvg(args: {
  seed: SeedMaterial;
  state: StaticKaiSigilState;
  signed: boolean;
  uid: string;
  rootAttrs: string;
  showLabels: boolean;
  motion: boolean;
  renderSize: number;
}): string {
  const { seed, state } = args;
  const glow = `${args.uid}-glow`;
  const halo = `${args.uid}-halo`;
  const mask = `${args.uid}-mask`;
  const decorationMask = `${args.uid}-decoration-mask`;
  const net = `${args.uid}-net`;
  const warp = `${args.uid}-warp`;
  const aura = `${args.uid}-aura`;
  const petal = `${args.uid}-zk-petal`;
  const zkGrad = `${args.uid}-zk-grad`;
  const outerRing = `${args.uid}-outer-ring`;
  const innerRing = `${args.uid}-inner-ring`;
  const pbiSignedState = args.signed ? buildPbiSignedMomentState(seed, state) : state;
  const strokeCore = Math.max(1.4, args.renderSize * 0.009);
  const dotR = Math.max(2.5, args.renderSize * 0.016);
  const auraTealStroke = Math.max(2, strokeCore * 1.05);
  const auraBaseStroke = Math.max(1.2, strokeCore * 0.8);
  const zkGlowStroke = Math.max(1.2, args.renderSize * 0.009);
  const zkPetalStroke = Math.max(1, args.renderSize * 0.008);
  const zkRingStroke = Math.max(0.9, args.renderSize * 0.007);
  const arcColor = arkProgressColor(seed.chakraArc, state);
  const pbiArcColor = args.signed ? arkProgressColor(seed.pbiSignedChakraArc ?? seed.chakraArc, pbiSignedState) : arcColor;
  const chakraArcLabel = displayChakraArcLabel(seed.chakraArc);
  const pbiChakraArcLabel = displayChakraArcLabel(seed.pbiSignedChakraArc ?? seed.chakraArc);
  const chakraDayColor = chakraKaiColor(seed.chakraDay);
  const weekdayColor = chakraDayColor;
  const beatColor = arcColor;
  const stepColor = arcColor;
  const signedTrustColor = args.signed ? signedTrustBlue(seed.seedHash, pbiSignedState) : state.phaseColor;
  const surfaceState = args.signed ? pbiSignedState : state;
  const proofChromeColor = proofMomentColor(args.signed ? seed.seedHash : seed.baseSeedHash, surfaceState);
  const receizId = displayReceizId(seed.receizId).toUpperCase();
  const latticeTriplet = kaiLatticeTriplet(state);
  const receizArtHash = sha256Hex(
    JSON.stringify({
      v: 1,
      scope: "receiz.profile.seal.receiz-id-art",
      receizId: seed.receizId.trim().toLowerCase(),
      baseSeedHash: seed.baseSeedHash,
    }),
  );
  const outerText = `RECEIZ=${receizId} | KAI=${seed.pulse} | ${seed.weekday}/${seed.chakraDay}/${chakraArcLabel} | ${latticeTriplet}`;
  const innerText = `BIRTH SEED ${seed.baseSeedHash.slice(0, 32).toUpperCase()}`;
  const signedLayer = args.signed
    ? renderSignedWitnessGeometry({ uid: args.uid, seed, state: pbiSignedState })
    : `<g id="${args.uid}-birth-layer" data-stage="base" pointer-events="none">
        <path d="M362 204 C438 162 562 162 638 204" fill="none" stroke="${TEAL}" stroke-width="7" stroke-linecap="round" opacity="0.34"/>
      </g>`;

  const { durMs, offMs } = deriveKaiSigilAnimationTiming(state.seed);
  const motionAttrs = args.motion ? ` style="--dur:${durMs}ms;--off:${offMs}ms"` : "";
  const kaiMomentColors = [
    TEAL,
    weekdayColor,
    chakraDayColor,
    beatColor,
    stepColor,
    arcColor,
    pbiArcColor,
    proofChromeColor,
    signedTrustColor,
  ] as const;
  const surfaceStroke = args.signed ? signedTrustColor : state.phaseColor;
  const chromeStroke = args.signed ? signedTrustColor : state.baseColor;
  const surfaceTrace = Array.from({ length: 10 }, (_, i) => {
    const x = 138 + i * 78 + (byteAt(seed.seedHash, i + 17) % 34);
    const y = 104 + (byteAt(seed.baseSeedHash, i + 31) % 64);
    const width = 36 + (byteAt(seed.seedHash, i + 53) % 86);
    const stroke = kaiMomentColors[(i + byteAt(seed.seedHash, i + 61)) % kaiMomentColors.length];
    return `<rect x="${stabilizeSvgNumber(x)}" y="${stabilizeSvgNumber(y)}" width="${stabilizeSvgNumber(width)}" height="3.2" rx="1.6" fill="${stroke}" opacity="${args.signed && i % 3 === 0 ? "0.52" : "0.26"}"/>`;
  }).join("");
  const surfaceLedgerMarks = Array.from({ length: 18 }, (_, i) => {
    const side = i % 2 === 0 ? 78 : 922;
    const y = 154 + i * 38 + (byteAt(seed.baseSeedHash, i + 73) % 16);
    const length = 20 + (byteAt(seed.seedHash, i + 91) % 34);
    const x1 = i % 2 === 0 ? side : side - length;
    const x2 = i % 2 === 0 ? side + length : side;
    const stroke = kaiMomentColors[(i + byteAt(seed.baseSeedHash, i + 83)) % kaiMomentColors.length];
    return `<line x1="${stabilizeSvgNumber(x1)}" y1="${stabilizeSvgNumber(y)}" x2="${stabilizeSvgNumber(x2)}" y2="${stabilizeSvgNumber(y)}" stroke="${stroke}" stroke-width="${i % 5 === 0 ? "3" : "1.6"}" opacity="${args.signed && i % 5 === 0 ? "0.5" : "0.2"}" stroke-linecap="round"/>`;
  }).join("");
  const bottomHashRail = Array.from({ length: 16 }, (_, i) => {
    const x = 170 + i * 42;
    const height = 10 + (byteAt(seed.seedHash, i + 141) % 30);
    const fill = kaiMomentColors[(i + byteAt(seed.seedHash, i + 149)) % kaiMomentColors.length];
    return `<rect x="${x}" y="${880 - height}" width="${stabilizeSvgNumber(10 + (byteAt(seed.baseSeedHash, i + 157) % 14))}" height="${height}" rx="4" fill="${fill}" opacity="${args.signed && i % 4 === 0 ? "0.58" : "0.3"}"/>`;
  }).join("");
  const surfaceArkMarks = Array.from({ length: 6 }, (_, i) => {
    const width = 22 + (byteAt(seed.seedHash, i + 193) % 42);
    const x = 728 + i * 30 + (byteAt(seed.baseSeedHash, i + 211) % 8);
    const y = 132 + (byteAt(seed.seedHash, i + 227) % 32);
    return `<rect x="${stabilizeSvgNumber(x)}" y="${stabilizeSvgNumber(y)}" width="${stabilizeSvgNumber(width)}" height="4.4" rx="2.2" fill="${arcColor}" opacity="${args.signed ? "0.54" : "0.4"}"/>`;
  }).join("");
  const surfaceValueRails = Array.from({ length: 14 }, (_, i) => {
    const top = i < 7;
    const offset = 126 + (i % 7) * 104 + (byteAt(seed.baseSeedHash, i + 37) % 24);
    const length = 34 + (byteAt(seed.seedHash, i + 71) % 84);
    const stroke = kaiMomentColors[(i + byteAt(seed.seedHash, i + 173)) % kaiMomentColors.length];
    if (top) {
      return `<path d="M${stabilizeSvgNumber(offset)} 52 h${stabilizeSvgNumber(length)}" fill="none" stroke="${stroke}" stroke-width="${i % 4 === 0 ? "2.2" : "1.2"}" opacity="${i % 4 === 0 ? "0.4" : "0.18"}" stroke-linecap="round"/>`;
    }
    return `<path d="M${stabilizeSvgNumber(offset)} 948 h${stabilizeSvgNumber(length)}" fill="none" stroke="${stroke}" stroke-width="${i % 4 === 0 ? "2.2" : "1.2"}" opacity="${i % 4 === 0 ? "0.42" : "0.2"}" stroke-linecap="round"/>`;
  }).join("");
  const surfaceMicroNodes = Array.from({ length: 36 }, (_, i) => {
    const edge = i % 4;
    const offset = 110 + (byteAt(seed.seedHash, i + 9) % 780);
    const inset = 76 + (byteAt(seed.baseSeedHash, i + 45) % 20);
    const cx = edge === 0 ? offset : edge === 1 ? SPACE - inset : edge === 2 ? SPACE - offset : inset;
    const cy = edge === 0 ? inset : edge === 1 ? offset : edge === 2 ? SPACE - inset : SPACE - offset;
    const fill = kaiMomentColors[(i + byteAt(seed.baseSeedHash, i + 229)) % kaiMomentColors.length];
    return `<circle cx="${stabilizeSvgNumber(cx)}" cy="${stabilizeSvgNumber(cy)}" r="${stabilizeSvgNumber(1.8 + (byteAt(seed.seedHash, i + 81) % 18) / 10)}" fill="${fill}" opacity="${i % 6 === 0 ? "0.52" : "0.22"}"/>`;
  }).join("");
  return `<svg ${args.rootAttrs}${motionAttrs}>
    <metadata>${escapeText(JSON.stringify({
      v: 2,
      kind: "profile-identity-kai-sigil",
      stage: args.signed ? "signed" : "base",
      pulse: seed.pulse,
      chakraDay: seed.chakraDay,
      chakraArc: chakraArcLabel,
      pbiSignedAt: seed.pbiSignedAtIso,
      pbiSignedPulse: seed.pbiSignedPulse,
      pbiSignedChakraDay: seed.pbiSignedChakraDay,
      pbiSignedChakraArc: pbiChakraArcLabel,
      receizId: seed.receizId,
      baseSeedHash: seed.baseSeedHash,
      seedHash: seed.seedHash,
    }))}</metadata>
    <title>Deterministic profile seal</title>
    <defs>
      <path id="${aura}" d="${state.auraPath}"/>
      <path id="${petal}" d="${lissajousPath(5, 8, Math.PI / 2)}"/>
      <radialGradient id="${halo}" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${state.baseColor}" stop-opacity=".55">${args.motion ? `<animate attributeName="stop-opacity" values=".35;.75;.35" dur="var(--dur)" begin="var(--off)" repeatCount="indefinite"/>` : ""}</stop>
        <stop offset="100%" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="${zkGrad}" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="${state.kaiPhaseColor}" stop-opacity="0.85"/>
        <stop offset="55%" stop-color="${state.kaiPhaseColor}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${TEAL}" stop-opacity="0.25"/>
      </radialGradient>
      <filter id="${glow}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <mask id="${mask}"><rect width="100%" height="100%" fill="white"/></mask>
      <mask id="${decorationMask}" maskUnits="userSpaceOnUse">
        <rect width="${SPACE}" height="${SPACE}" fill="white"/>
        <circle cx="${CENTER}" cy="${CENTER}" r="368" fill="black"/>
      </mask>
      <pattern id="${net}" patternUnits="userSpaceOnUse" width="160" height="160" patternTransform="rotate(${(state.seed * 7) % 60} ${CENTER} ${CENTER})">
        <path d="M0 80 H160 M80 0 V160 M160 0 L0 160 M0 0 L160 160" stroke="${TEAL}" stroke-opacity=".06" stroke-width="1"/>
      </pattern>
      <filter id="${warp}" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="2" seed="${(state.seed % 997) + 3}" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${0.35 + (byteAt(seed.baseSeedHash, 31) % 12) * 0.05}" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <linearGradient id="${args.uid}-surface-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#05111f"/>
        <stop offset="48%" stop-color="#0a1d35"/>
        <stop offset="100%" stop-color="#06101e"/>
      </linearGradient>
      <linearGradient id="${args.uid}-steel-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fbff" stop-opacity="0.22"/>
        <stop offset="18%" stop-color="#7f96ac" stop-opacity="0.12"/>
        <stop offset="38%" stop-color="#0a1424" stop-opacity="0.18"/>
        <stop offset="58%" stop-color="#eef7ff" stop-opacity="0.12"/>
        <stop offset="100%" stop-color="#06101e" stop-opacity="0.34"/>
      </linearGradient>
      <linearGradient id="${args.uid}-surface-glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="52%" stop-color="#d8ecff" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="#020817" stop-opacity="0.34"/>
      </linearGradient>
      <linearGradient id="${args.uid}-glass-sweep" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="38%" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="48%" stop-color="#ffffff" stop-opacity="0.06"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="${args.uid}-chrome-edge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.34"/>
        <stop offset="18%" stop-color="${weekdayColor}" stop-opacity="0.26"/>
        <stop offset="34%" stop-color="${chakraDayColor}" stop-opacity="0.28"/>
        <stop offset="50%" stop-color="${proofChromeColor}" stop-opacity="0.32"/>
        <stop offset="66%" stop-color="${args.signed ? pbiArcColor : arcColor}" stop-opacity="0.24"/>
        <stop offset="82%" stop-color="${stepColor}" stop-opacity="0.24"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.18"/>
      </linearGradient>
      ${ringText({ id: outerRing, radius: 342, text: outerText, fill: state.kaiPhaseColor, fontSize: 22, opacity: 0.34 })}
      ${ringText({ id: innerRing, radius: 212, text: innerText, fill: TEAL, fontSize: 18, opacity: 0.28 })}
    </defs>
    <rect width="${SPACE}" height="${SPACE}" fill="#06142b"/>
    <g id="${args.uid}-trust-surface" pointer-events="none">
      <rect x="18" y="18" width="964" height="964" rx="104" fill="url(#${args.uid}-steel-sheen)" opacity="0.72" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"/>
      <rect x="34" y="34" width="932" height="932" rx="82" fill="url(#${args.uid}-surface-glass)" stroke="${surfaceStroke}" stroke-opacity="${args.signed ? "0.32" : "0.22"}" stroke-width="2"/>
      <rect x="58" y="58" width="884" height="884" rx="62" fill="#ffffff" opacity="0.04" stroke="url(#${args.uid}-chrome-edge)" stroke-opacity="0.62" stroke-width="1.2"/>
      <rect x="82" y="82" width="836" height="836" rx="50" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="1"/>
      <path d="M72 72 L928 928" fill="none" stroke="url(#${args.uid}-glass-sweep)" stroke-width="26" opacity="0.42" stroke-linecap="round"/>
      <path d="M190 54 H810" fill="none" stroke="url(#${args.uid}-chrome-edge)" stroke-width="3.2" opacity="0.58" stroke-linecap="round"/>
      <path d="M190 946 H810" fill="none" stroke="url(#${args.uid}-chrome-edge)" stroke-width="3" opacity="0.42" stroke-linecap="round"/>
      <path d="M96 92 H904" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.14" stroke-linecap="round"/>
      <path d="M92 96 V390" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.1" stroke-linecap="round"/>
      <path d="M106 176 C244 92 386 112 500 162 S780 210 894 122" fill="none" stroke="${surfaceState.phaseColor}" stroke-width="2.4" opacity="0.22"/>
      <path d="M122 840 C270 756 388 820 514 782 S764 714 888 810" fill="none" stroke="${surfaceState.baseColor}" stroke-width="2" opacity="0.2"/>
      ${surfaceValueRails}
      ${surfaceTrace}
      ${surfaceLedgerMarks}
      ${bottomHashRail}
      ${surfaceArkMarks}
      ${surfaceMicroNodes}
    </g>
    <g id="${args.uid}-receiz-id-layer" pointer-events="none" mask="url(#${decorationMask})">
      ${renderReceizBits(args.signed ? seed.seedHash : seed.baseSeedHash, args.signed, signedTrustColor)}
      ${signedLayer}
    </g>
    <g id="${args.uid}-receiz-id-seal-layer" pointer-events="none" mask="url(#${decorationMask})">
      ${renderReceizIdSealLayer({
        idHash: receizArtHash,
        seedHash: args.signed ? seed.seedHash : seed.baseSeedHash,
        state: args.signed ? pbiSignedState : state,
        signed: args.signed,
        uid: args.uid,
      })}
    </g>
    <g id="${args.uid}-tilt" style="transform-origin:${CENTER}px ${CENTER}px">
      ${args.motion ? `<animateTransform attributeName="transform" type="rotate" values="-2 ${CENTER} ${CENTER};2 ${CENTER} ${CENTER};-2 ${CENTER} ${CENTER}" dur="var(--dur)" begin="var(--off)" repeatCount="indefinite"/>` : ""}
    <g id="${args.uid}-art" data-layer="canonical-kai-sigil" filter="url(#${warp})">
      <rect width="${SPACE}" height="${SPACE}" fill="url(#${halo})" pointer-events="none"/>
      <rect width="${SPACE}" height="${SPACE}" fill="url(#${net})" pointer-events="none"/>
      <path d="${state.corePath}" fill="none" stroke="${state.baseColor}" stroke-width="${stabilizeSvgNumber(strokeCore)}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" mask="url(#${mask})" filter="url(#${glow})"/>
      ${renderDots(state, dotR)}
      ${args.motion ? `<use href="#${aura}" stroke="${TEAL}" stroke-width="${stabilizeSvgNumber(auraTealStroke)}" fill="none" opacity=".2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"><animate attributeName="stroke-opacity" values=".2;.6;.2" dur="var(--dur)" begin="var(--off)" repeatCount="indefinite"/></use>
      <use href="#${aura}" stroke="${state.baseColor}" stroke-width="${stabilizeSvgNumber(auraBaseStroke)}" fill="none" opacity=".4" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" pointer-events="none"><animate attributeName="stroke-opacity" values=".4;.9;.4" dur="var(--dur)" begin="var(--off)" repeatCount="indefinite"/></use>` : ""}
      <circle cx="${CENTER}" cy="${CENTER}" r="${stabilizeSvgNumber(Math.max(3, dotR))}" fill="${TEAL}" pointer-events="none">${args.motion ? `<animateTransform attributeName="transform" type="scale" values="1;1.5;1" dur="var(--dur)" begin="var(--off)" repeatCount="indefinite"/>` : ""}</circle>
    </g>
    </g>
    <g id="${args.uid}-zk-glyph" pointer-events="none">
      <circle cx="${CENTER}" cy="${CENTER}" r="${stabilizeSvgNumber(SPACE * 0.34)}" fill="none" stroke="url(#${zkGrad})" stroke-width="${stabilizeSvgNumber(zkGlowStroke)}" opacity="0.5" vector-effect="non-scaling-stroke"/>
      ${Array.from({ length: 12 }, (_, i) => {
        const rOuter = stabilizeSvgFloat(SPACE * 0.34);
        const rInner = stabilizeSvgFloat(rOuter / PHI);
        const rPetal = stabilizeSvgFloat(rInner * 0.96);
        const petalScale = stabilizeSvgFloat(rPetal / (SPACE / 2));
        return `<use href="#${petal}" transform="translate(${CENTER},${CENTER}) scale(${stabilizeSvgNumber(petalScale)}) rotate(${stabilizeSvgNumber(i * 30)}) translate(${-CENTER},${-CENTER})" stroke="url(#${zkGrad})" stroke-width="${stabilizeSvgNumber(zkPetalStroke)}" stroke-linecap="round" stroke-linejoin="round" opacity="0.42" fill="none" vector-effect="non-scaling-stroke"/>`;
      }).join("")}
      <g opacity="0.25">
        <circle cx="${stabilizeSvgNumber(CENTER - (SPACE * 0.34 / PHI) / 2.2)}" cy="${CENTER}" r="${stabilizeSvgNumber((SPACE * 0.34 / PHI) * 0.86)}" fill="none" stroke="${state.kaiPhaseColor}" stroke-width="${stabilizeSvgNumber(zkRingStroke)}"/>
        <circle cx="${stabilizeSvgNumber(CENTER + (SPACE * 0.34 / PHI) / 2.2)}" cy="${CENTER}" r="${stabilizeSvgNumber((SPACE * 0.34 / PHI) * 0.86)}" fill="none" stroke="${TEAL}" stroke-width="${stabilizeSvgNumber(zkRingStroke)}"/>
      </g>
      <circle cx="${CENTER}" cy="${CENTER}" r="${stabilizeSvgNumber(SPACE * 0.34 / PHI)}" fill="none" stroke="url(#${zkGrad})" stroke-width="${stabilizeSvgNumber(zkRingStroke)}" opacity="0.55" vector-effect="non-scaling-stroke"/>
    </g>
    <g id="${args.uid}-frame-runes" pointer-events="none" fill="none" stroke="${args.signed ? signedTrustColor : chromeStroke}" stroke-width="10" opacity="${args.signed ? "0.78" : "0.62"}" stroke-linecap="round">
      <path d="M82 192 V82 H192"/>
      <path d="M808 82 H918 V192"/>
      <path d="M82 808 V918 H192"/>
      <path d="M808 918 H918 V808"/>
    </g>
    ${""}
    ${args.showLabels ? `<g id="${args.uid}-identity-labels" pointer-events="none">
      <text x="${CENTER}" y="888" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="27" letter-spacing="5" fill="#d8ecff" opacity="0.5">${escapeText(`RECEIZ ${receizId}`)}</text>
      <text x="${CENTER}" y="928" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="21" letter-spacing="3" fill="#d8ecff" opacity="0.32">${escapeText(`KAI ${seed.pulse} / ${seed.chakraDay.toUpperCase()} / ${state.beat}:${state.stepIndex}`)}</text>
    </g>` : ""}
  </svg>`;
}

function buildAvatarSvg(seed: SeedMaterial): string {
  const signed = Boolean(seed.pbiReceiptHash);
  const state = buildStaticKaiSigilState(seed);
  return staticKaiSigilSvg({
    seed,
    state,
    signed,
    uid: "profile-avatar-kai-sigil",
    rootAttrs: `xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SPACE} ${SPACE}" role="img" aria-label="Deterministic profile seal"`,
    showLabels: false,
    motion: true,
    renderSize: 484,
  });
}

function buildBannerSvg(seed: SeedMaterial): string {
  const signed = Boolean(seed.pbiReceiptHash);
  const state = buildStaticKaiSigilState(seed);
  const pbiSignedState = signed ? buildPbiSignedMomentState(seed, state) : state;
  const width = 1600;
  const height = 600;
  const accent = state.phaseColor;
  const momentColor = signed ? pbiSignedState.baseColor : state.baseColor;
  const momentPhaseColor = signed ? pbiSignedState.phaseColor : state.phaseColor;
  const signedTrustColor = signed ? signedTrustBlue(seed.seedHash, pbiSignedState) : momentPhaseColor;
  const arcColor = arkProgressColor(seed.chakraArc, state);
  const visualArcColor = signed ? arkProgressColor(seed.pbiSignedChakraArc ?? seed.chakraArc, pbiSignedState) : arcColor;
  const chakraArcLabel = displayChakraArcLabel(seed.chakraArc);
  const pbiChakraArcLabel = displayChakraArcLabel(seed.pbiSignedChakraArc ?? seed.chakraArc);
  const chakraDayColor = chakraKaiColor(seed.chakraDay);
  const weekdayColor = chakraDayColor;
  const beatColor = arcColor;
  const stepColor = arcColor;
  const proofChromeColor = proofMomentColor(seed.seedHash, signed ? pbiSignedState : state);
  const latticeTriplet = kaiLatticeTriplet(state);
  const cardMomentColors = [
    weekdayColor,
    chakraDayColor,
    beatColor,
    stepColor,
    arcColor,
    visualArcColor,
    proofChromeColor,
    signedTrustColor,
    momentColor,
    momentPhaseColor,
  ] as const;
  const receizId = displayReceizId(seed.receizId);
  const machineReceizId = seed.receizId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "<")
    .slice(0, 34)
    .padEnd(34, "<");
  const documentNo = `${seed.baseSeedHash.slice(0, 6)}-${seed.baseSeedHash.slice(6, 12)}`.toUpperCase();
  const authorityLine = "IDENTITY-BOUND AUTHORITY";
  const mrzLineA = "RZ<IDENTITY<SEAL<<<<<<<<<<<<<<<<<<<<<<<<";
  const mrzLineB = `${machineReceizId}<KAI${seed.pulse.slice(0, 10)}<<${seed.baseSeedHash.slice(0, 12).toUpperCase()}`;
  const sigil = staticKaiSigilSvg({
    seed,
    state,
    signed,
    uid: "profile-banner-kai-sigil",
    rootAttrs: `x="70" y="58" width="484" height="484" viewBox="0 0 ${SPACE} ${SPACE}"`,
    showLabels: false,
    motion: true,
    renderSize: 484,
  });
  const waveLines = Array.from({ length: 11 }, (_, i) => {
    const y = 76 + i * 42 + (byteAt(seed.baseSeedHash, i) % 18);
    const amp = 16 + (byteAt(seed.baseSeedHash, i + 17) % 38);
    const stroke = cardMomentColors[(i + byteAt(seed.seedHash, i + 7)) % cardMomentColors.length];
    const opacity = signed && i % 4 === 0 ? 0.46 : 0.25;
    return `<path d="M0 ${y} C260 ${y - amp}, 420 ${y + amp}, 690 ${y} S1090 ${y - amp}, 1600 ${y + (i % 2 ? amp : -amp)}" fill="none" stroke="${stroke}" stroke-width="${i % 4 === 0 ? "3.4" : "2"}" opacity="${opacity}"/>`;
  }).join("");
  const starMap = Array.from({ length: 54 }, (_, i) =>
    `<circle cx="${78 + (uint32At(seed.seedHash, i) % 1460)}" cy="${44 + (byteAt(seed.seedHash, i + 54) % 506)}" r="${stabilizeSvgNumber(
      1.6 + (byteAt(seed.seedHash, i + 108) % 38) / 10,
    )}" fill="${signed && i % 6 === 0 ? signedTrustColor : "#d9efff"}" opacity="${signed && i % 6 === 0 ? "0.56" : "0.18"}"/>`,
  ).join("");
  const trustSurfaceRails = Array.from({ length: 14 }, (_, i) => {
    const x = 618 + i * 58 + (byteAt(seed.seedHash, i + 19) % 16);
    const y = 92 + (byteAt(seed.baseSeedHash, i + 37) % 238);
    const height = 34 + (byteAt(seed.seedHash, i + 71) % 78);
    const stroke = cardMomentColors[(i + byteAt(seed.seedHash, i + 83)) % cardMomentColors.length];
    return `<line x1="${stabilizeSvgNumber(x)}" y1="${stabilizeSvgNumber(y)}" x2="${stabilizeSvgNumber(x)}" y2="${stabilizeSvgNumber(y + height)}" stroke="${stroke}" stroke-width="${i % 4 === 0 ? "2.6" : "1.4"}" opacity="${signed && i % 4 === 0 ? "0.34" : "0.18"}" stroke-linecap="round"/>`;
  }).join("");
  const trustSurfaceChips = Array.from({ length: 9 }, (_, i) => {
    const x = 1168 + (i % 3) * 84;
    const y = 206 + Math.floor(i / 3) * 42;
    const widthChip = 48 + (byteAt(seed.baseSeedHash, i + 117) % 32);
    const fill = cardMomentColors[(i + byteAt(seed.seedHash, i + 91)) % cardMomentColors.length];
    return `<rect x="${x}" y="${y}" width="${widthChip}" height="7" rx="3.5" fill="${fill}" opacity="${signed && i % 3 === 0 ? "0.5" : "0.26"}"/>`;
  }).join("");
  const arkSignalBars = Array.from({ length: 6 }, (_, i) => {
    const x = 972 + i * 24 + (byteAt(seed.baseSeedHash, i + 251) % 6);
    const heightSignal = 8 + (byteAt(seed.seedHash, i + 239) % 22);
    return `<rect x="${x}" y="${303 - heightSignal}" width="12" height="${heightSignal}" rx="4" fill="${arcColor}" opacity="${signed ? "0.56" : "0.42"}"/>`;
  }).join("");
  const steelValueRail = Array.from({ length: 22 }, (_, i) => {
    const y = 92 + i * 18;
    const widthRail = 16 + (byteAt(seed.seedHash, i + 127) % 42);
    const fill = i % 6 === 0 ? visualArcColor : i % 3 === 0 ? cardMomentColors[(i + 2) % cardMomentColors.length] : "#f4f9ff";
    return `<rect x="${1452 - widthRail}" y="${y}" width="${widthRail}" height="3.4" rx="1.7" fill="${fill}" opacity="${i % 6 === 0 ? "0.52" : "0.22"}"/>`;
  }).join("");
  const chromeMicrotext = Array.from({ length: 18 }, (_, i) => {
    const x = 94 + i * 78;
    const label = seed.seedHash.slice(i, i + 3).toUpperCase();
    return `<text x="${x}" y="42" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="8" letter-spacing="1.4" fill="#edf7ff" opacity="${i % 5 === 0 ? "0.3" : "0.16"}">${escapeText(label)}</text>`;
  }).join("");
  const chromePins = [
    [56, 52],
    [1544, 52],
    [56, 548],
    [1544, 548],
    [584, 54],
    [584, 546],
    [1484, 74],
    [1484, 414],
  ]
    .map(([cx, cy], i) => {
      const fill = i % 3 === 0 ? visualArcColor : i % 2 === 0 ? cardMomentColors[(i + 4) % cardMomentColors.length] : "#f6fbff";
      return `<circle cx="${cx}" cy="${cy}" r="${i < 4 ? "4.8" : "3.2"}" fill="${fill}" opacity="${i % 3 === 0 ? "0.58" : "0.34"}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="1"/>`;
    })
    .join("");
  const dataBandX = 616;
  const dataBandY = 378;
  const dataBandHeight = 32;
  const dataBarsTop = dataBandY + 14;
  const dataBarsHeight = 20;
  const dataBars = Array.from({ length: 34 }, (_, i) => {
    const x = dataBandX + i * 13;
    const height = 5 + (byteAt(seed.baseSeedHash, i + 9) % 16);
    const y = dataBarsTop + dataBarsHeight - height;
    const fill = cardMomentColors[(i + byteAt(seed.seedHash, i + 41)) % cardMomentColors.length];
    return `<rect x="${x}" y="${y}" width="${4 + (byteAt(seed.seedHash, i + 31) % 5)}" height="${height}" rx="2" fill="${fill}" opacity="${signed && i % 5 === 0 ? "0.58" : "0.32"}"/>`;
  }).join("");
  const dataBand = `<g data-layer="receiz-id-machine-band">
    <rect x="${dataBandX - 10}" y="${dataBandY - 6}" width="482" height="${dataBandHeight + 12}" rx="16" fill="#06142b" opacity="0.34" stroke="${proofChromeColor}" stroke-opacity="0.2" stroke-width="1"/>
    <text x="${dataBandX}" y="${dataBandY + 4}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12" font-weight="700" letter-spacing="4" fill="${proofChromeColor}" opacity="0.46">VERIFICATION BAND</text>
    ${dataBars}
  </g>`;
  const passportMesh = Array.from({ length: 8 }, (_, i) => {
    const y = 108 + i * 32;
    const stroke = cardMomentColors[(i + byteAt(seed.seedHash, i + 52)) % cardMomentColors.length];
    return `<path d="M596 ${y} C736 ${y - 22}, 916 ${y + 22}, 1062 ${y} S1320 ${y - 18}, 1464 ${y + 10}" fill="none" stroke="${stroke}" stroke-width="1.2" opacity="0.2"/>`;
  }).join("");
  const signedGeometry = signed ? renderBannerSignedGeometry(seed, pbiSignedState) : "";
  const signedPanel = signed
    ? `<g data-stage="signed-banner">
        <rect x="596" y="423" width="676" height="104" rx="24" fill="#020817" opacity="0.58" stroke="url(#banner-signed-badge-edge)" stroke-opacity="0.66" stroke-width="1.8"/>
        ${signedGeometry}
        <path d="M616 438 H1248" fill="none" stroke="url(#banner-signed-badge-edge)" stroke-width="4.2" opacity="0.78" stroke-linecap="round"/>
        <text x="616" y="453" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="17" letter-spacing="3" fill="#eaf8ff" opacity="0.86">${escapeText(`PBI ${seed.pbiReceiptHash?.slice(0, 32).toUpperCase() ?? ""}`)}</text>
        <text x="616" y="502" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="40" font-weight="900" letter-spacing="7" fill="url(#banner-signed-text-fill)" opacity="1" paint-order="stroke" stroke="#00111f" stroke-width="5.8" stroke-opacity="0.86">HUMAN SIGNED</text>
        <rect x="616" y="514" width="590" height="8" rx="4" fill="url(#banner-signed-badge-edge)" opacity="0.86"/>
        <rect x="616" y="536" width="356" height="4" rx="2" fill="${signedTrustColor}" opacity="0.5"/>
      </g>`
    : `<g data-stage="base-banner">
        <rect x="616" y="425" width="560" height="6" rx="3" fill="${accent}" opacity="0.42"/>
        <text x="616" y="464" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="18" letter-spacing="4" fill="#b8d9f5" opacity="0.46">AWAITING HUMAN SIGNATURE</text>
      </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Deterministic profile seal header">
    <metadata>${escapeText(JSON.stringify({
      v: 2,
      kind: "profile-banner",
      stage: signed ? "signed" : "base",
      pulse: seed.pulse,
      chakraDay: seed.chakraDay,
      chakraArc: chakraArcLabel,
      pbiSignedAt: seed.pbiSignedAtIso,
      pbiSignedPulse: seed.pbiSignedPulse,
      pbiSignedChakraDay: seed.pbiSignedChakraDay,
      pbiSignedChakraArc: pbiChakraArcLabel,
      receizId: seed.receizId,
      baseSeedHash: seed.baseSeedHash,
      seedHash: seed.seedHash,
      usernameAppend: seed.usernameAppend,
    }))}</metadata>
    <defs>
      <linearGradient id="banner-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#05111f"/>
        <stop offset="46%" stop-color="#0a1d35"/>
        <stop offset="100%" stop-color="#071424"/>
      </linearGradient>
      <linearGradient id="banner-steel-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f8fbff" stop-opacity="0.2"/>
        <stop offset="18%" stop-color="#6f849b" stop-opacity="0.12"/>
        <stop offset="36%" stop-color="#071321" stop-opacity="0.2"/>
        <stop offset="55%" stop-color="#eef7ff" stop-opacity="0.11"/>
        <stop offset="100%" stop-color="#030814" stop-opacity="0.34"/>
      </linearGradient>
      <radialGradient id="banner-aura" cx="34%" cy="48%" r="52%">
        <stop offset="0%" stop-color="${proofChromeColor}" stop-opacity="0.34"/>
        <stop offset="36%" stop-color="${weekdayColor}" stop-opacity="0.18"/>
        <stop offset="62%" stop-color="${chakraDayColor}" stop-opacity="0.14"/>
        <stop offset="100%" stop-color="${proofChromeColor}" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="banner-panel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="58%" stop-color="#d8ecff" stop-opacity="0.062"/>
        <stop offset="100%" stop-color="#020817" stop-opacity="0.26"/>
      </linearGradient>
      <linearGradient id="banner-chrome-edge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0.36"/>
        <stop offset="18%" stop-color="${weekdayColor}" stop-opacity="0.32"/>
        <stop offset="34%" stop-color="${chakraDayColor}" stop-opacity="0.34"/>
        <stop offset="52%" stop-color="${visualArcColor}" stop-opacity="0.3"/>
        <stop offset="70%" stop-color="${proofChromeColor}" stop-opacity="0.28"/>
        <stop offset="86%" stop-color="${stepColor}" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.2"/>
      </linearGradient>
      <linearGradient id="banner-glass-sweep" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
        <stop offset="42%" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="52%" stop-color="#ffffff" stop-opacity="0.055"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="banner-kai-pulse-fill" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${chakraDayColor}" stop-opacity="1"/>
        <stop offset="52%" stop-color="${proofChromeColor}" stop-opacity="0.92"/>
        <stop offset="100%" stop-color="${visualArcColor}" stop-opacity="1"/>
      </linearGradient>
      <linearGradient id="banner-signed-badge-edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${signedTrustColor}" stop-opacity="0.92"/>
        <stop offset="48%" stop-color="${proofChromeColor}" stop-opacity="0.76"/>
        <stop offset="100%" stop-color="${visualArcColor}" stop-opacity="0.88"/>
      </linearGradient>
      <linearGradient id="banner-signed-text-fill" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#eaf8ff" stop-opacity="1"/>
        <stop offset="46%" stop-color="${signedTrustColor}" stop-opacity="1"/>
        <stop offset="100%" stop-color="${visualArcColor}" stop-opacity="1"/>
      </linearGradient>
      <linearGradient id="banner-arc-rule" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${arcColor}" stop-opacity="0.72"/>
        <stop offset="62%" stop-color="${stepColor}" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="${arcColor}" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="banner-rule" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${weekdayColor}" stop-opacity="0"/>
        <stop offset="34%" stop-color="${chakraDayColor}" stop-opacity="0.36"/>
        <stop offset="50%" stop-color="${signed ? signedTrustColor : proofChromeColor}" stop-opacity="${signed ? "0.66" : "0.5"}"/>
        <stop offset="66%" stop-color="${visualArcColor}" stop-opacity="0.36"/>
        <stop offset="100%" stop-color="${stepColor}" stop-opacity="0"/>
      </linearGradient>
      <filter id="banner-text-glow"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#banner-bg)"/>
    <rect width="${width}" height="${height}" fill="url(#banner-aura)"/>
    ${waveLines}
    ${starMap}
    <rect x="14" y="12" width="1572" height="576" rx="70" fill="url(#banner-steel-sheen)" opacity="0.68" stroke="#ffffff" stroke-opacity="0.12" stroke-width="1"/>
    <rect x="28" y="24" width="1544" height="552" rx="58" fill="url(#banner-panel)" stroke="url(#banner-chrome-edge)" stroke-opacity="0.62" stroke-width="1.8"/>
    <rect x="48" y="44" width="1504" height="512" rx="42" fill="none" stroke="${signed ? signedTrustColor : proofChromeColor}" stroke-opacity="${signed ? "0.34" : "0.24"}" stroke-width="1.4"/>
    <rect x="60" y="54" width="520" height="492" rx="32" fill="#ffffff" opacity="0.062" stroke="url(#banner-chrome-edge)" stroke-opacity="0.5" stroke-width="1.5"/>
    <rect x="592" y="74" width="888" height="340" rx="34" fill="#ffffff" opacity="0.05" stroke="url(#banner-chrome-edge)" stroke-opacity="0.44" stroke-width="1.5"/>
    <path d="M54 52 L1538 548" fill="none" stroke="url(#banner-glass-sweep)" stroke-width="34" opacity="0.34" stroke-linecap="round"/>
    <path d="M82 66 H558" fill="none" stroke="#ffffff" stroke-width="2.2" opacity="0.16" stroke-linecap="round"/>
    <path d="M614 86 H1452" fill="none" stroke="#ffffff" stroke-width="2.2" opacity="0.14" stroke-linecap="round"/>
    <path d="M80 82 V380" fill="none" stroke="#ffffff" stroke-width="1.6" opacity="0.1" stroke-linecap="round"/>
    ${chromePins}
    ${chromeMicrotext}
    <rect x="1406" y="84" width="56" height="342" rx="18" fill="#ffffff" opacity="0.032" stroke="url(#banner-chrome-edge)" stroke-opacity="0.38" stroke-width="1"/>
    ${steelValueRail}
    <rect x="616" y="104" width="814" height="2.4" rx="1.2" fill="url(#banner-rule)" opacity="0.88"/>
    ${trustSurfaceRails}
    ${trustSurfaceChips}
    ${passportMesh}
    ${sigil}
    <g filter="url(#banner-text-glow)">
      <text x="616" y="142" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="38" font-weight="800" letter-spacing="8" fill="#dcecff" opacity="0.9">IDENTITY RECORD</text>
      <text x="616" y="181" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="14" font-weight="700" letter-spacing="5" fill="#d7eaff" opacity="0.5">${escapeText(`${authorityLine} / SEAL ${documentNo}`)}</text>
      <text x="616" y="214" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="30" font-weight="700" letter-spacing="6" fill="url(#banner-kai-pulse-fill)" opacity="0.96" paint-order="stroke" stroke="#03101d" stroke-width="3" stroke-opacity="0.55">${escapeText(`☤KAI ${seed.pulse}`)}</text>
      <text x="616" y="264" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="23" letter-spacing="4" opacity="0.88"><tspan fill="${weekdayColor}">${escapeText(seed.weekday)}</tspan><tspan fill="#d7eaff" opacity="0.48"> / </tspan><tspan fill="${chakraDayColor}">${escapeText(seed.chakraDay)}</tspan><tspan fill="#d7eaff" opacity="0.48"> / </tspan><tspan fill="${beatColor}">${escapeText(latticeTriplet)}</tspan></text>
      <text x="616" y="292" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="16" font-weight="800" letter-spacing="4" fill="${arcColor}" opacity="${signed ? "0.94" : "0.76"}" paint-order="stroke" stroke="#03101d" stroke-width="2.4" stroke-opacity="0.52">${escapeText(chakraArcLabel.toUpperCase())}</text>
      <rect x="616" y="303" width="328" height="3.2" rx="1.6" fill="url(#banner-arc-rule)" opacity="${signed ? "0.84" : "0.66"}"/>
      ${arkSignalBars}
      <text x="616" y="318" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="21" letter-spacing="4" fill="${TEAL}" opacity="0.74">${escapeText(`RECEIZ ID ${receizId}`)}</text>
      <text x="616" y="356" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="17" letter-spacing="3" fill="#d7eaff" opacity="0.42">${escapeText(hashBands(seed.baseSeedHash))}</text>
      ${dataBand}
    </g>
    ${signedPanel}
    ${""}
    <g font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" fill="#d7eaff" opacity="0.34">
      <text x="70" y="558" font-size="16" letter-spacing="3">${escapeText(mrzLineA)}</text>
      <text x="70" y="584" font-size="16" letter-spacing="3">${escapeText(mrzLineB)}</text>
    </g>
  </svg>`;
}

export function buildProfileIdentityArtworkSvgSet(args: {
  userId: string;
  createdAt: string;
  creationKaiMicroPulse: string;
  receizId?: string | null;
  genesisReceizId?: string | null;
  receizIdentityKeyId?: string | null;
  pbiReceiptHash?: string | null;
  pbiSignedAt?: string | null;
  pbiSignedKaiMicroPulse?: string | null;
  usernameAppend?: ProfileUsernameAppend | null;
}): ProfileIdentityArtworkSvgSet {
  const seed = seedMaterial(args);
  const creationSeed = seed.usernameAppend
    ? { ...seed, receizId: seed.genesisReceizId, usernameAppend: null }
    : seed;
  const creationAvatarSvg = buildAvatarSvg(creationSeed);
  const creationBannerSvg = buildBannerSvg(creationSeed);
  return {
    avatarSvg: seed.usernameAppend ? buildAvatarSvg(seed) : creationAvatarSvg,
    bannerSvg: seed.usernameAppend ? buildBannerSvg(seed) : creationBannerSvg,
    creationAvatarSvg,
    creationBannerSvg,
    seedHash: seed.seedHash,
    baseSeedHash: seed.baseSeedHash,
    pulse: seed.pulse,
    chakraDay: seed.chakraDay,
  };
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${bytesToBase64(new TextEncoder().encode(svg))}`;
}

export function buildProfileIdentityArtworkDataUrls(args: {
  userId: string;
  createdAt: string;
  creationKaiMicroPulse: string;
  receizId?: string | null;
  genesisReceizId?: string | null;
  receizIdentityKeyId?: string | null;
  pbiReceiptHash?: string | null;
  pbiSignedAt?: string | null;
  pbiSignedKaiMicroPulse?: string | null;
  usernameAppend?: ProfileUsernameAppend | null;
}): ProfileIdentityArtworkDataUrls {
  const svgSet = buildProfileIdentityArtworkSvgSet(args);
  return {
    avatarUrl: svgDataUrl(svgSet.avatarSvg),
    bannerUrl: svgDataUrl(svgSet.bannerSvg),
    seedHash: svgSet.seedHash,
    baseSeedHash: svgSet.baseSeedHash,
    pulse: svgSet.pulse,
  };
}

export function buildProfileSealArtifacts(args: {
  userId: string;
  createdAt: string;
  creationKaiMicroPulse: string;
  receizId?: string | null;
  genesisReceizId?: string | null;
  receizIdentityKeyId?: string | null;
  pbiReceiptHash?: string | null;
  pbiSignedAt?: string | null;
  pbiSignedKaiMicroPulse?: string | null;
  usernameAppend?: ProfileUsernameAppend | null;
}): ProfileSealArtifact[] {
  const svgSet = buildProfileIdentityArtworkSvgSet(args);
  const avatarSha256Hex = sha256Hex(svgSet.avatarSvg);
  const headerSha256Hex = sha256Hex(svgSet.bannerSvg);
  const identityLabel = displayReceizId(args.usernameAppend?.username ?? args.receizId ?? args.genesisReceizId ?? args.userId);
  const baseName = artifactSlug(identityLabel);
  const signed = svgSet.seedHash !== svgSet.baseSeedHash;
  const stage = signed ? "signed" : "base";
  const identitySealTitle = `${signed ? "Signed " : ""}Identity Seal ${identityLabel}`;
  const identityRecordTitle = `${signed ? "Signed " : ""}Identity Record ${identityLabel}`;
  const common = {
    mime: "image/svg+xml" as const,
    seedHash: svgSet.seedHash,
    baseSeedHash: svgSet.baseSeedHash,
    pulse: svgSet.pulse,
    chakraDay: svgSet.chakraDay,
  };

  return [
    {
      ...common,
      kind: "avatar",
      title: identitySealTitle,
      claim: identitySealTitle,
      claimSha256Hex: sha256Hex(identitySealTitle),
      filename: `identity-seal-${stage}-${baseName}-${svgSet.seedHash.slice(0, 10)}.svg`,
      svg: svgSet.avatarSvg,
      dataUrl: svgDataUrl(svgSet.avatarSvg),
      sha256Hex: avatarSha256Hex,
      size: utf8Size(svgSet.avatarSvg),
    },
    {
      ...common,
      kind: "header",
      title: identityRecordTitle,
      claim: identityRecordTitle,
      claimSha256Hex: sha256Hex(identityRecordTitle),
      filename: `identity-record-${stage}-${baseName}-${svgSet.seedHash.slice(0, 10)}.svg`,
      svg: svgSet.bannerSvg,
      dataUrl: svgDataUrl(svgSet.bannerSvg),
      sha256Hex: headerSha256Hex,
      size: utf8Size(svgSet.bannerSvg),
    },
  ];
}

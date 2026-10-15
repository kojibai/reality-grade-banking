import { CHAKRAS, lissajousPath, normalizeChakraDayKey, polygonPath } from "@/app/components/KaiSigil/constants";

type ChakraDayKey = keyof typeof CHAKRAS;
type WeekdayName = "Solhara" | "Aquaris" | "Flamora" | "Verdari" | "Sonari" | "Kaelith";

export type KaiSigilWatermarkSnapshot = {
  pulse: number;
  beat: number;
  stepIndex: number;
  chakraDay: ChakraDayKey;
  kaiSignature?: string | null;
};

type BuildKaiSigilWatermarkSvgArgs = {
  snapshot: KaiSigilWatermarkSnapshot;
  label?: string;
  palette?: "money_dark" | "money_light";
  showFooter?: boolean;
  transparentBackground?: boolean;
};

const WEEKDAY_NAMES = new Set<WeekdayName>([
  "Solhara",
  "Aquaris",
  "Flamora",
  "Verdari",
  "Sonari",
  "Kaelith",
]);

function asInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.trunc(parsed);
  }
  return null;
}

function normalizeStepIndex(value: number): number {
  const mod = value % 44;
  return mod >= 0 ? mod : mod + 44;
}

function normalizeBeat(value: number): number {
  const mod = value % 36;
  return mod >= 0 ? mod : mod + 36;
}

function normalizeChakraDay(value: unknown): ChakraDayKey {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return "Root";
  const exact = Object.prototype.hasOwnProperty.call(CHAKRAS, raw) ? (raw as ChakraDayKey) : null;
  if (exact) return exact;
  const weekday = WEEKDAY_NAMES.has(raw as WeekdayName) ? (raw as WeekdayName) : null;
  if (weekday) return normalizeChakraDayKey(weekday);
  return "Root";
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function deriveKaiSigilSnapshotFromPulse(args: {
  pulse: number;
  beat?: number | null;
  stepIndex?: number | null;
  chakraDay?: string | null;
  kaiSignature?: string | null;
}): KaiSigilWatermarkSnapshot {
  const pulse = Number.isFinite(args.pulse) ? Math.max(0, Math.trunc(args.pulse)) : 0;
  const beat = normalizeBeat(
    Number.isFinite(args.beat ?? NaN)
      ? Math.trunc(args.beat as number)
      : Math.floor(pulse / 484),
  );
  const stepIndex = normalizeStepIndex(
    Number.isFinite(args.stepIndex ?? NaN)
      ? Math.trunc(args.stepIndex as number)
      : Math.floor(pulse / 11),
  );
  const chakraDay = normalizeChakraDay(args.chakraDay ?? null);
  const kaiSignature = typeof args.kaiSignature === "string" && args.kaiSignature.trim()
    ? args.kaiSignature.trim().slice(0, 96)
    : null;

  return { pulse, beat, stepIndex, chakraDay, kaiSignature };
}

export function parseKaiSigilSnapshot(value: unknown): KaiSigilWatermarkSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const pulseRaw = asInt(row.pulse);
  if (pulseRaw === null || pulseRaw < 0) return null;
  const beatRaw = asInt(row.beat);
  const stepRaw = asInt(row.stepIndex);
  const chakraDay = normalizeChakraDay(row.chakraDay);
  const kaiSignature = typeof row.kaiSignature === "string" && row.kaiSignature.trim()
    ? row.kaiSignature.trim().slice(0, 96)
    : null;

  return deriveKaiSigilSnapshotFromPulse({
    pulse: pulseRaw,
    beat: beatRaw,
    stepIndex: stepRaw,
    chakraDay,
    kaiSignature,
  });
}

export function buildKaiSigilWatermarkSvg(args: BuildKaiSigilWatermarkSvgArgs): string {
  const snapshot = args.snapshot;
  const chakraDay = normalizeChakraDay(snapshot.chakraDay);
  const chakra = CHAKRAS[chakraDay];
  const hue = chakra?.hue ?? 0;
  const sides = chakra?.sides ?? 4;
  const palette = args.palette ?? "money_dark";
  const light = palette === "money_light";
  const transparentBackground = args.transparentBackground === true;
  const bg = light ? "#f5f8fb" : "#04150f";
  const edge = light ? "#113c4d" : "#89e5cd";
  const ringA = hsl((hue + 360) % 360, 88, light ? 46 : 64);
  const ringB = hsl((hue + 42) % 360, 76, light ? 38 : 60);
  const glyph = hsl((hue + 14) % 360, 92, light ? 34 : 72);
  const text = light ? "#0f2e39" : "#eafaf4";
  const subtext = light ? "#2b5562" : "#9fd8c8";
  const rot = (snapshot.stepIndex / 44) * Math.PI * 2;
  const a = 2 + (snapshot.beat % 7);
  const b = 3 + (snapshot.stepIndex % 9);
  const delta = ((snapshot.pulse % 360) * Math.PI) / 180;
  const poly = polygonPath(sides, rot, 0.34);
  const wave = lissajousPath(a, b, delta);
  const label = (typeof args.label === "string" && args.label.trim() ? args.label.trim() : "KAI SIGIL")
    .slice(0, 36)
    .toUpperCase();
  const footer = args.showFooter !== false;
  const signature = (typeof snapshot.kaiSignature === "string" && snapshot.kaiSignature.trim()
    ? snapshot.kaiSignature.trim()
    : "UNSIGNED")
    .slice(0, 28)
    .toUpperCase();

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000" role="img" aria-label="Kai sigil watermark">
  <defs>
    <radialGradient id="kai-wm-bg" cx="50%" cy="42%" r="68%">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${light ? "#dfe8ef" : "#02120d"}"/>
    </radialGradient>
    <linearGradient id="kai-wm-ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${ringA}"/>
      <stop offset="100%" stop-color="${ringB}"/>
    </linearGradient>
  </defs>
  ${
    transparentBackground
      ? ""
      : `<rect width="1000" height="1000" fill="url(#kai-wm-bg)"/>`
  }
  <circle cx="500" cy="500" r="430" fill="none" stroke="${edge}" stroke-opacity="0.34" stroke-width="6"/>
  <circle cx="500" cy="500" r="360" fill="none" stroke="url(#kai-wm-ring)" stroke-opacity="0.72" stroke-width="16"/>
  <path d="${poly}" fill="none" stroke="${glyph}" stroke-opacity="0.76" stroke-width="12"/>
  <path d="${wave}" fill="none" stroke="${ringA}" stroke-opacity="0.38" stroke-width="5"/>
  <text x="500" y="150" text-anchor="middle" fill="${text}" opacity="0.94" font-size="44" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" letter-spacing="2">${escapeXml(label)}</text>
  <text x="500" y="475" text-anchor="middle" fill="${glyph}" opacity="0.92" font-size="126" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">☤KAI</text>
  <text x="500" y="548" text-anchor="middle" fill="${subtext}" opacity="0.95" font-size="36" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">PULSE ${snapshot.pulse}</text>
  <text x="500" y="596" text-anchor="middle" fill="${subtext}" opacity="0.95" font-size="32" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">BEAT ${snapshot.beat} - STEP ${snapshot.stepIndex}</text>
  ${
    footer
      ? `<text x="500" y="910" text-anchor="middle" fill="${text}" opacity="0.88" font-size="28" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">${escapeXml(chakraDay.toUpperCase())} - ${escapeXml(signature)}</text>`
      : ""
  }
</svg>`;
}

export function buildKaiSigilWatermarkDataUri(args: BuildKaiSigilWatermarkSvgArgs): string {
  const svg = buildKaiSigilWatermarkSvg(args);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

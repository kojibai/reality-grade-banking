// Bankeiz eternal Kai dial, adapted from the canonical Kai Klok face.
import React, { useMemo } from "react";
import "./CanonicalKaiKlock.css";
const pulseNumber = new Intl.NumberFormat('en-US');

// User-authorized Bankeiz material accents. Semantic ark/day/month palettes
// remain source-carried; these replace the original electric cyan hardware.
export const BANK_KAI_SURFACE_COLORS = {
  rim: '#73949c', coordinate: '#a3c7c0', readout: '#94bcb5',
  eternalReadout: '#afcbc6', eternalStroke: '#9cb9bc',
  eternalFill: '#8fb0b5', eternalDigit: '#d5e5e2',
} as const;

// Native continuous day length; the controlled projection supplies exact integer state.
export const HARMONIC_DAY_PULSES = 17491.270421 as const;

/* ─── Arc model (IDs never change) ───────────────────────────── */
export type ArcName =
  | "Ignition Ark"
  | "Integration Ark"
  | "Harmonization Ark"
  | "Reflektion Ark"
  | "Purifikation Ark"
  | "Dream Ark";

/* UI-friendly captions */
const ARC_SHORT: Record<ArcName, string> = {
  "Ignition Ark":      "Ignite",
  "Integration Ark":   "Integrate",
  "Harmonization Ark": "Harmony",
  "Reflektion Ark":    "Reflekt",
  "Purifikation Ark":  "Purify",
  "Dream Ark":         "Dream",
};

/* ─── Geometry & constants ───────────────────────────────────── */
const SIZE        = 120;
const C           = SIZE / 2;
const HALO_R      = 27.5;
const HALO_STROKE = 4.5;
const RING_MARGIN = 4.2;
const OUTER_R     = C - 0.5;
const R           = C - RING_MARGIN;

const DOTS          = 36;
const DOT_OFFSET    = -3;
const NUM_FONT_SIZE = 5.2;
const DOT_R         = R - 6.3;
const LABEL_R       = ((HALO_R + HALO_STROKE + OUTER_R) / 2) - 4;

/* ─── Eternal beat/step canon (continuous) ───────────────────── */
const ETERNAL_BEATS_PER_DAY   = 36;
const ETERNAL_STEPS_PER_BEAT  = 44;
const ETERNAL_PULSES_PER_BEAT = HARMONIC_DAY_PULSES / ETERNAL_BEATS_PER_DAY;
const ETERNAL_PULSES_PER_STEP = ETERNAL_PULSES_PER_BEAT / ETERNAL_STEPS_PER_BEAT;

/* ─── Helpers ───────────────────────────────────────────────── */
const rad  = (deg: number) => (deg * Math.PI) / 180;
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
/* ─── Props ─────────────────────────────────────────────────── */
export interface KaiKlockProps {
  /** Controlled native KKS projection. SVG geometry below remains upstream. */
  canonical?: {
    eternalDayPulse: number;
    eternalBeatFraction: number;
    eternalStepFraction: number;
    monthIndex: number;
    phaseColors: readonly string[];
    beatColors: readonly string[];
    gridMicro: string;
    coordinate: string;
  };
  hue: string;
  harmonicDayPercent: number;            // day progress 0–100 (for rim progress)
  microCyclePercent: number;             // micro percent (for orb delay)
  dayLabel: string;
  monthLabel: string;
  monthDay: number;
  kaiPulseEternal: number;               // global eternal pulses (for Eternal hand)
  glowPulse?: boolean;
  /** Animation rhythm in SECONDS (defaults to φ-exact breath) */
  pulseIntervalSec?: number;
  rimFlash?: boolean;

  /** Optional external indices (App.tsx live ticker may pass these).
      If omitted, they are derived from kaiPulseEternal. */
  eternalBeatIndex?: number; // 0..35
  eternalStepIndex?: number; // 0..43

  eternalWeekDescription?: string;
}

/* ─── φ-exact breath unit ──────────────────────────────────────
   T = 3 + √5 seconds; also provide ms for timers and Hz for reference. */
export const BREATH_SEC = 3 + Math.sqrt(5);                 // ≈ 5.23606797749979…
export const BREATH_MS  = Math.round(BREATH_SEC * 1000);    // 5236 ms (rounded)
export const BREATH_HZ  = 1 / BREATH_SEC;                   // ≈ 0.190983005625…

/* ─── Component ─────────────────────────────────────────────── */
const KaiKlock: React.FC<KaiKlockProps> = ({
  hue,
  kaiPulseEternal,
  harmonicDayPercent,
  microCyclePercent,
  dayLabel,
  monthLabel,
  monthDay,
  glowPulse        = true,
  // IMPORTANT: this is SECONDS; default to φ-exact BREATH_SEC
  pulseIntervalSec = BREATH_SEC,
  rimFlash         = false,
  eternalBeatIndex,
  eternalStepIndex,
  canonical,
}) => {
  const cycle = `${pulseIntervalSec}s`;

  const normalizedEternal =
    ((kaiPulseEternal % HARMONIC_DAY_PULSES) + HARMONIC_DAY_PULSES) % HARMONIC_DAY_PULSES;

  const effectivePulse = normalizedEternal;

  const derivedDayFraction = effectivePulse / HARMONIC_DAY_PULSES;
  const effectiveHarmonicDayPercent = Number.isFinite(harmonicDayPercent)
    ? harmonicDayPercent
    : derivedDayFraction * 100;

  // Micro-cycle fallback: progress within the current step (0–100)
  const pulsesIntoBeatFallback =
    effectivePulse - Math.floor(effectivePulse / ETERNAL_PULSES_PER_BEAT) * ETERNAL_PULSES_PER_BEAT;
  const stepFracFallback =
    (pulsesIntoBeatFallback % ETERNAL_PULSES_PER_STEP) / ETERNAL_PULSES_PER_STEP;
  const effectiveMicroCyclePercent = Number.isFinite(microCyclePercent)
    ? microCyclePercent
    : stepFracFallback * 100;

  const circumference = 2 * Math.PI * R;
  const dashOff       = circumference * (1 - effectiveHarmonicDayPercent / 100);

  const orbDelay = -(effectiveMicroCyclePercent / 100) * pulseIntervalSec;
  const pulseKey = effectivePulse;

  const months     = ["Aethon", "Virelai", "Solari", "Amarin", "Kaelus", "Umbriel", "Noctura", "Liora"];
  const monthIndexRaw = months.indexOf(monthLabel) + 1;
  const monthIndex    = canonical?.monthIndex ?? (monthIndexRaw > 0 ? monthIndexRaw : 1);

  const spacing = 14;
  const xBeat   = C - spacing;
  const xDay    = C;
  const xMonth  = C + spacing;
  const yNums   = C + 28;

  /* ── Eternal hand (mirror EternalKlock) ────────────────────── */
  // Allow external indices from App ticker; otherwise derive from kaiPulseEternal
  const etBeatIdxDerived   = Math.floor(normalizedEternal / ETERNAL_PULSES_PER_BEAT) % ETERNAL_BEATS_PER_DAY;
  const etBeatIdx          = Number.isFinite(eternalBeatIndex!)
    ? clamp(eternalBeatIndex!, 0, 35)
    : etBeatIdxDerived;

  const pulsesIntoBeatET   = normalizedEternal - etBeatIdx * ETERNAL_PULSES_PER_BEAT;
  const fracIntoBeat       = canonical?.eternalBeatFraction ?? pulsesIntoBeatET / ETERNAL_PULSES_PER_BEAT;

  const etStepIdxDerived   = Math.floor(pulsesIntoBeatET / ETERNAL_PULSES_PER_STEP) % ETERNAL_STEPS_PER_BEAT; // 0–43
  const etStepIdx          = Number.isFinite(eternalStepIndex!)
    ? clamp(eternalStepIndex!, 0, 43)
    : etStepIdxDerived;

  const stepLabel          = etStepIdx.toString().padStart(2, "0");
  const eternalDeg         = ((etBeatIdx + 0.5) / ETERNAL_BEATS_PER_DAY) * 360;

  const beatHue = canonical?.beatColors[etBeatIdx] ?? hue;
  const arcIndex = Math.floor(etBeatIdx / 6);

  /* ── Hand geometry ─────────────────────────────────────────── */
  const ETHERIK_FILL   = BANK_KAI_SURFACE_COLORS.eternalFill;
  const ETHERIK_STROKE = BANK_KAI_SURFACE_COLORS.eternalStroke;

  const handThickness = 1.6;
  const handLength    = R - (HALO_R + HALO_STROKE) + 0.5;

  const baseY   = C - (HALO_R + HALO_STROKE);
  const fillH   = handLength * (canonical?.eternalStepFraction ?? fracIntoBeat);
  const fillY   = baseY - fillH;

  const labelYFactor = 0.30;
  const labelY       = C - (HALO_R + HALO_STROKE) - handLength * labelYFactor;
  const labelX       = C;
  const percentY     = labelY + 6;

  const uid = useMemo(() => Math.random().toString(36).slice(2), []);

  /* ── Eternal readouts ─────────────────────────────────────── */
  const etStepStr = stepLabel;                                   // SS
  const etBeatStr = etBeatIdx.toString().padStart(2, "0");       // BB
  const eternalPulsesToday = canonical?.eternalDayPulse ?? Math.floor(normalizedEternal);
  const pulsesIntoStepET = pulsesIntoBeatET - etStepIdx * ETERNAL_PULSES_PER_STEP;
  const fracIntoStepET   = canonical?.eternalStepFraction ?? Math.max(0, Math.min(1, pulsesIntoStepET / ETERNAL_PULSES_PER_STEP));
  const etPercentIntoStep = fracIntoStepET * 100;
  const NEON_CYAN   = "#00faff" as const;
  return (
    <div
      className="kai-klock-shell"
      style={
        {
          "--hue": hue,
          "--arc": hue, // same native eternal ark as the header and details
          "--cycle": cycle,
          "--core": BANK_KAI_SURFACE_COLORS.rim,
          "--flash": BANK_KAI_SURFACE_COLORS.coordinate,
          width: "100%",
          aspectRatio: "1 / 1",
          overflow: "hidden", // iOS: clip filter/shadow bleed
        } as React.CSSProperties
      }
    >
      <svg
        className="kai-svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
      >
        {/* Rim + day progress */}
        <circle cx={C} cy={C} r={OUTER_R} className={`rim-ring ${rimFlash ? "rim-flash" : ""}`} />
        <circle cx={C} cy={C} r={R} className="day-progress-track" />
        <circle cx={C} cy={C} r={R} className="day-progress" style={{ strokeDasharray: circumference, strokeDashoffset: dashOff }} />

        {/* Beat numbers (0–35) */}
        {Array.from({ length: 36 }).map((_, i) => {
          const ang = rad(i * (360 / DOTS) - 90);
          const cf  = ((i + DOT_OFFSET + DOTS) % DOTS) / DOTS;
          return (
            <text
              key={i}
              x={C + DOT_R * Math.cos(ang)}
              y={C + DOT_R * Math.sin(ang)}
              className="beat-number"
              textAnchor="middle"
              fontSize={NUM_FONT_SIZE}
              style={{ fill: canonical?.beatColors[i] ?? `hsl(${cf * 360},100%,50%)` }}>
              {i}
            </text>
          );
        })}

        {/* Halo + micro orb */}
        <defs><radialGradient id={`centerSurface-${uid}`} cx="45%" cy="28%" r="80%"><stop offset="0%" stopColor="#263d54" /><stop offset="65%" stopColor="#1b3046" /><stop offset="100%" stopColor="#132539" /></radialGradient></defs>
        <circle cx={C} cy={C} r={HALO_R + HALO_STROKE - .8} className="center-surface" fill={`url(#centerSurface-${uid})`} />
        <circle cx={C} cy={C} r={HALO_R + HALO_STROKE} className="inner-halo" />
        <g className="orb-spin" style={{ animationDelay: `${orbDelay}s` }}>
          <circle cx={C} cy={C - (HALO_R + HALO_STROKE)} r={3.6} className="micro-orb orb-glow" />
        </g>

        {/* Eternal hand */}
        <g
          className="eternal-hand-group"
          style={{
            transform: `rotate(${eternalDeg}deg)`,
            transformOrigin: `${C}px ${C}px`,
            transition: `transform 0.6s cubic-bezier(.22,.61,.36,1)`,
          }}
        >
          {/* Outline */}
          <rect
            x={C - handThickness / 2}
            y={C - (HALO_R + HALO_STROKE) - handLength}
            width={handThickness}
            height={handLength}
            rx={handThickness / 1.5}
            className="eternal-hand"
            style={{
              fill: "transparent",
              stroke: ETHERIK_STROKE,
              strokeWidth: 0.7,
              filter: `drop-shadow(0 0 2px #eaffff) drop-shadow(0 0 6px #d9fbff)`,
              mixBlendMode: "screen",
            }}
          />

          {/* Fill through the current native step */}
          <defs>
            <linearGradient id={`eternalFill-${uid}`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%"  stopColor={ETHERIK_FILL} stopOpacity={0.15} />
              <stop offset="100%" stopColor={ETHERIK_FILL} stopOpacity={0.95} />
            </linearGradient>
          </defs>
          <rect
            x={C - handThickness / 2}
            y={fillY}
            width={handThickness}
            height={Math.max(0, fillH)}
            rx={handThickness / 2}
            className="eternal-hand-fill"
            style={{
              fill: `url(#eternalFill-${uid})`,
              filter: `drop-shadow(0 0 3px #eaffff) drop-shadow(0 0 6px #eaffff)`,
              mixBlendMode: "screen",
            }}
          />

          {/* Tip jewel */}
          <circle
            cx={C}
            cy={C - (HALO_R + HALO_STROKE) - handLength - 0.8}
            r={1.35}
            className="eternal-hand-tip"
            style={{
              fill: "#ffffff",
              filter: `drop-shadow(0 0 4px #eaffff) drop-shadow(0 0 8px #eaffff)`,
              mixBlendMode: "screen",
            }}
          />

          {/* Step digits on hand (upright) */}
          <g
            className="eternal-hand-label-wrap"
            style={{
              transform: `rotate(${-eternalDeg}deg)`,
              transformOrigin: `${labelX}px ${labelY}px`,
            }}
          >
            <text
              x={labelX - 2.2}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="central"
              className="eternal-hand-label-digit"
              fontSize={4.4}
              fontWeight={900}
              style={{
                fill: BANK_KAI_SURFACE_COLORS.eternalDigit,
                paintOrder: "stroke",
                stroke: "rgba(0,0,0,0.45)",
                strokeWidth: 0.9,
                letterSpacing: "0.4px",
                filter: `drop-shadow(0 0 2px #eaffff) drop-shadow(0 0 5px #c8fbff)`,
              }}
            >
              {stepLabel[0]}
            </text>
            <text
              x={labelX + 2.2}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="central"
              className="eternal-hand-label-digit"
              fontSize={4.4}
              fontWeight={900}
              style={{
                fill: BANK_KAI_SURFACE_COLORS.eternalDigit,
                paintOrder: "stroke",
                stroke: "rgba(0,0,0,0.45)",
                strokeWidth: 0.9,
                letterSpacing: "0.4px",
                filter: `drop-shadow(0 0 2px #eaffff) drop-shadow(0 0 5px #c8fbff)`,
              }}
            >
              {stepLabel[1]}
            </text>
          </g>

          {/* Small % badge (upright) */}
          <g transform={`rotate(${-eternalDeg} ${labelX} ${percentY})`}>
            <text
              x={labelX}
              y={percentY}
              textAnchor="middle"
              dominantBaseline="central"
              className="eternal-hand-percent"
              fontSize={3.2}
              fontWeight={800}
              style={{
                fill: "#dafeff",
                paintOrder: "stroke",
                stroke: "rgba(0,0,0,0.4)",
                strokeWidth: 0.7,
                letterSpacing: "0.25px",
                filter: `drop-shadow(0 0 2px #eaffff)`,
              }}
            >
              {/* intentionally blank per current UI */}
            </text>
          </g>
        </g>

        {/* Eternal pulses within the current day */}
        <text
          x={C}
          y={C - 15}
          className="center-sub"
          textAnchor="middle"
          fontSize={6}
          fontWeight={800}
          style={{
            fill: NEON_CYAN,
            paintOrder: "stroke",
            stroke: "#000",
            strokeWidth: 0.9,
            letterSpacing: "0.4px",
            filter: `drop-shadow(0 0 2px ${NEON_CYAN}) drop-shadow(0 0 6px ${NEON_CYAN})`,
          }}
        >
          {pulseNumber.format(eternalPulsesToday)}
        </text>

        {canonical?.coordinate && <text x={C} y={C - 18} className="center-coordinate-label" textAnchor="middle">BEAT · STEP · PULSE</text>}
        {/* Native whole-pulse projection, including the projected pulse slot. */}
        <text
          key={`et-${pulseKey}`}
          x={C}
          y={C - 3}
          className={`center-pulse ${glowPulse ? "pulse-flash" : ""}`}
          textAnchor="middle"
        >
          {canonical?.coordinate ?? `${etBeatStr}:${etStepStr}`}
        </text>

        <text x={C} y={C + 10} className={`center-day day-${slug(dayLabel)}`} textAnchor="middle">
          {dayLabel}
        </text>
        <text x={C} y={C + 21} className={`center-month month-${slug(monthLabel)}`} textAnchor="middle">
          {monthLabel}
        </text>
        <text x={C} y={C + 29} className="center-calendar-numbers" textAnchor="middle"><tspan className="center-day-number">D{monthDay}</tspan><tspan className="center-date-divider"> · </tspan><tspan className="center-month-number">M{monthIndex}</tspan></text>

        {/* Eternal pulse number (raw, global) */}
        <text x={C} y={yNums + 8} className="eternal-pulse" textAnchor="middle">
          {pulseNumber.format(kaiPulseEternal)}
        </text>

        {/* Bottom trio */}
        <text
          x={xBeat}
          y={yNums}
          className="step-percent"
          textAnchor="middle"
          fontSize={5.5}
          fill={beatHue}
          fontWeight={800}
          style={{
            filter: `drop-shadow(0 0 2px ${beatHue}) drop-shadow(0 0 5px #00faff)`,
            letterSpacing: "0.25px",
          }}
        >
          {`${etPercentIntoStep.toFixed(1)}%`}
        </text>

        <text x={xDay} y={yNums} className={`day-of-month day-${slug(dayLabel)}`} textAnchor="middle">
          {monthDay}
        </text>
        <text x={xMonth} y={yNums} className={`day-of-month month-${slug(monthLabel)}`} textAnchor="middle">
          {monthIndex}
        </text>

        {/* Canonical ark positions, referenced to the same eternal beat */}
        {ARCS.map((name, i) => {
          const ang = rad(i*(360/ARCS.length)-90);
          const x   = C + LABEL_R*Math.cos(ang);
          const y   = C + LABEL_R*Math.sin(ang) + (i === 3 ? 7 : 3);
          return (
            <React.Fragment key={name}>
              <text x={x} y={y} className={`arc-label arc-${slug(name.split(" ")[0])} ${i === arcIndex ? "active" : ""}`} textAnchor="middle">
                {ARC_SHORT[name]}
              </text>

            </React.Fragment>
          );
        })}
      </svg>
    </div>
  );
};

const ARCS: readonly ArcName[] = [
  "Ignition Ark",
  "Integration Ark",
  "Harmonization Ark",
  "Reflektion Ark",
  "Purifikation Ark",
  "Dream Ark",
];

export default KaiKlock;

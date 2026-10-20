import type { SportsArenaLiveEventMetrics, SportsArenaScoreboard } from "@/app/lib/game/sportsArena";

export const SPORTS_ARENA_BASEBALL_SCORING_VERSION = "receiz.sports_arena.baseball.scoring.v5";
export const SPORTS_ARENA_FIGHT_SCORING_VERSION = "receiz.sports_arena.fight.scoring.v1";

export type SportsArenaBaseballScoringVersion =
  | "receiz.sports_arena.baseball.scoring.v1"
  | "receiz.sports_arena.baseball.scoring.v2"
  | "receiz.sports_arena.baseball.scoring.v3"
  | "receiz.sports_arena.baseball.scoring.v4"
  | typeof SPORTS_ARENA_BASEBALL_SCORING_VERSION;

export type SportsArenaMlbSubjectRole = "batter" | "pitcher" | "fielder" | "runner";
export type SportsArenaFightEventType =
  | "significant_strike"
  | "total_strike"
  | "head_strike"
  | "body_strike"
  | "leg_strike"
  | "takedown"
  | "takedown_defense"
  | "submission_attempt"
  | "control_time"
  | "knockdown"
  | "reversal"
  | "advance"
  | "finish"
  | "win"
  | "loss";

export type SportsArenaFightScoringInput = {
  eventType: string;
  round: number;
  value?: number | null;
  method?: string | null;
  championshipRound?: boolean;
};

type ScoreInput = {
  role: SportsArenaMlbSubjectRole;
  eventType: string;
  rbi: number;
  isScoringPlay: boolean;
  isOut: boolean;
  balls?: number | null;
  strikes?: number | null;
  outs?: number | null;
  inning?: string | number | null;
  halfInning?: string | null;
  baseStateKey?: SportsArenaScoreboard["baseState"] | null;
  runnerCount?: number | null;
  runnersInScoringPosition?: number | null;
  defensiveCredits?: string[];
  detail?: string;
  metrics?: Partial<SportsArenaLiveEventMetrics> | null;
  scoreDifferential?: number | null;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function boundedCount(value: number | null | undefined, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(max, Math.trunc(value))) : 0;
}

function normalizedEventType(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function signed(value: number): string {
  const rounded = Number(value.toFixed(3));
  return `${rounded > 0 ? "+" : ""}${rounded.toFixed(Math.abs(rounded) >= 1 ? 1 : 2).replace(/0$/, "").replace(/\.0$/, ".0")}`;
}

function addScore(state: { score: number; factors: string[] }, label: string, delta: number): void {
  if (!Number.isFinite(delta) || delta === 0) return;
  const cleanDelta = Number(delta.toFixed(3));
  state.score += cleanDelta;
  state.factors.push(`${label} ${signed(cleanDelta)}`);
}

function hasDefensiveCredit(credits: readonly string[], token: string): boolean {
  return credits.some((credit) => credit.toLowerCase().includes(token));
}

function baseRunnerCount(baseStateKey: SportsArenaScoreboard["baseState"] | null | undefined): number {
  if (baseStateKey === "loaded") return 3;
  if (baseStateKey === "runners-on-1st-2nd" || baseStateKey === "runners-on-1st-3rd" || baseStateKey === "runners-on-2nd-3rd") return 2;
  if (baseStateKey === "runner-on-1st" || baseStateKey === "runner-on-2nd" || baseStateKey === "runner-on-3rd") return 1;
  return 0;
}

function runnersInScoringPosition(baseStateKey: SportsArenaScoreboard["baseState"] | null | undefined): number {
  if (baseStateKey === "loaded" || baseStateKey === "runners-on-2nd-3rd") return 2;
  if (
    baseStateKey === "runner-on-2nd" ||
    baseStateKey === "runner-on-3rd" ||
    baseStateKey === "runners-on-1st-2nd" ||
    baseStateKey === "runners-on-1st-3rd"
  ) return 1;
  return 0;
}

function inningNumber(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(1, Math.trunc(value));
  const match = String(value ?? "").match(/\d+/);
  return match ? Math.max(1, Number.parseInt(match[0] ?? "1", 10)) : 1;
}

function isHit(eventType: string): boolean {
  return eventType === "single" || eventType === "double" || eventType === "triple" || eventType === "home_run";
}

function isOnBaseEvent(eventType: string): boolean {
  return isHit(eventType) || eventType === "walk" || eventType === "intent_walk" || eventType === "hit_by_pitch";
}

function eventIsDoublePlay(eventType: string): boolean {
  return eventType.includes("double_play") || eventType === "grounded_into_double_play";
}

function detailMentionsDoublePlay(detail: string | null | undefined): boolean {
  return /\bdouble[-\s]+play\b/i.test(detail ?? "");
}

function eventIsFieldersChoice(eventType: string): boolean {
  return eventType.includes("fielders_choice") || eventType.includes("fielder_s_choice");
}

function isOutOfZone(zone: number | null): boolean {
  return zone !== null && (zone <= 0 || zone > 9);
}

function pressureIndex(args: {
  inning: number;
  outs: number;
  runners: number;
  risp: number;
  balls: number;
  strikes: number;
  bottomHalf: boolean;
  scoringPlay: boolean;
}): number {
  let pressure = 0;
  if (args.inning >= 9) pressure += 1.2;
  else if (args.inning >= 7) pressure += 0.8;
  else if (args.inning >= 5) pressure += 0.35;
  pressure += args.runners * 0.3;
  pressure += args.risp * 0.28;
  if (args.outs >= 2) pressure += 0.35;
  if (args.balls >= 3 && args.strikes >= 2) pressure += 0.45;
  if (args.bottomHalf && args.inning >= 8) pressure += 0.35;
  if (args.scoringPlay) pressure += 0.45;
  return Number(Math.min(4.2, pressure).toFixed(3));
}

function scoreboardMargin(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(-30, Math.min(30, Math.trunc(value)));
}

function closeGameLeverage(scoreDifferential: number | null, inning: number, outs: number): number {
  if (scoreDifferential === null || Math.abs(scoreDifferential) > 1 || inning < 7) return 0;
  return Number((0.44 + (inning >= 9 ? 0.22 : 0) + (outs >= 2 ? 0.12 : 0)).toFixed(3));
}

function batterScoreboardSwing(args: {
  scoreDifferential: number | null;
  rbi: number;
  inning: number;
  outs: number;
  isScoringPlay: boolean;
}): { label: string; score: number } | null {
  if (args.scoreDifferential === null || !args.isScoringPlay || args.rbi <= 0) return null;
  const previousDifferential = args.scoreDifferential - args.rbi;
  const lateBonus = args.inning >= 9 ? 0.28 : args.inning >= 7 ? 0.16 : 0;
  const twoOutBonus = args.outs >= 2 ? 0.14 : 0;
  if (previousDifferential < 0 && args.scoreDifferential > 0) {
    return { label: "go-ahead scoreboard swing", score: Number((0.84 + lateBonus + twoOutBonus + Math.min(0.36, args.rbi * 0.08)).toFixed(3)) };
  }
  if (previousDifferential < 0 && args.scoreDifferential === 0) {
    return { label: "game-tying scoreboard swing", score: Number((0.68 + lateBonus + twoOutBonus + Math.min(0.28, args.rbi * 0.06)).toFixed(3)) };
  }
  if (previousDifferential === 0 && args.scoreDifferential > 0) {
    return { label: "lead-claim scoreboard swing", score: Number((0.58 + lateBonus + twoOutBonus + Math.min(0.22, args.rbi * 0.05)).toFixed(3)) };
  }
  return null;
}

function pitcherScoreboardDamage(args: {
  scoreDifferential: number | null;
  rbi: number;
  inning: number;
  outs: number;
  isScoringPlay: boolean;
}): { label: string; score: number } | null {
  if (args.scoreDifferential === null || !args.isScoringPlay || args.rbi <= 0) return null;
  const previousDifferential = args.scoreDifferential + args.rbi;
  const latePenalty = args.inning >= 9 ? 0.28 : args.inning >= 7 ? 0.16 : 0;
  const twoOutPenalty = args.outs >= 2 ? 0.14 : 0;
  if (previousDifferential > 0 && args.scoreDifferential <= 0) {
    return { label: "lead-loss scoreboard damage", score: -Number((0.86 + latePenalty + twoOutPenalty + Math.min(0.34, args.rbi * 0.07)).toFixed(3)) };
  }
  if (previousDifferential === 0 && args.scoreDifferential < 0) {
    return { label: "go-behind scoreboard damage", score: -Number((0.68 + latePenalty + twoOutPenalty + Math.min(0.26, args.rbi * 0.06)).toFixed(3)) };
  }
  return null;
}

function offensiveRarityScore(eventType: string, rbi: number, metrics: Partial<SportsArenaLiveEventMetrics> | null | undefined): { label: string; score: number } | null {
  const distance = finiteNumber(metrics?.distanceFt);
  const exitVelocity = finiteNumber(metrics?.exitVelocityMph);
  if (eventType === "home_run" && rbi >= 4) return { label: "mythic moment rarity", score: 1.65 };
  if (eventType === "home_run" && (distance ?? 0) >= 430) return { label: "legendary moment rarity", score: 1.15 };
  if (eventType === "triple") return { label: "rare moment rarity", score: 0.85 };
  if (eventType === "home_run") return { label: "premium moment rarity", score: exitVelocity !== null && exitVelocity >= 110 ? 1.05 : 0.75 };
  if (eventType === "double") return { label: "impact moment rarity", score: 0.42 };
  if (eventType.includes("stolen_base")) return { label: "speed rarity", score: 0.42 };
  return null;
}

function damagingRarityPenalty(eventType: string, rbi: number, metrics: Partial<SportsArenaLiveEventMetrics> | null | undefined): { label: string; score: number } | null {
  const distance = finiteNumber(metrics?.distanceFt);
  const exitVelocity = finiteNumber(metrics?.exitVelocityMph);
  if (eventType === "home_run" && rbi >= 4) return { label: "damage rarity penalty", score: -1.45 };
  if (eventType === "home_run" && ((distance ?? 0) >= 430 || (exitVelocity ?? 0) >= 110)) return { label: "damage rarity penalty", score: -0.95 };
  if (eventType === "triple") return { label: "damage rarity penalty", score: -0.55 };
  if (eventType === "double") return { label: "damage rarity penalty", score: -0.32 };
  return null;
}

function expectedOutcomeSwing(eventType: string, role: SportsArenaMlbSubjectRole, runners: number, risp: number, outs: number, rbi: number, isScoringPlay: boolean): number {
  let swing = 0;
  if (eventType === "home_run") swing += 0.95;
  else if (eventType === "triple") swing += 0.72;
  else if (eventType === "double") swing += 0.48;
  else if (eventType === "single") swing += 0.24;
  else if (eventType.includes("stolen_base")) swing += 0.18;
  else if (eventIsDoublePlay(eventType)) swing -= 0.5;
  swing += rbi * 0.18;
  swing += runners * 0.1;
  swing += risp * 0.12;
  if (outs >= 2) swing += Math.sign(swing || 1) * 0.12;
  if (isScoringPlay) swing += 0.18;
  if (role === "pitcher") swing = -Math.abs(swing);
  return Number(swing.toFixed(3));
}

function defensePositionValue(detail: string, credits: readonly string[]): number {
  const haystack = `${detail} ${credits.join(" ")}`.toLowerCase();
  if (/\b(catcher|catcher_throw|caught stealing|pickoff|tag)\b/.test(haystack)) return 0.32;
  if (/\b(shortstop|third baseman|barehanded|backhand|charge)\b/.test(haystack)) return 0.28;
  if (/\b(center fielder|left fielder|right fielder|wall|warning track|deep)\b/.test(haystack)) return 0.24;
  if (/\b(second baseman|first baseman)\b/.test(haystack)) return 0.18;
  return credits.length > 0 ? 0.12 : 0;
}

function defenseRarity(detail: string, eventType: string, metrics: Partial<SportsArenaLiveEventMetrics> | null | undefined): { label: string; score: number } | null {
  const text = detail.toLowerCase();
  const distance = finiteNumber(metrics?.distanceFt);
  const robbedHomeRun = /\b(robbed|robs)\b/.test(text) && /\b(home run|wall|warning track)\b/.test(text);
  if (robbedHomeRun) return { label: "legendary defensive rarity", score: 1.35 };
  if (eventIsDoublePlay(eventType) && /\b(barehanded|diving|sliding|leaping)\b/.test(text)) return { label: "rare defensive rarity", score: 0.72 };
  if (/\b(diving|leaping|sliding|running catch|barehanded)\b/.test(text)) return { label: "premium defensive rarity", score: 0.52 };
  if ((distance ?? 0) >= 390 && /\b(catch|grab|snag)\b/.test(text)) return { label: "premium defensive rarity", score: 0.45 };
  return null;
}

function battedBallQuality(metrics: Partial<SportsArenaLiveEventMetrics> | null | undefined, eventType: string): {
  contactBonus: number;
  pitcherPenalty: number;
  factors: string[];
} {
  if (!isHit(eventType)) return { contactBonus: 0, pitcherPenalty: 0, factors: [] };
  const exitVelocity = finiteNumber(metrics?.exitVelocityMph);
  const launchAngle = finiteNumber(metrics?.launchAngleDeg);
  const distance = finiteNumber(metrics?.distanceFt);
  let contactBonus = 0;
  let pitcherPenalty = 0;
  const factors: string[] = [];

  if (exitVelocity !== null) {
    if (exitVelocity >= 110) {
      contactBonus += 0.75;
      pitcherPenalty -= 0.55;
      factors.push("elite hard contact");
    } else if (exitVelocity >= 105) {
      contactBonus += 0.55;
      pitcherPenalty -= 0.4;
      factors.push("hard contact");
    } else if (exitVelocity >= 98) {
      contactBonus += 0.3;
      pitcherPenalty -= 0.22;
      factors.push("firm contact");
    }
  }

  if (launchAngle !== null) {
    const extraBaseWindow = launchAngle >= 18 && launchAngle <= 32 && (eventType === "double" || eventType === "triple" || eventType === "home_run");
    const lineDriveWindow = launchAngle >= 8 && launchAngle <= 18 && eventType === "single";
    if (extraBaseWindow) {
      contactBonus += 0.25;
      pitcherPenalty -= 0.16;
      factors.push("barrel launch window");
    } else if (lineDriveWindow) {
      contactBonus += 0.1;
      pitcherPenalty -= 0.08;
      factors.push("line-drive hit");
    }
  }

  if (distance !== null) {
    if (eventType === "home_run" && distance >= 430) {
      contactBonus += 0.35;
      pitcherPenalty -= 0.25;
      factors.push("no-doubt distance");
    } else if (eventType === "home_run" && distance >= 400) {
      contactBonus += 0.2;
      pitcherPenalty -= 0.15;
      factors.push("deep home run");
    } else if ((eventType === "double" || eventType === "triple") && distance >= 350) {
      contactBonus += 0.2;
      pitcherPenalty -= 0.12;
      factors.push("deep extra-base contact");
    }
  }

  return {
    contactBonus: Number(contactBonus.toFixed(3)),
    pitcherPenalty: Number(pitcherPenalty.toFixed(3)),
    factors,
  };
}

function pitchDifficulty(metrics: Partial<SportsArenaLiveEventMetrics> | null | undefined, eventType: string): number {
  if (!isHit(eventType)) return 0;
  const pitchSpeed = finiteNumber(metrics?.pitchSpeedMph);
  const zone = finiteNumber(metrics?.pitchZone);
  let bonus = 0;
  if (pitchSpeed !== null && pitchSpeed >= 98) bonus += 0.2;
  else if (pitchSpeed !== null && pitchSpeed >= 95) bonus += 0.1;
  if (isOutOfZone(zone)) bonus += 0.15;
  return Number(bonus.toFixed(3));
}

function eventBaseScore(eventType: string, role: SportsArenaMlbSubjectRole, isOut: boolean): { score: number; label: string } {
  if (role === "batter" || role === "runner") {
    if (eventType === "home_run") return { score: 4.8, label: "home run" };
    if (eventType === "triple") return { score: 3.2, label: "triple" };
    if (eventType === "double") return { score: 2.4, label: "double" };
    if (eventType === "single") return { score: 1.2, label: "single" };
    if (eventType === "walk" || eventType === "intent_walk" || eventType === "hit_by_pitch") return { score: 0.8, label: "on-base event" };
    if (eventType.includes("stolen_base")) return { score: 1.2, label: "stolen base" };
    if (eventType.includes("caught_stealing") || eventType.includes("pickoff")) return { score: -0.9, label: "runner erased" };
    if (eventType === "run_scored") return { score: 0.6, label: "run scored" };
    if (eventType === "runner_advance") return { score: 0.22, label: "runner advance" };
    if (eventType === "runner_erased") return { score: -0.75, label: "runner erased" };
    if (eventType === "strikeout") return { score: -0.6, label: "strikeout" };
    if (eventIsDoublePlay(eventType)) return { score: -1.2, label: "double play" };
    if (eventIsFieldersChoice(eventType)) return { score: 0.3, label: "fielder's choice" };
    if (eventType.includes("sac_fly")) return { score: 0.5, label: "sacrifice fly" };
    if (eventType.includes("sac_bunt")) return { score: 0.35, label: "sacrifice bunt" };
    if (eventType.includes("catcher_interf")) return { score: 0.55, label: "catcher interference" };
    if (eventType.includes("batter_interference")) return { score: -0.45, label: "batter interference" };
    if (eventType.includes("field_error")) return { score: 0.45, label: "reached on error" };
    if (isOut) return { score: -0.3, label: "out recorded" };
    return { score: 0.12, label: "plate appearance recorded" };
  }

  if (eventType === "strikeout") return { score: 0.9, label: "pitcher strikeout" };
  if (eventIsDoublePlay(eventType)) return { score: 0.8, label: "double-play out" };
  if (isOut) return { score: 0.35, label: "out recorded" };
  if (eventType === "walk" || eventType === "intent_walk" || eventType === "hit_by_pitch") return { score: -0.5, label: "free base" };
  if (eventType === "single") return { score: -0.7, label: "single allowed" };
  if (eventType === "double") return { score: -1.2, label: "double allowed" };
  if (eventType === "triple") return { score: -1.6, label: "triple allowed" };
  if (eventType === "home_run") return { score: -2.4, label: "home run allowed" };
  return { score: -0.12, label: "plate event allowed" };
}

export function scoreSportsArenaMlbEvent(input: ScoreInput): { scoreDelta: number; factors: string[] } {
  const normalizedInputEventType = normalizedEventType(input.eventType);
  const eventType = detailMentionsDoublePlay(input.detail) && !isHit(normalizedInputEventType) ? "grounded_into_double_play" : normalizedInputEventType;
  const balls = boundedCount(input.balls, 4);
  const strikes = boundedCount(input.strikes, 3);
  const outs = boundedCount(input.outs, 3);
  const inning = inningNumber(input.inning);
  const runners = boundedCount(input.runnerCount ?? baseRunnerCount(input.baseStateKey), 3);
  const risp = boundedCount(input.runnersInScoringPosition ?? runnersInScoringPosition(input.baseStateKey), 2);
  const scoreDifferential = scoreboardMargin(input.scoreDifferential);
  const state = { score: 0, factors: [] as string[] };

  if (input.role === "fielder") {
    const credits = input.defensiveCredits ?? [];
    const detail = input.detail ?? "";
    const pressure = pressureIndex({
      inning,
      outs,
      runners,
      risp,
      balls,
      strikes,
      bottomHalf: input.halfInning?.toLowerCase().includes("bottom") ?? false,
      scoringPlay: input.isScoringPlay,
    });
    if (hasDefensiveCredit(credits, "putout")) addScore(state, "defensive putout", 0.45);
    if (hasDefensiveCredit(credits, "assist")) addScore(state, "defensive assist", 0.35);
    if (hasDefensiveCredit(credits, "fielded")) addScore(state, "defensive fielded", 0.18);
    if (hasDefensiveCredit(credits, "deflect")) addScore(state, "defensive deflection", 0.16);
    if (eventIsDoublePlay(eventType)) addScore(state, "double-play defense", 0.75);
    if (hasDefensiveCredit(credits, "error") || eventType.includes("field_error") || /\berror\b/i.test(detail)) addScore(state, "fielding error", -0.7);
    if (state.factors.length === 0 && credits.length > 0) addScore(state, "defensive involvement", 0.12);
    const positionValue = defensePositionValue(detail, credits);
    if (positionValue) addScore(state, "defensive position value", positionValue);
    if (state.score > 0 && /\b(diving|leaping|sliding|running catch|robbed|robs|barehanded|wall|warning track)\b/i.test(detail)) {
      addScore(state, "highlight defense", 0.75);
    }
    if (state.score > 0 && /\b(robbed|robs|wall|warning track|extra bases|home run)\b/i.test(detail)) {
      addScore(state, "run-saving defense", 0.65);
    }
    const rarity = defenseRarity(detail, eventType, input.metrics);
    if (state.score > 0 && rarity) addScore(state, rarity.label, rarity.score);
    if (state.score > 0 && pressure >= 2) addScore(state, "pressure index", Number((pressure * 0.18).toFixed(3)));
    if (state.score > 0 && (runners > 0 || risp > 0 || input.isScoringPlay)) addScore(state, "run-prevention swing", Number((0.3 + runners * 0.12 + risp * 0.18).toFixed(3)));
    if (state.score > 0) {
      const closeDefense = closeGameLeverage(scoreDifferential, inning, outs);
      if (closeDefense) addScore(state, "close-game defensive leverage", closeDefense);
    }
    if (state.score > 0 && inning >= 7) addScore(state, "late defensive leverage", 0.25);
    return { scoreDelta: Number(state.score.toFixed(3)), factors: state.factors };
  }

  const base = eventBaseScore(eventType, input.role, input.isOut);
  if (base.label) addScore(state, base.label, base.score);

  if (input.role === "batter" || input.role === "runner") {
    const batterDoublePlay = eventIsDoublePlay(eventType);
    const pressure = pressureIndex({
      inning,
      outs,
      runners,
      risp,
      balls,
      strikes,
      bottomHalf: input.halfInning?.toLowerCase().includes("bottom") ?? false,
      scoringPlay: input.isScoringPlay,
    });
    if (isHit(eventType)) {
      if (strikes >= 2) addScore(state, "two-strike hit difficulty", balls >= 3 ? 0.45 : 0.35);
      if (balls >= 3) addScore(state, "deep-count hit discipline", 0.15);
      if (runners > 0) addScore(state, "runner leverage", Number((runners * 0.15 + risp * 0.1).toFixed(3)));
      if (outs >= 2) addScore(state, "two-out hit pressure", 0.12);
      if (inning >= 7) addScore(state, "late leverage", inning >= 9 ? 0.45 : 0.3);

      const quality = battedBallQuality(input.metrics, eventType);
      if (quality.contactBonus) addScore(state, quality.factors.join(", ") || "batted-ball quality", quality.contactBonus);
      const pitchBonus = pitchDifficulty(input.metrics, eventType);
      if (pitchBonus) addScore(state, "pitch difficulty handled", pitchBonus);
      const rarity = offensiveRarityScore(eventType, input.rbi, input.metrics);
      if (rarity) addScore(state, rarity.label, rarity.score);
      const outcomeSwing = expectedOutcomeSwing(eventType, input.role, runners, risp, outs, input.rbi, input.isScoringPlay);
      if (outcomeSwing > 0 && (pressure >= 2 || eventType === "home_run" || eventType === "triple" || input.rbi > 0)) {
        addScore(state, "expected outcome swing", outcomeSwing);
      }
      if (input.isOut) addScore(state, "batter-runner erased", eventType === "single" ? -0.65 : -0.8);
    } else if (isOnBaseEvent(eventType)) {
      if (balls >= 3) addScore(state, "walk count discipline", 0.2);
      if (runners > 0) addScore(state, "runner leverage", Number((runners * 0.08).toFixed(3)));
    } else if (eventType === "strikeout") {
      if (balls >= 3 && strikes >= 2) addScore(state, "full-count strikeout", -0.25);
      if (runners > 0) addScore(state, "runner leverage", Number((-(runners * 0.12 + risp * 0.08)).toFixed(3)));
      if (outs >= 2) addScore(state, "two-out miss", -0.1);
      if (inning >= 7) addScore(state, "late strikeout pressure", inning >= 9 ? -0.25 : -0.15);
    } else if (eventIsDoublePlay(eventType)) {
      if (runners > 0) addScore(state, "rally-killing double play", -0.3);
      if (inning >= 7) addScore(state, "late double-play cost", -0.2);
    } else if (input.isOut) {
      if (runners > 0) addScore(state, "runner left aboard", Number((-(runners * 0.08)).toFixed(3)));
    }

    if (input.rbi > 0) {
      if (!batterDoublePlay) addScore(state, `${input.rbi} RBI`, input.rbi * 0.9);
    }
    if (input.isScoringPlay) addScore(state, batterDoublePlay ? "run scored during double play" : "scoring play", batterDoublePlay ? 0.15 : 0.7);
    if (!batterDoublePlay && input.rbi >= 4 && eventType === "home_run") addScore(state, "grand-slam impact", 1.2);
    if (!batterDoublePlay) {
      const scoreboardSwing = batterScoreboardSwing({
        scoreDifferential,
        rbi: input.rbi,
        inning,
        outs,
        isScoringPlay: input.isScoringPlay,
      });
      if (scoreboardSwing) addScore(state, scoreboardSwing.label, scoreboardSwing.score);
    }
    const closeLeverage = closeGameLeverage(scoreDifferential, inning, outs);
    if (!batterDoublePlay && closeLeverage && (input.isScoringPlay || input.rbi > 0 || isHit(eventType))) addScore(state, "close-game leverage", closeLeverage);
    if (!batterDoublePlay && pressure >= 2) addScore(state, "pressure index", Number((pressure * 0.22).toFixed(3)));
    if (!batterDoublePlay && inning >= 9 && input.halfInning?.toLowerCase().includes("bottom") && input.isScoringPlay) addScore(state, "walk-off stakes", 1.15);
  } else {
    const pressure = pressureIndex({
      inning,
      outs,
      runners,
      risp,
      balls,
      strikes,
      bottomHalf: input.halfInning?.toLowerCase().includes("bottom") ?? false,
      scoringPlay: input.isScoringPlay,
    });
    if (eventType === "strikeout") {
      if (strikes >= 2) addScore(state, "put-away count", 0.25);
      if (outs >= 2) addScore(state, "two-out pitcher finish", 0.12);
      if (runners > 0) addScore(state, "strand pressure", Number((runners * 0.12 + risp * 0.1).toFixed(3)));
      const zone = finiteNumber(input.metrics?.pitchZone);
      if (isOutOfZone(zone)) addScore(state, "chase finish", 0.12);
      const pitchSpeed = finiteNumber(input.metrics?.pitchSpeedMph);
      if (pitchSpeed !== null && pitchSpeed >= 98) addScore(state, "power pitch", 0.15);
    } else if (isHit(eventType)) {
      const quality = battedBallQuality(input.metrics, eventType);
      if (quality.pitcherPenalty) addScore(state, `${quality.factors[0] ?? "hard contact"} allowed`, quality.pitcherPenalty);
      if (runners > 0) addScore(state, "traffic damage", Number((-(runners * 0.12 + risp * 0.12)).toFixed(3)));
      if (inning >= 7) addScore(state, "late damage allowed", inning >= 9 ? -0.45 : -0.3);
      const rarityPenalty = damagingRarityPenalty(eventType, input.rbi, input.metrics);
      if (rarityPenalty) addScore(state, rarityPenalty.label, rarityPenalty.score);
      const outcomeSwing = expectedOutcomeSwing(eventType, input.role, runners, risp, outs, input.rbi, input.isScoringPlay);
      if (outcomeSwing < 0) addScore(state, "expected outcome swing allowed", outcomeSwing);
    } else if (eventType === "walk" || eventType === "intent_walk" || eventType === "hit_by_pitch") {
      if (balls >= 3) addScore(state, "deep-count free base", -0.15);
      if (runners > 0) addScore(state, "traffic added", Number((-(runners * 0.1)).toFixed(3)));
    } else if (input.isOut) {
      if (outs >= 2) addScore(state, "inning-control out", 0.08);
      if (runners > 0) addScore(state, "runner pressure out", Number((runners * 0.06).toFixed(3)));
    }

    if (input.rbi > 0) addScore(state, `${input.rbi} run impact`, -(input.rbi * 0.8));
    if (input.isScoringPlay) addScore(state, "scoring play allowed", -0.6);
    if (input.rbi >= 4 && eventType === "home_run") addScore(state, "grand-slam damage", -1.05);
    const scoreboardDamage = pitcherScoreboardDamage({
      scoreDifferential,
      rbi: input.rbi,
      inning,
      outs,
      isScoringPlay: input.isScoringPlay,
    });
    if (scoreboardDamage) addScore(state, scoreboardDamage.label, scoreboardDamage.score);
    const closeDamage = closeGameLeverage(scoreDifferential, inning, outs);
    if (closeDamage && (input.isScoringPlay || isHit(eventType))) addScore(state, "close-game damage", -closeDamage);
    if (closeDamage && input.isOut && state.score > 0) addScore(state, "close-game out leverage", Number((closeDamage * 0.58).toFixed(3)));
    if (pressure >= 2 && (isHit(eventType) || input.isScoringPlay)) addScore(state, "pressure damage", Number((-(pressure * 0.2)).toFixed(3)));
  }

  return { scoreDelta: Number(state.score.toFixed(3)), factors: state.factors };
}

function fightRound(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(5, Math.trunc(value)));
}

function positiveEventCount(value: number | null | undefined, fallback = 1): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(300, Number(value.toFixed(2))))
    : fallback;
}

function fightMethodBonus(method: string | null | undefined): { label: string; score: number } | null {
  const normalized = normalizedEventType(method ?? "");
  if (!normalized) return null;
  if (normalized.includes("submission")) return { label: "submission method", score: 1.4 };
  if (normalized.includes("ko") || normalized.includes("tko") || normalized.includes("knockout")) return { label: "KO/TKO method", score: 1.6 };
  if (normalized.includes("decision")) return { label: "decision closeout", score: 0.8 };
  return { label: "method closeout", score: 0.5 };
}

export function scoreSportsArenaFightEvent(input: SportsArenaFightScoringInput): { scoreDelta: number; factors: string[] } {
  const eventType = normalizedEventType(input.eventType) as SportsArenaFightEventType;
  const round = fightRound(input.round);
  const value = positiveEventCount(input.value, 1);
  const state = { score: 0, factors: [] as string[] };

  if (eventType === "significant_strike") addScore(state, "significant strikes", value * 0.35);
  else if (eventType === "total_strike") addScore(state, "total strikes", value * 0.12);
  else if (eventType === "head_strike") addScore(state, "head strikes", value * 0.42);
  else if (eventType === "body_strike") addScore(state, "body strikes", value * 0.3);
  else if (eventType === "leg_strike") addScore(state, "leg strikes", value * 0.24);
  else if (eventType === "takedown") addScore(state, "takedowns", value * 1.8);
  else if (eventType === "takedown_defense") addScore(state, "takedown defense", value * 0.65);
  else if (eventType === "submission_attempt") addScore(state, "submission attempts", value * 2.1);
  else if (eventType === "control_time") addScore(state, "control time", Math.min(4.5, value * 0.02));
  else if (eventType === "knockdown") addScore(state, "knockdowns", value * 3.4);
  else if (eventType === "reversal") addScore(state, "reversals", value * 1.15);
  else if (eventType === "advance") addScore(state, "position advances", value * 0.75);
  else if (eventType === "finish") addScore(state, "finish", 4.8);
  else if (eventType === "win") addScore(state, "win closeout", 5.2);
  else if (eventType === "loss") addScore(state, "loss closeout", -1.35);

  if (state.score > 0 && round >= 3) addScore(state, "late-round leverage", round >= 5 || input.championshipRound ? 0.45 : 0.25);
  if ((eventType === "finish" || eventType === "win") && input.method) {
    const methodBonus = fightMethodBonus(input.method);
    if (methodBonus) addScore(state, methodBonus.label, methodBonus.score);
  }

  return { scoreDelta: Number(state.score.toFixed(3)), factors: state.factors };
}

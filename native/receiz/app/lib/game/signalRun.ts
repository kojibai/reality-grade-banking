export type SignalRunEntityKind =
  | "proof"
  | "value"
  | "seal"
  | "contract"
  | "boost"
  | "multiplier"
  | "vault"
  | "boss"
  | "noise";

export type SignalRunMissionKey =
  | "proof-chain"
  | "value-route"
  | "trust-shield"
  | "market-boss"
  | "world-sprint"
  | "breakthrough-boss";

export type SignalRunActionKey =
  | "record"
  | "seal"
  | "verify"
  | "world"
  | "market"
  | "wallet"
  | "contacts"
  | "payments";

export type SignalRunAchievementKey =
  | "proof-chain"
  | "value-banker"
  | "combo-surge"
  | "trust-master"
  | "boss-breaker";

export type SignalRunRealAction = {
  key: SignalRunActionKey;
  label: string;
  href: string;
  value: string;
};

export type SignalRunMission = {
  key: SignalRunMissionKey;
  name: string;
  objective: string;
  target: number;
  primaryKind: SignalRunEntityKind;
  actionKey: SignalRunActionKey;
};

export type SignalRunDirectorInput = {
  seed: number;
  score: number;
  trust: number;
  streak: number;
  hits: number;
  level: number;
  signedIn: boolean;
  combo?: number;
  missionClears?: number;
  sector?: number;
  comeback?: boolean;
};

export type SignalRunDirectorDecision = {
  mission: SignalRunMission;
  pressure: number;
  tempoLabel: string;
  directorLine: string;
  spawnWeights: Record<SignalRunEntityKind, number>;
  routeAction: SignalRunRealAction;
};

export type SignalRunAchievement = {
  key: SignalRunAchievementKey;
  name: string;
  objective: string;
};

export type SignalRunAchievementInput = {
  score: number;
  proof: number;
  value: number;
  trust: number;
  combo: number;
  missionClears: number;
  breakthroughs: number;
};

export const SIGNAL_RUN_ADVANCEMENT_CONTRACT = {
  missionClears: 3,
  bossLocks: 4,
  advanceLabel: "Break through",
} as const;

export const SIGNAL_RUN_SECTORS = [
  {
    name: "Ledger Rush",
    rule: "Proof and value lanes accelerate together.",
  },
  {
    name: "Market Storm",
    rule: "Contracts pay more, but missed contracts bite integrity.",
  },
  {
    name: "Vault Night",
    rule: "Vault drops restore abilities and unlock safer comeback routes.",
  },
  {
    name: "World Surge",
    rule: "Boost chains open faster, and the Oracle pushes risk higher.",
  },
] as const;

export const SIGNAL_RUN_ACHIEVEMENTS: readonly SignalRunAchievement[] = [
  {
    key: "proof-chain",
    name: "Proof Chain",
    objective: "Bank 10 proof signals in one run.",
  },
  {
    key: "value-banker",
    name: "Value Banker",
    objective: "Bank 8 value signals in one run.",
  },
  {
    key: "combo-surge",
    name: "Combo Surge",
    objective: "Hold a 20-signal combo.",
  },
  {
    key: "trust-master",
    name: "Integrity Master",
    objective: "Clear 2 missions with 90% integrity or better.",
  },
  {
    key: "boss-breaker",
    name: "Boss Breaker",
    objective: "Break one boss gate and advance to the next sector.",
  },
] as const;

export const SIGNAL_RUN_REAL_ACTIONS: Record<SignalRunActionKey, SignalRunRealAction> = {
  record: {
    key: "record",
    label: "Record",
    href: "/record",
    value: "Capture a useful proof moment before it gets lost.",
  },
  seal: {
    key: "seal",
    label: "Seal",
    href: "/seal",
    value: "Turn a file into portable proof.",
  },
  verify: {
    key: "verify",
    label: "Verify",
    href: "/verify",
    value: "Check a claim from the file itself.",
  },
  world: {
    key: "world",
    label: "World",
    href: "/world",
    value: "Let the twin convert signal into next moves.",
  },
  market: {
    key: "market",
    label: "Market",
    href: "/market",
    value: "Scout live value lanes and settlement signals.",
  },
  wallet: {
    key: "wallet",
    label: "Wallet",
    href: "/wallet",
    value: "Inspect settlement readiness before a money move.",
  },
  contacts: {
    key: "contacts",
    label: "Contacts",
    href: "/contacts",
    value: "Find the next person who can turn proof into outcome.",
  },
  payments: {
    key: "payments",
    label: "Payments",
    href: "/payments",
    value: "Turn a clean value route into checkout, note proof, or settlement.",
  },
};

export const SIGNAL_RUN_MISSIONS: SignalRunMission[] = [
  {
    key: "proof-chain",
    name: "Proof Chain",
    objective: "collect proof",
    target: 7,
    primaryKind: "proof",
    actionKey: "seal",
  },
  {
    key: "value-route",
    name: "Value Route",
    objective: "bank value",
    target: 6,
    primaryKind: "value",
    actionKey: "wallet",
  },
  {
    key: "trust-shield",
    name: "Integrity Shield",
    objective: "restore integrity",
    target: 5,
    primaryKind: "seal",
    actionKey: "verify",
  },
  {
    key: "market-boss",
    name: "Market Boss",
    objective: "beat contracts",
    target: 4,
    primaryKind: "contract",
    actionKey: "market",
  },
  {
    key: "world-sprint",
    name: "World Sprint",
    objective: "chain boosts",
    target: 8,
    primaryKind: "boost",
    actionKey: "world",
  },
  {
    key: "breakthrough-boss",
    name: "Breakthrough Gate",
    objective: "break boss locks",
    target: SIGNAL_RUN_ADVANCEMENT_CONTRACT.bossLocks,
    primaryKind: "boss",
    actionKey: "world",
  },
];

function finiteNumber(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function finiteWholeNumber(value: number, fallback: number): number {
  const safe = finiteNumber(value, fallback);
  return Math.trunc(safe);
}

function clamp(value: number, min: number, max: number): number {
  const safe = finiteNumber(value, min);
  return Math.min(max, Math.max(min, safe));
}

function seededUnit(seed: number): number {
  let value = seed >>> 0;
  value += 0x6d2b79f5;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

export function signalRunSeedForDate(date = new Date()): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year * 10000 + month * 100 + day;
}

export function chooseSignalRunMission(input: SignalRunDirectorInput): SignalRunMission {
  const missionClears = finiteWholeNumber(input.missionClears ?? 0, 0);
  const trust = finiteNumber(input.trust, 84);
  const hits = finiteWholeNumber(input.hits, 0);
  const streak = finiteWholeNumber(input.streak, 0);
  const level = Math.max(1, finiteWholeNumber(input.level, 1));
  const score = Math.max(0, finiteWholeNumber(input.score, 0));

  if (missionClears >= SIGNAL_RUN_ADVANCEMENT_CONTRACT.missionClears) return SIGNAL_RUN_MISSIONS[5] ?? SIGNAL_RUN_MISSIONS[0];
  if (trust <= 38 || hits >= 4) return SIGNAL_RUN_MISSIONS[2] ?? SIGNAL_RUN_MISSIONS[0];
  if (streak >= 18 || level >= 5) return SIGNAL_RUN_MISSIONS[3] ?? SIGNAL_RUN_MISSIONS[0];
  if (input.signedIn && score >= 900) return SIGNAL_RUN_MISSIONS[4] ?? SIGNAL_RUN_MISSIONS[0];

  const seed = finiteWholeNumber(input.seed, signalRunSeedForDate());
  const choiceSeed = seed + level * 37 + streak * 11 + Math.floor(score / 150);
  const index = Math.floor(seededUnit(choiceSeed) * 2.999) % 3;
  return SIGNAL_RUN_MISSIONS[index] ?? SIGNAL_RUN_MISSIONS[0];
}

export function buildSignalRunDirectorDecision(input: SignalRunDirectorInput): SignalRunDirectorDecision {
  const mission = chooseSignalRunMission(input);
  const level = Math.max(1, finiteWholeNumber(input.level, 1));
  const streak = Math.max(0, finiteWholeNumber(input.streak, 0));
  const hits = Math.max(0, finiteWholeNumber(input.hits, 0));
  const trust = clamp(input.trust, 0, 100);
  const missionClears = Math.max(0, finiteWholeNumber(input.missionClears ?? 0, 0));
  const combo = Math.max(0, finiteWholeNumber(input.combo ?? input.streak, streak));
  const sector = Math.max(1, finiteWholeNumber(input.sector ?? 1, 1));
  const breakthroughBoss = mission.key === "breakthrough-boss";
  const comebackPressure = input.comeback ? 0.08 : 0;
  const pressure = clamp(
    0.22 + level * 0.08 + streak * 0.009 + missionClears * 0.045 + sector * 0.014 + comebackPressure - (100 - trust) * 0.003,
    0.2,
    breakthroughBoss ? 0.94 : 0.88,
  );
  const threat = clamp(0.18 + level * 0.035 + streak * 0.004 + missionClears * 0.02 + sector * 0.009 - hits * 0.012, 0.12, breakthroughBoss ? 0.54 : 0.46);
  const help = input.comeback ? 0.32 : trust < 48 ? 0.2 : 0.08;
  const routeAction = SIGNAL_RUN_REAL_ACTIONS[mission.actionKey];
  const tempoLabel = pressure > 0.72 ? "redline" : pressure > 0.5 ? "surge" : "scan";
  const directorLine =
    input.comeback
      ? "Comeback window open. Grab shields, vaults, and clean proof before the grid closes."
      : mission.key === "breakthrough-boss"
      ? "Boss locks are live. Burn clean lanes, hold integrity, and break into the next sector."
      : mission.key === "trust-shield"
      ? "Noise is cutting the lane. Shield first, score second."
      : mission.key === "market-boss"
        ? "A contract wave is open. Read the lane, then strike."
        : mission.key === "world-sprint"
          ? "The twin sees a chain. Keep boosts alive."
          : mission.key === "value-route"
            ? "Value is moving through the grid. Bank clean routes."
            : "Build the proof chain before the lane closes.";

  return {
    mission,
    pressure,
    tempoLabel,
    directorLine,
    routeAction,
    spawnWeights: {
      proof: mission.primaryKind === "proof" ? 0.3 : 0.18,
      value: mission.primaryKind === "value" ? 0.28 : 0.16,
      seal: mission.primaryKind === "seal" ? 0.28 + help : 0.1 + help,
      contract: mission.primaryKind === "contract" ? 0.24 : 0.1 + pressure * 0.04,
      boost: mission.primaryKind === "boost" ? 0.24 : 0.12,
      multiplier: combo >= 10 ? 0.11 : 0.07,
      vault: input.trust >= 72 ? 0.08 : 0.04,
      boss: breakthroughBoss ? 0.32 : missionClears >= SIGNAL_RUN_ADVANCEMENT_CONTRACT.missionClears - 1 ? 0.05 : 0,
      noise: threat,
    },
  };
}

export function scoreSignalRunCollection(kind: SignalRunEntityKind, currentTrust: number) {
  if (kind === "noise") {
    return { score: -35, proof: 0, value: 0, trust: -9, streak: false, multiplier: 0, shield: 0, magnet: 0 };
  }
  if (kind === "proof") return { score: 90, proof: 1, value: 0, trust: 2, streak: true, multiplier: 0, shield: 0, magnet: 0 };
  if (kind === "value") return { score: 120, proof: 0, value: 1, trust: 1, streak: true, multiplier: 0, shield: 0, magnet: 0 };
  if (kind === "seal") return { score: 100, proof: 1, value: 0, trust: currentTrust < 82 ? 8 : 3, streak: true, multiplier: 0, shield: 1, magnet: 0 };
  if (kind === "contract") return { score: 170, proof: 1, value: 1, trust: 2, streak: true, multiplier: 0, shield: 0, magnet: 0 };
  if (kind === "multiplier") return { score: 55, proof: 0, value: 0, trust: 1, streak: true, multiplier: 1, shield: 0, magnet: 0 };
  if (kind === "vault") return { score: 220, proof: 2, value: 2, trust: 6, streak: true, multiplier: 0, shield: 1, magnet: 1 };
  if (kind === "boss") return { score: 260, proof: 1, value: 1, trust: 3, streak: true, multiplier: 1, shield: 0, magnet: 0 };
  return { score: 70, proof: 0, value: 0, trust: 1, streak: true, multiplier: 0, shield: 0, magnet: 1 };
}

export function signalRunRank(score: number): string {
  if (score >= 5000) return "Mythic Operator";
  if (score >= 3200) return "Signal Ace";
  if (score >= 1800) return "Proof Runner";
  if (score >= 850) return "Lane Scout";
  return "New Run";
}

export function evaluateSignalRunAchievements(input: SignalRunAchievementInput): SignalRunAchievementKey[] {
  const unlocked: SignalRunAchievementKey[] = [];
  if (input.proof >= 10) unlocked.push("proof-chain");
  if (input.value >= 8) unlocked.push("value-banker");
  if (input.combo >= 20) unlocked.push("combo-surge");
  if (input.missionClears >= 2 && input.trust >= 90) unlocked.push("trust-master");
  if (input.breakthroughs >= 1) unlocked.push("boss-breaker");
  return unlocked;
}

export function signalRunDailyChallengeLabel(date = new Date()): string {
  return `Daily grid ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function signalRunSectorForLevel(sector: number): (typeof SIGNAL_RUN_SECTORS)[number] {
  const safeSector = Math.max(1, finiteWholeNumber(sector, 1));
  return SIGNAL_RUN_SECTORS[(safeSector - 1) % SIGNAL_RUN_SECTORS.length] ?? SIGNAL_RUN_SECTORS[0];
}

export function buildSignalRunBenefitPlan(
  decision: SignalRunDirectorDecision,
  input: Pick<SignalRunDirectorInput, "signedIn" | "score" | "trust" | "streak">,
): SignalRunRealAction[] {
  const plan = [decision.routeAction];

  if (input.trust < 55) {
    plan.push(SIGNAL_RUN_REAL_ACTIONS.verify);
  } else if (input.streak >= 14) {
    plan.push(SIGNAL_RUN_REAL_ACTIONS.market);
  } else if (decision.mission.key === "value-route") {
    plan.push(SIGNAL_RUN_REAL_ACTIONS.payments);
  } else {
    plan.push(SIGNAL_RUN_REAL_ACTIONS.seal);
  }

  if (input.signedIn) {
    plan.push(input.score >= 1200 ? SIGNAL_RUN_REAL_ACTIONS.world : SIGNAL_RUN_REAL_ACTIONS.contacts);
  } else {
    plan.push(SIGNAL_RUN_REAL_ACTIONS.record);
  }

  const seen = new Set<SignalRunActionKey>();
  return plan.filter((action) => {
    if (seen.has(action.key)) return false;
    seen.add(action.key);
    return true;
  }).slice(0, 3);
}

import { gunzipSync, gzipSync, strFromU8, strToU8 } from "fflate";
import { jcsCanonicalize } from "@/app/utils/jcs";
import { base64UrlDecode, base64UrlEncode, sha256Hex } from "@/app/utils/sha256";
import {
  SIGNAL_RUN_MISSIONS,
  SIGNAL_RUN_REAL_ACTIONS,
  type SignalRunAchievementKey,
  type SignalRunMission,
  type SignalRunRealAction,
} from "@/app/lib/game/signalRun";

export type SignalRunCardRarity = "signal" | "foil" | "prism" | "mythic" | "genesis";
export type SignalRunCardElement = "proof" | "value" | "trust" | "market" | "world" | "seal";
export type SignalRunCardKind = "character" | "utility" | "relic" | "field";
export type SignalRunArenaRole = "champion" | "utility" | "relic" | "field";
export type SignalRunArenaSupportSubtype = "champion" | "utility" | "relic" | "field" | "tactic" | "catalyst";
export type SignalRunWorldElement =
  | "earth"
  | "fire"
  | "water"
  | "air"
  | "lightning"
  | "plasma"
  | "metal"
  | "crystal"
  | "ice"
  | "light"
  | "shadow"
  | "gravity";

export const SIGNAL_RUN_CARD_SET_TARGET = 24;
export const SIGNAL_RUN_CARD_BINDER_STAGE_BASE = 24;
export const SIGNAL_RUN_CARD_RARITIES = ["signal", "foil", "prism", "mythic", "genesis"] as const satisfies readonly SignalRunCardRarity[];
export const SIGNAL_RUN_CARD_KINDS = ["character", "utility", "relic", "field"] as const satisfies readonly SignalRunCardKind[];
const SIGNAL_RUN_CARD_DOMAIN_ELEMENTS = ["proof", "value", "trust", "market", "world", "seal"] as const satisfies readonly SignalRunCardElement[];
export const SIGNAL_RUN_WORLD_ELEMENTS = [
  "earth",
  "fire",
  "water",
  "air",
  "lightning",
  "plasma",
  "metal",
  "crystal",
  "ice",
  "light",
  "shadow",
  "gravity",
] as const satisfies readonly SignalRunWorldElement[];

export type SignalRunCardEvolutionStage = "origin" | "ascendant" | "apex";
export type SignalRunCardRiskTier = "stable" | "charged" | "volatile" | "legendary";
export type SignalRunCardFinishTreatment =
  | "signal-matte"
  | "line-foil"
  | "prism-spectrum"
  | "mythic-spectrum"
  | "mythic-crown"
  | "genesis-spectrum";

export type SignalRunCardElementalAffinity = {
  elements: [SignalRunWorldElement, SignalRunWorldElement];
  catalyst: SignalRunWorldElement;
  resonance: string;
  fieldName: string;
  arenaModifier: string;
  elementalRule: string;
};

export type SignalRunCardCharacterAttributes = {
  force: number;
  guard: number;
  tempo: number;
  focus: number;
  resonance: number;
};

export type SignalRunCardCharacterGender = "female" | "male";

export type SignalRunCardCharacter = {
  characterId: string;
  name: string;
  gender?: SignalRunCardCharacterGender;
  epithet: string;
  lineage: string;
  archetype: string;
  temperament: string;
  signatureSkill: string;
  originStory: string;
  attributes: SignalRunCardCharacterAttributes;
  domains: [SignalRunCardElement, SignalRunCardElement];
  elements: [SignalRunCardElement, SignalRunCardElement];
  naturalElements: [SignalRunWorldElement, SignalRunWorldElement];
  elementalAffinity: SignalRunCardElementalAffinity;
  avatarMark: string;
};

export type SignalRunCardProgression = {
  level: number;
  xp: number;
  stage: SignalRunCardEvolutionStage;
  nextEvolutionName: string | null;
  riskTier: SignalRunCardRiskTier;
  upgradeSlots: number;
  combineFamily: string;
  signalRunUpgradeRule: string;
  combineRule: string;
  evolutionRule: string;
  arenaRule: string;
};

export type SignalRunCardFinishProfile = {
  treatment: SignalRunCardFinishTreatment;
  finishName: string;
  patternName: string;
  revealFeature: string;
  scarcityCode: string;
};

export type SignalRunPlayableClass =
  | "proof-guard"
  | "value-engine"
  | "trust-shield"
  | "market-strike"
  | "world-chain"
  | "breakthrough-relic"
  | "field-command";

export type SignalRunCardStats = {
  score: number;
  proof: number;
  value: number;
  trust: number;
  peakCombo: number;
  missionClears: number;
  breakthroughs: number;
  sector: number;
  level: number;
};

export type SignalRunCardIdentity = {
  signedIn: boolean;
  username: string | null;
  displayHandle: string;
  identityFingerprint: string;
  creationSigilSeed: string;
};

export type SignalRunCardUtility = {
  playableIn: "receiz-signal-circuit";
  futureGame: "signal-arena";
  playableClass: SignalRunPlayableClass;
  artifactName: string;
  abilityName: string;
  abilityText: string;
  power: number;
  arenaSignature: string;
  synergyTags: string[];
  deckLimit: 1 | 2 | 3;
  tacticalRole: "defender" | "engine" | "striker" | "linker" | "relic";
  nonFinancialUtility: true;
};

export type SignalRunCardStrategyProfile = {
  schema: "receiz.signal_run.card.strategy.v1";
  cardKind: SignalRunCardKind;
  arenaSlot: SignalRunArenaRole;
  loadoutCost: 1 | 2 | 3 | 4;
  persistence: "champion" | "single-use" | "match-relic" | "arena-field";
  activationWindow: "pre-fight" | "reaction" | "combo" | "field";
  primaryStat: "level" | "power" | "control" | "guard" | "tempo" | "resonance";
  secondaryStat: "force" | "focus" | "stability" | "pressure" | "catalyst" | "resonance";
  arenaText: string;
  counterplay: string;
  comboTags: string[];
  upgradeRecipe: string;
};

export type SignalRunCardRewardProfile = {
  schema: "receiz.signal_run.card.reward.v1";
  rewardBand: "registered" | "proven" | "elite" | "masterwork" | "genesis";
  rarityGate: SignalRunCardRarity;
  nextRarity: SignalRunCardRarity | null;
  scarcity: {
    schema: "receiz.signal_run.card.scarcity.v1";
    label: string;
    denominator: number;
    rarityDenominator: number;
    stageMultiplier: number;
    performanceMultiplier: number;
    basis: string;
  };
  earnedReason: string;
  cardKindReason: string;
  thresholdSummary: string;
  performanceBasis: Array<{
    key:
      | "score"
      | "breakthroughs"
      | "peakCombo"
      | "trust"
      | "missionClears"
      | "achievements"
      | "proof"
      | "value"
      | "sector"
      | "level"
      | "runOrdinal";
    label: string;
    value: number;
    target: number;
    weight: number;
    complete: boolean;
  }>;
  rewardFingerprint: string;
};

export type SignalRunCardArenaLoadoutProfile = {
  schema: "receiz.signal_run.card.arena_loadout.v1";
  role: SignalRunArenaRole;
  deckRoleLabel: "Champion" | "Utility" | "Relic" | "Field";
  deckSlot: "champion" | "utility" | "relic" | "field";
  energyCost: 1 | 2 | 3 | 4;
  deckLimit: 1 | 2 | 3;
  activationTiming: "opening" | "pre-fight" | "reaction" | "combo" | "field";
  tempoClass: "fast" | "balanced" | "heavy" | "decisive";
  compatibleElements: SignalRunWorldElement[];
  strongInto: SignalRunWorldElement[];
  weakInto: SignalRunWorldElement[];
  comboHooks: string[];
  battleRule: string;
  equipRule: string;
  upgradePath: string;
  scoringBasis: string;
};

export type SignalRunCardBattleProfile = {
  schema: "receiz.signal_run.card.battle.v1";
  battleId: string;
  arenaGame: "signal-arena";
  cardKind: SignalRunCardKind;
  supportSubtype: SignalRunArenaSupportSubtype;
  battleRole: "champion" | "burst" | "counter" | "equipment" | "field-control" | "evolution";
  useLimit: "persistent" | "once" | "match" | "field-window";
  upgradeMode: "evolves" | "feeds-champion" | "attaches" | "shapes-field" | "catalyzes";
  battleRating: number;
  baseDamage: number;
  baseGuard: number;
  baseTempo: number;
  accuracy: number;
  criticalWindow: number;
  energyCost: 1 | 2 | 3 | 4;
  compatibleElements: SignalRunWorldElement[];
  strongInto: SignalRunWorldElement[];
  weakInto: SignalRunWorldElement[];
  openingMove: string;
  counterMove: string;
  finisherMove: string;
  resolveRule: string;
  sealedBattleLogRule: string;
};

export type SignalRunCardMechanicsProfile = {
  schema: "receiz.signal_run.card.mechanics.v1";
  cardKind: SignalRunCardKind;
  rarityClass: string;
  issueLine: string;
  acquisition: {
    source: "signal-run";
    performanceGate: string;
    scoreBand: "registered" | "proven" | "elite" | "masterwork" | "immutable";
    score: number;
    peakCombo: number;
    integrity: number;
    breakthroughs: number;
    missionClears: number;
    earnedWhy: string;
  };
  economy: {
    deckSlot: SignalRunArenaRole;
    energyCost: 1 | 2 | 3 | 4;
    deckLimit: 1 | 2 | 3;
    useLimit: SignalRunCardBattleProfile["useLimit"];
    persistence: SignalRunCardStrategyProfile["persistence"];
    timing: SignalRunCardArenaLoadoutProfile["activationTiming"];
    riskTier: SignalRunCardRiskTier;
    upgradeSlots: number;
    valueRole: "champion-core" | "burst-play" | "match-attachment" | "arena-condition";
  };
  targeting: {
    validTargets: string[];
    compatibleElements: SignalRunWorldElement[];
    strongInto: SignalRunWorldElement[];
    weakInto: SignalRunWorldElement[];
    counteredBy: SignalRunWorldElement[];
    targetRule: string;
  };
  strategy: {
    primaryPlan: string;
    comboPlan: string;
    counterplay: string;
    winCondition: string;
    tempoWindow: SignalRunCardArenaLoadoutProfile["tempoClass"];
    decisionSkill: string;
  };
  progression: {
    canEvolve: boolean;
    evolvesBy: string;
    arenaVictoryGrowth: string;
    victoryMilestones: Array<{
      wins: number;
      unlock: string;
      statBonus: "level" | "power" | "guard" | "tempo" | "focus" | "resonance";
    }>;
    combinesWith: string[];
    upgradeMaterial: string;
    riskRule: string;
    permanenceRule: string;
  };
  outcome: {
    arenaUse: string;
    signalRunUse: string;
    collectionUse: string;
    proofUse: string;
  };
};

export type SignalRunCardVisualProfile = {
  cardKind: SignalRunCardKind;
  subjectName: string;
  imageRole: "champion-portrait" | "utility-relic" | "relic-equipment" | "field-arena";
  renderStyle: "cinematic-realistic";
  visualSeed: string;
  paletteName: string;
  silhouette: "sentinel" | "strider" | "forgemind" | "oracle" | "vanguard" | "relic-core";
  rarityAura: string;
  detailMotifs: string[];
  artPrompt: string;
  composition: string;
  materialLanguage: string;
  environment: string;
};

export type SignalRunCardArtDirective = {
  schema: "receiz.signal_run.card.art_directive.v1";
  renderId: string;
  collectibleId: string;
  claimHash: string;
  subjectName: string;
  subjectKind: SignalRunCardKind;
  visualSeed: string;
  prompt: string;
  negativePrompt: string;
};

export type SignalRunCardArenaProfile = {
  role: SignalRunArenaRole;
  uploadRule: string;
  useRule: string;
  elementStrengths: SignalRunWorldElement[];
  elementWeaknesses: SignalRunWorldElement[];
  skills: Array<{
    key: string;
    name: string;
    element: SignalRunWorldElement;
    text: string;
    power: number;
  }>;
  champion?: {
    championId: string;
    acceptsUtilityCards: true;
    evolutionLineage: string;
    utilitySlots: number;
  };
  utilityCard?: {
    utilityId: string;
    singleUse: true;
    target: "champion";
    compatibleElements: SignalRunWorldElement[];
    effectName: string;
    effectText: string;
    powerDelta: number;
  };
  relicCard?: {
    relicId: string;
    attachTo: "champion";
    persistent: true;
    relicSlot: "core" | "armor" | "weapon" | "sigil";
    compatibleLineages: string[];
    effectName: string;
    effectText: string;
    statBonus: Pick<SignalRunCardCharacterAttributes, "force" | "guard" | "tempo" | "focus" | "resonance">;
  };
  fieldCard?: {
    fieldId: string;
    durationTurns: 3 | 4 | 5;
    fieldElement: SignalRunWorldElement;
    boostedElements: SignalRunWorldElement[];
    suppressedElements: SignalRunWorldElement[];
    effectName: string;
    effectText: string;
  };
};

export type SignalRunCardProvenance = {
  originalEarnerFingerprint: string;
  currentOwnerFingerprint: string;
  achievementTransferable: false;
  collectibleTransferable: true;
  transferState: "held-by-earner";
};

export type SignalRunCardClaim = {
  schema: "receiz.signal_run.card.v1";
  collectibleId: string;
  achievementSealId: string;
  season: "signal-run-s01";
  edition: "genesis";
  cardNumber: string;
  title: string;
  rank: string;
  rarity: SignalRunCardRarity;
  cardKind: SignalRunCardKind;
  earnedAtMs: number;
  dailySeed: number;
  runOrdinal: number;
  missionKey: SignalRunMission["key"];
  missionName: string;
  achievements: SignalRunAchievementKey[];
  stats: SignalRunCardStats;
  identity: SignalRunCardIdentity;
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  finish: SignalRunCardFinishProfile;
  utility: SignalRunCardUtility;
  strategy: SignalRunCardStrategyProfile;
  reward: SignalRunCardRewardProfile;
  arenaLoadout: SignalRunCardArenaLoadoutProfile;
  battle: SignalRunCardBattleProfile;
  mechanics: SignalRunCardMechanicsProfile;
  visual: SignalRunCardVisualProfile;
  arena: SignalRunCardArenaProfile;
  derivation?: SignalRunCardDerivationProfile;
  provenance: SignalRunCardProvenance;
  routeActions: Array<Pick<SignalRunRealAction, "key" | "label" | "href">>;
  sealHash: string;
  claimHash: string;
};

export type SignalRunCardCollectionProgress = {
  totalCards: number;
  uniqueCards: number;
  setIdentity: string;
  setTarget: number;
  setStage: number;
  stageTitle: string;
  stageStart: number;
  stageSize: number;
  nextStageTarget: number;
  setPercent: number;
  stageStatus: string;
  milestoneReward: string;
  rarityScore: number;
  highestRarity: SignalRunCardRarity | null;
  rarityCounts: Record<SignalRunCardRarity, number>;
  kindCounts: Record<SignalRunCardKind, number>;
  elementCounts: Partial<Record<SignalRunWorldElement, number>>;
  lineageCounts: Record<string, number>;
  playableClasses: SignalRunPlayableClass[];
  arenaReadyDecks: number;
  arenaDeckRoleCounts: Record<SignalRunArenaRole, number>;
  battleRatingTotal: number;
  battleRatingAverage: number;
  supportSubtypeCounts: Record<SignalRunArenaSupportSubtype, number>;
  expansionRule: string;
  collectionGoals: Array<{
    key: "champion" | "support" | "elements" | "lineage" | "arena" | "season" | "rating";
    label: string;
    current: number;
    target: number;
    complete: boolean;
  }>;
  nextChase: {
    key: "champion" | "support" | "elements" | "lineage" | "arena" | "season" | "rating";
    label: string;
    current: number;
    target: number;
    complete: boolean;
    detail: string;
  };
  completed: boolean;
};

export type SignalRunCardEconomySimulation = {
  schema: "receiz.signal_run.card.economy_simulation.v1";
  seed: number;
  runs: number;
  rarityCounts: Record<SignalRunCardRarity, number>;
  kindCounts: Record<SignalRunCardKind, number>;
  weakEliteLeaks: number;
  genesisRatePerMillion: number;
  mythicRatePerMillion: number;
  prismRatePerMillion: number;
  maxSignalScore: number;
  maxMythicScore: number;
  maxGenesisScore: number;
  gateSummary: string;
};

export type SignalRunArenaBattleResult = "win" | "loss" | "draw";
export type SignalRunCardAppendKind = "battle" | "victory-growth" | "utility-feed" | "combine" | "evolution" | "transfer";
export type SignalRunArenaStatKey = "level" | "power" | "guard" | "tempo" | "focus" | "resonance";
export type SignalRunArenaStatDeltas = Partial<Record<SignalRunArenaStatKey, number>>;

export type SignalRunArenaRulebook = {
  schema: "receiz.signal_arena.rulebook.v1";
  deck: {
    champion: 1;
    utilities: 3;
    relics: 1;
    fields: 1;
    maxEnergy: 10;
    rule: string;
  };
  cardTypes: Record<SignalRunCardKind, {
    role: SignalRunArenaRole;
    purpose: string;
    deckRule: string;
    growthRule: string;
  }>;
  elements: Array<{
    element: SignalRunWorldElement;
    strongInto: SignalRunWorldElement;
    weakInto: SignalRunWorldElement;
    strategy: string;
  }>;
  battle: {
    winRule: string;
    timingRule: string;
    counterplayRule: string;
  };
  appendLaw: string;
};

export type SignalRunArenaElementMatchup = {
  schema: "receiz.signal_arena.element_matchup.v1";
  attacker: [SignalRunWorldElement, SignalRunWorldElement];
  defender: [SignalRunWorldElement, SignalRunWorldElement];
  advantages: SignalRunWorldElement[];
  disadvantages: SignalRunWorldElement[];
  multiplier: 0.75 | 0.88 | 1 | 1.12 | 1.25;
  explanation: string;
};

export type SignalRunArenaBattleWindow = "opening" | "field" | "reaction" | "combo" | "finisher";
export type SignalRunArenaBattleActor = "champion" | "opponent" | "support";

export type SignalRunArenaBattleTurn = {
  turn: number;
  window: SignalRunArenaBattleWindow;
  actor: SignalRunArenaBattleActor;
  sourceName: string;
  sourceCollectibleId: string | null;
  element: SignalRunWorldElement | null;
  title: string;
  championDelta: number;
  opponentDelta: number;
  line: string;
};

export type SignalRunArenaSupportResolution = {
  card: SignalRunArenaCardRef;
  role: SignalRunArenaRole;
  energyCost: number;
  compatible: boolean;
  score: number;
  timing: SignalRunCardArenaLoadoutProfile["activationTiming"];
  line: string;
};

export type SignalRunArenaBattleResolution = {
  schema: "receiz.signal_arena.battle_resolution.v1";
  rulebookVersion: SignalRunArenaRulebook["schema"];
  seed: number;
  matchId: string;
  legal: boolean;
  energy: number;
  maxEnergy: number;
  result: SignalRunArenaBattleResult;
  championScore: number;
  opponentScore: number;
  margin: number;
  champion: SignalRunArenaCardRef;
  opponent: SignalRunArenaCardRef | null;
  supports: SignalRunArenaSupportResolution[];
  matchup: SignalRunArenaElementMatchup | null;
  turns: SignalRunArenaBattleTurn[];
  appendPlan: SignalRunCardAppendKind[];
  decisionLine: string;
  rewardLine: string;
};

export type SignalRunArenaCardRef = {
  collectibleId: string;
  claimHash: string;
  cardKind: SignalRunCardKind;
  arenaRole: SignalRunArenaRole;
  rarityClass: string;
  issueLine: string;
  name: string;
  lineage: string;
  gender?: SignalRunCardCharacterGender;
  naturalElements: [SignalRunWorldElement, SignalRunWorldElement];
  battleRating: number;
};

export type SignalRunCardDerivationParent = SignalRunArenaCardRef & {
  role: "parent";
};

export type SignalRunCardChildDerivationProfile = {
  schema: "receiz.signal_run.card.derivation.v1";
  derivationKind: "child";
  parentA: SignalRunCardDerivationParent;
  parentB: SignalRunCardDerivationParent;
  combineAppendHash: string;
  childSeed: string;
  inheritedLineage: string;
  inheritedElements: [SignalRunWorldElement, SignalRunWorldElement];
  compatibilityRule: string;
  inheritanceRule: string;
  permanenceRule: string;
};

export type SignalRunCardPackDerivationProfile = {
  schema: "receiz.signal_run.card.derivation.v1";
  derivationKind: "pack";
  packId: string;
  packName: string;
  purchaseId: string;
  purchaseClientNonce: string;
  packSeedHash: string;
  slotIndex: number;
  packCardCount: number;
  rarityClass: string;
  oddsLine: string;
  packRule: string;
  permanenceRule: string;
};

export type SignalRunCardDerivationProfile =
  | SignalRunCardChildDerivationProfile
  | SignalRunCardPackDerivationProfile;

export type SignalRunCardLineageHeadState = {
  schema: "receiz.signal_run.card.lineage_head.v1";
  lineageKey: string;
  activeHeadCollectibleId: string;
  activeHeadClaimHash: string;
  visibleStageIds: string[];
  rule: string;
};

export type SignalRunCardAppendPayload =
  | {
      kind: "battle";
      matchId: string;
      result: SignalRunArenaBattleResult;
      turns: number;
      opponent: SignalRunArenaCardRef | null;
      supports: SignalRunArenaCardRef[];
      elementalMatchup: SignalRunArenaElementMatchup | null;
      championScore?: number;
      opponentScore?: number;
      energy?: number;
      legal?: boolean;
      turnLog?: SignalRunArenaBattleTurn[];
      decisionLine?: string;
      ratingDelta: number;
      battleRule: string;
    }
  | {
      kind: "victory-growth";
      winsAfter: number;
      milestone: SignalRunCardMechanicsProfile["progression"]["victoryMilestones"][number] | null;
      statDeltas: SignalRunArenaStatDeltas;
      sourceBattleAppendHash: string | null;
      growthRule: string;
    }
  | {
      kind: "utility-feed";
      utility: SignalRunArenaCardRef | null;
      consumed: true;
      legal: boolean;
      statDeltas: SignalRunArenaStatDeltas;
      feedRule: string;
    }
  | {
      kind: "combine";
      sources: SignalRunArenaCardRef[];
      compatible: boolean;
      outputLineage: string;
      childEligible?: boolean;
      childSeed?: string | null;
      pairingRule?: string;
      statDeltas: SignalRunArenaStatDeltas;
      combineRule: string;
    }
  | {
      kind: "evolution";
      fromStage: SignalRunCardEvolutionStage;
      toStage: SignalRunCardEvolutionStage;
      evolvedCard: SignalRunArenaCardRef | null;
      sources: SignalRunArenaCardRef[];
      statDeltas: SignalRunArenaStatDeltas;
      evolutionRule: string;
    }
  | {
      kind: "transfer";
      fromOwnerFingerprint: string;
      toOwnerFingerprint: string;
      ownershipRule: string;
    };

export type SignalRunCardAppendRecord = {
  schema: "receiz.signal_run.card.append.v1";
  appendId: string;
  appendKind: SignalRunCardAppendKind;
  rulebookVersion: SignalRunArenaRulebook["schema"];
  createdAtMs: number;
  actorFingerprint: string;
  base: SignalRunArenaCardRef;
  previousAppendHash: string | null;
  payload: SignalRunCardAppendPayload;
  appendLaw: string;
  appendHash: string;
};

/**
 * Projects append history from the sealed predecessor graph. Chronos fields are
 * descriptive only and never participate in causal sequence.
 */
export function orderSignalRunCardAppendsByChain<
  T extends Pick<SignalRunCardAppendRecord, "appendHash" | "previousAppendHash">,
>(appends: readonly T[]): T[] {
  const byHash = new Map<string, T>();
  for (const append of appends) if (!byHash.has(append.appendHash)) byHash.set(append.appendHash, append);
  const ordered: T[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (append: T) => {
    if (visited.has(append.appendHash)) return;
    if (visiting.has(append.appendHash)) return;
    visiting.add(append.appendHash);
    const predecessor = append.previousAppendHash ? byHash.get(append.previousAppendHash) : null;
    if (predecessor) visit(predecessor);
    visiting.delete(append.appendHash);
    visited.add(append.appendHash);
    ordered.push(append);
  };
  for (const append of [...byHash.values()].sort((left, right) => left.appendHash.localeCompare(right.appendHash))) visit(append);
  return ordered;
}

export type BuildSignalRunCardAppendRecordInput = {
  appendKind: SignalRunCardAppendKind;
  baseCard: SignalRunCardClaim;
  sourceCards?: SignalRunCardClaim[];
  actorFingerprint?: string | null;
  createdAtMs?: number;
  previousAppendHash?: string | null;
  battleResult?: SignalRunArenaBattleResult;
  turns?: number;
  battleResolution?: SignalRunArenaBattleResolution | null;
  winsAfter?: number;
  sourceBattleAppendHash?: string | null;
  evolvedCard?: SignalRunCardClaim | null;
  newOwnerFingerprint?: string | null;
};

export type SignalRunCardEffectiveArenaState = {
  schema: "receiz.signal_run.card.effective_arena_state.v1";
  base: SignalRunArenaCardRef;
  appendCount: number;
  verifiedAppendHashes: string[];
  ignoredAppendHashes: string[];
  wins: number;
  losses: number;
  draws: number;
  level: number;
  power: number;
  guard: number;
  tempo: number;
  focus: number;
  resonance: number;
  evolutionStage: SignalRunCardEvolutionStage;
  consumedUtilityIds: string[];
  attachedRelicIds: string[];
  activeFieldIds: string[];
  stateRule: string;
};

export type SignalRunCardBattleVisualTone = "unmarked" | "heated" | "scarred" | "seasoned" | "champion";
export type SignalRunCardArenaPlayState = "active" | "wounded" | "critical" | "retired";

export type SignalRunCardBattleVisualState = {
  schema: "receiz.signal_run.card.battle_visual.v1";
  battleCount: number;
  wins: number;
  losses: number;
  draws: number;
  severeLosses: number;
  currentStreakKind: SignalRunArenaBattleResult | "none";
  currentStreak: number;
  heatLevel: number;
  scarLevel: number;
  trophyLevel: number;
  retirementPressure: number;
  playState: SignalRunCardArenaPlayState;
  canBattle: boolean;
  statusLabel: string;
  tone: SignalRunCardBattleVisualTone;
  ribbonLabel: string;
  shortLine: string;
  stateHash: string;
  trophies: Array<{
    key: string;
    x: number;
    y: number;
    size: number;
  }>;
  scars: Array<{
    key: string;
    x: number;
    y: number;
    rotate: number;
    length: number;
    intensity: number;
  }>;
};

export type SignalRunArenaChallengeTier = "training" | "favored" | "contested" | "danger" | "ascension" | "locked";

export type SignalRunArenaChallengeProfile = {
  schema: "receiz.signal_arena.challenge_profile.v1";
  tier: SignalRunArenaChallengeTier;
  tierLabel: string;
  readiness: number;
  winChance: number;
  danger: number;
  canAdmit: boolean;
  energyLine: string;
  advantageLine: string;
  pressureLine: string;
  rewardLine: string;
  stakeLine: string;
  nextMove: string;
  rosterGaps: Array<"champion" | "utility" | "relic" | "field" | "energy" | "counter" | "retired">;
};

export type SignalRunCardRecordPointer = {
  slug: string;
  code: string;
  pulse: string;
  ms: string;
};

export type BuildSignalRunCardInput = {
  dailySeed: number;
  runOrdinal: number;
  rank: string;
  mission: SignalRunMission;
  achievements: SignalRunAchievementKey[];
  routeActions: SignalRunRealAction[];
  stats: SignalRunCardStats;
  signedIn: boolean;
  username?: string | null;
  uid?: string | null;
  earnedAtMs?: number;
  forcedCardKind?: SignalRunCardKind;
  derivation?: SignalRunCardDerivationProfile | null;
};

export type BuildSignalRunChildCardInput = {
  parentA: SignalRunCardClaim;
  parentB: SignalRunCardClaim;
  combineAppend: SignalRunCardAppendRecord;
  signedIn: boolean;
  username?: string | null;
  uid?: string | null;
  earnedAtMs?: number;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function finiteWhole(value: number, fallback: number, min = 0, max = 999_999_999): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeUsername(value: string | null | undefined): string | null {
  const trimmed = typeof value === "string" ? value.trim().replace(/^@+/, "") : "";
  return trimmed ? trimmed.slice(0, 40) : null;
}

function normalizeStats(stats: SignalRunCardStats): SignalRunCardStats {
  return {
    score: finiteWhole(stats.score, 0),
    proof: finiteWhole(stats.proof, 0),
    value: finiteWhole(stats.value, 0),
    trust: finiteWhole(stats.trust, 0, 0, 100),
    peakCombo: finiteWhole(stats.peakCombo, 0),
    missionClears: finiteWhole(stats.missionClears, 0),
    breakthroughs: finiteWhole(stats.breakthroughs, 0),
    sector: finiteWhole(stats.sector, 1, 1),
    level: finiteWhole(stats.level, 1, 1),
  };
}

type SignalRunRarityGate = {
  rarity: Exclude<SignalRunCardRarity, "signal">;
  score: number;
  breakthroughs: number;
  peakCombo: number;
  trust: number;
  missionClears: number;
  achievements: number;
  proof?: number;
  value?: number;
  sector?: number;
  level?: number;
  runOrdinal?: number;
};

const SIGNAL_RUN_RARITY_GATES = [
  {
    rarity: "foil",
    score: 80_000,
    breakthroughs: 0,
    peakCombo: 34,
    trust: 78,
    missionClears: 3,
    achievements: 1,
    sector: 3,
  },
  {
    rarity: "prism",
    score: 220_000,
    breakthroughs: 2,
    peakCombo: 72,
    trust: 88,
    missionClears: 6,
    achievements: 3,
    sector: 5,
    level: 14,
  },
  {
    rarity: "mythic",
    score: 450_000,
    breakthroughs: 6,
    peakCombo: 115,
    trust: 95,
    missionClears: 10,
    achievements: 5,
    proof: 24,
    value: 22,
    sector: 8,
    level: 26,
  },
  {
    rarity: "genesis",
    score: 1_000_000,
    breakthroughs: 12,
    peakCombo: 180,
    trust: 99,
    missionClears: 16,
    achievements: 5,
    proof: 42,
    value: 42,
    sector: 12,
    level: 42,
  },
] as const satisfies readonly SignalRunRarityGate[];

function rarityGateFor(rarity: SignalRunCardRarity): SignalRunRarityGate | null {
  return SIGNAL_RUN_RARITY_GATES.find((gate) => gate.rarity === rarity) ?? null;
}

function earnedRouteIntegrityForRarity(stats: SignalRunCardStats): number {
  const scoreFloor =
    stats.score >= 300_000 ? 82 :
      stats.score >= 220_000 ? 78 :
        stats.score >= 160_000 ? 72 :
          stats.score >= 90_000 ? 66 :
            0;
  const depthFloor =
    stats.sector >= 16 ? 82 :
      stats.sector >= 13 ? 78 :
        stats.sector >= 9 ? 72 :
          stats.sector >= 6 ? 66 :
            0;
  const routeFloor =
    stats.missionClears >= 6 ? 82 :
      stats.missionClears >= 4 ? 76 :
        stats.missionClears >= 2 ? 70 :
          0;
  const comboFloor =
    stats.peakCombo >= 72 ? 82 :
      stats.peakCombo >= 58 ? 78 :
        stats.peakCombo >= 34 ? 72 :
          0;
  const breakthroughFloor =
    stats.breakthroughs >= 2 ? 82 :
      stats.breakthroughs >= 1 ? 74 :
        0;
  return Math.min(88, Math.max(scoreFloor, depthFloor, routeFloor, comboFloor, breakthroughFloor));
}

function nextRarityAfter(rarity: SignalRunCardRarity): SignalRunCardRarity | null {
  const index = SIGNAL_RUN_CARD_RARITIES.indexOf(rarity);
  return index >= 0 ? SIGNAL_RUN_CARD_RARITIES[index + 1] ?? null : "foil";
}

function meetsRarityGate(
  gate: SignalRunRarityGate,
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[],
  runOrdinal: number,
): boolean {
  const achievementCount = achievements.length;
  const base =
    stats.score >= gate.score &&
    stats.peakCombo >= gate.peakCombo &&
    stats.trust >= gate.trust &&
    stats.missionClears >= gate.missionClears;
  const fullGate = base &&
    stats.breakthroughs >= gate.breakthroughs &&
    achievementCount >= gate.achievements &&
    (gate.proof === undefined || stats.proof >= gate.proof) &&
    (gate.value === undefined || stats.value >= gate.value) &&
    (gate.sector === undefined || stats.sector >= gate.sector) &&
    (gate.level === undefined || stats.level >= gate.level) &&
    (gate.runOrdinal === undefined || runOrdinal === gate.runOrdinal);
  if (fullGate) return true;

  const routeIntegrity = Math.max(stats.trust, earnedRouteIntegrityForRarity(stats));

  if (gate.rarity === "foil") {
    return stats.score >= 160_000 &&
      stats.peakCombo >= 28 &&
      routeIntegrity >= 70 &&
      stats.missionClears >= 2 &&
      (stats.sector >= 8 || stats.level >= 18 || stats.breakthroughs >= 1 || achievementCount >= 1);
  }

  if (gate.rarity === "prism") {
    return stats.score >= 300_000 &&
      stats.peakCombo >= 58 &&
      routeIntegrity >= 82 &&
      stats.missionClears >= 5 &&
      stats.sector >= 9 &&
      stats.level >= 12 &&
      (stats.breakthroughs >= 2 || achievementCount >= 3);
  }

  return false;
}

function rarityForStats(stats: SignalRunCardStats, achievements: SignalRunAchievementKey[], runOrdinal: number): SignalRunCardRarity {
  for (let index = SIGNAL_RUN_RARITY_GATES.length - 1; index >= 0; index -= 1) {
    const gate = SIGNAL_RUN_RARITY_GATES[index];
    if (gate && meetsRarityGate(gate, stats, achievements, runOrdinal)) return gate.rarity;
  }
  return "signal";
}

export function signalRunCardRarityForStats(
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[] = [],
  runOrdinal = 1,
): SignalRunCardRarity {
  return rarityForStats(normalizeStats(stats), Array.from(new Set(achievements)).sort() as SignalRunAchievementKey[], finiteWhole(runOrdinal, 1, 1));
}

export type SignalRunCardRarityChase = {
  schema: "receiz.signal_run.card.rarity_chase.v1";
  currentRarity: SignalRunCardRarity;
  nextRarity: SignalRunCardRarity | null;
  progressPct: number;
  gateLabel: string;
  liveLine: string;
  blockers: Array<{
    label: string;
    value: number;
    target: number;
    complete: boolean;
  }>;
};

export function signalRunCardRarityChaseForStats(
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[] = [],
  runOrdinal = 1,
): SignalRunCardRarityChase {
  const cleanStats = normalizeStats(stats);
  const cleanAchievements = Array.from(new Set(achievements)).sort() as SignalRunAchievementKey[];
  const cleanRunOrdinal = finiteWhole(runOrdinal, 1, 1);
  const currentRarity = rarityForStats(cleanStats, cleanAchievements, cleanRunOrdinal);
  const nextRarity = nextRarityAfter(currentRarity);
  const chaseGate = nextRarity ? rarityGateFor(nextRarity) : rarityGateFor(currentRarity);
  const basis = rewardBasisForGate(chaseGate, cleanStats, cleanAchievements, cleanRunOrdinal);
  const totalWeight = basis.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const earnedWeight = basis.reduce((sum, entry) => {
    const ratio = entry.target <= 0 ? 1 : Math.max(0, Math.min(1, entry.value / entry.target));
    return sum + entry.weight * ratio;
  }, 0);
  const blockers = basis
    .filter((entry) => !entry.complete)
    .sort((a, b) => (a.value / Math.max(1, a.target)) - (b.value / Math.max(1, b.target)))
    .slice(0, 3)
    .map((entry) => ({
      label: entry.label,
      value: entry.value,
      target: entry.target,
      complete: entry.complete,
    }));

  return {
    schema: "receiz.signal_run.card.rarity_chase.v1",
    currentRarity,
    nextRarity,
    progressPct: Math.max(1, Math.min(100, Math.round((earnedWeight / totalWeight) * 100))),
    gateLabel: nextRarity
      ? `${signalRunCardRarityClassLabel(nextRarity)} gate`
      : "Genesis ceiling",
    liveLine: nextRarity
      ? `Current card projects ${signalRunCardRarityClassLabel(currentRarity)}. Push the ${signalRunCardRarityClassLabel(nextRarity)} gate.`
      : "Genesis class is met. Further gains become append history.",
    blockers,
  };
}

const SIGNAL_RUN_ECONOMY_MISSION_KEYS = [
  "proof-chain",
  "value-route",
  "trust-shield",
  "market-boss",
  "world-sprint",
  "breakthrough-boss",
] as const satisfies readonly SignalRunMission["key"][];

const SIGNAL_RUN_VAULT_STAGE_TITLES = [
  "Origin Register",
  "Element Atlas",
  "Champion Ledger",
  "Arena Foundry",
  "Lineage Archive",
  "Genesis Index",
  "Mythic Register",
  "World Circuit",
] as const;

function achievementsForEconomyStats(stats: SignalRunCardStats): SignalRunAchievementKey[] {
  const achievements: SignalRunAchievementKey[] = [];
  if (stats.proof >= 18 && stats.missionClears >= 4) achievements.push("proof-chain");
  if (stats.value >= 18 && stats.score >= 120_000) achievements.push("value-banker");
  if (stats.peakCombo >= 72) achievements.push("combo-surge");
  if (stats.trust >= 95 && stats.missionClears >= 8) achievements.push("trust-master");
  if (stats.breakthroughs >= 4 && stats.sector >= 6) achievements.push("boss-breaker");
  return achievements;
}

function economyStatsForSeed(random: () => number, index: number): SignalRunCardStats {
  const skill = Math.pow(random(), 4.8);
  const route = Math.pow(random(), 2.9);
  const combo = Math.pow(random(), 2.2);
  const balance = Math.pow(random(), 2.4);
  const breakthroughPressure = Math.max(skill, route * 0.82, combo * 0.62);
  const score = Math.floor(600 + Math.pow(skill, 2.6) * 1_650_000 + Math.pow(combo, 3.1) * 140_000 + random() * 18_000);
  const missionClears = Math.floor(1 + route * 15 + skill * 8);
  const sector = Math.floor(1 + route * 9 + skill * 5);
  const breakthroughs = Math.floor(Math.max(0, breakthroughPressure - 0.32) * 18 + (index % 997 === 0 ? 1 : 0));
  const peakCombo = Math.floor(8 + Math.pow(combo, 1.35) * 185 + skill * 34);
  const trust = Math.max(40, Math.min(100, Math.round(72 + skill * 24 + route * 5 + balance * 3 - random() * 6)));
  const proof = Math.floor(3 + Math.max(skill, balance * 0.8) * 46 + route * 7);
  const value = Math.floor(3 + Math.max(skill * 0.86, balance) * 46 + combo * 5);
  const level = Math.floor(1 + skill * 43 + route * 9 + combo * 4);
  return normalizeStats({
    score,
    proof,
    value,
    trust,
    peakCombo,
    missionClears,
    breakthroughs,
    sector,
    level,
  });
}

export function simulateSignalRunCardEconomy(runs = 12_000, seed = 20260507): SignalRunCardEconomySimulation {
  const safeRuns = Math.max(1, finiteWhole(runs, 12_000, 1, 1_000_000));
  const random = signalRunEconomyRandom(seed);
  const rarityCounts = SIGNAL_RUN_CARD_RARITIES.reduce<Record<SignalRunCardRarity, number>>((counts, rarity) => {
    counts[rarity] = 0;
    return counts;
  }, {} as Record<SignalRunCardRarity, number>);
  const kindCounts = SIGNAL_RUN_CARD_KINDS.reduce<Record<SignalRunCardKind, number>>((counts, kind) => {
    counts[kind] = 0;
    return counts;
  }, {} as Record<SignalRunCardKind, number>);
  let weakEliteLeaks = 0;
  let maxSignalScore = 0;
  let maxMythicScore = 0;
  let maxGenesisScore = 0;
  for (let index = 0; index < safeRuns; index += 1) {
    const stats = economyStatsForSeed(random, index);
    const achievements = achievementsForEconomyStats(stats);
    const rarity = rarityForStats(stats, achievements, index + 1);
    const missionKey = SIGNAL_RUN_ECONOMY_MISSION_KEYS[index % SIGNAL_RUN_ECONOMY_MISSION_KEYS.length] ?? "proof-chain";
    const kind = cardKindForRun(rarity, stats, achievements, missionKey, `${seed.toString(16)}${index.toString(16)}${stats.score.toString(16)}`);
    const gate = rarityGateFor(rarity);
    rarityCounts[rarity] += 1;
    kindCounts[kind] += 1;
    if (rarity === "signal") maxSignalScore = Math.max(maxSignalScore, stats.score);
    if (rarity === "mythic") maxMythicScore = Math.max(maxMythicScore, stats.score);
    if (rarity === "genesis") maxGenesisScore = Math.max(maxGenesisScore, stats.score);
    if (gate && !meetsRarityGate(gate, stats, achievements, index + 1)) weakEliteLeaks += 1;
  }
  return {
    schema: "receiz.signal_run.card.economy_simulation.v1",
    seed,
    runs: safeRuns,
    rarityCounts,
    kindCounts,
    weakEliteLeaks,
    genesisRatePerMillion: Math.round((rarityCounts.genesis / safeRuns) * 1_000_000),
    mythicRatePerMillion: Math.round((rarityCounts.mythic / safeRuns) * 1_000_000),
    prismRatePerMillion: Math.round((rarityCounts.prism / safeRuns) * 1_000_000),
    maxSignalScore,
    maxMythicScore,
    maxGenesisScore,
    gateSummary: SIGNAL_RUN_CARD_RARITIES.map((rarity) => rarityGateSummary(rarityGateFor(rarity))).join(" "),
  };
}

export function cardKindForRun(
  rarity: SignalRunCardRarity,
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[],
  missionKey?: SignalRunMission["key"],
  baseHash = "",
): SignalRunCardKind {
  const selectorHash = baseHash || `${missionKey ?? "signal"}-${stats.score}-${stats.peakCombo}-${stats.proof}-${stats.value}`;
  const characterRoll = hashIndex(`${selectorHash}character${rarity}${stats.sector}${stats.level}`, 4, 100);
  if (rarity === "genesis") return "character";
  if (rarity === "mythic" && stats.score >= 520_000 && stats.breakthroughs >= 7 && stats.peakCombo >= 130) return "character";
  if (rarity === "prism" && stats.score >= 275_000 && stats.breakthroughs >= 3 && achievements.includes("boss-breaker")) return "character";
  if (stats.score >= 160_000 || stats.sector >= 8 || stats.level >= 24 || stats.breakthroughs >= 3) return "character";
  if ((stats.score >= 45_000 || stats.peakCombo >= 42 || stats.missionClears >= 4 || stats.sector >= 3) && characterRoll < 58) return "character";
  if ((stats.score >= 15_000 || stats.peakCombo >= 30 || stats.missionClears >= 4 || achievements.length >= 2) && characterRoll < 28) return "character";
  if ((missionKey === "world-sprint" && stats.score >= 35_000) || stats.sector >= 4) return "field";
  if (missionKey === "breakthrough-boss" || stats.breakthroughs >= 1 || achievements.includes("proof-chain")) return "relic";
  if (achievements.includes("combo-surge") && hashIndex(selectorHash, 8, 2) === 0) return "field";
  if (achievements.includes("trust-master") && hashIndex(selectorHash, 10, 2) === 0) return "relic";
  return "utility";
}

const SIGNAL_RUN_CARD_ELEMENT_LABELS: Record<SignalRunCardElement, string> = {
  proof: "Proof",
  value: "Value",
  trust: "Trust",
  market: "Market",
  world: "World",
  seal: "Seal",
};

const SIGNAL_RUN_WORLD_ELEMENT_LABELS: Record<SignalRunWorldElement, string> = {
  earth: "Earth",
  fire: "Fire",
  water: "Water",
  air: "Air",
  lightning: "Lightning",
  plasma: "Plasma",
  metal: "Metal",
  crystal: "Crystal",
  ice: "Ice",
  light: "Light",
  shadow: "Shadow",
  gravity: "Gravity",
};

const SIGNAL_RUN_CARD_STAGE_LABELS: Record<SignalRunCardEvolutionStage, string> = {
  origin: "Origin",
  ascendant: "Ascendant",
  apex: "Apex",
};

const SIGNAL_RUN_CARD_KIND_LABELS: Record<SignalRunCardKind, string> = {
  character: "Character Card",
  utility: "Utility Card",
  relic: "Relic Card",
  field: "Field Card",
};

function isSignalRunCardKind(value: unknown): value is SignalRunCardKind {
  return value === "character" || value === "utility" || value === "relic" || value === "field";
}

function isSignalRunWorldElement(value: unknown): value is SignalRunWorldElement {
  return typeof value === "string" && (SIGNAL_RUN_WORLD_ELEMENTS as readonly string[]).includes(value);
}

const SIGNAL_RUN_CARD_LINEAGES: Record<SignalRunCardElement, { lineage: string; names: string[] }> = {
  proof: {
    lineage: "Axiom",
    names: ["Axiom", "Witness", "Verity", "Chronicle", "Oath", "Cipher", "Ledger", "Notary"],
  },
  value: {
    lineage: "Reserve",
    names: ["Reserve", "Treasury", "Vault", "Channel", "Yield", "Stake", "Settlement", "Beacon"],
  },
  trust: {
    lineage: "Covenant",
    names: ["Covenant", "Guardian", "Crown", "Shield", "Bond", "Keystone", "Standard", "Promise"],
  },
  market: {
    lineage: "Exchange",
    names: ["Exchange", "Contract", "Index", "Window", "Spread", "Clearing", "Signal", "Vector"],
  },
  world: {
    lineage: "Atlas",
    names: ["Atlas", "Horizon", "Gateway", "Path", "Domain", "Nexus", "Circuit", "Worldline"],
  },
  seal: {
    lineage: "Keystone",
    names: ["Sigil", "Relic", "Lock", "Key", "Forge", "Registry", "Keystone", "Vault"],
  },
};

const SIGNAL_RUN_CARD_ELEMENT_TITLES: Record<SignalRunCardElement, string[]> = {
  proof: ["Warden", "Notary", "Witness", "Cipher", "Vow", "Record"],
  value: ["Keeper", "Reserve", "Vault", "Channel", "Banker", "Engine"],
  trust: ["Guardian", "Shield", "Crown", "Bond", "Standard", "Oath"],
  market: ["Broker", "Strike", "Contract", "Index", "Window", "Vector"],
  world: ["Cartographer", "Gate", "Path", "Link", "Horizon", "Circuit"],
  seal: ["Sigil", "Relic", "Key", "Forge", "Lock", "Keystone"],
};

const SIGNAL_RUN_WORLD_ELEMENT_TITLES: Record<SignalRunWorldElement, string[]> = {
  earth: ["Titan", "Root", "Stone", "Mesa", "Bastion", "Granite"],
  fire: ["Ember", "Pyre", "Cinder", "Flare", "Furnace", "Blaze"],
  water: ["Tide", "Current", "Harbor", "Aqua", "Rain", "Deep"],
  air: ["Gale", "Horizon", "Zephyr", "Stratus", "Vector", "Draft"],
  lightning: ["Volt", "Storm", "Arc", "Surge", "Spark", "Relay"],
  plasma: ["Nova", "Flux", "Radiant", "Ion", "Corona", "Pulse"],
  metal: ["Alloy", "Forge", "Iron", "Anvil", "Chrome", "Steel"],
  crystal: ["Prism", "Facet", "Quartz", "Lattice", "Shard", "Crown"],
  ice: ["Frost", "Glacier", "Rime", "Mirror", "North", "Still"],
  light: ["Halo", "Beacon", "Solar", "Ray", "Aurora", "Dawn"],
  shadow: ["Umbra", "Eclipse", "Shade", "Veil", "Night", "Hush"],
  gravity: ["Orbit", "Mass", "Core", "Vector", "Well", "Tide"],
};

const SIGNAL_RUN_WORLD_ELEMENT_RULES: Record<SignalRunWorldElement, string> = {
  earth: "stabilizes board state and protects upgraded lanes",
  fire: "converts combo heat into pressure",
  water: "recovers tempo and reroutes value flow",
  air: "extends movement and links distant lanes",
  lightning: "accelerates reactions and timed strikes",
  plasma: "overloads locked sectors with high-risk power",
  metal: "reinforces sealed structures and armor channels",
  crystal: "multiplies clean proof lines through refraction",
  ice: "freezes volatile lanes until proof resolves",
  light: "reveals hidden proof and cleans corrupted paths",
  shadow: "conceals setup turns and redirects attacks",
  gravity: "pulls scattered effects into one decisive lane",
};

const SIGNAL_RUN_CHARACTER_ARCHETYPES: Record<SignalRunWorldElement, string[]> = {
  earth: ["Citadel Warden", "Root Sentinel", "Stone Strategist"],
  fire: ["Pyre Vanguard", "Ember Duelist", "Furnace Herald"],
  water: ["Tide Keeper", "Current Oracle", "Harbor Tactician"],
  air: ["Gale Strider", "Skyline Scout", "Vector Runner"],
  lightning: ["Arc Striker", "Storm Relay", "Volt Captain"],
  plasma: ["Nova Forger", "Ion Adept", "Corona Breaker"],
  metal: ["Alloy Guardian", "Forge Marshal", "Chrome Sentinel"],
  crystal: ["Prism Oracle", "Facet Savant", "Lattice Seer"],
  ice: ["Rime Warden", "Glacier Keeper", "Mirror Sentinel"],
  light: ["Beacon Oracle", "Solar Witness", "Dawn Herald"],
  shadow: ["Eclipse Tactician", "Umbra Agent", "Veil Strategist"],
  gravity: ["Orbit Commander", "Core Warden", "Mass Architect"],
};

const SIGNAL_RUN_CHARACTER_TEMPERAMENTS = [
  "relentless",
  "calm",
  "precise",
  "adaptive",
  "unyielding",
  "brilliant",
  "reserved",
  "volatile",
] as const;

const SIGNAL_RUN_CARD_SILHOUETTES = ["sentinel", "strider", "forgemind", "oracle", "vanguard"] as const;

type SignalRunNameStemSet = {
  first: readonly string[];
  last: readonly string[];
};

const SIGNAL_RUN_WORLD_NAME_STEMS: Record<SignalRunWorldElement, SignalRunNameStemSet> = {
  earth: { first: ["Ter", "Oren", "Bran", "Gael"], last: ["Stone", "Root", "Mesa", "Cairn"] },
  fire: { first: ["Ash", "Em", "Py", "Cai"], last: ["Ash", "Pyre", "Cinder", "Furn"] },
  water: { first: ["Mar", "Kai", "Ner", "Lir"], last: ["Tide", "Mere", "Harbor", "Rain"] },
  air: { first: ["Ari", "Gale", "Veya", "Lio"], last: ["Gale", "Zeph", "Strat", "Sky"] },
  lightning: { first: ["Arc", "Volt", "Rai", "Taran"], last: ["Volt", "Storm", "Arc", "Surge"] },
  plasma: { first: ["Nova", "Ion", "Cora", "Lux"], last: ["Nova", "Flux", "Ion", "Corona"] },
  metal: { first: ["Ferr", "Alden", "Chrome", "Steel"], last: ["Iron", "Alloy", "Forge", "Steel"] },
  crystal: { first: ["Pris", "Facet", "Crys", "Luma"], last: ["Prism", "Facet", "Quartz", "Crown"] },
  ice: { first: ["Rime", "Eira", "Niva", "Frost"], last: ["Rime", "Glacier", "North", "Mirror"] },
  light: { first: ["Sol", "Luma", "Aur", "Dawn"], last: ["Halo", "Beacon", "Solar", "Dawn"] },
  shadow: { first: ["Umb", "Nox", "Vey", "Shade"], last: ["Umbra", "Eclipse", "Veil", "Night"] },
  gravity: { first: ["Orin", "Core", "Mass", "Grav"], last: ["Orbit", "Mass", "Core", "Well"] },
};

const SIGNAL_RUN_DOMAIN_NAME_STEMS: Record<SignalRunCardElement, SignalRunNameStemSet> = {
  proof: { first: ["Vera", "Axi", "Oath", "Coda"], last: ["Axiom", "Verity", "Oath", "Ledger"] },
  value: { first: ["Vale", "Mira", "Ryn", "Cora"], last: ["Vault", "Vale", "Treas", "Yield"] },
  trust: { first: ["Sera", "Cova", "Nolan", "Alia"], last: ["Coven", "Crown", "Bond", "Oath"] },
  market: { first: ["Mara", "Dex", "Voss", "Kerr"], last: ["Index", "Voss", "Trade", "Vector"] },
  world: { first: ["Atlas", "Hori", "Nexa", "Cir"], last: ["Atlas", "Horizon", "Nexus", "Path"] },
  seal: { first: ["Sera", "Keya", "Sig", "Lock"], last: ["Sigil", "Lock", "Forge", "Key"] },
};

const SIGNAL_RUN_CLASS_NAME_STEMS: Record<SignalRunPlayableClass, SignalRunNameStemSet> = {
  "proof-guard": { first: ["Ari", "Vera", "Oren", "Coda"], last: ["Ward", "Aegis", "Proof", "Guard"] },
  "value-engine": { first: ["Mira", "Vale", "Ryn", "Cora"], last: ["Vault", "Flow", "Bank", "Reserve"] },
  "trust-shield": { first: ["Sera", "Alia", "Nolan", "Cova"], last: ["Crown", "Shield", "Bond", "Oath"] },
  "market-strike": { first: ["Dex", "Mara", "Voss", "Kerr"], last: ["Index", "Strike", "Vector", "Trade"] },
  "world-chain": { first: ["Atlas", "Nexa", "Hori", "Cir"], last: ["Route", "Nexus", "Path", "Horizon"] },
  "breakthrough-relic": { first: ["Toren", "Keya", "Bryn", "Sila"], last: ["Gate", "Core", "Forge", "Relic"] },
  "field-command": { first: ["Gael", "Lio", "Talia", "Veya"], last: ["Field", "Order", "Weather", "Signal"] },
};

const SIGNAL_RUN_NAME_FIRST_TAILS = [
  "a",
  "an",
  "el",
  "en",
  "ia",
  "in",
  "is",
  "on",
  "or",
  "ra",
  "ren",
  "rin",
  "ara",
  "ian",
  "iel",
  "ira",
  "len",
  "lin",
  "mar",
  "nel",
  "ora",
  "ryn",
  "ser",
  "ven",
] as const;

const SIGNAL_RUN_NAME_LINKS = [
  "al",
  "an",
  "ar",
  "el",
  "en",
  "er",
  "il",
  "in",
  "or",
  "ra",
  "ren",
  "ri",
  "son",
  "tor",
  "va",
  "wyn",
] as const;

const SIGNAL_RUN_NAME_LAST_TAILS = [
  "borne",
  "brook",
  "crest",
  "croft",
  "dell",
  "field",
  "ford",
  "glen",
  "hart",
  "haven",
  "helm",
  "ley",
  "line",
  "mark",
  "mere",
  "mont",
  "moor",
  "ridge",
  "stone",
  "thorne",
  "vale",
  "ward",
  "well",
  "wick",
  "wood",
  "worth",
] as const;

const SIGNAL_RUN_UTILITY_OBJECT_WORDS: Record<SignalRunPlayableClass, readonly string[]> = {
  "proof-guard": ["Aegis", "Witness", "Ward", "Cipher"],
  "value-engine": ["Vault", "Reserve", "Current", "Engine"],
  "trust-shield": ["Crown", "Oath", "Bastion", "Shell"],
  "market-strike": ["Index", "Vector", "Contract", "Strike"],
  "world-chain": ["Atlas", "Route", "Horizon", "Nexus"],
  "breakthrough-relic": ["Keystone", "Gate", "Core", "Lock"],
  "field-command": ["Weather", "Command", "Signal", "Catalyst"],
};

const SIGNAL_RUN_ARTIFACT_KIND_FORMS: Record<SignalRunCardKind, readonly string[]> = {
  character: ["Champion"],
  utility: ["Lens", "Relay", "Charge", "Key", "Glyph", "Module", "Channel", "Cipher"],
  relic: ["Core", "Mantle", "Aegis", "Anchor", "Blade", "Crown", "Engine", "Sigil"],
  field: ["Field", "Arena", "Weather", "Front", "Domain", "Gate", "Horizon", "Protocol"],
};

const SIGNAL_RUN_WORLD_ELEMENT_ADVANTAGE: Record<SignalRunWorldElement, SignalRunWorldElement> = {
  earth: "lightning",
  fire: "ice",
  water: "fire",
  air: "earth",
  lightning: "water",
  plasma: "metal",
  metal: "crystal",
  crystal: "shadow",
  ice: "air",
  light: "shadow",
  shadow: "light",
  gravity: "air",
};

function signalRunWorldElementCounter(element: SignalRunWorldElement): SignalRunWorldElement {
  for (const candidate of SIGNAL_RUN_WORLD_ELEMENTS) {
    if (SIGNAL_RUN_WORLD_ELEMENT_ADVANTAGE[candidate] === element) return candidate;
  }
  return "gravity";
}

function uniqueWorldElements(elements: SignalRunWorldElement[]): SignalRunWorldElement[] {
  return Array.from(new Set(elements));
}

function signalRunEconomyRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x9e3779b9;
    let value = state;
    value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
    value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
  };
}

function hashIndex(hash: string, offset: number, modulo: number): number {
  if (modulo <= 1) return 0;
  const clean = hash.replace(/[^a-fA-F0-9]/g, "") || "0";
  const slice = (clean + clean).slice(offset, offset + 8) || clean.slice(0, 8) || "0";
  return Number.parseInt(slice, 16) % modulo;
}

function uniqueNameStems(values: Array<readonly string[] | undefined>): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const group of values) {
    for (const value of group ?? []) {
      const clean = value.replace(/[^A-Za-z]/g, "");
      if (!clean || seen.has(clean.toLowerCase())) continue;
      seen.add(clean.toLowerCase());
      output.push(clean);
    }
  }
  return output;
}

function titleNamePart(value: string, fallback: string, maxLength: number): string {
  const clean = value.replace(/[^A-Za-z]/g, "") || fallback;
  const lower = clean.toLowerCase();
  const titled = `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
  return titled.slice(0, maxLength);
}

function composeNamePart(stem: string, link: string, tail: string, maxLength: number): string {
  const candidates = [
    `${stem}${link}${tail}`,
    `${stem}${tail}`,
    `${stem}${link}`,
    `${stem}`,
    `${link}${tail}`,
  ];
  for (const candidate of candidates) {
    const clean = candidate.replace(/[^A-Za-z]/g, "");
    if (clean.length >= 3 && clean.length <= maxLength) return titleNamePart(clean, stem || tail, maxLength);
  }
  return titleNamePart(`${stem}${link}${tail}`, stem || tail || "Ari", maxLength);
}

function uniqueHumanName(args: {
  baseHash: string;
  offset: number;
  domains?: readonly SignalRunCardElement[];
  naturalElements?: readonly SignalRunWorldElement[];
  playableClass?: SignalRunPlayableClass;
  stage?: SignalRunCardEvolutionStage;
  kind: SignalRunCardKind;
}): string {
  const primaryWorld = args.naturalElements?.[0];
  const secondaryWorld = args.naturalElements?.[1];
  const primaryDomain = args.domains?.[0];
  const secondaryDomain = args.domains?.[1];
  const worldPrimary = primaryWorld ? SIGNAL_RUN_WORLD_NAME_STEMS[primaryWorld] : undefined;
  const worldSecondary = secondaryWorld ? SIGNAL_RUN_WORLD_NAME_STEMS[secondaryWorld] : undefined;
  const domainPrimary = primaryDomain ? SIGNAL_RUN_DOMAIN_NAME_STEMS[primaryDomain] : undefined;
  const domainSecondary = secondaryDomain ? SIGNAL_RUN_DOMAIN_NAME_STEMS[secondaryDomain] : undefined;
  const classStems = args.playableClass ? SIGNAL_RUN_CLASS_NAME_STEMS[args.playableClass] : undefined;
  const utilityFirstPriority = args.kind === "utility" || args.kind === "relic" || args.kind === "field";
  const firstStemPool = uniqueNameStems(utilityFirstPriority
    ? [classStems?.first, worldSecondary?.first, worldPrimary?.first, domainSecondary?.first, domainPrimary?.first]
    : [worldPrimary?.first, domainPrimary?.first, worldSecondary?.first, domainSecondary?.first, classStems?.first]);
  const lastStemPool = uniqueNameStems(utilityFirstPriority
    ? [classStems?.last, domainSecondary?.last, worldSecondary?.last, domainPrimary?.last, worldPrimary?.last]
    : [domainPrimary?.last, worldPrimary?.last, domainSecondary?.last, worldSecondary?.last, classStems?.last]);
  const firstStem = firstStemPool[hashIndex(args.baseHash, args.offset, firstStemPool.length)] ?? "Ari";
  const firstTail = SIGNAL_RUN_NAME_FIRST_TAILS[hashIndex(
    `${args.baseHash}${args.stage ?? "origin"}${args.kind}`,
    args.offset + 5,
    SIGNAL_RUN_NAME_FIRST_TAILS.length,
  )] ?? "a";
  const lastStem = lastStemPool[hashIndex(args.baseHash, args.offset + 11, lastStemPool.length)] ?? "Vale";
  const link = SIGNAL_RUN_NAME_LINKS[hashIndex(
    `${args.kind}${args.stage ?? "origin"}${args.baseHash}`,
    args.offset + 17,
    SIGNAL_RUN_NAME_LINKS.length,
  )] ?? "an";
  const lastTail = SIGNAL_RUN_NAME_LAST_TAILS[hashIndex(args.baseHash, args.offset + 23, SIGNAL_RUN_NAME_LAST_TAILS.length)] ?? "vale";
  const first = composeNamePart(firstStem, "", firstTail, 8);
  const last = composeNamePart(lastStem, link, lastTail, 13);
  return `${first} ${last}`;
}

function uniqueUtilityArtifactName(args: {
  baseHash: string;
  playableClass: SignalRunPlayableClass;
  character?: SignalRunCardCharacter;
  progression?: Pick<SignalRunCardProgression, "stage">;
  cardKind?: SignalRunCardKind;
}): string {
  const cardKind = args.cardKind ?? "utility";
  const [primary, secondary] = args.character?.naturalElements ?? args.character?.elementalAffinity.elements ?? ["light", "earth"];
  const materialPool = uniqueNameStems([
    SIGNAL_RUN_WORLD_ELEMENT_TITLES[primary],
    SIGNAL_RUN_WORLD_ELEMENT_TITLES[secondary],
    [SIGNAL_RUN_WORLD_ELEMENT_LABELS[primary], SIGNAL_RUN_WORLD_ELEMENT_LABELS[secondary]],
  ]);
  const objectPool = uniqueNameStems([
    SIGNAL_RUN_UTILITY_OBJECT_WORDS[args.playableClass],
    args.character?.domains.map((domain) => SIGNAL_RUN_CARD_ELEMENT_LABELS[domain]),
  ]);
  const formPool = SIGNAL_RUN_ARTIFACT_KIND_FORMS[cardKind] ?? SIGNAL_RUN_ARTIFACT_KIND_FORMS.utility;
  const material = titleNamePart(materialPool[hashIndex(args.baseHash, 52, materialPool.length)] ?? "Signal", "Signal", 12);
  const object = titleNamePart(objectPool[hashIndex(args.baseHash, 58, objectPool.length)] ?? "Aegis", "Aegis", 13);
  const form = titleNamePart(formPool[hashIndex(`${cardKind}${args.baseHash}${args.progression?.stage ?? "origin"}`, 64, formPool.length)] ?? "Core", "Core", 10);
  const parts = [material, object, form].filter((part, index, values) => values.findIndex((value) => value.toLowerCase() === part.toLowerCase()) === index);
  return parts.join(" ");
}

function elementPairLabel(primary: SignalRunCardElement, secondary: SignalRunCardElement, separator = "-"): string {
  const primaryLabel = SIGNAL_RUN_CARD_ELEMENT_LABELS[primary];
  const secondaryLabel = SIGNAL_RUN_CARD_ELEMENT_LABELS[secondary];
  return primary === secondary ? primaryLabel : `${primaryLabel}${separator}${secondaryLabel}`;
}

function worldElementPairLabel(primary: SignalRunWorldElement, secondary: SignalRunWorldElement, separator = "-"): string {
  const primaryLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[primary];
  const secondaryLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[secondary];
  return primary === secondary ? primaryLabel : `${primaryLabel}${separator}${secondaryLabel}`;
}

function primaryElementForMission(missionKey: SignalRunMission["key"]): SignalRunCardElement {
  if (missionKey === "value-route") return "value";
  if (missionKey === "trust-shield") return "trust";
  if (missionKey === "market-boss") return "market";
  if (missionKey === "world-sprint") return "world";
  if (missionKey === "breakthrough-boss") return "seal";
  return "proof";
}

function secondaryElementForRun(
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[],
  primary: SignalRunCardElement,
  baseHash: string,
): SignalRunCardElement {
  const candidates: SignalRunCardElement[] = [];
  const add = (element: SignalRunCardElement) => {
    if (!candidates.includes(element)) candidates.push(element);
  };

  if (achievements.includes("boss-breaker") || stats.breakthroughs > 0) add("seal");
  if (achievements.includes("combo-surge") || stats.peakCombo >= 24) add("world");
  if (achievements.includes("trust-master") || stats.trust >= 92) add("trust");
  if (achievements.includes("value-banker") || stats.value > stats.proof) add("value");
  if (stats.score >= 5200) add("market");
  add("proof");

  const fallbackOffset = hashIndex(baseHash, 18, SIGNAL_RUN_CARD_DOMAIN_ELEMENTS.length);
  for (let index = 0; index < SIGNAL_RUN_CARD_DOMAIN_ELEMENTS.length; index += 1) {
    const fallback = SIGNAL_RUN_CARD_DOMAIN_ELEMENTS[(fallbackOffset + index) % SIGNAL_RUN_CARD_DOMAIN_ELEMENTS.length];
    if (fallback) add(fallback);
  }

  return candidates.find((element) => element !== primary) ?? "proof";
}

function worldElementForDomain(domain: SignalRunCardElement): SignalRunWorldElement {
  if (domain === "value") return "water";
  if (domain === "trust") return "earth";
  if (domain === "market") return "lightning";
  if (domain === "world") return "air";
  if (domain === "seal") return "metal";
  return "light";
}

function secondaryWorldElementForRun(
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[],
  primary: SignalRunWorldElement,
  baseHash: string,
): SignalRunWorldElement {
  const candidates: SignalRunWorldElement[] = [];
  const add = (element: SignalRunWorldElement) => {
    if (!candidates.includes(element)) candidates.push(element);
  };

  if (stats.breakthroughs >= 3 || stats.score >= 7000) add("plasma");
  if (achievements.includes("boss-breaker") || stats.breakthroughs > 0) add("fire");
  if (achievements.includes("combo-surge") || stats.peakCombo >= 24) add("lightning");
  if (achievements.includes("trust-master") || stats.trust >= 92) add("earth");
  if (achievements.includes("value-banker") || stats.value > stats.proof) add("water");
  if (achievements.includes("proof-chain")) add("crystal");
  if (stats.sector >= 4) add("gravity");
  add("air");
  add("light");

  const fallbackOffset = hashIndex(baseHash, 24, SIGNAL_RUN_WORLD_ELEMENTS.length);
  for (let index = 0; index < SIGNAL_RUN_WORLD_ELEMENTS.length; index += 1) {
    const fallback = SIGNAL_RUN_WORLD_ELEMENTS[(fallbackOffset + index) % SIGNAL_RUN_WORLD_ELEMENTS.length];
    if (fallback) add(fallback);
  }

  return candidates.find((element) => element !== primary) ?? "fire";
}

function catalystWorldElementForRun(
  primary: SignalRunWorldElement,
  secondary: SignalRunWorldElement,
  baseHash: string,
): SignalRunWorldElement {
  const offset = hashIndex(baseHash, 32, SIGNAL_RUN_WORLD_ELEMENTS.length);
  for (let index = 0; index < SIGNAL_RUN_WORLD_ELEMENTS.length; index += 1) {
    const candidate = SIGNAL_RUN_WORLD_ELEMENTS[(offset + index) % SIGNAL_RUN_WORLD_ELEMENTS.length];
    if (candidate && candidate !== primary && candidate !== secondary) return candidate;
  }
  return "crystal";
}

function elementalAffinityForParts(args: {
  baseHash: string;
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
  rarity: SignalRunCardRarity;
  domains: [SignalRunCardElement, SignalRunCardElement];
}): SignalRunCardElementalAffinity {
  const primary = worldElementForDomain(args.domains[0]);
  const secondary = secondaryWorldElementForRun(args.stats, args.achievements, primary, args.baseHash);
  const catalyst = catalystWorldElementForRun(primary, secondary, args.baseHash);
  const resonance = worldElementPairLabel(primary, secondary);
  const catalystLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[catalyst];
  const fieldName = `${resonance} Field`;
  const rarityLabel = signalRunCardRarityClassLabel(args.rarity);
  return {
    elements: [primary, secondary],
    catalyst,
    resonance,
    fieldName,
    arenaModifier: `${resonance} cards use ${catalystLabel} catalyst timing in Signal Arena.`,
    elementalRule: `${rarityLabel} ${resonance} affinity ${SIGNAL_RUN_WORLD_ELEMENT_RULES[secondary]}.`,
  };
}

function elementalAffinityForDerivation(args: {
  baseHash: string;
  rarity: SignalRunCardRarity;
  derivation: SignalRunCardDerivationProfile;
}): SignalRunCardElementalAffinity {
  if (args.derivation.derivationKind === "pack") {
    const primary = SIGNAL_RUN_WORLD_ELEMENTS[hashIndex(args.derivation.packSeedHash || args.baseHash, 2, SIGNAL_RUN_WORLD_ELEMENTS.length)] ?? "earth";
    const secondary =
      SIGNAL_RUN_WORLD_ELEMENTS[hashIndex(`${args.derivation.packId}:${args.baseHash}`, 4, SIGNAL_RUN_WORLD_ELEMENTS.length)] ??
      "plasma";
    const safeSecondary = secondary === primary
      ? SIGNAL_RUN_WORLD_ELEMENTS[(SIGNAL_RUN_WORLD_ELEMENTS.indexOf(primary) + 1) % SIGNAL_RUN_WORLD_ELEMENTS.length] ?? "plasma"
      : secondary;
    const catalyst = catalystWorldElementForRun(primary, safeSecondary, `${args.derivation.purchaseId}:${args.baseHash}`);
    const resonance = worldElementPairLabel(primary, safeSecondary);
    const catalystLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[catalyst];
    const rarityLabel = signalRunCardRarityClassLabel(args.rarity);
    return {
      elements: [primary, safeSecondary],
      catalyst,
      resonance,
      fieldName: `${resonance} Pack Field`,
      arenaModifier: `${resonance} pack cards use ${catalystLabel} catalyst timing from the sealed pack receipt.`,
      elementalRule: `${rarityLabel} ${resonance} pack affinity is derived from paid pack receipt seed and sealed card claim.`,
    };
  }
  const [primary, secondary] = args.derivation.inheritedElements;
  const catalyst = catalystWorldElementForRun(primary, secondary, `${args.derivation.childSeed}:${args.baseHash}`);
  const resonance = worldElementPairLabel(primary, secondary);
  const catalystLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[catalyst];
  const rarityLabel = signalRunCardRarityClassLabel(args.rarity);
  return {
    elements: [primary, secondary],
    catalyst,
    resonance,
    fieldName: `${resonance} Lineage Field`,
    arenaModifier: `${resonance} child cards inherit ${catalystLabel} catalyst timing from verified parent lineage.`,
    elementalRule: `${rarityLabel} ${resonance} child affinity is derived from two sealed parent cards and one verified combine append.`,
  };
}

function evolutionStageForRun(
  rarity: SignalRunCardRarity,
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[],
): SignalRunCardEvolutionStage {
  void rarity;
  if (
    stats.score >= 1_200_000 &&
    stats.breakthroughs >= 14 &&
    stats.peakCombo >= 220 &&
    stats.trust >= 99 &&
    stats.missionClears >= 18 &&
    stats.sector >= 14 &&
    stats.level >= 50 &&
    achievements.length >= 5
  ) return "apex";
  if (
    stats.score >= 220_000 &&
    stats.peakCombo >= 80 &&
    stats.trust >= 90 &&
    stats.missionClears >= 6 &&
    stats.sector >= 5 &&
    (stats.breakthroughs >= 3 || achievements.length >= 4)
  ) return "ascendant";
  return "origin";
}

function riskTierForRun(rarity: SignalRunCardRarity, stats: SignalRunCardStats): SignalRunCardRiskTier {
  if (rarity === "genesis" || (stats.score >= 500_000 && stats.breakthroughs >= 8 && stats.peakCombo >= 120)) return "legendary";
  if (rarity === "mythic" || (stats.score >= 275_000 && stats.breakthroughs >= 4)) return "volatile";
  if (rarity === "prism" || rarity === "foil" || stats.score >= 50_000 || stats.peakCombo >= 28) return "charged";
  return "stable";
}

function trustQualityPoints(trust: number, max: number): number {
  if (trust >= 99) return max;
  if (trust >= 97) return Math.max(0, max - 1);
  if (trust >= 95) return Math.max(0, max - 2);
  if (trust >= 90) return Math.max(0, Math.floor(max * 0.56));
  if (trust >= 80) return Math.max(0, Math.floor(max * 0.25));
  return 0;
}

function scoreTierCeiling(score: number, ceilings: {
  low: number;
  building: number;
  proven: number;
  elite: number;
  masterwork: number;
  genesis: number;
}): number {
  if (score >= 500_000) return ceilings.genesis;
  if (score >= 275_000) return ceilings.masterwork;
  if (score >= 125_000) return ceilings.elite;
  if (score >= 50_000) return ceilings.proven;
  if (score >= 15_000) return ceilings.building;
  return ceilings.low;
}

function scorePowerPoints(score: number): number {
  if (score >= 500_000) return 34;
  if (score >= 425_000) return 31;
  if (score >= 275_000) return 27;
  if (score >= 175_000) return 22;
  if (score >= 125_000) return 18;
  if (score >= 90_000) return 14;
  if (score >= 50_000) return 10;
  if (score >= 25_000) return 6;
  if (score >= 10_000) return 3;
  return 1;
}

function levelForRun(stats: SignalRunCardStats, achievements: SignalRunAchievementKey[]): number {
  const scoreLevel = Math.min(28, Math.floor(Math.log2(stats.score + 1) * 1.72));
  const routeLevel = Math.min(30, stats.missionClears * 3 + stats.breakthroughs * 10 + stats.sector * 2);
  const comboLevel = Math.min(14, Math.floor(stats.peakCombo / 4.5));
  const achievementLevel = Math.min(12, achievements.length * 2);
  const integrityLevel = trustQualityPoints(stats.trust, 8);
  const ceiling = scoreTierCeiling(stats.score, {
    low: 18,
    building: 32,
    proven: 50,
    elite: 68,
    masterwork: 86,
    genesis: 99,
  });
  return Math.max(1, Math.min(ceiling, scoreLevel + routeLevel + comboLevel + achievementLevel + integrityLevel));
}

function xpForRun(stats: SignalRunCardStats, achievements: SignalRunAchievementKey[]): number {
  return finiteWhole(stats.score + stats.proof * 90 + stats.value * 90 + stats.peakCombo * 42 + stats.breakthroughs * 900 + achievements.length * 420, 0);
}

function powerForRun(stats: SignalRunCardStats, achievements: SignalRunAchievementKey[]): number {
  const scorePower = scorePowerPoints(stats.score);
  const comboPower = Math.min(22, Math.floor(stats.peakCombo / 3));
  const breakthroughPower = Math.min(20, stats.breakthroughs * 6 + Math.floor(stats.missionClears * 1.45));
  const achievementPower = Math.min(10, achievements.length * 2);
  const balancePower = Math.min(6, Math.floor(Math.min(stats.proof, stats.value) * 0.55));
  const integrityPower = trustQualityPoints(stats.trust, 7);
  const ceiling = scoreTierCeiling(stats.score, {
    low: 18,
    building: 34,
    proven: 58,
    elite: 74,
    masterwork: 90,
    genesis: 99,
  });
  return Math.max(1, Math.min(ceiling, scorePower + comboPower + breakthroughPower + achievementPower + balancePower + integrityPower));
}

function attributeClamp(value: number): number {
  return Math.max(1, Math.min(99, finiteWhole(value, 1, 1, 99)));
}

function characterAttributesForRun(
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[],
  affinity: SignalRunCardElementalAffinity,
): SignalRunCardCharacterAttributes {
  const power = powerForRun(stats, achievements);
  const level = levelForRun(stats, achievements);
  const [primary, secondary] = affinity.elements;
  const primaryBonus = primary === "fire" || primary === "plasma" || primary === "lightning" ? 5 : 0;
  const guardBonus = primary === "earth" || primary === "metal" || primary === "ice" ? 5 : 0;
  const tempoBonus = secondary === "air" || secondary === "lightning" || secondary === "water" ? 5 : 0;
  const focusBonus = secondary === "crystal" || secondary === "light" || secondary === "gravity" ? 5 : 0;
  return {
    force: attributeClamp(power + stats.breakthroughs * 3 + primaryBonus),
    guard: attributeClamp(Math.floor(stats.trust * 0.74) + stats.missionClears * 4 + guardBonus),
    tempo: attributeClamp(Math.floor(stats.peakCombo * 2.15) + stats.sector * 3 + tempoBonus),
    focus: attributeClamp(Math.max(stats.proof, stats.value) * 5 + achievements.length * 7 + focusBonus),
    resonance: attributeClamp(level + stats.breakthroughs * 8 + achievements.length * 5),
  };
}

function isSignalRunCardCharacterGender(value: unknown): value is SignalRunCardCharacterGender {
  return value === "female" || value === "male";
}

function characterGenderForHash(baseHash: string): SignalRunCardCharacterGender {
  return hashIndex(baseHash, 40, 2) === 0 ? "female" : "male";
}

function characterGenderPresentationProfile(gender?: SignalRunCardCharacterGender): {
  label: string;
  artDirection: string;
  composition: string;
  materialLanguage: string;
  negativePrompt: string;
} {
  if (gender === "female") {
    return {
      label: "female champion",
      artDirection:
        "Adult woman hero design with strong feminine presence, graceful athletic power, expressive face, refined silhouette, elegant practical armor, soft luminous accents, warm approachable charm, cohesive Signal Circuit battle styling, feminine and strong without masculine-coded bulk.",
      composition:
        "Graceful athletic stance, readable feminine silhouette, confident expression, elegant motion lines, full body visible.",
      materialLanguage:
        "Refined practical armor, fine-line sigil adornments, layered fabric motion, polished luminous accents, and combat-ready details.",
      negativePrompt:
        "male facial features, masculine-coded bulky armor, beard, hypersexualized outfit, revealing outfit, pin-up pose, childlike girl, doll-like child, infantilized styling",
    };
  }
  return {
    label: "male champion",
    artDirection:
      "Adult man hero design with grounded athletic power, clear combat stance, expressive face, readable silhouette, practical armor, cohesive Signal Circuit battle styling, heroic and strong without generic sameness.",
    composition:
      "Grounded athletic stance, readable champion silhouette, confident expression, controlled motion lines, full body visible.",
    materialLanguage:
      "Dimensional practical armor, fine-line sigil geometry, layered battle gear, polished luminous accents, and combat-ready details.",
    negativePrompt: "",
  };
}

function characterForParts(args: {
  baseHash: string;
  missionKey: SignalRunMission["key"];
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
  identity: SignalRunCardIdentity;
  rarity: SignalRunCardRarity;
  derivation?: SignalRunCardDerivationProfile | null;
}): SignalRunCardCharacter {
  const primary = primaryElementForMission(args.missionKey);
  const secondary = secondaryElementForRun(args.stats, args.achievements, primary, args.baseHash);
  const domains: [SignalRunCardElement, SignalRunCardElement] = [primary, secondary];
  const elementalAffinity = args.derivation
    ? elementalAffinityForDerivation({
        baseHash: args.baseHash,
        rarity: args.rarity,
        derivation: args.derivation,
      })
    : elementalAffinityForParts({
        baseHash: args.baseHash,
        stats: args.stats,
        achievements: args.achievements,
        rarity: args.rarity,
        domains,
      });
  const lineage = args.derivation?.derivationKind === "child"
    ? { lineage: args.derivation.inheritedLineage.replace(/\s+Lineage$/i, "") || SIGNAL_RUN_CARD_LINEAGES[primary].lineage }
    : SIGNAL_RUN_CARD_LINEAGES[primary];
  const [naturalPrimary, naturalSecondary] = elementalAffinity.elements;
  const titles = SIGNAL_RUN_WORLD_ELEMENT_TITLES[naturalSecondary] ?? SIGNAL_RUN_CARD_ELEMENT_TITLES[secondary];
  const title = titles[hashIndex(args.baseHash, 12, titles.length)] ?? titles[0] ?? "Runner";
  const stage = evolutionStageForRun(args.rarity, args.stats, args.achievements);
  const avatarMark = args.identity.creationSigilSeed.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 2) || args.baseHash.slice(0, 2).toUpperCase();
  const archetypeOptions = SIGNAL_RUN_CHARACTER_ARCHETYPES[naturalPrimary];
  const archetype = archetypeOptions[hashIndex(args.baseHash, 38, archetypeOptions.length)] ?? archetypeOptions[0] ?? "Signal Champion";
  const gender = characterGenderForHash(args.baseHash);
  const temperament = SIGNAL_RUN_CHARACTER_TEMPERAMENTS[hashIndex(args.baseHash, 42, SIGNAL_RUN_CHARACTER_TEMPERAMENTS.length)] ?? "precise";
  const signatureSkill = `${SIGNAL_RUN_WORLD_ELEMENT_LABELS[naturalSecondary]} ${title}`;
  const attributes = characterAttributesForRun(args.stats, args.achievements, elementalAffinity);
  const name = uniqueHumanName({
    baseHash: args.baseHash,
    offset: 44,
    domains,
    naturalElements: elementalAffinity.elements,
    stage,
    kind: "character",
  });
  const originStory = args.derivation?.derivationKind === "child"
    ? `${name} descends from ${args.derivation.parentA.name} and ${args.derivation.parentB.name} through verified combine append ${args.derivation.combineAppendHash.slice(0, 12)}.`
    : args.derivation?.derivationKind === "pack"
      ? `${name} was drawn from ${args.derivation.packName} slot ${args.derivation.slotIndex + 1} and sealed from pack receipt ${args.derivation.purchaseId.slice(0, 12)}.`
    : `${name} formed from ${elementalAffinity.fieldName} after a verified ${args.stats.score}-point Signal Run.`;
  return {
    characterId: `chr_${args.baseHash.slice(0, 20)}`,
    name,
    gender,
    epithet: `${SIGNAL_RUN_CARD_STAGE_LABELS[stage]} ${worldElementPairLabel(naturalPrimary, naturalSecondary)} Character`,
    lineage: `${lineage.lineage} Lineage`,
    archetype,
    temperament,
    signatureSkill,
    originStory,
    attributes,
    domains,
    elements: domains,
    naturalElements: elementalAffinity.elements,
    elementalAffinity,
    avatarMark,
  };
}

function progressionForParts(args: {
  character: SignalRunCardCharacter;
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
  rarity: SignalRunCardRarity;
  utilityAbilityName: string;
}): SignalRunCardProgression {
  const level = levelForRun(args.stats, args.achievements);
  const xp = xpForRun(args.stats, args.achievements);
  const stage = evolutionStageForRun(args.rarity, args.stats, args.achievements);
  const riskTier = riskTierForRun(args.rarity, args.stats);
  const nextEvolutionName =
    stage === "origin" ? `${args.character.name} Ascendant` :
      stage === "ascendant" ? `${args.character.name} Apex` :
        null;
  const [primary, secondary] = args.character.domains ?? args.character.elements;
  const primaryLabel = SIGNAL_RUN_CARD_ELEMENT_LABELS[primary];
  const secondaryLabel = SIGNAL_RUN_CARD_ELEMENT_LABELS[secondary];
  const affinity = args.character.elementalAffinity;
  const [naturalPrimary, naturalSecondary] = affinity.elements;
  const naturalPairLabel = worldElementPairLabel(naturalPrimary, naturalSecondary);
  const pairArticle = /^[AEIOU]/.test(naturalPairLabel) ? "an" : "a";
  const performanceLabel = primary === secondary ? primaryLabel : `${primaryLabel} and ${secondaryLabel}`;
  const combineFamily = `${args.character.lineage.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${primary}-${secondary}-${naturalPrimary}-${naturalSecondary}`;
  return {
    level,
    xp,
    stage,
    nextEvolutionName,
    riskTier,
    upgradeSlots: stage === "apex" ? 3 : stage === "ascendant" ? 2 : 1,
    combineFamily,
    signalRunUpgradeRule: `Risk this card in Signal Run to mint an upgrade proof from verified ${naturalPairLabel} affinity and ${performanceLabel} domain mastery.`,
    combineRule: `Combine two cards from ${args.character.lineage} with compatible elemental affinity to forge a lineage upgrade card.`,
    evolutionRule: nextEvolutionName
      ? `Reach level ${stage === "origin" ? 18 : 42} or combine matching lineage cards to evolve into ${nextEvolutionName}.`
      : "Apex stage card. Further upgrades add sealed modifiers without replacing the original achievement seal.",
    arenaRule: `${args.utilityAbilityName} enters Signal Arena as ${pairArticle} ${naturalPairLabel} utility with deterministic domain rules. ${affinity.arenaModifier}`,
  };
}

function finishForParts(args: {
  baseHash: string;
  rarity: SignalRunCardRarity;
  reward?: SignalRunCardRewardProfile;
  character: SignalRunCardCharacter;
}): SignalRunCardFinishProfile {
  const scarcityCode = `${args.rarity.toUpperCase()}-${args.baseHash.slice(0, 8).toUpperCase()}`;
  const denominator = args.reward?.scarcity.denominator ?? rarityOddsDenominator(args.rarity);
  const scarcityTitle = scarcityTitleForDenominator(denominator);
  if (args.rarity === "genesis") {
    if (denominator >= 80_000_000) {
      return {
        treatment: "genesis-spectrum",
        finishName: scarcityTitle,
        patternName: "Crown spectrum lattice",
        revealFeature: "Motion reveals a crown-grade rarity crest, creation sigil, lineage ring, and achievement proof channel.",
        scarcityCode,
      };
    }
    return {
      treatment: "genesis-spectrum",
      finishName: "Genesis",
      patternName: "Receiz spectrum lattice",
      revealFeature: "Motion reveals the creation sigil, lineage ring, and achievement proof channel.",
      scarcityCode,
    };
  }
  if (args.rarity === "mythic") {
    if (denominator >= 1_000_000) {
      return {
        treatment: "mythic-spectrum",
        finishName: scarcityTitle,
        patternName: "Sovereign interference field",
        revealFeature: "Motion reveals a high-scarcity edge, character mark, and sealed arena channel.",
        scarcityCode,
      };
    }
    return {
      treatment: "mythic-spectrum",
      finishName: "Mythic",
      patternName: "Mythic interference field",
      revealFeature: "Motion reveals the character mark and sealed arena channel.",
      scarcityCode,
    };
  }
  if (args.rarity === "prism") {
    return {
      treatment: "prism-spectrum",
      finishName: "Prism Spectrum",
      patternName: "Split-spectrum proof lattice",
      revealFeature: "Motion reveals the elemental affinity and rarity channel.",
      scarcityCode,
    };
  }
  if (args.rarity === "foil") {
    return {
      treatment: "line-foil",
      finishName: "Line Foil",
      patternName: "Signed foil linework",
      revealFeature: "Motion reveals the lineage trace and power band.",
      scarcityCode,
    };
  }
  return {
    treatment: "signal-matte",
    finishName: "Signal Matte",
    patternName: `${args.character.lineage} proof field`,
    revealFeature: "Motion reveals the registered card mark.",
    scarcityCode,
  };
}

function playableClassForMission(missionKey: SignalRunMission["key"]): SignalRunPlayableClass {
  if (missionKey === "value-route") return "value-engine";
  if (missionKey === "trust-shield") return "trust-shield";
  if (missionKey === "market-boss") return "market-strike";
  if (missionKey === "world-sprint") return "field-command";
  if (missionKey === "breakthrough-boss") return "breakthrough-relic";
  return "proof-guard";
}

function titleForCard(args: {
  mission: SignalRunMission;
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
  rarity: SignalRunCardRarity;
}): string {
  if (args.achievements.includes("boss-breaker") || args.mission.key === "breakthrough-boss") return "Gatebreaker Keystone";
  if (args.achievements.includes("trust-master")) return "Trust Crown";
  if (args.achievements.includes("combo-surge")) return "Combo Prism";
  if (args.achievements.includes("value-banker")) return "Value Banker";
  if (args.achievements.includes("proof-chain")) return "Proof Chain";
  if (args.rarity === "genesis") return "Genesis Runner";
  return args.mission.name;
}

function uniqueUtilityTraits(
  playableClass: SignalRunPlayableClass,
  stats: SignalRunCardStats,
  character?: SignalRunCardCharacter,
  progression?: Pick<SignalRunCardProgression, "stage">,
): Pick<SignalRunCardUtility, "arenaSignature" | "synergyTags" | "deckLimit" | "tacticalRole"> {
  const intensity = stats.breakthroughs >= 3 ? "Breaker" : stats.peakCombo >= 28 ? "Surge" : stats.trust >= 92 ? "Clean" : "Core";
  const sectorTag = `sector-${Math.max(1, Math.min(9, stats.sector))}`;
  const comboTag = stats.peakCombo >= 30 ? "combo-master" : stats.peakCombo >= 18 ? "combo-chain" : "steady-line";
  const proofTag = stats.proof >= stats.value ? "proof-led" : "value-led";
  const domains = character ? character.domains ?? character.elements : [];
  const domainTags = domains.map((element) => `domain-${element}`);
  const elementTags = character ? character.elementalAffinity.elements.map((element) => `element-${element}`) : [];
  const lineageTag = character ? character.lineage.toLowerCase().replace(/[^a-z0-9]+/g, "-") : playableClass;
  const stageTag = progression ? `stage-${progression.stage}` : "stage-origin";
  const deckLimit = stats.score >= 7000 || stats.breakthroughs >= 3 ? 1 : stats.score >= 3600 ? 2 : 3;
  const tacticalRole =
    playableClass === "value-engine" ? "engine" :
    playableClass === "market-strike" ? "striker" :
    playableClass === "world-chain" || playableClass === "field-command" ? "linker" :
    playableClass === "breakthrough-relic" ? "relic" :
    "defender";
  return {
    arenaSignature: character
      ? `${SIGNAL_RUN_CARD_STAGE_LABELS[progression?.stage ?? "origin"]} ${worldElementPairLabel(character.elementalAffinity.elements[0], character.elementalAffinity.elements[1])} ${playableClass.replace(/-/g, " ")}`
      : `${intensity} ${playableClass.replace(/-/g, " ")}`,
    synergyTags: Array.from(new Set([playableClass, lineageTag, stageTag, sectorTag, comboTag, proofTag, ...domainTags, ...elementTags])),
    deckLimit,
    tacticalRole,
  };
}

const SIGNAL_RUN_ABILITY_WORDS: Record<SignalRunPlayableClass, readonly string[]> = {
  "proof-guard": ["Aegis Claim", "Chain Parry", "Witness Guard", "Seal Turn"],
  "value-engine": ["Reserve Surge", "Vault Flow", "Harbor Bank", "Current Return"],
  "trust-shield": ["Clean Ward", "Crown Guard", "Bastion Lock", "Oath Shell"],
  "market-strike": ["Contract Cut", "Index Strike", "Window Break", "Vector Hit"],
  "world-chain": ["Route Link", "Horizon Step", "Atlas Jump", "Circuit Path"],
  "breakthrough-relic": ["Gate Split", "Lockrend", "Core Breach", "Keystone Break"],
  "field-command": ["Field Order", "Weather Turn", "Arena Shift", "Catalyst Call"],
};

function utilityAbilityForClass(args: {
  playableClass: SignalRunPlayableClass;
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
  character?: SignalRunCardCharacter;
  baseHash: string;
}): Pick<SignalRunCardUtility, "abilityName" | "abilityText"> {
  const element =
    args.character?.elementalAffinity.elements[hashIndex(args.baseHash, 18, 2)] ??
    SIGNAL_RUN_WORLD_ELEMENTS[hashIndex(args.baseHash, 18, SIGNAL_RUN_WORLD_ELEMENTS.length)] ??
    "light";
  const elementLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[element];
  const words = SIGNAL_RUN_ABILITY_WORDS[args.playableClass];
  const baseName = words[hashIndex(args.baseHash, 22, words.length)] ?? words[0] ?? "Signal Turn";
  const cleanName = `${elementLabel} ${baseName}`;
  const pressure = Math.max(1, Math.min(18, Math.ceil(powerForRun(args.stats, args.achievements) / 6)));
  const duration = args.stats.peakCombo >= 30 || args.stats.breakthroughs >= 2 ? 3 : 2;

  if (args.playableClass === "value-engine") {
    return {
      abilityName: cleanName,
      abilityText: `Bank ${pressure} reserve, then restore tempo when the champion scores a value action.`,
    };
  }
  if (args.playableClass === "trust-shield") {
    return {
      abilityName: cleanName,
      abilityText: `Reduce the next corruption hit by ${pressure} and convert clean proof into guard.`,
    };
  }
  if (args.playableClass === "market-strike") {
    return {
      abilityName: cleanName,
      abilityText: `Open a ${duration}-turn strike window; combo hits add ${pressure} pressure.`,
    };
  }
  if (args.playableClass === "world-chain") {
    return {
      abilityName: cleanName,
      abilityText: `Link two lanes for ${duration} turns; successful movement adds ${pressure} tempo.`,
    };
  }
  if (args.playableClass === "field-command") {
    return {
      abilityName: cleanName,
      abilityText: `Set a ${elementLabel} field for ${duration + 1} turns; compatible skills gain ${pressure} control.`,
    };
  }
  if (args.playableClass === "breakthrough-relic") {
    return {
      abilityName: cleanName,
      abilityText: `Break one lock and add ${pressure} guard against the counterattack.`,
    };
  }
  return {
    abilityName: cleanName,
    abilityText: `Protect one proof chain; the next verified action gains ${pressure} focus.`,
  };
}

function utilityForClass(
  playableClass: SignalRunPlayableClass,
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[],
  character?: SignalRunCardCharacter,
  progression?: Pick<SignalRunCardProgression, "stage">,
  baseHash = "",
  cardKind: SignalRunCardKind = "utility",
): SignalRunCardUtility {
  const power = powerForRun(stats, achievements);
  const traits = uniqueUtilityTraits(playableClass, stats, character, progression);
  const artifactName = uniqueUtilityArtifactName({
    baseHash: baseHash || `${playableClass}-${power}`,
    playableClass,
    character,
    progression,
    cardKind,
  });
  const ability = utilityAbilityForClass({
    playableClass,
    stats,
    achievements,
    character,
    baseHash: baseHash || `${playableClass}-${power}`,
  });
  if (playableClass === "value-engine") {
    return {
      playableIn: "receiz-signal-circuit",
      futureGame: "signal-arena",
      playableClass,
      artifactName,
      ...ability,
      power,
      ...traits,
      nonFinancialUtility: true,
    };
  }
  if (playableClass === "trust-shield") {
    return {
      playableIn: "receiz-signal-circuit",
      futureGame: "signal-arena",
      playableClass,
      artifactName,
      ...ability,
      power,
      ...traits,
      nonFinancialUtility: true,
    };
  }
  if (playableClass === "market-strike") {
    return {
      playableIn: "receiz-signal-circuit",
      futureGame: "signal-arena",
      playableClass,
      artifactName,
      ...ability,
      power,
      ...traits,
      nonFinancialUtility: true,
    };
  }
  if (playableClass === "world-chain") {
    return {
      playableIn: "receiz-signal-circuit",
      futureGame: "signal-arena",
      playableClass,
      artifactName,
      ...ability,
      power,
      ...traits,
      nonFinancialUtility: true,
    };
  }
  if (playableClass === "field-command") {
    return {
      playableIn: "receiz-signal-circuit",
      futureGame: "signal-arena",
      playableClass,
      artifactName,
      ...ability,
      power,
      ...traits,
      nonFinancialUtility: true,
    };
  }
  if (playableClass === "breakthrough-relic") {
    return {
      playableIn: "receiz-signal-circuit",
      futureGame: "signal-arena",
      playableClass,
      artifactName,
      ...ability,
      power,
      ...traits,
      nonFinancialUtility: true,
    };
  }
  return {
    playableIn: "receiz-signal-circuit",
    futureGame: "signal-arena",
    playableClass,
    artifactName,
    ...ability,
    power,
    ...traits,
    nonFinancialUtility: true,
  };
}

function skillKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "skill";
}

const SIGNAL_RUN_ELEMENT_SKILL_VERBS: Record<SignalRunWorldElement, readonly string[]> = {
  earth: ["Bastion Rise", "Stone Lock", "Root Hold"],
  fire: ["Pyre Rush", "Cinder Break", "Furnace Drive"],
  water: ["Tide Return", "Harbor Flow", "Current Bend"],
  air: ["Gale Step", "Vector Drift", "Skyline Cut"],
  lightning: ["Arc Flash", "Storm Relay", "Volt Reversal"],
  plasma: ["Nova Burst", "Ion Overload", "Corona Split"],
  metal: ["Alloy Guard", "Forge Brace", "Iron Bind"],
  crystal: ["Prism Read", "Facet Mirror", "Lattice Focus"],
  ice: ["Rime Freeze", "Glacier Pause", "Mirror Chill"],
  light: ["Beacon Reveal", "Solar Cleanse", "Halo Trace"],
  shadow: ["Umbra Feint", "Eclipse Turn", "Veil Redirect"],
  gravity: ["Orbit Pull", "Core Crush", "Mass Well"],
};

function arenaSkillForElement(args: {
  element: SignalRunWorldElement;
  baseHash: string;
  offset: number;
  basePower: number;
  powerBonus: number;
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  utility: SignalRunCardUtility;
}): SignalRunCardArenaProfile["skills"][number] {
  const elementLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[args.element];
  const verbs = SIGNAL_RUN_ELEMENT_SKILL_VERBS[args.element];
  const technique = verbs[hashIndex(args.baseHash, args.offset, verbs.length)] ?? verbs[0] ?? "Signal Turn";
  const power = Math.max(1, Math.min(99, args.basePower + args.powerBonus));
  const trigger =
    args.progression.stage === "apex" ? "after a perfect exchange" :
    args.progression.stage === "ascendant" ? "after a clean combo" :
    "after the first verified action";
  const result =
    args.utility.tacticalRole === "striker" ? `adds ${Math.max(1, Math.ceil(power / 7))} pressure` :
    args.utility.tacticalRole === "engine" ? `banks ${Math.max(1, Math.ceil(power / 8))} reserve` :
    args.utility.tacticalRole === "linker" ? `links ${Math.max(1, Math.ceil(power / 12) + 1)} lanes` :
    args.utility.tacticalRole === "relic" ? `breaks ${Math.max(1, Math.ceil(power / 16))} lock` :
    `adds ${Math.max(1, Math.ceil(power / 8))} guard`;
  return {
    key: skillKey(`${args.element}-${technique}-${args.character.characterId}`),
    name: `${elementLabel} ${technique}`,
    element: args.element,
    text: `${technique}: ${trigger}, ${result} and follows ${SIGNAL_RUN_WORLD_ELEMENT_RULES[args.element]}.`,
    power,
  };
}

function strategyForParts(args: {
  cardKind: SignalRunCardKind;
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  utility: SignalRunCardUtility;
  affinity: SignalRunCardElementalAffinity;
}): SignalRunCardStrategyProfile {
  const [primary, secondary] = args.affinity.elements;
  const primaryLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[primary];
  const secondaryLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[secondary];
  const comboTags = Array.from(new Set([
    args.utility.playableClass,
    args.progression.combineFamily,
    `element-${primary}`,
    `element-${secondary}`,
    `catalyst-${args.affinity.catalyst}`,
    `stage-${args.progression.stage}`,
    `role-${args.cardKind}`,
  ]));
  if (args.cardKind === "character") {
    return {
      schema: "receiz.signal_run.card.strategy.v1",
      cardKind: "character",
      arenaSlot: "champion",
      loadoutCost: 4,
      persistence: "champion",
      activationWindow: "pre-fight",
      primaryStat: "level",
      secondaryStat: "resonance",
      arenaText: `Champion enters with ${args.progression.upgradeSlots} support slots and ${args.affinity.resonance} affinity.`,
      counterplay: `${SIGNAL_RUN_WORLD_ELEMENT_LABELS[signalRunWorldElementCounter(primary)]} pressure can interrupt ${primaryLabel} openings.`,
      comboTags,
      upgradeRecipe: args.progression.evolutionRule,
    };
  }
  if (args.cardKind === "relic") {
    return {
      schema: "receiz.signal_run.card.strategy.v1",
      cardKind: "relic",
      arenaSlot: "relic",
      loadoutCost: args.utility.power >= 60 ? 3 : 2,
      persistence: "match-relic",
      activationWindow: "pre-fight",
      primaryStat: "guard",
      secondaryStat: "catalyst",
      arenaText: `Relic attaches before battle and reinforces compatible ${args.affinity.resonance} champions for the match.`,
      counterplay: `${secondaryLabel} disruption can disable the relic for one exchange.`,
      comboTags,
      upgradeRecipe: `Combine with a matching ${args.character.lineage} champion to forge a persistent modifier append.`,
    };
  }
  if (args.cardKind === "field") {
    return {
      schema: "receiz.signal_run.card.strategy.v1",
      cardKind: "field",
      arenaSlot: "field",
      loadoutCost: args.utility.power >= 55 ? 3 : 2,
      persistence: "arena-field",
      activationWindow: "field",
      primaryStat: "control",
      secondaryStat: "pressure",
      arenaText: `Field card changes the arena rules for ${args.utility.power >= 60 ? 5 : 4} turns and rewards ${primaryLabel}/${secondaryLabel} timing.`,
      counterplay: `${SIGNAL_RUN_WORLD_ELEMENT_LABELS[args.affinity.catalyst]} catalyst timing can flip the field advantage.`,
      comboTags,
      upgradeRecipe: `Fuse two compatible field cards to create a higher-control arena condition.`,
    };
  }
  return {
    schema: "receiz.signal_run.card.strategy.v1",
    cardKind: "utility",
    arenaSlot: "utility",
    loadoutCost: args.utility.power >= 50 ? 2 : 1,
    persistence: "single-use",
    activationWindow: args.utility.tacticalRole === "striker" ? "reaction" : "combo",
    primaryStat: "power",
    secondaryStat: "focus",
    arenaText: `Utility card is played once to trigger ${args.utility.abilityName} on a compatible champion.`,
    counterplay: `${secondaryLabel} guard can reduce the effect if the target champion lacks ${primaryLabel} affinity.`,
    comboTags,
    upgradeRecipe: `Feed to a matching champion to write a one-use upgrade append after battle.`,
  };
}

function rewardBandForRarity(rarity: SignalRunCardRarity): SignalRunCardRewardProfile["rewardBand"] {
  if (rarity === "genesis") return "genesis";
  if (rarity === "mythic") return "masterwork";
  if (rarity === "prism") return "elite";
  if (rarity === "foil") return "proven";
  return "registered";
}

function rarityOddsDenominator(rarity: SignalRunCardRarity): number {
  if (rarity === "genesis") return 1_000_000;
  if (rarity === "mythic") return 75_000;
  if (rarity === "prism") return 2_500;
  if (rarity === "foil") return 100;
  return 1;
}

function stageScarcityMultiplier(stage: SignalRunCardEvolutionStage): number {
  if (stage === "apex") return 50;
  if (stage === "ascendant") return 5;
  return 1;
}

function performanceScarcityMultiplier(stats: SignalRunCardStats, achievements: SignalRunAchievementKey[]): number {
  let multiplier = 1;
  if (stats.score >= 1_000_000) multiplier *= 4;
  else if (stats.score >= 750_000) multiplier *= 2;
  if (stats.trust >= 99 && stats.peakCombo >= 150) multiplier *= 2;
  if (achievements.length >= 5 && stats.breakthroughs >= 10) multiplier *= 2;
  return multiplier;
}

function scarcityTitleForDenominator(denominator: number): string {
  if (denominator >= 800_000_000) return "Immortal Crown";
  if (denominator >= 80_000_000) return "Immutable Crown";
  if (denominator >= 25_000_000) return "Sovereign Crest";
  if (denominator >= 5_000_000) return "Eternal Class";
  if (denominator >= 1_000_000) return "Mythic Sovereign";
  if (denominator >= 500_000) return "Mythic Crest";
  if (denominator >= 250_000) return "Mythic Crest";
  if (denominator >= 75_000) return "Mythic Class";
  if (denominator >= 12_500) return "Prism Crest";
  if (denominator >= 2_500) return "Prism Class";
  if (denominator >= 500) return "Foil Crest";
  if (denominator >= 100) return "Foil Class";
  return "Registered";
}

function scarcityDisplayClass(args: {
  denominator: number;
  stageLabel: string;
  rarityClass: string;
}): string {
  if (args.denominator >= 75_000) return args.rarityClass;
  return `${args.stageLabel} ${args.rarityClass}`;
}

function scarcityForParts(args: {
  rarity: SignalRunCardRarity;
  progression: SignalRunCardProgression;
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
}): SignalRunCardRewardProfile["scarcity"] {
  const rarityDenominator = rarityOddsDenominator(args.rarity);
  const stageMultiplier = stageScarcityMultiplier(args.progression.stage);
  const performanceMultiplier = performanceScarcityMultiplier(args.stats, args.achievements);
  const denominator = Math.max(1, rarityDenominator * stageMultiplier * performanceMultiplier);
  const rarityClass = signalRunCardRarityClassLabel(args.rarity);
  const scarcityTitle = scarcityTitleForDenominator(denominator);
  const stageLabel = SIGNAL_RUN_CARD_STAGE_LABELS[args.progression.stage];
  const displayClass = scarcityDisplayClass({ denominator, stageLabel, rarityClass });
  const label = args.rarity === "signal"
    ? `${scarcityTitle} · ${displayClass} base performance class`
    : `${scarcityTitle} · 1 in ${denominator.toLocaleString()} ${displayClass} performance class`;
  return {
    schema: "receiz.signal_run.card.scarcity.v1",
    label,
    denominator,
    rarityDenominator,
    stageMultiplier,
    performanceMultiplier,
    basis: `${rarityClass} class is gated by score and route completion. ${stageLabel} evolution is gated separately by combo mastery, sector depth, integrity, breakthroughs, and runner level.`,
  };
}

function rarityGateSummary(gate: SignalRunRarityGate | null): string {
  if (!gate) return "Registered card issued for completing a verified Signal Run.";
  const parts = [
    `${gate.score.toLocaleString()} score`,
    `${gate.peakCombo} combo`,
    `${gate.trust}% integrity`,
    `${gate.missionClears} mission clears`,
    `${gate.achievements} achievements`,
  ];
  if (gate.breakthroughs > 0) parts.push(`${gate.breakthroughs} breakthroughs`);
  if (gate.proof !== undefined) parts.push(`${gate.proof} proof`);
  if (gate.value !== undefined) parts.push(`${gate.value} value`);
  if (gate.sector !== undefined) parts.push(`sector ${gate.sector}`);
  if (gate.level !== undefined) parts.push(`level ${gate.level}`);
  if (gate.runOrdinal !== undefined) parts.push(`run ${gate.runOrdinal}`);
  return `${signalRunCardRarityClassLabel(gate.rarity)} gate: ${parts.join(", ")}.`;
}

function rewardBasisEntry(
  key: SignalRunCardRewardProfile["performanceBasis"][number]["key"],
  label: string,
  value: number,
  target: number,
  weight: number,
): SignalRunCardRewardProfile["performanceBasis"][number] {
  return {
    key,
    label,
    value,
    target,
    weight,
    complete: value >= target,
  };
}

function rewardBasisForGate(
  gate: SignalRunRarityGate | null,
  stats: SignalRunCardStats,
  achievements: SignalRunAchievementKey[],
  runOrdinal: number,
): SignalRunCardRewardProfile["performanceBasis"] {
  if (!gate) {
    return [
      rewardBasisEntry("score", "Score", stats.score, 1, 32),
      rewardBasisEntry("peakCombo", "Peak combo", stats.peakCombo, 1, 20),
      rewardBasisEntry("trust", "Integrity", stats.trust, 1, 16),
    ];
  }
  const basis = [
    rewardBasisEntry("score", "Score", stats.score, gate.score, 34),
    rewardBasisEntry("peakCombo", "Peak combo", stats.peakCombo, gate.peakCombo, 22),
    rewardBasisEntry("trust", "Integrity", stats.trust, gate.trust, 16),
    rewardBasisEntry("missionClears", "Mission clears", stats.missionClears, gate.missionClears, 14),
    rewardBasisEntry("breakthroughs", "Breakthroughs", stats.breakthroughs, gate.breakthroughs, 10),
    rewardBasisEntry("achievements", "Achievements", achievements.length, gate.achievements, 10),
  ];
  if (gate.proof !== undefined) basis.push(rewardBasisEntry("proof", "Proof", stats.proof, gate.proof, 8));
  if (gate.value !== undefined) basis.push(rewardBasisEntry("value", "Value", stats.value, gate.value, 8));
  if (gate.sector !== undefined) basis.push(rewardBasisEntry("sector", "Sector reached", stats.sector, gate.sector, 8));
  if (gate.level !== undefined) basis.push(rewardBasisEntry("level", "Runner level", stats.level, gate.level, 8));
  if (gate.runOrdinal !== undefined) {
    basis.push({
      key: "runOrdinal",
      label: "Run ordinal",
      value: runOrdinal,
      target: gate.runOrdinal,
      weight: 6,
      complete: runOrdinal === gate.runOrdinal,
    });
  }
  return basis;
}

function cardKindReasonForParts(args: {
  cardKind: SignalRunCardKind;
  missionKey: SignalRunMission["key"];
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
  character: SignalRunCardCharacter;
  utility: SignalRunCardUtility;
}): string {
  if (args.cardKind === "character") {
    return `Champion character awarded from verified route control across ${args.character.elementalAffinity.resonance} affinity. Rarity, level, and power stay bound to the run result.`;
  }
  if (args.cardKind === "relic") {
    return `Relic card awarded because breakthrough proof created a persistent ${args.utility.tacticalRole} attachment.`;
  }
  if (args.cardKind === "field") {
    return `Field card awarded because sector pressure converted the run into an arena condition.`;
  }
  return `Utility card awarded to preserve ${args.utility.abilityName} as a single tactical play.`;
}

function rewardForParts(args: {
  baseHash: string;
  rarity: SignalRunCardRarity;
  cardKind: SignalRunCardKind;
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
  runOrdinal: number;
  missionKey: SignalRunMission["key"];
  missionName: string;
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  utility: SignalRunCardUtility;
}): SignalRunCardRewardProfile {
  const currentGate = rarityGateFor(args.rarity);
  const nextRarity = nextRarityAfter(args.rarity);
  const nextGate = nextRarity ? rarityGateFor(nextRarity) : null;
  const basisGate = currentGate ?? nextGate;
  const rewardBand = rewardBandForRarity(args.rarity);
  const kindLabel = SIGNAL_RUN_CARD_KIND_LABELS[args.cardKind].replace(" Card", "").toLowerCase();
  const earnedReason = `${signalRunCardRarityClassLabel(args.rarity)} ${kindLabel} earned from ${args.stats.score.toLocaleString()} score, ${args.stats.peakCombo} peak combo, ${args.stats.breakthroughs} breakthroughs, ${args.stats.missionClears} mission clears, and ${args.achievements.length} achievements in ${args.missionName}.`;
  const thresholdSummary = nextGate
    ? `Current gate met: ${currentGate ? rarityGateSummary(currentGate) : "Registered Signal Circuit Card."} Next gate: ${rarityGateSummary(nextGate)}`
    : `Genesis ceiling met: ${rarityGateSummary(currentGate)} Further gains append modifiers without replacing this card.`;
  return {
    schema: "receiz.signal_run.card.reward.v1",
    rewardBand,
    rarityGate: args.rarity,
    nextRarity,
    scarcity: scarcityForParts({
      rarity: args.rarity,
      progression: args.progression,
      stats: args.stats,
      achievements: args.achievements,
    }),
    earnedReason,
    cardKindReason: cardKindReasonForParts(args),
    thresholdSummary,
    performanceBasis: rewardBasisForGate(basisGate, args.stats, args.achievements, args.runOrdinal),
    rewardFingerprint: `rwd_${args.baseHash.slice(20, 40)}`,
  };
}

export function arenaProfileForParts(args: {
  baseHash: string;
  cardKind: SignalRunCardKind;
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  utility: SignalRunCardUtility;
}): SignalRunCardArenaProfile {
  const affinity = args.character.elementalAffinity;
  const [primary, secondary] = affinity.elements;
  const strengths = uniqueWorldElements([
    SIGNAL_RUN_WORLD_ELEMENT_ADVANTAGE[primary],
    SIGNAL_RUN_WORLD_ELEMENT_ADVANTAGE[secondary],
  ]);
  const weaknesses = uniqueWorldElements([
    signalRunWorldElementCounter(primary),
    signalRunWorldElementCounter(secondary),
  ]);
  const basePower = args.utility.power;
  const skills = [
    arenaSkillForElement({
      element: primary,
      baseHash: args.baseHash,
      offset: 62,
      basePower,
      powerBonus: 0,
      character: args.character,
      progression: args.progression,
      utility: args.utility,
    }),
    arenaSkillForElement({
      element: secondary,
      baseHash: args.baseHash,
      offset: 68,
      basePower,
      powerBonus: -3 + args.progression.upgradeSlots * 2,
      character: args.character,
      progression: args.progression,
      utility: args.utility,
    }),
    arenaSkillForElement({
      element: affinity.catalyst,
      baseHash: args.baseHash,
      offset: 74,
      basePower,
      powerBonus: -6 + args.progression.upgradeSlots,
      character: args.character,
      progression: args.progression,
      utility: args.utility,
    }),
  ];

  if (args.cardKind === "character") {
    return {
      role: "champion",
      uploadRule: "Upload this verified character card to Signal Arena as the player's champion.",
      useRule: "Champion cards persist across arena runs and can be upgraded by compatible utility cards.",
      elementStrengths: strengths,
      elementWeaknesses: weaknesses,
      skills,
      champion: {
        championId: args.character.characterId,
        acceptsUtilityCards: true,
        evolutionLineage: args.progression.combineFamily,
        utilitySlots: args.progression.upgradeSlots,
      },
    };
  }

  const compatibleElements = uniqueWorldElements([primary, secondary, affinity.catalyst]);
  const effectName = args.utility.artifactName ?? args.utility.abilityName;
  if (args.cardKind === "relic") {
    return {
      role: "relic",
      uploadRule: "Upload this verified relic card to Signal Arena as a persistent match attachment.",
      useRule: "Relic cards attach to a compatible champion before battle and persist for the match.",
      elementStrengths: strengths,
      elementWeaknesses: weaknesses,
      skills,
      relicCard: {
        relicId: `rel_${args.baseHash.slice(0, 20)}`,
        attachTo: "champion",
        persistent: true,
        relicSlot: (["core", "armor", "weapon", "sigil"] as const)[hashIndex(args.baseHash, 34, 4)] ?? "core",
        compatibleLineages: [args.progression.combineFamily, args.character.lineage],
        effectName,
        effectText: `${effectName} attaches to compatible ${affinity.resonance} champions and adds match-long ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[affinity.catalyst]} catalyst resistance.`,
        statBonus: {
          force: Math.max(1, Math.min(18, Math.ceil(args.utility.power / 8))),
          guard: Math.max(1, Math.min(24, Math.ceil(args.utility.power / 5))),
          tempo: Math.max(1, Math.min(16, Math.ceil(args.utility.power / 9))),
          focus: Math.max(1, Math.min(18, Math.ceil(args.utility.power / 7))),
          resonance: Math.max(1, Math.min(20, Math.ceil(args.utility.power / 6))),
        },
      },
    };
  }
  if (args.cardKind === "field") {
    return {
      role: "field",
      uploadRule: "Upload this verified field card to Signal Arena as an arena condition.",
      useRule: "Field cards alter elemental advantage and arena tempo for a limited turn window.",
      elementStrengths: strengths,
      elementWeaknesses: weaknesses,
      skills,
      fieldCard: {
        fieldId: `fld_${args.baseHash.slice(0, 20)}`,
        durationTurns: args.utility.power >= 70 ? 5 : args.utility.power >= 42 ? 4 : 3,
        fieldElement: affinity.catalyst,
        boostedElements: compatibleElements,
        suppressedElements: weaknesses,
        effectName,
        effectText: `${effectName} turns ${affinity.fieldName} into a playable arena condition, boosts ${affinity.resonance} actions, and suppresses ${weaknesses.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ")} counters for its duration.`,
      },
    };
  }
  return {
    role: "utility",
    uploadRule: "Upload this verified utility card to Signal Arena as a one-use champion modifier.",
    useRule: "Utility cards are consumed after use and write an upgrade append for the target champion.",
    elementStrengths: strengths,
    elementWeaknesses: weaknesses,
    skills,
    utilityCard: {
      utilityId: `uty_${args.baseHash.slice(0, 20)}`,
      singleUse: true,
      target: "champion",
      compatibleElements,
      effectName,
      effectText: `${effectName} powers compatible ${affinity.resonance} champions through ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[affinity.catalyst]} catalyst timing for one arena action.`,
      powerDelta: Math.max(1, Math.min(18, Math.ceil(args.utility.power / 7))),
    },
  };
}

function arenaActivationTiming(strategy: SignalRunCardStrategyProfile): SignalRunCardArenaLoadoutProfile["activationTiming"] {
  if (strategy.arenaSlot === "champion") return "opening";
  if (strategy.activationWindow === "pre-fight") return "pre-fight";
  if (strategy.activationWindow === "field") return "field";
  if (strategy.activationWindow === "reaction") return "reaction";
  return "combo";
}

function arenaTempoClass(cost: SignalRunCardStrategyProfile["loadoutCost"], power: number): SignalRunCardArenaLoadoutProfile["tempoClass"] {
  if (cost >= 4 || power >= 82) return "decisive";
  if (cost >= 3 || power >= 58) return "heavy";
  if (cost <= 1 && power < 42) return "fast";
  return "balanced";
}

function arenaDeckRoleLabel(role: SignalRunArenaRole): SignalRunCardArenaLoadoutProfile["deckRoleLabel"] {
  if (role === "champion") return "Champion";
  if (role === "relic") return "Relic";
  if (role === "field") return "Field";
  return "Utility";
}

function battleSupportSubtypeForParts(args: {
  cardKind: SignalRunCardKind;
  progression: SignalRunCardProgression;
  utility: SignalRunCardUtility;
  stats: SignalRunCardStats;
  affinity: SignalRunCardElementalAffinity;
  baseHash: string;
}): SignalRunArenaSupportSubtype {
  if (args.cardKind === "character") return "champion";
  if (args.cardKind === "relic") return "relic";
  if (args.cardKind === "field") return "field";
  if (
    args.progression.stage !== "origin" &&
    args.stats.score >= 320_000 &&
    args.stats.peakCombo >= 96 &&
    args.stats.breakthroughs >= 4 &&
    args.utility.power >= 64
  ) return "catalyst";
  if (
    args.utility.tacticalRole === "striker" ||
    args.utility.tacticalRole === "defender" ||
    args.affinity.catalyst === "shadow" ||
    hashIndex(args.baseHash, 86, 5) === 0
  ) return "tactic";
  return "utility";
}

function battleRatingForParts(args: {
  stats: SignalRunCardStats;
  utility: SignalRunCardUtility;
  progression: SignalRunCardProgression;
  character: SignalRunCardCharacter;
  loadout: SignalRunCardArenaLoadoutProfile;
}): number {
  const rating =
    Math.floor(args.stats.score / 18_000) +
    args.utility.power +
    args.progression.level +
    Math.floor(args.stats.peakCombo / 3) +
    args.stats.breakthroughs * 5 +
    args.stats.missionClears * 2 +
    Math.floor((args.character.attributes.force + args.character.attributes.guard + args.character.attributes.tempo + args.character.attributes.focus + args.character.attributes.resonance) / 16) -
    args.loadout.energyCost * 4;
  return Math.max(5, Math.min(999, finiteWhole(rating, 5, 5, 999)));
}

function battleRoleForSubtype(subtype: SignalRunArenaSupportSubtype, utility: SignalRunCardUtility): SignalRunCardBattleProfile["battleRole"] {
  if (subtype === "champion") return "champion";
  if (subtype === "relic") return "equipment";
  if (subtype === "field") return "field-control";
  if (subtype === "catalyst") return "evolution";
  if (subtype === "tactic") return "counter";
  return utility.tacticalRole === "striker" ? "burst" : "counter";
}

function battleUseLimitForSubtype(subtype: SignalRunArenaSupportSubtype): SignalRunCardBattleProfile["useLimit"] {
  if (subtype === "champion") return "persistent";
  if (subtype === "relic") return "match";
  if (subtype === "field") return "field-window";
  return "once";
}

function battleUpgradeModeForSubtype(subtype: SignalRunArenaSupportSubtype): SignalRunCardBattleProfile["upgradeMode"] {
  if (subtype === "champion") return "evolves";
  if (subtype === "relic") return "attaches";
  if (subtype === "field") return "shapes-field";
  if (subtype === "catalyst") return "catalyzes";
  return "feeds-champion";
}

function battleProfileForParts(args: {
  baseHash: string;
  cardKind: SignalRunCardKind;
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  utility: SignalRunCardUtility;
  arena: SignalRunCardArenaProfile;
  loadout: SignalRunCardArenaLoadoutProfile;
  stats: SignalRunCardStats;
}): SignalRunCardBattleProfile {
  const affinity = args.character.elementalAffinity;
  const supportSubtype = battleSupportSubtypeForParts({
    cardKind: args.cardKind,
    progression: args.progression,
    utility: args.utility,
    stats: args.stats,
    affinity,
    baseHash: args.baseHash,
  });
  const battleRating = battleRatingForParts({
    stats: args.stats,
    utility: args.utility,
    progression: args.progression,
    character: args.character,
    loadout: args.loadout,
  });
  const [primary, secondary] = affinity.elements;
  const catalystLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[affinity.catalyst];
  const primarySkill = args.arena.skills[0]?.name ?? args.character.signatureSkill;
  const counterSkill = args.arena.skills[1]?.name ?? `${SIGNAL_RUN_WORLD_ELEMENT_LABELS[secondary]} Counter`;
  const finisherSkill = args.arena.skills[2]?.name ?? `${catalystLabel} Finish`;
  const baseDamage = Math.max(1, Math.min(99, Math.floor(args.character.attributes.force * 0.5 + args.utility.power * 0.42 + args.stats.breakthroughs * 2)));
  const baseGuard = Math.max(1, Math.min(99, Math.floor(args.character.attributes.guard * 0.55 + args.stats.trust * 0.22 + args.loadout.energyCost * 3)));
  const baseTempo = Math.max(1, Math.min(99, Math.floor(args.character.attributes.tempo * 0.44 + args.stats.peakCombo * 0.24 + args.progression.upgradeSlots * 4)));
  const accuracy = Math.max(35, Math.min(99, 54 + Math.floor(args.stats.trust / 3) + Math.floor(args.character.attributes.focus / 5) - args.loadout.energyCost * 2));
  const criticalWindow = Math.max(1, Math.min(30, Math.floor(args.stats.peakCombo / 8) + args.stats.breakthroughs + args.progression.upgradeSlots));
  const subtypeLabel =
    supportSubtype === "champion" ? "champion" :
    supportSubtype === "catalyst" ? "catalyst support" :
    `${supportSubtype} support`;
  return {
    schema: "receiz.signal_run.card.battle.v1",
    battleId: `bat_${args.baseHash.slice(8, 28)}`,
    arenaGame: "signal-arena",
    cardKind: args.cardKind,
    supportSubtype,
    battleRole: battleRoleForSubtype(supportSubtype, args.utility),
    useLimit: battleUseLimitForSubtype(supportSubtype),
    upgradeMode: battleUpgradeModeForSubtype(supportSubtype),
    battleRating,
    baseDamage,
    baseGuard,
    baseTempo,
    accuracy,
    criticalWindow,
    energyCost: args.loadout.energyCost,
    compatibleElements: args.loadout.compatibleElements,
    strongInto: args.loadout.strongInto,
    weakInto: args.loadout.weakInto,
    openingMove: primarySkill,
    counterMove: counterSkill,
    finisherMove: finisherSkill,
    resolveRule: `${subtypeLabel} resolves from sealed rating ${battleRating}, ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[primary]} opener, ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[secondary]} counter, and ${catalystLabel} finisher timing. Weak elements reduce rating before damage; strong elements add tempo before the exchange.`,
    sealedBattleLogRule: "Signal Arena must mint a new verified battle receipt for every match; cards are referenced by collectible ID and never mutated.",
  };
}

function mechanicsScoreBand(stats: SignalRunCardStats, rarity: SignalRunCardRarity): SignalRunCardMechanicsProfile["acquisition"]["scoreBand"] {
  if (rarity === "genesis" || stats.score >= 1_000_000) return "immutable";
  if (rarity === "mythic" || stats.score >= 450_000) return "masterwork";
  if (rarity === "prism" || stats.score >= 220_000) return "elite";
  if (rarity === "foil" || stats.score >= 80_000) return "proven";
  return "registered";
}

function mechanicsValueRole(cardKind: SignalRunCardKind): SignalRunCardMechanicsProfile["economy"]["valueRole"] {
  if (cardKind === "character") return "champion-core";
  if (cardKind === "relic") return "match-attachment";
  if (cardKind === "field") return "arena-condition";
  return "burst-play";
}

function mechanicsValidTargets(args: {
  cardKind: SignalRunCardKind;
  character: SignalRunCardCharacter;
  arena: SignalRunCardArenaProfile;
}): string[] {
  if (args.cardKind === "character") return [args.character.characterId, args.character.lineage, args.character.elementalAffinity.resonance];
  if (args.cardKind === "relic") return args.arena.relicCard?.compatibleLineages ?? [args.character.lineage];
  if (args.cardKind === "field") return [`field:${args.arena.fieldCard?.fieldElement ?? args.character.elementalAffinity.catalyst}`, args.character.elementalAffinity.resonance];
  return args.arena.utilityCard?.compatibleElements.map((element) => `champion:${element}`) ?? args.character.elementalAffinity.elements.map((element) => `champion:${element}`);
}

function mechanicsPrimaryPlan(args: {
  cardKind: SignalRunCardKind;
  character: SignalRunCardCharacter;
  utility: SignalRunCardUtility;
  arena: SignalRunCardArenaProfile;
  loadout: SignalRunCardArenaLoadoutProfile;
  battle: SignalRunCardBattleProfile;
}): string {
  if (args.cardKind === "character") {
    return `Start ${args.character.name} as champion, preserve tempo through ${args.battle.openingMove}, then spend support slots on ${args.character.elementalAffinity.resonance} utilities.`;
  }
  if (args.cardKind === "relic") {
    return `Attach ${args.arena.relicCard?.effectName ?? args.utility.artifactName} before battle to turn ${args.character.lineage} champions into stronger ${args.loadout.tempoClass} exchanges.`;
  }
  if (args.cardKind === "field") {
    return `Play ${args.arena.fieldCard?.effectName ?? args.utility.artifactName} when the match needs a field swing, then force enemies through ${args.loadout.weakInto.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ")} counters.`;
  }
  return `Hold ${args.utility.abilityName} until the champion can convert ${args.character.elementalAffinity.resonance} affinity into a one-action advantage.`;
}

function mechanicsComboPlan(args: {
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  loadout: SignalRunCardArenaLoadoutProfile;
  battle: SignalRunCardBattleProfile;
}): string {
  const hooks = args.loadout.comboHooks.slice(0, 3).join(" + ");
  return `Combo ${hooks} with ${args.character.lineage} cards; ${args.battle.finisherMove} gains priority when level ${args.progression.level} and power timing both resolve.`;
}

function mechanicsWinCondition(args: {
  cardKind: SignalRunCardKind;
  character: SignalRunCardCharacter;
  battle: SignalRunCardBattleProfile;
  affinity: SignalRunCardElementalAffinity;
}): string {
  const catalyst = SIGNAL_RUN_WORLD_ELEMENT_LABELS[args.affinity.catalyst];
  if (args.cardKind === "character") return `Win by keeping ${args.character.name} alive long enough to resolve ${args.battle.finisherMove} through ${catalyst} catalyst timing.`;
  if (args.cardKind === "relic") return `Win by making one champion survive a hostile exchange and turn the attached relic bonus into a counterattack.`;
  if (args.cardKind === "field") return `Win by forcing the fight to happen inside ${args.affinity.fieldName} while compatible elements are boosted.`;
  return `Win by converting one exact opening into ${args.battle.baseDamage} damage, ${args.battle.baseGuard} guard, or ${args.battle.baseTempo} tempo before the card is spent.`;
}

function mechanicsVictoryMilestones(args: {
  cardKind: SignalRunCardKind;
  progression: SignalRunCardProgression;
  battle: SignalRunCardBattleProfile;
  affinity: SignalRunCardElementalAffinity;
}): SignalRunCardMechanicsProfile["progression"]["victoryMilestones"] {
  const catalyst = SIGNAL_RUN_WORLD_ELEMENT_LABELS[args.affinity.catalyst];
  const baseWins = args.progression.stage === "apex" ? 5 : args.progression.stage === "ascendant" ? 3 : 2;
  if (args.cardKind === "character") {
    return [
      { wins: baseWins, unlock: `${args.battle.openingMove} mastery append`, statBonus: "level" },
      { wins: baseWins * 2, unlock: `${args.battle.counterMove} counter line`, statBonus: "resonance" },
      { wins: baseWins * 4, unlock: `${args.battle.finisherMove} finisher title`, statBonus: "power" },
    ];
  }
  if (args.cardKind === "relic") {
    return [
      { wins: baseWins, unlock: `${catalyst} attachment mark`, statBonus: "guard" },
      { wins: baseWins * 3, unlock: "match relic veteran append", statBonus: "resonance" },
    ];
  }
  if (args.cardKind === "field") {
    return [
      { wins: baseWins, unlock: `${args.affinity.fieldName} control append`, statBonus: "tempo" },
      { wins: baseWins * 3, unlock: "arena condition veteran append", statBonus: "focus" },
    ];
  }
  return [
    { wins: baseWins, unlock: "single-use precision append", statBonus: "focus" },
    { wins: baseWins * 3, unlock: `${catalyst} catalyst append`, statBonus: "tempo" },
  ];
}

function mechanicsProfileForParts(args: {
  cardKind: SignalRunCardKind;
  rarity: SignalRunCardRarity;
  stats: SignalRunCardStats;
  achievements: SignalRunAchievementKey[];
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  utility: SignalRunCardUtility;
  reward: SignalRunCardRewardProfile;
  strategy: SignalRunCardStrategyProfile;
  arena: SignalRunCardArenaProfile;
  loadout: SignalRunCardArenaLoadoutProfile;
  battle: SignalRunCardBattleProfile;
}): SignalRunCardMechanicsProfile {
  const affinity = args.character.elementalAffinity;
  const rarityClass = signalRunCardRarityClassLabel(args.rarity);
  const issueLine = signalRunCardIssueLineLabel(args.rarity);
  const compatibleElements = uniqueWorldElements(args.loadout.compatibleElements);
  const counteredBy = uniqueWorldElements([
    ...args.loadout.weakInto,
    ...args.battle.weakInto,
  ]);
  const victoryMilestones = mechanicsVictoryMilestones({
    cardKind: args.cardKind,
    progression: args.progression,
    battle: args.battle,
    affinity,
  });
  const energyText = `${args.loadout.energyCost} energy`;
  const targetElements = compatibleElements.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ");
  return {
    schema: "receiz.signal_run.card.mechanics.v1",
    cardKind: args.cardKind,
    rarityClass,
    issueLine,
    acquisition: {
      source: "signal-run",
      performanceGate: args.reward.scarcity.label,
      scoreBand: mechanicsScoreBand(args.stats, args.rarity),
      score: args.stats.score,
      peakCombo: args.stats.peakCombo,
      integrity: args.stats.trust,
      breakthroughs: args.stats.breakthroughs,
      missionClears: args.stats.missionClears,
      earnedWhy: args.reward.earnedReason,
    },
    economy: {
      deckSlot: args.loadout.role,
      energyCost: args.loadout.energyCost,
      deckLimit: args.loadout.deckLimit,
      useLimit: args.battle.useLimit,
      persistence: args.strategy.persistence,
      timing: args.loadout.activationTiming,
      riskTier: args.progression.riskTier,
      upgradeSlots: args.progression.upgradeSlots,
      valueRole: mechanicsValueRole(args.cardKind),
    },
    targeting: {
      validTargets: mechanicsValidTargets({ cardKind: args.cardKind, character: args.character, arena: args.arena }),
      compatibleElements,
      strongInto: args.loadout.strongInto,
      weakInto: args.loadout.weakInto,
      counteredBy,
      targetRule: `${rarityClass} ${args.loadout.deckRoleLabel} targets ${targetElements} for ${energyText}; weak into ${counteredBy.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ")}.`,
    },
    strategy: {
      primaryPlan: mechanicsPrimaryPlan(args),
      comboPlan: mechanicsComboPlan(args),
      counterplay: args.strategy.counterplay,
      winCondition: mechanicsWinCondition({ cardKind: args.cardKind, character: args.character, battle: args.battle, affinity }),
      tempoWindow: args.loadout.tempoClass,
      decisionSkill: args.battle.openingMove,
    },
    progression: {
      canEvolve: args.cardKind === "character" || args.battle.upgradeMode === "evolves" || args.battle.upgradeMode === "catalyzes",
      evolvesBy: args.progression.evolutionRule,
      arenaVictoryGrowth: `Arena victories mint separate verified growth appends at ${victoryMilestones.map((milestone) => `${milestone.wins} wins`).join(", ")}. These appends can improve playable state, never the sealed original card.`,
      victoryMilestones,
      combinesWith: Array.from(new Set([args.progression.combineFamily, args.character.lineage, ...args.utility.synergyTags.slice(0, 4)])),
      upgradeMaterial: args.strategy.upgradeRecipe,
      riskRule: args.progression.signalRunUpgradeRule,
      permanenceRule: "Original sealed card truth is permanent. Ownership, arena victories, utility feeds, combinations, and evolutions must append new verified records exactly like Receiz ownership history; they never mutate this card.",
    },
    outcome: {
      arenaUse: args.loadout.battleRule,
      signalRunUse: args.progression.signalRunUpgradeRule,
      collectionUse: `${args.character.lineage} ${issueLine} card fills ${rarityClass} collection, ${args.loadout.deckRoleLabel} slot, and ${affinity.resonance} element coverage.`,
      proofUse: `${args.battle.sealedBattleLogRule} Append-only card growth uses existing Receiz verification primitives so every victory, feed, combine, evolution, and transfer remains independently verifiable.`,
    },
  };
}

function arenaLoadoutForParts(args: {
  cardKind: SignalRunCardKind;
  character: SignalRunCardCharacter;
  progression: SignalRunCardProgression;
  utility: SignalRunCardUtility;
  strategy: SignalRunCardStrategyProfile;
  arena: SignalRunCardArenaProfile;
  affinity: SignalRunCardElementalAffinity;
  stats: SignalRunCardStats;
}): SignalRunCardArenaLoadoutProfile {
  const compatibleElements = uniqueWorldElements([
    ...args.affinity.elements,
    args.affinity.catalyst,
    ...(args.arena.utilityCard?.compatibleElements ?? []),
    ...(args.arena.fieldCard?.boostedElements ?? []),
  ]);
  const deckRoleLabel = arenaDeckRoleLabel(args.arena.role);
  const tempoClass = arenaTempoClass(args.strategy.loadoutCost, args.utility.power);
  const comboHooks = Array.from(new Set([
    args.utility.playableClass,
    args.utility.tacticalRole,
    args.progression.combineFamily,
    ...args.strategy.comboTags,
    ...args.arena.skills.map((skill) => skill.key),
  ])).slice(0, 8);
  const elementNames = compatibleElements.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ");
  const strongNames = args.arena.elementStrengths.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ");
  const weakNames = args.arena.elementWeaknesses.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ");
  const scoringBasis = `Level ${args.progression.level}, power ${args.utility.power}, ${args.stats.score.toLocaleString()} score, ${args.stats.peakCombo} peak combo, ${args.stats.breakthroughs} breakthroughs.`;

  if (args.arena.role === "champion") {
    return {
      schema: "receiz.signal_run.card.arena_loadout.v1",
      role: "champion",
      deckRoleLabel,
      deckSlot: "champion",
      energyCost: args.strategy.loadoutCost,
      deckLimit: 1,
      activationTiming: "opening",
      tempoClass,
      compatibleElements,
      strongInto: args.arena.elementStrengths,
      weakInto: args.arena.elementWeaknesses,
      comboHooks,
      battleRule: `${args.character.name} enters as the champion, starts with ${args.arena.champion?.utilitySlots ?? args.progression.upgradeSlots} support slots, and converts ${elementNames} cards into upgraded exchanges.`,
      equipRule: `Load one champion, then equip compatible utility, relic, and field cards before battle.`,
      upgradePath: args.progression.evolutionRule,
      scoringBasis,
    };
  }

  if (args.arena.role === "relic") {
    return {
      schema: "receiz.signal_run.card.arena_loadout.v1",
      role: "relic",
      deckRoleLabel,
      deckSlot: "relic",
      energyCost: args.strategy.loadoutCost,
      deckLimit: args.utility.deckLimit,
      activationTiming: "pre-fight",
      tempoClass,
      compatibleElements,
      strongInto: args.arena.elementStrengths,
      weakInto: args.arena.elementWeaknesses,
      comboHooks,
      battleRule: `${args.arena.relicCard?.effectName ?? args.utility.abilityName} attaches before battle, persists for the match, and strengthens ${strongNames} exchanges.`,
      equipRule: `Attach to a compatible champion lineage or ${elementNames} affinity slot.`,
      upgradePath: args.strategy.upgradeRecipe,
      scoringBasis,
    };
  }

  if (args.arena.role === "field") {
    return {
      schema: "receiz.signal_run.card.arena_loadout.v1",
      role: "field",
      deckRoleLabel,
      deckSlot: "field",
      energyCost: args.strategy.loadoutCost,
      deckLimit: args.utility.deckLimit,
      activationTiming: "field",
      tempoClass,
      compatibleElements,
      strongInto: args.arena.elementStrengths,
      weakInto: args.arena.elementWeaknesses,
      comboHooks,
      battleRule: `${args.arena.fieldCard?.effectName ?? args.affinity.fieldName} changes arena rules for ${args.arena.fieldCard?.durationTurns ?? 3} turns, boosts ${elementNames}, and exposes ${weakNames} counters.`,
      equipRule: `Play as the active field condition when the champion can exploit ${args.affinity.resonance} timing.`,
      upgradePath: args.strategy.upgradeRecipe,
      scoringBasis,
    };
  }

  return {
    schema: "receiz.signal_run.card.arena_loadout.v1",
    role: "utility",
    deckRoleLabel,
    deckSlot: "utility",
    energyCost: args.strategy.loadoutCost,
    deckLimit: args.utility.deckLimit,
    activationTiming: arenaActivationTiming(args.strategy),
    tempoClass,
    compatibleElements,
    strongInto: args.arena.elementStrengths,
    weakInto: args.arena.elementWeaknesses,
    comboHooks,
    battleRule: `${args.arena.utilityCard?.effectName ?? args.utility.abilityName} is played once on a compatible champion to add ${args.arena.utilityCard?.powerDelta ?? 1} power during ${args.strategy.activationWindow} timing.`,
    equipRule: `Feed to champions with ${elementNames} affinity; weak into ${weakNames} counters.`,
    upgradePath: args.strategy.upgradeRecipe,
    scoringBasis,
  };
}

export function visualProfileForParts(args: {
  cardKind: SignalRunCardKind;
  character: SignalRunCardCharacter;
  utility: SignalRunCardUtility;
  arena: SignalRunCardArenaProfile;
  finish: SignalRunCardFinishProfile;
}): SignalRunCardVisualProfile {
  const affinity = args.character.elementalAffinity;
  const [primary, secondary] = affinity.elements;
  const primaryLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[primary];
  const secondaryLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[secondary];
  const visualSeed = args.character.characterId.replace(/^chr_/, "").slice(0, 16) || args.character.avatarMark;
  const silhouette =
    args.cardKind === "character"
      ? SIGNAL_RUN_CARD_SILHOUETTES[hashIndex(visualSeed, 2, SIGNAL_RUN_CARD_SILHOUETTES.length)] ?? "sentinel"
      : "relic-core";
  const crownClass = args.finish.finishName.includes("Crown") ? "crown-grade " : "";
  const paletteName = `${primaryLabel}-${secondaryLabel} ${args.finish.finishName}`;
  const rarityAura = `${args.finish.finishName} ${crownClass}${affinity.resonance} aura`;
  const genderPresentation = characterGenderPresentationProfile(args.character.gender);
  const detailMotifs = [
    `${primaryLabel.toLowerCase()} channel`,
    `${secondaryLabel.toLowerCase()} channel`,
    `${SIGNAL_RUN_WORLD_ELEMENT_LABELS[affinity.catalyst].toLowerCase()} catalyst`,
    args.character.lineage,
  ];
  if (args.cardKind === "character") {
    return {
      cardKind: "character",
      subjectName: args.character.name,
      imageRole: "champion-portrait",
      renderStyle: "cinematic-realistic",
      visualSeed,
      paletteName,
      silhouette,
      rarityAura,
      detailMotifs,
      artPrompt: `Cinematic realistic full-body ${genderPresentation.label} portrait of ${args.character.name}, ${args.character.epithet}, ${args.character.archetype}, ${args.character.temperament} temperament, unique render seed ${visualSeed}, built from ${primaryLabel} and ${secondaryLabel} elemental forces, official collectible trading card hero art, ${args.finish.finishName} rarity finish. ${genderPresentation.artDirection}`,
      composition: `Full character visible, centered, ${silhouette} silhouette, premium champion pose, no crop, ${crownClass}elemental aura and rarity crest behind the body. ${genderPresentation.composition}`,
      materialLanguage: `${args.finish.finishName} finish, tactile premium card surface, ${crownClass}edge treatment, dimensional armor, ${args.character.signatureSkill} details, and Receiz sigil geometry. ${genderPresentation.materialLanguage}`,
      environment: `${affinity.fieldName} arena environment with deterministic Receiz sigil geometry.`,
    };
  }

  const effectName =
    args.arena.fieldCard?.effectName ??
    args.arena.relicCard?.effectName ??
    args.utility.artifactName ??
    args.arena.utilityCard?.effectName ??
    args.utility.abilityName;
  if (args.cardKind === "field") {
    return {
      cardKind: "field",
      subjectName: effectName,
      imageRole: "field-arena",
      renderStyle: "cinematic-realistic",
      visualSeed,
      paletteName,
      silhouette,
      rarityAura,
      detailMotifs,
      artPrompt: `Cinematic realistic arena field render of ${effectName}, unique render seed ${visualSeed}, a tactical ${primaryLabel} and ${secondaryLabel} Signal Arena field card with visible battlefield geometry, elemental weather, and ${args.finish.finishName} rarity finish.`,
      composition: `Wide arena condition fully visible, floating field perimeter, ${crownClass}elemental atmosphere, no character body.`,
      materialLanguage: `${args.finish.finishName} finish, dimensional terrain, ${crownClass}edge treatment, light lattice, atmosphere, and catalyst weather.`,
      environment: `${affinity.fieldName} arena field with active ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[affinity.catalyst]} catalyst boundary.`,
    };
  }
  if (args.cardKind === "relic") {
    return {
      cardKind: "relic",
      subjectName: effectName,
      imageRole: "relic-equipment",
      renderStyle: "cinematic-realistic",
      visualSeed,
      paletteName,
      silhouette,
      rarityAura,
      detailMotifs,
      artPrompt: `Cinematic realistic equipment relic render of ${effectName}, unique render seed ${visualSeed}, a persistent ${primaryLabel} and ${secondaryLabel} Signal Arena relic card, premium collectible attachment art, ${args.finish.finishName} rarity finish.`,
      composition: `Hero relic equipment fully visible, floating over a physical plinth, ${crownClass}crest ring, no character body.`,
      materialLanguage: `${args.finish.finishName} finish, forged metal, glass, ${crownClass}edge treatment, sigil circuitry, and elemental charge.`,
      environment: `${affinity.fieldName} relic forge with compatible champion attachment channels.`,
    };
  }
  return {
    cardKind: "utility",
    subjectName: effectName,
    imageRole: "utility-relic",
    renderStyle: "cinematic-realistic",
    visualSeed,
    paletteName,
    silhouette,
    rarityAura,
    detailMotifs,
    artPrompt: `Cinematic realistic artifact render of ${effectName}, unique render seed ${visualSeed}, a one-use ${primaryLabel} and ${secondaryLabel} Signal Arena utility card, premium collectible trading card utility art, ${args.finish.finishName} rarity finish.`,
    composition: `Hero utility object fully visible, floating over a clean arena plinth, ${crownClass}crest ring, no character body.`,
    materialLanguage: `${args.finish.finishName} finish, glass, metal, ${crownClass}edge treatment, light, and elemental energy with visible utility charge.`,
    environment: `${affinity.fieldName} utility chamber with compatible champion upgrade channels.`,
  };
}

export function signalRunCardArtDirective(claim: SignalRunCardClaim): SignalRunCardArtDirective {
  const character = signalRunCardCharacterProfile(claim);
  const progression = signalRunCardProgressionProfile(claim);
  const finish = signalRunCardFinishProfile(claim);
  const arena = signalRunCardArenaProfile(claim);
  const visual = signalRunCardVisualProfile(claim);
  const affinity = signalRunCardElementalAffinityProfile(claim);
  const [primary, secondary] = affinity.elements;
  const primaryLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[primary];
  const secondaryLabel = SIGNAL_RUN_WORLD_ELEMENT_LABELS[secondary];
  const renderId = `srart_${claim.claimHash.slice(0, 24)}`;
  const genderPresentation = characterGenderPresentationProfile(character.gender);
  const common = [
    "Create original premium collectible card subject art.",
    `Render ID: ${renderId}.`,
    `Collectible ID: ${claim.collectibleId}.`,
    `Exact subject name: ${visual.subjectName}.`,
    `Unique visual seed: ${visual.visualSeed}.`,
    `Elements: ${primaryLabel} and ${secondaryLabel}; catalyst ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[affinity.catalyst]}.`,
    `Finish language: ${finish.finishName}; rarity ${signalRunCardRarityClassLabel(claim.rarity)}; power ${claim.utility.power}; level ${progression.level}.`,
    `Motifs: ${visual.detailMotifs.join(", ")}.`,
    `Environment: ${visual.environment}.`,
    "No text, no letters, no numbers, no QR code, no watermark, no logos, no card frame, no existing copyrighted characters, no living-person likeness.",
  ];
  const subject = arena.role === "champion"
    ? [
        `Full-body cinematic realistic champion character: ${character.name}.`,
        `Gender presentation: ${genderPresentation.label}.`,
        `Presentation direction: ${genderPresentation.artDirection}`,
        `Archetype: ${character.archetype}; temperament ${character.temperament}; signature skill ${character.signatureSkill}.`,
        "Show the entire body, face, armor, stance, weapon silhouette, and elemental aura without cropping.",
        "The character must be a unique original hero, not a variant of any known franchise character.",
      ]
    : arena.role === "field"
      ? [
          `Cinematic realistic arena field: ${arena.fieldCard?.effectName ?? visual.subjectName}.`,
          `Arena effect: ${arena.fieldCard?.effectText ?? arena.useRule}.`,
          "Show the entire battlefield condition, field boundary, weather, terrain geometry, and elemental channels.",
          "The field must be unique original arena environment art, not a logo, map copy, or known franchise location.",
        ]
    : arena.role === "relic"
      ? [
          `Cinematic realistic equipment relic: ${arena.relicCard?.effectName ?? visual.subjectName}.`,
          `Relic effect: ${arena.relicCard?.effectText ?? arena.useRule}.`,
          "Show one fully visible premium equipment object floating over a physical plinth with attachment channels.",
          "The relic must be a unique original artifact, not a logo, device copy, or known franchise item.",
        ]
    : [
        `Cinematic realistic utility relic: ${claim.utility.artifactName ?? visual.subjectName}.`,
        `Arena effect: ${arena.utilityCard?.effectName ?? claim.utility.abilityName}.`,
        "Show one fully visible premium object floating over a physical plinth with elemental energy, glass, metal, and light.",
        "The object must be a unique original utility artifact, not a logo, device copy, or known franchise item.",
      ];
  return {
    schema: "receiz.signal_run.card.art_directive.v1",
    renderId,
    collectibleId: claim.collectibleId,
    claimHash: claim.claimHash,
    subjectName: visual.subjectName,
    subjectKind: signalRunCardKindForClaim(claim),
    visualSeed: visual.visualSeed,
    prompt: [...common, ...subject, visual.artPrompt, visual.composition, visual.materialLanguage].join("\n"),
    negativePrompt: [
      "text, letters, numbers, QR code, watermark, logo, card border, card template, existing franchise character, copied trading card, cropped body, duplicate subject, blurry subject",
      genderPresentation.negativePrompt,
    ].filter(Boolean).join(", "),
  };
}

async function identityForInput(input: BuildSignalRunCardInput): Promise<SignalRunCardIdentity> {
  const username = normalizeUsername(input.username);
  const uid = typeof input.uid === "string" && input.uid.trim() ? input.uid.trim() : null;
  const identityMaterial = input.signedIn
    ? `receiz.signal-run.identity:${uid ?? "no-uid"}:${username ?? "no-username"}`
    : `receiz.signal-run.identity:local:${input.dailySeed}:${input.runOrdinal}`;
  const identityFingerprint = (await sha256Hex(identityMaterial)).slice(0, 24);
  const creationSigilSeed = (await sha256Hex(`receiz.signal-run.creation-sigil:${identityFingerprint}`)).slice(0, 32);
  return {
    signedIn: input.signedIn,
    username,
    displayHandle: username ? `@${username}` : "Local runner",
    identityFingerprint,
    creationSigilSeed,
  };
}

function withoutHashes(claim: Omit<SignalRunCardClaim, "sealHash" | "claimHash">): Omit<SignalRunCardClaim, "sealHash" | "claimHash"> {
  return claim;
}

export async function buildSignalRunCardClaim(input: BuildSignalRunCardInput): Promise<SignalRunCardClaim> {
  const stats = normalizeStats(input.stats);
  const runOrdinal = finiteWhole(input.runOrdinal, 1, 1);
  const dailySeed = finiteWhole(input.dailySeed, 0, 0);
  const earnedAtMs = finiteWhole(input.earnedAtMs ?? Date.now(), Date.now(), 0, Number.MAX_SAFE_INTEGER);
  const achievements = Array.from(new Set(input.achievements)).sort() as SignalRunAchievementKey[];
  const rarity = rarityForStats(stats, achievements, runOrdinal);
  const title = titleForCard({ mission: input.mission, stats, achievements, rarity });
  const identity = await identityForInput({ ...input, dailySeed, runOrdinal });
  const playableClass = playableClassForMission(input.mission.key);
  const routeActions = input.routeActions.map((action) => ({
    key: action.key,
    label: action.label,
    href: action.href,
  }));
  const baseIdMaterial = jcsCanonicalize({
    schema: "receiz.signal_run.card.v1",
    dailySeed,
    runOrdinal,
    earnedAtMs,
    identityFingerprint: identity.identityFingerprint,
    missionKey: input.mission.key,
    stats,
    achievements,
    forcedCardKind: input.forcedCardKind ?? null,
    derivation: input.derivation ?? null,
  });
  const baseHash = await sha256Hex(baseIdMaterial);
  const cardKind = input.forcedCardKind ?? cardKindForRun(rarity, stats, achievements, input.mission.key, baseHash);
  const character = characterForParts({
    baseHash,
    missionKey: input.mission.key,
    stats,
    achievements,
    identity,
    rarity,
    derivation: input.derivation ?? null,
  });
  const progressionSeedUtility = utilityForClass(playableClass, stats, achievements, undefined, undefined, baseHash, "utility");
  const progression = progressionForParts({
    character,
    stats,
    achievements,
    rarity,
    utilityAbilityName: progressionSeedUtility.abilityName,
  });
  const utility = utilityForClass(playableClass, stats, achievements, character, progression, baseHash, cardKind);
  const reward = rewardForParts({
    baseHash,
    rarity,
    cardKind,
    stats,
    achievements,
    runOrdinal,
    missionKey: input.mission.key,
    missionName: input.mission.name,
    character,
    progression,
    utility,
  });
  const finish = finishForParts({ baseHash, rarity, character, reward });
  const arena = arenaProfileForParts({ baseHash, cardKind, character, progression, utility });
  const strategy = strategyForParts({
    cardKind,
    character,
    progression,
    utility,
    affinity: character.elementalAffinity,
  });
  const arenaLoadout = arenaLoadoutForParts({
    cardKind,
    character,
    progression,
    utility,
    strategy,
    arena,
    affinity: character.elementalAffinity,
    stats,
  });
  const battle = battleProfileForParts({
    baseHash,
    cardKind,
    character,
    progression,
    utility,
    arena,
    loadout: arenaLoadout,
    stats,
  });
  const mechanics = mechanicsProfileForParts({
    cardKind,
    rarity,
    stats,
    achievements,
    character,
    progression,
    utility,
    reward,
    strategy,
    arena,
    loadout: arenaLoadout,
    battle,
  });
  const visual = visualProfileForParts({ cardKind, character, utility, arena, finish });
  const collectibleId = `src_${baseHash.slice(0, 16)}`;
  const achievementSealId = `srs_${baseHash.slice(16, 32)}`;
  const cardNumber = `SR-S01-${Number.parseInt(baseHash.slice(0, 6), 16).toString().padStart(7, "0").slice(-7)}`;
  const core = withoutHashes({
    schema: "receiz.signal_run.card.v1",
    collectibleId,
    achievementSealId,
    season: "signal-run-s01",
    edition: "genesis",
    cardNumber,
    title,
    rank: input.rank,
    rarity,
    cardKind,
    earnedAtMs,
    dailySeed,
    runOrdinal,
    missionKey: input.mission.key,
    missionName: input.mission.name,
    achievements,
    stats,
    identity,
    character,
    progression,
    finish,
    utility,
    strategy,
    reward,
    arenaLoadout,
    battle,
    mechanics,
    visual,
    arena,
    ...(input.derivation ? { derivation: input.derivation } : {}),
    provenance: {
      originalEarnerFingerprint: identity.identityFingerprint,
      currentOwnerFingerprint: identity.identityFingerprint,
      achievementTransferable: false,
      collectibleTransferable: true,
      transferState: "held-by-earner",
    },
    routeActions,
  });
  const sealHash = await sha256Hex(
    jcsCanonicalize({
      type: "receiz.signal_run.achievement_seal.v1",
      nonTransferableAchievement: true,
      collectibleTransferable: true,
      claim: core,
    }),
  );
  const claimHash = await sha256Hex(jcsCanonicalize({ ...core, sealHash }));
  return { ...core, sealHash, claimHash };
}

export async function buildSignalRunChildCardClaim(input: BuildSignalRunChildCardInput): Promise<SignalRunCardClaim> {
  const parentA = input.parentA;
  const parentB = input.parentB;
  const append = input.combineAppend;
  if (signalRunCardKindForClaim(parentA) !== "character" || signalRunCardKindForClaim(parentB) !== "character") {
    throw new Error("signal_run_child_requires_character_parents");
  }
  if (!(await verifySignalRunCardClaim(parentA)) || !(await verifySignalRunCardClaim(parentB))) {
    throw new Error("signal_run_child_parent_claim_invalid");
  }
  if (!(await verifySignalRunCardAppendRecord(append, parentA))) {
    throw new Error("signal_run_child_combine_append_invalid");
  }
  if (append.payload.kind !== "combine" || !append.payload.childEligible || !append.payload.childSeed) {
    throw new Error("signal_run_child_combine_not_eligible");
  }
  const parentACharacter = signalRunCardCharacterProfile(parentA);
  const parentBCharacter = signalRunCardCharacterProfile(parentB);
  const parentAGender = parentACharacter.gender ?? characterGenderForHash(parentA.claimHash);
  const parentBGender = parentBCharacter.gender ?? characterGenderForHash(parentB.claimHash);
  if (parentAGender === parentBGender) {
    throw new Error("signal_run_child_requires_opposite_parent_genders");
  }
  const parentIds = new Set(append.payload.sources.map((source) => source.collectibleId));
  if (!parentIds.has(parentB.collectibleId)) {
    throw new Error("signal_run_child_missing_second_parent");
  }
  const inheritedElements = uniqueWorldElements([
    parentACharacter.naturalElements[0],
    parentBCharacter.naturalElements[0],
    parentACharacter.naturalElements[1],
    parentBCharacter.naturalElements[1],
  ]).slice(0, 2) as [SignalRunWorldElement, SignalRunWorldElement];
  const safeInheritedElements = inheritedElements.length === 2
    ? inheritedElements
    : [parentACharacter.naturalElements[0], parentBCharacter.naturalElements[0]] as [SignalRunWorldElement, SignalRunWorldElement];
  const childSeedHash = await sha256Hex(jcsCanonicalize({
    schema: "receiz.signal_run.card.child_seed.v1",
    parentA: { collectibleId: parentA.collectibleId, claimHash: parentA.claimHash },
    parentB: { collectibleId: parentB.collectibleId, claimHash: parentB.claimHash },
    appendHash: append.appendHash,
    childSeed: append.payload.childSeed,
  }));
  const stats: SignalRunCardStats = {
    score: Math.max(parentA.stats.score, parentB.stats.score, Math.floor((parentA.stats.score + parentB.stats.score) / 2)),
    proof: attributeClamp(Math.floor((parentA.stats.proof + parentB.stats.proof) / 2) + 2),
    value: attributeClamp(Math.floor((parentA.stats.value + parentB.stats.value) / 2) + 2),
    trust: Math.max(1, Math.min(100, Math.floor((parentA.stats.trust + parentB.stats.trust) / 2))),
    peakCombo: Math.max(parentA.stats.peakCombo, parentB.stats.peakCombo),
    missionClears: Math.max(parentA.stats.missionClears, parentB.stats.missionClears),
    breakthroughs: Math.max(parentA.stats.breakthroughs, parentB.stats.breakthroughs),
    sector: Math.max(parentA.stats.sector, parentB.stats.sector),
    level: Math.max(1, Math.floor((signalRunCardProgressionProfile(parentA).level + signalRunCardProgressionProfile(parentB).level) / 2)),
  };
  const derivation: SignalRunCardDerivationProfile = {
    schema: "receiz.signal_run.card.derivation.v1",
    derivationKind: "child",
    parentA: { ...signalRunArenaCardRef(parentA), role: "parent" },
    parentB: { ...signalRunArenaCardRef(parentB), role: "parent" },
    combineAppendHash: append.appendHash,
    childSeed: append.payload.childSeed,
    inheritedLineage: parentACharacter.lineage === parentBCharacter.lineage ? parentACharacter.lineage : `${parentACharacter.lineage} / ${parentBCharacter.lineage}`,
    inheritedElements: safeInheritedElements,
    compatibilityRule: "Child cards require two owned opposite-gender Character cards plus a verified combine append. Parent cards remain playable and visible.",
    inheritanceRule: "The child inherits lineage, elemental affinity, and battle potential from both sealed parent claims and the combine append hash.",
    permanenceRule: "The child is a new sealed Signal Circuit Card. It may become lineage head by append, but it never rewrites either parent card.",
  };
  const childMission = SIGNAL_RUN_MISSIONS.find((mission) => mission.key === parentA.missionKey) ?? SIGNAL_RUN_MISSIONS[0];
  return buildSignalRunCardClaim({
    dailySeed: Number.parseInt(childSeedHash.slice(0, 8), 16),
    runOrdinal: Number.parseInt(childSeedHash.slice(8, 14), 16),
    rank: "Lineage Child",
    mission: childMission,
    achievements: Array.from(new Set([...parentA.achievements, ...parentB.achievements])).slice(0, 5) as SignalRunAchievementKey[],
    routeActions: [SIGNAL_RUN_REAL_ACTIONS.seal, SIGNAL_RUN_REAL_ACTIONS.world],
    stats,
    signedIn: input.signedIn,
    username: input.username,
    uid: input.uid,
    earnedAtMs: input.earnedAtMs ?? Math.max(parentA.earnedAtMs, parentB.earnedAtMs, append.createdAtMs),
    forcedCardKind: "character",
    derivation,
  });
}

export function encodeSignalRunCardClaim(claim: SignalRunCardClaim): string {
  return base64UrlEncode(textEncoder.encode(jcsCanonicalize(claim)));
}

export function encodeSignalRunCardClaimCompact(claim: SignalRunCardClaim): string {
  return `z.${base64UrlEncode(gzipSync(strToU8(jcsCanonicalize(claim)), { mtime: 0 }))}`;
}

export function decodeSignalRunCardClaim(encoded: string): SignalRunCardClaim | null {
  try {
    const decoded = encoded.startsWith("z.")
      ? strFromU8(gunzipSync(base64UrlDecode(encoded.slice(2))))
      : textDecoder.decode(base64UrlDecode(encoded));
    const parsed = JSON.parse(decoded) as Partial<SignalRunCardClaim>;
    if (parsed.schema !== "receiz.signal_run.card.v1") return null;
    if (typeof parsed.collectibleId !== "string" || !parsed.collectibleId.startsWith("src_")) return null;
    if (typeof parsed.achievementSealId !== "string" || !parsed.achievementSealId.startsWith("srs_")) return null;
    if (typeof parsed.sealHash !== "string" || parsed.sealHash.length !== 64) return null;
    if (typeof parsed.claimHash !== "string" || parsed.claimHash.length !== 64) return null;
    if (!parsed.stats || typeof parsed.stats !== "object") return null;
    if (!parsed.identity || typeof parsed.identity !== "object") return null;
    if (!parsed.utility || typeof parsed.utility !== "object") return null;
    if (!parsed.provenance || typeof parsed.provenance !== "object") return null;
    return parsed as SignalRunCardClaim;
  } catch {
    return null;
  }
}

export async function verifySignalRunCardClaim(claim: SignalRunCardClaim): Promise<boolean> {
  const { sealHash, claimHash, ...core } = claim;
  const expectedSealHash = await sha256Hex(
    jcsCanonicalize({
      type: "receiz.signal_run.achievement_seal.v1",
      nonTransferableAchievement: true,
      collectibleTransferable: true,
      claim: core,
    }),
  );
  if (expectedSealHash !== sealHash) return false;
  const expectedClaimHash = await sha256Hex(jcsCanonicalize({ ...core, sealHash }));
  return expectedClaimHash === claimHash;
}

export function signalRunArenaRulebook(): SignalRunArenaRulebook {
  return {
    schema: "receiz.signal_arena.rulebook.v1",
    deck: {
      champion: 1,
      utilities: 3,
      relics: 1,
      fields: 1,
      maxEnergy: 10,
      rule: "A legal Arena loadout uses one Champion, up to three Utilities, one Relic, one Field, and no more than ten total energy.",
    },
    cardTypes: {
      character: {
        role: "champion",
        purpose: "Champion Cards are the playable fighters. They carry identity, base stats, elements, skills, and verified victory growth.",
        deckRule: "Exactly one Champion enters each Arena match.",
        growthRule: "Champion growth comes from verified battle and evolution appends only.",
      },
      utility: {
        role: "utility",
        purpose: "Utility Cards are tactical one-use plays that create timing, protection, burst, counter, or combo openings.",
        deckRule: "A loadout may carry three Utilities; each Utility is spent by a verified feed append when consumed.",
        growthRule: "Utility value comes from precise usage history and from the champions it successfully feeds.",
      },
      relic: {
        role: "relic",
        purpose: "Relic Cards are match attachments that shape a champion build without replacing the champion.",
        deckRule: "A loadout may attach one Relic to a compatible Champion before battle.",
        growthRule: "Relic mastery appends after verified wins while attached.",
      },
      field: {
        role: "field",
        purpose: "Field Cards are Arena conditions that alter elemental advantage, tempo, and counterplay windows.",
        deckRule: "A loadout may set one Field condition for the match window.",
        growthRule: "Field control appends after verified wins under that condition.",
      },
    },
    elements: SIGNAL_RUN_WORLD_ELEMENTS.map((element) => ({
      element,
      strongInto: SIGNAL_RUN_WORLD_ELEMENT_ADVANTAGE[element],
      weakInto: signalRunWorldElementCounter(element),
      strategy: `${SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]} pressures ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[SIGNAL_RUN_WORLD_ELEMENT_ADVANTAGE[element]]} and must respect ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[signalRunWorldElementCounter(element)]} counters.`,
    })),
    battle: {
      winRule: "Arena wins are awarded by resolved damage, guard survival, tempo control, and sealed card rating after elemental advantage is applied.",
      timingRule: "Opening, reaction, combo, and field windows are explicit. Strong timing rewards skill; weak timing exposes counterplay.",
      counterplayRule: "Every strong element has a counter element, and every Utility, Relic, and Field has a legal target rule.",
    },
    appendLaw: "The original sealed Signal Circuit Card never changes. Arena battles, wins, feeds, combines, evolutions, and transfers append verified records exactly like Receiz ownership history.",
  };
}

export function signalRunArenaCardRef(claim: SignalRunCardClaim): SignalRunArenaCardRef {
  const character = signalRunCardCharacterProfile(claim);
  const loadout = signalRunCardArenaLoadoutProfile(claim);
  const battle = signalRunCardBattleProfile(claim);
  const visual = signalRunCardVisualProfile(claim);
  return {
    collectibleId: claim.collectibleId,
    claimHash: claim.claimHash,
    cardKind: signalRunCardKindForClaim(claim),
    arenaRole: loadout.role,
    rarityClass: signalRunCardRarityClassLabel(claim.rarity),
    issueLine: signalRunCardIssueLineLabel(claim.rarity),
    name: visual.subjectName || character.name,
    lineage: character.lineage,
    ...(character.gender ? { gender: character.gender } : {}),
    naturalElements: character.naturalElements,
    battleRating: battle.battleRating,
  };
}

export function signalRunArenaElementMatchup(
  attacker: SignalRunCardClaim,
  defender: SignalRunCardClaim,
): SignalRunArenaElementMatchup {
  const attackElements = signalRunCardElementalAffinityProfile(attacker).elements;
  const defendElements = signalRunCardElementalAffinityProfile(defender).elements;
  const advantages = uniqueWorldElements(attackElements.filter((element) =>
    defendElements.includes(SIGNAL_RUN_WORLD_ELEMENT_ADVANTAGE[element]),
  ));
  const disadvantages = uniqueWorldElements(attackElements.filter((element) =>
    defendElements.some((defenderElement) => SIGNAL_RUN_WORLD_ELEMENT_ADVANTAGE[defenderElement] === element),
  ));
  const edge = advantages.length - disadvantages.length;
  const multiplier: SignalRunArenaElementMatchup["multiplier"] =
    edge >= 2 ? 1.25 :
    edge === 1 ? 1.12 :
    edge === -1 ? 0.88 :
    edge <= -2 ? 0.75 :
    1;
  const advantageLabel = advantages.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ") || "no direct edge";
  const disadvantageLabel = disadvantages.map((element) => SIGNAL_RUN_WORLD_ELEMENT_LABELS[element]).join(" / ") || "no direct counter";
  return {
    schema: "receiz.signal_arena.element_matchup.v1",
    attacker: attackElements,
    defender: defendElements,
    advantages,
    disadvantages,
    multiplier,
    explanation: `${worldElementPairLabel(attackElements[0], attackElements[1], " / ")} attacks ${worldElementPairLabel(defendElements[0], defendElements[1], " / ")} with ${advantageLabel} advantage and ${disadvantageLabel} pressure.`,
  };
}

export function signalRunArenaSupportScore(card: SignalRunCardClaim, champion: SignalRunCardClaim): number {
  const supportLoadout = signalRunCardArenaLoadoutProfile(card);
  const supportBattle = signalRunCardBattleProfile(card);
  const championAffinity = signalRunCardElementalAffinityProfile(champion);
  const compatible = supportLoadout.compatibleElements.some((element) =>
    championAffinity.elements.includes(element) || championAffinity.catalyst === element,
  );
  const roleBonus =
    supportLoadout.role === "relic" ? 34 :
    supportLoadout.role === "field" ? 28 :
    18;
  const timingBonus =
    supportLoadout.activationTiming === "combo" ? supportBattle.baseTempo :
    supportLoadout.activationTiming === "reaction" ? supportBattle.baseGuard :
    supportLoadout.activationTiming === "field" ? Math.round((supportBattle.baseGuard + supportBattle.baseTempo) / 2) :
    supportBattle.baseDamage;
  return Math.max(0, Math.round(roleBonus + timingBonus * 0.45 + supportBattle.battleRating * 0.12 + (compatible ? 24 : -18) - supportLoadout.energyCost * 5));
}

export function signalRunArenaLoadoutEnergy(cards: SignalRunCardClaim[]): number {
  return cards.reduce((sum, card) => sum + signalRunCardArenaLoadoutProfile(card).energyCost, 0);
}

export function signalRunArenaPickOpponent(cards: SignalRunCardClaim[], champion: SignalRunCardClaim): SignalRunCardClaim | null {
  return cards
    .filter((card) => card.collectibleId !== champion.collectibleId && signalRunCardArenaLoadoutProfile(card).role === "champion")
    .sort((a, b) => signalRunCardBattleProfile(b).battleRating - signalRunCardBattleProfile(a).battleRating)[0] ?? null;
}

export function signalRunArenaBattleScore(args: {
  champion: SignalRunCardClaim;
  supports: SignalRunCardClaim[];
  opponent: SignalRunCardClaim | null;
  matchup: SignalRunArenaElementMatchup | null;
  seed: number;
  effectiveState?: SignalRunCardEffectiveArenaState | null;
}): number {
  const battle = signalRunCardBattleProfile(args.champion);
  const progression = signalRunCardProgressionProfile(args.champion);
  const character = signalRunCardCharacterProfile(args.champion);
  const control = signalRunCardControlScore(args.champion);
  const supportScore = args.supports.reduce((sum, card) => sum + signalRunArenaSupportScore(card, args.champion), 0);
  const energy = signalRunArenaLoadoutEnergy([args.champion, ...args.supports]);
  const energyPenalty = energy > signalRunArenaRulebook().deck.maxEnergy ? (energy - signalRunArenaRulebook().deck.maxEnergy) * 42 : 0;
  const matchupFactor = args.matchup?.multiplier ?? 1;
  const seedNudge = (args.seed % 17) - 8;
  const opponentPressure = args.opponent ? Math.floor(signalRunCardBattleProfile(args.opponent).battleRating * 0.1) : 26;
  const appendBonus = args.effectiveState
    ? args.effectiveState.wins * 8 +
      args.effectiveState.draws * 2 +
      Math.max(0, args.effectiveState.level - progression.level) * 1.4 +
      Math.max(0, args.effectiveState.power - args.champion.utility.power) * 1.1 +
      Math.max(0, args.effectiveState.resonance - character.attributes.resonance) * 0.9
    : 0;
  return Math.max(1, Math.round((
    battle.battleRating +
    control * 2 +
    progression.level * 1.8 +
    character.attributes.resonance * 0.8 +
    supportScore +
    appendBonus +
    seedNudge -
    opponentPressure -
    energyPenalty
  ) * matchupFactor));
}

function signalRunArenaSupportResolution(card: SignalRunCardClaim, champion: SignalRunCardClaim): SignalRunArenaSupportResolution {
  const ref = signalRunArenaCardRef(card);
  const loadout = signalRunCardArenaLoadoutProfile(card);
  const score = signalRunArenaSupportScore(card, champion);
  const championAffinity = signalRunCardElementalAffinityProfile(champion);
  const compatible = loadout.compatibleElements.some((element) =>
    championAffinity.elements.includes(element) || championAffinity.catalyst === element,
  );
  return {
    card: ref,
    role: loadout.role,
    energyCost: loadout.energyCost,
    compatible,
    score,
    timing: loadout.activationTiming,
    line: `${ref.name} enters as ${loadout.deckRoleLabel.toLowerCase()} timing with ${score} tactical value${compatible ? "" : " under counter pressure"}.`,
  };
}

function arenaTurnWindowForTiming(timing: SignalRunCardArenaLoadoutProfile["activationTiming"]): SignalRunArenaBattleWindow {
  if (timing === "field" || timing === "pre-fight") return "field";
  if (timing === "reaction") return "reaction";
  if (timing === "combo") return "combo";
  return "opening";
}

function signalRunArenaPushTurn(
  turns: SignalRunArenaBattleTurn[],
  turn: Omit<SignalRunArenaBattleTurn, "turn">,
): void {
  turns.push({ ...turn, turn: turns.length + 1 });
}

export function resolveSignalRunArenaBattle(args: {
  champion: SignalRunCardClaim;
  supports?: SignalRunCardClaim[];
  opponent?: SignalRunCardClaim | null;
  seed: number;
  effectiveState?: SignalRunCardEffectiveArenaState | null;
}): SignalRunArenaBattleResolution {
  const supports = args.supports ?? [];
  const rulebook = signalRunArenaRulebook();
  const champion = args.champion;
  const opponent = args.opponent ?? null;
  const championRef = signalRunArenaCardRef(champion);
  const opponentRef = opponent ? signalRunArenaCardRef(opponent) : null;
  const matchup = opponent ? signalRunArenaElementMatchup(champion, opponent) : null;
  const reverseMatchup = opponent ? signalRunArenaElementMatchup(opponent, champion) : null;
  const championBattle = signalRunCardBattleProfile(champion);
  const opponentBattle = opponent ? signalRunCardBattleProfile(opponent) : null;
  const championAffinity = signalRunCardElementalAffinityProfile(champion);
  const supportResolutions = supports.map((card) => signalRunArenaSupportResolution(card, champion));
  const energy = signalRunArenaLoadoutEnergy([champion, ...supports]);
  const legal = energy <= rulebook.deck.maxEnergy;
  const championScore = signalRunArenaBattleScore({
    champion,
    supports,
    opponent,
    matchup,
    seed: args.seed,
    effectiveState: args.effectiveState,
  });
  const opponentScore = opponent
    ? signalRunArenaBattleScore({
        champion: opponent,
        supports: [],
        opponent: champion,
        matchup: reverseMatchup,
        seed: args.seed + 131,
      })
    : Math.max(60, Math.round(championBattle.battleRating * 0.82 + energy * 9 + 24));
  const result: SignalRunArenaBattleResult =
    championScore >= opponentScore + 8 ? "win" :
    opponentScore >= championScore + 8 ? "loss" :
    "draw";
  const turns: SignalRunArenaBattleTurn[] = [];
  const openingElement = championAffinity.elements[0];
  signalRunArenaPushTurn(turns, {
    window: "opening",
    actor: "champion",
    sourceName: championRef.name,
    sourceCollectibleId: championRef.collectibleId,
    element: openingElement,
    title: championBattle.openingMove,
    championDelta: Math.max(8, Math.round(championBattle.baseDamage * 0.42 + signalRunCardControlScore(champion) * 0.9)),
    opponentDelta: 0,
    line: `${championRef.name} opens through ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[openingElement]} pressure and establishes the first tempo window.`,
  });
  for (const support of supportResolutions.filter((item) => item.role === "field")) {
    signalRunArenaPushTurn(turns, {
      window: "field",
      actor: "support",
      sourceName: support.card.name,
      sourceCollectibleId: support.card.collectibleId,
      element: support.card.naturalElements[0],
      title: "Field condition",
      championDelta: Math.max(3, Math.round(support.score * (support.compatible ? 0.58 : 0.18))),
      opponentDelta: support.compatible ? 0 : Math.max(2, Math.round(support.score * 0.22)),
      line: support.compatible
        ? `${support.card.name} bends the arena condition toward the champion line.`
        : `${support.card.name} is legal but resisted by the champion element pair.`,
    });
  }
  if (opponentRef) {
    const counterElement = opponentRef.naturalElements[0];
    signalRunArenaPushTurn(turns, {
      window: "reaction",
      actor: "opponent",
      sourceName: opponentRef.name,
      sourceCollectibleId: opponentRef.collectibleId,
      element: counterElement,
      title: opponentBattle?.counterMove ?? "Counter window",
      championDelta: reverseMatchup && reverseMatchup.multiplier < 1 ? Math.round(championBattle.baseGuard * 0.18) : 0,
      opponentDelta: Math.max(8, Math.round((opponentBattle?.baseDamage ?? 80) * 0.34 + (reverseMatchup?.multiplier ?? 1) * 12)),
      line: `${opponentRef.name} answers through ${SIGNAL_RUN_WORLD_ELEMENT_LABELS[counterElement]} and tests guard discipline.`,
    });
  }
  for (const support of supportResolutions.filter((item) => item.role === "utility").slice(0, 3)) {
    signalRunArenaPushTurn(turns, {
      window: arenaTurnWindowForTiming(support.timing),
      actor: "support",
      sourceName: support.card.name,
      sourceCollectibleId: support.card.collectibleId,
      element: support.card.naturalElements[0],
      title: support.compatible ? "Utility feed" : "Pressured utility",
      championDelta: Math.max(2, Math.round(support.score * (support.compatible ? 0.64 : 0.28))),
      opponentDelta: support.compatible ? 0 : Math.max(2, Math.round(support.score * 0.2)),
      line: support.compatible
        ? `${support.card.name} feeds a clean ${support.timing} window.`
        : `${support.card.name} still fires, but the elemental line is not clean.`,
    });
  }
  for (const support of supportResolutions.filter((item) => item.role === "relic")) {
    signalRunArenaPushTurn(turns, {
      window: "combo",
      actor: "support",
      sourceName: support.card.name,
      sourceCollectibleId: support.card.collectibleId,
      element: support.card.naturalElements[1],
      title: "Relic attachment",
      championDelta: Math.max(4, Math.round(support.score * 0.48)),
      opponentDelta: support.compatible ? 0 : 2,
      line: `${support.card.name} anchors the build as a persistent match attachment.`,
    });
  }
  const margin = championScore - opponentScore;
  signalRunArenaPushTurn(turns, {
    window: "finisher",
    actor: result === "loss" && opponentRef ? "opponent" : "champion",
    sourceName: result === "loss" && opponentRef ? opponentRef.name : championRef.name,
    sourceCollectibleId: result === "loss" && opponentRef ? opponentRef.collectibleId : championRef.collectibleId,
    element: championAffinity.elements[1],
    title: result === "win" ? championBattle.finisherMove : result === "draw" ? "Settlement hold" : opponentBattle?.finisherMove ?? "Closing counter",
    championDelta: result === "win" ? Math.max(8, Math.round(Math.abs(margin) * 0.34)) : result === "draw" ? 4 : 0,
    opponentDelta: result === "loss" ? Math.max(8, Math.round(Math.abs(margin) * 0.34)) : result === "draw" ? 4 : 0,
    line: result === "win"
      ? `${championRef.name} closes the match by ${Math.abs(margin)} rating points.`
      : result === "draw"
        ? `${championRef.name} preserves the loadout in an even settlement.`
        : `${opponentRef?.name ?? "Circuit Trial"} wins the closing window by ${Math.abs(margin)} rating points.`,
  });
  const appendPlan: SignalRunCardAppendKind[] = ["battle"];
  for (let index = 0; index < Math.min(3, supportResolutions.filter((item) => item.role === "utility").length); index += 1) {
    appendPlan.push("utility-feed");
  }
  if (result === "win") appendPlan.push("victory-growth");
  if (result === "win" && supportResolutions.length >= 2) appendPlan.push("combine");
  return {
    schema: "receiz.signal_arena.battle_resolution.v1",
    rulebookVersion: rulebook.schema,
    seed: finiteWhole(args.seed, 0, 0, Number.MAX_SAFE_INTEGER),
    matchId: `sam_${champion.claimHash.slice(0, 10)}${String(Math.abs(args.seed)).slice(-6).padStart(6, "0")}`,
    legal,
    energy,
    maxEnergy: rulebook.deck.maxEnergy,
    result,
    championScore,
    opponentScore,
    margin,
    champion: championRef,
    opponent: opponentRef,
    supports: supportResolutions,
    matchup,
    turns,
    appendPlan,
    decisionLine: legal
      ? `${championRef.name} resolves ${championScore}-${opponentScore} with ${energy}/${rulebook.deck.maxEnergy} energy.`
      : `${championRef.name} is over the ${rulebook.deck.maxEnergy} energy limit; this loadout cannot be admitted.`,
    rewardLine: result === "win"
      ? `Victory admits ${appendPlan.length} verified append records without changing the original card.`
      : result === "draw"
        ? "Draw admits the battle receipt only; no victory growth is written."
        : "Defeat admits the battle receipt only; the loadout can be revised before the next attempt.",
  };
}

export function signalRunArenaChallengeProfile(args: {
  champion: SignalRunCardClaim | null;
  supports?: SignalRunCardClaim[];
  opponent?: SignalRunCardClaim | null;
  resolution?: SignalRunArenaBattleResolution | null;
  visualState?: SignalRunCardBattleVisualState | null;
}): SignalRunArenaChallengeProfile {
  const supports = args.supports ?? [];
  const rulebook = signalRunArenaRulebook();
  const champion = args.champion;
  if (!champion) {
    return {
      schema: "receiz.signal_arena.challenge_profile.v1",
      tier: "locked",
      tierLabel: "Champion Needed",
      readiness: 0,
      winChance: 0,
      danger: 0,
      canAdmit: false,
      energyLine: `0/${rulebook.deck.maxEnergy} energy`,
      advantageLine: "No champion admitted.",
      pressureLine: "Signal Arena opens when a Champion Card enters the Active Roster.",
      rewardLine: "No battle receipt can be written yet.",
      stakeLine: rulebook.appendLaw,
      nextMove: "Roster one Champion Card from Signal Vault.",
      rosterGaps: ["champion"],
    };
  }

  const utilities = supports.filter((card) => signalRunCardArenaLoadoutProfile(card).role === "utility");
  const relics = supports.filter((card) => signalRunCardArenaLoadoutProfile(card).role === "relic");
  const fields = supports.filter((card) => signalRunCardArenaLoadoutProfile(card).role === "field");
  const energy = signalRunArenaLoadoutEnergy([champion, ...supports]);
  const energyOver = Math.max(0, energy - rulebook.deck.maxEnergy);
  const resolution = args.resolution ?? resolveSignalRunArenaBattle({
    champion,
    supports,
    opponent: args.opponent ?? null,
    seed: Math.max(1, finiteWhole(champion.earnedAtMs, 1, 1, Number.MAX_SAFE_INTEGER) % 1_000_000),
  });
  const margin = resolution.championScore - resolution.opponentScore;
  const winChance = energyOver > 0
    ? 0
    : Math.max(5, Math.min(95, Math.round(50 + margin * 0.72)));
  const supportReadiness =
    Math.min(3, utilities.length) * 11 +
    Math.min(1, relics.length) * 14 +
    Math.min(1, fields.length) * 14;
  const legalBonus = energyOver > 0 ? 0 : 10;
  const matchupBonus = resolution.matchup
    ? Math.max(-10, Math.min(10, Math.round((resolution.matchup.multiplier - 1) * 48)))
    : 4;
  const readiness = Math.max(0, Math.min(100, Math.round(
    24 +
    supportReadiness +
    legalBonus +
    matchupBonus +
    Math.min(18, Math.floor(signalRunCardControlScore(champion) / 4)),
  )));
  const visualState = args.visualState ?? signalRunCardBattleVisualState(champion, null, []);
  const retired = visualState.canBattle === false;
  const danger = retired
    ? 100
    : Math.max(0, Math.min(100,
        (100 - winChance) +
        energyOver * 18 +
        visualState.retirementPressure * 0.42 +
        (visualState.playState === "critical" ? 18 : visualState.playState === "wounded" ? 9 : 0),
      ));
  const opponentBattle = args.opponent ? signalRunCardBattleProfile(args.opponent) : null;
  const championBattle = signalRunCardBattleProfile(champion);
  const tier: SignalRunArenaChallengeTier =
    retired ? "locked" :
    energyOver > 0 ? "locked" :
    !args.opponent ? "training" :
    opponentBattle && opponentBattle.battleRating >= championBattle.battleRating + 90 && winChance >= 42 ? "ascension" :
    winChance >= 68 ? "favored" :
    winChance >= 48 ? "contested" :
    "danger";
  const tierLabel =
    tier === "locked" ? (retired ? "Champion Retired" : "Loadout Locked") :
    tier === "training" ? "Training Trial" :
    tier === "favored" ? "Advantage Match" :
    tier === "contested" ? "Contested Match" :
    tier === "ascension" ? "Ascension Match" :
    "Danger Match";
  const rosterGaps: SignalRunArenaChallengeProfile["rosterGaps"] = [];
  if (utilities.length < 3) rosterGaps.push("utility");
  if (relics.length < 1) rosterGaps.push("relic");
  if (fields.length < 1) rosterGaps.push("field");
  if (energyOver > 0) rosterGaps.push("energy");
  if (retired) rosterGaps.push("retired");
  if (resolution.matchup && resolution.matchup.disadvantages.length > resolution.matchup.advantages.length) rosterGaps.push("counter");

  const advantageLine = resolution.matchup
    ? `${resolution.matchup.explanation} ${Math.round(resolution.matchup.multiplier * 100)}% elemental pressure.`
    : "Practice trial uses no owned opponent card; it sharpens timing without an opponent lineage.";
  const pressureLine =
    retired ? "Arena use is closed for this Champion; the card remains visible with full battle history." :
    visualState.playState === "critical" ? `Critical pressure ${visualState.retirementPressure}/100. Another severe loss can retire this Champion.` :
    visualState.playState === "wounded" ? `Wounded pressure ${visualState.retirementPressure}/100. Support selection matters.` :
    `${visualState.statusLabel} pressure ${visualState.retirementPressure}/100.`;
  const rewardLine =
    !resolution.legal ? "Illegal loadout writes no Arena record." :
    resolution.result === "win" && resolution.supports.length >= 2 ? "Win admits battle, utility feed, victory growth, and combine eligibility." :
    resolution.result === "win" ? "Win admits battle and victory growth." :
    resolution.result === "draw" ? "Draw admits the battle receipt only." :
    "Loss admits a battle scar; revise the loadout before pressure stacks.";
  const stakeLine = "Original issue remains permanent. Arena only appends verified history, visible marks, growth, or retirement state.";
  const nextMove =
    retired ? "Choose another Champion from the Active Roster." :
    energyOver > 0 ? `Remove ${energyOver} energy before the match can be admitted.` :
    utilities.length < 3 ? `Add ${3 - utilities.length} more Utility ${utilities.length === 2 ? "Card" : "Cards"} for timing coverage.` :
    relics.length < 1 ? "Attach one Relic to stabilize the build." :
    fields.length < 1 ? "Set one Field Card to control elemental pressure." :
    rosterGaps.includes("counter") ? "Swap support toward the counter element before risking this match." :
    resolution.result === "win" ? "Admit the match to write verified growth." :
    resolution.result === "draw" ? "One stronger support can turn this into growth." :
    "This line is dangerous; improve counterplay before admitting it.";

  return {
    schema: "receiz.signal_arena.challenge_profile.v1",
    tier,
    tierLabel,
    readiness,
    winChance,
    danger: Math.round(danger),
    canAdmit: resolution.legal && !retired,
    energyLine: `${energy}/${rulebook.deck.maxEnergy} energy`,
    advantageLine,
    pressureLine,
    rewardLine,
    stakeLine,
    nextMove,
    rosterGaps,
  };
}

function appendStatDelta(stat: SignalRunArenaStatKey, amount: number): SignalRunArenaStatDeltas {
  return { [stat]: Math.max(1, Math.min(25, finiteWhole(amount, 1, 1, 25))) };
}

function mergeArenaStatDeltas(...deltas: SignalRunArenaStatDeltas[]): SignalRunArenaStatDeltas {
  const merged: SignalRunArenaStatDeltas = {};
  for (const delta of deltas) {
    for (const key of Object.keys(delta) as SignalRunArenaStatKey[]) {
      const value = delta[key];
      if (typeof value !== "number") continue;
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  return merged;
}

function signalRunCardAppendPayloadForInput(input: BuildSignalRunCardAppendRecordInput): SignalRunCardAppendPayload {
  const baseCard = input.baseCard;
  const sourceCards = input.sourceCards ?? [];
  const sourceRefs = sourceCards.map(signalRunArenaCardRef);
  const baseBattle = signalRunCardBattleProfile(baseCard);
  const baseProgression = signalRunCardProgressionProfile(baseCard);
  const mechanics = signalRunCardMechanicsProfile(baseCard);
  const rarityWeight = signalRunCardRarityWeight(baseCard.rarity);
  const amount = Math.max(1, Math.min(12, rarityWeight + Math.floor(baseBattle.battleRating / 180)));

  if (input.appendKind === "battle") {
    const opponent = sourceCards[0] ?? null;
    const matchup = opponent ? signalRunArenaElementMatchup(baseCard, opponent) : null;
    const supportCards = sourceCards.slice(opponent ? 1 : 0, 6);
    const resolution = input.battleResolution ?? resolveSignalRunArenaBattle({
      champion: baseCard,
      supports: supportCards,
      opponent,
      seed: finiteWhole(input.createdAtMs ?? Date.now(), 0, 0, Number.MAX_SAFE_INTEGER),
    });
    const result = input.battleResult ?? resolution.result;
    const resultFactor = result === "win" ? 1 : result === "draw" ? 0 : -1;
    const matchupFactor = matchup ? Math.round((matchup.multiplier - 1) * 100) : 0;
    return {
      kind: "battle",
      matchId: resolution.matchId,
      result,
      turns: Math.max(1, Math.min(99, finiteWhole(input.turns ?? resolution.turns.length, resolution.turns.length, 1, 99))),
      opponent: opponent ? signalRunArenaCardRef(opponent) : null,
      supports: sourceRefs.slice(opponent ? 1 : 0, 6),
      elementalMatchup: matchup,
      championScore: resolution.championScore,
      opponentScore: resolution.opponentScore,
      energy: resolution.energy,
      legal: resolution.legal,
      turnLog: resolution.turns.slice(0, 12),
      decisionLine: resolution.decisionLine,
      ratingDelta: resultFactor * Math.max(1, Math.floor(baseBattle.battleRating / 22) + matchupFactor),
      battleRule: "Battle receipts are append records. They reference sealed card IDs and hashes, then resolve Arena outcome without rewriting any card.",
    };
  }

  if (input.appendKind === "victory-growth") {
    const winsAfter = Math.max(1, finiteWhole(input.winsAfter ?? 1, 1, 1, 999_999));
    const milestone = mechanics.progression.victoryMilestones
      .filter((candidate) => winsAfter >= candidate.wins)
      .sort((a, b) => b.wins - a.wins)[0] ?? null;
    return {
      kind: "victory-growth",
      winsAfter,
      milestone,
      statDeltas: milestone ? appendStatDelta(milestone.statBonus, amount) : appendStatDelta("focus", Math.max(1, Math.floor(amount / 2))),
      sourceBattleAppendHash: input.sourceBattleAppendHash ?? input.previousAppendHash ?? null,
      growthRule: "Victory growth is admitted only by append record after verified Arena battle history; the base card remains the original sealed issue.",
    };
  }

  if (input.appendKind === "utility-feed") {
    const utility = sourceCards.find((card) => signalRunCardKindForClaim(card) === "utility") ?? sourceCards[0] ?? null;
    const utilityRef = utility ? signalRunArenaCardRef(utility) : null;
    const compatible = utility
      ? signalRunCardArenaLoadoutProfile(utility).compatibleElements.some((element) => mechanics.targeting.compatibleElements.includes(element))
      : false;
    const utilityBattle = utility ? signalRunCardBattleProfile(utility) : null;
    return {
      kind: "utility-feed",
      utility: utilityRef,
      consumed: true,
      legal: compatible,
      statDeltas: mergeArenaStatDeltas(
        appendStatDelta("power", Math.max(1, Math.floor((utilityBattle?.baseDamage ?? amount) / 12))),
        appendStatDelta("tempo", Math.max(1, Math.floor((utilityBattle?.baseTempo ?? amount) / 18))),
      ),
      feedRule: "Utility feed spends a sealed Utility through a verified append. The Utility history remains visible, and the Champion effective state gains the recorded delta.",
    };
  }

  if (input.appendKind === "combine") {
    const baseCharacter = signalRunCardCharacterProfile(baseCard);
    const baseLineage = baseCharacter.lineage;
    const baseGender = baseCharacter.gender ?? characterGenderForHash(baseCard.claimHash);
    const compatibleSources = sourceCards.filter((card) => {
      const character = signalRunCardCharacterProfile(card);
      const affinity = signalRunCardElementalAffinityProfile(card);
      return character.lineage === baseLineage ||
        affinity.elements.some((element) => mechanics.targeting.compatibleElements.includes(element));
    });
    const parentSource = compatibleSources.find((card) => {
      if (signalRunCardKindForClaim(card) !== "character") return false;
      const sourceCharacter = signalRunCardCharacterProfile(card);
      const sourceGender = sourceCharacter.gender ?? characterGenderForHash(card.claimHash);
      return sourceGender !== baseGender &&
        (sourceCharacter.lineage === baseLineage ||
          sourceCharacter.naturalElements.some((element) => baseCharacter.naturalElements.includes(element)));
    }) ?? null;
    const childEligible = signalRunCardKindForClaim(baseCard) === "character" && !!parentSource;
    const childSeed = childEligible && parentSource
      ? `child_${baseCard.claimHash.slice(0, 12)}_${parentSource.claimHash.slice(0, 12)}_${input.createdAtMs ?? 0}`
      : null;
    return {
      kind: "combine",
      sources: sourceRefs,
      compatible: compatibleSources.length >= Math.min(2, sourceCards.length || 2),
      outputLineage: baseLineage,
      childEligible,
      childSeed,
      pairingRule: childEligible
        ? "Opposite-gender Champion parents may create a new derivative child card. Parent cards remain playable and visible; the child is a new sealed lineage head candidate referencing this append."
        : "Compatible lineage or elemental sources create upgrade state. Child card creation requires two opposite-gender Champion parents.",
      statDeltas: mergeArenaStatDeltas(
        appendStatDelta("resonance", Math.max(1, compatibleSources.length * 2)),
        appendStatDelta("guard", Math.max(1, Math.floor(amount / 2))),
      ),
      combineRule: "Combine appends preserve every source card. The resulting playable state references the source lineage, may mint a new child head, and never burns or rewrites sealed originals.",
    };
  }

  if (input.appendKind === "evolution") {
    const nextStage: SignalRunCardEvolutionStage =
      baseProgression.stage === "origin" ? "ascendant" :
      baseProgression.stage === "ascendant" ? "apex" :
      "apex";
    return {
      kind: "evolution",
      fromStage: baseProgression.stage,
      toStage: signalRunCardProgressionProfile(input.evolvedCard ?? baseCard).stage === baseProgression.stage
        ? nextStage
        : signalRunCardProgressionProfile(input.evolvedCard ?? baseCard).stage,
      evolvedCard: input.evolvedCard ? signalRunArenaCardRef(input.evolvedCard) : null,
      sources: sourceRefs,
      statDeltas: mergeArenaStatDeltas(
        appendStatDelta("level", amount),
        appendStatDelta("resonance", Math.max(1, Math.floor(amount / 2))),
      ),
      evolutionRule: "Evolution appends create or reference a new sealed evolved card while the origin card remains permanent lineage truth.",
    };
  }

  return {
    kind: "transfer",
    fromOwnerFingerprint: baseCard.provenance.currentOwnerFingerprint,
    toOwnerFingerprint: input.newOwnerFingerprint?.trim() || input.actorFingerprint?.trim() || baseCard.provenance.currentOwnerFingerprint,
    ownershipRule: "Ownership movement follows Receiz append history. The card origin, achievement earner, image, stats, and sealed claim are not rewritten.",
  };
}

function isSignalRunCardAppendKind(value: unknown): value is SignalRunCardAppendKind {
  return value === "battle" ||
    value === "victory-growth" ||
    value === "utility-feed" ||
    value === "combine" ||
    value === "evolution" ||
    value === "transfer";
}

export async function buildSignalRunCardAppendRecord(input: BuildSignalRunCardAppendRecordInput): Promise<SignalRunCardAppendRecord> {
  const createdAtMs = finiteWhole(input.createdAtMs ?? Date.now(), Date.now(), 0, Number.MAX_SAFE_INTEGER);
  const base = signalRunArenaCardRef(input.baseCard);
  const actorFingerprint = input.actorFingerprint?.trim() || input.baseCard.provenance.currentOwnerFingerprint || input.baseCard.identity.identityFingerprint;
  const payload = signalRunCardAppendPayloadForInput({ ...input, createdAtMs });
  const appendMaterial: Omit<SignalRunCardAppendRecord, "appendId" | "appendLaw" | "appendHash"> = {
    schema: "receiz.signal_run.card.append.v1",
    appendKind: input.appendKind,
    rulebookVersion: "receiz.signal_arena.rulebook.v1",
    createdAtMs,
    actorFingerprint,
    base,
    previousAppendHash: input.previousAppendHash ?? null,
    payload,
  };
  const appendSeed = await sha256Hex(jcsCanonicalize(appendMaterial));
  const core: Omit<SignalRunCardAppendRecord, "appendHash"> = {
    ...appendMaterial,
    appendId: `sra_${appendSeed.slice(0, 24)}`,
    appendLaw: signalRunArenaRulebook().appendLaw,
  };
  const appendHash = await sha256Hex(jcsCanonicalize(core));
  return { ...core, appendHash };
}

function isSignalRunArenaCardRef(value: unknown): value is SignalRunArenaCardRef {
  if (!value || typeof value !== "object") return false;
  const ref = value as Partial<SignalRunArenaCardRef>;
  return typeof ref.collectibleId === "string" &&
    typeof ref.claimHash === "string" &&
    isSignalRunCardKind(ref.cardKind) &&
    (ref.arenaRole === "champion" || ref.arenaRole === "utility" || ref.arenaRole === "relic" || ref.arenaRole === "field") &&
    typeof ref.rarityClass === "string" &&
    typeof ref.issueLine === "string" &&
    typeof ref.name === "string" &&
    typeof ref.lineage === "string" &&
    (ref.gender === undefined || isSignalRunCardCharacterGender(ref.gender)) &&
    Array.isArray(ref.naturalElements) &&
    ref.naturalElements.length === 2 &&
    ref.naturalElements.every(isSignalRunWorldElement) &&
    typeof ref.battleRating === "number";
}

function isSignalRunArenaBattleTurn(value: unknown): value is SignalRunArenaBattleTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Partial<SignalRunArenaBattleTurn>;
  return typeof turn.turn === "number" &&
    (
      turn.window === "opening" ||
      turn.window === "field" ||
      turn.window === "reaction" ||
      turn.window === "combo" ||
      turn.window === "finisher"
    ) &&
    (
      turn.actor === "champion" ||
      turn.actor === "opponent" ||
      turn.actor === "support"
    ) &&
    typeof turn.sourceName === "string" &&
    (turn.sourceCollectibleId === null || typeof turn.sourceCollectibleId === "string") &&
    (turn.element === null || isSignalRunWorldElement(turn.element)) &&
    typeof turn.title === "string" &&
    typeof turn.championDelta === "number" &&
    typeof turn.opponentDelta === "number" &&
    typeof turn.line === "string";
}

function isSignalRunCardAppendPayload(value: unknown): value is SignalRunCardAppendPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<SignalRunCardAppendPayload>;
  if (payload.kind === "battle") {
    const battle = payload as Partial<Extract<SignalRunCardAppendPayload, { kind: "battle" }>>;
    return (battle.result === "win" || battle.result === "loss" || battle.result === "draw") &&
      typeof battle.matchId === "string" &&
      typeof battle.turns === "number" &&
      (battle.opponent === null || isSignalRunArenaCardRef(battle.opponent)) &&
      Array.isArray(battle.supports) &&
      battle.supports.every(isSignalRunArenaCardRef) &&
      (battle.championScore === undefined || typeof battle.championScore === "number") &&
      (battle.opponentScore === undefined || typeof battle.opponentScore === "number") &&
      (battle.energy === undefined || typeof battle.energy === "number") &&
      (battle.legal === undefined || typeof battle.legal === "boolean") &&
      (battle.turnLog === undefined || (Array.isArray(battle.turnLog) && battle.turnLog.every(isSignalRunArenaBattleTurn))) &&
      (battle.decisionLine === undefined || typeof battle.decisionLine === "string") &&
      typeof battle.ratingDelta === "number" &&
      typeof battle.battleRule === "string";
  }
  if (payload.kind === "victory-growth") {
    const growth = payload as Partial<Extract<SignalRunCardAppendPayload, { kind: "victory-growth" }>>;
    return typeof growth.winsAfter === "number" &&
      !!growth.statDeltas &&
      typeof growth.growthRule === "string";
  }
  if (payload.kind === "utility-feed") {
    const feed = payload as Partial<Extract<SignalRunCardAppendPayload, { kind: "utility-feed" }>>;
    return (feed.utility === null || isSignalRunArenaCardRef(feed.utility)) &&
      feed.consumed === true &&
      typeof feed.legal === "boolean" &&
      !!feed.statDeltas &&
      typeof feed.feedRule === "string";
  }
  if (payload.kind === "combine") {
    const combine = payload as Partial<Extract<SignalRunCardAppendPayload, { kind: "combine" }>>;
    return Array.isArray(combine.sources) &&
      combine.sources.every(isSignalRunArenaCardRef) &&
      typeof combine.compatible === "boolean" &&
      typeof combine.outputLineage === "string" &&
      (combine.childEligible === undefined || typeof combine.childEligible === "boolean") &&
      (combine.childSeed === undefined || combine.childSeed === null || typeof combine.childSeed === "string") &&
      (combine.pairingRule === undefined || typeof combine.pairingRule === "string") &&
      !!combine.statDeltas &&
      typeof combine.combineRule === "string";
  }
  if (payload.kind === "evolution") {
    const evolution = payload as Partial<Extract<SignalRunCardAppendPayload, { kind: "evolution" }>>;
    return (
        evolution.fromStage === "origin" ||
        evolution.fromStage === "ascendant" ||
        evolution.fromStage === "apex"
      ) &&
      (
        evolution.toStage === "origin" ||
        evolution.toStage === "ascendant" ||
        evolution.toStage === "apex"
      ) &&
      (evolution.evolvedCard === null || isSignalRunArenaCardRef(evolution.evolvedCard)) &&
      Array.isArray(evolution.sources) &&
      evolution.sources.every(isSignalRunArenaCardRef) &&
      !!evolution.statDeltas &&
      typeof evolution.evolutionRule === "string";
  }
  if (payload.kind === "transfer") {
    const transfer = payload as Partial<Extract<SignalRunCardAppendPayload, { kind: "transfer" }>>;
    return typeof transfer.fromOwnerFingerprint === "string" &&
      typeof transfer.toOwnerFingerprint === "string" &&
      typeof transfer.ownershipRule === "string";
  }
  return false;
}

export async function verifySignalRunCardAppendRecord(record: SignalRunCardAppendRecord, baseCard?: SignalRunCardClaim): Promise<boolean> {
  if (!record || typeof record !== "object") return false;
  if (record.schema !== "receiz.signal_run.card.append.v1") return false;
  if (!isSignalRunCardAppendKind(record.appendKind)) return false;
  if (record.rulebookVersion !== "receiz.signal_arena.rulebook.v1") return false;
  if (!isSignalRunArenaCardRef(record.base)) return false;
  if (!isSignalRunCardAppendPayload(record.payload)) return false;
  if (typeof record.appendId !== "string" || !record.appendId.startsWith("sra_")) return false;
  if (typeof record.appendHash !== "string" || record.appendHash.length !== 64) return false;
  if (record.previousAppendHash !== null && (typeof record.previousAppendHash !== "string" || record.previousAppendHash.length !== 64)) return false;
  if (baseCard) {
    if (record.base.collectibleId !== baseCard.collectibleId || record.base.claimHash !== baseCard.claimHash) return false;
    if (!(await verifySignalRunCardClaim(baseCard))) return false;
  }
  const { appendHash, ...core } = record;
  const expectedAppendHash = await sha256Hex(jcsCanonicalize(core));
  return expectedAppendHash === appendHash;
}

function applyArenaStatDeltas(
  state: Pick<SignalRunCardEffectiveArenaState, "level" | "power" | "guard" | "tempo" | "focus" | "resonance">,
  deltas: SignalRunArenaStatDeltas,
): void {
  for (const key of Object.keys(deltas) as SignalRunArenaStatKey[]) {
    const value = deltas[key];
    if (typeof value !== "number") continue;
    state[key] = Math.max(1, Math.min(999, state[key] + Math.trunc(value)));
  }
}

function battleResultsForVisualState(appends: SignalRunCardAppendRecord[] = []): Array<{
  result: SignalRunArenaBattleResult;
  hash: string;
  championScore: number;
  opponentScore: number;
  opponentBattleRating: number | null;
}> {
  return orderSignalRunCardAppendsByChain(appends)
    .filter((append) => append.appendKind === "battle" && append.payload.kind === "battle")
    .map((append) => {
      const payload = append.payload as Extract<SignalRunCardAppendPayload, { kind: "battle" }>;
      return {
        result: payload.result,
        hash: append.appendHash,
        championScore: payload.championScore ?? 0,
        opponentScore: payload.opponentScore ?? 0,
        opponentBattleRating: payload.opponent?.battleRating ?? null,
      };
    });
}

function streakForBattleResults(results: Array<{ result: SignalRunArenaBattleResult; hash: string }>): {
  kind: SignalRunArenaBattleResult | "none";
  count: number;
} {
  const last = results[results.length - 1];
  if (!last) return { kind: "none", count: 0 };
  let count = 0;
  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index]?.result !== last.result) break;
    count += 1;
  }
  return { kind: last.result, count };
}

function battleMarkCoordinate(seed: string, offset: number, min: number, max: number): number {
  return min + (hashIndex(seed, offset, 10_000) / 9_999) * (max - min);
}

export function signalRunCardBattleVisualState(
  baseCard: SignalRunCardClaim,
  state: SignalRunCardEffectiveArenaState | null = null,
  appends: SignalRunCardAppendRecord[] = [],
): SignalRunCardBattleVisualState {
  const filteredAppends = appends.filter((append) =>
    append.base.collectibleId === baseCard.collectibleId &&
    append.base.claimHash === baseCard.claimHash,
  );
  const results = battleResultsForVisualState(filteredAppends);
  const battleCount = state?.wins !== undefined
    ? state.wins + state.losses + state.draws
    : results.length;
  const wins = state?.wins ?? results.filter((result) => result.result === "win").length;
  const losses = state?.losses ?? results.filter((result) => result.result === "loss").length;
  const draws = state?.draws ?? results.filter((result) => result.result === "draw").length;
  const streak = streakForBattleResults(results);
  const baseBattleRating = signalRunCardBattleProfile(baseCard).battleRating;
  const severeLosses = results.filter((result) => {
    if (result.result !== "loss") return false;
    const margin = Math.max(0, result.opponentScore - result.championScore);
    const opponentGap = result.opponentBattleRating === null ? 0 : result.opponentBattleRating - baseBattleRating;
    return margin >= 35 || (opponentGap >= 160 && margin >= 16);
  }).length;
  const heatLevel = Math.max(0, Math.min(5, Math.floor(wins / 2) + (streak.kind === "win" ? Math.min(3, streak.count) : 0)));
  const scarLevel = Math.max(0, Math.min(5, Math.floor(losses / 2) + (streak.kind === "loss" ? Math.min(2, streak.count) : 0)));
  const trophyLevel = Math.max(0, Math.min(5, Math.floor(wins / 3) + (wins >= 1 ? 1 : 0)));
  const retirementPressure = Math.max(0, Math.min(100, losses * 18 + severeLosses * 24 + (streak.kind === "loss" ? streak.count * 10 : 0) - wins * 8 - draws * 3));
  const playState: SignalRunCardArenaPlayState =
    battleCount === 0 || retirementPressure < 30 ? "active" :
    (losses >= 7 && retirementPressure >= 90) || (severeLosses >= 3 && losses >= 4) || (streak.kind === "loss" && streak.count >= 5) ? "retired" :
    retirementPressure >= 65 || (streak.kind === "loss" && streak.count >= 3) ? "critical" :
    "wounded";
  const tone: SignalRunCardBattleVisualTone =
    playState === "retired" ? "scarred" :
    battleCount === 0 ? "unmarked" :
    heatLevel >= 4 && wins > losses ? "champion" :
    losses > wins && scarLevel >= 2 ? "scarred" :
    wins > losses ? "heated" :
    "seasoned";
  const stateHash = `${baseCard.claimHash.slice(0, 8)}-${wins}-${losses}-${draws}-${severeLosses}-${retirementPressure}-${playState}-${streak.kind}-${streak.count}-${filteredAppends.map((append) => append.appendHash.slice(0, 6)).join("") || "origin"}`;
  const trophies = filteredAppends
    .filter((append) => append.payload.kind === "battle" && append.payload.result === "win")
    .slice(-5)
    .map((append, index) => ({
      key: append.appendHash.slice(0, 12),
      x: battleMarkCoordinate(append.appendHash, 2, 18, 82),
      y: battleMarkCoordinate(append.appendHash, 8, 16, 72),
      size: 0.72 + index * 0.08,
    }));
  const scars = filteredAppends
    .filter((append) => append.payload.kind === "battle" && append.payload.result === "loss")
    .slice(-5)
    .map((append, index) => ({
      key: append.appendHash.slice(0, 12),
      x: battleMarkCoordinate(append.appendHash, 4, 16, 84),
      y: battleMarkCoordinate(append.appendHash, 10, 18, 76),
      rotate: Math.round(battleMarkCoordinate(append.appendHash, 16, -34, 34)),
      length: 16 + index * 2 + hashIndex(append.appendHash, 20, 14),
      intensity: 0.42 + Math.min(0.46, index * 0.09),
    }));
  const ribbonLabel =
    battleCount === 0 ? "Unbattle-tested" :
    streak.kind === "win" && streak.count >= 2 ? `${streak.count} win streak` :
    streak.kind === "loss" && streak.count >= 2 ? `${streak.count} loss scar` :
    wins > losses ? `${wins} arena ${wins === 1 ? "win" : "wins"}` :
    losses > wins ? `${losses} battle ${losses === 1 ? "scar" : "scars"}` :
    `${battleCount} arena records`;
  const shortLine =
    battleCount === 0 ? "Original issue" :
    tone === "champion" ? "Heat visible across the frame" :
    tone === "heated" ? "Victory heat admitted" :
    tone === "scarred" ? "Battle damage visible" :
    "Arena history visible";
  return {
    schema: "receiz.signal_run.card.battle_visual.v1",
    battleCount,
    wins,
    losses,
    draws,
    severeLosses,
    currentStreakKind: streak.kind,
    currentStreak: streak.count,
    heatLevel,
    scarLevel,
    trophyLevel,
    retirementPressure,
    playState,
    canBattle: playState !== "retired",
    statusLabel: playState === "retired" ? "Retired" : playState === "critical" ? "Critical" : playState === "wounded" ? "Wounded" : "Active",
    tone,
    ribbonLabel: playState === "retired" ? "Retired" : ribbonLabel,
    shortLine: playState === "retired" ? "Arena use closed" : shortLine,
    stateHash,
    trophies,
    scars,
  };
}

export function signalRunCardLineageKey(claim: SignalRunCardClaim): string {
  const character = signalRunCardCharacterProfile(claim);
  const derivation = claim.derivation;
  const raw = derivation?.derivationKind === "child"
    ? `${derivation.parentA.claimHash}:${derivation.parentB.claimHash}:${derivation.inheritedLineage}:${derivation.inheritedElements.join("-")}`
    : `${character.lineage}:${character.naturalElements.join("-")}:${character.domains.join("-")}`;
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96) || claim.collectibleId;
}

export function signalRunCardLineageHeadState(cards: SignalRunCardClaim[]): SignalRunCardLineageHeadState[] {
  const byLineage = new Map<string, SignalRunCardClaim[]>();
  for (const card of cards) {
    if (signalRunCardKindForClaim(card) !== "character") continue;
    const lineageKey = signalRunCardLineageKey(card);
    const list = byLineage.get(lineageKey) ?? [];
    list.push(card);
    byLineage.set(lineageKey, list);
  }
  const states: SignalRunCardLineageHeadState[] = [];
  for (const [lineageKey, lineageCards] of byLineage.entries()) {
    const sorted = [...lineageCards].sort((left, right) => {
      const leftDerived = left.derivation ? 1 : 0;
      const rightDerived = right.derivation ? 1 : 0;
      if (leftDerived !== rightDerived) return rightDerived - leftDerived;
      if (left.earnedAtMs !== right.earnedAtMs) return right.earnedAtMs - left.earnedAtMs;
      return right.claimHash.localeCompare(left.claimHash);
    });
    const head = sorted[0];
    if (!head) continue;
    states.push({
      schema: "receiz.signal_run.card.lineage_head.v1",
      lineageKey,
      activeHeadCollectibleId: head.collectibleId,
      activeHeadClaimHash: head.claimHash,
      visibleStageIds: sorted.map((card) => card.collectibleId),
      rule: "Lineage head is a projection over owned sealed cards and verified derivative appends. Older stages stay visible and keep their own current history.",
    });
  }
  return states;
}

export async function signalRunCardEffectiveArenaState(
  baseCard: SignalRunCardClaim,
  appends: SignalRunCardAppendRecord[] = [],
): Promise<SignalRunCardEffectiveArenaState> {
  const character = signalRunCardCharacterProfile(baseCard);
  const progression = signalRunCardProgressionProfile(baseCard);
  const base = signalRunArenaCardRef(baseCard);
  const state: SignalRunCardEffectiveArenaState = {
    schema: "receiz.signal_run.card.effective_arena_state.v1",
    base,
    appendCount: 0,
    verifiedAppendHashes: [],
    ignoredAppendHashes: [],
    wins: 0,
    losses: 0,
    draws: 0,
    level: progression.level,
    power: baseCard.utility.power,
    guard: character.attributes.guard,
    tempo: character.attributes.tempo,
    focus: character.attributes.focus,
    resonance: character.attributes.resonance,
    evolutionStage: progression.stage,
    consumedUtilityIds: [],
    attachedRelicIds: [],
    activeFieldIds: [],
    stateRule: "Effective Arena state is a verified projection over append records. The sealed base card is never rewritten.",
  };
  for (const append of orderSignalRunCardAppendsByChain(appends)) {
    const valid = await verifySignalRunCardAppendRecord(append, baseCard);
    if (!valid) {
      state.ignoredAppendHashes.push(append.appendHash);
      continue;
    }
    state.appendCount += 1;
    state.verifiedAppendHashes.push(append.appendHash);
    if (append.payload.kind === "battle") {
      if (append.payload.result === "win") state.wins += 1;
      else if (append.payload.result === "loss") state.losses += 1;
      else state.draws += 1;
      continue;
    }
    if (append.payload.kind === "utility-feed") {
      if (append.payload.utility) state.consumedUtilityIds.push(append.payload.utility.collectibleId);
      applyArenaStatDeltas(state, append.payload.statDeltas);
      continue;
    }
    if (append.payload.kind === "combine") {
      applyArenaStatDeltas(state, append.payload.statDeltas);
      continue;
    }
    if (append.payload.kind === "evolution") {
      state.evolutionStage = append.payload.toStage;
      applyArenaStatDeltas(state, append.payload.statDeltas);
      continue;
    }
    if (append.payload.kind === "victory-growth") {
      applyArenaStatDeltas(state, append.payload.statDeltas);
    }
  }
  return state;
}

export function buildSignalRunCardVerifyPath(claim: SignalRunCardClaim): string {
  return `/game/card/${encodeURIComponent(claim.collectibleId)}?claim=${encodeURIComponent(encodeSignalRunCardClaimCompact(claim))}`;
}

export function buildSignalRunCardAnchorPath(claim: SignalRunCardClaim, anchorId: string): string {
  const cleanAnchorId = decodeSignalRunCardAnchorId(anchorId);
  if (!cleanAnchorId) return buildSignalRunCardVerifyPath(claim);
  return `/game/card/${encodeURIComponent(claim.collectibleId)}?a=${encodeURIComponent(cleanAnchorId)}`;
}

export function decodeSignalRunCardAnchorId(value: string): string | null {
  const raw = value.trim().toLowerCase();
  return /^[0-9a-f]{8}$/.test(raw) ? raw : null;
}

export function encodeSignalRunCardRecordPointer(pointer: SignalRunCardRecordPointer): string {
  const slug = pointer.slug.trim();
  const code = pointer.code.trim().toUpperCase();
  const pulse = pointer.pulse.trim();
  const ms = pointer.ms.trim();
  return [slug, code, pulse, ms].map(encodeURIComponent).join(".");
}

export function decodeSignalRunCardRecordPointer(encoded: string): SignalRunCardRecordPointer | null {
  const raw = encoded.trim();
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [slugRaw, codeRaw, pulseRaw, msRaw] = parts;
  try {
    const slug = decodeURIComponent(slugRaw ?? "").trim();
    const code = decodeURIComponent(codeRaw ?? "").trim().toUpperCase();
    const pulse = decodeURIComponent(pulseRaw ?? "").trim();
    const ms = decodeURIComponent(msRaw ?? "").trim();
    if (!/^\d{8}_\d{4}$/.test(slug)) return null;
    if (!/^[A-Z0-9]{8,32}$/.test(code)) return null;
    if (!/^\d{1,64}$/.test(pulse)) return null;
    if (!/^\d{10,17}$/.test(ms)) return null;
    return { slug, code, pulse, ms };
  } catch {
    return null;
  }
}

export function buildSignalRunCardRecordPath(claim: SignalRunCardClaim, pointer: SignalRunCardRecordPointer): string {
  return `/game/card/${encodeURIComponent(claim.collectibleId)}?r=${encodeURIComponent(encodeSignalRunCardRecordPointer(pointer))}`;
}

export function signalRunCardRecordViewPath(pointer: SignalRunCardRecordPointer, anchorId?: string | null): string {
  const base = `/v/${encodeURIComponent(pointer.slug)}/${encodeURIComponent(pointer.code)}/${encodeURIComponent(pointer.pulse)}`;
  const params = new URLSearchParams();
  const cleanAnchor = typeof anchorId === "string" ? anchorId.trim().toLowerCase() : "";
  if (/^[0-9a-f]{8}$/.test(cleanAnchor)) params.set("a", cleanAnchor);
  params.set("ms", pointer.ms);
  return `${base}?${params.toString()}`;
}

export function signalRunCardStandardVerifyPath(pointer: SignalRunCardRecordPointer, anchorId?: string | null): string {
  const match = pointer.slug.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})$/);
  const year = match?.[1] ?? "";
  const month = match?.[2] ?? "";
  const day = match?.[3] ?? "";
  const hour = match?.[4] ?? "";
  const minute = match?.[5] ?? "";
  const ts = year && month && day && hour && minute ? `${year}-${month}-${day} ${hour}:${minute}` : "";
  const params = new URLSearchParams({
    ts,
    code: pointer.code,
    pulse: pointer.pulse,
  });
  const cleanAnchor = typeof anchorId === "string" ? anchorId.trim().toLowerCase() : "";
  if (/^[0-9a-f]{8}$/.test(cleanAnchor)) params.set("a", cleanAnchor);
  if (/^\d{10,17}$/.test(pointer.ms)) params.set("ms", pointer.ms);
  return `/verify?${params.toString()}`;
}

export function signalRunCardRarityLabel(rarity: SignalRunCardRarity): string {
  if (rarity === "genesis") return "Immutable";
  if (rarity === "mythic") return "Ultra Rare";
  if (rarity === "prism") return "Rare";
  if (rarity === "foil") return "Uncommon";
  return "Common";
}

export function signalRunCardIssueLineLabel(rarity: SignalRunCardRarity): string {
  if (rarity === "genesis") return "Genesis";
  if (rarity === "mythic") return "Mythic";
  if (rarity === "prism") return "Prism";
  if (rarity === "foil") return "Foil";
  return "Signal";
}

export function signalRunCardRarityClassLabel(rarity: SignalRunCardRarity): string {
  return `${signalRunCardRarityLabel(rarity)} ${signalRunCardIssueLineLabel(rarity)}`;
}

export function signalRunCardRarityWeight(rarity: SignalRunCardRarity): number {
  if (rarity === "genesis") return 13;
  if (rarity === "mythic") return 8;
  if (rarity === "prism") return 5;
  if (rarity === "foil") return 3;
  return 1;
}

export function signalRunCardRarityScore(claim: SignalRunCardClaim): number {
  const scarcity = signalRunCardRewardProfile(claim).scarcity;
  return scarcity.denominator + Math.min(99, claim.utility.power) * 10 + Math.min(99, claim.progression.level);
}

export function signalRunCardEditionLine(claim: SignalRunCardClaim): string {
  return `S01 · ${claim.cardNumber}`;
}

export function signalRunCardPrestigeLabel(claim: SignalRunCardClaim): string {
  const stageLabel = SIGNAL_RUN_CARD_STAGE_LABELS[signalRunCardProgressionProfile(claim).stage];
  const scarcity = signalRunCardRewardProfile(claim).scarcity;
  const scarcityTitle = scarcityTitleForDenominator(scarcity.denominator);
  const rarityClass = signalRunCardRarityClassLabel(claim.rarity);
  const displayClass = scarcityDisplayClass({ denominator: scarcity.denominator, stageLabel, rarityClass });
  return `${scarcityTitle} · ${displayClass} ${signalRunCardElementLine(claim)} · power ${claim.utility.power}`;
}

export function signalRunCardScarcityTitleLabel(claim: SignalRunCardClaim): string {
  const scarcity = signalRunCardRewardProfile(claim).scarcity;
  return scarcityTitleForDenominator(scarcity.denominator);
}

export function signalRunCardCompactFinishLabel(finishName: string | null | undefined): string {
  const clean = typeof finishName === "string" ? finishName.trim() : "";
  if (!clean) return "Signal Matte";
  if (/\bCrown\b/i.test(clean)) return "Crown";
  if (/^Line Foil$/i.test(clean)) return "Foil";
  return clean.replace(/\s+Spectrum$/i, "").trim() || clean;
}

export function signalRunCardSigilCode(claim: SignalRunCardClaim): string {
  const seed = claim.claimHash.toUpperCase().replace(/[^A-F0-9]/g, "").slice(0, 16);
  const chunks = seed.match(/.{1,4}/g) ?? [];
  return chunks.join("-");
}

export function signalRunCardSigilMark(claim: SignalRunCardClaim): string {
  const subject = signalRunCardVisualProfile(claim).subjectName;
  const initials = subject
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z0-9]/g, "").slice(0, 1).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  if (initials.length >= 2) return initials;
  return `${initials}${claim.claimHash.replace(/[^a-fA-F0-9]/g, "").slice(0, 1).toUpperCase()}`.slice(0, 2) || "SR";
}

function isSignalRunCardElementalAffinity(value: unknown): value is SignalRunCardElementalAffinity {
  if (!value || typeof value !== "object") return false;
  const affinity = value as Partial<SignalRunCardElementalAffinity>;
  return Array.isArray(affinity.elements) &&
    affinity.elements.length === 2 &&
    affinity.elements.every(isSignalRunWorldElement) &&
    isSignalRunWorldElement(affinity.catalyst) &&
    typeof affinity.resonance === "string" &&
    typeof affinity.fieldName === "string" &&
    typeof affinity.arenaModifier === "string" &&
    typeof affinity.elementalRule === "string";
}

function isSignalRunCardCharacter(value: unknown): value is SignalRunCardCharacter {
  if (!value || typeof value !== "object") return false;
  const character = value as Partial<SignalRunCardCharacter>;
  return typeof character.characterId === "string" &&
    typeof character.name === "string" &&
    typeof character.lineage === "string" &&
    (character.gender === undefined || isSignalRunCardCharacterGender(character.gender)) &&
    typeof character.archetype === "string" &&
    typeof character.temperament === "string" &&
    typeof character.signatureSkill === "string" &&
    typeof character.originStory === "string" &&
    !!character.attributes &&
    typeof character.attributes.force === "number" &&
    typeof character.attributes.guard === "number" &&
    typeof character.attributes.tempo === "number" &&
    typeof character.attributes.focus === "number" &&
    typeof character.attributes.resonance === "number" &&
    Array.isArray(character.domains) &&
    character.domains.length === 2 &&
    Array.isArray(character.elements) &&
    character.elements.length === 2 &&
    Array.isArray(character.naturalElements) &&
    character.naturalElements.length === 2 &&
    isSignalRunCardElementalAffinity(character.elementalAffinity);
}

function isSignalRunCardProgression(value: unknown): value is SignalRunCardProgression {
  if (!value || typeof value !== "object") return false;
  const progression = value as Partial<SignalRunCardProgression>;
  return typeof progression.level === "number" &&
    typeof progression.xp === "number" &&
    typeof progression.stage === "string" &&
    typeof progression.combineFamily === "string" &&
    typeof progression.signalRunUpgradeRule === "string";
}

function isSignalRunCardFinishProfile(value: unknown): value is SignalRunCardFinishProfile {
  if (!value || typeof value !== "object") return false;
  const finish = value as Partial<SignalRunCardFinishProfile>;
  return typeof finish.treatment === "string" &&
    typeof finish.finishName === "string" &&
    typeof finish.patternName === "string" &&
    typeof finish.scarcityCode === "string";
}

function isSignalRunCardVisualProfile(value: unknown): value is SignalRunCardVisualProfile {
  if (!value || typeof value !== "object") return false;
  const visual = value as Partial<SignalRunCardVisualProfile>;
  return isSignalRunCardKind(visual.cardKind) &&
    (
      visual.imageRole === "champion-portrait" ||
      visual.imageRole === "utility-relic" ||
      visual.imageRole === "relic-equipment" ||
      visual.imageRole === "field-arena"
    ) &&
    visual.renderStyle === "cinematic-realistic" &&
    typeof visual.subjectName === "string" &&
    typeof visual.visualSeed === "string" &&
    typeof visual.paletteName === "string" &&
    typeof visual.silhouette === "string" &&
    typeof visual.rarityAura === "string" &&
    Array.isArray(visual.detailMotifs) &&
    typeof visual.artPrompt === "string" &&
    typeof visual.composition === "string" &&
    typeof visual.materialLanguage === "string" &&
    typeof visual.environment === "string";
}

function isSignalRunCardStrategyProfile(value: unknown): value is SignalRunCardStrategyProfile {
  if (!value || typeof value !== "object") return false;
  const strategy = value as Partial<SignalRunCardStrategyProfile>;
  return strategy.schema === "receiz.signal_run.card.strategy.v1" &&
    isSignalRunCardKind(strategy.cardKind) &&
    (strategy.arenaSlot === "champion" || strategy.arenaSlot === "utility" || strategy.arenaSlot === "relic" || strategy.arenaSlot === "field") &&
    (strategy.loadoutCost === 1 || strategy.loadoutCost === 2 || strategy.loadoutCost === 3 || strategy.loadoutCost === 4) &&
    (
      strategy.persistence === "champion" ||
      strategy.persistence === "single-use" ||
      strategy.persistence === "match-relic" ||
      strategy.persistence === "arena-field"
    ) &&
    (
      strategy.activationWindow === "pre-fight" ||
      strategy.activationWindow === "reaction" ||
      strategy.activationWindow === "combo" ||
      strategy.activationWindow === "field"
    ) &&
    typeof strategy.primaryStat === "string" &&
    typeof strategy.secondaryStat === "string" &&
    typeof strategy.arenaText === "string" &&
    typeof strategy.counterplay === "string" &&
    Array.isArray(strategy.comboTags) &&
    strategy.comboTags.every((tag) => typeof tag === "string") &&
    typeof strategy.upgradeRecipe === "string";
}

function isSignalRunCardRewardProfile(value: unknown): value is SignalRunCardRewardProfile {
  if (!value || typeof value !== "object") return false;
  const reward = value as Partial<SignalRunCardRewardProfile>;
  const scarcity = reward.scarcity as Partial<SignalRunCardRewardProfile["scarcity"]> | undefined;
  const scarcityOk = !!scarcity &&
    scarcity.schema === "receiz.signal_run.card.scarcity.v1" &&
    typeof scarcity.label === "string" &&
    typeof scarcity.denominator === "number" &&
    Number.isFinite(scarcity.denominator) &&
    scarcity.denominator >= 1 &&
    typeof scarcity.rarityDenominator === "number" &&
    typeof scarcity.stageMultiplier === "number" &&
    typeof scarcity.performanceMultiplier === "number" &&
    typeof scarcity.basis === "string";
  const basisOk = Array.isArray(reward.performanceBasis) &&
    reward.performanceBasis.every((basis) => {
      if (!basis || typeof basis !== "object") return false;
      const candidate = basis as Partial<SignalRunCardRewardProfile["performanceBasis"][number]>;
      return (
        candidate.key === "score" ||
        candidate.key === "breakthroughs" ||
        candidate.key === "peakCombo" ||
        candidate.key === "trust" ||
        candidate.key === "missionClears" ||
        candidate.key === "achievements" ||
        candidate.key === "proof" ||
        candidate.key === "value" ||
        candidate.key === "sector" ||
        candidate.key === "level" ||
        candidate.key === "runOrdinal"
      ) &&
        typeof candidate.label === "string" &&
        typeof candidate.value === "number" &&
        typeof candidate.target === "number" &&
        typeof candidate.weight === "number" &&
        typeof candidate.complete === "boolean";
    });
  return reward.schema === "receiz.signal_run.card.reward.v1" &&
    (
      reward.rewardBand === "registered" ||
      reward.rewardBand === "proven" ||
      reward.rewardBand === "elite" ||
      reward.rewardBand === "masterwork" ||
      reward.rewardBand === "genesis"
    ) &&
    SIGNAL_RUN_CARD_RARITIES.includes(reward.rarityGate as SignalRunCardRarity) &&
    (reward.nextRarity === null || SIGNAL_RUN_CARD_RARITIES.includes(reward.nextRarity as SignalRunCardRarity)) &&
    typeof reward.earnedReason === "string" &&
    typeof reward.cardKindReason === "string" &&
    typeof reward.thresholdSummary === "string" &&
    scarcityOk &&
    basisOk &&
    typeof reward.rewardFingerprint === "string";
}

function isSignalRunCardArenaLoadoutProfile(value: unknown): value is SignalRunCardArenaLoadoutProfile {
  if (!value || typeof value !== "object") return false;
  const loadout = value as Partial<SignalRunCardArenaLoadoutProfile>;
  return loadout.schema === "receiz.signal_run.card.arena_loadout.v1" &&
    (loadout.role === "champion" || loadout.role === "utility" || loadout.role === "relic" || loadout.role === "field") &&
    (loadout.deckRoleLabel === "Champion" || loadout.deckRoleLabel === "Utility" || loadout.deckRoleLabel === "Relic" || loadout.deckRoleLabel === "Field") &&
    (loadout.deckSlot === "champion" || loadout.deckSlot === "utility" || loadout.deckSlot === "relic" || loadout.deckSlot === "field") &&
    (loadout.energyCost === 1 || loadout.energyCost === 2 || loadout.energyCost === 3 || loadout.energyCost === 4) &&
    (loadout.deckLimit === 1 || loadout.deckLimit === 2 || loadout.deckLimit === 3) &&
    (
      loadout.activationTiming === "opening" ||
      loadout.activationTiming === "pre-fight" ||
      loadout.activationTiming === "reaction" ||
      loadout.activationTiming === "combo" ||
      loadout.activationTiming === "field"
    ) &&
    (
      loadout.tempoClass === "fast" ||
      loadout.tempoClass === "balanced" ||
      loadout.tempoClass === "heavy" ||
      loadout.tempoClass === "decisive"
    ) &&
    Array.isArray(loadout.compatibleElements) &&
    loadout.compatibleElements.every(isSignalRunWorldElement) &&
    Array.isArray(loadout.strongInto) &&
    loadout.strongInto.every(isSignalRunWorldElement) &&
    Array.isArray(loadout.weakInto) &&
    loadout.weakInto.every(isSignalRunWorldElement) &&
    Array.isArray(loadout.comboHooks) &&
    loadout.comboHooks.every((tag) => typeof tag === "string") &&
    typeof loadout.battleRule === "string" &&
    typeof loadout.equipRule === "string" &&
    typeof loadout.upgradePath === "string" &&
    typeof loadout.scoringBasis === "string";
}

function isSignalRunArenaSupportSubtype(value: unknown): value is SignalRunArenaSupportSubtype {
  return value === "champion" ||
    value === "utility" ||
    value === "relic" ||
    value === "field" ||
    value === "tactic" ||
    value === "catalyst";
}

function isSignalRunCardBattleProfile(value: unknown): value is SignalRunCardBattleProfile {
  if (!value || typeof value !== "object") return false;
  const battle = value as Partial<SignalRunCardBattleProfile>;
  return battle.schema === "receiz.signal_run.card.battle.v1" &&
    typeof battle.battleId === "string" &&
    battle.arenaGame === "signal-arena" &&
    isSignalRunCardKind(battle.cardKind) &&
    isSignalRunArenaSupportSubtype(battle.supportSubtype) &&
    (
      battle.battleRole === "champion" ||
      battle.battleRole === "burst" ||
      battle.battleRole === "counter" ||
      battle.battleRole === "equipment" ||
      battle.battleRole === "field-control" ||
      battle.battleRole === "evolution"
    ) &&
    (
      battle.useLimit === "persistent" ||
      battle.useLimit === "once" ||
      battle.useLimit === "match" ||
      battle.useLimit === "field-window"
    ) &&
    (
      battle.upgradeMode === "evolves" ||
      battle.upgradeMode === "feeds-champion" ||
      battle.upgradeMode === "attaches" ||
      battle.upgradeMode === "shapes-field" ||
      battle.upgradeMode === "catalyzes"
    ) &&
    typeof battle.battleRating === "number" &&
    typeof battle.baseDamage === "number" &&
    typeof battle.baseGuard === "number" &&
    typeof battle.baseTempo === "number" &&
    typeof battle.accuracy === "number" &&
    typeof battle.criticalWindow === "number" &&
    (battle.energyCost === 1 || battle.energyCost === 2 || battle.energyCost === 3 || battle.energyCost === 4) &&
    Array.isArray(battle.compatibleElements) &&
    battle.compatibleElements.every(isSignalRunWorldElement) &&
    Array.isArray(battle.strongInto) &&
    battle.strongInto.every(isSignalRunWorldElement) &&
    Array.isArray(battle.weakInto) &&
    battle.weakInto.every(isSignalRunWorldElement) &&
    typeof battle.openingMove === "string" &&
    typeof battle.counterMove === "string" &&
    typeof battle.finisherMove === "string" &&
    typeof battle.resolveRule === "string" &&
    typeof battle.sealedBattleLogRule === "string";
}

function isSignalRunCardMechanicsProfile(value: unknown): value is SignalRunCardMechanicsProfile {
  if (!value || typeof value !== "object") return false;
  const mechanics = value as Partial<SignalRunCardMechanicsProfile>;
  const acquisition = mechanics.acquisition as Partial<SignalRunCardMechanicsProfile["acquisition"]> | undefined;
  const economy = mechanics.economy as Partial<SignalRunCardMechanicsProfile["economy"]> | undefined;
  const targeting = mechanics.targeting as Partial<SignalRunCardMechanicsProfile["targeting"]> | undefined;
  const strategy = mechanics.strategy as Partial<SignalRunCardMechanicsProfile["strategy"]> | undefined;
  const progression = mechanics.progression as Partial<SignalRunCardMechanicsProfile["progression"]> | undefined;
  const outcome = mechanics.outcome as Partial<SignalRunCardMechanicsProfile["outcome"]> | undefined;
  const milestonesOk = Array.isArray(progression?.victoryMilestones) &&
    progression.victoryMilestones.length >= 1 &&
    progression.victoryMilestones.every((milestone) => {
      if (!milestone || typeof milestone !== "object") return false;
      const candidate = milestone as Partial<SignalRunCardMechanicsProfile["progression"]["victoryMilestones"][number]>;
      return typeof candidate.wins === "number" &&
        candidate.wins >= 1 &&
        typeof candidate.unlock === "string" &&
        (
          candidate.statBonus === "level" ||
          candidate.statBonus === "power" ||
          candidate.statBonus === "guard" ||
          candidate.statBonus === "tempo" ||
          candidate.statBonus === "focus" ||
          candidate.statBonus === "resonance"
        );
    });
  return mechanics.schema === "receiz.signal_run.card.mechanics.v1" &&
    isSignalRunCardKind(mechanics.cardKind) &&
    typeof mechanics.rarityClass === "string" &&
    typeof mechanics.issueLine === "string" &&
    !!acquisition &&
    acquisition.source === "signal-run" &&
    typeof acquisition.performanceGate === "string" &&
    (
      acquisition.scoreBand === "registered" ||
      acquisition.scoreBand === "proven" ||
      acquisition.scoreBand === "elite" ||
      acquisition.scoreBand === "masterwork" ||
      acquisition.scoreBand === "immutable"
    ) &&
    typeof acquisition.score === "number" &&
    typeof acquisition.peakCombo === "number" &&
    typeof acquisition.integrity === "number" &&
    typeof acquisition.breakthroughs === "number" &&
    typeof acquisition.missionClears === "number" &&
    typeof acquisition.earnedWhy === "string" &&
    !!economy &&
    (economy.deckSlot === "champion" || economy.deckSlot === "utility" || economy.deckSlot === "relic" || economy.deckSlot === "field") &&
    (economy.energyCost === 1 || economy.energyCost === 2 || economy.energyCost === 3 || economy.energyCost === 4) &&
    (economy.deckLimit === 1 || economy.deckLimit === 2 || economy.deckLimit === 3) &&
    typeof economy.useLimit === "string" &&
    typeof economy.persistence === "string" &&
    typeof economy.timing === "string" &&
    typeof economy.riskTier === "string" &&
    typeof economy.upgradeSlots === "number" &&
    typeof economy.valueRole === "string" &&
    !!targeting &&
    Array.isArray(targeting.validTargets) &&
    targeting.validTargets.every((target) => typeof target === "string") &&
    Array.isArray(targeting.compatibleElements) &&
    targeting.compatibleElements.every(isSignalRunWorldElement) &&
    Array.isArray(targeting.strongInto) &&
    targeting.strongInto.every(isSignalRunWorldElement) &&
    Array.isArray(targeting.weakInto) &&
    targeting.weakInto.every(isSignalRunWorldElement) &&
    Array.isArray(targeting.counteredBy) &&
    targeting.counteredBy.every(isSignalRunWorldElement) &&
    typeof targeting.targetRule === "string" &&
    !!strategy &&
    typeof strategy.primaryPlan === "string" &&
    typeof strategy.comboPlan === "string" &&
    typeof strategy.counterplay === "string" &&
    typeof strategy.winCondition === "string" &&
    typeof strategy.tempoWindow === "string" &&
    typeof strategy.decisionSkill === "string" &&
    !!progression &&
    typeof progression.canEvolve === "boolean" &&
    typeof progression.evolvesBy === "string" &&
    typeof progression.arenaVictoryGrowth === "string" &&
    milestonesOk &&
    Array.isArray(progression.combinesWith) &&
    progression.combinesWith.every((tag) => typeof tag === "string") &&
    typeof progression.upgradeMaterial === "string" &&
    typeof progression.riskRule === "string" &&
    typeof progression.permanenceRule === "string" &&
    !!outcome &&
    typeof outcome.arenaUse === "string" &&
    typeof outcome.signalRunUse === "string" &&
    typeof outcome.collectionUse === "string" &&
    typeof outcome.proofUse === "string";
}

function isSignalRunCardArenaProfile(value: unknown): value is SignalRunCardArenaProfile {
  if (!value || typeof value !== "object") return false;
  const arena = value as Partial<SignalRunCardArenaProfile>;
  const skillsOk = Array.isArray(arena.skills) &&
    arena.skills.every((skill) => {
      if (!skill || typeof skill !== "object") return false;
      const candidate = skill as Partial<SignalRunCardArenaProfile["skills"][number]>;
      return typeof candidate.key === "string" &&
        typeof candidate.name === "string" &&
        isSignalRunWorldElement(candidate.element) &&
        typeof candidate.text === "string" &&
        typeof candidate.power === "number";
    });
  const baseOk = (arena.role === "champion" || arena.role === "utility" || arena.role === "relic" || arena.role === "field") &&
    typeof arena.uploadRule === "string" &&
    typeof arena.useRule === "string" &&
    Array.isArray(arena.elementStrengths) &&
    arena.elementStrengths.every(isSignalRunWorldElement) &&
    Array.isArray(arena.elementWeaknesses) &&
    arena.elementWeaknesses.every(isSignalRunWorldElement) &&
    skillsOk;
  if (!baseOk) return false;
  if (arena.role === "champion") {
    return !!arena.champion &&
      typeof arena.champion.championId === "string" &&
      arena.champion.acceptsUtilityCards === true &&
      typeof arena.champion.evolutionLineage === "string" &&
      typeof arena.champion.utilitySlots === "number";
  }
  if (arena.role === "relic") {
    return !!arena.relicCard &&
      typeof arena.relicCard.relicId === "string" &&
      arena.relicCard.attachTo === "champion" &&
      arena.relicCard.persistent === true &&
      (
        arena.relicCard.relicSlot === "core" ||
        arena.relicCard.relicSlot === "armor" ||
        arena.relicCard.relicSlot === "weapon" ||
        arena.relicCard.relicSlot === "sigil"
      ) &&
      Array.isArray(arena.relicCard.compatibleLineages) &&
      typeof arena.relicCard.effectName === "string" &&
      typeof arena.relicCard.effectText === "string" &&
      !!arena.relicCard.statBonus &&
      typeof arena.relicCard.statBonus.force === "number" &&
      typeof arena.relicCard.statBonus.guard === "number" &&
      typeof arena.relicCard.statBonus.tempo === "number" &&
      typeof arena.relicCard.statBonus.focus === "number" &&
      typeof arena.relicCard.statBonus.resonance === "number";
  }
  if (arena.role === "field") {
    return !!arena.fieldCard &&
      typeof arena.fieldCard.fieldId === "string" &&
      (arena.fieldCard.durationTurns === 3 || arena.fieldCard.durationTurns === 4 || arena.fieldCard.durationTurns === 5) &&
      isSignalRunWorldElement(arena.fieldCard.fieldElement) &&
      Array.isArray(arena.fieldCard.boostedElements) &&
      arena.fieldCard.boostedElements.every(isSignalRunWorldElement) &&
      Array.isArray(arena.fieldCard.suppressedElements) &&
      arena.fieldCard.suppressedElements.every(isSignalRunWorldElement) &&
      typeof arena.fieldCard.effectName === "string" &&
      typeof arena.fieldCard.effectText === "string";
  }
  return !!arena.utilityCard &&
    typeof arena.utilityCard.utilityId === "string" &&
    arena.utilityCard.singleUse === true &&
    arena.utilityCard.target === "champion" &&
    Array.isArray(arena.utilityCard.compatibleElements) &&
    arena.utilityCard.compatibleElements.every(isSignalRunWorldElement) &&
    typeof arena.utilityCard.effectName === "string" &&
    typeof arena.utilityCard.effectText === "string" &&
    typeof arena.utilityCard.powerDelta === "number";
}

function signalRunCardKindForClaim(claim: SignalRunCardClaim): SignalRunCardKind {
  const storedKind = (claim as SignalRunCardClaim & { cardKind?: unknown }).cardKind;
  if (isSignalRunCardKind(storedKind)) return storedKind;
  return cardKindForRun(claim.rarity, claim.stats, claim.achievements, claim.missionKey, claim.claimHash);
}

export function signalRunCardElementLabel(element: SignalRunCardElement): string {
  return SIGNAL_RUN_CARD_ELEMENT_LABELS[element];
}

export function signalRunCardWorldElementLabel(element: SignalRunWorldElement): string {
  return SIGNAL_RUN_WORLD_ELEMENT_LABELS[element];
}

export function signalRunCardEvolutionStageLabel(stage: SignalRunCardEvolutionStage): string {
  return SIGNAL_RUN_CARD_STAGE_LABELS[stage];
}

export function signalRunCardKindLabel(claim: SignalRunCardClaim): string {
  return signalRunCardKindLabelForKind(signalRunCardKindForClaim(claim));
}

export function signalRunCardKindLabelForKind(kind: SignalRunCardKind): string {
  return SIGNAL_RUN_CARD_KIND_LABELS[kind];
}

export function signalRunCardElementLine(claim: SignalRunCardClaim): string {
  const [primary, secondary] = signalRunCardElementalAffinityProfile(claim).elements;
  return worldElementPairLabel(primary, secondary, " / ");
}

export function signalRunCardDomainLine(claim: SignalRunCardClaim): string {
  const character = signalRunCardCharacterProfile(claim);
  const [primary, secondary] = character.domains ?? character.elements;
  return elementPairLabel(primary, secondary, " / ");
}

export function signalRunCardControlScore(claim: SignalRunCardClaim): number {
  const stats = normalizeStats(claim.stats);
  const scoreControl = scorePowerPoints(stats.score);
  const comboControl = Math.min(20, Math.floor(stats.peakCombo / 6));
  const routeControl = Math.min(26, stats.missionClears * 3 + stats.breakthroughs * 5 + Math.max(0, stats.sector - 1));
  const signalControl = Math.min(8, Math.floor(Math.min(stats.proof, stats.value) / 5));
  const integrityControl = trustQualityPoints(stats.trust, 8);
  const achievementControl = Math.min(5, Array.isArray(claim.achievements) ? claim.achievements.length : 0);
  const ceiling = scoreTierCeiling(stats.score, {
    low: 22,
    building: 34,
    proven: 58,
    elite: 68,
    masterwork: 82,
    genesis: 99,
  });
  return Math.max(1, Math.min(ceiling, scoreControl + comboControl + routeControl + signalControl + integrityControl + achievementControl));
}

export function signalRunCardCharacterProfile(claim: SignalRunCardClaim): SignalRunCardCharacter {
  const storedCharacter = (claim as SignalRunCardClaim & { character?: unknown }).character;
  if (isSignalRunCardCharacter(storedCharacter)) return storedCharacter;
  return characterForParts({
    baseHash: claim.claimHash,
    missionKey: claim.missionKey,
    stats: claim.stats,
    achievements: claim.achievements,
    identity: claim.identity,
    rarity: claim.rarity,
  });
}

export function signalRunCardElementalAffinityProfile(claim: SignalRunCardClaim): SignalRunCardElementalAffinity {
  const storedCharacter = (claim as SignalRunCardClaim & { character?: unknown }).character;
  if (storedCharacter && typeof storedCharacter === "object") {
    const maybeCharacter = storedCharacter as Partial<SignalRunCardCharacter>;
    if (isSignalRunCardElementalAffinity(maybeCharacter.elementalAffinity)) return maybeCharacter.elementalAffinity;
  }
  const character = signalRunCardCharacterProfile(claim);
  return character.elementalAffinity;
}

export function signalRunCardProgressionProfile(claim: SignalRunCardClaim): SignalRunCardProgression {
  const storedProgression = (claim as SignalRunCardClaim & { progression?: unknown }).progression;
  if (isSignalRunCardProgression(storedProgression)) return storedProgression;
  const character = signalRunCardCharacterProfile(claim);
  return progressionForParts({
    character,
    stats: claim.stats,
    achievements: claim.achievements,
    rarity: claim.rarity,
    utilityAbilityName: claim.utility.abilityName,
  });
}

export function signalRunCardFinishProfile(claim: SignalRunCardClaim): SignalRunCardFinishProfile {
  const storedFinish = (claim as SignalRunCardClaim & { finish?: unknown }).finish;
  const projected = finishForParts({
    baseHash: claim.claimHash,
    rarity: claim.rarity,
    reward: signalRunCardRewardProfile(claim),
    character: signalRunCardCharacterProfile(claim),
  });
  return isSignalRunCardFinishProfile(storedFinish)
    ? { ...projected, scarcityCode: storedFinish.scarcityCode }
    : projected;
}

export function signalRunCardArenaProfile(claim: SignalRunCardClaim): SignalRunCardArenaProfile {
  const storedArena = (claim as SignalRunCardClaim & { arena?: unknown }).arena;
  if (isSignalRunCardArenaProfile(storedArena)) return storedArena;
  const character = signalRunCardCharacterProfile(claim);
  const progression = signalRunCardProgressionProfile(claim);
  return arenaProfileForParts({
    baseHash: claim.claimHash,
    cardKind: signalRunCardKindForClaim(claim),
    character,
    progression,
    utility: claim.utility,
  });
}

export function signalRunCardStrategyProfile(claim: SignalRunCardClaim): SignalRunCardStrategyProfile {
  const storedStrategy = (claim as SignalRunCardClaim & { strategy?: unknown }).strategy;
  if (isSignalRunCardStrategyProfile(storedStrategy)) return storedStrategy;
  const character = signalRunCardCharacterProfile(claim);
  return strategyForParts({
    cardKind: signalRunCardKindForClaim(claim),
    character,
    progression: signalRunCardProgressionProfile(claim),
    utility: claim.utility,
    affinity: character.elementalAffinity,
  });
}

export function signalRunCardRewardProfile(claim: SignalRunCardClaim): SignalRunCardRewardProfile {
  const storedReward = (claim as SignalRunCardClaim & { reward?: unknown }).reward;
  if (isSignalRunCardRewardProfile(storedReward)) return storedReward;
  const character = signalRunCardCharacterProfile(claim);
  const progression = signalRunCardProgressionProfile(claim);
  return rewardForParts({
    baseHash: claim.claimHash,
    rarity: claim.rarity,
    cardKind: signalRunCardKindForClaim(claim),
    stats: claim.stats,
    achievements: claim.achievements,
    runOrdinal: claim.runOrdinal,
    missionKey: claim.missionKey,
    missionName: claim.missionName,
    character,
    progression,
    utility: claim.utility,
  });
}

export function signalRunCardRarityIssueLine(claim: SignalRunCardClaim): string {
  const reward = signalRunCardRewardProfile(claim);
  const denominator = Math.max(1, finiteWhole(reward.scarcity.denominator, 1, 1, 999_999_999));
  if (claim.rarity === "signal" || denominator <= 1) {
    return `${signalRunCardRarityClassLabel(claim.rarity)} · Base Class`;
  }
  return `${signalRunCardRarityClassLabel(claim.rarity)} · Class Odds 1 in ${denominator.toLocaleString()}`;
}

export function signalRunCardArenaLoadoutProfile(claim: SignalRunCardClaim): SignalRunCardArenaLoadoutProfile {
  const storedLoadout = (claim as SignalRunCardClaim & { arenaLoadout?: unknown }).arenaLoadout;
  if (isSignalRunCardArenaLoadoutProfile(storedLoadout)) return storedLoadout;
  const character = signalRunCardCharacterProfile(claim);
  const progression = signalRunCardProgressionProfile(claim);
  const strategy = signalRunCardStrategyProfile(claim);
  const arena = signalRunCardArenaProfile(claim);
  return arenaLoadoutForParts({
    cardKind: signalRunCardKindForClaim(claim),
    character,
    progression,
    utility: claim.utility,
    strategy,
    arena,
    affinity: character.elementalAffinity,
    stats: claim.stats,
  });
}

export function signalRunCardBattleProfile(claim: SignalRunCardClaim): SignalRunCardBattleProfile {
  const storedBattle = (claim as SignalRunCardClaim & { battle?: unknown }).battle;
  if (isSignalRunCardBattleProfile(storedBattle)) return storedBattle;
  const character = signalRunCardCharacterProfile(claim);
  const progression = signalRunCardProgressionProfile(claim);
  const arena = signalRunCardArenaProfile(claim);
  const loadout = signalRunCardArenaLoadoutProfile(claim);
  return battleProfileForParts({
    baseHash: claim.claimHash,
    cardKind: signalRunCardKindForClaim(claim),
    character,
    progression,
    utility: claim.utility,
    arena,
    loadout,
    stats: claim.stats,
  });
}

export function signalRunCardMechanicsProfile(claim: SignalRunCardClaim): SignalRunCardMechanicsProfile {
  const storedMechanics = (claim as SignalRunCardClaim & { mechanics?: unknown }).mechanics;
  if (isSignalRunCardMechanicsProfile(storedMechanics)) return storedMechanics;
  const character = signalRunCardCharacterProfile(claim);
  const progression = signalRunCardProgressionProfile(claim);
  const strategy = signalRunCardStrategyProfile(claim);
  const arena = signalRunCardArenaProfile(claim);
  const loadout = signalRunCardArenaLoadoutProfile(claim);
  const battle = signalRunCardBattleProfile(claim);
  return mechanicsProfileForParts({
    cardKind: signalRunCardKindForClaim(claim),
    rarity: claim.rarity,
    stats: claim.stats,
    achievements: claim.achievements,
    character,
    progression,
    utility: claim.utility,
    reward: signalRunCardRewardProfile(claim),
    strategy,
    arena,
    loadout,
    battle,
  });
}

export function signalRunCardVisualProfile(claim: SignalRunCardClaim): SignalRunCardVisualProfile {
  const storedVisual = (claim as SignalRunCardClaim & { visual?: unknown }).visual;
  if (isSignalRunCardVisualProfile(storedVisual)) return storedVisual;
  const character = signalRunCardCharacterProfile(claim);
  const progression = signalRunCardProgressionProfile(claim);
  const finish = signalRunCardFinishProfile(claim);
  const arena = arenaProfileForParts({
    baseHash: claim.claimHash,
    cardKind: signalRunCardKindForClaim(claim),
    character,
    progression,
    utility: claim.utility,
  });
  return visualProfileForParts({
    cardKind: signalRunCardKindForClaim(claim),
    character,
    utility: claim.utility,
    arena,
    finish,
  });
}

export function signalRunCardBinderStageForCount(uniqueCards: number): {
  setStage: number;
  stageStart: number;
  setTarget: number;
  stageSize: number;
  nextStageTarget: number;
} {
  const safeCount = finiteWhole(uniqueCards, 0, 0, Number.MAX_SAFE_INTEGER);
  let setStage = 1;
  let stageStart = 0;
  let setTarget = SIGNAL_RUN_CARD_BINDER_STAGE_BASE;
  while (safeCount >= setTarget) {
    setStage += 1;
    stageStart = setTarget;
    setTarget += SIGNAL_RUN_CARD_BINDER_STAGE_BASE * setStage;
  }
  const stageSize = Math.max(1, setTarget - stageStart);
  const nextStageTarget = setTarget + SIGNAL_RUN_CARD_BINDER_STAGE_BASE * (setStage + 1);
  return { setStage, stageStart, setTarget, stageSize, nextStageTarget };
}

function signalRunVaultStageTitle(setStage: number): string {
  const index = (Math.max(1, finiteWhole(setStage, 1, 1)) - 1) % SIGNAL_RUN_VAULT_STAGE_TITLES.length;
  return SIGNAL_RUN_VAULT_STAGE_TITLES[index] ?? SIGNAL_RUN_VAULT_STAGE_TITLES[0];
}

function signalRunVaultNextChaseDetail(args: {
  goal: SignalRunCardCollectionProgress["collectionGoals"][number];
  setStage: number;
  highestRarity: SignalRunCardRarity | null;
}): string {
  if (args.goal.key === "season") return `Secure ${args.goal.target - args.goal.current} more cards to expand the Vault.`;
  if (args.goal.key === "arena") return "Build one champion loadout with three utilities, one relic, and one field.";
  if (args.goal.key === "rating") return `Raise average Battle Rating to ${args.goal.target} for Stage ${args.setStage}.`;
  if (args.goal.key === "elements") return "Collect every world element so Arena matchups have full coverage.";
  if (args.goal.key === "lineage") return "Complete three-card lineages to unlock stronger combine paths.";
  if (args.goal.key === "champion") return `Chase more champions; highest rarity is ${args.highestRarity ? signalRunCardRarityClassLabel(args.highestRarity) : "unclaimed"}.`;
  return "Add utilities, relics, and fields so champions have real Arena support.";
}

export function signalRunCardSetProgress(
  claims: SignalRunCardClaim[],
  setTarget?: number,
): SignalRunCardCollectionProgress {
  const unique = new Map<string, SignalRunCardClaim>();
  for (const claim of claims) {
    if (!unique.has(claim.collectibleId)) unique.set(claim.collectibleId, claim);
  }
  const uniqueClaims = Array.from(unique.values());
  const rarityCounts = SIGNAL_RUN_CARD_RARITIES.reduce<Record<SignalRunCardRarity, number>>((counts, rarity) => {
    counts[rarity] = 0;
    return counts;
  }, {} as Record<SignalRunCardRarity, number>);
  const kindCounts = SIGNAL_RUN_CARD_KINDS.reduce<Record<SignalRunCardKind, number>>((counts, kind) => {
    counts[kind] = 0;
    return counts;
  }, {} as Record<SignalRunCardKind, number>);
  const arenaDeckRoleCounts: Record<SignalRunArenaRole, number> = {
    champion: 0,
    utility: 0,
    relic: 0,
    field: 0,
  };
  const elementCounts: Partial<Record<SignalRunWorldElement, number>> = {};
  const lineageCounts: Record<string, number> = {};
  const supportSubtypeCounts: Record<SignalRunArenaSupportSubtype, number> = {
    champion: 0,
    utility: 0,
    relic: 0,
    field: 0,
    tactic: 0,
    catalyst: 0,
  };
  let highestRarity: SignalRunCardRarity | null = null;
  let rarityScore = 0;
  let battleRatingTotal = 0;
  const playableClasses = new Set<SignalRunPlayableClass>();
  for (const claim of uniqueClaims) {
    const character = signalRunCardCharacterProfile(claim);
    const kind = signalRunCardKindForClaim(claim);
    const affinity = signalRunCardElementalAffinityProfile(claim);
    const loadout = signalRunCardArenaLoadoutProfile(claim);
    const battle = signalRunCardBattleProfile(claim);
    rarityCounts[claim.rarity] += 1;
    kindCounts[kind] += 1;
    arenaDeckRoleCounts[loadout.role] += 1;
    supportSubtypeCounts[battle.supportSubtype] += 1;
    rarityScore += signalRunCardRarityScore(claim);
    battleRatingTotal += battle.battleRating;
    playableClasses.add(claim.utility.playableClass);
    lineageCounts[character.lineage] = (lineageCounts[character.lineage] ?? 0) + 1;
    for (const element of affinity.elements) {
      elementCounts[element] = (elementCounts[element] ?? 0) + 1;
    }
    elementCounts[affinity.catalyst] = (elementCounts[affinity.catalyst] ?? 0) + 1;
    if (!highestRarity || signalRunCardRarityWeight(claim.rarity) > signalRunCardRarityWeight(highestRarity)) {
      highestRarity = claim.rarity;
    }
  }
  const dynamicStage = signalRunCardBinderStageForCount(uniqueClaims.length);
  const staticTarget = setTarget === undefined ? null : Math.max(1, finiteWhole(setTarget, SIGNAL_RUN_CARD_SET_TARGET, 1, Number.MAX_SAFE_INTEGER));
  const safeTarget = staticTarget ?? dynamicStage.setTarget;
  const stageStart = staticTarget ? 0 : dynamicStage.stageStart;
  const setStage = staticTarget ? 1 : dynamicStage.setStage;
  const stageSize = staticTarget ? safeTarget : dynamicStage.stageSize;
  const nextStageTarget = staticTarget ? safeTarget * 2 : dynamicStage.nextStageTarget;
  const stageCurrent = Math.max(0, uniqueClaims.length - stageStart);
  const stageTitle = signalRunVaultStageTitle(setStage);
  const supportCount = kindCounts.utility + kindCounts.relic + kindCounts.field;
  const completedLineages = Object.values(lineageCounts).filter((count) => count >= 3).length;
  const supportSets = Math.min(arenaDeckRoleCounts.utility, 3) + Math.min(arenaDeckRoleCounts.relic, 1) + Math.min(arenaDeckRoleCounts.field, 1);
  const arenaReadyDecks = Math.min(arenaDeckRoleCounts.champion, Math.floor(supportSets / 5));
  const battleRatingAverage = uniqueClaims.length > 0 ? Math.round(battleRatingTotal / uniqueClaims.length) : 0;
  const collectionGoals = [
    {
      key: "champion" as const,
      label: "Champion roster",
      current: kindCounts.character,
      target: 12,
      complete: kindCounts.character >= 12,
    },
    {
      key: "support" as const,
      label: "Support loadout",
      current: supportCount,
      target: 36,
      complete: supportCount >= 36,
    },
    {
      key: "elements" as const,
      label: "Element atlas",
      current: Object.keys(elementCounts).length,
      target: SIGNAL_RUN_WORLD_ELEMENTS.length,
      complete: Object.keys(elementCounts).length >= SIGNAL_RUN_WORLD_ELEMENTS.length,
    },
    {
      key: "lineage" as const,
      label: "Lineage sets",
      current: completedLineages,
      target: 6,
      complete: completedLineages >= 6,
    },
    {
      key: "arena" as const,
      label: "Arena deck",
      current: arenaDeckRoleCounts.champion > 0 ? Math.min(5, supportSets) : 0,
      target: 5,
      complete: arenaReadyDecks >= 1,
    },
    {
      key: "season" as const,
      label: `Binder stage ${setStage}`,
      current: stageCurrent,
      target: stageSize,
      complete: stageCurrent >= stageSize,
    },
    {
      key: "rating" as const,
      label: "Battle rating",
      current: battleRatingAverage,
      target: Math.min(999, 60 + setStage * 12),
      complete: battleRatingAverage >= Math.min(999, 60 + setStage * 12),
    },
  ];
  const completed = stageCurrent >= stageSize;
  const nextGoal = collectionGoals.find((goal) => !goal.complete) ?? collectionGoals[collectionGoals.length - 1]!;
  const setIdentity = `S01 Stage ${String(setStage).padStart(2, "0")} · ${stageTitle}`;
  const stageStatus = completed
    ? `${stageTitle} complete. Signal Vault expanded to ${nextStageTarget} cards.`
    : `${Math.max(0, stageSize - stageCurrent)} cards remain before ${stageTitle} expands.`;
  const milestoneReward = completed
    ? `Vault Stage ${setStage} expansion secured. Next target: ${nextStageTarget} cards.`
    : `Next chase: ${nextGoal.label} ${Math.min(nextGoal.current, nextGoal.target)}/${nextGoal.target}.`;
  return {
    totalCards: claims.length,
    uniqueCards: uniqueClaims.length,
    setIdentity,
    setTarget: safeTarget,
    setStage,
    stageTitle,
    stageStart,
    stageSize,
    nextStageTarget,
    setPercent: Math.min(100, Math.round((stageCurrent / stageSize) * 100)),
    stageStatus,
    milestoneReward,
    rarityScore,
    highestRarity,
    rarityCounts,
    kindCounts,
    elementCounts,
    lineageCounts,
    playableClasses: Array.from(playableClasses).sort(),
    arenaReadyDecks,
    arenaDeckRoleCounts,
    battleRatingTotal,
    battleRatingAverage,
    supportSubtypeCounts,
    expansionRule: "Binder stages expand forever: complete 24 cards, then each new stage adds another larger deterministic set target without changing any sealed card.",
    collectionGoals,
    nextChase: {
      ...nextGoal,
      detail: signalRunVaultNextChaseDetail({ goal: nextGoal, setStage, highestRarity }),
    },
    completed,
  };
}

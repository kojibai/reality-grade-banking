import type { SportsArenaEventMediaClip } from "@/app/lib/game/sportsArenaEventMedia";
import {
  SPORTS_ARENA_FIGHT_SCORING_VERSION,
  scoreSportsArenaFightEvent,
  type SportsArenaFightEventType,
} from "@/app/lib/game/sportsArenaScoring";
import {
  WORLD_CUP_MATCH_SCHEDULE,
  WORLD_CUP_ROSTER_PLAYERS,
  type WorldCupRosterPlayer,
  type WorldCupScheduleMatch,
} from "@/app/lib/game/worldCupData";

export const WORLD_CUP_PLAYER_FALLBACK_IMAGE_URL = "/assets/sports/world-cup/world-cup-player.svg";
export const SPORTS_ARENA_SOCCER_ENTRY_LIVE_WINDOW_MS = 150 * 60_000;

export type SportsArenaSlug = "baseball" | "soccer" | "fight";

export type SportsArenaCategoryState = "live" | "queued";

export type SportsArenaCategory = {
  slug: string;
  label: string;
  shortLabel: string;
  route: string;
  state: SportsArenaCategoryState;
  liveLine: string;
};

export type SportsArenaProbablePitcher = {
  name: string;
  personId: string;
  teamCode: string;
  imageUrl: string;
};

export type SportsArenaScoreboardLineup = {
  source: "mlb-boxscore";
  confirmed: boolean;
  starterPersonIds: string[];
  battingOrderPersonIds: string[];
  pitcherPersonIds: string[];
};

export type SportsArenaScoreboard = {
  id: string;
  status?: "live" | "pregame" | "final";
  gameDate?: string;
  startTimeLabel?: string;
  countdownLabel?: string;
  delayed?: boolean;
  statusDetail?: string;
  venue: string;
  away: {
    code: string;
    name: string;
    score: number;
  };
  home: {
    code: string;
    name: string;
    score: number;
  };
  inning: string;
  count: string;
  baseState:
    | "empty"
    | "runner-on-1st"
    | "runner-on-2nd"
    | "runner-on-3rd"
    | "runners-on-1st-2nd"
    | "runners-on-1st-3rd"
    | "runners-on-2nd-3rd"
    | "loaded";
  livePulse: string;
  field?: SportsArenaFieldState;
  probablePitchers?: {
    away?: SportsArenaProbablePitcher;
    home?: SportsArenaProbablePitcher;
  };
  lineup?: {
    away?: SportsArenaScoreboardLineup;
    home?: SportsArenaScoreboardLineup;
  };
  allStarRoster?: {
    source: "mlb-statsapi-boxscore";
    gamePk: string;
    personIds: string[];
  };
};

export type SportsArenaFieldState = {
  status: "live" | "pregame" | "final";
  gamePk: string;
  venue: string;
  inning: string;
  scoreLine: string;
  count: string;
  pitch: string;
  pitchType: string;
  baseState: string;
  baseStateKey: SportsArenaScoreboard["baseState"];
  lastPlay: string;
  playByPlay?: string;
  metrics?: {
    pitchType: string;
    pitchSpeedMph: number | null;
    pitchEndSpeedMph?: number | null;
    pitchSpinRateRpm?: number | null;
    pitchZone?: number | null;
    pitchPlateX?: number | null;
    pitchPlateZ?: number | null;
    pitchCoordinateX?: number | null;
    pitchCoordinateY?: number | null;
    pitchFlight?: {
      x0: number | null;
      y0: number | null;
      z0: number | null;
      vX0: number | null;
      vY0: number | null;
      vZ0: number | null;
      aX: number | null;
      aY: number | null;
      aZ: number | null;
      strikeZoneTopFeet: number | null;
      strikeZoneBottomFeet: number | null;
    };
    pitchPlayId?: string | null;
    pitchIndex?: number | null;
    pitchObservedAt?: string | null;
    exitVelocityMph: number | null;
    launchAngleDeg: number | null;
    distanceFt: number | null;
    hitTrajectory?: string;
    hitHardness?: string;
    hitLocation?: string;
    hitCoordinateX?: number | null;
    hitCoordinateY?: number | null;
  };
  livePlayers: SportsArenaLivePlayer[];
};

export type SportsArenaLivePlayerRole = "batter" | "pitcher" | "onFirst" | "onSecond" | "onThird" | "player" | "goalkeeper";

export type SportsArenaLivePlayer = {
  role: SportsArenaLivePlayerRole;
  label: string;
  name: string;
  personId: string;
  teamCode: string;
  position: string;
  imageUrl: string;
  statLine: string;
  deterministicScore: number;
  factors: string[];
  attributes: {
    height: string;
    weight: string;
    bats: string;
    throws: string;
    age: string;
  };
};

export type SportsArenaBaseCard = {
  sealedCardId: string;
  basisHash: string;
  issueLine: string;
  athleteId: string;
  sport: SportsArenaSlug;
};

export type SportsArenaPlayerBio = {
  jerseyNumber?: string;
  birthDate?: string;
  age?: string;
  height?: string;
  weight?: string;
  bats?: string;
  throws?: string;
  mlbDebutDate?: string;
  rosterStatus?: string;
  club?: string;
  division?: string;
  event?: string;
  opponent?: string;
};

export const SPORTS_ARENA_BASEBALL_CARD_BACK_PLAYER_BIO_KEYS = [
  "jerseyNumber",
  "birthDate",
  "age",
  "height",
  "weight",
  "bats",
  "throws",
  "mlbDebutDate",
  "rosterStatus",
] as const satisfies readonly (keyof SportsArenaPlayerBio)[];

export function sportsArenaBaseballCardHasFullPlayerBio(card: Pick<SportsArenaCard, "playerBio">): boolean {
  const playerBio = card.playerBio;
  return Boolean(playerBio && SPORTS_ARENA_BASEBALL_CARD_BACK_PLAYER_BIO_KEYS.every((key) => {
    const value = playerBio[key];
    return typeof value === "string" && value.trim().length > 0;
  }));
}

export function mergeSportsArenaPlayerBio(
  ...sources: Array<SportsArenaPlayerBio | null | undefined>
): SportsArenaPlayerBio | null {
  const merged: Partial<SportsArenaPlayerBio> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const [key, rawValue] of Object.entries(source) as Array<[keyof SportsArenaPlayerBio, string | null | undefined]>) {
      const value = typeof rawValue === "string" ? rawValue.trim() : "";
      if (!value || merged[key]) continue;
      merged[key] = value;
    }
  }
  return Object.keys(merged).length > 0 ? merged as SportsArenaPlayerBio : null;
}

export type SportsArenaRookieStatus = {
  schema: "receiz.sports_arena.mlb_rookie_status.v1";
  isRookie: boolean;
  rookieSeason: number | null;
  rookieClass: string | null;
  rookieMarketKey: string | null;
  mlbDebutDate: string | null;
  rule: string;
  basisHash: string;
};

export type SportsArenaCardMedia = {
  deterministicAssetId: string;
  imageUrl: string;
  sourceUrl: string;
  alt: string;
  dominantColor: string;
  source: "mlb" | "fifa" | "ufc";
  sourceId: string;
};

export type SportsArenaCardTier = "Common" | "Rare" | "Gold" | "Champion" | "Mythic";

export type SportsArenaCard = {
  id: string;
  athlete: string;
  team: string;
  teamCode: string;
  opponentCode: string;
  position: string;
  side: "batter" | "pitcher" | "team" | "player";
  rating: number;
  tier: SportsArenaCardTier;
  accent: "cyan" | "amber" | "red" | "green" | "steel";
  projectedScore: number;
  currentScore: number;
  statLine: string;
  liveLine: string;
  tags: string[];
  rookie?: SportsArenaRookieStatus | null;
  playerBio?: SportsArenaPlayerBio | null;
  media: SportsArenaCardMedia;
  baseCard: SportsArenaBaseCard;
  historyCount: number;
};

export type SportsArenaAppendKind = "entry" | "stat" | "rank" | "reward" | "scar";

export type SportsArenaAppend = {
  id: string;
  cardId: string;
  at: string;
  kind: SportsArenaAppendKind;
  label: string;
  detail: string;
  value: string;
  scoreDelta: number;
  txid: string;
  sourceDate?: string;
  gamePk?: string;
  factors?: string[];
};

export type SportsArenaFightLiveEvent = {
  schema: "receiz.sports_arena.fight_event.v1";
  eventId: string;
  fightId: string;
  sourceDate: string;
  observedAt: string;
  round: number;
  clock: string;
  cardId: string;
  fighterCode: string;
  opponentCode: string;
  fighterName: string;
  side: "away" | "home";
  eventType: SportsArenaFightEventType;
  label: string;
  detail: string;
  value: number;
  scoreDelta: number;
  factors: string[];
  scoringVersion: typeof SPORTS_ARENA_FIGHT_SCORING_VERSION;
};

export type SportsArenaLiveEventMetrics = {
  pitchType: string;
  pitchCode: string;
  pitchCall: string;
  pitchDescription: string;
  pitchSpeedMph: number | null;
  pitchEndSpeedMph: number | null;
  pitchSpinRateRpm: number | null;
  pitchZone: number | null;
  pitchPlateX: number | null;
  pitchPlateZ: number | null;
  pitchCoordinateX: number | null;
  pitchCoordinateY: number | null;
  exitVelocityMph: number | null;
  launchAngleDeg: number | null;
  distanceFt: number | null;
  hitTrajectory: string;
  hitHardness: string;
  hitLocation: string;
  hitCoordinateX: number | null;
  hitCoordinateY: number | null;
};

export type SportsArenaLiveAppendSubjectRole = "batter" | "pitcher" | "fielder" | "runner" | "player" | "goalkeeper" | "fighter";

export type SportsArenaLiveAppendRecord = {
  schema: "receiz.sports_arena.card_append.v1";
  appendHash: string;
  ownerUserId: string;
  collectibleId: string;
  claimHash: string;
  sport: SportsArenaSlug;
  cardId: string;
  source: "mlb-statsapi" | "fifa-world-cup-26" | "ufc-event-feed";
  sourceProof: {
    sourceUrl: string;
    sourceDate: string;
    gamePk: string;
    playId: string;
    mediaPlayId?: string;
    eventKey: string;
    feedPath: "liveData.plays.allPlays" | "fifa.match.events" | "ufc.event.feed";
    observedAt: string;
    sourceSnapshotHash?: string;
    videoOffsetStartMs?: number;
    videoOffsetEndMs?: number;
    videoOffsetBasis?: {
      kind: "mlb-play-window";
      gameStartTime: string;
      eventStartTime: string;
      eventEndTime: string;
      preRollMs: number;
      postRollMs: number;
    };
  };
  subject: {
    personId: string;
    name: string;
    teamCode: string;
    opponentCode: string;
    role: SportsArenaLiveAppendSubjectRole;
    position: string;
  };
  event: {
    type: string;
    label: string;
    detail: string;
    inning: string;
    halfInning: string;
    balls: number;
    strikes: number;
    outs: number;
    baseStateKey?: SportsArenaScoreboard["baseState"];
    rbi: number;
    isScoringPlay: boolean;
    awayScore?: number | null;
    homeScore?: number | null;
    scoreDifferential?: number | null;
    defensiveCredits?: string[];
    metrics?: SportsArenaLiveEventMetrics;
  };
  scoring: {
    version: "receiz.sports_arena.baseball.scoring.v1" | "receiz.sports_arena.baseball.scoring.v2" | "receiz.sports_arena.baseball.scoring.v3" | "receiz.sports_arena.baseball.scoring.v4" | "receiz.sports_arena.baseball.scoring.v5" | "receiz.sports_arena.soccer.scoring.v1" | "receiz.sports_arena.fight.scoring.v1";
    scoreDelta: number;
    phiDeltaMicro: number;
    factors: string[];
  };
  proof?: {
    schema: "receiz.sports_arena.card_append_proof.v1";
    proofId: string;
    proofKind: "mlb-event" | "fifa-event" | "ufc-event";
    proofHash: string;
    issuedAt: string;
    sourceSnapshotHash: string;
    basis: {
      ownerUserId: string;
      collectibleId: string;
      claimHash: string;
      cardId: string;
      sport: SportsArenaSlug;
    };
    sourceProof: SportsArenaLiveAppendRecord["sourceProof"];
    subject: SportsArenaLiveAppendRecord["subject"];
    event: SportsArenaLiveAppendRecord["event"];
    scoring: SportsArenaLiveAppendRecord["scoring"];
    visualMedia?: SportsArenaEventMediaClip;
    kai?: {
      schema: "receiz.kai_upulse.v1";
      basis: "monotonic-kai-frequency-from-genesis" | "sourceProof.observedAt";
      observedAt: string;
      pulse: number;
      upulse: string;
    };
  };
  visualMedia?: SportsArenaEventMediaClip;
  createdAtMs: number;
};

export type SportsArenaLeaderboardRow = {
  rank: number;
  name: string;
  points: number;
  state: "you" | "hot" | "sealed";
};

export type SportsArenaScoringRule = {
  label: string;
  value: string;
  detail?: string;
};

export type SportsArenaSnapshot = {
  schema: "receiz.sports_arena.snapshot.v1";
  sport: SportsArenaSlug;
  route: string;
  title: string;
  slateLabel: string;
  entryRule: string;
  lineupSize: number;
  selectedCardIds: string[];
  categories: SportsArenaCategory[];
  scoreboards: SportsArenaScoreboard[];
  field: SportsArenaFieldState;
  cards: SportsArenaCard[];
  proofTimeline: SportsArenaAppend[];
  leaderboard: SportsArenaLeaderboardRow[];
  scoringRules: SportsArenaScoringRule[];
  reward: {
    label: string;
    detail: string;
    cardId: string;
  };
  appendLaw: string;
};

export type SportsArenaLiveFeed = {
  schema: "receiz.sports_arena.live_feed.v1";
  source: "mlb-statsapi" | "fifa-world-cup-26";
  sourceUrl: string;
  sourceDate: string;
  fetchedAt: string;
  totalGames: number;
  inProgressGames: number;
  stateLine: string;
  scoreboards: SportsArenaScoreboard[];
  field: SportsArenaFieldState | null;
  nextGame?: SportsArenaScoreboard;
};

export type SportsArenaPackDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  priceLabel: string;
  priceUsdCents: number;
  category: "starter" | "premium" | "reward";
  detail: string;
  cardCount: number;
  guaranteedFloor: SportsArenaCardTier;
  rarityOdds: Record<SportsArenaCardTier, number>;
  playerOdds: {
    minRating: number;
    qualityBias: number;
    rule: string;
  };
};

export type SportsArenaPackReceipt = {
  schema: "receiz.sports_arena.pack_receipt.v1";
  packId: string;
  receiptId: string;
  clientNonce: string;
  packSeed: string;
  priceUsdCents: number;
  openedAt: string;
  cardIds: string[];
};

export type SportsArenaTournamentDefinition = {
  id: string;
  title: string;
  sport: SportsArenaSlug;
  entryPriceUsdCents: number;
  prizePoolBps: number;
  platformFeeBps: number;
  referralPoolBps: number;
  reservePoolBps: number;
  paidRankPercent: number;
  minProfitUsdCents: number;
  minEntrantsToRun: number;
  payoutCurveExponent: number;
  rulesetId: string;
  scoringVersion: string;
  payoutVersion: string;
};

export type SportsArenaTournamentPayoutRow = {
  rank: number;
  label: string;
  payoutUsdCents: number;
};

export type SportsArenaTournamentEconomics = {
  schema: "receiz.sports_arena.tournament_economics.v1";
  entryCount: number;
  entryPriceUsdCents: number;
  grossUsdCents: number;
  prizePoolUsdCents: number;
  platformFeeUsdCents: number;
  referralPoolUsdCents: number;
  reservePoolUsdCents: number;
  paidRankPercent: number;
  paidRanks: number;
  minPaidPayoutUsdCents: number;
  profitFloorArmed: boolean;
  minEntrantsToRun: number;
  runArmed: boolean;
  entriesNeededToRun: number;
  refundIfUnderfilled: boolean;
  minimumEntrantsForProfit: number;
  firstPlaceEstimateUsdCents: number;
  payoutLadder: SportsArenaTournamentPayoutRow[];
};

export const SPORTS_ARENA_ROUTE = "/game/sports";

export const SPORTS_ARENA_APPEND_LAW =
  "Sealed Sports Card identity is immutable. Real-world arena outcomes append verified records; projected card state is derived from those appends.";

export const SPORTS_ARENA_REWARD_PACK_ID = "mlb-arena-reward";
export const SPORTS_PACK_DERBY_ROOKIE_PACK_ID = "mlb-pack-derby-rookie";
export const SPORTS_PACK_DERBY_STANDARD_PACK_ID = "mlb-pack-derby-standard";
export const SPORTS_PACK_DERBY_HOT_PACK_ID = "mlb-pack-derby-hot";
export const SPORTS_PACK_DERBY_RARE_PACK_ID = "mlb-pack-derby-rare";
export const SPORTS_PACK_DERBY_ELITE_PACK_ID = "mlb-pack-derby-elite";
export const SPORTS_PACK_DERBY_MYTHIC_CHANCE_PACK_ID = "mlb-pack-derby-mythic-chance";
export const SPORTS_PACK_DERBY_DAILY_EVENT_VAULT_PACK_ID = "mlb-pack-derby-daily-event-vault";
export const SPORTS_ARENA_DAILY_TOURNAMENT_ID = "mlb-daily-main-event";
export const UFC_FIGHTER_MINT_PACK_ID = "ufc-fighter-mint";
export const UFC_FREE_FIGHT_PACK_ID = "ufc-free-fight-pack";
export const UFC_FIGHT_NIGHT_PACK_ID = "ufc-fight-night-pack";
export const UFC_MAIN_CARD_PACK_ID = "ufc-main-card-pack";
export const UFC_FULL_CARD_CHASE_PACK_ID = "ufc-full-card-chase";
export const UFC_FIGHT_PICK_FIVE_TOURNAMENT_ID = "ufc-fight-pick-five-main-event";
export const WORLD_CUP_MAIN_EVENT_TOURNAMENT_ID = "fifa-world-cup-main-event";

export const SPORTS_ARENA_DAILY_TOURNAMENT: SportsArenaTournamentDefinition = {
  id: SPORTS_ARENA_DAILY_TOURNAMENT_ID,
  title: "MLB Daily Main Event",
  sport: "baseball",
  entryPriceUsdCents: 300,
  prizePoolBps: 8000,
  platformFeeBps: 1200,
  referralPoolBps: 500,
  reservePoolBps: 300,
  paidRankPercent: 0.3,
  minProfitUsdCents: 50,
  minEntrantsToRun: 10,
  payoutCurveExponent: 1.24,
  rulesetId: "receiz.sports_arena.daily_open.v1",
  scoringVersion: "receiz.sports_arena.baseball.scoring.v5",
  payoutVersion: "receiz.sports_arena.tournament.payout.v1",
};

export const UFC_FIGHT_PICK_FIVE_TOURNAMENT: SportsArenaTournamentDefinition = {
  id: UFC_FIGHT_PICK_FIVE_TOURNAMENT_ID,
  title: "UFC Fight Pick 5 Main Event",
  sport: "fight",
  entryPriceUsdCents: 300,
  prizePoolBps: 8000,
  platformFeeBps: 1200,
  referralPoolBps: 500,
  reservePoolBps: 300,
  paidRankPercent: 0.3,
  minProfitUsdCents: 50,
  minEntrantsToRun: 10,
  payoutCurveExponent: 1.24,
  rulesetId: "ufc-fight-pick-five-main-event-v1",
  scoringVersion: "receiz.sports_arena.fight.scoring.v1",
  payoutVersion: "receiz.sports_arena.tournament.payout.v1",
};

export const WORLD_CUP_MAIN_EVENT_TOURNAMENT: SportsArenaTournamentDefinition = {
  id: WORLD_CUP_MAIN_EVENT_TOURNAMENT_ID,
  title: "World Cup Main Event",
  sport: "soccer",
  entryPriceUsdCents: 300,
  prizePoolBps: 8000,
  platformFeeBps: 1200,
  referralPoolBps: 500,
  reservePoolBps: 300,
  paidRankPercent: 0.3,
  minProfitUsdCents: 50,
  minEntrantsToRun: 10,
  payoutCurveExponent: 1.24,
  rulesetId: "fifa-world-cup-main-event-v1",
  scoringVersion: "receiz.sports_arena.soccer.scoring.v1",
  payoutVersion: "receiz.sports_arena.tournament.payout.v1",
};

export const SPORTS_ARENA_CATEGORIES: SportsArenaCategory[] = [
  {
    slug: "baseball",
    label: "Baseball",
    shortLabel: "MLB",
    route: "/game/sports/baseball",
    state: "live",
    liveLine: "Tonight's slate",
  },
  {
    slug: "basketball",
    label: "Basketball",
    shortLabel: "NBA",
    route: "/game/sports/basketball",
    state: "queued",
    liveLine: "Next sport",
  },
  {
    slug: "football",
    label: "Football",
    shortLabel: "NFL",
    route: "/game/sports/football",
    state: "queued",
    liveLine: "Sunday arena",
  },
  {
    slug: "fight",
    label: "Fight Night",
    shortLabel: "UFC",
    route: "/game/sports/fight",
    state: "live",
    liveLine: "Fight Pick 5",
  },
  {
    slug: "soccer",
    label: "Soccer",
    shortLabel: "FIFA",
    route: "/game/sports/soccer",
    state: "live",
    liveLine: "World Cup window",
  },
  {
    slug: "hockey",
    label: "Hockey",
    shortLabel: "NHL",
    route: "/game/sports/hockey",
    state: "queued",
    liveLine: "Launch later",
  },
];

const MLB_HEADSHOT_BASE =
  "https://img.mlbstatic.com/mlb-photos/image/upload/w_260,d_people:generic:headshot:silo:current.png,q_auto:best,f_auto/v1/people";

function mlbHeadshotSourceUrl(personId: string): string {
  return `${MLB_HEADSHOT_BASE}/${personId}/headshot/67/current`;
}

function mlbHeadshotUrl(personId: string): string {
  return `/api/game/sports/baseball/player-image/${personId}`;
}

function mlbCardMedia(args: {
  slug: string;
  personId: string;
  athlete: string;
  dominantColor: string;
}): SportsArenaCardMedia {
  return {
    deterministicAssetId: `sports.mlb.card_media.${args.slug}.v1`,
    imageUrl: mlbHeadshotUrl(args.personId),
    sourceUrl: mlbHeadshotSourceUrl(args.personId),
    alt: `${args.athlete} Receiz baseball card portrait`,
    dominantColor: args.dominantColor,
    source: "mlb",
    sourceId: args.personId,
  };
}

export const SPORTS_ARENA_PACKS: SportsArenaPackDefinition[] = [
  {
    id: "mlb-free-common",
    label: "Free Starter Pack",
    shortLabel: "Free",
    priceLabel: "Free",
    priceUsdCents: 0,
    category: "starter",
    detail: "Five base-set cards so every new account can build a real Pick 5 immediately.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 10_000_000,
      Rare: 0,
      Gold: 0,
      Champion: 0,
      Mythic: 0,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 0.35,
      rule: "Fibonacci player scarcity: every MLB player is eligible, but elite players remain chase pulls even as Common variants.",
    },
  },
  {
    id: "mlb-starter-live-pack",
    label: "Live Starter",
    shortLabel: "Starter",
    priceLabel: "$2.99",
    priceUsdCents: 299,
    category: "starter",
    detail: "Five real-player Sports Cards with wide base-set spread, a light paid player-quality lift, and rarity variants that land as true surprise events.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_999_900,
      Rare: 87,
      Gold: 10,
      Champion: 2,
      Mythic: 1,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 0.94,
      rule: "Full MLB base set with a light paid-pack lift toward stronger players; variant rarity remains separately scarce.",
    },
  },
  {
    id: "mlb-power-pack",
    label: "Prime Stack",
    shortLabel: "Prime",
    priceLabel: "$8.99",
    priceUsdCents: 899,
    category: "premium",
    detail: "Six full-MLB pulls with stronger player-quality pressure; base cards remain the default and rarity variants stay genuinely scarce.",
    cardCount: 6,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_999_800,
      Rare: 174,
      Gold: 20,
      Champion: 4,
      Mythic: 2,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.42,
      rule: "Prime full-MLB lane: every player remains eligible, stronger deterministic profiles are weighted upward without becoming guaranteed, and card rarity is independent.",
    },
  },
  {
    id: "mlb-ace-pack",
    label: "Elite Stack",
    shortLabel: "Elite",
    priceLabel: "$29.99",
    priceUsdCents: 2999,
    category: "premium",
    detail: "Eight full-MLB premium pulls with a stronger player-quality curve; every player remains possible and premium variants stay rare enough to feel shocking.",
    cardCount: 8,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_999_050,
      Rare: 840,
      Gold: 90,
      Champion: 15,
      Mythic: 5,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.78,
      rule: "Elite full-MLB lane: every player remains eligible, but stronger deterministic stat profiles are weighted upward without becoming guaranteed.",
    },
  },
  {
    id: "mlb-champion-chase",
    label: "Champion Chase",
    shortLabel: "Chase",
    priceLabel: "$49.99",
    priceUsdCents: 4999,
    category: "premium",
    detail: "Twelve top-lane MLB pulls with the strongest player-quality lift; high grades are still not guaranteed and rarity variants remain almost-never surprise pulls.",
    cardCount: 12,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_998_360,
      Rare: 1_350,
      Gold: 225,
      Champion: 50,
      Mythic: 15,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 2.48,
      rule: "Premium chase lane: every MLB player remains eligible, but better real-stat profiles are weighted upward; best players and premium variants remain two separate scarcity gates.",
    },
  },
  {
    id: SPORTS_ARENA_REWARD_PACK_ID,
    label: "Arena Reward",
    shortLabel: "Reward",
    priceLabel: "Won",
    priceUsdCents: 0,
    category: "reward",
    detail: "Deterministic reward proof card for finalized MLB arena winners.",
    cardCount: 1,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_996_000,
      Rare: 3_650,
      Gold: 310,
      Champion: 35,
      Mythic: 5,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.24,
      rule: "Arena reward lane: earned packs weight toward playable cards while preserving full-player eligibility, elite-player scarcity, and premium-variant scarcity.",
    },
  },
  {
    id: SPORTS_PACK_DERBY_ROOKIE_PACK_ID,
    label: "Pack Derby Starter",
    shortLabel: "Starter",
    priceLabel: "Won",
    priceUsdCents: 0,
    category: "reward",
    detail: "Earned Pack Derby proof pack for one verified run.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 10_000_000,
      Rare: 0,
      Gold: 0,
      Champion: 0,
      Mythic: 0,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 0.55,
      rule: "Pack Derby Starter lane: the first verified earned full pack requires one real run, full MLB eligibility, and no premium rarity inflation.",
    },
  },
  {
    id: SPORTS_PACK_DERBY_STANDARD_PACK_ID,
    label: "Pack Derby Plus",
    shortLabel: "Plus",
    priceLabel: "Won",
    priceUsdCents: 0,
    category: "reward",
    detail: "Earned Pack Derby proof pack for two or more verified runs.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_999_950,
      Rare: 45,
      Gold: 5,
      Champion: 0,
      Mythic: 0,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 0.8,
      rule: "Pack Derby Plus lane: a second verified run starts stronger player pressure while keeping premium rarity scarce.",
    },
  },
  {
    id: SPORTS_PACK_DERBY_HOT_PACK_ID,
    label: "Pack Derby Hot",
    shortLabel: "Hot",
    priceLabel: "Won",
    priceUsdCents: 0,
    category: "reward",
    detail: "Earned Pack Derby proof pack for three or more verified runs.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_998_750,
      Rare: 1_120,
      Gold: 120,
      Champion: 9,
      Mythic: 1,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.02,
      rule: "Pack Derby Hot lane: strong verified runs get a meaningful five-card pack while premium variants remain true chase pulls.",
    },
  },
  {
    id: SPORTS_PACK_DERBY_RARE_PACK_ID,
    label: "Pack Derby Rare",
    shortLabel: "Rare",
    priceLabel: "Won",
    priceUsdCents: 0,
    category: "reward",
    detail: "Earned Pack Derby proof pack for four or more verified runs.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_995_500,
      Rare: 4_000,
      Gold: 450,
      Champion: 45,
      Mythic: 5,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.24,
      rule: "Pack Derby Rare lane: high-skill scoring earns a visibly better five-card lane while keeping full-player eligibility and scarce variants.",
    },
  },
  {
    id: SPORTS_PACK_DERBY_ELITE_PACK_ID,
    label: "Pack Derby Elite",
    shortLabel: "Elite",
    priceLabel: "Won",
    priceUsdCents: 0,
    category: "reward",
    detail: "Earned Pack Derby proof pack for five or more verified runs.",
    cardCount: 6,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_990_000,
      Rare: 8_500,
      Gold: 1_300,
      Champion: 180,
      Mythic: 20,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.62,
      rule: "Pack Derby Elite lane: elite arcade execution earns a premium player-quality curve without granting guaranteed stars.",
    },
  },
  {
    id: SPORTS_PACK_DERBY_MYTHIC_CHANCE_PACK_ID,
    label: "Pack Derby Mythic Chance",
    shortLabel: "Mythic Chance",
    priceLabel: "Won",
    priceUsdCents: 0,
    category: "reward",
    detail: "Earned Pack Derby proof pack for six or more verified runs.",
    cardCount: 6,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_980_000,
      Rare: 16_000,
      Gold: 3_200,
      Champion: 700,
      Mythic: 100,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 2.05,
      rule: "Pack Derby Mythic Chance lane: only exceptional verified half innings enter the best earned lane while preserving rarity scarcity.",
    },
  },
  {
    id: SPORTS_PACK_DERBY_DAILY_EVENT_VAULT_PACK_ID,
    label: "Pack Derby Daily Event Vault",
    shortLabel: "Daily Event",
    priceLabel: "Won",
    priceUsdCents: 0,
    category: "reward",
    detail: "Daily top-score Pack Derby proof pack for the Event Vault winner.",
    cardCount: 1,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_940_000,
      Rare: 45_000,
      Gold: 12_000,
      Champion: 2_500,
      Mythic: 500,
    },
    playerOdds: {
      minRating: 70,
      qualityBias: 2.9,
      rule: "Pack Derby Daily Event Vault lane: daily leaderboard proof pack with top-player pressure and preserved premium-variant scarcity.",
    },
  },
];

export const WORLD_CUP_ARENA_PACKS: SportsArenaPackDefinition[] = [
  {
    id: "fifa-world-cup-starter",
    label: "World Cup Starter",
    shortLabel: "Starter",
    priceLabel: "Free",
    priceUsdCents: 0,
    category: "starter",
    detail: "Five FIFA World Cup base cards so a new soccer Vault can build a Match 5 roster before kickoff.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 10_000_000,
      Rare: 0,
      Gold: 0,
      Champion: 0,
      Mythic: 0,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 0.42,
      rule: "Every World Cup proof card stays eligible, while host-nation and knockout-lane cards remain chase pulls even as Common variants.",
    },
  },
  {
    id: "fifa-world-cup-matchday-pack",
    label: "Matchday Pack",
    shortLabel: "Matchday",
    priceLabel: "$2.99",
    priceUsdCents: 299,
    category: "starter",
    detail: "Five World Cup roster pulls with a light matchday quality lift and scarce FIFA variant issues.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_999_900,
      Rare: 87,
      Gold: 10,
      Champion: 2,
      Mythic: 1,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 0.98,
      rule: "Full World Cup card pool with a light paid-pack lift toward stronger deterministic tournament roles; variant rarity remains separately scarce.",
    },
  },
  {
    id: "fifa-world-cup-knockout-pack",
    label: "Knockout Pack",
    shortLabel: "Knockout",
    priceLabel: "$8.99",
    priceUsdCents: 899,
    category: "premium",
    detail: "Five World Cup pulls with stronger knockout-lane pressure while every FIFA card remains possible.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_999_760,
      Rare: 210,
      Gold: 24,
      Champion: 4,
      Mythic: 2,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.42,
      rule: "Knockout lane: every World Cup card remains eligible, stronger deterministic roles are weighted upward without becoming guaranteed, and card rarity is independent.",
    },
  },
  {
    id: "fifa-world-cup-final-chase",
    label: "Final Chase",
    shortLabel: "Final",
    priceLabel: "$29.99",
    priceUsdCents: 2999,
    category: "premium",
    detail: "Six premium World Cup pulls with the strongest tournament-role lift; base cards remain the default and premium FIFA variants stay scarce.",
    cardCount: 6,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_999_334,
      Rare: 590,
      Gold: 60,
      Champion: 12,
      Mythic: 4,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.86,
      rule: "Final chase lane: every World Cup card remains eligible, but stronger deterministic tournament roles are weighted upward; best cards and premium variants remain two separate scarcity gates.",
    },
  },
];

export const FIGHT_ARENA_PACKS: SportsArenaPackDefinition[] = [
  {
    id: UFC_FREE_FIGHT_PACK_ID,
    label: "Free Fight Pack",
    shortLabel: "Free",
    priceLabel: "Free",
    priceUsdCents: 0,
    category: "starter",
    detail: "Five UFC Fighter Card base pulls from the full roster so a new fight Vault can enter the $3 Main Event with owned cards first.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 10_000_000,
      Rare: 0,
      Gold: 0,
      Champion: 0,
      Mythic: 0,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 0.42,
      rule: "Free UFC starter lane: the full UFC Fighter Card roster remains eligible, and active booked-fight opponents cannot land together in one sealed pack.",
    },
  },
  {
    id: UFC_FIGHT_NIGHT_PACK_ID,
    label: "Fight Night",
    shortLabel: "Night",
    priceLabel: "$3.00",
    priceUsdCents: 300,
    category: "starter",
    detail: "Five UFC Fighter Card pulls from the full roster. Active booked-fight opponents cannot land together in one sealed pack.",
    cardCount: 5,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_998_950,
      Rare: 920,
      Gold: 110,
      Champion: 18,
      Mythic: 2,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.18,
      rule: "Fight Night lane: UFC Fighter Card pulls are derived from the sealed pack seed across the full roster, with active booked-fight opponent collisions blocked inside the pack.",
    },
  },
  {
    id: UFC_MAIN_CARD_PACK_ID,
    label: "Main Card",
    shortLabel: "Main",
    priceLabel: "$8.99",
    priceUsdCents: 899,
    category: "premium",
    detail: "Seven UFC roster pulls with stronger main-card fighter lift while preserving active booked-fight collision blocking.",
    cardCount: 7,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_998_430,
      Rare: 1_330,
      Gold: 190,
      Champion: 42,
      Mythic: 8,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.48,
      rule: "Main Card lane: the full UFC Fighter Card roster remains eligible, stronger ratings carry lift, and active booked-fight opponents cannot land together.",
    },
  },
  {
    id: UFC_FULL_CARD_CHASE_PACK_ID,
    label: "Full Card Chase",
    shortLabel: "Chase",
    priceLabel: "$19.99",
    priceUsdCents: 1999,
    category: "premium",
    detail: "Ten premium UFC roster pulls with chase rarity odds and no active opponent collision inside the same pack.",
    cardCount: 10,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 9_997_360,
      Rare: 2_130,
      Gold: 390,
      Champion: 95,
      Mythic: 25,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1.82,
      rule: "Full Card Chase lane: the sealed receipt seed can reach the full UFC Fighter Card roster, while active booked-fight opponent sides are blocked from entering the same pack.",
    },
  },
];

export const FIGHT_ARENA_LEGACY_PACKS: SportsArenaPackDefinition[] = [
  {
    id: UFC_FIGHTER_MINT_PACK_ID,
    label: "Fighter Card Mint",
    shortLabel: "Fighter",
    priceLabel: "$4.99+",
    priceUsdCents: 499,
    category: "starter",
    detail: "Legacy direct UFC Fighter Card mint retained only for already-created purchase rows.",
    cardCount: 1,
    guaranteedFloor: "Common",
    rarityOdds: {
      Common: 10_000_000,
      Rare: 0,
      Gold: 0,
      Champion: 0,
      Mythic: 0,
    },
    playerOdds: {
      minRating: 0,
      qualityBias: 1,
      rule: "Legacy direct fighter mint: preserved for older sealed receipts. Current UFC packs use sealed fight-card pack spread and do not expose direct fighter selection.",
    },
  },
];

const MLB_SCOREBOARDS: SportsArenaScoreboard[] = [
  {
    id: "mlb-nyy-lad",
    venue: "Yankee Stadium",
    away: { code: "NYY", name: "New York", score: 3 },
    home: { code: "LAD", name: "Los Angeles", score: 2 },
    inning: "7th",
    count: "2-1",
    baseState: "runner-on-2nd",
    livePulse: "Judge HR moved +4.8",
  },
  {
    id: "mlb-hou-tex",
    venue: "Minute Maid Park",
    away: { code: "HOU", name: "Houston", score: 1 },
    home: { code: "TEX", name: "Texas", score: 0 },
    inning: "7th",
    count: "0-0",
    baseState: "runner-on-2nd",
    livePulse: "Alvarez single",
  },
  {
    id: "mlb-atl-phi",
    venue: "Citizens Bank Park",
    away: { code: "ATL", name: "Atlanta", score: 4 },
    home: { code: "PHI", name: "Philadelphia", score: 3 },
    inning: "6th",
    count: "1-2",
    baseState: "runner-on-1st",
    livePulse: "Riley RBI watch",
  },
];

const MLB_FOUNDING_SLATE_PLAYER_BIO_BY_PERSON_ID: Record<string, SportsArenaPlayerBio> = {
  "592450": { jerseyNumber: "99", birthDate: "1992-04-26", age: "34", height: "6' 7\"", weight: "282", bats: "R", throws: "R", mlbDebutDate: "2016-08-13", rosterStatus: "Active" },
  "660271": { jerseyNumber: "17", birthDate: "1994-07-05", age: "31", height: "6' 4\"", weight: "210", bats: "L", throws: "R", mlbDebutDate: "2018-03-29", rosterStatus: "Active" },
  "663586": { jerseyNumber: "27", birthDate: "1997-04-02", age: "29", height: "6' 1\"", weight: "225", bats: "R", throws: "R", mlbDebutDate: "2019-05-15", rosterStatus: "Active" },
  "670541": { jerseyNumber: "44", birthDate: "1997-06-27", age: "28", height: "6' 4\"", weight: "237", bats: "L", throws: "R", mlbDebutDate: "2019-06-09", rosterStatus: "Active" },
  "665487": { jerseyNumber: "23", birthDate: "1999-01-02", age: "27", height: "6' 3\"", weight: "217", bats: "R", throws: "R", mlbDebutDate: "2019-03-28", rosterStatus: "Active" },
  "677951": { jerseyNumber: "7", birthDate: "2000-06-14", age: "26", height: "6' 1\"", weight: "200", bats: "R", throws: "R", mlbDebutDate: "2022-04-07", rosterStatus: "Active" },
  "669373": { jerseyNumber: "29", birthDate: "1996-11-20", age: "29", height: "6' 3\"", weight: "240", bats: "R", throws: "L", mlbDebutDate: "2020-08-18", rosterStatus: "Active" },
  "668939": { jerseyNumber: "35", birthDate: "1998-02-06", age: "28", height: "6' 1\"", weight: "230", bats: "S", throws: "R", mlbDebutDate: "2022-05-21", rosterStatus: "Active" },
  "518692": { jerseyNumber: "5", birthDate: "1989-09-12", age: "36", height: "6' 4\"", weight: "220", bats: "L", throws: "R", mlbDebutDate: "2010-09-01", rosterStatus: "Active" },
  "543760": { jerseyNumber: "10", birthDate: "1990-09-17", age: "35", height: "6' 0\"", weight: "195", bats: "R", throws: "R", mlbDebutDate: "2013-09-04", rosterStatus: "Active" },
  "608070": { jerseyNumber: "11", birthDate: "1992-09-17", age: "33", height: "5' 8\"", weight: "190", bats: "S", throws: "R", mlbDebutDate: "2013-09-01", rosterStatus: "Active" },
  "682829": { jerseyNumber: "44", birthDate: "2002-01-11", age: "24", height: "6' 6\"", weight: "200", bats: "S", throws: "R", mlbDebutDate: "2023-06-06", rosterStatus: "Active" },
  "660670": { jerseyNumber: "13", birthDate: "1997-12-18", age: "28", height: "6' 0\"", weight: "205", bats: "R", throws: "R", mlbDebutDate: "2018-04-25", rosterStatus: "Active" },
  "665742": { jerseyNumber: "22", birthDate: "1998-10-25", age: "27", height: "6' 1\"", weight: "224", bats: "L", throws: "L", mlbDebutDate: "2018-05-15", rosterStatus: "Active" },
  "677594": { jerseyNumber: "44", birthDate: "2000-12-29", age: "25", height: "6' 4\"", weight: "228", bats: "R", throws: "R", mlbDebutDate: "2022-04-08", rosterStatus: "Active" },
  "682998": { jerseyNumber: "7", birthDate: "2000-08-21", age: "25", height: "5' 10\"", weight: "165", bats: "L", throws: "L", mlbDebutDate: "2022-08-29", rosterStatus: "Active" },
  "543037": { jerseyNumber: "45", birthDate: "1990-09-08", age: "35", height: "6' 4\"", weight: "220", bats: "R", throws: "R", mlbDebutDate: "2013-06-11", rosterStatus: "Active" },
  "694973": { jerseyNumber: "30", birthDate: "2002-05-29", age: "24", height: "6' 6\"", weight: "260", bats: "R", throws: "R", mlbDebutDate: "2024-05-11", rosterStatus: "Active" },
  "675911": { jerseyNumber: "99", birthDate: "1998-10-28", age: "27", height: "6' 0\"", weight: "195", bats: "R", throws: "R", mlbDebutDate: "2021-10-01", rosterStatus: "Active" },
  "554430": { jerseyNumber: "45", birthDate: "1990-05-30", age: "36", height: "6' 4\"", weight: "195", bats: "L", throws: "R", mlbDebutDate: "2013-06-18", rosterStatus: "Active" },
  "661403": { jerseyNumber: "48", birthDate: "1998-03-18", age: "28", height: "6' 2\"", weight: "206", bats: "R", throws: "R", mlbDebutDate: "2019-08-04", rosterStatus: "Active" },
  "623352": { jerseyNumber: "71", birthDate: "1994-04-07", age: "32", height: "6' 3\"", weight: "188", bats: "L", throws: "L", mlbDebutDate: "2017-06-10", rosterStatus: "Active" },
};

const MLB_FOUNDING_SLATE_CARDS: SportsArenaCard[] = [
  {
    id: "mlb-card-aaron-judge",
    athlete: "A. Judge",
    team: "New York",
    teamCode: "NYY",
    opponentCode: "LAD",
    position: "RF",
    side: "batter",
    rating: 99,
    tier: "Champion",
    accent: "cyan",
    projectedScore: 11.2,
    currentScore: 0,
    statLine: "2-3, HR, RBI",
    liveLine: "HR distance 412 ft",
    tags: ["power", "clutch", "captain"],
    media: mlbCardMedia({ slug: "aaron-judge", personId: "592450", athlete: "Aaron Judge", dominantColor: "#19e7ff" }),
    baseCard: {
      sealedCardId: "rsc_mlb_judge_0001",
      basisHash: "7f3a9b21c4184c9b8f2e16cf81d51d826f97c2e4d7c13d4a56b9323efc0a1821",
      issueLine: "MLB Founding Slate - Power Core",
      athleteId: "aaron-judge",
      sport: "baseball",
    },
    historyCount: 14,
  },
  {
    id: "mlb-card-shohei-ohtani",
    athlete: "S. Ohtani",
    team: "Los Angeles",
    teamCode: "LAD",
    opponentCode: "NYY",
    position: "DH",
    side: "batter",
    rating: 98,
    tier: "Mythic",
    accent: "cyan",
    projectedScore: 9.8,
    currentScore: 0,
    statLine: "0-3, 2 K",
    liveLine: "HR watch",
    tags: ["two-way", "mythic", "exit velo"],
    media: mlbCardMedia({ slug: "shohei-ohtani", personId: "660271", athlete: "Shohei Ohtani", dominantColor: "#19e7ff" }),
    baseCard: {
      sealedCardId: "rsc_mlb_ohtani_0001",
      basisHash: "3c8bb7d11f6b4ec2a19d5ab3fae6e6930ef2f0ff3da17ba936ad477d67017d11",
      issueLine: "MLB Founding Slate - Mythic Core",
      athleteId: "shohei-ohtani",
      sport: "baseball",
    },
    historyCount: 22,
  },
  {
    id: "mlb-card-austin-riley",
    athlete: "A. Riley",
    team: "Atlanta",
    teamCode: "ATL",
    opponentCode: "PHI",
    position: "3B",
    side: "batter",
    rating: 95,
    tier: "Gold",
    accent: "red",
    projectedScore: 8.6,
    currentScore: 0,
    statLine: "1-2, RBI",
    liveLine: "RBI chance",
    tags: ["corner", "RBI", "hot zone"],
    media: mlbCardMedia({ slug: "austin-riley", personId: "663586", athlete: "Austin Riley", dominantColor: "#ff4f4f" }),
    baseCard: {
      sealedCardId: "rsc_mlb_riley_0001",
      basisHash: "b1279c34d39a40e7b7a691960c9506f98449bba7737ab0112ff162eea668914f",
      issueLine: "MLB Founding Slate - Corner Power",
      athleteId: "austin-riley",
      sport: "baseball",
    },
    historyCount: 9,
  },
  {
    id: "mlb-card-yordan-alvarez",
    athlete: "Y. Alvarez",
    team: "Houston",
    teamCode: "HOU",
    opponentCode: "TEX",
    position: "LF",
    side: "batter",
    rating: 94,
    tier: "Gold",
    accent: "amber",
    projectedScore: 8.1,
    currentScore: 0,
    statLine: "1-3, 1B",
    liveLine: "Barrel threat",
    tags: ["barrel", "lefty", "late inning"],
    media: mlbCardMedia({ slug: "yordan-alvarez", personId: "670541", athlete: "Yordan Alvarez", dominantColor: "#ffc247" }),
    baseCard: {
      sealedCardId: "rsc_mlb_alvarez_0001",
      basisHash: "a12d733c8e91bd5526fd42a1b984c02290ffad3245164779d496ad3abf2e6a09",
      issueLine: "MLB Founding Slate - Barrel Core",
      athleteId: "yordan-alvarez",
      sport: "baseball",
    },
    historyCount: 11,
  },
  {
    id: "mlb-card-fernando-tatis",
    athlete: "F. Tatis Jr.",
    team: "San Diego",
    teamCode: "SD",
    opponentCode: "SF",
    position: "SS",
    side: "batter",
    rating: 93,
    tier: "Rare",
    accent: "amber",
    projectedScore: 7.3,
    currentScore: 0,
    statLine: "1-4, SB",
    liveLine: "Speed scar armed",
    tags: ["speed", "style", "steal"],
    media: mlbCardMedia({ slug: "fernando-tatis-jr", personId: "665487", athlete: "Fernando Tatis Jr.", dominantColor: "#ffc247" }),
    baseCard: {
      sealedCardId: "rsc_mlb_tatis_0001",
      basisHash: "91f1886445744fdf9e1612904f4706ff9d804618f2ea0d55f783c61fb6618e21",
      issueLine: "MLB Founding Slate - Speed Core",
      athleteId: "fernando-tatis-jr",
      sport: "baseball",
    },
    historyCount: 7,
  },
  {
    id: "mlb-card-bobby-witt",
    athlete: "B. Witt Jr.",
    team: "Kansas City",
    teamCode: "KC",
    opponentCode: "CLE",
    position: "SS",
    side: "batter",
    rating: 92,
    tier: "Rare",
    accent: "green",
    projectedScore: 7.1,
    currentScore: 0,
    statLine: "1-2, 2B",
    liveLine: "Extra-base run",
    tags: ["speed", "extra base", "young star"],
    media: mlbCardMedia({ slug: "bobby-witt-jr", personId: "677951", athlete: "Bobby Witt Jr.", dominantColor: "#39d077" }),
    baseCard: {
      sealedCardId: "rsc_mlb_witt_0001",
      basisHash: "f05b9fb66f6879ec74479bf2adf84ee6a0f8c4af4eb81c6f18c508c6b81ed22a",
      issueLine: "MLB Founding Slate - Future Core",
      athleteId: "bobby-witt-jr",
      sport: "baseball",
    },
    historyCount: 6,
  },
  {
    id: "mlb-card-tarik-skubal",
    athlete: "T. Skubal",
    team: "Detroit",
    teamCode: "DET",
    opponentCode: "MIN",
    position: "SP",
    side: "pitcher",
    rating: 91,
    tier: "Rare",
    accent: "steel",
    projectedScore: 7.0,
    currentScore: 0,
    statLine: "6 IP, 8 K",
    liveLine: "Quality start path",
    tags: ["pitcher", "strikeout", "command"],
    media: mlbCardMedia({ slug: "tarik-skubal", personId: "669373", athlete: "Tarik Skubal", dominantColor: "#b7c6d5" }),
    baseCard: {
      sealedCardId: "rsc_mlb_skubal_0001",
      basisHash: "6c46c5c9d645c4aa3b6ef953e39c6715d253533790c1d155c16d677cbccdc961",
      issueLine: "MLB Founding Slate - Ace Core",
      athleteId: "tarik-skubal",
      sport: "baseball",
    },
    historyCount: 8,
  },
  {
    id: "mlb-card-adley-rutschman",
    athlete: "A. Rutschman",
    team: "Baltimore",
    teamCode: "BAL",
    opponentCode: "TOR",
    position: "C",
    side: "batter",
    rating: 90,
    tier: "Rare",
    accent: "amber",
    projectedScore: 6.6,
    currentScore: 0,
    statLine: "Switch bat, OBP lane",
    liveLine: "Catcher stack",
    tags: ["catcher", "switch", "on base"],
    media: mlbCardMedia({ slug: "adley-rutschman", personId: "668939", athlete: "Adley Rutschman", dominantColor: "#ffc247" }),
    baseCard: {
      sealedCardId: "rsc_mlb_rutschman_0001",
      basisHash: "c884af0f85b4447391a8ab88a7bbaec216be8b095ce27be3d42a7d4fd65542f0",
      issueLine: "MLB Founding Slate - Catcher Core",
      athleteId: "adley-rutschman",
      sport: "baseball",
    },
    historyCount: 5,
  },
  {
    id: "mlb-card-freddie-freeman",
    athlete: "F. Freeman",
    team: "Los Angeles",
    teamCode: "LAD",
    opponentCode: "NYY",
    position: "1B",
    side: "batter",
    rating: 94,
    tier: "Gold",
    accent: "cyan",
    projectedScore: 7.8,
    currentScore: 0,
    statLine: "Contact, doubles path",
    liveLine: "XBH pressure",
    tags: ["first base", "contact", "double"],
    media: mlbCardMedia({ slug: "freddie-freeman", personId: "518692", athlete: "Freddie Freeman", dominantColor: "#19e7ff" }),
    baseCard: {
      sealedCardId: "rsc_mlb_freeman_0001",
      basisHash: "f06ec7ce68a24c5797026f9094a5bce8192f9b1f2d1ee6eb7b4bbdc1f8847fa1",
      issueLine: "MLB Founding Slate - First Base Core",
      athleteId: "freddie-freeman",
      sport: "baseball",
    },
    historyCount: 12,
  },
  {
    id: "mlb-card-marcus-semien",
    athlete: "M. Semien",
    team: "Texas",
    teamCode: "TEX",
    opponentCode: "HOU",
    position: "2B",
    side: "batter",
    rating: 88,
    tier: "Common",
    accent: "green",
    projectedScore: 5.9,
    currentScore: 0,
    statLine: "Runs, plate volume",
    liveLine: "Leadoff rhythm",
    tags: ["second base", "runs", "volume"],
    media: mlbCardMedia({ slug: "marcus-semien", personId: "543760", athlete: "Marcus Semien", dominantColor: "#39d077" }),
    baseCard: {
      sealedCardId: "rsc_mlb_semien_0001",
      basisHash: "d586ce07d2e44a3e9d5e658bec1dfd6c26ef82e438a8a7f41edfa1d91e98ea59",
      issueLine: "MLB Founding Slate - Second Base Core",
      athleteId: "marcus-semien",
      sport: "baseball",
    },
    historyCount: 4,
  },
  {
    id: "mlb-card-jose-ramirez",
    athlete: "J. Ramirez",
    team: "Cleveland",
    teamCode: "CLE",
    opponentCode: "KC",
    position: "3B",
    side: "batter",
    rating: 96,
    tier: "Champion",
    accent: "red",
    projectedScore: 8.9,
    currentScore: 0,
    statLine: "Power-speed hybrid",
    liveLine: "Switch threat",
    tags: ["third base", "power", "steal"],
    media: mlbCardMedia({ slug: "jose-ramirez", personId: "608070", athlete: "Jose Ramirez", dominantColor: "#ff4f4f" }),
    baseCard: {
      sealedCardId: "rsc_mlb_jram_0001",
      basisHash: "62a858f31f3e48409dbf0f7914f5ac35b1d021dcdff718d0d6953698e7655d13",
      issueLine: "MLB Founding Slate - Switch Power Core",
      athleteId: "jose-ramirez",
      sport: "baseball",
    },
    historyCount: 13,
  },
  {
    id: "mlb-card-elly-de-la-cruz",
    athlete: "E. De La Cruz",
    team: "Cincinnati",
    teamCode: "CIN",
    opponentCode: "CHC",
    position: "SS",
    side: "batter",
    rating: 91,
    tier: "Rare",
    accent: "green",
    projectedScore: 7.5,
    currentScore: 0,
    statLine: "SB, triple, chaos",
    liveLine: "Speed market",
    tags: ["shortstop", "speed", "triple"],
    media: mlbCardMedia({ slug: "elly-de-la-cruz", personId: "682829", athlete: "Elly De La Cruz", dominantColor: "#39d077" }),
    baseCard: {
      sealedCardId: "rsc_mlb_elly_0001",
      basisHash: "bcfd438aa83c4a43b7c2ed4a8680c18df676c63f30a522d5e1af76c8cc6b7398",
      issueLine: "MLB Founding Slate - Speed Future Core",
      athleteId: "elly-de-la-cruz",
      sport: "baseball",
    },
    historyCount: 6,
  },
  {
    id: "mlb-card-ronald-acuna",
    athlete: "R. Acuna Jr.",
    team: "Atlanta",
    teamCode: "ATL",
    opponentCode: "PHI",
    position: "RF",
    side: "batter",
    rating: 97,
    tier: "Champion",
    accent: "amber",
    projectedScore: 9.2,
    currentScore: 0,
    statLine: "HR/SB ceiling",
    liveLine: "Five-tool path",
    tags: ["outfield", "power", "steal"],
    media: mlbCardMedia({ slug: "ronald-acuna-jr", personId: "660670", athlete: "Ronald Acuna Jr.", dominantColor: "#ffc247" }),
    baseCard: {
      sealedCardId: "rsc_mlb_acuna_0001",
      basisHash: "5d9e609f25e24a0f9f3a824fbb7072dc498efb8b18f242e3a22de17efe7ca7de",
      issueLine: "MLB Founding Slate - Five Tool Core",
      athleteId: "ronald-acuna-jr",
      sport: "baseball",
    },
    historyCount: 16,
  },
  {
    id: "mlb-card-juan-soto",
    athlete: "J. Soto",
    team: "New York",
    teamCode: "NYM",
    opponentCode: "ATL",
    position: "LF",
    side: "batter",
    rating: 97,
    tier: "Champion",
    accent: "cyan",
    projectedScore: 8.8,
    currentScore: 0,
    statLine: "Walks, power, RBI",
    liveLine: "OBP engine",
    tags: ["outfield", "walk", "power"],
    media: mlbCardMedia({ slug: "juan-soto", personId: "665742", athlete: "Juan Soto", dominantColor: "#19e7ff" }),
    baseCard: {
      sealedCardId: "rsc_mlb_soto_0001",
      basisHash: "8f0e3e98bfb94b5087ce0d903d2ed109f8bb2d45f48e4d7c9c218dfb7db35211",
      issueLine: "MLB Founding Slate - OBP Core",
      athleteId: "juan-soto",
      sport: "baseball",
    },
    historyCount: 18,
  },
  {
    id: "mlb-card-julio-rodriguez",
    athlete: "J. Rodriguez",
    team: "Seattle",
    teamCode: "SEA",
    opponentCode: "OAK",
    position: "CF",
    side: "batter",
    rating: 92,
    tier: "Rare",
    accent: "steel",
    projectedScore: 7.2,
    currentScore: 0,
    statLine: "CF power-speed",
    liveLine: "Run maker",
    tags: ["center field", "power", "steal"],
    media: mlbCardMedia({ slug: "julio-rodriguez", personId: "677594", athlete: "Julio Rodriguez", dominantColor: "#b7c6d5" }),
    baseCard: {
      sealedCardId: "rsc_mlb_julio_0001",
      basisHash: "c5a7c0a390604f5da938294b31134392ac77e38531cb0197e28fbdabf26c97a1",
      issueLine: "MLB Founding Slate - Center Field Core",
      athleteId: "julio-rodriguez",
      sport: "baseball",
    },
    historyCount: 7,
  },
  {
    id: "mlb-card-corbin-carroll",
    athlete: "C. Carroll",
    team: "Arizona",
    teamCode: "ARI",
    opponentCode: "COL",
    position: "CF",
    side: "batter",
    rating: 89,
    tier: "Common",
    accent: "green",
    projectedScore: 6.4,
    currentScore: 0,
    statLine: "SB and gap hits",
    liveLine: "Speed lane",
    tags: ["center field", "speed", "gap"],
    media: mlbCardMedia({ slug: "corbin-carroll", personId: "682998", athlete: "Corbin Carroll", dominantColor: "#39d077" }),
    baseCard: {
      sealedCardId: "rsc_mlb_carroll_0001",
      basisHash: "251c5c41de264ecdb51c996c693095fe4a66c07337b847438b6d0e90a77b0112",
      issueLine: "MLB Founding Slate - Outfield Speed Core",
      athleteId: "corbin-carroll",
      sport: "baseball",
    },
    historyCount: 3,
  },
  {
    id: "mlb-card-gerrit-cole",
    athlete: "G. Cole",
    team: "New York",
    teamCode: "NYY",
    opponentCode: "LAD",
    position: "SP",
    side: "pitcher",
    rating: 95,
    tier: "Gold",
    accent: "steel",
    projectedScore: 8.4,
    currentScore: 0,
    statLine: "K volume, QS path",
    liveLine: "Ace meter",
    tags: ["starter", "strikeout", "quality start"],
    media: mlbCardMedia({ slug: "gerrit-cole", personId: "543037", athlete: "Gerrit Cole", dominantColor: "#b7c6d5" }),
    baseCard: {
      sealedCardId: "rsc_mlb_cole_0001",
      basisHash: "7ca56934108848d68ab65758f93fc6cf8c104f4d81d3a405b0fa8b4f7e32b9d9",
      issueLine: "MLB Founding Slate - Ace Strikeout Core",
      athleteId: "gerrit-cole",
      sport: "baseball",
    },
    historyCount: 15,
  },
  {
    id: "mlb-card-paul-skenes",
    athlete: "P. Skenes",
    team: "Pittsburgh",
    teamCode: "PIT",
    opponentCode: "STL",
    position: "SP",
    side: "pitcher",
    rating: 93,
    tier: "Gold",
    accent: "amber",
    projectedScore: 8.0,
    currentScore: 0,
    statLine: "Velocity, K ceiling",
    liveLine: "Rookie ace",
    tags: ["starter", "velocity", "strikeout"],
    media: mlbCardMedia({ slug: "paul-skenes", personId: "694973", athlete: "Paul Skenes", dominantColor: "#ffc247" }),
    baseCard: {
      sealedCardId: "rsc_mlb_skenes_0001",
      basisHash: "889c9d70a23e473cb512963c9f8ebec68a2b34d472cf42ee8bdff52b96d21d51",
      issueLine: "MLB Founding Slate - Future Ace Core",
      athleteId: "paul-skenes",
      sport: "baseball",
    },
    historyCount: 8,
  },
  {
    id: "mlb-card-spencer-strider",
    athlete: "S. Strider",
    team: "Atlanta",
    teamCode: "ATL",
    opponentCode: "PHI",
    position: "SP",
    side: "pitcher",
    rating: 92,
    tier: "Rare",
    accent: "red",
    projectedScore: 7.7,
    currentScore: 0,
    statLine: "K rate card",
    liveLine: "Strikeout burst",
    tags: ["starter", "strikeout", "velocity"],
    media: mlbCardMedia({ slug: "spencer-strider", personId: "675911", athlete: "Spencer Strider", dominantColor: "#ff4f4f" }),
    baseCard: {
      sealedCardId: "rsc_mlb_strider_0001",
      basisHash: "99208b68bf864ac1bf0ddf4e3ebd46ac10a456129f744b3b829496f06b5c74cf",
      issueLine: "MLB Founding Slate - Strikeout Core",
      athleteId: "spencer-strider",
      sport: "baseball",
    },
    historyCount: 10,
  },
  {
    id: "mlb-card-zack-wheeler",
    athlete: "Z. Wheeler",
    team: "Philadelphia",
    teamCode: "PHI",
    opponentCode: "ATL",
    position: "SP",
    side: "pitcher",
    rating: 94,
    tier: "Gold",
    accent: "steel",
    projectedScore: 8.2,
    currentScore: 0,
    statLine: "Innings, K floor",
    liveLine: "QS anchor",
    tags: ["starter", "innings", "quality start"],
    media: mlbCardMedia({ slug: "zack-wheeler", personId: "554430", athlete: "Zack Wheeler", dominantColor: "#b7c6d5" }),
    baseCard: {
      sealedCardId: "rsc_mlb_wheeler_0001",
      basisHash: "d2e77c28929a4423918f953fca4a3223bde33cd5a7bd4e3c93b75a63bd2697e0",
      issueLine: "MLB Founding Slate - Workhorse Core",
      athleteId: "zack-wheeler",
      sport: "baseball",
    },
    historyCount: 12,
  },
  {
    id: "mlb-card-emmanuel-clase",
    athlete: "E. Clase",
    team: "Cleveland",
    teamCode: "CLE",
    opponentCode: "KC",
    position: "CP",
    side: "pitcher",
    rating: 91,
    tier: "Rare",
    accent: "green",
    projectedScore: 5.7,
    currentScore: 0,
    statLine: "Save path",
    liveLine: "9th inning lock",
    tags: ["closer", "save", "reliever"],
    media: mlbCardMedia({ slug: "emmanuel-clase", personId: "661403", athlete: "Emmanuel Clase", dominantColor: "#39d077" }),
    baseCard: {
      sealedCardId: "rsc_mlb_clase_0001",
      basisHash: "1b247fe579214e268c9a0f86da3385d40f77f88555924636abddf35135f3f20b",
      issueLine: "MLB Founding Slate - Closer Core",
      athleteId: "emmanuel-clase",
      sport: "baseball",
    },
    historyCount: 5,
  },
  {
    id: "mlb-card-josh-hader",
    athlete: "J. Hader",
    team: "Houston",
    teamCode: "HOU",
    opponentCode: "TEX",
    position: "RP",
    side: "pitcher",
    rating: 89,
    tier: "Common",
    accent: "cyan",
    projectedScore: 4.9,
    currentScore: 0,
    statLine: "Hold/save fork",
    liveLine: "Leverage arm",
    tags: ["reliever", "hold", "save"],
    media: mlbCardMedia({ slug: "josh-hader", personId: "623352", athlete: "Josh Hader", dominantColor: "#19e7ff" }),
    baseCard: {
      sealedCardId: "rsc_mlb_hader_0001",
      basisHash: "85c2a01d8cf5472bb4186ad9a053dd20c4d434c08a084d80801d812c0a28ca8c",
      issueLine: "MLB Founding Slate - Leverage Core",
      athleteId: "josh-hader",
      sport: "baseball",
    },
    historyCount: 6,
  },
];

const MLB_CARDS: SportsArenaCard[] = MLB_FOUNDING_SLATE_CARDS.map((card) => ({
  ...card,
  playerBio: card.playerBio ?? MLB_FOUNDING_SLATE_PLAYER_BIO_BY_PERSON_ID[card.media.sourceId] ?? null,
}));

const MLB_APPENDS: SportsArenaAppend[] = [
  {
    id: "mlb-append-enter-slate",
    cardId: "lineup",
    at: "9:31 PM",
    kind: "entry",
    label: "Entered MLB Arena",
    detail: "Five-card lineup locked for Tonight's Slate.",
    value: "5 cards",
    scoreDelta: 0,
    txid: "E19C...443B",
  },
  {
    id: "mlb-append-judge-hr",
    cardId: "mlb-card-aaron-judge",
    at: "9:41 PM",
    kind: "stat",
    label: "A. Judge",
    detail: "HR to deep RF, 412 ft, runner scored.",
    value: "HR",
    scoreDelta: 4.8,
    txid: "7F3A...9B21",
  },
  {
    id: "mlb-append-ohtani-k",
    cardId: "mlb-card-shohei-ohtani",
    at: "9:39 PM",
    kind: "stat",
    label: "S. Ohtani",
    detail: "Strikeout during live count pressure.",
    value: "K",
    scoreDelta: -0.6,
    txid: "3C8B...7D11",
  },
  {
    id: "mlb-append-alvarez-single",
    cardId: "mlb-card-yordan-alvarez",
    at: "9:37 PM",
    kind: "stat",
    label: "Y. Alvarez",
    detail: "Single through right side, live base state advances.",
    value: "1B",
    scoreDelta: 1.2,
    txid: "A12D...8E91",
  },
  {
    id: "mlb-append-rank",
    cardId: "lineup",
    at: "9:42 PM",
    kind: "rank",
    label: "Arena Rank",
    detail: "Lineup moved inside the live reward band.",
    value: "#18",
    scoreDelta: 0,
    txid: "B6E4...2CA0",
  },
  {
    id: "mlb-append-scar",
    cardId: "mlb-card-aaron-judge",
    at: "9:43 PM",
    kind: "scar",
    label: "Gold Scar",
    detail: "Power card qualified for a verified HR memory mark.",
    value: "Gold Scar",
    scoreDelta: 0,
    txid: "7D51...18F0",
  },
];

const WORLD_CUP_TEAM_CODE_ALIASES: Record<string, string> = {
  "Bosnia and Herzegovina": "BIH",
  "Cape Verde": "CPV",
  "Curacao": "CUW",
  "Curaçao": "CUW",
  "DR Congo": "COD",
  "Ivory Coast": "CIV",
  "Iran": "IRN",
  "IR Iran": "IRN",
  "South Korea": "KOR",
  "Turkiye": "TUR",
  "Türkiye": "TUR",
  USA: "USA",
};

const WORLD_CUP_TEAM_NAME_BY_CODE = new Map(WORLD_CUP_ROSTER_PLAYERS.map((player) => [player.teamCode, player.team]));
const WORLD_CUP_TEAM_CODE_BY_NAME = new Map(WORLD_CUP_ROSTER_PLAYERS.map((player) => [player.team, player.teamCode]));

function stableWorldCupHex(seed: string, length = 64): string {
  let state = 0x811c9dc5;
  let output = "";
  for (let round = 0; output.length < length; round += 1) {
    const value = `${seed}:${round}`;
    for (let index = 0; index < value.length; index += 1) {
      state ^= value.charCodeAt(index);
      state = Math.imul(state, 0x01000193) >>> 0;
    }
    output += state.toString(16).padStart(8, "0");
  }
  return output.slice(0, length);
}

function stableWorldCupNumber(seed: string, min: number, max: number): number {
  const span = Math.max(1, max - min + 1);
  const value = Number.parseInt(stableWorldCupHex(seed, 8), 16);
  return min + (value % span);
}

function worldCupSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "player";
}

function worldCupRating(player: WorldCupRosterPlayer): number {
  const starRatings: Record<string, number> = {
    "lionel messi": 99,
    "cristiano ronaldo": 98,
    "kylian mbappe": 98,
    "kevin de bruyne": 97,
    "jude bellingham": 97,
    "vinicius jr": 97,
    "erling haaland": 97,
    "harry kane": 96,
    "lamine yamal": 96,
    "julián alvarez": 95,
    "riyad mahrez": 94,
  };
  const key = player.athlete.toLowerCase();
  if (starRatings[key]) return starRatings[key];
  const base = player.position === "GK" ? 70 : player.position === "DF" ? 69 : player.position === "MF" ? 72 : 74;
  const teamLift = stableWorldCupNumber(player.teamCode, 0, 10);
  const playerLift = stableWorldCupNumber(`${player.teamCode}:${player.number}:${player.athlete}`, 0, 13);
  return Math.min(93, base + teamLift + playerLift);
}

function worldCupTier(rating: number): SportsArenaCardTier {
  if (rating >= 98) return "Mythic";
  if (rating >= 95) return "Champion";
  if (rating >= 90) return "Gold";
  if (rating >= 82) return "Rare";
  return "Common";
}

function worldCupAccent(player: WorldCupRosterPlayer): SportsArenaCard["accent"] {
  const accents: SportsArenaCard["accent"][] = ["green", "cyan", "amber", "red", "steel"];
  return accents[stableWorldCupNumber(`${player.teamCode}:${player.number}`, 0, accents.length - 1)] ?? "green";
}

function worldCupPositionLabel(position: WorldCupRosterPlayer["position"]): string {
  if (position === "GK") return "Goalkeeper";
  if (position === "DF") return "Defender";
  if (position === "MF") return "Midfielder";
  return "Forward";
}

function worldCupPlayerImageUrl(player: WorldCupRosterPlayer, slug: string): string {
  return `/api/game/sports/soccer/player-image/${encodeURIComponent(player.teamCode)}/${encodeURIComponent(String(player.number))}/${encodeURIComponent(slug)}`;
}

function worldCupPlayerMedia(player: WorldCupRosterPlayer, slug: string, dominantColor: string): SportsArenaCardMedia {
  const imageUrl = worldCupPlayerImageUrl(player, slug);
  return {
    deterministicAssetId: `sports.fifa_world_cup.player_media.${slug}.v1`,
    imageUrl,
    sourceUrl: imageUrl,
    alt: `${player.athlete} Receiz World Cup player card`,
    dominantColor,
    source: "fifa",
    sourceId: slug,
  };
}

function worldCupProjectedScore(rating: number, position: WorldCupRosterPlayer["position"]): number {
  const base = position === "GK" ? 4.4 : position === "DF" ? 4.8 : position === "MF" ? 5.3 : 5.7;
  return Number((base + ((rating - 70) / 100) * 8).toFixed(2));
}

function worldCupPlayerHeightLabel(heightCm: number | null): string {
  if (!heightCm || !Number.isFinite(heightCm)) return "";
  const totalInches = Math.round(heightCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}" / ${heightCm}cm`;
}

function worldCupCardFromRosterPlayer(player: WorldCupRosterPlayer): SportsArenaCard {
  const slug = `${player.teamCode.toLowerCase()}-${String(player.number).padStart(2, "0")}-${worldCupSlug(player.athlete)}`;
  const rating = worldCupRating(player);
  const accent = worldCupAccent(player);
  const basisSeed = `fifa-world-cup-26:${player.teamCode}:${player.number}:${player.officialName}:${player.dob}`;
  return {
    id: `fifa-card-${slug}`,
    athlete: player.athlete,
    team: player.team,
    teamCode: player.teamCode,
    opponentCode: "WC26",
    position: player.position,
    side: "player",
    rating,
    tier: worldCupTier(rating),
    accent,
    projectedScore: worldCupProjectedScore(rating, player.position),
    currentScore: 0,
    statLine: `#${player.number} ${worldCupPositionLabel(player.position)} · ${player.club}`,
    liveLine: `World Cup roster player · ${player.teamCode}`,
    tags: ["world-cup", "fifa", player.position.toLowerCase(), player.teamCode.toLowerCase()],
    playerBio: {
      jerseyNumber: String(player.number),
      birthDate: player.dob,
      height: worldCupPlayerHeightLabel(player.heightCm),
      club: player.club,
      rosterStatus: `${player.teamCode} World Cup roster`,
    },
    media: worldCupPlayerMedia(player, slug, accent === "amber" ? "#f6c64a" : accent === "cyan" ? "#22c7f0" : accent === "red" ? "#f04d59" : accent === "steel" ? "#9eb4c7" : "#19b86a"),
    baseCard: {
      sealedCardId: `rsc_fifa_${slug.replace(/-/g, "_")}`,
      basisHash: stableWorldCupHex(basisSeed),
      issueLine: `FIFA World Cup 26 - ${player.teamCode} roster #${player.number}`,
      athleteId: slug,
      sport: "soccer",
    },
    historyCount: stableWorldCupNumber(`${basisSeed}:history`, 1, 18),
  };
}

function compareWorldCupCards(left: SportsArenaCard, right: SportsArenaCard): number {
  const ratingDelta = right.rating - left.rating;
  if (ratingDelta) return ratingDelta;
  const teamDelta = left.teamCode.localeCompare(right.teamCode);
  if (teamDelta) return teamDelta;
  return left.athlete.localeCompare(right.athlete);
}

const WORLD_CUP_CARDS: SportsArenaCard[] = WORLD_CUP_ROSTER_PLAYERS
  .map(worldCupCardFromRosterPlayer)
  .sort(compareWorldCupCards);

function worldCupTeamForScheduleName(name: string): { code: string; name: string } {
  const trimmed = name.trim();
  const directCode = WORLD_CUP_TEAM_CODE_BY_NAME.get(trimmed) ?? WORLD_CUP_TEAM_CODE_ALIASES[trimmed];
  if (directCode) return { code: directCode, name: WORLD_CUP_TEAM_NAME_BY_CODE.get(directCode) ?? trimmed };
  if (/^Winner\s+[A-L]$/i.test(trimmed)) return { code: `W${trimmed.slice(-1).toUpperCase()}`, name: trimmed };
  if (/^Runner-up\s+[A-L]$/i.test(trimmed)) return { code: `R${trimmed.slice(-1).toUpperCase()}`, name: trimmed };
  if (/^3rd\s+/i.test(trimmed)) return { code: "3RD", name: trimmed };
  return { code: worldCupSlug(trimmed).slice(0, 3).toUpperCase() || "TBD", name: trimmed };
}

function worldCupScheduleIso(row: WorldCupScheduleMatch): string {
  const date = row.date.match(/(Jun|Jul)\s+(\d+)/);
  const time = row.timeEt.match(/(\d{1,2}):(\d{2})\s+(AM|PM)/i);
  const month = date?.[1] === "Jul" ? 6 : 5;
  const day = Number(date?.[2] ?? 1);
  let hour = Number(time?.[1] ?? 12) % 12;
  if ((time?.[3] ?? "PM").toUpperCase() === "PM") hour += 12;
  const minute = Number(time?.[2] ?? 0);
  return new Date(Date.UTC(2026, month, day, hour + 4, minute)).toISOString();
}

function worldCupRoundLabel(row: WorldCupScheduleMatch): string {
  if (/Final/i.test(row.match)) return row.match;
  if (/Semifinal/i.test(row.match)) return row.match;
  if (/Quarterfinal/i.test(row.match)) return row.match;
  if (/Round of 16/i.test(row.match)) return row.match;
  if (/Winner|Runner-up|3rd/.test(row.match)) return "Round of 32";
  return "Group Stage";
}

function worldCupScoreboardFromSchedule(row: WorldCupScheduleMatch, index: number): SportsArenaScoreboard {
  const [awayName, homeName] = row.match.includes(" v ") ? row.match.split(" v ") : [row.match, "TBD"];
  const away = worldCupTeamForScheduleName(awayName);
  const home = worldCupTeamForScheduleName(homeName);
  const round = worldCupRoundLabel(row);
  return {
    id: `fifa-match-${String(index + 1).padStart(3, "0")}`,
    status: "pregame",
    gameDate: worldCupScheduleIso(row),
    startTimeLabel: row.date.replace(/^[^,]+,\s*/, ""),
    countdownLabel: row.timeEt,
    statusDetail: `FIFA World Cup 26 · ${row.match}`,
    venue: row.city,
    away: { code: away.code, name: away.name, score: 0 },
    home: { code: home.code, name: home.name, score: 0 },
    inning: round,
    count: row.timeEt,
    baseState: "empty",
    livePulse: `${round} proof armed`,
  };
}

const WORLD_CUP_SCOREBOARDS: SportsArenaScoreboard[] = WORLD_CUP_MATCH_SCHEDULE.map(worldCupScoreboardFromSchedule);

function firstWorldCupCardId(predicate: (card: SportsArenaCard) => boolean): string {
  return WORLD_CUP_CARDS.find(predicate)?.id ?? WORLD_CUP_CARDS[0]?.id ?? "lineup";
}

const WORLD_CUP_APPENDS: SportsArenaAppend[] = [
  {
    id: "fifa-append-world-cup-open",
    cardId: "lineup",
    at: "Jun 5",
    kind: "entry",
    label: "FIFA Arena Armed",
    detail: "Five-card lineup locked to the FIFA World Cup 26 proof path.",
    value: "5 cards",
    scoreDelta: 0,
    txid: "F26C...0001",
  },
  {
    id: "fifa-append-kickoff-witness",
    cardId: firstWorldCupCardId((card) => card.teamCode === "MEX"),
    at: "Jun 11",
    kind: "stat",
    label: "Opening Witness",
    detail: "Mexico City kickoff carries the first tournament proof window.",
    value: "Kickoff",
    scoreDelta: 2.6,
    txid: "F26C...0011",
  },
  {
    id: "fifa-append-goal-lane",
    cardId: firstWorldCupCardId((card) => card.position === "FW" && card.rating >= 94),
    at: "Group",
    kind: "stat",
    label: "Goal Lane",
    detail: "Goal, assist, shot-on-target, and xG memory append into the card.",
    value: "Goal",
    scoreDelta: 4.4,
    txid: "F26C...0026",
  },
  {
    id: "fifa-append-clean-sheet",
    cardId: firstWorldCupCardId((card) => card.position === "GK" && card.rating >= 88),
    at: "Group",
    kind: "stat",
    label: "Clean Sheet",
    detail: "Keeper save chain and team shutout proof stay attached.",
    value: "CS",
    scoreDelta: 3.8,
    txid: "F26C...0032",
  },
  {
    id: "fifa-append-final-path",
    cardId: firstWorldCupCardId((card) => card.rating >= 98),
    at: "Jul 19",
    kind: "rank",
    label: "Final Path",
    detail: "World Cup final settlement route remains visible before live appends arrive.",
    value: "Final",
    scoreDelta: 0,
    txid: "F26C...0719",
  },
];

export const BASEBALL_ARENA_SNAPSHOT: SportsArenaSnapshot = {
  schema: "receiz.sports_arena.snapshot.v1",
  sport: "baseball",
  route: "/game/sports/baseball",
  title: "MLB Arena",
  slateLabel: "Tonight's Slate",
  entryRule: "Tonight's MLB slate",
  lineupSize: 5,
  selectedCardIds: [
    "mlb-card-aaron-judge",
    "mlb-card-shohei-ohtani",
    "mlb-card-austin-riley",
    "mlb-card-yordan-alvarez",
    "mlb-card-fernando-tatis",
  ],
  categories: SPORTS_ARENA_CATEGORIES,
  scoreboards: MLB_SCOREBOARDS,
  field: {
    status: "live",
    gamePk: "mlb-nyy-lad",
    venue: "Yankee Stadium",
    inning: "7th",
    scoreLine: "2-1",
    count: "2-1",
    pitch: "93 MPH",
    pitchType: "4-seam FB",
    baseState: "Runner on 2nd",
    baseStateKey: "runner-on-2nd",
    lastPlay: "Judge homers to deep RF.",
    livePlayers: [],
  },
  cards: MLB_CARDS,
  proofTimeline: MLB_APPENDS,
  leaderboard: [
    { rank: 1, name: "Bronx Ledger", points: 41.8, state: "hot" },
    { rank: 2, name: "Slug Chain", points: 39.4, state: "sealed" },
    { rank: 3, name: "Diamond Proof", points: 37.9, state: "hot" },
    { rank: 18, name: "You", points: 28.4, state: "you" },
    { rank: 19, name: "Late Swap", points: 27.8, state: "sealed" },
  ],
  scoringRules: [
    {
      label: "Hits",
      value: "+1.2 / +2.4 / +4.8",
      detail: "1B +1.2, 2B +2.4, 3B +3.2, HR +4.8 base.",
    },
    {
      label: "Count",
      value: "2-strike +0.35",
      detail: "Two-strike hits add +0.35; full-count strikeouts move -0.25.",
    },
    {
      label: "Contact",
      value: "+0.10 to +0.75",
      detail: "Hard, barrel, and deep contact grade from +0.10 to +0.75.",
    },
    {
      label: "Leverage",
      value: "Late runners",
      detail: "Runners, two outs, and late innings move score.",
    },
    {
      label: "Pitch/Def",
      value: "K / out / field",
      detail: "Strikeouts, outs, allowed damage, and fielding all grade.",
    },
  ],
  reward: {
    label: "Sealed Reward Card",
    detail: "Top 20 lineups unlock one card with this slate stamped into its memory.",
    cardId: "rsc_mlb_reward_0510",
  },
  appendLaw: SPORTS_ARENA_APPEND_LAW,
};

export const WORLD_CUP_ARENA_SNAPSHOT: SportsArenaSnapshot = {
  schema: "receiz.sports_arena.snapshot.v1",
  sport: "soccer",
  route: "/game/sports/soccer",
  title: "FIFA Arena",
  slateLabel: "FIFA World Cup 26",
  entryRule: "World Cup matchday slate",
  lineupSize: 5,
  selectedCardIds: WORLD_CUP_CARDS.slice(0, 5).map((card) => card.id),
  categories: SPORTS_ARENA_CATEGORIES,
  scoreboards: WORLD_CUP_SCOREBOARDS,
  field: {
    status: "pregame",
    gamePk: "fifa-mexico-city-opener",
    venue: "Mexico City Stadium",
    inning: "Pregame",
    scoreLine: "0-0",
    count: "Kickoff Jun 11",
    pitch: "Match ball",
    pitchType: "World Cup",
    baseState: "Opening ceremony path",
    baseStateKey: "empty",
    lastPlay: "FIFA World Cup 26 opens June 11, 2026.",
    playByPlay: "Opening match proof arms the FIFA Arena before live appends arrive.",
    livePlayers: [],
  },
  cards: WORLD_CUP_CARDS,
  proofTimeline: WORLD_CUP_APPENDS,
  leaderboard: [
    { rank: 1, name: WORLD_CUP_CARDS[0]?.athlete ?? "World Cup Leader", points: 39.6, state: "hot" },
    { rank: 2, name: WORLD_CUP_CARDS[1]?.athlete ?? "World Cup Leader", points: 37.8, state: "sealed" },
    { rank: 3, name: WORLD_CUP_CARDS[2]?.athlete ?? "World Cup Leader", points: 35.9, state: "hot" },
    { rank: 18, name: "You", points: 26.8, state: "you" },
    { rank: 19, name: "Final Path", points: 26.1, state: "sealed" },
  ],
  scoringRules: [
    {
      label: "Goal",
      value: "+4.4",
      detail: "Goals carry the highest base value, with knockout and stoppage-time weight.",
    },
    {
      label: "Assist",
      value: "+2.0",
      detail: "Assists, key passes, and chance creation append playmaking proof.",
    },
    {
      label: "Shot",
      value: "+0.3 to +1.4",
      detail: "Shots on target, xG pressure, and box entries move the card.",
    },
    {
      label: "Keeper",
      value: "Save / clean sheet",
      detail: "Saves, penalties stopped, and clean sheet results carry defensive proof.",
    },
    {
      label: "Stage",
      value: "Group to final",
      detail: "Knockout, extra time, penalty, and final moments add stage weight.",
    },
  ],
  reward: {
    label: "World Cup Seal Card",
    detail: "Top lineups unlock a card with tournament matchday proof stamped into memory.",
    cardId: "rsc_fifa_reward_2026",
  },
  appendLaw: SPORTS_ARENA_APPEND_LAW,
};

const UFC_FIGHTER_IMAGE_SOURCE_URLS: Record<string, string> = {
  "belal-muhammad": "https://ufc.com/images/2026-06/MUHAMMAD_BELAL_06-06.png",
  "gabriel-bonfim": "https://ufc.com/images/2026-06/BONFIM_GABRIEL_06-06.png",
  "brendan-allen": "https://ufc.com/images/2026-06/ALLEN_BRENDAN_06-06.png",
  "edmen-shahbazyan": "https://ufc.com/images/2026-06/SHAHBAZYAN_EDMEN_06-06.png",
  "fares-ziam": "https://ufc.com/images/2026-06/ZIAM_FARES_06-06.png",
  "tom-nolan": "https://ufc.com/images/2026-06/NOLAN_TOM_06-06.png",
  "bryce-mitchell": "https://ufc.com/images/2026-06/MITCHELL_BRYCE_06-06.png",
  "santiago-luna": "https://ufc.com/images/2026-06/LUNA_SANTIAGO_06-06.png",
  "iwo-baraniewski": "https://ufc.com/images/2026-06/BARANIEWSKI_IWO_06-06.png",
  "junior-tafa": "https://ufc.com/images/2026-06/TAFA_JUNIOR_06-06.png",
  "matt-schnell": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/SCHNELL_MATT_L_06-06.png?itok=Ffp0ybf4",
  "alessandro-costa": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/COSTA_ALESSANDRO_R_06-06.png?itok=g0_IUoON",
  "marcus-mcghee": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/MCGHEE_MARCUS_L_06-06.png?itok=d4PF3uHN",
  "john-yannis": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/YANNIS_JOHN_R_06-06.png?itok=r6s7g390",
  "bruno-silva": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/SILVA_BRUNO_L_06-06.png?itok=2wxiObws",
  "edgar-chairez": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CHAIREZ_EDGAR_R_06-06.png?itok=kdyBFMwe",
  "priscila-cachoeira": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CACHOEIRA_PRISCILA_L_06-06.png?itok=n2K499fu",
  "chelsea-chandler": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CHANDLER_CHELSEA_R_06-06.png?itok=fSBtF7BM",
  "jordan-leavitt": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/LEAVITT_JORDAN_L_06-06.png?itok=me-D3RUM",
  "joanderson-brito": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/BRITO_JOANDERSON_R_06-06.png?itok=JLUMYI6Q",
  "jeisla-chaves": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CHAVES_JEISLA_L_06-06.png?itok=u_Mr9ky3",
  "yuneisy-duben": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/DUBEN_YUNEISY_R_06-06.png?itok=WH0tdeF5",
  "ketlen-souza": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/SOUZA_KETLEN_L_06-06.png?itok=12_mLtiV",
  "ariane-carnelossi": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CARNELOSSI_ARIANE_R_06-06.png?itok=SdU86Shl",
};

export function sportsArenaUfcImageSourceUrl(slug: string): string | null {
  const clean = slug.trim().toLowerCase();
  return FIGHT_ARENA_DYNAMIC_IMAGE_SOURCE_URLS[clean] ?? UFC_FIGHTER_IMAGE_SOURCE_URLS[clean] ?? null;
}

function ufcFighterImageUrl(slug: string): string {
  return `/api/game/sports/fight/fighter-image/${encodeURIComponent(slug)}`;
}

function ufcCardMedia(args: {
  slug: string;
  athlete: string;
  imageUrl: string;
  dominantColor: string;
}): SportsArenaCardMedia {
  return {
    deterministicAssetId: `sports.ufc.card_media.${args.slug}.v1`,
    imageUrl: ufcFighterImageUrl(args.slug),
    sourceUrl: args.imageUrl,
    alt: `${args.athlete} Receiz UFC Fighter Card portrait`,
    dominantColor: args.dominantColor,
    source: "ufc",
    sourceId: args.slug,
  };
}

const FIGHT_ARENA_APPEND_LAW =
  `${SPORTS_ARENA_APPEND_LAW} UFC Fighter Cards are opened through sealed fight-card packs. A separate UFC Fight Pick 5 Main Event settlement proof object locks five owned fighters from active fights, blocks opponent collisions, scores every fight event, every fight event appends as a proof object, and appends event memory, proof clips, win/loss state, and linked Victory Card witness material to the owned Fighter Cards.`;

const FIGHT_CARDS: SportsArenaCard[] = [
  {
    id: "ufc-card-belal-muhammad",
    athlete: "B. Muhammad",
    team: "Welterweight",
    teamCode: "MUH",
    opponentCode: "BON",
    position: "WW",
    side: "player",
    rating: 94,
    tier: "Champion",
    accent: "cyan",
    projectedScore: 8.9,
    currentScore: 0,
    statLine: "Former champion pressure",
    liveLine: "Main event ownership lane",
    tags: ["welterweight", "main event", "control"],
    media: ufcCardMedia({
      slug: "belal-muhammad",
      athlete: "Belal Muhammad",
      imageUrl: "https://ufc.com/images/2026-06/MUHAMMAD_BELAL_06-06.png",
      dominantColor: "#19e7ff",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_belal_muhammad_0001",
      basisHash: "f087657e631e8fbed664e14fb5e96d129ccda20b546d69ede1e1cbd522bee0a1",
      issueLine: "UFC Fight Night 2026-06-06 - Main Event Core",
      athleteId: "belal-muhammad",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-gabriel-bonfim",
    athlete: "G. Bonfim",
    team: "Welterweight",
    teamCode: "BON",
    opponentCode: "MUH",
    position: "WW",
    side: "player",
    rating: 92,
    tier: "Gold",
    accent: "green",
    projectedScore: 8.7,
    currentScore: 0,
    statLine: "Submission threat lane",
    liveLine: "Main event upset lane",
    tags: ["welterweight", "main event", "submission"],
    media: ufcCardMedia({
      slug: "gabriel-bonfim",
      athlete: "Gabriel Bonfim",
      imageUrl: "https://ufc.com/images/2026-06/BONFIM_GABRIEL_06-06.png",
      dominantColor: "#39d077",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_gabriel_bonfim_0001",
      basisHash: "7721d3757406cd21c363c988fadf33c677c35d03cf9d29f94afa3cc22d37c5cd",
      issueLine: "UFC Fight Night 2026-06-06 - Main Event Core",
      athleteId: "gabriel-bonfim",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-brendan-allen",
    athlete: "B. Allen",
    team: "Middleweight",
    teamCode: "ALL",
    opponentCode: "SHA",
    position: "MW",
    side: "player",
    rating: 90,
    tier: "Gold",
    accent: "amber",
    projectedScore: 8.3,
    currentScore: 0,
    statLine: "Ranked middleweight lane",
    liveLine: "Co-feature fight pick",
    tags: ["middleweight", "ranked", "grappling"],
    media: ufcCardMedia({
      slug: "brendan-allen",
      athlete: "Brendan Allen",
      imageUrl: "https://ufc.com/images/2026-06/ALLEN_BRENDAN_06-06.png",
      dominantColor: "#ffc247",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_brendan_allen_0001",
      basisHash: "a51191fcdb83e9ec3af88e7db190479f4b1854c4ceb84d59bc092cc09120e94f",
      issueLine: "UFC Fight Night 2026-06-06 - Main Card Core",
      athleteId: "brendan-allen",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-edmen-shahbazyan",
    athlete: "E. Shahbazyan",
    team: "Middleweight",
    teamCode: "SHA",
    opponentCode: "ALL",
    position: "MW",
    side: "player",
    rating: 87,
    tier: "Rare",
    accent: "red",
    projectedScore: 7.8,
    currentScore: 0,
    statLine: "Power rebound lane",
    liveLine: "Middleweight proof swing",
    tags: ["middleweight", "striker", "finish"],
    media: ufcCardMedia({
      slug: "edmen-shahbazyan",
      athlete: "Edmen Shahbazyan",
      imageUrl: "https://ufc.com/images/2026-06/SHAHBAZYAN_EDMEN_06-06.png",
      dominantColor: "#ff4f4f",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_edmen_shahbazyan_0001",
      basisHash: "0ddc89b09675e36341a5e2feed3984be9717452617d8e9be16812d60036c592f",
      issueLine: "UFC Fight Night 2026-06-06 - Main Card Core",
      athleteId: "edmen-shahbazyan",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-fares-ziam",
    athlete: "F. Ziam",
    team: "Lightweight",
    teamCode: "ZIA",
    opponentCode: "NOL",
    position: "LW",
    side: "player",
    rating: 88,
    tier: "Gold",
    accent: "cyan",
    projectedScore: 8.1,
    currentScore: 0,
    statLine: "Lightweight range lane",
    liveLine: "Main card value lane",
    tags: ["lightweight", "range", "main card"],
    media: ufcCardMedia({
      slug: "fares-ziam",
      athlete: "Fares Ziam",
      imageUrl: "https://ufc.com/images/2026-06/ZIAM_FARES_06-06.png",
      dominantColor: "#19e7ff",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_fares_ziam_0001",
      basisHash: "de487091dca525a86184ff1d4c2214f796e3ee98e0ec40daceb07aedcdde2c57",
      issueLine: "UFC Fight Night 2026-06-06 - Main Card Core",
      athleteId: "fares-ziam",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-tom-nolan",
    athlete: "T. Nolan",
    team: "Lightweight",
    teamCode: "NOL",
    opponentCode: "ZIA",
    position: "LW",
    side: "player",
    rating: 84,
    tier: "Rare",
    accent: "steel",
    projectedScore: 7.4,
    currentScore: 0,
    statLine: "Prospect finish lane",
    liveLine: "Lightweight upset proof",
    tags: ["lightweight", "prospect", "finish"],
    media: ufcCardMedia({
      slug: "tom-nolan",
      athlete: "Tom Nolan",
      imageUrl: "https://ufc.com/images/2026-06/NOLAN_TOM_06-06.png",
      dominantColor: "#b7c6d5",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_tom_nolan_0001",
      basisHash: "d08ab17e9d3657601aa3c02259a9eaa5994eb0cea9cd75bd6b82d3b70f6e4f62",
      issueLine: "UFC Fight Night 2026-06-06 - Main Card Core",
      athleteId: "tom-nolan",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-bryce-mitchell",
    athlete: "B. Mitchell",
    team: "Bantamweight",
    teamCode: "MIT",
    opponentCode: "LUN",
    position: "BW",
    side: "player",
    rating: 89,
    tier: "Gold",
    accent: "green",
    projectedScore: 8.2,
    currentScore: 0,
    statLine: "Grappling pressure lane",
    liveLine: "Bantamweight proof pressure",
    tags: ["bantamweight", "grappling", "pressure"],
    media: ufcCardMedia({
      slug: "bryce-mitchell",
      athlete: "Bryce Mitchell",
      imageUrl: "https://ufc.com/images/2026-06/MITCHELL_BRYCE_06-06.png",
      dominantColor: "#39d077",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_bryce_mitchell_0001",
      basisHash: "99a6f4484ce4b68e5a5394348dbf2bb720979181d8a207721bb7f8cc4a4622eb",
      issueLine: "UFC Fight Night 2026-06-06 - Main Card Core",
      athleteId: "bryce-mitchell",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-santiago-luna",
    athlete: "S. Luna",
    team: "Bantamweight",
    teamCode: "LUN",
    opponentCode: "MIT",
    position: "BW",
    side: "player",
    rating: 83,
    tier: "Rare",
    accent: "amber",
    projectedScore: 7.2,
    currentScore: 0,
    statLine: "Unbeaten momentum lane",
    liveLine: "Bantamweight prospect proof",
    tags: ["bantamweight", "unbeaten", "prospect"],
    media: ufcCardMedia({
      slug: "santiago-luna",
      athlete: "Santiago Luna",
      imageUrl: "https://ufc.com/images/2026-06/LUNA_SANTIAGO_06-06.png",
      dominantColor: "#ffc247",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_santiago_luna_0001",
      basisHash: "e34eb46999ea941727491b6896002ff2d5568b19e90045a62bcc99b3f832d963",
      issueLine: "UFC Fight Night 2026-06-06 - Main Card Core",
      athleteId: "santiago-luna",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-iwo-baraniewski",
    athlete: "I. Baraniewski",
    team: "Light Heavyweight",
    teamCode: "BAR",
    opponentCode: "TAF",
    position: "LHW",
    side: "player",
    rating: 82,
    tier: "Rare",
    accent: "red",
    projectedScore: 7.1,
    currentScore: 0,
    statLine: "Unbeaten light heavyweight lane",
    liveLine: "Opening main-card proof",
    tags: ["light heavyweight", "unbeaten", "power"],
    media: ufcCardMedia({
      slug: "iwo-baraniewski",
      athlete: "Iwo Baraniewski",
      imageUrl: "https://ufc.com/images/2026-06/BARANIEWSKI_IWO_06-06.png",
      dominantColor: "#ff4f4f",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_iwo_baraniewski_0001",
      basisHash: "11822dfeea9aaef194a16aa14840a1d20ad3e634bfedfc195531b1f16d80cf29",
      issueLine: "UFC Fight Night 2026-06-06 - Main Card Core",
      athleteId: "iwo-baraniewski",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-junior-tafa",
    athlete: "J. Tafa",
    team: "Light Heavyweight",
    teamCode: "TAF",
    opponentCode: "BAR",
    position: "LHW",
    side: "player",
    rating: 81,
    tier: "Rare",
    accent: "steel",
    projectedScore: 7.0,
    currentScore: 0,
    statLine: "Power counter lane",
    liveLine: "Opening main-card upset",
    tags: ["light heavyweight", "power", "counter"],
    media: ufcCardMedia({
      slug: "junior-tafa",
      athlete: "Junior Tafa",
      imageUrl: "https://ufc.com/images/2026-06/TAFA_JUNIOR_06-06.png",
      dominantColor: "#b7c6d5",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_junior_tafa_0001",
      basisHash: "22624d54752a04d366f86cb705412bfce26e6ebc7ee9b42af6cafb701aa6ab36",
      issueLine: "UFC Fight Night 2026-06-06 - Main Card Core",
      athleteId: "junior-tafa",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-matt-schnell",
    athlete: "M. Schnell",
    team: "Catchweight",
    teamCode: "SCH",
    opponentCode: "COS",
    position: "CW",
    side: "player",
    rating: 80,
    tier: "Rare",
    accent: "cyan",
    projectedScore: 6.9,
    currentScore: 0,
    statLine: "Catchweight veteran lane",
    liveLine: "Prelim proof pressure",
    tags: ["catchweight", "veteran", "prelim"],
    media: ufcCardMedia({
      slug: "matt-schnell",
      athlete: "Matt Schnell",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/SCHNELL_MATT_L_06-06.png?itok=Ffp0ybf4",
      dominantColor: "#19e7ff",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_matt_schnell_0001",
      basisHash: "51f737423d4096e186e78b34a92a67bb2bf4ecadb3d5ec4dfe51f72b71df16b4",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "matt-schnell",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-alessandro-costa",
    athlete: "A. Costa",
    team: "Catchweight",
    teamCode: "COS",
    opponentCode: "SCH",
    position: "CW",
    side: "player",
    rating: 81,
    tier: "Rare",
    accent: "green",
    projectedScore: 7.0,
    currentScore: 0,
    statLine: "Catchweight pace lane",
    liveLine: "Prelim value proof",
    tags: ["catchweight", "pace", "prelim"],
    media: ufcCardMedia({
      slug: "alessandro-costa",
      athlete: "Alessandro Costa",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/COSTA_ALESSANDRO_R_06-06.png?itok=g0_IUoON",
      dominantColor: "#39d077",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_alessandro_costa_0001",
      basisHash: "70baf09eb462c73e2fa7107541342a5391daa9669a18072e155fbe128c0e2053",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "alessandro-costa",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-marcus-mcghee",
    athlete: "M. McGhee",
    team: "Bantamweight",
    teamCode: "MCG",
    opponentCode: "YAN",
    position: "BW",
    side: "player",
    rating: 86,
    tier: "Rare",
    accent: "amber",
    projectedScore: 7.6,
    currentScore: 0,
    statLine: "Bantamweight finish lane",
    liveLine: "Prelim streak proof",
    tags: ["bantamweight", "finish", "prelim"],
    media: ufcCardMedia({
      slug: "marcus-mcghee",
      athlete: "Marcus McGhee",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/MCGHEE_MARCUS_L_06-06.png?itok=d4PF3uHN",
      dominantColor: "#ffc247",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_marcus_mcghee_0001",
      basisHash: "dc880706f3b9abb2ead83064af4c1a2bb39421b76507fae09586248adac1ec59",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "marcus-mcghee",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-john-yannis",
    athlete: "J. Yannis",
    team: "Bantamweight",
    teamCode: "YAN",
    opponentCode: "MCG",
    position: "BW",
    side: "player",
    rating: 78,
    tier: "Common",
    accent: "steel",
    projectedScore: 6.5,
    currentScore: 0,
    statLine: "Bantamweight debut lane",
    liveLine: "Prelim upset proof",
    tags: ["bantamweight", "debut", "prelim"],
    media: ufcCardMedia({
      slug: "john-yannis",
      athlete: "John Yannis",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/YANNIS_JOHN_R_06-06.png?itok=r6s7g390",
      dominantColor: "#b7c6d5",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_john_yannis_0001",
      basisHash: "5210d163e72f5fc550b7d98e4da8070f9889fe6405439516f2553446d233036e",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "john-yannis",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-bruno-silva",
    athlete: "B. Silva",
    team: "Flyweight",
    teamCode: "BSI",
    opponentCode: "ECH",
    position: "FLW",
    side: "player",
    rating: 84,
    tier: "Rare",
    accent: "red",
    projectedScore: 7.5,
    currentScore: 0,
    statLine: "Flyweight pressure lane",
    liveLine: "Prelim flyweight proof",
    tags: ["flyweight", "pressure", "prelim"],
    media: ufcCardMedia({
      slug: "bruno-silva",
      athlete: "Bruno Silva",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/SILVA_BRUNO_L_06-06.png?itok=2wxiObws",
      dominantColor: "#ff4f4f",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_bruno_silva_0001",
      basisHash: "e61e2eb8d4c416e623229381a3d4489950a38ff5bc538abc624a0cdab0e13d0f",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "bruno-silva",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-edgar-chairez",
    athlete: "E. Chairez",
    team: "Flyweight",
    teamCode: "ECH",
    opponentCode: "BSI",
    position: "FLW",
    side: "player",
    rating: 82,
    tier: "Rare",
    accent: "green",
    projectedScore: 7.1,
    currentScore: 0,
    statLine: "Flyweight scramble lane",
    liveLine: "Prelim submission proof",
    tags: ["flyweight", "submission", "prelim"],
    media: ufcCardMedia({
      slug: "edgar-chairez",
      athlete: "Edgar Chairez",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CHAIREZ_EDGAR_R_06-06.png?itok=kdyBFMwe",
      dominantColor: "#39d077",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_edgar_chairez_0001",
      basisHash: "55dc63446fec013c4326c8ab43f0b833c29f5edc25d0050e4985cc56a1fcecb7",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "edgar-chairez",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-priscila-cachoeira",
    athlete: "P. Cachoeira",
    team: "Women's Bantamweight",
    teamCode: "CAC",
    opponentCode: "CHN",
    position: "WBW",
    side: "player",
    rating: 79,
    tier: "Common",
    accent: "red",
    projectedScore: 6.8,
    currentScore: 0,
    statLine: "Women's bantamweight power lane",
    liveLine: "Prelim power proof",
    tags: ["women's bantamweight", "power", "prelim"],
    media: ufcCardMedia({
      slug: "priscila-cachoeira",
      athlete: "Priscila Cachoeira",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CACHOEIRA_PRISCILA_L_06-06.png?itok=n2K499fu",
      dominantColor: "#ff4f4f",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_priscila_cachoeira_0001",
      basisHash: "81b58eca834c2fa81d050cc9fc5d856fe60f7acb7b98a3e263a69ad8e6705f32",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "priscila-cachoeira",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-chelsea-chandler",
    athlete: "C. Chandler",
    team: "Women's Bantamweight",
    teamCode: "CHN",
    opponentCode: "CAC",
    position: "WBW",
    side: "player",
    rating: 80,
    tier: "Rare",
    accent: "cyan",
    projectedScore: 6.9,
    currentScore: 0,
    statLine: "Women's bantamweight control lane",
    liveLine: "Prelim control proof",
    tags: ["women's bantamweight", "control", "prelim"],
    media: ufcCardMedia({
      slug: "chelsea-chandler",
      athlete: "Chelsea Chandler",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CHANDLER_CHELSEA_R_06-06.png?itok=fSBtF7BM",
      dominantColor: "#19e7ff",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_chelsea_chandler_0001",
      basisHash: "4eaafc03b6f89465726ceae59772957b0447b09c751ac3af48e80f4ff96f3d91",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "chelsea-chandler",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-jordan-leavitt",
    athlete: "J. Leavitt",
    team: "Featherweight",
    teamCode: "LEA",
    opponentCode: "BRI",
    position: "FW",
    side: "player",
    rating: 80,
    tier: "Rare",
    accent: "amber",
    projectedScore: 6.9,
    currentScore: 0,
    statLine: "Featherweight grappling lane",
    liveLine: "Prelim grappling proof",
    tags: ["featherweight", "grappling", "prelim"],
    media: ufcCardMedia({
      slug: "jordan-leavitt",
      athlete: "Jordan Leavitt",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/LEAVITT_JORDAN_L_06-06.png?itok=me-D3RUM",
      dominantColor: "#ffc247",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_jordan_leavitt_0001",
      basisHash: "bc5a0018c6db887fcc913d9068c7eeed8f63845b111070e44051e015cb22ee4e",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "jordan-leavitt",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-joanderson-brito",
    athlete: "J. Brito",
    team: "Featherweight",
    teamCode: "BRI",
    opponentCode: "LEA",
    position: "FW",
    side: "player",
    rating: 84,
    tier: "Rare",
    accent: "green",
    projectedScore: 7.5,
    currentScore: 0,
    statLine: "Featherweight finish lane",
    liveLine: "Prelim finish proof",
    tags: ["featherweight", "finish", "prelim"],
    media: ufcCardMedia({
      slug: "joanderson-brito",
      athlete: "Joanderson Brito",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/BRITO_JOANDERSON_R_06-06.png?itok=JLUMYI6Q",
      dominantColor: "#39d077",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_joanderson_brito_0001",
      basisHash: "a2d76407d2409b8a5a4810b72b06b70c3c105bcda1107d3944c7e0ec0299d691",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "joanderson-brito",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-jeisla-chaves",
    athlete: "J. Chaves",
    team: "Women's Flyweight",
    teamCode: "JCH",
    opponentCode: "DUB",
    position: "WFLW",
    side: "player",
    rating: 77,
    tier: "Common",
    accent: "steel",
    projectedScore: 6.4,
    currentScore: 0,
    statLine: "Women's flyweight prospect lane",
    liveLine: "Prelim prospect proof",
    tags: ["women's flyweight", "prospect", "prelim"],
    media: ufcCardMedia({
      slug: "jeisla-chaves",
      athlete: "Jeisla Chaves",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CHAVES_JEISLA_L_06-06.png?itok=u_Mr9ky3",
      dominantColor: "#b7c6d5",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_jeisla_chaves_0001",
      basisHash: "d62db662825ecb0569757add2928cbcb2df8e0b6e174bbe8238d42d0f90b57de",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "jeisla-chaves",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-yuneisy-duben",
    athlete: "Y. Duben",
    team: "Women's Flyweight",
    teamCode: "DUB",
    opponentCode: "JCH",
    position: "WFLW",
    side: "player",
    rating: 76,
    tier: "Common",
    accent: "cyan",
    projectedScore: 6.3,
    currentScore: 0,
    statLine: "Women's flyweight debut lane",
    liveLine: "Prelim debut proof",
    tags: ["women's flyweight", "debut", "prelim"],
    media: ufcCardMedia({
      slug: "yuneisy-duben",
      athlete: "Yuneisy Duben",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/DUBEN_YUNEISY_R_06-06.png?itok=WH0tdeF5",
      dominantColor: "#19e7ff",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_yuneisy_duben_0001",
      basisHash: "179c3db63163b76e00c73819efcdf9aeb317b972ddd5bc266e625c5bcc685e81",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "yuneisy-duben",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-ketlen-souza",
    athlete: "K. Souza",
    team: "Women's Strawweight",
    teamCode: "SOU",
    opponentCode: "CAR",
    position: "WSW",
    side: "player",
    rating: 79,
    tier: "Common",
    accent: "green",
    projectedScore: 6.7,
    currentScore: 0,
    statLine: "Women's strawweight range lane",
    liveLine: "Opening prelim proof",
    tags: ["women's strawweight", "range", "prelim"],
    media: ufcCardMedia({
      slug: "ketlen-souza",
      athlete: "Ketlen Souza",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/SOUZA_KETLEN_L_06-06.png?itok=12_mLtiV",
      dominantColor: "#39d077",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_ketlen_souza_0001",
      basisHash: "29f2796dde05351253182556f9ed3f2def7a5f669f040b97c57fe904b801f6e2",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "ketlen-souza",
      sport: "fight",
    },
    historyCount: 0,
  },
  {
    id: "ufc-card-ariane-carnelossi",
    athlete: "A. Carnelossi",
    team: "Women's Strawweight",
    teamCode: "CAR",
    opponentCode: "SOU",
    position: "WSW",
    side: "player",
    rating: 78,
    tier: "Common",
    accent: "red",
    projectedScore: 6.6,
    currentScore: 0,
    statLine: "Women's strawweight pressure lane",
    liveLine: "Opening prelim counter",
    tags: ["women's strawweight", "pressure", "prelim"],
    media: ufcCardMedia({
      slug: "ariane-carnelossi",
      athlete: "Ariane Carnelossi",
      imageUrl: "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-06/CARNELOSSI_ARIANE_R_06-06.png?itok=SdU86Shl",
      dominantColor: "#ff4f4f",
    }),
    baseCard: {
      sealedCardId: "rsc_ufc_ariane_carnelossi_0001",
      basisHash: "c60430f2f72823c441a1a36a347028434f18a98487437863f7b0dbd372532d9d",
      issueLine: "UFC Fight Night 2026-06-06 - Official Event Core",
      athleteId: "ariane-carnelossi",
      sport: "fight",
    },
    historyCount: 0,
  },
];

type FightCloseoutSeed = {
  fightId: string;
  winnerSide: "away" | "home";
  method: string;
  round: number;
  clock: string;
  winnerAction: SportsArenaFightEventType;
  winnerActionValue: number;
  loserStrikeValue: number;
  controlSeconds: number;
};

type FightArenaFighterSeed = {
  slug: string;
  athlete: string;
  shortName: string;
  code: string;
  division: string;
  position: string;
  rating: number;
  tier: SportsArenaCardTier;
  accent: SportsArenaCard["accent"];
  projectedScore: number;
  statLine: string;
  liveLine: string;
  tags: string[];
  imageUrl?: string;
};

type FightArenaFightSeed = {
  id: string;
  gameDate: string;
  startTimeLabel: string;
  venue: string;
  inning: string;
  count: string;
  away: FightArenaFighterSeed;
  home: FightArenaFighterSeed;
  livePulse: string;
  statusDetail: string;
  closeout: Omit<FightCloseoutSeed, "fightId">;
};

type FightArenaSlateSeed = {
  sourceDate: string;
  slateLabel: string;
  selectedSlugs: string[];
  fights: FightArenaFightSeed[];
};

type FightArenaSlate = {
  sourceDate: string;
  slateLabel: string;
  cards: SportsArenaCard[];
  scoreboards: SportsArenaScoreboard[];
  closeoutSeeds: FightCloseoutSeed[];
  selectedCardIds: string[];
};

const LEGACY_FIGHT_ARENA_SOURCE_DATE = "2026-06-06";

const LEGACY_FIGHT_SCOREBOARDS: SportsArenaScoreboard[] = [
  {
    id: "ufc-muhammad-bonfim",
    status: "pregame",
    gameDate: "2026-06-07T01:48:00Z",
    startTimeLabel: "Main event",
    venue: "Meta APEX",
    away: { code: "MUH", name: "Belal Muhammad", score: 0 },
    home: { code: "BON", name: "Gabriel Bonfim", score: 0 },
    inning: "Main event",
    count: "Welterweight",
    baseState: "empty",
    livePulse: "Belal Muhammad vs Gabriel Bonfim headlines UFC Fight Night.",
    statusDetail: "Fight Pick proof object seals before Muhammad vs Bonfim lock",
  },
  {
    id: "ufc-allen-shahbazyan",
    status: "pregame",
    gameDate: "2026-06-07T01:21:00Z",
    startTimeLabel: "Co-feature",
    venue: "Meta APEX",
    away: { code: "ALL", name: "Brendan Allen", score: 0 },
    home: { code: "SHA", name: "Edmen Shahbazyan", score: 0 },
    inning: "Co-main",
    count: "Middleweight",
    baseState: "empty",
    livePulse: "Brendan Allen vs Edmen Shahbazyan carries the ranked middleweight swing.",
    statusDetail: "Owned Fighter Card carries the result history",
  },
  {
    id: "ufc-ziam-nolan",
    status: "pregame",
    gameDate: "2026-06-07T00:54:00Z",
    startTimeLabel: "Main card",
    venue: "Meta APEX",
    away: { code: "ZIA", name: "Fares Ziam", score: 0 },
    home: { code: "NOL", name: "Tom Nolan", score: 0 },
    inning: "Main card",
    count: "Lightweight",
    baseState: "empty",
    livePulse: "Fares Ziam vs Tom Nolan opens a lightweight Victory Card lane.",
    statusDetail: "Correct picks may issue a linked Victory Card proof object",
  },
  {
    id: "ufc-mitchell-luna",
    status: "pregame",
    gameDate: "2026-06-07T00:27:00Z",
    startTimeLabel: "Main card",
    venue: "Meta APEX",
    away: { code: "MIT", name: "Bryce Mitchell", score: 0 },
    home: { code: "LUN", name: "Santiago Luna", score: 0 },
    inning: "Main card",
    count: "Bantamweight",
    baseState: "empty",
    livePulse: "Bryce Mitchell vs Santiago Luna is a bantamweight proof swing.",
    statusDetail: "Fight Pick proof object binds the owned fighter before lock",
  },
  {
    id: "ufc-baraniewski-tafa",
    status: "pregame",
    gameDate: "2026-06-07T00:00:00Z",
    startTimeLabel: "Main card open",
    venue: "Meta APEX",
    away: { code: "BAR", name: "Iwo Baraniewski", score: 0 },
    home: { code: "TAF", name: "Junior Tafa", score: 0 },
    inning: "Main card",
    count: "Light heavyweight",
    baseState: "empty",
    livePulse: "Iwo Baraniewski vs Junior Tafa starts the main-card Fighter Card lane.",
    statusDetail: "Victory Card proof object issues only after correct result append",
  },
  {
    id: "ufc-schnell-costa",
    status: "pregame",
    gameDate: "2026-06-06T23:33:00Z",
    startTimeLabel: "Prelim",
    venue: "Meta APEX",
    away: { code: "SCH", name: "Matt Schnell", score: 0 },
    home: { code: "COS", name: "Alessandro Costa", score: 0 },
    inning: "Prelim",
    count: "Catchweight",
    baseState: "empty",
    livePulse: "Matt Schnell vs Alessandro Costa opens the catchweight proof lane.",
    statusDetail: "Owned Fighter Card can enter free before fight lock",
  },
  {
    id: "ufc-mcghee-yannis",
    status: "pregame",
    gameDate: "2026-06-06T23:06:00Z",
    startTimeLabel: "Prelim",
    venue: "Meta APEX",
    away: { code: "MCG", name: "Marcus McGhee", score: 0 },
    home: { code: "YAN", name: "John Yannis", score: 0 },
    inning: "Prelim",
    count: "Bantamweight",
    baseState: "empty",
    livePulse: "Marcus McGhee vs John Yannis adds a bantamweight Fighter Card lane.",
    statusDetail: "Fight Pick proof object binds before lock",
  },
  {
    id: "ufc-silva-chairez",
    status: "pregame",
    gameDate: "2026-06-06T22:39:00Z",
    startTimeLabel: "Prelim",
    venue: "Meta APEX",
    away: { code: "BSI", name: "Bruno Silva", score: 0 },
    home: { code: "ECH", name: "Edgar Chairez", score: 0 },
    inning: "Prelim",
    count: "Flyweight",
    baseState: "empty",
    livePulse: "Bruno Silva vs Edgar Chairez carries the flyweight proof lane.",
    statusDetail: "Correct picks may issue a linked Victory Card proof object",
  },
  {
    id: "ufc-cachoeira-chandler",
    status: "pregame",
    gameDate: "2026-06-06T22:12:00Z",
    startTimeLabel: "Prelim",
    venue: "Meta APEX",
    away: { code: "CAC", name: "Priscila Cachoeira", score: 0 },
    home: { code: "CHN", name: "Chelsea Chandler", score: 0 },
    inning: "Prelim",
    count: "Women's bantamweight",
    baseState: "empty",
    livePulse: "Priscila Cachoeira vs Chelsea Chandler adds a women's bantamweight lane.",
    statusDetail: "Owned Fighter Card carries the result append",
  },
  {
    id: "ufc-leavitt-brito",
    status: "pregame",
    gameDate: "2026-06-06T21:45:00Z",
    startTimeLabel: "Prelim",
    venue: "Meta APEX",
    away: { code: "LEA", name: "Jordan Leavitt", score: 0 },
    home: { code: "BRI", name: "Joanderson Brito", score: 0 },
    inning: "Prelim",
    count: "Featherweight",
    baseState: "empty",
    livePulse: "Jordan Leavitt vs Joanderson Brito adds a featherweight proof lane.",
    statusDetail: "Fight Pick proof object seals before lock",
  },
  {
    id: "ufc-chaves-duben",
    status: "pregame",
    gameDate: "2026-06-06T21:18:00Z",
    startTimeLabel: "Prelim",
    venue: "Meta APEX",
    away: { code: "JCH", name: "Jeisla Chaves", score: 0 },
    home: { code: "DUB", name: "Yuneisy Duben", score: 0 },
    inning: "Prelim",
    count: "Women's flyweight",
    baseState: "empty",
    livePulse: "Jeisla Chaves vs Yuneisy Duben adds a women's flyweight proof lane.",
    statusDetail: "Result appends enrich the owned Fighter Card",
  },
  {
    id: "ufc-souza-carnelossi",
    status: "pregame",
    gameDate: "2026-06-06T20:51:00Z",
    startTimeLabel: "Prelim opener",
    venue: "Meta APEX",
    away: { code: "SOU", name: "Ketlen Souza", score: 0 },
    home: { code: "CAR", name: "Ariane Carnelossi", score: 0 },
    inning: "Prelim opener",
    count: "Women's strawweight",
    baseState: "empty",
    livePulse: "Ketlen Souza vs Ariane Carnelossi opens the official UFC event card lane.",
    statusDetail: "Victory Card proof object issues only after correct result append",
  },
];

const LEGACY_FIGHT_CLOSEOUT_SEEDS: FightCloseoutSeed[] = [
  { fightId: "ufc-muhammad-bonfim", winnerSide: "away", method: "Decision", round: 5, clock: "0:00", winnerAction: "takedown", winnerActionValue: 3, loserStrikeValue: 31, controlSeconds: 116 },
  { fightId: "ufc-allen-shahbazyan", winnerSide: "away", method: "Submission", round: 2, clock: "2:41", winnerAction: "submission_attempt", winnerActionValue: 2, loserStrikeValue: 18, controlSeconds: 82 },
  { fightId: "ufc-ziam-nolan", winnerSide: "home", method: "TKO", round: 3, clock: "1:34", winnerAction: "knockdown", winnerActionValue: 1, loserStrikeValue: 22, controlSeconds: 64 },
  { fightId: "ufc-mitchell-luna", winnerSide: "away", method: "Submission", round: 1, clock: "3:09", winnerAction: "takedown", winnerActionValue: 2, loserStrikeValue: 11, controlSeconds: 97 },
  { fightId: "ufc-baraniewski-tafa", winnerSide: "away", method: "KO", round: 1, clock: "4:12", winnerAction: "knockdown", winnerActionValue: 2, loserStrikeValue: 15, controlSeconds: 28 },
  { fightId: "ufc-schnell-costa", winnerSide: "home", method: "Decision", round: 3, clock: "0:00", winnerAction: "takedown_defense", winnerActionValue: 4, loserStrikeValue: 27, controlSeconds: 73 },
  { fightId: "ufc-mcghee-yannis", winnerSide: "away", method: "TKO", round: 2, clock: "4:27", winnerAction: "knockdown", winnerActionValue: 1, loserStrikeValue: 14, controlSeconds: 42 },
  { fightId: "ufc-silva-chairez", winnerSide: "home", method: "Submission", round: 3, clock: "2:18", winnerAction: "submission_attempt", winnerActionValue: 3, loserStrikeValue: 24, controlSeconds: 101 },
  { fightId: "ufc-cachoeira-chandler", winnerSide: "home", method: "Decision", round: 3, clock: "0:00", winnerAction: "control_time", winnerActionValue: 138, loserStrikeValue: 26, controlSeconds: 138 },
  { fightId: "ufc-leavitt-brito", winnerSide: "home", method: "TKO", round: 2, clock: "1:58", winnerAction: "knockdown", winnerActionValue: 1, loserStrikeValue: 17, controlSeconds: 49 },
  { fightId: "ufc-chaves-duben", winnerSide: "home", method: "KO", round: 1, clock: "4:44", winnerAction: "head_strike", winnerActionValue: 19, loserStrikeValue: 13, controlSeconds: 31 },
  { fightId: "ufc-souza-carnelossi", winnerSide: "away", method: "Decision", round: 3, clock: "0:00", winnerAction: "leg_strike", winnerActionValue: 24, loserStrikeValue: 21, controlSeconds: 55 },
];

const LEGACY_FIGHT_ARENA_SLATE: FightArenaSlate = {
  sourceDate: LEGACY_FIGHT_ARENA_SOURCE_DATE,
  slateLabel: "UFC Fight Night: Muhammad vs Bonfim",
  cards: FIGHT_CARDS,
  scoreboards: LEGACY_FIGHT_SCOREBOARDS,
  closeoutSeeds: LEGACY_FIGHT_CLOSEOUT_SEEDS,
  selectedCardIds: [
    "ufc-card-belal-muhammad",
    "ufc-card-brendan-allen",
    "ufc-card-fares-ziam",
    "ufc-card-bryce-mitchell",
    "ufc-card-iwo-baraniewski",
  ],
};

const FIGHT_ARENA_ARCHIVE_SLATES_BY_DATE = new Map<string, FightArenaSlate>([
  [LEGACY_FIGHT_ARENA_SLATE.sourceDate, LEGACY_FIGHT_ARENA_SLATE],
]);

function fightFighterSeed(args: Omit<FightArenaFighterSeed, "imageUrl">): FightArenaFighterSeed {
  const sourceSuffix = args.slug.split("-").reverse().join("_").toUpperCase();
  return {
    ...args,
    imageUrl: FIGHT_ARENA_OFFICIAL_FIGHTER_IMAGE_SOURCE_URLS[args.slug] ?? `https://ufc.com/images/2026-06/${sourceSuffix}.png`,
  };
}

const FIGHT_ARENA_OFFICIAL_FIGHTER_IMAGE_SOURCE_URLS: Record<string, string> = {
  "ilia-topuria": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2024-10/TOPURIA_ILIA_L_BELT_10-26.png?itok=K_yOA4Wo",
  "justin-gaethje": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-03/GAETHJE_JUSTIN_R_BELTMOCK2.png?itok=hL-unRQD",
  "alex-pereira": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-03/PEREIRA_ALEX_L.png?itok=njlNAJ3S",
  "ciryl-gane": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-10/GANE_CIRYL_R_10-25.png?itok=3x2pl8UX",
  "sean-omalley": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-01/OMALLEY_SEAN_L_01-24.png?itok=d-iBOdGq",
  "aiemann-zahabi": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-10/ZAHABI_AIEMANN_R_10-18.png?itok=Nh83sWmo",
  "josh-hokit": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-01/HOKIT_JOSH_L_01-24.png?itok=Cq3hjeVi",
  "derrick-lewis": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-01/LEWIS_DERRICK_R_01-24.png?itok=KJLtnOgF",
  "mauricio-ruffy": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-02/RUFFY_MAURICIO_L_01-31.png?itok=hDVeSYTj",
  "michael-chandler": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-01/5/CHANDLER_MICHAEL_R_11-16.png?itok=NokHoH-2",
  "bo-nickal": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-11/NICKAL_BO_L_11-15.png?itok=CgN43jdF",
  "kyle-daukaus": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-08/DAUKAUS_KYLE_R_08-23.png?itok=18-TrlH3",
  "diego-lopes": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-02/LOPES_DIEGO_L_01-31.png?itok=2JKtDP7e",
  "steve-garcia": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-07/GARCIA_STEVE_R_07-12.png?itok=g_7w7dCH",
  "manel-kape": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-02/KAPE_MANEL_L_03-01.png?itok=_-m1hlyH",
  "kyoji-horiguchi": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-11/HORIGUCHI_KYOJI_R_11-22.png?itok=kFUO6UhA",
  "ion-cutelaba": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-03/CUTELABA_ION_L_03-14.png?itok=lEZWwaJa",
  "navajo-stirling": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-05/STIRLING_NAVAJO_L_05-10.png?itok=G0W35kTT",
  "giga-chikadze": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-12/CHIKADZE_GIGA_L_12-13.png?itok=UbrM_wrF",
  "vinicius-oliveira": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-02/OLIVEIRA_VINICIUS_R_02-07.png?itok=t4fE5hIs",
  "andre-lima": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-02/LIMA_ANDRE_L_09-07.png?itok=tWnFUQOq",
  "kevin-borjas": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-02/BORJAS_KEVIN_R_02-28.png?itok=e3C1z8wO",
  "hyder-amil": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-06/AMIL_HYDER_L_06-28.png?itok=H6OyAkR-",
  "christian-rodriguez": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-01/2/RODRIGUEZ_CHRISTIAN_R_01-11.png?itok=E_GZgLeb",
  "melsik-baghdasaryan": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2021-08/BAGHDASARYAN_MELSIK_L_07-31.png?itok=3H5_zK-H",
  "murtazali-magomedov": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-09/MAGOMEDOV_MURTAZLI_R.png?itok=5eWiK-Pg",
  "bia-mesquita": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-10/MESQUITA_BIA_L_10-11.png?itok=OTL9Mcix",
  "melissa-mullins": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-06/MULLINS_MELISSA_R_06-21.png?itok=TqtQIOsl",
  "allan-nascimento": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-10/NASCIMENTO_ALLAN_L_11-01.png?itok=p7XdgBBS",
  "mitch-raposo": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-10/RAPOSO_MITCH_R_10-25.png?itok=CI0Hj7EU",
  "gaston-bolanos": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-05/BOLANOS_GASTON_L_05-03.png?itok=p14QBuzZ",
  "michael-aswell-jr": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2026-03/ASWELL_MICHAEL_R_03-21.png?itok=VtTJMmq1",
  "karol-rosa": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-07/ROSA_KAROL_L_08-02.png?itok=XaoP89S4",
  "luana-santos": "https://ufc.com/images/styles/athlete_detail_stance_thumbnail_full_body/s3/2025-12/SANTOS_LUANA_R_12-13.png?itok=BOo_NZqa",
};

const FIGHT_ARENA_SLATE_SEEDS: FightArenaSlateSeed[] = [
  {
    sourceDate: "2026-06-14",
    slateLabel: "UFC Freedom 250: Topuria vs Gaethje",
    selectedSlugs: ["ilia-topuria", "alex-pereira", "sean-omalley", "mauricio-ruffy", "bo-nickal"],
    fights: [
      {
        id: "ufc-topuria-gaethje",
        gameDate: "2026-06-15T00:00:00Z",
        startTimeLabel: "Main event",
        venue: "The White House",
        inning: "Main event",
        count: "Lightweight title",
        away: fightFighterSeed({
          slug: "ilia-topuria",
          athlete: "Ilia Topuria",
          shortName: "I. Topuria",
          code: "TOP",
          division: "Lightweight",
          position: "LW",
          rating: 97,
          tier: "Champion",
          accent: "cyan",
          projectedScore: 9.6,
          statLine: "Lightweight title lane",
          liveLine: "Freedom 250 main event ownership lane",
          tags: ["lightweight", "title", "main event", "pressure"],
        }),
        home: fightFighterSeed({
          slug: "justin-gaethje",
          athlete: "Justin Gaethje",
          shortName: "J. Gaethje",
          code: "GAE",
          division: "Lightweight",
          position: "LW",
          rating: 95,
          tier: "Champion",
          accent: "amber",
          projectedScore: 9.3,
          statLine: "Interim lightweight champion lane",
          liveLine: "Main event violence proof lane",
          tags: ["lightweight", "title", "main event", "power"],
        }),
        livePulse: "Ilia Topuria vs Justin Gaethje headlines UFC Freedom 250.",
        statusDetail: "Fight Pick proof object seals before Topuria vs Gaethje lock",
        closeout: { winnerSide: "away", method: "Decision", round: 5, clock: "0:00", winnerAction: "head_strike", winnerActionValue: 42, loserStrikeValue: 36, controlSeconds: 74 },
      },
      {
        id: "ufc-pereira-gane",
        gameDate: "2026-06-14T23:33:00Z",
        startTimeLabel: "Co-main",
        venue: "The White House",
        inning: "Co-main",
        count: "Heavyweight interim title",
        away: fightFighterSeed({
          slug: "alex-pereira",
          athlete: "Alex Pereira",
          shortName: "A. Pereira",
          code: "PER",
          division: "Heavyweight",
          position: "HW",
          rating: 96,
          tier: "Champion",
          accent: "red",
          projectedScore: 9.4,
          statLine: "Heavyweight interim title lane",
          liveLine: "Co-main knockout proof lane",
          tags: ["heavyweight", "title", "power", "striker"],
        }),
        home: fightFighterSeed({
          slug: "ciryl-gane",
          athlete: "Ciryl Gane",
          shortName: "C. Gane",
          code: "GAN",
          division: "Heavyweight",
          position: "HW",
          rating: 94,
          tier: "Gold",
          accent: "steel",
          projectedScore: 9.1,
          statLine: "Heavyweight movement lane",
          liveLine: "Co-main technique proof lane",
          tags: ["heavyweight", "title", "movement", "striker"],
        }),
        livePulse: "Alex Pereira vs Ciryl Gane carries the interim heavyweight title swing.",
        statusDetail: "Owned Fighter Card carries the heavyweight title result history",
        closeout: { winnerSide: "away", method: "KO", round: 3, clock: "1:52", winnerAction: "knockdown", winnerActionValue: 2, loserStrikeValue: 29, controlSeconds: 38 },
      },
      {
        id: "ufc-omalley-zahabi",
        gameDate: "2026-06-14T23:06:00Z",
        startTimeLabel: "Main card",
        venue: "The White House",
        inning: "Main card",
        count: "Bantamweight",
        away: fightFighterSeed({
          slug: "sean-omalley",
          athlete: "Sean O'Malley",
          shortName: "S. O'Malley",
          code: "OMA",
          division: "Bantamweight",
          position: "BW",
          rating: 93,
          tier: "Gold",
          accent: "cyan",
          projectedScore: 8.9,
          statLine: "Bantamweight highlight lane",
          liveLine: "Main-card striking proof lane",
          tags: ["bantamweight", "main card", "striker", "highlight"],
        }),
        home: fightFighterSeed({
          slug: "aiemann-zahabi",
          athlete: "Aiemann Zahabi",
          shortName: "A. Zahabi",
          code: "ZAH",
          division: "Bantamweight",
          position: "BW",
          rating: 88,
          tier: "Gold",
          accent: "green",
          projectedScore: 8.1,
          statLine: "Ranked bantamweight lane",
          liveLine: "Main-card upset proof lane",
          tags: ["bantamweight", "ranked", "control", "upset"],
        }),
        livePulse: "Sean O'Malley vs Aiemann Zahabi adds a ranked bantamweight proof lane.",
        statusDetail: "Correct picks may issue a linked Victory Card proof object",
        closeout: { winnerSide: "away", method: "TKO", round: 2, clock: "4:10", winnerAction: "knockdown", winnerActionValue: 1, loserStrikeValue: 23, controlSeconds: 42 },
      },
      {
        id: "ufc-hokit-lewis",
        gameDate: "2026-06-14T22:39:00Z",
        startTimeLabel: "Main card",
        venue: "The White House",
        inning: "Main card",
        count: "Heavyweight",
        away: fightFighterSeed({
          slug: "josh-hokit",
          athlete: "Josh Hokit",
          shortName: "J. Hokit",
          code: "HOK",
          division: "Heavyweight",
          position: "HW",
          rating: 86,
          tier: "Rare",
          accent: "green",
          projectedScore: 7.8,
          statLine: "Heavyweight prospect lane",
          liveLine: "Main-card wrestling proof lane",
          tags: ["heavyweight", "prospect", "wrestling"],
        }),
        home: fightFighterSeed({
          slug: "derrick-lewis",
          athlete: "Derrick Lewis",
          shortName: "D. Lewis",
          code: "LEW",
          division: "Heavyweight",
          position: "HW",
          rating: 91,
          tier: "Gold",
          accent: "red",
          projectedScore: 8.6,
          statLine: "Heavyweight knockout lane",
          liveLine: "Main-card power proof lane",
          tags: ["heavyweight", "power", "knockout"],
        }),
        livePulse: "Josh Hokit vs Derrick Lewis creates the heavyweight power swing.",
        statusDetail: "Fight Pick proof object binds the owned fighter before lock",
        closeout: { winnerSide: "home", method: "KO", round: 1, clock: "3:18", winnerAction: "knockdown", winnerActionValue: 2, loserStrikeValue: 14, controlSeconds: 21 },
      },
      {
        id: "ufc-ruffy-chandler",
        gameDate: "2026-06-14T22:12:00Z",
        startTimeLabel: "Main card",
        venue: "The White House",
        inning: "Main card",
        count: "Lightweight",
        away: fightFighterSeed({
          slug: "mauricio-ruffy",
          athlete: "Mauricio Ruffy",
          shortName: "M. Ruffy",
          code: "RUF",
          division: "Lightweight",
          position: "LW",
          rating: 90,
          tier: "Gold",
          accent: "amber",
          projectedScore: 8.5,
          statLine: "Lightweight surge lane",
          liveLine: "Main-card prospect proof lane",
          tags: ["lightweight", "prospect", "main card"],
        }),
        home: fightFighterSeed({
          slug: "michael-chandler",
          athlete: "Michael Chandler",
          shortName: "M. Chandler",
          code: "CHA",
          division: "Lightweight",
          position: "LW",
          rating: 89,
          tier: "Gold",
          accent: "steel",
          projectedScore: 8.3,
          statLine: "Lightweight veteran lane",
          liveLine: "Main-card veteran proof lane",
          tags: ["lightweight", "veteran", "wrestling"],
        }),
        livePulse: "Mauricio Ruffy vs Michael Chandler adds lightweight chaos to the card.",
        statusDetail: "Victory Card proof object issues only after correct result append",
        closeout: { winnerSide: "away", method: "Decision", round: 3, clock: "0:00", winnerAction: "leg_strike", winnerActionValue: 28, loserStrikeValue: 31, controlSeconds: 66 },
      },
      {
        id: "ufc-nickal-daukaus",
        gameDate: "2026-06-14T21:45:00Z",
        startTimeLabel: "Main card",
        venue: "The White House",
        inning: "Main card",
        count: "Middleweight",
        away: fightFighterSeed({
          slug: "bo-nickal",
          athlete: "Bo Nickal",
          shortName: "B. Nickal",
          code: "NIC",
          division: "Middleweight",
          position: "MW",
          rating: 88,
          tier: "Gold",
          accent: "green",
          projectedScore: 8.2,
          statLine: "Middleweight wrestling lane",
          liveLine: "Main-card grappling proof lane",
          tags: ["middleweight", "wrestling", "prospect"],
        }),
        home: fightFighterSeed({
          slug: "kyle-daukaus",
          athlete: "Kyle Daukaus",
          shortName: "K. Daukaus",
          code: "DAU",
          division: "Middleweight",
          position: "MW",
          rating: 84,
          tier: "Rare",
          accent: "cyan",
          projectedScore: 7.4,
          statLine: "Middleweight submission lane",
          liveLine: "Main-card submission proof lane",
          tags: ["middleweight", "submission", "grappling"],
        }),
        livePulse: "Bo Nickal vs Kyle Daukaus carries a middleweight grappling proof lane.",
        statusDetail: "Fight Pick proof object binds before middleweight lock",
        closeout: { winnerSide: "away", method: "Submission", round: 2, clock: "2:36", winnerAction: "submission_attempt", winnerActionValue: 3, loserStrikeValue: 17, controlSeconds: 112 },
      },
      {
        id: "ufc-lopes-garcia",
        gameDate: "2026-06-14T21:18:00Z",
        startTimeLabel: "Main card opener",
        venue: "The White House",
        inning: "Main card",
        count: "Featherweight",
        away: fightFighterSeed({
          slug: "diego-lopes",
          athlete: "Diego Lopes",
          shortName: "D. Lopes",
          code: "LOP",
          division: "Featherweight",
          position: "FW",
          rating: 92,
          tier: "Gold",
          accent: "amber",
          projectedScore: 8.8,
          statLine: "Featherweight contender lane",
          liveLine: "Main-card opener proof lane",
          tags: ["featherweight", "contender", "finish"],
        }),
        home: fightFighterSeed({
          slug: "steve-garcia",
          athlete: "Steve Garcia",
          shortName: "S. Garcia",
          code: "GAR",
          division: "Featherweight",
          position: "FW",
          rating: 86,
          tier: "Rare",
          accent: "red",
          projectedScore: 7.8,
          statLine: "Featherweight power lane",
          liveLine: "Main-card opener upset lane",
          tags: ["featherweight", "power", "main card"],
        }),
        livePulse: "Diego Lopes vs Steve Garcia opens the Freedom 250 Fighter Card lane.",
        statusDetail: "Result appends enrich the owned Fighter Card",
        closeout: { winnerSide: "away", method: "TKO", round: 3, clock: "0:58", winnerAction: "knockdown", winnerActionValue: 1, loserStrikeValue: 25, controlSeconds: 47 },
      },
    ],
  },
  {
    sourceDate: "2026-06-20",
    slateLabel: "UFC Fight Night: Kape vs Horiguchi",
    selectedSlugs: ["manel-kape", "ion-cutelaba", "giga-chikadze", "andre-lima", "bia-mesquita"],
    fights: [
      {
        id: "ufc-kape-horiguchi",
        gameDate: "2026-06-21T00:00:00Z",
        startTimeLabel: "Main event",
        venue: "Meta APEX",
        inning: "Main event",
        count: "Flyweight",
        away: fightFighterSeed({
          slug: "manel-kape",
          athlete: "Manel Kape",
          shortName: "M. Kape",
          code: "KAP",
          division: "Flyweight",
          position: "FLW",
          rating: 93,
          tier: "Gold",
          accent: "cyan",
          projectedScore: 8.9,
          statLine: "Flyweight contender lane",
          liveLine: "Main event speed proof lane",
          tags: ["flyweight", "main event", "speed"],
        }),
        home: fightFighterSeed({
          slug: "kyoji-horiguchi",
          athlete: "Kyoji Horiguchi",
          shortName: "K. Horiguchi",
          code: "HOR",
          division: "Flyweight",
          position: "FLW",
          rating: 92,
          tier: "Gold",
          accent: "green",
          projectedScore: 8.8,
          statLine: "Flyweight return lane",
          liveLine: "Main event veteran proof lane",
          tags: ["flyweight", "main event", "veteran"],
        }),
        livePulse: "Manel Kape vs Kyoji Horiguchi headlines UFC Fight Night.",
        statusDetail: "Fight Pick proof object seals before Kape vs Horiguchi lock",
        closeout: { winnerSide: "away", method: "Decision", round: 5, clock: "0:00", winnerAction: "leg_strike", winnerActionValue: 34, loserStrikeValue: 32, controlSeconds: 61 },
      },
      {
        id: "ufc-cutelaba-stirling",
        gameDate: "2026-06-20T23:33:00Z",
        startTimeLabel: "Main card",
        venue: "Meta APEX",
        inning: "Main card",
        count: "Light heavyweight",
        away: fightFighterSeed({
          slug: "ion-cutelaba",
          athlete: "Ion Cutelaba",
          shortName: "I. Cutelaba",
          code: "CUT",
          division: "Light Heavyweight",
          position: "LHW",
          rating: 86,
          tier: "Rare",
          accent: "red",
          projectedScore: 7.8,
          statLine: "Light heavyweight pressure lane",
          liveLine: "Main-card power proof lane",
          tags: ["light heavyweight", "power", "main card"],
        }),
        home: fightFighterSeed({
          slug: "navajo-stirling",
          athlete: "Navajo Stirling",
          shortName: "N. Stirling",
          code: "STI",
          division: "Light Heavyweight",
          position: "LHW",
          rating: 84,
          tier: "Rare",
          accent: "steel",
          projectedScore: 7.4,
          statLine: "Light heavyweight prospect lane",
          liveLine: "Main-card prospect proof lane",
          tags: ["light heavyweight", "prospect", "striker"],
        }),
        livePulse: "Ion Cutelaba vs Navajo Stirling carries the light heavyweight proof swing.",
        statusDetail: "Owned Fighter Card carries the result history",
        closeout: { winnerSide: "home", method: "TKO", round: 2, clock: "3:44", winnerAction: "knockdown", winnerActionValue: 1, loserStrikeValue: 20, controlSeconds: 39 },
      },
      {
        id: "ufc-chikadze-oliveira",
        gameDate: "2026-06-20T23:06:00Z",
        startTimeLabel: "Main card",
        venue: "Meta APEX",
        inning: "Main card",
        count: "Featherweight",
        away: fightFighterSeed({
          slug: "giga-chikadze",
          athlete: "Giga Chikadze",
          shortName: "G. Chikadze",
          code: "GIG",
          division: "Featherweight",
          position: "FW",
          rating: 89,
          tier: "Gold",
          accent: "amber",
          projectedScore: 8.2,
          statLine: "Featherweight striking lane",
          liveLine: "Main-card kickboxing proof lane",
          tags: ["featherweight", "ranked", "striker"],
        }),
        home: fightFighterSeed({
          slug: "vinicius-oliveira",
          athlete: "Vinicius Oliveira",
          shortName: "V. Oliveira",
          code: "VOL",
          division: "Featherweight",
          position: "FW",
          rating: 87,
          tier: "Rare",
          accent: "green",
          projectedScore: 7.9,
          statLine: "Featherweight pressure lane",
          liveLine: "Main-card pressure proof lane",
          tags: ["featherweight", "pressure", "main card"],
        }),
        livePulse: "Giga Chikadze vs Vinicius Oliveira adds ranked featherweight lift.",
        statusDetail: "Correct picks may issue a linked Victory Card proof object",
        closeout: { winnerSide: "away", method: "Decision", round: 3, clock: "0:00", winnerAction: "head_strike", winnerActionValue: 31, loserStrikeValue: 29, controlSeconds: 36 },
      },
      {
        id: "ufc-lima-borjas",
        gameDate: "2026-06-20T22:39:00Z",
        startTimeLabel: "Main card",
        venue: "Meta APEX",
        inning: "Main card",
        count: "Flyweight",
        away: fightFighterSeed({
          slug: "andre-lima",
          athlete: "Andre Lima",
          shortName: "A. Lima",
          code: "LIM",
          division: "Flyweight",
          position: "FLW",
          rating: 86,
          tier: "Rare",
          accent: "cyan",
          projectedScore: 7.8,
          statLine: "Flyweight pace lane",
          liveLine: "Main-card flyweight proof lane",
          tags: ["flyweight", "pace", "main card"],
        }),
        home: fightFighterSeed({
          slug: "kevin-borjas",
          athlete: "Kevin Borjas",
          shortName: "K. Borjas",
          code: "BOR",
          division: "Flyweight",
          position: "FLW",
          rating: 82,
          tier: "Rare",
          accent: "steel",
          projectedScore: 7.1,
          statLine: "Flyweight counter lane",
          liveLine: "Main-card upset proof lane",
          tags: ["flyweight", "counter", "main card"],
        }),
        livePulse: "Andre Lima vs Kevin Borjas carries the flyweight pace lane.",
        statusDetail: "Fight Pick proof object binds the owned fighter before lock",
        closeout: { winnerSide: "away", method: "Submission", round: 3, clock: "2:12", winnerAction: "submission_attempt", winnerActionValue: 2, loserStrikeValue: 18, controlSeconds: 83 },
      },
      {
        id: "ufc-amil-rodriguez",
        gameDate: "2026-06-20T22:12:00Z",
        startTimeLabel: "Main card",
        venue: "Meta APEX",
        inning: "Main card",
        count: "Featherweight",
        away: fightFighterSeed({
          slug: "hyder-amil",
          athlete: "Hyder Amil",
          shortName: "H. Amil",
          code: "AMI",
          division: "Featherweight",
          position: "FW",
          rating: 85,
          tier: "Rare",
          accent: "green",
          projectedScore: 7.6,
          statLine: "Featherweight pace lane",
          liveLine: "Main-card pace proof lane",
          tags: ["featherweight", "pace", "pressure"],
        }),
        home: fightFighterSeed({
          slug: "christian-rodriguez",
          athlete: "Christian Rodriguez",
          shortName: "C. Rodriguez",
          code: "ROD",
          division: "Featherweight",
          position: "FW",
          rating: 86,
          tier: "Rare",
          accent: "amber",
          projectedScore: 7.7,
          statLine: "Featherweight technical lane",
          liveLine: "Main-card control proof lane",
          tags: ["featherweight", "control", "main card"],
        }),
        livePulse: "Hyder Amil vs Christian Rodriguez adds a featherweight proof lane.",
        statusDetail: "Victory Card proof object issues only after correct result append",
        closeout: { winnerSide: "home", method: "Decision", round: 3, clock: "0:00", winnerAction: "takedown_defense", winnerActionValue: 4, loserStrikeValue: 27, controlSeconds: 59 },
      },
      {
        id: "ufc-baghdasaryan-magomedov",
        gameDate: "2026-06-20T21:45:00Z",
        startTimeLabel: "Main card opener",
        venue: "Meta APEX",
        inning: "Main card",
        count: "Featherweight",
        away: fightFighterSeed({
          slug: "melsik-baghdasaryan",
          athlete: "Melsik Baghdasaryan",
          shortName: "M. Baghdasaryan",
          code: "BAG",
          division: "Featherweight",
          position: "FW",
          rating: 84,
          tier: "Rare",
          accent: "red",
          projectedScore: 7.4,
          statLine: "Featherweight kickboxing lane",
          liveLine: "Main-card opener strike proof lane",
          tags: ["featherweight", "striker", "main card"],
        }),
        home: fightFighterSeed({
          slug: "murtazali-magomedov",
          athlete: "Murtazali Magomedov",
          shortName: "M. Magomedov",
          code: "MAG",
          division: "Featherweight",
          position: "FW",
          rating: 83,
          tier: "Rare",
          accent: "steel",
          projectedScore: 7.2,
          statLine: "Featherweight wrestling lane",
          liveLine: "Main-card opener grappling proof lane",
          tags: ["featherweight", "wrestling", "main card"],
        }),
        livePulse: "Melsik Baghdasaryan vs Murtazali Magomedov starts the main-card Fighter Card lane.",
        statusDetail: "Fight Pick proof object seals before lock",
        closeout: { winnerSide: "away", method: "Decision", round: 3, clock: "0:00", winnerAction: "leg_strike", winnerActionValue: 26, loserStrikeValue: 23, controlSeconds: 44 },
      },
      {
        id: "ufc-mesquita-mullins",
        gameDate: "2026-06-20T21:18:00Z",
        startTimeLabel: "Prelim",
        venue: "Meta APEX",
        inning: "Prelim",
        count: "Women's bantamweight",
        away: fightFighterSeed({
          slug: "bia-mesquita",
          athlete: "Bia Mesquita",
          shortName: "B. Mesquita",
          code: "MES",
          division: "Women's Bantamweight",
          position: "WBW",
          rating: 83,
          tier: "Rare",
          accent: "green",
          projectedScore: 7.3,
          statLine: "Women's bantamweight grappling lane",
          liveLine: "Prelim grappling proof lane",
          tags: ["women's bantamweight", "grappling", "prelim"],
        }),
        home: fightFighterSeed({
          slug: "melissa-mullins",
          athlete: "Melissa Mullins",
          shortName: "M. Mullins",
          code: "MUL",
          division: "Women's Bantamweight",
          position: "WBW",
          rating: 80,
          tier: "Rare",
          accent: "cyan",
          projectedScore: 6.9,
          statLine: "Women's bantamweight counter lane",
          liveLine: "Prelim counter proof lane",
          tags: ["women's bantamweight", "counter", "prelim"],
        }),
        livePulse: "Bia Mesquita vs Melissa Mullins adds a women's bantamweight proof lane.",
        statusDetail: "Owned Fighter Card can enter before fight lock",
        closeout: { winnerSide: "away", method: "Submission", round: 2, clock: "4:05", winnerAction: "submission_attempt", winnerActionValue: 3, loserStrikeValue: 15, controlSeconds: 105 },
      },
      {
        id: "ufc-nascimento-raposo",
        gameDate: "2026-06-20T20:51:00Z",
        startTimeLabel: "Prelim",
        venue: "Meta APEX",
        inning: "Prelim",
        count: "Flyweight",
        away: fightFighterSeed({
          slug: "allan-nascimento",
          athlete: "Allan Nascimento",
          shortName: "A. Nascimento",
          code: "NAS",
          division: "Flyweight",
          position: "FLW",
          rating: 84,
          tier: "Rare",
          accent: "amber",
          projectedScore: 7.4,
          statLine: "Flyweight submission lane",
          liveLine: "Prelim submission proof lane",
          tags: ["flyweight", "submission", "prelim"],
        }),
        home: fightFighterSeed({
          slug: "mitch-raposo",
          athlete: "Mitch Raposo",
          shortName: "M. Raposo",
          code: "RAP",
          division: "Flyweight",
          position: "FLW",
          rating: 80,
          tier: "Common",
          accent: "steel",
          projectedScore: 6.8,
          statLine: "Flyweight debut lane",
          liveLine: "Prelim debut proof lane",
          tags: ["flyweight", "debut", "prelim"],
        }),
        livePulse: "Allan Nascimento vs Mitch Raposo carries the flyweight prelim lane.",
        statusDetail: "Correct picks may issue a linked Victory Card proof object",
        closeout: { winnerSide: "away", method: "Submission", round: 1, clock: "3:17", winnerAction: "submission_attempt", winnerActionValue: 2, loserStrikeValue: 11, controlSeconds: 91 },
      },
      {
        id: "ufc-bolanos-aswell",
        gameDate: "2026-06-20T20:24:00Z",
        startTimeLabel: "Prelim",
        venue: "Meta APEX",
        inning: "Prelim",
        count: "Bantamweight",
        away: fightFighterSeed({
          slug: "gaston-bolanos",
          athlete: "Gaston Bolanos",
          shortName: "G. Bolanos",
          code: "BOL",
          division: "Bantamweight",
          position: "BW",
          rating: 79,
          tier: "Common",
          accent: "red",
          projectedScore: 6.7,
          statLine: "Bantamweight striking lane",
          liveLine: "Prelim striking proof lane",
          tags: ["bantamweight", "striker", "prelim"],
        }),
        home: fightFighterSeed({
          slug: "michael-aswell-jr",
          athlete: "Michael Aswell Jr.",
          shortName: "M. Aswell Jr.",
          code: "ASW",
          division: "Bantamweight",
          position: "BW",
          rating: 78,
          tier: "Common",
          accent: "cyan",
          projectedScore: 6.6,
          statLine: "Bantamweight debut lane",
          liveLine: "Prelim debut proof lane",
          tags: ["bantamweight", "debut", "prelim"],
        }),
        livePulse: "Gaston Bolanos vs Michael Aswell Jr. adds a bantamweight proof lane.",
        statusDetail: "Owned Fighter Card carries the result append",
        closeout: { winnerSide: "away", method: "TKO", round: 3, clock: "1:08", winnerAction: "knockdown", winnerActionValue: 1, loserStrikeValue: 18, controlSeconds: 36 },
      },
      {
        id: "ufc-rosa-santos",
        gameDate: "2026-06-20T19:57:00Z",
        startTimeLabel: "Prelim opener",
        venue: "Meta APEX",
        inning: "Prelim opener",
        count: "Women's bantamweight",
        away: fightFighterSeed({
          slug: "karol-rosa",
          athlete: "Karol Rosa",
          shortName: "K. Rosa",
          code: "ROS",
          division: "Women's Bantamweight",
          position: "WBW",
          rating: 84,
          tier: "Rare",
          accent: "green",
          projectedScore: 7.4,
          statLine: "Women's bantamweight ranked lane",
          liveLine: "Prelim opener control proof lane",
          tags: ["women's bantamweight", "ranked", "prelim"],
        }),
        home: fightFighterSeed({
          slug: "luana-santos",
          athlete: "Luana Santos",
          shortName: "L. Santos",
          code: "SAN",
          division: "Women's Bantamweight",
          position: "WBW",
          rating: 83,
          tier: "Rare",
          accent: "amber",
          projectedScore: 7.2,
          statLine: "Women's bantamweight prospect lane",
          liveLine: "Prelim opener prospect proof lane",
          tags: ["women's bantamweight", "prospect", "prelim"],
        }),
        livePulse: "Karol Rosa vs Luana Santos opens the Kape vs Horiguchi card lane.",
        statusDetail: "Victory Card proof object issues only after correct result append",
        closeout: { winnerSide: "home", method: "Decision", round: 3, clock: "0:00", winnerAction: "control_time", winnerActionValue: 121, loserStrikeValue: 22, controlSeconds: 121 },
      },
    ],
  },
  {
    sourceDate: "2026-07-11",
    slateLabel: "UFC Fight Night: Topuria vs Kape",
    selectedSlugs: ["ilia-topuria", "alex-pereira", "sean-omalley", "diego-lopes", "andre-lima"],
    fights: [
      {
        id: "ufc-topuria-kape",
        gameDate: "2026-07-12T00:00:00Z",
        startTimeLabel: "Main event",
        venue: "Meta APEX",
        inning: "Main event",
        count: "Lightweight showcase",
        away: fightFighterSeed({
          slug: "ilia-topuria",
          athlete: "Ilia Topuria",
          shortName: "I. Topuria",
          code: "TOP",
          division: "Lightweight",
          position: "LW",
          rating: 97,
          tier: "Champion",
          accent: "cyan",
          projectedScore: 9.6,
          statLine: "Lightweight main-event lane",
          liveLine: "Main event ownership proof lane",
          tags: ["lightweight", "main event", "pressure"],
        }),
        home: fightFighterSeed({
          slug: "manel-kape",
          athlete: "Manel Kape",
          shortName: "M. Kape",
          code: "KAP",
          division: "Flyweight",
          position: "FLW",
          rating: 93,
          tier: "Gold",
          accent: "green",
          projectedScore: 8.9,
          statLine: "Main-event speed lane",
          liveLine: "Main event counter proof lane",
          tags: ["main event", "speed", "striker"],
        }),
        livePulse: "Ilia Topuria vs Manel Kape headlines the current UFC Fight Pick slate.",
        statusDetail: "Fight Pick proof object seals before Topuria vs Kape lock",
        closeout: { winnerSide: "away", method: "Decision", round: 5, clock: "0:00", winnerAction: "head_strike", winnerActionValue: 39, loserStrikeValue: 34, controlSeconds: 71 },
      },
      {
        id: "ufc-pereira-cutelaba",
        gameDate: "2026-07-11T23:33:00Z",
        startTimeLabel: "Co-main",
        venue: "Meta APEX",
        inning: "Co-main",
        count: "Light heavyweight",
        away: fightFighterSeed({
          slug: "alex-pereira",
          athlete: "Alex Pereira",
          shortName: "A. Pereira",
          code: "PER",
          division: "Light Heavyweight",
          position: "LHW",
          rating: 96,
          tier: "Champion",
          accent: "red",
          projectedScore: 9.4,
          statLine: "Light heavyweight power lane",
          liveLine: "Co-main knockout proof lane",
          tags: ["light heavyweight", "power", "co-main"],
        }),
        home: fightFighterSeed({
          slug: "ion-cutelaba",
          athlete: "Ion Cutelaba",
          shortName: "I. Cutelaba",
          code: "CUT",
          division: "Light Heavyweight",
          position: "LHW",
          rating: 86,
          tier: "Rare",
          accent: "steel",
          projectedScore: 7.8,
          statLine: "Light heavyweight pressure lane",
          liveLine: "Co-main pressure proof lane",
          tags: ["light heavyweight", "power", "pressure"],
        }),
        livePulse: "Alex Pereira vs Ion Cutelaba carries the light heavyweight proof swing.",
        statusDetail: "Owned Fighter Card carries the result history",
        closeout: { winnerSide: "away", method: "KO", round: 2, clock: "2:08", winnerAction: "knockdown", winnerActionValue: 2, loserStrikeValue: 21, controlSeconds: 35 },
      },
      {
        id: "ufc-omalley-bolanos",
        gameDate: "2026-07-11T23:06:00Z",
        startTimeLabel: "Main card",
        venue: "Meta APEX",
        inning: "Main card",
        count: "Bantamweight",
        away: fightFighterSeed({
          slug: "sean-omalley",
          athlete: "Sean O'Malley",
          shortName: "S. O'Malley",
          code: "OMA",
          division: "Bantamweight",
          position: "BW",
          rating: 93,
          tier: "Gold",
          accent: "cyan",
          projectedScore: 8.9,
          statLine: "Bantamweight highlight lane",
          liveLine: "Main-card striking proof lane",
          tags: ["bantamweight", "main card", "striker"],
        }),
        home: fightFighterSeed({
          slug: "gaston-bolanos",
          athlete: "Gaston Bolanos",
          shortName: "G. Bolanos",
          code: "BOL",
          division: "Bantamweight",
          position: "BW",
          rating: 79,
          tier: "Common",
          accent: "amber",
          projectedScore: 6.7,
          statLine: "Bantamweight striking lane",
          liveLine: "Main-card upset proof lane",
          tags: ["bantamweight", "striker", "upset"],
        }),
        livePulse: "Sean O'Malley vs Gaston Bolanos adds a bantamweight Fighter Card lane.",
        statusDetail: "Correct picks may issue a linked Victory Card proof object",
        closeout: { winnerSide: "away", method: "TKO", round: 3, clock: "1:26", winnerAction: "knockdown", winnerActionValue: 1, loserStrikeValue: 24, controlSeconds: 41 },
      },
      {
        id: "ufc-lopes-chikadze",
        gameDate: "2026-07-11T22:39:00Z",
        startTimeLabel: "Main card",
        venue: "Meta APEX",
        inning: "Main card",
        count: "Featherweight",
        away: fightFighterSeed({
          slug: "diego-lopes",
          athlete: "Diego Lopes",
          shortName: "D. Lopes",
          code: "LOP",
          division: "Featherweight",
          position: "FW",
          rating: 92,
          tier: "Gold",
          accent: "amber",
          projectedScore: 8.8,
          statLine: "Featherweight contender lane",
          liveLine: "Main-card finish proof lane",
          tags: ["featherweight", "contender", "finish"],
        }),
        home: fightFighterSeed({
          slug: "giga-chikadze",
          athlete: "Giga Chikadze",
          shortName: "G. Chikadze",
          code: "GIG",
          division: "Featherweight",
          position: "FW",
          rating: 89,
          tier: "Gold",
          accent: "green",
          projectedScore: 8.2,
          statLine: "Featherweight striking lane",
          liveLine: "Main-card kickboxing proof lane",
          tags: ["featherweight", "ranked", "striker"],
        }),
        livePulse: "Diego Lopes vs Giga Chikadze anchors the featherweight proof lane.",
        statusDetail: "Fight Pick proof object binds the owned fighter before lock",
        closeout: { winnerSide: "away", method: "Submission", round: 2, clock: "3:11", winnerAction: "submission_attempt", winnerActionValue: 2, loserStrikeValue: 19, controlSeconds: 87 },
      },
      {
        id: "ufc-lima-borjas-ii",
        gameDate: "2026-07-11T22:12:00Z",
        startTimeLabel: "Main card opener",
        venue: "Meta APEX",
        inning: "Main card",
        count: "Flyweight",
        away: fightFighterSeed({
          slug: "andre-lima",
          athlete: "Andre Lima",
          shortName: "A. Lima",
          code: "LIM",
          division: "Flyweight",
          position: "FLW",
          rating: 86,
          tier: "Rare",
          accent: "cyan",
          projectedScore: 7.8,
          statLine: "Flyweight pace lane",
          liveLine: "Main-card flyweight proof lane",
          tags: ["flyweight", "pace", "main card"],
        }),
        home: fightFighterSeed({
          slug: "kevin-borjas",
          athlete: "Kevin Borjas",
          shortName: "K. Borjas",
          code: "BOR",
          division: "Flyweight",
          position: "FLW",
          rating: 82,
          tier: "Rare",
          accent: "steel",
          projectedScore: 7.1,
          statLine: "Flyweight counter lane",
          liveLine: "Main-card counter proof lane",
          tags: ["flyweight", "counter", "main card"],
        }),
        livePulse: "Andre Lima vs Kevin Borjas opens the current Fighter Card lane.",
        statusDetail: "Victory Card proof object issues only after correct result append",
        closeout: { winnerSide: "away", method: "Submission", round: 3, clock: "2:22", winnerAction: "submission_attempt", winnerActionValue: 2, loserStrikeValue: 18, controlSeconds: 84 },
      },
    ],
  },
];

const FIGHT_ARENA_DYNAMIC_IMAGE_SOURCE_URLS: Record<string, string> = Object.fromEntries(
  FIGHT_ARENA_SLATE_SEEDS.flatMap((slate) =>
    slate.fights.flatMap((fight) => [
      [fight.away.slug, fight.away.imageUrl ?? ""],
      [fight.home.slug, fight.home.imageUrl ?? ""],
    ]),
  ).filter((entry): entry is [string, string] => Boolean(entry[1])),
);

const FIGHT_ARENA_SLATE_SEEDS_BY_DATE = new Map(FIGHT_ARENA_SLATE_SEEDS.map((slate) => [slate.sourceDate, slate]));
const FIGHT_ARENA_SOURCE_DATES = FIGHT_ARENA_SLATE_SEEDS.map((slate) => slate.sourceDate).sort();

function sportsSystemNewYorkDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function cleanSportsArenaSourceDate(sourceDate: string | null | undefined, fallback = sportsSystemNewYorkDate()): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(sourceDate ?? "")) ? String(sourceDate) : fallback;
}

function fightArenaCountdownLabel(gameDate: string | null | undefined): string {
  if (!gameDate) return "Fight time pending";
  const parsed = new Date(gameDate);
  if (!Number.isFinite(parsed.getTime())) return "Fight time pending";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    hour12: true,
  }).formatToParts(parsed);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("weekday")}, ${part("month")} ${part("day")} · ${part("hour")}:${part("minute")} ${part("dayPeriod")} ${part("timeZoneName")}`.trim();
}

export function sportsArenaFightSourceDateForDate(sourceDate = sportsSystemNewYorkDate()): string {
  const cleanDate = cleanSportsArenaSourceDate(sourceDate);
  return FIGHT_ARENA_SOURCE_DATES.find((date) => date >= cleanDate) ?? FIGHT_ARENA_SOURCE_DATES[FIGHT_ARENA_SOURCE_DATES.length - 1] ?? cleanDate;
}

export function sportsArenaFightSlateIsFinalForDate(sourceDate: string, asOfDate = sportsSystemNewYorkDate()): boolean {
  const cleanSourceDate = cleanSportsArenaSourceDate(sourceDate, "");
  const cleanAsOfDate = cleanSportsArenaSourceDate(asOfDate);
  return Boolean(cleanSourceDate) && cleanAsOfDate > cleanSourceDate;
}

function fightArenaSlateSeedForDate(sourceDate = sportsSystemNewYorkDate()): FightArenaSlateSeed {
  const activeDate = sportsArenaFightSourceDateForDate(sourceDate);
  return FIGHT_ARENA_SLATE_SEEDS_BY_DATE.get(activeDate) ?? FIGHT_ARENA_SLATE_SEEDS[0]!;
}

function fightCardFromFighterSeed(fighter: FightArenaFighterSeed, opponent: FightArenaFighterSeed, slate: FightArenaSlateSeed): SportsArenaCard {
  const basisSeed = `ufc:${slate.sourceDate}:${fighter.slug}:${fighter.code}:${opponent.code}`;
  return {
    id: `ufc-card-${fighter.slug}`,
    athlete: fighter.shortName,
    team: fighter.division,
    teamCode: fighter.code,
    opponentCode: opponent.code,
    position: fighter.position,
    side: "player",
    rating: fighter.rating,
    tier: fighter.tier,
    accent: fighter.accent,
    projectedScore: fighter.projectedScore,
    currentScore: 0,
    statLine: fighter.statLine,
    liveLine: fighter.liveLine,
    tags: fighter.tags,
    playerBio: {
      division: fighter.division,
      event: slate.slateLabel,
      opponent: opponent.code,
      rosterStatus: slate.sourceDate,
    },
    media: ufcCardMedia({
      slug: fighter.slug,
      athlete: fighter.athlete,
      imageUrl: fighter.imageUrl ?? `https://ufc.com/images/2026-06/${fighter.slug}.png`,
      dominantColor: fighter.accent === "amber" ? "#ffc247" : fighter.accent === "cyan" ? "#19e7ff" : fighter.accent === "red" ? "#ff4f4f" : fighter.accent === "steel" ? "#b7c6d5" : "#39d077",
    }),
    baseCard: {
      sealedCardId: `rsc_ufc_${fighter.slug.replace(/-/g, "_")}_${slate.sourceDate.replace(/-/g, "")}`,
      basisHash: stableWorldCupHex(basisSeed),
      issueLine: `${slate.slateLabel} ${slate.sourceDate} - ${fighter.division} card`,
      athleteId: fighter.slug,
      sport: "fight",
    },
    historyCount: 0,
  };
}

function fightSlateCards(seed: FightArenaSlateSeed): SportsArenaCard[] {
  return seed.fights.flatMap((fight) => [
    fightCardFromFighterSeed(fight.away, fight.home, seed),
    fightCardFromFighterSeed(fight.home, fight.away, seed),
  ]);
}

function uniqueSportsArenaCardsById(cards: SportsArenaCard[]): SportsArenaCard[] {
  const byCardId = new Map<string, SportsArenaCard>();
  for (const card of cards) {
    if (!byCardId.has(card.id)) byCardId.set(card.id, card);
  }
  return Array.from(byCardId.values());
}

function compareUfcRosterCards(left: SportsArenaCard, right: SportsArenaCard): number {
  const ratingDelta = right.rating - left.rating;
  if (ratingDelta) return ratingDelta;
  const divisionDelta = left.position.localeCompare(right.position);
  if (divisionDelta) return divisionDelta;
  return left.athlete.localeCompare(right.athlete) || left.id.localeCompare(right.id);
}

export const UFC_FIGHTER_ROSTER_CARDS: SportsArenaCard[] = uniqueSportsArenaCardsById([
  ...FIGHT_ARENA_SLATE_SEEDS.flatMap(fightSlateCards),
  ...FIGHT_CARDS,
]).sort(compareUfcRosterCards);

export const UFC_FIGHTER_ROSTER_BASIS_HASH = stableWorldCupHex(
  UFC_FIGHTER_ROSTER_CARDS.map((card) => `${card.id}:${card.baseCard.basisHash}`).join("|"),
);

export function sportsArenaUfcFighterRosterCards(): {
  source: "ufc-fighter-roster";
  season: string;
  registryBasisHash: string;
  cards: SportsArenaCard[];
} {
  return {
    source: "ufc-fighter-roster",
    season: "ufc-fighter-roster-v1",
    registryBasisHash: UFC_FIGHTER_ROSTER_BASIS_HASH,
    cards: UFC_FIGHTER_ROSTER_CARDS,
  };
}

function buildFightArenaSlate(seed: FightArenaSlateSeed): FightArenaSlate {
  const cards = fightSlateCards(seed);
  return {
    sourceDate: seed.sourceDate,
    slateLabel: seed.slateLabel,
    cards,
    scoreboards: seed.fights.map((fight): SportsArenaScoreboard => ({
      id: fight.id,
      status: "pregame",
      gameDate: fight.gameDate,
      startTimeLabel: fight.startTimeLabel,
      countdownLabel: fightArenaCountdownLabel(fight.gameDate),
      venue: fight.venue,
      away: { code: fight.away.code, name: fight.away.athlete, score: 0 },
      home: { code: fight.home.code, name: fight.home.athlete, score: 0 },
      inning: fight.inning,
      count: fight.count,
      baseState: "empty",
      livePulse: fight.livePulse,
      statusDetail: fight.statusDetail,
    })),
    closeoutSeeds: seed.fights.map((fight) => ({ fightId: fight.id, ...fight.closeout })),
    selectedCardIds: seed.selectedSlugs.map((slug) => `ufc-card-${slug}`),
  };
}

const FIGHT_ARENA_SLATE_CACHE = new Map<string, FightArenaSlate>();

function fightArenaSlateForDate(sourceDate = sportsSystemNewYorkDate()): FightArenaSlate {
  const archiveSlate = FIGHT_ARENA_ARCHIVE_SLATES_BY_DATE.get(cleanSportsArenaSourceDate(sourceDate));
  if (archiveSlate) return archiveSlate;
  const seed = fightArenaSlateSeedForDate(sourceDate);
  const cached = FIGHT_ARENA_SLATE_CACHE.get(seed.sourceDate);
  if (cached) return cached;
  const slate = buildFightArenaSlate(seed);
  FIGHT_ARENA_SLATE_CACHE.set(seed.sourceDate, slate);
  return slate;
}

const ACTIVE_FIGHT_ARENA_SLATE = fightArenaSlateForDate("2026-06-07");
const ACTIVE_FIGHT_CARDS = ACTIVE_FIGHT_ARENA_SLATE.cards;
const ACTIVE_FIGHT_SCOREBOARDS = ACTIVE_FIGHT_ARENA_SLATE.scoreboards;

function fightBoardForId(fightId: string, scoreboards: readonly SportsArenaScoreboard[] = ACTIVE_FIGHT_SCOREBOARDS): SportsArenaScoreboard {
  const board = scoreboards.find((candidate) => candidate.id === fightId);
  if (!board) throw new Error(`missing_fight_scoreboard:${fightId}`);
  return board;
}

function fightCardForCode(teamCode: string, cards: readonly SportsArenaCard[] = ACTIVE_FIGHT_CARDS): SportsArenaCard {
  const card = cards.find((candidate) => candidate.teamCode === teamCode);
  if (!card) throw new Error(`missing_fight_card:${teamCode}`);
  return card;
}

function fightEventSide(
  board: SportsArenaScoreboard,
  side: "away" | "home",
  cards: readonly SportsArenaCard[] = ACTIVE_FIGHT_CARDS,
): {
  card: SportsArenaCard;
  code: string;
  opponentCode: string;
  name: string;
} {
  const fighter = board[side];
  const opponent = board[side === "away" ? "home" : "away"];
  return {
    card: fightCardForCode(fighter.code, cards),
    code: fighter.code,
    opponentCode: opponent.code,
    name: fighter.name,
  };
}

function buildFightLiveEvent(args: {
  sourceDate: string;
  cards: readonly SportsArenaCard[];
  board: SportsArenaScoreboard;
  seed: FightCloseoutSeed;
  side: "away" | "home";
  eventIndex: number;
  eventType: SportsArenaFightEventType;
  round: number;
  clock: string;
  value: number;
  label: string;
  detail: string;
}): SportsArenaFightLiveEvent {
  const fighter = fightEventSide(args.board, args.side, args.cards);
  const observedBaseMs = Date.parse(args.board.gameDate ?? `${args.sourceDate}T20:00:00Z`);
  const observedAt = new Date(observedBaseMs + (args.eventIndex + 1) * 90_000).toISOString();
  const scoring = scoreSportsArenaFightEvent({
    eventType: args.eventType,
    round: args.round,
    value: args.value,
    method: args.eventType === "win" ? args.seed.method : null,
    championshipRound: args.board.startTimeLabel === "Main event",
  });
  return {
    schema: "receiz.sports_arena.fight_event.v1",
    eventId: `${args.board.id}-${args.eventIndex}-${fighter.code.toLowerCase()}-${args.eventType.replace(/_/g, "-")}`,
    fightId: args.board.id,
    sourceDate: args.sourceDate,
    observedAt,
    round: args.round,
    clock: args.clock,
    cardId: fighter.card.id,
    fighterCode: fighter.code,
    opponentCode: fighter.opponentCode,
    fighterName: fighter.name,
    side: args.side,
    eventType: args.eventType,
    label: args.label,
    detail: args.detail,
    value: args.value,
    scoreDelta: scoring.scoreDelta,
    factors: scoring.factors,
    scoringVersion: SPORTS_ARENA_FIGHT_SCORING_VERSION,
  };
}

function buildFightArenaLiveEventFeed(slate: FightArenaSlate = ACTIVE_FIGHT_ARENA_SLATE): SportsArenaFightLiveEvent[] {
  return slate.closeoutSeeds.flatMap((seed) => {
    const board = fightBoardForId(seed.fightId, slate.scoreboards);
    const winnerSide = seed.winnerSide;
    const loserSide = winnerSide === "away" ? "home" : "away";
    const winner = fightEventSide(board, winnerSide, slate.cards);
    const loser = fightEventSide(board, loserSide, slate.cards);
    return [
      buildFightLiveEvent({
        sourceDate: slate.sourceDate,
        cards: slate.cards,
        board,
        seed,
        side: loserSide,
        eventIndex: 0,
        eventType: "significant_strike",
        round: Math.max(1, seed.round - 1),
        clock: "2:35",
        value: seed.loserStrikeValue,
        label: "Strike append",
        detail: `${loser.name} lands ${seed.loserStrikeValue} significant strikes before closeout.`,
      }),
      buildFightLiveEvent({
        sourceDate: slate.sourceDate,
        cards: slate.cards,
        board,
        seed,
        side: winnerSide,
        eventIndex: 1,
        eventType: seed.winnerAction,
        round: seed.round,
        clock: seed.clock,
        value: seed.winnerActionValue,
        label: "Fight swing append",
        detail: `${winner.name} records the decisive ${seed.winnerAction.replace(/_/g, " ")} sequence.`,
      }),
      buildFightLiveEvent({
        sourceDate: slate.sourceDate,
        cards: slate.cards,
        board,
        seed,
        side: winnerSide,
        eventIndex: 2,
        eventType: "control_time",
        round: seed.round,
        clock: seed.clock,
        value: seed.controlSeconds,
        label: "Control append",
        detail: `${winner.name} banks ${seed.controlSeconds} seconds of control time.`,
      }),
      buildFightLiveEvent({
        sourceDate: slate.sourceDate,
        cards: slate.cards,
        board,
        seed,
        side: winnerSide,
        eventIndex: 3,
        eventType: "win",
        round: seed.round,
        clock: seed.clock,
        value: 1,
        label: "Win append",
        detail: `${winner.name} seals the official ${seed.method} win.`,
      }),
      buildFightLiveEvent({
        sourceDate: slate.sourceDate,
        cards: slate.cards,
        board,
        seed,
        side: loserSide,
        eventIndex: 4,
        eventType: "loss",
        round: seed.round,
        clock: seed.clock,
        value: 1,
        label: "Loss append",
        detail: `${loser.name} receives the official ${seed.method} loss closeout.`,
      }),
    ];
  });
}

const FIGHT_ARENA_LIVE_EVENT_FEED_CACHE = new Map<string, SportsArenaFightLiveEvent[]>();

export function sportsArenaFightLiveEventFeedForDate(sourceDate = sportsSystemNewYorkDate()): SportsArenaFightLiveEvent[] {
  const slate = fightArenaSlateForDate(sourceDate);
  const cached = FIGHT_ARENA_LIVE_EVENT_FEED_CACHE.get(slate.sourceDate);
  if (cached) return cached;
  const feed = buildFightArenaLiveEventFeed(slate);
  FIGHT_ARENA_LIVE_EVENT_FEED_CACHE.set(slate.sourceDate, feed);
  return feed;
}

export const FIGHT_ARENA_LIVE_EVENT_FEED: SportsArenaFightLiveEvent[] = sportsArenaFightLiveEventFeedForDate("2026-06-07");

function fightEventsForCard(cardId: string, events: readonly SportsArenaFightLiveEvent[] = FIGHT_ARENA_LIVE_EVENT_FEED): SportsArenaFightLiveEvent[] {
  return events
    .filter((event) => event.cardId === cardId)
    .sort((left, right) => Date.parse(right.observedAt) - Date.parse(left.observedAt) || right.eventId.localeCompare(left.eventId));
}

function fightScore(events: readonly SportsArenaFightLiveEvent[]): number {
  return Number(events.reduce((sum, event) => sum + event.scoreDelta, 0).toFixed(1));
}

function projectFightCardsWithLiveScoring(
  cards: readonly SportsArenaCard[],
  liveEvents: readonly SportsArenaFightLiveEvent[] = FIGHT_ARENA_LIVE_EVENT_FEED,
): SportsArenaCard[] {
  return cards.map((card) => {
    const events = fightEventsForCard(card.id, liveEvents);
    const latest = events[0] ?? null;
    const currentScore = fightScore(events);
    return {
      ...card,
      currentScore,
      statLine: `${currentScore > 0 ? "+" : ""}${currentScore.toFixed(1)} UFC points`,
      liveLine: latest ? `${latest.label} append - ${latest.detail}` : card.liveLine,
      historyCount: card.historyCount + events.length,
    };
  });
}

function projectFightScoreboardsWithLiveScoring(
  scoreboards: readonly SportsArenaScoreboard[],
  liveEvents: readonly SportsArenaFightLiveEvent[] = FIGHT_ARENA_LIVE_EVENT_FEED,
): SportsArenaScoreboard[] {
  return scoreboards.map((scoreboard) => {
    const events = liveEvents.filter((event) => event.fightId === scoreboard.id);
    const awayScore = fightScore(events.filter((event) => event.side === "away"));
    const homeScore = fightScore(events.filter((event) => event.side === "home"));
    const winnerEvent = events.find((event) => event.eventType === "win") ?? null;
    const latestEvent = events[events.length - 1] ?? winnerEvent;
    return {
      ...scoreboard,
      status: "final",
      away: { ...scoreboard.away, score: awayScore },
      home: { ...scoreboard.home, score: homeScore },
      inning: "Final",
      count: winnerEvent ? `R${winnerEvent.round} ${winnerEvent.clock}` : scoreboard.count,
      livePulse: latestEvent ? `${latestEvent.fighterName}: ${latestEvent.detail}` : scoreboard.livePulse,
      statusDetail: `Official closeout append sealed ${events.length} UFC event proof objects`,
    };
  });
}

function fightProofTimelineRows(liveEvents: readonly SportsArenaFightLiveEvent[] = FIGHT_ARENA_LIVE_EVENT_FEED): SportsArenaAppend[] {
  return liveEvents.map((event, index) => ({
    id: `ufc-event-append-${event.eventId}`,
    cardId: event.cardId,
    at: `R${event.round} ${event.clock}`,
    kind: event.eventType === "win" ? "reward" : event.eventType === "loss" ? "scar" : "stat",
    label: event.label,
    detail: `UFC event proof object - ${event.detail}`,
    value: `${event.scoreDelta > 0 ? "+" : ""}${event.scoreDelta.toFixed(Math.abs(event.scoreDelta) >= 1 ? 1 : 2)}`,
    scoreDelta: event.scoreDelta,
    txid: `UFCEVT${index.toString(36).padStart(6, "0").toUpperCase()}`,
    sourceDate: event.sourceDate,
    gamePk: event.fightId,
    factors: event.factors,
  }));
}

function fightLivePlayerFromCard(
  card: SportsArenaCard,
  label: string,
  role: SportsArenaLivePlayerRole,
  liveEvents: readonly SportsArenaFightLiveEvent[] = FIGHT_ARENA_LIVE_EVENT_FEED,
): SportsArenaLivePlayer {
  const events = fightEventsForCard(card.id, liveEvents);
  return {
    role,
    label,
    name: card.athlete,
    personId: card.media.sourceId,
    teamCode: card.teamCode,
    position: card.position,
    imageUrl: card.media.imageUrl,
    statLine: card.statLine,
    deterministicScore: card.currentScore,
    factors: events[0]?.factors ?? [],
    attributes: {
      height: "UFC",
      weight: card.team,
      bats: label,
      throws: card.tier,
      age: "Live",
    },
  };
}

function buildFightArenaField(
  scoreboards: readonly SportsArenaScoreboard[],
  cards: readonly SportsArenaCard[],
  liveEvents: readonly SportsArenaFightLiveEvent[],
): SportsArenaFieldState {
  const mainBoard = scoreboards[0];
  const mainAwayCard = cards.find((card) => card.teamCode === mainBoard?.away.code) ?? cards[0];
  const mainHomeCard = cards.find((card) => card.teamCode === mainBoard?.home.code) ?? cards[1] ?? mainAwayCard;
  return {
    status: "final",
    gamePk: mainBoard?.id ?? "ufc-fight-slate",
    venue: mainBoard?.venue ?? "UFC",
    inning: "Final",
    scoreLine: mainBoard ? `${mainBoard.away.score}-${mainBoard.home.score}` : "Final",
    count: mainBoard?.count ?? "Official closeout",
    pitch: "Closeout",
    pitchType: "UFC Event Feed",
    baseState: "Full slate sealed",
    baseStateKey: "empty",
    lastPlay: mainBoard?.livePulse ?? "UFC slate closeout sealed.",
    playByPlay: "UFC event appends score every point, close every fight officially, and carry proof-object history into each Fighter Card.",
    metrics: {
      pitchType: "UFC Event Feed",
      pitchSpeedMph: null,
      exitVelocityMph: null,
      launchAngleDeg: null,
      distanceFt: null,
    },
    livePlayers: [
      mainAwayCard ? fightLivePlayerFromCard(mainAwayCard, "Red corner", "batter", liveEvents) : null,
      mainHomeCard ? fightLivePlayerFromCard(mainHomeCard, "Blue corner", "pitcher", liveEvents) : null,
    ].filter((player): player is SportsArenaLivePlayer => Boolean(player)),
  };
}

function buildPregameFightArenaField(
  scoreboards: readonly SportsArenaScoreboard[],
  cards: readonly SportsArenaCard[],
): SportsArenaFieldState {
  const mainBoard = scoreboards[0];
  const mainAwayCard = cards.find((card) => card.teamCode === mainBoard?.away.code) ?? cards[0];
  const mainHomeCard = cards.find((card) => card.teamCode === mainBoard?.home.code) ?? cards[1] ?? mainAwayCard;
  const liveEvents: SportsArenaFightLiveEvent[] = [];
  return {
    status: "pregame",
    gamePk: mainBoard?.id ?? "ufc-fight-slate",
    venue: mainBoard?.venue ?? "UFC",
    inning: mainBoard?.startTimeLabel ?? "Pregame",
    scoreLine: "0-0",
    count: mainBoard?.countdownLabel ?? mainBoard?.count ?? "Fight lock pending",
    pitch: "Fight lock",
    pitchType: "UFC Main Event",
    baseState: mainBoard?.countdownLabel ?? "Fight countdown armed",
    baseStateKey: "empty",
    lastPlay: mainBoard?.livePulse ?? "UFC slate countdown armed.",
    playByPlay: `${mainBoard?.livePulse ?? "UFC slate countdown armed."} Open UFC packs and lock owned Fighter Cards before the fight starts.`,
    metrics: {
      pitchType: "UFC Main Event",
      pitchSpeedMph: null,
      exitVelocityMph: null,
      launchAngleDeg: null,
      distanceFt: null,
    },
    livePlayers: [
      mainAwayCard ? fightLivePlayerFromCard(mainAwayCard, "Red corner", "batter", liveEvents) : null,
      mainHomeCard ? fightLivePlayerFromCard(mainHomeCard, "Blue corner", "pitcher", liveEvents) : null,
    ].filter((player): player is SportsArenaLivePlayer => Boolean(player)),
  };
}

function buildFightArenaSnapshot(slate: FightArenaSlate, asOfDate: string): SportsArenaSnapshot {
  const slateFinal = sportsArenaFightSlateIsFinalForDate(slate.sourceDate, asOfDate);
  const liveEvents = slateFinal ? sportsArenaFightLiveEventFeedForDate(slate.sourceDate) : [];
  const cards = slateFinal ? projectFightCardsWithLiveScoring(slate.cards, liveEvents) : slate.cards;
  const scoreboards = slateFinal ? projectFightScoreboardsWithLiveScoring(slate.scoreboards, liveEvents) : slate.scoreboards;
  const firstCardId = cards[0]?.id ?? "ufc-card";
  return {
    schema: "receiz.sports_arena.snapshot.v1",
    sport: "fight",
    route: "/game/sports/fight",
    title: "UFC Arena",
    slateLabel: slate.slateLabel,
    entryRule: "$3 UFC Main Event Pick 5. Open UFC packs, lock five owned fighters from active fights, and compete on full event scoring.",
    lineupSize: 5,
    selectedCardIds: slate.selectedCardIds,
    categories: SPORTS_ARENA_CATEGORIES,
    scoreboards,
    field: slateFinal ? buildFightArenaField(scoreboards, cards, liveEvents) : buildPregameFightArenaField(scoreboards, cards),
    cards,
    proofTimeline: [
    {
      id: "ufc-append-fighter-owned",
      cardId: firstCardId,
      at: "Before lock",
      kind: "entry",
      label: "Fighter Cards owned",
      detail: "Sealed UFC packs create owned Fighter Card proof objects with pack receipt identity and no same-fight collision inside the pack.",
      value: "Pack sealed",
      scoreDelta: 0,
      txid: "ufc-proof-owned",
    },
    {
      id: "ufc-append-pick-sealed",
      cardId: firstCardId,
      at: "Fight lock",
      kind: "stat",
      label: "Fight Pick 5 proof object",
      detail: "The $3 UFC Main Event locks five owned fighters from active fights and rejects opponent collisions.",
      value: "$3 Main Event",
      scoreDelta: 0,
      txid: "ufc-proof-pick",
    },
    ...(slateFinal ? fightProofTimelineRows(liveEvents) : []),
    {
      id: "ufc-append-victory-card",
      cardId: firstCardId,
      at: slateFinal ? "After result" : "After fight",
      kind: "reward",
      label: "Victory Card proof object",
      detail: "Fight event appends score each Fighter Card, attach proof clips, record win/loss state, and link Victory Card witness material when a correct result qualifies.",
      value: slateFinal ? "Event proof clips" : "Awaiting result",
      scoreDelta: slateFinal ? 8.4 : 0,
      txid: "ufc-proof-victory",
    },
  ],
  leaderboard: [
    { rank: 1, name: "Early fighter owner", points: 3, state: "hot" },
    { rank: 2, name: "Correct-pick streak", points: 2, state: "sealed" },
    { rank: 3, name: "Victory Card holder", points: 1, state: "hot" },
  ],
  scoringRules: [
    {
      label: "Packs",
      value: "Open UFC",
      detail: "UFC Fighter Cards enter the vault through sealed fight-card packs; each pack blocks both sides of the same fight from landing together.",
    },
    {
      label: "Significant strikes",
      value: "+0.35 each",
      detail: "Every landed significant strike appends UFC event proof-object score to the Fighter Card.",
    },
    {
      label: "Takedown and grappling",
      value: "+1.8 / +2.1",
      detail: "Takedowns, submission attempts, reversals, advances, and defenses append scored grappling proof.",
    },
    {
      label: "Control time",
      value: "+0.02/sec",
      detail: "Control time appends point-by-point until the fight closeout cap.",
    },
    {
      label: "Win/loss closeout",
      value: "+5.2 / -1.35",
      detail: "Official win/loss appends close the fight, seal method state, and settle Main Event scoring.",
    },
    {
      label: "Main Event",
      value: "Pick 5",
      detail: "The separate $3 UFC Fight Pick 5 Main Event binds five owned Fighter Cards from active fights before lock.",
    },
    {
      label: "Result",
      value: "Append win/loss",
      detail: "Verified fight events append score, clips, method, round, win, or loss to the Fighter Card.",
    },
    {
      label: "Victory",
      value: "Scarce reward",
      detail: "Correct picks issue a Victory Card proof object that can resell as its own win proof while the Fighter Card retains the original result witness.",
    },
  ],
  reward: {
    label: "Victory Card",
    detail: "Correct fight picks unlock a scarce event proof object linked to the owned Fighter Card and transferable through one current owner at a time.",
    cardId: "rsc_ufc_victory_card",
  },
  appendLaw: FIGHT_ARENA_APPEND_LAW,
  };
}

const FIGHT_ARENA_SNAPSHOT_CACHE = new Map<string, SportsArenaSnapshot>();

export function sportsArenaFightSnapshotForDate(sourceDate = sportsSystemNewYorkDate()): SportsArenaSnapshot {
  const asOfDate = cleanSportsArenaSourceDate(sourceDate);
  const slate = fightArenaSlateForDate(asOfDate);
  const cacheKey = `${slate.sourceDate}:${sportsArenaFightSlateIsFinalForDate(slate.sourceDate, asOfDate) ? "final" : "pregame"}`;
  const cached = FIGHT_ARENA_SNAPSHOT_CACHE.get(cacheKey);
  if (cached) return cached;
  const snapshot = buildFightArenaSnapshot(slate, asOfDate);
  FIGHT_ARENA_SNAPSHOT_CACHE.set(cacheKey, snapshot);
  return snapshot;
}

export const FIGHT_ARENA_SNAPSHOT: SportsArenaSnapshot = sportsArenaFightSnapshotForDate("2026-06-07");

export function isSportsArenaSlug(value: string): value is SportsArenaSlug {
  return value === "baseball" || value === "soccer" || value === "fight";
}

export function sportsArenaForSlug(slug: string | null | undefined): SportsArenaSnapshot {
  if (String(slug ?? "") === "soccer") return WORLD_CUP_ARENA_SNAPSHOT;
  if (String(slug ?? "") === "fight") return sportsArenaFightSnapshotForDate();
  if (isSportsArenaSlug(String(slug ?? ""))) return BASEBALL_ARENA_SNAPSHOT;
  return BASEBALL_ARENA_SNAPSHOT;
}

export function sportsArenaRouteForSlug(slug: string): string {
  const category = SPORTS_ARENA_CATEGORIES.find((candidate) => candidate.slug === slug);
  return category?.route ?? SPORTS_ARENA_ROUTE;
}

export function sportsArenaTournamentKey(
  sourceDate: string,
  tournamentId = SPORTS_ARENA_DAILY_TOURNAMENT_ID,
): string {
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(sourceDate) ? sourceDate : "live";
  return `mlb:${cleanDate}:${tournamentId}`;
}

export function sportsArenaTournamentDefinitionForSport(sport: SportsArenaSlug): SportsArenaTournamentDefinition | null {
  if (sport === "baseball") return SPORTS_ARENA_DAILY_TOURNAMENT;
  if (sport === "soccer") return WORLD_CUP_MAIN_EVENT_TOURNAMENT;
  if (sport === "fight") return UFC_FIGHT_PICK_FIVE_TOURNAMENT;
  return null;
}

export function sportsArenaTournamentKeyForSport(
  sport: SportsArenaSlug,
  sourceDate: string,
  tournamentId = sportsArenaTournamentDefinitionForSport(sport)?.id ?? SPORTS_ARENA_DAILY_TOURNAMENT_ID,
): string {
  const cleanDate = /^\d{4}-\d{2}-\d{2}$/.test(sourceDate) ? sourceDate : "live";
  if (sport === "fight") return `ufc:${cleanDate}:${tournamentId}`;
  if (sport === "baseball") return sportsArenaTournamentKey(cleanDate, tournamentId);
  return `${sport}:${cleanDate}:${tournamentId}`;
}

function splitTournamentCents(entryPriceUsdCents: number, bps: number): number {
  return Math.floor((Math.max(0, entryPriceUsdCents) * Math.max(0, bps)) / 10_000);
}

function tournamentPaidRanks(entryCount: number, paidRankPercent: number): number {
  const entrants = Math.max(0, Math.trunc(entryCount));
  if (entrants <= 0) return 0;
  return Math.max(1, Math.floor(entrants * Math.max(0, Math.min(1, paidRankPercent))));
}

function tournamentMinimumEntrantsForProfit(definition: SportsArenaTournamentDefinition): number {
  const minPaidPayoutUsdCents = definition.entryPriceUsdCents + definition.minProfitUsdCents;
  for (let entrants = 1; entrants <= 10_000; entrants += 1) {
    const paidRanks = tournamentPaidRanks(entrants, definition.paidRankPercent);
    const prizePoolUsdCents = splitTournamentCents(entrants * definition.entryPriceUsdCents, definition.prizePoolBps);
    if (paidRanks > 0 && prizePoolUsdCents >= paidRanks * minPaidPayoutUsdCents) return entrants;
  }
  return 10_000;
}

function powerRankWeight(rank: number, exponent: number): number {
  return 1 / Math.pow(Math.max(1, rank), Math.max(0.5, exponent));
}

function approximatePowerRankSum(count: number, exponent: number): number {
  const safeCount = Math.max(0, Math.trunc(count));
  if (safeCount <= 0) return 0;
  const exactCount = Math.min(safeCount, 5_000);
  let sum = 0;
  for (let rank = 1; rank <= exactCount; rank += 1) sum += powerRankWeight(rank, exponent);
  if (safeCount <= exactCount) return sum;
  const tailStart = exactCount + 0.5;
  const tailEnd = safeCount + 0.5;
  if (Math.abs(exponent - 1) < 0.0001) return sum + Math.log(tailEnd / tailStart);
  return sum + ((Math.pow(tailEnd, 1 - exponent) - Math.pow(tailStart, 1 - exponent)) / (1 - exponent));
}

function tournamentPayoutForRank(args: {
  rank: number;
  paidRanks: number;
  minPaidPayoutUsdCents: number;
  bonusPoolUsdCents: number;
  weightSum: number;
  exponent: number;
  profitFloorArmed: boolean;
}): number {
  if (args.rank < 1 || args.rank > args.paidRanks || args.paidRanks <= 0) return 0;
  const floor = args.profitFloorArmed ? args.minPaidPayoutUsdCents : 0;
  if (args.bonusPoolUsdCents <= 0 || args.weightSum <= 0) return floor;
  const bonus = Math.floor(args.bonusPoolUsdCents * (powerRankWeight(args.rank, args.exponent) / args.weightSum));
  return floor + Math.max(0, bonus);
}

export function projectSportsArenaTournamentPayoutForRank(
  economics: Pick<SportsArenaTournamentEconomics, "paidRanks" | "minPaidPayoutUsdCents" | "prizePoolUsdCents" | "profitFloorArmed">,
  rank: number,
  definition: SportsArenaTournamentDefinition = SPORTS_ARENA_DAILY_TOURNAMENT,
): number {
  const paidRanks = Math.max(0, Math.trunc(economics.paidRanks));
  const cleanRank = Math.max(0, Math.trunc(rank));
  const minPaidPayoutUsdCents = Math.max(0, Math.trunc(economics.minPaidPayoutUsdCents));
  const prizePoolUsdCents = Math.max(0, Math.trunc(economics.prizePoolUsdCents));
  const bonusPoolUsdCents = Math.max(0, prizePoolUsdCents - (economics.profitFloorArmed ? paidRanks * minPaidPayoutUsdCents : 0));
  return tournamentPayoutForRank({
    rank: cleanRank,
    paidRanks,
    minPaidPayoutUsdCents,
    bonusPoolUsdCents,
    weightSum: approximatePowerRankSum(paidRanks, definition.payoutCurveExponent),
    exponent: definition.payoutCurveExponent,
    profitFloorArmed: economics.profitFloorArmed,
  });
}

export function projectSportsArenaTournamentEconomics(
  entryCount: number,
  definition: SportsArenaTournamentDefinition = SPORTS_ARENA_DAILY_TOURNAMENT,
): SportsArenaTournamentEconomics {
  const entrants = Math.max(0, Math.trunc(entryCount));
  const grossUsdCents = entrants * definition.entryPriceUsdCents;
  const prizePoolUsdCents = splitTournamentCents(grossUsdCents, definition.prizePoolBps);
  const platformFeeUsdCents = splitTournamentCents(grossUsdCents, definition.platformFeeBps);
  const referralPoolUsdCents = splitTournamentCents(grossUsdCents, definition.referralPoolBps);
  const reservePoolUsdCents = Math.max(0, grossUsdCents - prizePoolUsdCents - platformFeeUsdCents - referralPoolUsdCents);
  const paidRanks = tournamentPaidRanks(entrants, definition.paidRankPercent);
  const minPaidPayoutUsdCents = definition.entryPriceUsdCents + definition.minProfitUsdCents;
  const profitFloorArmed = paidRanks > 0 && prizePoolUsdCents >= paidRanks * minPaidPayoutUsdCents;
  const minEntrantsToRun = Math.max(2, Math.trunc(definition.minEntrantsToRun));
  const entriesNeededToRun = Math.max(0, minEntrantsToRun - entrants);
  const runArmed = entrants >= minEntrantsToRun && profitFloorArmed;
  const bonusPoolUsdCents = Math.max(0, prizePoolUsdCents - (profitFloorArmed ? paidRanks * minPaidPayoutUsdCents : 0));
  const weightSum = approximatePowerRankSum(paidRanks, definition.payoutCurveExponent);
  const firstPlaceEstimateUsdCents = tournamentPayoutForRank({
    rank: 1,
    paidRanks,
    minPaidPayoutUsdCents,
    bonusPoolUsdCents,
    weightSum,
    exponent: definition.payoutCurveExponent,
    profitFloorArmed,
  });
  const ladderRanks = Array.from(new Set([
    1,
    2,
    3,
    10,
    Math.min(100, paidRanks),
    Math.min(1_000, paidRanks),
    Math.min(10_000, paidRanks),
    paidRanks,
  ].filter((rank) => rank > 0 && rank <= paidRanks))).sort((a, b) => a - b);

  return {
    schema: "receiz.sports_arena.tournament_economics.v1",
    entryCount: entrants,
    entryPriceUsdCents: definition.entryPriceUsdCents,
    grossUsdCents,
    prizePoolUsdCents,
    platformFeeUsdCents,
    referralPoolUsdCents,
    reservePoolUsdCents,
    paidRankPercent: definition.paidRankPercent,
    paidRanks,
    minPaidPayoutUsdCents,
    profitFloorArmed,
    minEntrantsToRun,
    runArmed,
    entriesNeededToRun,
    refundIfUnderfilled: true,
    minimumEntrantsForProfit: tournamentMinimumEntrantsForProfit(definition),
    firstPlaceEstimateUsdCents,
    payoutLadder: ladderRanks.map((rank) => ({
      rank,
      label: rank === paidRanks ? `#${rank.toLocaleString("en-US")} paid` : `#${rank.toLocaleString("en-US")}`,
      payoutUsdCents: tournamentPayoutForRank({
        rank,
        paidRanks,
        minPaidPayoutUsdCents,
        bonusPoolUsdCents,
        weightSum,
        exponent: definition.payoutCurveExponent,
        profitFloorArmed,
      }),
    })),
  };
}

export function projectSportsArenaTournamentLaunchEstimate(
  entryCount: number,
  definition: SportsArenaTournamentDefinition = SPORTS_ARENA_DAILY_TOURNAMENT,
): SportsArenaTournamentEconomics {
  const projectedEntrants = Math.max(
    Math.max(2, Math.trunc(definition.minEntrantsToRun)),
    Math.max(0, Math.trunc(entryCount)),
  );
  return projectSportsArenaTournamentEconomics(projectedEntrants, definition);
}

export function sportsArenaScoreForCard(cardId: string, appends: SportsArenaAppend[]): number {
  return Number(
    appends
      .filter((append) => append.cardId === cardId)
      .reduce((sum, append) => sum + append.scoreDelta, 0)
      .toFixed(1),
  );
}

export function projectSportsCardArenaState(
  card: SportsArenaCard,
  appends: SportsArenaAppend[],
): SportsArenaCard {
  const matchingAppends = appends.filter((append) => append.cardId === card.id);
  const latestStatAppend = matchingAppends.find((append) => append.kind === "stat" || append.kind === "scar");
  return {
    ...card,
    baseCard: { ...card.baseCard },
    currentScore: sportsArenaScoreForCard(card.id, appends),
    liveLine: latestStatAppend ? `${latestStatAppend.value} - ${latestStatAppend.detail}` : card.liveLine,
    historyCount: card.historyCount + matchingAppends.length,
  };
}

export function projectSportsArenaCards(snapshot: SportsArenaSnapshot): SportsArenaCard[] {
  return snapshot.cards.map((card) => projectSportsCardArenaState(card, snapshot.proofTimeline));
}

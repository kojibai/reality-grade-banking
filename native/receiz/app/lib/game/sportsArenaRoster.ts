import type { SportsArenaCard, SportsArenaPlayerBio } from "@/app/lib/game/sportsArena";

type SportsRosterCard = Pick<SportsArenaCard, "tags"> & {
  playerBio?: SportsArenaPlayerBio | null;
};

export type SportsCardRosterBlockKind =
  | "free-agent"
  | "minors"
  | "injured"
  | "paternity"
  | "bereavement"
  | "personal"
  | "restricted"
  | "not-active";

export type SportsCardRosterBlock = {
  kind: SportsCardRosterBlockKind;
  label: string;
  detail: string;
  order: number;
};

function cleanRosterStatus(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function rosterStatusTag(card: SportsRosterCard): string {
  return card.tags.find((tag) => {
    const normalized = tag.trim().toLowerCase();
    return normalized === "active" ||
      normalized === "player" ||
      normalized === "roster" ||
      normalized.includes("free agent") ||
      normalized.includes("free agency") ||
      normalized.includes("released") ||
      normalized.includes("elect") ||
      normalized.includes("outright") ||
      normalized.includes("optioned") ||
      normalized.includes("minor") ||
      normalized.includes("injured") ||
      normalized.includes("injury") ||
      normalized.includes("injured list") ||
      normalized.includes("rehab") ||
      normalized.includes("restricted") ||
      normalized.includes("suspended") ||
      normalized.includes("inactive") ||
      normalized.includes("administrative") ||
      normalized.includes("bereavement") ||
      normalized.includes("paternity") ||
      normalized.includes("family") ||
      normalized.includes("personal") ||
      normalized.includes("played this season");
  })?.trim() ?? "";
}

export function sportsCardRosterStatusLabel(card: SportsRosterCard): string {
  return cleanRosterStatus(card.playerBio?.rosterStatus) || rosterStatusTag(card);
}

export function sportsCardRosterBlock(card: SportsRosterCard): SportsCardRosterBlock | null {
  const statusLabel = sportsCardRosterStatusLabel(card);
  const normalized = statusLabel.toLowerCase();
  if (!normalized || normalized === "active" || normalized === "roster") return null;

  if (
    normalized.includes("free agent") ||
    normalized.includes("free agency") ||
    normalized.includes("released") ||
    (normalized.includes("elect") && normalized.includes("free"))
  ) {
    return {
      kind: "free-agent",
      label: "Free agent",
      detail: statusLabel,
      order: 66,
    };
  }

  if (
    normalized.includes("minor") ||
    normalized.includes("optioned") ||
    normalized.includes("outright") ||
    normalized.includes("triple-a") ||
    normalized.includes("aaa") ||
    normalized.includes("milb")
  ) {
    return {
      kind: "minors",
      label: "Minors",
      detail: statusLabel,
      order: 65,
    };
  }

  if (
    normalized.includes("injured") ||
    normalized.includes("injury") ||
    normalized.includes("injured list") ||
    normalized.includes("rehab")
  ) {
    return {
      kind: "injured",
      label: "Injured",
      detail: statusLabel,
      order: 62,
    };
  }

  if (normalized.includes("paternity")) {
    return {
      kind: "paternity",
      label: "Paternity",
      detail: statusLabel,
      order: 63,
    };
  }

  if (normalized.includes("bereavement")) {
    return {
      kind: "bereavement",
      label: "Bereavement",
      detail: statusLabel,
      order: 63,
    };
  }

  if (
    normalized.includes("family") ||
    normalized.includes("personal") ||
    normalized.includes("administrative")
  ) {
    return {
      kind: "personal",
      label: "Personal leave",
      detail: statusLabel,
      order: 63,
    };
  }

  if (
    normalized.includes("restricted") ||
    normalized.includes("suspended") ||
    normalized.includes("inactive")
  ) {
    return {
      kind: "restricted",
      label: "Not active",
      detail: statusLabel,
      order: 64,
    };
  }

  if (normalized === "player" || normalized.includes("played this season")) {
    return {
      kind: "not-active",
      label: "Not active",
      detail: statusLabel,
      order: 64,
    };
  }

  return null;
}

export function sportsCardRosterStatusBlocksPlay(card: SportsRosterCard): boolean {
  return sportsCardRosterBlock(card) !== null;
}
